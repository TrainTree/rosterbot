begin;

create temporary table phase10b_validator_evidence (
    test_name text primary key,
    error_code text not null,
    error_message text not null,
    error_detail text
) on commit drop;

create temporary table phase10b_fixture (payload jsonb not null) on commit drop;
insert into phase10b_fixture values (
    jsonb_build_object(
        'format','rosterbot-personal-state',
        'formatVersion',1,
        'storageSchemaVersion',5,
        'minimumReaderSchema',5,
        'writer',jsonb_build_object('app','RosterBotPayBot','version','0.30.0','build','phase10b-staging-contract'),
        'generation',jsonb_build_object('number',1,'id','1:' || repeat('a',64),'kind','state','fingerprint',repeat('a',64),'predecessorFingerprint',null),
        'checksum',jsonb_build_object('algorithm','SHA-256','canonicalisation','rosterbot-canonical-json-v1','scope','rosterbot-schema5-content-v1','value',repeat('a',64)),
        'timestamps',jsonb_build_object('createdAt','2026-10-08T00:00:00.000Z','updatedAt','2026-10-08T00:00:00.000Z'),
        'personalState',jsonb_build_object('kind','state','entries',jsonb_build_object()),
        'extensions',jsonb_build_object(),
        'migration',jsonb_build_object('fromSchema',4,'migratedAt','2026-10-08T00:00:00.000Z','source','phase10b-synthetic','sourceFingerprint',repeat('b',64),'sourceGeneration',null,'warnings',jsonb_build_array()),
        'previousGeneration',null,
        'compatibility',jsonb_build_object('schemaVersion',4,'status','lossless','projectionFingerprint',repeat('b',64))
    )
);

do $test$
declare
    valid_payload jsonb := (select payload from phase10b_fixture);
    invalid_payload jsonb;
    test_case record;
    caught_detail text;
begin
    if (select max_writable_schema from public.roster_schema_capability where singleton) <> 4 then
        raise exception 'Phase 10B contract test requires capability 4';
    end if;

    perform public._validate_roster_schema5_plaintext(valid_payload);

    for test_case in
        select * from (values
            ('generation_zero', jsonb_set(valid_payload,'{generation,number}','0'::jsonb)),
            ('generation_id', jsonb_set(valid_payload,'{generation,id}','"spoofed"'::jsonb)),
            ('generation_fingerprint', jsonb_set(valid_payload,'{generation,fingerprint}','"ABC"'::jsonb)),
            ('checksum_algorithm', jsonb_set(valid_payload,'{checksum,algorithm}','"MD5"'::jsonb)),
            ('checksum_disagreement', jsonb_set(valid_payload,'{checksum,value}',to_jsonb(repeat('c',64)))),
            ('personal_entries_type', jsonb_set(valid_payload,'{personalState,entries}','[]'::jsonb)),
            ('timestamp_type', jsonb_set(valid_payload,'{timestamps,updatedAt}','42'::jsonb)),
            ('writer_missing', valid_payload #- '{writer,build}'),
            ('migration_source_type', jsonb_set(valid_payload,'{migration,source}','42'::jsonb)),
            ('compatibility_schema', jsonb_set(valid_payload,'{compatibility,schemaVersion}','5'::jsonb))
        ) as cases(test_name,payload)
    loop
        begin
            perform public._validate_roster_schema5_plaintext(test_case.payload);
            raise exception 'expected schema-5 validator rejection for %', test_case.test_name;
        exception when sqlstate 'RB005' then
            get stacked diagnostics caught_detail = pg_exception_detail;
            insert into phase10b_validator_evidence values
                (test_case.test_name,sqlstate,sqlerrm,caught_detail);
        end;
    end loop;

    begin
        perform public._validate_roster_payload(4,valid_payload,false);
        raise exception 'expected row/payload schema disagreement rejection';
    exception when sqlstate 'RB004' then
        get stacked diagnostics caught_detail = pg_exception_detail;
        insert into phase10b_validator_evidence values
            ('schema_payload_disagreement',sqlstate,sqlerrm,caught_detail);
    end;

    set local session_replication_role = replica;
    insert into public.roster_state
        (user_id,revision,schema_version,payload,client_id)
    values
        ('__USER_C__'::uuid,1,5,valid_payload,'phase10b-transactional-fixture');
    insert into public.roster_revisions
        (user_id,revision,schema_version,payload,client_id)
    values
        ('__USER_C__'::uuid,1,5,valid_payload,'phase10b-transactional-fixture');
    set local session_replication_role = origin;

    begin
        update public.roster_state
        set revision=2,
            schema_version=4,
            payload='{"app":"RosterBotPayBot","schemaVersion":4,"storage":{"rosterbot-db-schema-v1":"4"}}'::jsonb
        where user_id='__USER_C__'::uuid;
        raise exception 'expected downgrade rejection';
    exception when sqlstate 'RB001' then
        get stacked diagnostics caught_detail = pg_exception_detail;
        insert into phase10b_validator_evidence values
            ('downgrade_guard',sqlstate,sqlerrm,caught_detail);
    end;

    begin
        update public.roster_state
        set revision=3
        where user_id='__USER_C__'::uuid;
        raise exception 'expected revision sequence rejection';
    exception when sqlstate 'RB007' then
        get stacked diagnostics caught_detail = pg_exception_detail;
        insert into phase10b_validator_evidence values
            ('revision_guard',sqlstate,sqlerrm,caught_detail);
    end;

    begin
        update public.roster_revisions
        set client_id='forbidden-rewrite'
        where user_id='__USER_C__'::uuid and revision=1;
        raise exception 'expected immutable history rejection';
    exception when sqlstate 'RB007' then
        get stacked diagnostics caught_detail = pg_exception_detail;
        insert into phase10b_validator_evidence values
            ('history_guard',sqlstate,sqlerrm,caught_detail);
    end;

    if not exists (
        select 1 from public.roster_state
        where user_id='__USER_C__'::uuid and revision=1 and schema_version=5
    ) or not exists (
        select 1 from public.roster_revisions
        where user_id='__USER_C__'::uuid and revision=1 and schema_version=5
    ) then
        raise exception 'rejected guard tests changed transactional fixtures';
    end if;
end;
$test$;

select jsonb_build_object(
    'capability', (
        select jsonb_build_object('min',min_writable_schema,'max',max_writable_schema)
        from public.roster_schema_capability where singleton
    ),
    'validator_cases', (
        select jsonb_agg(to_jsonb(e) order by e.test_name)
        from phase10b_validator_evidence e
    ),
    'attestation', jsonb_build_object(
        'identity', to_regprocedure('public.get_roster_schema_capability()')::text,
        'volatility', (select provolatile from pg_proc where oid=to_regprocedure('public.get_roster_schema_capability()')),
        'security_definer', (select prosecdef from pg_proc where oid=to_regprocedure('public.get_roster_schema_capability()')),
        'authenticated_execute', has_function_privilege('authenticated','public.get_roster_schema_capability()','EXECUTE'),
        'anon_execute', has_function_privilege('anon','public.get_roster_schema_capability()','EXECUTE'),
        'service_execute', has_function_privilege('service_role','public.get_roster_schema_capability()','EXECUTE')
    ),
    'trigger_count', (
        select count(*) from pg_trigger t
        join pg_class c on c.oid=t.tgrelid
        join pg_namespace n on n.oid=c.relnamespace
        where n.nspname='public'
          and c.relname in ('roster_state','roster_revisions')
          and not t.tgisinternal and t.tgenabled='O'
    ),
    'rls_enabled', (
        select count(*)=2 from pg_class c
        join pg_namespace n on n.oid=c.relnamespace
        where n.nspname='public'
          and c.relname in ('roster_state','roster_revisions')
          and c.relrowsecurity
    )
) as phase10b_contract;

rollback;

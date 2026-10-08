create temporary table phase8c_trigger_evidence (
    test_name text primary key,
    error_code text not null,
    error_message text not null,
    error_detail text
) on commit drop;

insert into public.roster_state
    (user_id, revision, schema_version, payload, client_id)
values
    ('__USER_A__'::uuid, 1, 4,
     '{"app":"RosterBotPayBot","schemaVersion":4,"storage":{"rosterbot-db-schema-v1":"4","phase8c":"direct-base"}}'::jsonb,
     'phase8c-owner-direct');

update public.roster_state
set revision = 2,
    schema_version = 5,
    payload = '{"format":"rosterbot-personal-state","formatVersion":1,"storageSchemaVersion":5,"minimumReaderSchema":5,"writer":{"app":"RosterBotPayBot","build":"phase7a-golden","version":"0.30.0"},"generation":{"number":1,"id":"1:046d2222560f8647bc18c3105c37f6c85e8bece39e84d7a06fd78ee9043a4c07","kind":"state","fingerprint":"046d2222560f8647bc18c3105c37f6c85e8bece39e84d7a06fd78ee9043a4c07","predecessorFingerprint":null},"checksum":{"algorithm":"SHA-256","canonicalisation":"rosterbot-canonical-json-v1","scope":"rosterbot-schema5-content-v1","value":"046d2222560f8647bc18c3105c37f6c85e8bece39e84d7a06fd78ee9043a4c07"},"timestamps":{"createdAt":"2026-10-01T00:00:00.000Z","updatedAt":"2026-10-01T00:00:00.000Z"},"personalState":{"kind":"state","entries":{"paybot-v06-state":{"presence":"missing"},"rosterbot-calendar-subscription-settings-v1":{"presence":"missing"},"rosterbot-day-overrides-v1":{"presence":"missing"},"rosterbot-diary-annual-leave-v1":{"presence":"missing"},"rosterbot-employment-profile-v1":{"presence":"missing"},"rosterbot-fortnight-allowances-v1":{"presence":"missing"},"rosterbot-fortnight-notes-v1":{"presence":"missing"},"rosterbot-manual-schedule-v1":{"presence":"missing"},"rosterbot-pay-checks-v1":{"presence":"missing"},"rosterbot-session-settings-v1":{"presence":"missing"},"rosterbot-timeline-v1":{"presence":"missing"},"rosterbot-week-leave-v1":{"presence":"missing"},"rosterbot-week-locks-v1":{"presence":"missing"},"rosterbot-week-overrides-v1":{"presence":"missing"}}},"extensions":{},"migration":{"fromSchema":4,"migratedAt":"2026-10-01T00:00:00.000Z","source":"localStorage","sourceFingerprint":"db062f53753c01e3294c71f3254d26cbc91f7db3ff4cee43f456a02c1aaa4cc5","sourceGeneration":null,"warnings":[{"code":"SCHEMA_MARKER_MISSING"}]},"previousGeneration":null,"compatibility":{"schemaVersion":4,"status":"lossless","projectionFingerprint":"db062f53753c01e3294c71f3254d26cbc91f7db3ff4cee43f456a02c1aaa4cc5"}}'::jsonb,
    client_id = 'phase8c-owner-direct-upgrade'
where user_id = '__USER_A__'::uuid;

do $test$
declare
    caught_detail text;
begin
    begin
        update public.roster_state
        set revision = 3,
            schema_version = 4,
            payload = '{"app":"RosterBotPayBot","schemaVersion":4,"storage":{"rosterbot-db-schema-v1":"4"}}'::jsonb
        where user_id = '__USER_A__'::uuid;
        raise exception 'expected direct downgrade rejection';
    exception when sqlstate 'RB001' then
        get stacked diagnostics caught_detail = pg_exception_detail;
        insert into phase8c_trigger_evidence values ('schema_downgrade', sqlstate, sqlerrm, caught_detail);
    end;

    begin
        update public.roster_state
        set revision = 4
        where user_id = '__USER_A__'::uuid;
        raise exception 'expected revision sequence rejection';
    exception when sqlstate 'RB007' then
        get stacked diagnostics caught_detail = pg_exception_detail;
        insert into phase8c_trigger_evidence values ('revision_sequence', sqlstate, sqlerrm, caught_detail);
    end;

    begin
        update public.roster_state
        set user_id = '__USER_B__'::uuid,
            revision = 3
        where user_id = '__USER_A__'::uuid;
        raise exception 'expected ownership mutation rejection';
    exception when sqlstate 'RB007' then
        get stacked diagnostics caught_detail = pg_exception_detail;
        insert into phase8c_trigger_evidence values ('ownership_mutation', sqlstate, sqlerrm, caught_detail);
    end;

    begin
        update public.roster_state
        set revision = 3,
            payload = '{"app":"RosterBotPayBot","schemaVersion":4,"storage":{"rosterbot-db-schema-v1":"4"}}'::jsonb
        where user_id = '__USER_A__'::uuid;
        raise exception 'expected payload/schema rejection';
    exception when sqlstate 'RB004' then
        get stacked diagnostics caught_detail = pg_exception_detail;
        insert into phase8c_trigger_evidence values ('payload_schema_mismatch', sqlstate, sqlerrm, caught_detail);
    end;

    begin
        insert into public.roster_state
            (user_id, revision, schema_version, payload, client_id)
        values
            ('__USER_B__'::uuid, 2, 4,
             '{"app":"RosterBotPayBot","schemaVersion":4,"storage":{"rosterbot-db-schema-v1":"4"}}'::jsonb,
             'phase8c-invalid-first');
        raise exception 'expected first revision rejection';
    exception when sqlstate 'RB007' then
        get stacked diagnostics caught_detail = pg_exception_detail;
        insert into phase8c_trigger_evidence values ('first_revision_sequence', sqlstate, sqlerrm, caught_detail);
    end;

    begin
        update public.roster_revisions
        set client_id = 'phase8c-illegal-history-rewrite'
        where user_id = '__USER_A__'::uuid and revision = 1;
        raise exception 'expected immutable history rejection';
    exception when sqlstate 'RB007' then
        get stacked diagnostics caught_detail = pg_exception_detail;
        insert into phase8c_trigger_evidence values ('history_immutable', sqlstate, sqlerrm, caught_detail);
    end;

    if not exists (
        select 1 from public.roster_state
        where user_id = '__USER_A__'::uuid
          and revision = 2
          and schema_version = 5
          and client_id = 'phase8c-owner-direct-upgrade'
    ) then
        raise exception 'rejected direct write changed current state';
    end if;

    if (select count(*) from public.roster_revisions where user_id = '__USER_A__'::uuid) <> 2 then
        raise exception 'rejected direct write changed history';
    end if;

    if exists (select 1 from public.roster_state where user_id = '__USER_B__'::uuid)
       or exists (select 1 from public.roster_revisions where user_id = '__USER_B__'::uuid) then
        raise exception 'invalid first write left rows';
    end if;
end;
$test$;

select jsonb_build_object(
    'trigger_errors', (
        select jsonb_agg(to_jsonb(e) order by e.test_name)
        from phase8c_trigger_evidence e
    ),
    'current_after_rejections', (
        select jsonb_build_object('revision', revision, 'schema_version', schema_version, 'client_id', client_id)
        from public.roster_state where user_id = '__USER_A__'::uuid
    ),
    'history_after_rejections', (
        select jsonb_agg(jsonb_build_object('revision', revision, 'schema_version', schema_version) order by revision)
        from public.roster_revisions where user_id = '__USER_A__'::uuid
    )
) as phase8c_trigger_contract;

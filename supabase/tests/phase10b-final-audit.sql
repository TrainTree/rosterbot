select jsonb_build_object(
    'capability', (
        select jsonb_build_object(
            'min_writable_schema', min_writable_schema,
            'max_writable_schema', max_writable_schema,
            'singleton_rows', count(*) over ()
        )
        from public.roster_schema_capability
        where singleton = true
    ),
    'row_counts', jsonb_build_object(
        'roster_state', (select count(*) from public.roster_state),
        'roster_revisions', (select count(*) from public.roster_revisions),
        'calendar_feeds', (select count(*) from public.calendar_feeds),
        'auth_users', (select count(*) from auth.users),
        'auth_identities', (select count(*) from auth.identities)
    ),
    'attestation', jsonb_build_object(
        'identity', to_regprocedure('public.get_roster_schema_capability()')::text,
        'stable', (select provolatile = 's' from pg_proc where oid = to_regprocedure('public.get_roster_schema_capability()')),
        'security_definer', (select prosecdef from pg_proc where oid = to_regprocedure('public.get_roster_schema_capability()')),
        'authenticated_execute', has_function_privilege('authenticated','public.get_roster_schema_capability()','EXECUTE'),
        'anon_execute', has_function_privilege('anon','public.get_roster_schema_capability()','EXECUTE'),
        'service_role_execute', has_function_privilege('service_role','public.get_roster_schema_capability()','EXECUTE')
    ),
    'schema5_validator', to_regprocedure('public._validate_roster_schema5_plaintext(jsonb)')::text,
    'enabled_roster_triggers', (
        select jsonb_agg(t.tgname order by t.tgname)
        from pg_trigger t
        join pg_class c on c.oid = t.tgrelid
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and c.relname in ('roster_state','roster_revisions')
          and not t.tgisinternal
          and t.tgenabled = 'O'
    ),
    'rls', jsonb_build_object(
        'roster_state', (select relrowsecurity from pg_class where oid='public.roster_state'::regclass),
        'roster_revisions', (select relrowsecurity from pg_class where oid='public.roster_revisions'::regclass)
    ),
    'grants', jsonb_build_object(
        'authenticated_save_execute', has_function_privilege('authenticated','public.save_roster_state(bigint,integer,jsonb,text)','EXECUTE'),
        'anon_save_execute', has_function_privilege('anon','public.save_roster_state(bigint,integer,jsonb,text)','EXECUTE'),
        'service_roster_select', has_table_privilege('service_role','public.roster_state','SELECT') and has_table_privilege('service_role','public.roster_revisions','SELECT'),
        'service_roster_dml', has_table_privilege('service_role','public.roster_state','INSERT') or has_table_privilege('service_role','public.roster_state','UPDATE') or has_table_privilege('service_role','public.roster_state','DELETE') or has_table_privilege('service_role','public.roster_revisions','INSERT') or has_table_privilege('service_role','public.roster_revisions','UPDATE') or has_table_privilege('service_role','public.roster_revisions','DELETE')
    )
) as phase10b_final_audit;

select jsonb_build_object(
    'capability', (
        select jsonb_build_object(
            'min_writable_schema', min_writable_schema,
            'max_writable_schema', max_writable_schema
        )
        from public.roster_schema_capability
        where singleton = true
    ),
    'row_counts', jsonb_build_object(
        'roster_state', (select count(*) from public.roster_state),
        'roster_revisions', (select count(*) from public.roster_revisions),
        'calendar_feeds', (select count(*) from public.calendar_feeds)
    ),
    'enabled_roster_triggers', (
        select count(*)
        from pg_trigger t
        join pg_class c on c.oid = t.tgrelid
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and c.relname in ('roster_state', 'roster_revisions')
          and not t.tgisinternal
          and t.tgenabled = 'O'
    ),
    'authenticated_rpc_execute', has_function_privilege(
        'authenticated',
        'public.save_roster_state(bigint,integer,jsonb,text)',
        'EXECUTE'
    ),
    'anon_rpc_execute', has_function_privilege(
        'anon',
        'public.save_roster_state(bigint,integer,jsonb,text)',
        'EXECUTE'
    ),
    'service_role_roster_privileges', jsonb_build_object(
        'select', has_table_privilege('service_role', 'public.roster_state', 'SELECT'),
        'insert', has_table_privilege('service_role', 'public.roster_state', 'INSERT'),
        'update', has_table_privilege('service_role', 'public.roster_state', 'UPDATE'),
        'delete', has_table_privilege('service_role', 'public.roster_state', 'DELETE')
    )
) as phase8c_final_audit;

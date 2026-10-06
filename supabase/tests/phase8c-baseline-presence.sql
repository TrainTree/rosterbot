select jsonb_build_object(
    'objects', coalesce((
        select jsonb_agg(c.relname order by c.relname)
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and c.relname in ('calendar_feeds', 'roster_revisions', 'roster_state')
          and c.relkind = 'r'
    ), '[]'::jsonb),
    'functions', coalesce((
        select jsonb_agg(p.proname order by p.proname)
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname in (
              'purge_unencrypted_roster_history',
              'rotate_roster_encryption_wrappers',
              'save_roster_state',
              'set_calendar_feed_updated_at'
          )
    ), '[]'::jsonb),
    'default_privileges', coalesce((
        select jsonb_agg(jsonb_build_object(
            'owner', pg_get_userbyid(d.defaclrole),
            'object_type', d.defaclobjtype,
            'acl', d.defaclacl
        ) order by pg_get_userbyid(d.defaclrole), d.defaclobjtype)
        from pg_default_acl d
        join pg_namespace n on n.oid = d.defaclnamespace
        where n.nspname = 'public'
          and pg_get_userbyid(d.defaclrole) in ('postgres', 'supabase_admin')
    ), '[]'::jsonb)
) as baseline_presence;

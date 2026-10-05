with target_tables as (
  select c.oid, c.relname, c.relowner, c.relacl
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname in ('roster_state', 'roster_revisions', 'calendar_feeds')
    and c.relkind in ('r', 'p')
), target_functions as (
  select p.oid, p.oid::regprocedure::text as identity, p.proowner, p.proacl
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in ('save_roster_state', 'rotate_roster_encryption_wrappers', 'purge_unencrypted_roster_history')
)
select 'table' as object_type, t.relname as object_identity,
       pg_catalog.pg_get_userbyid(x.grantor) as grantor,
       case when x.grantee = 0 then 'PUBLIC' else pg_catalog.pg_get_userbyid(x.grantee) end as grantee,
       x.privilege_type, x.is_grantable
from target_tables t
cross join lateral pg_catalog.aclexplode(coalesce(t.relacl, pg_catalog.acldefault('r', t.relowner))) x

union all

select 'function', f.identity,
       pg_catalog.pg_get_userbyid(x.grantor),
       case when x.grantee = 0 then 'PUBLIC' else pg_catalog.pg_get_userbyid(x.grantee) end,
       x.privilege_type, x.is_grantable
from target_functions f
cross join lateral pg_catalog.aclexplode(coalesce(f.proacl, pg_catalog.acldefault('f', f.proowner))) x

order by object_type, object_identity, grantee, privilege_type;

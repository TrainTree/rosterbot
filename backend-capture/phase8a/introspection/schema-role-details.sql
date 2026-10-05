select
  'schema_acl' as record_type,
  n.nspname as identity,
  pg_catalog.pg_get_userbyid(n.nspowner) as owner,
  case when x.grantee = 0 then 'PUBLIC' else pg_catalog.pg_get_userbyid(x.grantee) end as role_name,
  x.privilege_type as detail,
  x.is_grantable,
  null::boolean as can_login,
  null::boolean as bypass_rls,
  null::boolean as superuser
from pg_catalog.pg_namespace n
cross join lateral pg_catalog.aclexplode(coalesce(n.nspacl, pg_catalog.acldefault('n', n.nspowner))) x
where n.nspname = 'public'

union all

select
  'role' as record_type,
  r.rolname as identity,
  null as owner,
  r.rolname as role_name,
  null as detail,
  null as is_grantable,
  r.rolcanlogin as can_login,
  r.rolbypassrls as bypass_rls,
  r.rolsuper as superuser
from pg_catalog.pg_roles r
where r.rolname in ('anon', 'authenticated', 'service_role', 'postgres', 'supabase_admin')

order by record_type, identity, role_name, detail;

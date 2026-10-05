select
  pg_catalog.pg_get_userbyid(d.defaclrole) as owner,
  coalesce(n.nspname, '<all schemas>') as schema_name,
  d.defaclobjtype::text as object_type,
  pg_catalog.pg_get_userbyid(x.grantor) as grantor,
  case when x.grantee = 0 then 'PUBLIC' else pg_catalog.pg_get_userbyid(x.grantee) end as grantee,
  x.privilege_type,
  x.is_grantable
from pg_catalog.pg_default_acl d
left join pg_catalog.pg_namespace n on n.oid = d.defaclnamespace
cross join lateral pg_catalog.aclexplode(d.defaclacl) x
where n.nspname = 'public' or d.defaclnamespace = 0
order by owner, schema_name, object_type, grantee, privilege_type;

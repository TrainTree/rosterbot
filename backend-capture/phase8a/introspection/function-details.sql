select
  n.nspname as schema_name,
  p.proname as function_name,
  p.oid::regprocedure::text as identity,
  pg_catalog.pg_get_userbyid(p.proowner) as owner,
  l.lanname as language,
  p.prokind::text as kind,
  p.prosecdef as security_definer,
  p.proleakproof as leakproof,
  p.proisstrict as strict,
  p.proretset as returns_set,
  p.provolatile::text as volatility,
  p.proparallel::text as parallel_safety,
  p.proconfig as configuration,
  pg_catalog.pg_get_function_arguments(p.oid) as arguments,
  pg_catalog.pg_get_function_identity_arguments(p.oid) as identity_arguments,
  pg_catalog.pg_get_function_result(p.oid) as result_type,
  p.proacl::text as explicit_acl,
  (
    select coalesce(jsonb_agg(jsonb_build_object(
      'grantor', pg_catalog.pg_get_userbyid(x.grantor),
      'grantee', case when x.grantee = 0 then 'PUBLIC' else pg_catalog.pg_get_userbyid(x.grantee) end,
      'privilege', x.privilege_type,
      'grantable', x.is_grantable
    )), '[]'::jsonb)
    from pg_catalog.aclexplode(coalesce(p.proacl, pg_catalog.acldefault('f', p.proowner))) x
  ) as effective_acl,
  pg_catalog.obj_description(p.oid, 'pg_proc') as comment,
  pg_catalog.pg_get_functiondef(p.oid) as definition
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
join pg_catalog.pg_language l on l.oid = p.prolang
where n.nspname = 'public'
order by p.proname, p.oid::regprocedure::text;

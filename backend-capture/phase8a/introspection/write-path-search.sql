select
  n.nspname as schema_name,
  p.oid::regprocedure::text as function_identity,
  pg_catalog.pg_get_userbyid(p.proowner) as owner,
  p.prosecdef as security_definer,
  p.proconfig as configuration,
  pg_catalog.pg_get_functiondef(p.oid) as definition
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where p.prokind in ('f', 'p')
  and n.nspname not in ('pg_catalog', 'information_schema')
  and (
    pg_catalog.pg_get_functiondef(p.oid) ~* '\mroster_state\M'
    or pg_catalog.pg_get_functiondef(p.oid) ~* '\mroster_revisions\M'
    or pg_catalog.pg_get_functiondef(p.oid) ~* '\mcalendar_feeds\M'
  )
order by n.nspname, p.oid::regprocedure::text;

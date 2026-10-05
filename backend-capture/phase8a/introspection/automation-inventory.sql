select
  e.extname as extension_name,
  n.nspname as extension_schema,
  e.extversion as extension_version,
  pg_catalog.to_regclass('cron.job')::text as cron_job_catalog,
  pg_catalog.to_regclass('supabase_functions.hooks')::text as hooks_catalog
from pg_catalog.pg_extension e
join pg_catalog.pg_namespace n on n.oid = e.extnamespace
order by e.extname;

select
  n.nspname as schema_name,
  c.relname as table_name,
  a.attname as column_name,
  a.attacl::text as explicit_acl
from pg_catalog.pg_attribute a
join pg_catalog.pg_class c on c.oid = a.attrelid
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('roster_state', 'roster_revisions', 'calendar_feeds')
  and a.attnum > 0
  and not a.attisdropped
  and a.attacl is not null
order by c.relname, a.attnum;

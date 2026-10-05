with target_tables as (
  select c.oid, c.relname, c.relowner, c.relacl, c.relrowsecurity,
         c.relforcerowsecurity, c.relpersistence, c.relreplident,
         c.reloptions, n.nspname
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname in ('roster_state', 'roster_revisions', 'calendar_feeds')
    and c.relkind in ('r', 'p')
)
select
  t.nspname as schema_name,
  t.relname as table_name,
  pg_catalog.pg_get_userbyid(t.relowner) as owner,
  t.relpersistence::text as persistence,
  t.relrowsecurity as rls_enabled,
  t.relforcerowsecurity as rls_forced,
  t.relreplident::text as replica_identity,
  t.reloptions,
  t.relacl::text as explicit_acl,
  (
    select jsonb_agg(jsonb_build_object(
      'ordinal_position', a.attnum,
      'name', a.attname,
      'type', pg_catalog.format_type(a.atttypid, a.atttypmod),
      'not_null', a.attnotnull,
      'default', pg_catalog.pg_get_expr(d.adbin, d.adrelid, true),
      'identity', nullif(a.attidentity, ''),
      'generated', nullif(a.attgenerated, ''),
      'collation', case when a.attcollation <> ty.typcollation then a.attcollation::regcollation::text end,
      'storage', a.attstorage,
      'compression', nullif(a.attcompression, ''),
      'statistics_target', a.attstattarget,
      'comment', pg_catalog.col_description(a.attrelid, a.attnum)
    ) order by a.attnum)
    from pg_catalog.pg_attribute a
    join pg_catalog.pg_type ty on ty.oid = a.atttypid
    left join pg_catalog.pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
    where a.attrelid = t.oid and a.attnum > 0 and not a.attisdropped
  ) as columns,
  (
    select coalesce(jsonb_agg(jsonb_build_object(
      'name', con.conname,
      'type', con.contype,
      'deferrable', con.condeferrable,
      'initially_deferred', con.condeferred,
      'validated', con.convalidated,
      'definition', pg_catalog.pg_get_constraintdef(con.oid, true)
    ) order by con.conname), '[]'::jsonb)
    from pg_catalog.pg_constraint con
    where con.conrelid = t.oid
  ) as constraints,
  (
    select coalesce(jsonb_agg(jsonb_build_object(
      'name', ic.relname,
      'definition', pg_catalog.pg_get_indexdef(i.indexrelid),
      'valid', i.indisvalid,
      'ready', i.indisready,
      'primary', i.indisprimary,
      'unique', i.indisunique,
      'replica_identity', i.indisreplident
    ) order by ic.relname), '[]'::jsonb)
    from pg_catalog.pg_index i
    join pg_catalog.pg_class ic on ic.oid = i.indexrelid
    where i.indrelid = t.oid
  ) as indexes,
  (
    select coalesce(jsonb_agg(jsonb_build_object(
      'name', tr.tgname,
      'enabled', tr.tgenabled,
      'internal', tr.tgisinternal,
      'definition', pg_catalog.pg_get_triggerdef(tr.oid, true),
      'function', tr.tgfoid::regprocedure::text
    ) order by tr.tgname), '[]'::jsonb)
    from pg_catalog.pg_trigger tr
    where tr.tgrelid = t.oid and not tr.tgisinternal
  ) as triggers,
  (
    select coalesce(jsonb_agg(jsonb_build_object(
      'name', p.polname,
      'permissive', p.polpermissive,
      'command', p.polcmd,
      'roles', (select jsonb_agg(pg_catalog.pg_get_userbyid(r)) from unnest(p.polroles) r),
      'using', pg_catalog.pg_get_expr(p.polqual, p.polrelid, true),
      'with_check', pg_catalog.pg_get_expr(p.polwithcheck, p.polrelid, true)
    ) order by p.polname), '[]'::jsonb)
    from pg_catalog.pg_policy p
    where p.polrelid = t.oid
  ) as policies,
  (
    select coalesce(jsonb_agg(jsonb_build_object(
      'grantor', pg_catalog.pg_get_userbyid(x.grantor),
      'grantee', case when x.grantee = 0 then 'PUBLIC' else pg_catalog.pg_get_userbyid(x.grantee) end,
      'privilege', x.privilege_type,
      'grantable', x.is_grantable
    ) order by 2::text, 3::text), '[]'::jsonb)
    from pg_catalog.aclexplode(coalesce(t.relacl, pg_catalog.acldefault('r', t.relowner))) x
  ) as effective_acl,
  pg_catalog.obj_description(t.oid, 'pg_class') as comment
from target_tables t
order by t.relname;

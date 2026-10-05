-- Phase 8B catalog/grant smoke test for an isolated staging database.
-- Run with psql as a database owner only after applying the Phase 8B delta.
-- This script reads catalogs/capability metadata and creates no persistent data.
-- Never run it against project rithmbggiiusrmdcqrif during offline preparation.

begin;
set transaction read only;

do $test$
declare
    signature text;
    result_type text;
    trigger_count integer;
    capability_count integer;
begin
    select pg_get_function_identity_arguments(p.oid),
           pg_get_function_result(p.oid)
      into signature, result_type
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'save_roster_state'
      and p.proargtypes = '20 23 3802 25'::oidvector;

    if signature is distinct from
       'expected_revision bigint, new_schema_version integer, new_payload jsonb, new_client_id text' then
        raise exception 'save_roster_state signature changed: %', signature;
    end if;

    if result_type is distinct from
       'TABLE(revision bigint, updated_at timestamp with time zone)' then
        raise exception 'save_roster_state return changed: %', result_type;
    end if;

    select count(*) into trigger_count
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('roster_state', 'roster_revisions')
      and not t.tgisinternal
      and t.tgenabled = 'O'
      and t.tgname in (
          'roster_state_guard',
          'roster_state_write_history',
          'roster_revision_guard'
      );

    if trigger_count <> 3 then
        raise exception 'expected three Phase 8B roster triggers, found %', trigger_count;
    end if;

    if has_function_privilege(
        'anon',
        'public.save_roster_state(bigint,integer,jsonb,text)',
        'EXECUTE'
    ) then
        raise exception 'anon still has save_roster_state EXECUTE';
    end if;

    if has_function_privilege(
        'anon',
        'public.rotate_roster_encryption_wrappers(bigint,jsonb,text)',
        'EXECUTE'
    ) then
        raise exception 'anon still has wrapper-rotation EXECUTE';
    end if;

    if has_function_privilege(
        'anon',
        'public.purge_unencrypted_roster_history()',
        'EXECUTE'
    ) then
        raise exception 'anon still has history-purge EXECUTE';
    end if;

    if not has_function_privilege(
        'authenticated',
        'public.save_roster_state(bigint,integer,jsonb,text)',
        'EXECUTE'
    ) then
        raise exception 'authenticated lost save_roster_state EXECUTE';
    end if;

    if not has_function_privilege(
        'authenticated',
        'public.rotate_roster_encryption_wrappers(bigint,jsonb,text)',
        'EXECUTE'
    ) then
        raise exception 'authenticated lost wrapper-rotation EXECUTE';
    end if;

    if not has_function_privilege(
        'authenticated',
        'public.purge_unencrypted_roster_history()',
        'EXECUTE'
    ) then
        raise exception 'authenticated lost history-purge EXECUTE';
    end if;

    if has_table_privilege('service_role', 'public.roster_state', 'INSERT')
       or has_table_privilege('service_role', 'public.roster_state', 'UPDATE')
       or has_table_privilege('service_role', 'public.roster_state', 'DELETE')
       or has_table_privilege('service_role', 'public.roster_revisions', 'INSERT')
       or has_table_privilege('service_role', 'public.roster_revisions', 'UPDATE')
       or has_table_privilege('service_role', 'public.roster_revisions', 'DELETE') then
        raise exception 'service_role still has direct roster DML';
    end if;

    if not has_table_privilege('service_role', 'public.roster_state', 'SELECT')
       or not has_table_privilege('service_role', 'public.roster_revisions', 'SELECT') then
        raise exception 'service_role roster read capability was not retained';
    end if;

    if has_table_privilege('authenticated', 'public.roster_state', 'UPDATE')
       or has_table_privilege('authenticated', 'public.roster_revisions', 'INSERT') then
        raise exception 'authenticated gained direct roster DML';
    end if;

    if not exists (
        select 1 from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and c.relname in ('roster_state', 'roster_revisions')
          and c.relrowsecurity
        group by n.nspname
        having count(*) = 2
    ) then
        raise exception 'roster RLS is not enabled on both tables';
    end if;

    select count(*) into capability_count
    from public.roster_schema_capability
    where singleton = true
      and min_writable_schema = 4
      and max_writable_schema in (4, 5);

    if capability_count <> 1 then
        raise exception 'schema capability row is missing or invalid';
    end if;
end;
$test$;

rollback;

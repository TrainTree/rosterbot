-- RosterBot v0.30 Phase 8B production rollback.
--
-- Restores the exact three Phase 8A roster RPC definitions and their grants,
-- removes the Phase 8B triggers/helpers/capability object, and restores the
-- captured service_role table privileges. It never updates or deletes a row.
--
-- SAFE ONLY while every roster_state and roster_revisions row is schema 4.

begin;

set local lock_timeout = '10s';
set local statement_timeout = '5min';

lock table public.roster_state, public.roster_revisions
    in access exclusive mode;

do $rollback_guard$
declare
    capability_count integer;
begin
    if to_regclass('public.roster_schema_capability') is null then
        raise exception 'Phase 8B capability table is absent; refusing rollback';
    end if;

    select count(*)
      into capability_count
    from public.roster_schema_capability
    where singleton = true
      and min_writable_schema = 4
      and max_writable_schema = 4;

    if capability_count <> 1 then
        raise exception 'Capability is not exactly schema 4; refusing rollback';
    end if;

    if exists (
        select 1 from public.roster_state where schema_version <> 4
    ) or exists (
        select 1 from public.roster_revisions where schema_version <> 4
    ) then
        raise exception 'Non-schema-4 roster rows exist; refusing rollback';
    end if;
end;
$rollback_guard$;

drop trigger if exists roster_revision_guard on public.roster_revisions;
drop trigger if exists roster_state_write_history on public.roster_state;
drop trigger if exists roster_state_guard on public.roster_state;

create or replace function public.purge_unencrypted_roster_history()
 returns table(deleted_count bigint)
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
    uid uuid := auth.uid();
    removed bigint := 0;
begin
    if uid is null then
        raise exception 'not_authenticated';
    end if;

    -- Safety guard:
    -- Never destroy old plaintext history until the user's CURRENT
    -- cloud state has already been successfully replaced by an
    -- encrypted RosterBot payload.
    if not exists (
        select 1
        from public.roster_state rs
        where rs.user_id = uid
          and rs.payload->>'format' = 'rosterbot-encrypted-v1'
    ) then
        raise exception 'encrypted_current_state_required';
    end if;

    delete from public.roster_revisions rr
    where rr.user_id = uid
      and coalesce(rr.payload->>'format', '') <> 'rosterbot-encrypted-v1';

    get diagnostics removed = row_count;

    return query
    select removed;
end;
$function$;

alter function public.purge_unencrypted_roster_history() owner to postgres;

create or replace function public.rotate_roster_encryption_wrappers(expected_revision bigint, new_payload jsonb, new_client_id text default null::text)
 returns table(revision bigint, updated_at timestamp with time zone, deleted_count bigint)
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
    uid uuid := auth.uid();
    current_revision bigint;
    current_payload jsonb;
    current_schema_version integer;
    next_revision bigint;
    save_time timestamptz := now();
    removed bigint := 0;
begin
    if uid is null then
        raise exception 'not_authenticated';
    end if;

    if new_payload is null then
        raise exception 'payload_required';
    end if;

    select rs.revision, rs.payload, rs.schema_version
      into current_revision, current_payload, current_schema_version
    from public.roster_state rs
    where rs.user_id = uid
    for update;

    if not found then
        raise exception 'cloud_state_required';
    end if;

    if expected_revision is distinct from current_revision then
        raise exception 'revision_conflict: expected %, current %', expected_revision, current_revision;
    end if;

    if coalesce(current_payload->>'format', '') <> 'rosterbot-encrypted-v1' then
        raise exception 'encrypted_current_state_required';
    end if;

    if coalesce(new_payload->>'format', '') <> 'rosterbot-encrypted-v1' then
        raise exception 'encrypted_new_state_required';
    end if;

    -- Key management may change ONLY the passphrase/recovery wrappers.
    -- The roster ciphertext, IV, keyed fingerprint, key id, schema and all
    -- other envelope fields must remain byte-for-byte/jsonb-equivalent.
    if (new_payload - 'crypto') is distinct from (current_payload - 'crypto') then
        raise exception 'wrapper_rotation_payload_mismatch';
    end if;

    if ((new_payload->'crypto') - 'passphraseWrap' - 'recoveryWrap')
       is distinct from
       ((current_payload->'crypto') - 'passphraseWrap' - 'recoveryWrap') then
        raise exception 'wrapper_rotation_crypto_mismatch';
    end if;

    if coalesce(jsonb_typeof(new_payload->'crypto'->'passphraseWrap'), '') <> 'object' then
        raise exception 'passphrase_wrapper_required';
    end if;

    if coalesce(jsonb_typeof(new_payload->'crypto'->'recoveryWrap'), '') <> 'object' then
        raise exception 'recovery_wrapper_required';
    end if;

    next_revision := current_revision + 1;

    update public.roster_state
    set revision = next_revision,
        schema_version = current_schema_version,
        payload = new_payload,
        client_id = new_client_id,
        updated_at = save_time
    where user_id = uid;

    insert into public.roster_revisions
      (user_id, revision, schema_version, payload, client_id, created_at)
    values
      (uid, next_revision, current_schema_version, new_payload, new_client_id, save_time);

    -- Deliberately remove every older revision. Keeping even one older
    -- encrypted revision would keep the old passphrase/recovery wrapper and
    -- would defeat revocation of that credential.
    delete from public.roster_revisions rr
    where rr.user_id = uid
      and rr.revision < next_revision;

    get diagnostics removed = row_count;

    return query
    select next_revision, save_time, removed;
end;
$function$;

alter function public.rotate_roster_encryption_wrappers(bigint, jsonb, text)
    owner to postgres;

create or replace function public.save_roster_state(expected_revision bigint, new_schema_version integer, new_payload jsonb, new_client_id text default null::text)
 returns table(revision bigint, updated_at timestamp with time zone)
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
    uid uuid := auth.uid();
    current_revision bigint;
    next_revision bigint;
    save_time timestamptz := now();
begin

    if uid is null then
        raise exception 'not_authenticated';
    end if;

    if new_payload is null then
        raise exception 'payload_required';
    end if;

    -- Lock this user's current state while saving.
    select rs.revision
    into current_revision
    from public.roster_state rs
    where rs.user_id = uid
    for update;

    if not found then

        -- Brand-new cloud roster must begin from revision zero.
        if coalesce(expected_revision, 0) <> 0 then
            raise exception
                'revision_conflict: expected %, current 0',
                expected_revision;
        end if;

        next_revision := 1;

        insert into public.roster_state (
            user_id,
            revision,
            schema_version,
            payload,
            client_id,
            updated_at
        )
        values (
            uid,
            next_revision,
            new_schema_version,
            new_payload,
            new_client_id,
            save_time
        );

    else

        -- Refuse to overwrite changes made by another device.
        if expected_revision is distinct from current_revision then
            raise exception
                'revision_conflict: expected %, current %',
                expected_revision,
                current_revision;
        end if;

        next_revision := current_revision + 1;

        update public.roster_state
        set revision = next_revision,
            schema_version = new_schema_version,
            payload = new_payload,
            client_id = new_client_id,
            updated_at = save_time
        where user_id = uid;

    end if;


    -- Every successful save becomes a restorable revision.
    insert into public.roster_revisions (
        user_id,
        revision,
        schema_version,
        payload,
        client_id,
        created_at
    )
    values (
        uid,
        next_revision,
        new_schema_version,
        new_payload,
        new_client_id,
        save_time
    );

    return query
    select next_revision, save_time;

end;
$function$;

alter function public.save_roster_state(bigint, integer, jsonb, text)
    owner to postgres;

-- Restore the exact captured Phase 8A explicit grants.
revoke all on table public.roster_state
    from public, anon, authenticated, service_role;
grant select on table public.roster_state to authenticated;
grant all on table public.roster_state to service_role;

revoke all on table public.roster_revisions
    from public, anon, authenticated, service_role;
grant select on table public.roster_revisions to authenticated;
grant all on table public.roster_revisions to service_role;

revoke all on function public.save_roster_state(bigint, integer, jsonb, text)
    from public, anon, authenticated, service_role;
grant execute on function public.save_roster_state(bigint, integer, jsonb, text)
    to anon, authenticated, service_role;

revoke all on function public.rotate_roster_encryption_wrappers(bigint, jsonb, text)
    from public, anon, authenticated, service_role;
grant execute on function public.rotate_roster_encryption_wrappers(bigint, jsonb, text)
    to anon, authenticated, service_role;

revoke all on function public.purge_unencrypted_roster_history()
    from public, anon, authenticated, service_role;
grant execute on function public.purge_unencrypted_roster_history()
    to anon, authenticated, service_role;

drop function public._roster_revision_guard();
drop function public._roster_state_write_history();
drop function public._roster_state_guard();
drop function public._validate_roster_payload(integer, jsonb, boolean);
drop function public._roster_jsonb_is_integer(jsonb);
drop table public.roster_schema_capability;

commit;

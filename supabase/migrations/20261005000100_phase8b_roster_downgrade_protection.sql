-- RosterBot v0.30 Phase 8B: atomic downgrade and first-write protection.
--
-- DELTA ONLY. This migration assumes the exact Phase 8A captured schema already
-- exists. The linked project's migration history is empty, so this file cannot
-- create a fresh RosterBot backend and MUST NOT be treated as a baseline.
--
-- Offline/preparation status: do not mark this migration applied on the linked
-- project. Apply and test it in an isolated staging project first.

begin;

-- The production-safe default remains schema 4. Staging may deliberately set
-- max_writable_schema to 5 for the hypothetical 4 -> 5 test matrix only.
create table public.roster_schema_capability (
    singleton boolean primary key default true check (singleton),
    min_writable_schema integer not null default 4
        check (min_writable_schema = 4),
    max_writable_schema integer not null default 4
        check (max_writable_schema between 4 and 5),
    updated_at timestamptz not null default now(),
    check (min_writable_schema <= max_writable_schema)
);

alter table public.roster_schema_capability owner to postgres;
alter table public.roster_schema_capability enable row level security;
revoke all on table public.roster_schema_capability
    from public, anon, authenticated, service_role;

insert into public.roster_schema_capability
    (singleton, min_writable_schema, max_writable_schema)
values
    (true, 4, 4);

-- JSONB represents 4 and 4.0 differently when rendered as text. RosterBot's
-- schema metadata is deliberately an integer, not merely a numeric value.
create or replace function public._roster_jsonb_is_integer(value jsonb)
returns boolean
language sql
immutable
parallel safe
set search_path = public, pg_temp
as $function$
    select case
        when jsonb_typeof(value) = 'number'
         and (value #>> '{}') ~ '^-?(0|[1-9][0-9]*)$'
        then (value #>> '{}')::numeric between -2147483648 and 2147483647
        else false
    end;
$function$;

alter function public._roster_jsonb_is_integer(jsonb) owner to postgres;
revoke all on function public._roster_jsonb_is_integer(jsonb)
    from public, anon, authenticated, service_role;

-- Validate only metadata visible to PostgreSQL. Encrypted inner state remains
-- opaque; schema_version and the authenticated outer schemaVersion are the
-- authoritative server-side schema metadata for encrypted payloads.
create or replace function public._validate_roster_payload(
    incoming_schema integer,
    incoming_payload jsonb,
    enforce_capability boolean default true
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
    minimum_schema integer;
    maximum_schema integer;
    declared_schema integer;
    payload_format text;
    crypto_object jsonb;
    passphrase_wrapper jsonb;
    recovery_wrapper jsonb;
begin
    if incoming_schema is null then
        raise exception using
            errcode = 'RB002',
            message = 'schema_unsupported',
            detail = 'incoming_schema=null';
    end if;

    if enforce_capability then
        select min_writable_schema, max_writable_schema
          into minimum_schema, maximum_schema
        from public.roster_schema_capability
        where singleton = true;

        if not found then
            raise exception using
                errcode = 'RB007',
                message = 'state_invariant_violation',
                detail = 'schema_capability_missing';
        end if;

        if incoming_schema < minimum_schema then
            raise exception using
                errcode = 'RB002',
                message = 'schema_unsupported',
                detail = format(
                    'incoming_schema=%s accepted_schema=%s..%s',
                    incoming_schema,
                    minimum_schema,
                    maximum_schema
                );
        end if;

        if incoming_schema > maximum_schema then
            raise exception using
                errcode = 'RB002',
                message = 'schema_too_new',
                detail = format(
                    'incoming_schema=%s max_writable_schema=%s',
                    incoming_schema,
                    maximum_schema
                );
        end if;
    elsif incoming_schema not between 4 and 5 then
        raise exception using
            errcode = 'RB002',
            message = 'schema_unsupported',
            detail = format('incoming_schema=%s', incoming_schema);
    end if;

    if incoming_payload is null
       or jsonb_typeof(incoming_payload) is distinct from 'object' then
        raise exception using
            errcode = 'RB005',
            message = 'payload_malformed',
            detail = 'payload_must_be_json_object';
    end if;

    payload_format := incoming_payload->>'format';

    if payload_format = 'rosterbot-encrypted-v1' then
        if not public._roster_jsonb_is_integer(incoming_payload->'schemaVersion') then
            raise exception using
                errcode = 'RB004',
                message = 'payload_schema_mismatch',
                detail = 'encrypted_outer_schema_missing_or_malformed';
        end if;

        declared_schema := (incoming_payload->>'schemaVersion')::integer;
        if declared_schema <> incoming_schema then
            raise exception using
                errcode = 'RB004',
                message = 'payload_schema_mismatch',
                detail = format(
                    'incoming_schema=%s payload_schema=%s',
                    incoming_schema,
                    declared_schema
                );
        end if;

        crypto_object := incoming_payload->'crypto';
        passphrase_wrapper := crypto_object->'passphraseWrap';
        recovery_wrapper := crypto_object->'recoveryWrap';

        if jsonb_typeof(crypto_object) is distinct from 'object'
           or not public._roster_jsonb_is_integer(crypto_object->'version')
           or crypto_object->>'version' is distinct from '1'
           or crypto_object->>'cipher' is distinct from 'AES-GCM-256'
           or jsonb_typeof(crypto_object->'keyId') is distinct from 'string'
           or length(crypto_object->>'keyId') not between 1 and 200
           or jsonb_typeof(crypto_object->'fingerprint') is distinct from 'string'
           or (crypto_object->>'fingerprint') !~ '^[0-9a-f]{64}$'
           or jsonb_typeof(crypto_object->'payloadIv') is distinct from 'string'
           or length(crypto_object->>'payloadIv') not between 16 and 128
           or (crypto_object->>'payloadIv') !~ '^[A-Za-z0-9_-]+$'
           or jsonb_typeof(incoming_payload->'ciphertext') is distinct from 'string'
           or length(incoming_payload->>'ciphertext') < 1
           or (incoming_payload->>'ciphertext') !~ '^[A-Za-z0-9_-]+$' then
            raise exception using
                errcode = 'RB005',
                message = 'payload_malformed',
                detail = 'encrypted_outer_envelope_invalid';
        end if;

        if jsonb_typeof(passphrase_wrapper) is distinct from 'object'
           or passphrase_wrapper->>'kdf' is distinct from 'PBKDF2-SHA-256'
           or not public._roster_jsonb_is_integer(passphrase_wrapper->'iterations')
           or passphrase_wrapper->>'iterations' = '0'
           or passphrase_wrapper->>'iterations' ~ '^-'
           or jsonb_typeof(passphrase_wrapper->'salt') is distinct from 'string'
           or (passphrase_wrapper->>'salt') !~ '^[A-Za-z0-9_-]+$'
           or jsonb_typeof(passphrase_wrapper->'iv') is distinct from 'string'
           or (passphrase_wrapper->>'iv') !~ '^[A-Za-z0-9_-]+$'
           or jsonb_typeof(passphrase_wrapper->'ciphertext') is distinct from 'string'
           or (passphrase_wrapper->>'ciphertext') !~ '^[A-Za-z0-9_-]+$' then
            raise exception using
                errcode = 'RB005',
                message = 'payload_malformed',
                detail = 'passphrase_wrapper_invalid';
        end if;

        if jsonb_typeof(recovery_wrapper) is distinct from 'object'
           or recovery_wrapper->>'type' is distinct from 'random-256'
           or jsonb_typeof(recovery_wrapper->'iv') is distinct from 'string'
           or (recovery_wrapper->>'iv') !~ '^[A-Za-z0-9_-]+$'
           or jsonb_typeof(recovery_wrapper->'ciphertext') is distinct from 'string'
           or (recovery_wrapper->>'ciphertext') !~ '^[A-Za-z0-9_-]+$' then
            raise exception using
                errcode = 'RB005',
                message = 'payload_malformed',
                detail = 'recovery_wrapper_invalid';
        end if;

        return;
    end if;

    if payload_format = 'rosterbot-personal-state' then
        if not public._roster_jsonb_is_integer(incoming_payload->'storageSchemaVersion') then
            raise exception using
                errcode = 'RB004',
                message = 'payload_schema_mismatch',
                detail = 'plaintext_schema5_metadata_missing_or_malformed';
        end if;

        declared_schema := (incoming_payload->>'storageSchemaVersion')::integer;
        if declared_schema <> incoming_schema then
            raise exception using
                errcode = 'RB004',
                message = 'payload_schema_mismatch',
                detail = format(
                    'incoming_schema=%s payload_schema=%s',
                    incoming_schema,
                    declared_schema
                );
        end if;

        if incoming_schema <> 5
           or not public._roster_jsonb_is_integer(incoming_payload->'formatVersion')
           or incoming_payload->>'formatVersion' is distinct from '1'
           or not public._roster_jsonb_is_integer(incoming_payload->'minimumReaderSchema')
           or incoming_payload->>'minimumReaderSchema' is distinct from '5'
           or jsonb_typeof(incoming_payload->'writer') is distinct from 'object'
           or jsonb_typeof(incoming_payload->'generation') is distinct from 'object'
           or jsonb_typeof(incoming_payload->'checksum') is distinct from 'object'
           or jsonb_typeof(incoming_payload->'timestamps') is distinct from 'object'
           or jsonb_typeof(incoming_payload->'personalState') is distinct from 'object'
           or jsonb_typeof(incoming_payload->'extensions') is distinct from 'object'
           or jsonb_typeof(incoming_payload->'migration') is distinct from 'object'
           or not (incoming_payload ? 'previousGeneration')
           or not (
               incoming_payload->'previousGeneration' = 'null'::jsonb
               or jsonb_typeof(incoming_payload->'previousGeneration') = 'object'
           )
           or jsonb_typeof(incoming_payload->'compatibility') is distinct from 'object' then
            raise exception using
                errcode = 'RB005',
                message = 'payload_malformed',
                detail = 'plaintext_schema5_envelope_invalid';
        end if;

        return;
    end if;

    if incoming_payload ? 'app' then
        if not public._roster_jsonb_is_integer(incoming_payload->'schemaVersion') then
            raise exception using
                errcode = 'RB004',
                message = 'payload_schema_mismatch',
                detail = 'plaintext_schema4_metadata_missing_or_malformed';
        end if;

        declared_schema := (incoming_payload->>'schemaVersion')::integer;
        if declared_schema <> incoming_schema then
            raise exception using
                errcode = 'RB004',
                message = 'payload_schema_mismatch',
                detail = format(
                    'incoming_schema=%s payload_schema=%s',
                    incoming_schema,
                    declared_schema
                );
        end if;

        if incoming_schema <> 4
           or incoming_payload->>'app' is distinct from 'RosterBotPayBot'
           or jsonb_typeof(incoming_payload->'storage') is distinct from 'object' then
            raise exception using
                errcode = 'RB005',
                message = 'payload_malformed',
                detail = 'plaintext_schema4_envelope_invalid';
        end if;

        if (incoming_payload->'storage') ? 'rosterbot-db-schema-v1'
           and (
               jsonb_typeof(incoming_payload->'storage'->'rosterbot-db-schema-v1') is distinct from 'string'
               or incoming_payload->'storage'->>'rosterbot-db-schema-v1' is distinct from '4'
           ) then
            raise exception using
                errcode = 'RB004',
                message = 'payload_schema_mismatch',
                detail = 'plaintext_schema4_storage_marker_mismatch';
        end if;

        return;
    end if;

    raise exception using
        errcode = 'RB005',
        message = 'payload_malformed',
        detail = 'payload_discriminator_missing_or_unsupported';
end;
$function$;

alter function public._validate_roster_payload(integer, jsonb, boolean)
    owner to postgres;
revoke all on function public._validate_roster_payload(integer, jsonb, boolean)
    from public, anon, authenticated, service_role;

-- This trigger is the database boundary for current state. It also acquires
-- the same per-user transaction lock as the RPC, so a privileged direct DML
-- operation cannot race an RPC around the no-row case while triggers remain
-- enabled.
create or replace function public._roster_state_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
    perform pg_advisory_xact_lock(
        hashtextextended('rosterbot.roster_state:' || new.user_id::text, 0)
    );

    if tg_op = 'INSERT' then
        if new.revision <> 1 then
            raise exception using
                errcode = 'RB007',
                message = 'state_invariant_violation',
                detail = format('first_revision_must_be_1 received=%s', new.revision);
        end if;

        perform public._validate_roster_payload(
            new.schema_version,
            new.payload,
            true
        );
        return new;
    end if;

    if new.user_id is distinct from old.user_id then
        raise exception using
            errcode = 'RB007',
            message = 'state_invariant_violation',
            detail = 'state_owner_is_immutable';
    end if;

    if new.schema_version < old.schema_version then
        raise exception using
            errcode = 'RB001',
            message = 'schema_too_old',
            detail = format(
                'current_schema=%s incoming_schema=%s',
                old.schema_version,
                new.schema_version
            );
    end if;

    if new.revision <> old.revision + 1 then
        raise exception using
            errcode = 'RB007',
            message = 'state_invariant_violation',
            detail = format(
                'revision_must_increment_by_one current=%s incoming=%s',
                old.revision,
                new.revision
            );
    end if;

    perform public._validate_roster_payload(
        new.schema_version,
        new.payload,
        coalesce(new.schema_version > old.schema_version, false)
    );

    return new;
end;
$function$;

alter function public._roster_state_guard() owner to postgres;
revoke all on function public._roster_state_guard()
    from public, anon, authenticated, service_role;

create trigger roster_state_guard
before insert or update on public.roster_state
for each row execute function public._roster_state_guard();

-- Current-state DML is the single source of new revision rows. This preserves
-- history even if a privileged maintenance writer is later granted direct DML.
create or replace function public._roster_state_write_history()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
    insert into public.roster_revisions (
        user_id,
        revision,
        schema_version,
        payload,
        client_id,
        created_at
    ) values (
        new.user_id,
        new.revision,
        new.schema_version,
        new.payload,
        new.client_id,
        new.updated_at
    );

    return new;
end;
$function$;

alter function public._roster_state_write_history() owner to postgres;
revoke all on function public._roster_state_write_history()
    from public, anon, authenticated, service_role;

create trigger roster_state_write_history
after insert or update on public.roster_state
for each row execute function public._roster_state_write_history();

-- History rows must agree with their schema metadata and cannot be rewritten.
-- Deletes remain possible only for the two captured credential/history cleanup
-- RPCs and database-owner break-glass administration.
create or replace function public._roster_revision_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
    if tg_op = 'UPDATE' then
        raise exception using
            errcode = 'RB007',
            message = 'state_invariant_violation',
            detail = 'revision_rows_are_immutable';
    end if;

    perform public._validate_roster_payload(
        new.schema_version,
        new.payload,
        false
    );
    return new;
end;
$function$;

alter function public._roster_revision_guard() owner to postgres;
revoke all on function public._roster_revision_guard()
    from public, anon, authenticated, service_role;

create trigger roster_revision_guard
before insert or update on public.roster_revisions
for each row execute function public._roster_revision_guard();

-- Signature, argument names/default, SECURITY DEFINER behavior and successful
-- two-column result are exactly the captured callable contract.
create or replace function public.save_roster_state(
    expected_revision bigint,
    new_schema_version integer,
    new_payload jsonb,
    new_client_id text default null::text
)
returns table(revision bigint, updated_at timestamptz)
language plpgsql
volatile
parallel unsafe
security definer
set search_path = public, pg_temp
as $function$
declare
    uid uuid := auth.uid();
    current_revision bigint;
    current_schema_version integer;
    next_revision bigint;
    save_time timestamptz := now();
begin
    if uid is null then
        raise exception using
            errcode = 'RB006',
            message = 'not_authenticated';
    end if;

    perform pg_advisory_xact_lock(
        hashtextextended('rosterbot.roster_state:' || uid::text, 0)
    );

    select rs.revision, rs.schema_version
      into current_revision, current_schema_version
    from public.roster_state rs
    where rs.user_id = uid
    for update;

    -- Downgrade classification deliberately precedes payload and revision
    -- checks. A stale old client therefore receives schema_too_old even when
    -- its expected revision is also stale.
    if found and new_schema_version < current_schema_version then
        raise exception using
            errcode = 'RB001',
            message = 'schema_too_old',
            detail = format(
                'current_schema=%s incoming_schema=%s',
                current_schema_version,
                new_schema_version
            );
    end if;

    perform public._validate_roster_payload(
        new_schema_version,
        new_payload,
        true
    );

    if current_revision is null then
        -- Preserve the captured compatibility behavior: NULL and zero both
        -- mean revision zero only when no state exists.
        if coalesce(expected_revision, 0) <> 0 then
            raise exception using
                errcode = 'RB003',
                message = 'revision_conflict',
                detail = format(
                    'expected_revision=%s current_revision=0',
                    coalesce(expected_revision::text, 'null')
                );
        end if;

        next_revision := 1;
        insert into public.roster_state (
            user_id,
            revision,
            schema_version,
            payload,
            client_id,
            updated_at
        ) values (
            uid,
            next_revision,
            new_schema_version,
            new_payload,
            new_client_id,
            save_time
        );
    else
        if expected_revision is distinct from current_revision then
            raise exception using
                errcode = 'RB003',
                message = 'revision_conflict',
                detail = format(
                    'expected_revision=%s current_revision=%s',
                    coalesce(expected_revision::text, 'null'),
                    current_revision
                );
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

    return query select next_revision, save_time;
end;
$function$;

alter function public.save_roster_state(bigint, integer, jsonb, text)
    owner to postgres;

-- Wrapper rotation remains a schema-preserving state write. It participates
-- in the same per-user serialization and uses the same payload validator. The
-- state trigger creates the new history row before older wrappers are pruned.
create or replace function public.rotate_roster_encryption_wrappers(
    expected_revision bigint,
    new_payload jsonb,
    new_client_id text default null::text
)
returns table(revision bigint, updated_at timestamptz, deleted_count bigint)
language plpgsql
volatile
parallel unsafe
security definer
set search_path = public, pg_temp
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
        raise exception using
            errcode = 'RB006',
            message = 'not_authenticated';
    end if;

    perform pg_advisory_xact_lock(
        hashtextextended('rosterbot.roster_state:' || uid::text, 0)
    );

    select rs.revision, rs.payload, rs.schema_version
      into current_revision, current_payload, current_schema_version
    from public.roster_state rs
    where rs.user_id = uid
    for update;

    if not found then
        raise exception 'cloud_state_required';
    end if;

    if expected_revision is distinct from current_revision then
        raise exception using
            errcode = 'RB003',
            message = 'revision_conflict',
            detail = format(
                'expected_revision=%s current_revision=%s',
                coalesce(expected_revision::text, 'null'),
                current_revision
            );
    end if;

    perform public._validate_roster_payload(
        current_schema_version,
        current_payload,
        false
    );
    perform public._validate_roster_payload(
        current_schema_version,
        new_payload,
        false
    );

    if current_payload->>'format' is distinct from 'rosterbot-encrypted-v1' then
        raise exception 'encrypted_current_state_required';
    end if;

    if new_payload->>'format' is distinct from 'rosterbot-encrypted-v1' then
        raise exception 'encrypted_new_state_required';
    end if;

    if (new_payload - 'crypto') is distinct from (current_payload - 'crypto') then
        raise exception 'wrapper_rotation_payload_mismatch';
    end if;

    if ((new_payload->'crypto') - 'passphraseWrap' - 'recoveryWrap')
       is distinct from
       ((current_payload->'crypto') - 'passphraseWrap' - 'recoveryWrap') then
        raise exception 'wrapper_rotation_crypto_mismatch';
    end if;

    next_revision := current_revision + 1;

    update public.roster_state
    set revision = next_revision,
        schema_version = current_schema_version,
        payload = new_payload,
        client_id = new_client_id,
        updated_at = save_time
    where user_id = uid;

    delete from public.roster_revisions rr
    where rr.user_id = uid
      and rr.revision < next_revision;

    get diagnostics removed = row_count;
    return query select next_revision, save_time, removed;
end;
$function$;

alter function public.rotate_roster_encryption_wrappers(bigint, jsonb, text)
    owner to postgres;

-- Lock current state across the encrypted-current guard and deletion so a
-- concurrent plaintext save cannot race the purge decision.
create or replace function public.purge_unencrypted_roster_history()
returns table(deleted_count bigint)
language plpgsql
volatile
parallel unsafe
security definer
set search_path = public, pg_temp
as $function$
declare
    uid uuid := auth.uid();
    current_payload jsonb;
    current_schema_version integer;
    removed bigint := 0;
begin
    if uid is null then
        raise exception using
            errcode = 'RB006',
            message = 'not_authenticated';
    end if;

    perform pg_advisory_xact_lock(
        hashtextextended('rosterbot.roster_state:' || uid::text, 0)
    );

    select rs.payload, rs.schema_version
      into current_payload, current_schema_version
    from public.roster_state rs
    where rs.user_id = uid
    for update;

    if not found
       or current_payload->>'format' is distinct from 'rosterbot-encrypted-v1' then
        raise exception 'encrypted_current_state_required';
    end if;

    perform public._validate_roster_payload(
        current_schema_version,
        current_payload,
        false
    );

    delete from public.roster_revisions rr
    where rr.user_id = uid
      and coalesce(rr.payload->>'format', '') <> 'rosterbot-encrypted-v1';

    get diagnostics removed = row_count;
    return query select removed;
end;
$function$;

alter function public.purge_unencrypted_roster_history() owner to postgres;

-- The captured application has no service-role roster writer. Keep its read
-- and RPC capability, but remove direct roster DML so bypass-RLS cannot bypass
-- the audited write functions. SECURITY DEFINER RPCs do not need caller table
-- DML privileges. Database-owner/superuser access remains break-glass.
revoke all on table public.roster_state from service_role;
grant select on table public.roster_state to service_role;
revoke all on table public.roster_revisions from service_role;
grant select on table public.roster_revisions to service_role;

-- Unauthenticated execution is not required: each function derives identity
-- from auth.uid() and every browser call carries an authenticated access token.
revoke execute on function public.save_roster_state(bigint, integer, jsonb, text)
    from public, anon;
revoke execute on function public.rotate_roster_encryption_wrappers(bigint, jsonb, text)
    from public, anon;
revoke execute on function public.purge_unencrypted_roster_history()
    from public, anon;

grant execute on function public.save_roster_state(bigint, integer, jsonb, text)
    to authenticated, service_role;
grant execute on function public.rotate_roster_encryption_wrappers(bigint, jsonb, text)
    to authenticated, service_role;
grant execute on function public.purge_unencrypted_roster_history()
    to authenticated, service_role;

commit;

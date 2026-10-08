-- RosterBot v0.30 Phase 10B staging-only server contract.
--
-- Apply only through supabase/deploy/phase10b-staging-executor.mjs, which is
-- pinned to wuzyurvrztskljpxpeaq and refuses the production project. This file
-- deliberately lives outside supabase/migrations so a production-linked CLI
-- workflow cannot discover it as a normal migration.

begin;

do $preflight$
declare
    capability_rows integer;
    minimum_schema integer;
    maximum_schema integer;
begin
    select count(*), min(min_writable_schema), max(max_writable_schema)
      into capability_rows, minimum_schema, maximum_schema
    from public.roster_schema_capability
    where singleton = true;

    if capability_rows <> 1 or minimum_schema <> 4 or maximum_schema <> 4 then
        raise exception 'Phase 10B requires an exact singleton capability of 4..4';
    end if;

    if (select count(*) from public.roster_state) <> 0
       or (select count(*) from public.roster_revisions) <> 0
       or (select count(*) from public.calendar_feeds) <> 0
       or (select count(*) from auth.users) <> 0 then
        raise exception 'Phase 10B staging must be empty before contract installation';
    end if;
end;
$preflight$;

create or replace function public._roster_jsonb_is_positive_safe_integer(value jsonb)
returns boolean
language sql
immutable
parallel safe
set search_path = public, pg_temp
as $function$
    select case
        when jsonb_typeof(value) = 'number'
         and (value #>> '{}') ~ '^(0|[1-9][0-9]*)$'
        then (value #>> '{}')::numeric between 1 and 9007199254740991
        else false
    end;
$function$;

alter function public._roster_jsonb_is_positive_safe_integer(jsonb)
    owner to postgres;
revoke all on function public._roster_jsonb_is_positive_safe_integer(jsonb)
    from public, anon, authenticated, service_role;

-- This is the strict, server-visible portion of the schema-5 plaintext wire
-- contract. Cryptographic checksum recomputation and lossless projection
-- verification remain client responsibilities.
create or replace function public._validate_roster_schema5_plaintext(
    incoming_payload jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
    writer_object jsonb := incoming_payload->'writer';
    generation_object jsonb := incoming_payload->'generation';
    checksum_object jsonb := incoming_payload->'checksum';
    timestamps_object jsonb := incoming_payload->'timestamps';
    personal_object jsonb := incoming_payload->'personalState';
    migration_object jsonb := incoming_payload->'migration';
    source_generation jsonb := incoming_payload->'migration'->'sourceGeneration';
    previous_generation jsonb := incoming_payload->'previousGeneration';
    compatibility_object jsonb := incoming_payload->'compatibility';
    generation_number text := incoming_payload->'generation'->>'number';
    generation_fingerprint text := incoming_payload->'generation'->>'fingerprint';
begin
    if incoming_payload is null
       or jsonb_typeof(incoming_payload) is distinct from 'object'
       or incoming_payload->>'format' is distinct from 'rosterbot-personal-state'
       or not public._roster_jsonb_is_integer(incoming_payload->'formatVersion')
       or incoming_payload->>'formatVersion' is distinct from '1'
       or not public._roster_jsonb_is_integer(incoming_payload->'storageSchemaVersion')
       or incoming_payload->>'storageSchemaVersion' is distinct from '5'
       or not public._roster_jsonb_is_integer(incoming_payload->'minimumReaderSchema')
       or incoming_payload->>'minimumReaderSchema' is distinct from '5'
       or jsonb_typeof(writer_object) is distinct from 'object'
       or writer_object->>'app' is distinct from 'RosterBotPayBot'
       or jsonb_typeof(writer_object->'version') is distinct from 'string'
       or length(writer_object->>'version') < 1
       or jsonb_typeof(writer_object->'build') is distinct from 'string'
       or length(writer_object->>'build') < 1
       or jsonb_typeof(generation_object) is distinct from 'object'
       or not public._roster_jsonb_is_positive_safe_integer(generation_object->'number')
       or jsonb_typeof(generation_object->'kind') is distinct from 'string'
       or generation_object->>'kind' not in ('state','clear')
       or jsonb_typeof(generation_object->'fingerprint') is distinct from 'string'
       or (generation_object->>'fingerprint') !~ '^[0-9a-f]{64}$'
       or generation_object->>'id' is distinct from
          generation_number || ':' || generation_fingerprint
       or not (generation_object ? 'predecessorFingerprint')
       or not (
           generation_object->'predecessorFingerprint' = 'null'::jsonb
           or (
               jsonb_typeof(generation_object->'predecessorFingerprint') = 'string'
               and (generation_object->>'predecessorFingerprint') ~ '^[0-9a-f]{64}$'
           )
       )
       or jsonb_typeof(checksum_object) is distinct from 'object'
       or checksum_object->>'algorithm' is distinct from 'SHA-256'
       or checksum_object->>'canonicalisation' is distinct from 'rosterbot-canonical-json-v1'
       or checksum_object->>'scope' is distinct from 'rosterbot-schema5-content-v1'
       or jsonb_typeof(checksum_object->'value') is distinct from 'string'
       or (checksum_object->>'value') !~ '^[0-9a-f]{64}$'
       or checksum_object->>'value' is distinct from generation_fingerprint
       or jsonb_typeof(timestamps_object) is distinct from 'object'
       or jsonb_typeof(timestamps_object->'createdAt') is distinct from 'string'
       or length(timestamps_object->>'createdAt') < 1
       or jsonb_typeof(timestamps_object->'updatedAt') is distinct from 'string'
       or length(timestamps_object->>'updatedAt') < 1
       or jsonb_typeof(personal_object) is distinct from 'object'
       or jsonb_typeof(personal_object->'kind') is distinct from 'string'
       or personal_object->>'kind' not in ('state','clear')
       or personal_object->>'kind' is distinct from generation_object->>'kind'
       or jsonb_typeof(personal_object->'entries') is distinct from 'object'
       or jsonb_typeof(incoming_payload->'extensions') is distinct from 'object'
       or jsonb_typeof(migration_object) is distinct from 'object'
       or not public._roster_jsonb_is_integer(migration_object->'fromSchema')
       or migration_object->>'fromSchema' is distinct from '4'
       or jsonb_typeof(migration_object->'migratedAt') is distinct from 'string'
       or length(migration_object->>'migratedAt') < 1
       or jsonb_typeof(migration_object->'source') is distinct from 'string'
       or length(migration_object->>'source') < 1
       or jsonb_typeof(migration_object->'sourceFingerprint') is distinct from 'string'
       or (migration_object->>'sourceFingerprint') !~ '^[0-9a-f]{64}$'
       or jsonb_typeof(migration_object->'warnings') is distinct from 'array'
       or not (migration_object ? 'sourceGeneration')
       or not (
           source_generation = 'null'::jsonb
           or (
               jsonb_typeof(source_generation) = 'object'
               and public._roster_jsonb_is_positive_safe_integer(source_generation->'number')
               and jsonb_typeof(source_generation->'fingerprint') = 'string'
               and (source_generation->>'fingerprint') ~ '^[0-9a-f]{64}$'
           )
       )
       or not (incoming_payload ? 'previousGeneration')
       or not (
           previous_generation = 'null'::jsonb
           or (
               jsonb_typeof(previous_generation) = 'object'
               and public._roster_jsonb_is_integer(previous_generation->'storageSchemaVersion')
               and (previous_generation->>'storageSchemaVersion') in ('4','5')
               and public._roster_jsonb_is_positive_safe_integer(previous_generation->'number')
               and jsonb_typeof(previous_generation->'fingerprint') = 'string'
               and (previous_generation->>'fingerprint') ~ '^[0-9a-f]{64}$'
               and previous_generation->>'fingerprint' is not distinct from
                   generation_object->>'predecessorFingerprint'
           )
       )
       or jsonb_typeof(compatibility_object) is distinct from 'object'
       or not public._roster_jsonb_is_integer(compatibility_object->'schemaVersion')
       or compatibility_object->>'schemaVersion' is distinct from '4'
       or compatibility_object->>'status' is distinct from 'lossless'
       or jsonb_typeof(compatibility_object->'projectionFingerprint') is distinct from 'string'
       or (compatibility_object->>'projectionFingerprint') !~ '^[0-9a-f]{64}$'
       or compatibility_object->>'projectionFingerprint' is distinct from
          migration_object->>'sourceFingerprint' then
        raise exception using
            errcode = 'RB005',
            message = 'payload_malformed',
            detail = 'plaintext_schema5_envelope_invalid';
    end if;
end;
$function$;

alter function public._validate_roster_schema5_plaintext(jsonb)
    owner to postgres;
revoke all on function public._validate_roster_schema5_plaintext(jsonb)
    from public, anon, authenticated, service_role;

-- Preserve the Phase 8B trigger names and ordering. The existing validator
-- remains the first check, so capability 4 rejects every schema-5 write with
-- RB002 before the dormant schema-5 contract can admit it.
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
        if new.schema_version = 5
           and new.payload->>'format' = 'rosterbot-personal-state' then
            perform public._validate_roster_schema5_plaintext(new.payload);
        end if;
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
    if new.schema_version = 5
       and new.payload->>'format' = 'rosterbot-personal-state' then
        perform public._validate_roster_schema5_plaintext(new.payload);
    end if;

    return new;
end;
$function$;

alter function public._roster_state_guard() owner to postgres;
revoke all on function public._roster_state_guard()
    from public, anon, authenticated, service_role;

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
    if new.schema_version = 5
       and new.payload->>'format' = 'rosterbot-personal-state' then
        perform public._validate_roster_schema5_plaintext(new.payload);
    end if;
    return new;
end;
$function$;

alter function public._roster_revision_guard() owner to postgres;
revoke all on function public._roster_revision_guard()
    from public, anon, authenticated, service_role;

-- No caller-supplied environment, ref, contract or capability values exist.
-- Authenticated clients can only attest the hard-bound staging identity and
-- the server-owned singleton capability row.
create or replace function public.get_roster_schema_capability()
returns jsonb
language plpgsql
stable
parallel safe
security definer
set search_path = public, pg_temp
as $function$
declare
    minimum_schema integer;
    maximum_schema integer;
begin
    if auth.uid() is null then
        raise exception using
            errcode = 'RB006',
            message = 'not_authenticated';
    end if;

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

    return jsonb_build_object(
        'environment', 'isolated-staging',
        'project_ref', 'wuzyurvrztskljpxpeaq',
        'contract', 'rosterbot-schema5-cloud-v1',
        'min_writable_schema', minimum_schema,
        'max_writable_schema', maximum_schema
    );
end;
$function$;

alter function public.get_roster_schema_capability() owner to postgres;
revoke execute on function public.get_roster_schema_capability()
    from public, anon, service_role;
grant execute on function public.get_roster_schema_capability()
    to authenticated;

do $postcondition$
begin
    if not exists (
        select 1
        from public.roster_schema_capability
        where singleton = true
          and min_writable_schema = 4
          and max_writable_schema = 4
    ) or (select count(*) from public.roster_schema_capability) <> 1 then
        raise exception 'Phase 10B installation changed the advertised capability';
    end if;
end;
$postcondition$;

commit;

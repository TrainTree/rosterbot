-- Phase 8A production public-schema capture for project rithmbggiiusrmdcqrif.
-- Captured 2026-10-05 from PostgreSQL 17.6 using read-only pg_catalog SELECTs.
--
-- IMPORTANT: `supabase db dump --linked --schema public` was attempted first,
-- but Supabase CLI 2.119.0 requires Docker or Podman for pg_dump and neither is
-- installed in this environment. This row-free file is reconstructed from the
-- exact pg_catalog definitions in catalog/*.json. It is not byte-for-byte
-- pg_dump output. No application tables or rows were queried.

ALTER SCHEMA public OWNER TO pg_database_owner;
REVOKE ALL ON SCHEMA public FROM PUBLIC, anon, authenticated, postgres, service_role;
GRANT USAGE ON SCHEMA public TO PUBLIC, anon, authenticated, postgres, service_role;

CREATE TABLE public.calendar_feeds (
    user_id uuid NOT NULL,
    token_hash text NOT NULL,
    ics_text text DEFAULT ''::text NOT NULL,
    event_count integer DEFAULT 0 NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT calendar_feeds_pkey PRIMARY KEY (user_id),
    CONSTRAINT calendar_feeds_token_hash_key UNIQUE (token_hash),
    CONSTRAINT calendar_feeds_event_count_check CHECK (event_count >= 0),
    CONSTRAINT calendar_feeds_token_hash_check CHECK (token_hash ~ '^[0-9a-f]{64}$'::text),
    CONSTRAINT calendar_feeds_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.calendar_feeds OWNER TO postgres;

CREATE TABLE public.roster_revisions (
    user_id uuid NOT NULL,
    revision bigint NOT NULL,
    schema_version integer NOT NULL,
    payload jsonb NOT NULL,
    client_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT roster_revisions_pkey PRIMARY KEY (user_id, revision),
    CONSTRAINT roster_revisions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.roster_revisions OWNER TO postgres;

CREATE TABLE public.roster_state (
    user_id uuid NOT NULL,
    revision bigint DEFAULT 0 NOT NULL,
    schema_version integer NOT NULL,
    payload jsonb NOT NULL,
    client_id text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT roster_state_pkey PRIMARY KEY (user_id),
    CONSTRAINT roster_state_revision_check CHECK (revision >= 0),
    CONSTRAINT roster_state_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.roster_state OWNER TO postgres;

CREATE OR REPLACE FUNCTION public.purge_unencrypted_roster_history()
 RETURNS TABLE(deleted_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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

ALTER FUNCTION public.purge_unencrypted_roster_history() OWNER TO postgres;

CREATE OR REPLACE FUNCTION public.rotate_roster_encryption_wrappers(expected_revision bigint, new_payload jsonb, new_client_id text DEFAULT NULL::text)
 RETURNS TABLE(revision bigint, updated_at timestamp with time zone, deleted_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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

ALTER FUNCTION public.rotate_roster_encryption_wrappers(bigint, jsonb, text) OWNER TO postgres;

CREATE OR REPLACE FUNCTION public.save_roster_state(expected_revision bigint, new_schema_version integer, new_payload jsonb, new_client_id text DEFAULT NULL::text)
 RETURNS TABLE(revision bigint, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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

ALTER FUNCTION public.save_roster_state(bigint, integer, jsonb, text) OWNER TO postgres;

CREATE OR REPLACE FUNCTION public.set_calendar_feed_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

ALTER FUNCTION public.set_calendar_feed_updated_at() OWNER TO postgres;

CREATE TRIGGER calendar_feeds_updated_at
BEFORE UPDATE ON public.calendar_feeds
FOR EACH ROW EXECUTE FUNCTION public.set_calendar_feed_updated_at();

ALTER TABLE public.calendar_feeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_feeds NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.roster_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roster_revisions NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.roster_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roster_state NO FORCE ROW LEVEL SECURITY;

CREATE POLICY calendar_feeds_delete_own ON public.calendar_feeds
AS PERMISSIVE FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY calendar_feeds_insert_own ON public.calendar_feeds
AS PERMISSIVE FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY calendar_feeds_select_own ON public.calendar_feeds
AS PERMISSIVE FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY calendar_feeds_update_own ON public.calendar_feeds
AS PERMISSIVE FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own roster history" ON public.roster_revisions
AS PERMISSIVE FOR SELECT TO authenticated
USING ((( SELECT auth.uid() AS uid)) = user_id);

CREATE POLICY "Users can read their own roster" ON public.roster_state
AS PERMISSIVE FOR SELECT TO authenticated
USING ((( SELECT auth.uid() AS uid)) = user_id);

REVOKE ALL ON TABLE public.calendar_feeds FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON TABLE public.calendar_feeds TO authenticated, service_role;

REVOKE ALL ON TABLE public.roster_revisions FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.roster_revisions TO authenticated;
GRANT ALL ON TABLE public.roster_revisions TO service_role;

REVOKE ALL ON TABLE public.roster_state FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.roster_state TO authenticated;
GRANT ALL ON TABLE public.roster_state TO service_role;

REVOKE ALL ON FUNCTION public.purge_unencrypted_roster_history() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.purge_unencrypted_roster_history() TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.rotate_roster_encryption_wrappers(bigint, jsonb, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rotate_roster_encryption_wrappers(bigint, jsonb, text) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.save_roster_state(bigint, integer, jsonb, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.save_roster_state(bigint, integer, jsonb, text) TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.set_calendar_feed_updated_at() TO PUBLIC, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
  GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
  GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;

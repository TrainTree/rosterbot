# Phase 8A sanitized deployed-backend inventory

This inventory compares the deployed definitions captured on 2026-10-05 with
`docs/supabase-persistence-contract-phase8a.md`. The linked ref was verified as
`rithmbggiiusrmdcqrif` before inspection. Its Supabase display name is
`rosterBot-sync-dev`, despite the client using it as the hosted deployment.

Exact machine-readable evidence is in `catalog/`; exact function bodies and
reconstructed row-free DDL are in `public-schema.sql`. No application or user
rows were read. The linked service versions were PostgreSQL 17.6.1.166 and
PostgREST v14.5 (with GoTrue v2.197.0 and Storage v1.77.5 also recorded).

## 1. Exact current table schemas

All three tables are owned by `postgres`, are ordinary persistent tables, use
default replica identity, have RLS enabled but not forced, and have no table
comments or custom reloptions.

### `public.roster_state`

| Column | Type | Null | Default |
| --- | --- | --- | --- |
| `user_id` | `uuid` | no | none |
| `revision` | `bigint` | no | `0` |
| `schema_version` | `integer` | no | none |
| `payload` | `jsonb` | no | none |
| `client_id` | `text` | yes | none |
| `updated_at` | `timestamptz` | no | `now()` |

Constraints and indexes:

- primary key `roster_state_pkey (user_id)`; this is the only index;
- `CHECK (revision >= 0)`;
- `user_id -> auth.users(id) ON DELETE CASCADE`.

There is no constraint on `schema_version`, payload shape, payload/column
schema agreement, or client id, and there is no trigger.

### `public.roster_revisions`

| Column | Type | Null | Default |
| --- | --- | --- | --- |
| `user_id` | `uuid` | no | none |
| `revision` | `bigint` | no | none |
| `schema_version` | `integer` | no | none |
| `payload` | `jsonb` | no | none |
| `client_id` | `text` | yes | none |
| `created_at` | `timestamptz` | no | `now()` |

Constraints and indexes:

- composite primary key `roster_revisions_pkey (user_id, revision)`; this is
  the only index;
- `user_id -> auth.users(id) ON DELETE CASCADE`.

There are no schema/payload checks, immutability constraints, retention
triggers, or other triggers.

### `public.calendar_feeds`

| Column | Type | Null | Default |
| --- | --- | --- | --- |
| `user_id` | `uuid` | no | none |
| `token_hash` | `text` | no | none |
| `ics_text` | `text` | no | `''::text` |
| `event_count` | `integer` | no | `0` |
| `enabled` | `boolean` | no | `true` |
| `updated_at` | `timestamptz` | no | `now()` |

Constraints and indexes:

- primary key `calendar_feeds_pkey (user_id)`;
- unique constraint/index `calendar_feeds_token_hash_key (token_hash)`;
- `CHECK (event_count >= 0)`;
- `CHECK (token_hash ~ '^[0-9a-f]{64}$')`;
- `user_id -> auth.users(id) ON DELETE CASCADE`.

## 2. Exact `save_roster_state` behavior

Signature:

```text
save_roster_state(
  expected_revision bigint,
  new_schema_version integer,
  new_payload jsonb,
  new_client_id text DEFAULT NULL
) RETURNS TABLE(revision bigint, updated_at timestamptz)
```

It is `plpgsql`, volatile, parallel-unsafe, `SECURITY DEFINER`, owned by
`postgres`, with `search_path = public, pg_temp`.

Behavior:

1. Gets identity only from `auth.uid()` and raises `not_authenticated` when it
   is null.
2. Rejects only a SQL-null payload (`payload_required`).
3. Selects the caller's current `revision` `FOR UPDATE`. It does not select or
   compare the current schema.
4. For no current row, treats null or zero `expected_revision` as zero, creates
   revision 1, and inserts current state.
5. For an existing row, compares `expected_revision` with the locked revision
   using `IS DISTINCT FROM`, raises a text `revision_conflict` on mismatch,
   increments the revision, and updates current state.
6. Inserts the same revision/schema/payload/client/time into history and
   returns the revision and transaction timestamp.

The update/current-history work is atomic because the function runs within one
PostgreSQL transaction. However, two concurrent first writes have no existing
row to lock; they can race into the primary key and expose a uniqueness error
instead of deterministically returning `revision_conflict`.

Critically, the function accepts any non-null JSONB value and any integer. It
does not enforce supported schemas, monotonic schemas, JSON-object shape,
plaintext/encrypted discriminators, or payload/column schema agreement. A
v0.29 caller with the current revision can replace schema 5 with schema 4.

## 3. Exact revision-history behavior

- Every successful `save_roster_state` inserts exactly one history row with
  the same revision, schema version, payload, client id, and server timestamp
  as current state.
- Normal saves never prune history.
- History is immutable only to the ordinary authenticated API role because
  that role has `SELECT` only. The table has no immutable-row trigger;
  `service_role`, `postgres`, and `supabase_admin`-class administration can
  mutate or delete it.
- `rotate_roster_encryption_wrappers` creates the next current/history
  revision and then deletes every older history revision for that user in the
  same transaction.
- `purge_unencrypted_roster_history` deletes every caller-owned history row
  whose payload format is not exactly `rosterbot-encrypted-v1`, after checking
  only that current payload has that format.
- Deleting the owning `auth.users` row cascades deletion to both roster tables
  and `calendar_feeds`.

## 4. All discovered write paths

Roster state/history:

- `save_roster_state`: inserts/updates current state and inserts history;
- `rotate_roster_encryption_wrappers`: updates current state, inserts one
  history row, deletes all older history;
- `purge_unencrypted_roster_history`: deletes non-encrypted history;
- `auth.users` deletion: foreign-key cascade deletes the user's current and
  historical rows;
- direct owner/privileged DML by `postgres` or the RLS-bypassing
  `service_role` (and superuser administration).

Calendar feeds:

- authenticated direct INSERT/UPDATE/DELETE through PostgREST, constrained by
  the four ownership policies;
- `calendar_feeds_updated_at` changes `NEW.updated_at` on every UPDATE;
- direct `service_role`/owner DML, with `service_role` bypassing RLS;
- `auth.users` deletion cascade.

The all-schema function-definition search found only the three roster RPCs
referencing any target table. There is no `cron.job` catalog, no
`supabase_functions.hooks` catalog, no database-webhook trigger, and no other
user trigger on these tables. Generic owner/superuser capability cannot be
eliminated by application schema code and is an administrative path, not a
browser path.

## 5. RLS policies

RLS is enabled and not forced on all three tables.

- `roster_state`: authenticated SELECT using
  `(SELECT auth.uid()) = user_id`; no INSERT/UPDATE/DELETE policy.
- `roster_revisions`: authenticated SELECT using
  `(SELECT auth.uid()) = user_id`; no INSERT/UPDATE/DELETE policy.
- `calendar_feeds`: separate authenticated SELECT, INSERT, UPDATE, and DELETE
  policies. SELECT/DELETE use `auth.uid() = user_id`; INSERT uses the same
  `WITH CHECK`; UPDATE uses it for both `USING` and `WITH CHECK`.

Because RLS is not forced, table owners and bypass-RLS roles are not subject to
these policies.

## 6. Relevant grants and default privileges

- Authenticated has only SELECT on each roster table and therefore cannot
  directly insert, update, or delete roster state/history.
- Authenticated has all table privileges on `calendar_feeds`, including
  INSERT/SELECT/UPDATE/DELETE and also TRUNCATE, REFERENCES, TRIGGER, and
  MAINTAIN. PostgREST exposes CRUD, not TRUNCATE or trigger creation, but the
  database grant is broader than the browser needs; RLS does not govern
  TRUNCATE.
- `service_role` has all privileges on all three tables and bypasses RLS.
- `anon` has no target-table privilege.
- All three roster RPCs are executable by `anon`, `authenticated`,
  `service_role`, and `postgres`. Their explicit null-`auth.uid()` guard makes
  an ordinary unauthenticated anon call fail, but the anon EXECUTE grant is
  unnecessary exposure.
- The calendar trigger function is executable by PUBLIC and the standard API
  roles; it is `SECURITY INVOKER`.
- Default privileges for both `postgres` and `supabase_admin` grant all table
  privileges, all sequence privileges, and function EXECUTE to `anon`,
  `authenticated`, and `service_role` for future objects in `public`. The two
  roster tables were explicitly narrowed after creation.

Exact expanded ACL rows are in `catalog/privilege-details.json` and
`catalog/default-privileges.json`. No target column has a separate column ACL
(`catalog/column-privileges.json` is empty).

## 7. Trigger behavior

The sole user trigger is:

```text
calendar_feeds_updated_at
BEFORE UPDATE ON calendar_feeds
FOR EACH ROW EXECUTE FUNCTION set_calendar_feed_updated_at()
```

The function is `plpgsql`, `SECURITY INVOKER`, owned by `postgres`, with
`search_path = public`. It always overwrites `NEW.updated_at` with `now()`, so
the client's submitted timestamp is not authoritative. There are no roster
triggers.

## 8. Edge Function behavior

Only `calendar-feed` is deployed: active version 2, deployment SHA-256
`0fc2fd4f9dafa0ed582b49121636c7a350e90cbeded6b5d7c2d3f6f0ae5f043d`,
with JWT verification disabled and no import map. Production source was
downloaded to `supabase/functions/calendar-feed/index.ts`.

It:

- permits GET and OPTIONS and returns 404 for other methods;
- accepts `t` only when it is 40–64 base64url characters;
- hashes the raw token with SHA-256 and never logs it;
- uses only the environment-variable names `SUPABASE_URL` and
  `SUPABASE_SERVICE_ROLE_KEY` (no values were captured);
- uses the service role to SELECT `ics_text, enabled, updated_at` from the
  unique `token_hash` row;
- returns the same 404 body for database error, unknown token, or disabled
  feed;
- returns calendar text with no-store, inline filename, no-index, and
  Last-Modified headers for a valid enabled token;
- writes no database data.

JWT-disabled public access therefore matches the client assumption. Notable
operational gaps are no application rate limiting and a remote
`@supabase/supabase-js@2` import without a checked-in lock/import map; the
deployed bundle hash nevertheless identifies this version.

## 9. Migration/version history

`supabase migration list --linked` returned an empty remote migration list.
This checkout also began with no `supabase/migrations` directory. The deployed
objects were therefore likely created outside recorded CLI migrations, but
that is an inference; exact historical SQL and ordering are unavailable
through the ordinary CLI.

## 10. Differences from the client-derived contract

Confirmed assumptions:

- one current row per user and one history row per `(user_id, revision)`;
- authenticated users can read only their own roster/current history;
- authenticated callers cannot directly write roster tables;
- normal saves lock an existing row, increment server-side, and atomically add
  history;
- wrapper rotation preserves the current schema and every encrypted-envelope
  field except the two wrappers, then atomically removes older revisions;
- calendar CRUD is ownership-isolated and the public feed hashes the token and
  reads only enabled matching data.

Material discrepancies or newly established risks:

- `save_roster_state` has no downgrade, capability, or payload-schema checks;
- concurrent first writes are not serialized;
- all roster RPCs are granted to `anon` as well as authenticated;
- `service_role` is a direct RLS-bypassing write path to roster tables;
- calendar authenticated grants include TRUNCATE and other privileges broader
  than its CRUD policies require;
- purge's encrypted-current guard checks only the format string and does not
  lock the current row across the guard/delete sequence;
- no normal history-retention limit exists;
- the server contains no migration/version record for these definitions.

## 11. Can downgrade protection be atomic in the existing RPC?

Yes. The existing function is already a single transactional
`SECURITY DEFINER` RPC and already row-locks an existing user's current row.
Its name, four argument types/order/default, and two-column return shape can be
kept compatible with deployed schema-4 clients.

The missing piece is serialization before the row exists. A per-user
transaction advisory lock (or equivalent lock-row mechanism) acquired before
the current-row lookup can serialize both first and later writes. Under that
lock, the RPC can compare the incoming schema to the current schema, validate
payload agreement, compare revisions, and update current/history as one
atomic operation. Rejections occur before either table changes and PostgreSQL
rolls the transaction back on any exception.

Wrapper rotation is already row-locked and schema-preserving, but should call
or duplicate the same payload/schema validator. Purge does not replace current
state, but it should lock current state across its guard and delete so it
cannot race with a save and remove the current revision's new plaintext
history row.

## 12. Exact Phase 8B changes required

Do not deploy these from this capture; Phase 8B must implement and test them in
local/staging first.

1. Replace only the body/attributes as needed for the existing
   `save_roster_state(bigint, integer, jsonb, text)` signature; do not create an
   overload or change its return columns.
2. Acquire a transaction-scoped per-user lock before looking up current state,
   then select `revision`, `schema_version`, and payload `FOR UPDATE`. This must
   make concurrent first writes return one success and one clean
   `revision_conflict`.
3. Add an explicit server capability gate. The first strengthening deployment
   accepts schema 4 only; schema 5 remains disabled until its Cloud wire shape
   and rollout gate are separately approved.
4. When current state exists, reject
   `new_schema_version < current.schema_version` as `schema_too_old` before an
   ordinary revision mismatch. Reject values above the deployed capability as
   `schema_too_new`.
5. Require a JSON object and validate authoritative payload metadata against
   `new_schema_version`: the documented schema-4 plaintext shape or the
   `rosterbot-encrypted-v1` outer schema/crypto/ciphertext structure. Reject
   mismatches/malformed inputs before mutation. Do not attempt server-side
   decryption.
6. Preserve current optimistic concurrency and atomic current/history insert,
   but use stable error codes/messages and non-sensitive details. Add bounds
   for schema, client id, and payload size.
7. Strengthen `rotate_roster_encryption_wrappers` without changing its
   signature/return shape: retain the row lock and preservation comparisons,
   additionally require current column/outer schema agreement and validate the
   replacement wrapper envelope with the same accepted-schema rules.
8. Strengthen `purge_unencrypted_roster_history` without changing its public
   shape: lock current state during guard and deletion and validate that the
   current encrypted outer schema agrees with the current column.
9. Revoke EXECUTE on the three roster RPCs from `anon`; retain authenticated
   execution. Decide explicitly whether service-role execution is needed.
10. Revoke direct roster INSERT/UPDATE/DELETE/TRUNCATE (and unnecessary
    TRIGGER/REFERENCES/MAINTAIN) from `service_role` unless a separately audited
    operational path requires them. Owner/superuser break-glass access must be
    documented as the unavoidable administrative exception.
11. Add source-controlled migrations recreating the captured baseline before
    the strengthening migration, because no remote historical migration SQL is
    available.
12. Build PostgREST integration tests for first writes, concurrent first
    writes, same-schema updates, 4→5 staging upgrades, current/stale 5→4
    attempts, malformed/mismatched plaintext and encrypted payloads, wrapper
    rotation, purge races, RLS isolation, grants, and exact error envelopes.
13. Keep calendar behavior out of the downgrade migration. Track its excessive
    authenticated table grants as a separate least-privilege hardening item;
    its deployed Edge Function is read-only and is not a roster downgrade path.

The remaining design blocker is the exact schema-5 Cloud wire shape and its
accepted-schema activation sequence, not uncertainty about the currently
deployed schema-4 backend.

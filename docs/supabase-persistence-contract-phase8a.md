# Phase 8A — Supabase persistence contract capture and downgrade-protection design

Status: backend discovery and design only. The client-derived analysis was
captured 2026-10-02 from commit `73da601` on
`experiment/v0.30-data-safety`; the deployed backend was then captured
read-only on 2026-10-05. No production Supabase object was changed and no
schema-5 value is written or enabled by this phase.

The resolved deployed inventory and exact capture artifacts are in
[`../backend-capture/phase8a/backend-inventory.md`](../backend-capture/phase8a/backend-inventory.md).
Where this document says “unknown deployed definition,” that describes the
pre-capture design state and is superseded by that inventory.

This document separates three kinds of statement:

- **Observed client contract** — directly evidenced by the repository.
- **Required Phase 8B contract** — the contract to implement and prove in a
  local Supabase instance or isolated staging project.
- **Unknown deployed definition** — cannot be established from this repository
  and must be exported from the deployed Supabase project before Phase 8B.

The original client-derived body deliberately did not reconstruct missing SQL,
policies, triggers, grants, or Edge Function source. The linked deployed
capture now supplies those definitions verbatim or from catalog reconstruction.

## 1. Current client/backend dependency inventory

### 1.1 Connection and authentication

`js/51-cloud-sync.js` contains the hosted Supabase project URL/project ref and
publishable key. Requests use the publishable key plus the signed-in user's
Bearer access token. Authentication uses Supabase Auth password sign-in,
sign-up, refresh, recovery, password update, user lookup, and logout endpoints.

Observed assumptions:

- a Supabase access token identifies the user through `auth.uid()` or an
  equivalent server-side identity;
- the browser never has a secret/service-role key;
- all persistence authorization therefore has to be enforced by RLS and/or the
  called database functions, not by a trusted client;
- errors may be JSON or text; the Cloud helper preserves HTTP status, `code`,
  and `details`, but most existing UI branches inspect the error message;
- a request can time out without changing local state, but the client cannot
  infer whether a timed-out server write committed and therefore re-fetches.

Auth tables and Supabase Auth internals are dependencies of account access, but
they are not RosterBot persistence tables and are outside the proposed schema
change.

### 1.2 `roster_state`

Observed read:

```text
GET /rest/v1/roster_state
  ?select=user_id,revision,schema_version,payload,client_id,updated_at
  &user_id=eq.<authenticated user id>
  &limit=1
```

Observed columns and client assumptions:

| Column | Observed client assumption |
| --- | --- |
| `user_id` | The authenticated user's UUID; at most one current row is visible for that user. |
| `revision` | Numeric optimistic-concurrency token. A successful write returns a truthy revision and a later read returns that revision. |
| `schema_version` | Independent server metadata returned on reads. Current writes pass `4`; current compatibility checks still rely mainly on the payload and must be strengthened before Cloud v2. |
| `payload` | JSON object containing either the current plaintext schema-4 backup wrapper or `rosterbot-encrypted-v1`. |
| `client_id` | Browser-generated UUID-like writer identifier used for history/display, not authorization. |
| `updated_at` | Server-compatible timestamp displayed to the user and optionally returned by write RPCs. |

RLS assumptions:

- an authenticated user can select only their own row, even if they remove or
  alter the client-side `user_id` filter;
- there is a unique/primary-key rule that makes one current row per user;
- authenticated clients cannot bypass `save_roster_state` with direct
  insert/update/upsert/delete access;
- absence of a visible row means no row for this user, not a row hidden by an
  ownership error.

The actual table definition, keys, defaults, constraints, indexes, triggers,
policies, and grants are unknown.

### 1.3 `roster_revisions`

Observed reads:

```text
GET /rest/v1/roster_revisions
  ?select=revision,schema_version,client_id,created_at
  &user_id=eq.<authenticated user id>
  &order=revision.desc
  &limit=25

GET /rest/v1/roster_revisions
  ?select=revision,schema_version,payload,client_id,created_at
  &user_id=eq.<authenticated user id>
  &revision=eq.<selected revision>
  &limit=1
```

Observed columns and client assumptions:

| Column | Observed client assumption |
| --- | --- |
| `user_id` | Ownership key; RLS prevents cross-user history reads. |
| `revision` | Identifies a user's revision and is ordered numerically. |
| `schema_version` | Retained independently for every historical payload and displayed in history. |
| `payload` | Exact payload for a selected revision. It may be plaintext or encrypted. |
| `client_id` | Writer/device label only. |
| `created_at` | Revision creation time. |

The history UI loads a selected revision onto the device without changing the
Cloud row. A later explicit upload uses the current Cloud revision as
`expected_revision` and creates another revision. The current schema-4 client
does not have a safe way to make a schema-4 historical revision current over a
future schema-5 row; the server must reject that attempt.

RLS assumptions:

- users can select only their own history;
- clients have no direct history insert/update/delete permission;
- only trusted RPC logic creates or removes revision rows.

The actual history key, foreign key, retention behavior, triggers, and whether
the current revision is always represented in history are unknown and must be
verified from the deployed definitions.

### 1.4 `save_roster_state`

Observed call:

```json
POST /rest/v1/rpc/save_roster_state
{
  "expected_revision": 0,
  "new_schema_version": 4,
  "new_payload": { "...": "schema-4 plaintext or encrypted payload" },
  "new_client_id": "browser-generated id"
}
```

For an update, `expected_revision` is the current/base revision rather than
zero. Every normal, automatic, deliberate-replacement, historical-copy, and
encryption-migration roster write eventually uses this RPC.

Observed response assumptions:

- PostgREST may return one object or a one-element array;
- the object has a truthy numeric `revision`;
- `updated_at` is optional but used when returned;
- `revision_conflict` occurs in the error message for an optimistic race;
- on success the client updates its local baseline, fetches `roster_state`, and
  verifies the server state where the workflow requires it.

Unknown and blocking: the deployed function signature/types, return type,
security mode/search path, grants, lock/update algorithm, first-revision rule,
history insertion, exception format, and current payload/schema validation.

### 1.5 Plaintext Cloud payload

The only production plaintext write shape is schema 4:

```json
{
  "app": "RosterBotPayBot",
  "version": "0.26.1-mobile-ui-hotfix",
  "schemaVersion": 4,
  "exportedAt": "<ISO timestamp>",
  "privacy": "<description>",
  "storage": { "<registered cloud key>": "<raw string value>" }
}
```

The client expects `app`, integer `schemaVersion`, and object-valued `storage`.
For a schema-4 restore it validates every recognized stored value through the
persistence registry. `rosterbot-db-schema-v1`, when present in `storage`, must
be the string `"4"`; fresh/partial payloads may omit that storage key. The RPC
parameter is always `new_schema_version: 4`.

### 1.6 Encrypted Cloud payload and trust boundary

The current encrypted outer object is:

```json
{
  "format": "rosterbot-encrypted-v1",
  "schemaVersion": 4,
  "crypto": {
    "version": 1,
    "cipher": "AES-GCM-256",
    "keyId": "<id>",
    "fingerprint": "<keyed fingerprint>",
    "payloadIv": "<base64url>",
    "passphraseWrap": { "...": "..." },
    "recoveryWrap": { "...": "..." }
  },
  "ciphertext": "<base64url>"
}
```

The ciphertext is the complete plaintext payload. AES-GCM additional
authenticated data is derived as
`RosterBot encrypted payload v1|<keyId>|schema:<outer schemaVersion>`. The
browser decrypts, requires a RosterBot plaintext payload, and verifies the
keyed fingerprint.

The database cannot verify the encrypted inner `schemaVersion`, schema-5
envelope, registry values, checksum, or AES-GCM AAD without the user's key. It
can and must validate the authenticated outer JSON structure and make
`roster_state.schema_version` plus the matching outer `schemaVersion`
authoritative for concurrency and downgrade prevention. After decryption, the
client must reject any disagreement between server `schema_version`, encrypted
outer `schemaVersion`, decrypted payload schema, and (for schema 5) inner
`storageSchemaVersion`/`minimumReaderSchema`.

This boundary prevents an old client from downgrading a row, including an
encrypted row. It does not let the server prove that a malicious authenticated
owner placed correctly described semantics inside opaque ciphertext. That
semantic check remains client-side after authenticated decryption.

### 1.7 `rotate_roster_encryption_wrappers`

Observed call:

```json
POST /rest/v1/rpc/rotate_roster_encryption_wrappers
{
  "expected_revision": 12,
  "new_payload": { "...": "encrypted envelope with replacement wrappers" },
  "new_client_id": "browser-generated id"
}
```

Observed response assumptions are `revision`, optional `updated_at`, and
`deleted_count`. The client then verifies that:

- the returned revision can be fetched as current;
- format and `keyId` still match;
- both wrapper objects exactly match the requested replacements;
- no revision older than the new revision remains.

The client recognizes missing-function/PostgREST cache errors, permission
errors (`42501`), and `revision_conflict`.

Required interaction with Phase 8B: wrapper rotation is a second state-write
path and must not bypass schema monotonicity or payload agreement. It must lock
the current row, preserve its server `schema_version`, require the new outer
schema to equal that value, and permit changes only to the intended wrapper
fields. Ciphertext, payload IV, fingerprint, key id, encrypted format, and
schema metadata must remain unchanged. Its intentional history deletion must
be atomic with the new wrapper revision. Exact current behavior is unknown.

### 1.8 `purge_unencrypted_roster_history`

Observed call has no arguments. The response may be an object or one-element
array containing `deleted_count`. It is called only after an encrypted current
revision is fetched, decrypted, and verified by the client.

Required assumptions to verify:

- authentication and ownership are derived server-side;
- only the caller's plaintext historical revisions are deleted;
- the current row/current encrypted revision is retained;
- it cannot alter another user's state or history;
- failure does not undo the already verified encrypted current revision.

Its definition, grants, exact plaintext/encrypted predicate, and transaction
behavior are unknown.

### 1.9 `calendar_feeds` and `calendar-feed`

Observed table reads and writes:

| Operation | Client request and columns |
| --- | --- |
| Read own feed | `GET /rest/v1/calendar_feeds?select=enabled,updated_at,event_count,token_hash&limit=1` (no user filter; relies entirely on RLS) |
| Create/rotate | `POST /rest/v1/calendar_feeds?on_conflict=user_id`, upsert with `user_id`, `token_hash`, `ics_text`, `event_count`, `enabled`; requires a unique conflict target on `user_id` |
| Update | `PATCH ...?user_id=eq.<auth uid>` with `ics_text`, `event_count`, `enabled`, `updated_at` |
| Disable | unfiltered `PATCH /rest/v1/calendar_feeds` with `enabled`, `updated_at`; relies entirely on RLS restricting the affected row |

The raw 256-bit feed token remains on the user's device. Supabase stores its
SHA-256 hex `token_hash`; the browser compares the local token hash before
showing a private URL. `ics_text` contains the published calendar, and
`event_count`, `enabled`, and `updated_at` drive status UI.

The public URL is:

```text
GET /functions/v1/calendar-feed?t=<raw private token>
```

Observed/necessary Edge Function assumptions:

- it can be invoked by a calendar provider without the user's Supabase Bearer
  token, so JWT verification/configuration must permit this specific public
  token endpoint;
- it hashes the raw token and selects exactly one enabled feed by
  `token_hash`;
- it returns `ics_text` with appropriate calendar content type;
- a missing, malformed, disabled, or unknown token does not disclose whether a
  user/feed exists;
- token material is not logged in plaintext and responses do not expose table
  columns;
- service-role/database access, caching, CORS, rate limits, and error/status
  behavior must be captured from the deployed source/configuration.

Calendar publication is gated client-side on Cloud Sync being up to date, but
it is a separate direct-write persistence surface. Phase 8A proposes no change
to it. Its table definition, RLS, grants, and Edge Function implementation are
unknown.

## 2. Backend definitions available before deployed capture

At commit `73da601` there were no backend definitions in the working tree or
reachable Git history:

- no `supabase/` directory or `config.toml`;
- no SQL migrations, schema dumps, policies, grants, or database tests;
- no database function/RPC definitions;
- no trigger definitions;
- no Edge Function source or deployment configuration;
- no local Supabase seed/configuration.

Available evidence is limited to:

- the browser REST/RPC/Auth calls in `js/51-cloud-sync.js`;
- direct calendar REST calls and the public Function URL in
  `js/80-calendar-subscription.js`;
- client-side payload/encryption validation and expected result handling;
- schema-5 design constraints in `docs/schema5-migration-design.md`;
- static client tests proving current backup/Cloud writes remain schema 4.

The README's reference to a previously supplied calendar backend pack is not a
backend definition: that pack is absent from this repository and Git history.
That original limitation is now resolved by the uncommitted read-only capture
under `backend-capture/phase8a/` and the downloaded production Edge Function
under `supabase/functions/calendar-feed/`. See the capture README for the
Docker-dependent `pg_dump` limitation and catalog-introspection fallback.

## 3. Deployed-definition export checklist

The deployed capture now provides these authoritative, schema-only artifacts
without user rows or payload data:

- [x] exact `CREATE TABLE` definitions for `public.roster_state`,
  `public.roster_revisions`, and `public.calendar_feeds`, including column
  types, nullability, defaults, identity/sequences, ownership, comments, and
  storage/security options;
- [x] all primary keys, unique/check/exclusion/foreign-key constraints and all
  indexes for those tables (especially per-user state uniqueness,
  per-user/revision uniqueness, `calendar_feeds(user_id)`, and token hash);
- [x] every trigger on those tables and the complete definition of every
  trigger function;
- [x] whether RLS is enabled and forced, plus complete policy definitions for
  every command and role;
- [x] table, sequence, schema, and function grants/default privileges for
  `anon`, `authenticated`, `service_role`, owners, and any custom roles;
- [x] complete definitions (`pg_get_functiondef`) plus owner, language,
  volatility, parallel/security/leakproof settings, configuration/search path,
  argument names/types/defaults, return type, ACL, and comments for
  `save_roster_state`, `rotate_roster_encryption_wrappers`,
  `purge_unencrypted_roster_history`, and every overload;
- [x] any other function, trigger, webhook, cron task, or Edge Function that can
  insert/update/delete either roster table or its history;
- [x] current schema-version/payload constraints and any database setting/table
  used as a supported-schema capability gate;
- [ ] PostgREST/Supabase API exposure configuration relevant to the `public`
  schema and the deployed PostgREST error behavior/version. Public exposure,
  grants, and PostgREST v14.5 are captured; exact error envelopes still require
  non-production integration tests in local/staging;
- [x] full deployed `calendar-feed` Edge Function source, dependency/import
  lock information, environment-variable names (values redacted), JWT
  verification setting, routing/config, and deployment version/hash;
- [x] any database objects used by `calendar-feed`, including service-role
  grants or RPCs not apparent to the browser;
- [x] migration history/version list establishing which definition is actually
  deployed.

Handoff: a catalog-reconstructed schema-only SQL file plus separate
function/policy/grant inspection output and the downloaded `calendar-feed`
source directory. The ordinary linked migration list is empty, so historical
SQL is unavailable; the linked CLI schema dump was blocked locally by its
Docker/Podman requirement and is documented in the capture README.
Do not include `roster_state.payload`, history payloads, calendar ICS content,
auth users, raw tokens, secrets, or production user data. Capture object names
and definitions verbatim; do not summarize them by hand.

The missing-definition blocker is resolved. Phase 8B may now produce a
reviewable local/staging migration, but must not deploy it until the remaining
handoff blockers and integration tests in sections 9–11 are resolved.

## 4. Required server invariant

For each authenticated user, let current Cloud state be `(revision R,
schema S)`. Every RPC or other operation capable of replacing its semantic
payload must enforce:

```text
committed incoming schema >= S
```

in the same database transaction and under the same per-user serialization/
row lock as the revision comparison and write. A prior client read is not part
of the security invariant.

Required properties:

1. Identity comes from the verified database session (`auth.uid()`), never a
   caller-supplied user id.
2. The target current row is locked before comparing its schema and revision.
   A safe equivalent serialization mechanism is acceptable, but it must also
   handle two concurrent first writes for a user.
3. If a current row exists and `new_schema_version < current.schema_version`,
   fail `schema_too_old` before reporting an ordinary revision race. This gives
   an actually old client a deterministic update-required result even when its
   revision is stale.
4. If the incoming schema is above the server's deployed allowlist/capability,
   fail `schema_too_new`.
5. Validate that authoritative schema metadata in the payload agrees with
   `new_schema_version`; malformed or disagreeing payloads fail without a
   write.
6. Compare `expected_revision` to the locked current revision. A mismatch
   fails `revision_conflict`.
7. Insert the immutable revision and update/create current state atomically.
   Any failure rolls back both actions.
8. No direct table permission, alternative RPC, wrapper rotation, trigger,
   history restore, or administrative application path may bypass the same
   monotonic rule. Break-glass database administration is outside the browser
   API and must be separately audited.

### Core v0.29 downgrade scenario

Given current state `(revision 9, schema 5)`, a v0.29 client may fetch revision
9 and call the unchanged RPC with `expected_revision: 9`,
`new_schema_version: 4`, and a valid schema-4 payload. The server must return
`schema_too_old` and atomically leave all of these unchanged:

- `roster_state.revision = 9`;
- `roster_state.schema_version = 5`;
- current payload/client/timestamps;
- every `roster_revisions` row and the history row count.

The same result is required if the old client uses a stale expected revision,
retries repeatedly, uses deliberate replacement UI, uploads a historical
schema-4 copy, or submits encrypted schema-4 data. No behavior in v0.29 is
trusted for safety after the error.

## 5. Proposed atomic `save_roster_state` contract

Phase 8B should retain the existing four argument names and compatible types so
deployed schema-4 clients continue to call it:

```text
save_roster_state(
  expected_revision,
  new_schema_version,
  new_payload,
  new_client_id
) -> one row containing at least revision and updated_at
```

Do not add an overload with an ambiguous PostgREST signature. Any type/default
change has to be compared with the exported definition first.

Proposed transaction order:

1. Require authenticated `auth.uid()` and validate argument types/bounds and
   payload JSON object/size limits.
2. Acquire a per-user transaction lock that serializes both existing-row and
   no-row writes, then select the user's current row `FOR UPDATE` when present.
3. Reject an unsupported incoming schema (`schema_too_new` or malformed
   schema). Production Phase 8B initially supports schema 4 only; the isolated
   test variant supports 4 and hypothetical 5.
4. If a row exists, reject `new_schema_version < current.schema_version` as
   `schema_too_old`, regardless of `expected_revision`.
5. Validate the payload discriminator and outer schema agreement. This check
   occurs before any insert/update/history mutation.
6. Require `expected_revision = current.revision`, or zero when no row exists;
   otherwise reject `revision_conflict`.
7. Compute the next revision server-side (`1` for first write, otherwise
   current plus one), insert exactly one immutable history snapshot for the new
   state, and create/update the current row with the same payload,
   `schema_version`, revision, client id, and server timestamp.
8. Return the committed revision/timestamp. Any exception rolls the entire
   transaction back.

The exact insert/update ordering and constraint-conflict retry strategy depend
on the missing deployed keys/triggers and must not be coded until those are
known.

### First write

- No current row plus `expected_revision = 0` permits a valid schema-4 write.
- In the future, it may permit a valid schema-5 write only after the server's
  accepted-schema gate is deliberately advanced.
- It creates current revision 1 and one revision-1 history row containing the
  same schema/payload/client/timestamp.
- No row plus nonzero `expected_revision` is `revision_conflict` and creates
  nothing.
- Concurrent first writes serialize; exactly one can create revision 1. The
  loser receives `revision_conflict`, not a leaked unique-constraint error.

### Normal and upgrade writes

- A same-schema write with the matching revision creates the next revision.
- A 4 -> 5 write with the matching revision, enabled capability, and valid
  schema-5 payload creates one auditable schema-5 revision and makes it current.
- Once current is 5, no ordinary operation can make 4 current. Restoring older
  semantics, if ever supported, must transform them into a new valid schema-5
  payload and create a new schema-5 revision; it must not lower server schema.

## 6. Payload/schema agreement contract

All payloads must be JSON objects, not arrays or scalars. Missing discriminator
or schema metadata is `payload_schema_mismatch` (or `payload_malformed` where
the distinction is useful), never silently defaulted.

For current plaintext schema 4, require:

- `app = "RosterBotPayBot"`;
- integer `schemaVersion = new_schema_version = 4`;
- object/non-array `storage`;
- if `storage["rosterbot-db-schema-v1"]` is present, its canonical numeric
  string also equals 4.

For proposed plaintext schema 5, the wire shape must be finalized before it is
allowed. If the Phase 7 envelope itself is the payload, require at minimum:

- `format = "rosterbot-personal-state"` and `formatVersion = 1`;
- integer `storageSchemaVersion = new_schema_version = 5`;
- integer `minimumReaderSchema = 5`;
- the required outer envelope fields and JSON container types.

If Cloud v2 instead wraps that envelope, both wrapper schema and envelope
`storageSchemaVersion` must equal `new_schema_version`. This unresolved wire
choice is a Phase 8B blocker; production must not accept schema 5 until one
shape is selected and server/client fixtures agree byte-for-byte. The database
does not need to reproduce the full client semantic/checksum validator, but it
must reject missing/malformed authoritative metadata.

For `rosterbot-encrypted-v1`, require:

- integer outer `schemaVersion = new_schema_version`;
- `crypto` object with supported version/cipher and syntactically valid,
  bounded `keyId`, `fingerprint`, `payloadIv`, and wrapper containers;
- nonempty bounded ciphertext in the accepted encoding;
- no server attempt to decrypt or infer inner schema.

The following are always rejected before mutation:

- column/parameter 5 with plaintext/outer payload 4;
- column/parameter 4 with plaintext/outer payload 5;
- encrypted outer schema different from the RPC parameter;
- missing schema metadata, malformed wrapper, unsupported discriminator, or
  non-object payload.

Reads always return server `schema_version` separately. A capable client treats
that column as authoritative, verifies all visible/decrypted schema markers
agree, and enters recovery/update-required state on disagreement.

## 7. Error contract and v0.30 mapping

Phase 8B should use a stable database error `code` plus the exact machine token
as `message`, with structured non-sensitive details. Suggested five-character
database codes are provisional until the deployed function/error conventions
are exported:

| Message | Suggested code | Meaning | v0.30 action |
| --- | --- | --- | --- |
| `schema_too_old` | `RB001` | Incoming schema is below locked current schema. | Stop all upload retries; place Cloud in update-required/read-only state; retain local data; re-fetch only for display/evidence. |
| `schema_too_new` | `RB002` | Incoming schema is not accepted by this server deployment. | Stop retries and writes; show server/client upgrade or rollout-not-ready state. |
| `revision_conflict` | `RB003` | Expected revision did not match current (including no-row semantics). | Re-fetch once and enter the existing conflict/cloud-newer analysis; never blind retry the same write. |
| `payload_schema_mismatch` | `RB004` | RPC schema and authoritative payload metadata disagree or are missing. | Treat as a local build/data-integrity fault; stop retries; preserve/export evidence. |
| `payload_malformed` | `RB005` | Payload/wrapper discriminator, type, size, or required structure is invalid. | Stop retries; do not replace local state; show recovery/support path. |

Unauthenticated/unauthorized calls should retain standard auth/privilege errors
without revealing row existence. Details may include safe numeric fields such
as `current_schema`, `incoming_schema`, `current_revision`, and
`expected_revision`, but never payload fragments, ciphertext, tokens, user ids,
or another user's state.

The client must prefer `error.code`, fall back to exact `error.message`, and not
classify `schema_too_old`, `schema_too_new`, or payload errors as offline
failures. In particular, automatic sync must not enter its current generic
10-second network retry path for these deterministic errors.

HTTP status mapping should be fixed by integration tests after the deployed
PostgREST version/conventions are known; client safety must key on the stable
database code/token rather than status alone.

## 8. Revision-history rules

- Every successful first, same-schema, upgrade, and wrapper-rotation write gets
  a distinct monotonically increasing revision.
- Each history row stores its own immutable `schema_version`; it is never
  derived later from current state or decrypted content.
- A history payload and its history `schema_version` must satisfy the same outer
  agreement rule at insertion time.
- A rejected downgrade, revision conflict, malformed payload, ownership
  failure, or unsupported schema creates no history row and changes no current
  metadata.
- A 4 -> 5 upgrade leaves prior schema-4 revisions intact through the defined
  recovery/rollback retention window and adds a clearly auditable schema-5
  revision.
- History reads return server schema separately. Clients must check it before
  decrypting/applying and must never coerce an unknown/newer history payload
  through schema-4 defaults or validators.
- Loading history onto a device remains read-only with respect to Cloud. A
  later "make current" operation goes through the same atomic RPC and cannot
  lower schema. Older semantics must first be represented in the current
  schema.
- Wrapper rotation's security requirement to delete old credential wrappers is
  an explicit exception to ordinary retention. It must create the new revision
  and delete only the caller's older revisions atomically, after preserving the
  current schema and immutable encrypted content. This behavior must be tested
  separately from ordinary history retention.
- Unencrypted-history purge must never be used as a general downgrade/history
  cleanup path and must be ownership-isolated.

## 9. Local/staging integration test plan

Use a local Supabase stack when the exported definitions can be migrated into
it. If production-only features/configuration prevent parity, use an isolated
staging project with synthetic users and synthetic payloads. Never copy or
mutate production user data.

The harness should execute requests through PostgREST with real anon and
authenticated JWT roles, not only call the function as database owner. For
each rejected operation, snapshot current row, complete history rows/count,
and timestamps before the call and assert byte-for-byte/no-row-change after it.

Required cases:

| Case | Expected result |
| --- | --- |
| First plaintext schema-4 write, expected 0 | Current/history revision 1, schema 4, exact payload. |
| First encrypted schema-4 write | Same, with independently stored server schema 4 and valid outer metadata. |
| First write with nonzero expected revision | `revision_conflict`; no rows. |
| Two concurrent first writers | One revision 1; one `revision_conflict`; no constraint leak/duplicate history. |
| Normal schema-4 update | Matching expected revision creates exactly one next revision. |
| Stale schema-4 update | `revision_conflict`; current/history unchanged. |
| Hypothetical plaintext 4 -> 5 | With staging schema-5 capability on, one schema-5 revision; schema-4 history intact. |
| Hypothetical encrypted 4 -> 5 | Outer/server schema 5 committed; client fixture decrypts and verifies inner schema 5. |
| v0.29-style plaintext 5 -> 4 | `schema_too_old`; current revision/payload/timestamps and all history unchanged. |
| v0.29-style encrypted 5 -> 4 | Same result without server decryption. |
| Downgrade with stale expected revision | Deterministic `schema_too_old`, not generic conflict; no mutation. |
| Repeated downgrade attempts | Every call returns the same class; row/history remain identical. |
| Concurrent schema-4 and schema-5 writers from schema 4 | Exactly one commits first; loser re-evaluates locked current. If 5 wins, 4 can never subsequently commit; all revision numbers/history are consistent. |
| Concurrent same-revision schema-4 writers | One commits; one `revision_conflict`. |
| Parameter 5/payload 4 and parameter 4/payload 5 | `payload_schema_mismatch`; no mutation. |
| Encrypted outer/parameter mismatch | `payload_schema_mismatch`; no mutation. |
| Missing schema, array/scalar payload, malformed encrypted wrapper | Stable mismatch/malformed error; no mutation. |
| Unsupported schema above server gate | `schema_too_new`; no mutation. |
| Direct insert/update/delete on `roster_state` or `roster_revisions` as authenticated/anon | Denied. |
| User A reads/writes with User B ids/filters/revisions | No disclosure and no effect on B. |
| History read of newer schema by older fixture | Server schema remains visible; older client fixture refuses apply/coercion. |
| Wrapper rotation at current schema 4 and 5 | Schema preserved; only wrappers change; revision/history deletion semantics exact. |
| Wrapper rotation payload/schema/ciphertext tampering | Rejected atomically. |
| Unencrypted-history purge | Deletes only intended caller history and never current/other-user rows. |
| Calendar RLS CRUD with two users | Each sees/changes only own feed, including unfiltered GET/PATCH behavior. |
| Public calendar function valid/invalid/disabled token | Only valid enabled token returns ICS; failures are non-enumerating and leak-free. |

Run fault-injection/transaction tests where history insertion, current-row
update, and any trigger fail in turn; none may leave a partial revision. Record
actual HTTP status and `{code,message,details,hint}` for every error as contract
fixtures for the v0.30 mapping.

Before production rollout, also replay the exact current v0.29 request body
against the strengthened staging RPC to prove unchanged schema-4 success.

## 10. Safe deployment sequence

1. Export and review the deployed definitions listed above. Establish every
   roster write/delete path and make the source-controlled migration reproduce
   current schema-4 behavior in local/staging.
2. Implement/test the atomic monotonic invariant in local/staging. Keep the
   production accepted-schema gate at **4**. Do not deploy schema-5 client
   writes.
3. Deploy only the backward-compatible server strengthening: unchanged RPC
   name/arguments/shape for v0.29, schema-4 payload validation, ownership,
   atomic revision/history behavior, and monotonic comparison. Do not change
   calendar behavior unless review finds a separate security defect requiring
   its own rollout.
4. While every real current row is still schema 4, verify real schema-4 Cloud
   Sync: first write, update, conflict, encrypted write, wrapper rotation,
   purge behavior, history read, and monitoring/error rates. Preserve a rollback
   migration that does not remove the monotonic invariant.
5. Leave this strengthened server live for an observation period while all
   real state remains schema 4. Confirm current production clients are
   unaffected.
6. Finalize the schema-5 Cloud wire shape, error mapping, read checks, and
   client safe/update-required UI. Run the complete 4/5 staging matrix,
   including the actual v0.29 downgrade request.
7. In a separately reviewed server release, add schema-5 payload validation and
   advance the accepted-schema capability from 4 to 5. Verify schema-4 writes
   still work before any client migration is enabled.
8. Only then release/enable v0.30 schema-5 migration and Cloud uploads. Start
   with controlled accounts/staging telemetry, verify 4 -> 5 and downgrade
   rejection, then broaden rollout.

There must be a completed interval between steps 3 and 7 during which the new
server invariant is live and every production state is schema 4.

## 11. Phase 8B blockers and handoff

The 2026-10-05 capture resolves the former uncertainty about deployed table,
function, trigger, RLS, grant, Edge Function, first-write, history, and
alternative-write-path behavior. Phase 8B must still not deploy production SQL
until:

1. the schema-5 Cloud plaintext/wrapped wire shape is finalized;
2. the stable database error convention and actual PostgREST v14.5 mapping are
   selected and tested;
3. a local/staging environment reproduces the captured schema-4 definitions
   and current client calls;
4. wrapper rotation and purge changes are reconciled with immutable history,
   schema monotonicity, and concurrency tests;
5. the per-user first-write serialization mechanism, supported-schema gate,
   payload validators, and privilege reductions in the deployed inventory are
   reviewed;
6. the complete test matrix in section 9 passes without production data.

The safe stopping point remains design plus uncommitted capture artifacts.
Production storage, backup, Cloud payloads, and `new_schema_version` remain 4.

# v0.30 Phase 8B — server downgrade protection (offline/preparation)

Status: implementation and staging-test preparation only, 2026-10-05. Nothing
in this phase has been applied to a Supabase project. In particular, no SQL was
executed against linked project `rithmbggiiusrmdcqrif`, no migration was marked
applied, no function was deployed, and the RosterBot client still writes only
schema 4.

The authoritative starting point is the exact Phase 8A capture in
[`../backend-capture/phase8a/public-schema.sql`](../backend-capture/phase8a/public-schema.sql),
not a reconstructed or remembered function body. The delta migration is
[`../supabase/migrations/20261005000100_phase8b_roster_downgrade_protection.sql`](../supabase/migrations/20261005000100_phase8b_roster_downgrade_protection.sql).

## 1. Exact invariant

For one authenticated user, while current state is `(revision R, schema S)`,
every ordinary state-replacing commit must satisfy all of these in one database
transaction:

```text
authenticated identity = auth.uid()
incoming schema >= S
incoming schema is enabled by roster_schema_capability
visible payload schema = incoming schema
expected revision = R (or zero when no row exists)
new revision = R + 1 (or one for the first row)
exactly one matching history row is inserted
```

The schema comparison is made after acquiring the server-side lock. A client
read is not evidence for the decision. `schema_too_old` is checked before
payload validation and revision conflict, so a schema-4 client whose cached
revision is stale still receives the deterministic update-required result once
the locked current row is schema 5.

Any exception rolls back current state and the trigger-created history row.
Therefore a downgrade, mismatch, malformed payload, unsupported schema, or
revision conflict changes neither `roster_state` nor `roster_revisions`.

## 2. Serialization and first-write proof

`save_roster_state`, wrapper rotation, and history purge acquire:

```sql
pg_advisory_xact_lock(
  hashtextextended('rosterbot.roster_state:' || auth.uid()::text, 0)
)
```

before reading current state. The `roster_state_guard` trigger takes the same
transaction lock for direct INSERT/UPDATE. Hash collisions can only serialize
unrelated users unnecessarily; they cannot weaken correctness.

After the advisory lock, the RPC selects the existing row `FOR UPDATE`. The
advisory lock covers the gap where no row exists; the row lock protects the
existing tuple and documents the intended state transition.

For two simultaneous first writes with expected revision zero:

1. one transaction obtains the per-user advisory lock;
2. it sees no row, inserts revision 1, and the AFTER trigger inserts history 1;
3. only after commit can the other transaction acquire the lock;
4. the second transaction now sees revision 1 and fails `RB003 /
   revision_conflict`;
5. it cannot reach an independent insert or leak a primary-key error.

The staging integration harness starts the two HTTP requests together and
asserts one success, one `RB003`, one current row at revision 1, and one history
row at revision 1.

## 3. Defense in depth and all captured write paths

The invariant is not confined to the happy-path RPC.

### `roster_state` table

`roster_state_guard` is a BEFORE INSERT/UPDATE trigger. It takes the per-user
lock and enforces:

- first insert must be revision 1;
- `user_id` cannot change;
- updates cannot lower `schema_version`;
- every update increments revision by exactly one;
- payload/schema agreement is valid;
- schema capability is enforced for inserts and upgrades, while an existing
  same-schema row may still undergo credential-wrapper maintenance if the
  rollout gate is later lowered.

`roster_state_write_history` is an AFTER INSERT/UPDATE trigger. Current-state
DML is now the single source of new revision rows. A history insertion failure
aborts the state DML. The successful current/history schema, payload, client,
revision, and timestamp agree exactly.

### `roster_revisions` table

`roster_revision_guard` validates schema/payload agreement on INSERT and
rejects every UPDATE as an immutable-history invariant failure. DELETE remains
available to the two captured cleanup operations: wrapper rotation deletes old
credential wrappers, and encrypted-history purge deletes older plaintext
history. Ordinary authenticated and service-role clients have no direct DELETE
grant.

### `save_roster_state`

The captured four argument names/types/default and successful
`TABLE(revision bigint, updated_at timestamptz)` result are unchanged. The
replacement body uses the lock, downgrade-first classification, shared payload
validator, captured revision-zero semantics, and current-state DML. It no
longer inserts history itself because the table trigger does that atomically.

Existing schema-4 plaintext and encrypted request bodies remain valid. A
successful call still returns exactly `revision` and `updated_at`.

### `rotate_roster_encryption_wrappers`

The captured signature and three-column return are unchanged. It joins the
same per-user serialization domain, validates both existing and replacement
encrypted envelopes against the preserved server schema, retains the captured
“only wrappers may differ” comparisons, updates current state, and then deletes
older history. The state trigger creates the new revision before the delete;
all work is one transaction.

### `purge_unencrypted_roster_history`

The captured signature and return are unchanged. It now holds the per-user
advisory lock and current-row `FOR UPDATE` lock across encrypted-current
validation and deletion. It cannot decide that current is encrypted and then
race a concurrent plaintext save.

### Foreign-key cascade and administration

Deleting an `auth.users` row still cascades deletion of that user's current and
history rows. This is account deletion, not a state replacement, and is not
blocked.

Database owners and superusers can disable triggers or alter objects. That is
an unavoidable break-glass administrative boundary, not an application write
path. Such access must be audited operationally.

## 4. Service role, RLS, and grants

RLS and the two existing authenticated SELECT policies are unchanged.
Authenticated callers retain SELECT on their own current/history rows and have
no direct roster INSERT/UPDATE/DELETE permission.

The capture found no RosterBot service-role process that writes either roster
table. The deployed calendar Edge Function uses service role only to SELECT
`calendar_feeds`; it does not touch roster state. The delta therefore:

- retains service-role SELECT on both roster tables;
- retains service-role EXECUTE on the three RPCs for compatibility with an
  explicitly impersonated operational caller;
- revokes direct service-role roster table privileges other than SELECT.

This does not rely on RLS to constrain service role—service role bypasses RLS.
It removes the unnecessary direct DML capability at the grant boundary, while
the table triggers remain defense in depth for owner maintenance and any
future deliberately granted writer. A bare service-role JWT has no user
identity and receives `RB006 / not_authenticated` from the roster RPCs.

If a future audited job genuinely needs direct roster mutation, do not simply
restore table `ALL`. Give it a narrowly scoped SECURITY DEFINER function that
uses the same per-user lock and state DML/trigger path.

## 5. Payload/schema agreement

All writable payloads must be JSON objects.

Plaintext schema 4 requires:

- `app = "RosterBotPayBot"`;
- integer `schemaVersion = 4 = new_schema_version`;
- object-valued `storage`;
- when present, `storage["rosterbot-db-schema-v1"]` is exactly string `"4"`.

Plaintext schema 5 is staging-only until the capability gate is deliberately
advanced. It uses the Phase 7 envelope directly and requires:

- `format = "rosterbot-personal-state"` and integer `formatVersion = 1`;
- integer `storageSchemaVersion = 5 = new_schema_version`;
- integer `minimumReaderSchema = 5`;
- object containers for writer, generation, checksum, timestamps,
  personalState, extensions, migration, and compatibility;
- `previousGeneration` is null or an object.

The database validates authoritative outer structure, not the Phase 7 semantic
checksum or every personal-state field. Full semantic validation remains a
client responsibility.

Encrypted schemas 4 and 5 require:

- `format = "rosterbot-encrypted-v1"`;
- integer outer `schemaVersion = new_schema_version`;
- crypto version 1, cipher `AES-GCM-256`, bounded key id, 64-character lowercase
  hex fingerprint, base64url IV/ciphertext, and valid passphrase/recovery
  wrapper containers.

The server cannot inspect encrypted inner state and does not redesign or
decrypt encryption. The server-authoritative pair is the `schema_version`
column and matching unencrypted outer `schemaVersion`. A capable client must
also compare that pair with the authenticated decrypted inner schema.

Parameter/payload disagreement and missing or non-integer schema metadata are
`RB004`. Unsupported discriminators and malformed container/crypto structure
are `RB005`.

## 6. Capability gate

The delta creates an unexposed singleton table with a default accepted range
of exactly schema 4. It has RLS enabled and no API-role table grants. The
validator reads it through a non-executable SECURITY DEFINER helper.

For an isolated staging test only, a database owner sets:

```sql
update public.roster_schema_capability
set max_writable_schema = 5,
    updated_at = now()
where singleton = true;
```

That statement is not part of the delta and has not been run here. Production
must remain at 4 until the separate schema-5 Cloud rollout gate is approved.

## 7. Stable error contract

PostgreSQL/PostgREST exposes `code`, exact `message`, safe `details`, and no
payload/user data.

| Code | Exact message | Meaning | v0.30 action |
| --- | --- | --- | --- |
| `RB001` | `schema_too_old` | Incoming schema is below locked current schema. | Enter update-required hold; retain local state; never auto-retry. |
| `RB002` | `schema_too_new` | Incoming schema is above the deployed capability. | Enter server-rollout hold; never auto-retry. |
| `RB002` | `schema_unsupported` | Incoming schema is null/below the minimum/outside 4–5 for maintenance validation. | Same rollout/incompatibility hold. |
| `RB003` | `revision_conflict` | Expected revision differs from locked current revision. | Re-fetch once and use existing conflict analysis; no blind write retry. |
| `RB004` | `payload_schema_mismatch` | Required schema metadata is missing/malformed or disagrees. | Recovery-safe integrity hold; retain evidence; no retry. |
| `RB005` | `payload_malformed` | Payload object/discriminator/required outer structure is invalid. | Recovery-safe integrity hold; no retry. |
| `RB006` | `not_authenticated` | RPC has no `auth.uid()`. | Reauthenticate; do not infer row existence. |
| `RB007` | `state_invariant_violation` | Direct DML/internal state or revision invariant failed. | Operational fault; no retry. |
| `42501` / PostgREST permission error | implementation-defined privilege message | Anonymous EXECUTE or direct table DML denied before function/table access. | Authentication/authorization failure; disclose no owner state. |

The exact `details` strings contain only incoming/current schema or revision
numbers and invariant names. They contain no UUID, payload, ciphertext, token,
or other user's information. HTTP status is deliberately not the client key;
the SQLSTATE and exact token are stable across PostgREST status mapping.

[`../js/04-cloud-error-contract.js`](../js/04-cloud-error-contract.js) contains
the v0.30 mapping. Automatic sync puts RB001/RB002/RB004/RB005/RB006 into a
persistent hold instead of its generic 10-second offline retry. RB003 retains
the existing re-fetch/conflict path. Unknown transport errors retain the
existing offline retry. No schema-5 writer was added.

## 8. RPC EXECUTE decisions

| RPC | Anonymous required? | Captured internal auth | Phase 8B grant |
| --- | --- | --- | --- |
| `save_roster_state` | No. Browser calls follow password authentication. | `auth.uid()` and failure when null. | Revoke `PUBLIC`/`anon`; retain `authenticated`/`service_role`. |
| `rotate_roster_encryption_wrappers` | No. It requires an authenticated current row and revision. | `auth.uid()` and failure when null. | Revoke `PUBLIC`/`anon`; retain `authenticated`/`service_role`. |
| `purge_unencrypted_roster_history` | No. It acts only on caller-owned history. | `auth.uid()` and failure when null. | Revoke `PUBLIC`/`anon`; retain `authenticated`/`service_role`. |

The logged-in RosterBot client path uses its access token and the
`authenticated` role, so these changes do not alter it. The anonymous grants
were harmless only because each body checked `auth.uid()`; they were still
unnecessary exposure.

## 9. Staging test matrix

The catalog smoke test is
[`../supabase/tests/phase8b-catalog-contract.sql`](../supabase/tests/phase8b-catalog-contract.sql).
The HTTP/Auth/PostgREST integration harness is
[`../supabase/tests/phase8b-staging-integration.mjs`](../supabase/tests/phase8b-staging-integration.mjs).
It refuses the captured production ref, requires an explicit staging
confirmation variable, creates synthetic `example.invalid` users, and deletes
them afterward.

| Case | Assertion |
| --- | --- |
| Authenticated first schema-4 write | Revision/current/history 1; exact two-field success shape. |
| Ordinary schema-4 update | Exactly next revision and one history snapshot. |
| Revision conflict | `RB003`; byte-equivalent current/history snapshot. |
| Simultaneous first writes | One success, one `RB003`, no unique error, one current/history row. |
| Schema 4 → 5 | With staging gate 5, revision increments and schemas 4,4,5 remain auditable. |
| Schema 5 → 4 | `RB001`; no current/history change. |
| Stale schema-4 after upgrade | `RB001`, not `RB003`; no change. |
| Repeated downgrade | Every attempt `RB001`; snapshot unchanged. |
| Concurrent schema-4/schema-5 | One commit. If 5 wins, 4 gets `RB001`; if 4 wins, 5 gets `RB003` and can upgrade from the new revision. No later 4 commit. |
| Plain payload/schema agreement | 4/5 success shapes plus both mismatch directions rejected `RB004`. |
| Encrypted outer agreement | Matching outer/server schema succeeds; mismatch is `RB004`. |
| Missing/malformed metadata | `RB004`; arrays/unknown/malformed crypto are `RB005`; no rows. |
| Unsupported schema | Schema 6 is `RB002 / schema_too_new`; no rows. |
| Rejected downgrade history | Full pre/post serialized state/history equality. |
| Wrapper rotation | Same schema and encrypted body, wrappers changed, next revision, old wrapper history removed. |
| Plaintext-history purge | Only caller's old plaintext history removed after encrypted current validation. |
| RLS ownership | User A cannot read or write User B state. |
| Anonymous RPC calls | All three denied by grant. |
| Service role | Cross-user synthetic SELECT retained; direct roster DML denied; bare RPC gets RB006. |
| Existing schema-4 compatibility | Exact v0.29-shaped request succeeds and response keys remain revision/updated_at. |

The repository test statically verifies the migration contract, client remains
schema 4, deterministic error mapping, production-ref refusal, and presence of
the complete staging matrix. Only isolated staging can prove actual PostgREST
HTTP envelopes and concurrency scheduling.

## 10. Exact deployment and test plan

These are future commands/steps; none were run in this offline phase.

1. Create a new isolated Supabase staging project. Confirm its ref is not
   `rithmbggiiusrmdcqrif`. Do not copy production users or rows.
2. Establish the captured Phase 8A schema in staging from the capture artifact
   or a separately reviewed staging baseline. This is setup only; do not add
   that baseline to remote production migration history.
3. Compare the staging catalog to the Phase 8A capture, especially all three
   function definitions, table keys, policies, triggers, and grants.
4. Apply only the Phase 8B delta to staging with an owner connection. Do not
   use `supabase db push --linked` from the production-linked checkout. Record
   the SQL checksum and staging execution output.
5. Run the read-only catalog test:

   ```text
   psql "$ISOLATED_STAGING_DATABASE_URL" \
     -v ON_ERROR_STOP=1 \
     -f supabase/tests/phase8b-catalog-contract.sql
   ```

6. With the capability still at 4, replay real request *shapes* using synthetic
   schema-4 data: plaintext first/update/conflict, encrypted save, rotation,
   purge, and current/history reads. Never copy a production payload.
7. As staging database owner only, set `max_writable_schema = 5` with the SQL in
   section 6. Record this as a staging test setup mutation, not a migration.
8. Run the HTTP integration harness:

   ```text
   PHASE8B_ALLOW_ISOLATED_STAGING=yes \
   PHASE8B_STAGING_URL="https://<isolated-ref>.supabase.co" \
   PHASE8B_STAGING_ANON_KEY="<staging anon key>" \
   PHASE8B_STAGING_SERVICE_ROLE_KEY="<staging service key>" \
   node supabase/tests/phase8b-staging-integration.mjs
   ```

9. Save redacted test output containing status, `{code,message,details,hint}`,
   revision counts, and timing. Do not store keys, JWTs, emails beyond the
   synthetic addresses, payload ciphertext, or project secrets.
10. Repeat concurrency cases enough times to observe both legal 4/5 orderings.
    The invariant is the postcondition, not which request wins.
11. Reset or destroy staging. If retaining it for rollout rehearsal, return the
    capability gate to 4 and rerun the schema-4 suite.
12. Review the captured-production-to-delta diff. Production approval must be
    separate. Apply the delta before any schema-5 client is built or enabled.
13. After a future production deployment, keep the gate at 4, run only
    synthetic schema-4 smoke tests, observe, and separately approve raising the
    gate. A rollback must never remove the monotonic table trigger once a row
    could have reached schema 5.

## 11. Migration-history limitation

The deployed project reported an empty Supabase migration history even though
the schema exists. This repository therefore cannot truthfully reconstruct the
entire backend from migrations. The Phase 8B file is intentionally only a
delta against the captured definitions. `supabase db reset` on a blank database
with this migration alone must fail because `roster_state`,
`roster_revisions`, the original policies, and the original RPCs are not a
historical baseline.

Before a future disaster-recovery/from-scratch workflow, create and separately
review a baseline process from an authoritative schema dump. Do not relabel
the Phase 8A reconstruction or Phase 8B delta as historical migrations, and do
not run migration repair merely to make the remote history appear complete.

## 12. Known boundaries

- PostgreSQL cannot verify the semantics or inner schema of encrypted
  ciphertext. It enforces only the authenticated visible envelope metadata;
  the client verifies after decryption.
- The schema-5 database validator checks required outer structure, not every
  semantic field or checksum. The client remains authoritative for those
  validations.
- Database owner/superuser can disable triggers and bypass grants. This is an
  audited break-glass boundary.
- The staging harness needs an isolated hosted/local Supabase stack to verify
  Auth/PostgREST behavior. Repository unit tests do not simulate PostgreSQL
  transaction scheduling.
- The default gate intentionally rejects schema 5. Its staging-only increase
  is not part of the migration and no browser schema-5 writer exists.

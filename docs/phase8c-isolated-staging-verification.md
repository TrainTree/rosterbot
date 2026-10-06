# v0.30 Phase 8C — isolated Supabase staging verification

Status: PASS on 2026-10-06 (Australia/Melbourne).

Production project `rithmbggiiusrmdcqrif` was not modified. The checkout stayed
linked to production, but no linked mutation command was used. Every Phase 8C
SQL or HTTP mutation entry point required an explicit project ref, refused the
production ref, and required an isolated-staging confirmation variable.

## Target and safeguards

- Staging name: `rosterbot-phase8c-staging`
- Staging ref: `wuzyurvrztskljpxpeaq`
- Staging status at discovery: `ACTIVE_HEALTHY`
- Staging region: `ap-southeast-1`
- Production ref denied by every mutation helper: `rithmbggiiusrmdcqrif`

The original Phase 8B harness production-ref check was exercised before any
remote mutation. Phase 8C strengthened the check to require the explicit ref
and require the URL hostname to equal `<ref>.supabase.co`. The SQL executor,
credential wrapper, baseline/gate/trigger/cleanup harnesses have the same
production refusal. API keys were fetched at runtime from the existing
Supabase login and were never printed or written to the repository.

## Baseline construction

Staging began with none of `calendar_feeds`, `roster_state`,
`roster_revisions`, or `roster_schema_capability` present. The baseline source
was the row-free Phase 8A catalog reconstruction:

`backend-capture/phase8a/public-schema.sql`

Original file SHA-256:

`50bb72a3c9880bec6f431f0404db02aa140e81abed6d6ca14286396e3ea8d3f8`

The first submission failed with PostgreSQL `42501 permission denied to change
default privileges`. The batch rolled back completely; a subsequent catalog
query found none of the target objects. Staging already had the same six
`postgres`/`supabase_admin` default-privilege ACLs captured in Phase 8A. The
successful baseline submission therefore omitted only the redundant trailing
`ALTER DEFAULT PRIVILEGES` blocks and retained every captured table, explicit
constraint/index, function/RPC, trigger, RLS policy, and object grant. Applied
SQL SHA-256:

`681f759c8b5a7429b870385a66b28a1acb7cf111b5ca517d3891d020622b7ea9`

No production row, user, secret, calendar token, or ICS data was imported.

The only part not re-executed byte-for-byte was the captured default-privilege
DDL because the Management API execution role cannot alter those owner
defaults. Catalog evidence showed the fresh project already matched it, so the
effective baseline did not differ.

## Pre-patch baseline validation

The synthetic pre-patch harness passed 20 assertions:

- authenticated schema-4 first write returned revision 1;
- ordinary schema-4 update returned revision 2;
- history contained exactly revisions 1 and 2 with matching payloads;
- the success shape was exactly `revision, updated_at`;
- another authenticated user could not read the owner's state;
- the legacy conflict response was HTTP 400 / `P0001` with
  `revision_conflict: expected 1, current 2`.

This matched the important captured Phase 8A behavior, so Phase 8B application
was allowed to proceed.

## Phase 8B application

Applied only to staging through the guarded Management API SQL executor:

`supabase/migrations/20261005000100_phase8b_roster_downgrade_protection.sql`

- SHA-256: `5121623b8a18569d4af2da3eb6f1cb00253495ad8338e6c711c999d08896478e`
- HTTP result: 201, empty successful result
- no transformation was made to the migration
- no production migration record was created or repaired

The catalog/grant contract then passed with SHA-256
`ff488e34498691665bb70117b79e6907447ec32672e3b6f0adfb7eac2a2b3d0c`.

With the default capability still at 4, schema-4 first write/update passed,
revision conflict returned `RB003`, and schema 5 returned
`RB002/schema_too_new`; the rejected schema-5 user had no state row. Only then
was staging temporarily changed to `max_writable_schema=5` for the required
matrix. It was returned to 4 afterward.

## Post-patch matrix

| Area | Evidence | Result |
| --- | --- | --- |
| Core downgrade/first-write | 103 assertions, 6 synthetic users | PASS |
| Concurrent schema writers | 38 assertions, 2 synthetic users | PASS |
| Payload/encryption/maintenance | 120 assertions, 14 synthetic users | PASS |
| RLS/grants/calendar | 34 assertions, 2 synthetic users | PASS |
| Trigger-level owner DML | 6 explicit rejected direct-write cases | PASS |
| Catalog/grants | read-only transaction contract | PASS |

Covered behavior:

- schema-4 first write and ordinary update;
- current-client/v0.29-shaped schema-4 request and two-field result;
- revision conflict;
- schema 4 to 5 staging-only upgrade;
- current and stale schema 5 to 4 rejection;
- repeated plaintext and encrypted downgrade attempts;
- rejected writes leave current state and history unchanged;
- plaintext schema-4 and schema-5 agreement;
- encrypted schema-4 and schema-5 outer agreement;
- missing, non-integer, mismatched, malformed, and unsupported schema metadata;
- wrapper rotation and plaintext-history purge;
- RLS ownership isolation;
- anonymous RPC denial and authenticated RPC retention;
- service-role SELECT retention and direct roster DML denial;
- bare service-role RPC rejection with `RB006`.

## Concurrency evidence

Four simultaneous first-write trials used two HTTP requests started together.
Every trial produced:

- exactly one HTTP 200 revision-1 success;
- exactly one HTTP 400 `RB003/revision_conflict`;
- no primary-key/uniqueness error;
- exactly one current row at revision 1;
- exactly one history row at revision 1.

Both clients won at least once, which confirms the result was not a sequential
fixture masquerading as a race.

Concurrent schema-4/schema-5 writes observed both legal lock orderings:

1. Schema 4 won revision 2, schema 5 received `RB003`, then schema 5 retried
   from revision 2 and committed revision 3.
2. Schema 5 won revision 2 and schema 4 received `RB001/schema_too_old`.

Both ended at schema 5. A subsequent schema-4 request returned `RB001` and left
the serialized current/history snapshot unchanged.

The explicit stale downgrade sequence read schema 4 at revision 1, upgraded
from another writer to schema 5/revision 2, then submitted schema 4 with stale
expected revision 1. It returned `RB001` rather than `RB003`. State remained
schema 5/revision 2 and history remained exactly revisions 1 and 2.

## Trigger-level protection

Controlled database-owner DML against two synthetic auth users produced:

| Direct operation | Code/message | Detail |
| --- | --- | --- |
| Schema downgrade | `RB001/schema_too_old` | `current_schema=5 incoming_schema=4` |
| Revision jump | `RB007/state_invariant_violation` | `revision_must_increment_by_one current=2 incoming=4` |
| Ownership mutation | `RB007/state_invariant_violation` | `state_owner_is_immutable` |
| Payload/schema mismatch | `RB004/payload_schema_mismatch` | `incoming_schema=5 payload_schema=4` |
| First insert at revision 2 | `RB007/state_invariant_violation` | `first_revision_must_be_1 received=2` |
| History update | `RB007/state_invariant_violation` | `revision_rows_are_immutable` |

After all rejections, current state was still schema 5/revision 2 and history
was still exactly `(1, schema 4), (2, schema 5)`.

## Actual error envelopes

PostgREST preserved all custom PostgreSQL SQLSTATE codes and exact messages:

| Code | HTTP | Message | Representative safe detail |
| --- | ---: | --- | --- |
| `RB001` | 400 | `schema_too_old` | `current_schema=5 incoming_schema=4` |
| `RB002` | 400 | `schema_too_new` | `incoming_schema=6 max_writable_schema=5` |
| `RB002` | 400 | `schema_unsupported` | `incoming_schema=3 accepted_schema=4..5` |
| `RB003` | 400 | `revision_conflict` | `expected_revision=1 current_revision=2` |
| `RB004` | 400 | `payload_schema_mismatch` | `incoming_schema=4 payload_schema=5` |
| `RB005` | 400 | `payload_malformed` | `payload_must_be_json_object` |
| `RB006` | 400 | `not_authenticated` | null |
| `RB007` | PostgreSQL direct | `state_invariant_violation` | invariant-specific text above |
| `42501` | 401 | `permission denied for function ...` | anonymous RPC |
| `42501` | 403 | `permission denied for table roster_state` | service-role direct DML |

No custom-code/message transformation discrepancy was observed. The client
already classified `RB001` through `RB006` as deterministic non-retry results.
Phase 8C found that the documented `RB007` contract was missing from
`js/04-cloud-error-contract.js`; it is now classified as
`state_invariant_violation`, action `operational-fault`, hold reason
`server-state-invariant`, and `retry:false`. Repository tests cover this.

## Client and calendar smoke tests

The exact current four-argument schema-4 RPC request shape saved and loaded
successfully before and after the patch. Revision conflict still follows the
refresh/conflict route. Every observed deterministic `RB001`–`RB006` envelope
was passed through the client classifier and asserted non-retry. The browser
client source still sends `new_schema_version:4`; no schema-5 production
persistence path was enabled.

The hosted build is hard-coded to production, so a browser was deliberately
not pointed at staging. The isolated harness exercised the same Auth,
PostgREST, payload, RPC, and response shapes directly.

For calendar regression, synthetic authenticated INSERT/UPDATE/SELECT/DELETE
continued to work with ownership RLS. A different user saw no row. The service
role successfully selected exactly `ics_text, enabled, updated_at` by synthetic
token hash, matching the read-only `calendar-feed` Edge Function path. No Edge
Function was deployed, and no production token or ICS data was used.

## Final staging state

Final read-only audit:

- capability: minimum 4, maximum 4;
- `roster_state`: 0 rows;
- `roster_revisions`: 0 rows;
- `calendar_feeds`: 0 rows;
- Phase 8B roster triggers enabled: 3;
- authenticated `save_roster_state` EXECUTE: yes;
- anon `save_roster_state` EXECUTE: no;
- service-role roster SELECT: yes;
- service-role roster INSERT/UPDATE/DELETE: no;
- synthetic user cleanup audit: 0 remaining.

## Deployment-planning conclusions

No Phase 8B invariant failed. Before production deployment planning:

1. review the Phase 8C `RB007` client-classifier addition;
2. use a separately approved production deployment step that keeps the
   capability at schema 4;
3. do not treat the Phase 8B delta as a baseline or repair production migration
   history;
4. preserve the monotonic triggers in any rollback plan;
5. keep schema-5 client persistence disabled until its separate rollout gate.

The staging region differs from production (`ap-southeast-1` versus
`ap-southeast-2`), but no tested PostgreSQL/Auth/PostgREST invariant depends on
that difference.

## Repository verification

After all staging work and after returning the staging gate to 4:

- `npm test`: 127 passed, 0 failed;
- `npm run check:syntax`: passed;
- `git diff --check`: passed.

Repository changes remain uncommitted for review.

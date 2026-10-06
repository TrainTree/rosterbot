# v0.30 Phase 8E — production deployment of server downgrade protection

Status: **PASS** on 2026-10-06 (Australia/Melbourne).

## Deployment

The guarded Phase 8D production executor applied only:

`supabase/migrations/20261005000100_phase8b_roster_downgrade_protection.sql`

to production project `rithmbggiiusrmdcqrif` (`rosterBot-sync-dev`,
`ap-southeast-2`). The submitted SHA-256 was the staging-proven
`5121623b8a18569d4af2da3eb6f1cb00253495ad8338e6c711c999d08896478e`.
The SQL completed as one explicit PostgreSQL transaction at
`2026-10-06T02:45:56.069Z`.

No schema-5 capability was enabled, no user data migration ran, no client or
Edge Function was deployed, and no Supabase migration history was created or
repaired.

## Mandatory pre-change gate

Immediately before the mutation:

- the exact project ref/name/region matched and status was `ACTIVE_HEALTHY`;
- all nine Phase 8A catalog captures matched byte-for-byte;
- the capability table, validator, and state guard were absent;
- all 3 current-state rows and all 94 history rows were schema 4;
- the hosted Cloud Sync source retained SHA-256 `2130dfc...6370f`, emitted
  `new_schema_version:4`, and contained no schema-5 wire expression;
- `calendar-feed` remained active at version 2 with the expected bundle hash;
- the reviewed rollback retained SHA-256 `c0d946dd...2d95` and corresponded to
  the observed Phase 8A function/grant definitions.

The payload-free capture is
`backend-capture/phase8e/pre-deployment-20261006T024220Z.json`.

## Intentional production changes

The only intentional changes are those in the reviewed Phase 8B delta:

- added the singleton schema-capability table with minimum and maximum both 4;
- added five internal validation/guard/history helper functions;
- replaced the three roster RPC bodies with the staging-proven protected
  versions while preserving signatures and result shapes;
- added the three roster guard/history triggers;
- revoked anonymous/PUBLIC RPC execution while retaining authenticated and
  service-role execution;
- narrowed service-role access on the two roster tables to SELECT, removing
  direct INSERT/UPDATE/DELETE.

Roster table columns, constraints, indexes, ownership policies, and RLS stayed
unchanged. All calendar definitions, grants, deployment metadata, and behavior
stayed unchanged.

## Post-deployment verification

The staging-proven read-only catalog contract passed. Six catalog captures
from production matched the final Phase 8C staging database exactly, including
all nine function definitions, table/trigger definitions, privileges, and
write paths. Objects that were not meant to change matched Phase 8A.

Immediate data-integrity evidence was unchanged:

| Aggregate | Before | After |
| --- | ---: | ---: |
| `roster_state` | 3 | 3 |
| `roster_revisions` | 94 | 94 |
| `calendar_feeds` | 1 | 1 |

All current and history rows remained schema 4. The deployment created no
history row and did not alter current state.

Capability is exactly 4. The three expected triggers are enabled. RLS remains
enabled. Authenticated RPC execution and service-role SELECT remain available;
anonymous RPC execution and direct service-role roster DML are absent. Each
anonymous HTTP RPC call returned `401/42501` before function execution.

The hosted client remains the same schema-4 build. No synthetic account or
production canary was created because the runbook's non-mutating compatibility
path passed, including exact Phase 8C definition comparison and RPC/grant
verification.

`calendar-feed` remains active, version 2, `verify_jwt=false`, with bundle
SHA-256 `0fc2fd4f...043d`. Service-role SELECT remains granted. A fixed
nonexistent token returned the generic 404, OPTIONS returned 200, and POST was
rejected with 404. No real feed token or ICS content was used.

The payload-free post-change capture is
`backend-capture/phase8e/post-deployment-20261006T030241Z.json`. It records
function and catalog hashes without payloads, tokens, or user identifiers.

## Repository verification

- `npm test`: 127 passed, 0 failed;
- `npm run check:syntax`: passed;
- Phase 8E verifier syntax: passed;
- Phase 8E evidence JSON validation: passed;
- `git diff --check`: passed.

All Phase 8E evidence, verification code, and documentation remains
uncommitted for review.

## Result

**PASS — Phase 8B server protection is deployed to production, production
remains schema 4, existing state/history are unchanged, and the server safety
prerequisite for future schema-5 work is satisfied.**

Phase 9 was not started.

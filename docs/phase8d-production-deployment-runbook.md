# v0.30 Phase 8D — production deployment plan and preflight

Status: **READY FOR PRODUCTION DEPLOYMENT** as of 2026-10-06 (Australia/Melbourne).

This phase performed read-only production discovery and prepared local,
uncommitted deployment artifacts. It did **not** execute production DDL or DML,
deploy a migration, modify migration history, enable schema 5, create a canary
account, or modify any production user row.

## 1. Verified production identity

Read-only Supabase Management API discovery at `2026-10-06T02:22:57.277Z`
returned:

| Field | Verified value |
| --- | --- |
| Display name | `rosterBot-sync-dev` |
| Project ref / id | `rithmbggiiusrmdcqrif` |
| Status | `ACTIVE_HEALTHY` |
| Region | `ap-southeast-2` |
| PostgreSQL | `17.6.1.166` / engine 17 / GA |

The display name contains `dev`, but the exact ref is the production ref named
in the deployment requirement. Every prepared production command hard-codes
and re-verifies `rithmbggiiusrmdcqrif`, the display name, region, and healthy
status before it can submit SQL.

## 2. Production drift result

Fresh results from all nine Phase 8A allowlisted catalog queries were compared
in memory with their committed Phase 8A JSON. Every canonical result and row
count matched exactly:

| Capture | Rows | Phase 8A/current SHA-256 |
| --- | ---: | --- |
| object inventory | 7 | `a5d53cd7517e1cccb480835f69e3ca94e7bd18feae365cd0b0881485f3a7e019` |
| table details | 3 | `cb1c899aa205cc27b0bcf2f58af895e0aca618005d8c63a6fd2ec6a0147a7f4d` |
| function details | 4 | `fccdb9da6718097f03449b52ad46e4cf2c6e23e40170c00e663f986cae6188c9` |
| privilege details | 70 | `9ddf4e0e1ef9466a436fd57cc71c368a59f8619bf4a8caf32589d8f13d9d27ef` |
| column privileges | 0 | `37517e5f3dc66819f61f5a7bb8ace1921282415f10551d2defa5c3eb0985b570` |
| default privileges | 96 | `de312959e3629fae1fd27e89c8f900824dedbd937f2c6151fdfcf2bed63523a1` |
| write-path search | 3 | `ae7f9b48672749669c377043fd560fb1e176afbadd927c01e7182aef50ef35fc` |
| schema/role details | 12 | `258fe938247d348bce629ae998089dad0e9e61cfe32de17902673c5cdb552145` |
| automation inventory | 5 | `0883c87703a3fd7d5dfc0754ee737cf4b68bd4909d9918cb8e10ac14c2a991c6` |

This exact match covers `roster_state`, `roster_revisions`, all three roster
RPC definitions, all triggers, grants/default grants, RLS policies,
indexes/constraints, roles, and discovered write paths. There is no material
or immaterial catalog drift in the captured scope.

The Phase 8B capability table, validator, and state guard are absent, as they
should be before deployment. Therefore current server capability is the Phase
8A behavior: there is no explicit server capability gate. All current and
history rows nevertheless report schema 4.

The read-only snapshot is
`backend-capture/phase8d/preflight-20261006T022257Z.json`. It contains no user
IDs, payloads, tokens, ICS text, keys, or other secrets.

## 3. Migration identity and checksum

The only production delta permitted by this runbook is:

`supabase/migrations/20261005000100_phase8b_roster_downgrade_protection.sql`

Current SHA-256:

`5121623b8a18569d4af2da3eb6f1cb00253495ad8338e6c711c999d08896478e`

This exactly equals the Phase 8C recorded and staging-executed SHA-256. Any
byte change blocks deployment. In particular, do not edit the old
offline/staging wording in the already-proven file.

## 4. Safe pre-change evidence capture

Immediately before a future approved deployment, from repository root:

```sh
shasum -a 256 supabase/migrations/20261005000100_phase8b_roster_downgrade_protection.sql
node --check backend-capture/phase8d/preflight-readonly.mjs
node backend-capture/phase8d/preflight-readonly.mjs
```

Save the final JSON output in the change record with its UTC execution time.
It must show all of the following or the deployment is aborted:

- exact ref/name/region and `ACTIVE_HEALTHY`;
- `all_catalog_captures_match_phase8a: true` for all nine captures;
- capability table/validator/state guard absent;
- every `roster_state` and `roster_revisions` aggregate is schema 4;
- no payload values or user identifiers in the output.

Record aggregate counts immediately before deployment. The 2026-10-06
preflight counts were 3 current rows, 94 revision rows, and 1 calendar row.
These are evidence, not a freeze: legitimate live schema-4 saves may change
them between checks.

Also record:

```sh
git status --short
git diff --check
shasum -a 256 supabase/rollback/20261005000100_phase8b_roster_downgrade_protection.rollback.sql
```

The reviewed rollback SHA-256 is
`c0d946dd90f71167d3d3d46c7bbfb814a72fee6d1a1b1dbf25f6d3f8b7652d95`.

## 5. Exact future deployment procedure

Schedule a low-traffic window, retain the preflight and command output, and
run exactly:

```sh
PHASE8D_PRODUCTION_CONFIRM=APPLY_PHASE8B_TO_rithmbggiiusrmdcqrif \
  node supabase/deploy/phase8d-production-executor.mjs apply
```

Do not run this command during Phase 8D.

The executor:

1. accepts only the hard-coded Phase 8B file and exact staging-proven hash;
2. verifies exact production ref, name, region, and healthy status;
3. reruns all nine Phase 8A comparisons and aborts on any drift;
4. confirms the capability object is absent and every roster row is schema 4;
5. submits the exact file through the Supabase Management API;
6. reports immediate read-only postconditions.

The migration itself contains explicit `BEGIN` and `COMMIT`, so its table,
function, trigger, and grant changes are one PostgreSQL transaction. It inserts
only the singleton capability row `(true, 4, 4)`; it has no DML against
`roster_state`, `roster_revisions`, `calendar_feeds`, or `auth.users`.

Do **not** use any of the following:

- `supabase db reset`;
- `supabase db push` or a broad schema push;
- migration-history repair or baseline reconstruction;
- the Phase 8A `public-schema.sql` as a migration;
- staging setup/reset/gate-5 files;
- any schema-5 migration or capability update;
- a production-linked invocation of a Phase 8C mutation harness.

Production has no `supabase_migrations.schema_migrations` relation. The
Management API execution above deliberately applies the reviewed delta without
creating or repairing a migration chain.

## 6. Failure and transaction behavior

| Failure point | Expected state and action |
| --- | --- |
| Before SQL submission / before `BEGIN` | No change. Fix the preflight or authorization issue; do not run rollback. |
| Halfway through SQL | Transaction is aborted; PostgreSQL rolls back all Phase 8B DDL/grants and the capability insert. Re-run Phase 8D preflight to prove Phase 8A remains. |
| Function or trigger creation | Same atomic rollback. No trigger can remain half-installed after transaction failure. |
| Grant/revoke statements | Same atomic rollback; prior grants remain. |
| Connection result is ambiguous | Do not retry blindly. Run read-only capability/trigger/catalog checks to determine whether the transaction committed. |
| SQL commits but verification fails | If capability and all rows are still schema 4, run the reviewed rollback immediately, then verify exact Phase 8A catalog restoration. |

## 7. Exact rollback

Rollback file:

`supabase/rollback/20261005000100_phase8b_roster_downgrade_protection.rollback.sql`

Run only after an approved Phase 8B production deployment and only while
capability and all current/history rows are still schema 4:

```sh
PHASE8D_PRODUCTION_CONFIRM=ROLLBACK_PHASE8B_ON_rithmbggiiusrmdcqrif \
  node supabase/deploy/phase8d-production-executor.mjs rollback
```

The rollback starts a transaction, takes access-exclusive locks on only the two
roster tables, and refuses to proceed unless capability is exactly 4 and no
non-schema-4 row exists. It then:

- drops the three Phase 8B roster triggers;
- restores the exact Phase 8A bodies/attributes/owners of all three RPCs;
- restores anon/authenticated/service-role RPC grants;
- restores authenticated SELECT and service-role ALL roster-table grants;
- drops the five Phase 8B helper functions and capability table;
- leaves every current/history row and all calendar objects untouched.

The three restored function bodies were statically compared byte-for-byte with
the Phase 8A capture. After rollback, the executor reruns all nine Phase 8A
catalog comparisons and fails visibly unless the exact captured catalog is
restored.

If any schema-5 row ever exists, this rollback is intentionally blocked. That
condition requires a separate forward-compatible recovery plan; never remove
monotonic guards from a database containing schema-5 state.

## 8. Post-deployment verification checklist

Perform these in order while the production client continues emitting schema
4. Do not enable schema 5.

### Structural checks (required, no user mutation)

- Executor postcondition shows capability `{min: 4, max: 4}`.
- Exactly three enabled non-internal roster triggers exist:
  `roster_state_guard`, `roster_state_write_history`, and
  `roster_revision_guard`.
- All three public RPC signatures and result shapes are unchanged.
- `authenticated` and `service_role` retain RPC EXECUTE.
- `anon` has no EXECUTE on any of the three RPCs.
- `authenticated` retains SELECT-only access to roster tables.
- `service_role` retains roster SELECT and has no direct
  INSERT/UPDATE/DELETE.
- RLS policies, table columns, constraints, and indexes are unchanged.
- Aggregate schema counts contain only schema 4.
- The migration-history relation remains absent.
- Compare immediate row counts with the saved preflight. A difference is
  acceptable only if ordinary live activity is independently visible; the
  Phase 8B SQL itself must account for zero current/history/calendar changes.

The already-reviewed catalog contract
`supabase/tests/phase8b-catalog-contract.sql` may be run in its declared
read-only transaction after approval. Do not run any Phase 8C mutation,
concurrency, trigger-DML, gate-5, reset, or cleanup harness in production.

### Client and API checks (required, non-mutating/default path)

- Fetch the deployed `js/51-cloud-sync.js`; confirm the live RPC request still
  contains `new_schema_version:4` and no `new_schema_version:5`. Record its
  SHA-256. At preflight it was
  `2130dfc537370578af0c265376b2dcfc7ce2c0943b49e7140fe5e2052066370f`.
- Confirm an anonymous PostgREST call to each roster RPC is rejected with
  permission error `42501` before function execution. Use no user token and a
  deliberately malformed body; no state can be written because EXECUTE is
  absent.
- Catalog privilege checks are sufficient for authenticated RPC availability.
  Do not use an existing user merely to force a save.
- Observe the first ordinary schema-4 Cloud Sync operations after deployment:
  expect HTTP 2xx, one revision increment, and one matching history insert.
  Inspect status/code/aggregate telemetry only; do not capture payloads.
- Confirm expected revision conflicts remain `RB003` and are not retry loops.
- Any `RB007` from an ordinary authenticated save is unexpected and triggers
  the abort procedure.

Because the identical delta and request shape passed the complete Phase 8C
matrix, the default production verification does not require an artificial
write. If passive traffic cannot provide adequate confidence within the change
window, use only the optional canary below.

## 9. Optional schema-4 canary (not created in Phase 8D)

Use a new, dedicated production test account, never an existing user. Create it
only under separate approval and record its UUID outside application logs.
Submit one `save_roster_state` call as that account with:

```json
{
  "expected_revision": 0,
  "new_schema_version": 4,
  "new_payload": {
    "app": "RosterBotPayBot",
    "version": "phase8d-production-canary",
    "schemaVersion": 4,
    "storage": {
      "rosterbot-db-schema-v1": "4",
      "phase8d-canary": "synthetic-no-personal-data"
    }
  },
  "new_client_id": "phase8d-production-canary"
}
```

Expected evidence is revision 1, one schema-4 current row, and one matching
schema-4 history row. Select only revision, schema version, client id, and
timestamps—never payload content.

Cleanup is deletion of that dedicated Auth user through the approved admin
path. Existing `ON DELETE CASCADE` foreign keys remove its one current and one
history row. Verify zero rows remain for the recorded canary UUID, then discard
the credentials. Do not create a calendar row. If cleanup fails, stop and
escalate; do not delete by a broader predicate.

## 10. Calendar regression plan

Phase 8B never references `calendar_feeds`, its RLS policies/grants/trigger, or
the `calendar-feed` Edge Function. It revokes service-role DML only on the two
roster tables. The Edge Function's required service-role SELECT on
`calendar_feeds` therefore remains granted.

Required post-deployment checks:

- repeat Edge Function metadata discovery; expect only active
  `calendar-feed`, version 2, `verify_jwt=false`, bundle SHA-256
  `0fc2fd4f9dafa0ed582b49121636c7a350e90cbeded6b5d7c2d3f6f0ae5f043d`;
- repeat catalog comparison for the calendar table, its four RLS policies,
  `calendar_feeds_updated_at`, indexes/constraints, and grants;
- confirm service-role SELECT remains true;
- call `/functions/v1/calendar-feed` with a fixed valid-format but deliberately
  nonexistent synthetic token and expect the generic 404. This exercises token
  hashing and the service-role SELECT path without retrieving ICS content;
- confirm OPTIONS succeeds and non-GET methods remain rejected;
- use a real valid feed only if its owner performs a consented smoke check and
  neither token nor response body is recorded. It is not required for this
  server-only delta.

## 11. Monitoring, abort, and rollback criteria

Watch Supabase database/PostgREST/Edge Function logs and Cloud Sync error
telemetry continuously during the immediate change window, then review at one
hour and 24 hours. Do not log request payloads or tokens.

Immediately abort further verification and roll back while the schema-4 guard
permits it if any of these are confirmed as caused by the deployment:

- capability is missing, malformed, or differs from min/max 4;
- a normal schema-4 save fails;
- authenticated users receive new permission failures;
- successful saves stop creating exactly one matching history revision;
- Cloud Sync retry loops or material RPC error-rate increases appear;
- `calendar-feed` produces new 5xx/database errors or known healthy feeds fail;
- an ordinary client receives unexpected `RB007`;
- an anonymous roster RPC is executable;
- a rejected write changes current state or revision history;
- any deployment-created change appears outside the reviewed Phase 8B delta;
- any schema-5 current/history row appears.

If a schema-5 row appears, abort but **do not run this rollback**; its guard will
reject the attempt. Preserve the monotonic protections and escalate.

Expected/non-abort events are occasional legitimate `RB003` revision conflicts
and deterministic validation errors caused by malformed/unsupported requests,
provided they do not mutate state and do not create client retry loops.

## 12. Required ordering and capability commitment

The only approved sequence is:

1. production client continues schema 4;
2. deploy only the Phase 8B server-protection delta;
3. verify schema-4 compatibility;
4. leave capability at exactly 4;
5. observe and confirm stability;
6. consider schema 5 only in a later separately approved phase.

Phase 8D completed only planning and preflight. Step 2 has not occurred.
Neither the apply procedure nor any verification step updates
`max_writable_schema` above 4.

## Decision

**READY FOR PRODUCTION DEPLOYMENT**

Basis: exact production identity confirmed; all Phase 8A catalog captures match;
all production roster rows are schema 4; staging-proven migration checksum
matches; the production client emits schema 4; calendar deployment is
unchanged; atomic apply, exact guarded rollback, verification, canary, and
monitoring procedures are prepared. This is readiness only, not authorization
to execute the deployment.

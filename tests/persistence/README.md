# Persistence compatibility and validation harness

Run the Phase 1 safety checks with:

```sh
npm test
npm run check:syntax
npm run report:persistence
```

Phase 10A adds a synthetic long-lived browser corpus, a deterministic torture
suite, and a persistent-profile Chromium journey. Run the local contract and
failure cases with `node --test tests/persistence/phase10a-torture.test.mjs`.
The browser journey deliberately has no package dependency: point
`PHASE10A_V29_DIR` at an extracted copy of the commit immediately before Phase
9 and provide Playwright Core/Chromium through `PHASE10A_PLAYWRIGHT_ROOT` and
`PHASE10A_CHROMIUM` when the documented defaults are unavailable, then run:

```sh
PHASE10A_V29_DIR=/path/to/pre-phase9 node tests/browser/phase10a-real-browser.mjs
```

It serves both clients on one isolated local origin, creates a fresh persistent
profile for every scenario, blocks non-test network traffic, and never writes
schema 5 to production Cloud. The public-host upgrade check loads the hosted
client read-only, injects synthetic state on an intercepted blank same-origin
page, and then fulfills the next navigation from worktree files. Results and
manual Safari gaps are recorded in
[`docs/phase10a-real-device-torture.md`](../../docs/phase10a-real-device-torture.md).

The Phase 3 decision table, Phase 4 recovery UI/evidence/restart durability, and Phase 5 staged backup/Cloud replacement contract are documented in [`docs/persistence-recovery-policy.md`](../../docs/persistence-recovery-policy.md).

The Phase 7A schema-5 envelope, pure 4 → 5 contract, crash journal, snapshot, downgrade boundary, and Cloud prerequisites are documented in [`docs/schema5-migration-design.md`](../../docs/schema5-migration-design.md). `schema5-migration-design.test.mjs` consumes complete deterministic outputs from `tests/fixtures/schema4-to-schema5-golden.json`. The generator and migration contract are test-only and never loaded by the application.

The Phase 7B read-only bootstrap guard is documented in [`docs/rollback-proof-bootstrap-guard.md`](../../docs/rollback-proof-bootstrap-guard.md). `bootstrap-guard.test.mjs` uses `tests/fixtures/schema5-bootstrap-guard.json` plus the Phase 7A golden envelope to prove that future schema/minimum-reader evidence stops feature loading and all persistence side effects while current schema-4 startup remains available.

`import-transaction.test.mjs` covers side-effect-free staging, wrapper/schema/value rejection, preview metadata, empty and partial full-replacement semantics, recovery-artifact recognition, v0.29.x compatibility, first/middle/final write failures, verification failure, exact local/cross-store rollback, rollback failure, and replacement-time side-effect suppression.

`tests/fixtures/persistence-v029.json` contains synthetic input states for current v0.29.x behaviour. Objects and arrays in `localStorage` are serialized by `helpers.mjs`; `{ "$raw": "..." }` represents deliberately malformed raw storage text. IndexedDB rows use the current `RosterBotPersonalDB` / `kv` shape and are serialized the same way before recovery tests.

`canonical-generation.test.mjs` covers the Phase 6 in-memory model, deterministic SHA-256 identity, internal generation/previous-known-good records, ancestry-based mirror repair, divergent generation refusal, explicit clear authority, and restart after simulated interruption at each cross-store phase. The simulation deliberately leaves pending metadata and partial projections in the in-memory stores so reconciliation observes the same evidence a browser restart would see.

`schema5-migration-design.test.mjs` covers exact golden schema-5 envelopes and fingerprints, malformed/unsupported classifications, schema-marker interpretation, semantic invariants, unknown tolerated data, secret/device exclusions, pure repeatability/idempotence, pre-migration evidence, compatibility projection, ancestry, journal completeness, and the design-only production boundary.

`phase8b-server-protection.test.mjs` statically verifies the Phase 8B delta
migration, atomic-lock and table-trigger design, stable server errors, grant
changes, staging-harness safety guard/matrix, and the v0.30 deterministic
no-retry mapping. Live PostgreSQL concurrency and PostgREST behavior are
covered by the isolated-staging harness under `supabase/tests/`; they are never
run by the ordinary repository test command.

The registry is authoritative for backup, Cloud Sync, and IndexedDB inclusion metadata. It also owns classifications, sensitivity labels, compatibility aliases, and side-effect-free validators. Readers receive `missing`, `valid`, `legacy`, `malformed`, or `unsupported` state while retaining the original raw string; validation never writes to storage.

Calendar subscription preferences are included in all three personal-state recovery surfaces. Calendar token keys remain credential-classified and excluded from backup, Cloud Sync, and IndexedDB recovery.

Retained surface differences are deliberate:

- theme/view/experience, backup timestamps, and PayBot editor preferences are device-only; manual backups preserve them for portability and IndexedDB preserves them against localStorage loss, while Cloud Sync excludes them;
- `rosterbot-shared-settings-v1` is derived compatibility state, retained in backup and IndexedDB but excluded from Cloud Sync;
- PayBot v02-v05 keys are legacy aliases retained in manual backups/imports, while Cloud Sync and IndexedDB use the v06 canonical key;
- calendar subscription settings were an accidental IndexedDB omission and are now recovered, but tokens, hashes, and active-feed cache state remain device-local.

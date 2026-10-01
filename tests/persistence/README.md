# Persistence compatibility and validation harness

Run the Phase 1 safety checks with:

```sh
npm test
npm run check:syntax
npm run report:persistence
```

The Phase 3 decision table, Phase 4 recovery UI/evidence/restart durability, and Phase 5 staged backup/Cloud replacement contract are documented in [`docs/persistence-recovery-policy.md`](../../docs/persistence-recovery-policy.md).

`import-transaction.test.mjs` covers side-effect-free staging, wrapper/schema/value rejection, preview metadata, empty and partial full-replacement semantics, recovery-artifact recognition, v0.29.x compatibility, first/middle/final write failures, verification failure, exact local/cross-store rollback, rollback failure, and replacement-time side-effect suppression.

`tests/fixtures/persistence-v029.json` contains synthetic input states for current v0.29.x behaviour. Objects and arrays in `localStorage` are serialized by `helpers.mjs`; `{ "$raw": "..." }` represents deliberately malformed raw storage text. IndexedDB rows use the current `RosterBotPersonalDB` / `kv` shape and are serialized the same way before recovery tests.

`canonical-generation.test.mjs` covers the Phase 6 in-memory model, deterministic SHA-256 identity, internal generation/previous-known-good records, ancestry-based mirror repair, divergent generation refusal, explicit clear authority, and restart after simulated interruption at each cross-store phase. The simulation deliberately leaves pending metadata and partial projections in the in-memory stores so reconciliation observes the same evidence a browser restart would see.

The registry is authoritative for backup, Cloud Sync, and IndexedDB inclusion metadata. It also owns classifications, sensitivity labels, compatibility aliases, and side-effect-free validators. Readers receive `missing`, `valid`, `legacy`, `malformed`, or `unsupported` state while retaining the original raw string; validation never writes to storage.

Calendar subscription preferences are included in all three personal-state recovery surfaces. Calendar token keys remain credential-classified and excluded from backup, Cloud Sync, and IndexedDB recovery.

Retained surface differences are deliberate:

- theme/view/experience, backup timestamps, and PayBot editor preferences are device-only; manual backups preserve them for portability and IndexedDB preserves them against localStorage loss, while Cloud Sync excludes them;
- `rosterbot-shared-settings-v1` is derived compatibility state, retained in backup and IndexedDB but excluded from Cloud Sync;
- PayBot v02-v05 keys are legacy aliases retained in manual backups/imports, while Cloud Sync and IndexedDB use the v06 canonical key;
- calendar subscription settings were an accidental IndexedDB omission and are now recovered, but tokens, hashes, and active-feed cache state remain device-local.

# v0.30 Phase 9 — persisted local schema 5

Status: implemented in this worktree for local and synthetic testing only. This is not a production migration or release candidate. The production server capability remains 4 and this client must not be deployed while Phase 9 is under review.

## Persisted records

Phase 9 uses the Phase 7A names and formats without changing the schema-5 envelope contract:

- `rosterbot-personal-state-v1` — authoritative schema-5 envelope, duplicated in localStorage and the `RosterBotPersonalDB/kv` recovery store;
- `rosterbot-schema5-migration-journal-v1` — dual-store migration journal;
- `rosterbot-schema4-pre-migration-snapshot-v1` — dual-store, credential-free rollback source retained with `indefinite-until-reviewed-cleanup`;
- `rosterbot-storage-guard-v1` — durable minimum reader/writer guard;
- `rosterbot-db-schema-v1` — compatibility marker, advanced to `5` only after both schema-5 and schema-4 views verify.

The schema-5 envelope contains only the 14 canonical personal keys. Device preferences, credentials, encryption material, Cloud sessions, caches, derived values, journal/snapshot records, and unrelated origin data remain outside it. Namespaced envelope extensions and tolerated unknown fields inside validated personal values are preserved.

The immutable Phase 9 browser writer identity is `RosterBotPayBot / 0.30.0 / 20261006-phase9-local-schema5`. Tests may inject deterministic writer metadata to reproduce the Phase 7A golden bytes.

## Boot and migration sequence

The bootstrap loads the pure schema-5 contract and migration runtime before feature modules. It checks newer-than-5 evidence, resumes any journal/schema-5 evidence first, and otherwise completes Phase 6 reconciliation before starting migration.

The migration order is:

1. use the reconciled, validated schema-4 candidate as authority;
2. build, fingerprint, write, re-read, and verify the credential-free pre-migration snapshot in both stores;
3. create the `snapshot-created` journal checkpoint;
4. build the deterministic schema-5 candidate in memory and persist its exact bytes in the journal descriptor;
5. validate its checksum, schema-4 projection, and snapshot relationship;
6. write identical candidate bytes to the schema-5 shadow record in both stores;
7. re-read and verify both schema-5 copies and keep the marker at 4/missing;
8. write the full schema-4 projection to both stores, removing stale compatibility aliases;
9. verify both projection fingerprints equal the pre-migration source fingerprint;
10. write and verify the durable downgrade guard;
11. write and verify marker 5 in both stores;
12. mark both journals complete and only then finish the boot gate.

The snapshot is not deleted after success. A normal reload validates envelope bytes/checksum, both projection fingerprints, marker 5, guard presence, and the complete journal before feature startup.

## Restart and rollback

The journal implements every Phase 7A state: `not-started`, `snapshot-created`, `candidate-built`, `candidate-validated`, `schema5-written`, `schema5-verified`, `compatibility-projection-written`, `complete`, `rollback-required`, and `failed`.

Dual journal copies use monotonic checkpoints. If one copy is ahead, restart repeats the idempotent operation from the lower common evidence. A partial target can only be overwritten with the exact deterministic candidate bytes. Invalid journal identity/fingerprint combinations, orphan schema-5 state, damaged committed state, or a projection divergence enter recovery instead of selecting by timestamp.

Write, quota, and read-back verification failures do not advance marker 5. The journal records `rollback-required`; the retained snapshot restores the selected raw schema-4 personal strings to both stores, verifies the Phase 6 fingerprint, and restores the prior marker. A retry rebuilds the same generation rather than merging or double-migrating.

## Compatibility projection and backups

The initial schema-5 semantics project losslessly to schema 4. The projection fingerprint must equal the source/snapshot fingerprint. It is recovery evidence only and does not grant an older client write permission; the durable guard and marker remain authoritative.

The public `.rosterbot` format remains schema 4. Export explicitly writes schema marker 4 inside that schema-4 wrapper and never labels schema-5 state as schema 4. Import validates and stages the existing schema-4 wrapper, migrates its personal state in memory, writes/verifies a new schema-5 generation, writes/verifies its compatibility projection, and commits marker 5. Existing backup-scoped device preferences remain outside the envelope and retain their prior import behavior. The original pre-migration snapshot remains retained.

## Cloud behavior while server capability is 4

Cloud authoritative transfer is held whenever local schema 5 or its envelope is present. The client may fetch the remote row/payload for read-only status and compatibility inspection, but it cannot apply that payload to local authority or write a Cloud revision:

- `save_roster_state` is rejected client-side before any request;
- Cloud payload application/history restore is rejected before local replacement;
- automatic upload/download exits on the capability hold;
- encryption wrapper rotation is held because it creates a Cloud revision;
- the Cloud wire payload and RPC argument remain schema 4 and no `new_schema_version: 5` path exists.

The hold is reported by `RosterBotCloudSync.summary().schema5CapabilityHold`. Server capability, production rows, production revisions, and Supabase configuration are unchanged.

## Test scope

The automated suite covers the 12 successful and two rejected Phase 7A fixtures, exact deterministic envelopes, semantic preservation, extension preservation, exclusion classes, all requested interruption boundaries, write/quota/read-back failures, rollback equality, restart/idempotence, backup replacement, and the schema-4 rollback guard.

Synthetic Chromium testing additionally covers a real configured schema-4 fixture, interruption after `schema5-written`, boot-time resume before features, schema-5 commit, canonical equality for roster/day/employment semantics, stable reload fingerprint, Cloud capability hold, no page errors, and no non-GET network request.

# v0.30 Phase 7B — rollback-proof client bootstrap guard

Status: implemented as a read-only compatibility guard. Production storage, manual backups, Cloud payloads, and Supabase contracts remain schema 4. This phase does not create schema-5 state, perform a 4 → 5 migration, or write migration evidence.

## Client capability policy

The policy is defined once in `js/01-storage-compatibility.js`:

| Capability | Phase 7B value | Meaning |
|---|---:|---|
| Current supported storage schema | 4 | The production state this client understands. |
| Reader schema | 4 | The highest `minimumReaderSchema` this client satisfies. |
| Writer schema | 4 | The highest `minimumWriterSchema` this client satisfies. |
| Highest safe write schema | 4 | The highest authoritative storage schema this client may modify. |

Reader and writer authority are intentionally separate from projection availability. Understanding a schema-4 projection of schema-5 state does not grant permission to write that projection.

## Bootstrap order and fail-closed behavior

`js/00-error-handler.js` captures an exact, read-only localStorage snapshot before other modules. The compatibility guard then checks that snapshot before IndexedDB is opened. It blocks on:

- a numeric `rosterbot-db-schema-v1` greater than 4;
- a valid `rosterbot-storage-guard-v1` requiring a newer reader or writer, or recording migration beyond schema 4;
- malformed/partial downgrade-guard evidence;
- any reserved `rosterbot-personal-state-v1`, `rosterbot-schema5-migration-journal-v1`, or `rosterbot-schema4-pre-migration-snapshot-v1` record.

If the local check passes, IndexedDB is read without opening a write transaction and the same check is applied to its rows. Only after both checks pass does ordinary schema-4 recovery run. Feature modules are loaded last.

A blocked startup therefore does not load the diary/default writers, IndexedDB mirror, backup UI, Cloud Sync, or calendar publisher. It leaves schema markers, sync baselines, projections, and every personal value untouched. Reload repeats the same side-effect-free decision.

## Durable downgrade guard

Future migration may set the device-local `rosterbot-storage-guard-v1` record with this shape:

```json
{
  "format": "rosterbot-storage-guard",
  "formatVersion": 1,
  "migratedSchema": 5,
  "minimumReaderSchema": 5,
  "minimumWriterSchema": 5,
  "compatibilityProjection": {
    "schemaVersion": 4,
    "status": "lossless",
    "fingerprint": "<verified projection fingerprint>"
  },
  "migrationEvidence": {
    "journal": "complete",
    "snapshot": "verified",
    "recordedAt": "<ISO timestamp>"
  }
}
```

The record is registered as internal detection metadata and is excluded from backup, Cloud, and IndexedDB mirror surfaces. Normal schema-4 startup never creates it. Ordinary defaults, imports, recovery clear plans, and personal-data clear loops do not include internal records, so those paths cannot remove it. A future migration must durably write and verify it as part of its separately reviewed transaction design.

Malformed guard evidence also blocks. An old client must not infer that a partially written or unfamiliar migration marker is safe to erase.

## Compatibility projection is recovery-only

Phase 7A proved that the initial schema-5 personal semantics can be projected losslessly to schema 4. That proves recoverability of those personal values; it does not make the schema-4 keys an independent authority.

Once schema 5 is authoritative:

- the schema-4 projection is recovery/export evidence;
- an older feature implementation may read it only behind this update-required state;
- the older client must not create defaults, mirror, sync, or save changes into it;
- a writable v0.29-style session would fork the projection from the schema-5 envelope and is not a supported downgrade;
- no UI action converts the state back to schema 4 or clears migration evidence.

The Phase 7B UI says that a newer RosterBot version is required, says that data was not changed, provides a redacted recovery-evidence export, and exposes technical details on request. It does not describe the data as corrupt.

## Local and Cloud boundaries

The local guard protects startup only when this guarded bootstrap is the code that runs. Deployment rollback must retain this bootstrap even if older feature assets are restored. It cannot reach backward into an already deployed/cached v0.29 build that never contained the guard. A target that cannot guarantee the guarded bootstrap must be treated as no-downgrade after schema-5 migration.

Cloud downgrade protection is **not solved by Phase 7B**. This client does not load Cloud code during a locally blocked startup, but an actually old deployed client could still contact the current server. Until Supabase atomically rejects `new_schema_version < current schema_version` on every write path, an old client may still be capable of replacing newer Cloud data. Schema-5 Cloud upload therefore remains prohibited.

Server-side protection must still provide schema monotonicity, independent server schema metadata, transactional revision checks, safe history-restore rules, and tests for plain/encrypted downgrade attempts. Phase 7B changes none of the Cloud payload, RPC, table, RLS, or backup contracts.

## Test evidence

`tests/fixtures/schema5-bootstrap-guard.json` is synthetic future-schema evidence containing a lossless schema-4 projection. `bootstrap-guard.test.mjs` verifies current/fresh schema-4 startup, all future markers, reload durability, recovery export, exact no-mutation behavior, no IndexedDB opening for a local block, and the absence of Cloud/calendar/feature module loading. The Phase 7A exact golden envelope is also exercised as future input.

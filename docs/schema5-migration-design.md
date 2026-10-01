# v0.30 Phase 7A — schema-5 migration design

Status: design and deterministic test fixtures only. Nothing in this phase is loaded by `index.html`, registered as a live persistence key, or written to browser storage. The production registry, backup payload, Cloud payload, encryption envelope, and Supabase RPC remain schema 4.

## 1. Canonical schema-5 envelope

Schema 5 is primarily a new envelope around the Phase 6 semantic personal state. It does not reinterpret roster, diary, employment, PayBot, manual-schedule, or calendar data.

The proposed live record name for Phase 7B is `rosterbot-personal-state-v1`. Its exact value is:

```json
{
  "format": "rosterbot-personal-state",
  "formatVersion": 1,
  "storageSchemaVersion": 5,
  "minimumReaderSchema": 5,
  "writer": {
    "app": "RosterBotPayBot",
    "version": "0.30.0",
    "build": "an immutable build identifier"
  },
  "generation": {
    "number": 1,
    "id": "1:<schema5 fingerprint>",
    "kind": "state",
    "fingerprint": "<64 lowercase SHA-256 hex characters>",
    "predecessorFingerprint": null
  },
  "checksum": {
    "algorithm": "SHA-256",
    "canonicalisation": "rosterbot-canonical-json-v1",
    "scope": "rosterbot-schema5-content-v1",
    "value": "<same schema5 fingerprint>"
  },
  "timestamps": {
    "createdAt": "2026-10-01T00:00:00.000Z",
    "updatedAt": "2026-10-01T00:00:00.000Z"
  },
  "personalState": {
    "kind": "state",
    "entries": {
      "<each canonical personal key>": {"presence": "missing"},
      "<a present canonical personal key>": {"presence": "present", "value": {}}
    }
  },
  "extensions": {},
  "migration": {
    "fromSchema": 4,
    "migratedAt": "2026-10-01T00:00:00.000Z",
    "source": "localStorage",
    "sourceFingerprint": "<Phase 6 schema-4 fingerprint>",
    "sourceGeneration": null,
    "warnings": []
  },
  "previousGeneration": null,
  "compatibility": {
    "schemaVersion": 4,
    "status": "lossless",
    "projectionFingerprint": "<Phase 6 schema-4 fingerprint>"
  }
}
```

`generation.kind` and `personalState.kind` are both `state` or `clear`. A verified explicit clear is therefore distinguishable from a fresh state even though both have missing entries. If a verified Phase 6 generation exists, schema 5 uses its number plus one, records its fingerprint as `predecessorFingerprint`, and places its schema/number/fingerprint in `previousGeneration`. Otherwise generation starts at 1 and the optional reference is `null`.

The schema-5 fingerprint is SHA-256 over Phase 6 canonical JSON serialization of exactly:

```text
{format, formatVersion, storageSchemaVersion, personalState, extensions}
```

It is a deterministic semantic identity and integrity check, not authentication. Writer, timestamps, provenance, and compatibility diagnostics do not alter personal-state identity. The journal nevertheless stores and verifies the exact candidate bytes, so metadata cannot silently change during a migration transaction.

Every canonical personal key is present in `entries`; absence is represented explicitly. The 14 Phase 7A keys are:

- `paybot-v06-state`
- `rosterbot-calendar-subscription-settings-v1`
- `rosterbot-day-overrides-v1`
- `rosterbot-diary-annual-leave-v1`
- `rosterbot-employment-profile-v1`
- `rosterbot-fortnight-allowances-v1`
- `rosterbot-fortnight-notes-v1`
- `rosterbot-manual-schedule-v1`
- `rosterbot-pay-checks-v1`
- `rosterbot-session-settings-v1`
- `rosterbot-timeline-v1`
- `rosterbot-week-leave-v1`
- `rosterbot-week-locks-v1`
- `rosterbot-week-overrides-v1`

Unknown fields nested within a value accepted by its schema-4 validator remain in that value and affect the fingerprint. `extensions` is reserved for explicitly supported, namespaced, JSON-compatible envelope extensions; migration does not copy arbitrary unregistered browser keys into it. A future extension that cannot be represented in schema 4 must change `compatibility.status` away from `lossless` and raise the minimum reader as needed.

### Data classification

| Class | Schema-5 envelope | Where it remains |
|---|---|---|
| Canonical personal state | Included | Envelope; schema-4 compatibility projection while lossless |
| Theme, colour/view/experience mode, first-use/backup timestamps, PayBot UI preferences, Cloud auto preference | Excluded | Existing device-local keys |
| Cloud sessions, calendar publication tokens, device encryption key, crypto profile | Forbidden | Existing credential/device stores only |
| Shared settings, `paybot-lastcalc`, subscription hashes/active flags and other caches | Excluded | Rebuilt or retained device-locally according to their current policy |
| Generation records, migration journal, pre-migration snapshot, Cloud restore safety/evidence | Excluded from personal state | Separate internal/recovery records |

No secret or credential becomes personal data merely because schema 5 is canonical.

## 2. Schema-4 input interpretation

Detection is evidence based; `rosterbot-db-schema-v1` is not authoritative by itself.

1. Before looking at the legacy marker, inspect the reserved schema-5 envelope and journal records. A valid envelope wins. A journal resumes. A damaged/newer envelope goes to recovery UI; it is never treated as schema 4.
2. Run Phase 6 whole-state localStorage/IndexedDB reconciliation first. Migration receives only the reconciled Phase 6 canonical candidate. A valid divergence without ancestry, ambiguous clear, malformed recoverable copy awaiting a choice, or unsupported copy must be resolved before migration.
3. A numeric marker greater than 4 is newer data and is recovery/read-only, even if familiar schema-4 keys also exist.
4. Marker `4`, a missing marker, lower/hard-coded markers, and nonnumeric misleading markers can all be schema-4 candidates if the actual registered personal values validate. Missing and misleading markers produce explicit warnings. A hard-coded `4` cannot override malformed or unsupported values.
5. Inventory app-owned top-level names. An unregistered `rosterbot-*` or `paybot-*` key is newer/unknown application data and blocks automatic migration unless a reviewed classification explicitly identifies it as device/cache data. Unrelated origin keys remain untouched and are not copied for privacy reasons.

Actual Phase 1 behavior is interpreted as follows:

| Input | Interpretation |
|---|---|
| Fresh user | Valid schema-4 candidate with all personal entries missing; missing-marker warning |
| Normal v0.29.x configured state | Valid candidate; marker 4 is corroborating evidence only |
| Missing/hard-coded/misleading marker | Validate actual data; migrate with warning if valid, recover if not |
| PayBot v02–v05 aliases | Registry precedence selects the first available alias only when canonical v06 is absent; migrate its full accepted value to canonical v06 and warn |
| Theme v1.8/v1.7/unversioned aliases | Device-only; leave untouched and do not include in envelope |
| Manual schedule and timeline manual snapshot | Preserve current reusable pattern and independently preserve the embedded historical pattern |
| Effective-dated roster history | Preserve array order, future rows, IDs, modes, tracks and unknown tolerated fields |
| Permanent swap | Preserve both tracks and parity inputs exactly |
| Employment history | Preserve every entry and effective date; no resorting or default insertion |
| Partial configuration/missing optional keys | Preserve present values; represent missing personal keys as missing; retain legacy validation warning when applicable |
| Malformed registered value | Reject that source; use Phase 6 recovery only if another source is valid; otherwise recovery UI |
| Unsupported value/shape | Reject and preserve evidence; never coerce or default |
| IndexedDB-only recoverable data | Phase 6 first selects/restores the valid mirror; migration source is recorded as `indexedDb-recovery` |
| Equal local/IndexedDB data | Migrate the canonical semantic state once |
| Valid divergent local/IndexedDB data | User choice required before migration; timestamps do not choose authority |
| Verified explicit-clear tombstone | Migrate an all-missing `kind: clear` generation; do not resurrect older IndexedDB data |

Optional keys may be missing. Missing and an explicitly present empty array/object remain different. Registry validator state `legacy` is accepted and warned; `malformed` and `unsupported` are not.

## 3. Pure 4 → 5 migration contract

The executable design contract is in `tests/persistence/schema5-design.mjs`. Its conceptual signature is:

```text
migrateSchema4To5(canonicalSchema4Candidate, deterministicMetadata)
  -> { ok, envelope, fingerprint, sourceFingerprint,
       compatibilityProjection, warnings }
  |  { ok: false, classification, errors, warnings }
```

It has no browser-storage access. The caller must provide an ISO migration timestamp and immutable writer version/build. The function validates the Phase 6 candidate, fingerprints it, copies semantic values, validates the schema-5 candidate, computes its fingerprint, verifies its schema-4 projection, and returns values only. It does not mutate input. Running it again with the same input and metadata returns the same output. Supplying a valid schema-5 envelope returns the same validated envelope (`alreadyMigrated: true`).

Actual transformations are deliberately small:

1. Phase 6 `presence: missing` becomes schema-5 `presence: missing`.
2. A recoverable present entry becomes `presence: present, value: <deep canonical JSON copy>`. Raw JSON whitespace/property order and Phase 6 source metadata are not personal semantics; the pre-migration snapshot retains the exact raw source.
3. A PayBot alias becomes canonical key `paybot-v06-state`; its accepted value is otherwise unchanged. Compatibility projection writes v06, not the obsolete alias.
4. Registry `legacy` values remain semantically unchanged and produce `LEGACY_SHAPE_PRESERVED`; no missing defaults are synthesized.
5. Tolerated unknown fields inside accepted values survive unchanged.
6. A verified clear sets both kinds to `clear`; ordinary candidates use `state`.
7. Device-only preferences, credentials, caches, recovery records, the schema marker, and arbitrary top-level keys do not move.
8. Deterministic envelope/generation/provenance/compatibility metadata is added.

There are no roster, manual schedule, employment, diary, PayBot, or calendar semantic rewrites in 4 → 5.

Errors carry stable codes such as `SOURCE_MALFORMED`, `SOURCE_UNSUPPORTED`, `SOURCE_GENERATION_INVALID`, `TARGET_FINGERPRINT_FAILED`, or `CHECKSUM_MISMATCH`. No rejected value receives a schema-5 fingerprint.

## 4. Crash-resumable migration journal

The proposed Phase 7B journal key is `rosterbot-schema5-migration-journal-v1`. It is internal/recovery data and must be independently stored and verified in localStorage and the IndexedDB recovery database. It contains format/version, a migration ID derived from the source fingerprint, current state, monotonic checkpoint number, source/snapshot/target/projection fingerprints, writer/timestamps, exact deterministic candidate descriptor, per-store verification flags, last error, and no credentials.

Each transition is written to both journal copies and read back. Restart uses the greatest checkpoint verified in both copies. If one copy is ahead, it safely repeats the idempotent action from the common checkpoint. Different migration IDs or fingerprints require recovery UI. A crash inside a multi-store action leaves the prior checkpoint; restart may overwrite a partial target only with the same verified bytes.

| State | Definitely happened | Not yet guaranteed | Restart and UI |
|---|---|---|---|
| `not-started` | No migration write | Snapshot and all schema-5 work | Re-evaluate; automatic |
| `snapshot-created` | Credential-free schema-4 snapshot exists in both stores and verifies | Candidate/live writes | Verify snapshot and rebuild; automatic |
| `candidate-built` | Deterministic metadata and target fingerprint are durable; candidate can be reproduced | Target validation/live writes | Rebuild and exact-compare; automatic |
| `candidate-validated` | Candidate, checksum, projection, and snapshot all validate | Live schema-5/projection writes | Revalidate and write; automatic |
| `schema5-written` | Exact schema-5 bytes were placed in both target records | Read-back verification, projection, marker | Read back; verify or enter rollback; automatic |
| `schema5-verified` | Both schema-5 records re-read and checksum/fingerprint match; marker remains 4/missing | Compatibility write/verification and marker | Write full compatibility projection; automatic |
| `compatibility-projection-written` | Both schema-4 projections were placed; schema 5 is already verified | Projection read-back verification, marker advance, completion | Verify projection, then write marker 5 last; automatic |
| `complete` | Envelope, projection, marker 5, and both journals verify | Nothing | Normal schema-5 startup; automatic |
| `rollback-required` | A post-write check failed and snapshot remains verified | Restored schema-4 state | Restore both legacy stores transactionally, remove/retain failed target as recovery evidence, verify; automatic while evidence agrees |
| `failed` | Automatic resume/rollback cannot establish one verified authority | Safe authority | Preserve everything and open recovery UI; no automatic write |

The marker may advance to `5` only after schema 5 and the complete compatibility projection have both been read back and fingerprinted successfully. It is the final data write before the `complete` checkpoint. A partial marker write after all content verifies is resumable; the marker never grants authority to unverified content.

## 5. Pre-migration schema-4 snapshot

The proposed key is `rosterbot-schema4-pre-migration-snapshot-v1`, separately stored and verified in both recovery stores before any schema-5 write. Its exact logical contents are:

- format and creation timestamp;
- source schema 4 and `state`/`clear` kind;
- Phase 6 canonical fingerprint;
- optional verified Phase 6 generation metadata;
- clear tombstone timestamp only for a verified clear;
- a canonical schema-4 projection of every present personal entry;
- exact raw registered personal strings, including selected/extra PayBot compatibility aliases, for evidence and byte-level recovery;
- an explicit exclusion/retention policy.

It excludes theme/device preferences, credentials, calendar publication tokens, Cloud sessions/configuration/crypto material, caches/derived data, and unrelated origin keys. Those device-local values are not touched by migration, so rollback does not need to restore them.

Rollback first validates the snapshot fingerprint, transactionally restores its schema-4 projection to localStorage and IndexedDB, restores the clear tombstone if applicable, verifies both Phase 6 fingerprints, and only then restores/removes the legacy marker as recorded by the journal. The snapshot is also exportable inside the existing redacted recovery-evidence format as a clearly labelled diagnostic artifact, not as an automatically importable backup.

The snapshot survives successful migration. Phase 7B must use `indefinite-until-reviewed-cleanup`; automatic deletion is forbidden. A later phase may allow explicit deletion only after the rollback support window has closed, no journal/recovery issue exists, at least two verified schema-5 generations exist, a separately verified user backup/recovery copy exists, and the compatibility projection is still lossless. It must never delete the only remaining recovery evidence.

## 6. Application rollback and downgrade

Initial 4 → 5 personal semantics are losslessly representable in schema 4. `compatibility.status: lossless` means every present schema-5 entry passes its schema-4 validator, every missing entry maps to removal, and the projected Phase 6 fingerprint equals `compatibility.projectionFingerprint`.

While status remains lossless, every schema-5 transaction must follow this order:

```text
build/validate schema 5
→ write and verify schema 5
→ write and verify full schema-4 projection
→ commit generation/marker
```

The individual schema-4 keys are therefore a verified projection, not an independent authority. A future schema-5 feature that cannot project exactly must mark compatibility `lossy`/`unavailable`, stop updating the projection, and make downgrade recovery/export-only.

An arbitrary v0.29.x application rollback is **not a supported writable downgrade**. Schema-5 envelope metadata, provenance, generation ancestry, explicit extension semantics, and clear identity cannot all be represented in schema 4. More importantly, already-cached historical JavaScript cannot be assumed to honour a future marker.

Required containment is:

- marker 5 and a schema-aware bootstrap guard must stop a schema-4 application before feature modules write; deployment rollback must retain that guard even when older feature assets are served;
- old code never knows the envelope key, so it cannot intentionally update the authoritative envelope; any change it makes to projection keys becomes detectable divergence, not a silent schema-5 commit;
- schema-5 startup compares the projection fingerprint with the envelope and requires recovery choice when an unguarded old client changed the projection;
- older apps may only receive read-only/recovery/export access to the verified compatibility projection;
- Cloud must reject schema downgrade server-side, so an older client cannot replace a schema-5 row even with a current revision number.

Git/application rollback alone is unsafe. Until the durable bootstrap/deployment guard and server downgrade rejection are proven, persisted schema 5 must not ship. If the guard cannot be guaranteed for a deployment target, that target must be treated as no-downgrade after its first schema-5 migration.

## 7. Golden fixtures and invariants

`tests/fixtures/schema4-to-schema5-golden.json` stores the complete expected envelope and exact source/target fingerprints for:

- fresh, configured, multiple-roster-history, permanent-swap, manual-schedule/historical-snapshot, employment progression, partial, legacy PayBot alias, legacy theme alias, IndexedDB-recovery, explicit-clear, and tolerated-unknown-field successes;
- malformed and unsupported rejections with exact classification/error codes.

The generator is deterministic and test-only. Neither it nor the design module is referenced by production HTML.

`schema5-migration-design.test.mjs` verifies:

- exact golden output and deterministic SHA-256 identity;
- input immutability, repeatability, and already-schema-5 idempotence;
- roster history, swap tracks/parity inputs, manual historical/current patterns, employment effective dates, PayBot values, diary overrides, and calendar settings are unchanged;
- tolerated nested fields and explicit supported extensions round-trip;
- credentials/device/cache/recovery values never appear;
- source projection remains fingerprint-verifiable and the pre-migration raw evidence remains recoverable;
- explicit clear does not equal fresh state or resurrect IndexedDB history;
- malformed/unsupported sources receive no schema-5 candidate;
- every journal state has restart behavior and marker 5 follows verification;
- production persistence, backup, and Cloud contracts remain schema 4.

## 8. Cloud and Supabase prerequisites — design only

No Phase 7A code changes Cloud. A schema-5 client encountering an existing schema-4 plaintext or encrypted Cloud payload may inspect/decrypt and stage it with the current schema-4 validators, but it must not silently replace a different local schema-5 generation. It must migrate the selected Cloud candidate in memory and use the local migration/replacement journal. During the local-only Phase 7B period, Cloud upload/download that could change authoritative schema-5 state must be placed on review hold; schema-4 Cloud remains recovery evidence until the dedicated Cloud migration is deployed.

Future encrypted Cloud data may reuse the cryptographic algorithm, but outer `schemaVersion`, inner storage schema, and AES-GCM AAD schema must all be 5 and agree. Decrypt first, validate the schema-5 envelope/checksum, then compare generations. Encryption does not substitute for schema validation.

Before any schema-5 Cloud upload, all of these protections must be deployed and integration-tested:

1. `save_roster_state` must atomically reject `new_schema_version < current schema_version`, regardless of `expected_revision` or client confirmation.
2. Every write path—not only the normal RPC—must enforce schema monotonicity and RLS ownership. Direct table writes by authenticated clients must remain impossible.
3. RPC must validate supported schema numbers and the outer payload shape. For plaintext it must require payload schema 5 and envelope schema 5. For encrypted data it must require encrypted outer schema 5; the client validates the decrypted inner schema.
4. Optimistic revision comparison and revision insertion/current-row update must remain one transaction.
5. Revision history must store `schema_version` per revision and retain schema-4 history through the rollback/recovery window. History restore must never make a schema-4 revision current over schema 5 without an explicit server-authorized recovery operation that creates a new schema-5 revision.
6. Reads must return server `schema_version` independently of payload. Clients must reject a mismatch before decrypt/apply.
7. Older clients must treat schema 5 as incompatible/read-only. Server downgrade rejection is the final protection when they do not.
8. Capability negotiation/minimum-writer policy must allow the service to disable schema-5 uploads until all prerequisites are active.
9. Plain and encrypted schema-4 → schema-5, revision races, wrapper rotation, history restore, malicious mismatched payloads, and old-client downgrade attempts need end-to-end tests.

The existing Cloud payload shape, `rosterbot-encrypted-v1`, `new_schema_version: 4`, database contracts, and revision behavior remain untouched in Phase 7A.

## 9. Phase 7B change map

Expected implementation touch points are:

- new production migration/envelope validator and journal module (derived from the test-only contract);
- `js/01-persistence-registry.js`: register schema-5 envelope/journal/snapshot as internal/recovery records without removing schema-4 entries;
- `js/02-canonical-state.js`: schema-5 identity, envelope projection, generation ancestry, and schema-4 compatibility verification;
- `js/02-persistence-safety.js`: dual-store journal orchestration, snapshot/rollback, exact read-back, and divergence handling;
- `js/03-persistence-bootstrap.js` and `js/03-recovery-ui.js`: detect schema 5/journal before legacy startup, resume, and expose downgrade/recovery states;
- `js/60-diary.js`: mirror the envelope/internal checkpoints while retaining compatibility projection behavior;
- roster/session, effective-date, diary, employment, PayBot, manual-schedule, and calendar writers: route personal changes through one canonical transaction so envelope and projection cannot drift;
- `js/50-data-backup.js`: deliberately export a verified schema-4 compatibility payload until a separate schema-5 backup format is approved; never leak marker 5 into a schema-4 payload;
- `js/51-cloud-sync.js`: Phase 7B review hold only; later work adds schema-5 payload/generation handling after server prerequisites;
- `index.html`: load the migration/bootstrap guard before feature modules;
- persistence tests/fixtures/report and recovery documentation.

Schema-4 readers, aliases, projection, and import compatibility remain until a separately reviewed removal phase.

## 10. Decisions that block implementation

Persisted schema 5 must not begin until these are resolved and tested:

1. **Rollback boot guard:** choose and prove a deployment mechanism that cannot be lost when application assets roll back. Arbitrary old cached v0.29 code cannot be made safe by the new envelope alone.
2. **Physical transaction layout:** confirm the envelope/journal/snapshot keys, IndexedDB locations, quota behavior, and redundant-journal recovery algorithm under real browser interruption/quota tests.
3. **Cloud hold versus server rollout:** decide whether Phase 7B ships with Cloud fully held or waits for monotonic server downgrade protection. No schema-5 Cloud write is allowed meanwhile.
4. **Build identity:** provide the immutable production version/build value passed to the pure migration; it must not be inferred from mutable UI text.

These are implementation gates, not permission to change Cloud or storage in Phase 7A.

# v0.30 recovery and replacement policy (Phases 3–7B)

Before the recovery decision below, Phase 7B performs the side-effect-free storage compatibility preflight documented in [`rollback-proof-bootstrap-guard.md`](rollback-proof-bootstrap-guard.md). Newer schema/minimum-reader evidence enters an update-required state before feature modules, defaults, mirroring, Cloud Sync, or calendar publishing can initialize. A schema-4 compatibility projection remains recovery-only and never becomes writable authority.

Recovery is decided per registered IndexedDB key before normal feature modules load. The decision function is read-only: it receives the exact localStorage startup strings and the exact IndexedDB row values, validates both through the persistence registry, and returns a structured result. It does not read from or write to either store itself.

## Decision table

| localStorage | IndexedDB | Decision | Startup | Automatic action |
|---|---|---|---|---|
| missing | missing | `empty` | continue | none |
| valid/legacy | missing | `use-local` | continue | none; normal mirroring may later populate IndexedDB |
| missing | valid/legacy | `restore-indexeddb` | continue after verification | safely replace the missing local value from IndexedDB |
| valid/legacy | semantically equal valid/legacy | `identical` | continue | none |
| valid/legacy | different valid/legacy | `conflict` | gated | none; user choice required |
| malformed | valid/legacy | `malformed-local-recoverable` | gated | none; user choice required so the malformed local string is not destroyed |
| valid/legacy | malformed | `malformed-indexeddb-recoverable` | continue with local | no mirror writes; user choice is required before repairing IndexedDB |
| malformed/missing | malformed/missing, with no valid copy | `unrecoverable` | gated | none; user choice/export support required |
| unsupported/newer | any state | `unsupported` | gated | none; an older app must not replace a potentially newer shape |
| any state | unsupported/newer | `unsupported` | gated | none; an older app must not replace a potentially newer shape |
| no recoverable local copy plus a valid clear tombstone newer than every recoverable IndexedDB row | any older recoverable row | `cleared` | continue in cleared state | no recovery and no mirroring |
| clear tombstone not demonstrably newer than all recoverable state | recoverable state | `conflict` | gated | none; user choice required |

`valid` above includes registry state `legacy`: legacy values remain readable without changing their persisted format. Semantic equality compares validated parsed values with stable object-key ordering, so harmless JSON formatting or property ordering differences are `identical`.

## Recovery-state API

`window.RosterBotRecovery.getState()` exposes the aggregate decision and per-key decisions. The state includes:

- `issueType`, `affectedKeys`, `automaticRecoveryAllowed`, `userChoiceRequired`, `startupAllowed`, and `mirrorAllowed`;
- `localValidationState` and `indexedDbValidationState`, plus per-key `validationStates`;
- `preservedRawCopies`, containing the exact localStorage string and the exact IndexedDB value supplied to the decision;
- per-key `decisions` and the validated local/IndexedDB results.

`window.RosterBotRecovery.isBlocked()` reports whether startup is gated. `canMirror()` reports whether IndexedDB mirroring is safe. Any state that requires a user choice leaves the existing `rb-booting` gate in place, displays the recovery screen, and does not load normal feature modules. This includes `malformed-indexeddb-recoverable`: the valid current copy remains untouched, but the user approves the mirror repair before startup continues.

Raw malformed or unsupported values are never converted to defaults by recovery. When valid local data coexists with malformed IndexedDB data, the app may start from the valid local copy but mirroring remains disabled, preserving the IndexedDB value for a later recovery/export UI.

## Safe replacement

`RosterBotPersistenceSafety.replacePersistentState()` accepts raw replacement strings, explicit removals, and registered keys. It:

1. captures every current raw localStorage value;
2. validates every proposed raw replacement;
3. re-reads the captured snapshot before the first write to verify that it stayed stable;
4. writes all replacements and performs the explicit removals;
5. re-reads every affected key and verifies exact raw equality/absence and registry validity;
6. restores every captured raw value (including restoring absence) if a write or verification fails, then reports whether rollback itself verified.

Phase 3 uses this helper for unambiguous `restore-indexeddb` startup recovery. Phase 4 adds `replacePersistenceCopies()`, which applies one validated plan across localStorage and the existing IndexedDB mirror, verifies both targets, and restores the exact captured local values and IndexedDB rows if any write or verification fails. Mirroring is not resumed until a fresh recovery decision confirms there is no remaining user choice.

## Phase 5 staged import and Cloud restore

`stageReplacementPayload()` is side-effect free. Before either replacement path can write, it requires an object wrapper with `app`, `schemaVersion`, and object-valued `storage`; requires the `RosterBotPayBot` app identifier and schema 4; and validates every recognised raw persisted value through the central registry. Arrays are not accepted as `storage`. Unsupported or malformed recognised values make the candidate ineligible for import. Unknown wrapper fields and storage keys remain attached to the in-memory candidate for review, but their values are neither displayed nor applied.

The preview reports only non-secret structure: roster/employment counts, whether diary changes, a manual schedule, PayBot state, or calendar settings are present, app/schema version, validation problems, and unknown key names. A selected `rosterbot-recovery-evidence-v1` artifact is identified as diagnostic/recovery evidence and is not treated as a normal backup or restored automatically.

The `.rosterbot` compatibility contract remains **full replacement** for the registry's backup surface. A partial backup is labelled as partial and the confirmation explains that omitted recognised backup keys will be removed. An incoming backup with no substantive personal data requires a second exceptional confirmation before it can clear existing backup-scoped data. Missing keys are not treated as deletions until this format-specific full-replacement action is confirmed.

After confirmation, manual import builds one localStorage/IndexedDB plan and uses `replacePersistenceCopies()`. Cloud restore follows the same sequence after fetch/decrypt: stage and validate, preserve device-only volatile session fields, calculate the expected fingerprint, capture a verified safety snapshot, transactionally replace both stores, and only then update Cloud sync metadata. Write or verification failure invokes exact cross-store rollback. Failed replacements retain redacted `rosterbot-recovery-evidence-v1` evidence; an unverified rollback enters the Phase 4 recovery screen and keeps startup/mirroring blocked.

Automatic Cloud Sync, IndexedDB mirroring, and calendar publication are suppressed while replacement is active. A successful manual import then places Cloud auto-sync on review hold. A failed Cloud restore does not update the Cloud baseline/revision metadata and never writes to Supabase.

`rosterbot-cloud-restore-safety-v1` remains as the user-visible one-step Cloud undo mechanism for compatibility. It now wraps the pre-restore schema-4 payload with transaction scope/mechanism metadata and is verified before local replacement begins. This is additional coverage: the transactional helper owns immediate exact rollback, while the safety wrapper continues to support a later deliberate undo. Undo itself now uses the same staged transactional replacement path.

## Phase 4 recovery screen

The recovery screen describes the two sources as **This device** and **Recovered saved copy**. Storage implementation names only appear in internal code and optional diagnostics. Each source card reports validation status, current roster/depot/line, roster-history count and range, employment-history count, diary-change count, missing information, and a trustworthy mirror timestamp where available. Raw values are not rendered in the page.

Actions are deliberately state-specific:

- different valid copies: use this device, use the recovered copy, export, or leave unchanged;
- malformed current copy: recover from the valid saved copy, export, or leave unchanged;
- malformed mirror: keep the valid current copy and repair the mirror, export, or leave unchanged;
- unsupported/newer data: export and guidance only; conversion and clearing are disabled;
- unrecoverable data: export, or clear personal/derived browser data after both a checkbox and browser confirmation;
- ambiguous/stale clear record: keep an available retained copy or deliberately retain the cleared state. A recent clear record that is demonstrably newer remains automatic.

Every action that replaces or clears data first downloads the recovery evidence artifact. Successful choices are re-read and passed through the Phase 3 decision function before the boot gate is released. A failed action stays on the recovery screen and reports whether exact rollback verified.

## Recovery evidence export

Recovery evidence uses `rosterbot-recovery-evidence-v1` JSON and a `.json` filename. It is intentionally separate from the unchanged `.rosterbot` backup contract. The artifact records its export time, app/build label, personal-data schema number, decision type/reason, validation states, source summaries, and the exact relevant preserved raw values. Registry entries classified as credentials or as secret/cryptographic are replaced by redaction records; unregistered values are not exported.

## Phase 6 canonical in-memory state

`RosterBotCanonicalPersistence` constructs a whole-state candidate from either localStorage values or IndexedDB rows using registry entries classified as personal and mirrored. Compatibility aliases are read as the canonical registry key. Each entry records `presence: "missing"` or `presence: "present"`, so an absent key differs from a present empty object or array. Present entries contain the registry-validated semantic value, its exact raw string, validation state, and source key. The candidate also retains the source and all relevant raw compatibility values for recovery evidence.

The identity includes every registered live personal datum while collapsing compatibility aliases onto their canonical registry entry. It excludes device preferences, caches, derived values, credentials, encryption material, Cloud session state, Cloud transaction recovery artifacts, and the new generation records. Unknown fields inside supported personal JSON values remain part of the value and therefore survive projection and affect identity. Unregistered top-level browser keys are not admitted because their privacy and semantics are unknown. A validated candidate projects back to the existing individual schema-4 keys; Phase 6 does not persist a canonical envelope.

## Fingerprint semantics

Canonical serialisation sorts every object key recursively while preserving array order, primitive types, missing-entry markers, and the schema number. Equivalent JSON formatting and property order therefore produce the same SHA-256 fingerprint. A meaningful registered personal-data change produces a different fingerprint; device/cache/credential changes do not.

The serialiser explicitly rejects `undefined`, functions, symbols, big integers, non-finite numbers, cyclic values, and non-plain objects. A candidate containing malformed or unsupported registered raw data is ineligible for hashing. Raw damage is retained in the candidate instead of being parsed into a default or accidentally receiving a valid checksum. SHA-256 is an identity/integrity check through browser Web Crypto, not an authentication mechanism.

## Local generations and previous known-good

Phase 6 adds two registered internal keys that are absent from the backup, Cloud, and legacy IndexedDB surfaces:

- `rosterbot-local-generation-v1` is stored independently in localStorage and as an internal IndexedDB row. It records a positive generation number, canonical SHA-256 fingerprint, predecessor fingerprint, timestamp, writer/build, `pending` or `verified` status, and `state` or `clear` kind.
- `rosterbot-previous-generation-v1` retains one verified predecessor and its schema-4 personal projection in localStorage. It contains no credentials, device secrets, caches, Cloud metadata, or generation metadata.

A canonical replacement first retains the current verified/equal state as previous known-good, writes `pending` generation metadata to both stores, writes localStorage and IndexedDB projections in separate verified phases, verifies both whole-state fingerprints, and only then records `verified` metadata in both stores. Any ordinary caught error still invokes exact cross-store rollback. If the page/process stops between phases, the persisted `pending` status and previous snapshot make the interruption recoverable on restart. This extends the Phase 4/5 transaction machinery; it is not a separate backup system.

Timestamps remain diagnostic only. Authority comes from verified fingerprint equality and predecessor ancestry. A verified clear generation can outrank its retained predecessor even when row timestamps are absent or misleading. Older installations without generation metadata continue through the Phase 3 decision table.

## Generation-aware reconciliation

Startup constructs and hashes both whole-state candidates before feature modules load:

| Evidence | Decision |
|---|---|
| Same valid fingerprint | Identical, regardless of raw JSON property order |
| One verified generation whose predecessor fingerprint is the other store | Automatically repair the known older mirror |
| Both valid but different, with no proved ancestry | Gate startup for user choice; never choose by timestamp |
| Pending/damaged newer generation plus a valid previous snapshot | Restore the last completely verified generation in both stores |
| Malformed copy without generation proof | Preserve exact raw data and retain the existing Phase 3 recovery policy |
| Verified clear generation descending from retained state | Clear wins; stale retained state is not resurrected |

Generation metadata that does not match its store's actual canonical fingerprint is not trusted. Likewise, a projected state that matches a `pending` generation is not promoted merely because all keys appear present: recovery prefers the prior `verified` generation. Automatic repair plans are applied transactionally and re-reconciled before normal modules start. A valid divergence without ancestry remains on the recovery screen.

## Restart behaviour

An unresolved legacy problem is still reconstructed from untouched schema-4 raw values, IndexedDB rows, and the clear tombstone. A Phase 6 interrupted replacement is reconstructed from those same values plus internal generation metadata and the one previous-known-good projection. Feature modules remain behind the boot gate while a choice is pending. After automatic or user-selected repair, both stores are re-read, re-fingerprinted, and reconciled before startup proceeds.

## Phase 7A design boundary

The schema-5 envelope, ordered schema-4-to-schema-5 transformation, journal, retained snapshot, downgrade boundary, golden fixtures, and Cloud prerequisites are now specified in [`schema5-migration-design.md`](schema5-migration-design.md). Phase 7A remains design/test-only: no schema-5 record or journal is registered or written by the application, and backup, Cloud, encryption, Supabase, and schema-4 compatibility contracts remain unchanged.

Persisted migration, Cloud payload v2, Cloud generation metadata, Supabase schema/RPC changes, server downgrade protection, and any removal of schema-4 compatibility keys remain deferred to separately reviewed implementation phases.

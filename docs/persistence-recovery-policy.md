# v0.30 recovery policy (Phases 3–4)

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

`RosterBotPersistenceSafety.replacePersistentState()` accepts raw replacement strings and registered keys. It:

1. captures every current raw localStorage value;
2. validates every proposed raw replacement;
3. writes all replacements;
4. re-reads each value and verifies exact raw equality and registry validity;
5. restores every captured raw value (including restoring absence) if a write or verification fails, then reports whether rollback itself verified.

Phase 3 uses this helper for unambiguous `restore-indexeddb` startup recovery. Phase 4 adds `replacePersistenceCopies()`, which applies one validated plan across localStorage and the existing IndexedDB mirror, verifies both targets, and restores the exact captured local values and IndexedDB rows if any write or verification fails. Mirroring is not resumed until a fresh recovery decision confirms there is no remaining user choice.

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

## Restart behaviour

No separate canonical recovery record is introduced. An unresolved problem is deterministically reconstructed from the untouched localStorage values, IndexedDB rows, and clear tombstone after every reload. Because feature modules never load while a choice is pending, default creation, mirroring, Cloud Sync, and calendar publication cannot mutate the evidence. After verified recovery, the ordinary decision is `identical`, `use-local`, `empty`, or authoritative `cleared`, so normal startup resumes on the next load as well.

## Deferred to Phase 5

Phase 5 can adopt transactional replacement for manual backup import and Cloud restore, improve recovery artifact re-import/support tooling, and address broader versioned migration work when explicitly scoped. Schema 5, ordered migrations, canonical envelopes/generations/checksums, migration journals, Cloud payload v2, Supabase contract changes, and IndexedDB canonicalisation remain out of scope here.

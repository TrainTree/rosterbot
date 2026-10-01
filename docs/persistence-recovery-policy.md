# v0.30 Phase 3 recovery policy

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

`window.RosterBotRecovery.isBlocked()` reports whether startup is gated. `canMirror()` reports whether IndexedDB mirroring is safe. A blocked decision leaves the existing `rb-booting` gate in place, displays a minimal recovery notice, and does not load normal feature modules.

Raw malformed or unsupported values are never converted to defaults by recovery. When valid local data coexists with malformed IndexedDB data, the app may start from the valid local copy but mirroring remains disabled, preserving the IndexedDB value for a later recovery/export UI.

## Safe replacement

`RosterBotPersistenceSafety.replacePersistentState()` accepts raw replacement strings and registered keys. It:

1. captures every current raw localStorage value;
2. validates every proposed raw replacement;
3. writes all replacements;
4. re-reads each value and verifies exact raw equality and registry validity;
5. restores every captured raw value (including restoring absence) if a write or verification fails, then reports whether rollback itself verified.

Phase 3 uses this helper only for unambiguous `restore-indexeddb` startup recovery. Backup import and Cloud restore keep their existing formats and workflows for now.

## Deferred to Phase 4

Phase 4 should add the recovery/export UI and explicit user actions for choosing local versus IndexedDB, exporting preserved raw values, repairing a malformed mirror, and resolving a stale/ambiguous clear tombstone. It should also decide how recovery evidence survives a browser restart without introducing schema 5 or prematurely making IndexedDB canonical. Transactional backup/Cloud replacement can then adopt the safe replacement helper without changing external payload contracts.

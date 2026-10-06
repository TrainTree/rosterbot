# v0.30 Phase 10A — real-browser upgrade and rollback torture results

Date: 6 October 2026 (Australia/Melbourne)

Scope: local schema-4 → schema-5 migration, rollback, recovery, continued use,
and Cloud-capability-4 hold. All data was synthetic. Nothing was deployed,
production Cloud capability stayed at 4, and no schema-5 payload was sent to
production Cloud.

## Test environments

- Node.js persistence harness with in-memory localStorage and IndexedDB targets.
- Chromium 140 driven through Playwright Core, using a new persistent browser
  profile per scenario and the real browser localStorage/IndexedDB/download
  implementations.
- The old client was an extracted archive of the commit immediately before
  Phase 9. The hosted-path check also loaded `https://rosterbot.work/` read-only;
  it identified itself as `RosterBot 🤖 beta v0.29.1-recursion-hotfix` with
  schema marker 4. Synthetic state was inserted on an intercepted blank page
  on that origin before worktree files were substituted for the next load.
- Narrow/mobile checks used 390 × 844 Chromium viewports. SafariDriver 17.6 is
  installed, but this machine has not enabled it; starting it reports that
  `safaridriver --enable` must be run with authenticated machine access.
  Therefore no WebKit or real iPhone/iPad result is claimed.

## Fixture and scenario matrix

| Fixture/scenario | Important contents | Node | Chromium |
|---|---|---:|---:|
| `longLivedOfficial` | Six roster anchors across FP64–FP68, historic and future permanent swaps, depot move, annual/week leave, week/day overrides, locks, allowances, notes, pay checks, employment progression, mid-fortnight role/PDT change, calendar and device preferences | Pass | Pass |
| `manualLongLived` | Reusable current manual pattern, two different embedded historical patterns, future ad-hoc period, leave, actual override and allowance | Pass | Pass, including 390 × 844 |
| `partialLegacyAliases` | Sparse setup, legacy theme aliases, PayBot v04 alias, partial settings | Pass | Pass |
| `indexedDbRecoveryOnly` | Rich personal state only in IndexedDB, unrelated localStorage value retained | Pass | Pass |
| `explicitClearWithStaleIdb` | Newer explicit clear, stale rich IndexedDB mirror, signed-in synthetic Cloud metadata | Pass | Pass |
| `cloudMetadataHeld` | Rich state plus synthetic signed-in/config/sync/encryption/calendar metadata | Pass | Pass; external writes observed: 0 |
| Storage failures | local quota, local read denial, IndexedDB write failure/unavailable, snapshot read-back mismatch, schema-5 local/IDB write failure, compatibility failure | Pass | Three browser-level availability/write cases pass |
| Corruption | journal, retained snapshot and schema-5 checksum corruption | Pass, fail closed | Recovery UI covered by browser failure cases |
| Journal interruption | Every boundary from before snapshot through after final commit | Pass | 10/10 resume in a reopened browser context |
| Rollback/re-upgrade | old-client guard, exact retained snapshot recovery, reload and second upgrade | Pass | old-client writable startup blocked |
| Backup/import | schema 4 export → schema 5 → isolated clear → old backup import → schema 5 | Pass | Pass |
| Post-migration edits | roster, swap add/remove, manual pattern, actual override, role/PDT, allowance, pay check, theme/view and calendar setting | Pass | Pass |
| Hosted client path | public v0.29.1 client with synthetic same-origin state → worktree client | N/A | Pass |

The fixture corpus is
[`tests/fixtures/phase10a-browser-states.json`](../tests/fixtures/phase10a-browser-states.json).
It contains only synthetic names, IDs, tokens and `example.invalid` addresses.

## Semantic comparison

The browser harness captures application output before migration in the old
client and after migration in v0.30. It does not compare only stored JSON. The
captured model includes:

- roster/depot/line/track and resolved duty cells on representative historic,
  override, current and future-effective dates;
- permanent-swap parity and independent track advancement;
- reusable and embedded historical manual schedules;
- annual leave, week leave, week overrides, locks and actual-day overrides;
- employment classification and PDT scheme at dates on both sides of changes;
- PayBot fortnight gross, line items, unresolved flags and public-holiday move;
- fortnight allowances/notes and pay-check values;
- diary personal state, deterministic dashboard summaries, theme/view settings;
- calendar projection options, range and generated events.

All successful fixture comparisons were deeply equal. The hosted v0.29.1
same-origin comparison was also deeply equal. The schema-5 compatibility
projection fingerprint matched both the live local projection and IndexedDB
mirror after migration and after ordinary edits.

## Browser, reload and mobile results

For every major fixture, schema 5 reached a verified complete journal and set
the schema marker before `paybot:ready`. Roster, Calendar, Pay, More, Settings
and Data/Cloud UI were exercised where the fixture was configured. Normal
reload, cache-disabled reload, a restored tab, browser-context restart,
external-network-blocked startup, a loaded tab while offline, and reconnect
kept the committed envelope byte-stable and did not restart migration. Page
errors were empty. Console warnings/errors were empty except for the expected
`ERR_BLOCKED_BY_CLIENT` entries produced when synthetic `example.invalid`
Cloud status GETs were deliberately intercepted.

At 390 × 844, the normal dashboard and recovery/update-required screens fit
without horizontal overflow. The legacy application remained behind the boot
gate during recovery. Visible form controls remained at least 16 px and the
recovery-evidence download completed with a `.json` filename. No legacy-UI
flicker was observed before schema-5 readiness.

A truly cold, all-network-offline navigation is not available in this static
client because it has no service worker/app-shell cache. The tested equivalent
kept local client assets available while blocking every external request, plus
tested an already loaded/restored tab under browser offline mode and reconnect.
This is an acceptable documented product limitation, not evidence of offline
installation support.

## Crash, failure and rollback results

The browser was interrupted and reopened at:

1. before snapshot;
2. after snapshot;
3. after candidate build;
4. after candidate validation;
5. during schema-5 write;
6. after schema-5 write;
7. after schema-5 verification;
8. during compatibility projection;
9. after compatibility projection;
10. after final commit.

All ten resumed to one verified schema-5 generation. Failure injection proved
that a verified schema-4 source was unchanged when localStorage or IndexedDB
was unavailable, quota/write/read-back failed, the schema-5 envelope failed,
or compatibility projection failed. Corrupt journals, snapshots and checksums
failed closed and retained their evidence.

Opening the committed profile in the old client produced the newer-version
guard and kept feature UI hidden. Restoring the retained snapshot reproduced
the exact schema-4 fingerprint and bytes. A subsequent upgrade completed once,
with no duplicate roster/employment IDs, overrides or allowances and no change
in permanent-swap semantics.

## Backup/import and explicit clear

The unchanged public schema-4 `.rosterbot` format completed the full export,
clear, import and remigration cycle with equal personal semantics. Partial
backups and legacy aliases migrated; malformed backups were rejected without
changing the committed envelope; recovery-evidence export remained a distinct,
non-importable artifact.

The public backup intentionally omits `rosterbot-color-mode-v1` and
`rosterbot-roster-period-v1`. Those two device preferences reset after the
isolated import; personal state plus the backed-up theme/view preferences were
unchanged. The backup format was not altered.

Explicit clear passed before migration, during an interrupted migration, after
a completed migration, and after reload. It remained authoritative over stale
IndexedDB, retained synthetic signed-in metadata, did not upload, and retained
migration evidence where required. Startup defaults no longer promote a clear
generation back into ordinary state; a later deliberate user edit can do so.

## Cloud hold

With local schema 5 and server capability 4:

- automatic sync stopped with
  `schema5-local-only-server-capability-4`;
- the Data UI explicitly said Cloud Sync was held because the local device uses
  schema 5 while server capability remains 4;
- no automatic upload, replacement download, history application, wrapper
  rotation or calendar-triggered personal-state mutation occurred;
- upload/RPC save, local Cloud payload application (including current and
  historical restore), and wrapper rotation all pass through the capability
  guard; and
- the normal-edit browser journey observed zero external non-GET requests.

GET-only UI status attempts to the synthetic invalid endpoint were intercepted.
No schema-5 production write was attempted.

## Post-migration normal edits

One uninterrupted browser journey performed all requested actions, including
a rapid add/remove swap sequence that overlaps an in-flight IndexedDB commit.
The result reached schema-5 generation 11, local and IndexedDB fingerprints
equalled the committed compatibility fingerprint, and reload was byte-stable.
There were no duplicate roster or employment events, no duplicate overrides or
allowances, no page/console errors, and no Cloud mutation request.

## Issues and fixes

| Classification | Finding | Resolution |
|---|---|---|
| Data-integrity blocker | Feature startup defaults could turn a committed explicit-clear generation back into state. | Projection startup now restores the committed empty projection when preserving an explicit clear; regression covered in Node and Chromium. |
| Data-integrity blocker | A slow schema-5/IndexedDB projection could write an older projection over a newer rapid user edit, including swap removal. | The bootstrap tracks the newest notified values, reapplies them after an overlapping commit, and lets the queued sync commit the newest generation. |
| Data-integrity blocker | Device-only theme/view/colour preferences could be overwritten by the same in-flight personal projection. | Registered device writes now participate in the in-flight overlay without entering the schema-5 personal envelope. |
| Browser stability/data mutation | Loading the manual-schedule setup regenerated `updatedAt`, changing state on every startup. | The existing timestamp is preserved until the user changes the pattern. |
| UX issue | None remaining from automated narrow-viewport checks. | N/A |
| Acceptable limitation | Device-only colour and roster-period preferences are outside the unchanged public backup. | Documented above. |
| Acceptable limitation | No cold all-network-offline app shell. | Documented above; loaded-tab and external-offline cases pass. |
| Manual-test gap | SafariDriver requires machine-level enablement; no true iOS Safari/device run was available. | Run the checklist below before release. |

## Test totals

- `npm test`: 176/176 passed.
- Phase 10A focused persistence suite: 30/30 passed (included in the 176).
- Chromium scenario groups: 22/22 passed — six fixtures, ten interruption
  boundaries, three browser storage failures, one backup/import, one mutation
  journey, and one actual-hosted-client upgrade path.
- `npm run check:syntax`: passed, including the browser harness.

## Required manual Safari/iOS gate

Before a user rollout, repeat on at least one current iPhone and one iPad (and,
if supported, macOS Safari) with isolated synthetic schema-4 profiles:

- rich official, long-lived manual, IndexedDB-only and explicit-clear fixtures;
- normal migration, interruption/reopen, reload and browser termination/reopen;
- recovery and update-required screen layout, touch targets and evidence export;
- schema-4 backup download/import through the Files picker;
- storage denial/low-quota behavior where the platform permits simulation;
- Cloud-hold text and absence of upload/download/calendar publication; and
- ordinary post-migration edits followed by reload and fingerprint comparison.

## Remaining gates before Cloud schema 5

There is no known local migration, rollback or data-integrity blocker in the
automated Phase 10A matrix. The exact remaining gates are:

1. complete and record the real Safari/iPhone/iPad checklist above;
2. create a separate, non-production Cloud-capability-5 staging phase covering
   server payload/RPC compatibility, conflicts, history and wrapper rotation;
3. define and rehearse the Cloud rollback/hold-release procedure in staging.

Production capability 5, production schema-5 writes, production migration and
public client deployment remain explicitly out of scope.

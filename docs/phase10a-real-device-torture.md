# v0.30 Phase 10A — real-browser upgrade and rollback torture results

Date: 8 October 2026 (Australia/Melbourne)

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
| v0.21.1 legacy import boot gate | Exact historical wrapper/key shape, permanent swap, later roster, leave, overrides, allowances, pay check, PayBot and device preferences | Pass | Pass, including delayed/lost Diary-ready timing |
| Foundational startup diagnostics | First-error retention, start/complete/global markers, dependency and blocked-resource failure, unavailable/throwing Web Crypto, IndexedDB and localStorage | Pass | 8/8 forced module failures, 1 blocked script and 6/6 capability cases pass |
| Post-migration edits | roster, swap add/remove, manual pattern, actual override, role/PDT, allowance, pay check, theme/view and calendar setting | Pass | Pass |
| Hosted client path | public v0.29.1 client with synthetic same-origin state → worktree client | N/A | Pass |

The fixture corpus is
[`tests/fixtures/phase10a-browser-states.json`](../tests/fixtures/phase10a-browser-states.json).
It contains only synthetic names, IDs, tokens and `example.invalid` addresses.
The oldest import regression is the synthetic
[`tests/fixtures/backup-v0211.rosterbot`](../tests/fixtures/backup-v0211.rosterbot),
whose wrapper, privacy text and key set match the tracked v0.21.1 exporter.

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

The reported real-iPad Brave/WebKit legacy-import issue was investigated as a
boot-gate ordering defect. The import timeout did request and perform its one
automatic reload; replacement suppression was released, schema 5 was valid,
the completed migration journal remained complete, and the compatibility
projection survived. The problem was that `rosterbot:local-ready`, emitted by
Diary, was also the only signal allowed to remove `rb-booting`. Navigation is
loaded after Diary, so it depended on a one-shot event plus a mutable global
fallback. More importantly, that fallback could release the shell while
`loadApplication()` was still loading later modules or committing startup
projection writes. A WebKit lifecycle/timing difference could therefore leave
the shell waiting forever even though a manual refresh found valid state.

Bootstrap now owns final readiness. After schema-5 verification it loads all
feature modules and verifies their first projection, emits
`rosterbot:application-starting` so Navigation can render the initial route
behind the loading shell, commits and verifies any writes caused by that
render, then emits `rosterbot:application-ready`. Only the last event removes
`rb-booting`. Diary's local-ready signal remains available to Cloud Sync but
cannot open or strand the visual boot gate. Startup writes remain inside the
clear-preserving initialization window, so an explicit clear cannot be
promoted to ordinary state by onboarding.

The focused browser regression starts with a fresh profile, imports the
v0.21.1 fixture through the real file input, accepts the preview, observes
exactly one automatic navigation, and requires the normal UI without a manual
reload. A second run delays Diary and Navigation script delivery and discards
the Diary-ready event/global flag to reproduce the WebKit-like lost-signal
condition. Both runs preserve representative roster/swap/leave/override/pay
semantics, release replacement suppression, retain the Cloud capability-4
hold, and remain byte-stable on the next reload. A current v0.29 schema-4
backup also passes, while malformed JSON is rejected without navigation or
envelope change. No page/console errors or external mutation requests were
recorded.

A truly cold, all-network-offline navigation is not available in this static
client because it has no service worker/app-shell cache. The tested equivalent
kept local client assets available while blocking every external request, plus
tested an already loaded/restored tab under browser offline mode and reconnect.
This is an acceptable documented product limitation, not evidence of offline
installation support.

## Foundational startup exception investigation

The four real-iPad messages reported on 8 October are downstream dependency
failures, not sufficient evidence of the original exception:

- `schema5 is null` occurs when schema-5 migration reaches the journal-state
  table without a published `RosterBotSchema5`;
- `canonical is null` and `registry is undefined` are later consumers observing
  missing canonical/registry globals; and
- `safety.CLEAR_KEY is undefined` is another consumer failure after persistence
  safety did not publish.

Static tracing and forced browser failures confirm how this cascade happens,
but do not identify which publisher first failed on the physical iPad. The
exact first device exception is therefore still unknown; naming one from the
later messages would be speculative. The earliest reported downstream failure
is `03-schema5-migration` evaluating `schema5.JOURNAL_STATES`. Its direct cause
is that `02-schema5` had not published `RosterBotSchema5`; that module may have
failed itself or may have been unable to initialise because registry/canonical
was already absent.

A collector now runs inline before the first external script and retains the
first error permanently. Every foundational script records URL, start,
completion, expected-global status, ready state, secure-context state, Web
Crypto types, user agent, timestamp and order. Resource-load errors also retain
the failed script URL. Missing dependencies now throw a named boundary error,
for example `RosterBot startup dependency missing: 02-canonical-state expected
persistence registry`, instead of dereferencing `null`. Bootstrap performs all
dependency checks before recovery or personal-data inspection.

When such a module failure occurs, the boot gate shows **RosterBot could not
start correctly**, a copyable first-error/marker trace, and no recovery or
clear control. All eight injected foundational failures retained the injected
exception ahead of every cascade, left the seeded schema-4 bytes unchanged,
and kept feature modules gated.

No registry, canonical, safety or schema-5 factory reads localStorage, opens
IndexedDB or executes Web Crypto while publishing its global. Web Crypto is
first used later for migration verification; storage APIs are first used by
the startup snapshot/bootstrap. In Chromium, removing each capability or
making its getter throw did not prevent any foundational global from
publishing. The persistence gate then failed closed without changing the
seeded personal state. Consequently Safari privacy protections are not proven
to be the cause of the absent globals. “Reduced protections” improving startup
is a correlation that could represent a resource/content intervention, but the
new start/resource/error markers are required to distinguish that from an
evaluation exception. Brave/WebKit exhibits the same downstream symptom class,
but the same upstream root cause is likewise not yet proven.

No speculative compatibility change was made. The proposed minimal functional
fix is to use the first copied iPad diagnostic to change only the failing
publisher or resource path. If the marker is absent and a resource error names
the script, address that delivery/protection interaction; if start exists but
completion does not, fix the exact recorded exception. Re-run the same physical
Safari and Brave profiles after that targeted change.

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
The result reached schema-5 generation 13, local and IndexedDB fingerprints
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
| Browser compatibility bug | A successful old-backup import could reload into a permanent loading shell because Navigation alone released the boot gate from Diary's one-shot local-ready signal; it could also expose UI before final startup projection verification. | Bootstrap now performs a two-stage initial-route handshake and emits authoritative application readiness only after all modules, route rendering and projection verification complete. Legacy/current/malformed and delayed/lost-signal browser regressions pass. |
| Browser compatibility investigation | Real iPad Safari/Brave sometimes reports missing persistence globals. The visible exceptions are confirmed cascades; the first physical-device exception has not yet been captured, and privacy protections are not proven causal. | Added pre-script first-error diagnostics, per-module publication markers, resource URL capture, explicit dependency errors and a distinct non-destructive startup-failure screen. Await one copied iPad diagnostic before a functional fix. |
| UX issue | None remaining from automated narrow-viewport checks. | N/A |
| Acceptable limitation | Device-only colour and roster-period preferences are outside the unchanged public backup. | Documented above. |
| Acceptable limitation | No cold all-network-offline app shell. | Documented above; loaded-tab and external-offline cases pass. |
| Manual-test gap | SafariDriver requires machine-level enablement; no true iOS Safari/device run was available. | Run the checklist below before release. |

## Test totals

- `npm test`: 182/182 passed.
- Phase 10A focused persistence suite: 30/30 passed (included in the 182),
  plus two import/boot-gate contract regressions.
- Chromium scenario groups: 22/22 passed — six fixtures, ten interruption
  boundaries, three browser storage failures, one backup/import, one mutation
  journey, and one actual-hosted-client upgrade path.
- Focused legacy-import Chromium scenarios: 4/4 passed — v0.21.1 normal,
  v0.21.1 delayed/lost readiness, current schema 4, and malformed rejection.
- Foundational diagnostic Chromium scenarios: 16/16 passed — normal startup,
  eight forced module failures, one blocked script resource and six
  absent/throwing capability cases.
- Combined Chromium scenario groups: 42/42 passed.
- `npm run check:syntax`: passed, including the browser harness.

## Required manual Safari/iOS gate

Before a user rollout, repeat on at least one current iPhone and one iPad (and,
if supported, macOS Safari) with isolated synthetic schema-4 profiles:

- rich official, long-lived manual, IndexedDB-only and explicit-clear fixtures;
- normal migration, interruption/reopen, reload and browser termination/reopen;
- recovery and update-required screen layout, touch targets and evidence export;
- schema-4 backup download/import through the Files picker;
- repeat the exact v0.21.1 backup import on iPad Brave/WebKit and verify the
  automatic post-import transition without a manual refresh;
- reproduce foundational startup failure in Safari and Brave with normal
  protections, copy the complete technical diagnostic, then repeat with reduced
  protections to compare the first error and module marker sequence;
- storage denial/low-quota behavior where the platform permits simulation;
- Cloud-hold text and absence of upload/download/calendar publication; and
- ordinary post-migration edits followed by reload and fingerprint comparison.

## Remaining gates before Cloud schema 5

There is no known local migration, rollback or data-integrity blocker in the
automated Phase 10A matrix. The exact remaining gates are:

1. capture the first-error/module-marker diagnostic from the affected iPad and
   make the smallest evidence-led startup fix, if one is required;
2. complete and record the remaining real Safari/iPhone/iPad checklist above;
3. create a separate, non-production Cloud-capability-5 staging phase covering
   server payload/RPC compatibility, conflicts, history and wrapper rotation;
4. define and rehearse the Cloud rollback/hold-release procedure in staging.

Production capability 5, production schema-5 writes, production migration and
public client deployment remain explicitly out of scope.

# RosterBot v0.29.1 — Recursion Hotfix

This is the modular RosterBot source build. It keeps the frozen official roster/pay reference packs separate from the application UI, personal history and sync code.

## Frozen data files

- `data/rosters-fp64-fp68-20260908.js` — official effective-dated roster/roster-book data and the lightweight roster catalogue. Treat as read-only until official roster source data changes.
- `data/pay-reference-20260923.js` — PayBot roster lookup data, public holidays, verified/entitlement pay-rate anchors, grade rates and allowances. Treat as read-only until authoritative pay/reference data changes.

The frozen-data files are unchanged from the validated pre-v0.29 build.

## v0.29.1 hotfix

- Fixed an accidental recursive week-heading formatter introduced in v0.29.0.
- Restores first-run previews, normal roster rendering and Home → This pay fortnight.
- No payroll, Employment Profile, Cloud Sync, calendar or frozen-data logic changed.

## v0.29.0 changes

- Added **More → Employment & Pay Profile** with dated classification history for PF441, PB311, PB312, PB205, legacy VL014 PDT, VL007 DTCO and VL006 RDS.
- First-run setup can save the role effective date separately from the schedule/roster start date.
- PayBot resolves the applicable classification and rate **per date**, including a classification change inside a single pay fortnight.
- Existing PB205 PayBot behaviour remains the fallback when no dated employment profile applies.
- Current-scheme PDT keeps PB205 as the underlying classification and uses A704/A705 only on marked training/assessment time. Legacy PDT resolves to VL014.
- Added reusable **manual work patterns** and **no default pattern** scheduling for employees who do not follow one of the supplied master rotations. Manual patterns are stored as dated snapshots so a later change does not rewrite historical weeks.
- The existing full-time Part 7 guarantee/overtime engine is shared across the supported Locomotive Operating classifications. PF441 currently follows the same Part 7 treatment unless contrary authoritative evidence is supplied.
- Employment profile and manual schedule data are included in normal `.rosterbot` backup/import and Cloud Sync data. Personal-data schema v4 compatibility is retained.
- Fixed **Sources** mobile containment: tables scroll inside their own cards instead of widening the page, and Sources cards use a consistent 14px vertical gap.
- Added an Employment & Pay Profile shortcut from **Roster History & Changes** without merging role history into roster history.

## Important scope

This build expands rate/classification handling without creating separate payroll engines for each role. It does not add banked overtime, part-time rules, confidential/internal resources, or any new server-side access-control system.

Manual work patterns are user-entered schedule data; they are deliberately labelled separately from official roster data.

## Application files

- `css/rosterbot.css` — presentation, including Sources mobile containment and Employment Profile UI.
- `js/10-12*` — roster adapters/engines. `js/11-roster-engine.js` now supports dated manual schedule entries while preserving official roster history.
- `js/20-roster-ui.js` — roster UI/session/onboarding layer.
- `js/40-employment-profile.js` — dated role/classification history plus manual work-pattern management.
- `js/42-paybot.js` — PayBot calculation/UI engine with per-date classification resolution; reference values still come from the frozen data pack.
- `js/50-data-backup.js` / `js/51-cloud-sync.js` — local backup and encrypted cloud sync.
- `js/60-diary.js` — personal roster history/day diary and profile shortcut.
- `js/70-navigation.js` — dashboard/onboarding/primary navigation/Roster Lookup and official roster viewer UX.
- `js/75-sources.js` — public Sources reference UI.
- `js/80-calendar-subscription.js` — sanitised live calendar projection/publisher and cross-device feed updater.

## Validation before tester promotion

The build should still be tested on the target phone/browser before promotion. In particular test: an existing PB205 roster, a fresh trainee/manual-pattern setup, a mid-fortnight role change, a current-scheme PDT day, an outstation MAIN roster, Sources on a narrow phone, backup/import, and Cloud Sync across two devices.

## Running

Upload the whole directory to the web host, preserving the folder structure. No calendar Edge Function or SQL redeployment is needed for v0.29.1. For local testing, serve this directory with any simple static HTTP server and open `index.html`.

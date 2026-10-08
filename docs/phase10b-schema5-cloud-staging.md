# v0.30 Phase 10B — schema-5 Cloud staging architecture

Status: architecture approved; remote execution steps 1–4 and local Step 5 passed on 8 October
2026 (Australia/Melbourne). The isolated staging contract and beta Auth origin
configuration are installed while the advertised capability remains 4. A
candidate beta-only bundle has been generated and reviewed locally but not
deployed. Step 6 onward has not begun.

## Scope and immutable boundaries

Phase 10B is confined to the existing isolated Supabase project:

- name: `rosterbot-phase8c-staging`;
- project ref: `wuzyurvrztskljpxpeaq`;
- expected API origin: `https://wuzyurvrztskljpxpeaq.supabase.co`;
- browser origin: `https://beta.rosterbot.work`;
- data: synthetic accounts and fixtures only.

The production Supabase project ref `rithmbggiiusrmdcqrif` is an explicit deny
target in every Phase 10B mutation helper. Production remains at schema
capability 4. Phase 10B must not mutate production Cloud rows, Auth users,
configuration, functions, migrations or capability; must not deploy to
`rosterbot.work` or `TrainTree/rosterbot`; and must not change DNS.

This document is the required architecture/safety review point before any
remote change. Preparing code, SQL and tests locally is reversible; applying
SQL, changing staging Auth configuration, changing the staging capability, or
deploying another beta bundle requires a separately approved execution step.

## Why beta needs an explicit Cloud configuration

The current client treats only `rosterbot.work` and `www.rosterbot.work` as
hosted. On every other hostname, including `beta.rosterbot.work`, it uses a
saved manual configuration or falls back to the hard-coded production
Supabase configuration. The unconditional local-schema-5 Cloud hold currently
prevents schema-5 transfer, but that fallback cannot remain when Phase 10B
introduces a release path.

`beta.rosterbot.work` therefore requires a staging-specific, deploy-time
publishable configuration. It must never inherit, fall back to, accept a saved
override for, or expose a connection editor capable of selecting the
production project.

## Two-key release gate

Schema-5 Cloud transfer is allowed only when both independent keys pass.

### 1. Static origin/project binding

The beta deployment profile binds all of these exact values:

- page protocol and hostname: `https:` and `beta.rosterbot.work`;
- Supabase project ref: `wuzyurvrztskljpxpeaq`;
- API URL: `https://wuzyurvrztskljpxpeaq.supabase.co`;
- environment: `isolated-staging`;
- requested Cloud schema: 5.

The staging bundle generator accepts only the staging publishable key. The URL,
project ref, environment and beta hostname are constants, not caller-provided
arguments. It rejects missing keys and secret/service-role keys. The generated
runtime profile contains no service-role or management credential.

At runtime, beta fails closed before Auth or roster-state requests if the page
origin, profile URL or project ref differs. Beta ignores previously saved Cloud
configuration. Production origins keep their exact production profile and a
maximum client schema of 4. Unknown/local origins may retain explicit manual
schema-4 development configuration, but can never satisfy the schema-5 release
gate.

### 2. Fresh server capability attestation

The isolated server exposes a read-only capability RPC to authenticated users.
Its exact response is versioned and includes:

```json
{
  "environment": "isolated-staging",
  "project_ref": "wuzyurvrztskljpxpeaq",
  "contract": "rosterbot-schema5-cloud-v1",
  "min_writable_schema": 4,
  "max_writable_schema": 5
}
```

The function is `STABLE`, performs no write, returns no user data, has no
anonymous grant, and reads the unexposed capability row through a narrow
security-definer boundary. The client does not persist an enduring release
flag. It obtains and validates a fresh attestation after authentication and
before enabling schema-5 controls.

Every client mutation path checks the in-memory attestation. The database
capability and payload validator remain the final authority, so lowering the
gate between attestation and a request still rejects the request atomically.
Missing RPC, transport failure, malformed fields, wrong environment/ref,
unknown contract, or maximum schema below 5 all retain the hold.

The production profile never treats a capability response as permission for
schema 5. Production continues to hold locally at capability 4 even if a
future unrelated server response changes. The Phase 10B beta build is the only
profile allowed to request the staging contract.

## Schema-5 Cloud wire contract

### Plaintext

The schema-5 payload is the validated local
`rosterbot-personal-state-v1` envelope itself:

- row `schema_version = 5`;
- `format = "rosterbot-personal-state"`;
- `formatVersion = 1`;
- `storageSchemaVersion = 5`;
- `minimumReaderSchema = 5`;
- complete writer, generation, checksum, timestamps, personal state,
  extensions, migration, previous-generation and compatibility fields.

Before upload, the client parses the committed local envelope, verifies its
schema-5 checksum and lossless schema-4 projection with the existing schema-5
validator, and verifies the IndexedDB mirror/compatibility projection. It does
not reconstruct a Cloud envelope from opportunistic feature-key reads.

The sync fingerprint for plaintext schema 5 is the verified schema-5
generation/checksum fingerprint. A download is compatible only when the row
schema, visible payload schema, generation fingerprint, checksum and computed
client validation all agree.

### Encrypted

The existing `rosterbot-encrypted-v1` outer format remains, with outer
`schemaVersion = 5`. Its ciphertext decrypts to the exact schema-5 envelope.
The outer keyed fingerprint is HMAC-SHA-256 over the canonical schema-5
identity, not the legacy schema-4 `storage` map. After decryption the client
verifies both the HMAC and the inner schema-5 checksum/projection before the
payload can participate in comparison or replacement.

The server validates only the authenticated visible outer encrypted metadata;
it cannot inspect ciphertext. Client-side inner validation is therefore
mandatory and fail-closed.

### Server validation

The existing Phase 8B validator already enforces schema/capability agreement
and required top-level containers. Phase 10B strengthens the plaintext
schema-5 checks for the stable wire contract without attempting to duplicate
JavaScript canonicalisation in SQL. It checks, at minimum:

- positive integer generation number;
- 64-character lowercase hexadecimal generation/checksum fingerprints;
- generation fingerprint equals checksum value;
- generation id equals `<number>:<fingerprint>`;
- checksum algorithm, canonicalisation and scope identifiers;
- `personalState.kind` and entries containers;
- compatibility schema/status/fingerprint fields;
- required timestamp/writer/migration field types; and
- supported format/schema versions only.

Cryptographic checksum recomputation and semantic projection validation stay
with the client. Server outer validation plus client cryptographic validation
are both required; neither substitutes for the other.

## Client state replacement and sync semantics

Schema-5 download never writes individual feature keys first. A dedicated
transactional replacement stages and validates the remote envelope, derives
and validates its schema-4 compatibility projection, captures the previous
known-good local schema-5 generation and projection, then commits and verifies
the envelope, projection, marker, journal and IndexedDB mirror. Any failure
restores and verifies the exact prior local state or enters non-destructive
recovery with evidence retained.

The Cloud row and history are unchanged by a download or history inspection.
Uploading after a local restore creates a new schema-5 revision through the
ordinary expected-revision RPC.

History behavior is explicit:

- schema-5 history is fully validated before local application;
- schema-4 history is migrated in memory to a new schema-5 local generation;
- restoring history never rewinds or edits existing Cloud history;
- a later upload creates a new schema-5 current revision; and
- malformed, unsupported or row/payload-mismatched history is not applied.

For an existing schema-4 Cloud row, the client validates it with the legacy
contract and compares its canonical schema-4 semantics with the local
schema-5 compatibility projection. Equal state can be upgraded by one
expected-revision schema-5 write. Different or unlinked state requires an
explicit user choice; it is never silently overwritten.

A fresh client receiving schema-5 Cloud state uses the same transactional
replacement path. Local defaults or a freshly created local schema-5 envelope
do not outrank the authenticated remote copy without the normal comparison and
user-choice rules.

## Required test matrix

All remote tests create random `@example.invalid` synthetic users through a
guarded staging-only harness and delete them in `finally`. Test evidence may
record revisions, schema numbers, error codes and fingerprints, but not access
tokens, passwords or payload contents.

1. Capability 4 retains the client hold and rejects schema-5 save.
2. Wrong origin, project ref, environment, contract or malformed capability
   retains the hold without a roster mutation request.
3. Exact beta profile plus exact capability-5 attestation releases the hold.
4. Plaintext and encrypted schema-5 upload/read/download round trips validate
   row, outer, inner and fingerprint agreement.
5. Multiple schema-5 revisions have immutable, matching history rows.
6. Current and historical schema-5 restore preserve semantics and never change
   Cloud until an explicit subsequent upload.
7. Expected-revision conflict re-fetches and presents conflict handling; no
   blind write retry occurs.
8. Stale and current schema-4 writers receive `RB001/schema_too_old` after a
   schema-5 commit and do not change state/history.
9. Malformed, mismatched and unsupported plaintext/encrypted payloads receive
   stable errors and leave state/history byte-for-byte unchanged.
10. Concurrent first writes and same-revision writes serialize to one winner;
    both legal schema-4/schema-5 lock orderings are covered.
11. Existing schema-4 Cloud state upgrades to schema 5 only after semantic
    validation and expected-revision agreement.
12. Schema-5 Cloud state restores into a fresh isolated browser profile.
13. Injected local write, IndexedDB, validation, network and server errors
    preserve the previous known-good local and Cloud states.
14. The production capability-4 profile retains the hold and emits no
    schema-5 mutation request. This proof uses read-only/static fixtures or a
    request interceptor; it does not sign in to or mutate production.

## Remote execution sequence after approval

1. Read-only preflight the exact staging project ref, catalog, capability,
   Auth redirect allowlist and zero synthetic-user baseline. Reconfirm the
   production ref deny guard.
2. Apply the reviewed staging-only capability-attestation and validator SQL
   while `max_writable_schema` remains 4.
3. Run catalog, grant, capability-4 and regression checks.
4. Add only the beta Auth redirect/site URL required for the isolated staging
   project, if interactive browser Auth needs it.
5. Generate and review a beta-only bundle containing the staging publishable
   profile. Confirm it contains no service/management credential and no
   production fallback for the beta origin.
6. Advance only isolated staging to `max_writable_schema = 5` through a guarded
   executor that requires the exact staging ref and explicit Phase 10B opt-in.
7. Run API integration tests and browser tests with synthetic users/data.
8. Deploy the reviewed beta-only bundle to `TrainTree/rosterbot-beta`; do not
   push the experiment branch or touch the production repository.
9. Run the physical/browser staging matrix and retain privacy-safe evidence.
10. Delete synthetic users/data and perform a final audit. Keep or lower the
    staging gate according to the reviewed rollback exercise; production stays
    at 4 in either case.

## Steps 1–3 execution record

Executed 8 October 2026 against only `wuzyurvrztskljpxpeaq`:

- the read-only preflight matched all six accepted Phase 8B/8C catalog hashes;
- staging was `ACTIVE_HEALTHY`, capability was the singleton `4..4`, and
  roster state, revision history, calendar data, Auth users and Auth identities
  were all empty;
- the preflight Auth configuration remained `site_url=http://localhost:3000`
  with an empty redirect allowlist;
- `supabase/staging/phase10b-capability-attestation-schema5-contract.sql`
  (SHA-256
  `1a0ccf96462375c898d36f129f53213493eebb1856c628d28c5f935dd837536e`)
  installed the staging-bound attestation and dormant schema-5 plaintext
  validator without changing capability 4;
- the full local persistence suite passed 189/189, the Phase 10B staging suite
  passed 92 assertions, the Phase 8B security group passed 34 assertions, and
  the capability-4, catalog, syntax and final-audit checks passed; and
- seven synthetic `@example.invalid` Auth users were created across the remote
  regressions and all seven were deleted. The final state/history/calendar/Auth
  counts were zero.

## Step 4 execution record

Executed 8 October 2026 against only `wuzyurvrztskljpxpeaq`, using the new
hard-guarded
`supabase/deploy/phase10b-staging-auth-executor.mjs`:

- the executor rechecked the exact staging ref, project name and
  `ACTIVE_HEALTHY` status immediately before its only write;
- the only mutation was `PATCH /v1/projects/wuzyurvrztskljpxpeaq/config/auth`
  with exactly `site_url` and `uri_allow_list` in the request body;
- `site_url` read back as exactly `https://beta.rosterbot.work`;
- `uri_allow_list` read back as exactly
  `https://beta.rosterbot.work/`, parsed as one redirect destination;
- all non-URL Auth configuration fields were identical before and after
  (canonical SHA-256
  `3e9d157226478aba3c97eeab2c8f9279b1d3532ceb31e71efc2510bb5ac8eede`),
  including signup, providers, SMTP, JWT/session and captcha settings;
- the before and after database audits both reported the singleton capability
  `4..4` and zero roster state, revision history, calendar, Auth-user and
  Auth-identity rows; and
- the executor made no request to production, no browser Supabase credential
  was configured, no site bundle was generated or deployed, and capability 5
  was not enabled.

The applied staging Auth delta was:

- set `site_url` to `https://beta.rosterbot.work`;
- set the redirect allowlist to only `https://beta.rosterbot.work/`, matching
  the current client callback generated at the beta root;
- make no signup, provider, SMTP, JWT, session, captcha, CORS, production Auth,
  browser credential or capability change; and
- preserve all database/RPC state and server schema capability 4 before browser
  work.

## Step 5 execution record

Completed locally on 8 October 2026. Nothing was pushed or deployed, no remote
configuration was changed, and staging capability remained 4.

- `scripts/prepare-staging-pages.mjs` now requires the staging browser-safe
  `sb_publishable_` key through `PHASE10B_BETA_PUBLISHABLE_KEY`; it rejects the
  input before creating output unless it has the publishable-key form.
- Ordinary builds load `js/05-cloud-deployment-profile.js`, which preserves the
  existing production URL, publishable key, hosted origins, development saved
  configuration and fallback behavior. The beta generator replaces only that
  file in the deploy-only output with the exact isolated-staging profile.
- Shared `js/06-cloud-config.js` validates the profile, project-ref/URL
  relationship, browser-safe credential, and exact origin. Beta permits only
  `https://beta.rosterbot.work`, ignores saved configuration, has no fallback,
  and rechecks the binding before every Cloud request.
- The candidate contains the staging ref `wuzyurvrztskljpxpeaq`, staging URL
  `https://wuzyurvrztskljpxpeaq.supabase.co`, exact beta origin and one modern
  staging publishable key (SHA-256
  `7bec63f6836ca1b5405b7604096a6e026a8a8d71a3b1dc72e7a88017d26310cf`).
  The key itself remains an injected deploy-time public value, not a source
  constant.
- An independent full-bundle scan found zero occurrences of the production
  ref, production URL and production publishable key; zero `sb_secret_`
  credentials; zero management/personal-access token patterns; zero database
  connection strings; zero JWT credentials; and exactly one distinct
  `sb_publishable_` credential, the staging key.
- The candidate has 35 files, all 34 entries in `SHA256SUMS.txt` verify, and a
  review-only concatenated-file SHA-256 is
  `3e94a6a2020d7a0559e93a5c3a730803b93ce094dea1e5686cacd0975501671f`.
- The full local persistence suite passed 195/195. The six focused Step 5 tests
  cover staging-only output, production-identifier absence, saved-production
  override resistance, exact-origin enforcement, missing/malformed/mismatched
  fail-closed behavior, privileged-input refusal, unchanged production
  behavior, and the capability-4 hold.
- The generated profile requests schema 5 but grants no authority. The client
  still has the unconditional local-schema-5 transfer hold, contains no
  capability-5 write path, and cannot release the hold from a client claim.
  A future release can rely only on a fresh authenticated server attestation.

The final candidate exists only under `/tmp/rosterbot-phase10b-step5-final.zAuyAm/rosterbot-beta`.
It has not been initialized as a Git repository, pushed, published or opened
against a Cloud account.

## Exact proposed Step 6 procedure

Step 6 requires a separate approval and must change only the singleton staging
capability row. Before the one update, a hard-guarded executor must:

1. require the literal target ref `wuzyurvrztskljpxpeaq` and an exact opt-in
   phrase tied to that ref, while explicitly denying `rithmbggiiusrmdcqrif`;
2. read back project name `rosterbot-phase8c-staging` and status
   `ACTIVE_HEALTHY` from the exact Management API path;
3. confirm Auth still has only the approved beta site/redirect URLs, the Phase
   10B functions and grants still match, the capability table has exactly one
   `4..4` row, and roster/history/calendar/Auth-user/Auth-identity counts remain
   zero;
4. re-read target identity immediately before mutation, then execute one
   transaction which locks the singleton capability row, asserts it is still
   exactly `min=4,max=4`, updates only `max_writable_schema` to 5 plus
   `updated_at`, and asserts exactly one affected row;
5. read back singleton capability `4..5`, unchanged catalog/Auth settings and
   unchanged zero row counts, recording privacy-safe evidence; and
6. stop without generating users, writing roster data, deploying the beta
   bundle, or contacting production. Fresh authenticated attestation and all
   schema-5 mutation tests remain Step 7.

## Rollback and stop conditions

The first response to a client or contract defect is to lower only isolated
staging back to capability 4. This prevents new schema-5 saves through the
ordinary RPC while preserving existing rows/history for diagnosis. The beta
client then re-enters the local Cloud hold and continues local-first operation.

Do not delete current/history evidence as a rollback mechanism. Synthetic
account deletion happens only after evidence capture and removes that test
user through the existing foreign-key cascade. Reverting the beta deployment
does not alter Cloud state.

Stop immediately before mutation if any resolved project URL/ref is
production, if the staging catalog differs unexpectedly, if a secret/service
key would enter a browser bundle, if the beta origin can select production, or
if the capability response is not the exact reviewed contract.

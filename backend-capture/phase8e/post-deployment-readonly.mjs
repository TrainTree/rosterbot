#!/usr/bin/env node

import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const PRODUCTION = "rithmbggiiusrmdcqrif";
const STAGING = "wuzyurvrztskljpxpeaq";
const EXPECTED_CLIENT_SHA =
  "2130dfc537370578af0c265376b2dcfc7ce2c0943b49e7140fe5e2052066370f";
const EXPECTED_EDGE_SHA =
  "0fc2fd4f9dafa0ed582b49121636c7a350e90cbeded6b5d7c2d3f6f0ae5f043d";
const root = new URL("../../", import.meta.url);
const queryRoot = new URL("../phase8a/introspection/", import.meta.url);
const catalogRoot = new URL("../phase8a/catalog/", import.meta.url);
const comparisonFiles = [
  "object-inventory.sql",
  "table-details.sql",
  "function-details.sql",
  "privilege-details.sql",
  "column-privileges.sql",
  "write-path-search.sql",
];

const token = (
  await readFile(join(homedir(), ".supabase", "access-token"), "utf8")
).trim();
if (!token) throw new Error("Supabase access token is unavailable");

const sha256 = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");
const canonical = (value) => `${JSON.stringify(value, null, 2)}\n`;
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

async function management(path, options = {}) {
  const response = await fetch(`https://api.supabase.com${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

async function query(projectRef, sql) {
  assert(/^\s*(select|with)\b/i.test(sql), "Refusing non-read-only SQL");
  return management(`/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    body: JSON.stringify({ query: sql }),
  });
}

const [productionProject, stagingProject] = await Promise.all([
  management(`/v1/projects/${PRODUCTION}`),
  management(`/v1/projects/${STAGING}`),
]);
assert(productionProject.ref === PRODUCTION, "Production ref mismatch");
assert(productionProject.name === "rosterBot-sync-dev", "Production name mismatch");
assert(productionProject.region === "ap-southeast-2", "Production region mismatch");
assert(productionProject.status === "ACTIVE_HEALTHY", "Production is not healthy");
assert(stagingProject.ref === STAGING, "Staging ref mismatch");
assert(stagingProject.status === "ACTIVE_HEALTHY", "Staging is not healthy");

const catalogComparison = [];
const productionCatalogs = new Map();
for (const file of comparisonFiles) {
  const sql = await readFile(new URL(file, queryRoot), "utf8");
  const [productionRows, stagingRows] = await Promise.all([
    query(PRODUCTION, sql),
    query(STAGING, sql),
  ]);
  const matchesStaging = canonical(productionRows) === canonical(stagingRows);
  assert(matchesStaging, `${file} differs from Phase 8C staging`);
  productionCatalogs.set(file, productionRows);
  catalogComparison.push({
    query_file: file,
    production_rows: productionRows.length,
    staging_rows: stagingRows.length,
    production_sha256: sha256(canonical(productionRows)),
    staging_sha256: sha256(canonical(stagingRows)),
    matches_phase8c_staging: matchesStaging,
  });
}

const phase8aTables = JSON.parse(
  await readFile(new URL("table-details.json", catalogRoot), "utf8"),
);
const phase8aFunctions = JSON.parse(
  await readFile(new URL("function-details.json", catalogRoot), "utf8"),
);
const productionTables = productionCatalogs.get("table-details.sql");
const productionFunctions = productionCatalogs.get("function-details.sql");

const unchangedTableShape = (row) => {
  const copy = structuredClone(row);
  delete copy.explicit_acl;
  delete copy.effective_acl;
  delete copy.triggers;
  return copy;
};
for (const name of ["roster_state", "roster_revisions"]) {
  const before = phase8aTables.find((row) => row.table_name === name);
  const after = productionTables.find((row) => row.table_name === name);
  assert(
    canonical(unchangedTableShape(after)) === canonical(unchangedTableShape(before)),
    `${name} changed outside intended grants/triggers`,
  );
}
const phase8aCalendar = phase8aTables.find(
  (row) => row.table_name === "calendar_feeds",
);
const productionCalendar = productionTables.find(
  (row) => row.table_name === "calendar_feeds",
);
assert(
  canonical(productionCalendar) === canonical(phase8aCalendar),
  "calendar_feeds catalog differs from Phase 8A",
);
const oldCalendarFunction = phase8aFunctions.find(
  (row) => row.function_name === "set_calendar_feed_updated_at",
);
const currentCalendarFunction = productionFunctions.find(
  (row) => row.function_name === "set_calendar_feed_updated_at",
);
assert(
  canonical(currentCalendarFunction) === canonical(oldCalendarFunction),
  "calendar updated-at function differs from Phase 8A",
);

const safeSql = `
select jsonb_build_object(
  'capability', (
    select jsonb_build_object(
      'min', min_writable_schema,
      'max', max_writable_schema,
      'rows', count(*) over ()
    )
    from public.roster_schema_capability
    where singleton = true
  ),
  'object_counts', jsonb_build_object(
    'roster_state', (select count(*) from public.roster_state),
    'roster_revisions', (select count(*) from public.roster_revisions),
    'calendar_feeds', (select count(*) from public.calendar_feeds)
  ),
  'schema_counts', jsonb_build_object(
    'roster_state_schema4', (
      select count(*) from public.roster_state where schema_version = 4
    ),
    'roster_state_non4', (
      select count(*) from public.roster_state where schema_version <> 4
    ),
    'roster_revisions_schema4', (
      select count(*) from public.roster_revisions where schema_version = 4
    ),
    'roster_revisions_non4', (
      select count(*) from public.roster_revisions where schema_version <> 4
    )
  ),
  'triggers', (
    select jsonb_agg(t.tgname order by t.tgname)
    from pg_catalog.pg_trigger t
    join pg_catalog.pg_class c on c.oid = t.tgrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('roster_state', 'roster_revisions')
      and not t.tgisinternal
      and t.tgenabled = 'O'
  ),
  'roster_rls_enabled', (
    select count(*) = 2
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('roster_state', 'roster_revisions')
      and c.relrowsecurity
  ),
  'anon_any_rpc_execute',
    has_function_privilege('anon', 'public.save_roster_state(bigint,integer,jsonb,text)', 'EXECUTE')
    or has_function_privilege('anon', 'public.rotate_roster_encryption_wrappers(bigint,jsonb,text)', 'EXECUTE')
    or has_function_privilege('anon', 'public.purge_unencrypted_roster_history()', 'EXECUTE'),
  'authenticated_all_rpc_execute',
    has_function_privilege('authenticated', 'public.save_roster_state(bigint,integer,jsonb,text)', 'EXECUTE')
    and has_function_privilege('authenticated', 'public.rotate_roster_encryption_wrappers(bigint,jsonb,text)', 'EXECUTE')
    and has_function_privilege('authenticated', 'public.purge_unencrypted_roster_history()', 'EXECUTE'),
  'service_role_roster_select',
    has_table_privilege('service_role', 'public.roster_state', 'SELECT')
    and has_table_privilege('service_role', 'public.roster_revisions', 'SELECT'),
  'service_role_direct_roster_dml',
    has_table_privilege('service_role', 'public.roster_state', 'INSERT')
    or has_table_privilege('service_role', 'public.roster_state', 'UPDATE')
    or has_table_privilege('service_role', 'public.roster_state', 'DELETE')
    or has_table_privilege('service_role', 'public.roster_revisions', 'INSERT')
    or has_table_privilege('service_role', 'public.roster_revisions', 'UPDATE')
    or has_table_privilege('service_role', 'public.roster_revisions', 'DELETE'),
  'calendar_service_role_select',
    has_table_privilege('service_role', 'public.calendar_feeds', 'SELECT'),
  'migration_history_table',
    to_regclass('supabase_migrations.schema_migrations')::text
) as evidence;
`;
const safeEvidence = (await query(PRODUCTION, safeSql))[0].evidence;
assert(safeEvidence.capability.min === 4, "Minimum capability is not 4");
assert(safeEvidence.capability.max === 4, "Maximum capability is not 4");
assert(Number(safeEvidence.capability.rows) === 1, "Capability singleton is invalid");
assert(Number(safeEvidence.object_counts.roster_state) === 3, "State count changed");
assert(
  Number(safeEvidence.object_counts.roster_revisions) === 94,
  "Revision count changed",
);
assert(Number(safeEvidence.object_counts.calendar_feeds) === 1, "Calendar count changed");
assert(Number(safeEvidence.schema_counts.roster_state_schema4) === 3, "State schema-4 count changed");
assert(Number(safeEvidence.schema_counts.roster_state_non4) === 0, "Non-schema-4 state exists");
assert(Number(safeEvidence.schema_counts.roster_revisions_schema4) === 94, "History schema-4 count changed");
assert(Number(safeEvidence.schema_counts.roster_revisions_non4) === 0, "Non-schema-4 history exists");
assert(
  canonical(safeEvidence.triggers) ===
    canonical(["roster_revision_guard", "roster_state_guard", "roster_state_write_history"]),
  "Roster trigger set differs",
);
assert(safeEvidence.roster_rls_enabled, "Roster RLS is not enabled");
assert(!safeEvidence.anon_any_rpc_execute, "Anonymous RPC execute remains");
assert(safeEvidence.authenticated_all_rpc_execute, "Authenticated RPC execute missing");
assert(safeEvidence.service_role_roster_select, "Service-role roster SELECT missing");
assert(!safeEvidence.service_role_direct_roster_dml, "Service-role roster DML remains");
assert(safeEvidence.calendar_service_role_select, "Calendar service-role SELECT missing");
assert(safeEvidence.migration_history_table === null, "Migration history unexpectedly exists");

const functionsResponse = await management(`/v1/projects/${PRODUCTION}/functions`);
const calendarFunction = functionsResponse.find((item) => item.slug === "calendar-feed");
assert(calendarFunction?.status === "ACTIVE", "calendar-feed is not active");
assert(calendarFunction?.version === 2, "calendar-feed version changed");
assert(calendarFunction?.verify_jwt === false, "calendar-feed JWT setting changed");
assert(calendarFunction?.ezbr_sha256 === EXPECTED_EDGE_SHA, "calendar-feed hash changed");

const clientUrl = "https://rosterbot.work/js/51-cloud-sync.js";
const clientResponse = await fetch(clientUrl);
assert(clientResponse.ok, `Production client fetch failed: ${clientResponse.status}`);
const clientSource = await clientResponse.text();
assert(sha256(clientSource) === EXPECTED_CLIENT_SHA, "Production client hash changed");
assert(/new_schema_version\s*:\s*4\b/.test(clientSource), "Schema-4 write missing");
assert(!/new_schema_version\s*:\s*5\b/.test(clientSource), "Schema-5 write found");
const keyMatch = clientSource.match(/key\s*:\s*'([^']+)'/);
assert(keyMatch, "Hosted publishable key was not found");
const publishableKey = keyMatch[1];
assert(publishableKey.startsWith("sb_publishable_"), "Hosted key type changed");

const apiKeys = await management(`/v1/projects/${PRODUCTION}/api-keys`);
const anonymousKey = apiKeys.find(
  (item) => item.name === "anon" && item.type === "legacy",
)?.api_key;
assert(anonymousKey, "Legacy anonymous verification key is unavailable");

const rpcChecks = [];
for (const [rpc, malformedBody] of [
  [
    "save_roster_state",
    {
      expected_revision: null,
      new_schema_version: null,
      new_payload: null,
      new_client_id: null,
    },
  ],
  [
    "rotate_roster_encryption_wrappers",
    { expected_revision: null, new_payload: null, new_client_id: null },
  ],
  ["purge_unencrypted_roster_history", {}],
]) {
  const response = await fetch(
    `https://${PRODUCTION}.supabase.co/rest/v1/rpc/${rpc}`,
    {
      method: "POST",
      headers: {
        apikey: anonymousKey,
        Authorization: `Bearer ${anonymousKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(malformedBody),
    },
  );
  const body = await response.json().catch(() => ({}));
  rpcChecks.push({ rpc, http_status: response.status, code: body.code, message: body.message });
  assert(
    !response.ok && body.code === "42501",
    `${rpc} anonymous denial changed: HTTP ${response.status} ${body.code} ${body.message}`,
  );
}

const syntheticToken = "A".repeat(43);
const calendarUrl = `https://${PRODUCTION}.supabase.co/functions/v1/calendar-feed?t=${syntheticToken}`;
const [calendarGet, calendarOptions, calendarPost] = await Promise.all([
  fetch(calendarUrl),
  fetch(calendarUrl, { method: "OPTIONS" }),
  fetch(calendarUrl, { method: "POST" }),
]);
const calendarGetBody = await calendarGet.text();
const calendarPostBody = await calendarPost.text();
assert(calendarGet.status === 404 && calendarGetBody === "Not found", "Unknown calendar token behavior changed");
assert(calendarOptions.ok, "Calendar OPTIONS failed");
assert(calendarPost.status === 404 && calendarPostBody === "Not found", "Calendar method denial changed");

const functionDefinitionHashes = Object.fromEntries(
  productionFunctions.map((row) => [row.identity, sha256(`${row.definition}\n`)]),
);

console.log(
  JSON.stringify(
    {
      captured_at: new Date().toISOString(),
      mode: "read-only production verification; no payloads or user identifiers",
      production_identity: {
        ref: productionProject.ref,
        name: productionProject.name,
        region: productionProject.region,
        status: productionProject.status,
      },
      phase8c_staging_identity: {
        ref: stagingProject.ref,
        name: stagingProject.name,
        region: stagingProject.region,
        status: stagingProject.status,
      },
      catalog_comparison: catalogComparison,
      phase8a_unchanged_objects_match: true,
      function_definition_sha256: functionDefinitionHashes,
      safe_evidence: safeEvidence,
      production_client: {
        url: clientUrl,
        http_status: clientResponse.status,
        sha256: sha256(clientSource),
        writes_schema4: true,
        contains_schema5_wire: false,
      },
      anonymous_rpc_denials: rpcChecks,
      calendar_feed: {
        status: calendarFunction.status,
        version: calendarFunction.version,
        verify_jwt: calendarFunction.verify_jwt,
        ezbr_sha256: calendarFunction.ezbr_sha256,
        service_role_select: true,
        nonexistent_token_get_status: calendarGet.status,
        options_status: calendarOptions.status,
        rejected_post_status: calendarPost.status,
      },
    },
    null,
    2,
  ),
);

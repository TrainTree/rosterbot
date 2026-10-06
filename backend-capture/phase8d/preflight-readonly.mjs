#!/usr/bin/env node

import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const PRODUCTION_REF = "rithmbggiiusrmdcqrif";
const root = new URL("../phase8a/", import.meta.url);
const queryDir = new URL("./introspection/", root);
const catalogDir = new URL("./catalog/", root);
const queryFiles = [
  "object-inventory.sql",
  "table-details.sql",
  "function-details.sql",
  "privilege-details.sql",
  "column-privileges.sql",
  "default-privileges.sql",
  "write-path-search.sql",
  "schema-role-details.sql",
  "automation-inventory.sql",
];

const safeCountsQuery = `
select 'roster_state'::text as object_name, count(*)::bigint as row_count
from public.roster_state
union all
select 'roster_revisions', count(*)::bigint
from public.roster_revisions
union all
select 'calendar_feeds', count(*)::bigint
from public.calendar_feeds
order by object_name;
`;

const safeSchemaCountsQuery = `
select 'roster_state'::text as object_name,
       schema_version,
       count(*)::bigint as row_count
from public.roster_state
group by schema_version
union all
select 'roster_revisions', schema_version, count(*)::bigint
from public.roster_revisions
group by schema_version
order by object_name, schema_version;
`;

const capabilityQuery = `
select
  to_regclass('public.roster_schema_capability')::text as capability_table,
  to_regprocedure('public._validate_roster_payload(integer,jsonb,boolean)')::text
    as validator_function,
  exists (
    select 1
    from pg_catalog.pg_trigger t
    join pg_catalog.pg_class c on c.oid = t.tgrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'roster_state'
      and t.tgname = 'roster_state_guard'
      and not t.tgisinternal
  ) as state_guard_installed;
`;

const token = (
  await readFile(join(homedir(), ".supabase", "access-token"), "utf8")
).trim();
if (!token) throw new Error("Supabase CLI access token is unavailable");

async function managementRequest(path, options = {}) {
  const response = await fetch(`https://api.supabase.com${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(`${path}: HTTP ${response.status}: ${responseText}`);
  }
  return responseText ? JSON.parse(responseText) : null;
}

async function selectOnly(query, label) {
  if (!/^\s*(select|with)\b/i.test(query)) {
    throw new Error(`Refusing non-SELECT query: ${label}`);
  }
  return managementRequest(`/v1/projects/${PRODUCTION_REF}/database/query`, {
    method: "POST",
    body: JSON.stringify({ query }),
  });
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

const project = await managementRequest(`/v1/projects/${PRODUCTION_REF}`);
const identity = {
  id: project.id,
  ref: project.ref,
  name: project.name,
  status: project.status,
  region: project.region,
  created_at: project.created_at,
  database: project.database && {
    version: project.database.version,
    postgres_engine: project.database.postgres_engine,
    release_channel: project.database.release_channel,
  },
};
if (identity.ref !== PRODUCTION_REF || identity.id !== PRODUCTION_REF) {
  throw new Error(`Production identity mismatch: ${JSON.stringify(identity)}`);
}

const comparisons = [];
for (const queryFile of queryFiles) {
  const query = await readFile(new URL(queryFile, queryDir), "utf8");
  const expectedText = await readFile(
    new URL(queryFile.replace(/\.sql$/, ".json"), catalogDir),
    "utf8",
  );
  const expected = JSON.parse(expectedText);
  const current = await selectOnly(query, queryFile);
  const expectedCanonical = stableJson(expected);
  const currentCanonical = stableJson(current);
  comparisons.push({
    query_file: queryFile,
    expected_rows: expected.length,
    current_rows: current.length,
    phase8a_sha256: sha256(expectedCanonical),
    current_sha256: sha256(currentCanonical),
    matches_phase8a: currentCanonical === expectedCanonical,
  });
}

const [objectCounts, schemaCounts, capability] = await Promise.all([
  selectOnly(safeCountsQuery, "safe-object-counts.sql"),
  selectOnly(safeSchemaCountsQuery, "safe-schema-counts.sql"),
  selectOnly(capabilityQuery, "capability-presence.sql"),
]);

console.log(
  JSON.stringify(
    {
      captured_at: new Date().toISOString(),
      mode: "read-only Management API GETs and catalog/aggregate SELECTs",
      production_identity: identity,
      catalog_comparison: comparisons,
      all_catalog_captures_match_phase8a: comparisons.every(
        (item) => item.matches_phase8a,
      ),
      safe_aggregate_evidence: {
        object_counts: objectCounts,
        schema_version_counts: schemaCounts,
      },
      capability_presence: capability,
    },
    null,
    2,
  ),
);

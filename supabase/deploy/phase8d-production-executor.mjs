#!/usr/bin/env node

import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PRODUCTION = Object.freeze({
  ref: "rithmbggiiusrmdcqrif",
  name: "rosterBot-sync-dev",
  region: "ap-southeast-2",
});
const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "../..");
const actions = Object.freeze({
  apply: {
    confirmation: "APPLY_PHASE8B_TO_rithmbggiiusrmdcqrif",
    path: join(
      repoRoot,
      "supabase/migrations/20261005000100_phase8b_roster_downgrade_protection.sql",
    ),
    sha256: "5121623b8a18569d4af2da3eb6f1cb00253495ad8338e6c711c999d08896478e",
  },
  rollback: {
    confirmation: "ROLLBACK_PHASE8B_ON_rithmbggiiusrmdcqrif",
    path: join(
      repoRoot,
      "supabase/rollback/20261005000100_phase8b_roster_downgrade_protection.rollback.sql",
    ),
    sha256: "c0d946dd90f71167d3d3d46c7bbfb814a72fee6d1a1b1dbf25f6d3f8b7652d95",
  },
});
const phase8aFiles = [
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

const actionName = process.argv[2];
const action = actions[actionName];
if (!action) {
  throw new Error("Usage: phase8d-production-executor.mjs <apply|rollback>");
}
if (process.env.PHASE8D_PRODUCTION_CONFIRM !== action.confirmation) {
  throw new Error(
    `Refusing ${actionName}: PHASE8D_PRODUCTION_CONFIRM must equal ${action.confirmation}`,
  );
}

const sql = await readFile(action.path, "utf8");
const actualSha256 = crypto.createHash("sha256").update(sql).digest("hex");
if (actualSha256 !== action.sha256) {
  throw new Error(
    `Refusing ${actionName}: SQL checksum ${actualSha256} != ${action.sha256}`,
  );
}
if (!/^\s*--[\s\S]*?\bbegin\s*;/i.test(sql) || !/\bcommit\s*;\s*$/i.test(sql)) {
  throw new Error(`Refusing ${actionName}: SQL lacks explicit BEGIN/COMMIT`);
}

const token = (
  await readFile(join(homedir(), ".supabase", "access-token"), "utf8")
).trim();
if (!token) throw new Error("Supabase CLI access token is unavailable");

async function request(path, options = {}) {
  const response = await fetch(`https://api.supabase.com${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(`${path}: HTTP ${response.status}: ${responseText}`);
  }
  return responseText ? JSON.parse(responseText) : null;
}

async function query(queryText) {
  return request(`/v1/projects/${PRODUCTION.ref}/database/query`, {
    method: "POST",
    body: JSON.stringify({ query: queryText }),
  });
}

function canonical(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function assertPhase8aCatalog() {
  for (const file of phase8aFiles) {
    const queryText = await readFile(
      join(repoRoot, "backend-capture/phase8a/introspection", file),
      "utf8",
    );
    if (!/^\s*(select|with)\b/i.test(queryText)) {
      throw new Error(`Refusing non-SELECT preflight query: ${file}`);
    }
    const expected = JSON.parse(
      await readFile(
        join(
          repoRoot,
          "backend-capture/phase8a/catalog",
          file.replace(/\.sql$/, ".json"),
        ),
        "utf8",
      ),
    );
    const current = await query(queryText);
    if (canonical(current) !== canonical(expected)) {
      throw new Error(`Production drift from Phase 8A detected in ${file}`);
    }
  }
}

const project = await request(`/v1/projects/${PRODUCTION.ref}`);
if (
  project.id !== PRODUCTION.ref ||
  project.ref !== PRODUCTION.ref ||
  project.name !== PRODUCTION.name ||
  project.region !== PRODUCTION.region ||
  project.status !== "ACTIVE_HEALTHY"
) {
  throw new Error(`Production identity/health mismatch: ${JSON.stringify(project)}`);
}

if (actionName === "apply") {
  await assertPhase8aCatalog();
  const gate = await query(`
    select
      to_regclass('public.roster_schema_capability') is null as capability_absent,
      not exists (
        select 1 from public.roster_state where schema_version <> 4
      ) as all_current_schema4,
      not exists (
        select 1 from public.roster_revisions where schema_version <> 4
      ) as all_history_schema4;
  `);
  if (
    gate.length !== 1 ||
    !gate[0].capability_absent ||
    !gate[0].all_current_schema4 ||
    !gate[0].all_history_schema4
  ) {
    throw new Error(`Apply gate failed: ${JSON.stringify(gate)}`);
  }
} else {
  const gate = await query(`
    select
      (select count(*) = 1
       from public.roster_schema_capability
       where singleton = true
         and min_writable_schema = 4
         and max_writable_schema = 4) as capability_is_4,
      not exists (
        select 1 from public.roster_state where schema_version <> 4
      ) as all_current_schema4,
      not exists (
        select 1 from public.roster_revisions where schema_version <> 4
      ) as all_history_schema4;
  `);
  if (
    gate.length !== 1 ||
    !gate[0].capability_is_4 ||
    !gate[0].all_current_schema4 ||
    !gate[0].all_history_schema4
  ) {
    throw new Error(`Rollback gate failed: ${JSON.stringify(gate)}`);
  }
}

const result = await query(sql);

let postcondition;
if (actionName === "apply") {
  postcondition = await query(`
    select jsonb_build_object(
      'capability', (
        select jsonb_build_object(
          'min', min_writable_schema,
          'max', max_writable_schema
        )
        from public.roster_schema_capability
        where singleton = true
      ),
      'enabled_roster_triggers', (
        select count(*)
        from pg_catalog.pg_trigger t
        join pg_catalog.pg_class c on c.oid = t.tgrelid
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and c.relname in ('roster_state', 'roster_revisions')
          and not t.tgisinternal
          and t.tgenabled = 'O'
      ),
      'authenticated_all_rpc_execute',
        has_function_privilege(
          'authenticated',
          'public.save_roster_state(bigint,integer,jsonb,text)',
          'EXECUTE'
        ) and has_function_privilege(
          'authenticated',
          'public.rotate_roster_encryption_wrappers(bigint,jsonb,text)',
          'EXECUTE'
        ) and has_function_privilege(
          'authenticated',
          'public.purge_unencrypted_roster_history()',
          'EXECUTE'
        ),
      'anon_any_rpc_execute',
        has_function_privilege(
          'anon',
          'public.save_roster_state(bigint,integer,jsonb,text)',
          'EXECUTE'
        ) or has_function_privilege(
          'anon',
          'public.rotate_roster_encryption_wrappers(bigint,jsonb,text)',
          'EXECUTE'
        ) or has_function_privilege(
          'anon',
          'public.purge_unencrypted_roster_history()',
          'EXECUTE'
        ),
      'service_role_all_roster_select',
        has_table_privilege(
          'service_role', 'public.roster_state', 'SELECT'
        ) and has_table_privilege(
          'service_role', 'public.roster_revisions', 'SELECT'
        ),
      'service_role_any_direct_roster_dml',
        has_table_privilege(
          'service_role', 'public.roster_state', 'INSERT'
        ) or has_table_privilege(
          'service_role', 'public.roster_state', 'UPDATE'
        ) or has_table_privilege(
          'service_role', 'public.roster_state', 'DELETE'
        ) or has_table_privilege(
          'service_role', 'public.roster_revisions', 'INSERT'
        ) or has_table_privilege(
          'service_role', 'public.roster_revisions', 'UPDATE'
        ) or has_table_privilege(
          'service_role', 'public.roster_revisions', 'DELETE'
        )
    ) as phase8d_postcondition;
  `);
  const observed = postcondition?.[0]?.phase8d_postcondition;
  if (
    observed?.capability?.min !== 4 ||
    observed?.capability?.max !== 4 ||
    Number(observed?.enabled_roster_triggers) !== 3 ||
    observed?.authenticated_all_rpc_execute !== true ||
    observed?.anon_any_rpc_execute !== false ||
    observed?.service_role_all_roster_select !== true ||
    observed?.service_role_any_direct_roster_dml !== false
  ) {
    throw new Error(
      `Phase 8B committed but immediate verification failed: ${JSON.stringify(postcondition)}`,
    );
  }
} else {
  await assertPhase8aCatalog();
  postcondition = [{ phase8a_catalog_restored: true }];
}

console.log(
  JSON.stringify(
    {
      action: actionName,
      project: {
        ref: project.ref,
        name: project.name,
        region: project.region,
        status: project.status,
      },
      sql_file: action.path,
      sha256: actualSha256,
      management_api_result: result,
      postcondition,
      completed_at: new Date().toISOString(),
    },
    null,
    2,
  ),
);

# Phase 8A deployed-backend capture

Capture date: 2026-10-05 (Australia/Melbourne)

Target verified before inspection:

- Supabase project ref: `rithmbggiiusrmdcqrif`
- Supabase display name: `rosterBot-sync-dev`
- Region: `ap-southeast-2`
- Project status: `ACTIVE_HEALTHY`
- Database: PostgreSQL 17.6
- PostgREST: v14.5
- CLI: Supabase CLI 2.119.0 through `npx supabase@latest`

This capture was read-only against the deployed project. It contains no table
rows, user records, roster payloads, calendar content, raw feed tokens, access
tokens, service-role values, or other secret values.

## Files

- `public-schema.sql`: row-free, catalog-reconstructed SQL for all objects in
  the deployed `public` schema. The exact raw catalog evidence is under
  `catalog/`.
- `catalog/*.json`: sanitized results of catalog-only `SELECT` queries.
- `introspection/*.sql`: the exact read-only queries used to produce those
  JSON files.
- `capture-catalog.mjs`: the allowlisted local capture helper. It reads the
  existing Supabase CLI token from its standard credential file, never writes
  it, and accepts only query files beginning with `SELECT` or `WITH`.
- `edge-functions.json`: deployed Edge Function listing from production.
- `project.json` and `service-versions.json`: sanitized project identity and
  linked service version metadata.
- `migration-history.json`: linked CLI migration-list result.
- `backend-inventory.md`: audit conclusions and Phase 8B requirements.
- `../../supabase/functions/calendar-feed/index.ts`: source downloaded from
  deployed Edge Function `calendar-feed`, version 2, via
  `supabase functions download --use-api`.

## Schema-dump limitation

The required command was attempted:

```text
npx --yes supabase@latest db dump --linked --schema public \
  --file backend-capture/phase8a/public-schema.sql
```

The CLI authenticated, initialized its temporary login role, and reached the
dump stage, but then stopped before running `pg_dump` because this machine has
neither Docker nor Podman. Supabase CLI 2.119.0 reported:

```text
docker: command not found (podman also not found) — install Docker Desktop or Podman and ensure it is on PATH
```

No compatible native `pg_dump` was installed either. Rather than make a global
system change, the empty CLI-created file was replaced with a schema-only SQL
reconstruction from `pg_catalog`. The reconstruction contains the exact
captured table, constraint, index, trigger, function, RLS, ACL, owner, and
default-privilege definitions, but it is not byte-for-byte `pg_dump` output.

No capture SQL was executed against the database as DDL or DML.

-- Staging-only test setup. Never include this in the production migration.
update public.roster_schema_capability
set max_writable_schema = 5,
    updated_at = now()
where singleton = true;

select min_writable_schema, max_writable_schema
from public.roster_schema_capability
where singleton = true;

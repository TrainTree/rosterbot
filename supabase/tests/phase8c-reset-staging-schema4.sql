-- Return retained staging to the production-safe capability after Phase 8C.
update public.roster_schema_capability
set max_writable_schema = 4,
    updated_at = now()
where singleton = true;

select min_writable_schema, max_writable_schema
from public.roster_schema_capability
where singleton = true;

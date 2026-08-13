-- Grant PostgREST roles access to the data2dashboard schema.
-- ==========================================================================
-- Adding a schema to Dashboard > Settings > API > Exposed Schemas only
-- tells PostgREST it's allowed to *route* requests there — the underlying
-- Postgres roles (anon, authenticated) still need an explicit GRANT to
-- touch anything inside it, the same way Supabase pre-configures for the
-- built-in "public" schema but does not do automatically for a new custom
-- schema. Without this, every request fails with "permission denied for
-- schema data2dashboard" before RLS is even evaluated.
--
-- These grants are intentionally broad (all four operations, all tables)
-- because Row Level Security — already enabled on every table in the
-- previous migration — is what actually restricts rows per operation.
-- This mirrors exactly how Supabase configures the public schema itself.

grant usage on schema data2dashboard to anon, authenticated;

grant select, insert, update, delete
    on all tables in schema data2dashboard
    to anon, authenticated;

grant usage, select on all sequences in schema data2dashboard to anon, authenticated;

-- So future tables/sequences created in this schema (e.g. via a later
-- migration) get the same grants automatically, without needing to
-- remember to repeat this step.
alter default privileges in schema data2dashboard
    grant select, insert, update, delete on tables to anon, authenticated;

alter default privileges in schema data2dashboard
    grant usage, select on sequences to anon, authenticated;

window.D2D = window.D2D || {};

/**
 * Supabase client for Data2Dashboard.
 *
 * This project's Supabase instance ("KLINIK") also runs an unrelated
 * clinic system in the public schema — Data2Dashboard's tables all live
 * in a dedicated "data2dashboard" schema instead (see
 * supabase/migrations/20260813073328_init_schema.sql). Setting db.schema
 * below makes every D2D.supabase.from(...) call resolve there by default,
 * without touching public.profiles / public.visit.
 *
 * Only the publishable key belongs here — it is safe to ship to every
 * visitor's browser by design (Row Level Security is what actually
 * decides what it can read/write, not secrecy of this key). The
 * secret/service_role key must never appear in frontend code.
 */
D2D.supabaseConfig = {
    URL: 'https://fwnnkehmiahxtzunsgmc.supabase.co',
    PUBLISHABLE_KEY: 'sb_publishable_gs7DgCCVwodrqN8o4k9nmw_B9B6nfXR',
    SCHEMA: 'data2dashboard'
};

D2D.supabase = window.supabase.createClient(
    D2D.supabaseConfig.URL,
    D2D.supabaseConfig.PUBLISHABLE_KEY,
    { db: { schema: D2D.supabaseConfig.SCHEMA } }
);

-- Row Level Security: deny-by-default.
--
-- The application talks to Postgres only from the server (Drizzle, table-owner role),
-- and enforces authorization in code (see src/server/auth). The Supabase Data API
-- (PostgREST) must never expose these tables, so RLS is enabled on every table with
-- NO policies for the `anon` and `authenticated` roles. Any future client-side access
-- must add explicit, reviewed policies.
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
      EXECUTE format('REVOKE ALL ON public.%I FROM anon', t.tablename);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
      EXECUTE format('REVOKE ALL ON public.%I FROM authenticated', t.tablename);
    END IF;
  END LOOP;
END $$;

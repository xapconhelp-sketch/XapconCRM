-- ==============================================================================
-- SCHEMA: Directorio de Aseguradoras para Xapcon CRM
-- Ejecuta este script en el SQL Editor de tu panel de Supabase para habilitar
-- la persistencia en la nube del directorio maestro de aseguradoras.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.insurance_directory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  aliases JSONB DEFAULT '[]'::jsonb,
  emails JSONB DEFAULT '[]'::jsonb,
  phones JSONB DEFAULT '[]'::jsonb,
  notes TEXT DEFAULT '',
  portal_url TEXT DEFAULT '',
  website TEXT DEFAULT '',
  category VARCHAR(50) DEFAULT 'Nacional',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.insurance_directory ENABLE ROW LEVEL SECURITY;

-- Directory lookups support signed-in contractor forms. Only superadmins may
-- modify the shared directory; the UI check alone is not an authorization rule.
DO $$
DECLARE policy_row RECORD;
BEGIN
  FOR policy_row IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'insurance_directory'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.insurance_directory', policy_row.policyname);
  END LOOP;
END;
$$;

CREATE POLICY insurance_directory_authenticated_read
  ON public.insurance_directory FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY insurance_directory_superadmin_insert
  ON public.insurance_directory FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'
    )
  );

CREATE POLICY insurance_directory_superadmin_update
  ON public.insurance_directory FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'
    )
  );

CREATE POLICY insurance_directory_superadmin_delete
  ON public.insurance_directory FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'
    )
  );

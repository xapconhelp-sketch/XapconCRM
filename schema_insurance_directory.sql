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

-- Políticas de RLS:
-- 1. Permitir lectura a todos los usuarios (autenticados y anónimos)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'insurance_directory' AND policyname = 'Permitir lectura de directorio a todos'
  ) THEN
    CREATE POLICY "Permitir lectura de directorio a todos" 
      ON public.insurance_directory FOR SELECT USING (true);
  END IF;
END $$;

-- 2. Permitir inserción
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'insurance_directory' AND policyname = 'Permitir insercion en directorio'
  ) THEN
    CREATE POLICY "Permitir insercion en directorio" 
      ON public.insurance_directory FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- 3. Permitir actualización
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'insurance_directory' AND policyname = 'Permitir actualizacion en directorio'
  ) THEN
    CREATE POLICY "Permitir actualizacion en directorio" 
      ON public.insurance_directory FOR UPDATE USING (true);
  END IF;
END $$;

-- 4. Permitir eliminación
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'insurance_directory' AND policyname = 'Permitir eliminacion en directorio'
  ) THEN
    CREATE POLICY "Permitir eliminacion en directorio" 
      ON public.insurance_directory FOR DELETE USING (true);
  END IF;
END $$;

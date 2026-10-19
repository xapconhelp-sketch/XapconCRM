-- Membresías y privilegios operativos por empresa.
-- Compatible con la versión previa que guardaba homeowner_followup_enabled.
-- Las empresas actuales se inician en Pro; las nuevas quedan en Solo software.
BEGIN;

DROP TRIGGER IF EXISTS guard_xapcon_membership_privileges ON public.organizations;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS membership_plan TEXT NOT NULL DEFAULT 'pro';
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS insurance_calls_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS homeowner_followup_level TEXT;

ALTER TABLE public.organizations
  ALTER COLUMN membership_plan SET DEFAULT 'software_only';

-- Convert previous boolean settings when that first version was already applied.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'organizations'
      AND column_name = 'homeowner_followup_enabled'
  ) THEN
    EXECUTE $migration$
      UPDATE public.organizations
      SET homeowner_followup_level = CASE
        WHEN homeowner_followup_level IN ('none', 'partial', 'full') THEN homeowner_followup_level
        WHEN membership_plan = 'plus' AND homeowner_followup_enabled THEN 'full'
        WHEN membership_plan = 'pro' AND homeowner_followup_enabled THEN 'partial'
        ELSE 'none'
      END
      WHERE homeowner_followup_level IS NULL
    $migration$;
    ALTER TABLE public.organizations DROP COLUMN homeowner_followup_enabled;
  ELSE
    UPDATE public.organizations
    SET homeowner_followup_level = CASE
      WHEN membership_plan = 'plus' THEN 'full'
      WHEN membership_plan = 'pro' THEN 'partial'
      ELSE 'none'
    END
    WHERE homeowner_followup_level IS NULL;
  END IF;
END;
$$;

ALTER TABLE public.organizations
  ALTER COLUMN homeowner_followup_level SET DEFAULT 'none',
  ALTER COLUMN homeowner_followup_level SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.organizations'::regclass
      AND conname = 'organizations_membership_plan_valid'
  ) THEN
    ALTER TABLE public.organizations
      ADD CONSTRAINT organizations_membership_plan_valid
      CHECK (membership_plan IN ('software_only', 'pro', 'plus'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.organizations'::regclass
      AND conname = 'organizations_homeowner_followup_level_valid'
  ) THEN
    ALTER TABLE public.organizations
      ADD CONSTRAINT organizations_homeowner_followup_level_valid
      CHECK (homeowner_followup_level IN ('none', 'partial', 'full'));
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_xapcon_membership_privileges()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
    AND NOT public.is_xapcon_superadmin()
    AND (
      NEW.membership_plan IS DISTINCT FROM OLD.membership_plan
      OR NEW.insurance_calls_enabled IS DISTINCT FROM OLD.insurance_calls_enabled
      OR NEW.homeowner_followup_level IS DISTINCT FROM OLD.homeowner_followup_level
    ) THEN
    RAISE EXCEPTION 'Solo un superadministrador puede cambiar la membresía y los privilegios de una empresa.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER guard_xapcon_membership_privileges
BEFORE UPDATE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.guard_xapcon_membership_privileges();

COMMIT;

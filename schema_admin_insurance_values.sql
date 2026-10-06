-- Superadmin-only claim estimate, SOW, and supplement tracking.
-- One estimate is allowed per claim; SOWs and supplements are capped at four each.

CREATE TABLE IF NOT EXISTS public.admin_insurance_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL CHECK (record_type IN ('estimate', 'sow', 'supplement')),
  entry_number SMALLINT NOT NULL,
  amount NUMERIC(12, 2) CHECK (amount IS NULL OR amount >= 0),
  event_date DATE,
  estimate_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT admin_insurance_values_entry_range CHECK (
    (record_type = 'estimate' AND entry_number = 1)
    OR (record_type IN ('sow', 'supplement') AND entry_number BETWEEN 1 AND 4)
  ),
  CONSTRAINT admin_insurance_values_estimate_flag CHECK (
    record_type = 'estimate' OR estimate_sent = false
  ),
  CONSTRAINT admin_insurance_values_unique_entry UNIQUE (lead_id, record_type, entry_number)
);

CREATE INDEX IF NOT EXISTS idx_admin_insurance_values_org_lead
  ON public.admin_insurance_values (organization_id, lead_id);

CREATE OR REPLACE FUNCTION public.can_manage_admin_insurance_values(
  target_lead UUID,
  target_org UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.profiles AS profile
      JOIN public.leads AS claim
        ON claim.id = target_lead
       AND claim.organization_id = target_org
       AND claim.is_insurance_claim IS TRUE
      WHERE profile.id = auth.uid()
        AND profile.role = 'super_admin'
    );
$$;

REVOKE ALL ON FUNCTION public.can_manage_admin_insurance_values(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_admin_insurance_values(UUID, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.touch_admin_insurance_values_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  IF TG_OP = 'INSERT' THEN
    NEW.created_by = auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS admin_insurance_values_touch_updated_at ON public.admin_insurance_values;
CREATE TRIGGER admin_insurance_values_touch_updated_at
BEFORE INSERT OR UPDATE ON public.admin_insurance_values
FOR EACH ROW EXECUTE FUNCTION public.touch_admin_insurance_values_updated_at();

ALTER TABLE public.admin_insurance_values ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_insurance_values TO authenticated;

DROP POLICY IF EXISTS admin_insurance_values_superadmin_access ON public.admin_insurance_values;
CREATE POLICY admin_insurance_values_superadmin_access
ON public.admin_insurance_values
FOR ALL TO authenticated
USING (public.can_manage_admin_insurance_values(lead_id, organization_id))
WITH CHECK (public.can_manage_admin_insurance_values(lead_id, organization_id));

NOTIFY pgrst, 'reload schema';

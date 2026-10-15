-- Superadmin-only case follow-up metadata for insurance claims.
-- Run once in the Supabase SQL Editor before using the new panel.

CREATE TABLE IF NOT EXISTS public.admin_claim_activity (
  lead_id UUID PRIMARY KEY REFERENCES public.leads(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  last_insurance_response_at DATE,
  last_documents_sent_at DATE,
  sent_document_types TEXT[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT admin_claim_activity_document_types_valid CHECK (
    sent_document_types <@ ARRAY[
      'Suplemento', 'Estimado', 'LOR', 'Cont. Paneles',
      'Foto Reporte', 'Inv. Final', 'COC', 'W9'
    ]::TEXT[]
  )
);

CREATE INDEX IF NOT EXISTS idx_admin_claim_activity_org
  ON public.admin_claim_activity (organization_id);

CREATE OR REPLACE FUNCTION public.can_manage_admin_claim_activity(
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

REVOKE ALL ON FUNCTION public.can_manage_admin_claim_activity(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_admin_claim_activity(UUID, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.touch_admin_claim_activity_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS admin_claim_activity_touch_updated_at ON public.admin_claim_activity;
CREATE TRIGGER admin_claim_activity_touch_updated_at
BEFORE INSERT OR UPDATE ON public.admin_claim_activity
FOR EACH ROW EXECUTE FUNCTION public.touch_admin_claim_activity_updated_at();

ALTER TABLE public.admin_claim_activity ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_claim_activity TO authenticated;

DROP POLICY IF EXISTS admin_claim_activity_superadmin_access ON public.admin_claim_activity;
CREATE POLICY admin_claim_activity_superadmin_access
ON public.admin_claim_activity
FOR ALL TO authenticated
USING (public.can_manage_admin_claim_activity(lead_id, organization_id))
WITH CHECK (public.can_manage_admin_claim_activity(lead_id, organization_id));

NOTIFY pgrst, 'reload schema';

-- Superadmin-only homeowner service contact history and follow-up alerts.
-- Run once in the Supabase SQL Editor to enable persistence.

CREATE TABLE IF NOT EXISTS public.admin_homeowner_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  contacted_at DATE NOT NULL DEFAULT CURRENT_DATE,
  channels TEXT[] NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT admin_homeowner_contacts_channels_valid CHECK (
    cardinality(channels) > 0
    AND channels <@ ARRAY['call', 'email', 'sms']::TEXT[]
  ),
  CONSTRAINT admin_homeowner_contacts_note_length CHECK (char_length(note) <= 2000)
);

CREATE INDEX IF NOT EXISTS idx_admin_homeowner_contacts_lead_date
  ON public.admin_homeowner_contacts (lead_id, contacted_at DESC, created_at DESC);

CREATE OR REPLACE FUNCTION public.can_manage_admin_homeowner_contacts(
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

REVOKE ALL ON FUNCTION public.can_manage_admin_homeowner_contacts(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_admin_homeowner_contacts(UUID, UUID) TO authenticated;

ALTER TABLE public.admin_homeowner_contacts ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_homeowner_contacts TO authenticated;

DROP POLICY IF EXISTS admin_homeowner_contacts_superadmin_access ON public.admin_homeowner_contacts;
CREATE POLICY admin_homeowner_contacts_superadmin_access
ON public.admin_homeowner_contacts
FOR ALL TO authenticated
USING (public.can_manage_admin_homeowner_contacts(lead_id, organization_id))
WITH CHECK (public.can_manage_admin_homeowner_contacts(lead_id, organization_id));

NOTIFY pgrst, 'reload schema';

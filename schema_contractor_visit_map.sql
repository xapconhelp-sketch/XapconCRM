-- Apply after schema_auth_membership_complete.sql.
CREATE TABLE IF NOT EXISTS public.contractor_case_locations (
  case_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  address_snapshot TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -85 AND 85),
  longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  PRIMARY KEY (case_id, organization_id)
);

CREATE INDEX IF NOT EXISTS contractor_case_locations_org_idx
  ON public.contractor_case_locations (organization_id, case_id);

ALTER TABLE public.contractor_case_locations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.contractor_case_locations FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.contractor_case_locations TO authenticated;

DROP POLICY IF EXISTS contractor_case_locations_access ON public.contractor_case_locations;
CREATE POLICY contractor_case_locations_access
  ON public.contractor_case_locations FOR ALL TO authenticated
  USING (
    NOT public.is_xapcon_superadmin()
    AND public.has_xapcon_org_membership(organization_id)
    AND EXISTS (
      SELECT 1 FROM public.leads AS lead
      WHERE lead.id = case_id AND lead.organization_id = contractor_case_locations.organization_id
    )
  )
  WITH CHECK (
    NOT public.is_xapcon_superadmin()
    AND public.has_xapcon_org_membership(organization_id)
    AND EXISTS (
      SELECT 1 FROM public.leads AS lead
      WHERE lead.id = case_id AND lead.organization_id = contractor_case_locations.organization_id
        AND coalesce(btrim(lead.address), '') = address_snapshot
    )
  );

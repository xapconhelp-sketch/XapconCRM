-- Contractor-only claim financials. This data is deliberately separate from
-- leads.estimate.cashData, which remains the superadmin's existing workflow.

CREATE OR REPLACE FUNCTION public.can_manage_contractor_claim_finances(
  target_claim UUID,
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
      JOIN public.user_organizations AS membership
        ON membership.user_id = profile.id
      JOIN public.leads AS claim
        ON claim.id = target_claim
       AND claim.organization_id = target_org
      WHERE profile.id = auth.uid()
        AND profile.role <> 'super_admin'
        AND membership.organization_id = target_org
    );
$$;

REVOKE ALL ON FUNCTION public.can_manage_contractor_claim_finances(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_contractor_claim_finances(UUID, UUID) TO authenticated;

CREATE TABLE IF NOT EXISTS public.contractor_claim_financials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL UNIQUE REFERENCES public.leads(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  rcv NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (rcv >= 0),
  acv NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (acv >= 0),
  deductible NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (deductible >= 0),
  recoverable_depreciation NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (recoverable_depreciation >= 0),
  non_recoverable_depreciation NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (non_recoverable_depreciation >= 0),
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT contractor_claim_financials_org_claim_unique UNIQUE (claim_id, organization_id)
);

CREATE TABLE IF NOT EXISTS public.contractor_claim_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('first_check', 'second_check', 'depreciation', 'deductible', 'supplement', 'other')),
  payer_type TEXT NOT NULL CHECK (payer_type IN ('insurance', 'homeowner', 'other')),
  status TEXT NOT NULL DEFAULT 'expected' CHECK (status IN ('expected', 'received')),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  expected_date DATE,
  received_date DATE,
  reference TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT contractor_payment_received_has_date CHECK (status <> 'received' OR received_date IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_contractor_claim_financials_org ON public.contractor_claim_financials(organization_id);
CREATE INDEX IF NOT EXISTS idx_contractor_claim_payments_claim_due ON public.contractor_claim_payments(claim_id, status, expected_date);
CREATE INDEX IF NOT EXISTS idx_contractor_claim_payments_org ON public.contractor_claim_payments(organization_id);

CREATE OR REPLACE FUNCTION public.touch_contractor_finance_updated_at()
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

DROP TRIGGER IF EXISTS contractor_claim_financials_touch_updated_at ON public.contractor_claim_financials;
CREATE TRIGGER contractor_claim_financials_touch_updated_at
BEFORE UPDATE ON public.contractor_claim_financials
FOR EACH ROW EXECUTE FUNCTION public.touch_contractor_finance_updated_at();

DROP TRIGGER IF EXISTS contractor_claim_payments_touch_updated_at ON public.contractor_claim_payments;
CREATE TRIGGER contractor_claim_payments_touch_updated_at
BEFORE UPDATE ON public.contractor_claim_payments
FOR EACH ROW EXECUTE FUNCTION public.touch_contractor_finance_updated_at();

ALTER TABLE public.contractor_claim_financials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_claim_payments ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contractor_claim_financials TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contractor_claim_payments TO authenticated;

DROP POLICY IF EXISTS contractor_claim_financials_org_access ON public.contractor_claim_financials;
CREATE POLICY contractor_claim_financials_org_access
ON public.contractor_claim_financials
FOR ALL TO authenticated
USING (public.can_manage_contractor_claim_finances(claim_id, organization_id))
WITH CHECK (public.can_manage_contractor_claim_finances(claim_id, organization_id));

DROP POLICY IF EXISTS contractor_claim_payments_org_access ON public.contractor_claim_payments;
CREATE POLICY contractor_claim_payments_org_access
ON public.contractor_claim_payments
FOR ALL TO authenticated
USING (public.can_manage_contractor_claim_finances(claim_id, organization_id))
WITH CHECK (public.can_manage_contractor_claim_finances(claim_id, organization_id));

NOTIFY pgrst, 'reload schema';

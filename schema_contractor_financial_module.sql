-- Persistent contractor claim-finance fields, supplements, payments, receipts, and job costs.
-- Commission settings and payouts remain client-side by product decision.

ALTER TABLE public.contractor_claim_financials
  ADD COLUMN IF NOT EXISTS retail_upgrades NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (retail_upgrades >= 0),
  ADD COLUMN IF NOT EXISTS op_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (op_amount >= 0),
  ADD COLUMN IF NOT EXISTS total_squares NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (total_squares >= 0),
  ADD COLUMN IF NOT EXISTS approval_date DATE,
  ADD COLUMN IF NOT EXISTS construction_date DATE,
  ADD COLUMN IF NOT EXISTS depreciation_release_date DATE,
  ADD COLUMN IF NOT EXISTS contract_signed_date DATE,
  ADD COLUMN IF NOT EXISTS coc_sent_date DATE;

ALTER TABLE public.contractor_claim_payments
  ADD COLUMN IF NOT EXISTS mortgage_endorsement BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS mortgage_company TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS receipt_path TEXT,
  ADD COLUMN IF NOT EXISTS receipt_name TEXT;

ALTER TABLE public.contractor_claim_payments
  DROP CONSTRAINT IF EXISTS contractor_claim_payments_status_check,
  ADD CONSTRAINT contractor_claim_payments_status_check
    CHECK (status IN ('expected', 'in_transit', 'held_by_mortgage', 'received', 'deposited', 'rejected'));

CREATE TABLE IF NOT EXISTS public.contractor_claim_supplements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  requested_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (requested_amount >= 0),
  approved_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (approved_amount >= 0),
  submitted_date DATE,
  approval_date DATE,
  fee_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (fee_amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT contractor_claim_supplements_org_claim_unique UNIQUE (id, claim_id, organization_id)
);

CREATE TABLE IF NOT EXISTS public.contractor_claim_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT '',
  vendor TEXT NOT NULL DEFAULT '',
  invoice_number TEXT NOT NULL DEFAULT '',
  amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  is_return_credit BOOLEAN NOT NULL DEFAULT FALSE,
  is_paid BOOLEAN NOT NULL DEFAULT FALSE,
  paid_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT contractor_claim_costs_org_claim_unique UNIQUE (id, claim_id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_contractor_claim_supplements_claim ON public.contractor_claim_supplements(claim_id, organization_id, created_at);
CREATE INDEX IF NOT EXISTS idx_contractor_claim_costs_claim ON public.contractor_claim_costs(claim_id, organization_id, created_at);

DROP TRIGGER IF EXISTS contractor_claim_supplements_touch_updated_at ON public.contractor_claim_supplements;
CREATE TRIGGER contractor_claim_supplements_touch_updated_at
BEFORE INSERT OR UPDATE ON public.contractor_claim_supplements
FOR EACH ROW EXECUTE FUNCTION public.touch_contractor_finance_updated_at();

DROP TRIGGER IF EXISTS contractor_claim_costs_touch_updated_at ON public.contractor_claim_costs;
CREATE TRIGGER contractor_claim_costs_touch_updated_at
BEFORE INSERT OR UPDATE ON public.contractor_claim_costs
FOR EACH ROW EXECUTE FUNCTION public.touch_contractor_finance_updated_at();

ALTER TABLE public.contractor_claim_supplements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_claim_costs ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contractor_claim_supplements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contractor_claim_costs TO authenticated;

DROP POLICY IF EXISTS contractor_claim_supplements_org_access ON public.contractor_claim_supplements;
CREATE POLICY contractor_claim_supplements_org_access ON public.contractor_claim_supplements
FOR ALL TO authenticated
USING (public.can_manage_contractor_claim_finances(claim_id, organization_id))
WITH CHECK (public.can_manage_contractor_claim_finances(claim_id, organization_id));

DROP POLICY IF EXISTS contractor_claim_costs_org_access ON public.contractor_claim_costs;
CREATE POLICY contractor_claim_costs_org_access ON public.contractor_claim_costs
FOR ALL TO authenticated
USING (public.can_manage_contractor_claim_finances(claim_id, organization_id))
WITH CHECK (public.can_manage_contractor_claim_finances(claim_id, organization_id));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('contractor-payment-receipts', 'contractor-payment-receipts', FALSE, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png']::TEXT[])
ON CONFLICT (id) DO UPDATE
SET public = FALSE,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png']::TEXT[];

NOTIFY pgrst, 'reload schema';

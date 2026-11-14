-- Add private invoice attachments to contractor direct-cost records.
-- Run after schema_contractor_financial_module.sql and
-- schema_contractor_payment_receipts.sql.

ALTER TABLE public.contractor_claim_costs
  ADD COLUMN IF NOT EXISTS invoice_path TEXT,
  ADD COLUMN IF NOT EXISTS invoice_name TEXT;

-- The existing private receipt bucket and organization-scoped storage policy
-- are reused. Cost invoices use the same organization/claim/row UUID path.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'contractor-payment-receipts',
  'contractor-payment-receipts',
  FALSE,
  10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/png']::TEXT[]
)
ON CONFLICT (id) DO UPDATE
SET public = FALSE,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png']::TEXT[];

NOTIFY pgrst, 'reload schema';

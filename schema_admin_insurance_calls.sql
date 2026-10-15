-- Extend the superadmin claim history with outbound calls to insurers/adjusters.
-- Run once in the Supabase SQL Editor after schema_admin_claim_records.sql.

ALTER TABLE public.admin_claim_records
  DROP CONSTRAINT IF EXISTS admin_claim_records_record_type_check;

ALTER TABLE public.admin_claim_records
  ADD CONSTRAINT admin_claim_records_record_type_check
  CHECK (record_type IN ('documents_sent', 'insurance_response', 'insurance_call'));

ALTER TABLE public.admin_claim_records
  DROP CONSTRAINT IF EXISTS admin_claim_records_type_payload_valid;

ALTER TABLE public.admin_claim_records
  ADD CONSTRAINT admin_claim_records_type_payload_valid
  CHECK (
    (record_type = 'documents_sent' AND cardinality(document_types) > 0)
    OR (record_type IN ('insurance_response', 'insurance_call') AND cardinality(document_types) = 0)
  );

NOTIFY pgrst, 'reload schema';

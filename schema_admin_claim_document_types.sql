-- Allow the added document types in both the detailed history and its latest-value summary.
-- Run once in the Supabase SQL Editor. Safe to rerun.

BEGIN;

ALTER TABLE public.admin_claim_records
  DROP CONSTRAINT IF EXISTS admin_claim_records_document_types_valid;

ALTER TABLE public.admin_claim_records
  ADD CONSTRAINT admin_claim_records_document_types_valid
  CHECK (
    document_types <@ ARRAY[
      'Suplemento', 'Estimado', 'LOR', 'Cont. Paneles',
      'Foto Reporte', 'Inv. Final', 'COC', 'W9',
      'Carta', 'ITEL', 'Fabricante'
    ]::TEXT[]
  );

ALTER TABLE public.admin_claim_activity
  DROP CONSTRAINT IF EXISTS admin_claim_activity_document_types_valid;

ALTER TABLE public.admin_claim_activity
  ADD CONSTRAINT admin_claim_activity_document_types_valid
  CHECK (
    sent_document_types <@ ARRAY[
      'Suplemento', 'Estimado', 'LOR', 'Cont. Paneles',
      'Foto Reporte', 'Inv. Final', 'COC', 'W9',
      'Carta', 'ITEL', 'Fabricante'
    ]::TEXT[]
  );

NOTIFY pgrst, 'reload schema';

COMMIT;

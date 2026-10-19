-- Superadmin-only history for sent documents and insurer responses.
-- Run once in the Supabase SQL Editor before using the Registros submenus.

CREATE TABLE IF NOT EXISTS public.admin_claim_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL CHECK (record_type IN ('documents_sent', 'insurance_response', 'insurance_call')),
  recorded_at DATE NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  document_types TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT admin_claim_records_note_length CHECK (char_length(note) <= 2000),
  CONSTRAINT admin_claim_records_document_types_valid CHECK (
    document_types <@ ARRAY[
      'Suplemento', 'Estimado', 'LOR', 'Cont. Paneles',
      'Foto Reporte', 'Inv. Final', 'COC', 'W9',
      'Carta', 'ITEL', 'Fabricante'
    ]::TEXT[]
  ),
  CONSTRAINT admin_claim_records_type_payload_valid CHECK (
    (record_type = 'documents_sent' AND cardinality(document_types) > 0)
    OR (record_type IN ('insurance_response', 'insurance_call') AND cardinality(document_types) = 0)
  )
);

CREATE INDEX IF NOT EXISTS idx_admin_claim_records_lead_date
  ON public.admin_claim_records (lead_id, recorded_at DESC, created_at DESC);

ALTER TABLE public.admin_claim_records ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_claim_records TO authenticated;

DROP POLICY IF EXISTS admin_claim_records_superadmin_access ON public.admin_claim_records;
CREATE POLICY admin_claim_records_superadmin_access
ON public.admin_claim_records
FOR ALL TO authenticated
USING (public.can_manage_admin_claim_activity(lead_id, organization_id))
WITH CHECK (public.can_manage_admin_claim_activity(lead_id, organization_id));

-- Preserve the latest values already saved in admin_claim_activity as initial history rows.
INSERT INTO public.admin_claim_records (
  lead_id, organization_id, record_type, recorded_at, document_types
)
SELECT
  activity.lead_id,
  activity.organization_id,
  'documents_sent',
  activity.last_documents_sent_at,
  activity.sent_document_types
FROM public.admin_claim_activity AS activity
WHERE activity.last_documents_sent_at IS NOT NULL
  AND cardinality(activity.sent_document_types) > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.admin_claim_records AS existing
    WHERE existing.lead_id = activity.lead_id
      AND existing.record_type = 'documents_sent'
      AND existing.recorded_at = activity.last_documents_sent_at
  );

INSERT INTO public.admin_claim_records (
  lead_id, organization_id, record_type, recorded_at
)
SELECT
  activity.lead_id,
  activity.organization_id,
  'insurance_response',
  activity.last_insurance_response_at
FROM public.admin_claim_activity AS activity
WHERE activity.last_insurance_response_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.admin_claim_records AS existing
    WHERE existing.lead_id = activity.lead_id
      AND existing.record_type = 'insurance_response'
      AND existing.recorded_at = activity.last_insurance_response_at
  );

NOTIFY pgrst, 'reload schema';

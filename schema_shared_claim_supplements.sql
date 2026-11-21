-- Shared supplement records for contractor and superadmin claim views.
-- Run after schema_contractor_financial_module.sql,
-- schema_superadmin_claim_finances_access.sql, and schema_admin_insurance_values.sql.

ALTER TABLE public.contractor_claim_supplements
  ADD COLUMN IF NOT EXISTS entry_number SMALLINT,
  ADD COLUMN IF NOT EXISTS source_admin_value_id UUID REFERENCES public.admin_insurance_values(id) ON DELETE SET NULL;

WITH numbered AS (
  SELECT id, row_number() OVER (PARTITION BY claim_id ORDER BY created_at, id)::SMALLINT AS entry_number
  FROM public.contractor_claim_supplements
  WHERE entry_number IS NULL
)
UPDATE public.contractor_claim_supplements AS supplement
SET entry_number = numbered.entry_number
FROM numbered
WHERE supplement.id = numbered.id;

ALTER TABLE public.contractor_claim_supplements
  ALTER COLUMN entry_number SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS contractor_claim_supplements_claim_entry_unique
  ON public.contractor_claim_supplements (claim_id, entry_number);

CREATE UNIQUE INDEX IF NOT EXISTS contractor_claim_supplements_admin_source_unique
  ON public.contractor_claim_supplements (source_admin_value_id)
  WHERE source_admin_value_id IS NOT NULL;

-- Carry legacy superadmin-only supplement values into the shared table once.
WITH legacy AS (
  SELECT value.id, value.lead_id, value.organization_id, value.amount, value.event_date,
         (COALESCE((SELECT max(existing.entry_number)
                    FROM public.contractor_claim_supplements AS existing
                    WHERE existing.claim_id = value.lead_id), 0)
          + row_number() OVER (PARTITION BY value.lead_id ORDER BY value.entry_number))::SMALLINT AS entry_number
  FROM public.admin_insurance_values AS value
  WHERE value.record_type = 'supplement'
    AND NOT EXISTS (
      SELECT 1 FROM public.contractor_claim_supplements AS existing
      WHERE existing.source_admin_value_id = value.id
    )
)
INSERT INTO public.contractor_claim_supplements (
  claim_id, organization_id, entry_number, requested_amount, approved_amount,
  submitted_date, approval_date, fee_amount, source_admin_value_id
)
SELECT id_lead.lead_id, id_lead.organization_id, id_lead.entry_number,
       0, COALESCE(id_lead.amount, 0), NULL, id_lead.event_date, 0, id_lead.id
FROM legacy AS id_lead
ON CONFLICT (claim_id, entry_number) DO NOTHING;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'contractor_claim_supplements'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.contractor_claim_supplements;
  END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';

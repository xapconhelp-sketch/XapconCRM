-- Apply after schema_admin_insurance_values.sql and schema_shared_claim_supplements.sql.
BEGIN;

ALTER TABLE public.admin_insurance_values
  DROP CONSTRAINT admin_insurance_values_entry_range,
  ADD CONSTRAINT admin_insurance_values_entry_range CHECK (
    (record_type = 'estimate' AND entry_number = 1)
    OR (record_type = 'sow' AND entry_number BETWEEN 1 AND 5)
    OR (record_type = 'supplement' AND entry_number BETWEEN 1 AND 4)
  );

DROP POLICY IF EXISTS admin_insurance_values_shared_sow ON public.admin_insurance_values;
CREATE POLICY admin_insurance_values_shared_sow ON public.admin_insurance_values
FOR ALL TO authenticated
USING (record_type = 'sow' AND public.can_manage_contractor_claim_finances(lead_id, organization_id))
WITH CHECK (record_type = 'sow' AND public.can_manage_contractor_claim_finances(lead_id, organization_id));

-- Keep previously imported admin supplements private without deleting records.
DROP POLICY IF EXISTS contractor_claim_supplements_private_admin_imports ON public.contractor_claim_supplements;
CREATE POLICY contractor_claim_supplements_private_admin_imports ON public.contractor_claim_supplements
AS RESTRICTIVE FOR ALL TO authenticated
USING (source_admin_value_id IS NULL OR public.can_manage_admin_insurance_values(claim_id, organization_id))
WITH CHECK (source_admin_value_id IS NULL OR public.can_manage_admin_insurance_values(claim_id, organization_id));

COMMIT;
NOTIFY pgrst, 'reload schema';

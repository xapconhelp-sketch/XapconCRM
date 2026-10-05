-- Private, organization-scoped receipts attached to contractor payment rows.
-- Run after schema_contractor_claim_finances.sql in Supabase.

ALTER TABLE public.contractor_claim_payments
  ADD COLUMN IF NOT EXISTS receipt_path TEXT,
  ADD COLUMN IF NOT EXISTS receipt_name TEXT;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'contractor-payment-receipts',
  'contractor-payment-receipts',
  FALSE,
  10485760,
  ARRAY['application/pdf', 'image/jpeg']::TEXT[]
)
ON CONFLICT (id) DO UPDATE
SET public = FALSE,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['application/pdf', 'image/jpeg']::TEXT[];

CREATE OR REPLACE FUNCTION public.can_manage_contractor_payment_receipt(object_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, storage, auth
AS $$
DECLARE
  path_parts TEXT[];
  uuid_pattern CONSTANT TEXT := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
BEGIN
  path_parts := storage.foldername(object_name);
  IF COALESCE(array_length(path_parts, 1), 0) <> 3
    OR path_parts[1] !~* uuid_pattern
    OR path_parts[2] !~* uuid_pattern
    OR path_parts[3] !~* uuid_pattern THEN
    RETURN FALSE;
  END IF;

  RETURN public.can_manage_contractor_claim_finances(path_parts[2]::UUID, path_parts[1]::UUID);
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$;

REVOKE ALL ON FUNCTION public.can_manage_contractor_payment_receipt(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_contractor_payment_receipt(TEXT) TO authenticated;

DROP POLICY IF EXISTS contractor_payment_receipts_org_access ON storage.objects;
CREATE POLICY contractor_payment_receipts_org_access
ON storage.objects
FOR ALL TO authenticated
USING (
  bucket_id = 'contractor-payment-receipts'
  AND public.can_manage_contractor_payment_receipt(name)
)
WITH CHECK (
  bucket_id = 'contractor-payment-receipts'
  AND public.can_manage_contractor_payment_receipt(name)
);

NOTIFY pgrst, 'reload schema';

-- Company-specific defaults for NEW retail estimates. Existing estimates are unchanged.
BEGIN;
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS retail_tax_rate NUMERIC(7,6) NOT NULL DEFAULT 0.0825 CHECK (retail_tax_rate BETWEEN 0 AND 1),
  ADD COLUMN IF NOT EXISTS retail_default_fee NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (retail_default_fee >= 0);
NOTIFY pgrst, 'reload schema';
COMMIT;

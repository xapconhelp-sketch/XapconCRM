-- Store insurer observations separately from homeowner notes on insurance claims.
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS insurance_notes text;

-- The security hardening migration grants UPDATE column by column. Because this
-- column was added later, grant authenticated users permission to update it.
GRANT UPDATE (insurance_notes) ON public.leads TO authenticated;

NOTIFY pgrst, 'reload schema';

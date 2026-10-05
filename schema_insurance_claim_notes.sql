-- Store insurer observations separately from homeowner notes on insurance claims.
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS insurance_notes text;

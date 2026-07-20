-- Run this SQL in your Supabase SQL Editor to add the contractor company fields to public.profiles.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_email VARCHAR(255);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_website VARCHAR(255);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS registration_number VARCHAR(100);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS license_number VARCHAR(100);

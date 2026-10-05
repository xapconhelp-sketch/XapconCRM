-- Per-organization identity used by contractor retail estimate PDFs.
-- Run this migration in Supabase before deploying the application changes.

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS company_email TEXT,
  ADD COLUMN IF NOT EXISTS company_phone TEXT,
  ADD COLUMN IF NOT EXISTS company_address TEXT,
  ADD COLUMN IF NOT EXISTS company_website TEXT,
  ADD COLUMN IF NOT EXISTS registration_number TEXT,
  ADD COLUMN IF NOT EXISTS license_number TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS brand_primary_color TEXT NOT NULL DEFAULT '#17314A',
  ADD COLUMN IF NOT EXISTS brand_accent_color TEXT NOT NULL DEFAULT '#B77A4B';

-- Preserve company contact and credential details that were previously stored
-- on the owner's profile. Personal profile photos are intentionally not copied
-- into the organization logo field.
WITH owner_details AS (
  SELECT DISTINCT ON (organization_id)
    organization_id,
    company_email,
    company_website,
    registration_number,
    license_number
  FROM public.profiles
  WHERE organization_id IS NOT NULL
    AND role IN ('Dueño', 'owner')
  ORDER BY organization_id, created_at ASC
)
UPDATE public.organizations AS organization
SET
  company_email = COALESCE(organization.company_email, owner_details.company_email),
  company_website = COALESCE(organization.company_website, owner_details.company_website),
  registration_number = COALESCE(organization.registration_number, owner_details.registration_number),
  license_number = COALESCE(organization.license_number, owner_details.license_number)
FROM owner_details
WHERE owner_details.organization_id = organization.id;

NOTIFY pgrst, 'reload schema';

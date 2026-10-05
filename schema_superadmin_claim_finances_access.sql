-- Run this once in the Supabase SQL Editor to enable the shared claim-finances
-- module for superadmins while keeping contractor access organization-scoped.
CREATE OR REPLACE FUNCTION public.can_manage_contractor_claim_finances(
  target_claim UUID,
  target_org UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.profiles AS profile
      JOIN public.leads AS claim
        ON claim.id = target_claim
       AND claim.organization_id = target_org
      WHERE profile.id = auth.uid()
        AND (
          profile.role = 'super_admin'
          OR (
            profile.role <> 'super_admin'
            AND EXISTS (
              SELECT 1
              FROM public.user_organizations AS membership
              WHERE membership.user_id = profile.id
                AND membership.organization_id = target_org
            )
          )
        )
    );
$$;

NOTIFY pgrst, 'reload schema';

-- Tenant isolation for the CRM's existing Supabase tables.
-- Run after the base schema has created leads, profiles, organizations, and
-- user_organizations. The app treats profiles.role='super_admin' as the
-- platform administrator role.

CREATE TABLE IF NOT EXISTS public.user_invitations (
  email TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'owner', 'employee')),
  job_title TEXT,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  company_email TEXT,
  company_website TEXT,
  registration_number TEXT,
  license_number TEXT,
  invited_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id);
ALTER TABLE public.organizations
  ALTER COLUMN created_by SET DEFAULT auth.uid();
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS job_title TEXT;

CREATE OR REPLACE FUNCTION public.is_xapcon_superadmin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.has_xapcon_org_membership(target_org UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT target_org IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.user_organizations
    WHERE user_id = auth.uid() AND organization_id = target_org
  );
$$;

REVOKE ALL ON FUNCTION public.is_xapcon_superadmin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_xapcon_org_membership(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_xapcon_superadmin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_xapcon_org_membership(UUID) TO authenticated;

-- Invite-code validation returns only the matching organization's public name;
-- it does not expose a list of organizations or invite codes.
CREATE OR REPLACE FUNCTION public.validate_company_invite_code(p_code TEXT)
RETURNS TABLE (id UUID, name TEXT, company_name TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT o.id, o.name::TEXT, o.company_name::TEXT
  FROM public.organizations AS o
  WHERE o.invite_code = upper(trim(p_code))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.validate_company_invite_code(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_company_invite_code(TEXT) TO anon, authenticated;

-- Role changes are provisioned by trusted signup/admin flows only. A user may
-- edit their own contact details, but cannot promote their own profile.
CREATE OR REPLACE FUNCTION public.guard_xapcon_profile_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND NEW.role IS DISTINCT FROM OLD.role
     AND current_setting('app.xapcon_trusted_role_change', true) IS DISTINCT FROM 'true'
     AND NOT public.is_xapcon_superadmin() THEN
    RAISE EXCEPTION 'Only a superadmin can change a profile role';
  END IF;
  RETURN NEW;
END;
$$;

-- Role values in auth user_metadata are user-controlled. A matching invitation
-- row, writable only by superadmins, is the authority for provisioned roles.
CREATE OR REPLACE FUNCTION public.assign_xapcon_signup_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  invited_role TEXT;
  user_metadata JSONB;
BEGIN
  SELECT invitation.role INTO invited_role
  FROM public.user_invitations AS invitation
  WHERE lower(invitation.email) = lower(NEW.email)
  LIMIT 1;

  IF invited_role IS NOT NULL THEN
    NEW.role := invited_role;
    SELECT invitation.job_title INTO NEW.job_title
    FROM public.user_invitations AS invitation
    WHERE lower(invitation.email) = lower(NEW.email)
    LIMIT 1;
    RETURN NEW;
  END IF;

  SELECT raw_user_meta_data INTO user_metadata
  FROM auth.users
  WHERE id = NEW.id;

  IF nullif(trim(user_metadata ->> 'companyCode'), '') IS NOT NULL THEN
    NEW.role := 'employee';
    NEW.job_title := nullif(trim(user_metadata ->> 'jobTitle'), '');
  ELSIF user_metadata ->> 'role' = 'Dueño' THEN
    NEW.role := 'Dueño';
    NEW.job_title := NULL;
  ELSE
    NEW.role := 'employee';
    NEW.job_title := nullif(trim(user_metadata ->> 'jobTitle'), '');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS assign_xapcon_signup_role_trigger ON public.profiles;
CREATE TRIGGER assign_xapcon_signup_role_trigger
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.assign_xapcon_signup_role();

-- Called after an invitee authenticates through their email link. The verified
-- account email must match the superadmin/owner-created invitation row.
CREATE OR REPLACE FUNCTION public.claim_xapcon_user_invitation()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  invitation public.user_invitations%ROWTYPE;
  account_email TEXT;
  invitation_from_superadmin BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT lower(email) INTO account_email
  FROM auth.users
  WHERE id = auth.uid() AND email_confirmed_at IS NOT NULL;
  IF account_email IS NULL THEN
    RAISE EXCEPTION 'A verified email account is required';
  END IF;
  SELECT * INTO invitation
  FROM public.user_invitations
  WHERE lower(email) = account_email
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = invitation.invited_by AND role = 'super_admin'
  ) INTO invitation_from_superadmin;

  PERFORM set_config('app.xapcon_trusted_role_change', 'true', true);
  UPDATE public.profiles
  SET role = CASE
        WHEN invitation_from_superadmin THEN invitation.role
        ELSE profiles.role
      END,
      job_title = coalesce(invitation.job_title, profiles.job_title),
      full_name = invitation.full_name,
      company_email = coalesce(invitation.company_email, company_email),
      company_website = coalesce(invitation.company_website, company_website),
      registration_number = coalesce(invitation.registration_number, registration_number),
      license_number = coalesce(invitation.license_number, license_number),
      organization_id = coalesce(organization_id, invitation.organization_id)
  WHERE id = auth.uid();

  IF invitation.organization_id IS NOT NULL THEN
    INSERT INTO public.user_organizations (user_id, organization_id)
    SELECT auth.uid(), invitation.organization_id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.user_organizations
      WHERE user_id = auth.uid() AND organization_id = invitation.organization_id
    );
  END IF;

  DELETE FROM public.user_invitations WHERE email = invitation.email;
  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_xapcon_user_invitation() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_xapcon_user_invitation() TO authenticated;

DROP TRIGGER IF EXISTS guard_xapcon_profile_role_trigger ON public.profiles;
CREATE TRIGGER guard_xapcon_profile_role_trigger
BEFORE UPDATE OF role ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_xapcon_profile_role();

-- Remove old policies on these tables so an earlier permissive policy cannot
-- override the tenant-scoped rules below (Postgres ORs permissive policies).
DO $$
DECLARE policy_row RECORD;
BEGIN
  FOR policy_row IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = ANY (ARRAY['leads', 'profiles', 'organizations', 'user_organizations', 'user_invitations'])
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', policy_row.policyname, policy_row.schemaname, policy_row.tablename);
  END LOOP;
END;
$$;

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_invitations TO authenticated;

CREATE POLICY user_invitations_superadmin_read ON public.user_invitations FOR SELECT TO authenticated
USING (
  public.is_xapcon_superadmin()
  OR (
    role = 'employee'
    AND organization_id IS NOT NULL
    AND public.has_xapcon_org_membership(organization_id)
  )
);

CREATE POLICY user_invitations_authorized_insert ON public.user_invitations FOR INSERT TO authenticated
WITH CHECK (
  public.is_xapcon_superadmin()
  OR (
    role = 'employee'
    AND organization_id IS NOT NULL
    AND public.has_xapcon_org_membership(organization_id)
  )
);

CREATE POLICY user_invitations_superadmin_update ON public.user_invitations FOR UPDATE TO authenticated
USING (public.is_xapcon_superadmin())
WITH CHECK (public.is_xapcon_superadmin());

CREATE POLICY user_invitations_employee_reinvite ON public.user_invitations FOR UPDATE TO authenticated
USING (
  role = 'employee'
  AND organization_id IS NOT NULL
  AND public.has_xapcon_org_membership(organization_id)
)
WITH CHECK (
  role = 'employee'
  AND organization_id IS NOT NULL
  AND public.has_xapcon_org_membership(organization_id)
);

CREATE POLICY user_invitations_superadmin_delete ON public.user_invitations FOR DELETE TO authenticated
USING (public.is_xapcon_superadmin());

CREATE POLICY leads_tenant_access ON public.leads FOR ALL TO authenticated
USING (
  public.is_xapcon_superadmin()
  OR public.has_xapcon_org_membership(organization_id)
)
WITH CHECK (
  public.is_xapcon_superadmin()
  OR public.has_xapcon_org_membership(organization_id)
);

CREATE POLICY profiles_scoped_read ON public.profiles FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR role = 'super_admin'
  OR public.is_xapcon_superadmin()
  OR EXISTS (
    SELECT 1 FROM public.user_organizations AS target_membership
    WHERE target_membership.user_id = profiles.id
      AND public.has_xapcon_org_membership(target_membership.organization_id)
  )
);

CREATE POLICY profiles_self_or_admin_update ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid() OR public.is_xapcon_superadmin())
WITH CHECK (id = auth.uid() OR public.is_xapcon_superadmin());

CREATE POLICY organizations_scoped_read ON public.organizations FOR SELECT TO authenticated
USING (
  public.is_xapcon_superadmin()
  OR public.has_xapcon_org_membership(id)
  OR invite_code = (auth.jwt() -> 'user_metadata' ->> 'companyCode')
);

CREATE POLICY organizations_owner_create ON public.organizations FOR INSERT TO authenticated
WITH CHECK (
  public.is_xapcon_superadmin()
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('Dueño', 'owner')
      AND profiles.organization_id IS NULL
  ) AND created_by = auth.uid()
);

CREATE POLICY organizations_owner_update ON public.organizations FOR UPDATE TO authenticated
USING (
  public.is_xapcon_superadmin()
  OR (
    public.has_xapcon_org_membership(id)
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('Dueño', 'owner')
    )
  )
)
WITH CHECK (
  public.is_xapcon_superadmin()
  OR (
    public.has_xapcon_org_membership(id)
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('Dueño', 'owner')
    )
  )
);

CREATE POLICY user_organizations_scoped_read ON public.user_organizations FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_xapcon_superadmin()
  OR public.has_xapcon_org_membership(organization_id)
);

CREATE POLICY user_organizations_invite_join ON public.user_organizations FOR INSERT TO authenticated
WITH CHECK (
  public.is_xapcon_superadmin()
  OR (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.user_invitations AS invitation
      WHERE lower(invitation.email) = lower(auth.jwt() ->> 'email')
        AND invitation.organization_id = user_organizations.organization_id
    )
  )
  OR (
    user_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM public.user_invitations AS invitation
      WHERE lower(invitation.email) = lower(auth.jwt() ->> 'email')
    )
    AND EXISTS (
      SELECT 1 FROM public.organizations AS invited_org
      WHERE invited_org.id = organization_id
        AND invited_org.invite_code = (auth.jwt() -> 'user_metadata' ->> 'companyCode')
    )
  )
  OR (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.organizations AS owned_org
      JOIN public.profiles ON profiles.id = auth.uid()
      WHERE owned_org.id = user_organizations.organization_id
        AND owned_org.created_by = auth.uid()
        AND profiles.role IN ('Dueño', 'owner')
    )
  )
);

CREATE POLICY user_organizations_superadmin_manage ON public.user_organizations FOR UPDATE TO authenticated
USING (public.is_xapcon_superadmin())
WITH CHECK (public.is_xapcon_superadmin());

CREATE POLICY user_organizations_superadmin_delete ON public.user_organizations FOR DELETE TO authenticated
USING (public.is_xapcon_superadmin());

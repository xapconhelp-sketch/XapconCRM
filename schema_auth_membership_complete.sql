-- Xapcon CRM: complete authentication, memberships, tasks and notifications upgrade.
-- Run this entire file in Supabase SQL Editor. Existing base CRM tables are required.
-- Includes prerequisites. All changes run in one transaction.
BEGIN;

-- SOURCE: schema_security_hardening.sql
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


-- SOURCE: schema_notifications.sql
-- Notifications are always scoped to their recipient or an organization.
-- Safe to re-run when upgrading an existing installation.
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    reference_id UUID,
    reference_type VARCHAR(50),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT notifications_has_target CHECK (user_id IS NOT NULL OR organization_id IS NOT NULL)
);

ALTER TABLE public.notifications
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_org_id ON public.notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Remove any permissive legacy policy before installing scoped rules.
DO $$
DECLARE policy_row RECORD;
BEGIN
  FOR policy_row IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'notifications'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.notifications', policy_row.policyname);
  END LOOP;
END;
$$;

CREATE POLICY notifications_scoped_read
ON public.notifications FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR (user_id IS NULL AND EXISTS (
    SELECT 1 FROM public.user_organizations AS membership
    WHERE membership.user_id = auth.uid()
      AND membership.organization_id = notifications.organization_id
  ))
);

-- A sender must be authenticated and share the target organization with the
-- recipient. This prevents arbitrary cross-company notification injection.
CREATE POLICY notifications_scoped_insert
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND (
    (organization_id IS NULL AND user_id = auth.uid())
    OR (
      organization_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.user_organizations AS sender_membership
        WHERE sender_membership.user_id = auth.uid()
          AND sender_membership.organization_id = notifications.organization_id
      )
      AND (
        user_id IS NULL
        OR EXISTS (
          SELECT 1 FROM public.user_organizations AS recipient_membership
          WHERE recipient_membership.user_id = notifications.user_id
            AND recipient_membership.organization_id = notifications.organization_id
        )
      )
    )
  )
);

CREATE POLICY notifications_owner_update
ON public.notifications FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());


-- SOURCE: schema_auth_membership_tasks.sql
-- Apply AFTER schema_security_hardening.sql and schema_notifications.sql.
-- One transaction: either the entire upgrade succeeds or nothing changes.

ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS is_internal BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.user_organizations ADD COLUMN IF NOT EXISTS membership_role TEXT NOT NULL DEFAULT 'member';
ALTER TABLE public.user_invitations ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '14 days');
ALTER TABLE public.user_invitations ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;

-- Keep legacy role spellings valid while adding a deliberately limited internal role.
DO $$ DECLARE c RECORD; BEGIN
  FOR c IN SELECT conname FROM pg_constraint WHERE conrelid = 'public.profiles'::regclass
    AND contype = 'c' AND pg_get_constraintdef(oid) ~ '\mrole\M'
  LOOP EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT %I', c.conname); END LOOP;
  FOR c IN SELECT conname FROM pg_constraint WHERE conrelid = 'public.user_invitations'::regclass
    AND contype = 'c' AND pg_get_constraintdef(oid) ~ '\mrole\M'
  LOOP EXECUTE format('ALTER TABLE public.user_invitations DROP CONSTRAINT %I', c.conname); END LOOP;
END $$;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_account_role_check CHECK
  (role IN ('super_admin', 'platform_staff', 'owner', 'Dueño', 'employee', 'Colaborador', 'contractor', 'Contratista', 'Vendedor', 'Gerente de Ventas'));
ALTER TABLE public.user_invitations ADD CONSTRAINT invitations_account_role_check CHECK
  (role IN ('super_admin', 'platform_staff', 'owner', 'employee'));

-- Abort rather than change a company's existing code if duplicates already exist.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.organizations WHERE nullif(trim(invite_code), '') IS NOT NULL
    GROUP BY upper(trim(invite_code)) HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Duplicate company invite codes exist. Resolve them before applying this upgrade.';
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS organizations_unique_invite_code ON public.organizations (upper(trim(invite_code)))
  WHERE nullif(trim(invite_code), '') IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS organizations_single_internal ON public.organizations (is_internal) WHERE is_internal;
CREATE UNIQUE INDEX IF NOT EXISTS invitations_normalized_email ON public.user_invitations (lower(trim(email)));
CREATE UNIQUE INDEX IF NOT EXISTS user_organizations_unique_membership ON public.user_organizations (user_id, organization_id);

INSERT INTO public.organizations (name, company_name, invite_code, is_internal)
SELECT 'Xapcon Group', 'Xapcon Group', 'INTERNAL-' || upper(replace(gen_random_uuid()::text, '-', '')), true
WHERE NOT EXISTS (SELECT 1 FROM public.organizations WHERE is_internal);
INSERT INTO public.user_organizations (user_id, organization_id, membership_role)
SELECT p.id, o.id, 'member' FROM public.profiles p CROSS JOIN public.organizations o
WHERE p.role = 'super_admin' AND o.is_internal
AND NOT EXISTS (SELECT 1 FROM public.user_organizations m WHERE m.user_id = p.id AND m.organization_id = o.id);
UPDATE public.user_organizations m SET membership_role = 'owner'
FROM public.profiles p, public.organizations o
WHERE p.id = m.user_id AND o.id = m.organization_id AND NOT o.is_internal
AND (o.created_by = p.id OR (p.role IN ('owner', 'Dueño') AND p.organization_id = o.id));

CREATE OR REPLACE FUNCTION public.is_xapcon_internal_user(p_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id AND role IN ('super_admin', 'platform_staff'));
$$;
CREATE OR REPLACE FUNCTION public.can_manage_xapcon_org(p_org_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT public.is_xapcon_superadmin() OR EXISTS (
    SELECT 1 FROM public.user_organizations m JOIN public.organizations o ON o.id = m.organization_id
    WHERE m.user_id = auth.uid() AND m.organization_id = p_org_id AND m.membership_role = 'owner' AND NOT o.is_internal);
$$;
CREATE OR REPLACE FUNCTION public.can_access_xapcon_org(p_org_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT auth.uid() IS NOT NULL AND (public.is_xapcon_superadmin() OR public.has_xapcon_org_membership(p_org_id));
$$;
CREATE OR REPLACE FUNCTION public.can_receive_xapcon_case(p_user_id UUID, p_org_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = p_user_id AND (
    p.role = 'super_admin' OR EXISTS (SELECT 1 FROM public.user_organizations m
      WHERE m.user_id = p.id AND m.organization_id = p_org_id)));
$$;

CREATE OR REPLACE FUNCTION public.validate_company_invite_code(p_code TEXT)
RETURNS TABLE (id UUID, name TEXT, company_name TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT o.id, o.name::text, o.company_name::text FROM public.organizations o
  WHERE upper(trim(o.invite_code)) = upper(trim(p_code)) AND NOT o.is_internal;
$$;

-- The original signup metadata is validated before the profile is inserted.
CREATE OR REPLACE FUNCTION public.assign_xapcon_signup_role()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE metadata JSONB; invitation public.user_invitations%ROWTYPE; target_org UUID;
BEGIN
  SELECT raw_user_meta_data INTO metadata FROM auth.users WHERE id = NEW.id;
  NEW.full_name := coalesce(nullif(trim(metadata ->> 'full_name'), ''), nullif(trim(metadata ->> 'fullName'), ''), NEW.full_name);
  SELECT * INTO invitation FROM public.user_invitations WHERE lower(email) = lower(NEW.email);
  IF FOUND THEN
    IF invitation.expires_at <= now() THEN RAISE EXCEPTION 'La invitación venció. Solicita una nueva.'; END IF;
    NEW.role := invitation.role; NEW.job_title := invitation.job_title;
    NEW.full_name := invitation.full_name;
    NEW.organization_id := NULL;
    RETURN NEW;
  END IF;
  IF nullif(trim(NEW.full_name), '') IS NULL THEN RAISE EXCEPTION 'El nombre completo es obligatorio.'; END IF;
  IF nullif(trim(metadata ->> 'companyCode'), '') IS NOT NULL THEN
    SELECT id INTO target_org FROM public.organizations
    WHERE upper(trim(invite_code)) = upper(trim(metadata ->> 'companyCode')) AND NOT is_internal;
    IF target_org IS NULL THEN RAISE EXCEPTION 'El código de empresa no es válido.'; END IF;
    NEW.role := 'employee'; NEW.organization_id := target_org;
    NEW.job_title := nullif(trim(metadata ->> 'jobTitle'), '');
  ELSIF metadata ->> 'role' = 'Dueño' THEN
    IF nullif(trim(metadata ->> 'companyName'), '') IS NULL THEN RAISE EXCEPTION 'El nombre de empresa es obligatorio.'; END IF;
    NEW.role := 'Dueño'; NEW.organization_id := NULL; NEW.job_title := NULL;
  ELSE
    RAISE EXCEPTION 'El registro requiere una invitación o un código de empresa.';
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.guard_xapcon_profile_role()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND (NEW.role IS DISTINCT FROM OLD.role OR NEW.organization_id IS DISTINCT FROM OLD.organization_id)
    AND current_setting('app.xapcon_trusted_role_change', true) IS DISTINCT FROM 'true'
    AND NOT public.is_xapcon_superadmin() THEN
    RAISE EXCEPTION 'El rol y la empresa solo pueden cambiarse mediante un flujo autorizado.';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_xapcon_profile_role_trigger ON public.profiles;
CREATE TRIGGER guard_xapcon_profile_role_trigger BEFORE UPDATE OF role, organization_id ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_xapcon_profile_role();

-- Private helper. Account + organization + membership are committed together.
CREATE OR REPLACE FUNCTION public.provision_xapcon_account(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE p public.profiles%ROWTYPE; u auth.users%ROWTYPE; invitation public.user_invitations%ROWTYPE;
  target_org UUID; new_code TEXT; member_role TEXT := 'member';
BEGIN
  SELECT * INTO p FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No se encontró el perfil de la cuenta.'; END IF;
  SELECT * INTO u FROM auth.users WHERE id = p_user_id;
  PERFORM set_config('app.xapcon_trusted_role_change', 'true', true);
  SELECT * INTO invitation FROM public.user_invitations WHERE lower(email) = lower(u.email) FOR UPDATE;
  IF FOUND THEN
    IF u.email_confirmed_at IS NULL THEN RETURN; END IF;
    IF invitation.expires_at <= now() THEN RAISE EXCEPTION 'La invitación venció. Solicita una nueva.'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = invitation.invited_by AND role = 'super_admin')
      AND (invitation.role <> 'employee' OR NOT EXISTS (SELECT 1 FROM public.user_organizations
        WHERE user_id = invitation.invited_by AND organization_id = invitation.organization_id AND membership_role = 'owner')) THEN
      RAISE EXCEPTION 'La invitación no tiene un remitente autorizado.';
    END IF;
    target_org := invitation.organization_id;
    member_role := CASE WHEN invitation.role = 'owner' THEN 'owner' ELSE 'member' END;
    UPDATE public.profiles SET
      role = CASE WHEN invitation.role = 'employee' AND p.role IN ('super_admin', 'platform_staff', 'Dueño', 'owner') THEN p.role ELSE invitation.role END,
      full_name = invitation.full_name, job_title = coalesce(invitation.job_title, job_title),
      phone = coalesce(invitation.phone, phone),
      organization_id = CASE WHEN invitation.role IN ('platform_staff', 'super_admin') THEN target_org ELSE coalesce(organization_id, target_org) END,
      company_email = coalesce(invitation.company_email, company_email),
      company_website = coalesce(invitation.company_website, company_website),
      registration_number = coalesce(invitation.registration_number, registration_number),
      license_number = coalesce(invitation.license_number, license_number)
    WHERE id = p_user_id;
    DELETE FROM public.user_invitations WHERE email = invitation.email;
  ELSIF p.role = 'super_admin' THEN
    SELECT id INTO target_org FROM public.organizations WHERE is_internal;
  ELSIF p.role IN ('Dueño', 'owner') AND p.organization_id IS NULL THEN
    -- Recover an organization from an interrupted legacy onboarding first.
    SELECT id INTO target_org FROM public.organizations WHERE created_by = p.id AND NOT is_internal ORDER BY id LIMIT 1;
    IF target_org IS NULL THEN
      IF nullif(trim(u.raw_user_meta_data ->> 'companyName'), '') IS NULL THEN RAISE EXCEPTION 'Falta el nombre de empresa de esta cuenta.'; END IF;
      LOOP
        new_code := 'XAP-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
        BEGIN
          INSERT INTO public.organizations (name, company_name, invite_code, created_by)
          VALUES (trim(u.raw_user_meta_data ->> 'companyName'), trim(u.raw_user_meta_data ->> 'companyName'), new_code, p.id)
          RETURNING id INTO target_org;
          EXIT;
        EXCEPTION WHEN unique_violation THEN
          IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE upper(trim(invite_code)) = new_code) THEN RAISE; END IF;
        END;
      END LOOP;
    END IF;
    member_role := 'owner';
  ELSE
    target_org := p.organization_id;
    IF target_org IS NULL THEN
      SELECT organization_id INTO target_org FROM public.user_organizations WHERE user_id = p.id ORDER BY organization_id LIMIT 1;
      IF target_org IS NULL AND p.role <> 'platform_staff' THEN
        SELECT id INTO target_org FROM public.organizations WHERE NOT is_internal
          AND upper(trim(invite_code)) = upper(trim(u.raw_user_meta_data ->> 'companyCode'));
      END IF;
    END IF;
    IF target_org IS NULL THEN RAISE EXCEPTION 'Tu cuenta no está vinculada a una empresa. Solicita una invitación.'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.user_organizations WHERE user_id = p.id AND organization_id = target_org) THEN
      IF EXISTS (SELECT 1 FROM public.organizations WHERE id = target_org AND created_by = p.id AND NOT is_internal)
        AND p.role IN ('Dueño', 'owner') THEN member_role := 'owner';
      ELSIF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = target_org AND NOT is_internal
        AND upper(trim(invite_code)) = upper(trim(u.raw_user_meta_data ->> 'companyCode'))) THEN
        RAISE EXCEPTION 'No se pudo verificar la vinculación a la empresa.';
      END IF;
    END IF;
  END IF;
  IF target_org IS NOT NULL THEN
    INSERT INTO public.user_organizations (user_id, organization_id, membership_role)
    SELECT p_user_id, target_org, member_role WHERE NOT EXISTS
      (SELECT 1 FROM public.user_organizations WHERE user_id = p_user_id AND organization_id = target_org);
    IF member_role = 'owner' THEN UPDATE public.user_organizations SET membership_role = 'owner'
      WHERE user_id = p_user_id AND organization_id = target_org; END IF;
    UPDATE public.profiles SET organization_id = coalesce(organization_id, target_org) WHERE id = p_user_id;
  END IF;
  PERFORM set_config('app.xapcon_trusted_role_change', 'false', true);
END $$;
REVOKE ALL ON FUNCTION public.provision_xapcon_account(UUID) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.on_xapcon_profile_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
BEGIN PERFORM public.provision_xapcon_account(NEW.id); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS provision_xapcon_profile_trigger ON public.profiles;
CREATE TRIGGER provision_xapcon_profile_trigger AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.on_xapcon_profile_created();

CREATE OR REPLACE FUNCTION public.bootstrap_xapcon_account()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND email_confirmed_at IS NOT NULL)
    THEN RAISE EXCEPTION 'Confirma tu correo electrónico antes de continuar.'; END IF;
  PERFORM public.provision_xapcon_account(auth.uid());
END $$;
-- Keep the old client RPC name safe during a rolling upgrade.
CREATE OR REPLACE FUNCTION public.claim_xapcon_user_invitation()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
BEGIN PERFORM public.bootstrap_xapcon_account(); RETURN true; END $$;

-- Invitation authorization is enforced on the server, including staff/global roles.
CREATE OR REPLACE FUNCTION public.save_xapcon_invitation(p_email TEXT, p_full_name TEXT, p_role TEXT,
  p_organization_id UUID DEFAULT NULL, p_job_title TEXT DEFAULT NULL, p_company_details JSONB DEFAULT '{}'::jsonb)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE target_org UUID := p_organization_id;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Inicia sesión para invitar usuarios.'; END IF;
  IF nullif(trim(p_full_name), '') IS NULL OR trim(p_email) !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
    THEN RAISE EXCEPTION 'Nombre y correo válidos son obligatorios.'; END IF;
  IF p_role NOT IN ('super_admin', 'platform_staff', 'owner', 'employee') THEN RAISE EXCEPTION 'Rol no válido.'; END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE lower(email) = lower(trim(p_email))
    AND ((role IN ('Dueño', 'owner') AND p_role = 'platform_staff') OR
      (role = 'super_admin' AND p_role IN ('owner', 'platform_staff')))) THEN
    RAISE EXCEPTION 'Este correo ya pertenece a una cuenta con otro nivel de acceso. Usa un correo diferente para la nueva cuenta.';
  END IF;
  IF p_role IN ('super_admin', 'platform_staff') THEN
    IF NOT public.is_xapcon_superadmin() THEN RAISE EXCEPTION 'Solo un superadministrador puede invitar al equipo de Xapcon.'; END IF;
    SELECT id INTO target_org FROM public.organizations WHERE is_internal;
  ELSE
    IF target_org IS NULL OR NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = target_org AND NOT is_internal)
      THEN RAISE EXCEPTION 'Selecciona una empresa contratista.'; END IF;
    IF NOT public.is_xapcon_superadmin() AND (p_role <> 'employee' OR NOT public.can_manage_xapcon_org(target_org))
      THEN RAISE EXCEPTION 'Solo el propietario puede invitar colaboradores a su empresa.'; END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM public.user_invitations WHERE lower(email) = lower(trim(p_email))
      AND (organization_id IS DISTINCT FROM target_org OR role <> p_role)) AND NOT public.is_xapcon_superadmin()
    THEN RAISE EXCEPTION 'Este correo tiene otra invitación pendiente. Contacta a Xapcon.'; END IF;
  INSERT INTO public.user_invitations (email, full_name, role, organization_id, job_title, invited_by, expires_at, phone,
    company_email, company_website, registration_number, license_number)
  VALUES (lower(trim(p_email)), trim(p_full_name), p_role, target_org, p_job_title, auth.uid(), now() + interval '14 days', p_company_details ->> 'phone',
    p_company_details ->> 'companyEmail', p_company_details ->> 'companyWebsite',
    p_company_details ->> 'registrationNumber', p_company_details ->> 'licenseNumber')
  ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role,
    organization_id = EXCLUDED.organization_id, job_title = EXCLUDED.job_title, invited_by = EXCLUDED.invited_by,
    expires_at = EXCLUDED.expires_at, phone = EXCLUDED.phone, company_email = EXCLUDED.company_email, company_website = EXCLUDED.company_website,
    registration_number = EXCLUDED.registration_number, license_number = EXCLUDED.license_number;
END $$;

CREATE OR REPLACE FUNCTION public.set_xapcon_staff_organizations(p_user_id UUID, p_organization_ids UUID[])
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
BEGIN
  IF NOT public.is_xapcon_superadmin() THEN RAISE EXCEPTION 'Solo un superadministrador puede cambiar estos accesos.'; END IF;
  PERFORM 1 FROM public.profiles WHERE id = p_user_id AND role = 'platform_staff' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Esta cuenta no es un colaborador interno.'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(coalesce(p_organization_ids, ARRAY[]::uuid[])) id
    WHERE NOT EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = id AND NOT o.is_internal))
    THEN RAISE EXCEPTION 'Una de las empresas seleccionadas no es válida.'; END IF;
  DELETE FROM public.user_organizations m USING public.organizations o
  WHERE m.user_id = p_user_id AND m.organization_id = o.id AND NOT o.is_internal
    AND NOT (m.organization_id = ANY(coalesce(p_organization_ids, ARRAY[]::uuid[])));
  INSERT INTO public.user_organizations (user_id, organization_id, membership_role)
  SELECT p_user_id, id, 'member' FROM public.organizations o
  WHERE o.id = ANY(coalesce(p_organization_ids, ARRAY[]::uuid[]))
    AND NOT EXISTS (SELECT 1 FROM public.user_organizations m WHERE m.user_id = p_user_id AND m.organization_id = o.id);
END $$;

-- All onboarding mutations go through authorized RPCs/triggers.
DROP POLICY IF EXISTS user_organizations_invite_join ON public.user_organizations;
DROP POLICY IF EXISTS user_organizations_admin_insert ON public.user_organizations;
CREATE POLICY user_organizations_admin_insert ON public.user_organizations FOR INSERT TO authenticated WITH CHECK (public.is_xapcon_superadmin());
DROP POLICY IF EXISTS organizations_owner_create ON public.organizations;
DROP POLICY IF EXISTS organizations_admin_create ON public.organizations;
CREATE POLICY organizations_admin_create ON public.organizations FOR INSERT TO authenticated WITH CHECK (public.is_xapcon_superadmin());
DROP POLICY IF EXISTS organizations_scoped_read ON public.organizations;
CREATE POLICY organizations_scoped_read ON public.organizations FOR SELECT TO authenticated
USING (public.can_access_xapcon_org(id));
DROP POLICY IF EXISTS organizations_owner_update ON public.organizations;
CREATE POLICY organizations_owner_update ON public.organizations FOR UPDATE TO authenticated
USING (public.can_manage_xapcon_org(id)) WITH CHECK (public.can_manage_xapcon_org(id));
DROP POLICY IF EXISTS user_invitations_authorized_insert ON public.user_invitations;
DROP POLICY IF EXISTS user_invitations_employee_reinvite ON public.user_invitations;
DROP POLICY IF EXISTS user_invitations_superadmin_read ON public.user_invitations;
DROP POLICY IF EXISTS user_invitations_authorized_read ON public.user_invitations;
CREATE POLICY user_invitations_authorized_read ON public.user_invitations FOR SELECT TO authenticated
USING (public.is_xapcon_superadmin() OR (role = 'employee' AND public.can_manage_xapcon_org(organization_id)));
-- No direct invitation writes: save_xapcon_invitation validates every field.
REVOKE INSERT, UPDATE, DELETE ON public.user_invitations FROM authenticated;

-- Broadcast reads are per person, rather than changing a shared is_read flag.
CREATE TABLE IF NOT EXISTS public.notification_reads (
  notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY (notification_id, user_id));
ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS notification_reads_self ON public.notification_reads;
CREATE POLICY notification_reads_self ON public.notification_reads FOR SELECT TO authenticated USING (user_id = auth.uid());
GRANT SELECT ON public.notification_reads TO authenticated;

DROP POLICY IF EXISTS notifications_superadmin_read ON public.notifications;
DROP POLICY IF EXISTS notifications_scoped_read ON public.notifications;
CREATE POLICY notifications_scoped_read ON public.notifications FOR SELECT TO authenticated USING (
  (user_id = auth.uid() AND (organization_id IS NULL OR public.can_receive_xapcon_case(auth.uid(), organization_id)))
  OR (user_id IS NULL AND public.has_xapcon_org_membership(organization_id)));
DROP POLICY IF EXISTS notifications_scoped_insert ON public.notifications;
CREATE POLICY notifications_scoped_insert ON public.notifications FOR INSERT TO authenticated WITH CHECK (
  created_by = auth.uid() AND (
    (organization_id IS NOT NULL AND public.can_access_xapcon_org(organization_id)
      AND (user_id IS NULL OR public.can_receive_xapcon_case(user_id, organization_id)))
    OR (organization_id IS NULL AND (user_id = auth.uid() OR
      (public.is_xapcon_internal_user(auth.uid()) AND public.is_xapcon_internal_user(user_id))))));
REVOKE UPDATE ON public.notifications FROM authenticated;
REVOKE INSERT ON public.notifications FROM authenticated;
GRANT SELECT ON public.notifications TO authenticated;
GRANT UPDATE (is_read) ON public.notifications TO authenticated;

CREATE OR REPLACE FUNCTION public.get_xapcon_unread_notifications(p_organization_id UUID DEFAULT NULL)
RETURNS SETOF public.notifications LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT n.* FROM public.notifications n WHERE auth.uid() IS NOT NULL AND (
    (n.user_id = auth.uid() AND NOT coalesce(n.is_read, false)
      AND (n.organization_id IS NULL OR public.can_receive_xapcon_case(auth.uid(), n.organization_id))) OR
    (n.user_id IS NULL AND n.organization_id = p_organization_id AND public.has_xapcon_org_membership(n.organization_id)
      AND NOT EXISTS (SELECT 1 FROM public.notification_reads r WHERE r.notification_id = n.id AND r.user_id = auth.uid())))
  ORDER BY n.created_at DESC;
$$;
CREATE OR REPLACE FUNCTION public.read_xapcon_notifications(p_notification_id UUID DEFAULT NULL, p_organization_id UUID DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  UPDATE public.notifications SET is_read = true WHERE user_id = auth.uid() AND (p_notification_id IS NULL OR id = p_notification_id);
  INSERT INTO public.notification_reads (notification_id, user_id)
  SELECT n.id, auth.uid() FROM public.notifications n WHERE n.user_id IS NULL
    AND public.has_xapcon_org_membership(n.organization_id)
    AND ((p_notification_id IS NOT NULL AND n.id = p_notification_id) OR (p_notification_id IS NULL AND n.organization_id = p_organization_id))
  ON CONFLICT DO NOTHING;
END $$;

CREATE OR REPLACE FUNCTION public.add_xapcon_task(p_lead_id UUID, p_title TEXT, p_assigned_to UUID DEFAULT NULL,
  p_details JSONB DEFAULT '{}'::jsonb)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE l public.leads%ROWTYPE; task JSONB; items JSONB; author TEXT; recipient TEXT;
  kind TEXT := coalesce(p_details ->> 'kind', 'task'); due_date TEXT := coalesce(nullif(p_details ->> 'dueDate', ''), current_date::text);
BEGIN
  SELECT * INTO l FROM public.leads WHERE id = p_lead_id FOR UPDATE;
  IF NOT FOUND OR NOT public.can_access_xapcon_org(l.organization_id) THEN RAISE EXCEPTION 'No tienes acceso a este caso.'; END IF;
  IF nullif(trim(p_title), '') IS NULL OR length(trim(p_title)) > 120 THEN RAISE EXCEPTION 'La descripción debe tener entre 1 y 120 caracteres.'; END IF;
  IF kind NOT IN ('task', 'inspection', 'adjuster_meeting', 'installation')
    OR coalesce(p_details ->> 'priority', 'medium') NOT IN ('high', 'medium', 'low')
    OR coalesce(p_details ->> 'category', 'general') NOT IN ('general', 'pending_document', 'visit_homeowner', 'call_homeowner', 'call_adjuster')
    THEN RAISE EXCEPTION 'Tipo, categoría o prioridad no válidos.'; END IF;
  IF due_date !~ '^\d{4}-\d{2}-\d{2}$' THEN RAISE EXCEPTION 'La fecha debe usar el formato AAAA-MM-DD.'; END IF;
  PERFORM due_date::date;
  IF kind <> 'task' THEN
    IF nullif(p_details ->> 'dueDate', '') IS NULL OR nullif(p_details ->> 'scheduledTime', '') IS NULL
      OR (p_details ->> 'scheduledTime') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
      THEN RAISE EXCEPTION 'La actividad necesita fecha y hora válidas.'; END IF;
  END IF;
  IF p_assigned_to IS NOT NULL AND NOT public.can_receive_xapcon_case(p_assigned_to, l.organization_id)
    THEN RAISE EXCEPTION 'El responsable no pertenece a la empresa de este caso.'; END IF;
  SELECT coalesce(nullif(full_name, ''), email) INTO author FROM public.profiles WHERE id = auth.uid();
  SELECT coalesce(nullif(full_name, ''), email) INTO recipient FROM public.profiles WHERE id = p_assigned_to;
  items := coalesce(l.tasks::jsonb, '[]'::jsonb);
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(items) t WHERE lower(trim(t ->> 'title')) = lower(trim(p_title))
    AND t ->> 'status' = 'pending' AND t ->> 'dueDate' = due_date) THEN RAISE EXCEPTION 'Esta tarea ya está pendiente para esa fecha.'; END IF;
  task := jsonb_strip_nulls(jsonb_build_object('id', 'task-' || gen_random_uuid()::text, 'title', trim(p_title),
    'status', 'pending', 'dueDate', due_date, 'kind', kind, 'priority', coalesce(p_details ->> 'priority', 'medium'),
    'category', coalesce(p_details ->> 'category', 'general'), 'scheduledTime', CASE WHEN kind <> 'task' THEN p_details ->> 'scheduledTime' END,
    'assignedToId', p_assigned_to, 'assignedTo', recipient, 'createdById', auth.uid(), 'createdBy', author, 'createdAt', now()));
  items := items || jsonb_build_array(task);
  UPDATE public.leads SET tasks = items WHERE id = l.id;
  IF p_assigned_to IS NOT NULL AND p_assigned_to <> auth.uid() THEN
    INSERT INTO public.notifications (user_id, organization_id, created_by, type, title, content, reference_id, reference_type)
    VALUES (p_assigned_to, l.organization_id, auth.uid(), 'task_assigned',
      CASE WHEN kind = 'task' THEN 'Nueva tarea asignada' ELSE 'Nueva actividad agendada' END,
      author || ': ' || trim(p_title) || ' · ' || l.name || ' · ' || due_date || coalesce(' ' || (p_details ->> 'scheduledTime'), ''), l.id, 'lead');
  END IF;
  RETURN items;
END $$;

CREATE OR REPLACE FUNCTION public.set_xapcon_task_completed(p_lead_id UUID, p_task_id TEXT, p_completed BOOLEAN)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE l public.leads%ROWTYPE; target JSONB; items JSONB; recipient UUID; author TEXT;
BEGIN
  SELECT * INTO l FROM public.leads WHERE id = p_lead_id FOR UPDATE;
  IF NOT FOUND OR NOT public.can_access_xapcon_org(l.organization_id) THEN RAISE EXCEPTION 'No tienes acceso a este caso.'; END IF;
  IF p_completed IS NULL THEN RAISE EXCEPTION 'Estado no válido.'; END IF;
  SELECT t INTO target FROM jsonb_array_elements(coalesce(l.tasks::jsonb, '[]'::jsonb)) t WHERE t ->> 'id' = p_task_id;
  IF target IS NULL THEN RAISE EXCEPTION 'No se encontró la tarea.'; END IF;
  IF (target ->> 'status' = 'completed') = p_completed THEN RETURN l.tasks; END IF;
  SELECT jsonb_agg(CASE WHEN t ->> 'id' = p_task_id THEN t || jsonb_build_object('status',
    CASE WHEN p_completed THEN 'completed' ELSE 'pending' END, 'completedById', CASE WHEN p_completed THEN auth.uid() END,
    'completedAt', CASE WHEN p_completed THEN now() END) ELSE t END ORDER BY ordinality)
  INTO items FROM jsonb_array_elements(l.tasks::jsonb) WITH ORDINALITY AS source(t, ordinality);
  UPDATE public.leads SET tasks = items WHERE id = l.id;
  IF p_completed THEN
    SELECT coalesce(nullif(full_name, ''), email) INTO author FROM public.profiles WHERE id = auth.uid();
    FOR recipient IN SELECT DISTINCT v::uuid FROM unnest(ARRAY[target ->> 'createdById', target ->> 'assignedToId']) v
      WHERE v ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    LOOP
      IF recipient <> auth.uid() AND public.can_receive_xapcon_case(recipient, l.organization_id) THEN
        INSERT INTO public.notifications (user_id, organization_id, created_by, type, title, content, reference_id, reference_type)
        VALUES (recipient, l.organization_id, auth.uid(), 'task_completed', 'Tarea completada', author || ': ' || (target ->> 'title') || ' · ' || l.name, l.id, 'lead');
      END IF;
    END LOOP;
  END IF;
  RETURN items;
END $$;

CREATE OR REPLACE FUNCTION public.add_xapcon_timeline_event(p_lead_id UUID, p_event JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE l public.leads%ROWTYPE; event JSONB; items JSONB; author TEXT; author_role TEXT; recipient UUID;
BEGIN
  SELECT * INTO l FROM public.leads WHERE id = p_lead_id FOR UPDATE;
  IF NOT FOUND OR NOT public.can_access_xapcon_org(l.organization_id) THEN RAISE EXCEPTION 'No tienes acceso a este caso.'; END IF;
  IF coalesce(p_event ->> 'type', '') NOT IN ('status_change', 'photo_upload', 'call_log', 'note', 'system')
    OR jsonb_typeof(coalesce(p_event -> 'mentionedUserIds', '[]'::jsonb)) <> 'array'
    THEN RAISE EXCEPTION 'Evento no válido.'; END IF;
  SELECT coalesce(nullif(btrim(full_name), ''), nullif(btrim(email), '')),
    CASE lower(btrim(role))
      WHEN 'super_admin' THEN 'Superadmin'
      WHEN 'admin' THEN 'Superadmin'
      WHEN 'platform_staff' THEN 'Equipo Xapcon'
      WHEN 'owner' THEN 'Propietario'
      WHEN 'dueño' THEN 'Propietario'
      WHEN 'employee' THEN 'Empleado'
      WHEN 'colaborador' THEN 'Empleado'
      WHEN 'contractor' THEN 'Contratista'
      WHEN 'contratista' THEN 'Contratista'
      WHEN 'vendedor' THEN 'Vendedor'
      WHEN 'gerente de ventas' THEN 'Gerente de ventas'
      ELSE initcap(role)
    END
    INTO author, author_role
    FROM public.profiles WHERE id = auth.uid();
  author := coalesce(
    nullif(btrim(author), ''),
    nullif(btrim(auth.jwt() -> 'user_metadata' ->> 'full_name'), ''),
    nullif(btrim(auth.jwt() -> 'user_metadata' ->> 'name'), ''),
    nullif(btrim(split_part(auth.jwt() ->> 'email', '@', 1)), ''),
    'Usuario del equipo'
  );
  author_role := coalesce(author_role, CASE lower(coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', ''))
    WHEN 'super_admin' THEN 'Superadmin' WHEN 'admin' THEN 'Superadmin'
    WHEN 'platform_staff' THEN 'Equipo Xapcon' WHEN 'owner' THEN 'Propietario' WHEN 'dueño' THEN 'Propietario'
    WHEN 'employee' THEN 'Empleado' WHEN 'colaborador' THEN 'Empleado'
    WHEN 'contractor' THEN 'Contratista' WHEN 'contratista' THEN 'Contratista'
    WHEN 'vendedor' THEN 'Vendedor' WHEN 'gerente de ventas' THEN 'Gerente de ventas'
    ELSE 'Usuario del equipo' END);
  author := author || ' (' || author_role || ')';
  event := p_event || jsonb_build_object('id', 'timeline-' || gen_random_uuid()::text, 'author', author, 'authorId', auth.uid(), 'date', now(), 'timestamp', now());
  items := jsonb_build_array(event) || coalesce(l.timeline::jsonb, '[]'::jsonb);
  UPDATE public.leads SET timeline = items WHERE id = l.id;
  IF event ->> 'type' = 'note' THEN
    FOR recipient IN SELECT DISTINCT value::uuid FROM jsonb_array_elements_text(coalesce(event -> 'mentionedUserIds', '[]'::jsonb))
    LOOP
      IF NOT public.can_receive_xapcon_case(recipient, l.organization_id) THEN RAISE EXCEPTION 'La persona mencionada no tiene acceso a este caso.'; END IF;
      IF recipient <> auth.uid() THEN
        INSERT INTO public.notifications (user_id, organization_id, created_by, type, title, content, reference_id, reference_type)
        VALUES (recipient, l.organization_id, auth.uid(), 'mention', author || ' te mencionó en ' || l.name, event ->> 'content', l.id, 'lead');
      END IF;
    END LOOP;
  END IF;
  RETURN items;
END $$;

CREATE OR REPLACE FUNCTION public.delete_xapcon_timeline_event(p_lead_id UUID, p_event_id TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE l public.leads%ROWTYPE; items JSONB;
BEGIN
  SELECT * INTO l FROM public.leads WHERE id = p_lead_id FOR UPDATE;
  IF NOT FOUND OR NOT public.can_access_xapcon_org(l.organization_id) THEN RAISE EXCEPTION 'No tienes acceso a este caso.'; END IF;
  SELECT coalesce(jsonb_agg(t ORDER BY ordinality), '[]'::jsonb) INTO items
  FROM jsonb_array_elements(coalesce(l.timeline::jsonb, '[]'::jsonb)) WITH ORDINALITY source(t, ordinality)
  WHERE t ->> 'id' IS DISTINCT FROM p_event_id;
  UPDATE public.leads SET timeline = items WHERE id = l.id;
  RETURN items;
END $$;

-- Prevent direct clients from skipping notification/recipient validation.
-- The remaining lead columns keep their existing tenant RLS permissions.
REVOKE UPDATE ON public.leads FROM authenticated;
REVOKE UPDATE (tasks, timeline) ON public.leads FROM authenticated;
DO $$ DECLARE c RECORD; BEGIN
  FOR c IN SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'leads' AND column_name NOT IN ('tasks', 'timeline')
  LOOP EXECUTE format('GRANT UPDATE (%I) ON public.leads TO authenticated', c.column_name); END LOOP;
END $$;

-- Preserve legacy tasks and associate names only when exactly one company member matches.
WITH matches AS (
  SELECT l.id, t.task ->> 'id' task_id, min(p.id::text) recipient FROM public.leads l
  CROSS JOIN LATERAL jsonb_array_elements(coalesce(l.tasks::jsonb, '[]'::jsonb)) t(task)
  JOIN public.user_organizations m ON m.organization_id = l.organization_id
  JOIN public.profiles p ON p.id = m.user_id
  WHERE nullif(t.task ->> 'assignedToId', '') IS NULL AND lower(trim(t.task ->> 'assignedTo')) = lower(trim(p.full_name))
  GROUP BY l.id, t.task ->> 'id' HAVING count(DISTINCT p.id) = 1
), repaired AS (
  SELECT l.id, jsonb_agg(CASE WHEN m.recipient IS NOT NULL THEN t.task || jsonb_build_object('assignedToId', m.recipient)
    ELSE t.task END ORDER BY t.position) tasks FROM public.leads l
  CROSS JOIN LATERAL jsonb_array_elements(coalesce(l.tasks::jsonb, '[]'::jsonb)) WITH ORDINALITY t(task, position)
  LEFT JOIN matches m ON m.id = l.id AND m.task_id = t.task ->> 'id'
  GROUP BY l.id HAVING bool_or(m.recipient IS NOT NULL)
) UPDATE public.leads l SET tasks = r.tasks FROM repaired r WHERE l.id = r.id;

-- PostgreSQL grants EXECUTE to PUBLIC by default: explicitly close every new RPC.
DO $$ DECLARE f RECORD; BEGIN
  FOR f IN SELECT p.oid::regprocedure signature FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname IN ('is_xapcon_internal_user', 'can_manage_xapcon_org', 'can_access_xapcon_org',
      'can_receive_xapcon_case', 'bootstrap_xapcon_account', 'save_xapcon_invitation', 'get_xapcon_unread_notifications',
      'read_xapcon_notifications', 'add_xapcon_task', 'set_xapcon_task_completed', 'add_xapcon_timeline_event',
      'delete_xapcon_timeline_event', 'set_xapcon_staff_organizations')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', f.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f.signature);
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.on_xapcon_profile_created() FROM PUBLIC, anon, authenticated;

-- Realtime is optional; clients also poll if this publication is unavailable.
DO $$ DECLARE table_name TEXT; BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH table_name IN ARRAY ARRAY['profiles', 'user_organizations', 'leads', 'notifications'] LOOP
      IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = table_name) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', table_name);
      END IF;
    END LOOP;
  END IF;
END $$;


COMMIT;

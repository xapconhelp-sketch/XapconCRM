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

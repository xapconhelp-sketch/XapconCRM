-- 1. Create the notifications table
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    reference_id UUID,
    reference_type VARCHAR(50),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create indexes for performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_org_id ON public.notifications(organization_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);

-- 3. Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Admins can see all notifications
CREATE POLICY "Admins can view all notifications"
ON public.notifications FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Users can see their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (
  user_id = auth.uid()
);

-- Insert policy (system creates notifications, or auth users triggering events)
CREATE POLICY "Authenticated users can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Update policy (users can mark their own as read)
CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (
  user_id = auth.uid()
);

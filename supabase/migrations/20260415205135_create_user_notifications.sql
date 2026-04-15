
CREATE TABLE public.user_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  message TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  related_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.user_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.user_notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated can insert user notifications"
  ON public.user_notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Super admins full access user notifications"
  ON public.user_notifications FOR ALL
  USING (is_super_admin(auth.uid()));

CREATE INDEX idx_user_notifications_user_id ON public.user_notifications(user_id);
CREATE INDEX idx_user_notifications_is_read ON public.user_notifications(user_id, is_read);

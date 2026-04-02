
CREATE TABLE public.vendor_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  message TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  related_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.vendor_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors can view own notifications"
  ON public.vendor_notifications FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.vendors WHERE vendors.id = vendor_notifications.vendor_id AND vendors.user_id = auth.uid()
  ));

CREATE POLICY "Vendors can update own notifications"
  ON public.vendor_notifications FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.vendors WHERE vendors.id = vendor_notifications.vendor_id AND vendors.user_id = auth.uid()
  ));

CREATE POLICY "Authenticated users can insert notifications"
  ON public.vendor_notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Super admins full access notifications"
  ON public.vendor_notifications FOR ALL
  USING (is_super_admin(auth.uid()));

CREATE INDEX idx_vendor_notifications_vendor_id ON public.vendor_notifications(vendor_id);
CREATE INDEX idx_vendor_notifications_is_read ON public.vendor_notifications(vendor_id, is_read);

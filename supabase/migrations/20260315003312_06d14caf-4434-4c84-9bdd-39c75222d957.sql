
-- Vendor ratings table
CREATE TABLE public.vendor_ratings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(vendor_id, user_id)
);

ALTER TABLE public.vendor_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view ratings" ON public.vendor_ratings FOR SELECT USING (true);
CREATE POLICY "Auth users can rate" ON public.vendor_ratings FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own rating" ON public.vendor_ratings FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own rating" ON public.vendor_ratings FOR DELETE USING (user_id = auth.uid());
CREATE POLICY "Super admins manage ratings" ON public.vendor_ratings FOR ALL USING (is_super_admin(auth.uid()));

CREATE INDEX idx_vendor_ratings_vendor ON public.vendor_ratings(vendor_id);
CREATE INDEX idx_vendor_ratings_user ON public.vendor_ratings(user_id);

-- Add is_active column to profiles for user status management
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Allow admins to view all roles (for sub-admin management)
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'sub_admin'))
);


-- Track vendor page views
CREATE TABLE public.vendor_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  viewer_id uuid,
  school_id uuid REFERENCES public.schools(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.vendor_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert views" ON public.vendor_views FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Super admins can view all" ON public.vendor_views FOR SELECT TO public USING (is_super_admin(auth.uid()));
CREATE POLICY "Vendors can view own stats" ON public.vendor_views FOR SELECT TO public 
  USING (EXISTS (SELECT 1 FROM vendors WHERE vendors.id = vendor_views.vendor_id AND vendors.user_id = auth.uid()));

-- Track vendor likes
CREATE TABLE public.vendor_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(vendor_id, user_id)
);
ALTER TABLE public.vendor_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view likes" ON public.vendor_likes FOR SELECT TO public USING (true);
CREATE POLICY "Auth users can like" ON public.vendor_likes FOR INSERT TO public WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can unlike" ON public.vendor_likes FOR DELETE TO public USING (user_id = auth.uid());

-- Track vendor comments
CREATE TABLE public.vendor_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.vendor_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view comments" ON public.vendor_comments FOR SELECT TO public USING (true);
CREATE POLICY "Auth users can comment" ON public.vendor_comments FOR INSERT TO public WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own comments" ON public.vendor_comments FOR DELETE TO public USING (user_id = auth.uid());
CREATE POLICY "Super admins can manage comments" ON public.vendor_comments FOR ALL TO public USING (is_super_admin(auth.uid()));

-- Track contact clicks
CREATE TABLE public.vendor_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  contact_type text NOT NULL DEFAULT 'call',
  school_id uuid REFERENCES public.schools(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.vendor_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert contacts" ON public.vendor_contacts FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Super admins can view all contacts" ON public.vendor_contacts FOR SELECT TO public USING (is_super_admin(auth.uid()));
CREATE POLICY "Vendors can view own contacts" ON public.vendor_contacts FOR SELECT TO public 
  USING (EXISTS (SELECT 1 FROM vendors WHERE vendors.id = vendor_contacts.vendor_id AND vendors.user_id = auth.uid()));

-- Track site visits for analytics
CREATE TABLE public.site_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id uuid,
  school_id uuid REFERENCES public.schools(id),
  page_path text NOT NULL DEFAULT '/',
  referrer text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert visits" ON public.site_visits FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Super admins can view visits" ON public.site_visits FOR SELECT TO public USING (is_super_admin(auth.uid()));

-- Admin activity log
CREATE TABLE public.admin_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  action text NOT NULL,
  target_type text,
  target_id uuid,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins full access logs" ON public.admin_activity_log FOR ALL TO public USING (is_super_admin(auth.uid()));
CREATE POLICY "Admins can view logs" ON public.admin_activity_log FOR SELECT TO public 
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));
CREATE POLICY "Anyone can insert logs" ON public.admin_activity_log FOR INSERT TO public WITH CHECK (true);

-- Add reels_enabled to vendors
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS reels_enabled boolean DEFAULT false;

-- Sub-admin school assignments
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS assigned_school_id uuid REFERENCES public.schools(id);

-- Indexes
CREATE INDEX idx_vendor_views_vendor ON public.vendor_views(vendor_id);
CREATE INDEX idx_vendor_views_school ON public.vendor_views(school_id);
CREATE INDEX idx_vendor_likes_vendor ON public.vendor_likes(vendor_id);
CREATE INDEX idx_vendor_comments_vendor ON public.vendor_comments(vendor_id);
CREATE INDEX idx_vendor_contacts_vendor ON public.vendor_contacts(vendor_id);
CREATE INDEX idx_site_visits_school ON public.site_visits(school_id);
CREATE INDEX idx_site_visits_created ON public.site_visits(created_at);
CREATE INDEX idx_admin_activity_admin ON public.admin_activity_log(admin_id);

-- Sub-admin policies
CREATE POLICY "Sub admins can view school views" ON public.vendor_views FOR SELECT TO public 
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('admin', 'sub_admin') AND (user_roles.assigned_school_id = vendor_views.school_id OR user_roles.role = 'admin')));

CREATE POLICY "Sub admins can view school contacts" ON public.vendor_contacts FOR SELECT TO public 
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('admin', 'sub_admin') AND (user_roles.assigned_school_id = vendor_contacts.school_id OR user_roles.role = 'admin')));

CREATE POLICY "Sub admins can view site visits" ON public.site_visits FOR SELECT TO public 
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('admin', 'sub_admin') AND (user_roles.assigned_school_id = site_visits.school_id OR user_roles.role = 'admin')));

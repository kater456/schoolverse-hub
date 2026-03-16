-- Fix admin_activity_log recursive policy
DROP POLICY IF EXISTS "Admins can view logs" ON public.admin_activity_log;
CREATE POLICY "Admins can view logs"
ON public.admin_activity_log
FOR SELECT
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'sub_admin')
);

-- Fix site_visits recursive policy
DROP POLICY IF EXISTS "Sub admins can view site visits" ON public.site_visits;
CREATE POLICY "Sub admins can view site visits"
ON public.site_visits
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'sub_admin'
      AND ur.assigned_school_id = site_visits.school_id
  )
);

-- Fix vendor_views recursive policy
DROP POLICY IF EXISTS "Sub admins can view school views" ON public.vendor_views;
CREATE POLICY "Sub admins can view school views"
ON public.vendor_views
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'sub_admin'
      AND ur.assigned_school_id = vendor_views.school_id
  )
);

-- Fix vendor_contacts recursive policy
DROP POLICY IF EXISTS "Sub admins can view school contacts" ON public.vendor_contacts;
CREATE POLICY "Sub admins can view school contacts"
ON public.vendor_contacts
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'sub_admin'
      AND ur.assigned_school_id = vendor_contacts.school_id
  )
);

-- Fix vendors recursive policy
DROP POLICY IF EXISTS "Sub admins can manage school vendors" ON public.vendors;
CREATE POLICY "Sub admins can manage school vendors"
ON public.vendors
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'sub_admin'
      AND ur.assigned_school_id = vendors.school_id
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'sub_admin'
      AND ur.assigned_school_id = vendors.school_id
  )
);

-- Enable RLS on vendor_stats
ALTER TABLE public.vendor_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view vendor stats" ON public.vendor_stats FOR SELECT USING (true);
CREATE POLICY "System can manage vendor stats" ON public.vendor_stats FOR ALL TO authenticated USING (public.is_super_admin(auth.uid()));

-- Enable RLS on user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage users" ON public.user_profiles;
CREATE POLICY "Admins manage users"
ON public.user_profiles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()));

CREATE POLICY "Users view own profile"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());
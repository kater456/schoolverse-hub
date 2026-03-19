
-- Ads management table
CREATE TABLE public.platform_ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  media_url text NOT NULL,
  media_type text NOT NULL DEFAULT 'image',
  is_active boolean NOT NULL DEFAULT true,
  display_duration integer NOT NULL DEFAULT 60,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_ads ENABLE ROW LEVEL SECURITY;

-- Anyone can view active ads
CREATE POLICY "Anyone can view active ads" ON public.platform_ads
  FOR SELECT TO public USING (is_active = true);

-- Super admins can manage ads
CREATE POLICY "Super admins manage ads" ON public.platform_ads
  FOR ALL TO public USING (is_super_admin(auth.uid()));

-- Vendor contact edit tracking table
CREATE TABLE public.vendor_contact_edits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  edited_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.vendor_contact_edits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors can view own edits" ON public.vendor_contact_edits
  FOR SELECT TO public USING (
    EXISTS (SELECT 1 FROM vendors WHERE vendors.id = vendor_contact_edits.vendor_id AND vendors.user_id = auth.uid())
  );

CREATE POLICY "Vendors can insert own edits" ON public.vendor_contact_edits
  FOR INSERT TO public WITH CHECK (
    EXISTS (SELECT 1 FROM vendors WHERE vendors.id = vendor_contact_edits.vendor_id AND vendors.user_id = auth.uid())
  );

CREATE POLICY "Super admins manage contact edits" ON public.vendor_contact_edits
  FOR ALL TO public USING (is_super_admin(auth.uid()));


-- Add 'vendor' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'vendor';

-- Campus locations table
CREATE TABLE IF NOT EXISTS public.campus_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(school_id, name)
);

ALTER TABLE public.campus_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view campus locations" ON public.campus_locations FOR SELECT USING (true);
CREATE POLICY "Super admins can manage campus locations" ON public.campus_locations FOR ALL USING (is_super_admin(auth.uid()));

-- Vendors table (public info only)
CREATE TABLE IF NOT EXISTS public.vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  business_name text NOT NULL,
  category text NOT NULL,
  description text,
  contact_number text,
  messaging_enabled boolean DEFAULT true,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  campus_location_id uuid REFERENCES public.campus_locations(id) ON DELETE SET NULL,
  is_approved boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view approved vendors" ON public.vendors FOR SELECT USING (is_approved = true AND is_active = true);
CREATE POLICY "Super admins can view all vendors" ON public.vendors FOR SELECT USING (is_super_admin(auth.uid()));
CREATE POLICY "Super admins can manage vendors" ON public.vendors FOR ALL USING (is_super_admin(auth.uid()));
CREATE POLICY "Vendors can insert their listing" ON public.vendors FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Vendors can update their listing" ON public.vendors FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Vendors can view their own listing" ON public.vendors FOR SELECT USING (user_id = auth.uid());

-- Vendor private details (admin-only access)
CREATE TABLE IF NOT EXISTS public.vendor_private_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE UNIQUE,
  full_name text NOT NULL,
  vendor_photo_url text,
  residential_location text,
  personal_contact text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vendor_private_details ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins full access to private details" ON public.vendor_private_details FOR ALL USING (is_super_admin(auth.uid()));
CREATE POLICY "Vendors can insert their private details" ON public.vendor_private_details FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.vendors WHERE id = vendor_private_details.vendor_id AND user_id = auth.uid())
);
CREATE POLICY "Vendors can view own private details" ON public.vendor_private_details FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.vendors WHERE id = vendor_private_details.vendor_id AND user_id = auth.uid())
);
CREATE POLICY "Vendors can update own private details" ON public.vendor_private_details FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.vendors WHERE id = vendor_private_details.vendor_id AND user_id = auth.uid())
);

-- Vendor images table
CREATE TABLE IF NOT EXISTS public.vendor_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  is_primary boolean DEFAULT false,
  display_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vendor_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view vendor images" ON public.vendor_images FOR SELECT USING (true);
CREATE POLICY "Vendors can manage their images" ON public.vendor_images FOR ALL USING (
  EXISTS (SELECT 1 FROM public.vendors WHERE id = vendor_images.vendor_id AND user_id = auth.uid())
);
CREATE POLICY "Super admins can manage all images" ON public.vendor_images FOR ALL USING (is_super_admin(auth.uid()));

-- Vendor videos table
CREATE TABLE IF NOT EXISTS public.vendor_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  video_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vendor_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view vendor videos" ON public.vendor_videos FOR SELECT USING (true);
CREATE POLICY "Vendors can manage their videos" ON public.vendor_videos FOR ALL USING (
  EXISTS (SELECT 1 FROM public.vendors WHERE id = vendor_videos.vendor_id AND user_id = auth.uid())
);
CREATE POLICY "Super admins can manage all videos" ON public.vendor_videos FOR ALL USING (is_super_admin(auth.uid()));

-- Featured listings table
CREATE TABLE IF NOT EXISTS public.featured_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  payment_status text NOT NULL DEFAULT 'pending',
  payment_reference text,
  amount numeric NOT NULL DEFAULT 2000,
  confirmed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.featured_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active featured listings" ON public.featured_listings FOR SELECT USING (payment_status = 'confirmed' AND ends_at > now());
CREATE POLICY "Vendors can view their featured requests" ON public.featured_listings FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.vendors WHERE id = featured_listings.vendor_id AND user_id = auth.uid())
);
CREATE POLICY "Vendors can request featured listing" ON public.featured_listings FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.vendors WHERE id = featured_listings.vendor_id AND user_id = auth.uid())
);
CREATE POLICY "Super admins can manage featured listings" ON public.featured_listings FOR ALL USING (is_super_admin(auth.uid()));

-- Helper function
CREATE OR REPLACE FUNCTION public.is_vendor_featured(_vendor_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.featured_listings
    WHERE vendor_id = _vendor_id
    AND payment_status = 'confirmed'
    AND ends_at > now()
  )
$$;

-- Triggers
CREATE TRIGGER update_campus_locations_updated_at BEFORE UPDATE ON public.campus_locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON public.vendors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Storage bucket for vendor media
INSERT INTO storage.buckets (id, name, public) VALUES ('vendor-media', 'vendor-media', true);

-- Storage RLS
CREATE POLICY "Anyone can view vendor media" ON storage.objects FOR SELECT USING (bucket_id = 'vendor-media');
CREATE POLICY "Authenticated users can upload vendor media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'vendor-media' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update their own media" ON storage.objects FOR UPDATE USING (bucket_id = 'vendor-media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can delete their own media" ON storage.objects FOR DELETE USING (bucket_id = 'vendor-media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Seed schools
INSERT INTO public.schools (name, subdomain)
SELECT 'University of Nigeria', 'unn'
WHERE NOT EXISTS (SELECT 1 FROM public.schools WHERE name = 'University of Nigeria');

INSERT INTO public.schools (name, subdomain)
SELECT 'University of Professional Studies, Accra (UPSA)', 'upsa'
WHERE NOT EXISTS (SELECT 1 FROM public.schools WHERE name LIKE 'University of Professional Studies%');


ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS show_academic_info BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS academic_level TEXT;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS department TEXT;

-- Update existing records to have a default value for show_academic_info if needed (though DEFAULT false handles new ones)
-- and these columns are nullable except show_academic_info.

/*
RECOMMENDATION FOR RLS/SECURITY:
The current public SELECT policy on public.vendors exposes all columns including address, city, landmark, and location.
To fully secure this data at the database level, we recommend:

1. Create a public view that excludes sensitive columns:
   CREATE OR REPLACE VIEW public.vendor_public_profiles AS
   SELECT
     id, user_id, business_name, category, description, contact_number,
     messaging_enabled, school_id, campus_location_id, is_approved, is_active,
     created_at, updated_at, country, is_verified, profile_image_url,
     banner_url, store_theme_color, store_layout, is_store_upgraded,
     store_upgrade_expires_at, reels_enabled, show_academic_info,
     CASE WHEN show_academic_info THEN academic_level ELSE NULL END as academic_level,
     CASE WHEN show_academic_info THEN department ELSE NULL END as department
   FROM public.vendors
   WHERE is_approved = true AND is_active = true;

2. Grant access to this view to 'anon' and 'authenticated' roles.
3. Update frontend public queries to use 'vendor_public_profiles' instead of 'vendors'.
*/


-- Hardening Vendor Privacy: Move sensitive location data to private table
-- Ensures address, city, landmark, and GPS coordinates are not public.

-- Ensure PostGIS is available for geography type
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Add columns to vendor_private_details if they don't exist
ALTER TABLE public.vendor_private_details
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS landmark TEXT,
ADD COLUMN IF NOT EXISTS location GEOGRAPHY(POINT);

-- 2. Migrate existing data from vendors to vendor_private_details
-- We use a DO block to safely check if columns exist in vendors
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'address') THEN
        UPDATE public.vendor_private_details vpd
        SET
            address = v.address,
            city = v.city,
            landmark = v.landmark,
            location = v.location
        FROM public.vendors v
        WHERE vpd.vendor_id = v.id;

        -- Also handle cases where a private_details row doesn't exist yet (unlikely for active vendors)
        INSERT INTO public.vendor_private_details (vendor_id, address, city, landmark, location, full_name)
        SELECT id, address, city, landmark, location, business_name
        FROM public.vendors v
        WHERE NOT EXISTS (SELECT 1 FROM public.vendor_private_details WHERE vendor_id = v.id)
        AND (address IS NOT NULL OR city IS NOT NULL OR landmark IS NOT NULL OR location IS NOT NULL);

        -- 3. Drop columns from vendors table
        ALTER TABLE public.vendors DROP COLUMN IF EXISTS address;
        ALTER TABLE public.vendors DROP COLUMN IF EXISTS city;
        ALTER TABLE public.vendors DROP COLUMN IF EXISTS landmark;
        ALTER TABLE public.vendors DROP COLUMN IF EXISTS location;
    END IF;
END $$;

-- 4. Academic Info Privacy
-- While we keep academic_level and department in vendors for the opt-in badge,
-- we'll ensure they are only visible when approved (already covered by main policy).
-- We'll add a comment for future developers.
COMMENT ON COLUMN public.vendors.academic_level IS 'Publicly visible only if show_academic_info is TRUE (handled in UI).';
COMMENT ON COLUMN public.vendors.department IS 'Publicly visible only if show_academic_info is TRUE (handled in UI).';

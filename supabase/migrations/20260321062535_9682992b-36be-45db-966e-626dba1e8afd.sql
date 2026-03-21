-- Add paystack_required toggle to platform_settings (admin controls when to enable)
ALTER TABLE public.platform_settings ADD COLUMN IF NOT EXISTS paystack_required boolean DEFAULT false;

-- Add is_verified badge field to vendors
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;
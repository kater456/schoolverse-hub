
-- Add featured_reels_enabled toggle to platform_settings
ALTER TABLE public.platform_settings 
ADD COLUMN IF NOT EXISTS featured_reels_enabled boolean DEFAULT false;

-- Add promotion_notified flag to user_roles to track one-time popup
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS promotion_notified boolean DEFAULT true;

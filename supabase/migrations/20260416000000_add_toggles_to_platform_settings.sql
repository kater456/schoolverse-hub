ALTER TABLE public.platform_settings
ADD COLUMN IF NOT EXISTS store_upgrade_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS verification_payment_enabled BOOLEAN DEFAULT true;

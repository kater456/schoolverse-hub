-- Update marketplace_analytics table with additional columns
ALTER TABLE public.marketplace_analytics
ADD COLUMN IF NOT EXISTS device_type TEXT,
ADD COLUMN IF NOT EXISTS campus_name TEXT,
ADD COLUMN IF NOT EXISTS vendor_category TEXT;

-- Add check constraint for event_type
ALTER TABLE public.marketplace_analytics
DROP CONSTRAINT IF EXISTS marketplace_analytics_event_type_check;

ALTER TABLE public.marketplace_analytics
ADD CONSTRAINT marketplace_analytics_event_type_check
CHECK (event_type IN ('view', 'click', 'lead'));

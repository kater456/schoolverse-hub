-- Add country field to vendors table
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS country text DEFAULT 'Nigeria';

-- Enable realtime for vendors and platform_ads
ALTER PUBLICATION supabase_realtime ADD TABLE public.vendors;
ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_ads;
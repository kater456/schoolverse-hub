-- Create marketplace_analytics table
CREATE TABLE IF NOT EXISTS public.marketplace_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    anonymous_id TEXT,
    event_type TEXT NOT NULL,
    event_source TEXT NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.marketplace_analytics ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (anonymous and authenticated)
CREATE POLICY "Allow public insert to marketplace_analytics"
ON public.marketplace_analytics
FOR INSERT
TO public
WITH CHECK (true);

-- Allow authenticated users to view analytics if they are the vendor
CREATE POLICY "Vendors can view their own analytics"
ON public.marketplace_analytics
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.vendors
        WHERE public.vendors.id = public.marketplace_analytics.vendor_id
        AND public.vendors.user_id = auth.uid()
    )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_marketplace_analytics_vendor_id ON public.marketplace_analytics(vendor_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_analytics_event_type ON public.marketplace_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_marketplace_analytics_created_at ON public.marketplace_analytics(created_at);

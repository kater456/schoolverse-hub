
-- Create vendor_analytics table
CREATE TABLE IF NOT EXISTS public.vendor_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    visitor_id TEXT NOT NULL,
    occurred_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.vendor_analytics ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (anonymous tracking)
CREATE POLICY "Allow public insert to vendor_analytics"
ON public.vendor_analytics
FOR INSERT
TO public
WITH CHECK (true);

-- Allow authenticated users to view analytics if they are the vendor
CREATE POLICY "Vendors can view their own vendor_analytics"
ON public.vendor_analytics
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.vendors
        WHERE public.vendors.id = public.vendor_analytics.vendor_id
        AND public.vendors.user_id = auth.uid()
    )
);

-- Allow admins to view all analytics
CREATE POLICY "Admins can view all vendor_analytics"
ON public.vendor_analytics
FOR SELECT
TO authenticated
USING (
    public.is_super_admin(auth.uid())
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'sub_admin')
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_vendor_analytics_vendor_id ON public.vendor_analytics(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_analytics_event_type ON public.vendor_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_vendor_analytics_occurred_at ON public.vendor_analytics(occurred_at);

-- Part F: Add survey columns to vendors
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS has_completed_onboarding_survey BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS customer_acquisition_channels TEXT[];

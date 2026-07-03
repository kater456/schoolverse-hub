
-- Create store_visits table
CREATE TABLE IF NOT EXISTS public.store_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.vendor_products(id) ON DELETE CASCADE,
    visitor_id TEXT NOT NULL,
    session_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create vendor_events table
CREATE TABLE IF NOT EXISTS public.vendor_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.vendor_products(id) ON DELETE CASCADE,
    visitor_id TEXT NOT NULL,
    session_id UUID NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('view','inquiry_click','message_sent','order_started','order_completed')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create vendor_customers table
CREATE TABLE IF NOT EXISTS public.vendor_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
    buyer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    visitor_id TEXT,
    first_seen TIMESTAMPTZ DEFAULT now(),
    last_seen TIMESTAMPTZ DEFAULT now(),
    total_orders INTEGER DEFAULT 0,
    total_spent NUMERIC DEFAULT 0,
    notes TEXT,
    UNIQUE(vendor_id, buyer_id)
);

-- Add indexes
CREATE INDEX idx_store_visits_vendor_id ON public.store_visits(vendor_id);
CREATE INDEX idx_store_visits_created_at ON public.store_visits(created_at);

CREATE INDEX idx_vendor_events_vendor_id ON public.vendor_events(vendor_id);
CREATE INDEX idx_vendor_events_created_at ON public.vendor_events(created_at);

CREATE INDEX idx_vendor_customers_vendor_id ON public.vendor_customers(vendor_id);
CREATE INDEX idx_vendor_customers_first_seen ON public.vendor_customers(first_seen);

-- Enable RLS
ALTER TABLE public.store_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_customers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for store_visits
CREATE POLICY "Vendors can view their own store visits"
ON public.store_visits
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.vendors
        WHERE public.vendors.id = public.store_visits.vendor_id
        AND public.vendors.user_id = auth.uid()
    )
);

CREATE POLICY "Anyone can insert store visits"
ON public.store_visits
FOR INSERT
TO public
WITH CHECK (true);

-- RLS Policies for vendor_events
CREATE POLICY "Vendors can view their own events"
ON public.vendor_events
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.vendors
        WHERE public.vendors.id = public.vendor_events.vendor_id
        AND public.vendors.user_id = auth.uid()
    )
);

CREATE POLICY "Anyone can insert vendor events"
ON public.vendor_events
FOR INSERT
TO public
WITH CHECK (true);

-- RLS Policies for vendor_customers
CREATE POLICY "Vendors can view their own customers"
ON public.vendor_customers
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.vendors
        WHERE public.vendors.id = public.vendor_customers.vendor_id
        AND public.vendors.user_id = auth.uid()
    )
);

CREATE POLICY "Anyone can insert/update vendor customers"
ON public.vendor_customers
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Anyone can update vendor customers"
ON public.vendor_customers
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.vendor_events;

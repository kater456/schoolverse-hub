
-- Remove 'order_completed' from vendor_events event_type check constraint
ALTER TABLE public.vendor_events DROP CONSTRAINT vendor_events_event_type_check;
ALTER TABLE public.vendor_events ADD CONSTRAINT vendor_events_event_type_check CHECK (event_type IN ('view','inquiry_click','message_sent','order_started'));

-- Remove financial and order count columns from vendor_customers
ALTER TABLE public.vendor_customers DROP COLUMN IF EXISTS total_orders;
ALTER TABLE public.vendor_customers DROP COLUMN IF EXISTS total_spent;

-- Add engagement tracking columns to vendor_customers
ALTER TABLE public.vendor_customers ADD COLUMN IF NOT EXISTS inquiry_count INTEGER DEFAULT 0;
ALTER TABLE public.vendor_customers ADD COLUMN IF NOT EXISTS message_count INTEGER DEFAULT 0;

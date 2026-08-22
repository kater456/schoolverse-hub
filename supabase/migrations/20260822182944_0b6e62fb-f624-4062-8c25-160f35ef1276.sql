ALTER TABLE public.vendor_products
  ADD COLUMN IF NOT EXISTS stock_status text NOT NULL DEFAULT 'in_stock';

ALTER TABLE public.vendor_products
  DROP CONSTRAINT IF EXISTS vendor_products_stock_status_check;

ALTER TABLE public.vendor_products
  ADD CONSTRAINT vendor_products_stock_status_check
  CHECK (stock_status IN ('in_stock', 'low_stock', 'out_of_stock'));

CREATE INDEX IF NOT EXISTS idx_vendor_products_vendor_active
  ON public.vendor_products (vendor_id, is_active, display_order);

ALTER TABLE public.vendor_products REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'vendor_products'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.vendor_products;
  END IF;
END $$;
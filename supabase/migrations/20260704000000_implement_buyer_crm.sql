
-- Add has_inquired column to vendor_customers
ALTER TABLE public.vendor_customers ADD COLUMN IF NOT EXISTS has_inquired BOOLEAN DEFAULT FALSE;

-- Add unique index for anonymous visitors
CREATE UNIQUE INDEX IF NOT EXISTS idx_vendor_customers_visitor_no_buyer
ON public.vendor_customers(vendor_id, visitor_id)
WHERE (buyer_id IS NULL);

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_vendor_customers_buyer_id ON public.vendor_customers(buyer_id);
CREATE INDEX IF NOT EXISTS idx_vendor_customers_visitor_id ON public.vendor_customers(visitor_id);

-- Implement tracking RPC
CREATE OR REPLACE FUNCTION public.track_vendor_customer(
  p_vendor_id UUID,
  p_buyer_id UUID DEFAULT NULL,
  p_visitor_id TEXT DEFAULT NULL,
  p_is_order BOOLEAN DEFAULT FALSE,
  p_amount NUMERIC DEFAULT 0,
  p_is_inquiry BOOLEAN DEFAULT FALSE
) RETURNS VOID AS $$
DECLARE
  v_customer_id UUID;
BEGIN
  -- 1. Try to find by buyer_id if provided
  IF p_buyer_id IS NOT NULL THEN
    SELECT id INTO v_customer_id FROM public.vendor_customers
    WHERE vendor_id = p_vendor_id AND buyer_id = p_buyer_id;

    IF v_customer_id IS NOT NULL THEN
      UPDATE public.vendor_customers
      SET
        last_seen = now(),
        visitor_id = COALESCE(p_visitor_id, visitor_id),
        total_orders = total_orders + CASE WHEN p_is_order THEN 1 ELSE 0 END,
        total_spent = total_spent + CASE WHEN p_is_order THEN p_amount ELSE 0 END,
        has_inquired = has_inquired OR p_is_inquiry
      WHERE id = v_customer_id;
      RETURN;
    END IF;

    -- If not found by buyer_id, but we have visitor_id, maybe we can "upgrade" an anonymous record
    IF p_visitor_id IS NOT NULL THEN
       SELECT id INTO v_customer_id FROM public.vendor_customers
       WHERE vendor_id = p_vendor_id AND visitor_id = p_visitor_id AND buyer_id IS NULL;

       IF v_customer_id IS NOT NULL THEN
         UPDATE public.vendor_customers
         SET
           buyer_id = p_buyer_id,
           last_seen = now(),
           total_orders = total_orders + CASE WHEN p_is_order THEN 1 ELSE 0 END,
           total_spent = total_spent + CASE WHEN p_is_order THEN p_amount ELSE 0 END,
           has_inquired = has_inquired OR p_is_inquiry
         WHERE id = v_customer_id;
         RETURN;
       END IF;
    END IF;

    -- Not found anywhere, insert new record with buyer_id
    INSERT INTO public.vendor_customers (
      vendor_id,
      buyer_id,
      visitor_id,
      last_seen,
      total_orders,
      total_spent,
      has_inquired
    )
    VALUES (
      p_vendor_id,
      p_buyer_id,
      p_visitor_id,
      now(),
      CASE WHEN p_is_order THEN 1 ELSE 0 END,
      CASE WHEN p_is_order THEN p_amount ELSE 0 END,
      p_is_inquiry
    );

  ELSIF p_visitor_id IS NOT NULL THEN
    -- 2. No buyer_id, try to find by visitor_id (anonymous)
    SELECT id INTO v_customer_id FROM public.vendor_customers
    WHERE vendor_id = p_vendor_id AND visitor_id = p_visitor_id AND buyer_id IS NULL;

    IF v_customer_id IS NOT NULL THEN
      UPDATE public.vendor_customers
      SET
        last_seen = now(),
        total_orders = total_orders + CASE WHEN p_is_order THEN 1 ELSE 0 END,
        total_spent = total_spent + CASE WHEN p_is_order THEN p_amount ELSE 0 END,
        has_inquired = has_inquired OR p_is_inquiry
      WHERE id = v_customer_id;
    ELSE
      -- Insert new anonymous record
      INSERT INTO public.vendor_customers (
        vendor_id,
        visitor_id,
        last_seen,
        total_orders,
        total_spent,
        has_inquired
      )
      VALUES (
        p_vendor_id,
        p_visitor_id,
        now(),
        CASE WHEN p_is_order THEN 1 ELSE 0 END,
        CASE WHEN p_is_order THEN p_amount ELSE 0 END,
        p_is_inquiry
      );
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

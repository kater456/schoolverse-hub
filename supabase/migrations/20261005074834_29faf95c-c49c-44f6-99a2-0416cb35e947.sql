-- 1. Vendor sales mode
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS sales_mode text NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS payment_instructions text;
ALTER TABLE public.vendors DROP CONSTRAINT IF EXISTS vendors_sales_mode_check;
ALTER TABLE public.vendors ADD CONSTRAINT vendors_sales_mode_check CHECK (sales_mode IN ('standard','preorder'));

-- 2. Tables
CREATE TABLE public.preorders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  public_code text NOT NULL UNIQUE,
  item_count integer NOT NULL CHECK (item_count > 0),
  payment_status text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','paid')),
  delivery_status text NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending','delivered')),
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  delivered_at timestamptz
);
GRANT SELECT, UPDATE ON public.preorders TO authenticated;
GRANT ALL ON public.preorders TO service_role;
ALTER TABLE public.preorders ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.preorder_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  preorder_id uuid NOT NULL REFERENCES public.preorders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.vendor_products(id) ON DELETE SET NULL,
  product_name text NOT NULL DEFAULT '',
  quantity integer NOT NULL CHECK (quantity > 0)
);
GRANT SELECT ON public.preorder_items TO authenticated;
GRANT ALL ON public.preorder_items TO service_role;
ALTER TABLE public.preorder_items ENABLE ROW LEVEL SECURITY;

CREATE INDEX preorders_vendor_created_idx ON public.preorders (vendor_id, created_at DESC);
CREATE INDEX preorders_customer_idx ON public.preorders (customer_id);
CREATE INDEX preorder_items_preorder_idx ON public.preorder_items (preorder_id);

-- 3. Triggers
CREATE OR REPLACE FUNCTION public.preorder_generate_code()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  candidate text;
  i int;
BEGIN
  LOOP
    candidate := 'CM-';
    FOR i IN 1..4 LOOP
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.preorders WHERE public_code = candidate);
  END LOOP;
  NEW.public_code := candidate;
  NEW.payment_status := 'unpaid';
  NEW.delivery_status := 'pending';
  NEW.paid_at := NULL;
  NEW.delivered_at := NULL;
  NEW.created_at := now();
  RETURN NEW;
END; $$;

CREATE TRIGGER preorders_before_insert
BEFORE INSERT ON public.preorders
FOR EACH ROW EXECUTE FUNCTION public.preorder_generate_code();

CREATE OR REPLACE FUNCTION public.preorder_guard_update()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.customer_id IS DISTINCT FROM OLD.customer_id
     OR NEW.vendor_id IS DISTINCT FROM OLD.vendor_id
     OR NEW.item_count IS DISTINCT FROM OLD.item_count
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.public_code IS DISTINCT FROM OLD.public_code THEN
    RAISE EXCEPTION 'Only payment and delivery status can be changed on a pre-order';
  END IF;

  IF OLD.delivery_status = 'delivered' AND NEW.delivery_status <> 'delivered' THEN
    RAISE EXCEPTION 'A delivered pre-order cannot be reverted';
  END IF;

  IF NEW.delivery_status = 'delivered' AND NEW.payment_status <> 'paid' THEN
    RAISE EXCEPTION 'A pre-order must be marked paid before it can be delivered';
  END IF;

  -- Timestamps are always server-controlled
  IF NEW.payment_status = 'paid' AND OLD.payment_status <> 'paid' THEN
    NEW.paid_at := now();
  ELSIF NEW.payment_status = 'unpaid' THEN
    NEW.paid_at := NULL;
  ELSE
    NEW.paid_at := OLD.paid_at;
  END IF;

  IF NEW.delivery_status = 'delivered' AND OLD.delivery_status <> 'delivered' THEN
    NEW.delivered_at := now();
  ELSE
    NEW.delivered_at := OLD.delivered_at;
  END IF;

  RETURN NEW;
END; $$;

CREATE TRIGGER preorders_before_update
BEFORE UPDATE ON public.preorders
FOR EACH ROW EXECUTE FUNCTION public.preorder_guard_update();

-- 4. RLS
CREATE POLICY "Customers view own preorders" ON public.preorders
FOR SELECT TO authenticated USING (customer_id = auth.uid());

CREATE POLICY "Vendors view their preorders" ON public.preorders
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_id AND v.user_id = auth.uid()));

CREATE POLICY "Vendors update their preorder statuses" ON public.preorders
FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_id AND v.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_id AND v.user_id = auth.uid()));

CREATE POLICY "Admins view all preorders" ON public.preorders
FOR SELECT TO authenticated
USING (public.is_super_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update preorder statuses" ON public.preorders
FOR UPDATE TO authenticated
USING (public.is_super_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.is_super_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Read items of visible preorders" ON public.preorder_items
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.preorders p
  WHERE p.id = preorder_id
    AND (
      p.customer_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = p.vendor_id AND v.user_id = auth.uid())
      OR public.is_super_admin(auth.uid())
      OR public.has_role(auth.uid(), 'admin')
    )
));

-- 5. Atomic order placement (customer insert path)
CREATE OR REPLACE FUNCTION public.place_preorder(_vendor_id uuid, _items jsonb)
RETURNS TABLE(id uuid, public_code text, item_count integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_total int := 0;
  v_order public.preorders%ROWTYPE;
  r record;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Please sign in to place a pre-order'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.vendors
    WHERE vendors.id = _vendor_id AND sales_mode = 'preorder'
      AND is_approved = true AND COALESCE(is_active, true) = true
      AND COALESCE(is_suspended, false) = false
  ) THEN
    RAISE EXCEPTION 'This vendor is not accepting pre-orders';
  END IF;

  IF _items IS NULL OR jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) = 0 THEN
    RAISE EXCEPTION 'Your pre-order cart is empty';
  END IF;

  FOR r IN
    SELECT (e->>'product_id')::uuid AS product_id, (e->>'quantity')::int AS quantity
    FROM jsonb_array_elements(_items) e
  LOOP
    IF r.quantity IS NULL OR r.quantity < 1 OR r.quantity > 99 THEN
      RAISE EXCEPTION 'Each item quantity must be between 1 and 99';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.vendor_products vp
      WHERE vp.id = r.product_id AND vp.vendor_id = _vendor_id AND COALESCE(vp.is_active, true) = true
    ) THEN
      RAISE EXCEPTION 'One of the items is no longer available';
    END IF;
    v_total := v_total + r.quantity;
  END LOOP;

  INSERT INTO public.preorders (vendor_id, customer_id, public_code, item_count)
  VALUES (_vendor_id, v_uid, 'pending', v_total)
  RETURNING * INTO v_order;

  INSERT INTO public.preorder_items (preorder_id, product_id, product_name, quantity)
  SELECT v_order.id, vp.id, vp.name, (e->>'quantity')::int
  FROM jsonb_array_elements(_items) e
  JOIN public.vendor_products vp ON vp.id = (e->>'product_id')::uuid;

  RETURN QUERY SELECT v_order.id, v_order.public_code, v_order.item_count;
END; $$;

REVOKE ALL ON FUNCTION public.place_preorder(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.place_preorder(uuid, jsonb) TO authenticated;

-- 6. Vendor-only customer contact lookup
CREATE OR REPLACE FUNCTION public.get_preorder_customers(_vendor_id uuid)
RETURNS TABLE(preorder_id uuid, first_name text, last_name text, phone text, email text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, pr.first_name, pr.last_name, pr.phone, pr.email
  FROM public.preorders p
  JOIN public.vendors v ON v.id = p.vendor_id
  LEFT JOIN public.profiles pr ON pr.user_id = p.customer_id
  WHERE p.vendor_id = _vendor_id AND v.user_id = auth.uid()
$$;
REVOKE ALL ON FUNCTION public.get_preorder_customers(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_preorder_customers(uuid) TO authenticated;

-- 7. Public anonymous ledger (safe columns only)
CREATE VIEW public.public_preorder_ledger
WITH (security_barrier = true) AS
SELECT vendor_id, public_code, item_count, payment_status, delivery_status,
       created_at, paid_at, delivered_at
FROM public.preorders;
GRANT SELECT ON public.public_preorder_ledger TO anon, authenticated;

-- 8. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.preorders;
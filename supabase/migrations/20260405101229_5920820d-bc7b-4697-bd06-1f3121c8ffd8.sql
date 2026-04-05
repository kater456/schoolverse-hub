
-- Create vendor_products table
CREATE TABLE public.vendor_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  image_url TEXT,
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.vendor_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active vendor products"
  ON public.vendor_products FOR SELECT
  USING (is_active = true);

CREATE POLICY "Vendors can manage their own products"
  ON public.vendor_products FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.vendors WHERE vendors.id = vendor_products.vendor_id AND vendors.user_id = auth.uid()
  ));

CREATE POLICY "Super admins can manage all vendor products"
  ON public.vendor_products FOR ALL
  USING (public.is_super_admin(auth.uid()));

CREATE TRIGGER update_vendor_products_updated_at
  BEFORE UPDATE ON public.vendor_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create vendor_store_upgrades table
CREATE TABLE public.vendor_store_upgrades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  payment_reference TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  amount NUMERIC NOT NULL DEFAULT 1500,
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '30 days'),
  confirmed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.vendor_store_upgrades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors can view their own store upgrades"
  ON public.vendor_store_upgrades FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.vendors WHERE vendors.id = vendor_store_upgrades.vendor_id AND vendors.user_id = auth.uid()
  ));

CREATE POLICY "Vendors can request store upgrades"
  ON public.vendor_store_upgrades FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.vendors WHERE vendors.id = vendor_store_upgrades.vendor_id AND vendors.user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage all store upgrades"
  ON public.vendor_store_upgrades FOR ALL
  USING (public.is_super_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'sub_admin'));

-- Add store customization columns to vendors
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS banner_url TEXT,
  ADD COLUMN IF NOT EXISTS store_theme_color TEXT DEFAULT '#1e3a5f',
  ADD COLUMN IF NOT EXISTS store_layout TEXT DEFAULT 'grid',
  ADD COLUMN IF NOT EXISTS is_store_upgraded BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS store_upgrade_expires_at TIMESTAMP WITH TIME ZONE;

-- Enable realtime for vendor_products
ALTER PUBLICATION supabase_realtime ADD TABLE public.vendor_products;

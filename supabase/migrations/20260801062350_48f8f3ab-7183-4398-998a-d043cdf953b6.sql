-- ── Extend vendor_deals ───────────────────────────────────────────────
ALTER TABLE public.vendor_deals
  ADD COLUMN IF NOT EXISTS discount_type text NOT NULL DEFAULT 'custom_text',
  ADD COLUMN IF NOT EXISTS discount_value numeric,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS starts_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS vendor_deals_active_window_idx
  ON public.vendor_deals (is_active, starts_at, expires_at);

-- Public read policy: only live deals
DROP POLICY IF EXISTS "Public can view active deals" ON public.vendor_deals;
DROP POLICY IF EXISTS "Anyone can view active deals" ON public.vendor_deals;
CREATE POLICY "Public can view live deals"
  ON public.vendor_deals FOR SELECT
  TO anon, authenticated
  USING (is_active = true AND starts_at <= now() AND expires_at > now());

GRANT SELECT ON public.vendor_deals TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_deals TO authenticated;
GRANT ALL ON public.vendor_deals TO service_role;

-- ── Extend platform_ads ───────────────────────────────────────────────
ALTER TABLE public.platform_ads
  ADD COLUMN IF NOT EXISTS starts_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS priority integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS platform_ads_placement_idx
  ON public.platform_ads (is_active, display_position, priority DESC);

DROP POLICY IF EXISTS "Anyone can view active ads" ON public.platform_ads;
DROP POLICY IF EXISTS "Public can view active ads" ON public.platform_ads;
CREATE POLICY "Public can view scheduled active ads"
  ON public.platform_ads FOR SELECT
  TO anon, authenticated
  USING (is_active = true AND starts_at <= now() AND (ends_at IS NULL OR ends_at > now()));

GRANT SELECT ON public.platform_ads TO anon;
GRANT SELECT ON public.platform_ads TO authenticated;
GRANT ALL ON public.platform_ads TO service_role;
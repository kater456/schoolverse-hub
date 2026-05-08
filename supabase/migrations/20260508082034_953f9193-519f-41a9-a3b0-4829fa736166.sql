-- Enable RLS and allow public ad event tracking, restrict reads to admins
ALTER TABLE public.ad_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can log ad events" ON public.ad_events;
CREATE POLICY "Anyone can log ad events"
  ON public.ad_events FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view ad events" ON public.ad_events;
CREATE POLICY "Admins can view ad events"
  ON public.ad_events FOR SELECT
  USING (is_super_admin(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'sub_admin'::app_role));

-- Indexes for ad analytics at scale
CREATE INDEX IF NOT EXISTS idx_ad_events_ad_created ON public.ad_events (ad_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ad_events_school     ON public.ad_events (school_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ad_events_type       ON public.ad_events (event_type);
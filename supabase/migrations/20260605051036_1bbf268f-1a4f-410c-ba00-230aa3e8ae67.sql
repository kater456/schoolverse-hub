
-- 1. reel_likes
CREATE TABLE public.reel_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reel_id uuid NOT NULL,
  user_id uuid,
  session_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reel_likes_one_identity CHECK (user_id IS NOT NULL OR session_id IS NOT NULL)
);
CREATE UNIQUE INDEX reel_likes_user_unique ON public.reel_likes(reel_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX reel_likes_session_unique ON public.reel_likes(reel_id, session_id) WHERE session_id IS NOT NULL AND user_id IS NULL;
CREATE INDEX reel_likes_reel_idx ON public.reel_likes(reel_id);

GRANT SELECT, INSERT, DELETE ON public.reel_likes TO anon;
GRANT SELECT, INSERT, DELETE ON public.reel_likes TO authenticated;
GRANT ALL ON public.reel_likes TO service_role;

ALTER TABLE public.reel_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reel likes" ON public.reel_likes FOR SELECT USING (true);
CREATE POLICY "Anyone can like reels" ON public.reel_likes FOR INSERT WITH CHECK (
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR (auth.uid() IS NULL AND user_id IS NULL AND session_id IS NOT NULL)
);
CREATE POLICY "Users can unlike own likes" ON public.reel_likes FOR DELETE USING (
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR (auth.uid() IS NULL AND user_id IS NULL)
);

-- 2. vendor_followers
CREATE TABLE public.vendor_followers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(vendor_id, user_id)
);
CREATE INDEX vendor_followers_vendor_idx ON public.vendor_followers(vendor_id);
CREATE INDEX vendor_followers_user_idx ON public.vendor_followers(user_id);

GRANT SELECT ON public.vendor_followers TO anon;
GRANT SELECT, INSERT, DELETE ON public.vendor_followers TO authenticated;
GRANT ALL ON public.vendor_followers TO service_role;

ALTER TABLE public.vendor_followers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view followers" ON public.vendor_followers FOR SELECT USING (true);
CREATE POLICY "Users can follow" ON public.vendor_followers FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can unfollow own" ON public.vendor_followers FOR DELETE USING (user_id = auth.uid());

-- 3. scheduled_pickups
CREATE TABLE public.scheduled_pickups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL,
  user_id uuid NOT NULL,
  pickup_at timestamptz NOT NULL,
  note text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX scheduled_pickups_vendor_idx ON public.scheduled_pickups(vendor_id);
CREATE INDEX scheduled_pickups_user_idx ON public.scheduled_pickups(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheduled_pickups TO authenticated;
GRANT ALL ON public.scheduled_pickups TO service_role;

ALTER TABLE public.scheduled_pickups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers manage own pickups" ON public.scheduled_pickups FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Vendor views own pickups" ON public.scheduled_pickups FOR SELECT
  USING (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()));
CREATE POLICY "Vendor updates own pickups" ON public.scheduled_pickups FOR UPDATE
  USING (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()))
  WITH CHECK (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()));

CREATE TRIGGER scheduled_pickups_updated_at
  BEFORE UPDATE ON public.scheduled_pickups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for promo toasts
ALTER PUBLICATION supabase_realtime ADD TABLE public.vendor_deals;

-- =============================================================================
-- 1. VENDOR_DEALS — enable RLS + policies
-- =============================================================================
ALTER TABLE public.vendor_deals ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.vendor_deals TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_deals TO authenticated;
GRANT ALL ON public.vendor_deals TO service_role;

CREATE POLICY "Public can view active deals"
  ON public.vendor_deals FOR SELECT
  USING (is_active = true);

CREATE POLICY "Vendors view own deals"
  ON public.vendor_deals FOR SELECT
  TO authenticated
  USING (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()));

CREATE POLICY "Vendors insert own deals"
  ON public.vendor_deals FOR INSERT
  TO authenticated
  WITH CHECK (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()));

CREATE POLICY "Vendors update own deals"
  ON public.vendor_deals FOR UPDATE
  TO authenticated
  USING (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()))
  WITH CHECK (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()));

CREATE POLICY "Vendors delete own deals"
  ON public.vendor_deals FOR DELETE
  TO authenticated
  USING (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()));

CREATE POLICY "Admins manage all deals"
  ON public.vendor_deals FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.has_role(auth.uid(),'admin'));

-- =============================================================================
-- 2. VENDOR_REPORTS — enable RLS + policies
-- =============================================================================
ALTER TABLE public.vendor_reports ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON public.vendor_reports TO authenticated;
GRANT UPDATE, DELETE ON public.vendor_reports TO authenticated;
GRANT ALL ON public.vendor_reports TO service_role;

CREATE POLICY "Admins read all reports"
  ON public.vendor_reports FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'sub_admin')
  );

CREATE POLICY "Reporters read own reports"
  ON public.vendor_reports FOR SELECT
  TO authenticated
  USING (reporter_id = auth.uid());

CREATE POLICY "Authenticated users file reports"
  ON public.vendor_reports FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Admins update reports"
  ON public.vendor_reports FOR UPDATE
  TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins delete reports"
  ON public.vendor_reports FOR DELETE
  TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.has_role(auth.uid(),'admin'));

-- =============================================================================
-- 3. PLATFORM_ADS — remove permissive update policy; add safe increment RPC
-- =============================================================================
DROP POLICY IF EXISTS "Anyone can update ad analytics" ON public.platform_ads;

CREATE OR REPLACE FUNCTION public.increment_ad_metric(
  _ad_id uuid,
  _metric text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _metric NOT IN ('view_count','click_count') THEN
    RAISE EXCEPTION 'invalid metric';
  END IF;

  IF _metric = 'view_count' THEN
    UPDATE public.platform_ads SET view_count = COALESCE(view_count,0) + 1
    WHERE id = _ad_id AND is_active = true;
  ELSE
    UPDATE public.platform_ads SET click_count = COALESCE(click_count,0) + 1
    WHERE id = _ad_id AND is_active = true;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_ad_metric(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_ad_metric(uuid, text) TO anon, authenticated;

-- =============================================================================
-- 4. PUSH_SUBSCRIPTIONS — close anon read/update/delete on null-user rows
-- =============================================================================
DROP POLICY IF EXISTS "Users manage their own subs" ON public.push_subscriptions;

-- Owners read/update/delete only their own rows
CREATE POLICY "Users read own subs"
  ON public.push_subscriptions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users update own subs"
  ON public.push_subscriptions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own subs"
  ON public.push_subscriptions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- INSERT policy already exists; ensure anonymous insert is still allowed (no-op if exists)
-- "Anyone can insert their subscription" with WITH CHECK true stays.

-- =============================================================================
-- 5. VOTW_NOMINATIONS — restrict UPDATE to admins
-- =============================================================================
DROP POLICY IF EXISTS "admin_update_nominations" ON public.votw_nominations;

CREATE POLICY "admin_update_nominations"
  ON public.votw_nominations FOR UPDATE
  TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.has_role(auth.uid(),'admin'));

-- =============================================================================
-- 6. PLATFORM_SETTINGS — restrict reads to authenticated
-- =============================================================================
DROP POLICY IF EXISTS "Anyone can view platform settings" ON public.platform_settings;

CREATE POLICY "Authenticated users view platform settings"
  ON public.platform_settings FOR SELECT
  TO authenticated
  USING (true);

REVOKE SELECT ON public.platform_settings FROM anon;

-- =============================================================================
-- 7. VENDOR_LIKES — restrict reads to authenticated
-- =============================================================================
DROP POLICY IF EXISTS "Anyone can view likes" ON public.vendor_likes;

CREATE POLICY "Authenticated view likes"
  ON public.vendor_likes FOR SELECT
  TO authenticated
  USING (true);

REVOKE SELECT ON public.vendor_likes FROM anon;

-- =============================================================================
-- 8. VENDOR_PRESENCE — restrict reads to authenticated
-- =============================================================================
DROP POLICY IF EXISTS "Anyone can view vendor presence" ON public.vendor_presence;

CREATE POLICY "Authenticated view vendor presence"
  ON public.vendor_presence FOR SELECT
  TO authenticated
  USING (true);

REVOKE SELECT ON public.vendor_presence FROM anon;

-- =============================================================================
-- 9. ADMIN_ACTIVITY_LOG — require auth on insert, lock admin_id to caller
-- =============================================================================
DROP POLICY IF EXISTS "Anyone can insert logs" ON public.admin_activity_log;

CREATE POLICY "Authenticated insert own log entries"
  ON public.admin_activity_log FOR INSERT
  TO authenticated
  WITH CHECK (admin_id = auth.uid());

REVOKE INSERT ON public.admin_activity_log FROM anon;

-- =============================================================================
-- 10. Function search_path hardening
-- =============================================================================
ALTER FUNCTION public.complete_transaction_if_confirmed() SET search_path = public;
ALTER FUNCTION public.update_vendor_stats() SET search_path = public;
ALTER FUNCTION public.promote_vendor_on_approval() SET search_path = public;

-- Push subscriptions table
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  school_id uuid,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert their subscription"
ON public.push_subscriptions FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users manage their own subs"
ON public.push_subscriptions FOR ALL
USING (user_id = auth.uid() OR user_id IS NULL)
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Admins read all subs"
ON public.push_subscriptions FOR SELECT
USING (is_super_admin(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_push_subs_school ON public.push_subscriptions(school_id);
CREATE INDEX IF NOT EXISTS idx_push_subs_user ON public.push_subscriptions(user_id);

-- Helper: dispatch push via edge function
CREATE OR REPLACE FUNCTION public.dispatch_push(_title text, _body text, _url text, _school_id uuid DEFAULT NULL, _tag text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text := 'https://dsqqngfaxcuvcsawgenc.supabase.co/functions/v1/send-push';
  v_anon text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzcXFuZ2ZheGN1dmNzYXdnZW5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNzQ3NjcsImV4cCI6MjA4NTc1MDc2N30.sh1jTLUIPUzC7m0_6UkViR33RofZrHejmh-eCRqjcgg';
BEGIN
  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||v_anon),
    body := jsonb_build_object('title',_title,'body',_body,'url',_url,'school_id',_school_id,'tag',_tag)
  );
EXCEPTION WHEN OTHERS THEN NULL;
END;
$$;

-- Trigger: new approved vendor
CREATE OR REPLACE FUNCTION public.push_new_vendor()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.is_approved = true AND COALESCE(OLD.is_approved,false) = false THEN
    PERFORM public.dispatch_push(
      '🎉 New vendor on your campus',
      NEW.business_name || ' just joined the marketplace.',
      '/vendor/' || NEW.id::text,
      NEW.school_id,
      'new_vendor:' || NEW.id::text
    );
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_push_new_vendor ON public.vendors;
CREATE TRIGGER trg_push_new_vendor AFTER UPDATE ON public.vendors
FOR EACH ROW EXECUTE FUNCTION public.push_new_vendor();

-- Trigger: new deal
CREATE OR REPLACE FUNCTION public.push_new_deal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_name text; v_school uuid;
BEGIN
  IF NEW.is_active = true THEN
    SELECT business_name, school_id INTO v_name, v_school FROM public.vendors WHERE id = NEW.vendor_id;
    PERFORM public.dispatch_push(
      '🔥 New deal: ' || NEW.title,
      COALESCE(v_name,'A vendor') || ' just posted a new deal.',
      '/vendor/' || NEW.vendor_id::text,
      v_school,
      'new_deal:' || NEW.id::text
    );
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_push_new_deal ON public.vendor_deals;
CREATE TRIGGER trg_push_new_deal AFTER INSERT ON public.vendor_deals
FOR EACH ROW EXECUTE FUNCTION public.push_new_deal();

-- Trigger: new ad
CREATE OR REPLACE FUNCTION public.push_new_ad()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.is_active = true THEN
    PERFORM public.dispatch_push(
      '📣 ' || COALESCE(NEW.title,'New announcement'),
      COALESCE(NEW.description,'Check out the latest update.'),
      COALESCE(NEW.link_url,'/'),
      NULL,
      'new_ad:' || NEW.id::text
    );
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_push_new_ad ON public.platform_ads;
CREATE TRIGGER trg_push_new_ad AFTER INSERT ON public.platform_ads
FOR EACH ROW EXECUTE FUNCTION public.push_new_ad();

-- Mark expiring-soon flag column to avoid re-notifying
ALTER TABLE public.vendor_deals ADD COLUMN IF NOT EXISTS expiry_notified boolean NOT NULL DEFAULT false;

-- Function: notify expiring deals (run by cron)
CREATE OR REPLACE FUNCTION public.notify_expiring_deals()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r record; v_school uuid; v_name text;
BEGIN
  FOR r IN
    SELECT * FROM public.vendor_deals
    WHERE is_active = true
      AND expiry_notified = false
      AND expires_at > now()
      AND expires_at < now() + interval '24 hours'
  LOOP
    SELECT school_id, business_name INTO v_school, v_name FROM public.vendors WHERE id = r.vendor_id;
    PERFORM public.dispatch_push(
      '⏰ Deal ending soon: ' || r.title,
      COALESCE(v_name,'A vendor') || '''s deal expires in less than 24 hours.',
      '/vendor/' || r.vendor_id::text,
      v_school,
      'deal_expiring:' || r.id::text
    );
    UPDATE public.vendor_deals SET expiry_notified = true WHERE id = r.id;
  END LOOP;
END; $$;

-- Schedule cron (hourly check)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule('notify-expiring-deals') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='notify-expiring-deals');
SELECT cron.schedule('notify-expiring-deals', '0 * * * *', $$ SELECT public.notify_expiring_deals(); $$);

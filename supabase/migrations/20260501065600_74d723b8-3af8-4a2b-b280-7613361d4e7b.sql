-- Public profile picture for vendors (separate from product/store images)
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS profile_image_url text;

-- Platform-wide in-app announcements visible to all users (customers, vendors)
CREATE TABLE IF NOT EXISTS public.platform_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,            -- 'new_vendor' | 'new_deal' | 'update' | 'general'
  title text NOT NULL,
  message text NOT NULL,
  related_id uuid,               -- vendor_id / deal_id etc
  school_id uuid,                -- optional campus scope
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view announcements"
  ON public.platform_announcements FOR SELECT
  USING (true);

CREATE POLICY "System can insert announcements"
  ON public.platform_announcements FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Super admins manage announcements"
  ON public.platform_announcements FOR ALL
  USING (is_super_admin(auth.uid()));

-- Per-user read tracking for announcements
CREATE TABLE IF NOT EXISTS public.announcement_reads (
  user_id uuid NOT NULL,
  announcement_id uuid NOT NULL REFERENCES public.platform_announcements(id) ON DELETE CASCADE,
  read_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, announcement_id)
);

ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own reads"
  ON public.announcement_reads FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Trigger: auto-announce when a vendor is approved
CREATE OR REPLACE FUNCTION public.announce_new_vendor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_approved = true AND COALESCE(OLD.is_approved, false) = false THEN
    INSERT INTO public.platform_announcements (type, title, message, related_id, school_id)
    VALUES (
      'new_vendor',
      '🎉 New vendor on your campus',
      NEW.business_name || ' just joined the marketplace.',
      NEW.id,
      NEW.school_id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_announce_new_vendor ON public.vendors;
CREATE TRIGGER trg_announce_new_vendor
  AFTER INSERT OR UPDATE OF is_approved ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.announce_new_vendor();

-- Trigger: auto-announce when a vendor creates an active deal
CREATE OR REPLACE FUNCTION public.announce_new_deal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_name text;
  v_school_id uuid;
BEGIN
  IF NEW.is_active = true THEN
    SELECT business_name, school_id INTO v_business_name, v_school_id
    FROM public.vendors WHERE id = NEW.vendor_id;

    INSERT INTO public.platform_announcements (type, title, message, related_id, school_id)
    VALUES (
      'new_deal',
      '🔥 New deal: ' || NEW.title,
      COALESCE(v_business_name, 'A vendor') || ' just dropped a new deal.',
      NEW.id,
      v_school_id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_announce_new_deal ON public.vendor_deals;
CREATE TRIGGER trg_announce_new_deal
  AFTER INSERT ON public.vendor_deals
  FOR EACH ROW EXECUTE FUNCTION public.announce_new_deal();
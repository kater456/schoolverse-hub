
-- Grant table privileges so PostgREST (anon/authenticated) can reach public tables.
-- RLS policies already gate row access; these GRANTs were missing.

GRANT SELECT ON public.vendors TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendors TO authenticated;
GRANT ALL ON public.vendors TO service_role;

GRANT SELECT ON public.vendor_images TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_images TO authenticated;
GRANT ALL ON public.vendor_images TO service_role;

GRANT SELECT ON public.schools TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.schools TO authenticated;
GRANT ALL ON public.schools TO service_role;

GRANT SELECT ON public.campus_locations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campus_locations TO authenticated;
GRANT ALL ON public.campus_locations TO service_role;

GRANT SELECT ON public.vendor_stats TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_stats TO authenticated;
GRANT ALL ON public.vendor_stats TO service_role;

GRANT SELECT ON public.vendor_deals TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_deals TO authenticated;
GRANT ALL ON public.vendor_deals TO service_role;

GRANT SELECT ON public.vendor_videos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_videos TO authenticated;
GRANT ALL ON public.vendor_videos TO service_role;

GRANT SELECT ON public.vendor_likes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_likes TO authenticated;
GRANT ALL ON public.vendor_likes TO service_role;

GRANT SELECT ON public.vendor_comments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_comments TO authenticated;
GRANT ALL ON public.vendor_comments TO service_role;

GRANT SELECT ON public.ratings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ratings TO authenticated;
GRANT ALL ON public.ratings TO service_role;

GRANT SELECT ON public.platform_ads TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_ads TO authenticated;
GRANT ALL ON public.platform_ads TO service_role;

GRANT SELECT ON public.featured_listings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.featured_listings TO authenticated;
GRANT ALL ON public.featured_listings TO service_role;

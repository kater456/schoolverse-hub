import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export const usePageTracking = () => {
  const location = useLocation();

  useEffect(() => {
    const trackVisit = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      await supabase.from("site_visits").insert({
        visitor_id: session?.user?.id || null,
        page_path: location.pathname,
        referrer: document.referrer || null,
      } as any);
    };
    trackVisit();
  }, [location.pathname]);
};

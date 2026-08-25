import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getVisitorId, getSessionId } from "@/lib/tracker";
import { safeSessionStorage } from "@/lib/safeStorage";

const SITE_VISIT_TRACKED_KEY = "campus_market_site_visit_tracked_session";

export const usePageTracking = () => {
  const location = useLocation();
  const trackedSessionRef = useRef<string | null>(null);

  useEffect(() => {
    const trackVisit = async () => {
      const sessionId = getSessionId();
      const visitorId = getVisitorId();

      const lastTrackedSession = safeSessionStorage.getItem(SITE_VISIT_TRACKED_KEY);
      if (lastTrackedSession === sessionId || trackedSessionRef.current === sessionId) {
        return;
      }

      // Mark session as tracked immediately to prevent double insertion on rapid mounts or race conditions
      trackedSessionRef.current = sessionId;
      safeSessionStorage.setItem(SITE_VISIT_TRACKED_KEY, sessionId);

      try {
        await supabase.from("site_visits").insert({
          visitor_id: visitorId,
          page_path: location.pathname,
          referrer: document.referrer || null,
        } as any);
      } catch (error) {
        console.error("Failed to track site visit:", error);
      }
    };

    trackVisit();
  }, [location.pathname]);
};

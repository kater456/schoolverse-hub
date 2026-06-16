import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const ANONYMOUS_ID_KEY = "marketplace_anonymous_id";

export const useMarketplaceTracker = () => {
  const { user } = useAuth();
  const [anonymousId, setAnonymousId] = useState<string | null>(null);

  useEffect(() => {
    // Generate or retrieve persistent anonymous_id for guest users
    let id = null;
    try {
      id = localStorage.getItem(ANONYMOUS_ID_KEY);
      if (!id) {
        id = crypto.randomUUID?.() || Math.random().toString(36).substring(2) + Date.now().toString(36);
        localStorage.setItem(ANONYMOUS_ID_KEY, id);
      }
    } catch (e) {
      console.warn("localStorage not available for anonymous_id", e);
      // Fallback if localStorage is disabled
      if (!id) {
        id = "anon-" + Math.random().toString(36).substring(2);
      }
    }
    setAnonymousId(id);
  }, []);

  const trackEvent = async (
    vendorId: string,
    eventType: string,
    eventSource: string
  ) => {
    try {
      const { error } = await supabase.from("marketplace_analytics" as any).insert({
        vendor_id: vendorId,
        event_type: eventType,
        event_source: eventSource,
        user_id: user?.id || null,
        anonymous_id: user ? null : anonymousId,
      } as any);

      if (error) {
        console.error("Error tracking marketplace event:", error);
      }
    } catch (e) {
      console.error("Failed to track marketplace event:", e);
    }
  };

  return { trackEvent };
};

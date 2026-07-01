import { safeLocalStorage, safeSessionStorage } from "@/lib/safeStorage";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const ANONYMOUS_ID_KEY = "marketplace_anonymous_id";
const VIEW_COOLDOWN_PREFIX = "mp_view_cd_";
const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

type EventType = 'view' | 'click' | 'lead';
type EventSource = 'profile' | 'store' | 'whatsapp' | 'call' | 'instagram' | 'browse_store' | 'contact_vendor_floating' | 'contact_vendor_bar' | 'buy_list' | 'buy_grid';

interface TrackOptions {
  campusName?: string;
  vendorCategory?: string;
}

export const useMarketplaceTracker = () => {
  const { user } = useAuth();
  const [anonymousId, setAnonymousId] = useState<string | null>(null);

  const getAnonymousId = () => {
    try {
      let id = safeLocalStorage.getItem(ANONYMOUS_ID_KEY);
      if (!id) {
        id = crypto.randomUUID?.() || Math.random().toString(36).substring(2) + Date.now().toString(36);
        safeLocalStorage.setItem(ANONYMOUS_ID_KEY, id);
      }
      return id;
    } catch (e) {
      console.warn("localStorage not available for anonymous_id", e);
      return "anon-" + Math.random().toString(36).substring(2);
    }
  };

  useEffect(() => {
    setAnonymousId(getAnonymousId());
  }, []);

  const getDeviceType = () => {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      return "tablet";
    }
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
      return "mobile";
    }
    return "desktop";
  };

  const trackEvent = async (
    vendorId: string,
    eventType: EventType,
    eventSource: EventSource,
    options?: TrackOptions
  ) => {
    if (!vendorId) return;

    // Validation
    const validEventTypes: EventType[] = ['view', 'click', 'lead'];
    if (!validEventTypes.includes(eventType)) {
      console.error(`Invalid event type: ${eventType}`);
      return;
    }

    // Cooldown for 'view' events
    if (eventType === 'view') {
      const cooldownKey = `${VIEW_COOLDOWN_PREFIX}${vendorId}`;
      try {
        const lastView = safeSessionStorage.getItem(cooldownKey);
        const now = Date.now();
        if (lastView && now - parseInt(lastView) < COOLDOWN_MS) {
          return; // Still in cooldown
        }
        safeSessionStorage.setItem(cooldownKey, now.toString());
      } catch (e) {
        console.warn("sessionStorage not available for cooldown", e);
      }
    }

    const aid = anonymousId || getAnonymousId();
    const deviceType = getDeviceType();

    try {
      const { error } = await supabase.from("marketplace_analytics" as any).insert({
        vendor_id: vendorId,
        event_type: eventType,
        event_source: eventSource,
        user_id: user?.id || null,
        anonymous_id: aid,
        device_type: deviceType,
        campus_name: options?.campusName || null,
        vendor_category: options?.vendorCategory || null,
      } as any);

      if (error) {
        console.error("Error tracking marketplace event:", error);
      } else if (eventType === 'view') {
        // Check for milestones
        const { count } = await supabase
          .from("marketplace_analytics" as any)
          .select('*', { count: 'exact', head: true })
          .eq("vendor_id", vendorId)
          .eq("event_type", "view");

        if (count) {
          const milestones = [10, 50, 100, 500];
          const reachedMilestone = milestones.reverse().find(m => count >= m);

          if (reachedMilestone) {
            const { data: vendor } = await supabase
              .from("vendors")
              .select("user_id, last_notified_milestone" as any)
              .eq("id", vendorId)
              .single() as any;


            if (vendor && reachedMilestone > (vendor.last_notified_milestone || 0)) {
              await supabase.functions.invoke('send-push', {
                body: {
                  user_id: vendor.user_id,
                  type: 'profile_view_milestone',
                  data: { count: reachedMilestone.toString() },
                }
              });

              await supabase
                .from("vendors")
                .update({ last_notified_milestone: reachedMilestone } as any)
                .eq("id", vendorId);
            }
          }
        }
      }
    } catch (e) {
      console.error("Failed to track marketplace event:", e);
    }
  };

  return { trackEvent };
};

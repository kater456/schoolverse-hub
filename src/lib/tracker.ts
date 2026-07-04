import { safeLocalStorage, safeSessionStorage } from "./safeStorage";
import { supabase } from "@/integrations/supabase/client";

const VISITOR_ID_KEY = "campus_market_visitor_id";
const SESSION_ID_KEY = "campus_market_session_id";
const SESSION_EXPIRY_KEY = "campus_market_session_expiry";
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export type TrackerEventType = 'view' | 'inquiry_click' | 'message_sent' | 'order_started';

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const getVisitorId = (): string => {
  let id = safeLocalStorage.getItem(VISITOR_ID_KEY);
  if (!id) {
    id = generateUUID();
    safeLocalStorage.setItem(VISITOR_ID_KEY, id);
  }
  return id;
};

const getSessionId = (): string => {
  const now = Date.now();
  let id = safeSessionStorage.getItem(SESSION_ID_KEY);
  let expiry = safeSessionStorage.getItem(SESSION_EXPIRY_KEY);

  if (!id || !expiry || now > parseInt(expiry)) {
    id = generateUUID();
    safeSessionStorage.setItem(SESSION_ID_KEY, id);
  }

  // Update expiry on activity
  safeSessionStorage.setItem(SESSION_EXPIRY_KEY, (now + SESSION_TIMEOUT).toString());
  return id;
};

export const trackEvent = async (
  vendorId: string,
  eventType: TrackerEventType,
  productId: string | null = null
) => {
  if (!vendorId) return;

  const visitorId = getVisitorId();
  const sessionId = getSessionId();

  try {
    // Use getSession() instead of getUser() for performance (less network calls)
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id || null;

    // 1. Insert into vendor_events
    const { error: eventError } = await supabase.from("vendor_events").insert({
      vendor_id: vendorId,
      product_id: productId,
      visitor_id: visitorId,
      session_id: sessionId,
      event_type: eventType,
    } as any);

    if (eventError) {
      console.error("Error tracking vendor event:", eventError);
    }

    // 2. Insert into store_visits if it's a view
    if (eventType === 'view') {
      await supabase.from("store_visits").insert({
        vendor_id: vendorId,
        product_id: productId,
        visitor_id: visitorId,
        session_id: sessionId,
      } as any);
    }

    // 3. Upsert into vendor_customers for engagement tracking
    if (userId) {
      const updates: any = {
        vendor_id: vendorId,
        buyer_id: userId,
        visitor_id: visitorId,
        last_seen: new Date().toISOString(),
      };

      // Increment counts based on event type
      if (eventType === 'inquiry_click') {
        const { data: existing } = await supabase
          .from("vendor_customers")
          .select("inquiry_count")
          .eq("vendor_id", vendorId)
          .eq("buyer_id", userId)
          .maybeSingle();
        updates.inquiry_count = (existing?.inquiry_count || 0) + 1;
      } else if (eventType === 'message_sent') {
        const { data: existing } = await supabase
          .from("vendor_customers")
          .select("message_count")
          .eq("vendor_id", vendorId)
          .eq("buyer_id", userId)
          .maybeSingle();
        updates.message_count = (existing?.message_count || 0) + 1;
      }

      await supabase.from("vendor_customers").upsert(updates, {
        onConflict: 'vendor_id, buyer_id'
      });
    }
    // For anonymous tracking of "customers", we might need another table or
    // a unique constraint that includes visitor_id.
    // The current requirement didn't specify anonymous CRM tracking in detail.

  } catch (e) {
    console.error("Failed to track event:", e);
  }
};

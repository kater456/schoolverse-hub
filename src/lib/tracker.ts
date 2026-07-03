import { safeLocalStorage, safeSessionStorage } from "./safeStorage";
import { supabase } from "@/integrations/supabase/client";

const VISITOR_ID_KEY = "campus_market_visitor_id";
const SESSION_ID_KEY = "campus_market_session_id";
const SESSION_EXPIRY_KEY = "campus_market_session_expiry";
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export type TrackerEventType = 'view' | 'inquiry_click' | 'message_sent' | 'order_started' | 'order_completed';

const getVisitorId = (): string => {
  let id = safeLocalStorage.getItem(VISITOR_ID_KEY);
  if (!id) {
    id = crypto.randomUUID?.() || Math.random().toString(36).substring(2) + Date.now().toString(36);
    safeLocalStorage.setItem(VISITOR_ID_KEY, id);
  }
  return id;
};

const getSessionId = (): string => {
  const now = Date.now();
  let id = safeSessionStorage.getItem(SESSION_ID_KEY);
  let expiry = safeSessionStorage.getItem(SESSION_EXPIRY_KEY);

  if (!id || !expiry || now > parseInt(expiry)) {
    id = crypto.randomUUID?.() || Math.random().toString(36).substring(2) + Date.now().toString(36);
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

    // 3. Upsert into vendor_customers
    // We only upsert if we have a userId (authenticated) or a visitorId (anonymous)
    // To prevent redundant rows for anonymous users due to unique(vendor_id, buyer_id),
    // we only update if buyer_id is NOT null OR we use a different approach.
    // Given the unique constraint UNIQUE(vendor_id, buyer_id), we should only upsert for authenticated users.
    if (userId) {
      await supabase.from("vendor_customers").upsert({
        vendor_id: vendorId,
        buyer_id: userId,
        visitor_id: visitorId,
        last_seen: new Date().toISOString(),
      } as any, {
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

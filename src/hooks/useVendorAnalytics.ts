import { supabase } from "@/integrations/supabase/client";

export type VendorEventType =
  | 'profile_view'
  | 'whatsapp_click'
  | 'call_click'
  | 'share_click'
  | 'contact_request';

export async function trackVendorEvent(
  vendorId: string,
  eventType: VendorEventType
) {
  if (!vendorId) return;

  try {
    // Generate or retrieve visitor_id
    let visitorId = localStorage.getItem('cm_vid');
    if (!visitorId) {
      visitorId = crypto.randomUUID?.() || Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem('cm_vid', visitorId);
    }

    // Fire and forget insert
    const { error } = await supabase.from('vendor_analytics' as any).insert({
      vendor_id: vendorId,
      event_type: eventType,
      visitor_id: visitorId,
    } as any);

    if (error) {
      console.error('Error tracking vendor event:', error);
    }
  } catch (err) {
    // Fail silently to not break UI
    console.error('Failed to track vendor event:', err);
  }
}

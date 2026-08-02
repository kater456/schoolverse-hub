import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface LiveDeal {
  id: string;
  vendor_id: string;
  title: string;
  description: string | null;
  original_price: number | null;
  deal_price: number | null;
  discount_type: string;
  discount_value: number | null;
  image_url: string | null;
  starts_at: string;
  expires_at: string;
  vendor_name?: string;
  vendor_image?: string | null;
}

/** Formats the discount for display: "20% OFF", "₦500 OFF" or custom text. */
export const dealLabel = (deal: Pick<LiveDeal, "discount_type" | "discount_value" | "original_price" | "deal_price" | "title">) => {
  if (deal.discount_type === "percentage" && deal.discount_value) {
    return `${Math.round(deal.discount_value)}% OFF`;
  }
  if (deal.discount_type === "fixed" && deal.discount_value) {
    return `₦${Number(deal.discount_value).toLocaleString()} OFF`;
  }
  if (deal.original_price && deal.deal_price && deal.original_price > deal.deal_price) {
    const pct = Math.round(((deal.original_price - deal.deal_price) / deal.original_price) * 100);
    return `${pct}% OFF`;
  }
  return deal.title;
};

/** Countdown string like "2d 4h" or "3h 12m" or "45m". */
export const timeLeft = (expiresAt: string) => {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "Ended";
  const mins = Math.floor(ms / 60000);
  const days = Math.floor(mins / 1440);
  const hours = Math.floor((mins % 1440) / 60);
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${mins % 60}m left`;
  return `${mins}m left`;
};

/** Returns structured countdown parts for live ticking. */
export const getTimeParts = (expiresAt: string) => {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isEnded: true };
  }
  const totalSecs = Math.floor(ms / 1000);
  const seconds = totalSecs % 60;
  const totalMins = Math.floor(totalSecs / 60);
  const minutes = totalMins % 60;
  const totalHours = Math.floor(totalMins / 60);
  const hours = totalHours % 24;
  const days = Math.floor(totalHours / 24);

  return { days, hours, minutes, seconds, isEnded: false };
};

/**
 * Fetches every currently-live deal (active + inside its start/end window)
 * and joins vendor names. Deals from suspended/unapproved vendors are dropped.
 */
export const useLiveDeals = () => {
  const [deals, setDeals] = useState<LiveDeal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const nowIso = new Date().toISOString();
      const { data } = await (supabase as any)
        .from("vendor_deals")
        .select("*")
        .eq("is_active", true)
        .lte("starts_at", nowIso)
        .gt("expires_at", nowIso)
        .order("expires_at", { ascending: true })
        .limit(30);

      const rows = (data || []) as LiveDeal[];
      if (rows.length === 0) {
        if (!cancelled) { setDeals([]); setIsLoading(false); }
        return;
      }

      const vendorIds = [...new Set(rows.map((d) => d.vendor_id))];
      const { data: vendors } = await (supabase as any)
        .from("vendors")
        .select("id, business_name, profile_image_url, is_approved, is_suspended")
        .in("id", vendorIds);

      const map = new Map<string, any>((vendors || []).map((v: any) => [v.id, v]));
      const enriched = rows
        .filter((d) => {
          const v = map.get(d.vendor_id);
          return v && v.is_approved && !v.is_suspended;
        })
        .map((d) => ({
          ...d,
          vendor_name: map.get(d.vendor_id)?.business_name,
          vendor_image: map.get(d.vendor_id)?.profile_image_url ?? null,
        }));

      if (!cancelled) { setDeals(enriched); setIsLoading(false); }
    };

    load();
    return () => { cancelled = true; };
  }, []);

  const vendorsWithDeals = new Set(deals.map((d) => d.vendor_id));

  return { deals, vendorsWithDeals, isLoading };
};

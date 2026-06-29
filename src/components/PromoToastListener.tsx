import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { isRealtimeSafe } from "@/lib/safeStorage";
import { toast } from "sonner";

/**
 * Listens for newly-activated vendor deals across the platform.
 * Surfaces a 6s toast on the homepage and marketplace pages only.
 */
const PromoToastListener = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const seen = useRef<Set<string>>(new Set());

  const enabled = pathname === "/" || pathname.startsWith("/browse");

  useEffect(() => {
    if (!enabled) return;

    const channel = isRealtimeSafe()
      ? supabase
          .channel("promo-toasts")
          .on(
            "postgres_changes",
            { event: "INSERT", schema: "public", table: "vendor_deals" },
            async (payload) => {
              const deal: any = payload.new;
              if (!deal?.is_active || seen.current.has(deal.id)) return;
              seen.current.add(deal.id);

              const { data: vendor } = await (supabase as any)
                .from("vendors")
                .select("id, business_name")
                .eq("id", deal.vendor_id)
                .maybeSingle();

              const name = vendor?.business_name || "A vendor";
              toast(`🔥 ${name} is running a promo!`, {
                description: deal.title || "Tap to view the deal",
                duration: 6000,
                action: {
                  label: "View",
                  onClick: () => navigate(`/vendor/${deal.vendor_id}`),
                },
              });
            }
          )
          .subscribe()
      : null;

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [enabled, navigate]);

  return null;
};

export default PromoToastListener;

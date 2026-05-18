/**
 * useNotify — Campus Market Professional Notification Hook
 *
 * Fires precise, LinkedIn-style push notifications for every business event.
 * Use this anywhere in the app instead of calling send-push directly.
 *
 * Usage:
 *   const { notify } = useNotify();
 *   notify.profileView({ vendorId: vendor.id, viewerName: "Chidi N." });
 *   notify.newEnquiry({ vendorId: vendor.id, senderName: "Amaka", preview: "Is this in stock?" });
 */

import { supabase } from "@/integrations/supabase/client";

type NotifyOptions = {
  vendorId?: string;
  userId?: string;
  viewerName?: string;
  senderName?: string;
  preview?: string;
  itemName?: string;
  rating?: string;
  dealName?: string;
  hours?: string;
  days?: string;
  count?: string;
  url?: string;
};

async function send(payload: {
  type: string;
  vendor_id?: string;
  user_id?: string;
  data?: Record<string, string>;
  url?: string;
  tag?: string;
}) {
  try {
    await supabase.functions.invoke("send-push", { body: payload });
  } catch {
    // Silent — notifications are non-critical, never block UX
  }
}

export function useNotify() {
  return {
    notify: {

      // ── Storefront ──────────────────────────────────────────────────────────
      profileView: ({ vendorId, viewerName, url }: NotifyOptions) =>
        send({
          type: "profile_view",
          vendor_id: vendorId,
          data: { viewer: viewerName || "A potential client" },
          url: url || `/vendor/${vendorId}`,
          tag: "profile-view",
        }),

      profileViewMilestone: ({ vendorId, count }: NotifyOptions) =>
        send({
          type: "profile_view_milestone",
          vendor_id: vendorId,
          data: { count: count || "100" },
          tag: "milestone",
        }),

      // ── Enquiries & messages ────────────────────────────────────────────────
      newEnquiry: ({ vendorId, senderName, preview, url }: NotifyOptions) =>
        send({
          type: "new_enquiry",
          vendor_id: vendorId,
          data: { sender: senderName || "A potential client", preview: preview || "" },
          url: url || "/messages",
          tag: "enquiry",
        }),

      newComment: ({ vendorId, senderName, preview }: NotifyOptions) =>
        send({
          type: "new_comment",
          vendor_id: vendorId,
          data: { sender: senderName || "A client", preview: preview || "" },
          url: `/vendor/${vendorId}`,
          tag: "comment",
        }),

      newLike: ({ vendorId, senderName }: NotifyOptions) =>
        send({
          type: "new_like",
          vendor_id: vendorId,
          data: { sender: senderName || "A client" },
          url: `/vendor/${vendorId}`,
          tag: "like",
        }),

      // ── Orders ──────────────────────────────────────────────────────────────
      newOrder: ({ vendorId, senderName, itemName, url }: NotifyOptions) =>
        send({
          type: "new_order",
          vendor_id: vendorId,
          data: { sender: senderName || "A client", item: itemName || "item" },
          url: url || "/vendor-dashboard",
          tag: "order",
        }),

      orderConfirmed: ({ vendorId, itemName }: NotifyOptions) =>
        send({
          type: "order_confirmed",
          vendor_id: vendorId,
          data: { item: itemName || "the item" },
          url: "/vendor-dashboard",
          tag: "order-confirmed",
        }),

      // ── Reputation ──────────────────────────────────────────────────────────
      newRating: ({ vendorId, senderName, rating, preview }: NotifyOptions) =>
        send({
          type: "new_rating",
          vendor_id: vendorId,
          data: {
            sender:  senderName || "A client",
            rating:  rating ? "★".repeat(Number(rating)) + "☆".repeat(5 - Number(rating)) : "★★★★★",
            preview: preview || "",
          },
          url: `/vendor/${vendorId}`,
          tag: "rating",
        }),

      newTestimonial: ({ vendorId }: NotifyOptions) =>
        send({
          type: "new_testimonial",
          vendor_id: vendorId,
          url: "/vendor-dashboard",
          tag: "testimonial",
        }),

      // ── Deals ───────────────────────────────────────────────────────────────
      dealExpiring: ({ vendorId, dealName, hours }: NotifyOptions) =>
        send({
          type: "deal_expiring",
          vendor_id: vendorId,
          data: { deal: dealName || "your deal", hours: hours || "24" },
          url: "/vendor-dashboard",
          tag: "deal-expiring",
        }),

      // ── Account events ──────────────────────────────────────────────────────
      verifiedBadge: ({ vendorId }: NotifyOptions) =>
        send({
          type: "verified_badge",
          vendor_id: vendorId,
          url: `/vendor/${vendorId}`,
          tag: "verified",
        }),

      storeUpgraded: ({ vendorId }: NotifyOptions) =>
        send({
          type: "store_upgraded",
          vendor_id: vendorId,
          url: "/vendor-dashboard",
          tag: "upgrade",
        }),

      upgradeExpiring: ({ vendorId, days }: NotifyOptions) =>
        send({
          type: "upgrade_expiring",
          vendor_id: vendorId,
          data: { days: days || "3" },
          url: "/vendor-dashboard",
          tag: "upgrade-expiring",
        }),

      // ── AI events ───────────────────────────────────────────────────────────
      aiInsight: ({ vendorId, preview }: NotifyOptions) =>
        send({
          type: "ai_insight",
          vendor_id: vendorId,
          data: { preview: preview || "" },
          url: "/vendor-dashboard",
          tag: "ai",
        }),

      communityPost: ({ vendorId }: NotifyOptions) =>
        send({
          type: "community_post",
          vendor_id: vendorId,
          url: "/vendor-dashboard",
          tag: "community",
        }),

      // ── User verification ───────────────────────────────────────────────────
      userVerified: ({ userId }: NotifyOptions) =>
        send({
          type: "verified_badge",
          user_id: userId,
          url: "/account",
          tag: "user-verified",
        }),

      // ── Raw / custom (for admin broadcasts) ────────────────────────────────
      broadcast: ({
        title, body, url, schoolId, audience, tag,
      }: {
        title: string; body: string; url?: string;
        schoolId?: string; audience?: string; tag?: string;
      }) =>
        supabase.functions.invoke("send-push", {
          body: {
            type: "broadcast",
            data: { title, body },
            url,
            school_id: schoolId,
            audience,
            tag: tag || "broadcast",
          },
        }),
    },
  };
}

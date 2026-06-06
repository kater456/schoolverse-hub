import { supabase } from "@/integrations/supabase/client";

const VAPID_PUBLIC_KEY = "BKgMcjfuJy3ls5Sz5UimYz63sXoY8c6kg5V8fAR9UNb3mB6SuxaAyoYIdBQ-3Ulp4HjvwovLxlSgj_lQ6c9tc1A";
const PUSH_SW_URL = "/push-sw.js";
const KILL_SW_URL = "/sw.js";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}

export function isPushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * Unregister any stale service worker that isn't our push SW, and remove any
 * push subscriptions attached to them. This ensures the active push
 * subscription is always tied to /push-sw.js (which has the `push` handler).
 */
async function cleanupStaleWorkers(): Promise<string[]> {
  const removedEndpoints: string[] = [];
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const reg of regs) {
      const sw = reg.active || reg.waiting || reg.installing;
      const url = sw?.scriptURL || "";
      // Skip our own push SW
      if (url.endsWith(PUSH_SW_URL)) continue;
      // Try to capture & remove any push subscription tied to this stale SW
      try {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          removedEndpoints.push(sub.endpoint);
          await sub.unsubscribe();
        }
      } catch { /* ignore */ }
      try { await reg.unregister(); } catch { /* ignore */ }
    }
  } catch { /* ignore */ }
  return removedEndpoints;
}

export async function ensurePushRegistered(): Promise<boolean> {
  if (!isPushSupported()) return false;
  try {
    // 1) Clean up any other SW (legacy Workbox /sw.js, etc.) and the
    //    stale subscription bound to it.
    const staleEndpoints = await cleanupStaleWorkers();
    if (staleEndpoints.length) {
      try {
        await (supabase.from("push_subscriptions") as any)
          .delete()
          .in("endpoint", staleEndpoints);
      } catch { /* ignore */ }
    }

    // 2) Register our dedicated push SW.
    const reg = await navigator.serviceWorker.register(PUSH_SW_URL, {
      scope: "/",
      updateViaCache: "none",
    });

    // Wait until it's ready so pushManager is usable
    await navigator.serviceWorker.ready;

    let perm = Notification.permission;
    if (perm === "default") perm = await Notification.requestPermission();
    if (perm !== "granted") return false;

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    const json: any = sub.toJSON();
    const { data: { user } } = await supabase.auth.getUser();
    let school_id: string | null = null;
    if (user) {
      try {
        const { data: prof } = await (supabase.from("profiles") as any)
          .select("school_id").eq("user_id", user.id).maybeSingle();
        school_id = prof?.school_id ?? null;
      } catch { /* ignore */ }
    }

    await (supabase.from("push_subscriptions") as any).upsert({
      user_id: user?.id ?? null,
      school_id,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      user_agent: navigator.userAgent,
      last_used_at: new Date().toISOString(),
    }, { onConflict: "endpoint" });

    return true;
  } catch (e) {
    console.warn("Push registration failed", e);
    return false;
  }
}

/**
 * Best-effort eviction of the old Workbox SW for users who haven't loaded
 * the new build yet. Safe to call on every page load — the kill-switch
 * worker self-unregisters in its `activate` handler.
 */
export async function evictLegacyWorker() {
  if (!isPushSupported()) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    const hasKillSw = regs.some((r) => (r.active?.scriptURL || "").endsWith(KILL_SW_URL));
    // If no SW is registered at all, nothing to do.
    if (!hasKillSw && regs.length === 0) return;
    // Otherwise let cleanupStaleWorkers handle non-push SWs.
    await cleanupStaleWorkers();
  } catch { /* ignore */ }
}

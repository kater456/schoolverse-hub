import { supabase } from "@/integrations/supabase/client";

// Fallback only — the real key is fetched from the send-push function so the
// client can never subscribe with a key that doesn't match the server's VAPID
// private key (that mismatch caused every push to fail with VapidPkHashMismatch).
const FALLBACK_VAPID_PUBLIC_KEY =
  "BEXF3r3qiQqWjY7BIUXh5xaFN-ragMVOY2ygMqD2FWOf8Rb0X866D_M7BBnruWwL7Q0cen7uxpZpF36CrrIJI1M";
const PUSH_SW_URL = "/push-sw.js";
const KILL_SW_URL = "/sw.js";

async function getServerVapidKey(): Promise<string> {
  try {
    const base = import.meta.env.VITE_SUPABASE_URL;
    const res = await fetch(`${base}/functions/v1/send-push`, { method: "GET" });
    const json = await res.json();
    if (json?.publicKey && typeof json.publicKey === "string") return json.publicKey;
  } catch { /* ignore */ }
  return FALLBACK_VAPID_PUBLIC_KEY;
}

function bufferToBase64Url(buf: ArrayBuffer | null) {
  if (!buf) return "";
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

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

    const serverKey = await getServerVapidKey();

    let sub = await reg.pushManager.getSubscription();

    // If an existing subscription was created with a different VAPID key it can
    // never receive our pushes — drop it (and its DB row) and re-subscribe.
    if (sub) {
      const existingKey = bufferToBase64Url(sub.options?.applicationServerKey ?? null);
      if (existingKey && existingKey !== serverKey) {
        const staleEndpoint = sub.endpoint;
        try { await sub.unsubscribe(); } catch { /* ignore */ }
        try {
          await (supabase.from("push_subscriptions") as any)
            .delete().eq("endpoint", staleEndpoint);
        } catch { /* ignore */ }
        sub = null;
      }
    }

    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(serverKey),
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

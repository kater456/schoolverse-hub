import { supabase } from "@/integrations/supabase/client";

const VAPID_PUBLIC_KEY = "BKgMcjfuJy3ls5Sz5UimYz63sXoY8c6kg5V8fAR9UNb3mB6SuxaAyoYIdBQ-3Ulp4HjvwovLxlSgj_lQ6c9tc1A";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}

export function isPushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export async function ensurePushRegistered(): Promise<boolean> {
  if (!isPushSupported()) return false;
  try {
    // Register dedicated push SW (separate from PWA SW so they don't conflict)
    const reg = await navigator.serviceWorker.register("/push-sw.js", { scope: "/" });
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
      const { data: prof } = await (supabase.from("profiles") as any)
        .select("school_id").eq("user_id", user.id).maybeSingle();
      school_id = prof?.school_id ?? null;
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

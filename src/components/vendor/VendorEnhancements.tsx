import { safeLocalStorage } from "@/lib/safeStorage";
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trackEvent as trackVendorEvent } from "@/lib/tracker";
import { toast } from "sonner";
import {
  Heart, ShoppingCart, CalendarClock, HelpCircle, Share2,
  Flame, Play, Plus, Loader2, Send, Users,
} from "lucide-react";

/* ──────────────────────────────────────────────────────────────
   Session id for anonymous reel likes
   ────────────────────────────────────────────────────────────── */
const getSessionId = () => {
  let id = safeLocalStorage.getItem("cm_session_id");
  if (!id) {
    id = crypto.randomUUID();
    safeLocalStorage.setItem("cm_session_id", id);
  }
  return id;
};

/* ──────────────────────────────────────────────────────────────
   Promo banner
   ────────────────────────────────────────────────────────────── */
export const VendorPromoBanner = ({ deal }: { deal: any }) => {
  if (!deal) return null;
  const discount =
    deal.original_price && deal.deal_price
      ? Math.round((1 - Number(deal.deal_price) / Number(deal.original_price)) * 100)
      : null;

  return (
    <div className="relative overflow-hidden rounded-xl border border-orange-400/40 bg-gradient-to-r from-orange-500/15 via-red-500/10 to-orange-500/15 p-3 mb-4 animate-fade-in">
      <div className="absolute -left-2 -top-2 text-3xl animate-pulse">🔥</div>
      <div className="pl-10">
        <p className="text-xs font-bold text-orange-700 dark:text-orange-300 uppercase tracking-wide">
          Hot Deal
        </p>
        <p className="font-semibold text-foreground text-sm truncate">{deal.title}</p>
        {discount && (
          <p className="text-xs text-orange-700 dark:text-orange-300 font-semibold">
            Save {discount}% — limited time!
          </p>
        )}
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────
   Social proof — "X students bought this week"
   ────────────────────────────────────────────────────────────── */
export const VendorSocialProof = ({ vendorId }: { vendorId: string }) => {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { count: c } = await (supabase as any)
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .eq("vendor_id", vendorId)
        .gte("created_at", since);
      if (c && c > 0) setCount(c);
    })();
  }, [vendorId]);

  if (!count) return null;
  return (
    <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 mb-3 animate-fade-in">
      <Users className="h-3.5 w-3.5" />
      <span><strong>{count}</strong> student{count !== 1 ? "s" : ""} bought from this vendor this week</span>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────
   Reels tab — vertical scrollable feed of vendor videos
   ────────────────────────────────────────────────────────────── */
const ReelCard = ({ reel }: { reel: any }) => {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [burst, setBurst] = useState(false);
  const sessionId = getSessionId();

  useEffect(() => {
    (async () => {
      const { count: c } = await (supabase as any)
        .from("reel_likes")
        .select("id", { count: "exact", head: true })
        .eq("reel_id", reel.id);
      setCount(c || 0);

      const q = (supabase as any).from("reel_likes").select("id").eq("reel_id", reel.id);
      const { data } = user
        ? await q.eq("user_id", user.id).maybeSingle()
        : await q.eq("session_id", sessionId).is("user_id", null).maybeSingle();
      if (data) setLiked(true);
    })();
  }, [reel.id, user, sessionId]);

  const toggle = async () => {
    if (liked) {
      const q = (supabase as any).from("reel_likes").delete().eq("reel_id", reel.id);
      if (user) await q.eq("user_id", user.id);
      else await q.eq("session_id", sessionId).is("user_id", null);
      setLiked(false);
      setCount((c) => Math.max(0, c - 1));
    } else {
      const row = user
        ? { reel_id: reel.id, user_id: user.id }
        : { reel_id: reel.id, session_id: sessionId };
      const { error } = await (supabase as any).from("reel_likes").insert(row);
      if (!error) {
        setLiked(true);
        setCount((c) => c + 1);
        setBurst(true);
        setTimeout(() => setBurst(false), 600);
      }
    }
  };

  return (
    <div className="relative w-full aspect-[9/16] max-h-[70vh] rounded-2xl overflow-hidden bg-black snap-center">
      <video
        src={reel.video_url}
        className="w-full h-full object-cover"
        controls
        playsInline
        preload="metadata"
      />
      <div className="absolute right-3 bottom-4 flex flex-col items-center gap-1">
        <button
          onClick={toggle}
          className="relative w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-transform"
        >
          <Heart className={`h-6 w-6 ${liked ? "fill-red-500 text-red-500" : "text-white"}`} />
          {burst && (
            <>
              <Heart className="absolute h-6 w-6 text-red-500 fill-red-500 animate-ping" />
              <span className="absolute -top-2 text-red-400 text-lg animate-fade-in">❤️</span>
            </>
          )}
        </button>
        <span className="text-white text-xs font-semibold drop-shadow">{count}</span>
      </div>
    </div>
  );
};

export const VendorReelsFeed = ({ vendorId }: { vendorId: string }) => {
  const [reels, setReels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("vendor_videos")
        .select("*")
        .eq("vendor_id", vendorId)
        .order("created_at", { ascending: false });
      setReels(data || []);
      setLoading(false);
    })();
  }, [vendorId]);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (reels.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground text-sm">
        <Play className="h-8 w-8 mx-auto mb-2 opacity-40" />
        No reels yet
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 snap-y snap-mandatory">
      {reels.map((r) => <ReelCard key={r.id} reel={r} />)}
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────
   Quick Cart sheet
   ────────────────────────────────────────────────────────────── */
export const QuickCartSheet = ({
  open, onOpenChange, vendorId, vendorName,
}: { open: boolean; onOpenChange: (o: boolean) => void; vendorId: string; vendorName: string }) => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from("vendor_products")
        .select("*")
        .eq("vendor_id", vendorId)
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .limit(8);
      setProducts(data || []);
      setLoading(false);
    })();
  }, [open, vendorId]);

  const addToCart = (p: any) => {
    try {
      const key = "campus_cart";
      const cart = JSON.parse(safeLocalStorage.getItem(key) || "[]");
      cart.push({ ...p, vendor_id: vendorId, vendor_name: vendorName, qty: 1 });
      safeLocalStorage.setItem(key, JSON.stringify(cart));
      trackVendorEvent(vendorId, 'order_started', p.id);
      toast.success(`${p.name} added to cart`);
    } catch {
      toast.error("Couldn't add to cart");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader><SheetTitle className="flex items-center gap-2"><ShoppingCart className="h-4 w-4" /> Quick cart — {vendorName}</SheetTitle></SheetHeader>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : products.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">No products yet</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 mt-4">
            {products.map((p) => (
              <div key={p.id} className="rounded-xl border border-border/60 overflow-hidden">
                {p.image_url
                  ? <img src={p.image_url} alt={p.name} className="w-full h-24 object-cover" />
                  : <div className="w-full h-24 bg-muted flex items-center justify-center text-2xl">🛍️</div>}
                <div className="p-2 space-y-1">
                  <p className="text-xs font-semibold truncate">{p.name}</p>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-accent">₦{Number(p.price).toLocaleString()}</span>
                    <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1" onClick={() => addToCart(p)}>
                      <Plus className="h-3 w-3" /> Cart
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

/* ──────────────────────────────────────────────────────────────
   Schedule Pickup sheet
   ────────────────────────────────────────────────────────────── */
export const SchedulePickupSheet = ({
  open, onOpenChange, vendorId,
}: { open: boolean; onOpenChange: (o: boolean) => void; vendorId: string }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [when, setWhen] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!user) { onOpenChange(false); navigate("/login"); return; }
    if (!when) { toast.error("Pick a date and time"); return; }
    setSaving(true);
    const { error } = await (supabase as any).from("scheduled_pickups").insert({
      vendor_id: vendorId,
      user_id: user.id,
      pickup_at: new Date(when).toISOString(),
      note: note || null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    trackVendorEvent(vendorId, 'order_started');
    toast.success("Pickup scheduled ✅");
    onOpenChange(false);
    setWhen(""); setNote("");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader><SheetTitle className="flex items-center gap-2"><CalendarClock className="h-4 w-4" /> Schedule pickup</SheetTitle></SheetHeader>
        <div className="space-y-3 mt-4">
          <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          <Textarea placeholder="Optional note for the vendor..." value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
          <Button className="w-full bg-accent text-accent-foreground" onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            Schedule
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

/* ──────────────────────────────────────────────────────────────
   Quick Question popup
   ────────────────────────────────────────────────────────────── */
const QUICK_Q = [
  "Are you open?",
  "Do you deliver to my hostel?",
  "Do you have this in stock?",
  "What's your best deal today?",
];
export const QuickQuestionSheet = ({
  open, onOpenChange, vendorId, vendorUserId,
}: { open: boolean; onOpenChange: (o: boolean) => void; vendorId: string; vendorUserId: string }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const send = async (text: string) => {
    if (!user) { onOpenChange(false); navigate("/login"); return; }
    // Find or create conversation
    const { data: existing } = await (supabase as any)
      .from("conversations")
      .select("id")
      .eq("vendor_id", vendorId)
      .eq("buyer_id", user.id)
      .maybeSingle();

    let convId = existing?.id;
    if (!convId) {
      const { data: created, error } = await (supabase as any)
        .from("conversations")
        .insert({ vendor_id: vendorId, buyer_id: user.id, last_message: text })
        .select("id").single();
      if (error) { toast.error(error.message); return; }
      convId = created.id;
    }

    await (supabase as any).from("messages").insert({
      conversation_id: convId,
      sender_id: user.id,
      content: text,
      message_type: "text",
    });
    onOpenChange(false);
    navigate(`/chat/${convId}`);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader><SheetTitle className="flex items-center gap-2"><HelpCircle className="h-4 w-4" /> Quick question</SheetTitle></SheetHeader>
        <div className="space-y-2 mt-4">
          {QUICK_Q.map((q) => (
            <Button key={q} variant="outline" className="w-full justify-start text-left h-auto py-3" onClick={() => send(q)}>
              {q}
            </Button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
};

/* ──────────────────────────────────────────────────────────────
   Follow button + count
   ────────────────────────────────────────────────────────────── */
export const useFollow = (vendorId: string) => {
  const { user } = useAuth();
  const [following, setFollowing] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    (async () => {
      const { count: c } = await (supabase as any)
        .from("vendor_followers")
        .select("id", { count: "exact", head: true })
        .eq("vendor_id", vendorId);
      setCount(c || 0);
      if (user) {
        const { data } = await (supabase as any)
          .from("vendor_followers")
          .select("id").eq("vendor_id", vendorId).eq("user_id", user.id).maybeSingle();
        if (data) setFollowing(true);
      }
    })();
  }, [vendorId, user]);

  const toggle = async () => {
    if (!user) { toast.error("Sign in to follow this vendor"); return; }
    if (following) {
      await (supabase as any).from("vendor_followers").delete().eq("vendor_id", vendorId).eq("user_id", user.id);
      setFollowing(false); setCount((c) => Math.max(0, c - 1));
    } else {
      const { error } = await (supabase as any).from("vendor_followers").insert({ vendor_id: vendorId, user_id: user.id });
      if (!error) { setFollowing(true); setCount((c) => c + 1); toast.success("Following ✓ You'll get new deals"); }
    }
  };

  return { following, count, toggle };
};

/* ──────────────────────────────────────────────────────────────
   Combined Vendor Enhancements (top-of-profile insert)
   ────────────────────────────────────────────────────────────── */
const VendorEnhancements = ({ vendor, activeDeal }: { vendor: any; activeDeal?: any }) => {
  const [reelsOpen, setReelsOpen] = useState(false);
  return (
    <>
      <VendorPromoBanner deal={activeDeal} />
      <VendorSocialProof vendorId={vendor.id} />

      <div className="mb-6 rounded-xl border border-border/60 overflow-hidden">
        <button
          onClick={() => setReelsOpen((o) => !o)}
          className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors"
        >
          <span className="flex items-center gap-2 text-sm font-semibold">
            <Play className="h-4 w-4 text-accent" /> Reels
          </span>
          <span className="text-xs text-muted-foreground">{reelsOpen ? "Hide" : "Show"}</span>
        </button>
        {reelsOpen && (
          <div className="p-3">
            <VendorReelsFeed vendorId={vendor.id} />
          </div>
        )}
      </div>
    </>
  );
};

export default VendorEnhancements;

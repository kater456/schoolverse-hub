import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  Eye, Heart, MessageSquare, Phone, ShoppingBag,
  BarChart3, Star, LogOut, Film, Loader2, CreditCard, CheckCircle, Package,
  User, Camera, Save, Share2, ShieldCheck, Copy, Crown,
  Instagram, Twitter, Music2, FileCheck, Upload, ToggleLeft, Flame,
  TrendingUp, Settings, MessageCircle, Bell,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import VendorProductManager from "@/components/vendor/VendorProductManager";
import VendorVideoManager from "@/components/vendor/VendorVideoManager";
import ThemeToggle from "@/components/ThemeToggle";
import { compressImage } from "@/lib/compressImage";
import VendorControlCenter from "@/components/vendor/VendorControlCenter";
import VendorDealManager from "@/components/vendor/VendorDealManager";
import VendorStoreUpgrade from "@/components/vendor/VendorStoreUpgrade";
import VendorTestimonialManager from "@/components/vendor/VendorTestimonialManager";

const VendorDashboard = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [vendor, setVendor] = useState<any>(null);
  const [stats, setStats] = useState({ views: 0, likes: 0, comments: 0, contacts: 0 });
  const [liveViews, setLiveViews] = useState(0);
  const [viewsTrend, setViewsTrend] = useState(0); // views in last 24h
  const [recentComments, setRecentComments] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [editContact, setEditContact] = useState("");
  const [contactEditsThisMonth, setContactEditsThisMonth] = useState(0);
  const [savingContact, setSavingContact] = useState(false);

  // Social media edit state
  const [socialInstagram, setSocialInstagram] = useState("");
  const [socialTiktok, setSocialTiktok]       = useState("");
  const [socialTwitter, setSocialTwitter]     = useState("");
  const [savingSocial, setSavingSocial]       = useState(false);

  // Verification state
  const [verifIdUrl,      setVerifIdUrl]      = useState<string | null>(null);
  const [uploadingId,     setUploadingId]     = useState(false);
  const [payingVerif,     setPayingVerif]     = useState(false);
  const [payingUpgrade,   setPayingUpgrade]   = useState(false);

  const fetchVendorData = async () => {
    if (!user) return;
    const { data: v } = await supabase
      .from("vendors")
      .select("*, schools(name), campus_locations(name)")
      .eq("user_id", user.id)
      .single();

    if (!v) { setIsLoading(false); return; }
    setVendor(v);
    setEditContact(v.contact_number || "");
    setSocialInstagram(v.social_instagram || "");
    setSocialTiktok(v.social_tiktok || "");
    setSocialTwitter(v.social_twitter || "");

    const { data: primaryImg } = await supabase
      .from("vendor_images")
      .select("image_url")
      .eq("vendor_id", v.id)
      .eq("is_primary", true)
      .maybeSingle();
    setAvatarUrl(primaryImg?.image_url || null);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const { count: editsCount } = await supabase
      .from("vendor_contact_edits")
      .select("id", { count: "exact", head: true })
      .eq("vendor_id", v.id)
      .gte("edited_at", startOfMonth.toISOString()) as any;
    setContactEditsThisMonth(editsCount || 0);

    const [views, likes, comments, contacts, txns, cmts] = await Promise.all([
      supabase.from("vendor_views").select("id", { count: "exact", head: true }).eq("vendor_id", v.id),
      supabase.from("vendor_likes").select("id", { count: "exact", head: true }).eq("vendor_id", v.id),
      supabase.from("vendor_comments").select("id", { count: "exact", head: true }).eq("vendor_id", v.id),
      supabase.from("vendor_contacts").select("id", { count: "exact", head: true }).eq("vendor_id", v.id),
      supabase.from("transactions").select("*").eq("vendor_id", v.id).order("created_at", { ascending: false }).limit(10),
      supabase.from("vendor_comments").select("*").eq("vendor_id", v.id).order("created_at", { ascending: false }).limit(5),
    ]);

    setStats({ views: views.count || 0, likes: likes.count || 0, comments: comments.count || 0, contacts: contacts.count || 0 });
    setTransactions(txns.data || []);

    // Enrich comments with profile names via separate query
    const rawComments = cmts.data || [];
    if (rawComments.length > 0) {
      const userIds = [...new Set(rawComments.map((c: any) => c.user_id))];
      const { data: profileData } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name")
        .in("user_id", userIds as string[]);
      const profileMap: Record<string, any> = {};
      (profileData || []).forEach((p: any) => { profileMap[p.user_id] = p; });
      setRecentComments(rawComments.map((c: any) => ({
        ...c,
        profiles: profileMap[c.user_id] || null,
      })));
    } else {
      setRecentComments([]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    // Load Paystack script for all payment buttons in this dashboard
    if (!(window as any).PaystackPop) {
      const script = document.createElement("script");
      script.src   = "https://js.paystack.co/v1/inline.js";
      script.async = true;
      document.body.appendChild(script);
    }
    fetchVendorData();

    const channel = supabase
      .channel("vendor-dashboard-realtime")
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "vendors",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        if (payload.new) setVendor((prev: any) => prev ? { ...prev, ...payload.new } : prev);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // ── Realtime views subscription ───────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    let vendorId: string | null = null;

    // Get vendorId first
    supabase.from("vendors").select("id").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        if (!data?.id) return;
        vendorId = data.id;

        // Load 24h trend
        const since = new Date(Date.now() - 86400000).toISOString();
        supabase.from("vendor_views").select("id", { count: "exact", head: true })
          .eq("vendor_id", vendorId).gte("created_at", since)
          .then(({ count }) => setViewsTrend(count || 0));

        // Realtime new views
        const viewsChannel = supabase
          .channel("vendor-views-live")
          .on("postgres_changes", {
            event: "INSERT", schema: "public", table: "vendor_views",
            filter: `vendor_id=eq.${vendorId}`,
          }, () => {
            setStats((prev) => ({ ...prev, views: prev.views + 1 }));
            setLiveViews((prev) => prev + 1);
            setViewsTrend((prev) => prev + 1);
          })
          .subscribe();

        return () => { supabase.removeChannel(viewsChannel); };
      });
  }, [user]);

  // ── Avatar upload (compressed) ──────────────────────────────────────────────
  const uploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !vendor) return;
    setUploadingAvatar(true);
    const compressed = await compressImage(file, 600);
    const path = `avatars/${vendor.id}.jpg`;
    await supabase.storage.from("vendor-media").upload(path, compressed, { upsert: true });
    const { data: urlData } = supabase.storage.from("vendor-media").getPublicUrl(path);

    const { data: existing } = await supabase.from("vendor_images").select("id").eq("vendor_id", vendor.id).eq("is_primary", true).maybeSingle();
    if (existing) {
      await supabase.from("vendor_images").update({ image_url: urlData.publicUrl } as any).eq("id", existing.id);
    } else {
      await supabase.from("vendor_images").insert({ vendor_id: vendor.id, image_url: urlData.publicUrl, is_primary: true } as any);
    }
    setAvatarUrl(urlData.publicUrl + "?t=" + Date.now());
    setUploadingAvatar(false);
    toast({ title: "Profile photo updated!" });
  };

  // ── Contact save ─────────────────────────────────────────────────────────────
  const saveContact = async () => {
    if (!vendor) return;
    if (contactEditsThisMonth >= 3) {
      toast({ title: "Edit limit reached", description: "You can only edit your contact 3 times per month.", variant: "destructive" });
      return;
    }
    setSavingContact(true);
    const { error } = await supabase.from("vendors").update({ contact_number: editContact.trim() } as any).eq("id", vendor.id);
    if (!error) {
      await supabase.from("vendor_contact_edits").insert({ vendor_id: vendor.id } as any);
      setContactEditsThisMonth((c) => c + 1);
      setVendor({ ...vendor, contact_number: editContact.trim() });
      toast({ title: "Contact updated!" });
    }
    setSavingContact(false);
  };

  // ── Social media save ────────────────────────────────────────────────────────
  const saveSocials = async () => {
    if (!vendor) return;
    setSavingSocial(true);
    const { error } = await supabase.from("vendors").update({
      social_instagram: socialInstagram.trim() || null,
      social_tiktok:    socialTiktok.trim()    || null,
      social_twitter:   socialTwitter.trim()   || null,
    } as any).eq("id", vendor.id);
    if (!error) {
      setVendor((v: any) => ({
        ...v,
        social_instagram: socialInstagram.trim() || null,
        social_tiktok:    socialTiktok.trim()    || null,
        social_twitter:   socialTwitter.trim()   || null,
      }));
      toast({ title: "Social links saved!" });
    }
    setSavingSocial(false);
  };

  // ── Verification ID upload ───────────────────────────────────────────────────
  const uploadVerifId = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !vendor) return;
    setUploadingId(true);
    const compressed = await compressImage(file, 1200);
    const path = `${vendor.id}/verification-id-${Date.now()}.jpg`;
    const { data, error } = await supabase.storage.from("vendor-media").upload(path, compressed, { upsert: true });
    if (!error && data) {
      const { data: urlData } = supabase.storage.from("vendor-media").getPublicUrl(data.path);
      await supabase.from("vendor_private_details").upsert(
        { vendor_id: vendor.id, id_document_url: urlData.publicUrl } as any,
        { onConflict: "vendor_id" }
      );
      setVerifIdUrl(urlData.publicUrl);
      toast({ title: "ID uploaded ✅" });
    } else {
      toast({ title: "Upload failed", variant: "destructive" });
    }
    setUploadingId(false);
  };

  // ── Paystack script (shared, injected once) ──────────────────────────────────
  useEffect(() => {
    if ((window as any).PaystackPop) return;
    if (document.querySelector('script[src="https://js.paystack.co/v1/inline.js"]')) return;
    const s = document.createElement("script");
    s.src = "https://js.paystack.co/v1/inline.js";
    s.async = true;
    document.body.appendChild(s);
  }, []);

  const openVerifPaystack = () => {
    if (!verifIdUrl) {
      toast({ title: "Upload your ID first", variant: "destructive" });
      return;
    }
    if (!(window as any).PaystackPop) {
      // Inject script if missing and ask user to retry
      if (!document.querySelector('script[src="https://js.paystack.co/v1/inline.js"]')) {
        const s = document.createElement("script");
        s.src = "https://js.paystack.co/v1/inline.js";
        s.async = true;
        document.body.appendChild(s);
      }
      toast({ title: "Loading payment…", description: "Please tap the button again in a moment." });
      return;
    }
    const PaystackPop = (window as any).PaystackPop;
    const ref = `verif_${vendor.id}_${Date.now()}`;
    const handler = PaystackPop.setup({
      key: "pk_live_86d78a3f9090b60d4d45f2ee1caf54dda3198ad5",
      email: user!.email,
      amount: 150000, // ₦1,500 in kobo
      currency: "NGN",
      ref,
      metadata: { vendor_id: vendor.id },
      channels: ["card", "bank_transfer", "ussd", "bank"],
      onClose: () => toast({ title: "Payment cancelled" }),
      callback: async (response: any) => {
        setPayingVerif(true);
        try {
          const { data, error } = await supabase.functions.invoke("verify-vendor-verification", {
            body: { reference: response.reference, vendor_id: vendor.id },
          });
          if (error || !data?.success) throw new Error(error?.message || data?.error || "Verification failed");
          toast({ title: "🎉 You're now Verified!", description: "Your verified badge is live on your profile." });
          setVendor((v: any) => ({ ...v, is_verified: true }));
        } catch (err: any) {
          toast({
            title: "Verification failed",
            description: "Payment received but activation failed. Ref: " + response.reference,
            variant: "destructive",
          });
        }
        setPayingVerif(false);
      },
    });
    handler.openIframe();
  };

  // ── Store upgrade payment (triggered from CTA card) ───────────────────────
  const initiateUpgradePayment = () => {
    if (!(window as any).PaystackPop) {
      if (!document.querySelector('script[src="https://js.paystack.co/v1/inline.js"]')) {
        const s = document.createElement("script");
        s.src = "https://js.paystack.co/v1/inline.js";
        s.async = true;
        document.body.appendChild(s);
      }
      toast({ title: "Loading payment…", description: "Please tap again in a moment." });
      return;
    }
    if (!user?.email) {
      toast({ title: "Please sign in first", variant: "destructive" });
      return;
    }
    const PaystackPop = (window as any).PaystackPop;
    const ref = `store_upgrade_${vendor.id}_${Date.now()}`;
    const handler = PaystackPop.setup({
      key: "pk_live_86d78a3f9090b60d4d45f2ee1caf54dda3198ad5",
      email: user.email,
      amount: 200000, // ₦2,000 in kobo
      currency: "NGN",
      ref,
      metadata: { vendor_id: vendor.id },
      channels: ["card", "bank_transfer", "ussd", "bank"],
      onClose: () => toast({ title: "Payment cancelled" }),
      callback: async (response: any) => {
        setPayingUpgrade(true);
        try {
          const { data, error } = await supabase.functions.invoke("verify-store-upgrade", {
            body: { reference: response.reference, vendor_id: vendor.id },
          });
          if (error || !data?.success) throw new Error(error?.message || data?.error || "Verification failed");
          toast({ title: "🎉 Store Upgraded!", description: "Premium features active for 30 days." });
          setVendor((v: any) => ({ ...v, is_store_upgraded: true, store_upgrade_expires_at: data.ends_at }));
        } catch (err: any) {
          toast({
            title: "Payment received but activation failed",
            description: "Contact support with ref: " + response.reference,
            variant: "destructive",
          });
        }
        setPayingUpgrade(false);
      },
    });
    handler.openIframe();
  };

  // ── Mark delivered ───────────────────────────────────────────────────────────
  const markDelivered = async (txnId: string) => {
    const { error } = await supabase.from("transactions").update({ vendor_marked_delivered: true } as any).eq("id", txnId);
    if (!error) {
      setTransactions((prev) => prev.map((t) => t.id === txnId ? { ...t, vendor_marked_delivered: true, status: "delivered" } : t));
    }
  };

  if (isLoading) {
    return (<div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>);
  }

  if (!vendor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-semibold">No business listing found</h2>
          <p className="text-muted-foreground">Register your business to access the vendor dashboard.</p>
          <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Link to="/register-vendor">Register Business</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!vendor.is_approved) {
    const vendorCountry = vendor.country || "Nigeria";
    const isPendingPayment = vendorCountry === "Nigeria" && vendor.payment_status === "unpaid";

    const retryPayment = () => {
      if (!(window as any).PaystackPop) {
        if (!document.querySelector('script[src="https://js.paystack.co/v1/inline.js"]')) {
          const s = document.createElement("script");
          s.src = "https://js.paystack.co/v1/inline.js";
          s.async = true;
          document.body.appendChild(s);
        }
        toast({ title: "Loading payment…", description: "Please tap again in a moment." });
        return;
      }
      const PaystackPop = (window as any).PaystackPop;
      const ref = `vr_${vendor.id}_${Date.now()}`;
      const handler = PaystackPop.setup({
        key: "pk_live_86d78a3f9090b60d4d45f2ee1caf54dda3198ad5",
        email: user!.email,
        amount: 120000, // ₦1,200 in kobo
        currency: "NGN",
        ref,
        metadata: { vendor_id: vendor.id },
        channels: ["card", "bank_transfer", "ussd", "bank"],
        onClose: () => toast({ title: "Payment window closed" }),
        callback: async (response: any) => {
          try {
            const { data, error } = await supabase.functions.invoke("verify-paystack-payment", {
              body: { reference: response.reference, vendor_id: vendor.id },
            });
            if (error || !data?.success) throw new Error(error?.message || data?.error || "Verification failed");
            toast({ title: "🎉 Payment confirmed!", description: "Your account is now active." });
            fetchVendorData();
          } catch (err: any) {
            toast({ title: "Verification failed", description: "Contact support with ref: " + response.reference, variant: "destructive" });
          }
        },
      });
      handler.openIframe();
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 max-w-md px-4">
          <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto">
            <CreditCard className="h-8 w-8 text-accent" />
          </div>
          <h2 className="text-xl font-semibold">Your account is pending approval</h2>
          <p className="text-muted-foreground">
            {vendorCountry === "Ghana"
              ? "Your registration is being reviewed by the campus admin. You'll get access once approved."
              : "Please complete payment to gain access to your vendor dashboard. Your account activates automatically once payment clears."}
          </p>
          {isPendingPayment && (
            <div className="bg-muted/50 p-4 rounded-lg text-left space-y-3">
              <p className="text-sm font-medium">Payment Details:</p>
              <p className="text-sm text-muted-foreground">
                Complete your ₦1,200 payment via Paystack — card or bank transfer accepted.
              </p>
              <Button
                onClick={retryPayment}
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Pay ₦1,200 Now
              </Button>
            </div>
          )}
          <p className="text-xs text-muted-foreground">This page will update automatically once you're approved.</p>
          <Button variant="outline" asChild><Link to="/">Back to Home</Link></Button>
        </div>
      </div>
    );
  }

  const statCards = [
    { title: "Profile Views",  value: stats.views,    icon: Eye,          gradient: "from-violet-500/20 to-blue-500/20",   accent: "text-violet-400",  border: "border-violet-500/20", live: true },
    { title: "Total Likes",    value: stats.likes,    icon: Heart,        gradient: "from-rose-500/20 to-pink-500/20",     accent: "text-rose-400",    border: "border-rose-500/20" },
    { title: "Comments",       value: stats.comments, icon: MessageSquare, gradient: "from-amber-500/20 to-orange-500/20", accent: "text-amber-400",   border: "border-amber-500/20" },
    { title: "Contacts Made",  value: stats.contacts, icon: Phone,        gradient: "from-emerald-500/20 to-teal-500/20",  accent: "text-emerald-400", border: "border-emerald-500/20" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* ── Top Nav Bar ── */}
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
            <ShoppingBag className="h-3.5 w-3.5 text-accent-foreground" />
          </div>
          <span className="font-bold text-foreground text-sm hidden sm:block">Campus Market</span>
        </Link>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" asChild className="text-xs h-8">
            <Link to="/messages"><MessageCircle className="h-4 w-4 mr-1" /><span className="hidden sm:inline">Messages</span></Link>
          </Button>
          <Button variant="ghost" size="sm" asChild className="text-xs h-8">
            <Link to={`/vendor/${vendor.id}`}><Eye className="h-4 w-4 mr-1" /><span className="hidden sm:inline">My Store</span></Link>
          </Button>

          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={signOut}><LogOut className="h-4 w-4" /></Button>
          <ThemeToggle />
        </div>
      </header>

      <main className="p-4 sm:p-6 max-w-6xl mx-auto space-y-5">

        {/* ── Hero business card ── */}
        <div className="relative rounded-2xl overflow-hidden border border-border/50">
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-accent/20 via-primary/10 to-background" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-accent/10 via-transparent to-transparent" />

          <div className="relative p-5 sm:p-6">
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="relative group shrink-0">
                <Avatar className="h-16 w-16 sm:h-20 sm:w-20 border-2 border-accent/50 shadow-lg">
                  {avatarUrl ? <AvatarImage src={avatarUrl} alt={vendor.business_name} /> : null}
                  <AvatarFallback className="bg-accent/20 text-accent text-xl font-bold">
                    {vendor.business_name?.charAt(0) || "V"}
                  </AvatarFallback>
                </Avatar>
                <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  {uploadingAvatar ? <Loader2 className="h-5 w-5 text-white animate-spin" /> : <Camera className="h-5 w-5 text-white" />}
                  <input type="file" accept="image/*" className="hidden" onChange={uploadAvatar} disabled={uploadingAvatar} />
                </label>
                {/* Online indicator */}
                <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-background" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-bold text-foreground">{vendor.business_name}</h1>
                  {vendor.is_verified && (
                    <Badge className="bg-primary/15 text-primary border border-primary/20 text-[10px] px-1.5">
                      <ShieldCheck className="h-2.5 w-2.5 mr-1" /> Verified
                    </Badge>
                  )}

                </div>
                <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
                  {vendor.category} · {vendor.schools?.name}
                  {vendor.campus_locations?.name && ` · ${vendor.campus_locations.name}`}
                </p>

                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {vendor.is_approved
                    ? <Badge className="bg-emerald-500/15 text-emerald-500 border border-emerald-500/20 text-[10px]">● Active</Badge>
                    : <Badge variant="secondary" className="text-[10px]">⏳ Pending Approval</Badge>
                  }
                  {/* Live views ticker */}
                  {liveViews > 0 && (
                    <Badge className="bg-violet-500/15 text-violet-400 border border-violet-500/20 text-[10px] animate-pulse">
                      <TrendingUp className="h-2.5 w-2.5 mr-1" /> +{liveViews} new views
                    </Badge>
                  )}
                  {viewsTrend > 0 && (
                    <span className="text-[10px] text-muted-foreground">{viewsTrend} views today</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {statCards.map((s) => (
            <div
              key={s.title}
              className={`relative rounded-xl border ${s.border} bg-gradient-to-br ${s.gradient} p-4 overflow-hidden`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">{s.title}</span>
                <s.icon className={`h-4 w-4 ${s.accent}`} />
              </div>
              <div className={`text-2xl font-bold ${s.accent}`}>{s.value.toLocaleString()}</div>
              {(s as any).live && liveViews > 0 && (
                <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              )}
            </div>
          ))}
        </div>

        {/* ── Upgrade CTAs ── */}
        {(!vendor.is_verified || !vendor.is_store_upgraded || (vendor.is_store_upgraded && vendor.store_upgrade_expires_at && new Date(vendor.store_upgrade_expires_at) < new Date())) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

            {/* Get Verified CTA */}
            {!vendor.is_verified && (
              <div
                className="relative rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-background p-5 overflow-hidden cursor-pointer group"
                onClick={() => {
                  // Click the verify tab
                  const tab = document.querySelector('[value="verify"]') as HTMLElement;
                  if (tab) tab.click();
                  // Then scroll to the ID upload area
                  setTimeout(() => {
                    const uploadArea = document.getElementById("id-upload-area");
                    if (uploadArea) {
                      uploadArea.scrollIntoView({ behavior: "smooth", block: "center" });
                    } else {
                      document.querySelector('[data-tab="verify"]')?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }
                  }, 150);
                }}
              >
                <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-primary/10 -translate-y-8 translate-x-8" />
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center mb-3">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-bold text-foreground text-sm mb-1">Get Verified Badge</h3>
                  <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                    Build trust with customers. Your ✅ badge shows on your profile and all listings.
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-primary">₦1,500 one-time</span>
                    <span className="text-[10px] text-muted-foreground">→ instant activation</span>
                  </div>
                  <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary group-hover:gap-2.5 transition-all">
                    Tap to get verified <span className="text-base">→</span>
                  </div>
                </div>
              </div>
            )}

            {/* Store Upgrade CTA */}
            {(!vendor.is_store_upgraded || (vendor.store_upgrade_expires_at && new Date(vendor.store_upgrade_expires_at) < new Date())) && (
              <div
                className="relative rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/10 via-accent/5 to-background p-5 overflow-hidden cursor-pointer group"
                onClick={initiateUpgradePayment}
              >
                <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-accent/10 -translate-y-8 translate-x-8" />
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center mb-3">
                    <Crown className="h-5 w-5 text-accent" />
                  </div>
                  <h3 className="font-bold text-foreground text-sm mb-1">Upgrade Your Store</h3>
                  <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                    Custom banner, theme colors, product arrangement, and premium store layout.
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-accent">₦2,000/month</span>
                    <span className="text-[10px] text-muted-foreground">→ 30 days</span>
                  </div>
                  <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-accent group-hover:gap-2.5 transition-all">
                    {payingUpgrade ? "Processing…" : "Tap to pay & upgrade"} <span className="text-base">→</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Tabs ── */}
        <Tabs defaultValue="products" className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="products"><Package   className="h-4 w-4 mr-1" />Products</TabsTrigger>
            <TabsTrigger value="reels">  <Film       className="h-4 w-4 mr-1" />Reels</TabsTrigger>
            <TabsTrigger value="orders"> <ShoppingBag className="h-4 w-4 mr-1" />Orders</TabsTrigger>
            <TabsTrigger value="profile"><User       className="h-4 w-4 mr-1" />Profile</TabsTrigger>
            <TabsTrigger value="engagement"><BarChart3 className="h-4 w-4 mr-1" />Insights</TabsTrigger>
            <TabsTrigger value="verify" data-tab="verify"> <ShieldCheck className="h-4 w-4 mr-1" />
              {vendor.is_verified ? "Verified ✅" : "Get Verified"}
            </TabsTrigger>
            <TabsTrigger value="control"><ToggleLeft className="h-4 w-4 mr-1" />Controls</TabsTrigger>
            <TabsTrigger value="deals"><Flame className="h-4 w-4 mr-1" />Deals</TabsTrigger>
            <TabsTrigger value="store" data-tab="store"><Crown className="h-4 w-4 mr-1" />Store</TabsTrigger>
            <TabsTrigger value="testimonials"><MessageSquare className="h-4 w-4 mr-1" />Reviews</TabsTrigger>
            <TabsTrigger value="settings"><Settings className="h-4 w-4 mr-1" />Settings</TabsTrigger>
          </TabsList>

          {/* Products */}
          <TabsContent value="products">
            <VendorProductManager vendorId={vendor.id} schoolId={vendor.school_id} />
          </TabsContent>

          {/* Reels */}
          <TabsContent value="reels">
            <VendorVideoManager vendorId={vendor.id} reelsEnabled={vendor.reels_enabled || false} />
          </TabsContent>

          {/* Profile */}
          <TabsContent value="profile">
            <div className="space-y-6">
              {/* Share link & QR */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Share2 className="h-4 w-4" /> Share Your Business
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(() => {
                    const slug = vendor.business_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
                    const url  = `${window.location.origin}/vendor/${vendor.id}/${slug}`;
                    const shareText = `I just joined Campus Market! 🛍️ Find my ${vendor.category} business — ${vendor.business_name} — right here on campus. Check it out and place your order!`;
                    return (
                      <>
                        {/* Copy link */}
                        <div className="flex items-center gap-2">
                          <Input value={url} readOnly className="bg-muted text-sm" />
                          <Button size="sm" variant="outline" onClick={() => {
                            navigator.clipboard.writeText(url);
                            toast({ title: "Link copied!" });
                          }}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Share to socials */}
                        <div>
                          <p className="text-xs text-muted-foreground mb-2 font-medium">Share to your handles:</p>
                          <div className="grid grid-cols-2 gap-2">
                            <a
                              href={`https://wa.me/?text=${encodeURIComponent(`${shareText}\n\n${url}`)}`}
                              target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border/50 hover:bg-muted/50 transition-colors text-sm font-medium text-foreground"
                            >
                              <span className="text-lg">💬</span> WhatsApp
                            </a>
                            <a
                              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${shareText}\n\n${url}`)}`}
                              target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border/50 hover:bg-muted/50 transition-colors text-sm font-medium text-foreground"
                            >
                              <Twitter className="h-4 w-4 text-sky-500" /> X / Twitter
                            </a>
                            <a
                              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
                              target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border/50 hover:bg-muted/50 transition-colors text-sm font-medium text-foreground"
                            >
                              <span className="text-lg">📘</span> Facebook
                            </a>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(`${shareText}\n\n${url}`);
                                toast({ title: "Caption copied! Paste in Instagram 📸" });
                              }}
                              className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border/50 hover:bg-muted/50 transition-colors text-sm font-medium text-foreground"
                            >
                              <Instagram className="h-4 w-4 text-pink-500" /> Instagram
                            </button>
                          </div>
                        </div>

                        {/* Native share */}
                        {typeof navigator.share === "function" && (
                          <Button variant="outline" className="w-full" onClick={() => {
                            navigator.share({ title: vendor.business_name, text: shareText, url });
                          }}>
                            <Share2 className="h-4 w-4 mr-2" /> Share via...
                          </Button>
                        )}

                        {/* QR Code */}
                        <div className="flex flex-col items-center gap-2 p-4 bg-white rounded-lg border border-border/50">
                          <QRCodeSVG value={url} size={160} level="M" includeMargin />
                          <p className="text-xs text-muted-foreground">Scan to visit your business page</p>
                        </div>
                      </>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* Profile settings */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="h-4 w-4" /> Profile Settings
                    {vendor.is_verified && (
                      <Badge className="bg-primary/10 text-primary text-xs ml-2">
                        <ShieldCheck className="h-3 w-3 mr-1" /> Verified
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Business Name</Label>
                    <Input value={vendor.business_name} disabled className="bg-muted" />
                    <p className="text-xs text-muted-foreground">Contact admin to change your business name.</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Number</Label>
                    <div className="flex gap-2">
                      <Input value={editContact} onChange={(e) => setEditContact(e.target.value)}
                        placeholder="+234..." disabled={contactEditsThisMonth >= 3} />
                      <Button size="sm" onClick={saveContact}
                        disabled={savingContact || contactEditsThisMonth >= 3 || editContact === vendor.contact_number}>
                        {savingContact ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                        Save
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {contactEditsThisMonth >= 3
                        ? "You've reached the maximum 3 edits this month."
                        : `${3 - contactEditsThisMonth} edit(s) remaining this month.`}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Input value={vendor.category} disabled className="bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input value={vendor.description || "No description"} disabled className="bg-muted" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Orders */}
          <TabsContent value="orders">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4" /> Recent Transactions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No transactions yet</p>
                ) : (
                  <div className="space-y-3">
                    {transactions.map((t: any) => (
                      <div key={t.id} className="flex items-center justify-between border-b border-border/50 pb-3 last:border-0">
                        <div>
                          <span className="text-sm font-medium text-foreground">Transaction #{t.id.slice(0, 8)}</span>
                          <div className="flex gap-2 mt-1">
                            <Badge variant={t.status === "completed" ? "default" : t.status === "delivered" ? "secondary" : "outline"} className="text-xs">
                              {t.status}
                            </Badge>
                            {t.customer_confirmed && <Badge variant="outline" className="text-xs text-success">Customer Confirmed</Badge>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!t.vendor_marked_delivered && t.status === "pending" && (
                            <Button size="sm" onClick={() => markDelivered(t.id)} className="bg-success text-success-foreground hover:bg-success/90">
                              <CheckCircle className="h-3 w-3 mr-1" /> Mark Delivered
                            </Button>
                          )}
                          {t.vendor_marked_delivered && !t.customer_confirmed && (
                            <span className="text-xs text-muted-foreground">Awaiting customer confirmation</span>
                          )}
                          {t.status === "completed" && <span className="text-xs text-success font-medium">✓ Completed</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Insights */}
          <TabsContent value="engagement">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="border-border/50">
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Recent Comments</CardTitle></CardHeader>
                <CardContent>
                  {recentComments.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No comments yet</p>
                  ) : (
                    <div className="space-y-3">
                      {recentComments.map((c: any) => (
                        <div key={c.id} className="border-b border-border/50 pb-3 last:border-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-foreground">
                              {(c.profiles as any)?.first_name || "User"} {(c.profiles as any)?.last_name || ""}
                            </span>
                            <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{c.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Business Visibility</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {statCards.map((s) => {
                      const maxVal = Math.max(...statCards.map((x) => x.value), 1);
                      const pct = (s.value / maxVal) * 100;
                      return (
                        <div key={s.title}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-muted-foreground">{s.title}</span>
                            <span className="font-medium">{s.value}</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {vendor.reels_enabled && (
                    <div className="pt-2 border-t border-border/50">
                      <div className="flex items-center gap-2 text-sm">
                        <Film className="h-4 w-4 text-accent" />
                        <span className="text-foreground font-medium">Reels Access Enabled</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── Verification Tab ─────────────────────────────────────────────── */}
          <TabsContent value="verify">
            <div className="space-y-6 max-w-xl">

              {vendor.is_verified ? (
                /* ── Already verified ── */
                <>
                  <Card className="border-success/40 bg-success/5">
                    <CardContent className="p-5 flex items-start gap-3">
                      <ShieldCheck className="h-6 w-6 text-success mt-0.5 shrink-0" />
                      <div>
                        <h3 className="font-semibold text-foreground mb-1">Your account is Verified ✅</h3>
                        <p className="text-sm text-muted-foreground">
                          Your verified badge is showing on your public profile. Customers can see your social media links below.
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Social media links */}
                  <Card className="border-border/50">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Share2 className="h-4 w-4" /> Link Your Social Media
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        These links will appear on your public profile page since you're verified.
                      </p>

                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-1.5 text-sm">
                          <Instagram className="h-4 w-4 text-pink-500" /> Instagram
                        </Label>
                        <Input
                          value={socialInstagram}
                          onChange={(e) => setSocialInstagram(e.target.value)}
                          placeholder="https://instagram.com/yourhandle"
                          className="text-sm"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-1.5 text-sm">
                          <Music2 className="h-4 w-4 text-foreground" /> TikTok
                        </Label>
                        <Input
                          value={socialTiktok}
                          onChange={(e) => setSocialTiktok(e.target.value)}
                          placeholder="https://tiktok.com/@yourhandle"
                          className="text-sm"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-1.5 text-sm">
                          <Twitter className="h-4 w-4 text-sky-500" /> X / Twitter
                        </Label>
                        <Input
                          value={socialTwitter}
                          onChange={(e) => setSocialTwitter(e.target.value)}
                          placeholder="https://x.com/yourhandle"
                          className="text-sm"
                        />
                      </div>

                      <Button
                        className="w-full"
                        onClick={saveSocials}
                        disabled={savingSocial}
                      >
                        {savingSocial
                          ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</>
                          : <><Save className="h-4 w-4 mr-2" />Save Social Links</>}
                      </Button>
                    </CardContent>
                  </Card>
                </>
              ) : (
                /* ── Not yet verified ── */
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-primary" /> Apply for Verified Badge
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <p className="text-sm text-muted-foreground">
                      A verified badge builds customer trust and unlocks your social media links on your public profile.
                    </p>

                    {/* Requirements checklist */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className={`h-4 w-4 shrink-0 ${verifIdUrl ? "text-success" : "text-muted-foreground/40"}`} />
                        <span className={verifIdUrl ? "text-foreground font-medium" : "text-muted-foreground"}>
                          Upload your student ID or government ID
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                        <span className="text-muted-foreground">Pay a one-time fee of ₦1,500 via Paystack</span>
                      </div>
                    </div>

                    {/* ID upload */}
                    <div id="id-upload-area" className="space-y-2">
                      <Label className="text-sm font-medium flex items-center gap-1.5">
                        <FileCheck className="h-4 w-4" /> Upload Your ID
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Student ID, national ID, or any government-issued ID (image or PDF, max 5MB)
                      </p>
                      <label className={`flex items-center justify-center gap-2 border-2 border-dashed rounded-lg p-4 cursor-pointer transition-colors ${
                        verifIdUrl ? "border-success bg-success/5" : "border-border hover:border-primary"
                      }`}>
                        {uploadingId ? (
                          <><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /><span className="text-sm text-muted-foreground">Uploading…</span></>
                        ) : verifIdUrl ? (
                          <><CheckCircle className="h-5 w-5 text-success" /><span className="text-sm text-success font-medium">ID Uploaded Successfully ✅</span></>
                        ) : (
                          <><Upload className="h-4 w-4 text-muted-foreground" /><span className="text-sm text-muted-foreground">Tap to upload your ID</span></>
                        )}
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={uploadVerifId}
                          disabled={uploadingId}
                        />
                      </label>
                    </div>

                    {/* Pay button */}
                    <Button
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11"
                      onClick={openVerifPaystack}
                      disabled={payingVerif || uploadingId || !verifIdUrl}
                    >
                      {payingVerif ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Verifying payment…</>
                      ) : (
                        <><CreditCard className="h-4 w-4 mr-2" />Pay ₦1,500 &amp; Get Verified</>
                      )}
                    </Button>
                    {!verifIdUrl && (
                      <p className="text-xs text-muted-foreground text-center">
                        You must upload your ID before you can pay
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground text-center">
                      Your verified badge goes live immediately after payment is confirmed.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* ── Control Center Tab ── */}
          <TabsContent value="control">
            <VendorControlCenter
              vendor={vendor}
              onUpdate={(updates) => setVendor((v: any) => ({ ...v, ...updates }))}
            />
          </TabsContent>

          {/* ── Deals Tab ── */}
          <TabsContent value="deals">
            <VendorDealManager vendorId={vendor.id} />
          </TabsContent>

          {/* ── Store Upgrade Tab ── */}
          <TabsContent value="store">
            <VendorStoreUpgrade
              vendor={vendor}
              onUpdate={(v) => setVendor((prev: any) => ({ ...prev, ...v }))}
            />
          </TabsContent>

          {/* ── Testimonials Tab ── */}
          <TabsContent value="testimonials">
            <VendorTestimonialManager vendorId={vendor.id} />
          </TabsContent>

          {/* ── Settings Tab ── */}
          <TabsContent value="settings">
            <div className="space-y-4 max-w-xl">

              {/* Store Controls */}
              <Card className="border-border/50">
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><ToggleLeft className="h-4 w-4 text-accent" /> Store Controls</CardTitle></CardHeader>
                <CardContent className="space-y-4">

                  {/* Store open/closed */}
                  <div className="flex items-center justify-between py-2 border-b border-border/40">
                    <div>
                      <p className="text-sm font-medium text-foreground">Store Open</p>
                      <p className="text-xs text-muted-foreground">Customers can browse and contact you</p>
                    </div>
                    <button
                      onClick={async () => {
                        const newVal = !vendor.is_open;
                        await supabase.from("vendors").update({ is_open: newVal } as any).eq("id", vendor.id);
                        setVendor((v: any) => ({ ...v, is_open: newVal }));
                        toast({ title: newVal ? "Store is now Open 🟢" : "Store is now Closed 🔴" });
                      }}
                      className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none ${vendor.is_open ? "bg-emerald-500" : "bg-muted-foreground/30"}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${vendor.is_open ? "translate-x-5" : "translate-x-0"}`} />
                    </button>
                  </div>

                  {/* Accept orders */}
                  <div className="flex items-center justify-between py-2 border-b border-border/40">
                    <div>
                      <p className="text-sm font-medium text-foreground">Accept Orders</p>
                      <p className="text-xs text-muted-foreground">Allow customers to place orders</p>
                    </div>
                    <button
                      onClick={async () => {
                        const newVal = !vendor.accepts_orders;
                        await supabase.from("vendors").update({ accepts_orders: newVal } as any).eq("id", vendor.id);
                        setVendor((v: any) => ({ ...v, accepts_orders: newVal }));
                        toast({ title: newVal ? "Orders enabled ✅" : "Orders disabled" });
                      }}
                      className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none ${vendor.accepts_orders ? "bg-emerald-500" : "bg-muted-foreground/30"}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${vendor.accepts_orders ? "translate-x-5" : "translate-x-0"}`} />
                    </button>
                  </div>

                  {/* Messaging */}
                  <div className="flex items-center justify-between py-2 border-b border-border/40">
                    <div>
                      <p className="text-sm font-medium text-foreground">Messaging</p>
                      <p className="text-xs text-muted-foreground">Allow customers to send you messages</p>
                    </div>
                    <button
                      onClick={async () => {
                        const newVal = !vendor.messaging_enabled;
                        await supabase.from("vendors").update({ messaging_enabled: newVal } as any).eq("id", vendor.id);
                        setVendor((v: any) => ({ ...v, messaging_enabled: newVal }));
                        toast({ title: newVal ? "Messaging enabled ✅" : "Messaging disabled" });
                      }}
                      className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none ${vendor.messaging_enabled ? "bg-emerald-500" : "bg-muted-foreground/30"}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${vendor.messaging_enabled ? "translate-x-5" : "translate-x-0"}`} />
                    </button>
                  </div>

                  {/* Delivery */}
                  <div className="flex items-center justify-between py-2 border-b border-border/40">
                    <div>
                      <p className="text-sm font-medium text-foreground">Delivery Available</p>
                      <p className="text-xs text-muted-foreground">Show delivery badge on your profile</p>
                    </div>
                    <button
                      onClick={async () => {
                        const newVal = !vendor.delivery_available;
                        await supabase.from("vendors").update({ delivery_available: newVal } as any).eq("id", vendor.id);
                        setVendor((v: any) => ({ ...v, delivery_available: newVal }));
                        toast({ title: newVal ? "Delivery badge shown ✅" : "Delivery badge hidden" });
                      }}
                      className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none ${vendor.delivery_available ? "bg-emerald-500" : "bg-muted-foreground/30"}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${vendor.delivery_available ? "translate-x-5" : "translate-x-0"}`} />
                    </button>
                  </div>

                  {/* Ratings */}
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">Customer Ratings</p>
                      <p className="text-xs text-muted-foreground">Allow customers to rate and review your store</p>
                    </div>
                    <button
                      onClick={async () => {
                        const newVal = !(vendor as any).ratings_enabled;
                        await supabase.from("vendors").update({ ratings_enabled: newVal } as any).eq("id", vendor.id);
                        setVendor((v: any) => ({ ...v, ratings_enabled: newVal }));
                        toast({ title: newVal ? "Ratings enabled ✅" : "Ratings disabled" });
                      }}
                      className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none ${(vendor as any).ratings_enabled ? "bg-emerald-500" : "bg-muted-foreground/30"}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${(vendor as any).ratings_enabled ? "translate-x-5" : "translate-x-0"}`} />
                    </button>
                  </div>
                </CardContent>
              </Card>

              {/* Account Info */}
              <Card className="border-border/50">
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4 text-accent" /> Account Info</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between py-1.5 border-b border-border/30">
                    <span className="text-muted-foreground">Business Name</span>
                    <span className="font-medium text-foreground">{vendor.business_name}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-border/30">
                    <span className="text-muted-foreground">Category</span>
                    <span className="font-medium text-foreground">{vendor.category}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-border/30">
                    <span className="text-muted-foreground">Campus</span>
                    <span className="font-medium text-foreground">{vendor.schools?.name || "—"}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-border/30">
                    <span className="text-muted-foreground">Country</span>
                    <span className="font-medium text-foreground">{vendor.country || "—"}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-border/30">
                    <span className="text-muted-foreground">Payment</span>
                    <Badge className={vendor.payment_status === "paid" ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/20 text-[10px]" : "bg-amber-500/15 text-amber-500 border border-amber-500/20 text-[10px]"}>
                      {vendor.payment_status === "paid" ? "✓ Paid" : vendor.payment_status || "Unpaid"}
                    </Badge>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-muted-foreground">Verification</span>
                    <Badge className={vendor.is_verified ? "bg-primary/15 text-primary border border-primary/20 text-[10px]" : "bg-muted text-muted-foreground text-[10px]"}>
                      {vendor.is_verified ? "✅ Verified" : "Not Verified"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Danger Zone */}
              <Card className="border-destructive/20">
                <CardHeader><CardTitle className="text-base text-destructive flex items-center gap-2"><LogOut className="h-4 w-4" /> Danger Zone</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-xs text-muted-foreground">Logging out ends your session. Your store and data remain safe.</p>
                  <Button variant="destructive" size="sm" onClick={signOut} className="gap-2">
                    <LogOut className="h-4 w-4" /> Sign Out
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

        </Tabs>
      </main>


    </div>
  );
};

export default VendorDashboard;

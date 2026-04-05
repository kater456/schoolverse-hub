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
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import FeaturedPaymentModal from "@/components/vendor/FeaturedPaymentModal";
import VendorProductManager from "@/components/vendor/VendorProductManager";
import VendorVideoManager from "@/components/vendor/VendorVideoManager";
import ThemeToggle from "@/components/ThemeToggle";
import { compressImage } from "@/lib/compressImage";
import VendorControlCenter from "@/components/vendor/VendorControlCenter";
import VendorDealManager from "@/components/vendor/VendorDealManager";
import VendorStoreUpgrade from "@/components/vendor/VendorStoreUpgrade";

const VendorDashboard = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [vendor, setVendor] = useState<any>(null);
  const [stats, setStats] = useState({ views: 0, likes: 0, comments: 0, contacts: 0 });
  const [recentComments, setRecentComments] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFeaturedModal, setShowFeaturedModal] = useState(false);
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

  const fetchVendorData = async () => {
    if (!user) return;
    const { data: v } = await supabase
      .from("vendors")
      .select("*, schools(name), campus_locations(name), featured_listings(*)")
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
      supabase.from("vendor_comments").select("*, profiles:user_id(first_name, last_name)").eq("vendor_id", v.id).order("created_at", { ascending: false }).limit(5),
    ]);

    setStats({ views: views.count || 0, likes: likes.count || 0, comments: comments.count || 0, contacts: contacts.count || 0 });
    setTransactions(txns.data || []);
    setRecentComments(cmts.data || []);
    setIsLoading(false);
  };

  useEffect(() => {
    if (!user) return;
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

  // ── Paystack verification payment ────────────────────────────────────────────
  const openVerifPaystack = () => {
    if (!verifIdUrl) {
      toast({ title: "Upload your ID first", variant: "destructive" });
      return;
    }
    const PaystackPop = (window as any).PaystackPop;
    if (!PaystackPop) {
      toast({ title: "Payment not ready, please refresh and try again", variant: "destructive" });
      return;
    }
    const ref = `verif_${vendor.id}_${Date.now()}`;
    const handler = PaystackPop.setup({
      key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
      email: user!.email,
      amount: 200000, // ₦2,000 in kobo
      currency: "NGN",
      ref,
      onClose: () => toast({ title: "Payment cancelled" }),
      callback: async (response: any) => {
        setPayingVerif(true);
        const { data, error } = await supabase.functions.invoke("verify-vendor-verification", {
          body: { reference: response.reference, vendor_id: vendor.id },
        });
        if (error || !data?.success) {
          toast({
            title: "Verification failed",
            description: "Contact support with your payment reference: " + response.reference,
            variant: "destructive",
          });
        } else {
          toast({ title: "🎉 You're now Verified!", description: "Your verified badge is live on your profile." });
          setVendor((v: any) => ({ ...v, is_verified: true }));
        }
        setPayingVerif(false);
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
              : "Please complete payment to gain access to your vendor dashboard. Once payment is verified by admin, your account will be activated automatically."}
          </p>
          {vendorCountry === "Nigeria" && (
            <div className="bg-muted/50 p-4 rounded-lg text-left">
              <p className="text-sm font-medium mb-2">Payment Details:</p>
              <p className="text-sm text-muted-foreground">
                🇳🇬 Nigeria: ₦1,200<br />
                Bank: OPay<br />
                Account Number: 09016103308<br />
                Account Name: Kater Akase
              </p>
            </div>
          )}
          <p className="text-xs text-muted-foreground">This page will update automatically once you're approved.</p>
          <Button variant="outline" asChild><Link to="/">Back to Home</Link></Button>
        </div>
      </div>
    );
  }

  const activeFeatured = vendor.featured_listings?.find(
    (f: any) => f.payment_status === "confirmed" && new Date(f.ends_at) > new Date()
  );

  const statCards = [
    { title: "Total Views",    value: stats.views,    icon: Eye,          color: "text-primary" },
    { title: "Total Likes",    value: stats.likes,    icon: Heart,        color: "text-destructive" },
    { title: "Total Comments", value: stats.comments, icon: MessageSquare, color: "text-accent" },
    { title: "Contacts Made",  value: stats.contacts, icon: Phone,        color: "text-success" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <ShoppingBag className="h-4 w-4 text-accent-foreground" />
            </div>
            <span className="font-bold text-foreground">Campus Market</span>
          </Link>
          <Badge variant="secondary" className="text-xs">Vendor</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/vendor/${vendor.id}`}>View Public Profile</Link>
          </Button>
          {!activeFeatured && (
            <Button size="sm" className="bg-orange-500 text-white hover:bg-orange-600" onClick={() => setShowFeaturedModal(true)}>
              <CreditCard className="h-4 w-4 mr-1" /> Go Featured
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={signOut}><LogOut className="h-4 w-4" /></Button>
          <ThemeToggle />
        </div>
      </header>

      <main className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
        {/* ── Business header ── */}
        <div className="flex items-center gap-4">
          <div className="relative group">
            <Avatar className="h-16 w-16 border-2 border-accent">
              {avatarUrl ? <AvatarImage src={avatarUrl} alt={vendor.business_name} /> : null}
              <AvatarFallback className="bg-accent/10 text-accent text-lg">
                {vendor.business_name?.charAt(0) || "V"}
              </AvatarFallback>
            </Avatar>
            <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              {uploadingAvatar ? <Loader2 className="h-5 w-5 text-white animate-spin" /> : <Camera className="h-5 w-5 text-white" />}
              <input type="file" accept="image/*" className="hidden" onChange={uploadAvatar} disabled={uploadingAvatar} />
            </label>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">{vendor.business_name}</h1>
              {vendor.is_verified && (
                <Badge className="bg-primary/10 text-primary text-xs shrink-0">
                  <ShieldCheck className="h-3 w-3 mr-1" /> Verified
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-xs sm:text-sm">
              {vendor.category} · {vendor.schools?.name}
              {vendor.campus_locations?.name && ` · ${vendor.campus_locations.name}`}
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {activeFeatured && <Badge className="bg-accent text-accent-foreground hidden sm:flex"><Star className="h-3 w-3 mr-1" /> Featured</Badge>}
            {vendor.is_approved ? <Badge className="bg-success text-success-foreground">Approved</Badge> : <Badge variant="secondary">Pending</Badge>}
          </div>
        </div>

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((s) => (
            <Card key={s.title} className="border-border/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">{s.title}</CardTitle>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{s.value.toLocaleString()}</div></CardContent>
            </Card>
          ))}
        </div>

        {/* ── Tabs ── */}
        <Tabs defaultValue="products" className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="products"><Package   className="h-4 w-4 mr-1" />Products</TabsTrigger>
            <TabsTrigger value="reels">  <Film       className="h-4 w-4 mr-1" />Reels</TabsTrigger>
            <TabsTrigger value="orders"> <ShoppingBag className="h-4 w-4 mr-1" />Orders</TabsTrigger>
            <TabsTrigger value="profile"><User       className="h-4 w-4 mr-1" />Profile</TabsTrigger>
            <TabsTrigger value="engagement"><BarChart3 className="h-4 w-4 mr-1" />Insights</TabsTrigger>
            <TabsTrigger value="verify"> <ShieldCheck className="h-4 w-4 mr-1" />
              {vendor.is_verified ? "Verified ✅" : "Get Verified"}
            </TabsTrigger>
            <TabsTrigger value="control"><ToggleLeft className="h-4 w-4 mr-1" />Controls</TabsTrigger>
            <TabsTrigger value="deals"><Flame className="h-4 w-4 mr-1" />Deals</TabsTrigger>
            <TabsTrigger value="store"><Crown className="h-4 w-4 mr-1" />Store</TabsTrigger>
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
                        <span className="text-muted-foreground">Pay a one-time fee of ₦2,000 via Paystack</span>
                      </div>
                    </div>

                    {/* Payment details */}
                    <div className="p-4 rounded-lg bg-muted/40 border border-border/50 space-y-1">
                      <p className="text-sm font-semibold text-foreground">Payment Details</p>
                      <p className="text-sm text-muted-foreground">Bank: <strong className="text-foreground">Sterling Bank</strong></p>
                      <p className="text-sm text-muted-foreground">Account Number: <strong className="text-foreground">0128456092</strong></p>
                      <p className="text-sm text-muted-foreground">Account Name: <strong className="text-foreground">Kater Akase</strong></p>
                      <p className="text-sm text-muted-foreground">Amount: <strong className="text-foreground">₦2,000</strong></p>
                    </div>

                    {/* ID upload */}
                    <div className="space-y-2">
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
                        <><CreditCard className="h-4 w-4 mr-2" />Pay ₦2,000 &amp; Get Verified</>
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

        </Tabs>
      </main>

      <FeaturedPaymentModal
        open={showFeaturedModal}
        onOpenChange={setShowFeaturedModal}
        vendorId={vendor.id}
        onSuccess={() => window.location.reload()}
      />
    </div>
  );
};

export default VendorDashboard;

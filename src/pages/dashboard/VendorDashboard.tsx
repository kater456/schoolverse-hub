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
  User, Camera, Save,
} from "lucide-react";
import FeaturedPaymentModal from "@/components/vendor/FeaturedPaymentModal";
import VendorProductManager from "@/components/vendor/VendorProductManager";
import VendorVideoManager from "@/components/vendor/VendorVideoManager";

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

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data: v } = await supabase
        .from("vendors")
        .select("*, schools(name), campus_locations(name), featured_listings(*)")
        .eq("user_id", user.id)
        .single();

      if (!v) { setIsLoading(false); return; }
      setVendor(v);
      setEditContact(v.contact_number || "");

      // Get vendor primary image as avatar
      const { data: primaryImg } = await supabase
        .from("vendor_images")
        .select("image_url")
        .eq("vendor_id", v.id)
        .eq("is_primary", true)
        .maybeSingle();
      setAvatarUrl(primaryImg?.image_url || null);

      // Count contact edits this month
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
    fetchData();
  }, [user]);

  const uploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !vendor) return;
    setUploadingAvatar(true);
    const ext = file.name.split(".").pop();
    const path = `avatars/${vendor.id}.${ext}`;
    await supabase.storage.from("vendor-media").upload(path, file, { upsert: true });
    const { data: urlData } = supabase.storage.from("vendor-media").getPublicUrl(path);

    // Set as primary image or insert new
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

  const markDelivered = async (txnId: string) => {
    const { error } = await supabase
      .from("transactions")
      .update({ vendor_marked_delivered: true } as any)
      .eq("id", txnId);
    if (!error) {
      setTransactions((prev) =>
        prev.map((t) => t.id === txnId ? { ...t, vendor_marked_delivered: true, status: "delivered" } : t)
      );
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

  const activeFeatured = vendor.featured_listings?.find(
    (f: any) => f.payment_status === "confirmed" && new Date(f.ends_at) > new Date()
  );

  const statCards = [
    { title: "Total Views", value: stats.views, icon: Eye, color: "text-primary" },
    { title: "Total Likes", value: stats.likes, icon: Heart, color: "text-destructive" },
    { title: "Total Comments", value: stats.comments, icon: MessageSquare, color: "text-accent" },
    { title: "Contacts Made", value: stats.contacts, icon: Phone, color: "text-success" },
  ];

  return (
    <div className="min-h-screen bg-background">
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
        </div>
      </header>

      <main className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{vendor.business_name}</h1>
            <p className="text-muted-foreground text-sm">
              {vendor.category} · {vendor.schools?.name}
              {vendor.campus_locations?.name && ` · ${vendor.campus_locations.name}`}
            </p>
          </div>
          <div className="flex gap-2">
            {activeFeatured && <Badge className="bg-accent text-accent-foreground"><Star className="h-3 w-3 mr-1" /> Featured</Badge>}
            {vendor.is_approved ? <Badge className="bg-success text-success-foreground">Approved</Badge> : <Badge variant="secondary">Pending Approval</Badge>}
          </div>
        </div>

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

        {/* Tabbed Content */}
        <Tabs defaultValue="products" className="space-y-4">
          <TabsList>
            <TabsTrigger value="products"><Package className="h-4 w-4 mr-1" />Products</TabsTrigger>
            <TabsTrigger value="reels"><Film className="h-4 w-4 mr-1" />Reels</TabsTrigger>
            <TabsTrigger value="orders"><ShoppingBag className="h-4 w-4 mr-1" />Orders</TabsTrigger>
            <TabsTrigger value="engagement"><BarChart3 className="h-4 w-4 mr-1" />Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            <VendorProductManager vendorId={vendor.id} schoolId={vendor.school_id} />
          </TabsContent>

          <TabsContent value="reels">
            <VendorVideoManager vendorId={vendor.id} reelsEnabled={vendor.reels_enabled || false} />
          </TabsContent>

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
                          {t.status === "completed" && (
                            <span className="text-xs text-success font-medium">✓ Completed</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

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
        </Tabs>
      </main>

      <FeaturedPaymentModal open={showFeaturedModal} onOpenChange={setShowFeaturedModal}
        vendorId={vendor.id} onSuccess={() => window.location.reload()} />
    </div>
  );
};

export default VendorDashboard;

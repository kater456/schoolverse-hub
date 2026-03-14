import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Eye, Heart, MessageSquare, Phone, TrendingUp, ShoppingBag,
  BarChart3, Star, LogOut, LayoutDashboard, Film, Loader2, CreditCard,
} from "lucide-react";
import FeaturedPaymentModal from "@/components/vendor/FeaturedPaymentModal";

const VendorDashboard = () => {
  const { user, signOut } = useAuth();
  const [vendor, setVendor] = useState<any>(null);
  const [stats, setStats] = useState({
    views: 0, likes: 0, comments: 0, contacts: 0,
  });
  const [recentComments, setRecentComments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      // Get vendor
      const { data: v } = await supabase
        .from("vendors")
        .select("*, schools(name), campus_locations(name), featured_listings(*)")
        .eq("user_id", user.id)
        .single();

      if (!v) { setIsLoading(false); return; }
      setVendor(v);

      // Get stats in parallel
      const [views, likes, comments, contacts] = await Promise.all([
        supabase.from("vendor_views").select("id", { count: "exact", head: true }).eq("vendor_id", v.id),
        supabase.from("vendor_likes").select("id", { count: "exact", head: true }).eq("vendor_id", v.id),
        supabase.from("vendor_comments").select("id", { count: "exact", head: true }).eq("vendor_id", v.id),
        supabase.from("vendor_contacts").select("id", { count: "exact", head: true }).eq("vendor_id", v.id),
      ]);

      setStats({
        views: views.count || 0,
        likes: likes.count || 0,
        comments: comments.count || 0,
        contacts: contacts.count || 0,
      });

      // Recent comments
      const { data: cmts } = await supabase
        .from("vendor_comments")
        .select("*, profiles:user_id(first_name, last_name)")
        .eq("vendor_id", v.id)
        .order("created_at", { ascending: false })
        .limit(5);
      setRecentComments(cmts || []);
      setIsLoading(false);
    };
    fetch();
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
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
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <ShoppingBag className="h-4 w-4 text-accent-foreground" />
            </div>
            <span className="font-bold text-foreground">EduMarket</span>
          </Link>
          <Badge variant="secondary" className="text-xs">Vendor</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/vendor/${vendor.id}`}>View Public Profile</Link>
          </Button>
          <Button variant="ghost" size="icon" onClick={signOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Business Info */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{vendor.business_name}</h1>
            <p className="text-muted-foreground text-sm">
              {vendor.category} · {vendor.schools?.name}
              {vendor.campus_locations?.name && ` · ${vendor.campus_locations.name}`}
            </p>
          </div>
          <div className="flex gap-2">
            {activeFeatured && (
              <Badge className="bg-accent text-accent-foreground">
                <Star className="h-3 w-3 mr-1" /> Featured
              </Badge>
            )}
            {vendor.is_approved ? (
              <Badge className="bg-success text-success-foreground">Approved</Badge>
            ) : (
              <Badge variant="secondary">Pending Approval</Badge>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((s) => (
            <Card key={s.title} className="border-border/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">{s.title}</CardTitle>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{s.value.toLocaleString()}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Engagement Overview */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Comments */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" /> Recent Comments
              </CardTitle>
            </CardHeader>
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
                        <span className="text-xs text-muted-foreground">
                          {new Date(c.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{c.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Visibility Analytics */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4" /> Business Visibility
              </CardTitle>
            </CardHeader>
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
                        <div
                          className="h-full bg-accent rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
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
      </main>
    </div>
  );
};

export default VendorDashboard;

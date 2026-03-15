import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import {
  Eye, Heart, MessageSquare, Phone, ShoppingBag,
  Users, LogOut, Film, Loader2, TrendingUp, Star, Calendar,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SubAdminDashboard = () => {
  const { user, userRole, signOut } = useAuth();
  const { toast } = useToast();
  const [school, setSchool] = useState<any>(null);
  const [stats, setStats] = useState({
    totalVendors: 0, totalViews: 0, totalLikes: 0,
    totalComments: 0, totalContacts: 0,
  });
  const [vendors, setVendors] = useState<any[]>([]);
  const [monthlyPerformance, setMonthlyPerformance] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || !userRole) return;
    const fetchData = async () => {
      const assignedSchoolId = (userRole as any).assigned_school_id || (userRole as any).school_id;
      if (assignedSchoolId) {
        const { data: s } = await supabase
          .from("schools")
          .select("*")
          .eq("id", assignedSchoolId)
          .single();
        setSchool(s);
      }

      const vendorQuery = assignedSchoolId
        ? supabase.from("vendors").select("id, business_name, category, is_approved, reels_enabled").eq("school_id", assignedSchoolId)
        : supabase.from("vendors").select("id, business_name, category, is_approved, reels_enabled");
      
      const { data: vendorData } = await vendorQuery;
      setVendors(vendorData || []);
      const vendorIds = (vendorData || []).map((v: any) => v.id);

      if (vendorIds.length > 0) {
        const [views, likes, comments, contacts] = await Promise.all([
          supabase.from("vendor_views").select("id", { count: "exact", head: true }).in("vendor_id", vendorIds),
          supabase.from("vendor_likes").select("id", { count: "exact", head: true }).in("vendor_id", vendorIds),
          supabase.from("vendor_comments").select("id", { count: "exact", head: true }).in("vendor_id", vendorIds),
          supabase.from("vendor_contacts").select("id", { count: "exact", head: true }).in("vendor_id", vendorIds),
        ]);

        setStats({
          totalVendors: vendorData?.length || 0,
          totalViews: views.count || 0,
          totalLikes: likes.count || 0,
          totalComments: comments.count || 0,
          totalContacts: contacts.count || 0,
        });

        // Monthly performance per vendor (this month)
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const [monthViews, monthContacts, monthRatings] = await Promise.all([
          supabase.from("vendor_views").select("vendor_id").in("vendor_id", vendorIds).gte("created_at", startOfMonth.toISOString()),
          supabase.from("vendor_contacts").select("vendor_id").in("vendor_id", vendorIds).gte("created_at", startOfMonth.toISOString()),
          supabase.from("vendor_ratings").select("vendor_id, rating").in("vendor_id", vendorIds),
        ]);

        const perfMap = new Map<string, { views: number; contacts: number; avgRating: number; ratingCount: number }>();
        vendorIds.forEach((vid: string) => perfMap.set(vid, { views: 0, contacts: 0, avgRating: 0, ratingCount: 0 }));

        (monthViews.data || []).forEach((v: any) => {
          const p = perfMap.get(v.vendor_id);
          if (p) p.views++;
        });
        (monthContacts.data || []).forEach((c: any) => {
          const p = perfMap.get(c.vendor_id);
          if (p) p.contacts++;
        });
        (monthRatings.data || []).forEach((r: any) => {
          const p = perfMap.get(r.vendor_id);
          if (p) { p.avgRating = ((p.avgRating * p.ratingCount) + r.rating) / (p.ratingCount + 1); p.ratingCount++; }
        });

        const perf = (vendorData || []).map((v: any) => ({
          ...v,
          ...(perfMap.get(v.id) || { views: 0, contacts: 0, avgRating: 0, ratingCount: 0 }),
        })).sort((a: any, b: any) => b.views - a.views);

        setMonthlyPerformance(perf);
      } else {
        setStats({ totalVendors: 0, totalViews: 0, totalLikes: 0, totalComments: 0, totalContacts: 0 });
      }

      setIsLoading(false);
    };
    fetchData();
  }, [user, userRole]);

  const toggleReels = async (vendorId: string, currentState: boolean) => {
    const { error } = await supabase
      .from("vendors")
      .update({ reels_enabled: !currentState })
      .eq("id", vendorId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      await supabase.from("admin_activity_log").insert({
        admin_id: user!.id,
        action: currentState ? "Revoked Reels access" : "Granted Reels access",
        target_type: "vendor",
        target_id: vendorId,
      } as any);

      setVendors((prev) =>
        prev.map((v) => v.id === vendorId ? { ...v, reels_enabled: !currentState } : v)
      );
      toast({ title: currentState ? "Reels access revoked" : "Reels access granted" });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentMonth = new Date().toLocaleString("default", { month: "long", year: "numeric" });

  const statCards = [
    { title: "Total Businesses", value: stats.totalVendors, icon: ShoppingBag, color: "text-primary" },
    { title: "Total Views", value: stats.totalViews, icon: Eye, color: "text-accent" },
    { title: "Total Likes", value: stats.totalLikes, icon: Heart, color: "text-destructive" },
    { title: "Total Comments", value: stats.totalComments, icon: MessageSquare, color: "text-primary" },
    { title: "Total Contacts", value: stats.totalContacts, icon: Phone, color: "text-success" },
  ];

  const maxViews = Math.max(...monthlyPerformance.map((v: any) => v.views), 1);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <ShoppingBag className="h-4 w-4 text-accent-foreground" />
            </div>
            <span className="font-bold text-foreground">EduMarket</span>
          </Link>
          <Badge variant="secondary" className="text-xs">Sub-Admin</Badge>
        </div>
        <Button variant="ghost" size="icon" onClick={signOut}>
          <LogOut className="h-4 w-4" />
        </Button>
      </header>

      <main className="p-6 max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {school ? school.name : "Campus"} Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Monitor all businesses and activity in your assigned campus
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {statCards.map((s) => (
            <Card key={s.title} className="border-border/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">{s.title}</CardTitle>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">{s.value.toLocaleString()}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Monthly Performance */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Monthly Business Performance — {currentMonth}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyPerformance.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No data this month</p>
            ) : (
              <div className="space-y-4">
                {monthlyPerformance.map((v: any) => (
                  <div key={v.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{v.business_name}</span>
                        <Badge variant="outline" className="text-xs">{v.category}</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {v.views}</span>
                        <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {v.contacts}</span>
                        {v.ratingCount > 0 && (
                          <span className="flex items-center gap-1"><Star className="h-3 w-3 text-yellow-500" /> {v.avgRating.toFixed(1)}</span>
                        )}
                      </div>
                    </div>
                    <Progress value={(v.views / maxViews) * 100} className="h-2" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vendors List */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" /> Businesses in Territory
            </CardTitle>
          </CardHeader>
          <CardContent>
            {vendors.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No businesses registered yet</p>
            ) : (
              <div className="space-y-3">
                {vendors.map((v) => (
                  <div key={v.id} className="flex items-center justify-between border-b border-border/50 pb-3 last:border-0">
                    <div>
                      <span className="text-sm font-medium text-foreground">{v.business_name}</span>
                      <span className="text-xs text-muted-foreground ml-2">{v.category}</span>
                      {!v.is_approved && <Badge variant="secondary" className="ml-2 text-xs">Pending</Badge>}
                    </div>
                    <div className="flex items-center gap-2">
                      {v.reels_enabled && (
                        <Badge className="bg-accent/10 text-accent text-xs">
                          <Film className="h-3 w-3 mr-1" /> Reels
                        </Badge>
                      )}
                      <Button
                        size="sm"
                        variant={v.reels_enabled ? "destructive" : "outline"}
                        onClick={() => toggleReels(v.id, v.reels_enabled)}
                        className="text-xs"
                      >
                        <Film className="h-3 w-3 mr-1" />
                        {v.reels_enabled ? "Revoke Reels" : "Grant Reels"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default SubAdminDashboard;

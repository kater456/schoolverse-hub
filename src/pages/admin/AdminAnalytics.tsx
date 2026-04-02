import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Eye, Users, Phone, ShoppingBag, TrendingDown,
  BarChart3, Globe, Loader2, Star, TrendingUp,
  Trophy, Crown, Calendar,
} from "lucide-react";

interface SchoolVisitorStat { name: string; count: number; percentage: number; }
interface CampusPerformance { id: string; name: string; vendorCount: number; views: number; contacts: number; }
interface VendorStat { id: string; business_name: string; count: number; }

const AdminAnalytics = () => {
  const { toast } = useToast();
  const [stats, setStats] = useState({
    totalVisitors: 0, totalPageViews: 0, totalBusinessViews: 0,
    totalContacts: 0, totalVendors: 0, bounceCount: 0,
  });
  const [schoolStats,       setSchoolStats]       = useState<SchoolVisitorStat[]>([]);
  const [campusPerformance, setCampusPerformance] = useState<CampusPerformance[]>([]);
  const [topViewed,         setTopViewed]         = useState<VendorStat[]>([]);
  const [topContacted,      setTopContacted]      = useState<VendorStat[]>([]);
  const [allVendors,        setAllVendors]        = useState<any[]>([]);
  const [isLoading,         setIsLoading]         = useState(true);

  // Vendor of the Week
  const [votw,          setVotw]          = useState<any>(null);
  const [votwDialog,    setVotwDialog]    = useState(false);
  const [votwSearch,    setVotwSearch]    = useState("");
  const [savingVotw,    setSavingVotw]    = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    const [visits, views, contacts, vendors, schools] = await Promise.all([
      supabase.from("site_visits").select("id, school_id, page_path", { count: "exact" }),
      supabase.from("vendor_views").select("id, vendor_id, school_id", { count: "exact" }),
      supabase.from("vendor_contacts").select("id, vendor_id, school_id", { count: "exact" }),
      supabase.from("vendors").select("id, school_id, business_name, is_vendor_of_week, vendor_of_week_expires_at").eq("is_approved", true),
      supabase.from("schools").select("id, name"),
    ]);

    const bounceCount = visits.data?.filter((v: any) => v.page_path === "/").length || 0;

    setStats({
      totalVisitors: visits.count || 0,
      totalPageViews: visits.count || 0,
      totalBusinessViews: views.count || 0,
      totalContacts: contacts.count || 0,
      totalVendors: vendors.data?.length || 0,
      bounceCount,
    });

    setAllVendors(vendors.data || []);

    // Find current vendor of the week
    const currentVotw = (vendors.data || []).find(
      (v: any) => v.is_vendor_of_week && v.vendor_of_week_expires_at && new Date(v.vendor_of_week_expires_at) > new Date()
    );
    setVotw(currentVotw || null);

    // School breakdown
    const schoolMap = new Map<string, number>();
    const schoolNames = new Map<string, string>();
    schools.data?.forEach((s: any) => { schoolMap.set(s.id, 0); schoolNames.set(s.id, s.name); });
    visits.data?.forEach((v: any) => {
      if (v.school_id && schoolMap.has(v.school_id))
        schoolMap.set(v.school_id, (schoolMap.get(v.school_id) || 0) + 1);
    });
    const total = visits.count || 1;
    const schoolArr: SchoolVisitorStat[] = [];
    schoolMap.forEach((count, id) => {
      schoolArr.push({ name: schoolNames.get(id) || "Unknown", count, percentage: Math.round((count / total) * 100) });
    });
    setSchoolStats(schoolArr.sort((a, b) => b.count - a.count));

    // Campus performance
    const campusMap = new Map<string, CampusPerformance>();
    schools.data?.forEach((s: any) => campusMap.set(s.id, { id: s.id, name: s.name, vendorCount: 0, views: 0, contacts: 0 }));
    vendors.data?.forEach((v: any) => { const cp = campusMap.get(v.school_id); if (cp) cp.vendorCount++; });
    views.data?.forEach((v: any)   => { if (v.school_id) { const cp = campusMap.get(v.school_id); if (cp) cp.views++; } });
    contacts.data?.forEach((c: any) => { if (c.school_id) { const cp = campusMap.get(c.school_id); if (cp) cp.contacts++; } });
    setCampusPerformance(Array.from(campusMap.values()).sort((a, b) => b.views - a.views));

    // Per-vendor stats
    const viewCounts    = new Map<string, number>();
    const contactCounts = new Map<string, number>();
    views.data?.forEach((v: any)    => viewCounts.set(v.vendor_id,    (viewCounts.get(v.vendor_id)    || 0) + 1));
    contacts.data?.forEach((c: any) => contactCounts.set(c.vendor_id, (contactCounts.get(c.vendor_id) || 0) + 1));

    const allVendorNames = new Map((vendors.data || []).map((v: any) => [v.id, v.business_name]));

    const topV = [...viewCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, count]) => ({
      id, business_name: allVendorNames.get(id) || "Unknown", count,
    }));
    const topC = [...contactCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, count]) => ({
      id, business_name: allVendorNames.get(id) || "Unknown", count,
    }));

    setTopViewed(topV);
    setTopContacted(topC);
    setIsLoading(false);
  };

  const setVendorOfWeek = async (vendorId: string) => {
    setSavingVotw(true);
    // Clear previous VOTW
    await supabase.from("vendors").update({ is_vendor_of_week: false, vendor_of_week_expires_at: null } as any)
      .eq("is_vendor_of_week", true);

    // Set new VOTW for 7 days
    const expires = new Date(Date.now() + 7 * 86_400_000).toISOString();
    const { error } = await supabase.from("vendors")
      .update({ is_vendor_of_week: true, vendor_of_week_expires_at: expires } as any)
      .eq("id", vendorId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "🏆 Vendor of the Week set!" });
      setVotwDialog(false);
      fetchAnalytics();
    }
    setSavingVotw(false);
  };

  const clearVotw = async () => {
    await supabase.from("vendors").update({ is_vendor_of_week: false, vendor_of_week_expires_at: null } as any)
      .eq("is_vendor_of_week", true);
    toast({ title: "Vendor of the Week cleared" });
    fetchAnalytics();
  };

  if (isLoading) return (
    <AdminLayout>
      <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
    </AdminLayout>
  );

  const maxCampusViews = Math.max(...campusPerformance.map((c) => c.views), 1);
  const currentMonth   = new Date().toLocaleString("default", { month: "long", year: "numeric" });

  const filteredVendors = allVendors.filter((v) =>
    v.business_name.toLowerCase().includes(votwSearch.toLowerCase())
  );

  const overviewCards = [
    { title: "Total Visitors",       value: stats.totalVisitors,       icon: Globe,       color: "text-primary" },
    { title: "Total Page Views",     value: stats.totalPageViews,      icon: Eye,         color: "text-accent" },
    { title: "Business Views",       value: stats.totalBusinessViews,  icon: ShoppingBag, color: "text-success" },
    { title: "Total Contacts",       value: stats.totalContacts,       icon: Phone,       color: "text-primary" },
    { title: "Registered Businesses",value: stats.totalVendors,        icon: Users,       color: "text-accent" },
    { title: "Bounce Visits",        value: stats.bounceCount,         icon: TrendingDown,color: "text-destructive" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Platform Analytics</h1>
            <p className="text-sm text-muted-foreground">Real-time platform performance and traffic insights</p>
          </div>
        </div>

        {/* Overview stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {overviewCards.map((c) => (
            <Card key={c.title} className="border-border/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">{c.title}</CardTitle>
                <c.icon className={`h-4 w-4 ${c.color}`} />
              </CardHeader>
              <CardContent><div className="text-xl font-bold">{c.value.toLocaleString()}</div></CardContent>
            </Card>
          ))}
        </div>

        {/* Vendor of the Week */}
        <Card className="border-accent/40 bg-accent/5">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-accent" /> Vendor of the Week
            </CardTitle>
            <Button size="sm" onClick={() => setVotwDialog(true)} className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Crown className="h-4 w-4 mr-1" /> {votw ? "Change" : "Pick Vendor"}
            </Button>
          </CardHeader>
          <CardContent>
            {votw ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-lg">🏆</div>
                  <div>
                    <p className="font-semibold text-foreground">{votw.business_name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Until {new Date(votw.vendor_of_week_expires_at).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}
                    </p>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="text-destructive text-xs" onClick={clearVotw}>
                  Remove
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No vendor of the week set. Pick one to feature them prominently on the Browse page.</p>
            )}
          </CardContent>
        </Card>

        {/* Campus Performance */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Campus Performance — {currentMonth}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {campusPerformance.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No campus data</p>
            ) : (
              <div className="space-y-4">
                {campusPerformance.map((campus) => (
                  <div key={campus.id} className="space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-sm font-medium text-foreground">{campus.name}</span>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{campus.vendorCount} vendors</span>
                        <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {campus.views} views</span>
                        <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {campus.contacts} contacts</span>
                      </div>
                    </div>
                    <Progress value={(campus.views / maxCampusViews) * 100} className="h-2" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Visitors by school */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4" /> Visitors by School
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {schoolStats.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No school data yet</p>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Total: <span className="font-semibold text-foreground">{stats.totalVisitors.toLocaleString()}</span>
                  </p>
                  {schoolStats.map((s) => (
                    <div key={s.name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-foreground font-medium truncate mr-2">{s.name}</span>
                        <span className="text-muted-foreground shrink-0">{s.count} ({s.percentage}%)</span>
                      </div>
                      <Progress value={s.percentage} className="h-2" />
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>

          {/* Most viewed */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="h-4 w-4" /> Most Viewed Businesses
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topViewed.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
              ) : (
                <div className="space-y-3">
                  {topViewed.map((v, i) => (
                    <div key={v.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          i === 0 ? "bg-accent/20 text-accent" : "bg-muted text-muted-foreground"
                        }`}>{i + 1}</span>
                        <span className="text-sm font-medium truncate max-w-[140px]">{v.business_name}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">{v.count.toLocaleString()} views</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Most contacted */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Phone className="h-4 w-4" /> Most Contacted Businesses
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topContacted.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
              ) : (
                <div className="space-y-3">
                  {topContacted.map((v, i) => (
                    <div key={v.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          i === 0 ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"
                        }`}>{i + 1}</span>
                        <span className="text-sm font-medium truncate max-w-[140px]">{v.business_name}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">{v.count.toLocaleString()} contacts</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Vendor of the Week picker */}
      <Dialog open={votwDialog} onOpenChange={setVotwDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-accent" /> Pick Vendor of the Week
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Search vendors…"
              value={votwSearch}
              onChange={(e) => setVotwSearch(e.target.value)}
              className="text-sm"
            />
            <div className="max-h-64 overflow-y-auto space-y-1">
              {filteredVendors.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setVendorOfWeek(v.id)}
                  disabled={savingVotw}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left text-sm"
                >
                  <span className="font-medium text-foreground">{v.business_name}</span>
                  {v.is_vendor_of_week && <Badge className="bg-accent/20 text-accent text-xs">Current</Badge>}
                </button>
              ))}
              {filteredVendors.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No vendors found</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVotwDialog(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminAnalytics;

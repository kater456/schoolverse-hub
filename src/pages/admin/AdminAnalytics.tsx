import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Eye, Users, Phone, ShoppingBag, TrendingDown,
  BarChart3, Globe, Loader2,
} from "lucide-react";

interface SchoolVisitorStat {
  name: string;
  count: number;
  percentage: number;
}

const AdminAnalytics = () => {
  const [stats, setStats] = useState({
    totalVisitors: 0,
    totalPageViews: 0,
    totalBusinessViews: 0,
    totalContacts: 0,
    totalVendors: 0,
    bounceCount: 0,
  });
  const [schoolStats, setSchoolStats] = useState<SchoolVisitorStat[]>([]);
  const [topViewed, setTopViewed] = useState<any[]>([]);
  const [topContacted, setTopContacted] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      const [
        visits, views, contacts, vendors, schools,
      ] = await Promise.all([
        supabase.from("site_visits").select("id, school_id, page_path", { count: "exact" }),
        supabase.from("vendor_views").select("id, vendor_id", { count: "exact" }),
        supabase.from("vendor_contacts").select("id, vendor_id", { count: "exact" }),
        supabase.from("vendors").select("id", { count: "exact", head: true }),
        supabase.from("schools").select("id, name"),
      ]);

      // Unique visitors (approximate by unique page sessions)
      const uniqueVisitors = new Set(visits.data?.map((v: any) => v.id)).size;
      
      // Bounce: visited only 1 page
      const bounceCount = visits.data?.filter((v: any) => v.page_path === "/").length || 0;

      setStats({
        totalVisitors: visits.count || 0,
        totalPageViews: visits.count || 0,
        totalBusinessViews: views.count || 0,
        totalContacts: contacts.count || 0,
        totalVendors: vendors.count || 0,
        bounceCount,
      });

      // School visitor breakdown
      const schoolMap = new Map<string, number>();
      const schoolNames = new Map<string, string>();
      schools.data?.forEach((s: any) => {
        schoolMap.set(s.id, 0);
        schoolNames.set(s.id, s.name);
      });

      visits.data?.forEach((v: any) => {
        if (v.school_id && schoolMap.has(v.school_id)) {
          schoolMap.set(v.school_id, (schoolMap.get(v.school_id) || 0) + 1);
        }
      });

      const total = visits.count || 1;
      const schoolStatsArr: SchoolVisitorStat[] = [];
      schoolMap.forEach((count, id) => {
        schoolStatsArr.push({
          name: schoolNames.get(id) || "Unknown",
          count,
          percentage: Math.round((count / total) * 100),
        });
      });
      schoolStatsArr.sort((a, b) => b.count - a.count);
      setSchoolStats(schoolStatsArr);

      // Top viewed vendors
      const viewCounts = new Map<string, number>();
      views.data?.forEach((v: any) => {
        viewCounts.set(v.vendor_id, (viewCounts.get(v.vendor_id) || 0) + 1);
      });
      const topViewedIds = [...viewCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
      
      if (topViewedIds.length > 0) {
        const { data: vendorData } = await supabase
          .from("vendors")
          .select("id, business_name")
          .in("id", topViewedIds.map(([id]) => id));
        
        setTopViewed(topViewedIds.map(([id, count]) => ({
          id,
          business_name: vendorData?.find((v: any) => v.id === id)?.business_name || "Unknown",
          count,
        })));
      }

      // Top contacted vendors
      const contactCounts = new Map<string, number>();
      contacts.data?.forEach((c: any) => {
        contactCounts.set(c.vendor_id, (contactCounts.get(c.vendor_id) || 0) + 1);
      });
      const topContactedIds = [...contactCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
      
      if (topContactedIds.length > 0) {
        const { data: vendorData } = await supabase
          .from("vendors")
          .select("id, business_name")
          .in("id", topContactedIds.map(([id]) => id));

        setTopContacted(topContactedIds.map(([id, count]) => ({
          id,
          business_name: vendorData?.find((v: any) => v.id === id)?.business_name || "Unknown",
          count,
        })));
      }

      setIsLoading(false);
    };
    fetchAnalytics();
  }, []);

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
      </AdminLayout>
    );
  }

  const overviewCards = [
    { title: "Total Visitors", value: stats.totalVisitors, icon: Globe, color: "text-primary" },
    { title: "Total Page Views", value: stats.totalPageViews, icon: Eye, color: "text-accent" },
    { title: "Business Views", value: stats.totalBusinessViews, icon: ShoppingBag, color: "text-success" },
    { title: "Total Contacts", value: stats.totalContacts, icon: Phone, color: "text-primary" },
    { title: "Registered Businesses", value: stats.totalVendors, icon: Users, color: "text-accent" },
    { title: "Bounce Visits", value: stats.bounceCount, icon: TrendingDown, color: "text-destructive" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Platform Analytics</h1>
          <p className="text-sm text-muted-foreground">Real-time platform performance and traffic insights</p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {overviewCards.map((c) => (
            <Card key={c.title} className="border-border/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">{c.title}</CardTitle>
                <c.icon className={`h-4 w-4 ${c.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">{c.value.toLocaleString()}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Visitor Stats by School */}
          <Card className="border-border/50 lg:col-span-1">
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
                    Total Visitors: <span className="font-semibold text-foreground">{stats.totalVisitors.toLocaleString()}</span>
                  </p>
                  {schoolStats.map((s) => (
                    <div key={s.name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-foreground font-medium truncate mr-2">{s.name}</span>
                        <span className="text-muted-foreground flex-shrink-0">{s.percentage}%</span>
                      </div>
                      <Progress value={s.percentage} className="h-2" />
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>

          {/* Most Viewed */}
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
                        <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                          {i + 1}
                        </span>
                        <span className="text-sm font-medium truncate">{v.business_name}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{v.count} views</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Most Contacted */}
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
                        <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                          {i + 1}
                        </span>
                        <span className="text-sm font-medium truncate">{v.business_name}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{v.count} contacts</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminAnalytics;

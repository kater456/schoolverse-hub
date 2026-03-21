import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Users, ShoppingBag, Star, Clock, DollarSign, TrendingUp, Activity, CreditCard } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const AdminDashboard = () => {
  const { toast } = useToast();
  const [stats, setStats] = useState({
    totalVendors: 0,
    pendingVendors: 0,
    activeListings: 0,
    featuredListings: 0,
    revenue: 0,
  });
  const [userGrowth, setUserGrowth] = useState<any[]>([]);
  const [activityFeed, setActivityFeed] = useState<any[]>([]);
  const [paystackRequired, setPaystackRequired] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      const [vendors, pending, featured, profiles, activityLog, platformSettings] = await Promise.all([
        supabase.from("vendors").select("id", { count: "exact", head: true }),
        supabase.from("vendors").select("id", { count: "exact", head: true }).eq("is_approved", false),
        supabase.from("featured_listings").select("amount", { count: "exact" }).eq("payment_status", "confirmed"),
        supabase.from("profiles").select("created_at").order("created_at", { ascending: true }),
        supabase.from("admin_activity_log").select("*").order("created_at", { ascending: false }).limit(15),
        supabase.from("platform_settings").select("id, paystack_required").single(),
      ]);

      const activeCount = (vendors.count || 0) - (pending.count || 0);
      const revenue = featured.data?.reduce((sum: number, f: any) => sum + Number(f.amount), 0) || 0;

      setStats({
        totalVendors: vendors.count || 0,
        pendingVendors: pending.count || 0,
        activeListings: activeCount,
        featuredListings: featured.count || 0,
        revenue,
      });

      if (platformSettings.data) {
        setPaystackRequired((platformSettings.data as any).paystack_required || false);
        setSettingsId(platformSettings.data.id);
      }

      const monthMap = new Map<string, number>();
      (profiles.data || []).forEach((p: any) => {
        const d = new Date(p.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        monthMap.set(key, (monthMap.get(key) || 0) + 1);
      });
      const sortedMonths = [...monthMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
      let cumulative = 0;
      const growthData = sortedMonths.map(([month, count]) => {
        cumulative += count;
        const [y, m] = month.split("-");
        const label = new Date(Number(y), Number(m) - 1).toLocaleString("default", { month: "short", year: "2-digit" });
        return { month: label, users: cumulative, newUsers: count };
      });
      setUserGrowth(growthData);
      setActivityFeed(activityLog.data || []);
    };
    fetchAll();
  }, []);

  const togglePaystack = async (enabled: boolean) => {
    if (!settingsId) return;
    const { error } = await supabase
      .from("platform_settings")
      .update({ paystack_required: enabled } as any)
      .eq("id", settingsId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setPaystackRequired(enabled);
      toast({ title: enabled ? "Paystack payment enabled" : "Paystack payment disabled", description: enabled ? "Nigerian vendors will now pay via Paystack during registration." : "Payment requirement removed from signup flow." });
    }
  };

  const cards = [
    { title: "Total Vendors", value: stats.totalVendors, icon: Users, color: "text-primary" },
    { title: "Pending Approval", value: stats.pendingVendors, icon: Clock, color: "text-orange-500" },
    { title: "Active Listings", value: stats.activeListings, icon: ShoppingBag, color: "text-success" },
    { title: "Featured Listings", value: stats.featuredListings, icon: Star, color: "text-accent" },
    { title: "Revenue (₦)", value: `₦${stats.revenue.toLocaleString()}`, icon: DollarSign, color: "text-success" },
  ];

  const getStatusBadge = (action: string) => {
    if (action.includes("approve")) return <Badge className="bg-success/20 text-success text-[10px]">Approved</Badge>;
    if (action.includes("reject") || action.includes("remove")) return <Badge variant="destructive" className="text-[10px]">Rejected</Badge>;
    if (action.includes("create") || action.includes("add")) return <Badge className="bg-primary/20 text-primary text-[10px]">Created</Badge>;
    if (action.includes("update") || action.includes("toggle")) return <Badge variant="secondary" className="text-[10px]">Updated</Badge>;
    return <Badge variant="outline" className="text-[10px]">{action}</Badge>;
  };

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

      {/* Paystack Control */}
      <Card className="border-border/50 mb-6">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-primary" />
            <div>
              <Label className="text-sm font-medium">Paystack Auto-Payment (Nigeria)</Label>
              <p className="text-xs text-muted-foreground">When enabled, Nigerian vendors must pay ₦1,200 via Paystack during registration for instant activation.</p>
            </div>
          </div>
          <Switch checked={paystackRequired} onCheckedChange={togglePaystack} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {cards.map((card) => (
          <Card key={card.title} className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> User Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            {userGrowth.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No user data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={userGrowth}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                  <Area type="monotone" dataKey="users" stroke="hsl(var(--accent))" fillOpacity={1} fill="url(#colorUsers)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" /> Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activityFeed.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No activity yet</p>
            ) : (
              <div className="space-y-3 max-h-[280px] overflow-y-auto">
                {activityFeed.map((a: any) => (
                  <div key={a.id} className="flex items-start gap-3 border-b border-border/30 pb-3 last:border-0">
                    <div className="w-2 h-2 rounded-full bg-accent mt-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground truncate">{a.action}</span>
                        {getStatusBadge(a.action)}
                      </div>
                      {a.details && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {typeof a.details === "object" ? JSON.stringify(a.details).slice(0, 80) : String(a.details).slice(0, 80)}
                        </p>
                      )}
                      <span className="text-[10px] text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Users, ShoppingBag, Star, Clock, DollarSign, TrendingUp,
  Activity, CreditCard, UserPlus, Wrench, Film, Settings,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const AdminDashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalVendors: 0,
    pendingVendors: 0,
    activeListings: 0,
    featuredListings: 0,
    revenue: 0,
  });
  const [userGrowth, setUserGrowth]     = useState<any[]>([]);
  const [activityFeed, setActivityFeed] = useState<any[]>([]);
  const [settingsId, setSettingsId]     = useState<string | null>(null);
  const [togglingKey, setTogglingKey]   = useState<string | null>(null);

  // All platform settings toggles
  const [settings, setSettings] = useState({
    paystack_required:      false,
    allow_registrations:    true,
    maintenance_mode:       false,
    featured_reels_enabled: false,
  });

  useEffect(() => {
    const fetchAll = async () => {
      const [vendors, pending, featured, profiles, activityLog, platformSettings] = await Promise.all([
        supabase.from("vendors").select("id", { count: "exact", head: true }),
        supabase.from("vendors").select("id", { count: "exact", head: true }).eq("is_approved", false),
        supabase.from("featured_listings").select("amount", { count: "exact" }).eq("payment_status", "confirmed"),
        supabase.from("profiles").select("created_at").order("created_at", { ascending: true }),
        supabase.from("admin_activity_log").select("*").order("created_at", { ascending: false }).limit(15),
        supabase.from("platform_settings").select("*").single(),
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
        const d = platformSettings.data as any;
        setSettingsId(d.id);
        setSettings({
          paystack_required:      d.paystack_required      ?? false,
          allow_registrations:    d.allow_registrations    ?? true,
          maintenance_mode:       d.maintenance_mode       ?? false,
          featured_reels_enabled: d.featured_reels_enabled ?? false,
        });
      }

      // Build user growth chart
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

  // Generic toggle handler — works for any boolean column in platform_settings
  const toggle = async (key: keyof typeof settings, newValue: boolean) => {
    if (!settingsId) return;
    setTogglingKey(key);
    const { error } = await supabase
      .from("platform_settings")
      .update({ [key]: newValue, updated_at: new Date().toISOString() } as any)
      .eq("id", settingsId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setSettings((prev) => ({ ...prev, [key]: newValue }));
      toast({ title: CONTROLS.find((c) => c.key === key)?.successMsg(newValue) || "Setting updated" });
    }
    setTogglingKey(null);
  };

  const CONTROLS = [
    {
      key:       "paystack_required" as const,
      icon:      CreditCard,
      label:     "Paystack Payment (Nigeria)",
      desc:      "When ON — Nigerian vendors must pay ₦1,200 via Paystack during registration before their account can be activated.",
      activeColor: "text-primary",
      successMsg: (v: boolean) => v ? "✅ Payment required — vendors must pay to register" : "⛔ Payment disabled — vendors can register free",
    },
    {
      key:       "allow_registrations" as const,
      icon:      UserPlus,
      label:     "Vendor Registrations",
      desc:      "When OFF — the vendor registration page will be closed and no new vendors can apply.",
      activeColor: "text-success",
      successMsg: (v: boolean) => v ? "✅ Registrations are now open" : "⛔ Registrations are now closed",
    },
    {
      key:       "maintenance_mode" as const,
      icon:      Wrench,
      label:     "Maintenance Mode",
      desc:      "When ON — the site shows a maintenance notice to all visitors. Use this during updates.",
      activeColor: "text-orange-500",
      successMsg: (v: boolean) => v ? "🔧 Maintenance mode ON" : "✅ Maintenance mode OFF — site is live",
    },
    {
      key:       "featured_reels_enabled" as const,
      icon:      Film,
      label:     "Featured Reels",
      desc:      "When OFF — the Reels section is hidden from the Browse page for all users.",
      activeColor: "text-accent",
      successMsg: (v: boolean) => v ? "✅ Reels section enabled" : "⛔ Reels section hidden",
    },
  ];

  const statCards = [
    { title: "Total Vendors",    value: stats.totalVendors,    icon: Users,    color: "text-primary",     href: "/admin/vendors" },
    { title: "Pending Approval", value: stats.pendingVendors,  icon: Clock,    color: "text-orange-500",  href: "/admin/vendors" },
    { title: "Active Listings",  value: stats.activeListings,  icon: ShoppingBag, color: "text-success",  href: "/admin/vendors" },
    { title: "Featured Listings",value: stats.featuredListings,icon: Star,     color: "text-accent",      href: "/admin/featured" },
    { title: "Revenue (₦)",      value: `₦${stats.revenue.toLocaleString()}`, icon: DollarSign, color: "text-success" },
  ];

  const getStatusBadge = (action: string) => {
    if (action.toLowerCase().includes("approv"))  return <Badge className="bg-success/20 text-success text-[10px]">Approved</Badge>;
    if (action.toLowerCase().includes("reject") || action.toLowerCase().includes("remov")) return <Badge variant="destructive" className="text-[10px]">Rejected</Badge>;
    if (action.toLowerCase().includes("creat") || action.toLowerCase().includes("add"))   return <Badge className="bg-primary/20 text-primary text-[10px]">Created</Badge>;
    return <Badge variant="secondary" className="text-[10px]">Updated</Badge>;
  };

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

      {/* ── Platform Controls ─────────────────────────────────────────────── */}
      <Card className="border-border/50 mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4 text-muted-foreground" /> Platform Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border/50">
          {CONTROLS.map(({ key, icon: Icon, label, desc, activeColor }) => (
            <div key={key} className="flex items-center justify-between py-4 first:pt-0 last:pb-0 gap-4">
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 shrink-0 ${settings[key] ? activeColor : "text-muted-foreground"}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium cursor-pointer">{label}</Label>
                    <Badge
                      className={`text-[10px] px-1.5 py-0 ${
                        settings[key]
                          ? "bg-success/15 text-success"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {settings[key] ? "ON" : "OFF"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 max-w-md">{desc}</p>
                </div>
              </div>
              <Switch
                checked={settings[key]}
                onCheckedChange={(val) => toggle(key, val)}
                disabled={togglingKey === key}
                className="shrink-0"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ── Stat Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {statCards.map((card) => (
          <Card
            key={card.title}
            className={`border-border/50 ${card.href ? "cursor-pointer hover:border-primary/50 transition-colors" : ""}`}
            onClick={() => card.href && navigate(card.href)}
          >
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

      {/* ── Charts & Activity ────────────────────────────────────────────── */}
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
                      <stop offset="5%"  stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="users"
                    stroke="hsl(var(--accent))"
                    fillOpacity={1}
                    fill="url(#colorUsers)"
                    strokeWidth={2}
                  />
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
                          {typeof a.details === "object"
                            ? JSON.stringify(a.details).slice(0, 80)
                            : String(a.details).slice(0, 80)}
                        </p>
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(a.created_at).toLocaleString()}
                      </span>
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

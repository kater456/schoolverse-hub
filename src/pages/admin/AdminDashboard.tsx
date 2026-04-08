import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Users, ShoppingBag, Star, Clock, DollarSign, TrendingUp,
  Activity, CreditCard, UserPlus, Wrench, Film, Settings,
  MessageSquare, Check, X, AlertTriangle, ArrowRight,
  BarChart3, Building2, MapPin, Megaphone, ShieldCheck,
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

const AdminDashboard = () => {
  const { toast } = useToast();
  const navigate  = useNavigate();

  const [stats, setStats] = useState({
    totalVendors:     0,
    pendingVendors:   0,
    activeListings:   0,
    featuredListings: 0,
    revenue:          0,
    totalUsers:       0,
    totalMessages:    0,
    flaggedMessages:  0,
    totalSchools:     0,
  });

  const [userGrowth,      setUserGrowth]      = useState<any[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<any[]>([]);
  const [activityFeed,    setActivityFeed]    = useState<any[]>([]);
  const [pendingVendors,  setPendingVendors]  = useState<any[]>([]);
  const [settingsId,      setSettingsId]      = useState<string | null>(null);
  const [togglingKey,     setTogglingKey]     = useState<string | null>(null);
  const [approvingId,     setApprovingId]     = useState<string | null>(null);

  const [settings, setSettings] = useState({
    paystack_required:      false,
    allow_registrations:    true,
    maintenance_mode:       false,
    featured_reels_enabled: false,
  });

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    const [
      vendors, pending, featured, profiles,
      activityLog, platformSettings,
      messages, flagged, schools, pendingList,
    ] = await Promise.all([
      supabase.from("vendors").select("id, category", { count: "exact" }),
      supabase.from("vendors").select("id", { count: "exact", head: true }).eq("is_approved", false).eq("is_active", true),
      supabase.from("featured_listings").select("amount", { count: "exact" }).eq("payment_status", "confirmed"),
      supabase.from("profiles").select("created_at").order("created_at", { ascending: true }),
      supabase.from("admin_activity_log").select("*").order("created_at", { ascending: false }).limit(15),
      supabase.from("platform_settings").select("*").single(),
      supabase.from("messages").select("id", { count: "exact", head: true }),
      supabase.from("messages").select("id", { count: "exact", head: true }).eq("ai_flagged", true),
      supabase.from("schools").select("id", { count: "exact", head: true }),
      supabase.from("vendors")
        .select("id, business_name, category, created_at, schools(name), country")
        .eq("is_approved", false)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

    const revenue = featured.data?.reduce((sum: number, f: any) => sum + Number(f.amount), 0) || 0;
    setStats({
      totalVendors:     vendors.count   || 0,
      pendingVendors:   pending.count   || 0,
      activeListings:   (vendors.count  || 0) - (pending.count || 0),
      featuredListings: featured.count  || 0,
      revenue,
      totalUsers:       profiles.data?.length || 0,
      totalMessages:    messages.count  || 0,
      flaggedMessages:  flagged.count   || 0,
      totalSchools:     schools.count   || 0,
    });

    setPendingVendors(pendingList.data || []);

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

    // User growth chart
    const monthMap = new Map<string, number>();
    (profiles.data || []).forEach((p: any) => {
      const d   = new Date(p.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthMap.set(key, (monthMap.get(key) || 0) + 1);
    });
    const sortedMonths = [...monthMap.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-8);
    let cumulative = 0;
    const growthData = sortedMonths.map(([month, count]) => {
      cumulative += count;
      const [y, m] = month.split("-");
      const label  = new Date(Number(y), Number(m) - 1).toLocaleString("default", { month: "short", year: "2-digit" });
      return { month: label, users: cumulative, newUsers: count };
    });
    setUserGrowth(growthData);

    // Category breakdown
    const catMap = new Map<string, number>();
    (vendors.data || []).forEach((v: any) => {
      if (v.category) catMap.set(v.category, (catMap.get(v.category) || 0) + 1);
    });
    const catData = [...catMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count]) => ({ name: name.split(" ")[0], count }));
    setCategoryBreakdown(catData);

    setActivityFeed(activityLog.data || []);
  };

  const approveVendor = async (id: string) => {
    setApprovingId(id);
    const { error } = await supabase.from("vendors").update({ is_approved: true } as any).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Vendor approved ✅" });
      setPendingVendors((prev) => prev.filter((v) => v.id !== id));
      setStats((prev) => ({ ...prev, pendingVendors: prev.pendingVendors - 1 }));
    }
    setApprovingId(null);
  };

  const rejectVendor = async (id: string) => {
    setApprovingId(id + "_reject");
    await supabase.from("vendors").update({ is_active: false } as any).eq("id", id);
    toast({ title: "Vendor rejected" });
    setPendingVendors((prev) => prev.filter((v) => v.id !== id));
    setStats((prev) => ({ ...prev, pendingVendors: prev.pendingVendors - 1 }));
    setApprovingId(null);
  };

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
      successMsg: (v: boolean) => v ? "✅ Payment required" : "⛔ Payment disabled",
    },
    {
      key:       "allow_registrations" as const,
      icon:      UserPlus,
      label:     "Vendor Registrations",
      desc:      "When OFF — the vendor registration page will be closed and no new vendors can apply.",
      activeColor: "text-success",
      successMsg: (v: boolean) => v ? "✅ Registrations open" : "⛔ Registrations closed",
    },
    {
      key:       "maintenance_mode" as const,
      icon:      Wrench,
      label:     "Maintenance Mode",
      desc:      "When ON — the site shows a maintenance notice to all visitors. Use this during updates.",
      activeColor: "text-orange-500",
      successMsg: (v: boolean) => v ? "🔧 Maintenance mode ON" : "✅ Site is live",
    },
    {
      key:       "featured_reels_enabled" as const,
      icon:      Film,
      label:     "Featured Reels",
      desc:      "When OFF — the Reels section is hidden from the Browse page for all users.",
      activeColor: "text-accent",
      successMsg: (v: boolean) => v ? "✅ Reels enabled" : "⛔ Reels hidden",
    },
  ];

  const statCards = [
    { title: "Total Vendors",     value: stats.totalVendors,                      icon: ShoppingBag,    color: "text-primary",      href: "/admin/vendors" },
    { title: "Pending Approval",  value: stats.pendingVendors,                    icon: Clock,          color: "text-orange-500",   href: "/admin/vendors" },
    { title: "Registered Users",  value: stats.totalUsers,                        icon: Users,          color: "text-blue-500",     href: null },
    { title: "Featured Listings", value: stats.featuredListings,                  icon: Star,           color: "text-accent",       href: "/admin/featured" },
    { title: "Total Messages",    value: stats.totalMessages,                     icon: MessageSquare,  color: "text-success",      href: "/admin/chats" },
    { title: "Flagged Messages",  value: stats.flaggedMessages,                   icon: AlertTriangle,  color: "text-destructive",  href: "/admin/chats" },
    { title: "Schools",           value: stats.totalSchools,                      icon: Building2,      color: "text-purple-500",   href: "/admin/schools" },
    { title: "Revenue (₦)",       value: `₦${stats.revenue.toLocaleString()}`,   icon: DollarSign,     color: "text-success",      href: null },
  ];

  // Quick-nav links to all admin sections
  const quickLinks = [
    { label: "Manage Vendors",     href: "/admin/vendors",    icon: ShoppingBag,   desc: "Approve, suspend, verify vendors" },
    { label: "Manage Schools",     href: "/admin/schools",    icon: Building2,     desc: "Add & manage campus schools" },
    { label: "Campus Locations",   href: "/admin/locations",  icon: MapPin,        desc: "Manage campus delivery spots" },
    { label: "Featured Listings",  href: "/admin/featured",   icon: Star,          desc: "Oversee featured promotions" },
    { label: "Manage Ads",         href: "/admin/ads",        icon: Megaphone,     desc: "Platform ad banners & popups" },
    { label: "Analytics",          href: "/admin/analytics",  icon: BarChart3,     desc: "Visitor & engagement stats" },
    { label: "Chat Monitor",       href: "/admin/chats",      icon: MessageSquare, desc: "Monitor & flag conversations" },
    { label: "Sub-Admins",         href: "/admin/sub-admins", icon: ShieldCheck,   desc: "Manage campus sub-admins" },
  ];

  const getStatusBadge = (action: string) => {
    if (action.toLowerCase().includes("approv"))  return <Badge className="bg-success/20 text-success text-[10px]">Approved</Badge>;
    if (action.toLowerCase().includes("reject") || action.toLowerCase().includes("remov")) return <Badge variant="destructive" className="text-[10px]">Rejected</Badge>;
    if (action.toLowerCase().includes("creat") || action.toLowerCase().includes("add"))   return <Badge className="bg-primary/20 text-primary text-[10px]">Created</Badge>;
    return <Badge variant="secondary" className="text-[10px]">Updated</Badge>;
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Platform overview &amp; controls</p>
        </div>
        <Badge variant="outline" className="text-xs gap-1">
          <Activity className="h-3 w-3 text-green-500" /> Live
        </Badge>
      </div>

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
                    <Badge className={`text-[10px] px-1.5 py-0 ${settings[key] ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {statCards.map((card) => (
          <Card
            key={card.title}
            className={`border-border/50 ${card.href ? "cursor-pointer hover:border-primary/40 transition-colors" : ""}`}
            onClick={() => card.href && navigate(card.href)}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground leading-tight">{card.title}</CardTitle>
              <card.icon className={`h-4 w-4 shrink-0 ${card.color}`} />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Pending Vendor Approvals ─────────────────────────────────────── */}
      {pendingVendors.length > 0 && (
        <Card className="border-orange-400/30 bg-orange-500/5 mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2 text-orange-600">
                <Clock className="h-4 w-4" /> Pending Vendor Approvals ({stats.pendingVendors})
              </CardTitle>
              <Button size="sm" variant="ghost" className="text-xs" asChild>
                <Link to="/admin/vendors">View All <ArrowRight className="ml-1 h-3 w-3" /></Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingVendors.map((v: any) => (
                <div key={v.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-background/60 border border-border/40">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground truncate">{v.business_name}</span>
                      <Badge variant="outline" className="text-[10px] shrink-0">{v.category}</Badge>
                      <Badge variant="outline" className="text-[10px] shrink-0">{v.country || "Nigeria"}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {v.schools?.name || "No school"} · {new Date(v.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm" className="bg-success text-success-foreground hover:bg-success/90 h-7 text-xs"
                      onClick={() => approveVendor(v.id)}
                      disabled={approvingId === v.id}
                    >
                      <Check className="h-3 w-3 mr-1" /> Approve
                    </Button>
                    <Button
                      size="sm" variant="destructive" className="h-7 text-xs"
                      onClick={() => rejectVendor(v.id)}
                      disabled={approvingId === v.id + "_reject"}
                    >
                      <X className="h-3 w-3 mr-1" /> Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Quick Navigation ─────────────────────────────────────────────── */}
      <Card className="border-border/50 mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowRight className="h-4 w-4 text-muted-foreground" /> Quick Navigation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {quickLinks.map(({ label, href, icon: Icon, desc }) => (
              <Link key={href} to={href}>
                <div className="flex flex-col gap-1.5 p-3 rounded-xl border border-border/50 hover:border-accent/50 hover:bg-accent/5 transition-all cursor-pointer group">
                  <Icon className="h-5 w-5 text-muted-foreground group-hover:text-accent transition-colors" />
                  <span className="text-sm font-medium text-foreground">{label}</span>
                  <span className="text-[11px] text-muted-foreground leading-tight">{desc}</span>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Charts & Activity ────────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* User Growth */}
        <Card className="border-border/50 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> User Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            {userGrowth.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No user data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
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
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                  <Area type="monotone" dataKey="users" name="Total Users" stroke="hsl(var(--accent))" fillOpacity={1} fill="url(#colorUsers)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Vendor Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            {categoryBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No data</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={categoryBreakdown} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={60} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                  <Bar dataKey="count" name="Vendors" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border-border/50 lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" /> Recent Admin Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activityFeed.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No activity yet</p>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto">
                {activityFeed.map((a: any) => (
                  <div key={a.id} className="flex items-start gap-3 border border-border/30 rounded-lg p-3">
                    <div className="w-2 h-2 rounded-full bg-accent mt-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground truncate">{a.action}</span>
                        {getStatusBadge(a.action)}
                      </div>
                      {a.details && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {typeof a.details === "object" ? JSON.stringify(a.details).slice(0, 60) : String(a.details).slice(0, 60)}
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

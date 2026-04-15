import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  Users, ShoppingBag, Star, Clock, DollarSign, TrendingUp, TrendingDown,
  Activity, CreditCard, UserPlus, Wrench, Film, Settings, MessageSquare,
  Check, X, AlertTriangle, ArrowRight, BarChart3, Building2, MapPin,
  Megaphone, ShieldCheck, Zap, Globe, Trophy, Crown, Eye,
  ChevronRight, RefreshCw, CircleCheck, CircleX, Loader2,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
} from "recharts";

// ── Small KPI card with trend indicator ──────────────────────────────────────
const KpiCard = ({
  title, value, icon: Icon, color, href, trend, trendLabel, loading = false,
}: {
  title: string; value: string | number; icon: any; color: string;
  href?: string; trend?: "up" | "down" | "neutral"; trendLabel?: string; loading?: boolean;
}) => {
  const navigate = useNavigate();
  return (
    <Card
      className={`border-border/50 relative overflow-hidden ${href ? "cursor-pointer hover:border-accent/40 hover:shadow-md transition-all" : ""}`}
      onClick={() => href && navigate(href)}
    >
      <div className={`absolute top-0 left-0 w-1 h-full ${
        color.includes("orange") ? "bg-orange-500" :
        color.includes("green") || color.includes("success") ? "bg-green-500" :
        color.includes("blue") ? "bg-blue-500" :
        color.includes("destructive") ? "bg-red-500" :
        color.includes("yellow") ? "bg-yellow-500" :
        color.includes("purple") ? "bg-purple-500" :
        "bg-accent"
      }`} />
      <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4 pl-5">
        <CardTitle className="text-xs font-medium text-muted-foreground leading-tight">{title}</CardTitle>
        <Icon className={`h-4 w-4 shrink-0 ${color}`} />
      </CardHeader>
      <CardContent className="px-4 pb-4 pl-5">
        {loading ? (
          <div className="h-7 w-16 bg-muted animate-pulse rounded" />
        ) : (
          <div className="text-2xl font-bold text-foreground">{value}</div>
        )}
        {trendLabel && (
          <div className={`flex items-center gap-1 mt-1 text-[10px] ${
            trend === "up" ? "text-green-500" : trend === "down" ? "text-red-500" : "text-muted-foreground"
          }`}>
            {trend === "up" ? <TrendingUp className="h-3 w-3" /> : trend === "down" ? <TrendingDown className="h-3 w-3" /> : null}
            {trendLabel}
          </div>
        )}
        {href && (
          <ChevronRight className="absolute bottom-3 right-3 h-3.5 w-3.5 text-muted-foreground/30" />
        )}
      </CardContent>
    </Card>
  );
};

// ── Platform health indicator ─────────────────────────────────────────────────
const HealthDot = ({ ok, label }: { ok: boolean; label: string }) => (
  <div className="flex items-center gap-2">
    {ok
      ? <CircleCheck className="h-3.5 w-3.5 text-green-500 shrink-0" />
      : <CircleX     className="h-3.5 w-3.5 text-red-500 shrink-0" />}
    <span className={`text-xs ${ok ? "text-foreground" : "text-destructive"}`}>{label}</span>
  </div>
);

// ── Main Dashboard ────────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const { toast }    = useToast();
  const navigate     = useNavigate();
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // KPI state
  const [stats, setStats] = useState({
    totalVendors: 0, pendingVendors: 0, approvedVendors: 0,
    totalUsers: 0, totalMessages: 0, flaggedMessages: 0,
    totalSchools: 0, revenue: 0, featuredListings: 0,
    totalViews: 0, totalContacts: 0, storeUpgrades: 0,
    votwNominations: 0,
  });

  // Charts
  const [userGrowth,       setUserGrowth]       = useState<any[]>([]);
  const [vendorGrowth,     setVendorGrowth]      = useState<any[]>([]);
  const [revenueByMonth,   setRevenueByMonth]    = useState<any[]>([]);
  const [categoryBreakdown,setCategoryBreakdown] = useState<any[]>([]);

  // Queues
  const [pendingVendors,    setPendingVendors]    = useState<any[]>([]);
  const [votwNominations,   setVotwNominations]   = useState<any[]>([]);
  const [activityFeed,      setActivityFeed]      = useState<any[]>([]);
  const [approvingId,       setApprovingId]       = useState<string | null>(null);

  // Platform settings
  const [settingsId,   setSettingsId]   = useState<string | null>(null);
  const [togglingKey,  setTogglingKey]  = useState<string | null>(null);
  const [settings, setSettings] = useState({
    paystack_required:      false,
    allow_registrations:    true,
    maintenance_mode:       false,
    featured_reels_enabled: false,
    store_upgrade_enabled:  true,
    verification_payment_enabled: true,
  });

  const fetchAll = useCallback(async () => {
    const [
      vendors, pending, pendingList, featured, profiles,
      activityLog, platformSettings, messages, flagged,
      schools, views, contacts, storeUpgrades, votwNoms,
      featuredRevenue, vendorsByMonth,
    ] = await Promise.all([
      supabase.from("vendors").select("id, category, created_at"),
      supabase.from("vendors").select("id", { count: "exact", head: true }).eq("is_approved", false).eq("is_active", true),
      supabase.from("vendors").select("id, business_name, category, created_at, country, schools(name)").eq("is_approved", false).eq("is_active", true).order("created_at", { ascending: false }).limit(6),
      supabase.from("featured_listings").select("amount, created_at", { count: "exact" }).eq("payment_status", "confirmed"),
      supabase.from("profiles").select("created_at").order("created_at", { ascending: true }),
      supabase.from("admin_activity_log").select("*").order("created_at", { ascending: false }).limit(20),
      supabase.from("platform_settings").select("*").single(),
      supabase.from("messages").select("id", { count: "exact", head: true }),
      supabase.from("messages").select("id", { count: "exact", head: true }).eq("ai_flagged", true),
      supabase.from("schools").select("id", { count: "exact", head: true }),
      supabase.from("vendor_views").select("id", { count: "exact", head: true }),
      supabase.from("vendor_contacts").select("id", { count: "exact", head: true }),
      (supabase as any).from("vendor_store_upgrades").select("id", { count: "exact", head: true }).eq("payment_status", "confirmed"),
      (supabase as any).from("votw_nominations").select("*, vendors(business_name, category, id)").eq("status", "pending").order("created_at", { ascending: false }).limit(5),
      supabase.from("featured_listings").select("amount, created_at").eq("payment_status", "confirmed"),
      supabase.from("vendors").select("created_at").order("created_at", { ascending: true }),
    ]);

    const revenue = featured.data?.reduce((s: number, f: any) => s + Number(f.amount), 0) || 0;

    setStats({
      totalVendors:     vendors.data?.length || 0,
      pendingVendors:   pending.count   || 0,
      approvedVendors:  (vendors.data?.length || 0) - (pending.count || 0),
      totalUsers:       profiles.data?.length || 0,
      totalMessages:    messages.count  || 0,
      flaggedMessages:  flagged.count   || 0,
      totalSchools:     schools.count   || 0,
      revenue,
      featuredListings: featured.count  || 0,
      totalViews:       views.count     || 0,
      totalContacts:    contacts.count  || 0,
      storeUpgrades:    (storeUpgrades as any).count || 0,
      votwNominations:  votwNoms.data?.length || 0,
    });

    setPendingVendors((pendingList.data || []) as any[]);
    setVotwNominations(votwNoms.data || []);
    setActivityFeed(activityLog.data || []);

    // Platform settings
    if (platformSettings.data) {
      const d = platformSettings.data as any;
      setSettingsId(d.id);
      setSettings({
        paystack_required:      d.paystack_required      ?? false,
        allow_registrations:    d.allow_registrations    ?? true,
        maintenance_mode:       d.maintenance_mode       ?? false,
        featured_reels_enabled: d.featured_reels_enabled ?? false,
        store_upgrade_enabled:  d.store_upgrade_enabled  ?? true,
        verification_payment_enabled: d.verification_payment_enabled ?? true,
      });
    }

    // User growth by month
    const monthMap = new Map<string, number>();
    (profiles.data || []).forEach((p: any) => {
      const d   = new Date(p.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthMap.set(key, (monthMap.get(key) || 0) + 1);
    });
    let cumUser = 0;
    const growthData = [...monthMap.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-8).map(([month, count]) => {
      cumUser += count;
      const [y, m] = month.split("-");
      const label  = new Date(Number(y), Number(m) - 1).toLocaleString("default", { month: "short", year: "2-digit" });
      return { month: label, users: cumUser, new: count };
    });
    setUserGrowth(growthData);

    // Vendor growth by month
    const vendorMonthMap = new Map<string, number>();
    (vendorsByMonth.data || []).forEach((v: any) => {
      const d   = new Date(v.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      vendorMonthMap.set(key, (vendorMonthMap.get(key) || 0) + 1);
    });
    let cumVendor = 0;
    const vendorGrowthData = [...vendorMonthMap.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-8).map(([month, count]) => {
      cumVendor += count;
      const [y, m] = month.split("-");
      const label  = new Date(Number(y), Number(m) - 1).toLocaleString("default", { month: "short", year: "2-digit" });
      return { month: label, vendors: cumVendor };
    });
    setVendorGrowth(vendorGrowthData);

    // Revenue by month
    const revMap = new Map<string, number>();
    (featuredRevenue.data || []).forEach((f: any) => {
      const d   = new Date(f.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      revMap.set(key, (revMap.get(key) || 0) + Number(f.amount));
    });
    const revData = [...revMap.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-8).map(([month, amount]) => {
      const [y, m] = month.split("-");
      const label  = new Date(Number(y), Number(m) - 1).toLocaleString("default", { month: "short", year: "2-digit" });
      return { month: label, revenue: amount };
    });
    setRevenueByMonth(revData);

    // Category breakdown
    const catMap = new Map<string, number>();
    (vendors.data || []).forEach((v: any) => {
      if (v.category) catMap.set(v.category, (catMap.get(v.category) || 0) + 1);
    });
    setCategoryBreakdown([...catMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name: name.split(" ")[0], count })));

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const refresh = async () => { setRefreshing(true); await fetchAll(); };

  // ── Quick approve/reject ──────────────────────────────────────────────────
  const approveVendor = async (id: string) => {
    setApprovingId(id);
    const { error } = await supabase.from("vendors").update({ is_approved: true } as any).eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else {
      toast({ title: "Vendor approved ✅" });
      setPendingVendors((prev) => prev.filter((v) => v.id !== id));
      setStats((prev) => ({ ...prev, pendingVendors: prev.pendingVendors - 1, approvedVendors: prev.approvedVendors + 1 }));
    }
    setApprovingId(null);
  };

  const rejectVendor = async (id: string) => {
    setApprovingId(id + "_r");
    await supabase.from("vendors").update({ is_active: false } as any).eq("id", id);
    toast({ title: "Vendor rejected" });
    setPendingVendors((prev) => prev.filter((v) => v.id !== id));
    setStats((prev) => ({ ...prev, pendingVendors: prev.pendingVendors - 1 }));
    setApprovingId(null);
  };

  // ── VOTW approve ──────────────────────────────────────────────────────────
  const approveVotw = async (nomination: any) => {
    const expires = new Date(Date.now() + 7 * 86400000).toISOString();
    await (supabase as any).from("vendors").update({ is_vendor_of_week: false, vendor_of_week_expires_at: null }).eq("is_vendor_of_week", true);
    await (supabase as any).from("vendors").update({ is_vendor_of_week: true, vendor_of_week_expires_at: expires }).eq("id", nomination.vendor_id);
    await (supabase as any).from("votw_nominations").update({ status: "approved", reviewed_at: new Date().toISOString() }).eq("id", nomination.id);
    toast({ title: `🏆 ${nomination.vendors?.business_name} is now Vendor of the Week!` });
    setVotwNominations((prev) => prev.filter((n) => n.id !== nomination.id));
    setStats((prev) => ({ ...prev, votwNominations: prev.votwNominations - 1 }));
  };

  const rejectVotw = async (id: string) => {
    await (supabase as any).from("votw_nominations").update({ status: "rejected", reviewed_at: new Date().toISOString() }).eq("id", id);
    toast({ title: "Nomination rejected" });
    setVotwNominations((prev) => prev.filter((n) => n.id !== id));
    setStats((prev) => ({ ...prev, votwNominations: prev.votwNominations - 1 }));
  };

  // ── Platform settings toggle ──────────────────────────────────────────────
  const toggle = async (key: keyof typeof settings, newValue: boolean) => {
    if (!settingsId) return;
    setTogglingKey(key);
    const { error } = await supabase.from("platform_settings").update({ [key]: newValue, updated_at: new Date().toISOString() } as any).eq("id", settingsId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { setSettings((prev) => ({ ...prev, [key]: newValue })); toast({ title: "Setting updated" }); }
    setTogglingKey(null);
  };

  const CONTROLS = [
    { key: "paystack_required" as const,      icon: CreditCard, label: "Paystack Payment",   desc: "Nigerian vendors must pay to register",    color: "text-primary" },
    { key: "allow_registrations" as const,    icon: UserPlus,   label: "Vendor Registrations",desc: "Allow new vendor sign-ups",                color: "text-green-500" },
    { key: "maintenance_mode" as const,       icon: Wrench,     label: "Maintenance Mode",    desc: "Show maintenance notice to all visitors",  color: "text-orange-500" },
    { key: "featured_reels_enabled" as const, icon: Film,       label: "Featured Reels",      desc: "Show Reels section on Browse page",        color: "text-accent" },
    { key: "store_upgrade_enabled" as const,  icon: Crown,      label: "Store Upgrades",      desc: "Allow vendors to pay for premium store",   color: "text-accent" },
    { key: "verification_payment_enabled" as const, icon: ShieldCheck, label: "Verification Payments", desc: "Allow vendors to pay for verified badge", color: "text-green-500" },
  ];

  const getStatusBadge = (action: string) => {
    if (action.toLowerCase().includes("approv"))  return <Badge className="bg-success/20 text-success text-[10px]">Approved</Badge>;
    if (action.toLowerCase().includes("reject") || action.toLowerCase().includes("remov")) return <Badge variant="destructive" className="text-[10px]">Rejected</Badge>;
    if (action.toLowerCase().includes("creat") || action.toLowerCase().includes("add"))   return <Badge className="bg-primary/20 text-primary text-[10px]">Created</Badge>;
    if (action.toLowerCase().includes("suspend")) return <Badge className="bg-orange-500/20 text-orange-600 text-[10px]">Suspended</Badge>;
    return <Badge variant="secondary" className="text-[10px]">Updated</Badge>;
  };

  return (
    <AdminLayout>
      {/* ── Page header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {settings.maintenance_mode && (
            <Badge className="bg-orange-500/20 text-orange-600 border border-orange-400/30 gap-1">
              <Wrench className="h-3 w-3" /> Maintenance ON
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing} className="gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Platform Controls ── */}
      <Card className="border-border/50 mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Settings className="h-4 w-4 text-muted-foreground" /> Platform Controls
            <Badge variant="outline" className="text-[10px] ml-auto">Live</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-border/50">
          {CONTROLS.map(({ key, icon: Icon, label, desc, color }) => (
            <div key={key} className="flex items-center justify-between py-3 px-0 sm:px-4 first:pt-0 last:pb-0 sm:first:pt-3 sm:last:pb-3 gap-3">
              <div className="flex items-start gap-2.5">
                <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${settings[key] ? color : "text-muted-foreground/40"}`} />
                <div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs font-medium cursor-pointer">{label}</Label>
                    <Badge className={`text-[9px] px-1 py-0 ${settings[key] ? "bg-green-500/15 text-green-600" : "bg-muted text-muted-foreground"}`}>
                      {settings[key] ? "ON" : "OFF"}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5 max-w-[180px] leading-relaxed">{desc}</p>
                </div>
              </div>
              <Switch checked={settings[key]} onCheckedChange={(v) => toggle(key, v)} disabled={togglingKey === key} className="shrink-0" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ── KPI Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 mb-6">
        <KpiCard title="Total Vendors"      value={stats.totalVendors}    icon={ShoppingBag}   color="text-primary"       href="/admin/vendors"   loading={loading} trendLabel="all time" trend="neutral" />
        <KpiCard title="Pending Approval"   value={stats.pendingVendors}  icon={Clock}         color="text-orange-500"    href="/admin/vendors"   loading={loading} trendLabel={stats.pendingVendors > 0 ? "action needed" : "all clear"} trend={stats.pendingVendors > 0 ? "down" : "up"} />
        <KpiCard title="Registered Users"   value={stats.totalUsers}      icon={Users}         color="text-blue-500"      loading={loading} />
        <KpiCard title="Total Revenue"      value={`₦${stats.revenue.toLocaleString()}`} icon={DollarSign} color="text-green-500" href="/admin/featured" loading={loading} trend="up" trendLabel="featured listings" />
        <KpiCard title="Store Upgrades"     value={stats.storeUpgrades}   icon={Crown}         color="text-purple-500"    loading={loading} trendLabel="premium stores" trend="up" />
        <KpiCard title="Featured Listings"  value={stats.featuredListings} icon={Star}         color="text-yellow-500"    href="/admin/featured"  loading={loading} />
        <KpiCard title="Total Schools"      value={stats.totalSchools}    icon={Building2}     color="text-cyan-500"      href="/admin/schools"   loading={loading} />
        <KpiCard title="All Messages"       value={stats.totalMessages}   icon={MessageSquare} color="text-accent"        href="/admin/chats"     loading={loading} />
        <KpiCard title="Flagged Messages"   value={stats.flaggedMessages} icon={AlertTriangle} color="text-destructive"   href="/admin/chats"     loading={loading} trendLabel={stats.flaggedMessages > 0 ? "needs review" : "all clear"} trend={stats.flaggedMessages > 0 ? "down" : "up"} />
        <KpiCard title="Total Views"        value={stats.totalViews.toLocaleString()} icon={Eye} color="text-indigo-500" href="/admin/analytics" loading={loading} />
        <KpiCard title="Total Contacts"     value={stats.totalContacts.toLocaleString()} icon={Zap} color="text-teal-500" href="/admin/analytics" loading={loading} />
        <KpiCard title="VOTW Nominations"   value={stats.votwNominations} icon={Trophy}        color="text-amber-500"     loading={loading} trendLabel={stats.votwNominations > 0 ? "pending review" : "none pending"} trend={stats.votwNominations > 0 ? "neutral" : "up"} />
      </div>

      {/* ── Three column action zone ── */}
      <div className="grid lg:grid-cols-3 gap-5 mb-6">

        {/* Pending vendor approvals */}
        <Card className="border-orange-400/25 bg-orange-500/3 lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2 text-orange-600">
                <Clock className="h-4 w-4" />
                Pending Approvals
                {stats.pendingVendors > 0 && <Badge className="bg-orange-500 text-white text-[10px]">{stats.pendingVendors}</Badge>}
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs h-7" asChild>
                <Link to="/admin/vendors">All Vendors <ArrowRight className="ml-1 h-3 w-3" /></Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">{[1,2,3].map((i) => <div key={i} className="h-12 bg-muted/50 rounded-xl animate-pulse" />)}</div>
            ) : pendingVendors.length === 0 ? (
              <div className="text-center py-6">
                <CircleCheck className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">All caught up!</p>
                <p className="text-xs text-muted-foreground">No vendors waiting for approval.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingVendors.map((v: any) => (
                  <div key={v.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-background/70 border border-border/40">
                    <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                      <ShoppingBag className="h-4 w-4 text-orange-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-medium truncate">{v.business_name}</span>
                        <Badge variant="outline" className="text-[9px] shrink-0">{v.category}</Badge>
                        <Badge variant="outline" className="text-[9px] shrink-0">{v.country || "🇳🇬"}</Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{v.schools?.name || "No school"} · {new Date(v.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <Button size="sm" className="h-7 w-7 p-0 bg-green-500 hover:bg-green-600 text-white"
                        onClick={() => approveVendor(v.id)} disabled={approvingId === v.id}>
                        {approvingId === v.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                      </Button>
                      <Button size="sm" variant="destructive" className="h-7 w-7 p-0"
                        onClick={() => rejectVendor(v.id)} disabled={approvingId === v.id + "_r"}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Platform health + VOTW queue */}
        <div className="space-y-4">
          {/* Health */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4" /> Platform Health
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <HealthDot ok={!settings.maintenance_mode}       label="Site is live" />
              <HealthDot ok={settings.allow_registrations}     label="Registrations open" />
              <HealthDot ok={stats.flaggedMessages === 0}       label="No flagged messages" />
              <HealthDot ok={stats.pendingVendors === 0}        label="No pending approvals" />
              <HealthDot ok={settings.featured_reels_enabled}  label="Reels section active" />
              <div className="pt-1">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                  <span>Approval rate</span>
                  <span>{stats.totalVendors > 0 ? Math.round((stats.approvedVendors / stats.totalVendors) * 100) : 0}%</span>
                </div>
                <Progress value={stats.totalVendors > 0 ? (stats.approvedVendors / stats.totalVendors) * 100 : 0} className="h-1.5" />
              </div>
            </CardContent>
          </Card>

          {/* VOTW nominations */}
          {votwNominations.length > 0 && (
            <Card className="border-yellow-400/30 bg-yellow-500/4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-yellow-700">
                  <Trophy className="h-4 w-4" /> VOTW Queue
                  <Badge className="bg-yellow-400 text-yellow-900 text-[10px] ml-auto">{votwNominations.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {votwNominations.map((n: any) => (
                  <div key={n.id} className="p-2.5 rounded-xl border border-yellow-400/20 bg-background/60 space-y-2">
                    <div>
                      <span className="text-sm font-medium">{n.vendors?.business_name}</span>
                      <span className="text-[10px] text-muted-foreground ml-2">{n.vendors?.category}</span>
                      {n.note && <p className="text-[10px] text-muted-foreground mt-0.5 italic">"{n.note}"</p>}
                    </div>
                    <div className="flex gap-1.5">
                      <Button size="sm" className="flex-1 h-7 text-xs bg-yellow-400 text-yellow-900 hover:bg-yellow-300 border-0" onClick={() => approveVotw(n)}>
                        <Check className="h-3 w-3 mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs text-destructive border-destructive/30" onClick={() => rejectVotw(n.id)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ── Quick nav links ── */}
      <Card className="border-border/50 mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="h-4 w-4 text-accent" /> Quick Access
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: "Manage Vendors",   href: "/admin/vendors",    icon: Users,        desc: "Approve, verify, suspend" },
              { label: "Analytics",        href: "/admin/analytics",  icon: BarChart3,    desc: "Visitors & engagement" },
              { label: "Chat Monitor",     href: "/admin/chats",      icon: MessageSquare,desc: "Flagged conversations" },
              { label: "Manage Ads",       href: "/admin/ads",        icon: Megaphone,    desc: "Campaign manager" },
              { label: "Schools",          href: "/admin/schools",    icon: Building2,    desc: "Campus management" },
              { label: "Locations",        href: "/admin/locations",  icon: MapPin,       desc: "Delivery zones" },
              { label: "Featured Listings",href: "/admin/featured",   icon: Star,         desc: "Confirm payments" },
              { label: "Sub-Admins",       href: "/admin/sub-admins", icon: ShieldCheck,  desc: "Campus managers" },
            ].map(({ label, href, icon: Icon, desc }) => (
              <Link key={href} to={href}>
                <div className="flex items-start gap-2.5 p-3 rounded-xl border border-border/50 hover:border-accent/40 hover:bg-accent/4 transition-all cursor-pointer group">
                  <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0 group-hover:bg-accent/10 transition-colors">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-accent transition-colors" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground leading-tight truncate">{label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{desc}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Charts row ── */}
      <div className="grid lg:grid-cols-3 gap-5 mb-6">
        <Card className="border-border/50 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> User & Vendor Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            {userGrowth.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={userGrowth}>
                  <defs>
                    <linearGradient id="gradUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }} />
                  <Area type="monotone" dataKey="users" name="Total Users" stroke="hsl(var(--accent))" fill="url(#gradUsers)" strokeWidth={2} />
                  <Area type="monotone" dataKey="new" name="New Users" stroke="hsl(var(--primary))" fill="none" strokeWidth={1.5} strokeDasharray="4 2" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" /> Revenue by Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            {revenueByMonth.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No revenue yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={revenueByMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `₦${(v/1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }} formatter={(v: any) => [`₦${Number(v).toLocaleString()}`, "Revenue"]} />
                  <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Bottom row: Categories + Activity ── */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Vendor Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            {categoryBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No vendors yet</p>
            ) : (
              <div className="space-y-2.5">
                {categoryBreakdown.map((c, i) => (
                  <div key={c.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-foreground font-medium">{c.name}</span>
                      <span className="text-muted-foreground">{c.count} vendor{c.count !== 1 ? "s" : ""}</span>
                    </div>
                    <Progress value={(c.count / (categoryBreakdown[0]?.count || 1)) * 100} className="h-1.5" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4" /> Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activityFeed.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No activity yet</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {activityFeed.map((a: any) => (
                  <div key={a.id} className="flex items-start gap-2.5 pb-2 border-b border-border/20 last:border-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent mt-2 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-foreground truncate">{a.action}</span>
                        {getStatusBadge(a.action)}
                      </div>
                      {a.details && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                          {typeof a.details === "object" ? JSON.stringify(a.details).slice(0, 60) : String(a.details).slice(0, 60)}
                        </p>
                      )}
                      <span className="text-[10px] text-muted-foreground/60">{new Date(a.created_at).toLocaleString()}</span>
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

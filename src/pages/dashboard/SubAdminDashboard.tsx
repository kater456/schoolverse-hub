import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Link, useNavigate } from "react-router-dom";
import {
  Eye, Heart, Phone, ShoppingBag, Users, LogOut, Film,
  Loader2, Star, Calendar, Check, X, Activity, AlertTriangle,
  TrendingUp, ShieldCheck, ShieldOff, UserX, UserCheck, BarChart3,
  MessageCircle, Clock, Trophy, Search, RefreshCw, Crown, Zap,
  ChevronRight, CircleCheck, Building2, Megaphone, TrendingDown,
  Settings, Bell, Command, Menu, ExternalLink,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ThemeToggle from "@/components/ThemeToggle";
import ManageVendorsSubAdmin from "@/pages/admin/ManageVendorsSubAdmin";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from "recharts";

// ── KPI Card ──────────────────────────────────────────────────────────────────
const KpiCard = ({
  title, value, icon: Icon, colorClass, accent, trend, trendLabel, onClick,
}: any) => (
  <Card
    className={`border-border/50 relative overflow-hidden cursor-pointer hover:shadow-md transition-all hover:border-accent/40`}
    onClick={onClick}
  >
    <div className={`absolute top-0 left-0 w-1 h-full ${accent}`} />
    <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4 pl-5">
      <CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle>
      <Icon className={`h-4 w-4 ${colorClass}`} />
    </CardHeader>
    <CardContent className="px-4 pb-3 pl-5">
      <div className="text-2xl font-bold">{value}</div>
      {trendLabel && (
        <p className={`text-[10px] mt-0.5 flex items-center gap-1 ${trend === "up" ? "text-green-500" : trend === "down" ? "text-red-500" : "text-muted-foreground"}`}>
          {trend === "up" ? <TrendingUp className="h-3 w-3" /> : trend === "down" ? <TrendingDown className="h-3 w-3" /> : null}
          {trendLabel}
        </p>
      )}
    </CardContent>
  </Card>
);

// ── Sidebar nav items for sub-admin ──────────────────────────────────────────
const NAV = [
  { key: "overview",     label: "Overview",     icon: BarChart3 },
  { key: "pending",      label: "Pending",      icon: Clock,         badge: "pending" },
  { key: "approved",     label: "Approved",     icon: ShieldCheck },
  { key: "performance",  label: "Performance",  icon: TrendingUp },
  { key: "messages",     label: "Messages",     icon: MessageCircle, badge: "flagged" },
  { key: "votw",         label: "VOTW",         icon: Trophy },
  { key: "management",   label: "Full Manage",  icon: Settings },
];

const SubAdminDashboard = () => {
  const { user, userRole, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [activeTab,    setActiveTab]    = useState("overview");
  const [sidebarOpen,  setSidebarOpen]  = useState(false);
  const [school,       setSchool]       = useState<any>(null);
  const [refreshing,   setRefreshing]   = useState(false);

  const [stats, setStats] = useState({
    totalVendors: 0, pendingVendors: 0, approvedVendors: 0,
    totalViews: 0, totalLikes: 0, totalComments: 0, totalContacts: 0,
    totalMessages: 0, flaggedMessages: 0,
  });

  const [vendors,            setVendors]            = useState<any[]>([]);
  const [monthlyPerformance, setMonthlyPerformance] = useState<any[]>([]);
  const [weeklyActivity,     setWeeklyActivity]     = useState<any[]>([]);
  const [recentMessages,     setRecentMessages]     = useState<any[]>([]);
  const [isLoading,          setIsLoading]          = useState(true);
  const [actionLoading,      setActionLoading]      = useState<string | null>(null);

  // VOTW
  const [votwDialog,     setVotwDialog]     = useState(false);
  const [votwSearch,     setVotwSearch]     = useState("");
  const [votwNote,       setVotwNote]       = useState("");
  const [nominations,    setNominations]    = useState<any[]>([]);
  const [submittingVotw, setSubmittingVotw] = useState(false);
  const [currentVotw,    setCurrentVotw]    = useState<any>(null);

  const getSchoolId = () => (userRole as any)?.assigned_school_id || (userRole as any)?.school_id;

  const fetchData = useCallback(async () => {
    if (!user || !userRole) return;
    const schoolId = getSchoolId();

    if (schoolId) {
      const { data: s } = await supabase.from("schools").select("*").eq("id", schoolId).single();
      setSchool(s);
    }

    const vendorQ = schoolId
      ? supabase.from("vendors").select("id, business_name, category, is_approved, is_active, is_suspended, is_verified, reels_enabled, description, created_at").eq("school_id", schoolId)
      : supabase.from("vendors").select("id, business_name, category, is_approved, is_active, is_suspended, is_verified, reels_enabled, description, created_at");

    const { data: vendorData } = await vendorQ;
    setVendors(vendorData || []);

    const vendorIds    = (vendorData || []).map((v: any) => v.id);
    const pendingCount = (vendorData || []).filter((v: any) => !v.is_approved && v.is_active !== false).length;

    if (vendorIds.length > 0) {
      const [views, likes, comments, contacts, convs, flagged] = await Promise.all([
        supabase.from("vendor_views").select("id", { count: "exact", head: true }).in("vendor_id", vendorIds),
        supabase.from("vendor_likes").select("id", { count: "exact", head: true }).in("vendor_id", vendorIds),
        supabase.from("vendor_comments").select("id", { count: "exact", head: true }).in("vendor_id", vendorIds),
        supabase.from("vendor_contacts").select("id", { count: "exact", head: true }).in("vendor_id", vendorIds),
        supabase.from("conversations").select("id", { count: "exact", head: true }).in("vendor_id", vendorIds),
        supabase.from("messages").select("id", { count: "exact", head: true }).eq("ai_flagged", true),
      ]);

      setStats({
        totalVendors:    vendorData?.length || 0,
        pendingVendors:  pendingCount,
        approvedVendors: (vendorData || []).filter((v: any) => v.is_approved).length,
        totalViews:      views.count    || 0,
        totalLikes:      likes.count    || 0,
        totalComments:   comments.count || 0,
        totalContacts:   contacts.count || 0,
        totalMessages:   convs.count    || 0,
        flaggedMessages: flagged.count  || 0,
      });

      // Monthly performance
      const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0,0,0,0);
      const [mViews, mContacts, ratings] = await Promise.all([
        supabase.from("vendor_views").select("vendor_id").in("vendor_id", vendorIds).gte("created_at", startOfMonth.toISOString()),
        supabase.from("vendor_contacts").select("vendor_id").in("vendor_id", vendorIds).gte("created_at", startOfMonth.toISOString()),
        supabase.from("vendor_ratings").select("vendor_id, rating").in("vendor_id", vendorIds),
      ]);

      const perfMap = new Map<string, any>();
      vendorIds.forEach((id: string) => perfMap.set(id, { views: 0, contacts: 0, avgRating: 0, ratingCount: 0 }));
      (mViews.data    || []).forEach((v: any) => { const p = perfMap.get(v.vendor_id); if (p) p.views++; });
      (mContacts.data || []).forEach((c: any) => { const p = perfMap.get(c.vendor_id); if (p) p.contacts++; });
      (ratings.data   || []).forEach((r: any) => {
        const p = perfMap.get(r.vendor_id);
        if (p) { p.avgRating = ((p.avgRating * p.ratingCount) + r.rating) / (p.ratingCount + 1); p.ratingCount++; }
      });

      const perf = (vendorData || []).filter((v: any) => v.is_approved)
        .map((v: any) => ({ ...v, ...(perfMap.get(v.id) || {}) }))
        .sort((a: any, b: any) => b.views - a.views);
      setMonthlyPerformance(perf);

      // Weekly chart
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0,0,0,0);
        const n = new Date(d); n.setDate(n.getDate() + 1);
        const label = d.toLocaleDateString("en", { weekday: "short" });
        const vCount = (vendorData || []).filter((v: any) => { const c = new Date(v.created_at); return c >= d && c < n; }).length;
        days.push({ day: label, vendors: vCount });
      }
      setWeeklyActivity(days);

      // Recent convos
      const { data: convData } = await (supabase as any)
        .from("conversations")
        .select("id, last_message, last_message_at, is_flagged, vendor_unread, buyer_unread, vendors(business_name)")
        .in("vendor_id", vendorIds)
        .order("last_message_at", { ascending: false })
        .limit(6);
      setRecentMessages(convData || []);
    }

    // VOTW
    const now = new Date().toISOString();
    let votwQ = (supabase as any).from("vendors").select("id, business_name, category, vendor_of_week_expires_at").eq("is_vendor_of_week", true).gt("vendor_of_week_expires_at", now);
    if (schoolId) votwQ = votwQ.eq("school_id", schoolId);
    const { data: votwData } = await votwQ.maybeSingle();
    setCurrentVotw(votwData || null);

    // Nominations
    if (user) {
      const nomQ = schoolId
        ? (supabase as any).from("votw_nominations").select("*, vendors(business_name, category)").eq("school_id", schoolId).order("created_at", { ascending: false }).limit(10)
        : (supabase as any).from("votw_nominations").select("*, vendors(business_name, category)").eq("nominated_by", user.id).order("created_at", { ascending: false }).limit(10);
      const { data: noms } = await nomQ;
      setNominations(noms || []);
    }

    setIsLoading(false);
    setRefreshing(false);
  }, [user, userRole]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const refresh = () => { setRefreshing(true); fetchData(); };

  // ── Vendor actions ────────────────────────────────────────────────────────
  const run = async (key: string, fn: () => Promise<void>) => {
    setActionLoading(key);
    try { await fn(); } finally { setActionLoading(null); }
  };

  const approveVendor = (id: string) => run(id, async () => {
    await supabase.from("vendors").update({ is_approved: true } as any).eq("id", id);
    await supabase.from("admin_activity_log").insert({ admin_id: user!.id, action: "Approved vendor", target_type: "vendor", target_id: id } as any);
    toast({ title: "Vendor approved ✅" });
    setVendors((p) => p.map((v) => v.id === id ? { ...v, is_approved: true } : v));
    setStats((p) => ({ ...p, pendingVendors: p.pendingVendors - 1, approvedVendors: p.approvedVendors + 1 }));
  });

  const rejectVendor = (id: string) => run(id + "_r", async () => {
    await supabase.from("vendors").update({ is_active: false } as any).eq("id", id);
    toast({ title: "Vendor rejected" });
    setVendors((p) => p.map((v) => v.id === id ? { ...v, is_active: false } : v));
    setStats((p) => ({ ...p, pendingVendors: p.pendingVendors - 1 }));
  });

  const toggleSuspend = (v: any) => run(v.id + "_s", async () => {
    await supabase.from("vendors").update({ is_suspended: !v.is_suspended } as any).eq("id", v.id);
    toast({ title: v.is_suspended ? "Unsuspended" : "Suspended" });
    setVendors((p) => p.map((vv) => vv.id === v.id ? { ...vv, is_suspended: !v.is_suspended } : vv));
  });

  const toggleVerify = (v: any) => run(v.id + "_v", async () => {
    await supabase.from("vendors").update({ is_verified: !v.is_verified } as any).eq("id", v.id);
    toast({ title: v.is_verified ? "Verification removed" : "Vendor verified ✅" });
    setVendors((p) => p.map((vv) => vv.id === v.id ? { ...vv, is_verified: !v.is_verified } : vv));
  });

  const toggleReels = (v: any) => run(v.id + "_rl", async () => {
    await supabase.from("vendors").update({ reels_enabled: !v.reels_enabled } as any).eq("id", v.id);
    setVendors((p) => p.map((vv) => vv.id === v.id ? { ...vv, reels_enabled: !v.reels_enabled } : vv));
    toast({ title: v.reels_enabled ? "Reels revoked" : "Reels granted" });
  });

  const removeVendor = (id: string) => run(id + "_rm", async () => {
    await supabase.from("vendors").update({ is_active: false } as any).eq("id", id);
    toast({ title: "Vendor removed" });
    setVendors((p) => p.map((v) => v.id === id ? { ...v, is_active: false } : v));
  });

  // VOTW nominate
  const submitVotw = async (vendorId: string) => {
    setSubmittingVotw(true);
    const { error } = await (supabase as any).from("votw_nominations").insert({
      vendor_id: vendorId, nominated_by: user!.id,
      school_id: getSchoolId() || null, note: votwNote.trim() || null, status: "pending",
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else {
      toast({ title: "Nomination submitted! ⏳", description: "Awaiting super admin approval." });
      setVotwDialog(false); setVotwSearch(""); setVotwNote("");
      fetchData();
    }
    setSubmittingVotw(false);
  };

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center mx-auto shadow-lg shadow-accent/30">
          <ShoppingBag className="h-6 w-6 text-accent-foreground" />
        </div>
        <Loader2 className="h-5 w-5 animate-spin text-accent mx-auto" />
      </div>
    </div>
  );

  const pendingVendors  = vendors.filter((v) => !v.is_approved && v.is_active !== false);
  const approvedVendors = vendors.filter((v) => v.is_approved && v.is_active !== false);
  const maxViews        = Math.max(...monthlyPerformance.map((v: any) => v.views), 1);
  const currentMonth    = new Date().toLocaleString("default", { month: "long", year: "numeric" });
  const filteredVotw    = approvedVendors.filter((v) => v.business_name.toLowerCase().includes(votwSearch.toLowerCase()));

  // ── Sidebar ───────────────────────────────────────────────────────────────
  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="relative overflow-hidden px-4 pt-5 pb-4 border-b border-white/8">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/20 via-transparent to-primary/10 pointer-events-none" />
        <Link to="/" className="flex items-center gap-2.5 relative">
          <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center shadow-lg shadow-accent/30">
            <ShoppingBag className="h-4 w-4 text-accent-foreground" />
          </div>
          <div>
            <span className="font-bold text-sidebar-foreground text-sm block leading-tight">Campus Market</span>
            <span className="text-[10px] text-sidebar-foreground/40 uppercase tracking-widest">Sub-Admin</span>
          </div>
        </Link>
        <div className="absolute top-4 right-4 flex items-center gap-1.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
          </span>
          <span className="text-[9px] text-green-400 font-medium">Live</span>
        </div>
      </div>

      {/* School badge */}
      {school && (
        <div className="px-3 py-2 border-b border-white/8">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/8">
            <Building2 className="h-4 w-4 text-accent shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-sidebar-foreground truncate">{school.name}</p>
              <p className="text-[9px] text-sidebar-foreground/40">Your campus</p>
            </div>
          </div>
        </div>
      )}

      {/* Alerts */}
      {(stats.pendingVendors > 0 || stats.flaggedMessages > 0) && (
        <div className="px-3 py-2 space-y-1 border-b border-white/8">
          {stats.pendingVendors > 0 && (
            <button onClick={() => setActiveTab("pending")} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-500/10 border border-orange-400/15 hover:bg-orange-500/15 transition-colors text-left">
              <Clock className="h-3.5 w-3.5 text-orange-400 shrink-0" />
              <span className="text-xs text-orange-300 flex-1">{stats.pendingVendors} pending approval</span>
              <ChevronRight className="h-3 w-3 text-orange-400/40" />
            </button>
          )}
          {stats.flaggedMessages > 0 && (
            <button onClick={() => setActiveTab("messages")} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-400/15 hover:bg-red-500/15 transition-colors text-left">
              <Bell className="h-3.5 w-3.5 text-red-400 shrink-0" />
              <span className="text-xs text-red-300 flex-1">{stats.flaggedMessages} flagged messages</span>
              <ChevronRight className="h-3 w-3 text-red-400/40" />
            </button>
          )}
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] text-sidebar-foreground/25 uppercase tracking-widest px-3 py-1.5 font-semibold">Navigation</p>
        {NAV.map((item) => {
          const isActive = activeTab === item.key;
          const count = item.badge === "pending" ? stats.pendingVendors : item.badge === "flagged" ? stats.flaggedMessages : 0;
          return (
            <button key={item.key} onClick={() => { setActiveTab(item.key); setSidebarOpen(false); }}
              className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all overflow-hidden ${
                isActive ? "bg-accent text-accent-foreground shadow-md shadow-accent/20" : "text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-white/6"
              }`}>
              {isActive && <div className="absolute inset-0 bg-gradient-to-r from-accent to-accent/80 pointer-events-none" />}
              <item.icon className="h-4 w-4 shrink-0 relative z-10" />
              <span className="text-sm font-medium flex-1 text-left relative z-10">{item.label}</span>
              {count > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 relative z-10 ${
                  isActive ? "bg-white/20 text-white" : item.badge === "flagged" ? "bg-red-500 text-white" : "bg-orange-500 text-white"
                }`}>{count}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-2 pb-3 pt-2 border-t border-white/8 space-y-0.5">
        <Link to="/" target="_blank" rel="noopener noreferrer">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-white/6 transition-all group">
            <ExternalLink className="h-4 w-4 group-hover:text-accent" />
            <span className="text-xs">View Campus Site</span>
          </div>
        </Link>
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-[10px] text-sidebar-foreground/30">Theme</span>
          <ThemeToggle />
        </div>
        <button onClick={signOut} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sidebar-foreground/40 hover:text-red-400 hover:bg-red-500/8 transition-all">
          <LogOut className="h-4 w-4" />
          <span className="text-xs">Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop sidebar */}
      <aside className="w-60 bg-sidebar hidden md:flex flex-col fixed top-0 left-0 h-screen z-40 border-r border-sidebar-border overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-accent/4 via-transparent to-primary/4 pointer-events-none" />
        <div className="relative flex flex-col h-full"><SidebarContent /></div>
      </aside>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-68 bg-sidebar flex flex-col overflow-hidden border-r border-sidebar-border">
            <div className="absolute inset-0 bg-gradient-to-b from-accent/4 via-transparent to-primary/4 pointer-events-none" />
            <button onClick={() => setSidebarOpen(false)} className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
              <X className="h-4 w-4 text-sidebar-foreground" />
            </button>
            <div className="relative flex flex-col h-full"><SidebarContent /></div>
          </aside>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 md:ml-60 overflow-auto">
        {/* Top bar */}
        <div className="sticky top-0 z-30 flex items-center gap-3 px-4 h-13 bg-background/95 backdrop-blur-xl border-b border-border">
          <button onClick={() => setSidebarOpen(true)} className="md:hidden w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center">
            <Menu className="h-5 w-5 text-accent" />
          </button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground flex-1 min-w-0">
            <ShoppingBag className="h-4 w-4 text-accent shrink-0" />
            <ChevronRight className="h-3 w-3 shrink-0" />
            <span className="text-foreground font-medium">{NAV.find((n) => n.key === activeTab)?.label || "Overview"}</span>
          </div>
          {(stats.pendingVendors + stats.flaggedMessages) > 0 && (
            <button onClick={() => setActiveTab(stats.pendingVendors > 0 ? "pending" : "messages")}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-orange-500/10 border border-orange-400/20 hover:bg-orange-500/15 transition-colors">
              <Bell className="h-3.5 w-3.5 text-orange-400" />
              <span className="text-xs font-bold text-orange-400">{stats.pendingVendors + stats.flaggedMessages}</span>
            </button>
          )}
          <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing} className="gap-1.5 h-8">
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <ThemeToggle />
        </div>

        <div className="p-4 sm:p-6 max-w-7xl mx-auto">

          {/* ── OVERVIEW ── */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold">{school?.name || "Campus"} Dashboard</h1>
                  <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long" })}</p>
                </div>
              </div>

              {/* KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <KpiCard title="Total Businesses" value={stats.totalVendors}    icon={ShoppingBag}   colorClass="text-primary"      accent="bg-primary"      onClick={() => setActiveTab("approved")} />
                <KpiCard title="Pending Approval" value={stats.pendingVendors}  icon={Clock}         colorClass="text-orange-500"   accent="bg-orange-500"   onClick={() => setActiveTab("pending")} trend={stats.pendingVendors > 0 ? "down" : "up"} trendLabel={stats.pendingVendors > 0 ? "needs action" : "all clear"} />
                <KpiCard title="Total Views"      value={stats.totalViews.toLocaleString()} icon={Eye} colorClass="text-accent" accent="bg-accent" onClick={() => setActiveTab("performance")} />
                <KpiCard title="Total Contacts"   value={stats.totalContacts}   icon={Phone}         colorClass="text-green-500"    accent="bg-green-500"    onClick={() => setActiveTab("performance")} />
                <KpiCard title="Total Likes"      value={stats.totalLikes}      icon={Heart}         colorClass="text-red-500"      accent="bg-red-500"      />
                <KpiCard title="Conversations"    value={stats.totalMessages}   icon={MessageCircle} colorClass="text-blue-500"     accent="bg-blue-500"     onClick={() => setActiveTab("messages")} />
                <KpiCard title="Flagged Messages" value={stats.flaggedMessages} icon={AlertTriangle} colorClass="text-destructive"  accent="bg-destructive"  onClick={() => setActiveTab("messages")} trend={stats.flaggedMessages > 0 ? "down" : "up"} trendLabel={stats.flaggedMessages > 0 ? "review needed" : "all clear"} />
                <KpiCard title="Approved"         value={stats.approvedVendors} icon={ShieldCheck}   colorClass="text-success"      accent="bg-green-600"    onClick={() => setActiveTab("approved")} trend="up" trendLabel="active vendors" />
              </div>

              {/* Health + Weekly chart */}
              <div className="grid lg:grid-cols-3 gap-5">
                <Card className="border-border/50">
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4" />Campus Health</CardTitle></CardHeader>
                  <CardContent className="space-y-2.5">
                    <div className="flex items-center gap-2"><CircleCheck className={`h-3.5 w-3.5 shrink-0 ${stats.flaggedMessages === 0 ? "text-green-500" : "text-red-500"}`} /><span className="text-xs">{stats.flaggedMessages === 0 ? "No flagged messages" : `${stats.flaggedMessages} flagged messages`}</span></div>
                    <div className="flex items-center gap-2"><CircleCheck className={`h-3.5 w-3.5 shrink-0 ${stats.pendingVendors === 0 ? "text-green-500" : "text-orange-500"}`} /><span className="text-xs">{stats.pendingVendors === 0 ? "No pending approvals" : `${stats.pendingVendors} pending`}</span></div>
                    <div className="flex items-center gap-2"><CircleCheck className="h-3.5 w-3.5 shrink-0 text-green-500" /><span className="text-xs">Campus is active</span></div>
                    <div className="pt-1">
                      <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                        <span>Approval rate</span>
                        <span>{stats.totalVendors > 0 ? Math.round((stats.approvedVendors / stats.totalVendors) * 100) : 0}%</span>
                      </div>
                      <Progress value={stats.totalVendors > 0 ? (stats.approvedVendors / stats.totalVendors) * 100 : 0} className="h-1.5" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/50 lg:col-span-2">
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4" />New Registrations This Week</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={150}>
                      <AreaChart data={weeklyActivity}>
                        <defs>
                          <linearGradient id="gradW" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                        <Tooltip contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }} />
                        <Area type="monotone" dataKey="vendors" name="New Vendors" stroke="hsl(var(--accent))" fill="url(#gradW)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Pending quick actions */}
              {pendingVendors.length > 0 && (
                <Card className="border-orange-400/25 bg-orange-500/3">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2 text-orange-600">
                        <Clock className="h-4 w-4" />Needs Approval
                        <Badge className="bg-orange-500 text-white text-[10px]">{pendingVendors.length}</Badge>
                      </CardTitle>
                      <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setActiveTab("pending")}>
                        View All <ChevronRight className="ml-1 h-3 w-3" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {pendingVendors.slice(0, 3).map((v) => (
                      <div key={v.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-background/70 border border-border/40">
                        <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0 text-orange-500 font-bold text-sm">
                          {v.business_name.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{v.business_name}</p>
                          <p className="text-[10px] text-muted-foreground">{v.category} · {new Date(v.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <Button size="sm" className="h-7 w-7 p-0 bg-green-500 hover:bg-green-600 text-white" onClick={() => approveVendor(v.id)} disabled={actionLoading === v.id}>
                            {actionLoading === v.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                          </Button>
                          <Button size="sm" variant="destructive" className="h-7 w-7 p-0" onClick={() => rejectVendor(v.id)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {pendingVendors.length > 3 && <p className="text-xs text-muted-foreground text-center">+{pendingVendors.length - 3} more in Pending tab</p>}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* ── PENDING ── */}
          {activeTab === "pending" && (
            <div className="space-y-4">
              <h1 className="text-2xl font-bold flex items-center gap-2"><Clock className="h-6 w-6 text-orange-500" />Pending Approvals</h1>
              <Card className="border-border/50">
                <CardContent className="pt-4">
                  {pendingVendors.length === 0 ? (
                    <div className="text-center py-12"><CircleCheck className="h-10 w-10 text-green-500 mx-auto mb-3" /><p className="font-medium">All caught up!</p><p className="text-sm text-muted-foreground mt-1">No vendors waiting for approval.</p></div>
                  ) : (
                    <div className="space-y-3">
                      {pendingVendors.map((v) => (
                        <div key={v.id} className="border border-border/40 rounded-2xl p-4 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold">{v.business_name}</span>
                                <Badge variant="outline" className="text-xs">{v.category}</Badge>
                              </div>
                              {v.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{v.description}</p>}
                              <p className="text-xs text-muted-foreground mt-1">Applied: {new Date(v.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}</p>
                            </div>
                            <div className="flex gap-2 shrink-0">
                              <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white" onClick={() => approveVendor(v.id)} disabled={actionLoading === v.id}>
                                <Check className="h-3 w-3 mr-1" />Approve
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => rejectVendor(v.id)}>
                                <X className="h-3 w-3 mr-1" />Reject
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── APPROVED ── */}
          {activeTab === "approved" && (
            <div className="space-y-4">
              <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="h-6 w-6 text-green-500" />Approved Businesses ({approvedVendors.length})</h1>
              <Card className="border-border/50">
                <CardContent className="pt-4">
                  {approvedVendors.length === 0 ? (
                    <p className="text-center text-muted-foreground py-10">No approved businesses yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {approvedVendors.map((v) => (
                        <div key={v.id} className="flex items-center justify-between gap-3 border border-border/40 rounded-xl p-3 flex-wrap hover:bg-muted/20 transition-colors">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center shrink-0 font-bold text-accent text-sm">
                              {v.business_name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-sm font-medium truncate">{v.business_name}</span>
                                {v.is_verified  && <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />}
                                {v.is_suspended && <Badge className="bg-orange-500/20 text-orange-600 text-[10px]">Suspended</Badge>}
                                {v.reels_enabled && <Badge className="bg-accent/10 text-accent text-[10px]"><Film className="h-2.5 w-2.5 mr-0.5" />Reels</Badge>}
                              </div>
                              <span className="text-xs text-muted-foreground">{v.category}</span>
                            </div>
                          </div>
                          <div className="flex gap-1.5 flex-wrap shrink-0">
                            <Button size="sm" variant="outline" className={`text-xs h-7 ${v.is_verified ? "text-muted-foreground" : "text-primary border-primary/40"}`} onClick={() => toggleVerify(v)} disabled={!!actionLoading}>
                              {v.is_verified ? <><ShieldOff className="h-3 w-3 mr-1" />Unverify</> : <><ShieldCheck className="h-3 w-3 mr-1" />Verify</>}
                            </Button>
                            <Button size="sm" variant="outline" className={`text-xs h-7 ${v.is_suspended ? "text-green-600 border-green-400/40" : "text-orange-600 border-orange-300"}`} onClick={() => toggleSuspend(v)} disabled={!!actionLoading}>
                              {v.is_suspended ? <><UserCheck className="h-3 w-3 mr-1" />Unsuspend</> : <><UserX className="h-3 w-3 mr-1" />Suspend</>}
                            </Button>
                            <Button size="sm" variant={v.reels_enabled ? "destructive" : "outline"} className="text-xs h-7" onClick={() => toggleReels(v)}>
                              <Film className="h-3 w-3 mr-1" />{v.reels_enabled ? "Revoke" : "Reels"}
                            </Button>
                            <Button size="sm" variant="ghost" className="text-destructive text-xs h-7" onClick={() => removeVendor(v.id)}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── PERFORMANCE ── */}
          {activeTab === "performance" && (
            <div className="space-y-4">
              <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="h-6 w-6 text-accent" />Monthly Performance — {currentMonth}</h1>
              <Card className="border-border/50">
                <CardContent className="pt-4">
                  {monthlyPerformance.length === 0 ? (
                    <p className="text-center text-muted-foreground py-10">No performance data yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {monthlyPerformance.map((v: any, i) => (
                        <div key={v.id} className="space-y-1.5 p-3 rounded-xl hover:bg-muted/20 transition-colors">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-muted-foreground w-5">{i + 1}.</span>
                              <span className="text-sm font-medium">{v.business_name}</span>
                              <Badge variant="outline" className="text-[10px]">{v.category}</Badge>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{v.views}</span>
                              <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{v.contacts}</span>
                              {v.ratingCount > 0 && <span className="flex items-center gap-1"><Star className="h-3 w-3 text-yellow-500" />{v.avgRating.toFixed(1)}</span>}
                            </div>
                          </div>
                          <Progress value={(v.views / maxViews) * 100} className="h-1.5" />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── MESSAGES ── */}
          {activeTab === "messages" && (
            <div className="space-y-4">
              <h1 className="text-2xl font-bold flex items-center gap-2"><MessageCircle className="h-6 w-6 text-blue-500" />Conversations</h1>
              <div className="grid grid-cols-2 gap-4">
                <Card className="border-border/50">
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-muted-foreground"><MessageCircle className="h-4 w-4" />Total</CardTitle></CardHeader>
                  <CardContent><div className="text-3xl font-bold">{stats.totalMessages}</div></CardContent>
                </Card>
                <Card className="border-destructive/30 bg-destructive/5">
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-destructive"><AlertTriangle className="h-4 w-4" />Flagged</CardTitle></CardHeader>
                  <CardContent><div className="text-3xl font-bold text-destructive">{stats.flaggedMessages}</div></CardContent>
                </Card>
              </div>
              <Card className="border-border/50">
                <CardHeader><CardTitle className="text-sm">Recent Conversations</CardTitle></CardHeader>
                <CardContent>
                  {recentMessages.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No conversations yet</p>
                  ) : (
                    <div className="space-y-2">
                      {recentMessages.map((c: any) => (
                        <div key={c.id} className={`flex items-center justify-between gap-3 p-3 rounded-xl border ${c.is_flagged ? "border-destructive/40 bg-destructive/5" : "border-border/40"}`}>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium truncate">{c.vendors?.business_name || "Unknown"}</span>
                              {c.is_flagged && <Badge variant="destructive" className="text-[10px]"><AlertTriangle className="h-2.5 w-2.5 mr-0.5" />Flagged</Badge>}
                              {(c.vendor_unread || c.buyer_unread) > 0 && <Badge className="bg-accent/20 text-accent text-[10px]">{(c.vendor_unread || 0) + (c.buyer_unread || 0)} unread</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{c.last_message || "No messages"}</p>
                          </div>
                          <span className="text-[10px] text-muted-foreground shrink-0">{c.last_message_at ? new Date(c.last_message_at).toLocaleDateString() : "—"}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── VOTW ── */}
          {activeTab === "votw" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold flex items-center gap-2"><Trophy className="h-6 w-6 text-yellow-500" />Vendor of the Week</h1>
                <Button onClick={() => setVotwDialog(true)} className="bg-gradient-to-r from-yellow-400 to-amber-400 text-yellow-900 hover:from-yellow-300 hover:to-amber-300 border-0">
                  <Trophy className="h-4 w-4 mr-2" />Nominate Vendor
                </Button>
              </div>

              {/* Current VOTW */}
              <Card className="border-yellow-400/40 bg-yellow-500/5">
                <CardHeader><CardTitle className="text-sm text-yellow-700 flex items-center gap-2"><Trophy className="h-4 w-4" />Current Vendor of the Week</CardTitle></CardHeader>
                <CardContent>
                  {currentVotw ? (
                    <div className="flex items-center gap-4 p-3 rounded-xl bg-yellow-400/10 border border-yellow-400/30">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow text-yellow-900 font-bold text-lg">
                        {currentVotw.business_name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-foreground">{currentVotw.business_name}</p>
                        <p className="text-xs text-muted-foreground">{currentVotw.category}</p>
                        <p className="text-xs text-yellow-700 mt-0.5">Until {new Date(currentVotw.vendor_of_week_expires_at).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}</p>
                      </div>
                      <Badge className="bg-yellow-400 text-yellow-900 border-0 text-xs">🏆 Active</Badge>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Trophy className="h-10 w-10 mx-auto mb-3 opacity-20" />
                      <p className="text-sm">No vendor of the week currently set on this campus.</p>
                      <p className="text-xs mt-1">Nominate a vendor — the super admin will review and approve.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Nomination history */}
              <Card className="border-border/50">
                <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4" />Your Nominations</CardTitle></CardHeader>
                <CardContent>
                  {nominations.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8 text-sm">No nominations yet. Nominate a vendor above.</p>
                  ) : (
                    <div className="space-y-2">
                      {nominations.map((n: any) => (
                        <div key={n.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border/40">
                          <div className="min-w-0 flex-1">
                            <span className="text-sm font-medium">{n.vendors?.business_name}</span>
                            <span className="text-xs text-muted-foreground ml-2">{n.vendors?.category}</span>
                            {n.note && <p className="text-xs text-muted-foreground italic mt-0.5">"{n.note}"</p>}
                            <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(n.created_at).toLocaleDateString()}</p>
                          </div>
                          <Badge className={n.status === "approved" ? "bg-success/20 text-success text-xs" : n.status === "rejected" ? "bg-destructive/20 text-destructive text-xs" : "bg-orange-500/20 text-orange-600 text-xs"}>
                            {n.status === "approved" ? "✅ Approved" : n.status === "rejected" ? "❌ Rejected" : "⏳ Pending"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── FULL MANAGEMENT ── */}
          {activeTab === "management" && (
            <div className="space-y-4">
              <h1 className="text-2xl font-bold flex items-center gap-2"><Settings className="h-6 w-6 text-muted-foreground" />Full Vendor Management</h1>
              <ManageVendorsSubAdmin />
            </div>
          )}
        </div>
      </main>

      {/* VOTW Dialog */}
      {votwDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2"><Trophy className="h-5 w-5 text-yellow-500" />Nominate Vendor</h3>
              <button onClick={() => setVotwDialog(false)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"><X className="h-4 w-4" /></button>
            </div>
            <p className="text-sm text-muted-foreground">Select a vendor to nominate. Super admin approval required before it goes live.</p>
            {currentVotw && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-yellow-500/10 border border-yellow-400/30 text-xs text-yellow-700">
                <Trophy className="h-3.5 w-3.5 shrink-0" />
                Current: <strong>{currentVotw.business_name}</strong>
              </div>
            )}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search vendors…" value={votwSearch} onChange={(e) => setVotwSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {filteredVotw.length === 0 ? <p className="text-center text-muted-foreground py-4 text-sm">No vendors found</p>
                : filteredVotw.map((v) => (
                  <div key={v.id} className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-border/50 hover:bg-muted/50 transition-colors">
                    <div><span className="text-sm font-medium">{v.business_name}</span><span className="text-xs text-muted-foreground ml-2">{v.category}</span></div>
                    <Button size="sm" className="h-7 text-xs bg-gradient-to-r from-yellow-400 to-amber-400 text-yellow-900 hover:from-yellow-300 border-0"
                      onClick={() => submitVotw(v.id)} disabled={submittingVotw}>
                      {submittingVotw ? <Loader2 className="h-3 w-3 animate-spin" /> : "Nominate"}
                    </Button>
                  </div>
                ))}
            </div>
            <Textarea placeholder="Why should this vendor win? (optional)" value={votwNote} onChange={(e) => setVotwNote(e.target.value)} rows={2} className="resize-none text-sm" />
            <Button variant="outline" className="w-full" onClick={() => setVotwDialog(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubAdminDashboard;

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import {
  Eye, Heart, Phone, ShoppingBag, Users, LogOut, Film,
  Loader2, Star, Calendar, Check, X, Activity, AlertTriangle,
  TrendingUp, ShieldCheck, ShieldOff, UserX, UserCheck,
  BarChart3, MessageCircle, Clock, Trophy, Search,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ManageVendorsSubAdmin from "@/pages/admin/ManageVendorsSubAdmin";
import ThemeToggle from "@/components/ThemeToggle";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const SubAdminDashboard = () => {
  const { user, userRole, signOut } = useAuth();
  const { toast } = useToast();

  const [school,  setSchool]  = useState<any>(null);
  const [stats,   setStats]   = useState({
    totalVendors: 0, pendingVendors: 0, totalViews: 0,
    totalLikes: 0, totalComments: 0, totalContacts: 0,
    totalMessages: 0, flaggedMessages: 0,
  });
  const [vendors,            setVendors]            = useState<any[]>([]);
  const [monthlyPerformance, setMonthlyPerformance] = useState<any[]>([]);
  const [weeklyActivity,     setWeeklyActivity]     = useState<any[]>([]);
  const [recentMessages,     setRecentMessages]     = useState<any[]>([]);
  const [isLoading,          setIsLoading]          = useState(true);
  const [actionLoading,      setActionLoading]      = useState<string | null>(null);

  // VOTW state
  const [votwDialog,     setVotwDialog]     = useState(false);
  const [votwSearch,     setVotwSearch]     = useState("");
  const [votwNote,       setVotwNote]       = useState("");
  const [nominations,    setNominations]    = useState<any[]>([]);
  const [submittingVotw, setSubmittingVotw] = useState(false);
  const [currentVotw,    setCurrentVotw]    = useState<any>(null);

  const getAssignedSchoolId = () =>
    (userRole as any)?.assigned_school_id || (userRole as any)?.school_id;

  const fetchData = async () => {
    if (!user || !userRole) return;
    const assignedSchoolId = getAssignedSchoolId();

    if (assignedSchoolId) {
      const { data: s } = await supabase.from("schools").select("*").eq("id", assignedSchoolId).single();
      setSchool(s);
    }

    const vendorQ = assignedSchoolId
      ? supabase.from("vendors").select("id, business_name, category, is_approved, is_active, is_suspended, is_verified, reels_enabled, contact_number, description, created_at").eq("school_id", assignedSchoolId)
      : supabase.from("vendors").select("id, business_name, category, is_approved, is_active, is_suspended, is_verified, reels_enabled, contact_number, description, created_at");

    const { data: vendorData } = await vendorQ;
    setVendors(vendorData || []);

    const vendorIds    = (vendorData || []).map((v: any) => v.id);
    const pendingCount = (vendorData || []).filter((v: any) => !v.is_approved && v.is_active !== false).length;

    if (vendorIds.length > 0) {
      const [views, likes, comments, contacts, conversations, flaggedMsgs] = await Promise.all([
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
        totalViews:      views.count    || 0,
        totalLikes:      likes.count    || 0,
        totalComments:   comments.count || 0,
        totalContacts:   contacts.count || 0,
        totalMessages:   conversations.count || 0,
        flaggedMessages: flaggedMsgs.count   || 0,
      });

      const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0,0,0,0);
      const [monthViews, monthContacts, monthRatings] = await Promise.all([
        supabase.from("vendor_views").select("vendor_id").in("vendor_id", vendorIds).gte("created_at", startOfMonth.toISOString()),
        supabase.from("vendor_contacts").select("vendor_id").in("vendor_id", vendorIds).gte("created_at", startOfMonth.toISOString()),
        supabase.from("vendor_ratings").select("vendor_id, rating").in("vendor_id", vendorIds),
      ]);

      const perfMap = new Map<string, { views: number; contacts: number; avgRating: number; ratingCount: number }>();
      vendorIds.forEach((vid: string) => perfMap.set(vid, { views: 0, contacts: 0, avgRating: 0, ratingCount: 0 }));
      (monthViews.data    || []).forEach((v: any) => { const p = perfMap.get(v.vendor_id); if (p) p.views++; });
      (monthContacts.data || []).forEach((c: any) => { const p = perfMap.get(c.vendor_id); if (p) p.contacts++; });
      (monthRatings.data  || []).forEach((r: any) => {
        const p = perfMap.get(r.vendor_id);
        if (p) { p.avgRating = ((p.avgRating * p.ratingCount) + r.rating) / (p.ratingCount + 1); p.ratingCount++; }
      });

      const perf = (vendorData || [])
        .filter((v: any) => v.is_approved)
        .map((v: any) => ({ ...v, ...(perfMap.get(v.id) || { views: 0, contacts: 0, avgRating: 0, ratingCount: 0 }) }))
        .sort((a: any, b: any) => b.views - a.views);
      setMonthlyPerformance(perf);

      // Weekly registrations
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0,0,0,0);
        const next = new Date(d); next.setDate(next.getDate() + 1);
        const label = d.toLocaleDateString("en", { weekday: "short" });
        const count = (vendorData || []).filter((v: any) => {
          const c = new Date(v.created_at); return c >= d && c < next;
        }).length;
        days.push({ day: label, vendors: count });
      }
      setWeeklyActivity(days);

      // Recent conversations
      const { data: convs } = await (supabase as any)
        .from("conversations")
        .select("id, last_message, last_message_at, is_flagged, vendor_unread, buyer_unread, vendors(business_name)")
        .in("vendor_id", vendorIds)
        .order("last_message_at", { ascending: false })
        .limit(5);
      setRecentMessages(convs || []);
    } else {
      setStats({ totalVendors: 0, pendingVendors: 0, totalViews: 0, totalLikes: 0, totalComments: 0, totalContacts: 0, totalMessages: 0, flaggedMessages: 0 });
    }

    // VOTW data
    await fetchNominations();
    await fetchCurrentVotw(assignedSchoolId);
    setIsLoading(false);
  };

  const fetchNominations = async () => {
    if (!user) return;
    const assignedSchoolId = getAssignedSchoolId();
    const q = assignedSchoolId
      ? (supabase as any).from("votw_nominations").select("*, vendors(business_name, category, id)").eq("school_id", assignedSchoolId).order("created_at", { ascending: false }).limit(10)
      : (supabase as any).from("votw_nominations").select("*, vendors(business_name, category, id)").eq("nominated_by", user.id).order("created_at", { ascending: false }).limit(10);
    const { data } = await q;
    setNominations(data || []);
  };

  const fetchCurrentVotw = async (schoolId?: string) => {
    const now = new Date().toISOString();
    let q = (supabase as any)
      .from("vendors")
      .select("id, business_name, category, vendor_of_week_expires_at")
      .eq("is_vendor_of_week", true)
      .gt("vendor_of_week_expires_at", now);
    if (schoolId) q = q.eq("school_id", schoolId);
    const { data } = await q.maybeSingle();
    setCurrentVotw(data || null);
  };

  const submitVotwNomination = async (vendorId: string) => {
    if (!user) return;
    setSubmittingVotw(true);
    const assignedSchoolId = getAssignedSchoolId();
    const { error } = await (supabase as any).from("votw_nominations").insert({
      vendor_id:    vendorId,
      nominated_by: user.id,
      school_id:    assignedSchoolId || null,
      note:         votwNote.trim() || null,
      status:       "pending",
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Nomination submitted! ✅", description: "The super admin will review your nomination shortly." });
      setVotwDialog(false);
      setVotwSearch("");
      setVotwNote("");
      await fetchNominations();
    }
    setSubmittingVotw(false);
  };

  useEffect(() => { fetchData(); }, [user, userRole]);

  // ── Vendor actions ────────────────────────────────────────────────────────
  const run = async (id: string, fn: () => Promise<void>) => {
    setActionLoading(id);
    try { await fn(); } finally { setActionLoading(null); }
  };

  const approveVendor = (vendorId: string) => run(vendorId, async () => {
    const { error } = await supabase.from("vendors").update({ is_approved: true } as any).eq("id", vendorId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    await supabase.from("admin_activity_log").insert({ admin_id: user!.id, action: "Approved vendor", target_type: "vendor", target_id: vendorId } as any);
    toast({ title: "Vendor approved ✅" });
    setVendors((prev) => prev.map((v) => v.id === vendorId ? { ...v, is_approved: true } : v));
    setStats((prev) => ({ ...prev, pendingVendors: prev.pendingVendors - 1 }));
  });

  const rejectVendor = (vendorId: string) => run(vendorId + "_r", async () => {
    await supabase.from("vendors").update({ is_active: false } as any).eq("id", vendorId);
    toast({ title: "Vendor rejected" });
    setVendors((prev) => prev.map((v) => v.id === vendorId ? { ...v, is_active: false } : v));
    setStats((prev) => ({ ...prev, pendingVendors: prev.pendingVendors - 1 }));
  });

  const toggleSuspend = (v: any) => run(v.id + "_s", async () => {
    await supabase.from("vendors").update({ is_suspended: !v.is_suspended } as any).eq("id", v.id);
    toast({ title: v.is_suspended ? "Vendor unsuspended" : "Vendor suspended" });
    setVendors((prev) => prev.map((vv) => vv.id === v.id ? { ...vv, is_suspended: !v.is_suspended } : vv));
  });

  const toggleVerify = (v: any) => run(v.id + "_v", async () => {
    await supabase.from("vendors").update({ is_verified: !v.is_verified } as any).eq("id", v.id);
    toast({ title: v.is_verified ? "Verification removed" : "Vendor verified ✅" });
    setVendors((prev) => prev.map((vv) => vv.id === v.id ? { ...vv, is_verified: !v.is_verified } : vv));
  });

  const toggleReels = (v: any) => run(v.id + "_rl", async () => {
    await supabase.from("vendors").update({ reels_enabled: !v.reels_enabled } as any).eq("id", v.id);
    setVendors((prev) => prev.map((vv) => vv.id === v.id ? { ...vv, reels_enabled: !v.reels_enabled } : vv));
    toast({ title: v.reels_enabled ? "Reels revoked" : "Reels granted" });
  });

  const deactivateVendor = (vendorId: string) => run(vendorId + "_d", async () => {
    await supabase.from("vendors").update({ is_active: false } as any).eq("id", vendorId);
    toast({ title: "Vendor removed" });
    setVendors((prev) => prev.map((v) => v.id === vendorId ? { ...v, is_active: false } : v));
  });

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const currentMonth    = new Date().toLocaleString("default", { month: "long", year: "numeric" });
  const pendingVendors  = vendors.filter((v) => !v.is_approved && v.is_active !== false);
  const approvedVendors = vendors.filter((v) => v.is_approved && v.is_active !== false);
  const maxViews        = Math.max(...monthlyPerformance.map((v: any) => v.views), 1);

  const statCards = [
    { title: "Total Businesses", value: stats.totalVendors,    icon: ShoppingBag,    color: "text-primary" },
    { title: "Pending Approval", value: stats.pendingVendors,  icon: Clock,          color: "text-orange-500" },
    { title: "Total Views",      value: stats.totalViews,      icon: Eye,            color: "text-accent" },
    { title: "Total Likes",      value: stats.totalLikes,      icon: Heart,          color: "text-destructive" },
    { title: "Total Contacts",   value: stats.totalContacts,   icon: Phone,          color: "text-success" },
    { title: "Conversations",    value: stats.totalMessages,   icon: MessageCircle,  color: "text-blue-500" },
    { title: "Flagged Messages", value: stats.flaggedMessages, icon: AlertTriangle,  color: "text-destructive" },
    { title: "Approved",         value: approvedVendors.length, icon: ShieldCheck,   color: "text-success" },
  ];

  const filteredVotwVendors = approvedVendors.filter((v) =>
    v.business_name.toLowerCase().includes(votwSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <ShoppingBag className="h-4 w-4 text-accent-foreground" />
            </div>
            <span className="font-bold text-foreground">Campus Market</span>
          </Link>
          <Badge variant="secondary" className="text-xs">Sub-Admin</Badge>
          {school && <Badge variant="outline" className="text-xs hidden sm:flex">{school.name}</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={signOut}><LogOut className="h-4 w-4" /></Button>
        </div>
      </header>

      <main className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{school ? school.name : "Campus"} Dashboard</h1>
          <p className="text-sm text-muted-foreground">Monitor and manage all businesses on your campus</p>
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="overview"><BarChart3 className="h-4 w-4 mr-1" />Overview</TabsTrigger>
            <TabsTrigger value="pending" className="relative">
              <Clock className="h-4 w-4 mr-1" />Pending
              {pendingVendors.length > 0 && (
                <span className="ml-1.5 w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {pendingVendors.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved"><ShieldCheck className="h-4 w-4 mr-1" />Approved ({approvedVendors.length})</TabsTrigger>
            <TabsTrigger value="performance"><TrendingUp className="h-4 w-4 mr-1" />Performance</TabsTrigger>
            <TabsTrigger value="messages">
              <MessageCircle className="h-4 w-4 mr-1" />Messages
              {stats.flaggedMessages > 0 && (
                <span className="ml-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                  {stats.flaggedMessages}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="votw">
              <Trophy className="h-4 w-4 mr-1 text-yellow-500" />VOTW
            </TabsTrigger>
            <TabsTrigger value="vendors"><Users className="h-4 w-4 mr-1" />Full Management</TabsTrigger>
          </TabsList>

          {/* ── OVERVIEW ── */}
          <TabsContent value="overview" className="mt-4 space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {statCards.map((s) => (
                <Card key={s.title} className="border-border/50">
                  <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
                    <CardTitle className="text-xs font-medium text-muted-foreground leading-tight">{s.title}</CardTitle>
                    <s.icon className={`h-4 w-4 shrink-0 ${s.color}`} />
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="text-2xl font-bold">{s.value.toLocaleString()}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="border-border/50">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4" />New Registrations This Week</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={weeklyActivity}>
                    <defs>
                      <linearGradient id="colorV" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                    <Area type="monotone" dataKey="vendors" name="New Vendors" stroke="hsl(var(--accent))" fillOpacity={1} fill="url(#colorV)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {pendingVendors.length > 0 && (
              <Card className="border-orange-400/30 bg-orange-500/5">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 text-orange-600">
                    <Clock className="h-4 w-4" /> Needs Your Approval ({pendingVendors.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {pendingVendors.slice(0, 4).map((v) => (
                    <div key={v.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-background/60 border border-border/40">
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-medium truncate block">{v.business_name}</span>
                        <span className="text-xs text-muted-foreground">{v.category}</span>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button size="sm" className="bg-success text-success-foreground hover:bg-success/90 h-7 text-xs"
                          onClick={() => approveVendor(v.id)} disabled={actionLoading === v.id}>
                          <Check className="h-3 w-3 mr-1" />Approve
                        </Button>
                        <Button size="sm" variant="destructive" className="h-7 text-xs"
                          onClick={() => rejectVendor(v.id)} disabled={actionLoading === v.id + "_r"}>
                          <X className="h-3 w-3 mr-1" />Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                  {pendingVendors.length > 4 && <p className="text-xs text-muted-foreground text-center">+{pendingVendors.length - 4} more in Pending tab</p>}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── PENDING ── */}
          <TabsContent value="pending" className="mt-4">
            <Card className="border-border/50">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4 text-orange-500" />Pending Approvals ({pendingVendors.length})</CardTitle></CardHeader>
              <CardContent>
                {pendingVendors.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">All caught up! No pending vendors.</p>
                ) : (
                  <div className="space-y-3">
                    {pendingVendors.map((v) => (
                      <div key={v.id} className="border border-border/50 rounded-xl p-4 space-y-2">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{v.business_name}</span>
                              <Badge variant="outline" className="text-xs">{v.category}</Badge>
                            </div>
                            {v.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{v.description}</p>}
                            <p className="text-xs text-muted-foreground mt-1">Applied: {new Date(v.created_at).toLocaleDateString()}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" className="bg-success text-success-foreground hover:bg-success/90"
                              onClick={() => approveVendor(v.id)} disabled={actionLoading === v.id}>
                              <Check className="h-3 w-3 mr-1" />Approve
                            </Button>
                            <Button size="sm" variant="destructive"
                              onClick={() => rejectVendor(v.id)} disabled={actionLoading === v.id + "_r"}>
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
          </TabsContent>

          {/* ── APPROVED ── */}
          <TabsContent value="approved" className="mt-4">
            <Card className="border-border/50">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-success" />Approved Businesses ({approvedVendors.length})</CardTitle></CardHeader>
              <CardContent>
                {approvedVendors.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No approved businesses yet.</p>
                ) : (
                  <div className="space-y-2">
                    {approvedVendors.map((v) => (
                      <div key={v.id} className="flex items-center justify-between gap-3 border border-border/40 rounded-xl p-3 flex-wrap">
                        <div className="flex items-center gap-2 min-w-0">
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
                          <Button size="sm" variant="outline"
                            className={v.is_verified ? "text-muted-foreground text-xs h-7" : "text-primary border-primary/40 text-xs h-7"}
                            onClick={() => toggleVerify(v)} disabled={!!actionLoading}>
                            {v.is_verified ? <><ShieldOff className="h-3 w-3 mr-1" />Unverify</> : <><ShieldCheck className="h-3 w-3 mr-1" />Verify</>}
                          </Button>
                          <Button size="sm" variant="outline"
                            className={v.is_suspended ? "text-success border-success/50 text-xs h-7" : "text-orange-600 border-orange-300 text-xs h-7"}
                            onClick={() => toggleSuspend(v)} disabled={!!actionLoading}>
                            {v.is_suspended ? <><UserCheck className="h-3 w-3 mr-1" />Unsuspend</> : <><UserX className="h-3 w-3 mr-1" />Suspend</>}
                          </Button>
                          <Button size="sm" variant={v.reels_enabled ? "destructive" : "outline"}
                            className="text-xs h-7" onClick={() => toggleReels(v)} disabled={!!actionLoading}>
                            <Film className="h-3 w-3 mr-1" />{v.reels_enabled ? "Revoke Reels" : "Grant Reels"}
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive text-xs h-7"
                            onClick={() => deactivateVendor(v.id)} disabled={!!actionLoading}>
                            <X className="h-3 w-3 mr-1" />Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── PERFORMANCE ── */}
          <TabsContent value="performance" className="mt-4">
            <Card className="border-border/50">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Calendar className="h-4 w-4" />Monthly Performance — {currentMonth}</CardTitle></CardHeader>
              <CardContent>
                {monthlyPerformance.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No performance data yet</p>
                ) : (
                  <div className="space-y-4">
                    {monthlyPerformance.map((v: any, i: number) => (
                      <div key={v.id} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground font-mono w-5">{i + 1}.</span>
                            <span className="text-sm font-medium">{v.business_name}</span>
                            <Badge variant="outline" className="text-xs">{v.category}</Badge>
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
          </TabsContent>

          {/* ── MESSAGES ── */}
          <TabsContent value="messages" className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card className="border-border/50">
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-muted-foreground"><MessageCircle className="h-4 w-4" />Conversations</CardTitle></CardHeader>
                <CardContent><div className="text-3xl font-bold">{stats.totalMessages}</div></CardContent>
              </Card>
              <Card className="border-destructive/30 bg-destructive/5">
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-destructive"><AlertTriangle className="h-4 w-4" />Flagged</CardTitle></CardHeader>
                <CardContent><div className="text-3xl font-bold text-destructive">{stats.flaggedMessages}</div></CardContent>
              </Card>
            </div>
            <Card className="border-border/50">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><MessageCircle className="h-4 w-4" />Recent Conversations</CardTitle></CardHeader>
              <CardContent>
                {recentMessages.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No conversations yet</p>
                ) : (
                  <div className="space-y-2">
                    {recentMessages.map((c: any) => (
                      <div key={c.id} className={`flex items-center justify-between gap-3 p-3 rounded-lg border ${c.is_flagged ? "border-destructive/40 bg-destructive/5" : "border-border/40"}`}>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">{c.vendors?.business_name || "Unknown"}</span>
                            {c.is_flagged && <Badge variant="destructive" className="text-[10px]"><AlertTriangle className="h-2.5 w-2.5 mr-0.5" />Flagged</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{c.last_message || "No messages yet"}</p>
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {c.last_message_at ? new Date(c.last_message_at).toLocaleDateString() : "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── VENDOR OF THE WEEK ── */}
          <TabsContent value="votw" className="mt-4 space-y-4">

            {/* Current VOTW */}
            <Card className="border-yellow-400/40 bg-yellow-500/5">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2 text-yellow-700">
                    <Trophy className="h-5 w-5" /> Vendor of the Week
                  </CardTitle>
                  <Button size="sm" onClick={() => setVotwDialog(true)}
                    className="bg-gradient-to-r from-yellow-400 to-amber-400 text-yellow-900 hover:from-yellow-300 hover:to-amber-300 border-0 text-xs">
                    <Trophy className="h-3 w-3 mr-1" /> Nominate Vendor
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {currentVotw ? (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-yellow-400/10 border border-yellow-400/30">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow">
                      <Trophy className="h-5 w-5 text-yellow-900" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{currentVotw.business_name}</p>
                      <p className="text-xs text-muted-foreground">{currentVotw.category}</p>
                      <p className="text-xs text-yellow-700 mt-0.5">
                        Until {new Date(currentVotw.vendor_of_week_expires_at).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}
                      </p>
                    </div>
                    <Badge className="ml-auto bg-yellow-400 text-yellow-900 border-0">🏆 Active</Badge>
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <Trophy className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No vendor of the week on your campus right now.</p>
                    <p className="text-xs mt-1">Nominate a vendor — admin will review and approve.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Nomination history */}
            <Card className="border-border/50">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" />Your Nominations</CardTitle></CardHeader>
              <CardContent>
                {nominations.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No nominations submitted yet.</p>
                ) : (
                  <div className="space-y-2">
                    {nominations.map((n: any) => (
                      <div key={n.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border/40">
                        <div className="min-w-0 flex-1">
                          <span className="text-sm font-medium">{n.vendors?.business_name}</span>
                          <span className="text-xs text-muted-foreground ml-2">{n.vendors?.category}</span>
                          {n.note && <p className="text-xs text-muted-foreground mt-0.5 italic">"{n.note}"</p>}
                          <p className="text-xs text-muted-foreground mt-0.5">{new Date(n.created_at).toLocaleDateString()}</p>
                        </div>
                        <Badge className={
                          n.status === "approved" ? "bg-success/20 text-success text-xs" :
                          n.status === "rejected" ? "bg-destructive/20 text-destructive text-xs" :
                          "bg-orange-500/20 text-orange-600 text-xs"
                        }>
                          {n.status === "approved" ? "✅ Approved" : n.status === "rejected" ? "❌ Rejected" : "⏳ Pending"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── FULL MANAGEMENT ── */}
          <TabsContent value="vendors" className="mt-4">
            <ManageVendorsSubAdmin />
          </TabsContent>
        </Tabs>
      </main>

      {/* ── VOTW Nomination Dialog ── */}
      {votwDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" /> Nominate Vendor of the Week
              </h3>
              <button onClick={() => setVotwDialog(false)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground">
              Select a vendor from your campus. The super admin must approve your nomination before it goes live.
            </p>

            {currentVotw && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-yellow-500/10 border border-yellow-400/30 text-xs text-yellow-700">
                <Trophy className="h-3.5 w-3.5 shrink-0" />
                Current VOTW: <strong>{currentVotw.business_name}</strong> — nominating a new one will replace them if approved.
              </div>
            )}

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search vendors..."
                value={votwSearch}
                onChange={(e) => setVotwSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="max-h-52 overflow-y-auto space-y-1.5 -mx-1 px-1">
              {filteredVotwVendors.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No approved vendors found</p>
              ) : filteredVotwVendors.map((v) => (
                <div key={v.id} className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-border/50 hover:bg-muted/50 transition-colors">
                  <div className="min-w-0">
                    <span className="text-sm font-medium block truncate">{v.business_name}</span>
                    <span className="text-xs text-muted-foreground">{v.category}</span>
                  </div>
                  <Button size="sm"
                    className="h-7 text-xs bg-gradient-to-r from-yellow-400 to-amber-400 text-yellow-900 hover:from-yellow-300 hover:to-amber-300 border-0 shrink-0"
                    onClick={() => submitVotwNomination(v.id)}
                    disabled={submittingVotw}>
                    {submittingVotw ? <Loader2 className="h-3 w-3 animate-spin" /> : "Nominate"}
                  </Button>
                </div>
              ))}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Why should this vendor win? (optional)</Label>
              <Textarea
                placeholder="e.g. Best customer service, most popular vendor this month..."
                value={votwNote}
                onChange={(e) => setVotwNote(e.target.value)}
                rows={2}
                className="resize-none text-sm"
              />
            </div>

            <Button variant="outline" className="w-full" onClick={() => setVotwDialog(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubAdminDashboard;

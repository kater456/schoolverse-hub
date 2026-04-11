import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Zap, Bot, Clock, ShieldCheck, AlertTriangle, CheckCircle, Play,
  Settings, RefreshCw, Activity, Users, Ban, MessageSquare, Loader2,
  TrendingDown, Eye, Star, Crown, CircleCheck, CircleX, ChevronRight,
} from "lucide-react";

interface AutoRule {
  key: string;
  label: string;
  desc: string;
  icon: any;
  color: string;
  enabled: boolean;
  lastRun?: string;
  affectedCount?: number;
}

interface AiSuggestion {
  id: string;
  type: "warning" | "action" | "info";
  title: string;
  body: string;
  action?: string;
  actionFn?: () => void;
}

const AdminAutomation = () => {
  const { toast } = useToast();
  const [loading,      setLoading]      = useState(true);
  const [running,      setRunning]      = useState<string | null>(null);
  const [aiLoading,    setAiLoading]    = useState(false);
  const [aiSuggestions,setAiSuggestions]= useState<AiSuggestion[]>([]);
  const [scanResults,  setScanResults]  = useState<any>(null);

  // Automation rule toggles (stored in platform_settings)
  const [rules, setRules] = useState({
    auto_approve_ghana:        true,   // Auto-approve Ghana vendors (no payment required)
    auto_flag_keywords:        true,   // Flag messages with suspicious keywords
    auto_disable_inactive:     false,  // Auto-disable vendors with 0 activity in 60 days
    auto_notify_pending:       true,   // Notify sub-admins of pending vendors daily
    auto_revoke_expired_promo: true,   // Auto-revoke expired promotions
    auto_votw_reminder:        true,   // Remind admin when VOTW is expiring
  });
  const [inactivityDays, setInactivityDays] = useState("60");
  const [settingsId,     setSettingsId]     = useState<string | null>(null);
  const [saving,         setSaving]         = useState(false);

  // Stats for automation context
  const [platformStats, setPlatformStats] = useState({
    pendingVendors: 0, inactiveVendors: 0, expiredPromos: 0,
    flaggedMessages: 0, suspiciousVendors: 0, totalVendors: 0,
  });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const now = new Date();
    const cutoff = new Date(now.getTime() - Number(inactivityDays) * 86400000).toISOString();

    const [pending, vendors, flagged, promos, settings] = await Promise.all([
      supabase.from("vendors").select("id", { count: "exact", head: true }).eq("is_approved", false).eq("is_active", true),
      supabase.from("vendors").select("id, created_at, business_name, category, country, is_approved, is_active"),
      supabase.from("messages").select("id", { count: "exact", head: true }).eq("ai_flagged", true),
      supabase.from("vendors").select("id", { count: "exact", head: true }).lt("promoted_until", now.toISOString()).not("promoted_until", "is", null),
      supabase.from("platform_settings").select("*").single(),
    ]);

    if (settings.data) {
      const d = settings.data as any;
      setSettingsId(d.id);
      setRules({
        auto_approve_ghana:        d.auto_approve_ghana        ?? true,
        auto_flag_keywords:        d.auto_flag_keywords        ?? true,
        auto_disable_inactive:     d.auto_disable_inactive     ?? false,
        auto_notify_pending:       d.auto_notify_pending       ?? true,
        auto_revoke_expired_promo: d.auto_revoke_expired_promo ?? true,
        auto_votw_reminder:        d.auto_votw_reminder        ?? true,
      });
      if (d.inactivity_days) setInactivityDays(String(d.inactivity_days));
    }

    // Estimate inactive vendors (no views in X days) — approximate from created_at
    const inactiveEst = (vendors.data || []).filter((v: any) =>
      v.is_approved && v.is_active && new Date(v.created_at) < new Date(cutoff)
    ).length;

    setPlatformStats({
      pendingVendors:    pending.count || 0,
      inactiveVendors:   inactiveEst,
      expiredPromos:     promos.count  || 0,
      flaggedMessages:   flagged.count || 0,
      suspiciousVendors: 0,
      totalVendors:      vendors.data?.length || 0,
    });

    // Generate AI suggestions based on data
    buildAiSuggestions({
      pending:  pending.count || 0,
      inactive: inactiveEst,
      flagged:  flagged.count || 0,
      promos:   promos.count  || 0,
      vendors:  vendors.data || [],
    });

    setLoading(false);
  };

  const buildAiSuggestions = ({ pending, inactive, flagged, promos, vendors }: any) => {
    const suggestions: AiSuggestion[] = [];

    if (pending > 5) {
      suggestions.push({
        id: "pending-high",
        type: "warning",
        title: `${pending} vendors waiting for approval`,
        body: "High pending queue detected. Consider enabling auto-approval for Ghana vendors or reviewing in bulk.",
        action: "Go to Vendors",
      });
    }

    if (flagged > 0) {
      suggestions.push({
        id: "flagged-msgs",
        type: "warning",
        title: `${flagged} AI-flagged messages need review`,
        body: "Our AI has detected potentially suspicious content in conversations. Review and resolve or dismiss.",
        action: "Review Chats",
      });
    }

    if (inactive > 10) {
      suggestions.push({
        id: "inactive-vendors",
        type: "action",
        title: `${inactive} vendors appear inactive`,
        body: `${inactive} approved vendors haven't shown recent activity. Consider sending a re-engagement notification or enabling auto-disable after ${inactivityDays} days.`,
        action: "Run Cleanup",
      });
    }

    if (promos > 0) {
      suggestions.push({
        id: "expired-promos",
        type: "action",
        title: `${promos} expired promotions detected`,
        body: "Some vendors have expired promotion periods still set. Run auto-cleanup to clear them.",
        action: "Clear Expired",
      });
    }

    // Ghana vendor bulk approve suggestion
    const ghanaVendors = vendors.filter((v: any) => v.country === "Ghana" && !v.is_approved && v.is_active);
    if (ghanaVendors.length > 0) {
      suggestions.push({
        id: "ghana-approve",
        type: "action",
        title: `${ghanaVendors.length} Ghana vendors can be auto-approved`,
        body: "Ghana vendors don't require payment verification. They can be approved automatically.",
        action: "Auto-Approve Ghana",
      });
    }

    if (suggestions.length === 0) {
      suggestions.push({
        id: "all-good",
        type: "info",
        title: "Platform is running smoothly ✅",
        body: "No urgent actions detected. All automation rules are active and the platform looks healthy.",
      });
    }

    setAiSuggestions(suggestions);
  };

  // Save automation settings
  const saveSettings = async () => {
    if (!settingsId) return;
    setSaving(true);
    const { error } = await supabase.from("platform_settings").update({
      ...rules,
      inactivity_days: Number(inactivityDays),
      updated_at: new Date().toISOString(),
    } as any).eq("id", settingsId);

    if (error) { toast({ title: "Error saving", description: error.message, variant: "destructive" }); }
    else { toast({ title: "Automation settings saved ✅" }); }
    setSaving(false);
  };

  // Run automation tasks manually
  const runTask = async (taskKey: string) => {
    setRunning(taskKey);
    try {
      if (taskKey === "auto_approve_ghana") {
        // Auto-approve all Ghana vendors
        const { data: ghanaVendors } = await supabase.from("vendors")
          .select("id").eq("country", "Ghana").eq("is_approved", false).eq("is_active", true);
        if (ghanaVendors && ghanaVendors.length > 0) {
          const ids = ghanaVendors.map((v: any) => v.id);
          await supabase.from("vendors").update({ is_approved: true } as any).in("id", ids);
          toast({ title: `✅ Auto-approved ${ids.length} Ghana vendor${ids.length !== 1 ? "s" : ""}` });
          await supabase.from("admin_activity_log").insert({ action: `Auto-approved ${ids.length} Ghana vendors`, target_type: "vendor" } as any);
        } else {
          toast({ title: "No Ghana vendors pending approval" });
        }
      }

      if (taskKey === "clear_expired_promos") {
        const now = new Date().toISOString();
        const { data: expired } = await supabase.from("vendors").select("id").lt("promoted_until", now).not("promoted_until", "is", null);
        if (expired && expired.length > 0) {
          await supabase.from("vendors").update({ promoted_until: null } as any).in("id", expired.map((v: any) => v.id));
          toast({ title: `✅ Cleared ${expired.length} expired promotion${expired.length !== 1 ? "s" : ""}` });
        } else {
          toast({ title: "No expired promotions to clear" });
        }
      }

      if (taskKey === "flag_inactive") {
        const cutoff = new Date(Date.now() - Number(inactivityDays) * 86400000).toISOString();
        // Get vendors created before cutoff with no views (simple heuristic)
        const { data: old } = await supabase.from("vendors").select("id, business_name").eq("is_approved", true).eq("is_active", true).lt("created_at", cutoff);
        if (old && old.length > 0) {
          const { data: activeIds } = await supabase.from("vendor_views").select("vendor_id").in("vendor_id", old.map((v: any) => v.id)).gte("created_at", cutoff);
          const activeSet = new Set((activeIds || []).map((v: any) => v.vendor_id));
          const inactive = old.filter((v: any) => !activeSet.has(v.id));
          setScanResults({ type: "inactive", vendors: inactive, count: inactive.length });
          toast({ title: `Found ${inactive.length} inactive vendor${inactive.length !== 1 ? "s" : ""}`, description: "Review below before taking action." });
        } else {
          toast({ title: "No vendors match inactive criteria" });
        }
      }

      if (taskKey === "disable_inactive" && scanResults?.type === "inactive") {
        const ids = scanResults.vendors.map((v: any) => v.id);
        await supabase.from("vendors").update({ is_active: false } as any).in("id", ids);
        toast({ title: `⚠️ Disabled ${ids.length} inactive vendors` });
        setScanResults(null);
      }

      await fetchAll();
    } catch (err: any) {
      toast({ title: "Error running task", description: err.message, variant: "destructive" });
    }
    setRunning(null);
  };

  const RULE_CONFIG = [
    { key: "auto_approve_ghana",        icon: CheckCircle,  color: "text-green-500",  label: "Auto-Approve Ghana Vendors",    desc: "Automatically approve vendors from Ghana since no payment is required there." },
    { key: "auto_flag_keywords",        icon: AlertTriangle,color: "text-red-500",    label: "AI Message Monitoring",         desc: "Automatically flag messages containing suspicious keywords for admin review." },
    { key: "auto_disable_inactive",     icon: TrendingDown, color: "text-orange-500", label: "Auto-Disable Inactive Vendors", desc: `Disable vendors with no activity for more than ${inactivityDays} days.` },
    { key: "auto_notify_pending",       icon: MessageSquare,color: "text-blue-500",   label: "Daily Pending Notifications",   desc: "Send sub-admins a daily digest of pending vendor applications." },
    { key: "auto_revoke_expired_promo", icon: Star,         color: "text-yellow-500", label: "Auto-Revoke Expired Promos",   desc: "Automatically remove expired featured promotion status from vendors." },
    { key: "auto_votw_reminder",        icon: Crown,        color: "text-accent",     label: "VOTW Expiry Reminders",         desc: "Send admin a reminder 24h before the current Vendor of the Week expires." },
  ];

  const QUICK_TASKS = [
    { key: "auto_approve_ghana",    label: "Auto-Approve Ghana Vendors",  icon: CheckCircle,  color: "bg-green-500/10 text-green-600 border-green-400/30",  desc: "Approve all pending Ghana vendors instantly" },
    { key: "clear_expired_promos",  label: "Clear Expired Promotions",    icon: Star,         color: "bg-yellow-500/10 text-yellow-600 border-yellow-400/30", desc: "Remove expired featured status from vendors" },
    { key: "flag_inactive",         label: "Scan for Inactive Vendors",   icon: TrendingDown, color: "bg-orange-500/10 text-orange-600 border-orange-400/30",desc: `Find vendors with no activity in ${inactivityDays}+ days` },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Zap className="h-6 w-6 text-accent" /> Automation Engine
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Automated rules, AI-powered insights and one-click platform maintenance
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1.5 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
              Automation Active
            </Badge>
            <Button variant="outline" size="sm" onClick={fetchAll} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
          </div>
        </div>

        {/* Platform status strip */}
        {!loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "Pending Vendors",  value: platformStats.pendingVendors,  color: platformStats.pendingVendors > 0  ? "text-orange-500" : "text-green-500" },
              { label: "Inactive Vendors", value: platformStats.inactiveVendors, color: platformStats.inactiveVendors > 5 ? "text-orange-500" : "text-green-500" },
              { label: "Expired Promos",   value: platformStats.expiredPromos,   color: platformStats.expiredPromos > 0   ? "text-yellow-500" : "text-green-500" },
              { label: "Flagged Messages", value: platformStats.flaggedMessages,  color: platformStats.flaggedMessages > 0 ? "text-red-500"    : "text-green-500" },
              { label: "Total Vendors",    value: platformStats.totalVendors,     color: "text-foreground" },
              { label: "Automation Rules", value: Object.values(rules).filter(Boolean).length + "/6", color: "text-accent" },
            ].map((s) => (
              <Card key={s.label} className="border-border/50">
                <CardContent className="p-3 text-center">
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Tabs defaultValue="ai" className="space-y-4">
          <TabsList>
            <TabsTrigger value="ai"><Bot className="h-4 w-4 mr-1" />AI Insights</TabsTrigger>
            <TabsTrigger value="rules"><Settings className="h-4 w-4 mr-1" />Automation Rules</TabsTrigger>
            <TabsTrigger value="tasks"><Play className="h-4 w-4 mr-1" />Run Tasks</TabsTrigger>
          </TabsList>

          {/* ── AI INSIGHTS TAB ── */}
          <TabsContent value="ai" className="space-y-4">
            <Card className="border-accent/30 bg-accent/3">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Bot className="h-5 w-5 text-accent" /> AI Assistant — Platform Analysis
                  </CardTitle>
                  <Button size="sm" variant="outline" onClick={fetchAll} disabled={loading} className="gap-1.5 h-8">
                    <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Rescan
                  </Button>
                </div>
                <CardDescription>Automated analysis of platform data — updated every time you refresh</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  <div className="flex items-center gap-3 p-4">
                    <Loader2 className="h-5 w-5 animate-spin text-accent" />
                    <p className="text-sm text-muted-foreground">Analyzing platform data…</p>
                  </div>
                ) : aiSuggestions.map((s) => (
                  <div key={s.id} className={`flex gap-3 p-4 rounded-xl border ${
                    s.type === "warning" ? "bg-red-500/5 border-red-400/25" :
                    s.type === "action"  ? "bg-orange-500/5 border-orange-400/25" :
                    "bg-green-500/5 border-green-400/25"
                  }`}>
                    <div className={`shrink-0 mt-0.5 ${s.type === "warning" ? "text-red-500" : s.type === "action" ? "text-orange-500" : "text-green-500"}`}>
                      {s.type === "warning" ? <AlertTriangle className="h-5 w-5" /> : s.type === "action" ? <Zap className="h-5 w-5" /> : <CircleCheck className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground">{s.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{s.body}</p>
                    </div>
                    {s.action && (
                      <Button size="sm" variant="outline" className="shrink-0 h-8 text-xs self-start"
                        onClick={() => {
                          if (s.action === "Auto-Approve Ghana") runTask("auto_approve_ghana");
                          else if (s.action === "Clear Expired") runTask("clear_expired_promos");
                          else if (s.action === "Run Cleanup") runTask("flag_inactive");
                        }}>
                        {s.action} <ChevronRight className="ml-1 h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Scan results */}
            {scanResults && (
              <Card className="border-orange-400/30 bg-orange-500/5">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2 text-orange-600">
                      <TrendingDown className="h-4 w-4" /> Inactive Vendor Scan Results ({scanResults.count})
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setScanResults(null)}>Dismiss</Button>
                      <Button size="sm" className="h-7 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => runTask("disable_inactive")} disabled={running === "disable_inactive"}>
                        {running === "disable_inactive" ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                        Disable All
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {scanResults.vendors.slice(0, 20).map((v: any) => (
                      <div key={v.id} className="flex items-center gap-2 p-2 rounded-lg bg-background/60 border border-border/30">
                        <CircleX className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                        <span className="text-sm">{v.business_name}</span>
                      </div>
                    ))}
                    {scanResults.vendors.length > 20 && <p className="text-xs text-muted-foreground text-center py-1">+{scanResults.vendors.length - 20} more</p>}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── AUTOMATION RULES TAB ── */}
          <TabsContent value="rules" className="space-y-4">
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings className="h-4 w-4" /> Automation Rules
                </CardTitle>
                <CardDescription>Configure which actions the platform takes automatically</CardDescription>
              </CardHeader>
              <CardContent className="divide-y divide-border/50">
                {RULE_CONFIG.map(({ key, icon: Icon, color, label, desc }) => (
                  <div key={key} className="flex items-center justify-between py-4 first:pt-0 last:pb-0 gap-4">
                    <div className="flex items-start gap-3">
                      <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${rules[key as keyof typeof rules] ? color : "text-muted-foreground/30"}`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <Label className="text-sm font-medium">{label}</Label>
                          <Badge className={`text-[9px] px-1 py-0 ${rules[key as keyof typeof rules] ? "bg-green-500/15 text-green-600" : "bg-muted text-muted-foreground"}`}>
                            {rules[key as keyof typeof rules] ? "ON" : "OFF"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 max-w-md">{desc}</p>
                      </div>
                    </div>
                    <Switch
                      checked={rules[key as keyof typeof rules]}
                      onCheckedChange={(v) => setRules((prev) => ({ ...prev, [key]: v }))}
                      className="shrink-0"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Inactivity threshold */}
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4" />Inactivity Threshold</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <Input
                    type="number" min="7" max="365" value={inactivityDays}
                    onChange={(e) => setInactivityDays(e.target.value)}
                    className="w-28"
                  />
                  <span className="text-sm text-muted-foreground">days of inactivity before auto-disable</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Currently: {platformStats.inactiveVendors} vendors match this threshold.
                </p>
              </CardContent>
            </Card>

            <Button onClick={saveSettings} disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              Save Automation Settings
            </Button>
          </TabsContent>

          {/* ── RUN TASKS TAB ── */}
          <TabsContent value="tasks" className="space-y-4">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Play className="h-4 w-4" />Manual Task Runner</CardTitle>
                <CardDescription>Run automation tasks on demand. All actions are logged in the activity feed.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {QUICK_TASKS.map((task) => (
                  <div key={task.key} className={`flex items-center justify-between gap-4 p-4 rounded-xl border ${task.color}`}>
                    <div className="flex items-start gap-3">
                      <task.icon className="h-5 w-5 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">{task.label}</p>
                        <p className="text-xs opacity-70 mt-0.5">{task.desc}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="shrink-0 h-8 text-xs"
                      onClick={() => runTask(task.key)} disabled={running === task.key}>
                      {running === task.key ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Play className="h-3.5 w-3.5 mr-1" />}
                      Run Now
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Task log note */}
            <Card className="border-border/50 bg-muted/30">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Activity className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">All tasks are logged</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Every automation action is recorded in the Admin Activity Log on the main Dashboard. You can review what was done and when at any time.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminAutomation;

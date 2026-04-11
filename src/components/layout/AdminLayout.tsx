import { ReactNode, useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import ThemeToggle from "@/components/ThemeToggle";
import {
  LayoutDashboard, Users, GraduationCap, MapPin, Star, LogOut,
  ShoppingBag, BarChart3, UserCog, Megaphone, MessageCircle,
  ExternalLink, Clock, ShieldCheck, Menu, X, Bell, ChevronRight,
  Search, Command, Zap, Globe, TrendingUp, CreditCard, Settings,
  ChevronDown, ChevronUp, Eye,
} from "lucide-react";

// ── Nav structure with sections ───────────────────────────────────────────────
const NAV_SECTIONS = [
  {
    label: "Overview",
    items: [
      { href: "/admin",           label: "Dashboard",       icon: LayoutDashboard, badge: null,       shortcut: "G D" },
      { href: "/admin/analytics", label: "Analytics",       icon: BarChart3,       badge: null,       shortcut: "G A" },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/admin/vendors",   label: "Vendors",         icon: Users,           badge: "vendors",  shortcut: "G V" },
      { href: "/admin/chats",     label: "Chat Oversight",  icon: MessageCircle,   badge: "chats",    shortcut: "G C" },
      { href: "/admin/featured",  label: "Featured",        icon: Star,            badge: null,       shortcut: null  },
      { href: "/admin/ads",       label: "Ads",             icon: Megaphone,       badge: null,       shortcut: null  },
    ],
  },
  {
    label: "Platform",
    items: [
      { href: "/admin/schools",    label: "Schools",         icon: GraduationCap,  badge: null,       shortcut: null  },
      { href: "/admin/locations",  label: "Campus Locations",icon: MapPin,         badge: null,       shortcut: null  },
      { href: "/admin/sub-admins", label: "Sub-Admins",      icon: UserCog,        badge: null,       shortcut: null  },
    ],
  },
];

// Flat list for command palette
const ALL_NAV = NAV_SECTIONS.flatMap((s) => s.items);

// ── Command Palette ───────────────────────────────────────────────────────────
const CommandPalette = ({
  open, onClose, pendingCount, flaggedCount,
}: { open: boolean; onClose: () => void; pendingCount: number; flaggedCount: number }) => {
  const navigate  = useNavigate();
  const [query,   setQuery]   = useState("");
  const inputRef  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) { setTimeout(() => inputRef.current?.focus(), 50); setQuery(""); }
  }, [open]);

  const quickActions = [
    { label: "View site as user",    icon: Globe,      action: () => window.open("/", "_blank") },
    { label: "Approve pending vendors", icon: ShieldCheck, action: () => { navigate("/admin/vendors"); onClose(); } },
    { label: "Check flagged chats",  icon: Bell,       action: () => { navigate("/admin/chats"); onClose(); } },
    { label: "View analytics",       icon: TrendingUp, action: () => { navigate("/admin/analytics"); onClose(); } },
    { label: "Manage featured ads",  icon: Star,       action: () => { navigate("/admin/featured"); onClose(); } },
    { label: "Manage ad campaigns",  icon: Megaphone,  action: () => { navigate("/admin/ads"); onClose(); } },
  ];

  const filtered = query
    ? [
        ...ALL_NAV.filter((n) => n.label.toLowerCase().includes(query.toLowerCase())),
        ...quickActions.filter((a) => a.label.toLowerCase().includes(query.toLowerCase()))
          .map((a) => ({ href: null, label: a.label, icon: a.icon, action: a.action })),
      ]
    : [];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] px-4" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages, actions…"
            className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "Enter" && filtered.length > 0) {
                const first = filtered[0] as any;
                if (first.action) first.action();
                else if (first.href) { navigate(first.href); onClose(); }
              }
            }}
          />
          <kbd className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">ESC</kbd>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {query === "" ? (
            <div className="p-3 space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider px-2 pb-1 font-semibold">Quick Actions</p>
              {quickActions.map((a) => (
                <button key={a.label} onClick={a.action}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/60 transition-colors text-left">
                  <a.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">{a.label}</span>
                  {a.label.includes("pending") && pendingCount > 0 && (
                    <Badge className="ml-auto bg-orange-500 text-white text-[10px]">{pendingCount}</Badge>
                  )}
                  {a.label.includes("flagged") && flaggedCount > 0 && (
                    <Badge className="ml-auto bg-destructive text-destructive-foreground text-[10px]">{flaggedCount}</Badge>
                  )}
                </button>
              ))}
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider px-2 pt-2 pb-1 font-semibold">All Pages</p>
              {ALL_NAV.map((n) => (
                <button key={n.href} onClick={() => { navigate(n.href); onClose(); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/60 transition-colors text-left">
                  <n.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">{n.label}</span>
                  {n.shortcut && (
                    <span className="ml-auto text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">{n.shortcut}</span>
                  )}
                </button>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">No results for "{query}"</div>
          ) : (
            <div className="p-3 space-y-1">
              {filtered.map((item: any, i) => (
                <button key={i}
                  onClick={() => { if (item.action) item.action(); else { navigate(item.href); onClose(); } }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/60 transition-colors text-left">
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 py-2 border-t border-border flex items-center gap-4 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><kbd className="bg-muted px-1 rounded font-mono">↑↓</kbd> navigate</span>
          <span className="flex items-center gap-1"><kbd className="bg-muted px-1 rounded font-mono">↵</kbd> open</span>
          <span className="flex items-center gap-1"><kbd className="bg-muted px-1 rounded font-mono">ESC</kbd> close</span>
        </div>
      </div>
    </div>
  );
};

// ── Main AdminLayout ──────────────────────────────────────────────────────────
const AdminLayout = ({ children }: { children: ReactNode }) => {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { signOut, user, profile } = useAuth();

  const [mobileOpen,    setMobileOpen]    = useState(false);
  const [cmdOpen,       setCmdOpen]       = useState(false);
  const [collapsed,     setCollapsed]     = useState(false);
  const [pendingCount,  setPendingCount]  = useState(0);
  const [flaggedCount,  setFlaggedCount]  = useState(0);
  const [totalRevenue,  setTotalRevenue]  = useState(0);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  // ── Live counts ─────────────────────────────────────────────────────────
  const fetchCounts = useCallback(async () => {
    const [pending, flagged, revenue] = await Promise.all([
      supabase.from("vendors").select("id", { count: "exact", head: true }).eq("is_approved", false).eq("is_active", true),
      supabase.from("messages").select("id", { count: "exact", head: true }).eq("ai_flagged", true).eq("is_read", false),
      supabase.from("featured_listings").select("amount").eq("payment_status", "confirmed"),
    ]);
    setPendingCount(pending.count || 0);
    setFlaggedCount(flagged.count || 0);
    setTotalRevenue(revenue.data?.reduce((s: number, r: any) => s + Number(r.amount), 0) || 0);
  }, []);

  useEffect(() => {
    fetchCounts();
    const channel = supabase.channel("admin-layout-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "vendors" }, fetchCounts)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, fetchCounts)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchCounts]);

  // ── Keyboard shortcuts ──────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Cmd/Ctrl+K — command palette
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setCmdOpen((o) => !o); }
      // Escape — close everything
      if (e.key === "Escape") { setCmdOpen(false); setMobileOpen(false); }
      // G + letter shortcuts (only when not typing)
      if (document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        // handled by command palette search
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const getBadgeCount = (badge: string | null) => {
    if (badge === "vendors") return pendingCount;
    if (badge === "chats")   return flaggedCount;
    return 0;
  };

  const toggleSection = (label: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label); else next.add(label);
      return next;
    });
  };

  const initials = profile
    ? `${(profile.first_name || "").charAt(0)}${(profile.last_name || "").charAt(0)}`.toUpperCase() || "SA"
    : "SA";
  const displayName = profile
    ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Super Admin"
    : "Super Admin";

  // ── Sidebar inner ────────────────────────────────────────────────────────
  const SidebarInner = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className="flex flex-col h-full">

      {/* Brand */}
      <div className="relative overflow-hidden px-4 pt-5 pb-4 border-b border-white/8">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/20 via-transparent to-primary/10 pointer-events-none" />
        <div className="flex items-center gap-2.5 relative">
          <Link to="/" className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center shadow-lg shadow-accent/30 shrink-0">
              <ShoppingBag className="h-4 w-4 text-accent-foreground" />
            </div>
            {(!collapsed || isMobile) && (
              <div className="min-w-0">
                <span className="font-bold text-sidebar-foreground text-sm block leading-tight truncate">Campus Market</span>
                <span className="text-[10px] text-sidebar-foreground/40 uppercase tracking-widest">Admin Panel</span>
              </div>
            )}
          </Link>
          {!isMobile && (
            <button onClick={() => setCollapsed((c) => !c)}
              className="w-6 h-6 rounded-lg bg-white/8 flex items-center justify-center hover:bg-white/15 transition-colors shrink-0">
              {collapsed ? <ChevronRight className="h-3.5 w-3.5 text-sidebar-foreground/60" /> : <ChevronDown className="h-3.5 w-3.5 text-sidebar-foreground/60" />}
            </button>
          )}
        </div>

        {/* Live indicator */}
        <div className="absolute top-4 right-4 flex items-center gap-1.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
          </span>
          {(!collapsed || isMobile) && <span className="text-[9px] text-green-400 font-medium">Live</span>}
        </div>
      </div>

      {/* Command palette trigger */}
      {(!collapsed || isMobile) && (
        <div className="px-3 py-2 border-b border-white/8">
          <button onClick={() => { setCmdOpen(true); if (isMobile) setMobileOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-white/6 border border-white/10 hover:bg-white/10 transition-all text-left">
            <Search className="h-3.5 w-3.5 text-sidebar-foreground/40" />
            <span className="text-xs text-sidebar-foreground/40 flex-1">Search or jump to…</span>
            <kbd className="text-[9px] text-sidebar-foreground/30 bg-white/8 px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
          </button>
        </div>
      )}

      {/* Admin profile */}
      {(!collapsed || isMobile) && (
        <div className="px-3 py-2 border-b border-white/8">
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white/5 border border-white/8">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center text-xs font-bold text-white shadow shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-sidebar-foreground truncate">{displayName}</p>
              <div className="flex items-center gap-1">
                <ShieldCheck className="h-2.5 w-2.5 text-accent" />
                <span className="text-[9px] text-accent font-bold uppercase tracking-wide">Super Admin</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Revenue ticker */}
      {(!collapsed || isMobile) && totalRevenue > 0 && (
        <div className="px-3 py-2 border-b border-white/8">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/15">
            <CreditCard className="h-3.5 w-3.5 text-green-400 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[9px] text-green-400/70 uppercase tracking-wide">Total Revenue</p>
              <p className="text-xs font-bold text-green-400">₦{totalRevenue.toLocaleString()}</p>
            </div>
            <TrendingUp className="h-3 w-3 text-green-400/50 shrink-0" />
          </div>
        </div>
      )}

      {/* Alert banners */}
      {(!collapsed || isMobile) && (pendingCount > 0 || flaggedCount > 0) && (
        <div className="px-3 py-2 space-y-1 border-b border-white/8">
          {pendingCount > 0 && (
            <Link to="/admin/vendors" onClick={() => setMobileOpen(false)}>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-500/10 border border-orange-400/15 hover:bg-orange-500/15 transition-colors cursor-pointer">
                <Clock className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                <span className="text-xs text-orange-300 flex-1 truncate">{pendingCount} vendor{pendingCount !== 1 ? "s" : ""} pending</span>
                <ChevronRight className="h-3 w-3 text-orange-400/40 shrink-0" />
              </div>
            </Link>
          )}
          {flaggedCount > 0 && (
            <Link to="/admin/chats" onClick={() => setMobileOpen(false)}>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-400/15 hover:bg-red-500/15 transition-colors cursor-pointer">
                <Bell className="h-3.5 w-3.5 text-red-400 shrink-0" />
                <span className="text-xs text-red-300 flex-1 truncate">{flaggedCount} flagged message{flaggedCount !== 1 ? "s" : ""}</span>
                <ChevronRight className="h-3 w-3 text-red-400/40 shrink-0" />
              </div>
            </Link>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-2 py-2 overflow-y-auto space-y-0.5">
        {NAV_SECTIONS.map((section) => {
          const isSectionCollapsed = collapsedSections.has(section.label);
          return (
            <div key={section.label} className="mb-1">
              {(!collapsed || isMobile) && (
                <button
                  onClick={() => toggleSection(section.label)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors group"
                >
                  <span className="text-[10px] text-sidebar-foreground/30 uppercase tracking-widest font-semibold flex-1 text-left">{section.label}</span>
                  {isSectionCollapsed
                    ? <ChevronRight className="h-3 w-3 text-sidebar-foreground/20 group-hover:text-sidebar-foreground/40" />
                    : <ChevronUp    className="h-3 w-3 text-sidebar-foreground/20 group-hover:text-sidebar-foreground/40" />}
                </button>
              )}

              {!isSectionCollapsed && section.items.map((item) => {
                const isActive   = location.pathname === item.href;
                const badgeCount = getBadgeCount(item.badge);
                return (
                  <Link key={item.href} to={item.href} onClick={() => setMobileOpen(false)}>
                    <div className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group mb-0.5 overflow-hidden ${
                      isActive
                        ? "bg-accent text-accent-foreground shadow-md shadow-accent/20"
                        : "text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-white/6"
                    }`}>
                      {isActive && <div className="absolute inset-0 bg-gradient-to-r from-accent to-accent/80 pointer-events-none" />}
                      <item.icon className={`h-4 w-4 shrink-0 relative z-10 ${isActive ? "text-accent-foreground" : ""}`} />
                      {(!collapsed || isMobile) && (
                        <>
                          <span className="text-sm font-medium flex-1 relative z-10 truncate">{item.label}</span>
                          {item.shortcut && !isActive && (
                            <span className="text-[9px] text-sidebar-foreground/20 font-mono opacity-0 group-hover:opacity-100 transition-opacity relative z-10">{item.shortcut}</span>
                          )}
                          {badgeCount > 0 && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 relative z-10 ${
                              isActive ? "bg-white/20 text-white"
                                : item.badge === "chats" ? "bg-red-500 text-white"
                                : "bg-orange-500 text-white"
                            }`}>
                              {badgeCount > 99 ? "99+" : badgeCount}
                            </span>
                          )}
                        </>
                      )}
                      {collapsed && !isMobile && badgeCount > 0 && (
                        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-orange-500 z-10" />
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-2 pb-3 pt-2 border-t border-white/8 space-y-0.5">
        <Link to="/" target="_blank" rel="noopener noreferrer">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-white/6 transition-all group">
            <ExternalLink className="h-4 w-4 group-hover:text-accent transition-colors shrink-0" />
            {(!collapsed || isMobile) && <span className="text-xs">View Site as User</span>}
          </div>
        </Link>
        <div className="flex items-center justify-between px-3 py-2">
          {(!collapsed || isMobile) && <span className="text-[10px] text-sidebar-foreground/30">Theme</span>}
          <ThemeToggle />
        </div>
        <button onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sidebar-foreground/40 hover:text-red-400 hover:bg-red-500/8 transition-all">
          <LogOut className="h-4 w-4 shrink-0" />
          {(!collapsed || isMobile) && <span className="text-xs">Sign Out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} pendingCount={pendingCount} flaggedCount={flaggedCount} />

      <div className="min-h-screen bg-background flex">
        {/* Desktop sidebar */}
        <aside className={`${collapsed ? "w-16" : "w-64"} bg-sidebar hidden md:flex flex-col fixed top-0 left-0 h-screen z-40 border-r border-sidebar-border overflow-hidden transition-all duration-200`}>
          <div className="absolute inset-0 bg-gradient-to-b from-accent/4 via-transparent to-primary/4 pointer-events-none" />
          <div className="relative flex flex-col h-full"><SidebarInner /></div>
        </aside>

        {/* Mobile overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
            <aside className="absolute left-0 top-0 bottom-0 w-72 bg-sidebar flex flex-col overflow-hidden border-r border-sidebar-border">
              <div className="absolute inset-0 bg-gradient-to-b from-accent/4 via-transparent to-primary/4 pointer-events-none" />
              <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                <X className="h-4 w-4 text-sidebar-foreground" />
              </button>
              <div className="relative flex flex-col h-full"><SidebarInner isMobile /></div>
            </aside>
          </div>
        )}

        {/* Main */}
        <main className={`flex-1 overflow-auto transition-all duration-200 ${collapsed ? "md:ml-16" : "md:ml-64"}`}>
          {/* Top bar */}
          <div className="sticky top-0 z-30 flex items-center gap-3 px-4 h-13 bg-background/95 backdrop-blur-xl border-b border-border">
            {/* Mobile menu */}
            <button onClick={() => setMobileOpen(true)} className="md:hidden w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center">
              <Menu className="h-5 w-5 text-accent" />
            </button>

            {/* Breadcrumb */}
            <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground flex-1 min-w-0">
              <ShoppingBag className="h-4 w-4 text-accent shrink-0" />
              <ChevronRight className="h-3 w-3 shrink-0" />
              <span className="text-foreground font-medium truncate">
                {ALL_NAV.find((n) => n.href === location.pathname)?.label || "Dashboard"}
              </span>
            </div>

            <div className="flex-1 md:flex-none" />

            {/* Top bar actions */}
            <button onClick={() => setCmdOpen(true)}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/60 border border-border hover:bg-muted transition-colors text-sm text-muted-foreground">
              <Command className="h-3.5 w-3.5" />
              <span className="text-xs">Command</span>
              <kbd className="text-[9px] bg-background px-1 rounded font-mono">⌘K</kbd>
            </button>

            {/* Alerts */}
            {(pendingCount + flaggedCount) > 0 && (
              <button onClick={() => navigate(pendingCount > 0 ? "/admin/vendors" : "/admin/chats")}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-orange-500/10 border border-orange-400/20 hover:bg-orange-500/15 transition-colors">
                <Bell className="h-3.5 w-3.5 text-orange-400" />
                <span className="text-xs font-bold text-orange-400">{pendingCount + flaggedCount}</span>
              </button>
            )}

            {/* Revenue chip */}
            {totalRevenue > 0 && (
              <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-green-500/10 border border-green-400/20">
                <Eye className="h-3 w-3 text-green-400" />
                <span className="text-[11px] font-semibold text-green-400">₦{(totalRevenue / 1000).toFixed(0)}k</span>
              </div>
            )}

            <ThemeToggle />
          </div>

          {/* Flash banner if maintenance mode */}
          <div className="px-4 sm:px-6 py-4 sm:py-6">{children}</div>
        </main>
      </div>
    </>
  );
};

export default AdminLayout;

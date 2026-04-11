import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import ThemeToggle from "@/components/ThemeToggle";
import {
  LayoutDashboard, Users, GraduationCap, MapPin, Star,
  LogOut, ShoppingBag, BarChart3, UserCog, Megaphone,
  MessageCircle, ExternalLink, Clock, ShieldCheck, Menu, X,
  Bell, ChevronRight,
} from "lucide-react";

const navItems = [
  { href: "/admin",            label: "Dashboard",        icon: LayoutDashboard, badge: null },
  { href: "/admin/vendors",    label: "Vendors",          icon: Users,           badge: "vendors" },
  { href: "/admin/schools",    label: "Schools",          icon: GraduationCap,   badge: null },
  { href: "/admin/locations",  label: "Campus Locations", icon: MapPin,          badge: null },
  { href: "/admin/featured",   label: "Featured",         icon: Star,            badge: null },
  { href: "/admin/ads",        label: "Ads",              icon: Megaphone,       badge: null },
  { href: "/admin/analytics",  label: "Analytics",        icon: BarChart3,       badge: null },
  { href: "/admin/chats",      label: "Chat Oversight",   icon: MessageCircle,   badge: "chats" },
  { href: "/admin/sub-admins", label: "Sub-Admins",       icon: UserCog,         badge: null },
];

const AdminLayout = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const { signOut, user, profile } = useAuth();
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [flaggedCount, setFlaggedCount] = useState(0);

  useEffect(() => {
    const fetchCounts = async () => {
      const [pending, flagged] = await Promise.all([
        supabase.from("vendors").select("id", { count: "exact", head: true }).eq("is_approved", false).eq("is_active", true),
        supabase.from("messages").select("id", { count: "exact", head: true }).eq("ai_flagged", true).eq("is_read", false),
      ]);
      setPendingCount(pending.count || 0);
      setFlaggedCount(flagged.count || 0);
    };
    fetchCounts();
    const channel = supabase.channel("admin-layout-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "vendors" }, fetchCounts)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, fetchCounts)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const getBadgeCount = (badge: string | null) => {
    if (badge === "vendors") return pendingCount;
    if (badge === "chats")   return flaggedCount;
    return 0;
  };

  const initials = profile
    ? `${(profile.first_name || "").charAt(0)}${(profile.last_name || "").charAt(0)}`.toUpperCase() || "A"
    : "A";
  const displayName = profile
    ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Admin"
    : "Admin";

  const SidebarInner = () => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="relative overflow-hidden px-5 pt-5 pb-4 border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/25 via-transparent to-primary/15 pointer-events-none" />
        <Link to="/" className="flex items-center gap-2.5 relative">
          <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center shadow-lg shadow-accent/40">
            <ShoppingBag className="h-5 w-5 text-accent-foreground" />
          </div>
          <div>
            <span className="font-bold text-sidebar-foreground text-sm block leading-tight">Campus Market</span>
            <span className="text-[10px] text-sidebar-foreground/40 uppercase tracking-widest">Admin Panel</span>
          </div>
        </Link>
        <div className="absolute top-4 right-4 flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          <span className="text-[10px] text-green-400 font-medium">Live</span>
        </div>
      </div>

      {/* Admin profile card */}
      <div className="px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/10">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center text-sm font-bold text-white shadow shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-sidebar-foreground truncate">{displayName}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <ShieldCheck className="h-3 w-3 text-accent" />
              <span className="text-[10px] text-accent font-semibold uppercase tracking-wide">Super Admin</span>
            </div>
          </div>
        </div>
      </div>

      {/* Alert banners */}
      {(pendingCount > 0 || flaggedCount > 0) && (
        <div className="px-3 py-2 space-y-1.5">
          {pendingCount > 0 && (
            <Link to="/admin/vendors" onClick={() => setMobileOpen(false)}>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-500/10 border border-orange-400/20 hover:bg-orange-500/20 transition-colors cursor-pointer">
                <Clock className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                <span className="text-xs text-orange-300 flex-1">{pendingCount} pending approval</span>
                <ChevronRight className="h-3 w-3 text-orange-400/50" />
              </div>
            </Link>
          )}
          {flaggedCount > 0 && (
            <Link to="/admin/chats" onClick={() => setMobileOpen(false)}>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-400/20 hover:bg-red-500/20 transition-colors cursor-pointer">
                <Bell className="h-3.5 w-3.5 text-red-400 shrink-0" />
                <span className="text-xs text-red-300 flex-1">{flaggedCount} flagged message{flaggedCount !== 1 ? "s" : ""}</span>
                <ChevronRight className="h-3 w-3 text-red-400/50" />
              </div>
            </Link>
          )}
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] text-sidebar-foreground/25 uppercase tracking-widest px-3 py-2 font-semibold">Navigation</p>
        {navItems.map((item) => {
          const isActive    = location.pathname === item.href;
          const badgeCount  = getBadgeCount(item.badge);
          return (
            <Link key={item.href} to={item.href} onClick={() => setMobileOpen(false)}>
              <div className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group overflow-hidden ${
                isActive
                  ? "bg-accent text-accent-foreground shadow-md shadow-accent/25"
                  : "text-sidebar-foreground/55 hover:text-sidebar-foreground hover:bg-white/6"
              }`}>
                {isActive && <div className="absolute inset-0 bg-gradient-to-r from-accent to-accent/80 pointer-events-none" />}
                <item.icon className="h-4 w-4 shrink-0 relative z-10" />
                <span className="text-sm font-medium flex-1 relative z-10">{item.label}</span>
                {badgeCount > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 relative z-10 ${
                    isActive ? "bg-white/20 text-white" : item.badge === "chats" ? "bg-red-500 text-white" : "bg-orange-500 text-white"
                  }`}>
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 pt-2 border-t border-white/10 space-y-0.5">
        <Link to="/" target="_blank" rel="noopener noreferrer">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sidebar-foreground/45 hover:text-sidebar-foreground hover:bg-white/6 transition-all group">
            <ExternalLink className="h-4 w-4 group-hover:text-accent transition-colors" />
            <span className="text-sm">View Site as User</span>
          </div>
        </Link>
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-xs text-sidebar-foreground/35">Theme</span>
          <ThemeToggle />
        </div>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sidebar-foreground/45 hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <LogOut className="h-4 w-4" />
          <span className="text-sm">Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop sidebar */}
      <aside className="w-64 bg-sidebar hidden md:flex flex-col fixed top-0 left-0 h-screen z-40 border-r border-sidebar-border overflow-hidden">
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
            <div className="relative flex flex-col h-full"><SidebarInner /></div>
          </aside>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 md:ml-64 overflow-auto">
        {/* Mobile top bar */}
        <div className="md:hidden sticky top-0 z-30 flex items-center gap-3 px-4 h-14 bg-background/95 backdrop-blur-xl border-b border-border">
          <button onClick={() => setMobileOpen(true)} className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center">
            <Menu className="h-5 w-5 text-accent" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
              <ShoppingBag className="h-4 w-4 text-accent-foreground" />
            </div>
            <span className="font-bold text-sm">Admin Panel</span>
          </div>
          {(pendingCount + flaggedCount) > 0 && (
            <Badge className="bg-orange-500 text-white text-[10px]">{pendingCount + flaggedCount}</Badge>
          )}
          <ThemeToggle />
        </div>
        <div className="p-4 sm:p-6">{children}</div>
      </main>
    </div>
  );
};

export default AdminLayout;

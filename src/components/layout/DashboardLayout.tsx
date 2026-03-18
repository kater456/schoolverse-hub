import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  GraduationCap,
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  Settings,
  BarChart3,
  HelpCircle,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Bell,
  ShoppingBag,
  Palette,
  Package,
} from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
  userRole?: "super_admin" | "school_admin" | "user";
}

const DashboardLayout = ({ children, userRole = "school_admin" }: DashboardLayoutProps) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();

  const superAdminLinks = [
    { name: "Dashboard", href: "/super-admin", icon: LayoutDashboard },
    { name: "Schools", href: "/super-admin/schools", icon: Building2 },
    { name: "Subscriptions", href: "/super-admin/subscriptions", icon: CreditCard },
    { name: "Analytics", href: "/super-admin/analytics", icon: BarChart3 },
    { name: "Settings", href: "/super-admin/settings", icon: Settings },
  ];

  const schoolAdminLinks = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Products", href: "/dashboard/products", icon: Package },
    { name: "Orders", href: "/dashboard/orders", icon: ShoppingBag },
    { name: "Users", href: "/dashboard/users", icon: Users },
    { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
    { name: "Branding", href: "/dashboard/branding", icon: Palette },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
  ];

  const userLinks = [
    { name: "Home", href: "/portal", icon: LayoutDashboard },
    { name: "Shop", href: "/portal/shop", icon: ShoppingBag },
    { name: "My Orders", href: "/portal/orders", icon: CreditCard },
    { name: "Profile", href: "/portal/profile", icon: Users },
  ];

  const links =
    userRole === "super_admin"
      ? superAdminLinks
      : userRole === "school_admin"
      ? schoolAdminLinks
      : userLinks;

  const roleLabel =
    userRole === "super_admin"
      ? "Super Admin"
      : userRole === "school_admin"
      ? "School Admin"
      : "Student";

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const displayName = profile 
    ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "User"
    : "User";

  const initials = profile
    ? `${(profile.first_name?.[0] || "").toUpperCase()}${(profile.last_name?.[0] || "").toUpperCase()}` || "U"
    : "U";

  const email = user?.email || "";

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-sidebar transition-all duration-300 ${
          sidebarCollapsed ? "w-20" : "w-64"
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-primary shadow-md">
              <GraduationCap className="h-5 w-5 text-sidebar-primary-foreground" />
            </div>
            {!sidebarCollapsed && (
              <span className="font-display text-lg font-bold text-sidebar-foreground">
                Campus Market
              </span>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {links.map((link) => {
            const isActive = location.pathname === link.href;
            return (
              <Link
                key={link.name}
                to={link.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                }`}
              >
                <link.icon className="h-5 w-5 flex-shrink-0" />
                {!sidebarCollapsed && (
                  <span className="font-medium">{link.name}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="p-4 border-t border-sidebar-border space-y-2">
          <Link
            to="/help"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
          >
            <HelpCircle className="h-5 w-5 flex-shrink-0" />
            {!sidebarCollapsed && <span className="font-medium">Help</span>}
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/70 hover:bg-destructive/20 hover:text-destructive transition-colors w-full"
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {!sidebarCollapsed && <span className="font-medium">Logout</span>}
          </button>
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute top-20 -right-3 w-6 h-6 rounded-full bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center shadow-md hover:scale-110 transition-transform"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </aside>

      {/* Main Content */}
      <div
        className={`flex-1 transition-all duration-300 ${
          sidebarCollapsed ? "ml-20" : "ml-64"
        }`}
      >
        {/* Top Header */}
        <header className="sticky top-0 z-40 h-16 bg-background/80 backdrop-blur-xl border-b border-border flex items-center justify-between px-6">
          <div>
            <span className="text-sm text-muted-foreground">{roleLabel}</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-destructive" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-semibold text-primary">{initials}</span>
              </div>
              {!sidebarCollapsed && (
                <div className="hidden sm:block">
                  <div className="text-sm font-medium text-foreground">{displayName}</div>
                  <div className="text-xs text-muted-foreground">{email}</div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;

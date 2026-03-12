import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { LayoutDashboard, Users, GraduationCap, MapPin, Star, LogOut, ShoppingBag } from "lucide-react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/vendors", label: "Vendors", icon: Users },
  { href: "/admin/schools", label: "Schools", icon: GraduationCap },
  { href: "/admin/locations", label: "Campus Locations", icon: MapPin },
  { href: "/admin/featured", label: "Featured", icon: Star },
];

const AdminLayout = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar border-r border-sidebar-border hidden md:flex flex-col">
        <div className="p-4 border-b border-sidebar-border">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
              <ShoppingBag className="h-4 w-4 text-sidebar-primary-foreground" />
            </div>
            <span className="font-bold text-sidebar-foreground">EduMarket</span>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link key={item.href} to={item.href}>
                <Button
                  variant="ghost"
                  className={`w-full justify-start gap-2 ${
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <Button variant="ghost" className="w-full justify-start gap-2 text-sidebar-foreground/70" onClick={signOut}>
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        {/* Mobile header */}
        <div className="md:hidden flex items-center gap-3 p-4 border-b border-border overflow-x-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link key={item.href} to={item.href}>
                <Button size="sm" variant={isActive ? "default" : "ghost"} className="whitespace-nowrap">
                  <item.icon className="h-4 w-4 mr-1" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </div>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
};

export default AdminLayout;

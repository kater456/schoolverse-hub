import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, ShoppingBag, Search, Film, LogOut, Plus, MessageCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import ThemeToggle from "@/components/ThemeToggle";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, userRole, signOut } = useAuth();
  const [isApprovedVendor, setIsApprovedVendor] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const role = userRole?.role as string;
  const vendorDashLink = role === "vendor" ? "/vendor-dashboard" : null;
  const subAdminLink   = role === "sub_admin" || role === "admin" ? "/sub-admin" : null;

  useEffect(() => {
    if (!user) { setIsApprovedVendor(false); setUnreadCount(0); return; }

    const check = async () => {
      const { data } = await supabase
        .from("vendors").select("id, is_approved")
        .eq("user_id", user.id).eq("is_approved", true).maybeSingle();
      setIsApprovedVendor(!!data);
    };
    check();

    // Fetch unread message count
    const fetchUnread = async () => {
      // Get vendor id if vendor
      const { data: vendorData } = await supabase.from("vendors")
        .select("id").eq("user_id", user.id).eq("is_approved", true).maybeSingle();

      let total = 0;
      if (vendorData) {
        const { data: convs } = await (supabase as any).from("conversations")
          .select("vendor_unread").eq("vendor_id", vendorData.id);
        total += (convs || []).reduce((s: number, c: any) => s + (c.vendor_unread || 0), 0);
      }
      const { data: buyerConvs } = await supabase.from("conversations")
        .select("buyer_unread").eq("buyer_id", user.id);
      total += (buyerConvs || []).reduce((s: number, c: any) => s + (c.buyer_unread || 0), 0);
      setUnreadCount(total);
    };
    fetchUnread();

    // Realtime vendor approval
    const channel = supabase.channel("vendor-approval-navbar")
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "vendors",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        if (payload.new?.is_approved) setIsApprovedVendor(true);
      })
      .on("postgres_changes", {
        event: "*", schema: "public", table: "conversations",
      }, () => fetchUnread())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent/80 shadow-md">
              <ShoppingBag className="h-5 w-5 text-accent-foreground" />
            </div>
            <span className="font-display text-lg sm:text-xl font-bold text-foreground">Campus Market</span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <Link to="/browse" className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              <Search className="h-4 w-4" /> Browse
            </Link>
            <Link to="/reels" className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              <Film className="h-4 w-4" /> Reels
            </Link>
            {user && (
              <Link to="/messages" className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors relative">
                <MessageCircle className="h-4 w-4" /> Messages
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 w-4 h-4 rounded-full bg-accent text-accent-foreground text-[9px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
            )}
            {user && userRole?.role === "super_admin" && (
              <Link to="/admin" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Admin</Link>
            )}
            {vendorDashLink && (
              <Link to={vendorDashLink} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">My Dashboard</Link>
            )}
            {subAdminLink && (
              <Link to={subAdminLink} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Sub-Admin</Link>
            )}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            {user ? (
              <>
                {isApprovedVendor ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/vendor-dashboard"><Plus className="h-4 w-4 mr-1" />Add Product</Link>
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/register-vendor">Sell on Campus</Link>
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={signOut}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/login">Sign In</Link>
                </Button>
                <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" asChild>
                  <Link to="/signup">Sign Up</Link>
                </Button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            {user && (
              <Link to="/messages" className="relative p-2">
                <MessageCircle className="h-5 w-5 text-muted-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-accent text-accent-foreground text-[9px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
            )}
            <button onClick={() => setIsOpen(!isOpen)} className="p-2 rounded-lg hover:bg-secondary transition-colors">
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {isOpen && (
          <div className="md:hidden py-4 border-t border-border/50 animate-fade-in">
            <div className="flex flex-col gap-2">
              <Link to="/browse"  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg" onClick={() => setIsOpen(false)}>Browse Marketplace</Link>
              <Link to="/reels"   className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg" onClick={() => setIsOpen(false)}>Reels</Link>
              {user && (
                <Link to="/messages" className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg flex items-center gap-2" onClick={() => setIsOpen(false)}>
                  Messages
                  {unreadCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-accent text-accent-foreground text-[10px] font-bold flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </Link>
              )}
              {user && userRole?.role === "super_admin" && (
                <Link to="/admin" className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg" onClick={() => setIsOpen(false)}>Admin Dashboard</Link>
              )}
              {vendorDashLink && (
                <Link to={vendorDashLink} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg" onClick={() => setIsOpen(false)}>My Dashboard</Link>
              )}
              {subAdminLink && (
                <Link to={subAdminLink} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg" onClick={() => setIsOpen(false)}>Sub-Admin</Link>
              )}
              <div className="flex flex-col gap-2 mt-4 px-4">
                {user ? (
                  <>
                    {isApprovedVendor ? (
                      <Button variant="outline" asChild className="w-full" onClick={() => setIsOpen(false)}>
                        <Link to="/vendor-dashboard"><Plus className="h-4 w-4 mr-1" />Add Product</Link>
                      </Button>
                    ) : (
                      <Button variant="outline" asChild className="w-full" onClick={() => setIsOpen(false)}>
                        <Link to="/register-vendor">Sell on Campus</Link>
                      </Button>
                    )}
                    <Button variant="ghost" className="w-full" onClick={() => { signOut(); setIsOpen(false); }}>Sign Out</Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" asChild className="w-full"><Link to="/login">Sign In</Link></Button>
                    <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" asChild><Link to="/signup">Sign Up</Link></Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;

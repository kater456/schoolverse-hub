import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ShoppingBag, Star, Clock, DollarSign } from "lucide-react";

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalVendors: 0,
    pendingVendors: 0,
    activeListings: 0,
    featuredListings: 0,
    revenue: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const [vendors, pending, featured] = await Promise.all([
        supabase.from("vendors").select("id", { count: "exact", head: true }),
        supabase.from("vendors").select("id", { count: "exact", head: true }).eq("is_approved", false),
        supabase.from("featured_listings").select("amount", { count: "exact" }).eq("payment_status", "confirmed"),
      ]);

      const activeCount = (vendors.count || 0) - (pending.count || 0);
      const revenue = featured.data?.reduce((sum: number, f: any) => sum + Number(f.amount), 0) || 0;

      setStats({
        totalVendors: vendors.count || 0,
        pendingVendors: pending.count || 0,
        activeListings: activeCount,
        featuredListings: featured.count || 0,
        revenue,
      });
    };
    fetchStats();
  }, []);

  const cards = [
    { title: "Total Vendors", value: stats.totalVendors, icon: Users, color: "text-primary" },
    { title: "Pending Approval", value: stats.pendingVendors, icon: Clock, color: "text-warning" },
    { title: "Active Listings", value: stats.activeListings, icon: ShoppingBag, color: "text-success" },
    { title: "Featured Listings", value: stats.featuredListings, icon: Star, color: "text-accent" },
    { title: "Revenue (₦)", value: `₦${stats.revenue.toLocaleString()}`, icon: DollarSign, color: "text-success" },
  ];

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {cards.map((card) => (
          <Card key={card.title} className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;

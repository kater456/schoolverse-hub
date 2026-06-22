import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Eye, MessageCircle, Share2, MousePointer2, TrendingUp, TrendingDown,
  Calendar, Loader2
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { format, subDays, startOfDay, isSameDay } from "date-fns";

interface AnalyticsTabProps {
  vendorId: string;
}

export default function AnalyticsTab({ vendorId }: AnalyticsTabProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    profile_view: { total: 0, thisWeek: 0, lastWeek: 0 },
    whatsapp_click: { total: 0, thisWeek: 0, lastWeek: 0 },
    contact_request: { total: 0, thisWeek: 0, lastWeek: 0 },
    share_click: { total: 0, thisWeek: 0, lastWeek: 0 },
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [recentLeads, setRecentLeads] = useState<any[]>([]);

  useEffect(() => {
    if (!vendorId) return;

    async function fetchAnalytics() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('vendor_analytics' as any)
          .select('*')
          .eq('vendor_id', vendorId)
          .gte('occurred_at', subDays(new Date(), 90).toISOString());

        if (error) throw error;

        const events = data || [];
        const now = new Date();
        const sevenDaysAgo = subDays(now, 7);
        const fourteenDaysAgo = subDays(now, 14);

        // Process Stats
        const newStats = {
          profile_view: { total: 0, thisWeek: 0, lastWeek: 0 },
          whatsapp_click: { total: 0, thisWeek: 0, lastWeek: 0 },
          contact_request: { total: 0, thisWeek: 0, lastWeek: 0 },
          share_click: { total: 0, thisWeek: 0, lastWeek: 0 },
        };

        events.forEach((ev: any) => {
          const type = ev.event_type as keyof typeof newStats;
          if (!newStats[type]) return;

          newStats[type].total++;
          const date = new Date(ev.occurred_at);
          if (date >= sevenDaysAgo) {
            newStats[type].thisWeek++;
          } else if (date >= fourteenDaysAgo) {
            newStats[type].lastWeek++;
          }
        });
        setStats(newStats);

        // Process Chart Data (last 7 days)
        const dailyViews = Array.from({ length: 7 }).map((_, i) => {
          const date = subDays(now, 6 - i);
          const count = events.filter((ev: any) =>
            ev.event_type === 'profile_view' && isSameDay(new Date(ev.occurred_at), date)
          ).length;
          return {
            name: format(date, 'EEE'),
            views: count
          };
        });
        setChartData(dailyViews);

        // Recent WhatsApp Leads
        const whatsappLeads = events
          .filter((ev: any) => ev.event_type === 'whatsapp_click')
          .sort((a: any, b: any) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())
          .slice(0, 20);
        setRecentLeads(whatsappLeads);

      } catch (err) {
        console.error("Error fetching analytics:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, [vendorId]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const StatCard = ({ title, type, icon: Icon }: { title: string, type: keyof typeof stats, icon: any }) => {
    const s = stats[type];
    const diff = s.thisWeek - s.lastWeek;
    const pct = s.lastWeek === 0 ? (s.thisWeek > 0 ? 100 : 0) : Math.round((diff / s.lastWeek) * 100);

    return (
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{s.total}</div>
          <div className="flex items-center mt-1">
            {pct >= 0 ? (
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] gap-1 px-1">
                <TrendingUp className="h-2.5 w-2.5" /> +{pct}%
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] gap-1 px-1">
                <TrendingDown className="h-2.5 w-2.5" /> {pct}%
              </Badge>
            )}
            <span className="text-[10px] text-muted-foreground ml-2">vs last week</span>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Profile Views" type="profile_view" icon={Eye} />
        <StatCard title="WhatsApp Clicks" type="whatsapp_click" icon={MessageCircle} />
        <StatCard title="Contact Requests" type="contact_request" icon={MousePointer2} />
        <StatCard title="Total Shares" type="share_click" icon={Share2} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Views Chart */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-accent" />
              Daily Profile Views
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--muted)/0.4)' }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                  />
                  <Bar dataKey="views" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent WhatsApp Leads Table */}
        <Card className="border-border/50 shadow-sm overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-emerald-500" />
              Recent WhatsApp Leads
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[240px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Date</th>
                    <th className="px-4 py-2 text-left font-medium">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {recentLeads.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="px-4 py-8 text-center text-muted-foreground">
                        No WhatsApp clicks recorded yet
                      </td>
                    </tr>
                  ) : (
                    recentLeads.map((lead: any) => (
                      <tr key={lead.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-2">{format(new Date(lead.occurred_at), 'MMM d, yyyy')}</td>
                        <td className="px-4 py-2 text-muted-foreground">{format(new Date(lead.occurred_at), 'HH:mm')}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

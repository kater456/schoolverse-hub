import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, MessageSquare, ShoppingBag, TrendingUp, ArrowRight, Loader2 } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

interface Props {
  vendorId: string;
}

interface DailyStat {
  date: string;
  views: number;
  inquiries: number;
  orders: number;
}

const pct = (a: number, b: number) => (b === 0 ? 0 : Math.round((a / b) * 100));

const VendorAnalytics = ({ vendorId }: Props) => {
  const [data, setData] = useState<DailyStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!vendorId) return;
      setIsLoading(true);

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      try {
        const { data: events, error } = await supabase
          .from("vendor_events")
          .select("event_type, created_at")
          .eq("vendor_id", vendorId)
          .gte("created_at", thirtyDaysAgo.toISOString());

        if (error) throw error;

        // Process data into daily buckets
        const dailyMap: Record<string, DailyStat> = {};

        // Initialize all 30 days with zeros (use full ISO for sorting, MM-DD for display)
        for (let i = 0; i < 30; i++) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const key = d.toISOString().split('T')[0]; // YYYY-MM-DD
          dailyMap[key] = { date: key, views: 0, inquiries: 0, orders: 0 };
        }

        (events || []).forEach((event) => {
          const key = new Date(event.created_at).toISOString().split('T')[0];
          if (dailyMap[key]) {
            if (event.event_type === 'view') dailyMap[key].views++;
            else if (event.event_type === 'inquiry_click' || event.event_type === 'message_sent') dailyMap[key].inquiries++;
            else if (event.event_type === 'order_completed') dailyMap[key].orders++;
          }
        });

        const sortedData = Object.values(dailyMap)
          .sort((a, b) => a.date.localeCompare(b.date))
          .map(d => ({ ...d, date: d.date.slice(5, 10) })); // format to MM-DD for display

        setData(sortedData);
      } catch (err) {
        console.error("Error fetching vendor analytics:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [vendorId]);

  const totals = useMemo(() => {
    return data.reduce(
      (acc, d) => ({
        views: acc.views + d.views,
        inquiries: acc.inquiries + d.inquiries,
        orders: acc.orders + d.orders,
      }),
      { views: 0, inquiries: 0, orders: 0 }
    );
  }, [data]);

  const inquiryRate = pct(totals.inquiries, totals.views);
  const orderRate = pct(totals.orders, totals.inquiries);

  const stats = [
    {
      title: "Views",
      value: totals.views,
      icon: Eye,
      accent: "text-sky-500",
      bg: "bg-sky-500/10",
      sub: "Last 30 days",
    },
    {
      title: "Inquiries",
      value: totals.inquiries,
      icon: MessageSquare,
      accent: "text-amber-500",
      bg: "bg-amber-500/10",
      sub: `${inquiryRate}% of views`,
    },
    {
      title: "Orders",
      value: totals.orders,
      icon: ShoppingBag,
      accent: "text-emerald-500",
      bg: "bg-emerald-500/10",
      sub: `${orderRate}% of inquiries`,
    },
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 bg-muted/30 rounded-2xl border border-border/50">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        <p className="text-sm text-muted-foreground font-medium">Crunching your numbers...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-accent" /> Analytics
          </h2>
          <p className="text-xs text-muted-foreground">
            Visitor funnel over the last 30 days
          </p>
        </div>
        <Badge variant="outline" className="text-[10px] bg-emerald-500/5 text-emerald-600 border-emerald-500/20">
          ● Live Data
        </Badge>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {stats.map(({ title, value, icon: Icon, accent, bg, sub }) => (
          <Card key={title} className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg}`}>
                <Icon className={`h-5 w-5 ${accent}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{title}</p>
                <p className="text-2xl font-bold leading-tight">{value.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">{sub}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Funnel */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Conversion Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <FunnelStage label="Views" value={totals.views} color="bg-sky-500" widthPct={100} />
            <FunnelArrow rate={inquiryRate} />
            <FunnelStage
              label="Inquiries"
              value={totals.inquiries}
              color="bg-amber-500"
              widthPct={Math.max(15, inquiryRate)}
            />
            <FunnelArrow rate={orderRate} />
            <FunnelStage
              label="Orders"
              value={totals.orders}
              color="bg-emerald-500"
              widthPct={Math.max(10, pct(totals.orders, totals.views))}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Views <span className="font-medium text-foreground">{totals.views}</span> → Inquiries{" "}
            <span className="font-medium text-foreground">{totals.inquiries}</span> ({inquiryRate}%) →
            Orders <span className="font-medium text-foreground">{totals.orders}</span> ({orderRate}%)
          </p>
        </CardContent>
      </Card>

      {/* Trend chart */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Daily Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="views" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="inquiries" stroke="#f59e0b" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="orders" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const FunnelStage = ({
  label,
  value,
  color,
  widthPct,
}: {
  label: string;
  value: number;
  color: string;
  widthPct: number;
}) => (
  <div className="flex-1 min-w-0">
    <div className="flex items-baseline justify-between mb-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-sm font-bold">{value.toLocaleString()}</span>
    </div>
    <div className="h-3 bg-muted rounded-full overflow-hidden">
      <div
        className={`h-full ${color} rounded-full transition-all`}
        style={{ width: `${widthPct}%` }}
      />
    </div>
  </div>
);

const FunnelArrow = ({ rate }: { rate: number }) => (
  <div className="flex sm:flex-col items-center justify-center text-muted-foreground shrink-0 gap-1">
    <ArrowRight className="h-4 w-4 sm:rotate-0 rotate-90" />
    <span className="text-[10px] font-medium">{rate}%</span>
  </div>
);

export default VendorAnalytics;

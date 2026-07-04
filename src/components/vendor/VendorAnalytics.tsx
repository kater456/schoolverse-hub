import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, MessageSquare, TrendingUp, ArrowRight, Loader2, Users } from "lucide-react";
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

        // Initialize all 30 days with zeros
        for (let i = 0; i < 30; i++) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const key = d.toISOString().split('T')[0]; // YYYY-MM-DD
          dailyMap[key] = { date: key, views: 0, inquiries: 0 };
        }

        (events || []).forEach((event) => {
          const key = new Date(event.created_at).toISOString().split('T')[0];
          if (dailyMap[key]) {
            if (event.event_type === 'view') dailyMap[key].views++;
            else if (event.event_type === 'inquiry_click' || event.event_type === 'message_sent') dailyMap[key].inquiries++;
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
      }),
      { views: 0, inquiries: 0 }
    );
  }, [data]);

  const inquiryRate = pct(totals.inquiries, totals.views);

  const stats = [
    {
      title: "Profile Views",
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
      sub: `${inquiryRate}% conversion`,
    },
    {
      title: "Engagement",
      value: totals.views + totals.inquiries,
      icon: Users,
      accent: "text-emerald-500",
      bg: "bg-emerald-500/10",
      sub: `Total interactions`,
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
            <TrendingUp className="h-5 w-5 text-accent" /> Engagement
          </h2>
          <p className="text-xs text-muted-foreground">
            Visitor interactions over the last 30 days
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
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold">Inquiry Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mt-2">
            <FunnelStage label="Total Views" value={totals.views} color="bg-sky-500" widthPct={100} />
            <FunnelArrow rate={inquiryRate} />
            <FunnelStage
              label="Buyer Inquiries"
              value={totals.inquiries}
              color="bg-amber-500"
              widthPct={Math.max(15, inquiryRate)}
            />
          </div>
          <div className="mt-6 p-3 bg-muted/40 rounded-xl border border-border/40">
            <p className="text-xs text-muted-foreground text-center">
              Your overall conversion rate from View to Inquiry is <span className="font-bold text-foreground">{inquiryRate}%</span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Trend chart */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold">Daily Engagement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  interval={4}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
                  iconType="circle"
                />
                <Line
                  name="Views"
                  type="monotone"
                  dataKey="views"
                  stroke="#0ea5e9"
                  strokeWidth={2.5}
                  dot={false}
                />
                <Line
                  name="Inquiries"
                  type="monotone"
                  dataKey="inquiries"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  dot={false}
                />
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
    <div className="flex items-baseline justify-between mb-2">
      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{label}</span>
      <span className="text-sm font-black">{value.toLocaleString()}</span>
    </div>
    <div className="h-4 bg-muted rounded-full overflow-hidden shadow-inner">
      <div
        className={`h-full ${color} rounded-full transition-all duration-700 ease-out`}
        style={{ width: `${widthPct}%` }}
      />
    </div>
  </div>
);

const FunnelArrow = ({ rate }: { rate: number }) => (
  <div className="flex sm:flex-col items-center justify-center text-muted-foreground shrink-0 gap-1 opacity-60">
    <ArrowRight className="h-4 w-4 sm:rotate-0 rotate-90" />
    <span className="text-[10px] font-bold">{rate}%</span>
  </div>
);

export default VendorAnalytics;

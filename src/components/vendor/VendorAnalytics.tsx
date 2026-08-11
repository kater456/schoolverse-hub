import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, MessageSquare, TrendingUp, ArrowRight, Loader2 } from "lucide-react";
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

interface DailyRecord {
  date: string;
  views: number;
  inquiries: number;
}

const pct = (a: number, b: number) => (b === 0 ? 0 : Math.round((a / b) * 100));

interface VendorAnalyticsProps {
  vendorId: string;
}

const VendorAnalytics = ({ vendorId }: VendorAnalyticsProps) => {
  const [loading, setLoading] = useState(true);
  const [dailyData, setDailyData] = useState<DailyRecord[]>([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!vendorId) return;
      setLoading(true);

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoIso = thirtyDaysAgo.toISOString();

      // 1. Fetch store visits (views)
      const { data: visits, error: visitsError } = await supabase
        .from("store_visits")
        .select("created_at")
        .eq("vendor_id", vendorId)
        .gte("created_at", thirtyDaysAgoIso);

      if (visitsError) {
        console.error("Error fetching store visits:", visitsError);
      }

      // 2. Fetch vendor events (inquiries)
      const { data: events, error: eventsError } = await supabase
        .from("vendor_events")
        .select("created_at")
        .eq("vendor_id", vendorId)
        .in("event_type", ["inquiry_click", "message_sent"])
        .gte("created_at", thirtyDaysAgoIso);

      if (eventsError) {
        console.error("Error fetching vendor events:", eventsError);
      }

      // Generate base map of last 30 days
      const days = Array.from({ length: 30 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (29 - i));
        return d;
      });

      const dailyDataMap = new Map<string, { date: string; views: number; inquiries: number }>();

      const getLocalDateKey = (dateStr: string) => {
        const d = new Date(dateStr);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      days.forEach(d => {
        const key = getLocalDateKey(d.toISOString());
        const displayDate = d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit" }); // MM/DD
        dailyDataMap.set(key, {
          date: displayDate,
          views: 0,
          inquiries: 0
        });
      });

      // Aggregate views
      visits?.forEach(v => {
        if (v.created_at) {
          const key = getLocalDateKey(v.created_at);
          if (dailyDataMap.has(key)) {
            dailyDataMap.get(key)!.views += 1;
          }
        }
      });

      // Aggregate inquiries
      events?.forEach(e => {
        if (e.created_at) {
          const key = getLocalDateKey(e.created_at);
          if (dailyDataMap.has(key)) {
            dailyDataMap.get(key)!.inquiries += 1;
          }
        }
      });

      // Sort and map to array
      const sortedRecords = Array.from(dailyDataMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([_, val]) => val);

      setDailyData(sortedRecords);
      setLoading(false);
    };

    fetchAnalytics();
  }, [vendorId]);

  const totals = useMemo(() => {
    return dailyData.reduce(
      (acc, d) => {
        acc.views += d.views;
        acc.inquiries += d.inquiries;
        return acc;
      },
      { views: 0, inquiries: 0 }
    );
  }, [dailyData]);

  const inquiryRate = useMemo(() => pct(totals.inquiries, totals.views), [totals]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading your analytics...</p>
      </div>
    );
  }

  // Zero-state check
  if (totals.views === 0 && totals.inquiries === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-accent" /> Analytics
            </h2>
            <p className="text-xs text-muted-foreground">
              Visitor funnel over the last 30 days
            </p>
          </div>
        </div>
        <Card className="border-border/50 p-8 text-center flex flex-col items-center justify-center space-y-3 min-h-[200px]">
          <TrendingUp className="h-12 w-12 text-muted-foreground/30" />
          <h3 className="font-semibold text-base">No visits yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Share your store link with classmates and customers to start tracking views and inquiries!
          </p>
        </Card>
      </div>
    );
  }

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
  ];

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
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Views <span className="font-medium text-foreground">{totals.views}</span> → Inquiries{" "}
            <span className="font-medium text-foreground">{totals.inquiries}</span> ({inquiryRate}%)
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
              <LineChart data={dailyData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
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

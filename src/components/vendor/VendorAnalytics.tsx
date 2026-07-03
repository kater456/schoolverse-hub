import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, MessageSquare, ShoppingBag, TrendingUp, ArrowRight } from "lucide-react";
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

/**
 * Vendor Analytics — visitor funnel.
 * NOTE: Uses deterministic mock data for now. Replace `mockDaily` with a real
 * Supabase query once tracking is confirmed live (keep the same shape).
 */

// Deterministic mock: 30 days of views/inquiries/orders
const mockDaily = Array.from({ length: 30 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (29 - i));
  const base = 8 + Math.round(Math.sin(i / 3) * 5 + i * 0.4);
  const views = Math.max(3, base + ((i * 7) % 11));
  const inquiries = Math.max(0, Math.round(views * 0.09) + (i % 3 === 0 ? 1 : 0));
  const orders = Math.max(0, Math.round(inquiries * 0.32));
  return {
    date: d.toISOString().slice(5, 10), // MM-DD
    views,
    inquiries,
    orders,
  };
});

const sum = (k: "views" | "inquiries" | "orders") =>
  mockDaily.reduce((s, d) => s + d[k], 0);

const pct = (a: number, b: number) => (b === 0 ? 0 : Math.round((a / b) * 100));

const VendorAnalytics = () => {
  const totals = useMemo(
    () => ({ views: sum("views"), inquiries: sum("inquiries"), orders: sum("orders") }),
    []
  );

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
        <Badge variant="outline" className="text-[10px]">Preview data</Badge>
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
              <LineChart data={mockDaily} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
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

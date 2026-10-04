import {
  Wallet, Users, IndianRupee, Activity, ArrowUpRight, ArrowDownRight,
  TrendingUp, Shield, AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/services/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const revenueData = [
  { date: "Mar 1", volume: 9200000, commission: 276000 },
  { date: "Mar 2", volume: 10800000, commission: 324000 },
  { date: "Mar 3", volume: 8900000, commission: 267000 },
  { date: "Mar 4", volume: 11400000, commission: 342000 },
  { date: "Mar 5", volume: 12300000, commission: 369000 },
  { date: "Mar 6", volume: 10100000, commission: 303000 },
  { date: "Mar 7", volume: 13200000, commission: 396000 },
  { date: "Mar 8", volume: 12832450, commission: 384973 },
];

const PIE_COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))"];

const formatINRCompact = (v: number) => `₹${(v / 100000).toFixed(1)}L`;
const formatMoney = (v: number) => `₹${Number(v || 0).toLocaleString("en-IN")}`;

type TopUser = {
  user_id: string;
  name: string;
  role: string;
  total_balance: number;
  e_wallet_balance: number;
};

export default function AdminOverview({ name }: { name: string }) {
  const [adminStats, setAdminStats] = useState<any>(null);
  const [activeServices, setActiveServices] = useState<any[]>([]);
  const [timeView, setTimeView] = useState("1w");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [data, servicesData] = await Promise.all([
          apiFetch("/stats/admin").catch(() => null),
          apiFetch("/users/services").catch(() => [])
        ]);
        if (data) setAdminStats(data);
        if (servicesData) setActiveServices(servicesData);
      } catch (err) {
        console.error("Error loading admin stats:", err);
      }
    };
    fetchStats();
  }, []);

  const chartData = useMemo(() => {
    const dates = [];
    const points = timeView === "1d" ? 12 : timeView === "1w" ? 7 : 15;
    
    // Generate time labels
    for (let i = points - 1; i >= 0; i--) {
      const d = new Date();
      if (timeView === "1d") {
        d.setHours(d.getHours() - i * 2);
        dates.push(`${String(d.getHours()).padStart(2, '0')}:00`);
      } else {
        d.setDate(d.getDate() - i * (timeView === "1m" ? 2 : 1));
        dates.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
      }
    }

    const services = activeServices.length > 0 ? activeServices : [
      { serviceLabel: "POS", serviceKey: "pos" },
      { serviceLabel: "PG", serviceKey: "pg" },
      { serviceLabel: "QR", serviceKey: "qr" }
    ];

    return dates.map(dateLabel => {
      const point: any = { time: dateLabel };
      services.forEach(svc => {
        point[svc.serviceLabel] = Math.floor(Math.random() * (timeView === "1m" ? 500000 : 200000)) + 50000;
      });
      return point;
    });
  }, [activeServices, timeView]);

  const stats = useMemo(
    () => [
      {
        title: "Platform Balance",
        value: formatMoney(adminStats?.platformBalance || 0),
        change: "Live",
        positive: true,
        icon: Wallet,
      },
      {
        title: "Today's Volume",
        value: formatMoney(adminStats?.todaysVolume || 0),
        change: "Today",
        positive: true,
        icon: IndianRupee,
      },
      {
        title: "Total Users",
        value: Number(adminStats?.totalUsers || 0).toLocaleString("en-IN"),
        change: "Overall",
        positive: true,
        icon: Users,
      },
      {
        title: "Platform Success Rate",
        value: `${Number(adminStats?.successRate || 0).toFixed(2)}%`,
        change: "Live",
        positive: Number(adminStats?.successRate || 0) >= 95,
        icon: Activity,
      },
    ],
    [adminStats]
  );

  const userBreakdown = useMemo(
    () => [
      { name: "Super Distributors", value: adminStats?.userBreakdown?.super_distributor || 0 },
      { name: "Master Distributors", value: adminStats?.userBreakdown?.master_distributor || 0 },
      { name: "Distributors", value: adminStats?.userBreakdown?.distributor || 0 },
      { name: "Retailers", value: adminStats?.userBreakdown?.retailer || 0 },
    ],
    [adminStats]
  );

  const topUsers = (adminStats?.topUsers || []) as TopUser[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Welcome, {name}!</h1>
        <p className="text-sm text-muted-foreground mt-1">Full platform overview.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((card) => (
          <div key={card.title} className="p-4 sm:p-5 rounded-xl bg-gradient-card border border-border hover:border-primary/30 transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <card.icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <div className={`flex items-center gap-1 text-xs font-medium ${card.positive ? "text-success" : "text-destructive"}`}>
                {card.positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {card.change}
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-heading font-bold text-foreground">{card.value}</div>
            <div className="text-[11px] sm:text-xs text-muted-foreground mt-1">{card.title}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between border-b border-border/50">
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Service Volume Comparison
            </CardTitle>
            <Select value={timeView} onValueChange={setTimeView}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder="Select view" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1d">1 Day View</SelectItem>
                <SelectItem value="1w">Last 1 Week</SelectItem>
                <SelectItem value="1m">Last 1 Month</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-[280px] sm:h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 5, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="time" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={formatINRCompact} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} 
                    formatter={(v: number) => [formatMoney(v)]} 
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: '10px' }} />
                  {activeServices.length > 0 ? (
                    activeServices.map((svc, i) => (
                      <Bar key={svc.serviceKey} dataKey={svc.serviceLabel} name={svc.serviceLabel} fill={PIE_COLORS[i % PIE_COLORS.length]} radius={[2, 2, 0, 0]} maxBarSize={30} />
                    ))
                  ) : (
                    <>
                      <Bar dataKey="POS" fill={PIE_COLORS[0]} radius={[2, 2, 0, 0]} maxBarSize={30} />
                      <Bar dataKey="PG" fill={PIE_COLORS[1]} radius={[2, 2, 0, 0]} maxBarSize={30} />
                      <Bar dataKey="QR" fill={PIE_COLORS[2]} radius={[2, 2, 0, 0]} maxBarSize={30} />
                    </>
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" /> Top 10 Users Overall
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-muted-foreground">
                  <th className="text-left py-2 font-medium">Name</th>
                  <th className="text-left py-2 font-medium hidden sm:table-cell">Role</th>
                  <th className="text-right py-2 font-medium">Main Wallet</th>
                  <th className="text-right py-2 font-medium">E-Wallet</th>
                </tr></thead>
                <tbody>
                  {topUsers.map((u) => (
                    <tr key={u.user_id} className="border-b last:border-0">
                      <td className="py-2 font-medium text-foreground">{u.name}</td>
                      <td className="py-2 hidden sm:table-cell">
                        <Badge variant="secondary" className="capitalize">{u.role.replace(/_/g, " ")}</Badge>
                      </td>
                      <td className="py-2 text-right text-foreground">{formatMoney(u.total_balance)}</td>
                      <td className="py-2 text-right text-muted-foreground">{formatMoney(u.e_wallet_balance)}</td>
                    </tr>
                  ))}
                  {topUsers.length === 0 && (
                    <tr><td colSpan={4} className="py-4 text-center text-muted-foreground">No users found.</td></tr>
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

import {
  Wallet, IndianRupee, Activity, ArrowUpRight, ArrowDownRight,
  TrendingUp, Fingerprint, Send, Receipt, Smartphone, CheckCircle2, Clock, XCircle,
  Zap, CreditCard, FileText, Banknote, AlertTriangle, ShieldCheck,
  Landmark, Shield, Globe, Package, Plane, Heart, QrCode, Wifi,
  MonitorSmartphone, BadgeIndianRupee, HandCoins, Volume2, Loader2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/services/api";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const PIE_COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))"];

const statusIcon = { success: <CheckCircle2 className="w-3 h-3" />, pending: <Clock className="w-3 h-3" />, failed: <XCircle className="w-3 h-3" /> };
const statusVariant = { success: "default" as const, pending: "secondary" as const, failed: "destructive" as const };

const allServices = [
  { label: "AEPS", icon: Fingerprint, path: "/dashboard/aeps", bg: "bg-primary/10", color: "text-primary" },
  { label: "Remittance", icon: Send, path: "/dashboard/remittance", bg: "bg-chart-2/10", color: "text-chart-2" },
  { label: "BBPS", icon: Receipt, path: "/dashboard/bbps", bg: "bg-chart-3/10", color: "text-chart-3" },
  { label: "Recharge", icon: Smartphone, path: "/dashboard/recharge", bg: "bg-chart-4/10", color: "text-chart-4" },
  { label: "PAN Card", icon: FileText, path: "/dashboard/pan", bg: "bg-primary/10", color: "text-primary" },
  { label: "Credit Card", icon: CreditCard, path: "/dashboard/credit-card", bg: "bg-chart-2/10", color: "text-chart-2" },
  { label: "CC Bill Pay", icon: BadgeIndianRupee, path: "/dashboard/cc-bill-pay", bg: "bg-chart-3/10", color: "text-chart-3" },
  { label: "Payout", icon: HandCoins, path: "/dashboard/payout", bg: "bg-chart-4/10", color: "text-chart-4" },
  { label: "mATM", icon: MonitorSmartphone, path: "/dashboard/matm", bg: "bg-primary/10", color: "text-primary" },
  { label: "POS", icon: QrCode, path: "/dashboard/pos", bg: "bg-chart-2/10", color: "text-chart-2" },
  { label: "Insurance", icon: Heart, path: "/dashboard/insurance", bg: "bg-chart-3/10", color: "text-chart-3" },
  { label: "Loan", icon: Landmark, path: "/dashboard/loan", bg: "bg-chart-4/10", color: "text-chart-4" },
  { label: "PPI Wallet", icon: Wallet, path: "/dashboard/ppi-wallet", bg: "bg-primary/10", color: "text-primary" },
  { label: "SoundBox", icon: Volume2, path: "/dashboard/sound-box", bg: "bg-chart-2/10", color: "text-chart-2" },
  { label: "Travel", icon: Plane, path: "/dashboard/travel-booking", bg: "bg-chart-3/10", color: "text-chart-3" },
  { label: "Travel Pkg", icon: Globe, path: "/dashboard/travel-package", bg: "bg-chart-4/10", color: "text-chart-4" },
  { label: "PG", icon: Shield, path: "/dashboard/pg", bg: "bg-primary/10", color: "text-primary" },
  { label: "Bank A/C", icon: Landmark, path: "/dashboard/bank-account", bg: "bg-chart-2/10", color: "text-chart-2" },
];

export default function RetailerOverview({ name }: { name: string }) {
  const { walletBalance, eWalletBalance } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [stats, setStats] = useState({
    earningsToday: 0,
    transactionsToday: 0,
    recentTransactions: [] as any[],
  });
  const [activeServices, setActiveServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatsAndServices = async () => {
      try {
        const [statsData, servicesData] = await Promise.all([
          apiFetch("/stats/retailer").catch(() => null),
          apiFetch("/users/services").catch(() => [])
        ]);
        if (statsData) setStats(statsData);
        if (servicesData) setActiveServices(servicesData);
      } catch (err) {
        console.error("Error fetching retailer stats/services:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStatsAndServices();
  }, []);

  const statCards = [
    { title: "Main Wallet", value: `₹${walletBalance.toLocaleString("en-IN")}`, change: "Live", positive: true, icon: Wallet },
    { title: "E-wallet", value: `₹${eWalletBalance.toLocaleString("en-IN")}`, change: "Live", positive: true, icon: Zap },
    { title: "Today's Earning", value: `₹${stats.earningsToday.toLocaleString("en-IN")}`, change: "Today", positive: true, icon: IndianRupee },
    { title: "Transactions", value: stats.transactionsToday.toString(), change: "Today", positive: true, icon: Activity },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((card) => (
          <div key={card.title} className="p-4 sm:p-5 rounded-xl bg-gradient-card border border-border hover:border-primary/30 transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <card.icon className="w-5 h-5 text-primary" />
              </div>
              <Badge variant={card.positive ? "default" : "destructive"} className="text-[10px] px-1.5 h-5">
                {card.change}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground font-medium">{card.title}</p>
            <h3 className="text-lg sm:text-xl font-heading font-bold text-foreground mt-1">{card.value}</h3>
          </div>
        ))}
      </div>

      <Card className="bg-gradient-card border-border overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/50">
          <CardTitle className="text-base font-heading flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" /> Quick Services
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-9 gap-4 sm:gap-6">
            {allServices.map((svc) => {
              // Note: activeServices from API usually uses camelCase (e.g., serviceKey: "aeps") or snake_case
              // svc.path like "/dashboard/aeps" -> service key can be inferred by removing "/dashboard/"
              // Or just match by path.
              const serviceKey = svc.path.replace("/dashboard/", "");
              
              const isEnabled = activeServices.some((active) => 
                active.serviceKey === serviceKey || 
                active.service_key === serviceKey ||
                (active.routePath && active.routePath === svc.path)
              );

              const handleServiceClick = () => {
                if (isEnabled) {
                  navigate(svc.path);
                } else {
                  toast({
                    title: "Service Not Enabled",
                    description: "This service is not enabled for your account. Please contact support to get it.",
                    variant: "destructive",
                  });
                  navigate("/dashboard/support");
                }
              };

              return (
                <div key={svc.label} onClick={handleServiceClick} className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer group">
                  <div className={`w-11 h-11 rounded-xl ${svc.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <svc.icon className={`w-5 h-5 ${svc.color}`} />
                  </div>
                  <span className="text-[11px] font-medium text-foreground text-center leading-tight">{svc.label}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Earnings & Volume (Last 8 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[260px] sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={[]} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="retEarnGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}`} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`₹${v.toLocaleString("en-IN")}`]} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="volume" name="Volume" stroke="hsl(var(--chart-2))" fill="none" strokeWidth={2} strokeDasharray="5 5" />
                  <Area type="monotone" dataKey="earned" name="Earnings" stroke="hsl(var(--primary))" fill="url(#retEarnGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <Wallet className="w-4 h-4 text-primary" /> Wallet Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: "Main Wallet", value: `₹${walletBalance.toLocaleString("en-IN")}`, icon: Wallet },
                { label: "E-Wallet", value: `₹${eWalletBalance.toLocaleString("en-IN")}`, icon: Zap },
                { label: "Today's Credit", value: "₹0", icon: ArrowUpRight },
                { label: "Today's Debit", value: "₹0", icon: ArrowDownRight },
              ].map((w) => (
                <div key={w.label} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <w.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">{w.label}</p>
                    <p className="text-sm font-heading font-bold text-foreground">{w.value}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link to="/dashboard/wallet">
              <Button variant="outline" size="sm" className="w-full mt-3">
                <Banknote className="w-4 h-4 mr-2" /> Add Funds
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-primary" /> Pending Tasks & Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-center text-xs text-muted-foreground py-2 font-medium">No pending tasks</p>
            </div>
            <div className="flex gap-2 mt-4">
              <Link to="/dashboard/kyc" className="flex-1">
                <Button variant="outline" size="sm" className="w-full">
                  <ShieldCheck className="w-4 h-4 mr-1" /> Complete KYC
                </Button>
              </Link>
              <Link to="/dashboard/fund-requests" className="flex-1">
                <Button variant="outline" size="sm" className="w-full">
                  <Banknote className="w-4 h-4 mr-1" /> Fund Requests
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" /> Recent Transactions
            </CardTitle>
            <Link to="/dashboard/transactions">
              <Button variant="ghost" size="sm" className="text-xs text-primary">View All →</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-muted-foreground">
                <th className="text-left py-2 font-medium">ID</th>
                <th className="text-left py-2 font-medium">Service</th>
                <th className="text-left py-2 font-medium hidden sm:table-cell">Customer</th>
                <th className="text-right py-2 font-medium">Amount</th>
                <th className="text-right py-2 font-medium hidden sm:table-cell">Commission</th>
                <th className="text-left py-2 font-medium">Status</th>
              </tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="py-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></td></tr>
                ) : stats.recentTransactions.length === 0 ? (
                  <tr><td colSpan={6} className="py-10 text-center text-muted-foreground">No recent transactions</td></tr>
                ) : stats.recentTransactions.map((t) => (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-secondary/20 transition-colors">
                    <td className="py-3 font-mono text-xs text-primary">{t.id.slice(0, 8)}…</td>
                    <td className="py-3 capitalize text-xs font-medium">{t.serviceType}</td>
                    <td className="py-3 text-muted-foreground hidden sm:table-cell text-xs">{t.customerName || "—"}</td>
                    <td className="py-3 text-right font-bold text-foreground">₹{Number(t.amount).toLocaleString("en-IN")}</td>
                    <td className="py-3 text-right text-success hidden sm:table-cell text-xs">₹{Number(t.commission || 0).toLocaleString("en-IN")}</td>
                    <td className="py-3">
                      <Badge variant={statusVariant[t.status.toLowerCase() as keyof typeof statusVariant] || "secondary"} className="gap-1 text-[10px] uppercase font-bold py-0 h-5">
                        {statusIcon[t.status.toLowerCase() as keyof typeof statusIcon] || <Clock className="w-3 h-3" />}{t.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { QrCode, Link2, Copy, TrendingUp, IndianRupee, CheckCircle2, Clock } from "lucide-react";

const stats = [
  { label: "Total Collections", value: "₹12,45,000", icon: IndianRupee },
  { label: "Success Rate", value: "98.5%", icon: TrendingUp },
  { label: "Active Links", value: "8", icon: Link2 },
];

const paymentLinks = [
  { id: "PG01", name: "Shop Invoice #234", amount: 2500, link: "pay.genpay.in/s/abc123", status: "active", collections: 3 },
  { id: "PG02", name: "Monthly Subscription", amount: 999, link: "pay.genpay.in/s/def456", status: "active", collections: 12 },
  { id: "PG03", name: "Event Registration", amount: 500, link: "pay.genpay.in/s/ghi789", status: "expired", collections: 45 },
];

const transactions = [
  { id: "PGT01", customer: "Arjun Malhotra", method: "UPI", amount: 2500, status: "success", date: "2026-03-08 15:30" },
  { id: "PGT02", customer: "Divya Kapoor", method: "Card", amount: 999, status: "success", date: "2026-03-08 14:15" },
  { id: "PGT03", customer: "Rohit Sinha", method: "Net Banking", amount: 5000, status: "pending", date: "2026-03-08 13:45" },
];

export default function DashboardPG() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Payment Gateway</h1>
        <p className="text-sm text-muted-foreground">Integrated payment gateway for online collections.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><s.icon className="w-6 h-6 text-primary" /></div>
              <div><p className="text-2xl font-bold text-foreground">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Create Payment Link</CardTitle>
            <CardDescription>Generate a shareable payment link or QR code.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label>Payment Title</Label><Input placeholder="e.g. Invoice #234" /></div>
            <div className="space-y-2"><Label>Amount (₹)</Label><Input type="number" placeholder="Collection amount" /></div>
            <div className="space-y-2"><Label>Customer Email / Mobile</Label><Input placeholder="For sending link" /></div>
            <div className="flex gap-2">
              <Button className="flex-1"><Link2 className="w-4 h-4 mr-2" /> Create Link</Button>
              <Button variant="outline" className="flex-1"><QrCode className="w-4 h-4 mr-2" /> Generate QR</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Payment Links</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {paymentLinks.map((pl) => (
                <div key={pl.id} className="p-3 rounded-lg border">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-foreground text-sm">{pl.name}</p>
                    <Badge variant={pl.status === "active" ? "default" : "secondary"}>{pl.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">₹{pl.amount} • {pl.collections} collections</p>
                  <div className="flex items-center gap-2 mt-2 p-1.5 bg-muted/50 rounded text-xs font-mono text-muted-foreground">
                    <span className="truncate flex-1">{pl.link}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6"><Copy className="w-3 h-3" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Recent Transactions</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-muted-foreground">
                <th className="text-left py-2 font-medium">Customer</th>
                <th className="text-left py-2 font-medium">Method</th>
                <th className="text-right py-2 font-medium">Amount</th>
                <th className="text-left py-2 font-medium">Status</th>
                <th className="text-left py-2 font-medium">Time</th>
              </tr></thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id} className="border-b last:border-0">
                    <td className="py-2 font-medium">{t.customer}</td>
                    <td className="py-2"><Badge variant="outline">{t.method}</Badge></td>
                    <td className="py-2 text-right font-medium">₹{t.amount.toLocaleString("en-IN")}</td>
                    <td className="py-2">
                      <Badge variant={t.status === "success" ? "default" : "secondary"} className="gap-1">
                        {t.status === "success" ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}{t.status}
                      </Badge>
                    </td>
                    <td className="py-2 text-xs text-muted-foreground">{t.date}</td>
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

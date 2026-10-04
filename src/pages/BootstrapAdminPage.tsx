import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, Link } from "react-router-dom";
import { apiFetch } from "@/services/api";
import usePageTitle from "@/hooks/usePageTitle";

export default function BootstrapAdminPage() {
  usePageTitle("GenPay | Bootstrap Admin");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleBootstrap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName) return;
    setLoading(true);
    try {
      const res = await apiFetch("/auth/bootstrap-admin", {
        method: "POST",
        body: JSON.stringify({ email, password, full_name: fullName, secret: "genpay-bootstrap-2026" }),
      });
      if (res.error) throw new Error(res.error);
      toast({ title: "Admin created!", description: "You can now log in with these credentials." });
      navigate("/login");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <div className="bg-gradient-glow fixed inset-0 pointer-events-none" />
      <div className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
              <Zap className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="font-heading text-2xl font-bold text-foreground">GenPay</span>
          </Link>
          <p className="text-muted-foreground text-sm">One-time setup: Create the first admin account</p>
        </div>

        <form onSubmit={handleBootstrap} className="rounded-2xl bg-gradient-card border border-border p-8 space-y-5 shadow-elevated">
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-primary">
            <ShieldCheck className="w-4 h-4 inline mr-1.5" />
            This page only works once — to create the very first admin. After that it's locked.
          </div>
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input placeholder="Admin Name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" placeholder="admin@genpay.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Password</Label>
            <Input type="password" placeholder="Min 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </div>
          <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground font-semibold" disabled={loading}>
            <ShieldCheck className="w-4 h-4 mr-2" />
            {loading ? "Creating..." : "Create Admin Account"}
          </Button>
        </form>
      </div>
    </div>
  );
}

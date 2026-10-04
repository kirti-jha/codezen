import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiFetch, setAuthSession } from "@/services/api";
import usePageTitle from "@/hooks/usePageTitle";

export default function SignupPage() {
  usePageTitle("GenPay | Sign Up");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await apiFetch("/auth/signup", {
        method: "POST",
        body: JSON.stringify({ full_name: fullName, email, password }),
      });
      setAuthSession(data.access_token, data.user);
      toast({
        title: "Account created!",
        description: "Your account is ready. You are now logged in.",
      });
      navigate("/dashboard");
    } catch (err: any) {
      toast({ title: "Signup failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <div className="bg-gradient-glow fixed inset-0 pointer-events-none" />
      <div className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center mb-4">
            <span className="font-extrabold text-3xl tracking-tight text-primary">GenPay</span>
          </Link>
          <p className="text-muted-foreground text-sm">Create your GenPay account</p>
        </div>

        <form onSubmit={handleSignup} className="rounded-2xl bg-gradient-card border border-border p-8 space-y-5 shadow-elevated">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              type="text"
              placeholder="Rajesh Kumar"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="bg-secondary/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-secondary/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Min 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="bg-secondary/50 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            After signup, an admin will assign your role in the hierarchy.
          </p>
          <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground font-semibold" disabled={loading}>
            {loading ? "Creating account..." : "Create Account"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

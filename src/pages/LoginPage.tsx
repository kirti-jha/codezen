import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap, Eye, EyeOff, LogIn, ArrowLeft, KeyRound, ShieldCheck, Mail, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiFetch, setAuthSession } from "@/services/api";
import usePageTitle from "@/hooks/usePageTitle";
type ForgotStep = "idle" | "identity" | "otp" | "new_password" | "done";

export default function LoginPage() {
  usePageTitle("GenPay | Login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // Forgot password state
  const [forgotStep, setForgotStep] = useState<ForgotStep>("idle");
  const [fpEmail, setFpEmail] = useState("");
  const [fpAadhaarLast4, setFpAadhaarLast4] = useState("");
  const [fpOtp, setFpOtp] = useState("");
  const [fpNewPassword, setFpNewPassword] = useState("");
  const [fpConfirmPassword, setFpConfirmPassword] = useState("");
  const [fpShowNew, setFpShowNew] = useState(false);
  const [fpShowConfirm, setFpShowConfirm] = useState(false);
  const [fpResetToken, setFpResetToken] = useState("");
  const [fpLoading, setFpLoading] = useState(false);
  const [fpDemoOtp, setFpDemoOtp] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setAuthSession(data.access_token, data.user);
      const next = searchParams.get("next");
      if (next && next.startsWith("/") && !next.startsWith("//")) {
        navigate(next);
      } else {
        navigate("/dashboard");
      }
    } catch (err: any) {
      toast({ title: "Login failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fpEmail || fpAadhaarLast4.length !== 4) {
      toast({ title: "Invalid input", description: "Enter your email and last 4 digits of Aadhaar.", variant: "destructive" });
      return;
    }
    setFpLoading(true);
    try {
      const res = await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ action: "verify_identity", email: fpEmail, aadhaar_last4: fpAadhaarLast4 }),
      });
      if (res.error) throw new Error(res.error);
      // For demo, show OTP hint
      if (res?._demo_otp) setFpDemoOtp(res._demo_otp);
      toast({ title: "OTP Sent", description: res?.otp_hint || "Check your registered email for OTP." });
      setForgotStep("otp");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setFpLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fpOtp.length !== 6) {
      toast({ title: "Invalid OTP", description: "Enter the 6-digit OTP.", variant: "destructive" });
      return;
    }
    setFpLoading(true);
    try {
      const res = await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ action: "verify_otp", email: fpEmail, otp: fpOtp }),
      });
      if (res.error) throw new Error(res.error);
      setFpResetToken(res.reset_token);
      toast({ title: "OTP Verified", description: "You can now set a new password." });
      setForgotStep("new_password");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setFpLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fpNewPassword.length < 6) {
      toast({ title: "Weak password", description: "Must be at least 6 characters.", variant: "destructive" });
      return;
    }
    if (fpNewPassword !== fpConfirmPassword) {
      toast({ title: "Mismatch", description: "Passwords do not match.", variant: "destructive" });
      return;
    }
    setFpLoading(true);
    try {
      const res = await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ action: "reset_password", email: fpEmail, reset_token: fpResetToken, new_password: fpNewPassword }),
      });
      if (res.error) throw new Error(res.error);
      toast({ title: "Password Reset!", description: "You can now login with your new password." });
      setForgotStep("done");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setFpLoading(false);
    }
  };

  const resetForgotState = () => {
    setForgotStep("idle");
    setFpEmail("");
    setFpAadhaarLast4("");
    setFpOtp("");
    setFpNewPassword("");
    setFpConfirmPassword("");
    setFpResetToken("");
    setFpDemoOtp("");
  };

  const renderForgotPassword = () => {
    if (forgotStep === "identity") {
      return (
        <form onSubmit={handleVerifyIdentity} className="rounded-2xl bg-gradient-card border border-border p-8 space-y-5 shadow-elevated">
          <div className="text-center mb-2">
            <ShieldCheck className="w-10 h-10 text-primary mx-auto mb-2" />
            <h2 className="font-heading text-lg font-bold text-foreground">Verify Identity</h2>
            <p className="text-xs text-muted-foreground mt-1">Enter your registered email and Aadhaar details</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fp-email">Registered Email</Label>
            <Input
              id="fp-email" type="email" placeholder="you@example.com"
              value={fpEmail} onChange={(e) => setFpEmail(e.target.value)}
              required className="bg-secondary/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fp-aadhaar">Last 4 Digits of Aadhaar Number</Label>
            <Input
              id="fp-aadhaar" type="text" placeholder="e.g. 1234" maxLength={4}
              value={fpAadhaarLast4}
              onChange={(e) => setFpAadhaarLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
              required className="bg-secondary/50"
            />
            <p className="text-[10px] text-muted-foreground">The Aadhaar number registered with your account</p>
          </div>
          <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground font-semibold" disabled={fpLoading}>
            <Mail className="w-4 h-4 mr-2" />
            {fpLoading ? "Verifying..." : "Send OTP"}
          </Button>
          <button type="button" onClick={resetForgotState} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mx-auto">
            <ArrowLeft className="w-3 h-3" /> Back to Login
          </button>
        </form>
      );
    }

    if (forgotStep === "otp") {
      return (
        <form onSubmit={handleVerifyOtp} className="rounded-2xl bg-gradient-card border border-border p-8 space-y-5 shadow-elevated">
          <div className="text-center mb-2">
            <KeyRound className="w-10 h-10 text-primary mx-auto mb-2" />
            <h2 className="font-heading text-lg font-bold text-foreground">Enter OTP</h2>
            <p className="text-xs text-muted-foreground mt-1">
              A 6-digit OTP has been sent to {fpEmail.replace(/(.{2})(.*)(@.*)/, "$1***$3")}
            </p>
          </div>
          {fpDemoOtp && (
            <div className="p-3 rounded-lg border border-dashed border-primary/30 bg-primary/5 text-xs text-center">
              <span className="text-muted-foreground">Demo OTP: </span>
              <span className="font-mono font-bold text-foreground text-sm">{fpDemoOtp}</span>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="fp-otp">6-Digit OTP</Label>
            <Input
              id="fp-otp" type="text" placeholder="000000" maxLength={6}
              value={fpOtp}
              onChange={(e) => setFpOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              required className="bg-secondary/50 text-center text-lg tracking-[0.5em] font-mono"
            />
          </div>
          <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground font-semibold" disabled={fpLoading || fpOtp.length !== 6}>
            {fpLoading ? "Verifying..." : "Verify OTP"}
          </Button>
          <button type="button" onClick={() => setForgotStep("identity")} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mx-auto">
            <ArrowLeft className="w-3 h-3" /> Back
          </button>
        </form>
      );
    }

    if (forgotStep === "new_password") {
      return (
        <form onSubmit={handleResetPassword} className="rounded-2xl bg-gradient-card border border-border p-8 space-y-5 shadow-elevated">
          <div className="text-center mb-2">
            <KeyRound className="w-10 h-10 text-primary mx-auto mb-2" />
            <h2 className="font-heading text-lg font-bold text-foreground">Set New Password</h2>
            <p className="text-xs text-muted-foreground mt-1">Choose a strong new password for your account</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fp-new">New Password</Label>
            <div className="relative">
              <Input
                id="fp-new" type={fpShowNew ? "text" : "password"} placeholder="••••••••"
                value={fpNewPassword} onChange={(e) => setFpNewPassword(e.target.value)}
                required minLength={6} className="bg-secondary/50 pr-10"
              />
              <button type="button" onClick={() => setFpShowNew(!fpShowNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {fpShowNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {fpNewPassword && fpNewPassword.length < 6 && (
              <p className="text-xs text-destructive">Must be at least 6 characters</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="fp-confirm">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="fp-confirm" type={fpShowConfirm ? "text" : "password"} placeholder="••••••••"
                value={fpConfirmPassword} onChange={(e) => setFpConfirmPassword(e.target.value)}
                required className="bg-secondary/50 pr-10"
              />
              <button type="button" onClick={() => setFpShowConfirm(!fpShowConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {fpShowConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {fpConfirmPassword && fpNewPassword !== fpConfirmPassword && (
              <p className="text-xs text-destructive">Passwords do not match</p>
            )}
          </div>
          <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground font-semibold"
            disabled={fpLoading || fpNewPassword.length < 6 || fpNewPassword !== fpConfirmPassword}>
            {fpLoading ? "Resetting..." : "Reset Password"}
          </Button>
        </form>
      );
    }

    if (forgotStep === "done") {
      return (
        <div className="rounded-2xl bg-gradient-card border border-border p-8 space-y-5 shadow-elevated text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <h2 className="font-heading text-lg font-bold text-foreground">Password Reset Successful!</h2>
          <p className="text-sm text-muted-foreground">You can now login with your new password.</p>
          <Button onClick={resetForgotState} className="w-full bg-gradient-primary text-primary-foreground font-semibold">
            <LogIn className="w-4 h-4 mr-2" /> Back to Login
          </Button>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-4 right-4 z-50">
      </div>

      {/* 1. Grid & Mesh Layer */}
      <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" />
      <div className="absolute inset-0 bg-mesh pointer-events-none" />
      
      {/* 2. Parallax Floating Elements */}
      <div className="absolute top-[10%] left-[5%] w-64 h-64 bg-primary/20 rounded-full blur-[100px] animate-blob pointer-events-none" />
      <div className="absolute bottom-[10%] right-[5%] w-80 h-80 bg-accent/20 rounded-full blur-[120px] animate-blob pointer-events-none animation-delay-2000" />
      <div className="absolute top-[40%] right-[15%] w-32 h-32 bg-primary/10 rounded-full blur-[60px] animate-blob pointer-events-none animation-delay-4000" />
      
      {/* 3. Small Sharp Particles */}
      <div className="absolute top-[20%] left-[20%] w-3 h-3 bg-primary/40 rounded-full blur-sm animate-float" />
      <div className="absolute bottom-[30%] right-[25%] w-2 h-2 bg-accent/40 rounded-full blur-sm animate-float animation-delay-2000" />
      <div className="absolute top-[60%] left-[40%] w-4 h-4 bg-primary/20 rounded-full blur-sm animate-float animation-delay-4000" />

      <div className="bg-gradient-glow fixed inset-0 pointer-events-none" />
      
      <div className="w-full max-w-md relative z-10">
        {/* Logo & Header with entry animation */}
        <div className="text-center mb-10 animate-in fade-in slide-in-from-top-10 duration-1000">
          <Link to="/" className="inline-flex items-center mb-6">
            <span className="font-black text-4xl tracking-tighter text-primary">GenPay</span>
          </Link>
          <h2 className="text-3xl font-heading font-black text-foreground tracking-tighter sm:text-4xl text-gradient-primary">
            {forgotStep === "idle" ? "GenPay" : "Reset Access"}
          </h2>
          <p className="text-muted-foreground text-sm mt-3 font-medium tracking-wide uppercase opacity-80">
            {forgotStep === "idle" ? "Secure Partner Portal" : "Identity Verification"}
          </p>
        </div>

        {forgotStep !== "idle" ? (
          <div className="animate-in fade-in zoom-in-95 duration-500">
            {renderForgotPassword()}
          </div>
        ) : (
          <form onSubmit={handleLogin} className="glass-premium rounded-3xl border border-white/10 p-8 sm:p-10 space-y-8 shadow-elevated relative overflow-hidden animate-in fade-in slide-in-from-bottom-10 duration-1000">
            {/* Inner Glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 blur-3xl pointer-events-none" />
            
            <div className="space-y-6">
              {/* Field 1: Email */}
              <div className="space-y-2 animate-in fade-in slide-in-from-left-5 duration-700 delay-100">
                <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-[0.2em] ml-1 opacity-60">
                  Identification / Email
                </Label>
                <div className="relative group">
                  <Input
                    id="email" type="email" placeholder="partner@genpay.com"
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    required className="bg-white/[0.03] border-white/5 h-12 rounded-xl focus:bg-white/[0.07] focus:border-primary/50 transition-all duration-300 placeholder:opacity-30"
                  />
                  <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-primary group-focus-within:w-full transition-all duration-500" />
                </div>
              </div>

              {/* Field 2: Password */}
              <div className="space-y-2 animate-in fade-in slide-in-from-left-5 duration-700 delay-200">
                <div className="flex items-center justify-between ml-1">
                  <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">
                    Security Key
                  </Label>
                  <button
                    type="button"
                    onClick={() => setForgotStep("identity")}
                    className="text-[10px] text-primary hover:text-white font-bold uppercase tracking-wider transition-colors"
                  >
                    Recover?
                  </button>
                </div>
                <div className="relative group">
                  <Input
                    id="password" type={showPassword ? "text" : "password"} placeholder="••••••••••••"
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    required className="bg-white/[0.03] border-white/5 h-12 rounded-xl pr-12 focus:bg-white/[0.07] focus:border-primary/50 transition-all duration-300 placeholder:opacity-30"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                  <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-primary group-focus-within:w-full transition-all duration-500" />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="animate-in fade-in slide-in-from-bottom-5 duration-700 delay-300">
              <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground font-black h-14 rounded-2xl shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-all relative overflow-hidden group/btn" disabled={loading}>
                <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5 mr-3 group-hover/btn:translate-x-1 transition-transform" />
                    Authorized Sign In
                  </>
                )}
              </Button>
            </div>
            
            {/* Footer */}
            <div className="pt-6 border-t border-white/5 animate-in fade-in duration-1000 delay-400">
              <p className="text-center text-[10px] text-muted-foreground leading-relaxed font-medium uppercase tracking-widest opacity-40">
                Restricted Access System<br />
                © 2026 GENPAY DIGITAL SOLUTIONS
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

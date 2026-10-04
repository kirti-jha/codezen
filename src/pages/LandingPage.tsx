import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MARKETING_SERVICES } from "@/data/services";
import usePageTitle from "@/hooks/usePageTitle";
import { apiFetch } from "@/services/api";
import {
  Zap,
  Shield,
  Users,
  ArrowRight,
  ChevronRight,
  CheckCircle2,
  Link2,
  Layers,
  ChevronDown,
} from "lucide-react";


const features = [
  "Multi-level distribution hierarchy",
  "Real-time dual wallet system",
  "Automated KYC verification",
  "Role-based access control",
  "Live transaction monitoring",
  "Instant fund settlements",
];

const stats = [
  { value: "Rs 500Cr+", label: "Monthly Volume" },
  { value: "50K+", label: "Active Retailers" },
  { value: "99.9%", label: "Uptime SLA" },
  { value: "<2s", label: "Avg Settlement" },
];

export default function LandingPage() {
  usePageTitle("GenPay | Home");

  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMobile, setContactMobile] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [contactSending, setContactSending] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [contactSuccess, setContactSuccess] = useState<string | null>(null);

  async function submitContact(e: FormEvent) {
    e.preventDefault();
    if (contactSending) return;

    setContactError(null);
    setContactSuccess(null);
    setContactSending(true);
    try {
      await apiFetch("/public/contact", {
        method: "POST",
        body: JSON.stringify({
          name: contactName,
          email: contactEmail,
          mobile: contactMobile,
          message: contactMessage,
        }),
      });
      setContactSuccess("Thanks! Your query has been sent to sales@genpay.com.");
      setContactName("");
      setContactEmail("");
      setContactMobile("");
      setContactMessage("");
    } catch (err: any) {
      setContactError(err?.message || "Failed to send. Please try again.");
    } finally {
      setContactSending(false);
    }
  }

  return (
    <div id="top" className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-primary border-b border-primary/20 shadow-lg">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link to="/" className="flex items-center">
            <span className="font-extrabold text-2xl tracking-tight text-black">GenPay</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <a href="#stats" className="text-sm font-bold text-black hover:opacity-80 transition-opacity">About Us</a>
            
            {/* Services Mega Menu */}
            <div className="group relative">
              <button className="flex items-center gap-1 text-sm font-bold text-black hover:opacity-80 transition-opacity h-16">
                Services <ChevronDown className="w-4 h-4 transition-transform group-hover:rotate-180" />
              </button>
              
              <div className="absolute top-full left-1/2 -translate-x-1/2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <div className="w-[800px] max-h-[80vh] overflow-y-auto bg-card border border-border rounded-xl shadow-elevated p-6 grid grid-cols-2 md:grid-cols-3 gap-4">
                  {MARKETING_SERVICES.map((svc) => (
                    <Link key={svc.key} to="/login" className="flex items-start gap-3 hover:bg-secondary/50 p-2 rounded-lg transition-colors group/item">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover/item:bg-primary group-hover/item:text-primary-foreground transition-colors">
                        <svc.icon className="w-5 h-5 text-primary group-hover/item:text-white transition-colors" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-foreground group-hover/item:text-primary transition-colors">{svc.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{svc.description}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <Link to="/blogs" className="text-sm font-bold text-black hover:opacity-80 transition-opacity">Blogs</Link>
            <a href="#contact" className="text-sm font-bold text-black hover:opacity-80 transition-opacity">Contact Us</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button className="bg-black text-white hover:bg-black/80 font-bold" size="sm">Login</Button>
            </Link>
            <Button asChild variant="hero" size="sm">
              <a href="#contact">Get Started</a>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden bg-gradient-hero">
        <div className="absolute inset-0 bg-gradient-glow" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-sm mb-8">
              <Zap className="w-3.5 h-3.5" />
              India's Next-Gen B2B FinTech Platform
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-bold leading-tight mb-6 text-foreground">
              Power Your Business with{" "}
              <span className="text-gradient-primary">Instant Financial</span>{" "}
              Services
            </h1>
            <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
              AEPS, BBPS, Payouts - everything your distribution network needs.
              Real-time settlements. Enterprise-grade security. Zero downtime.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/login">
                <Button variant="hero" size="lg" className="text-base px-8">
                  Start Earning Today
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
              <a href="#features">
                <Button variant="hero-outline" size="lg" className="text-base px-8">
                  Explore Features
                </Button>
              </a>
            </div>
          </div>

          {/* Stats bar */}
          <div id="stats" className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {stats.map((s) => (
              <div key={s.label} className="text-center p-6 rounded-xl bg-card/50 border border-border">
                <div className="text-2xl sm:text-3xl font-heading font-bold text-gradient-primary">{s.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 bg-gradient-hero">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-center max-w-6xl mx-auto">
            <div>
              <h2 className="text-3xl sm:text-4xl font-heading font-bold text-foreground mb-6">
                Built for <span className="text-gradient-primary">Scale & Security</span>
              </h2>
              <p className="text-muted-foreground mb-8">
                Enterprise-grade infrastructure with multi-level access control, real-time monitoring, and automated compliance - designed for India's largest distribution networks.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                {features.map((f) => (
                  <div key={f} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                    <span className="text-sm text-foreground">{f}</span>
                  </div>
                ))}
              </div>
              <Link to="/login" className="inline-block mt-8">
                <Button variant="hero" size="lg">
                  Access Dashboard
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
            <div className="relative">
              <div className="rounded-2xl bg-gradient-card border border-border p-8 shadow-elevated">
                <div className="flex items-center gap-3 mb-6">
                  <Shield className="w-8 h-8 text-primary" />
                  <div>
                    <div className="font-heading font-semibold text-foreground">Security First</div>
                    <div className="text-sm text-muted-foreground">JWT + 2FA + RBAC</div>
                  </div>
                </div>
                <div className="space-y-3">
                  {["KYC Engine with Aadhaar & PAN verification", "Role-based multi-tier hierarchy", "Encrypted wallets with audit trail", "Real-time fraud detection"].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-sm text-secondary-foreground bg-secondary/50 rounded-lg px-4 py-3">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
              <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-primary/10 blur-2xl animate-pulse-glow" />
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center p-12 rounded-2xl border border-primary/20 bg-gradient-card relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-glow opacity-50" />
            <div className="relative z-10">
              <Users className="w-12 h-12 text-primary mx-auto mb-6" />
              <h2 className="text-3xl font-heading font-bold text-foreground mb-4">
                Ready to Scale Your Business?
              </h2>
              <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
                Join thousands of distributors and retailers already using GenPay to power their financial services network.
              </p>
              <Button asChild variant="hero" size="lg" className="text-base px-10">
                <a href="#contact">
                  Get Started Now
                  <ArrowRight className="w-4 h-4 ml-1" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-20 bg-gradient-hero scroll-mt-24">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="max-w-2xl">
              <h2 className="text-3xl sm:text-4xl font-heading font-bold text-foreground">
                Contact <span className="text-gradient-primary">Us</span>
              </h2>
              <p className="text-muted-foreground mt-3">
                Reach out for onboarding, pricing, and integration support.
              </p>
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-2 items-start">
              <div className="rounded-2xl border border-border bg-gradient-card p-6 shadow-elevated">
                <div className="text-sm text-muted-foreground">Call Us</div>
                <a className="text-foreground font-medium mt-1 inline-block hover:underline font-mono" href="tel:+9118001234567">
                  +91 1800 123 4567 (Toll-Free)
                </a>
                <div className="h-px bg-border my-5" />
                <div className="text-sm text-muted-foreground">Email Us</div>
                <a className="text-foreground font-medium mt-1 inline-block hover:underline font-mono" href="mailto:support@genpay.com">
                  support@genpay.com
                </a>
                <div className="h-px bg-border my-5" />
                <div className="text-sm text-muted-foreground">Visit Us</div>
                <div className="text-foreground font-medium mt-1 leading-relaxed">
                  GenPay Fintech Tower, Cyber City,<br />
                  Phase 2, Sector 44, Gurugram,<br />
                  Haryana - 122002
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-gradient-card p-6 shadow-elevated">
                <div className="text-sm text-muted-foreground">Send a query</div>
                <form onSubmit={submitContact} className="mt-4 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="Name"
                      required
                    />
                    <Input
                      value={contactMobile}
                      onChange={(e) => setContactMobile(e.target.value)}
                      placeholder="Mobile"
                      inputMode="tel"
                      required
                    />
                  </div>
                  <Input
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="Email"
                    type="email"
                    required
                  />
                  <Textarea
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    placeholder="Message / Query"
                    required
                    rows={5}
                  />
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <Button type="submit" variant="hero" size="sm" disabled={contactSending}>
                      {contactSending ? "Sending..." : "Send"}
                    </Button>
                    <div className="text-xs text-muted-foreground">Sent to sales@genpay.com</div>
                  </div>
                  {contactError ? <div className="text-xs text-red-500">{contactError}</div> : null}
                  {contactSuccess ? <div className="text-xs text-emerald-600">{contactSuccess}</div> : null}
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-100 font-bold">
        <div className="container mx-auto px-4 py-16">
          <div className="grid gap-10 lg:grid-cols-3 items-start">
            <div>
              <div className="flex items-center gap-3">
                <span className="font-extrabold text-2xl tracking-tight text-white">GenPay</span>
              </div>
              <p className="mt-5 text-sm text-slate-300 leading-relaxed max-w-sm">
                GenPay delivers secure fintech, payments, and digital financial solutions.
              </p>
              <Link to="/about" className="mt-4 inline-flex items-center text-sm font-medium text-teal-300 hover:text-teal-200">
                Read more <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <Link2 className="w-5 h-5 text-teal-300" />
                <h3 className="text-2xl font-heading font-bold">Quick link</h3>
              </div>
              <div className="mt-5 border-t border-slate-700/70">
                <a
                  href="#top"
                  className="flex items-center justify-between gap-3 py-3 border-b border-slate-700/70 text-slate-200 hover:text-white transition-colors"
                >
                  <span className="text-sm">Home</span>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </a>
                {[
                  { label: "Refund Policy", to: "/refund-policy" },
                  { label: "Privacy Policy", to: "/privacy-policy" },
                  { label: "Terms & Conditions", to: "/terms" },
                ].map((l) => (
                  <Link
                    key={l.label}
                    to={l.to}
                    className="flex items-center justify-between gap-3 py-3 border-b border-slate-700/70 text-slate-200 hover:text-white transition-colors"
                  >
                    <span className="text-sm">{l.label}</span>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-teal-300" />
                <h3 className="text-2xl font-heading font-bold">Services</h3>
              </div>
              <div className="mt-5 border-t border-slate-700/70 pt-4">
                <div className="grid grid-cols-2 gap-x-6">
                  {MARKETING_SERVICES.map((svc) => (
                    <Link
                      key={svc.key}
                      to={`/services/${svc.key}`}
                      className="py-2 text-sm text-slate-200 hover:text-white transition-colors"
                    >
                      {svc.title}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-700/70">
          <div className="container mx-auto px-4 py-6 text-center text-sm text-slate-400">
            (c) 2025 GenPay. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

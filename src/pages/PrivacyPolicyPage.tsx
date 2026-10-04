import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import usePageTitle from "@/hooks/usePageTitle";
import { PRIVACY_POLICY_GRIEVANCE, PRIVACY_POLICY_SECTIONS } from "@/data/privacyPolicy";

export default function PrivacyPolicyPage() {
  usePageTitle("GenPay | Privacy Policy");

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container mx-auto px-4 pt-28 pb-16">
        <div className="flex items-center justify-between gap-4">
          <Link to="/" className="inline-flex items-center">
            <span className="font-extrabold text-2xl tracking-tight text-primary">GenPay</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/services">
              <Button variant="hero-outline" size="sm">Services</Button>
            </Link>
            <Link to="/login">
              <Button variant="hero" size="sm">Login</Button>
            </Link>
          </div>
        </div>

        <div className="mt-10 mx-auto max-w-6xl">
          <h1 className="text-4xl sm:text-5xl font-heading font-bold text-foreground">
            Privacy Policy
          </h1>
          <p className="text-muted-foreground mt-3">
            This page describes how GenPay collects, uses, shares, and protects personal information.
          </p>

          <div className="mt-8 rounded-2xl border border-border bg-gradient-card p-8 sm:p-10 shadow-elevated">
            <ol className="space-y-7">
              {PRIVACY_POLICY_SECTIONS.map((s) => (
                <li key={s.id}>
                  <div className="font-heading font-bold text-foreground">
                    {s.id}. {s.title}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">{s.subtitle}</div>
                  <ul className="mt-3 list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                    {s.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>

            <div className="mt-10 rounded-2xl border border-primary/20 bg-primary/5 p-6">
              <div className="font-heading font-bold text-foreground">{PRIVACY_POLICY_GRIEVANCE.heading}</div>
              <div className="mt-2 text-sm text-muted-foreground leading-relaxed">{PRIVACY_POLICY_GRIEVANCE.intro}</div>
              <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3 text-sm">
                <a className="text-foreground font-medium hover:underline" href={`mailto:${PRIVACY_POLICY_GRIEVANCE.email}`}>
                  {PRIVACY_POLICY_GRIEVANCE.email}
                </a>
                <span className="hidden sm:inline text-muted-foreground">•</span>
                <a className="text-foreground font-medium hover:underline" href={`tel:${PRIVACY_POLICY_GRIEVANCE.phone}`}>
                  {PRIVACY_POLICY_GRIEVANCE.phone}
                </a>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {PRIVACY_POLICY_GRIEVANCE.badges.map((b) => (
                  <span key={b} className="text-xs rounded-full border border-border bg-background/50 px-3 py-1 text-muted-foreground">
                    {b}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

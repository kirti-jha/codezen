import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ABOUT_ABHEEPAY } from "@/data/about";
import usePageTitle from "@/hooks/usePageTitle";

export default function AboutPage() {
  usePageTitle("GenPay | About Us");

  const { coreValues, highlights, missionVision, paragraphs, stats, subheading } = ABOUT_ABHEEPAY;

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
            About <span className="text-gradient-primary">GenPay</span>
          </h1>
          <p className="text-muted-foreground mt-4 leading-relaxed max-w-3xl">
            {subheading}
          </p>

          <div className="mt-8 rounded-2xl border border-border bg-gradient-card p-8 sm:p-10 shadow-elevated">
            <div className="grid lg:grid-cols-2 gap-8 items-start">
              <div>
                {paragraphs.map((p) => (
                  <p key={p} className="text-muted-foreground leading-relaxed mt-4 first:mt-0">
                    {p}
                  </p>
                ))}
                <div className="mt-6 grid sm:grid-cols-2 gap-3">
                  {highlights.map((h) => (
                    <div
                      key={h}
                      className="flex items-center gap-2 rounded-xl border border-border bg-secondary/10 px-4 py-3"
                    >
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <div className="text-sm text-foreground font-medium">{h}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {stats.map((s) => (
                  <div key={s.label} className="rounded-2xl border border-border bg-background/40 p-5 text-center">
                    <div className="text-2xl sm:text-3xl font-heading font-bold text-gradient-primary">{s.value}</div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground mt-2">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-10 grid gap-4 lg:grid-cols-2">
              {[missionVision.mission, missionVision.vision].map((mv) => (
                <div key={mv.title} className="rounded-2xl border border-border bg-secondary/10 p-6">
                  <div className="font-heading font-bold text-foreground">{mv.title}</div>
                  <div className="mt-2 text-foreground font-medium">{mv.quote}</div>
                  <div className="mt-3 text-sm text-muted-foreground leading-relaxed">{mv.description}</div>
                </div>
              ))}
            </div>

            <div className="mt-10">
              <div className="font-heading font-bold text-foreground text-xl">Our Core Values</div>
              <div className="text-sm text-muted-foreground mt-1">
                Built on the foundation of trust, innovation, and excellence
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {coreValues.map((v) => (
                  <div key={v.title} className="rounded-2xl border border-border bg-background/40 p-6">
                    <div className="font-heading font-bold text-foreground">{v.title}</div>
                    <div className="text-sm text-muted-foreground mt-2">{v.description}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col sm:flex-row gap-3">
            <Link to="/">
              <Button variant="hero-outline">Back to Home</Button>
            </Link>
            <Link to="/services">
              <Button variant="hero">Explore Services</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

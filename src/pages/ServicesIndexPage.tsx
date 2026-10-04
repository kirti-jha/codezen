import { Link } from "react-router-dom";
import { MARKETING_SERVICES } from "@/data/services";
import { Button } from "@/components/ui/button";
import usePageTitle from "@/hooks/usePageTitle";

export default function ServicesIndexPage() {
  usePageTitle("GenPay | Services");

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container mx-auto px-4 pt-28 pb-16">
        <div className="max-w-3xl">
          <h1 className="text-4xl sm:text-5xl font-heading font-bold text-foreground">
            Services
          </h1>
          <p className="text-muted-foreground mt-3">
            Explore our full stack of financial services built for distribution networks.
          </p>
          <div className="mt-6 flex gap-3">
            <Link to="/login">
              <Button variant="hero">Login</Button>
            </Link>
            <Link to="/">
              <Button variant="hero-outline">Back to Home</Button>
            </Link>
          </div>
        </div>

        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {MARKETING_SERVICES.map((svc) => (
            <Link
              key={svc.key}
              to={`/services/${svc.key}`}
              className="group rounded-2xl border border-border bg-gradient-card p-6 shadow-elevated hover:shadow-lg transition-shadow"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <svc.icon className="w-6 h-6 text-primary" />
              </div>
              <h2 className="mt-4 font-heading font-bold text-foreground text-lg">
                {svc.title}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {svc.description}
              </p>
              <div className="mt-4 text-sm font-medium text-primary opacity-80 group-hover:opacity-100">
                Learn more &gt;
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}


import { Link } from "react-router-dom";
import ComingSoon from "@/components/ComingSoon";
import { Button } from "@/components/ui/button";
import usePageTitle from "@/hooks/usePageTitle";

export default function TermsPage() {
  usePageTitle("GenPay | Terms & Conditions");

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

        <ComingSoon
          title="Terms & Conditions"
          description="Share the terms text and I'll publish it here with proper formatting."
        />
      </div>
    </div>
  );
}

import { Link } from "react-router-dom";
import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import usePageTitle from "@/hooks/usePageTitle";

export default function UnauthorizedPage() {
  usePageTitle("GenPay | Access Denied");

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <ShieldX className="w-16 h-16 text-destructive mx-auto" />
        <h1 className="text-2xl font-heading font-bold text-foreground">Access Denied</h1>
        <p className="text-muted-foreground max-w-md">
          You don't have permission to access this page. Contact your administrator if you believe this is an error.
        </p>
        <Button asChild variant="outline">
          <Link to="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}

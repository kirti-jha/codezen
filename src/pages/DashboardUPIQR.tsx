import { LayoutDashboard, QrCode } from "lucide-react";

export default function DashboardUPIQR() {
  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">UPI QR Portal</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Generate and manage your UPI QR codes.
          </p>
        </div>
      </div>

      <div className="p-10 border border-dashed border-border rounded-xl flex flex-col items-center justify-center text-center bg-card">
        <QrCode className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
        <h2 className="text-xl font-bold text-foreground mb-2">Coming Soon</h2>
        <p className="text-muted-foreground max-w-md">
          The UPI QR service module is currently under development. You will be able to generate dynamic and static QR codes here.
        </p>
      </div>
    </div>
  );
}

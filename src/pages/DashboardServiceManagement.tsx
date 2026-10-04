import { useState, useEffect, useCallback } from "react";
import {
  Settings2, ToggleLeft, ToggleRight, RefreshCw, Search, AlertTriangle, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/services/api";

interface ServiceConfig {
  id: string;
  service_key: string;
  service_label: string;
  is_enabled: boolean;
  route_path: string;
  section: string;
}

export default function DashboardServiceManagement() {
  const { toast } = useToast();
  const [services, setServices] = useState<ServiceConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Confirmation Modal state
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [pendingService, setPendingService] = useState<ServiceConfig | null>(null);

  // Success / Done Modal state
  const [doneModalOpen, setDoneModalOpen] = useState(false);
  const [doneMessage, setDoneMessage] = useState("");

  const fetchServices = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const data = await apiFetch("/service-config");
      if (data) {
        setServices(data.map((s: any) => ({
          id: s.id,
          service_key: s.serviceKey,
          service_label: s.serviceLabel,
          is_enabled: s.isEnabled,
          route_path: s.routePath,
          section: s.section || "Services",
        })));
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchServices(true); }, [fetchServices]);

  // Step 1: Open Confirmation Modal when toggle is clicked
  const handleToggleClick = (service: ServiceConfig) => {
    setPendingService(service);
    setConfirmModalOpen(true);
  };

  // Step 2: Confirm action and execute backend toggle
  const executeToggleService = async () => {
    if (!pendingService) return;
    const service = pendingService;
    const newStatus = !service.is_enabled;

    setToggling(service.service_key);
    setConfirmModalOpen(false); // Close confirm modal

    // Optimistic Update
    setServices((prev) =>
      prev.map((s) => (s.id === service.id ? { ...s, is_enabled: newStatus } : s))
    );

    try {
      await apiFetch(`/service-config/${service.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_enabled: newStatus }),
      });

      const msg = `"${service.service_label}" service has been successfully ${newStatus ? "ENABLED" : "DISABLED"} globally for all users.`;
      setDoneMessage(msg);
      setDoneModalOpen(true); // Open Done modal

      window.dispatchEvent(new Event("genpay_services_updated"));
      fetchServices(false); // Silent sync
    } catch (err: any) {
      // Revert on failure
      setServices((prev) =>
        prev.map((s) => (s.id === service.id ? { ...s, is_enabled: service.is_enabled } : s))
      );
      toast({ title: "Toggle Failed", description: err.message, variant: "destructive" });
    } finally {
      setToggling(null);
      setPendingService(null);
    }
  };

  const enabledCount = services.filter((s) => s.is_enabled).length;
  const disabledCount = services.filter((s) => !s.is_enabled).length;

  const filtered = services.filter((s) =>
    !search || s.service_label.toLowerCase().includes(search.toLowerCase()) ||
    s.service_key.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Service Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Globally enable or disable services across the entire platform.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchServices(false)}>
          <RefreshCw className="w-4 h-4 mr-1" /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-gradient-card border border-border">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Total</div>
          <div className="text-2xl font-heading font-bold text-primary mt-1">{services.length}</div>
        </div>
        <div className="p-4 rounded-xl bg-gradient-card border border-border">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Enabled</div>
          <div className="text-2xl font-heading font-bold text-success mt-1">{enabledCount}</div>
        </div>
        <div className="p-4 rounded-xl bg-gradient-card border border-border">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Disabled</div>
          <div className="text-2xl font-heading font-bold text-destructive mt-1">{disabledCount}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 max-w-sm px-3 py-2 rounded-lg border border-border bg-card">
        <Search className="w-4 h-4 text-muted-foreground" />
        <input
          type="text" placeholder="Search services..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none flex-1"
        />
      </div>

      {loading ? (
        <div className="text-center py-10 text-muted-foreground">Loading...</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <Card key={s.id} className={`transition-all ${!s.is_enabled ? "opacity-60" : ""}`}>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-heading font-semibold text-foreground text-sm">{s.service_label}</p>
                    <p className="text-xs text-muted-foreground font-mono">{s.service_key}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleClick(s)}
                    disabled={toggling === s.service_key}
                    className={s.is_enabled ? "text-success hover:text-success" : "text-destructive hover:text-destructive"}
                  >
                    {s.is_enabled ? (
                      <ToggleRight className="w-6 h-6" />
                    ) : (
                      <ToggleLeft className="w-6 h-6" />
                    )}
                  </Button>
                </div>
                <div className="mt-2">
                  <Badge variant={s.is_enabled ? "default" : "destructive"} className="text-[10px]">
                    {s.is_enabled ? "Active" : "Globally Disabled"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="p-4 rounded-xl border border-dashed border-warning/40 bg-warning/5 text-xs text-muted-foreground">
        <Settings2 className="w-4 h-4 text-warning inline mr-1.5" />
        <strong>Note:</strong> Disabling a service here hides it from <em>all</em> users globally.
      </div>

      {/* MODAL 1: Confirmation Popup */}
      {pendingService && (
        <Dialog open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold text-amber-600">
                <AlertTriangle className="w-6 h-6 text-amber-500" />
                Confirm Service Status Change
              </DialogTitle>
              <DialogDescription className="pt-2 text-sm text-foreground">
                Are you sure you want to <strong>{pendingService.is_enabled ? "DISABLE" : "ENABLE"}</strong> the service{" "}
                <span className="font-bold text-primary">"{pendingService.service_label}"</span>?
              </DialogDescription>
            </DialogHeader>

            <div className="p-3 bg-muted/40 rounded-lg text-xs text-muted-foreground border border-border">
              {pendingService.is_enabled
                ? "This will hide the service globally from all distributors, retailers, and users."
                : "This will restore and make the service visible platform-wide."}
            </div>

            <DialogFooter className="gap-2 sm:gap-0 mt-2">
              <Button type="button" variant="outline" onClick={() => setConfirmModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant={pendingService.is_enabled ? "destructive" : "default"}
                onClick={executeToggleService}
              >
                Yes, {pendingService.is_enabled ? "Disable Service" : "Enable Service"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* MODAL 2: Done / Success Popup */}
      <Dialog open={doneModalOpen} onOpenChange={setDoneModalOpen}>
        <DialogContent className="sm:max-w-md text-center">
          <div className="flex flex-col items-center justify-center pt-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/15 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <DialogTitle className="text-xl font-extrabold text-foreground">
              Action Completed!
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm text-muted-foreground font-medium">
              {doneMessage}
            </DialogDescription>
          </div>

          <DialogFooter className="sm:justify-center mt-4">
            <Button type="button" className="px-8 font-bold" onClick={() => setDoneModalOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

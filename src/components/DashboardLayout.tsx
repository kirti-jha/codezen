import { Outlet, useLocation } from "react-router-dom";
import DashboardSidebar from "@/components/DashboardSidebar";
import { Bell, Search, User, LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import NotificationBell from "@/components/NotificationBell";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import usePageTitle from "@/hooks/usePageTitle";
const ROLE_LABELS: Record<string, string> = {
  admin: "Super Admin",
  super_distributor: "Super Distributor",
  master_distributor: "Master Distributor",
  distributor: "Distributor",
  retailer: "Retailer",
};

export default function DashboardLayout() {
  const { profile, role, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const dashTitle = (() => {
    // /dashboard/<module>
    const parts = location.pathname.split("/").filter(Boolean);
    const moduleKey = parts[1] || "";
    if (!moduleKey) return "Dashboard";
    const pretty = moduleKey.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
    return `Dashboard - ${pretty}`;
  })();

  usePageTitle(`GenPay | ${dashTitle}`);

  const impersonatedAs = sessionStorage.getItem("impersonated_as");

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar — hidden on mobile */}
      <div className="hidden lg:block">
        <DashboardSidebar />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 lg:h-16 border-b border-primary/20 flex items-center justify-between px-3 sm:px-6 shrink-0 bg-primary text-black font-bold">
          {/* Left: hamburger + search */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Mobile hamburger */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden shrink-0">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-[270px]">
                <DashboardSidebar onNavigate={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>

            <div className="hidden sm:flex items-center gap-3 flex-1 max-w-md">
              <Search className="w-4 h-4 text-black/70 shrink-0" />
              <input
                type="text"
                placeholder="Search transactions, users..."
                autoComplete="off"
                className="bg-transparent text-sm text-black placeholder:text-black/70 outline-none flex-1 min-w-0 font-bold"
              />
            </div>

            {impersonatedAs && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] bg-amber-400 text-black px-2 py-0.5 rounded font-black border border-black/30 shadow-sm">
                Impersonating: {impersonatedAs}
              </span>
            )}
          </div>

          {/* Right: bell + profile + logout */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <NotificationBell />
            <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-black/20">
              <div className="w-8 h-8 rounded-full bg-black/10 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-black" />
              </div>
              <div className="hidden md:block">
                <div className="text-sm font-bold text-black truncate max-w-[120px]">{profile?.full_name || "User"}</div>
                <div className="text-xs font-bold text-black/70">{role ? ROLE_LABELS[role] : "Loading..."}</div>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={signOut} title="Sign out" className="text-black hover:bg-black/10 hover:text-black">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </header>

        <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

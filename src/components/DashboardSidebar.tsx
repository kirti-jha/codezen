import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, Wallet, ArrowLeftRight, Settings,
  Shield, Zap, ChevronLeft, Fingerprint, Send, Receipt, CreditCard, BarChart3,
  FileText, Smartphone, Banknote, Building2, CreditCard as CreditCardIcon,
  Plane, Package, ShieldCheck, Landmark, Radio, Box, QrCode, FileSpreadsheet,
  Settings2, ChevronDown, UserCog, User, KeyRound, Lock, Award, SlidersHorizontal,
  MessageCircle, Activity,
} from "lucide-react";
import { useState, useEffect } from "react";
import { apiFetch } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";

type AppRole = "admin" | "super_distributor" | "master_distributor" | "distributor" | "retailer";

interface NavItem {
  label: string;
  icon: typeof LayoutDashboard;
  path: string;
  minRole?: AppRole;
  allowedRoles?: AppRole[];
  section?: string;
  serviceKey?: string;
  permissionKey?: string;
  masterOnly?: boolean;
}

const ROLE_LEVEL: Record<AppRole, number> = {
  admin: 1, super_distributor: 2, master_distributor: 3, distributor: 4, retailer: 5,
};

const ICON_MAP: Record<string, typeof LayoutDashboard> = {
  aeps: Fingerprint, bbps: Receipt, dmt: Send, recharge: Smartphone,
  loan: Banknote, credit_card: CreditCard, cc_bill_pay: CreditCardIcon,
  payout: ArrowLeftRight, matm: Radio, bank_account: Building2, pan: FileText,
  ppi_wallet: Wallet, travel_booking: Plane, travel_package: Package,
  insurance: ShieldCheck, pg: QrCode, pos: Landmark, sound_box: Box,
  qr: QrCode, upi_qr: QrCode,
};

const staticItems: NavItem[] = [
  { label: "Overview", icon: LayoutDashboard, path: "/dashboard", section: "Main" },
  { label: "Users", icon: Users, path: "/dashboard/users", minRole: "master_distributor", section: "Main", permissionKey: "can_manage_users" },
  { label: "Wallet & Funds", icon: Wallet, path: "/dashboard/wallet", section: "Main" },
  { label: "Fund Requests", icon: Banknote, path: "/dashboard/fund-requests", section: "Main" },
  { label: "Transactions", icon: ArrowLeftRight, path: "/dashboard/transactions", section: "Main" },
];

const managementItems: NavItem[] = [
  { label: "Staff Mgmt", icon: UserCog, path: "/dashboard/staff-management", allowedRoles: ["admin"], section: "Management", masterOnly: true },
  { label: "Set Limits", icon: SlidersHorizontal, path: "/dashboard/set-limit", minRole: "distributor", section: "Management" },
  { label: "Commissions", icon: BarChart3, path: "/dashboard/commissions", allowedRoles: ["admin"], section: "Management", permissionKey: "can_manage_commissions" },
  { label: "KYC", icon: FileText, path: "/dashboard/kyc", minRole: "distributor", section: "Management" },
  { label: "Service Mgmt", icon: Settings2, path: "/dashboard/service-management", allowedRoles: ["admin"], section: "Management", permissionKey: "can_manage_services" },
  { label: "Security", icon: Shield, path: "/dashboard/security", allowedRoles: ["admin"], section: "Management", permissionKey: "can_manage_security" },
  { label: "System Logs", icon: Activity, path: "/dashboard/system-logs", allowedRoles: ["admin"], section: "Management" },
  { label: "Settings", icon: Settings, path: "/dashboard/settings", allowedRoles: ["admin"], section: "Management", permissionKey: "can_manage_settings" },
];

const userSettingsItems: NavItem[] = [
  { label: "Charges", icon: BarChart3, path: "/dashboard/commission-plan", section: "Setting", allowedRoles: ["super_distributor", "master_distributor", "distributor", "retailer"] },
  { label: "Profile", icon: User, path: "/dashboard/profile", section: "Setting", allowedRoles: ["super_distributor", "master_distributor", "distributor", "retailer"] },
  { label: "TPIN", icon: KeyRound, path: "/dashboard/tpin", section: "Setting", allowedRoles: ["super_distributor", "master_distributor", "distributor", "retailer"] },
  { label: "Change Password", icon: Lock, path: "/dashboard/change-password", section: "Setting", allowedRoles: ["super_distributor", "master_distributor", "distributor", "retailer"] },
  { label: "Certificate Download", icon: Award, path: "/dashboard/certificate", section: "Setting", allowedRoles: ["super_distributor", "master_distributor", "distributor", "retailer"] },
];

interface ServiceSubItem {
  label: string;
  path: string;
  icon: typeof LayoutDashboard;
}

function getServiceSubItems(serviceKey: string, serviceLabel: string, baseRoute: string, role: string | null): ServiceSubItem[] {
  const Icon = ICON_MAP[serviceKey] || Zap;
  const isRetailer = role === "retailer";
  let items: ServiceSubItem[] = [];

  if (serviceKey === "pos") {
    items = [
      { label: "POS Inventory", path: baseRoute, icon: Package },
      { label: "POS Report", path: "/dashboard/reports?type=service_pos", icon: BarChart3 },
      { label: "POS Ledger", path: "/dashboard/reports?type=wallet_ledger", icon: FileSpreadsheet },
      { label: "POS Settlement", path: "/dashboard/settlements", icon: Landmark },
      { label: "POS Rate Setting", path: "/dashboard/pos-rates", icon: SlidersHorizontal },
    ];
  } else if (serviceKey === "aeps") {
    items = [
      { label: "AEPS Terminal", path: baseRoute, icon: Icon },
      { label: "AEPS Cash Withdrawal", path: `${baseRoute}?action=withdrawal`, icon: Banknote },
      { label: "AEPS Report", path: "/dashboard/reports?type=service_aeps", icon: BarChart3 },
      { label: "AEPS Ledger", path: "/dashboard/reports?type=wallet_ledger", icon: FileSpreadsheet },
      { label: "AEPS Rate Setting", path: "/dashboard/commissions", icon: SlidersHorizontal },
    ];
  } else if (serviceKey === "bbps") {
    items = [
      { label: "BBPS Pay", path: baseRoute, icon: Icon },
      { label: "BBPS Report", path: "/dashboard/reports?type=service_bbps", icon: BarChart3 },
      { label: "BBPS Ledger", path: "/dashboard/reports?type=wallet_ledger", icon: FileSpreadsheet },
      { label: "BBPS Rate Setting", path: "/dashboard/commissions", icon: SlidersHorizontal },
    ];
  } else if (serviceKey === "payout") {
    items = [
      { label: "Payout Portal", path: baseRoute, icon: Icon },
      { label: "Payout Report", path: "/dashboard/reports?type=service_payout", icon: BarChart3 },
      { label: "Payout Ledger", path: "/dashboard/reports?type=wallet_ledger", icon: FileSpreadsheet },
      { label: "Payout Rate Setting", path: "/dashboard/commissions", icon: SlidersHorizontal },
    ];
  } else if (serviceKey === "recharge") {
    items = [
      { label: "Recharge Portal", path: baseRoute, icon: Icon },
      { label: "Recharge Report", path: "/dashboard/reports?type=service_recharge", icon: BarChart3 },
      { label: "Recharge Ledger", path: "/dashboard/reports?type=wallet_ledger", icon: FileSpreadsheet },
      { label: "Recharge Rate Setting", path: "/dashboard/commissions", icon: SlidersHorizontal },
    ];
  } else if (serviceKey === "qr" || serviceKey === "upi_qr") {
    items = [
      { label: "QR Portal", path: baseRoute, icon: Icon },
      { label: "QR Report", path: `/dashboard/reports?type=service_${serviceKey}`, icon: BarChart3 },
      { label: "QR Ledger", path: "/dashboard/reports?type=wallet_ledger", icon: FileSpreadsheet },
      { label: "QR Rate Setting", path: "/dashboard/commissions", icon: SlidersHorizontal },
    ];
  } else {
    items = [
      { label: serviceLabel, path: baseRoute, icon: Icon },
      { label: `${serviceLabel} Report`, path: `/dashboard/reports?type=service_${serviceKey}`, icon: BarChart3 },
      { label: `${serviceLabel} Ledger`, path: "/dashboard/reports?type=wallet_ledger", icon: FileSpreadsheet },
      { label: `${serviceLabel} Rate Setting`, path: "/dashboard/commissions", icon: SlidersHorizontal },
    ];
  }

  // Downline charges are configured in /dashboard/commission-plan.
  if (role !== "admin") {
    items = items.filter(item => !item.label.includes("Rate Setting"));
  }

  return items;
}

interface Props {
  onNavigate?: () => void;
}

export default function DashboardSidebar({ onNavigate }: Props) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { user, role, isMasterAdmin, permissions } = useAuth();

  const [serviceItems, setServiceItems] = useState<NavItem[]>([]);
  const [openServiceSections, setOpenServiceSections] = useState<Record<string, boolean>>({});
  const [reportsOpen, setReportsOpen] = useState(false);

  const isAdmin = role === "admin";
  const canViewReports = isAdmin ? (isMasterAdmin || (permissions as any).can_view_reports) : true;

  useEffect(() => {
    const fetchServices = async () => {
      if (!user) return;
      try {
        const services = await apiFetch("/users/services");
        if (services) {
          const items = services.map((s: any) => ({
            label: s.serviceLabel,
            icon: ICON_MAP[s.serviceKey] || Zap,
            path: s.routePath,
            serviceKey: s.serviceKey,
            section: "Services",
          }));
          setServiceItems(items);

          // By default open enabled service sections so sub-items are immediately visible
          const openState: Record<string, boolean> = {};
          items.forEach((item: any) => {
            openState[item.serviceKey] = true;
          });

          setOpenServiceSections((prev) => ({ ...openState, ...prev }));
        }
      } catch (err) {
        console.error("Error fetching services for sidebar:", err);
      }
    };

    fetchServices();
    window.addEventListener("genpay_services_updated", fetchServices);
    return () => {
      window.removeEventListener("genpay_services_updated", fetchServices);
    };
  }, [user]);

  const toggleServiceSection = (key: string) => {
    setOpenServiceSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const nonServiceItems = [...staticItems, ...managementItems, ...userSettingsItems].filter((item) => {
    if (!role) return false;
    if (item.masterOnly && !isMasterAdmin) return false;
    if (item.allowedRoles && !item.allowedRoles.includes(role)) return false;
    if (item.minRole && ROLE_LEVEL[role] > ROLE_LEVEL[item.minRole]) return false;
    if (isAdmin && !isMasterAdmin && item.permissionKey) {
      if (!(permissions as any)[item.permissionKey]) return false;
    }
    return true;
  });

  const sections: { name: string; items: NavItem[] }[] = [];
  let lastSection = "";
  for (const item of nonServiceItems) {
    if (item.section !== lastSection) {
      sections.push({ name: item.section || "", items: [] });
      lastSection = item.section || "";
    }
    sections[sections.length - 1].items.push(item);
  }

  const renderNavLink = (item: NavItem) => {
    const isActive = location.pathname === item.path;
    return (
      <Link key={item.path} to={item.path} onClick={onNavigate}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all",
          isActive ? "bg-sidebar-accent text-sidebar-primary" : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
        )}
        title={collapsed ? item.label : undefined}
      >
        <item.icon className="w-4.5 h-4.5 shrink-0" />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Link>
    );
  };

  return (
    <aside className={cn("h-screen sticky top-0 flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300", collapsed ? "w-[68px]" : "w-[250px]")}>
      <div className="flex items-center gap-2 px-4 h-16 border-b border-sidebar-border shrink-0">
        <span className={cn("font-extrabold text-xl tracking-wider text-primary transition-all", collapsed ? "mx-auto" : "")}>
          {collapsed ? "GP" : "GenPay"}
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {sections.map((section) => (
          <div key={section.name}>
            {!collapsed && (
              <div className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">{section.name}</div>
            )}
            {collapsed && section.name !== "Main" && <div className="mx-3 my-2 border-t border-sidebar-border" />}

            {section.items.map((item) => renderNavLink(item))}

            {/* Inject Enabled Dynamic Service Sections & Reports Dropdown RIGHT AFTER Main */}
            {section.name === "Main" && (
              <>
                {/* 1. Dynamic Enabled Services Sections (e.g. POS, AEPS, BBPS, Payout, etc.) */}
                {serviceItems.map((svc) => {
                  const subItems = getServiceSubItems(svc.serviceKey || "", svc.label, svc.path, role);
                  const isOpen = openServiceSections[svc.serviceKey || ""] !== false;
                  const SvcIcon = svc.icon;

                  return (
                    <div key={svc.serviceKey} className="mb-2">
                      {!collapsed && (
                        <div className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-primary/80 flex items-center justify-between">
                          <span>{svc.label} Section</span>
                        </div>
                      )}
                      {collapsed && <div className="mx-3 my-2 border-t border-sidebar-border" />}

                      <button
                        onClick={() => toggleServiceSection(svc.serviceKey || "")}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all w-full mt-1",
                          isOpen ? "bg-sidebar-accent/30 text-sidebar-primary" : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                        )}
                        title={collapsed ? svc.label : undefined}
                      >
                        <SvcIcon className="w-4.5 h-4.5 shrink-0 text-primary" />
                        {!collapsed && (
                          <>
                            <span className="truncate flex-1 text-left font-bold">{svc.label}</span>
                            <ChevronDown className={cn("w-4 h-4 shrink-0 transition-transform", isOpen && "rotate-180")} />
                          </>
                        )}
                      </button>

                      {isOpen && !collapsed && (
                        <div className="ml-3 pl-3 border-l border-sidebar-border/50 space-y-0.5 mt-0.5">
                          {subItems.map((sub) => {
                            const currentUrl = location.pathname + location.search;
                            const isActive = currentUrl === sub.path || (sub.path.includes("?") && currentUrl === sub.path);
                            return (
                              <Link
                                key={sub.path + sub.label}
                                to={sub.path}
                                onClick={onNavigate}
                                className={cn(
                                  "flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                                  isActive ? "bg-sidebar-accent text-sidebar-primary font-bold" : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                                )}
                              >
                                <sub.icon className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">{sub.label}</span>
                              </Link>
                            );
                          })}
                        </div>
                      )}

                      {isOpen && collapsed && (
                        <div className="space-y-0.5 mt-0.5">
                          {subItems.map((sub) => {
                            const currentUrl = location.pathname + location.search;
                            const isActive = currentUrl === sub.path;
                            return (
                              <Link
                                key={sub.path + sub.label}
                                to={sub.path}
                                onClick={onNavigate}
                                className={cn(
                                  "flex items-center justify-center px-3 py-2 rounded-lg transition-all",
                                  isActive ? "bg-sidebar-accent text-sidebar-primary" : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                                )}
                                title={sub.label}
                              >
                                <sub.icon className="w-4 h-4 shrink-0" />
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* 2. Reports Dropdown */}
                {canViewReports && (
                  <div className="mb-2">
                    {!collapsed && <div className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Overall Reports</div>}
                    {collapsed && <div className="mx-3 my-2 border-t border-sidebar-border" />}
                    <button onClick={() => setReportsOpen(!reportsOpen)}
                      className={cn("flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all w-full mt-1",
                        reportsOpen ? "bg-sidebar-accent/30 text-sidebar-primary" : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                      )}
                      title={collapsed ? "Overall Reports" : undefined}
                    >
                      <FileSpreadsheet className="w-4.5 h-4.5 shrink-0" />
                      {!collapsed && (
                        <><span className="truncate flex-1 text-left font-bold">Overall Reports</span><ChevronDown className={cn("w-4 h-4 shrink-0 transition-transform", reportsOpen && "rotate-180")} /></>
                      )}
                    </button>
                    {reportsOpen && !collapsed && (
                      <div className="ml-3 pl-3 border-l border-sidebar-border/50 space-y-0.5 mt-0.5">
                        {[
                          { label: "Wallet Ledger", path: "/dashboard/reports?type=wallet_ledger", icon: Wallet },
                          { label: "Fund Requests", path: "/dashboard/reports?type=fund_requests", icon: Banknote },
                          { label: "Commission Report", path: "/dashboard/reports?type=commissions", icon: BarChart3 },
                          { label: "KYC Report", path: "/dashboard/reports?type=kyc", icon: FileText },
                          ...serviceItems.map(s => ({
                            label: `${s.label} Report`,
                            path: `/dashboard/reports?type=service_${s.serviceKey}`,
                            icon: s.icon
                          }))
                        ].map((item) => {
                          const isActive = location.pathname + location.search === item.path;
                          return (
                            <Link key={item.path} to={item.path} onClick={onNavigate}
                              className={cn("flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                                isActive ? "bg-sidebar-accent text-sidebar-primary" : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                              )}>
                              <item.icon className="w-3.5 h-3.5 shrink-0" /><span className="truncate">{item.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                    {reportsOpen && collapsed && (
                      <div className="space-y-0.5 mt-0.5">
                        {[
                          { label: "Wallet Ledger", path: "/dashboard/reports?type=wallet_ledger", icon: Wallet },
                          { label: "Fund Requests", path: "/dashboard/reports?type=fund_requests", icon: Banknote },
                          { label: "Commission Report", path: "/dashboard/reports?type=commissions", icon: BarChart3 },
                          { label: "KYC Report", path: "/dashboard/reports?type=kyc", icon: FileText },
                          ...serviceItems.map(s => ({
                            label: `${s.label} Report`,
                            path: `/dashboard/reports?type=service_${s.serviceKey}`,
                            icon: s.icon
                          }))
                        ].map((item) => {
                          const isActive = location.pathname + location.search === item.path;
                          return (
                            <Link key={item.path} to={item.path} onClick={onNavigate}
                              className={cn("flex items-center justify-center px-3 py-2 rounded-lg transition-all",
                                isActive ? "bg-sidebar-accent text-sidebar-primary" : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                              )}
                              title={item.label}>
                              <item.icon className="w-4 h-4 shrink-0" />
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        ))}

        {/* Support link at bottom */}
        <div className="mt-auto pt-2">
          {!collapsed && (
            <div className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Help</div>
          )}
          {collapsed && <div className="mx-3 my-2 border-t border-sidebar-border" />}
          {renderNavLink({ label: "Contact Support", icon: MessageCircle, path: "/dashboard/support", section: "Help" })}
        </div>
      </nav>

      <button onClick={() => setCollapsed(!collapsed)}
        className="hidden lg:flex items-center justify-center h-12 border-t border-sidebar-border text-sidebar-foreground hover:text-foreground transition-colors">
        <ChevronLeft className={cn("w-5 h-5 transition-transform", collapsed && "rotate-180")} />
      </button>
    </aside>
  );
}

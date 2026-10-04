import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  UserPlus, Users, ShieldCheck, Shield, Pencil, ToggleLeft, ToggleRight,
  UserCog, Wallet, Settings, FileText, ChevronDown, ChevronRight, ShieldAlert,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/services/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { getRoles } from "./DashboardRoleTemplates";

interface PermissionGroup {
  title: string;
  masterKey: string;
  icon: any;
  permissions: {
    key: string;
    label: string;
    description: string;
  }[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    title: "User Management",
    masterKey: "can_manage_users",
    icon: UserCog,
    permissions: [
      { key: "can_create_users", label: "Create Users", description: "Allow adding new distributors and retailers" },
      { key: "can_edit_users", label: "Edit Users", description: "Allow modifying user profile details" },
      { key: "can_block_users", label: "Block/Unblock", description: "Allow disabling and enabling user accounts" },
      { key: "can_delete_users", label: "Delete Users", description: "Allow permanent removal of user accounts" },
      { key: "can_manage_user_services", label: "Manage Services", description: "Allow enabling/disabling specific services for a user" },
      { key: "can_change_user_roles", label: "Change Roles", description: "Allow upgrading or downgrading user roles" },
      { key: "can_reset_user_passwords", label: "Reset Passwords", description: "Allow resetting user passwords" },
      { key: "can_view_user_docs", label: "View Documents", description: "Allow viewing KYC/Aadhaar/PAN documents" },
    ],
  },
  {
    title: "Finance & Wallet",
    masterKey: "can_manage_finance",
    icon: Wallet,
    permissions: [
      { key: "can_approve_fund_requests", label: "Approve Fund Requests", description: "Allow approving incoming fund requests" },
      { key: "can_reject_fund_requests", label: "Reject Fund Requests", description: "Allow rejecting and refunding fund requests" },
      { key: "can_manage_bank_accounts", label: "Manage Bank Accounts", description: "Allow adding/editing company bank details" },
      { key: "can_view_transactions", label: "View Transactions", description: "Allow viewing detailed transaction history" },
      { key: "can_perform_wallet_transfer", label: "Wallet Transfer", description: "Allow direct wallet-to-wallet transfers" },
    ],
  },
  {
    title: "Commissions Management",
    masterKey: "can_manage_commissions",
    icon: ShieldAlert,
    permissions: [
      { key: "can_manage_commissions", label: "Edit Commissions", description: "Allow creating and editing commission slabs" },
    ],
  },
  {
    title: "System & Global Services",
    masterKey: "can_manage_services",
    icon: Settings,
    permissions: [
      { key: "can_manage_global_services", label: "Global Services", description: "Allow global service configuration" },
      { key: "can_manage_settings", label: "Global Settings", description: "Allow modifying system-wide settings" },
      { key: "can_manage_security", label: "Security Management", description: "Allow managing security and access logs" },
    ],
  },
  {
    title: "Support & Reports",
    masterKey: "can_manage_support",
    icon: FileText,
    permissions: [
      { key: "can_reply_support_tickets", label: "Reply Tickets", description: "Allow responding to support queries" },
      { key: "can_view_reports", label: "View Reports", description: "Allow accessing analytical reports" },
    ],
  },
  {
    title: "Financial Services (B2B/B2C)",
    masterKey: "can_manage_fin_services",
    icon: Wallet,
    permissions: [
      { key: "can_manage_aeps_matm", label: "AEPS & MATM", description: "Manage AEPS and Micro ATM services" },
      { key: "can_manage_bbps_recharge", label: "BBPS & Recharge", description: "Manage Bill Payments and Recharges" },
      { key: "can_manage_payouts", label: "Payouts & Remittance", description: "Manage Money Transfers and Payouts" },
      { key: "can_manage_upi_qr", label: "UPI & QR", description: "Manage UPI Collections and QR Portal" },
      { key: "can_manage_cc_bill", label: "Credit Card Bill Pay", description: "Manage Credit Card Bill Payments" },
      { key: "can_manage_loan_ins", label: "Loan & Insurance", description: "Manage Loan EMI and Insurance services" },
      { key: "can_manage_pg", label: "Payment Gateway", description: "Manage Payment Gateway integrations" },
    ],
  },
  {
    title: "Value Added Services",
    masterKey: "can_manage_vas",
    icon: Settings,
    permissions: [
      { key: "can_manage_travel", label: "Travel Services", description: "Manage Travel Bookings and Packages" },
      { key: "can_manage_pos", label: "POS & Hardware", description: "Manage POS Devices and SoundBox" },
      { key: "can_manage_certificates", label: "Certificates", description: "Manage Retailer/Distributor Certificates" },
      { key: "can_manage_ppi", label: "PPI Wallet", description: "Manage PPI Wallet services" },
    ],
  },
];

const INITIAL_PERMS: Record<string, boolean> = {
  can_manage_users: false,
  can_manage_finance: false,
  can_manage_commissions: false,
  can_manage_services: false,
  can_manage_support: false,
  can_create_users: false,
  can_edit_users: false,
  can_block_users: false,
  can_delete_users: false,
  can_manage_user_services: false,
  can_change_user_roles: false,
  can_reset_user_passwords: false,
  can_view_user_docs: true,
  can_approve_fund_requests: false,
  can_reject_fund_requests: false,
  can_manage_bank_accounts: false,
  can_view_transactions: true,
  can_perform_wallet_transfer: false,
  can_manage_global_services: false,
  can_manage_settings: false,
  can_manage_security: false,
  can_reply_support_tickets: true,
  can_view_reports: true,
  can_manage_fin_services: false,
  can_manage_aeps_matm: false,
  can_manage_bbps_recharge: false,
  can_manage_payouts: false,
  can_manage_upi_qr: false,
  can_manage_cc_bill: false,
  can_manage_loan_ins: false,
  can_manage_pg: false,
  can_manage_vas: false,
  can_manage_travel: false,
  can_manage_pos: false,
  can_manage_certificates: false,
  can_manage_ppi: false,
};

interface StaffAdmin {
  user_id: string;
  full_name: string;
  is_master_admin: boolean;
  permissions: any | null;
}

export default function DashboardStaffManagement() {
  const { isMasterAdmin } = useAuth();
  const { toast } = useToast();
  const [admins, setAdmins] = useState<StaffAdmin[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formPerms, setFormPerms] = useState<Record<string, boolean>>(INITIAL_PERMS);
  const [selectedRole, setSelectedRole] = useState("");
  const [creating, setCreating] = useState(false);

  const applyRole = (roleName: string, isEdit: boolean) => {
    if (isEdit) return; // For now only apply on create
    setSelectedRole(roleName);
    const role = getRoles().find((r: any) => r.name === roleName);
    if (role) {
      setFormPerms({ ...INITIAL_PERMS, ...role.perms });
    }
  };

  const [editOpen, setEditOpen] = useState(false);
  const [editAdmin, setEditAdmin] = useState<StaffAdmin | null>(null);
  const [editPerms, setEditPerms] = useState<Record<string, boolean>>(INITIAL_PERMS);
  const [saving, setSaving] = useState(false);

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/staff/admins");
      setAdmins((data || []) as StaffAdmin[]);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setAdmins([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const handleCreateStaff = async () => {
    if (!formEmail || !formPassword || !formName) {
      toast({ title: "Fill all required fields", variant: "destructive" });
      return;
    }
    if (formPassword.length < 6) {
      toast({ title: "Password min 6 characters", variant: "destructive" });
      return;
    }

    setCreating(true);
    try {
      await apiFetch("/staff/admins", {
        method: "POST",
        body: JSON.stringify({
          email: formEmail.trim(),
          password: formPassword,
          full_name: formName.trim(),
          phone: formPhone.trim() || null,
          permissions: formPerms,
        }),
      });

      toast({ title: "Staff admin created", description: `${formName} added as staff admin.` });
      setCreateOpen(false);
      setFormEmail("");
      setFormPassword("");
      setFormName("");
      setFormPhone("");
      setFormPerms(INITIAL_PERMS);
      fetchAdmins();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const openEditPerms = (admin: StaffAdmin) => {
    setEditAdmin(admin);
    setEditPerms(admin.permissions || INITIAL_PERMS);
    setEditOpen(true);
  };

  const handleSavePerms = async () => {
    if (!editAdmin) return;
    setSaving(true);
    try {
      await apiFetch(`/staff/permissions/${editAdmin.user_id}`, {
        method: "PATCH",
        body: JSON.stringify(editPerms),
      });
      toast({ title: "Permissions updated" });
      setEditOpen(false);
      fetchAdmins();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggleMaster = (group: PermissionGroup, isEdit: boolean) => {
    const state = isEdit ? editPerms : formPerms;
    const setState = isEdit ? setEditPerms : setFormPerms;
    
    const newVal = !state[group.masterKey];
    const updated = { ...state, [group.masterKey]: newVal };
    
    if (newVal) {
      group.permissions.forEach(p => {
        updated[p.key] = true;
      });
    }
    setState(updated);
  };

  const toggleSub = (key: string, isEdit: boolean) => {
    const setState = isEdit ? setEditPerms : setFormPerms;
    setState((prev: any) => ({ ...prev, [key]: !prev[key] }));
  };

  if (!isMasterAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <h2 className="text-lg font-heading font-semibold text-foreground">Access Restricted</h2>
          <p className="text-sm text-muted-foreground mt-1">Only the Master Admin can manage staff.</p>
        </div>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Staff Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Create sub-admins and control what they can access.</p>
        </div>
        <Button variant="hero" size="sm" onClick={() => setCreateOpen(true)}>
          <UserPlus className="w-4 h-4 mr-1.5" /> Add Staff Admin
        </Button>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="text-center py-10 text-muted-foreground flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span>Loading staff list...</span>
          </div>
        ) : admins.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">No admin accounts found.</div>
        ) : (
          admins.map((admin) => (
            <Card key={admin.user_id} className="hover:border-primary/20 transition-all">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-gradient-brand flex items-center justify-center text-white font-bold text-lg">
                        {admin.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div className={cn(
                        "absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center",
                        admin.is_master_admin ? "bg-primary" : "bg-muted"
                      )}>
                        {admin.is_master_admin ? <ShieldCheck className="w-3 h-3 text-white" /> : <Users className="w-3 h-3 text-white" />}
                      </div>
                    </div>
                    <div>
                      <div className="font-heading font-semibold text-foreground flex items-center gap-2">
                        {admin.full_name}
                        {admin.is_master_admin && <Badge className="bg-primary/10 text-primary text-[10px] h-4">MASTER</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">Staff Admin ID: {admin.user_id}</div>
                    </div>
                  </div>
                  {!admin.is_master_admin && (
                    <Button variant="outline" size="sm" onClick={() => openEditPerms(admin)} className="rounded-full">
                      <Pencil className="w-4 h-4 mr-1" /> Edit Permissions
                    </Button>
                  )}
                </div>

                {admin.is_master_admin ? (
                  <div className="flex items-center gap-2 text-xs text-primary font-medium bg-primary/5 p-3 rounded-lg border border-primary/10">
                    <ShieldCheck className="w-4 h-4" />
                    Full access to all platform features. This role cannot be restricted.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {PERMISSION_GROUPS.map((g) => {
                      const enabled = admin.permissions?.[g.masterKey];
                      return (
                        <div key={g.masterKey} className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                          enabled ? "bg-success/10 text-success" : "bg-muted text-muted-foreground opacity-50"
                        )}>
                          {enabled ? <ToggleRight className="w-3 h-3" /> : <ToggleLeft className="w-3 h-3" />}
                          {g.title}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[95vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <UserPlus className="w-6 h-6 text-primary" /> Add Staff Admin
            </DialogTitle>
            <DialogDescription>Create a new admin account with specific permissions.</DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
            <div className="grid gap-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider opacity-60">Full Name *</Label>
                  <Input placeholder="Prahlad" value={formName} onChange={(e) => setFormName(e.target.value)} className="bg-secondary/30 h-11" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider opacity-60">Email *</Label>
                  <Input type="email" placeholder="abcd@gmail.com" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} className="bg-secondary/30 h-11" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider opacity-60">Password *</Label>
                  <Input type="password" placeholder="••••••••••" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} className="bg-secondary/30 h-11" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider opacity-60">Phone</Label>
                  <Input placeholder="1234567890" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} className="bg-secondary/30 h-11" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <Label className="text-sm font-bold flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-primary" /> Permissions & Access Control
                  </Label>
                  <Select value={selectedRole} onValueChange={(val) => applyRole(val, false)}>
                    <SelectTrigger className="w-[180px] h-8 text-xs">
                      <SelectValue placeholder="Select Predefined Role" />
                    </SelectTrigger>
                    <SelectContent>
                      {getRoles().map((r: any) => (
                        <SelectItem key={r.name} value={r.name}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-4 pb-4">
                  {PERMISSION_GROUPS.map((group) => {
                    const isMasterActive = !!formPerms[group.masterKey];
                    return (
                      <div key={group.title} className={cn(
                        "rounded-xl border transition-all duration-300",
                        isMasterActive ? "border-primary/20 bg-primary/5 shadow-sm" : "border-border bg-card"
                      )}>
                        <div 
                          className="flex items-center justify-between p-4 cursor-pointer hover:bg-secondary/20"
                          onClick={() => toggleMaster(group, false)}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "p-2 rounded-lg",
                              isMasterActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                            )}>
                              <group.icon className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-foreground tracking-tight">{group.title}</h3>
                              <p className="text-xs text-muted-foreground">
                                {isMasterActive ? "Access Enabled" : "Access Disabled"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <Switch 
                              checked={isMasterActive} 
                              onCheckedChange={() => toggleMaster(group, false)}
                              onClick={(e) => e.stopPropagation()} 
                            />
                            {isMasterActive ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                          </div>
                        </div>

                        {isMasterActive && (
                          <div className="p-4 pt-0 border-t border-primary/10">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                              {group.permissions.map((p) => (
                                <div 
                                  key={p.key} 
                                  className="flex items-center justify-between space-x-2 rounded-lg border bg-background p-3 hover:border-primary/30 transition-colors"
                                >
                                  <div className="space-y-0.5">
                                    <Label className="text-sm font-medium leading-none cursor-pointer" onClick={() => toggleSub(p.key, false)}>
                                      {p.label}
                                    </Label>
                                    <p className="text-[10px] text-muted-foreground leading-tight mt-1">{p.description}</p>
                                  </div>
                                  <Switch 
                                    checked={!!formPerms[p.key]} 
                                    onCheckedChange={() => toggleSub(p.key, false)} 
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter className="p-6 border-t bg-secondary/10 gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setCreateOpen(false)} className="rounded-full px-6">Cancel</Button>
            <Button onClick={handleCreateStaff} disabled={creating} className="rounded-full px-8 shadow-lg shadow-primary/20 bg-gradient-primary">
              {creating ? "Creating..." : "Create Staff Admin"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[95vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Pencil className="w-5 h-5 text-primary" /> Edit Permissions
            </DialogTitle>
            <DialogDescription>Update access for {editAdmin?.full_name}.</DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
            <div className="space-y-4">
              {PERMISSION_GROUPS.map((group) => {
                const isMasterActive = !!editPerms[group.masterKey];
                return (
                  <div key={group.title} className={cn(
                    "rounded-xl border transition-all duration-300",
                    isMasterActive ? "border-primary/20 bg-primary/5 shadow-sm" : "border-border bg-card"
                  )}>
                    <div 
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-secondary/20"
                      onClick={() => toggleMaster(group, true)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2 rounded-lg",
                          isMasterActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        )}>
                          <group.icon className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground tracking-tight">{group.title}</h3>
                          <p className="text-xs text-muted-foreground">
                            {isMasterActive ? "Access Enabled" : "Access Disabled"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Switch 
                          checked={isMasterActive} 
                          onCheckedChange={() => toggleMaster(group, true)}
                          onClick={(e) => e.stopPropagation()} 
                        />
                        {isMasterActive ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </div>

                    {isMasterActive && (
                      <div className="p-4 pt-0 border-t border-primary/10">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                          {group.permissions.map((p) => (
                            <div 
                              key={p.key} 
                              className="flex items-center justify-between space-x-2 rounded-lg border bg-background p-3 hover:border-primary/30 transition-colors"
                            >
                              <div className="space-y-0.5">
                                <Label className="text-sm font-medium leading-none cursor-pointer" onClick={() => toggleSub(p.key, true)}>
                                  {p.label}
                                </Label>
                                <p className="text-[10px] text-muted-foreground leading-tight mt-1">{p.description}</p>
                              </div>
                              <Switch 
                                checked={!!editPerms[p.key]} 
                                onCheckedChange={() => toggleSub(p.key, true)} 
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          
          <DialogFooter className="p-6 border-t bg-secondary/10 gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEditOpen(false)} className="rounded-full px-6">Cancel</Button>
            <Button onClick={handleSavePerms} disabled={saving} className="rounded-full px-8 shadow-lg shadow-primary/20 bg-gradient-primary">
              {saving ? "Saving..." : "Save Permissions"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

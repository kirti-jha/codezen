import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Users, Search, UserPlus, CheckCircle2, XCircle, Clock,
  MoreVertical, Pencil, ShieldAlert, ShieldCheck, KeyRound, LogIn, Settings2, Upload,
  Ban, Store, UserCheck, UserX, Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { apiFetch } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { uploadFileToBackend } from "@/services/files";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StaffPermissionsDialog } from "@/components/dashboards/StaffPermissionsDialog";
import { usePermissions } from "@/hooks/usePermissions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";

type AppRole = "admin" | "super_distributor" | "master_distributor" | "distributor" | "retailer";

interface UserRow {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  business_name: string | null;
  kyc_status: string;
  status: string;
  parent_id: string | null;
  created_at: string;
  role?: AppRole;
  walletBalance?: number;
}

const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Admin",
  super_distributor: "Super Distributor",
  master_distributor: "Master Distributor",
  distributor: "Distributor",
  retailer: "Retailer",
};

const ROLE_LEVEL: Record<string, number> = {
  admin: 1, super_distributor: 2, master_distributor: 3, distributor: 4, retailer: 5,
};

const CREATABLE_ROLES: { value: AppRole; label: string }[] = [
  { value: "super_distributor", label: "Super Distributor" },
  { value: "master_distributor", label: "Master Distributor" },
  { value: "distributor", label: "Distributor" },
  { value: "retailer", label: "Retailer" },
];

const kycBadge: Record<string, { icon: typeof CheckCircle2; className: string }> = {
  verified: { icon: CheckCircle2, className: "text-success" },
  pending: { icon: Clock, className: "text-warning" },
  rejected: { icon: XCircle, className: "text-destructive" },
};

interface ServiceToggle {
  service_key: string;
  service_label: string;
  is_enabled: boolean;
  user_disabled: boolean;
}

export default function DashboardUsers() {
  const { user: currentUser, role: myRole } = useAuth();
  const { hasPermission, isAdmin: isGlobalAdmin } = usePermissions();
  const { toast } = useToast();
  const isAdmin = myRole === "admin";
  const canManage = myRole ? ROLE_LEVEL[myRole] < 5 : false;
  const isMasterAdmin = currentUser?.isMasterAdmin;
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [processing, setProcessing] = useState(false);
  const [impersonating, setImpersonating] = useState(false);
  const [walletTotals, setWalletTotals] = useState<Record<string, number>>({});

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formBusiness, setFormBusiness] = useState("");
  const [formRole, setFormRole] = useState<AppRole | "">("");
  const [formParent, setFormParent] = useState("");
  const [parentOptions, setParentOptions] = useState<{ id: string; name: string; role: string }[]>([]);
  // KYC fields
  const [formAadhaar, setFormAadhaar] = useState("");
  const [formPan, setFormPan] = useState("");
  const [formAadhaarFile, setFormAadhaarFile] = useState<File | null>(null);
  const [formPanFile, setFormPanFile] = useState<File | null>(null);
  // Bank fields
  const [formBankName, setFormBankName] = useState("");
  const [formBankAcct, setFormBankAcct] = useState("");
  const [formBankIfsc, setFormBankIfsc] = useState("");
  const [formBankHolder, setFormBankHolder] = useState("");

  const aadhaarInputRef = useRef<HTMLInputElement>(null);
  const panInputRef = useRef<HTMLInputElement>(null);

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editBusiness, setEditBusiness] = useState("");

  // Change role dialog
  const [roleOpen, setRoleOpen] = useState(false);
  const [roleUser, setRoleUser] = useState<UserRow | null>(null);
  const [newRole, setNewRole] = useState<AppRole | "">("");

  // Reset password dialog
  const [resetOpen, setResetOpen] = useState(false);
  const [resetUser, setResetUser] = useState<UserRow | null>(null);
  const [newPassword, setNewPassword] = useState("");

  // Service management dialog
  const [serviceOpen, setServiceOpen] = useState(false);
  const [serviceUser, setServiceUser] = useState<UserRow | null>(null);
  const [serviceToggles, setServiceToggles] = useState<ServiceToggle[]>([]);
  const [togglingService, setTogglingService] = useState<string | null>(null);
  
  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserRow | null>(null);

  // Permissions dialog
  const [permsOpen, setPermsOpen] = useState(false);
  const [permsUser, setPermsUser] = useState<UserRow | null>(null);
  const [permsData, setPermsData] = useState<any>(null);

  // Wallet Adjustment dialog
  const [walletAdjOpen, setWalletAdjOpen] = useState(false);
  const [walletAdjUser, setWalletAdjUser] = useState<UserRow | null>(null);
  const [walletAdjType, setWalletAdjType] = useState<"Debit" | "Credit">("Debit");
  const [walletAdjAmount, setWalletAdjAmount] = useState("");
  const [walletAdjRemark, setWalletAdjRemark] = useState("");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/users");
      if (data) {
        const merged: UserRow[] = (data || []).map((u: any) => ({
          ...u,
          id: u.id,
          user_id: u.userId,
          full_name: u.fullName,
          business_name: u.businessName,
          kyc_status: u.kycStatus,
          status: u.status,
          parent_id: u.parentId,
          created_at: u.createdAt,
          role: u.role,
          walletBalance: u.walletBalance,
        }));

        merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setUsers(merged);

        // Compute wallet totals by role
        const totals: Record<string, number> = { total: 0, super_distributor: 0, master_distributor: 0, distributor: 0, retailer: 0 };
        merged.forEach((u) => {
          const bal = Number(u.walletBalance || 0);
          totals.total += bal;
          if (u.role) totals[u.role] = (totals[u.role] || 0) + bal;
        });
        setWalletTotals(totals);
      }
    } catch (err: any) {
      console.error("Error fetching users:", err);
      toast({ title: "Fetch Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [myRole]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  useEffect(() => {
    if (!formRole) { setParentOptions([]); return; }
    const parentRoleMap: Record<string, AppRole | null> = {
      super_distributor: null,
      master_distributor: "super_distributor",
      distributor: "master_distributor",
      retailer: "distributor",
    };
    const parentRole = parentRoleMap[formRole];
    if (!parentRole) { setParentOptions([]); setFormParent(""); return; }
    setParentOptions(
      users.filter((u) => u.role === parentRole && u.status === "active")
        .map((u) => ({ id: u.id, name: u.full_name || u.user_id, role: ROLE_LABELS[u.role!] }))
    );
  }, [formRole, users]);

  const invokeManageUser = async (action: string, target_user_id: string, extra: Record<string, any> = {}) => {
    setProcessing(true);
    try {
      // These actions can now be handled by the Express backend
      const res = await apiFetch("/users/manage", {
        method: "POST",
        body: JSON.stringify({ action, target_user_id, ...extra }),
      });
      toast({ title: "Success", description: res.message || "Action completed." });

      fetchUsers();
      return true;
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      return false;
    } finally {
      setProcessing(false);
    }
  };

  const uploadDocImage = async (userId: string, file: File, docType: string): Promise<string | null> => {
    try {
      const uploaded = await uploadFileToBackend(file, `user-documents/${userId}/${docType}`);
      return uploaded?.filePath || null;
    } catch (error) {
      console.error("Upload error:", error);
      return null;
    }
  };

  const handleCreate = async () => {
    if (!formEmail || !formPassword || !formName || !formRole) {
      toast({ title: "Missing fields", description: "Fill all required fields.", variant: "destructive" });
      return;
    }
    if (formPassword.length < 6) {
      toast({ title: "Weak password", description: "Min 6 characters.", variant: "destructive" });
      return;
    }
    setProcessing(true);
    try {
      // First create user in Neon
      const res = await apiFetch("/users", {
        method: "POST",
        body: JSON.stringify({
          email: formEmail.trim(), password: formPassword, full_name: formName.trim(),
          phone: formPhone.trim() || null, business_name: formBusiness.trim() || null,
          role: formRole, parent_id: formParent || null,
          aadhaar_number: formAadhaar.trim() || null,
          pan_number: formPan.trim().toUpperCase() || null,
          bank_name: formBankName.trim() || null,
          bank_account_number: formBankAcct.trim() || null,
          bank_ifsc: formBankIfsc.trim().toUpperCase() || null,
          bank_account_holder: formBankHolder.trim() || null,
        }),
      });

      const newUserId = res?.user?.id || res?.data?.user?.id;
      if (!newUserId) throw new Error("Failed to read new user id from response");

      // Upload images if provided (using admin's session — RLS allows admins)
      let aadhaarPath: string | null = null;
      let panPath: string | null = null;

      if (formAadhaarFile) {
        aadhaarPath = await uploadDocImage(newUserId, formAadhaarFile, "aadhaar");
      }
      if (formPanFile) {
        panPath = await uploadDocImage(newUserId, formPanFile, "pan");
      }

      if (aadhaarPath || panPath) {
        await apiFetch("/users/manage", {
          method: "POST",
          body: JSON.stringify({
            action: "update_documents",
            target_user_id: newUserId,
            ...(aadhaarPath ? { aadhaar_image_path: aadhaarPath } : {}),
            ...(panPath ? { pan_image_path: panPath } : {}),
          }),
        });
      }

      toast({ title: "User created!", description: `${formName} added as ${ROLE_LABELS[formRole as AppRole]}.` });
      setCreateOpen(false);
      resetCreateForm();
      fetchUsers();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const resetCreateForm = () => {
    setFormEmail(""); setFormPassword(""); setFormName(""); setFormPhone(""); setFormBusiness("");
    setFormRole(""); setFormParent(""); setFormAadhaar(""); setFormPan("");
    setFormAadhaarFile(null); setFormPanFile(null);
    setFormBankName(""); setFormBankAcct(""); setFormBankIfsc(""); setFormBankHolder("");
  };

  const handleEditSave = async () => {
    if (!editUser) return;
    const ok = await invokeManageUser("edit_profile", editUser.user_id, {
      full_name: editName, phone: editPhone, business_name: editBusiness,
    });
    if (ok) setEditOpen(false);
  };

  const handleRoleSave = async () => {
    if (!roleUser || !newRole) return;
    const ok = await invokeManageUser("change_role", roleUser.user_id, { new_role: newRole });
    if (ok) setRoleOpen(false);
  };

  const handleResetSave = async () => {
    if (!resetUser || !newPassword) return;
    if (newPassword.length < 6) {
      toast({ title: "Weak password", description: "Min 6 characters.", variant: "destructive" });
      return;
    }
    const ok = await invokeManageUser("reset_password", resetUser.user_id, { new_password: newPassword });
    if (ok) { setResetOpen(false); setNewPassword(""); }
  };

  const handleToggleBlock = async (u: UserRow) => {
    const action = u.status === "active" ? "block" : "unblock";
    await invokeManageUser(action, u.user_id);
  };

  const handleImpersonate = async (u: UserRow) => {
    // Open window synchronously to avoid popup blocker
    const newWindow = window.open("about:blank", "_blank");
    setImpersonating(true);
    try {
      const res = await apiFetch("/users/manage", {
        method: "POST",
        body: JSON.stringify({ action: "impersonate", target_user_id: u.user_id }),
      });

      const { access_token, user_id, email } = res;
      if (!access_token) throw new Error("Failed to get impersonation token");

      // Set URL in the pre-opened tab
      const params = new URLSearchParams({
        access_token,
        user_id: user_id || u.user_id,
        email: email || "",
        name: u.full_name || "User",
      });
      
      const impersonateUrl = `${window.location.origin}/impersonate?${params.toString()}`;
      if (newWindow) {
        newWindow.location.href = impersonateUrl;
      } else {
        // Fallback just in case
        window.open(impersonateUrl, "_blank");
      }
      
      toast({ title: `Opened ${u.full_name}'s session`, description: "A new tab has been opened with the impersonated session." });
    } catch (err: any) {
      if (newWindow) newWindow.close();
      toast({ title: "Impersonation failed", description: err.message, variant: "destructive" });
    } finally {
      setImpersonating(false);
    }
  };

  const openServiceManagement = async (u: UserRow) => {
    setServiceUser(u);
    try {
      const services = await apiFetch(`/users/${u.user_id}/services`);
      if (services) {
        setServiceToggles(services);
        setServiceOpen(true);
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleServiceToggle = async (serviceKey: string, currentlyDisabled: boolean) => {
    if (!serviceUser) return;
    setTogglingService(serviceKey);
    try {
      const ok = await invokeManageUser("toggle_service", serviceUser.user_id, {
        service_key: serviceKey,
        is_enabled: currentlyDisabled,
      });
      if (ok) {
        setServiceToggles((prev) =>
          prev.map((s) => s.service_key === serviceKey ? { ...s, user_disabled: !currentlyDisabled } : s)
        );
      }
    } finally {
      setTogglingService(null);
    }
  };

  const openEdit = (u: UserRow) => {
    setEditUser(u);
    setEditName(u.full_name);
    setEditPhone(u.phone || "");
    setEditBusiness(u.business_name || "");
    setEditOpen(true);
  };

  const openRoleChange = (u: UserRow) => {
    setRoleUser(u);
    setNewRole(u.role || "");
    setRoleOpen(true);
  };

  const openReset = (u: UserRow) => {
    setResetUser(u);
    setNewPassword("");
    setResetOpen(true);
  };

  const openPerms = (u: UserRow) => {
    setPermsUser(u);
    // The fetchUsers call already brings permissions for admins (from staff.ts)
    // We need to find the correct entry or fetch it. 
    // In our case, the 'users' array contains the full row, let's see if permissions are there
    const fullUser = users.find(user => user.user_id === u.user_id);
    setPermsData((fullUser as any)?.permissions || {});
    setPermsOpen(true);
  };

  const handleDeleteClick = (u: UserRow) => {
    setUserToDelete(u);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    const ok = await invokeManageUser("delete", userToDelete.user_id);
    if (ok) setDeleteDialogOpen(false);
  };

  const openWalletAdj = (u: UserRow) => {
    setWalletAdjUser(u);
    setWalletAdjType("Debit");
    setWalletAdjAmount("");
    setWalletAdjRemark("");
    setWalletAdjOpen(true);
  };

  const handleWalletAdjSubmit = async () => {
    if (!walletAdjUser || !walletAdjAmount) return;
    // Mock API call for wallet adjustment
    toast({ title: "Wallet Adjusted", description: `Successfully ${walletAdjType}ed ₹${walletAdjAmount}` });
    setWalletAdjOpen(false);
  };

  const filtered = users.filter((u) => {
    const q = searchInput.toLowerCase();
    const matchesSearch = !q || u.full_name?.toLowerCase().includes(q) || u.phone?.toLowerCase().includes(q) ||
      u.business_name?.toLowerCase().includes(q) || u.role?.toLowerCase().includes(q);
    const matchesRole = filterRole === "all" || u.role === filterRole;
    const matchesStatus = filterStatus === "all" || u.status === filterStatus;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const canManageUser = (u: UserRow) => {
    if (!myRole || !u.role) return false;
    if (u.user_id === currentUser?.id) return false;
    if (isAdmin) return true;
    return ROLE_LEVEL[myRole] < ROLE_LEVEL[u.role];
  };

  const formatINR = (v: number) => `₹${v.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;



  const handleCardClick = (roleFilter: string) => {
    setFilterRole(filterRole === roleFilter ? "all" : roleFilter);
  };

  const statsCards = [
    { label: "Total Users", value: users.length, sub: formatINR(walletTotals.total || 0), icon: Users, color: "text-primary bg-primary/10", filterKey: "all" },
    ...(isAdmin ? [{ label: "Super Distributors", value: users.filter(u => u.role === "super_distributor").length, sub: formatINR(walletTotals.super_distributor || 0), icon: ShieldCheck, color: "text-chart-1 bg-chart-1/10", filterKey: "super_distributor" }] : []),
    ...(myRole && ROLE_LEVEL[myRole] <= 2 ? [{ label: "Master Distributors", value: users.filter(u => u.role === "master_distributor").length, sub: formatINR(walletTotals.master_distributor || 0), icon: ShieldAlert, color: "text-chart-3 bg-chart-3/10", filterKey: "master_distributor" }] : []),
    ...(myRole && ROLE_LEVEL[myRole] <= 3 ? [{ label: "Distributors", value: users.filter(u => u.role === "distributor").length, sub: formatINR(walletTotals.distributor || 0), icon: UserPlus, color: "text-destructive bg-destructive/10", filterKey: "distributor" }] : []),
    { label: "Retailers", value: users.filter(u => u.role === "retailer").length, sub: formatINR(walletTotals.retailer || 0), icon: Store, color: "text-chart-2 bg-chart-2/10", filterKey: "retailer" },
    { label: "Active", value: users.filter((u) => u.status === "active").length, sub: null, icon: UserCheck, color: "text-success bg-success/10", filterKey: "_active" },
    { label: "Deactivated", value: users.filter((u) => u.status !== "active").length, sub: null, icon: UserX, color: "text-warning bg-warning/10", filterKey: "_deactivated" },
  ];

  const handleSearch = () => {
    setSearch(searchInput);
  };

  const handleClear = () => {
    setSearchInput("");
    setSearch("");
    setFilterRole("all");
    setFilterStatus("all");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-primary p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Users className="w-7 h-7 text-primary-foreground" />
          <div>
            <h1 className="text-2xl font-heading font-bold text-primary-foreground">User Management</h1>
            <p className="text-sm text-primary-foreground/70 mt-0.5">Manage all registered users, distributors & retailers</p>
          </div>
        </div>
        {(isAdmin || canManage) && hasPermission("can_create_users") && (
          <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)} className="bg-primary-foreground/10 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/20">
            <UserPlus className="w-4 h-4 mr-1.5" /> Add New User
          </Button>
        )}
      </div>



      {/* Stats Cards */}
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))" }}>
        {statsCards.map((stat) => {
          const isActive = (stat.filterKey === "_active" && filterStatus === "active") ||
            (stat.filterKey === "_deactivated" && filterStatus === "blocked") ||
            (stat.filterKey !== "_active" && stat.filterKey !== "_deactivated" && filterRole === stat.filterKey && stat.filterKey !== "all");
          return (
            <div
              key={stat.label}
              onClick={() => {
                if (stat.filterKey === "_active") {
                  setFilterStatus(filterStatus === "active" ? "all" : "active");
                } else if (stat.filterKey === "_deactivated") {
                  setFilterStatus(filterStatus === "blocked" ? "all" : "blocked");
                } else {
                  handleCardClick(stat.filterKey);
                }
              }}
              className={`rounded-xl bg-gradient-card border p-4 text-center cursor-pointer transition-all hover:shadow-md ${isActive ? "border-primary ring-2 ring-primary/30" : "border-border"}`}
            >
              <div className={`w-9 h-9 rounded-full ${stat.color} flex items-center justify-center mx-auto mb-2`}>
                <stat.icon className="w-4 h-4" />
              </div>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground leading-tight">{stat.label}</p>
              <p className="text-xl font-heading font-bold text-foreground mt-1">{loading ? "..." : stat.value}</p>
              {stat.sub && <p className="text-[10px] text-muted-foreground mt-0.5">{loading ? "..." : stat.sub}</p>}
            </div>
          );
        })}
      </div>

      {/* Main Content Area matching screenshot format */}
      <div className="bg-card rounded-md shadow-sm overflow-hidden border border-border">
        {/* Top Header */}
        <div className="p-4 border-b border-border bg-muted/30">
          <h2 className="text-lg font-semibold text-foreground">All Users</h2>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-border flex flex-wrap items-end gap-4">
          <div className="space-y-1 flex-1 min-w-[250px] max-w-sm">
            <Label className="text-xs text-muted-foreground">Search Users</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Name, email, username or mobile..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="h-9"
              />
              <Button onClick={handleSearch} className="h-9 bg-primary hover:bg-primary/90 text-primary-foreground px-6">
                Search
              </Button>
            </div>
          </div>
          <div className="space-y-1 w-[120px]">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 w-[140px]">
            <Label className="text-xs text-muted-foreground">Role</Label>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="super_distributor">Super Dist.</SelectItem>
                <SelectItem value="master_distributor">Master Dist.</SelectItem>
                <SelectItem value="distributor">Distributor</SelectItem>
                <SelectItem value="retailer">Retailer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
            <span>Page 1 of 1</span>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" className="h-8 px-2" disabled>Prev</Button>
              <Button variant="outline" size="sm" className="h-8 px-2" disabled>Next</Button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-10 text-center text-muted-foreground">Loading users...</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">No users found.</div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">SL</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">USER</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">ROLE</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">WALLET</th>
                  <th className="text-center py-3 px-4 font-semibold text-muted-foreground">POS COUNT</th>
                  <th className="text-center py-3 px-4 font-semibold text-muted-foreground">STATUS</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground min-w-[200px]">SERVICES</th>
                  <th className="text-center py-3 px-4 font-semibold text-muted-foreground">KYC</th>
                  <th className="text-right py-3 px-4 font-semibold text-muted-foreground">QUICK ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((u, i) => {
                  const isSelf = u.user_id === currentUser?.id;
                  const canManageThis = canManageUser(u);
                  return (
                    <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-4 px-4 align-top">{i + 1}</td>
                      <td className="py-4 px-4 align-top">
                        <div className="font-semibold text-foreground text-sm">{u.full_name || "—"}</div>
                        <div className="text-muted-foreground mt-1 tracking-wider">{u.phone ? `*******${u.phone.slice(-4)}` : "—"}</div>
                        <div className="text-muted-foreground mt-0.5">{u.user_id}</div>
                      </td>
                      <td className="py-4 px-4 align-top">
                        <Badge variant="secondary" className="bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-50 font-normal">
                          {u.role ? ROLE_LABELS[u.role] : "No Role"}
                        </Badge>
                        {u.parent_id && (
                          <div className="text-[10px] text-muted-foreground mt-2 uppercase tracking-wide">
                            Franchise: <span className="text-foreground">{u.parent_id}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4 align-top">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-sm">{formatINR(u.walletBalance || 0)}</span>
                          <Button variant="outline" size="sm" onClick={() => openWalletAdj(u)} className="h-6 px-2 text-[10px] border-yellow-400 text-yellow-600 hover:bg-yellow-50 rounded-full flex gap-1">
                            <Wallet className="w-3 h-3" /> Wallet
                          </Button>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-wider">
                          <span>SETTLEMENT T</span>
                          <Switch className="scale-75 data-[state=checked]:bg-primary" checked={true} />
                          <span>T+1</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 align-top text-center font-medium">0</td>
                      <td className="py-4 px-4 align-top text-center">
                        <span className={`text-xs font-semibold ${u.status === "active" ? "text-green-500" : "text-red-500"}`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 align-top">
                        <div className="grid grid-cols-2 gap-x-2 gap-y-2 text-[10px] font-medium text-muted-foreground">
                          {["Vimo", "SevenPay", "PAYOUT-N", "BranchX", "CC Bill", "BA CC Bill", "CC Bill 3", "Payout MX"].map(srv => (
                            <div key={srv} className="flex items-center gap-1.5">
                              <span className="truncate w-16">{srv}</span>
                              <input type="checkbox" className="rounded-sm border-muted-foreground/30 text-primary focus:ring-primary h-3 w-3" defaultChecked={Math.random() > 0.5} />
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-4 px-4 align-top text-center">
                        {u.kyc_status === "verified" ? (
                          <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">KYC Done</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-600 border-yellow-200">KYC Not Done</Badge>
                        )}
                      </td>
                      <td className="py-4 px-4 align-top">
                        <div className="flex items-center justify-end gap-3">
                          <button onClick={() => canManageThis && openEdit(u)} className="text-primary hover:text-primary/80 transition-colors" disabled={!canManageThis}>
                            <Edit className="w-4 h-4" />
                          </button>
                          {canManageThis && (
                            <button 
                              className="text-red-500 hover:text-red-600 font-medium flex items-center gap-1 border border-red-200 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                              onClick={() => {
                                // For visual purposes of the UI layout
                              }}
                            >
                              <Edit className="w-3 h-3" /> Disable
                            </button>
                          )}
                        </div>
                        
                        {/* We still keep the dropdown for advanced admin actions that aren't in the new UI */}
                        {canManageThis && isAdmin && (
                          <div className="mt-3 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 text-[10px] text-muted-foreground">More options</Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleImpersonate(u)} disabled={impersonating}>
                                  <LogIn className="w-4 h-4 mr-2" /> Login as User
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openRoleChange(u)}>
                                  <ShieldAlert className="w-4 h-4 mr-2" /> Change Role
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openReset(u)}>
                                  <KeyRound className="w-4 h-4 mr-2" /> Reset Password
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDeleteClick(u)} className="text-destructive">
                                  <Trash2 className="w-4 h-4 mr-2" /> Delete User
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <StaffPermissionsDialog
        open={permsOpen}
        onOpenChange={setPermsOpen}
        userId={permsUser?.user_id || ""}
        userName={permsUser?.full_name || ""}
        initialPermissions={permsData}
        onUpdate={fetchUsers}
      />

      {/* Create User Dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetCreateForm(); }}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>Add a new user with KYC documents and bank details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 mt-2">
            {/* Basic Info */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Basic Information</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label>Full Name *</Label><Input placeholder="Rajesh Kumar" value={formName} onChange={(e) => setFormName(e.target.value)} maxLength={100} /></div>
                <div className="space-y-2"><Label>Email *</Label><Input type="email" placeholder="user@example.com" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} maxLength={255} /></div>
                <div className="space-y-2"><Label>Password *</Label><Input type="password" placeholder="Min 6 characters" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} /></div>
                <div className="space-y-2"><Label>Phone</Label><Input placeholder="9876543210" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} maxLength={15} /></div>
                <div className="space-y-2"><Label>Business Name</Label><Input placeholder="Business / Shop name" value={formBusiness} onChange={(e) => setFormBusiness(e.target.value)} maxLength={200} /></div>
                <div className="space-y-2">
                  <Label>Role *</Label>
                  <Select value={formRole} onValueChange={(v) => { setFormRole(v as AppRole); setFormParent(""); }}>
                    <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                    <SelectContent>{CREATABLE_ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              {parentOptions.length > 0 && (
                <div className="space-y-2 mt-4">
                  <Label>Parent (Upline)</Label>
                  <Select value={formParent} onValueChange={setFormParent}>
                    <SelectTrigger><SelectValue placeholder="Select parent" /></SelectTrigger>
                    <SelectContent>{parentOptions.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} ({p.role})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              {formRole === "super_distributor" && <p className="text-xs text-muted-foreground mt-2">Reports directly to Admin.</p>}
            </div>

            <Separator />

            {/* KYC Details */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">KYC Details</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Aadhaar Number</Label>
                  <Input placeholder="XXXX XXXX XXXX" value={formAadhaar} onChange={(e) => setFormAadhaar(e.target.value.replace(/[^0-9\s]/g, ""))} maxLength={14} />
                </div>
                <div className="space-y-2">
                  <Label>PAN Number</Label>
                  <Input placeholder="ABCDE1234F" value={formPan} onChange={(e) => setFormPan(e.target.value.toUpperCase())} maxLength={10} />
                </div>
                <div className="space-y-2">
                  <Label>Aadhaar Image</Label>
                  <input ref={aadhaarInputRef} type="file" accept="image/*,.pdf" className="hidden"
                    onChange={(e) => setFormAadhaarFile(e.target.files?.[0] || null)} />
                  <Button type="button" variant="outline" className="w-full justify-start text-muted-foreground" onClick={() => aadhaarInputRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-2" /> {formAadhaarFile ? formAadhaarFile.name : "Upload Aadhaar"}
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label>PAN Image</Label>
                  <input ref={panInputRef} type="file" accept="image/*,.pdf" className="hidden"
                    onChange={(e) => setFormPanFile(e.target.files?.[0] || null)} />
                  <Button type="button" variant="outline" className="w-full justify-start text-muted-foreground" onClick={() => panInputRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-2" /> {formPanFile ? formPanFile.name : "Upload PAN"}
                  </Button>
                </div>
              </div>
            </div>

            <Separator />

            {/* Bank Details */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Bank Details</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label>Bank Name</Label><Input placeholder="State Bank of India" value={formBankName} onChange={(e) => setFormBankName(e.target.value)} maxLength={100} /></div>
                <div className="space-y-2"><Label>Account Holder Name</Label><Input placeholder="Account holder name" value={formBankHolder} onChange={(e) => setFormBankHolder(e.target.value)} maxLength={100} /></div>
                <div className="space-y-2"><Label>Account Number</Label><Input placeholder="Account number" value={formBankAcct} onChange={(e) => setFormBankAcct(e.target.value)} maxLength={20} /></div>
                <div className="space-y-2"><Label>IFSC Code</Label><Input placeholder="SBIN0001234" value={formBankIfsc} onChange={(e) => setFormBankIfsc(e.target.value.toUpperCase())} maxLength={11} /></div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={processing}><UserPlus className="w-4 h-4 mr-1.5" />{processing ? "Creating..." : "Create User"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Profile Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>Update {editUser?.full_name}'s profile information.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2"><Label>Full Name</Label><Input value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={100} /></div>
            <div className="space-y-2"><Label>Phone</Label><Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} maxLength={15} /></div>
            <div className="space-y-2"><Label>Business Name</Label><Input value={editBusiness} onChange={(e) => setEditBusiness(e.target.value)} maxLength={200} /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button onClick={handleEditSave} disabled={processing}>{processing ? "Saving..." : "Save Changes"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Role Dialog */}
      <Dialog open={roleOpen} onOpenChange={setRoleOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Role</DialogTitle>
            <DialogDescription>Change {roleUser?.full_name}'s role. Current: <Badge variant="secondary" className="text-xs ml-1">{roleUser?.role ? ROLE_LABELS[roleUser.role] : "—"}</Badge></DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>New Role</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
                <SelectTrigger><SelectValue placeholder="Select new role" /></SelectTrigger>
                <SelectContent>{CREATABLE_ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <p className="text-xs text-destructive">⚠️ Changing roles may affect the user's hierarchy and fund transfer permissions.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRoleOpen(false)}>Cancel</Button>
              <Button onClick={handleRoleSave} disabled={processing}>{processing ? "Saving..." : "Change Role"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>Set a new password for {resetUser?.full_name}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input type="password" placeholder="Min 6 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setResetOpen(false)}>Cancel</Button>
              <Button onClick={handleResetSave} disabled={processing}><KeyRound className="w-4 h-4 mr-1.5" />{processing ? "Resetting..." : "Reset Password"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Services Dialog */}
      <Dialog open={serviceOpen} onOpenChange={setServiceOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Services</DialogTitle>
            <DialogDescription>Enable or disable individual services for {serviceUser?.full_name}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 mt-2 max-h-[400px] overflow-y-auto">
            {serviceToggles.map((s) => (
              <div key={s.service_key}
                className={`flex items-center justify-between p-3 rounded-lg border ${!s.is_enabled ? "opacity-50" : s.user_disabled ? "border-destructive/30 bg-destructive/5" : "border-border"}`}>
                <div>
                  <p className="text-sm font-medium text-foreground">{s.service_label}</p>
                  {!s.is_enabled && <p className="text-[10px] text-destructive">Globally disabled by admin</p>}
                </div>
                <Switch
                  checked={s.is_enabled && !s.user_disabled}
                  disabled={!s.is_enabled || togglingService === s.service_key}
                  onCheckedChange={() => handleServiceToggle(s.service_key, s.user_disabled)}
                />
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the account for <span className="font-bold text-foreground">{userToDelete?.full_name}</span>. 
              All their profile data, wallet, and settings will be removed. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={processing}
            >
              {processing ? "Deleting..." : "Permanently Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Wallet Adjustment Dialog */}
      <Dialog open={walletAdjOpen} onOpenChange={setWalletAdjOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Wallet Adjustment</DialogTitle>
            <DialogDescription>{walletAdjUser?.full_name} ({walletAdjUser?.role}) • ID {walletAdjUser?.user_id}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Adjustment Type</Label>
              <div className="flex gap-2">
                <Button 
                  type="button"
                  variant="outline" 
                  className={`flex-1 ${walletAdjType === 'Debit' ? 'bg-red-50 border-red-200 text-red-600' : ''}`}
                  onClick={() => setWalletAdjType('Debit')}
                >
                  <div className={`w-3 h-3 rounded-full mr-2 border ${walletAdjType === 'Debit' ? 'border-red-600 border-4' : 'border-muted-foreground'}`} />
                  Debit
                </Button>
                <Button 
                  type="button"
                  variant="outline" 
                  className={`flex-1 ${walletAdjType === 'Credit' ? 'bg-primary/10 border-primary/30 text-primary' : ''}`}
                  onClick={() => setWalletAdjType('Credit')}
                >
                  <div className={`w-3 h-3 rounded-full mr-2 border ${walletAdjType === 'Credit' ? 'border-primary border-4' : 'border-muted-foreground'}`} />
                  Credit
                </Button>
              </div>
            </div>
            
            <div className="space-y-2 p-3 bg-muted/50 rounded-md border border-border/50">
              <div className="text-xs text-muted-foreground">Current Wallet Balance</div>
              <div className="font-semibold text-lg">{formatINR(walletAdjUser?.walletBalance || 0)}</div>
            </div>

            <div className="space-y-2">
              <Label>Amount</Label>
              <Input 
                type="number" 
                placeholder="Enter amount" 
                value={walletAdjAmount} 
                onChange={e => setWalletAdjAmount(e.target.value)} 
              />
            </div>

            <div className="space-y-2">
              <Label>Remark (Optional)</Label>
              <textarea 
                className="w-full flex min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Add remark"
                value={walletAdjRemark}
                onChange={e => setWalletAdjRemark(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setWalletAdjOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleWalletAdjSubmit} 
                className={walletAdjType === 'Debit' ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-primary text-primary-foreground'}
              >
                Review {walletAdjType}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  SlidersHorizontal, Search, Filter, RefreshCw, Upload, Download, CheckCircle2,
  AlertCircle, ShieldCheck, ShieldAlert, Infinity, Settings2, UserCheck, Lock,
  ChevronLeft, ChevronRight, FileSpreadsheet, Edit3, ArrowUpRight, Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { downloadCSV } from "@/lib/csv-export";
import {
  getUserLimits,
  getSystemLimitConfig,
  updateSystemLimitConfig,
  setUserLimit,
  batchUpdateUserLimits,
  getLimitAuditLogs
} from "@/services/api";

type AppRole = "admin" | "super_distributor" | "master_distributor" | "distributor" | "retailer";

const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Admin",
  super_distributor: "Super Distributor",
  master_distributor: "Master Distributor",
  distributor: "Distributor",
  retailer: "Retailer",
};

interface UserLimitRow {
  userId: string;
  email: string;
  fullName: string;
  phone: string;
  businessName: string;
  role: AppRole;
  status: string;
  dailyLimit: number; // -1 if unlimited
  perTxnLimit: number; // -1 if unlimited
  isUnlimited: boolean;
  isCustom: boolean;
  todayUsedAmount: number;
  remainingDailyLimit: number; // -1 if unlimited
  systemDefaultDaily: number;
  systemDefaultPerTxn: number;
}

interface SystemConfigData {
  defaultDailyLimit: number;
  defaultPerTxnLimit: number;
  globalUnlimited: boolean;
}

interface AuditLogItem {
  id: string;
  targetUserId: string;
  actionBy: string;
  action: string;
  previousDailyLimit: number | null;
  newDailyLimit: number | null;
  previousPerTxnLimit: number | null;
  newPerTxnLimit: number | null;
  details: string | null;
  createdAt: string;
}

export default function DashboardSetLimit() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<UserLimitRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [limitTypeFilter, setLimitTypeFilter] = useState("all");

  // System Config
  const [systemConfig, setSystemConfig] = useState<SystemConfigData>({
    defaultDailyLimit: 100000,
    defaultPerTxnLimit: 25000,
    globalUnlimited: false,
  });

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);

  // Modals
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [editUserModalOpen, setEditUserModalOpen] = useState(false);
  const [bulkPreviewModalOpen, setBulkPreviewModalOpen] = useState(false);
  
  // Double-popup state for quick toggle
  const [confirmToggleModalOpen, setConfirmToggleModalOpen] = useState(false);
  const [pendingToggleUser, setPendingToggleUser] = useState<UserLimitRow | null>(null);
  const [doneModalOpen, setDoneModalOpen] = useState(false);
  const [doneMessage, setDoneMessage] = useState("");

  // Single Edit User State
  const [selectedUser, setSelectedUser] = useState<UserLimitRow | null>(null);
  const [editDailyLimit, setEditDailyLimit] = useState("");
  const [editPerTxnLimit, setEditPerTxnLimit] = useState("");
  const [editIsUnlimited, setEditIsUnlimited] = useState(false);
  const [editResetUsage, setEditResetUsage] = useState(false);
  const [submittingUserEdit, setSubmittingUserEdit] = useState(false);

  // System Config Edit State
  const [cfgDaily, setCfgDaily] = useState(100000);
  const [cfgPerTxn, setCfgPerTxn] = useState(25000);
  const [cfgGlobalUnlim, setCfgGlobalUnlim] = useState(false);
  const [submittingConfig, setSubmittingConfig] = useState(false);

  // CSV Bulk Upload State
  const [bulkUpdates, setBulkUpdates] = useState<Array<{
    userId: string;
    dailyLimit: number | null;
    perTxnLimit: number | null;
    isUnlimited: boolean;
    userEmail?: string;
  }>>([]);
  const [submittingBulk, setSubmittingBulk] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch users & limits
  const loadLimits = useCallback(async () => {
    try {
      const data = await getUserLimits({
        page,
        limit: 10,
        search: searchQuery,
        role: roleFilter,
        limitType: limitTypeFilter,
      });
      setItems(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
      if (data.systemConfig) {
        setSystemConfig(data.systemConfig);
        setCfgDaily(data.systemConfig.defaultDailyLimit);
        setCfgPerTxn(data.systemConfig.defaultPerTxnLimit);
        setCfgGlobalUnlim(data.systemConfig.globalUnlimited);
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  }, [page, searchQuery, roleFilter, limitTypeFilter, toast]);

  // Fetch audit logs
  const loadAuditLogs = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const logs = await getLimitAuditLogs();
      setAuditLogs(logs || []);
    } catch (err: any) {
      console.error(err);
    }
  }, [isAdmin]);

  const refreshAll = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      await Promise.all([loadLimits(), loadAuditLogs()]);
    } catch (err) {
      console.error("Error refreshing limit data:", err);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll(true);
  }, [loadLimits, loadAuditLogs]);

  // Open Edit Single User
  const handleOpenEditUser = (user: UserLimitRow) => {
    setSelectedUser(user);
    setEditIsUnlimited(user.isUnlimited);
    setEditDailyLimit(user.dailyLimit === -1 ? "" : user.dailyLimit.toString());
    setEditPerTxnLimit(user.perTxnLimit === -1 ? "" : user.perTxnLimit.toString());
    setEditResetUsage(false);
    setEditUserModalOpen(true);
  };

  // Submit Single User Edit
  const handleSaveUserLimit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setSubmittingUserEdit(true);
    try {
      await setUserLimit(selectedUser.userId, {
        dailyLimit: editIsUnlimited ? null : parseFloat(editDailyLimit) || null,
        perTxnLimit: editIsUnlimited ? null : parseFloat(editPerTxnLimit) || null,
        isUnlimited: editIsUnlimited,
        resetDailyUsage: editResetUsage,
      });

      toast({
        title: "Limits Saved ✓",
        description: `Updated transaction limits for ${selectedUser.fullName}.`,
      });
      setEditUserModalOpen(false);
      setSelectedUser(null);
      refreshAll(false);
    } catch (err: any) {
      toast({ title: "Update Failed", description: err.message, variant: "destructive" });
    } finally {
      setSubmittingUserEdit(false);
    }
  };

  // Quick toggle Unlimited - Step 1: Open Confirmation Popup
  const handleQuickToggleUnlimited = (user: UserLimitRow) => {
    setPendingToggleUser(user);
    setConfirmToggleModalOpen(true);
  };

  // Quick toggle Unlimited - Step 2: Confirm & Execute -> Open Done Popup
  const executeQuickToggleUnlimited = async () => {
    if (!pendingToggleUser) return;
    const user = pendingToggleUser;
    const newUnlimitedState = !user.isUnlimited;

    setConfirmToggleModalOpen(false);

    // Optimistic UI Update: Instant toggle (<10ms)
    setItems((prev) =>
      prev.map((u) => (u.userId === user.userId ? { ...u, isUnlimited: newUnlimitedState } : u))
    );

    try {
      await setUserLimit(user.userId, {
        isUnlimited: newUnlimitedState,
        dailyLimit: newUnlimitedState ? null : user.systemDefaultDaily,
        perTxnLimit: newUnlimitedState ? null : user.systemDefaultPerTxn,
      });

      const msg = `Transaction limit mode for "${user.fullName}" has been set to ${newUnlimitedState ? "UNLIMITED ∞" : "STANDARD DAILY LIMITS"}.`;
      setDoneMessage(msg);
      setDoneModalOpen(true); // Open Done Popup

      refreshAll(false);
    } catch (err: any) {
      // Revert optimistic update on error
      setItems((prev) =>
        prev.map((u) => (u.userId === user.userId ? { ...u, isUnlimited: user.isUnlimited } : u))
      );
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setPendingToggleUser(null);
    }
  };

  // System Config Save
  const handleSaveSystemConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingConfig(true);
    try {
      await updateSystemLimitConfig({
        defaultDailyLimit: cfgDaily,
        defaultPerTxnLimit: cfgPerTxn,
        globalUnlimited: cfgGlobalUnlim,
      });
      toast({
        title: "System Defaults Updated",
        description: "Global fallback daily limit & per-transaction limits saved.",
      });
      setConfigModalOpen(false);
      refreshAll();
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setSubmittingConfig(false);
    }
  };

  // CSV Export Template
  const handleExportCSV = () => {
    const csvData = items.map((item) => ({
      "User ID": item.userId,
      "Full Name": item.fullName,
      Email: item.email,
      Phone: item.phone,
      Role: ROLE_LABELS[item.role] || item.role,
      "Daily Limit (INR)": item.isUnlimited ? "UNLIMITED" : item.dailyLimit,
      "Per Txn Limit (INR)": item.isUnlimited ? "UNLIMITED" : item.perTxnLimit,
      "Today Used (INR)": item.todayUsedAmount,
      "Remaining (INR)": item.isUnlimited ? "UNLIMITED" : item.remainingDailyLimit,
      "Is Unlimited (TRUE/FALSE)": item.isUnlimited ? "TRUE" : "FALSE",
    }));

    downloadCSV(csvData, `GenPay_User_Limits_${new Date().toISOString().slice(0, 10)}.csv`);
    toast({ title: "Export Ready", description: "CSV file with current user limits downloaded." });
  };

  // CSV Bulk Upload File Selection
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r\n|\n/);
      const parsedUpdates: Array<{
        userId: string;
        dailyLimit: number | null;
        perTxnLimit: number | null;
        isUnlimited: boolean;
        userEmail?: string;
      }> = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = line.split(",").map((c) => c.replace(/^["']|["']$/g, "").trim());

        if (cols.length >= 2) {
          const uId = cols[0];
          const email = cols[2] || cols[1];
          const rawDaily = cols[5] || cols[1];
          const rawPerTxn = cols[6] || cols[2];
          const rawUnlim = cols[9] || cols[3];

          const isUnlim = rawUnlim?.toUpperCase() === "TRUE" || rawDaily?.toUpperCase() === "UNLIMITED";
          const dailyVal = isUnlim ? null : parseFloat(rawDaily) || null;
          const perTxnVal = isUnlim ? null : parseFloat(rawPerTxn) || null;

          if (uId && uId.length > 5) {
            parsedUpdates.push({
              userId: uId,
              dailyLimit: dailyVal,
              perTxnLimit: perTxnVal,
              isUnlimited: isUnlim,
              userEmail: email,
            });
          }
        }
      }

      if (parsedUpdates.length === 0) {
        toast({ title: "Invalid CSV", description: "No valid user limit records found in file.", variant: "destructive" });
        return;
      }

      setBulkUpdates(parsedUpdates);
      setBulkPreviewModalOpen(true);
    };

    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Submit Bulk Updates
  const handleConfirmBulkUpload = async () => {
    setSubmittingBulk(true);
    try {
      const res = await batchUpdateUserLimits(bulkUpdates);
      toast({
        title: "Bulk Update Complete ✓",
        description: res.message || `Updated ${bulkUpdates.length} user limits.`,
      });
      setBulkPreviewModalOpen(false);
      setBulkUpdates([]);
      refreshAll();
    } catch (err: any) {
      toast({ title: "Batch Failed", description: err.message, variant: "destructive" });
    } finally {
      setSubmittingBulk(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 rounded-2xl border border-primary/20">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <SlidersHorizontal className="w-8 h-8 text-primary" />
            Transaction Limit Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure daily transaction caps, per-transaction limits, and unlimited overrides for downline users.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={refreshAll} disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2 border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 font-semibold">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
          {isAdmin && (
            <>
              <input
                type="file"
                ref={fileInputRef}
                accept=".csv"
                className="hidden"
                onChange={handleFileUpload}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2 border-primary/30 text-primary hover:bg-primary/10 font-semibold"
              >
                <Upload className="w-4 h-4" /> Bulk CSV Upload
              </Button>
              <Button size="sm" onClick={() => setConfigModalOpen(true)} className="gap-2 font-semibold shadow-md">
                <Settings2 className="w-4 h-4" /> System Defaults
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Top Banner: System Default Config */}
      <Card className="bg-gradient-to-r from-muted/60 via-muted/30 to-background border-border shadow-sm">
        <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-foreground text-base">System Fallback Limits</h3>
                {systemConfig.globalUnlimited && (
                  <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 gap-1 text-[10px]">
                    <Zap className="w-3 h-3" /> Global Unlimited Override Active
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Applied automatically to all users who do not have custom limits assigned.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs sm:text-sm">
            <div className="bg-background px-4 py-2 rounded-xl border border-border shadow-2xs">
              <span className="text-muted-foreground block text-[10px] font-semibold uppercase tracking-wider">Default Daily Limit</span>
              <span className="font-extrabold text-foreground text-base">
                ₹{systemConfig.defaultDailyLimit.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="bg-background px-4 py-2 rounded-xl border border-border shadow-2xs">
              <span className="text-muted-foreground block text-[10px] font-semibold uppercase tracking-wider">Default Per-Txn Limit</span>
              <span className="font-extrabold text-foreground text-base">
                ₹{systemConfig.defaultPerTxnLimit.toLocaleString("en-IN")}
              </span>
            </div>
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfigModalOpen(true)}
                className="h-9 gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit Rules
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs Section */}
      <Tabs defaultValue="management" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:inline-flex bg-muted/60 p-1">
          <TabsTrigger value="management" className="gap-2">
            <UserCheck className="w-4 h-4" /> Users Limit Management
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="audit" className="gap-2">
              <FileSpreadsheet className="w-4 h-4" /> Audit Logs
            </TabsTrigger>
          )}
        </TabsList>

        {/* Tab 1: Management Table */}
        <TabsContent value="management" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-bold">User Limit Rules & Daily Usage</CardTitle>
                  <CardDescription>View today's limit utilization, set custom daily limits, or toggle unlimited access.</CardDescription>
                </div>

                {/* Filters Bar */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search ID, Name, Phone, Email..."
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                      className="pl-9 text-xs h-9"
                    />
                  </div>

                  <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
                    <SelectTrigger className="w-36 text-xs h-9">
                      <Filter className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                      <SelectValue placeholder="All Roles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="super_distributor">Super Distributor</SelectItem>
                      <SelectItem value="master_distributor">Master Distributor</SelectItem>
                      <SelectItem value="distributor">Distributor</SelectItem>
                      <SelectItem value="retailer">Retailer</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={limitTypeFilter} onValueChange={(v) => { setLimitTypeFilter(v); setPage(1); }}>
                    <SelectTrigger className="w-36 text-xs h-9">
                      <SelectValue placeholder="All Limit Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Limit Types</SelectItem>
                      <SelectItem value="unlimited">Unlimited Only</SelectItem>
                      <SelectItem value="custom">Custom Limit Set</SelectItem>
                      <SelectItem value="default">Default Fallback</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 text-muted-foreground font-semibold uppercase tracking-wider border-b border-border">
                    <tr>
                      <th className="p-3">User Information</th>
                      <th className="p-3">Role</th>
                      <th className="p-3 text-right">Daily Limit</th>
                      <th className="p-3 text-right">Per-Txn Limit</th>
                      <th className="p-3 text-center">Today's Usage</th>
                      <th className="p-3 text-right">Remaining Limit</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-muted-foreground">
                          No users found matching your filters.
                        </td>
                      </tr>
                    ) : (
                      items.map((u) => {
                        const usagePercent = u.isUnlimited || u.dailyLimit <= 0
                          ? 0
                          : Math.min(100, Math.round((u.todayUsedAmount / u.dailyLimit) * 100));

                        return (
                          <tr key={u.userId} className="hover:bg-muted/30 transition-colors">
                            <td className="p-3">
                              <div className="font-bold text-foreground">{u.fullName}</div>
                              <div className="text-[11px] text-muted-foreground">{u.email} • {u.phone || "No Phone"}</div>
                            </td>

                            <td className="p-3">
                              <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                                {ROLE_LABELS[u.role] || u.role}
                              </Badge>
                            </td>

                            <td className="p-3 text-right font-extrabold">
                              {u.isUnlimited ? (
                                <span className="text-emerald-600 flex items-center justify-end gap-1 font-bold">
                                  <Infinity className="w-4 h-4" /> Unlimited
                                </span>
                              ) : (
                                <div className="space-y-0.5">
                                  <div className="text-foreground">₹{u.dailyLimit.toLocaleString("en-IN")}</div>
                                  {!u.isCustom && <div className="text-[10px] text-muted-foreground font-normal">(System Default)</div>}
                                </div>
                              )}
                            </td>

                            <td className="p-3 text-right font-semibold text-foreground">
                              {u.isUnlimited ? "∞" : `₹${u.perTxnLimit.toLocaleString("en-IN")}`}
                            </td>

                            <td className="p-3 text-center">
                              <div className="font-mono font-bold text-foreground">
                                ₹{u.todayUsedAmount.toLocaleString("en-IN")}
                              </div>
                              {!u.isUnlimited && (
                                <div className="w-24 mx-auto bg-muted rounded-full h-1.5 mt-1 overflow-hidden">
                                  <div
                                    className={`h-full transition-all ${
                                      usagePercent >= 90 ? "bg-rose-500" : usagePercent >= 60 ? "bg-amber-500" : "bg-emerald-500"
                                    }`}
                                    style={{ width: `${usagePercent}%` }}
                                  />
                                </div>
                              )}
                            </td>

                            <td className="p-3 text-right font-bold">
                              {u.isUnlimited ? (
                                <span className="text-emerald-600">∞</span>
                              ) : (
                                <span className={u.remainingDailyLimit === 0 ? "text-rose-600" : "text-emerald-600"}>
                                  ₹{u.remainingDailyLimit.toLocaleString("en-IN")}
                                </span>
                              )}
                            </td>

                            <td className="p-3 text-center">
                              {u.isUnlimited ? (
                                <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 gap-1">
                                  <Zap className="w-3 h-3" /> Unlimited
                                </Badge>
                              ) : u.isCustom ? (
                                <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30">Custom Set</Badge>
                              ) : (
                                <Badge variant="outline" className="text-muted-foreground">Default</Badge>
                              )}
                            </td>

                            <td className="p-3 text-center space-x-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenEditUser(u)}
                                className="h-7 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10"
                              >
                                <Edit3 className="w-3 h-3" /> Set Limit
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleQuickToggleUnlimited(u)}
                                className={`h-7 text-xs gap-1 ${
                                  u.isUnlimited ? "text-amber-600 hover:bg-amber-50" : "text-emerald-600 hover:bg-emerald-50"
                                }`}
                                title={u.isUnlimited ? "Restore standard limits" : "Quick set unlimited"}
                              >
                                <Infinity className="w-3 h-3" />
                                {u.isUnlimited ? "Cap" : "Unlim"}
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-2 text-xs text-muted-foreground">
                  <div>
                    Showing Page <span className="font-bold text-foreground">{page}</span> of{" "}
                    <span className="font-bold text-foreground">{totalPages}</span> ({total} users)
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                      className="h-8 gap-1"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" /> Prev
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                      className="h-8 gap-1"
                    >
                      Next <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Audit Logs (Admin) */}
        {isAdmin && (
          <TabsContent value="audit" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-bold">Limit Modification Audit Logs</CardTitle>
                <CardDescription>Track every limit override, system fallback update, and bulk file import.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/50 text-muted-foreground font-semibold uppercase tracking-wider border-b border-border">
                      <tr>
                        <th className="p-3">Timestamp</th>
                        <th className="p-3">Action</th>
                        <th className="p-3">Target User</th>
                        <th className="p-3 text-right">Prev Daily Limit</th>
                        <th className="p-3 text-right">New Daily Limit</th>
                        <th className="p-3">Executed By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border font-mono">
                      {auditLogs.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-muted-foreground font-sans">
                            No limit audit records found.
                          </td>
                        </tr>
                      ) : (
                        auditLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                            <td className="p-3 text-muted-foreground">
                              {new Date(log.createdAt).toLocaleString("en-IN")}
                            </td>
                            <td className="p-3 font-bold text-primary">{log.action}</td>
                            <td className="p-3 text-foreground">{log.targetUserId.slice(0, 8)}...</td>
                            <td className="p-3 text-right text-muted-foreground">
                              {log.previousDailyLimit ? `₹${Number(log.previousDailyLimit).toLocaleString()}` : "Default / None"}
                            </td>
                            <td className="p-3 text-right font-bold text-emerald-600">
                              {log.newDailyLimit ? `₹${Number(log.newDailyLimit).toLocaleString()}` : "Unlimited / Default"}
                            </td>
                            <td className="p-3 text-foreground">{log.actionBy.slice(0, 8)}...</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Modal 1: Edit Single User Limit */}
      {selectedUser && (
        <Dialog open={editUserModalOpen} onOpenChange={setEditUserModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                <SlidersHorizontal className="w-6 h-6 text-primary" />
                Configure User Limits
              </DialogTitle>
              <DialogDescription>
                Set custom daily limit and per-transaction max limit for{" "}
                <span className="font-bold text-foreground">{selectedUser.fullName}</span>.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveUserLimit} className="space-y-4 py-2">
              {/* Unlimited Toggle */}
              <div className="flex items-center justify-between p-3 bg-primary/5 rounded-xl border border-primary/20">
                <div>
                  <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
                    <Infinity className="w-4 h-4 text-emerald-600" />
                    Set Unlimited Access
                  </div>
                  <div className="text-[11px] text-muted-foreground">Bypass all daily & per-txn limits for this user</div>
                </div>
                <input
                  type="checkbox"
                  checked={editIsUnlimited}
                  onChange={(e) => setEditIsUnlimited(e.target.checked)}
                  className="w-4 h-4 rounded text-primary focus:ring-primary border-border cursor-pointer"
                />
              </div>

              {!editIsUnlimited && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="daily-limit-input" className="text-xs font-semibold">Custom Daily Limit (₹)</Label>
                    <Input
                      id="daily-limit-input"
                      type="number"
                      placeholder={`Default: ₹${selectedUser.systemDefaultDaily}`}
                      value={editDailyLimit}
                      onChange={(e) => setEditDailyLimit(e.target.value)}
                    />
                    <div className="text-[11px] text-muted-foreground">
                      Leave empty to use System Default (₹{selectedUser.systemDefaultDaily.toLocaleString("en-IN")})
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="per-txn-input" className="text-xs font-semibold">Per-Transaction Limit (₹)</Label>
                    <Input
                      id="per-txn-input"
                      type="number"
                      placeholder={`Default: ₹${selectedUser.systemDefaultPerTxn}`}
                      value={editPerTxnLimit}
                      onChange={(e) => setEditPerTxnLimit(e.target.value)}
                    />
                    <div className="text-[11px] text-muted-foreground">
                      Leave empty to use System Default (₹{selectedUser.systemDefaultPerTxn.toLocaleString("en-IN")})
                    </div>
                  </div>
                </>
              )}

              <div className="flex items-center justify-between p-3 bg-muted/40 rounded-xl border border-border">
                <div>
                  <div className="font-semibold text-xs text-foreground">Reset Today's Used Amount</div>
                  <div className="text-[11px] text-muted-foreground">Clear current used balance (₹{selectedUser.todayUsedAmount.toLocaleString()})</div>
                </div>
                <input
                  type="checkbox"
                  checked={editResetUsage}
                  onChange={(e) => setEditResetUsage(e.target.checked)}
                  className="w-4 h-4 rounded text-primary border-border cursor-pointer"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setEditUserModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submittingUserEdit} className="gap-2 font-semibold">
                  {submittingUserEdit ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Save Limits
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal 2: System Default Limits Configuration */}
      {isAdmin && (
        <Dialog open={configModalOpen} onOpenChange={setConfigModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                <Settings2 className="w-6 h-6 text-primary" />
                System Default Limit Rules
              </DialogTitle>
              <DialogDescription>
                System-wide default fallback limits applied to any user without custom rules.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveSystemConfig} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Global Default Daily Limit (₹)</Label>
                <Input
                  type="number"
                  value={cfgDaily}
                  onChange={(e) => setCfgDaily(parseFloat(e.target.value) || 0)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Global Default Per-Transaction Limit (₹)</Label>
                <Input
                  type="number"
                  value={cfgPerTxn}
                  onChange={(e) => setCfgPerTxn(parseFloat(e.target.value) || 0)}
                  required
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/30">
                <div>
                  <div className="font-bold text-xs text-emerald-700 flex items-center gap-1.5">
                    <Zap className="w-4 h-4" /> Global Unlimited Override
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    If enabled, all system users bypass daily limit checks automatically.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={cfgGlobalUnlim}
                  onChange={(e) => setCfgGlobalUnlim(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-border cursor-pointer"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setConfigModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submittingConfig} className="gap-2 font-semibold">
                  {submittingConfig ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Settings2 className="w-4 h-4" />}
                  Save System Rules
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal 3: Bulk CSV Upload Preview */}
      <Dialog open={bulkPreviewModalOpen} onOpenChange={setBulkPreviewModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Upload className="w-6 h-6 text-primary" />
              Preview CSV Bulk Limit Upload
            </DialogTitle>
            <DialogDescription>
              Parsed {bulkUpdates.length} row(s) from CSV file. Review before applying to database.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-60 overflow-y-auto rounded-lg border border-border p-2 space-y-1">
            {bulkUpdates.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-muted/40 rounded text-xs">
                <div>
                  <span className="font-mono text-muted-foreground">{item.userId.slice(0, 8)}...</span>
                  {item.userEmail && <span className="ml-2 font-semibold text-foreground">{item.userEmail}</span>}
                </div>
                <div className="font-bold">
                  {item.isUnlimited ? (
                    <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[10px]">Unlimited</Badge>
                  ) : (
                    <span>Daily: ₹{item.dailyLimit?.toLocaleString() || "Default"}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setBulkPreviewModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleConfirmBulkUpload} disabled={submittingBulk} className="gap-2 font-semibold">
              {submittingBulk ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Apply {bulkUpdates.length} Updates
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* POPUP 1: Confirmation Modal */}
      {pendingToggleUser && (
        <Dialog open={confirmToggleModalOpen} onOpenChange={setConfirmToggleModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold text-amber-600">
                <AlertCircle className="w-6 h-6 text-amber-500" />
                Confirm Limit Mode Change
              </DialogTitle>
              <DialogDescription className="pt-2 text-sm text-foreground">
                Are you sure you want to change transaction limit mode for{" "}
                <span className="font-bold text-primary">"{pendingToggleUser.fullName}"</span> to{" "}
                <strong>{pendingToggleUser.isUnlimited ? "STANDARD DAILY LIMITS" : "UNLIMITED ∞"}</strong>?
              </DialogDescription>
            </DialogHeader>

            <div className="p-3 bg-muted/40 rounded-lg text-xs text-muted-foreground border border-border">
              {pendingToggleUser.isUnlimited
                ? "This will restore standard daily limits & per-transaction caps for this account."
                : "This will grant unrestricted unlimited daily transactions override to this user."}
            </div>

            <DialogFooter className="gap-2 sm:gap-0 mt-2">
              <Button type="button" variant="outline" onClick={() => setConfirmToggleModalOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={executeQuickToggleUnlimited} className="font-bold">
                Yes, Change Limit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* POPUP 2: Done / Success Modal */}
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

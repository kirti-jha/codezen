import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Landmark, ArrowUpRight, Clock, CheckCircle2, AlertTriangle, XCircle, ShieldAlert,
  Settings2, Search, Filter, RefreshCw, Plus, FileText, ChevronLeft, ChevronRight,
  Building2, Banknote, ShieldCheck, HelpCircle, Lock, ArrowDownRight, Unlock,
  SlidersHorizontal, Upload, Download, ChevronUp, ChevronDown, UserCheck
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
import {
  getSettlementSummary,
  getSettlementHistory,
  requestSettlement,
  getSettlementHolds,
  placeSettlementHold,
  releaseSettlementHold,
  processSettlement,
  getSettlementConfig,
  updateSettlementConfig,
  getSettlementAuditLogs,
  getT0T1SettlementSettings,
  updateUserSettlementType,
  updateAllUserSettlementType,
  triggerT1Settlement,
  apiFetch
} from "@/services/api";
import {
  SETTLEMENT_UPDATED_EVENT,
  notifyUserSettlementUpdated,
  calculateUsableMainWalletBalance,
  getT1WalletBalance
} from "@/lib/userSettlement";

interface SummaryData {
  mainBalance: number;
  availableForSettlement: number;
  pendingSettlementAmount: number;
  totalHoldAmount: number;
  activeHoldsCount: number;
  totalSettledAmount: number;
  completedSettlementsCount: number;
  bankDetails: {
    bankName: string;
    accountNumber: string;
    ifsc: string;
    accountHolder: string;
  };
  kycStatus: string;
  config: {
    minSettlementAmount: number;
    maxSettlementAmount: number;
    settlementFeeType: string;
    settlementFeeValue: number;
    autoSettlementEnabled: boolean;
    settlementSchedule: string;
  };
}

interface SettlementItem {
  id: string;
  userId: string;
  amount: number;
  fee: number;
  netAmount: number;
  settlementType: string;
  payoutMode: string;
  status: string;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankIfsc: string | null;
  bankAccountHolder: string | null;
  referenceId: string | null;
  failureReason: string | null;
  remarks: string | null;
  createdAt: string;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
}

interface HoldItem {
  id: string;
  userId: string;
  amount: number;
  reason: string;
  status: string;
  placedBy: string;
  createdAt: string;
}

interface AuditLogItem {
  id: string;
  settlementId: string | null;
  userId: string;
  actionBy: string;
  action: string;
  details: string | null;
  createdAt: string;
}

export default function DashboardSettlements() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  
  // History state
  const [history, setHistory] = useState<SettlementItem[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPages, setHistoryPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Holds state
  const [holds, setHolds] = useState<HoldItem[]>([]);

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);

  // Users dropdown for admin
  const [usersList, setUsersList] = useState<{ id: string; email: string; fullName: string }[]>([]);

  // Modals state
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [placeHoldModalOpen, setPlaceHoldModalOpen] = useState(false);
  const [processModalOpen, setProcessModalOpen] = useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);

  // Request form state
  const [reqAmount, setReqAmount] = useState("");
  const [reqMode, setReqMode] = useState("bank_transfer");
  const [reqRemarks, setReqRemarks] = useState("");
  const [submittingReq, setSubmittingReq] = useState(false);

  // Place hold form state
  const [holdUserId, setHoldUserId] = useState("");
  const [holdAmount, setHoldAmount] = useState("");
  const [holdReason, setHoldReason] = useState("");
  const [submittingHold, setSubmittingHold] = useState(false);

  // Process form state
  const [selectedSettlement, setSelectedSettlement] = useState<SettlementItem | null>(null);
  const [processAction, setProcessAction] = useState<"complete" | "reject">("complete");
  const [processRefId, setProcessRefId] = useState("");
  const [processFailReason, setProcessFailReason] = useState("");
  const [processRemarks, setProcessRemarks] = useState("");
  const [submittingProcess, setSubmittingProcess] = useState(false);

  // Config form state
  const [cfgMin, setCfgMin] = useState(100);
  const [cfgMax, setCfgMax] = useState(500000);
  const [cfgFeeType, setCfgFeeType] = useState("flat");
  const [cfgFeeVal, setCfgFeeVal] = useState(5);
  const [cfgAuto, setCfgAuto] = useState(false);
  const [submittingCfg, setSubmittingCfg] = useState(false);

  // T0/T1 Dual-Wallet & Hierarchy Pool state
  const [t0T1Settings, setT0T1Settings] = useState<{
    settlementType: string;
    t0DailyLimit: number;
    t0TodayUsed: number;
    allocatedDownlineLimit: number;
    remainingSelfLimit: number;
    isT0Enabled: boolean;
    usableMainWalletBalance: number;
    t1WalletBalance: number;
    featureFlags: {
      posT0Settlement: boolean;
      userDailyLimit: boolean;
      t1CutoffTime: string;
    };
  } | null>(null);

  const [submittingT1Settlement, setSubmittingT1Settlement] = useState(false);
  const [bulkModeModalOpen, setBulkModeModalOpen] = useState(false);
  const [bulkModeType, setBulkModeType] = useState("T0");
  const [submittingBulkMode, setSubmittingBulkMode] = useState(false);

  // POS T0/T1 Limits Table & Confirmation Modal State
  const [posLimitSearch, setPosLimitSearch] = useState("");
  const [expandedFranchises, setExpandedFranchises] = useState<Record<string, boolean>>({
    sf1: true,
    mf1: true,
    f1: true,
    f4: true,
  });
  const [downlineSearch, setDownlineSearch] = useState<Record<string, string>>({});
  const [limitInputs, setLimitInputs] = useState<Record<string, string>>({
    sf1: "50000.00",
    mf1: "15000.00",
    f1: "6000.00",
    m1: "1000.00",
    m2: "1500.00",
    m3: "2000.00",
    m4: "5000.00",
    sf2: "75000.00",
    mf2: "25000.00",
    f2: "10000.00",
    m5: "3000.00",
    mf3: "30000.00",
    f3: "8000.00",
    m6: "2000.00",
    f4: "1000.00",
    m7: "100.00",
    u1: "Unassigned (T1)",
  });

  const [limitConfirmModalOpen, setLimitConfirmModalOpen] = useState(false);
  const [limitDoneModalOpen, setLimitDoneModalOpen] = useState(false);
  const [pendingLimitUser, setPendingLimitUser] = useState<{ id: string; name: string; code: string } | null>(null);
  const [pendingLimitValue, setPendingLimitValue] = useState("");
  const [excelUploadModalOpen, setExcelUploadModalOpen] = useState(false);

  const hierarchyUsers = [
    {
      id: "sf1",
      code: "APSF0001",
      name: "Super_Franchise_North",
      roleLabel: "SUPER FRANCHISE",
      roleType: "super_distributor",
      appliedRate: "Dynamic Rate Applied",
      appliedRateMode: "dynamic",
      limit: "50000.00",
      assignedPool: 50000,
      allocated: 20000,
      remaining: 30000,
      downlines: [
        {
          id: "mf1",
          code: "APMF0002",
          name: "Master_Franchise_Delhi",
          roleLabel: "MASTER FRANCHISE",
          roleType: "master_distributor",
          appliedRate: "Dynamic Rate Applied",
          appliedRateMode: "dynamic",
          limit: "15000.00",
          assignedPool: 15000,
          allocated: 6000,
          remaining: 9000,
          downlines: [
            {
              id: "f1",
              code: "APF00004",
              name: "AbheePay_Distributor",
              roleLabel: "FRANCHISE",
              roleType: "distributor",
              appliedRate: "Dynamic Rate Applied",
              appliedRateMode: "dynamic",
              limit: "6000.00",
              assignedPool: 6000,
              allocated: 2500,
              remaining: 3500,
              downlines: [
                {
                  id: "m1",
                  code: "APM00084",
                  name: "Merchant_One",
                  roleLabel: "MERCHANT",
                  roleType: "retailer",
                  appliedRate: "Dynamic Rate Applied",
                  appliedRateMode: "dynamic",
                  limit: "1000.00",
                  assignedPool: 1000,
                  allocated: 0,
                  remaining: 1000,
                },
                {
                  id: "m2",
                  code: "APM00085",
                  name: "Merchant_Two",
                  roleLabel: "MERCHANT",
                  roleType: "retailer",
                  appliedRate: "Dynamic Rate Applied",
                  appliedRateMode: "dynamic",
                  limit: "1500.00",
                  assignedPool: 1500,
                  allocated: 0,
                  remaining: 1500,
                },
              ],
            },
            {
              id: "m3",
              code: "APM00090",
              name: "Direct_Merchant_under_Master",
              roleLabel: "MERCHANT",
              roleType: "retailer",
              appliedRate: "Dynamic Rate Applied",
              appliedRateMode: "dynamic",
              limit: "2000.00",
              assignedPool: 2000,
              allocated: 0,
              remaining: 2000,
            },
          ],
        },
        {
          id: "m4",
          code: "APM00099",
          name: "Direct_Merchant_under_Super",
          roleLabel: "MERCHANT",
          roleType: "retailer",
          appliedRate: "Dynamic Rate Applied",
          appliedRateMode: "dynamic",
          limit: "50000.00",
          assignedPool: 5000,
          allocated: 0,
          remaining: 5000,
        },
      ],
    },
    {
      id: "sf2",
      code: "APSF0002",
      name: "Super_Franchise_South",
      roleLabel: "SUPER FRANCHISE",
      roleType: "super_distributor",
      appliedRate: "Dynamic Rate Applied",
      appliedRateMode: "dynamic",
      limit: "75000.00",
      assignedPool: 75000,
      allocated: 25000,
      remaining: 50000,
      downlines: [
        {
          id: "mf2",
          code: "APMF0005",
          name: "Master_Franchise_Bangalore",
          roleLabel: "MASTER FRANCHISE",
          roleType: "master_distributor",
          appliedRate: "Dynamic Rate Applied",
          appliedRateMode: "dynamic",
          limit: "25000.00",
          assignedPool: 25000,
          allocated: 10000,
          remaining: 15000,
          downlines: [
            {
              id: "f2",
              code: "APF00012",
              name: "South_Coast_Franchise",
              roleLabel: "FRANCHISE",
              roleType: "distributor",
              appliedRate: "Dynamic Rate Applied",
              appliedRateMode: "dynamic",
              limit: "10000.00",
              assignedPool: 10000,
              allocated: 3000,
              remaining: 7000,
              downlines: [
                {
                  id: "m5",
                  code: "APM00102",
                  name: "City_Point_Retail",
                  roleLabel: "MERCHANT",
                  roleType: "retailer",
                  appliedRate: "Dynamic Rate Applied",
                  appliedRateMode: "dynamic",
                  limit: "3000.00",
                  assignedPool: 3000,
                  allocated: 0,
                  remaining: 3000,
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "mf3",
      code: "APMF0010",
      name: "Master_Franchise_West",
      roleLabel: "MASTER FRANCHISE",
      roleType: "master_distributor",
      appliedRate: "Dynamic Rate Applied",
      appliedRateMode: "dynamic",
      limit: "30000.00",
      assignedPool: 30000,
      allocated: 8000,
      remaining: 22000,
      downlines: [
        {
          id: "f3",
          code: "APF00020",
          name: "West_Zone_Franchise",
          roleLabel: "FRANCHISE",
          roleType: "distributor",
          appliedRate: "Dynamic Rate Applied",
          appliedRateMode: "dynamic",
          limit: "8000.00",
          assignedPool: 8000,
          allocated: 2000,
          remaining: 6000,
          downlines: [
            {
              id: "m6",
              code: "APM00115",
              name: "Urban_Trader_Retail",
              roleLabel: "MERCHANT",
              roleType: "retailer",
              appliedRate: "Dynamic Rate Applied",
              appliedRateMode: "dynamic",
              limit: "2000.00",
              assignedPool: 2000,
              allocated: 0,
              remaining: 2000,
            },
          ],
        },
      ],
    },
    {
      id: "f4",
      code: "APF00099",
      name: "AbheePay_Direct_Franchise",
      roleLabel: "FRANCHISE",
      roleType: "distributor",
      appliedRate: "Dynamic Rate Applied",
      appliedRateMode: "dynamic",
      limit: "1000.00",
      assignedPool: 1000,
      allocated: 100,
      remaining: 900,
      downlines: [
        {
          id: "m7",
          code: "APM00150",
          name: "Direct_Franchise_Merchant",
          roleLabel: "MERCHANT",
          roleType: "retailer",
          appliedRate: "Dynamic Rate Applied",
          appliedRateMode: "dynamic",
          limit: "100.00",
          assignedPool: 100,
          allocated: 0,
          remaining: 100,
        },
      ],
    },
    {
      id: "u1",
      code: "APM00005",
      name: "Test_Merchant",
      roleLabel: "MERCHANT",
      roleType: "retailer",
      appliedRate: "T1 Rate Applied",
      appliedRateMode: "t1",
      limit: "Unassigned (T1)",
      assignedPool: 0,
      allocated: 0,
      remaining: 0,
    },
  ];

  const handleTriggerSaveLimitConfirm = (user: { id: string; name: string; code: string }) => {
    const val = limitInputs[user.id] || "0.00";
    setPendingLimitUser(user);
    setPendingLimitValue(val);
    setLimitConfirmModalOpen(true);
  };

  const handleConfirmSaveLimit = async () => {
    if (!pendingLimitUser) return;
    try {
      const parsedVal = parseFloat(pendingLimitValue);
      await updateUserSettlementType({
        targetUserId: pendingLimitUser.id,
        t0DailyLimit: isNaN(parsedVal) ? 0 : parsedVal,
        settlementType: "T0",
      });
      setLimitConfirmModalOpen(false);
      setLimitDoneModalOpen(true);
      toast({
        title: "Limit Updated Successfully",
        description: `T0 Daily Limit for ${pendingLimitUser.name} (${pendingLimitUser.code}) set to ₹${pendingLimitValue}.`,
      });
      refreshAll();
    } catch (err: any) {
      toast({
        title: "Failed to Update Limit",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  // Recursive Renderer for Multi-Level Hierarchy
  const renderHierarchyNode = (node: any, index: number, depth: number = 0) => {
    const isExpanded = !!expandedFranchises[node.id];
    const hasDownlines = Array.isArray(node.downlines) && node.downlines.length > 0;
    const currentSearch = downlineSearch[node.id] || "";

    const filteredDownlines = hasDownlines
      ? node.downlines.filter(
          (child: any) =>
            !currentSearch ||
            child.name.toLowerCase().includes(currentSearch.toLowerCase()) ||
            child.code.toLowerCase().includes(currentSearch.toLowerCase()) ||
            child.roleLabel.toLowerCase().includes(currentSearch.toLowerCase())
        )
      : [];

    const getRoleBadge = (roleLabel: string) => {
      switch (roleLabel) {
        case "SUPER FRANCHISE":
          return (
            <Badge className="text-[9px] bg-purple-500/15 text-purple-600 border-purple-500/30 font-extrabold">
              SUPER FRANCHISE
            </Badge>
          );
        case "MASTER FRANCHISE":
          return (
            <Badge className="text-[9px] bg-blue-500/15 text-blue-600 border-blue-500/30 font-extrabold">
              MASTER FRANCHISE
            </Badge>
          );
        case "FRANCHISE":
          return (
            <Badge className="text-[9px] bg-emerald-500/15 text-emerald-600 border-emerald-500/30 font-extrabold">
              FRANCHISE
            </Badge>
          );
        case "MERCHANT":
        default:
          return (
            <Badge className="text-[9px] bg-amber-500/15 text-amber-600 border-amber-500/30 font-extrabold">
              MERCHANT
            </Badge>
          );
      }
    };

    return (
      <React.Fragment key={node.id}>
        <tr className={`hover:bg-muted/30 transition-colors ${depth > 0 ? "bg-muted/10" : ""}`}>
          <td className="px-4 py-3 font-semibold text-muted-foreground">{index + 1}</td>
          <td className="px-4 py-3 font-mono font-bold text-foreground">{node.code}</td>
          <td className="px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground">{node.name}</span>
              {getRoleBadge(node.roleLabel)}

              {hasDownlines && (
                <button
                  type="button"
                  onClick={() =>
                    setExpandedFranchises((prev) => ({ ...prev, [node.id]: !prev[node.id] }))
                  }
                  className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 hover:bg-primary/20 px-2.5 py-0.5 rounded-full transition-all"
                >
                  {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {isExpanded ? "Hide Downlines" : "Show Downlines"} ({node.downlines.length})
                </button>
              )}
            </div>
          </td>

          <td className="px-4 py-3">
            {node.appliedRateMode === "dynamic" ? (
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> {node.appliedRate}
              </span>
            ) : (
              <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> {node.appliedRate}
              </span>
            )}
          </td>

          <td className="px-4 py-3">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground font-semibold">₹</span>
              <Input
                value={limitInputs[node.id] ?? node.limit}
                onChange={(e) =>
                  setLimitInputs({ ...limitInputs, [node.id]: e.target.value })
                }
                className="w-40 text-xs h-8 font-mono bg-background"
              />
            </div>
          </td>

          <td className="px-4 py-3 text-right">
            <Button
              size="sm"
              onClick={() => handleTriggerSaveLimitConfirm(node)}
              className="h-8 text-xs font-semibold px-3"
            >
              Save Limit
            </Button>
          </td>
        </tr>

        {/* EXPANDED DOWNLINE CONTAINER */}
        {isExpanded && hasDownlines && (
          <tr>
            <td colSpan={6} className="p-3 bg-muted/20">
              <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 dark:bg-primary/10 space-y-3">
                {/* Header with Live Metric Badges */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" />
                    <span className="font-bold text-xs text-foreground">
                      Downlines under {node.roleLabel} <span className="underline decoration-primary font-extrabold">{node.name}</span>
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      placeholder={`Search ${node.name} downlines...`}
                      value={currentSearch}
                      onChange={(e) =>
                        setDownlineSearch({ ...downlineSearch, [node.id]: e.target.value })
                      }
                      className="w-48 text-xs h-7 bg-background"
                    />

                    <Badge variant="outline" className="text-[10px] bg-background font-semibold">
                      Assigned Pool: ₹{node.assignedPool.toLocaleString("en-IN")}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] bg-background text-amber-600 border-amber-500/30 font-semibold">
                      Allocated: ₹{node.allocated.toLocaleString("en-IN")}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] bg-background text-emerald-600 border-emerald-500/30 font-semibold">
                      Remaining Self-Limit: ₹{node.remaining.toLocaleString("en-IN")}
                    </Badge>
                  </div>
                </div>

                {/* Sub-table */}
                <div className="overflow-x-auto rounded-lg border border-border/80 bg-card">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] font-bold border-b border-border">
                      <tr>
                        <th className="px-3 py-2">#</th>
                        <th className="px-3 py-2">USER ID</th>
                        <th className="px-3 py-2">USER NAME & ROLE</th>
                        <th className="px-3 py-2">APPLIED RATE</th>
                        <th className="px-3 py-2">T0 DAILY LIMIT (₹)</th>
                        <th className="px-3 py-2 text-right">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {filteredDownlines.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-4 text-center text-muted-foreground">
                            No downlines found matching search.
                          </td>
                        </tr>
                      ) : (
                        filteredDownlines.map((childNode: any, cIdx: number) =>
                          renderHierarchyNode(childNode, cIdx, depth + 1)
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </td>
          </tr>
        )}
      </React.Fragment>
    );
  };

  const handleDownloadLimitFormat = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["USER_ID,USER_NAME,ROLE,APPLIED_RATE_MODE,T0_DAILY_LIMIT"]
        .concat([
          "APM00005,Test_Merchant,MERCHANT,T1,Unassigned",
          "APF00004,AbheePay,FRANCHISE,DYNAMIC,1000.00",
          "APM00084,Merchant,MERCHANT,DYNAMIC,100.00",
        ])
        .join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `POS_T0_T1_Limits_Format.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Fetch summary
  const loadSummary = useCallback(async () => {
    try {
      const data = await getSettlementSummary();
      setSummary(data);
      if (data.config) {
        setCfgMin(data.config.minSettlementAmount);
        setCfgMax(data.config.maxSettlementAmount);
        setCfgFeeType(data.config.settlementFeeType);
        setCfgFeeVal(data.config.settlementFeeValue);
        setCfgAuto(data.config.autoSettlementEnabled);
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  }, [toast]);

  // Fetch T0/T1 Dual-Wallet Settings
  const loadT0T1Settings = useCallback(async () => {
    try {
      const data = await getT0T1SettlementSettings();
      setT0T1Settings(data);
    } catch (err: any) {
      console.error("Failed to load T0/T1 settings:", err);
    }
  }, []);

  const handleTriggerT1Settlement = async () => {
    setSubmittingT1Settlement(true);
    try {
      await triggerT1Settlement();
      toast({
        title: "T1 Settlement Executed",
        description: "T1 balances have been transferred to Main Wallet for settlement.",
      });
      refreshAll();
    } catch (err: any) {
      toast({
        title: "T1 Settlement Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSubmittingT1Settlement(false);
    }
  };

  const handleBulkModeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingBulkMode(true);
    try {
      await updateAllUserSettlementType({
        settlementType: bulkModeType,
        isT0Enabled: bulkModeType === "T0" || bulkModeType === "AUTO",
      });
      toast({
        title: "Bulk Mode Applied",
        description: `Settlement mode updated to ${bulkModeType} for downline merchants.`,
      });
      setBulkModeModalOpen(false);
      refreshAll();
    } catch (err: any) {
      toast({
        title: "Failed to Apply Bulk Mode",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSubmittingBulkMode(false);
    }
  };

  // Fetch history
  const loadHistory = useCallback(async () => {
    try {
      const data = await getSettlementHistory({
        page: historyPage,
        limit: 10,
        status: statusFilter,
        search: searchQuery,
      });
      setHistory(data.items || []);
      setHistoryTotal(data.total || 0);
      setHistoryPages(data.totalPages || 1);
    } catch (err: any) {
      console.error(err);
    }
  }, [historyPage, statusFilter, searchQuery]);

  // Fetch holds
  const loadHolds = useCallback(async () => {
    try {
      const data = await getSettlementHolds();
      setHolds(data || []);
    } catch (err: any) {
      console.error(err);
    }
  }, []);

  // Fetch audit logs
  const loadAuditLogs = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const data = await getSettlementAuditLogs();
      setAuditLogs(data || []);
    } catch (err: any) {
      console.error(err);
    }
  }, [isAdmin]);

  // Fetch user list for admin
  useEffect(() => {
    if (isAdmin) {
      apiFetch("/users").then((res) => {
        if (Array.isArray(res)) {
          setUsersList(res.map((u: any) => ({
            id: u.userId || u.id,
            email: u.email,
            fullName: u.profile?.fullName || u.email,
          })));
        }
      }).catch(console.error);
    }
  }, [isAdmin]);

  const refreshAll = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      await Promise.all([loadSummary(), loadT0T1Settings(), loadHistory(), loadHolds(), loadAuditLogs()]);
    } catch (err) {
      console.error("Error refreshing settlement data:", err);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll(true);
  }, [loadSummary, loadT0T1Settings, loadHistory, loadHolds, loadAuditLogs]);

  // Listen to live broadcast sync across tabs
  useEffect(() => {
    const handleSettlementUpdate = () => {
      refreshAll();
    };
    window.addEventListener(SETTLEMENT_UPDATED_EVENT, handleSettlementUpdate);
    return () => {
      window.removeEventListener(SETTLEMENT_UPDATED_EVENT, handleSettlementUpdate);
    };
  }, []);

  // Handle Request Settlement
  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(reqAmount);
    if (isNaN(amt) || amt <= 0) {
      toast({ title: "Validation Error", description: "Please enter a valid amount.", variant: "destructive" });
      return;
    }

    setSubmittingReq(true);
    try {
      await requestSettlement({
        amount: amt,
        payoutMode: reqMode,
        remarks: reqRemarks,
      });
      toast({ title: "Success", description: "Settlement request submitted successfully." });
      setRequestModalOpen(false);
      setReqAmount("");
      setReqRemarks("");
      refreshAll();
    } catch (err: any) {
      toast({ title: "Request Failed", description: err.message, variant: "destructive" });
    } finally {
      setSubmittingReq(false);
    }
  };

  // Handle Place Hold
  const handlePlaceHoldSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(holdAmount);
    if (!holdUserId || isNaN(amt) || amt <= 0 || !holdReason.trim()) {
      toast({ title: "Validation Error", description: "All fields are required.", variant: "destructive" });
      return;
    }

    setSubmittingHold(true);
    try {
      await placeSettlementHold({
        targetUserId: holdUserId,
        amount: amt,
        reason: holdReason,
      });
      toast({ title: "Hold Placed", description: "Settlement hold has been applied." });
      setPlaceHoldModalOpen(false);
      setHoldUserId("");
      setHoldAmount("");
      setHoldReason("");
      refreshAll();
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setSubmittingHold(false);
    }
  };

  // Handle Release Hold
  const handleReleaseHold = async (holdId: string) => {
    if (!confirm("Are you sure you want to release this settlement hold?")) return;
    try {
      await releaseSettlementHold(holdId);
      toast({ title: "Hold Released", description: "Settlement hold removed successfully." });
      refreshAll();
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  // Handle Process Settlement
  const handleProcessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSettlement) return;

    if (processAction === "complete" && !processRefId.trim()) {
      toast({ title: "Validation Error", description: "UTR / Transaction reference ID is required to mark as completed.", variant: "destructive" });
      return;
    }

    if (processAction === "reject" && !processFailReason.trim()) {
      toast({ title: "Validation Error", description: "Reason for rejection is required.", variant: "destructive" });
      return;
    }

    setSubmittingProcess(true);
    try {
      await processSettlement(selectedSettlement.id, {
        action: processAction,
        referenceId: processRefId,
        failureReason: processFailReason,
        remarks: processRemarks,
      });
      toast({
        title: processAction === "complete" ? "Settlement Completed" : "Settlement Rejected",
        description: `Settlement request ${processAction === "complete" ? "approved & completed" : "rejected & refunded"}.`,
      });
      setProcessModalOpen(false);
      setSelectedSettlement(null);
      setProcessRefId("");
      setProcessFailReason("");
      setProcessRemarks("");
      refreshAll();
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setSubmittingProcess(false);
    }
  };

  // Handle Config Submit
  const handleConfigSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingCfg(true);
    try {
      await updateSettlementConfig({
        minSettlementAmount: cfgMin,
        maxSettlementAmount: cfgMax,
        settlementFeeType: cfgFeeType,
        settlementFeeValue: cfgFeeVal,
        autoSettlementEnabled: cfgAuto,
      });
      toast({ title: "Settings Updated", description: "Global settlement parameters saved." });
      setConfigModalOpen(false);
      refreshAll();
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setSubmittingCfg(false);
    }
  };

  // Live fee calculation
  const parsedReqAmount = parseFloat(reqAmount) || 0;
  const currentFeeType = summary?.config.settlementFeeType || "flat";
  const currentFeeVal = summary?.config.settlementFeeValue || 0;
  const calculatedFee = currentFeeType === "percent" ? (parsedReqAmount * currentFeeVal) / 100 : currentFeeVal;
  const calculatedNet = Math.max(0, parsedReqAmount - calculatedFee);

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 border-emerald-500/30 gap-1"><CheckCircle2 className="w-3 h-3" /> Completed</Badge>;
      case "pending":
        return <Badge className="bg-amber-500/15 text-amber-600 hover:bg-amber-500/25 border-amber-500/30 gap-1"><Clock className="w-3 h-3" /> Pending</Badge>;
      case "processing":
        return <Badge className="bg-blue-500/15 text-blue-600 hover:bg-blue-500/25 border-blue-500/30 gap-1"><RefreshCw className="w-3 h-3 animate-spin" /> Processing</Badge>;
      case "failed":
      case "rejected":
        return <Badge className="bg-rose-500/15 text-rose-600 hover:bg-rose-500/25 border-rose-500/30 gap-1"><XCircle className="w-3 h-3" /> Failed</Badge>;
      case "on_hold":
        return <Badge className="bg-purple-500/15 text-purple-600 hover:bg-purple-500/25 border-purple-500/30 gap-1"><ShieldAlert className="w-3 h-3" /> On Hold</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 rounded-2xl border border-primary/20">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <Landmark className="w-8 h-8 text-primary" />
            Settlements & Payouts
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your daily settlement payouts, bank transfers, hold balances, and audit history.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={refreshAll} disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => setBulkModeModalOpen(true)} className="gap-2 border-primary/30 text-primary">
            <Building2 className="w-4 h-4" /> Downline Modes
          </Button>
          {isAdmin && (
            <>
              <Button variant="outline" size="sm" onClick={() => setConfigModalOpen(true)} className="gap-2 border-primary/30">
                <Settings2 className="w-4 h-4 text-primary" /> System Rules
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setPlaceHoldModalOpen(true)} className="gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600" /> Place Hold
              </Button>
            </>
          )}
          <Button onClick={() => setRequestModalOpen(true)} className="gap-2 font-semibold shadow-md">
            <ArrowUpRight className="w-4 h-4" /> Request Settlement
          </Button>
        </div>
      </div>

      {/* Dual-Wallet & Hierarchy Pool Allocation Banner */}
      {t0T1Settings && (
        <Card className="bg-gradient-to-r from-primary/5 via-background to-muted/40 border-primary/20 shadow-sm">
          <CardContent className="p-4 sm:p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Landmark className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-foreground text-base">Dual-Wallet Settlement Engine</h3>
                  <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 font-bold text-[10px]">
                    Active Mode: {t0T1Settings.settlementType}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  T0 (Instant Same-Day Settlement) • T1 (Next-Day Auto-Settlement at {t0T1Settings.featureFlags.t1CutoffTime})
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full lg:w-auto text-xs">
              <div className="bg-background p-3 rounded-xl border border-border">
                <span className="text-muted-foreground block text-[10px] font-semibold uppercase">T0 Daily Pool</span>
                <span className="font-extrabold text-foreground text-sm">
                  ₹{t0T1Settings.t0DailyLimit.toLocaleString("en-IN")}
                </span>
              </div>

              <div className="bg-background p-3 rounded-xl border border-border">
                <span className="text-muted-foreground block text-[10px] font-semibold uppercase">Allocated Downlines</span>
                <span className="font-extrabold text-amber-600 text-sm">
                  ₹{t0T1Settings.allocatedDownlineLimit.toLocaleString("en-IN")}
                </span>
              </div>

              <div className="bg-background p-3 rounded-xl border border-border">
                <span className="text-muted-foreground block text-[10px] font-semibold uppercase">Remaining Self Pool</span>
                <span className="font-extrabold text-emerald-600 text-sm">
                  ₹{t0T1Settings.remainingSelfLimit.toLocaleString("en-IN")}
                </span>
              </div>

              <div className="bg-background p-3 rounded-xl border border-border flex flex-col justify-between">
                <div>
                  <span className="text-muted-foreground block text-[10px] font-semibold uppercase">T1 Wallet Balance</span>
                  <span className="font-extrabold text-blue-600 text-sm">
                    ₹{t0T1Settings.t1WalletBalance.toLocaleString("en-IN")}
                  </span>
                </div>
                {t0T1Settings.t1WalletBalance > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleTriggerT1Settlement}
                    disabled={submittingT1Settlement}
                    className="h-6 text-[10px] mt-1 gap-1 border-blue-500/30 text-blue-600 hover:bg-blue-50"
                  >
                    {submittingT1Settlement ? <RefreshCw className="w-3 h-3 animate-spin" /> : "Settle T1 Now"}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Available Balance */}
        <Card className="relative overflow-hidden border-primary/20 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              Net Available Balance
              <Banknote className="w-4 h-4 text-emerald-500" />
            </CardDescription>
            <CardTitle className="text-3xl font-extrabold text-foreground">
              ₹{(summary?.availableForSettlement ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground flex items-center justify-between">
            <span>Main Wallet: ₹{(summary?.mainBalance ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            {summary?.kycStatus === "approved" ? (
              <span className="text-emerald-600 font-medium flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> KYC Verified</span>
            ) : (
              <span className="text-amber-600 font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> KYC Pending</span>
            )}
          </CardContent>
        </Card>

        {/* Card 2: Pending Settlements */}
        <Card className="relative overflow-hidden border-amber-500/20 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              Pending Settlement
              <Clock className="w-4 h-4 text-amber-500" />
            </CardDescription>
            <CardTitle className="text-3xl font-extrabold text-amber-600">
              ₹{(summary?.pendingSettlementAmount ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground flex items-center justify-between">
            <span>In processing queue</span>
            <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30">
              Instant / T+1
            </Badge>
          </CardContent>
        </Card>

        {/* Card 3: Active Holds */}
        <Card className="relative overflow-hidden border-rose-500/20 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              Active Holds
              <Lock className="w-4 h-4 text-rose-500" />
            </CardDescription>
            <CardTitle className="text-3xl font-extrabold text-rose-600">
              ₹{(summary?.totalHoldAmount ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground flex items-center justify-between">
            <span>{summary?.activeHoldsCount ?? 0} active hold(s)</span>
            <span className="text-rose-500 text-[11px] font-medium">Locked</span>
          </CardContent>
        </Card>

        {/* Card 4: Total Settled */}
        <Card className="relative overflow-hidden border-emerald-500/20 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              Total Settled
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </CardDescription>
            <CardTitle className="text-3xl font-extrabold text-emerald-600">
              ₹{(summary?.totalSettledAmount ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground flex items-center justify-between">
            <span>{summary?.completedSettlementsCount ?? 0} successful payouts</span>
            <span className="text-emerald-600 text-[11px] font-medium">All Time</span>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs Section */}
      <Tabs defaultValue="pos_limits" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 sm:w-auto sm:inline-flex bg-muted/60 p-1">
          <TabsTrigger value="pos_limits" className="gap-2 text-xs">
            <SlidersHorizontal className="w-4 h-4" /> POS T0/T1 Limits & Modes
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2 text-xs">
            <FileText className="w-4 h-4" /> Settlement Requests
          </TabsTrigger>
          <TabsTrigger value="holds" className="gap-2 text-xs">
            <ShieldAlert className="w-4 h-4" /> Active Holds ({holds.filter(h => h.status === "active").length})
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="audit" className="gap-2 text-xs">
              <Clock className="w-4 h-4" /> Audit Logs
            </TabsTrigger>
          )}
        </TabsList>

        {/* Tab 0: POS T0/T1 Limits & Modes (Reference UI Layout) */}
        <TabsContent value="pos_limits" className="space-y-6 mt-4">
          {/* Header Banner */}
          <Card className="border border-border/80 shadow-sm bg-gradient-to-r from-primary/5 via-card to-muted/20">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
                    <SlidersHorizontal className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold font-heading text-foreground tracking-tight">
                      POS T0 / T1 Settlement & User Daily Limit Settings
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
                      Manage Settlement Modes & T0 daily limits for Franchises & Direct Merchants. Tap a Franchise to expand and overwrite their Merchants.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => setExcelUploadModalOpen(true)}
                    className="text-xs font-semibold h-9 rounded-lg gap-1.5"
                  >
                    <Upload className="w-4 h-4" /> Upload Excel Limits
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDownloadLimitFormat}
                    className="text-xs font-semibold h-9 rounded-lg gap-1.5"
                  >
                    <Download className="w-4 h-4" /> Download Format
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Search Filter Bar */}
          <Card className="border border-border/80 shadow-sm">
            <CardContent className="p-4">
              <div className="relative w-full max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                <Input
                  placeholder="Search user name, mobile, username..."
                  value={posLimitSearch}
                  onChange={(e) => setPosLimitSearch(e.target.value)}
                  className="text-xs h-9 pl-9"
                />
              </div>
            </CardContent>
          </Card>

          {/* User Limits Hierarchy Table */}
          <Card className="border border-border/80 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] font-bold border-b border-border tracking-wider">
                    <tr>
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">USER ID</th>
                      <th className="px-4 py-3">USER NAME & ROLE</th>
                      <th className="px-4 py-3">APPLIED RATE MODE</th>
                      <th className="px-4 py-3">T0 DAILY LIMIT (₹)</th>
                      <th className="px-4 py-3 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {hierarchyUsers
                      .filter(
                        (u) =>
                          !posLimitSearch ||
                          u.name.toLowerCase().includes(posLimitSearch.toLowerCase()) ||
                          u.code.toLowerCase().includes(posLimitSearch.toLowerCase()) ||
                          u.roleLabel.toLowerCase().includes(posLimitSearch.toLowerCase())
                      )
                      .map((u, idx) => renderHierarchyNode(u, idx, 0))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 1: Settlement History */}
        <TabsContent value="history" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-bold">Settlement History</CardTitle>
                  <CardDescription>View status, fees, net payout, and UTR reference details.</CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {/* Search input */}
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search UTR, Account, Ref..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setHistoryPage(1);
                      }}
                      className="pl-9 text-xs h-9"
                    />
                  </div>

                  {/* Status filter dropdown */}
                  <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setHistoryPage(1); }}>
                    <SelectTrigger className="w-36 text-xs h-9">
                      <Filter className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
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
                      <th className="p-3">Reference / Date</th>
                      {isAdmin && <th className="p-3">User Details</th>}
                      <th className="p-3">Payout Mode & Bank</th>
                      <th className="p-3 text-right">Requested Amt</th>
                      <th className="p-3 text-right">Fee</th>
                      <th className="p-3 text-right">Net Credited</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {history.length === 0 ? (
                      <tr>
                        <td colSpan={isAdmin ? 8 : 7} className="p-8 text-center text-muted-foreground">
                          No settlement records found matching your filters.
                        </td>
                      </tr>
                    ) : (
                      history.map((item) => (
                        <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                          <td className="p-3">
                            <div className="font-mono font-medium text-foreground">{item.referenceId || "N/A"}</div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              {new Date(item.createdAt).toLocaleString("en-IN", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })}
                            </div>
                          </td>

                          {isAdmin && (
                            <td className="p-3">
                              <div className="font-medium text-foreground">{item.userName || "Unknown"}</div>
                              <div className="text-[11px] text-muted-foreground">{item.userEmail}</div>
                            </td>
                          )}

                          <td className="p-3">
                            <div className="font-medium text-foreground flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5 text-primary" />
                              {item.bankName || "Bank Transfer"}
                            </div>
                            <div className="text-[11px] text-muted-foreground font-mono">
                              {item.bankAccountNumber ? `Acc: ...${item.bankAccountNumber.slice(-4)} (${item.bankIfsc})` : item.payoutMode}
                            </div>
                          </td>

                          <td className="p-3 text-right font-medium text-foreground">
                            ₹{Number(item.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>

                          <td className="p-3 text-right font-medium text-rose-600">
                            -₹{Number(item.fee).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>

                          <td className="p-3 text-right font-extrabold text-emerald-600">
                            ₹{Number(item.netAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>

                          <td className="p-3 text-center">
                            {getStatusBadge(item.status)}
                          </td>

                          <td className="p-3 text-center">
                            {isAdmin && (item.status === "pending" || item.status === "processing") ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedSettlement(item);
                                  setProcessModalOpen(true);
                                }}
                                className="h-7 text-xs gap-1 border-primary/40 text-primary hover:bg-primary/10"
                              >
                                Process
                              </Button>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">
                                {item.status === "completed" ? item.referenceId || "Approved" : "—"}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {historyPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-2 text-xs text-muted-foreground">
                  <div>
                    Showing Page <span className="font-bold text-foreground">{historyPage}</span> of{" "}
                    <span className="font-bold text-foreground">{historyPages}</span> ({historyTotal} records)
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={historyPage <= 1}
                      onClick={() => setHistoryPage((p) => p - 1)}
                      className="h-8 gap-1"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" /> Prev
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={historyPage >= historyPages}
                      onClick={() => setHistoryPage((p) => p + 1)}
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

        {/* Tab 2: Settlement Holds */}
        <TabsContent value="holds" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-500" />
                Active Settlement Holds
              </CardTitle>
              <CardDescription>
                Holds placed on account balances to prevent settlement processing until compliance issues are cleared.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 text-muted-foreground font-semibold uppercase tracking-wider border-b border-border">
                    <tr>
                      <th className="p-3">Hold ID / Date</th>
                      <th className="p-3 text-right">Hold Amount</th>
                      <th className="p-3">Reason</th>
                      <th className="p-3 text-center">Status</th>
                      {isAdmin && <th className="p-3 text-center">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {holds.length === 0 ? (
                      <tr>
                        <td colSpan={isAdmin ? 5 : 4} className="p-8 text-center text-muted-foreground">
                          No settlement holds active on your account.
                        </td>
                      </tr>
                    ) : (
                      holds.map((h) => (
                        <tr key={h.id} className="hover:bg-muted/30 transition-colors">
                          <td className="p-3">
                            <div className="font-mono text-foreground font-medium">{h.id.slice(0, 8)}...</div>
                            <div className="text-[11px] text-muted-foreground">
                              {new Date(h.createdAt).toLocaleString("en-IN")}
                            </div>
                          </td>
                          <td className="p-3 text-right font-extrabold text-rose-600">
                            ₹{Number(h.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 text-foreground">{h.reason}</td>
                          <td className="p-3 text-center">
                            {h.status === "active" ? (
                              <Badge className="bg-rose-500/15 text-rose-600 border-rose-500/30 gap-1">
                                <Lock className="w-3 h-3" /> Active Hold
                              </Badge>
                            ) : (
                              <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 gap-1">
                                <Unlock className="w-3 h-3" /> Released
                              </Badge>
                            )}
                          </td>
                          {isAdmin && (
                            <td className="p-3 text-center">
                              {h.status === "active" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleReleaseHold(h.id)}
                                  className="h-7 text-xs text-emerald-600 border-emerald-500/40 hover:bg-emerald-50 gap-1"
                                >
                                  <Unlock className="w-3 h-3" /> Release
                                </Button>
                              )}
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Audit Logs (Admin only) */}
        {isAdmin && (
          <TabsContent value="audit" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-bold">Settlement Audit Logs</CardTitle>
                <CardDescription>Complete event trail for hold creation, settlement payouts, approvals, and system config changes.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/50 text-muted-foreground font-semibold uppercase tracking-wider border-b border-border">
                      <tr>
                        <th className="p-3">Timestamp</th>
                        <th className="p-3">Action</th>
                        <th className="p-3">Target User</th>
                        <th className="p-3">Executed By</th>
                        <th className="p-3">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border font-mono">
                      {auditLogs.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-muted-foreground font-sans">
                            No audit log records found.
                          </td>
                        </tr>
                      ) : (
                        auditLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                            <td className="p-3 text-muted-foreground">
                              {new Date(log.createdAt).toLocaleString("en-IN")}
                            </td>
                            <td className="p-3 font-bold text-primary">{log.action}</td>
                            <td className="p-3 text-foreground">{log.userId.slice(0, 8)}...</td>
                            <td className="p-3 text-foreground">{log.actionBy.slice(0, 8)}...</td>
                            <td className="p-3 text-muted-foreground truncate max-w-xs">{log.details || "—"}</td>
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

      {/* Modal 1: Request Settlement */}
      <Dialog open={requestModalOpen} onOpenChange={setRequestModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Landmark className="w-6 h-6 text-primary" />
              Request Settlement Payout
            </DialogTitle>
            <DialogDescription>
              Funds will be processed to your linked bank account after fee deduction.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRequestSubmit} className="space-y-4 py-2">
            {/* Bank details card */}
            <div className="bg-muted/40 p-3 rounded-lg border border-border space-y-1 text-xs">
              <div className="font-semibold text-foreground flex items-center justify-between">
                <span>Destination Bank Account</span>
                <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30">Verified</Badge>
              </div>
              <div className="text-muted-foreground">
                Bank: <span className="text-foreground font-medium">{summary?.bankDetails.bankName || "Not configured"}</span>
              </div>
              <div className="text-muted-foreground">
                Account: <span className="text-foreground font-mono font-medium">{summary?.bankDetails.accountNumber || "N/A"}</span>
              </div>
              <div className="text-muted-foreground">
                IFSC: <span className="text-foreground font-mono font-medium">{summary?.bankDetails.ifsc || "N/A"}</span>
              </div>
            </div>

            {/* Input Amount */}
            <div className="space-y-1.5">
              <Label htmlFor="req-amount" className="text-xs font-semibold">Settlement Amount (₹)</Label>
              <Input
                id="req-amount"
                type="number"
                placeholder="e.g. 5000"
                value={reqAmount}
                onChange={(e) => setReqAmount(e.target.value)}
                min={summary?.config.minSettlementAmount || 100}
                max={summary?.config.maxSettlementAmount || 500000}
                required
              />
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Available: ₹{(summary?.availableForSettlement ?? 0).toLocaleString()}</span>
                <span>Limits: ₹{summary?.config.minSettlementAmount} - ₹{summary?.config.maxSettlementAmount}</span>
              </div>
            </div>

            {/* Payout Mode */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Payout Transfer Mode</Label>
              <Select value={reqMode} onValueChange={setReqMode}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Select payout mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Instant Bank Transfer (IMPS / NEFT)</SelectItem>
                  <SelectItem value="wallet">Wallet Balance Settlement</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Fee Breakdown Box */}
            {parsedReqAmount > 0 && (
              <div className="bg-primary/5 p-3 rounded-lg border border-primary/20 space-y-1.5 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Requested Amount:</span>
                  <span className="font-semibold text-foreground">₹{parsedReqAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-rose-600">
                  <span>Processing Fee ({currentFeeType === "percent" ? `${currentFeeVal}%` : `Flat ₹${currentFeeVal}`}):</span>
                  <span className="font-semibold">-₹{calculatedFee.toFixed(2)}</span>
                </div>
                <div className="border-t border-primary/20 pt-1.5 flex justify-between font-bold text-emerald-600 text-sm">
                  <span>Net Credited Amount:</span>
                  <span>₹{calculatedNet.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Remarks */}
            <div className="space-y-1.5">
              <Label htmlFor="req-remarks" className="text-xs font-semibold">Remarks (Optional)</Label>
              <Input
                id="req-remarks"
                placeholder="Self settlement notes..."
                value={reqRemarks}
                onChange={(e) => setReqRemarks(e.target.value)}
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setRequestModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submittingReq} className="gap-2 font-semibold">
                {submittingReq ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowUpRight className="w-4 h-4" />}
                Confirm Settlement
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Admin Place Hold */}
      {isAdmin && (
        <Dialog open={placeHoldModalOpen} onOpenChange={setPlaceHoldModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold text-amber-600">
                <ShieldAlert className="w-6 h-6" />
                Place Settlement Hold
              </DialogTitle>
              <DialogDescription>
                Restrict settlement requests for a user due to audit, risk, or compliance checks.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handlePlaceHoldSubmit} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Select Target User</Label>
                <Select value={holdUserId} onValueChange={setHoldUserId}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Choose user..." />
                  </SelectTrigger>
                  <SelectContent>
                    {usersList.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.fullName} ({u.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="hold-amt" className="text-xs font-semibold">Hold Amount (₹)</Label>
                <Input
                  id="hold-amt"
                  type="number"
                  placeholder="e.g. 10000"
                  value={holdAmount}
                  onChange={(e) => setHoldAmount(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="hold-reason" className="text-xs font-semibold">Hold Reason</Label>
                <Input
                  id="hold-reason"
                  placeholder="e.g. Pending document verification / Chargeback check"
                  value={holdReason}
                  onChange={(e) => setHoldReason(e.target.value)}
                  required
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setPlaceHoldModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submittingHold} variant="destructive" className="gap-2 font-semibold">
                  {submittingHold ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  Apply Settlement Hold
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal 3: Admin Process Settlement (Complete / Reject) */}
      {isAdmin && selectedSettlement && (
        <Dialog open={processModalOpen} onOpenChange={setProcessModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                <Landmark className="w-6 h-6 text-primary" />
                Process Settlement Request
              </DialogTitle>
              <DialogDescription>
                Ref: <span className="font-mono font-semibold text-foreground">{selectedSettlement.referenceId}</span>
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleProcessSubmit} className="space-y-4 py-2">
              <div className="bg-muted/40 p-3 rounded-lg border border-border space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Requested Amount:</span>
                  <span className="font-bold text-foreground">₹{Number(selectedSettlement.amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Deducted Fee:</span>
                  <span className="font-bold text-rose-600">₹{Number(selectedSettlement.fee).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-emerald-600">
                  <span>Net Credited Amount:</span>
                  <span>₹{Number(selectedSettlement.netAmount).toFixed(2)}</span>
                </div>
                <div className="border-t border-border pt-1 text-[11px] text-muted-foreground">
                  User Acc: <span className="font-mono text-foreground">{selectedSettlement.bankName} - {selectedSettlement.bankAccountNumber} ({selectedSettlement.bankIfsc})</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Action Decision</Label>
                <Select value={processAction} onValueChange={(v: "complete" | "reject") => setProcessAction(v)}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Select decision" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="complete">Approve & Complete Settlement</SelectItem>
                    <SelectItem value="reject">Reject & Refund to User Wallet</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {processAction === "complete" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="process-ref" className="text-xs font-semibold">Bank UTR / Transaction Reference ID</Label>
                  <Input
                    id="process-ref"
                    placeholder="e.g. UTR1234567890"
                    value={processRefId}
                    onChange={(e) => setProcessRefId(e.target.value)}
                    required
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label htmlFor="process-reason" className="text-xs font-semibold">Rejection Reason</Label>
                  <Input
                    id="process-reason"
                    placeholder="e.g. Bank Account details mismatched"
                    value={processFailReason}
                    onChange={(e) => setProcessFailReason(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="process-remarks" className="text-xs font-semibold">Admin Notes (Optional)</Label>
                <Input
                  id="process-remarks"
                  placeholder="Internal notes..."
                  value={processRemarks}
                  onChange={(e) => setProcessRemarks(e.target.value)}
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setProcessModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submittingProcess}
                  variant={processAction === "complete" ? "default" : "destructive"}
                  className="gap-2 font-semibold"
                >
                  {submittingProcess ? <RefreshCw className="w-4 h-4 animate-spin" /> : processAction === "complete" ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  Submit Decision
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal 4: Admin System Settlement Rules */}
      {isAdmin && (
        <Dialog open={configModalOpen} onOpenChange={setConfigModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                <Settings2 className="w-6 h-6 text-primary" />
                Settlement Rules & Limits
              </DialogTitle>
              <DialogDescription>
                Configure min/max transaction limits, fees, and automatic settlement processing.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleConfigSubmit} className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Min Amount (₹)</Label>
                  <Input
                    type="number"
                    value={cfgMin}
                    onChange={(e) => setCfgMin(parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Max Amount (₹)</Label>
                  <Input
                    type="number"
                    value={cfgMax}
                    onChange={(e) => setCfgMax(parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Fee Model</Label>
                  <Select value={cfgFeeType} onValueChange={setCfgFeeType}>
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Fee Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flat">Flat Amount (₹)</SelectItem>
                      <SelectItem value="percent">Percentage (%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Fee Value ({cfgFeeType === "percent" ? "%" : "₹"})</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={cfgFeeVal}
                    onChange={(e) => setCfgFeeVal(parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg border border-border">
                <div>
                  <div className="font-semibold text-xs text-foreground">Auto Settlement Engine</div>
                  <div className="text-[11px] text-muted-foreground">Automatically approve requests without manual intervention</div>
                </div>
                <input
                  type="checkbox"
                  checked={cfgAuto}
                  onChange={(e) => setCfgAuto(e.target.checked)}
                  className="w-4 h-4 rounded text-primary focus:ring-primary border-border cursor-pointer"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setConfigModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submittingCfg} className="gap-2 font-semibold">
                  {submittingCfg ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Settings2 className="w-4 h-4" />}
                  Save Configuration
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal 5: Bulk Downline Settlement Mode Modal */}
      <Dialog open={bulkModeModalOpen} onOpenChange={setBulkModeModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Building2 className="w-6 h-6 text-primary" />
              Bulk Downline Settlement Mode
            </DialogTitle>
            <DialogDescription>
              Apply T0 (Same-Day Instant) or T1 (Next-Day Auto) settlement mode to all your downline merchants.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleBulkModeSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Target Settlement Mode</Label>
              <Select value={bulkModeType} onValueChange={setBulkModeType}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="T0">T0 (Same-Day Instant Settlement)</SelectItem>
                  <SelectItem value="T1">T1 (Next-Day Auto Settlement)</SelectItem>
                  <SelectItem value="AUTO">AUTO (Hybrid Auto Mode)</SelectItem>
                </SelectContent>
              </Select>
              <div className="text-[11px] text-muted-foreground mt-1">
                This action will update the default settlement mode for all merchants under your management tree.
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setBulkModeModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submittingBulkMode} className="gap-2 font-semibold">
                {submittingBulkMode ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Building2 className="w-4 h-4" />}
                Apply Bulk Mode
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 6: Save Limit Confirmation Popup (Step 1) */}
      <Dialog open={limitConfirmModalOpen} onOpenChange={setLimitConfirmModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-foreground">
              <SlidersHorizontal className="w-5 h-5 text-primary" />
              Confirm T0 Daily Limit Update
            </DialogTitle>
            <DialogDescription>
              Please confirm the daily T0 settlement limit change for this account.
            </DialogDescription>
          </DialogHeader>

          {pendingLimitUser && (
            <div className="space-y-4 py-2">
              <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 dark:bg-primary/10 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">User Name:</span>
                  <span className="font-bold text-foreground">{pendingLimitUser.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">User ID Code:</span>
                  <span className="font-mono font-bold text-foreground">{pendingLimitUser.code}</span>
                </div>
                <div className="flex justify-between border-t border-border/60 pt-2 font-extrabold text-sm text-primary">
                  <span>New T0 Daily Limit:</span>
                  <span>₹{pendingLimitValue}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Updating this limit will immediately adjust the user's maximum allowable same-day settlement pool.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setLimitConfirmModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmSaveLimit} className="gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4" /> Confirm & Save Limit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 7: Save Limit Done Popup (Step 2) */}
      <Dialog open={limitDoneModalOpen} onOpenChange={setLimitDoneModalOpen}>
        <DialogContent className="sm:max-w-sm text-center">
          <div className="py-4 space-y-3 flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <DialogTitle className="text-lg font-bold text-foreground">Limit Updated Successfully!</DialogTitle>
            {pendingLimitUser && (
              <p className="text-xs text-muted-foreground">
                T0 Daily Limit for <span className="font-bold text-foreground">{pendingLimitUser.name}</span> has been set to <span className="font-mono font-bold text-emerald-600">₹{pendingLimitValue}</span>.
              </p>
            )}
          </div>
          <DialogFooter className="sm:justify-center">
            <Button onClick={() => setLimitDoneModalOpen(false)} className="w-full sm:w-auto px-6 font-semibold">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 8: Upload Excel Limits */}
      <Dialog open={excelUploadModalOpen} onOpenChange={setExcelUploadModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Upload className="w-5 h-5 text-primary" />
              Upload Bulk Excel Limits
            </DialogTitle>
            <DialogDescription>
              Select a CSV/Excel file formatted with User ID, Role, and T0 Daily Limit.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors cursor-pointer bg-muted/20">
              <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs font-semibold text-foreground">Click to upload CSV or drag and drop</p>
              <p className="text-[10px] text-muted-foreground mt-1">Supports .csv, .xlsx up to 10MB</p>
            </div>

            <Button variant="outline" size="sm" onClick={handleDownloadLimitFormat} className="w-full text-xs gap-1.5">
              <Download className="w-3.5 h-3.5" /> Download Standard Sample Format
            </Button>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setExcelUploadModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setExcelUploadModalOpen(false);
                toast({ title: "Bulk Limits Uploaded", description: "Successfully updated limits for 25 users." });
              }}
              className="gap-2 font-semibold"
            >
              Upload & Process
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

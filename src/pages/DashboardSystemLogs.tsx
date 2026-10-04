import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Activity, Search, Filter, RefreshCw, Download, ShieldAlert, AlertTriangle,
  Info, XCircle, Terminal, Calendar, ChevronLeft, ChevronRight,
  Eye, Layers, Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { downloadCSV } from "@/lib/csv-export";
import {
  getSystemLogs,
  getSystemLogStats
} from "@/services/api";

interface SystemLogItem {
  id: string;
  userId: string | null;
  userEmail: string | null;
  userRole: string | null;
  action: string;
  module: string;
  severity: "info" | "warning" | "error" | "critical" | string;
  ipAddress: string | null;
  userAgent: string | null;
  details: string | null;
  createdAt: string;
}

interface LogStats {
  totalCount: number;
  todayCount: number;
  errorCount: number;
  warningCount: number;
}

const MODULE_OPTIONS = [
  "ALL", "AUTH", "WALLET", "SETTLEMENTS", "LIMITS", "COMMISSIONS", "KYC", "STAFF", "SERVICES", "SYSTEM"
];

export default function DashboardSystemLogs() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<SystemLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [stats, setStats] = useState<LogStats>({
    totalCount: 0,
    todayCount: 0,
    errorCount: 0,
    warningCount: 0,
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Modals
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<SystemLogItem | null>(null);

  // Fetch stats
  const loadStats = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const data = await getSystemLogStats();
      setStats(data);
    } catch (err: any) {
      console.error(err);
    }
  }, [isAdmin]);

  // Fetch logs
  const loadLogs = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const data = await getSystemLogs({
        page,
        limit: 15,
        search: searchQuery,
        module: moduleFilter,
        severity: severityFilter,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
      });
      setLogs(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  }, [isAdmin, page, searchQuery, moduleFilter, severityFilter, startDate, endDate, toast]);

  const refreshAll = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      await Promise.all([loadStats(), loadLogs()]);
    } catch (err) {
      console.error("Error refreshing log data:", err);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll(true);
  }, [loadStats, loadLogs]);

  // Handle Export CSV
  const handleExportCSV = () => {
    const csvData = logs.map((log) => ({
      "Log ID": log.id,
      Timestamp: new Date(log.createdAt).toLocaleString("en-IN"),
      Module: log.module,
      Action: log.action,
      Severity: log.severity.toUpperCase(),
      "User Email": log.userEmail || "System",
      "User Role": log.userRole || "System",
      "IP Address": log.ipAddress || "N/A",
      Details: log.details || "",
    }));

    downloadCSV(csvData, `GenPay_System_Logs_${new Date().toISOString().slice(0, 10)}.csv`);
    toast({ title: "Export Ready", description: "System log records downloaded to CSV." });
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev.toLowerCase()) {
      case "critical":
        return <Badge className="bg-purple-600/15 text-purple-700 hover:bg-purple-600/25 border-purple-600/30 gap-1 font-bold"><Zap className="w-3 h-3" /> Critical</Badge>;
      case "error":
        return <Badge className="bg-rose-500/15 text-rose-600 hover:bg-rose-500/25 border-rose-500/30 gap-1 font-bold"><XCircle className="w-3 h-3" /> Error</Badge>;
      case "warning":
        return <Badge className="bg-amber-500/15 text-amber-600 hover:bg-amber-500/25 border-amber-500/30 gap-1 font-bold"><AlertTriangle className="w-3 h-3" /> Warning</Badge>;
      case "info":
      default:
        return <Badge className="bg-blue-500/15 text-blue-600 hover:bg-blue-500/25 border-blue-500/30 gap-1"><Info className="w-3 h-3" /> Info</Badge>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 rounded-2xl border border-primary/20">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <Activity className="w-8 h-8 text-primary" />
            System Activity & Audit Logs
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time system audit logs capturing authentication, wallet transactions, limit changes, and administrative actions.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={refreshAll} disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2 border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 font-semibold">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-primary/20 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              Total Log Entries
              <Layers className="w-4 h-4 text-primary" />
            </CardDescription>
            <CardTitle className="text-3xl font-extrabold text-foreground">
              {stats.totalCount.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            All system audit events recorded
          </CardContent>
        </Card>

        <Card className="border-emerald-500/20 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              Today's Activity
              <Calendar className="w-4 h-4 text-emerald-500" />
            </CardDescription>
            <CardTitle className="text-3xl font-extrabold text-emerald-600">
              {stats.todayCount.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            Events recorded in past 24h
          </CardContent>
        </Card>

        <Card className="border-amber-500/20 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              Warnings
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </CardDescription>
            <CardTitle className="text-3xl font-extrabold text-amber-600">
              {stats.warningCount.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            Security alerts & hold warnings
          </CardContent>
        </Card>

        <Card className="border-rose-500/20 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              Errors & Critical
              <ShieldAlert className="w-4 h-4 text-rose-500" />
            </CardDescription>
            <CardTitle className="text-3xl font-extrabold text-rose-600">
              {stats.errorCount.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            System errors requiring attention
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold">System Log Stream</CardTitle>
              <CardDescription>Filter by module, severity, keyword search, or date range.</CardDescription>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-56">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search Action, Email, IP..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                  className="pl-9 text-xs h-9"
                />
              </div>

              <Select value={moduleFilter} onValueChange={(v) => { setModuleFilter(v); setPage(1); }}>
                <SelectTrigger className="w-36 text-xs h-9">
                  <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="All Modules" />
                </SelectTrigger>
                <SelectContent>
                  {MODULE_OPTIONS.map((m) => (
                    <SelectItem key={m} value={m.toLowerCase()}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={severityFilter} onValueChange={(v) => { setSeverityFilter(v); setPage(1); }}>
                <SelectTrigger className="w-32 text-xs h-9">
                  <SelectValue placeholder="All Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severity</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
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
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Action & Module</th>
                  <th className="p-3">Performer</th>
                  <th className="p-3 text-center">Severity</th>
                  <th className="p-3">IP Address</th>
                  <th className="p-3">Details Summary</th>
                  <th className="p-3 text-center">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No system log entries found matching your query.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3">
                        <div className="font-mono font-medium text-foreground">
                          {new Date(log.createdAt).toLocaleString("en-IN", {
                            dateStyle: "medium",
                            timeStyle: "medium",
                          })}
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="font-bold text-foreground flex items-center gap-2">
                          <span>{log.action}</span>
                          <Badge variant="outline" className="text-[10px] font-mono uppercase bg-primary/5 text-primary border-primary/20">
                            {log.module}
                          </Badge>
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="font-medium text-foreground">{log.userEmail || "System Event"}</div>
                        {log.userRole && (
                          <div className="text-[10px] text-muted-foreground uppercase">{log.userRole}</div>
                        )}
                      </td>

                      <td className="p-3 text-center">
                        {getSeverityBadge(log.severity)}
                      </td>

                      <td className="p-3 font-mono text-muted-foreground">
                        {log.ipAddress || "Internal"}
                      </td>

                      <td className="p-3 text-muted-foreground truncate max-w-xs font-mono">
                        {log.details || "—"}
                      </td>

                      <td className="p-3 text-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedLog(log);
                            setDetailsModalOpen(true);
                          }}
                          className="h-7 w-7 p-0"
                          title="View log details"
                        >
                          <Eye className="w-4 h-4 text-primary" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-2 text-xs text-muted-foreground">
              <div>
                Showing Page <span className="font-bold text-foreground">{page}</span> of{" "}
                <span className="font-bold text-foreground">{totalPages}</span> ({total} logs)
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

      {/* Modal 1: View Log Details */}
      {selectedLog && (
        <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                <Terminal className="w-6 h-6 text-primary" />
                System Log Details
              </DialogTitle>
              <DialogDescription>
                Event ID: <span className="font-mono text-foreground">{selectedLog.id}</span>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg border border-border">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Action & Module</span>
                  <span className="font-bold text-foreground text-sm">{selectedLog.action}</span>
                </div>
                <div>
                  {getSeverityBadge(selectedLog.severity)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-muted/30 p-2.5 rounded-lg border border-border">
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Performer Email</span>
                  <span className="font-medium text-foreground">{selectedLog.userEmail || "System"}</span>
                </div>
                <div className="bg-muted/30 p-2.5 rounded-lg border border-border">
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Role</span>
                  <span className="font-medium text-foreground">{selectedLog.userRole || "System"}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-muted/30 p-2.5 rounded-lg border border-border">
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">IP Address</span>
                  <span className="font-mono text-foreground">{selectedLog.ipAddress || "Internal"}</span>
                </div>
                <div className="bg-muted/30 p-2.5 rounded-lg border border-border">
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Timestamp</span>
                  <span className="font-mono text-foreground">{new Date(selectedLog.createdAt).toLocaleString("en-IN")}</span>
                </div>
              </div>

              {selectedLog.userAgent && (
                <div className="bg-muted/30 p-2.5 rounded-lg border border-border">
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">User Agent</span>
                  <span className="font-mono text-[11px] text-foreground block truncate">{selectedLog.userAgent}</span>
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Log Payload / Details</Label>
                <div className="bg-slate-950 text-slate-100 p-3 rounded-lg font-mono text-[11px] max-h-40 overflow-y-auto whitespace-pre-wrap">
                  {selectedLog.details || "No details attached"}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDetailsModalOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

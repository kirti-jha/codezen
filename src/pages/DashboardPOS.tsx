import { useState, useMemo, useEffect } from "react";
import { apiFetch } from "@/services/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Upload, Download, Eye, Edit2, Trash2, Building2,
  HardDrive, CheckCircle2, XCircle, Search
} from "lucide-react";

interface POSMachine {
  id: string;
  companyName: string;
  bankName: string;
  serialNumber: string;
  tidNumber: string;
  midNumber: string;
  status: "assigned" | "unassigned" | "active" | "inactive";
  franchiseName: string;
  assignToName: string;
  assignToId: string;
  assignToPhone: string;
}

const initialCompanies: string[] = [];
const initialMachines: POSMachine[] = [];

export default function DashboardPOS() {
  const { toast } = useToast();

  // Master State
  const [companies, setCompanies] = useState<string[]>(initialCompanies);
  const [machines, setMachines] = useState<POSMachine[]>(initialMachines);
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>("All");

  // Search Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [bankFilter, setBankFilter] = useState("");

  // Modals state
  const [addCompanyModalOpen, setAddCompanyModalOpen] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");

  const [addMachineModalOpen, setAddMachineModalOpen] = useState(false);
  const [newCompany, setNewCompany] = useState(companies[0] || "");
  const [newBank, setNewBank] = useState("Axis Bank");
  const [newSerial, setNewSerial] = useState("");
  const [newTid, setNewTid] = useState("");
  const [newMid, setNewMid] = useState("");

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedMachineForAssign, setSelectedMachineForAssign] = useState<POSMachine | null>(null);
  const [assignName, setAssignName] = useState("");
  const [assignCode, setAssignCode] = useState("");
  const [assignPhone, setAssignPhone] = useState("");

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState<POSMachine | null>(null);

  const [viewCompaniesModalOpen, setViewCompaniesModalOpen] = useState(false);
  const [bulkUploadModalOpen, setBulkUploadModalOpen] = useState(false);

  // Filtered Machines
  const filteredMachines = useMemo(() => {
    return machines.filter((m) => {
      // Company chip filter
      if (selectedCompanyFilter !== "All" && m.companyName !== selectedCompanyFilter) {
        return false;
      }
      // Bank search filter
      if (bankFilter && !m.bankName.toLowerCase().includes(bankFilter.toLowerCase())) {
        return false;
      }
      // Main Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTid = m.tidNumber.toLowerCase().includes(q);
        const matchMid = m.midNumber.toLowerCase().includes(q);
        const matchSerial = m.serialNumber.toLowerCase().includes(q);
        const matchStatus = m.status.toLowerCase().includes(q);
        const matchCompany = m.companyName.toLowerCase().includes(q);
        const matchUser = m.assignToName.toLowerCase().includes(q);
        return matchTid || matchMid || matchSerial || matchStatus || matchCompany || matchUser;
      }
      return true;
    });
  }, [machines, selectedCompanyFilter, bankFilter, searchQuery]);

  // Metrics
  const totalCompanyCount = companies.length;
  const totalMachinesCount = machines.length;
  const totalActiveCount = machines.filter((m) => m.status === "assigned" || m.status === "active").length;
  const totalInactiveCount = machines.filter((m) => m.status === "unassigned" || m.status === "inactive").length;

  useEffect(() => {
    const fetchPOSData = async () => {
      try {
        const [compData, invData] = await Promise.all([
          apiFetch("/pos/companies").catch(() => []),
          apiFetch("/pos/inventory").catch(() => []),
        ]);
        if (Array.isArray(compData) && compData.length > 0) {
          setCompanies(compData);
        }
        if (Array.isArray(invData) && invData.length > 0) {
          setMachines(invData);
        }
      } catch (err) {
        console.error("Failed to load POS data from backend:", err);
      }
    };
    fetchPOSData();
  }, []);

  // Handlers
  const handleAddCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName.trim()) {
      toast({ title: "Validation Error", description: "Company name is required.", variant: "destructive" });
      return;
    }
    const formatted = newCompanyName.trim().toUpperCase();
    if (companies.includes(formatted)) {
      toast({ title: "Already Exists", description: "This company already exists.", variant: "destructive" });
      return;
    }
    setCompanies([...companies, formatted]);
    setNewCompanyName("");
    setAddCompanyModalOpen(false);
    apiFetch("/pos/companies", { method: "POST", body: JSON.stringify({ name: formatted }) }).catch(console.error);
    toast({ title: "Company Added", description: `Added "${formatted}" to company list.` });
  };

  const handleAddMachineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompany.trim()) {
      toast({ title: "Validation Error", description: "Company Name is required.", variant: "destructive" });
      return;
    }
    if (!newSerial.trim() || !newTid.trim() || !newMid.trim()) {
      toast({ title: "Validation Error", description: "Serial Number, TID, and MID are required.", variant: "destructive" });
      return;
    }

    const companyUpper = newCompany.trim().toUpperCase();
    if (!companies.includes(companyUpper)) {
      setCompanies((prev) => [...prev, companyUpper]);
    }

    const newMachine: POSMachine = {
      id: (machines.length + 1).toString(),
      companyName: companyUpper,
      bankName: newBank.trim() || "Axis Bank",
      serialNumber: newSerial.trim(),
      tidNumber: newTid.trim(),
      midNumber: newMid.trim(),
      status: "unassigned",
      franchiseName: "-",
      assignToName: "-",
      assignToId: "-",
      assignToPhone: "-",
    };
    setMachines([newMachine, ...machines]);
    setAddMachineModalOpen(false);
    setNewSerial("");
    setNewTid("");
    setNewMid("");
    apiFetch("/pos/inventory", { method: "POST", body: JSON.stringify(newMachine) }).catch(console.error);
    toast({ title: "Machine Registered", description: `Device Serial ${newMachine.serialNumber} added under ${companyUpper}.` });
  };

  const handleAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMachineForAssign) return;
    if (!assignName.trim() || !assignCode.trim()) {
      toast({ title: "Validation Error", description: "Assignee Name and ID are required.", variant: "destructive" });
      return;
    }
    setMachines((prev) =>
      prev.map((m) =>
        m.id === selectedMachineForAssign.id
          ? {
              ...m,
              status: "assigned",
              assignToName: assignName.trim(),
              assignToId: assignCode.trim(),
              assignToPhone: assignPhone.trim() ? `******${assignPhone.trim().slice(-4)}` : "******9028",
            }
          : m
      )
    );
    setAssignModalOpen(false);
    setSelectedMachineForAssign(null);
    setAssignName("");
    setAssignCode("");
    setAssignPhone("");
    toast({ title: "Machine Assigned", description: `Machine assigned to ${assignName}.` });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMachine) return;
    setMachines((prev) => prev.map((m) => (m.id === editingMachine.id ? editingMachine : m)));
    setEditModalOpen(false);
    setEditingMachine(null);
    toast({ title: "Machine Updated", description: "POS Machine details updated successfully." });
  };

  const handleDeleteMachine = (id: string) => {
    setMachines((prev) => prev.filter((m) => m.id !== id));
    toast({ title: "Machine Deleted", description: "Machine removed from inventory." });
  };

  const handleExportExcel = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["SL NO,COMPANY NAME,BANK NAME,DEVICE SERIAL NUMBER,TID NUMBER,MID NUMBER,STATUS,ASSIGN TO"]
        .concat(
          filteredMachines.map(
            (m, i) =>
              `${i + 1},"${m.companyName}","${m.bankName}","${m.serialNumber}","${m.tidNumber}","${m.midNumber}","${m.status}","${m.assignToName} (${m.assignToId})"`
          )
        )
        .join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `POS_Inventory_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Export Completed", description: "POS Inventory exported to CSV." });
  };

  const handleDownloadBulkTemplate = () => {
    const templateContent =
      "data:text/csv;charset=utf-8," +
      "SL NO,COMPANY NAME,BANK NAME,DEVICE SERIAL NUMBER,TID NUMBER,MID NUMBER,STATUS,ASSIGN TO\n" +
      '1,AGRO-AXIS,Axis Bank,1495049771,77971843,37135032060302,assigned,bhupender kumar sharma (APM00043)\n' +
      '2,AGRO-HDFC,HDFC Bank,1495049880,88971900,47135032090111,unassigned,-';
    const encodedUri = encodeURI(templateContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `POS_Inventory_Bulk_Upload_Format.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Template Downloaded", description: "Sample Bulk Upload CSV format saved." });
  };

  const handleCSVFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
        if (lines.length <= 1) {
          toast({ title: "Empty File", description: "CSV file contains no data rows.", variant: "destructive" });
          return;
        }

        const newParsedMachines: POSMachine[] = [];
        const newCompanyNames: string[] = [];

        // Skip header line
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(",").map((c) => c.replace(/^"|"$/g, "").trim());
          if (cols.length < 5) continue;

          const company = (cols[1] || cols[0] || "GENERAL").toUpperCase();
          const bank = cols[2] || "Axis Bank";
          const serial = cols[3] || cols[0] || `SN-${Date.now()}-${i}`;
          const tid = cols[4] || `TID${i}`;
          const mid = cols[5] || `MID${i}`;
          const statusStr = (cols[6] || "unassigned").toLowerCase();
          const status: "assigned" | "unassigned" | "active" | "inactive" =
            statusStr === "active" || statusStr === "assigned" ? "assigned" : "unassigned";
          const assignTo = cols[7] || "-";

          if (company && !companies.includes(company) && !newCompanyNames.includes(company)) {
            newCompanyNames.push(company);
          }

          newParsedMachines.push({
            id: (machines.length + newParsedMachines.length + 1).toString(),
            companyName: company,
            bankName: bank,
            serialNumber: serial,
            tidNumber: tid,
            midNumber: mid,
            status: status,
            franchiseName: "-",
            assignToName: assignTo !== "-" ? assignTo.split("(")[0].trim() : "-",
            assignToId: assignTo.includes("(") ? assignTo.split("(")[1].replace(")", "").trim() : "-",
            assignToPhone: "******9028",
          });
        }

        if (newParsedMachines.length > 0) {
          setCompanies((prev) => Array.from(new Set([...prev, ...newCompanyNames])));
          setMachines((prev) => [...newParsedMachines, ...prev]);
          setBulkUploadModalOpen(false);
          toast({
            title: "Bulk Import Successful",
            description: `Successfully imported ${newParsedMachines.length} POS machines from CSV.`,
          });
        } else {
          toast({ title: "Import Failed", description: "Could not parse valid machine records from CSV.", variant: "destructive" });
        }
      } catch (err) {
        console.error("CSV Parse error:", err);
        toast({ title: "Parse Error", description: "Failed to read CSV file format.", variant: "destructive" });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* HEADER & TOP ACTION BUTTONS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground tracking-tight">POS Machine Inventory</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Manage POS machine vendor companies, TID/MID bindings, and franchise assignments.</p>
        </div>

        {/* Top Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => setAddCompanyModalOpen(true)}
            className="text-xs font-semibold h-9 rounded-lg"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Add Company Name
          </Button>

          <Button
            size="sm"
            onClick={() => setAddMachineModalOpen(true)}
            className="text-xs font-semibold h-9 rounded-lg"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Add New Machine
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setBulkUploadModalOpen(true)}
            className="text-xs font-semibold h-9 rounded-lg"
          >
            <Upload className="w-4 h-4 mr-1.5" /> Bulk Upload
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleExportExcel}
            className="text-xs font-semibold h-9 rounded-lg"
          >
            <Download className="w-4 h-4 mr-1.5" /> Export Excel
          </Button>
        </div>
      </div>

      {/* METRICS CARDS ROW (GenPay Styled Cards) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* 1. Total Company */}
        <div className="p-4 rounded-xl bg-card border border-border shadow-sm hover:border-primary/30 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Company</span>
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-bold font-heading text-foreground">{totalCompanyCount}</h3>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-muted-foreground">Master company list</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setViewCompaniesModalOpen(true)}
                className="h-7 text-xs px-2 text-primary hover:text-primary hover:bg-primary/10"
              >
                <Eye className="w-3.5 h-3.5 mr-1" /> View
              </Button>
            </div>
          </div>
        </div>

        {/* 2. Total Machines */}
        <div className="p-4 rounded-xl bg-card border border-border shadow-sm hover:border-primary/30 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Machines</span>
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-bold font-heading text-foreground">{totalMachinesCount}</h3>
            <p className="text-xs text-muted-foreground mt-2">Registered in inventory</p>
          </div>
        </div>

        {/* 3. Total Active */}
        <div className="p-4 rounded-xl bg-card border border-border shadow-sm hover:border-primary/30 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Active</span>
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-bold font-heading text-emerald-600 dark:text-emerald-400">{totalActiveCount}</h3>
            <p className="text-xs text-muted-foreground mt-2">Assigned & active terminals</p>
          </div>
        </div>

        {/* 4. Total Inactive */}
        <div className="p-4 rounded-xl bg-card border border-border shadow-sm hover:border-primary/30 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Inactive</span>
            <div className="w-9 h-9 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-bold font-heading text-rose-600 dark:text-rose-400">{totalInactiveCount}</h3>
            <p className="text-xs text-muted-foreground mt-2">Unassigned or offline units</p>
          </div>
        </div>
      </div>

      {/* COMPANY FILTER CHIPS / PILLS */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          onClick={() => setSelectedCompanyFilter("All")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${
            selectedCompanyFilter === "All"
              ? "bg-primary text-primary-foreground border-primary shadow-sm font-semibold"
              : "bg-card text-muted-foreground border-border hover:bg-muted hover:text-foreground"
          }`}
        >
          All
        </button>
        {companies.map((c) => (
          <button
            key={c}
            onClick={() => setSelectedCompanyFilter(c)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${
              selectedCompanyFilter === c
                ? "bg-primary text-primary-foreground border-primary shadow-sm font-semibold"
                : "bg-card text-muted-foreground border-border hover:bg-muted hover:text-foreground"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* SEARCH & FILTER TOOLBAR */}
      <Card className="border border-border/80 shadow-sm bg-card">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by TID, MID, serial, status, RazorPay"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-xs h-9 pl-9"
              />
            </div>

            <div className="w-full sm:w-56">
              <Input
                placeholder="Bank Name"
                value={bankFilter}
                onChange={(e) => setBankFilter(e.target.value)}
                className="text-xs h-9"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                size="sm"
                onClick={() => {}}
                className="text-xs font-semibold h-9 px-4 flex-1 sm:flex-none"
              >
                Search
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSearchQuery("");
                  setBankFilter("");
                  setSelectedCompanyFilter("All");
                }}
                className="text-xs h-9 px-4 flex-1 sm:flex-none"
              >
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* INVENTORY TABLE */}
      <Card className="border border-border/80 shadow-sm overflow-hidden bg-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] font-bold border-b border-border tracking-wider">
                <tr>
                  <th className="px-4 py-3">SL NO.</th>
                  <th className="px-4 py-3">COMPANY NAME</th>
                  <th className="px-4 py-3">BANK NAME</th>
                  <th className="px-4 py-3">DEVICE SERIAL NUMBER</th>
                  <th className="px-4 py-3">TID NUMBER</th>
                  <th className="px-4 py-3">MID NUMBER</th>
                  <th className="px-4 py-3 text-center">STATUS</th>
                  <th className="px-4 py-3 text-center">ACTIONS</th>
                  <th className="px-4 py-3">FRANCHISE NAME</th>
                  <th className="px-4 py-3">ASSIGN TO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredMachines.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-12 text-muted-foreground text-xs">
                      No POS machines match your search criteria. Click <b>"+ Add New Machine"</b> or <b>"Bulk Upload"</b> to add machines.
                    </td>
                  </tr>
                ) : (
                  filteredMachines.map((m, idx) => (
                    <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-semibold text-muted-foreground">{idx + 1}</td>
                      <td className="px-4 py-3 font-bold text-foreground">{m.companyName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{m.bankName || "-"}</td>
                      <td className="px-4 py-3 font-mono font-bold text-foreground">{m.serialNumber}</td>
                      <td className="px-4 py-3 font-mono text-foreground">{m.tidNumber}</td>
                      <td className="px-4 py-3 font-mono text-foreground">{m.midNumber}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge
                          variant={m.status === "assigned" || m.status === "active" ? "default" : "secondary"}
                          className="text-[10px]"
                        >
                          {m.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* + Assign */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedMachineForAssign(m);
                              setAssignName(m.assignToName !== "-" ? m.assignToName : "");
                              setAssignCode(m.assignToId !== "-" ? m.assignToId : "");
                              setAssignModalOpen(true);
                            }}
                            className="h-7 px-2.5 text-[10px] font-semibold text-primary hover:text-primary hover:bg-primary/10 border-primary/30"
                          >
                            <Plus className="w-3 h-3 mr-1" /> Assign
                          </Button>

                          {/* Edit */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingMachine(m);
                              setEditModalOpen(true);
                            }}
                            className="h-7 px-2.5 text-[10px] font-semibold text-muted-foreground hover:text-foreground"
                          >
                            <Edit2 className="w-3 h-3 mr-1" /> Edit
                          </Button>

                          {/* Delete */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteMachine(m.id)}
                            className="h-7 px-2.5 text-[10px] font-semibold text-destructive hover:bg-destructive/10 border-destructive/30"
                          >
                            <Trash2 className="w-3 h-3 mr-1" /> Delete
                          </Button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{m.franchiseName || "-"}</td>
                      <td className="px-4 py-3">
                        {m.assignToName !== "-" ? (
                          <div>
                            <p className="font-semibold text-foreground text-xs">{m.assignToName}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">
                              {m.assignToId} | {m.assignToPhone}
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 1. ADD COMPANY MODAL */}
      <Dialog open={addCompanyModalOpen} onOpenChange={setAddCompanyModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New POS Company Name</DialogTitle>
            <DialogDescription>Register a new POS master company header (e.g. AGRO-AXIS, Everlife).</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddCompanySubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input
                placeholder="e.g. AGRO-AXIS"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddCompanyModalOpen(false)}>Cancel</Button>
              <Button type="submit">Add Company</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 2. ADD NEW MACHINE MODAL */}
      <Dialog open={addMachineModalOpen} onOpenChange={setAddMachineModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New POS Machine</DialogTitle>
            <DialogDescription>Register hardware serial with TID and MID bindings into inventory.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddMachineSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Company Name</Label>
              {companies.length > 0 ? (
                <Select value={newCompany} onValueChange={setNewCompany}>
                  <SelectTrigger><SelectValue placeholder="Select or type Company" /></SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  placeholder="e.g. AGRO-AXIS"
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                />
              )}
            </div>

            <div className="space-y-2">
              <Label>Bank Name</Label>
              <Input placeholder="e.g. Axis Bank" value={newBank} onChange={(e) => setNewBank(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Device Serial Number</Label>
              <Input placeholder="e.g. 1495049771" value={newSerial} onChange={(e) => setNewSerial(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>TID Number</Label>
                <Input placeholder="e.g. 77971843" value={newTid} onChange={(e) => setNewTid(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>MID Number</Label>
                <Input placeholder="e.g. 37135032060302" value={newMid} onChange={(e) => setNewMid(e.target.value)} />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddMachineModalOpen(false)}>Cancel</Button>
              <Button type="submit">Save Machine</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 3. ASSIGN MACHINE MODAL (TABLE ROW ACTION) */}
      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Machine to Franchise / Retailer</DialogTitle>
            <DialogDescription>
              Serial: <span className="font-mono font-bold text-foreground">{selectedMachineForAssign?.serialNumber}</span>
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAssignSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Assignee Full Name</Label>
              <Input placeholder="e.g. Bhupender Kumar Sharma" value={assignName} onChange={(e) => setAssignName(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>User / Franchise ID Code</Label>
              <Input placeholder="e.g. APM00043" value={assignCode} onChange={(e) => setAssignCode(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Contact Phone Number</Label>
              <Input placeholder="10-digit phone" value={assignPhone} onChange={(e) => setAssignPhone(e.target.value)} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAssignModalOpen(false)}>Cancel</Button>
              <Button type="submit">Assign Machine</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 4. EDIT MACHINE MODAL */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit POS Machine Details</DialogTitle>
          </DialogHeader>
          {editingMachine && (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Select
                  value={editingMachine.companyName}
                  onValueChange={(val) => setEditingMachine({ ...editingMachine, companyName: val })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Bank Name</Label>
                <Input
                  value={editingMachine.bankName}
                  onChange={(e) => setEditingMachine({ ...editingMachine, bankName: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Serial Number</Label>
                <Input
                  value={editingMachine.serialNumber}
                  onChange={(e) => setEditingMachine({ ...editingMachine, serialNumber: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>TID Number</Label>
                  <Input
                    value={editingMachine.tidNumber}
                    onChange={(e) => setEditingMachine({ ...editingMachine, tidNumber: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>MID Number</Label>
                  <Input
                    value={editingMachine.midNumber}
                    onChange={(e) => setEditingMachine({ ...editingMachine, midNumber: e.target.value })}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditModalOpen(false)}>Cancel</Button>
                <Button type="submit">Update Details</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* 5. VIEW MASTER COMPANIES MODAL */}
      <Dialog open={viewCompaniesModalOpen} onOpenChange={setViewCompaniesModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Master Company List ({companies.length})</DialogTitle>
            <DialogDescription>Overview of all registered POS vendor companies.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 my-2 max-h-60 overflow-y-auto pr-2">
            {companies.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No companies added yet.</p>
            ) : (
              companies.map((c) => (
                <div key={c} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" />
                    <span className="font-bold text-sm text-foreground">{c}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {machines.filter((m) => m.companyName === c).length} Machines
                  </Badge>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewCompaniesModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 6. BULK UPLOAD MODAL */}
      <Dialog open={bulkUploadModalOpen} onOpenChange={setBulkUploadModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Upload className="w-5 h-5 text-primary" />
              Bulk Upload POS Inventory CSV
            </DialogTitle>
            <DialogDescription>
              Upload a CSV file containing machine data matching the exact Export Excel format.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="bg-muted/30 p-3 rounded-lg border border-border text-xs space-y-1">
              <p className="font-semibold text-foreground">Expected CSV Column Order:</p>
              <p className="font-mono text-[11px] text-muted-foreground break-all">
                SL NO, COMPANY NAME, BANK NAME, DEVICE SERIAL NUMBER, TID NUMBER, MID NUMBER, STATUS, ASSIGN TO
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Select CSV File</Label>
              <Input
                type="file"
                accept=".csv"
                onChange={handleCSVFileChange}
                className="text-xs file:text-xs file:font-semibold"
              />
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadBulkTemplate}
              className="w-full text-xs gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Download Standard Bulk Upload Template
            </Button>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkUploadModalOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

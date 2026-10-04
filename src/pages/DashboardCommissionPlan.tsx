import { useEffect, useState, useCallback } from "react";
import { apiFetch, getMyCommissionPlan } from "@/services/api";
import { Loader2, BarChart3, CheckCircle2, Save, X, Plus, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import usePageTitle from "@/hooks/usePageTitle";
import { NonAdminPOSRateSetting } from "./DashboardPOSRateSetting";

interface UserOverride {
  id: string;
  target_user_id: string;
  service_key: string;
  service_label: string;
  commission_type: string;
  commission_value: number;
  min_amount: number | null;
  max_amount: number | null;
  charge_type: string;
  charge_value: number;
  target_name?: string;
  role?: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  super_distributor: "Super Dist.",
  master_distributor: "Master Dist.",
  distributor: "Distributor",
  retailer: "Retailer",
};

export default function DashboardCommissionPlan() {
  usePageTitle("GenPay | My Charges & Commissions");
  const { user, role } = useAuth();
  const { toast } = useToast();

  const [services, setServices] = useState<any[]>([]);
  const [activeServiceTab, setActiveServiceTab] = useState<string>("");
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Grouped active slabs
  const [groupedSlabs, setGroupedSlabs] = useState<Record<string, any[]>>({});

  // Downline Override States
  const [overrides, setOverrides] = useState<UserOverride[]>([]);
  const [downlineUsers, setDownlineUsers] = useState<any[]>([]);
  
  // Add override dialog
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [oTargetUser, setOTargetUser] = useState("");
  const [oServiceKey, setOServiceKey] = useState("");
  const [oCommType, setOCommType] = useState("flat");
  const [oCommValue, setOCommValue] = useState("");
  const [oMinAmt, setOMinAmt] = useState("");
  const [oMaxAmt, setOMaxAmt] = useState("");
  const [oChargeType, setOChargeType] = useState("flat");
  const [oChargeValue, setOChargeValue] = useState("");
  const [oSaving, setOSaving] = useState(false);

  // Edit override inline
  const [editingOverrideId, setEditingOverrideId] = useState<string | null>(null);
  const [eoCommType, setEoCommType] = useState("flat");
  const [eoCommValue, setEoCommValue] = useState("");
  const [eoMinAmt, setEoMinAmt] = useState("");
  const [eoMaxAmt, setEoMaxAmt] = useState("");
  const [eoChargeType, setEoChargeType] = useState("flat");
  const [eoChargeValue, setEoChargeValue] = useState("");

  const isRetailer = role === "retailer";

  const fetchMyPlan = useCallback(async (activeServices: any[]) => {
    try {
      const myPlan = await getMyCommissionPlan();
      setPlan(myPlan);
      if (myPlan && activeServices) {
        const map: Record<string, any[]> = {};
        for (const svc of activeServices) {
          const key = svc.serviceKey;
          const gSlabs = myPlan.globalSlabs.filter((s: any) => s.serviceKey === key);
          const userOverrides = myPlan.overrides.filter((o: any) => o.serviceKey === key);

          const finalSlabs = [];
          for (const g of gSlabs) {
            const matchingOverride = userOverrides.find((o: any) => o.minAmount === g.minAmount && o.maxAmount === g.maxAmount);
            if (matchingOverride) {
              finalSlabs.push({ ...g, commissionType: matchingOverride.commissionType, commissionValue: matchingOverride.commissionValue, isOverride: true });
            } else {
              finalSlabs.push(g);
            }
          }
          
          for (const o of userOverrides) {
            const matched = finalSlabs.find((f: any) => f.minAmount === o.minAmount && f.maxAmount === o.maxAmount);
            if (!matched) {
              finalSlabs.push({ ...o, isOverride: true });
            }
          }
          finalSlabs.sort((a, b) => (Number(a.minAmount || 0) - Number(b.minAmount || 0)));
          map[key] = finalSlabs;
        }
        setGroupedSlabs(map);
      }
    } catch (err) {
      console.error("Failed to load my plan:", err);
    }
  }, []);

  const fetchOverrides = useCallback(async () => {
    try {
      const data = await apiFetch("/commission/overrides");
      if (data) setOverrides(data);
    } catch (err) {
      console.error("Error fetching overrides:", err);
    }
  }, []);

  const fetchDownlineUsers = useCallback(async () => {
    if (!user || isRetailer) return;
    try {
      const data = await apiFetch("/users");
      if (data) {
        const dl = data
          .filter((u: any) => u.userId !== user.id)
          .map((u: any) => ({ user_id: u.userId, full_name: u.fullName, role: u.role }));
        setDownlineUsers(dl);
      }
    } catch (err) {
      console.error("Error fetching downline users:", err);
    }
  }, [user, isRetailer]);

  useEffect(() => {
    const loadData = async () => {
      console.log("DashboardCommissionPlan: loadData started");
      setLoading(true);
      try {
        console.log("DashboardCommissionPlan: fetching users/services");
        const activeServices = await apiFetch("/users/services");
        console.log("DashboardCommissionPlan: fetched users/services", activeServices);
        const fetchedServices = activeServices || [];
        setServices(fetchedServices);
        if (fetchedServices.length > 0) {
          setActiveServiceTab(fetchedServices[0].serviceKey);
        }
        
        console.log("DashboardCommissionPlan: fetching fetchMyPlan");
        await fetchMyPlan(fetchedServices);
        console.log("DashboardCommissionPlan: fetched fetchMyPlan");
        
        if (!isRetailer) {
          console.log("DashboardCommissionPlan: fetching fetchOverrides");
          await fetchOverrides();
          console.log("DashboardCommissionPlan: fetching fetchDownlineUsers");
          await fetchDownlineUsers();
        }
      } catch (err) {
        console.error("Failed to load initial data:", err);
      } finally {
        console.log("DashboardCommissionPlan: loadData finished, setting loading false");
        setLoading(false);
      }
    };
    loadData();
  }, [fetchMyPlan, fetchOverrides, fetchDownlineUsers, isRetailer]);

  const openAddOverride = () => {
    setOTargetUser(""); setOServiceKey(""); 
    setOCommType("flat"); setOCommValue(""); 
    setOMinAmt(""); setOMaxAmt("");
    setOChargeType("flat"); setOChargeValue("");
    setOverrideOpen(true);
  };

  const handleSaveOverride = async () => {
    if (!oTargetUser || !oServiceKey || !user) {
      toast({ title: "Select user and service", variant: "destructive" }); return;
    }
    const commVal = parseFloat(oCommValue) || 0;
    const chargeVal = parseFloat(oChargeValue) || 0;
    const svcLabel = services.find((s) => s.serviceKey === oServiceKey)?.serviceLabel || oServiceKey;

    setOSaving(true);
    try {
      await apiFetch("/commission/overrides", {
        method: "POST",
        body: JSON.stringify({
          target_user_id: oTargetUser,
          service_key: oServiceKey,
          service_label: svcLabel,
          commission_type: oCommType,
          commission_value: commVal,
          min_amount: oMinAmt === "" ? null : parseFloat(oMinAmt),
          max_amount: oMaxAmt === "" ? null : parseFloat(oMaxAmt),
          charge_type: oChargeType,
          charge_value: chargeVal,
        }),
      });
      toast({ title: "Custom charge saved for downline" });
      setOverrideOpen(false);
      fetchOverrides();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setOSaving(false);
    }
  };

  const handleUpdateOverride = async (id: string) => {
    const commVal = parseFloat(eoCommValue) || 0;
    const chargeVal = parseFloat(eoChargeValue) || 0;
    try {
      await apiFetch(`/commission/overrides/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          commission_type: eoCommType,
          commission_value: commVal,
          min_amount: eoMinAmt === "" ? null : parseFloat(eoMinAmt),
          max_amount: eoMaxAmt === "" ? null : parseFloat(eoMaxAmt),
          charge_type: eoChargeType,
          charge_value: chargeVal,
        }),
      });
      toast({ title: "Downline charge updated" });
      setEditingOverrideId(null);
      fetchOverrides();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteOverride = async (id: string) => {
    try {
      await apiFetch(`/commission/overrides/${id}`, { method: "DELETE" });
      toast({ title: "Downline charge removed" });
      fetchOverrides();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Filter slabs and overrides for the currently active service tab
  const activeSlabs = activeServiceTab ? (groupedSlabs[activeServiceTab] || []) : [];
  const activeOverrides = overrides.filter(o => o.service_key === activeServiceTab);

  const MyChargesContent = () => (
    <div className="grid gap-6 mt-6">
      <Card className="overflow-hidden bg-gradient-card border-border shadow-sm">
        <CardContent className="p-0">
          {activeSlabs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border/50">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Range (₹)</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Charge/Commission Type</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {activeSlabs.map((slab, i) => (
                    <tr key={i} className="border-b border-border/30 last:border-0 hover:bg-secondary/10 transition-colors">
                      <td className="py-3 px-4 font-mono">
                        {slab.minAmount !== null ? `₹${slab.minAmount}` : "₹0"} 
                        {slab.maxAmount !== null ? ` - ₹${slab.maxAmount}` : " and above"}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="uppercase text-[10px] tracking-wider">
                          {slab.commissionType}
                        </Badge>
                        {slab.isOverride && (
                          <Badge className="ml-2 text-[9px] h-4 bg-amber-500/10 text-amber-500 border-amber-500/20">Custom</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-foreground">
                        {slab.commissionType === "percent" ? `${slab.commissionValue}%` : `₹${slab.commissionValue}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No specific charges or commission slabs defined for this service.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const DownlineChargesContent = () => (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg font-heading">Set Downline Charges</CardTitle>
          <CardDescription>Configure specific commissions and charges for your child accounts for this service.</CardDescription>
        </div>
        <Button variant="hero" size="sm" onClick={openAddOverride}>
          <Plus className="w-4 h-4 mr-1" /> Set Charge
        </Button>
      </CardHeader>
      <CardContent>
        {activeOverrides.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
            No downline charges set for this service. Click "Set Charge" to configure.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground uppercase">User</th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground uppercase">Range (₹)</th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground uppercase">Commission</th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground uppercase">Charge</th>
                  <th className="text-right py-3 px-3 text-xs font-medium text-muted-foreground uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeOverrides.map((o) => {
                  const isEditingThis = editingOverrideId === o.id;
                  return (
                    <tr key={o.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                      <td className="py-3 px-3 font-medium text-foreground">{o.target_name}</td>
                      <td className="py-3 px-3">
                        {isEditingThis ? (
                          <div className="flex items-center gap-1">
                            <Input className="h-7 w-16 text-xs" placeholder="Min" value={eoMinAmt} onChange={(e) => setEoMinAmt(e.target.value)} />
                            <span className="text-muted-foreground">-</span>
                            <Input className="h-7 w-16 text-xs" placeholder="Max" value={eoMaxAmt} onChange={(e) => setEoMaxAmt(e.target.value)} />
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {o.min_amount ?? 0} to {o.max_amount ?? '∞'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {isEditingThis ? (
                          <div className="flex items-center gap-1">
                            <Select value={eoCommType} onValueChange={setEoCommType}>
                              <SelectTrigger className="h-7 w-14 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="flat">₹</SelectItem>
                                <SelectItem value="percent">%</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input className="h-7 w-16 text-xs" type="number" value={eoCommValue} onChange={(e) => setEoCommValue(e.target.value)} />
                          </div>
                        ) : (
                          <Badge variant="secondary" className="text-xs font-mono">
                            {o.commission_type === "percent" ? `${o.commission_value}%` : `₹${o.commission_value}`}
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {isEditingThis ? (
                          <div className="flex items-center gap-1">
                            <Select value={eoChargeType} onValueChange={setEoChargeType}>
                              <SelectTrigger className="h-7 w-14 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="flat">₹</SelectItem>
                                <SelectItem value="percent">%</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input className="h-7 w-16 text-xs" type="number" value={eoChargeValue} onChange={(e) => setEoChargeValue(e.target.value)} />
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-xs font-mono bg-destructive/10 text-destructive border-destructive/20">
                            {o.charge_type === "percent" ? `${o.charge_value}%` : `₹${o.charge_value}`}
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {isEditingThis ? (
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleUpdateOverride(o.id)}>
                              <Save className="w-3.5 h-3.5 text-success" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingOverrideId(null)}>
                              <X className="w-3.5 h-3.5 text-destructive" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                              setEditingOverrideId(o.id);
                              setEoCommType(o.commission_type); setEoCommValue(String(o.commission_value));
                              setEoMinAmt(o.min_amount != null ? String(o.min_amount) : ""); setEoMaxAmt(o.max_amount != null ? String(o.max_amount) : "");
                              setEoChargeType(o.charge_type); setEoChargeValue(String(o.charge_value));
                            }}>
                              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteOverride(o.id)}>
                              <Trash2 className="w-3.5 h-3.5 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 w-full max-w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">Charges</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isRetailer ? "View your active charges." : "View your charges and set rates for your downline."}
          </p>
        </div>
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
          Role: <span className="uppercase font-bold ml-1">{plan?.role}</span>
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2 pb-2">
        {services.length === 0 && (
          <div className="text-sm text-muted-foreground">No active services.</div>
        )}
        {services.map((svc) => (
          <Button
            key={svc.serviceKey}
            variant={activeServiceTab === svc.serviceKey ? "default" : "outline"}
            className={`rounded-md h-10 ${
              activeServiceTab === svc.serviceKey 
                ? "bg-[#00c8b0] hover:bg-[#00b09a] text-white border-[#00c8b0]" 
                : "bg-white hover:bg-gray-50 border-border text-foreground shadow-sm"
            }`}
            onClick={() => setActiveServiceTab(svc.serviceKey)}
          >
            {svc.serviceLabel}
          </Button>
        ))}
      </div>

      {activeServiceTab === "pos" ? (
        <NonAdminPOSRateSetting 
          isRetailer={isRetailer}
          rates={[
            { id: 1, method: "Card", network: "AMEX", classification: "ANY", settlement: "today_settlement", baseRate: "2.80%" },
            { id: 2, method: "Card", network: "DINERS", classification: "ANY", settlement: "today_settlement", baseRate: "2.80%" },
            { id: 3, method: "Card", network: "DINERS", classification: "Standard", settlement: "today_settlement", baseRate: "2.80%" },
            { id: 4, method: "Card", network: "MASTER_CARD", classification: "ANY", settlement: "today_settlement", baseRate: "1.80%" },
            { id: 5, method: "Card", network: "MASTER_CARD", classification: "Business", settlement: "today_settlement", baseRate: "3.00%" },
            { id: 6, method: "Card", network: "VISA", classification: "Gold", settlement: "today_settlement", baseRate: "1.80%" }
          ]} 
        />
      ) : (
        isRetailer ? (
          <MyChargesContent />
        ) : (
          <Tabs defaultValue="my-charges" className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
              <TabsTrigger value="my-charges">My Charges</TabsTrigger>
              <TabsTrigger value="downline-charges">Set Downline Charges</TabsTrigger>
            </TabsList>
            <TabsContent value="my-charges">
              <MyChargesContent />
            </TabsContent>
            <TabsContent value="downline-charges">
              <DownlineChargesContent />
            </TabsContent>
          </Tabs>
        )
      )}

      {/* Add Downline Override Dialog */}
      {!isRetailer && (
        <Dialog open={overrideOpen} onOpenChange={setOverrideOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Set Downline Charge / Commission</DialogTitle>
              <DialogDescription>Apply a specific rate for a user in your downline.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Select User *</Label>
                <Select value={oTargetUser} onValueChange={setOTargetUser}>
                  <SelectTrigger><SelectValue placeholder="Choose downline user" /></SelectTrigger>
                  <SelectContent>
                    {downlineUsers.map((u) => (
                      <SelectItem key={u.user_id} value={u.user_id}>
                        {u.full_name} {u.role ? `(${ROLE_LABELS[u.role] || u.role})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Service *</Label>
                <Select value={oServiceKey} onValueChange={setOServiceKey}>
                  <SelectTrigger><SelectValue placeholder="Choose service" /></SelectTrigger>
                  <SelectContent>
                    {services.map((s) => (
                      <SelectItem key={s.serviceKey} value={s.serviceKey}>{s.serviceLabel}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Min Amount (₹)</Label>
                  <Input type="number" min="0" placeholder="0" value={oMinAmt} onChange={(e) => setOMinAmt(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Max Amount (₹)</Label>
                  <Input type="number" min="0" placeholder="Leave empty for ∞" value={oMaxAmt} onChange={(e) => setOMaxAmt(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Commission Type</Label>
                  <Select value={oCommType} onValueChange={setOCommType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flat">Flat (₹)</SelectItem>
                      <SelectItem value="percent">Percent (%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Commission Value</Label>
                  <Input type="number" min="0" placeholder="0" value={oCommValue} onChange={(e) => setOCommValue(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Charge Type</Label>
                  <Select value={oChargeType} onValueChange={setOChargeType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flat">Flat (₹)</SelectItem>
                      <SelectItem value="percent">Percent (%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Charge Value</Label>
                  <Input type="number" min="0" placeholder="0" value={oChargeValue} onChange={(e) => setOChargeValue(e.target.value)} />
                </div>
              </div>

              <Button className="w-full mt-4" onClick={handleSaveOverride} disabled={oSaving}>
                {oSaving ? "Saving..." : "Save Rate"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

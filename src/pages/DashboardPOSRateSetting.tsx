import { useState } from "react";
import { Search, Plus, Edit, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import usePageTitle from "@/hooks/usePageTitle";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Mock Data
const INITIAL_DEFAULT_RATES = [
  { id: 1, scope: "Global Default", company: "—", method: "Card", network: "AMEX", cardType: "Credit", classification: "ANY", settlement: "next_day_settlement", amountRange: "0+", flat: "—", gst: "-", baseRate: "2.7%" },
  { id: 2, scope: "Global Default", company: "—", method: "Card", network: "AMEX", cardType: "Credit", classification: "ANY", settlement: "today_settlement", amountRange: "0+", flat: "—", gst: "-", baseRate: "2.8%" },
  { id: 3, scope: "Global Default", company: "—", method: "Card", network: "DINERS", cardType: "Credit", classification: "ANY", settlement: "today_settlement", amountRange: "0+", flat: "—", gst: "-", baseRate: "2.8%" },
  { id: 4, scope: "Global Default", company: "—", method: "Card", network: "DINERS", cardType: "Credit", classification: "Standard", settlement: "today_settlement", amountRange: "0+", flat: "—", gst: "-", baseRate: "2.8%" },
];

const MOCK_USERS = [
  { id: "APF00036", name: "vineet kumar Tewari", phone: "*******3140", role: "retailer" },
  { id: "APF00035", name: "Patel Nirmal shaileshkumar", phone: "*******2221", role: "distributor" },
  { id: "APF00034", name: "RENIKINDI KIRAN KUMAR", phone: "*******0270", role: "master_distributor" },
  { id: "APF00033", name: "CHANDRA SHEKAR VADDE", phone: "*******6669", role: "super_distributor" },
];

export default function DashboardPOSRateSetting() {
  usePageTitle("GenPay | POS Rate Settings");
  const { toast } = useToast();
  const { role } = useAuth();
  
  const [activeTab, setActiveTab] = useState("default-rates");
  const [searchQuery, setSearchQuery] = useState("");
  const [rates, setRates] = useState(INITIAL_DEFAULT_RATES);

  // Dialog states for Rules
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<any>(null);
  
  // Dialog states for User Rates
  const [isUserViewOpen, setIsUserViewOpen] = useState(false);
  const [isUserEditOpen, setIsUserEditOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Rule Form State
  const [ruleFormData, setRuleFormData] = useState({
    network: "",
    cardType: "",
    classification: "",
    settlement: "",
    baseRate: "",
  });

  const filteredUsers = MOCK_USERS.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenRuleDialog = (rule?: any) => {
    if (rule) {
      setSelectedRule(rule);
      setRuleFormData({
        network: rule.network,
        cardType: rule.cardType,
        classification: rule.classification,
        settlement: rule.settlement,
        baseRate: rule.baseRate.replace('%', ''),
      });
    } else {
      setSelectedRule(null);
      setRuleFormData({ network: "", cardType: "", classification: "", settlement: "", baseRate: "" });
    }
    setIsRuleDialogOpen(true);
  };

  const handleSaveRule = () => {
    if (!ruleFormData.network || !ruleFormData.baseRate) {
      toast({ title: "Validation Error", description: "Network and Base Rate are required", variant: "destructive" });
      return;
    }

    if (selectedRule) {
      setRates(rates.map(r => r.id === selectedRule.id ? { 
        ...r, 
        network: ruleFormData.network,
        cardType: ruleFormData.cardType,
        classification: ruleFormData.classification,
        settlement: ruleFormData.settlement,
        baseRate: ruleFormData.baseRate + "%"
      } : r));
      toast({ title: "Success", description: "Rule updated successfully" });
    } else {
      setRates([...rates, {
        id: Date.now(),
        scope: "Global Default",
        company: "—",
        method: "Card",
        amountRange: "0+",
        flat: "—",
        gst: "-",
        network: ruleFormData.network,
        cardType: ruleFormData.cardType || "ANY",
        classification: ruleFormData.classification || "ANY",
        settlement: ruleFormData.settlement || "Any",
        baseRate: ruleFormData.baseRate + "%"
      }]);
      toast({ title: "Success", description: "New rule added successfully" });
    }
    setIsRuleDialogOpen(false);
  };

  const handleDeleteRule = () => {
    setRates(rates.filter(r => r.id !== selectedRule.id));
    toast({ title: "Success", description: "Rule deleted successfully" });
    setIsDeleteDialogOpen(false);
  };

  const handleUserAction = (user: any, action: 'view' | 'edit') => {
    setSelectedUser(user);
    if (action === 'view') setIsUserViewOpen(true);
    if (action === 'edit') setIsUserEditOpen(true);
  };

  const handleSaveUserRates = () => {
    toast({ title: "Success", description: `Rates updated for ${selectedUser?.name}` });
    setIsUserEditOpen(false);
  };

  const renderUserTable = (roleLabel: string) => (
    <div className="m-0 border-0 p-0">
      <div className="p-6 border-b border-border/50">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder={`Search ${roleLabel} by Name, ID, or Phone...`}
            className="pl-9 h-10 border-border/50"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-transparent border-b border-border/50">
            <tr>
              <th className="text-left py-4 px-6 font-semibold text-muted-foreground text-xs uppercase tracking-wider">{roleLabel}</th>
              <th className="text-left py-4 px-6 font-semibold text-muted-foreground text-xs uppercase tracking-wider">User ID</th>
              <th className="text-left py-4 px-6 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Phone</th>
              <th className="text-right py-4 px-6 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user, i) => (
              <tr key={i} className="border-b border-border/30 hover:bg-secondary/10 transition-colors">
                <td className="py-4 px-6 font-medium text-[#4f67ff]">{user.name}</td>
                <td className="py-4 px-6 font-medium text-foreground">{user.id}</td>
                <td className="py-4 px-6 text-muted-foreground">{user.phone}</td>
                <td className="py-4 px-6 text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleUserAction(user, 'view')} className="h-8 rounded-full px-4 text-[#4f67ff] border-[#4f67ff]/30 hover:bg-[#4f67ff]/5">
                      <Eye className="w-3 h-3 mr-1" /> View
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleUserAction(user, 'edit')} className="h-8 rounded-full px-4 text-[#4f67ff] border-[#4f67ff]/30 hover:bg-[#4f67ff]/5">
                      <Edit className="w-3 h-3 mr-1" /> Edit
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (role !== "admin") {
    return <NonAdminPOSRateSetting rates={rates} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/dashboard" className="text-xs text-primary hover:underline mb-1 inline-block">&larr; Rate Settings Home</Link>
        <h1 className="text-2xl font-bold font-heading text-foreground">POS Transaction Charges</h1>
        <p className="text-sm text-muted-foreground mt-1">Default, distributor and unassigned retailer POS transaction charge settings.</p>
      </div>

      <Card className="border-0 shadow-sm overflow-hidden bg-background">
        <Tabs defaultValue="default-rates" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="border-b border-border/50 px-2 pt-2">
            <TabsList className="h-10 bg-transparent gap-6 p-0 flex flex-wrap">
              <TabsTrigger value="default-rates" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 py-2 text-sm font-medium">
                Default Rates
              </TabsTrigger>
              <TabsTrigger value="super-distributor-rates" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 py-2 text-sm font-medium">
                Super Distributor under admin rates
              </TabsTrigger>
              <TabsTrigger value="master-distributor-rates" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 py-2 text-sm font-medium">
                Master Distributor under admin rates
              </TabsTrigger>
              <TabsTrigger value="distributor-rates" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 py-2 text-sm font-medium">
                Distributor under admin rates
              </TabsTrigger>
              <TabsTrigger value="retailer-rates" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 py-2 text-sm font-medium">
                Retailer under admin rates
              </TabsTrigger>
            </TabsList>
          </div>

          <CardContent className="p-0">
            <TabsContent value="default-rates" className="m-0 border-0 p-0">
              <div className="flex justify-end p-4 border-b border-border/50">
                <Button onClick={() => handleOpenRuleDialog()} className="bg-[#00c8b0] hover:bg-[#00b09a] text-white rounded-md h-9">
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Rule
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-transparent border-b border-border/50">
                    <tr>
                      <th className="text-left py-4 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Scope</th>
                      <th className="text-left py-4 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Company</th>
                      <th className="text-left py-4 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Method</th>
                      <th className="text-left py-4 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Network</th>
                      <th className="text-left py-4 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Card Type</th>
                      <th className="text-left py-4 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Classification</th>
                      <th className="text-left py-4 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Settlement</th>
                      <th className="text-left py-4 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Amount Range</th>
                      <th className="text-left py-4 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Flat (₹)</th>
                      <th className="text-left py-4 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider">GST (%)</th>
                      <th className="text-left py-4 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Default Base Rate (%)</th>
                      <th className="text-right py-4 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rates.length === 0 && (
                      <tr><td colSpan={12} className="text-center py-6 text-muted-foreground">No rules configured.</td></tr>
                    )}
                    {rates.map((rate) => (
                      <tr key={rate.id} className="border-b border-border/30 hover:bg-secondary/10 transition-colors">
                        <td className="py-3 px-4">
                          <Badge variant="secondary" className="bg-blue-50 text-blue-600 border border-blue-100 font-normal hover:bg-blue-50">
                            {rate.scope}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">{rate.company}</td>
                        <td className="py-3 px-4">{rate.method}</td>
                        <td className="py-3 px-4 font-medium">{rate.network}</td>
                        <td className="py-3 px-4">{rate.cardType}</td>
                        <td className="py-3 px-4">{rate.classification}</td>
                        <td className="py-3 px-4 text-muted-foreground">{rate.settlement}</td>
                        <td className="py-3 px-4">{rate.amountRange}</td>
                        <td className="py-3 px-4 text-muted-foreground">{rate.flat}</td>
                        <td className="py-3 px-4 text-muted-foreground">{rate.gst}</td>
                        <td className="py-3 px-4 font-medium">{rate.baseRate}</td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" onClick={() => handleOpenRuleDialog(rate)} className="h-7 px-3 bg-[#4f67ff] hover:bg-[#3d52cc] text-white">Edit</Button>
                            <Button size="sm" onClick={() => { setSelectedRule(rate); setIsDeleteDialogOpen(true); }} className="h-7 px-3 bg-[#ff5252] hover:bg-[#cc4242] text-white">Delete</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="super-distributor-rates">{renderUserTable("Super Distributor")}</TabsContent>
            <TabsContent value="master-distributor-rates">{renderUserTable("Master Distributor")}</TabsContent>
            <TabsContent value="distributor-rates">{renderUserTable("Distributor")}</TabsContent>
            <TabsContent value="retailer-rates">{renderUserTable("Retailer")}</TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      {/* Rule Dialog (Add/Edit) */}
      <Dialog open={isRuleDialogOpen} onOpenChange={setIsRuleDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{selectedRule ? "Edit Rule" : "Add New Rule"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Network (e.g. AMEX, VISA)</Label>
              <Input value={ruleFormData.network} onChange={e => setRuleFormData({...ruleFormData, network: e.target.value})} placeholder="AMEX" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Card Type</Label>
                <Input value={ruleFormData.cardType} onChange={e => setRuleFormData({...ruleFormData, cardType: e.target.value})} placeholder="Credit" />
              </div>
              <div className="grid gap-2">
                <Label>Classification</Label>
                <Input value={ruleFormData.classification} onChange={e => setRuleFormData({...ruleFormData, classification: e.target.value})} placeholder="ANY" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Settlement Type</Label>
              <Input value={ruleFormData.settlement} onChange={e => setRuleFormData({...ruleFormData, settlement: e.target.value})} placeholder="today_settlement" />
            </div>
            <div className="grid gap-2">
              <Label>Base Rate (%)</Label>
              <Input value={ruleFormData.baseRate} onChange={e => setRuleFormData({...ruleFormData, baseRate: e.target.value})} type="number" step="0.1" placeholder="2.5" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRuleDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveRule}>Save Rule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Rule Confirm Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Rule</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this rule for {selectedRule?.network}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteRule}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Rates View Dialog */}
      <Dialog open={isUserViewOpen} onOpenChange={setIsUserViewOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>View Rates for {selectedUser?.name}</DialogTitle>
            <DialogDescription>User ID: {selectedUser?.id}</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <h4 className="font-semibold mb-3">Assigned POS Transaction Charges</h4>
            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-3 font-medium">Network</th>
                    <th className="text-left p-3 font-medium">Type</th>
                    <th className="text-left p-3 font-medium">Settlement</th>
                    <th className="text-right p-3 font-medium">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {rates.slice(0, 3).map((r, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="p-3">{r.network}</td>
                      <td className="p-3">{r.cardType}</td>
                      <td className="p-3 text-muted-foreground">{r.settlement}</td>
                      <td className="p-3 text-right font-medium">{r.baseRate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsUserViewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Rates Edit Dialog */}
      <Dialog open={isUserEditOpen} onOpenChange={setIsUserEditOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Rates for {selectedUser?.name}</DialogTitle>
            <DialogDescription>Modify specific rate overrides for this user.</DialogDescription>
          </DialogHeader>
          <div className="py-4 grid gap-4">
            {rates.slice(0, 3).map((r, i) => (
              <div key={i} className="flex items-center justify-between p-3 border rounded-md">
                <div>
                  <p className="font-medium">{r.network} - {r.cardType}</p>
                  <p className="text-xs text-muted-foreground">{r.settlement}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Input defaultValue={parseFloat(r.baseRate)} type="number" step="0.1" className="w-24 text-right" />
                  <span className="text-sm">%</span>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUserEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveUserRates}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

export function NonAdminPOSRateSetting({ rates, isRetailer }: { rates: any[], isRetailer?: boolean }) {
  const [activeTab, setActiveTab] = useState("default");
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading text-foreground">
          {isRetailer ? "My POS Charges" : "POS charges for you and your merchant"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isRetailer ? "View your active POS rates" : "Set Merchant Rates and View Profit Margins"}
        </p>
      </div>

      <Card className="border-0 shadow-sm overflow-hidden bg-background">
        <Tabs defaultValue="default" value={activeTab} onValueChange={setActiveTab} className="w-full">
          {!isRetailer && (
            <div className="border-b border-border/50 px-6 pt-2">
              <TabsList className="h-10 bg-transparent gap-8 p-0">
                <TabsTrigger 
                  value="default" 
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-2 py-2 text-sm font-medium"
                >
                  Default Rates
                </TabsTrigger>
                <TabsTrigger 
                  value="matrix" 
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-2 py-2 text-sm font-medium"
                >
                  Specific Merchant Rates (Matrix)
                </TabsTrigger>
              </TabsList>
            </div>
          )}

          <CardContent className="p-0">
            <TabsContent value="default" className="m-0 border-0 p-0">
              <div className="p-4 border-b border-border/50">
                <div className="w-64 space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Settlement</Label>
                  <Select defaultValue="today">
                    <SelectTrigger>
                      <SelectValue placeholder="Select settlement" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">Today Settlement</SelectItem>
                      <SelectItem value="next">Next Day Settlement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-transparent border-b border-border/50">
                    <tr>
                      <th className="text-left py-4 px-6 font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">Method</th>
                      <th className="text-left py-4 px-6 font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">Network</th>
                      <th className="text-left py-4 px-6 font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">Company</th>
                      <th className="text-left py-4 px-6 font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">Classification</th>
                      <th className="text-left py-4 px-6 font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">Settlement</th>
                      <th className="text-left py-4 px-6 font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">GST (%)</th>
                      <th className="text-left py-4 px-6 font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">
                        {isRetailer ? "My Rate (%)" : "Rate Set By Admin (%)"}
                      </th>
                      {!isRetailer && (
                        <>
                          <th className="text-left py-4 px-6 font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">Default Merchant Rate (%)</th>
                          <th className="text-right py-4 px-6 font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">Actions</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {rates.slice(0, 7).map((rate, i) => (
                      <tr key={i} className="border-b border-border/30 hover:bg-secondary/10 transition-colors">
                        <td className="py-4 px-6 text-foreground">{rate.method}</td>
                        <td className="py-4 px-6 text-foreground">{rate.network}</td>
                        <td className="py-4 px-6 text-muted-foreground">—</td>
                        <td className="py-4 px-6 text-foreground">{rate.classification}</td>
                        <td className="py-4 px-6 text-muted-foreground">Today Settlement</td>
                        <td className="py-4 px-6 text-muted-foreground">-</td>
                        <td className="py-4 px-6 text-foreground font-medium">{rate.baseRate}</td>
                        {!isRetailer && (
                          <>
                            <td className="py-4 px-6 text-foreground font-medium">{rate.baseRate}</td>
                            <td className="py-4 px-6 text-right">
                              <Button size="sm" className="h-8 px-4 bg-[#4f67ff] hover:bg-[#3d52cc] text-white rounded-md text-xs">
                                Edit
                              </Button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="matrix" className="m-0 border-0 p-0">
              <div className="p-6 border-b border-border/50 flex items-end justify-between gap-4">
                <div className="flex items-end gap-4 flex-1">
                  <div className="relative max-w-sm w-full">
                    <Input 
                      placeholder="Search Merchant by Name, ID, or Phone..." 
                      className="h-10"
                    />
                  </div>
                  <div className="w-48 space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Settlement</Label>
                    <Select defaultValue="today">
                      <SelectTrigger>
                        <SelectValue placeholder="Select settlement" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="today">Today Settlem</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button variant="outline" className="text-primary border-primary hover:bg-primary/5 h-10">
                  Collapsed combos
                </Button>
              </div>
              
              <div className="p-4 mx-6 mt-4 mb-2 bg-primary/5 border border-primary/20 rounded-md">
                <h4 className="text-sm font-semibold text-primary mb-1">Matrix mode</h4>
                <p className="text-xs text-primary/80">Full combo mode shows every rate combination separately.</p>
              </div>

              <div className="overflow-x-auto pb-4 px-6">
                <table className="w-full text-xs">
                  <thead className="bg-transparent border-b border-border/50">
                    <tr>
                      <th className="text-left py-4 px-4 font-semibold text-muted-foreground tracking-wider uppercase whitespace-nowrap align-bottom">Merchant</th>
                      <th className="text-center py-4 px-4 font-semibold text-muted-foreground tracking-wider uppercase whitespace-nowrap">
                        <div className="text-[10px]">DINERS</div>
                        <div className="text-[10px]">CARD</div>
                        <div className="text-[10px] text-muted-foreground/70 font-normal mt-1">Standard | Today Settlement</div>
                      </th>
                      <th className="text-center py-4 px-4 font-semibold text-muted-foreground tracking-wider uppercase whitespace-nowrap">
                        <div className="text-[10px]">MASTER_CARD</div>
                        <div className="text-[10px]">CARD</div>
                        <div className="text-[10px] text-muted-foreground/70 font-normal mt-1">ANY | Today Settlement</div>
                      </th>
                      <th className="text-center py-4 px-4 font-semibold text-muted-foreground tracking-wider uppercase whitespace-nowrap">
                        <div className="text-[10px]">MASTER_CARD</div>
                        <div className="text-[10px]">CARD</div>
                        <div className="text-[10px] text-muted-foreground/70 font-normal mt-1">Business | Today Settlement</div>
                      </th>
                      <th className="text-center py-4 px-4 font-semibold text-muted-foreground tracking-wider uppercase whitespace-nowrap">
                        <div className="text-[10px]">VISA</div>
                        <div className="text-[10px]">CARD</div>
                        <div className="text-[10px] text-muted-foreground/70 font-normal mt-1">Gold | Today Settlement</div>
                      </th>
                      <th className="text-right py-4 px-4 font-semibold text-muted-foreground tracking-wider uppercase whitespace-nowrap align-bottom">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border/30">
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        No specific merchant rates found. Use the search to find a merchant and set custom rates.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}

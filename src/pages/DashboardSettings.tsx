import { useState } from "react";
import { Bell, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/services/api";
import DashboardChangePassword from "./DashboardChangePassword";
import DashboardTpin from "./DashboardTpin";
import DashboardRoleTemplates from "./DashboardRoleTemplates";

const settingsTabs = [
  "View Roles",
  "Update Password",
  "Generate T-PIN",
  "Verify T-PIN",
  "Alerts"
] as const;

export default function DashboardSettings() {
  const [activeTab, setActiveTab] = useState<typeof settingsTabs[number]>("View Roles");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage system configurations, alerts, and roles.</p>
      </div>

      <div className="flex gap-2 flex-wrap bg-secondary/30 p-4 rounded-xl border border-border/50">
        {settingsTabs.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === tab 
                ? "bg-primary text-primary-foreground shadow-md scale-[1.02]" 
                : "bg-secondary text-foreground hover:bg-secondary/80 hover:shadow-sm"
            }`}>
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Alerts" && (
        <div className="rounded-xl bg-gradient-card border border-border p-6 space-y-5 max-w-2xl mt-6">
          <div className="flex items-center gap-2"><Bell className="w-5 h-5 text-warning" /><h2 className="font-heading font-semibold text-foreground">Notification Preferences</h2></div>
          {[
            { label: "Transaction Alerts", desc: "SMS/Email on every transaction", on: true },
            { label: "Low Balance Alert", desc: "Notify when wallet drops below minimum", on: true },
            { label: "Fund Request Updates", desc: "Notify on fund request approval/rejection", on: true },
            { label: "KYC Status Updates", desc: "Email on KYC approval/rejection", on: true },
            { label: "Login Alerts", desc: "Notify on new device logins", on: false },
            { label: "Commission Credits", desc: "Notify on commission payouts", on: true },
          ].map((item) => (
             <div key={item.label} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/50">
               <div><div className="text-sm font-medium text-foreground">{item.label}</div><div className="text-xs text-muted-foreground">{item.desc}</div></div>
               <Switch defaultChecked={item.on} />
             </div>
          ))}
          <Button className="bg-gradient-primary text-primary-foreground font-semibold"><Save className="w-4 h-4 mr-1" /> Save Preferences</Button>
        </div>
      )}

      {activeTab === "Update Password" && (
        <div className="mt-6 border-t pt-6"><DashboardChangePassword /></div>
      )}

      {activeTab === "Generate T-PIN" && (
        <div className="mt-6 border-t pt-6"><DashboardTpin /></div>
      )}

      {(activeTab === "View Roles") && (
        <div className="mt-6 border-t pt-6"><DashboardRoleTemplates /></div>
      )}

      {activeTab === "Verify T-PIN" && (
        <div className="mt-6 border-t pt-6">
          <VerifyTpinForm />
        </div>
      )}
    </div>
  );
}

function VerifyTpinForm() {
  const [tpin, setTpin] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; message?: string } | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tpin.length < 4) return;
    setLoading(true);
    setResult(null);
    try {
      await apiFetch("/tpin/verify", {
        method: "POST",
        body: JSON.stringify({ tpin })
      });
      setResult({ success: true, message: "T-PIN is correct and verified successfully!" });
    } catch (err: any) {
      setResult({ success: false, message: err.message || "Invalid T-PIN" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md rounded-xl bg-gradient-card border border-border p-6 space-y-4">
      <h2 className="font-heading font-semibold text-foreground text-xl">Test / Verify T-PIN</h2>
      <p className="text-sm text-muted-foreground">Enter your current T-PIN below to verify if it is correct.</p>
      
      <form onSubmit={handleVerify} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Enter T-PIN</label>
          <Input 
            type="password" 
            maxLength={6} 
            value={tpin} 
            onChange={e => setTpin(e.target.value.replace(/\D/g, ''))}
            placeholder="****"
            className="text-center tracking-widest font-bold text-lg"
          />
        </div>
        <Button type="submit" disabled={loading || tpin.length < 4} className="w-full">
          {loading ? "Verifying..." : "Verify T-PIN"}
        </Button>
      </form>

      {result && (
        <div className={`p-3 rounded-lg text-sm font-medium ${result.success ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
          {result.message}
        </div>
      )}
    </div>
  );
}

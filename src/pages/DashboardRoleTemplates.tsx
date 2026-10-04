import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Eye, Edit } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PERMISSION_GROUPS } from "./DashboardStaffManagement";
import { useToast } from "@/hooks/use-toast";

const DEFAULT_ROLES = [
  { name: "MANAGER", status: "active", perms: { can_manage_users: true, can_create_users: true, can_edit_users: true, can_block_users: true, can_manage_finance: true, can_approve_fund_requests: true, can_reject_fund_requests: true, can_view_transactions: true } },
  { name: "Management", status: "active", perms: { can_manage_users: true, can_view_transactions: true, can_manage_commissions: true, can_manage_settings: true } },
  { name: "Operator", status: "active", perms: { can_manage_users: true, can_create_users: true, can_view_transactions: true } },
  { name: "SUPER", status: "active", perms: { can_manage_users: true, can_manage_finance: true, can_manage_commissions: true, can_manage_services: true, can_manage_support: true, can_manage_settings: true } },
  { name: "SUPPORT", status: "active", perms: { can_manage_support: true, can_reply_tickets: true, can_close_tickets: true, can_manage_users: true, can_view_user_docs: true } },
];

export function getRoles() {
  const stored = localStorage.getItem("app_roles");
  if (stored) return JSON.parse(stored);
  return DEFAULT_ROLES;
}

export function saveRoles(roles: any) {
  localStorage.setItem("app_roles", JSON.stringify(roles));
}

export default function DashboardRoleTemplates() {
  const [roles, setRoles] = useState<any[]>([]);
  const [viewRole, setViewRole] = useState<any>(null);
  const [editRole, setEditRole] = useState<any>(null);
  const [editPerms, setEditPerms] = useState<any>({});
  const { toast } = useToast();

  useEffect(() => {
    setRoles(getRoles());
  }, []);

  const handleEditClick = (role: any) => {
    setEditRole(role);
    setEditPerms({ ...role.perms });
  };

  const handleSaveEdit = () => {
    const updatedRoles = roles.map(r => 
      r.name === editRole.name ? { ...r, perms: editPerms } : r
    );
    saveRoles(updatedRoles);
    setRoles(updatedRoles);
    setEditRole(null);
    toast({ title: "Role Updated", description: `${editRole.name} permissions have been saved.` });
  };

  const toggleMaster = (group: any) => {
    const newVal = !editPerms[group.masterKey];
    const updated = { ...editPerms, [group.masterKey]: newVal };
    if (newVal) {
      group.permissions.forEach((p: any) => {
        updated[p.key] = true;
      });
    }
    setEditPerms(updated);
  };

  const toggleSub = (key: string) => {
    setEditPerms((prev: any) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading font-semibold text-foreground flex items-center gap-2 text-xl">
          <ShieldCheck className="w-5 h-5 text-primary" /> Employee Access Roles
        </h2>
      </div>

      <div className="grid gap-3">
        {roles.map((role) => (
          <div key={role.name} className="flex items-center justify-between p-4 rounded-xl border bg-gradient-card">
            <div>
              <div className="font-bold text-foreground text-sm uppercase tracking-wide">{role.name}</div>
              <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                Status: <span className="text-success font-medium">{role.status}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setViewRole(role)}>
                <Eye className="w-3.5 h-3.5 mr-1" /> Show Permissions
              </Button>
              <Button variant="default" size="sm" className="bg-[#6366f1] hover:bg-[#4f46e5] text-white" onClick={() => handleEditClick(role)}>
                <Edit className="w-3.5 h-3.5 mr-1" /> Edit
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Show Permissions Modal */}
      <Dialog open={!!viewRole} onOpenChange={(open) => !open && setViewRole(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{viewRole?.name} - Permissions</DialogTitle>
            <DialogDescription>List of predefined permissions for this role.</DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex flex-wrap gap-2">
            {viewRole && Object.entries(viewRole.perms).filter(([_, v]) => v).map(([k]) => (
              <Badge key={k} variant="secondary" className="px-2 py-1 bg-primary/10 text-primary border-primary/20">
                {k.replace(/can_/g, "").replace(/_/g, " ")}
              </Badge>
            ))}
          </div>
          <div className="flex justify-end mt-4">
            <Button onClick={() => setViewRole(null)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Role Modal */}
      <Dialog open={!!editRole} onOpenChange={(open) => !open && setEditRole(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit {editRole?.name} Role</DialogTitle>
            <DialogDescription>Select the permissions this role should have.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {PERMISSION_GROUPS.map((group) => {
              const isMasterActive = !!editPerms[group.masterKey];
              return (
                <div key={group.title} className="rounded-xl border p-4">
                  <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleMaster(group)}>
                    <div className="flex items-center gap-2">
                      <group.icon className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold text-foreground">{group.title}</h3>
                    </div>
                    <Switch checked={isMasterActive} />
                  </div>
                  {isMasterActive && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-4 border-t">
                      {group.permissions.map((p) => (
                        <div key={p.key} className="flex items-center justify-between space-x-2 bg-secondary/20 p-2 rounded-md">
                          <Label className="text-sm cursor-pointer leading-tight" onClick={() => toggleSub(p.key)}>
                            {p.label}
                          </Label>
                          <Switch checked={!!editPerms[p.key]} onCheckedChange={() => toggleSub(p.key)} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setEditRole(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save Role</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

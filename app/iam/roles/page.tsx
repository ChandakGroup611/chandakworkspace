"use client";

import React, { useState, useEffect, useMemo } from "react";
import { AppCard } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { AppBadge } from "@/components/ui/AppBadge";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Shield, Plus, Save, Trash2, Copy, AlertCircle, Loader2 } from "lucide-react";
import { fetchRoles, fetchPermissions, fetchRolePermissions, createRole, updateRole, syncRolePermissions, deleteRole, fetchDepartments } from "@/lib/actions/iam";
import { toast } from "react-toastify";

export default function IAMRoleBuilder() {
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [selectedRolePerms, setSelectedRolePerms] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  
  const [isCreating, setIsCreating] = useState(false);
  const [newRoleForm, setNewRoleForm] = useState({ name: "", code: "", description: "", department_id: "" });

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [rData, pData, dData] = await Promise.all([
        fetchRoles(),
        fetchPermissions(),
        fetchDepartments()
      ]);
      setRoles(rData);
      setPermissions(pData);
      setDepartments(dData);
      if (rData.length > 0) {
        handleSelectRole(rData[0]);
      }
    } catch (err) {
      toast.error("Failed to load IAM data");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRole = async (role: any) => {
    setSelectedRole(role);
    setIsCreating(false);
    try {
      const perms = await fetchRolePermissions(role.id);
      setSelectedRolePerms(perms);
    } catch (err) {
      toast.error("Failed to load permissions for role");
    }
  };

  const handleCreateRole = async () => {
    if (!newRoleForm.name || !newRoleForm.code) {
      toast.error("Name and Code are required");
      return;
    }
    setSaving(true);
    try {
      const payload: any = { ...newRoleForm };
      if (!payload.department_id) delete payload.department_id;
      
      const role = await createRole(payload);
      toast.success("Role created successfully");
      const rData = await fetchRoles();
      setRoles(rData);
      handleSelectRole(role);
      setNewRoleForm({ name: "", code: "", description: "", department_id: "" });
    } catch (err: any) {
      toast.error(err.message || "Failed to create role");
    } finally {
      setSaving(false);
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    setSaving(true);
    try {
      await syncRolePermissions(selectedRole.id, selectedRolePerms);
      toast.success("Permissions updated successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to save permissions");
    } finally {
      setSaving(false);
    }
  };

  const togglePermission = (permId: string) => {
    setSelectedRolePerms(prev => 
      prev.includes(permId) ? prev.filter(p => p !== permId) : [...prev, permId]
    );
  };
  
  const toggleModulePermissions = (moduleId: string, modulePermIds: string[]) => {
    const allSelected = modulePermIds.every(id => selectedRolePerms.includes(id));
    if (allSelected) {
      setSelectedRolePerms(prev => prev.filter(p => !modulePermIds.includes(p)));
    } else {
      setSelectedRolePerms(prev => Array.from(new Set([...prev, ...modulePermIds])));
    }
  };

  const groupedPermissions = useMemo(() => {
    const groups: Record<string, any[]> = {};
    permissions.forEach(p => {
      const mod = p.module || "General";
      if (!groups[mod]) groups[mod] = [];
      groups[mod].push(p);
    });
    return groups;
  }, [permissions]);

  if (loading) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <PageContainer strict={true}>
      <PageHeader
        title="IAM Role Builder"
        description="Visually construct and manage role-based access control."
        badge={<AppBadge variant="info">Security & Governance</AppBadge>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-6 h-[calc(100vh-200px)]">
        {/* Left Sidebar: Roles List */}
        <div className="lg:col-span-1 border border-border bg-white dark:bg-[#0B0F19] rounded-2xl flex flex-col overflow-hidden shadow-sm">
          <div className="p-4 border-b border-border bg-gray-50 dark:bg-white/[0.02] flex items-center justify-between shrink-0">
            <h3 className="font-bold text-sm">Enterprise Roles</h3>
            <AppButton size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => { setIsCreating(true); setSelectedRole(null); }}>
              <Plus className="w-4 h-4" />
            </AppButton>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {roles.map(r => (
              <div 
                key={r.id}
                onClick={() => handleSelectRole(r)}
                className={`p-3 rounded-xl border cursor-pointer transition-colors ${
                  selectedRole?.id === r.id && !isCreating 
                    ? "border-accent bg-accent/5 dark:bg-accent/10 shadow-sm" 
                    : "border-transparent hover:bg-gray-50 dark:hover:bg-white/5"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-bold ${selectedRole?.id === r.id && !isCreating ? "text-accent" : "text-foreground"}`}>
                    {r.name}
                  </span>
                  {r.is_system && <AppBadge variant="warning" className="text-[9px] px-1.5 py-0">SYS</AppBadge>}
                </div>
                <div className="text-[10px] text-gray-500 font-mono mt-1">{r.code}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Area: Role Editor */}
        <div className="lg:col-span-3 border border-border bg-white dark:bg-[#0B0F19] rounded-2xl flex flex-col overflow-hidden shadow-sm relative">
          {isCreating ? (
            <div className="p-8 max-w-lg mx-auto w-full">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Shield className="w-6 h-6 text-accent" />
                Create New Role
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Role Name</label>
                  <AppInput value={newRoleForm.name} onChange={e => setNewRoleForm({...newRoleForm, name: e.target.value})} placeholder="e.g. Regional Manager" className="mt-1" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Role Code</label>
                  <AppInput value={newRoleForm.code} onChange={e => setNewRoleForm({...newRoleForm, code: e.target.value.toUpperCase().replace(/\s+/g, '_')})} placeholder="e.g. REGIONAL_MANAGER" className="mt-1 font-mono uppercase" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Department (Optional)</label>
                  <select 
                    className="w-full mt-1 p-2 border border-border rounded-md bg-transparent text-sm focus:ring-accent"
                    value={newRoleForm.department_id}
                    onChange={e => setNewRoleForm({...newRoleForm, department_id: e.target.value})}
                  >
                    <option value="">Any Department</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Description</label>
                  <textarea 
                    className="w-full mt-1 p-3 border border-border rounded-md bg-transparent text-sm min-h-[100px] focus:ring-accent focus:border-accent outline-none transition-colors"
                    value={newRoleForm.description}
                    onChange={e => setNewRoleForm({...newRoleForm, description: e.target.value})}
                    placeholder="Describe the responsibilities of this role..."
                  />
                </div>
                <div className="pt-4 flex gap-3">
                  <AppButton variant="primary" onClick={handleCreateRole} disabled={saving} leftIcon={saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Plus className="w-4 h-4" />}>
                    {saving ? "Creating..." : "Create Role"}
                  </AppButton>
                  <AppButton variant="outline" onClick={() => roles.length > 0 && handleSelectRole(roles[0])}>Cancel</AppButton>
                </div>
              </div>
            </div>
          ) : selectedRole ? (
            <>
              <div className="p-6 border-b border-border bg-gray-50 dark:bg-white/[0.02] flex items-center justify-between shrink-0">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold">{selectedRole.name}</h2>
                    {selectedRole.is_system && <AppBadge variant="warning">System Role</AppBadge>}
                  </div>
                  <p className="text-xs text-gray-500 font-mono mt-1">{selectedRole.code} • {selectedRole.department?.name || 'Global Scope'}</p>
                  {selectedRole.description && <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{selectedRole.description}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <AppButton variant="primary" onClick={handleSavePermissions} disabled={saving} leftIcon={saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}>
                    Save Permissions
                  </AppButton>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 dark:bg-transparent">
                <div className="grid gap-6">
                  {Object.entries(groupedPermissions).map(([module, perms]) => {
                    const modulePermIds = perms.map(p => p.id);
                    const allSelected = modulePermIds.every(id => selectedRolePerms.includes(id));
                    const someSelected = modulePermIds.some(id => selectedRolePerms.includes(id));
                    
                    return (
                      <AppCard key={module} className="overflow-hidden">
                        <div className="p-4 border-b border-border bg-gray-50/80 dark:bg-white/[0.02] flex items-center justify-between cursor-pointer" onClick={() => toggleModulePermissions(module, modulePermIds)}>
                          <div className="flex items-center gap-3">
                            <input 
                              type="checkbox" 
                              checked={allSelected} 
                              ref={input => { if (input) input.indeterminate = someSelected && !allSelected; }}
                              readOnly 
                              className="w-4 h-4 text-accent border-gray-300 rounded focus:ring-accent"
                            />
                            <h3 className="font-bold text-sm tracking-wide uppercase text-gray-700 dark:text-gray-300">{module}</h3>
                          </div>
                          <span className="text-xs font-medium text-gray-500 bg-white dark:bg-[#0B0F19] px-2 py-0.5 rounded shadow-sm border border-border">
                            {perms.filter(p => selectedRolePerms.includes(p.id)).length} / {perms.length}
                          </span>
                        </div>
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                          {perms.map(p => {
                            const isChecked = selectedRolePerms.includes(p.id);
                            return (
                              <div 
                                key={p.id} 
                                onClick={() => togglePermission(p.id)}
                                className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                                  isChecked 
                                    ? "bg-accent/5 border-accent/30 dark:bg-accent/10 dark:border-accent/40" 
                                    : "bg-white dark:bg-[#0B0F19] border-gray-200 dark:border-white/10 hover:border-accent/50"
                                }`}
                              >
                                <input 
                                  type="checkbox" 
                                  checked={isChecked} 
                                  readOnly 
                                  className="mt-1 shrink-0 w-4 h-4 text-accent border-gray-300 rounded focus:ring-accent"
                                />
                                <div>
                                  <div className={`text-sm font-semibold ${isChecked ? "text-accent dark:text-accent-secondary" : "text-gray-800 dark:text-gray-200"}`}>
                                    {p.name}
                                  </div>
                                  <div className="text-[10px] text-gray-500 font-mono mt-0.5">{p.code}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </AppCard>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              Select a role to configure permissions
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}

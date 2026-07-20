"use client";

import React, { useState, useEffect } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppCard, AppCardHeader, AppCardTitle, AppCardContent } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { AppBadge } from "@/components/ui/AppBadge";
import { AppTableContainer, AppTable, AppTableHeader, AppTableBody, AppTableRow, AppTableHead, AppTableCell } from "@/components/ui/AppTable";
import { createClient } from "@/utils/supabase/client";
import { Layers, Search, Plus, Edit, Trash2, X, RefreshCw } from "lucide-react";

export default function DepartmentsMasterPage() {
  const supabase = createClient();
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("departments")
        .select("*")
        .eq("is_deleted", false)
        .order("name");
      if (error) throw error;
      setDepartments(data || []);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditId(null);
    setFormName("");
    setFormCode("");
    setFormDesc("");
    setFormIsActive(true);
    setErrorMsg(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const handleOpenEdit = (dept: any) => {
    resetForm();
    setEditId(dept.id);
    setFormName(dept.name || "");
    setFormCode(dept.code || "");
    setFormDesc(dept.description || "");
    setFormIsActive(dept.is_active !== false);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCode.trim()) {
      setErrorMsg("Name and Code are required");
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    try {
      const payload = {
        name: formName.trim(),
        code: formCode.trim().toUpperCase(),
        description: formDesc.trim(),
        is_active: formIsActive
      };

      if (editId) {
        const { error } = await supabase.from("departments").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("departments").insert([payload]);
        if (error) throw error;
      }

      setShowModal(false);
      fetchDepartments();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save department.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this department?")) return;
    try {
      const { error } = await supabase.from("departments").update({ is_deleted: true }).eq("id", id);
      if (error) throw error;
      fetchDepartments();
    } catch (e: any) {
      alert("Error deleting department: " + e.message);
    }
  };

  const filtered = departments.filter(d => d.name?.toLowerCase().includes(searchQuery.toLowerCase()) || d.code?.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <PageContainer>
      <div className="flex flex-col h-full gap-6 px-4 md:px-8 py-6">
        <PageHeader 
          title="Departments" 
          description="Manage organizational departments and business units." 
          icon={<Layers className="h-6 w-6 text-accent" />}
        />

        <AppCard className="flex-1 flex flex-col overflow-hidden">
          <AppCardHeader className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 shrink-0">
            <AppCardTitle className="text-lg">Department Directory</AppCardTitle>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <AppInput 
                  placeholder="Search departments..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 w-full"
                />
              </div>
              <AppButton variant="outline" size="sm" onClick={fetchDepartments} className="h-10 px-3 hidden sm:flex">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </AppButton>
              <AppButton size="sm" className="h-10 shrink-0 shadow-md shadow-accent/20" onClick={handleOpenCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Add Department
              </AppButton>
            </div>
          </AppCardHeader>
          <AppCardContent className="flex-1 overflow-hidden p-0 relative">
            <AppTableContainer>
              <AppTable>
                <AppTableHeader>
                  <AppTableRow>
                    <AppTableHead>Code</AppTableHead>
                    <AppTableHead>Department Name</AppTableHead>
                    <AppTableHead>Description</AppTableHead>
                    <AppTableHead>Status</AppTableHead>
                    <AppTableHead className="w-[100px] text-right">Actions</AppTableHead>
                  </AppTableRow>
                </AppTableHeader>
                <AppTableBody>
                  {loading ? (
                    <AppTableRow>
                      <AppTableCell colSpan={5} className="h-40 text-center text-gray-500">
                        Loading departments...
                      </AppTableCell>
                    </AppTableRow>
                  ) : filtered.length === 0 ? (
                    <AppTableRow>
                      <AppTableCell colSpan={5} className="h-40 text-center text-gray-500">
                        No departments found.
                      </AppTableCell>
                    </AppTableRow>
                  ) : (
                    filtered.map(d => (
                      <AppTableRow key={d.id} className="hover:bg-accent/5 group">
                        <AppTableCell className="font-mono text-sm font-bold text-accent">{d.code}</AppTableCell>
                        <AppTableCell className="font-bold text-foreground">{d.name}</AppTableCell>
                        <AppTableCell className="text-muted text-sm">{d.description || '-'}</AppTableCell>
                        <AppTableCell>
                          <AppBadge variant={d.is_active ? "success" : "neutral"}>
                            {d.is_active ? "Active" : "Inactive"}
                          </AppBadge>
                        </AppTableCell>
                        <AppTableCell className="text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <AppButton variant="ghost" size="icon-sm" onClick={() => handleOpenEdit(d)} className="text-blue-600">
                              <Edit className="h-4 w-4" />
                            </AppButton>
                            <AppButton variant="ghost" size="icon-sm" onClick={() => handleDelete(d.id)} className="text-red-600">
                              <Trash2 className="h-4 w-4" />
                            </AppButton>
                          </div>
                        </AppTableCell>
                      </AppTableRow>
                    ))
                  )}
                </AppTableBody>
              </AppTable>
            </AppTableContainer>
          </AppCardContent>
        </AppCard>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 backdrop-blur-sm bg-black/40">
          <div className="bg-surface border border-border shadow-2xl rounded-2xl w-full max-w-lg flex flex-col animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
              <h2 className="text-xl font-black text-foreground">
                {editId ? "Edit Department" : "Add Department"}
              </h2>
              <AppButton variant="secondary" onClick={() => setShowModal(false)} className="p-2 rounded-full hover:bg-black/5 transition-colors">
                <X className="h-5 w-5 text-gray-500" />
              </AppButton>
            </div>

            <div className="p-6">
              <form id="deptForm" onSubmit={handleSave} className="space-y-6">
                {errorMsg && (
                  <div className="p-3 rounded-lg bg-red-50 text-red-600 border border-red-100 text-sm font-medium">
                    {errorMsg}
                  </div>
                )}

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Department Name <span className="text-red-500">*</span></label>
                    <AppInput value={formName} onChange={e => setFormName(e.target.value)} required placeholder="e.g. Human Resources" className="h-11" />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Department Code <span className="text-red-500">*</span></label>
                    <AppInput value={formCode} onChange={e => setFormCode(e.target.value)} required placeholder="e.g. HR" className="h-11 uppercase font-mono" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Description</label>
                    <textarea 
                      value={formDesc} 
                      onChange={e => setFormDesc(e.target.value)} 
                      placeholder="Brief description..." 
                      className="w-full h-24 p-3 rounded-xl text-sm transition-all focus:ring-2 outline-none bg-surface border-border text-foreground focus:border-accent focus:ring-accent/20 border resize-none"
                    />
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer mt-2">
                    <input type="checkbox" checked={formIsActive} onChange={e => setFormIsActive(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent" />
                    <span className="text-sm font-medium text-foreground">Active Department</span>
                  </label>
                </div>
              </form>
            </div>

            <div className="p-5 border-t border-border shrink-0 flex items-center justify-end gap-3 bg-gray-50/50 rounded-b-2xl">
              <AppButton type="button" variant="ghost" onClick={() => setShowModal(false)} className="h-10 px-6">
                Cancel
              </AppButton>
              <AppButton type="submit" form="deptForm" disabled={saving} className="h-10 px-8">
                {saving ? "Saving..." : "Save Department"}
              </AppButton>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

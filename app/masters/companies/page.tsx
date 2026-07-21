"use client";

import React, { useState, useEffect } from "react";
import { AppCard } from "@/components/ui/AppCard";
import { AppBadge } from "@/components/ui/AppBadge";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { AppTableContainer, AppTable, AppTableHeader, AppTableBody, AppTableRow, AppTableHead, AppTableCell } from "@/components/ui/AppTable";
import { useTheme } from "@/components/theme/ThemeProvider";
import { createClient } from "@/utils/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { Plus, Search, CheckCircle2, X, AlertTriangle, Building2, Trash2, Check, RefreshCw, Lock } from "lucide-react";

export default function CompanyMasterPage() {
  const supabase = createClient();
  const { theme } = useTheme();
  const { hasPermission, loading: permsLoading } = usePermissions();
  const isLightMode = ["light-neumorphic", "glassmorphism", "pure-white"].includes(theme);

  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modals and Alerts
  const [showModal, setShowModal] = useState(false);
  const [errorAlert, setErrorAlert] = useState<string | null>(null);
  const [successAlert, setSuccessAlert] = useState<string | null>(null);

  // Form State
  const [editId, setEditId] = useState<string | null>(null);
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formShortName, setFormShortName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formContact, setFormContact] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formRemarks, setFormRemarks] = useState("");
  
  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('company_master')
        .select('*')
        .eq('is_deleted', false)
        .order('company_name', { ascending: true });
        
      if (error) {
        console.error("Error fetching companies:", error);
      } else {
        const mappedData = data?.map(c => ({
          ...c,
          name: c.company_name,
          code: c.company_code
        })) || [];
        setCompanies(mappedData);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (successAlert || errorAlert) {
      const timer = setTimeout(() => {
        setSuccessAlert(null);
        setErrorAlert(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successAlert, errorAlert]);

  const openCreateModal = () => {
    setEditId(null);
    setFormCode("");
    setFormName("");
    setFormShortName("");
    setFormEmail("");
    setFormContact("");
    setFormAddress("");
    setFormRemarks("");
    setShowModal(true);
  };

  const openEditModal = (company: any) => {
    setEditId(company.id);
    setFormCode(company.company_code);
    setFormName(company.company_name);
    setFormShortName(company.short_name || "");
    setFormEmail(company.email || "");
    setFormContact(company.phone || "");
    setFormAddress(company.address || "");
    setFormRemarks(company.remarks || "");
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName) {
      setErrorAlert("Company Name is required.");
      return;
    }

    const payload: any = {
      company_name: formName.trim(),
      short_name: formShortName.trim(),
      email: formEmail.trim(),
      phone: formContact.trim(),
      address: formAddress.trim(),
      remarks: formRemarks.trim(),
    };

    try {
      if (editId) {
        const { error } = await supabase
          .from('company_master')
          .update(payload)
          .eq('id', editId);
        if (error) throw error;
        setSuccessAlert("Company successfully updated.");
      } else {
        const { error } = await supabase
          .from('company_master')
          .insert([payload]);
        if (error) throw error;
        setSuccessAlert("Company successfully created.");
      }
      setShowModal(false);
      fetchCompanies();
    } catch (err: any) {
      setErrorAlert(`Failed to save company: ${err.message}`);
    }
  };

  const toggleActive = async (company: any) => {
    try {
      const { error } = await supabase
        .from('company_master')
        .update({ is_active: !company.is_active })
        .eq('id', company.id);
      if (error) throw error;
      setSuccessAlert(`Company marked as ${!company.is_active ? 'Active' : 'Inactive'}.`);
      fetchCompanies();
    } catch (err: any) {
      setErrorAlert(err.message);
    }
  };

  const handleDelete = async (company: any) => {
    if (!confirm(`Are you sure you want to delete ${company.name}?`)) return;
    try {
      const { error } = await supabase
        .from('company_master')
        .update({ is_deleted: true, is_active: false })
        .eq('id', company.id);
      if (error) throw error;
      setSuccessAlert("Company deleted successfully.");
      fetchCompanies();
    } catch (err: any) {
      setErrorAlert(err.message);
    }
  };

  const filteredData = companies.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (permsLoading) {
    return (
      <div className={`h-screen flex flex-col items-center justify-center space-y-4 transition-colors duration-300 ${
        "bg-gray-50"
      }`}>
        <div className="animate-spin h-10 w-10 border-2 border-accent border-t-transparent rounded-full shadow-lg shadow-indigo-500/20" />
      </div>
    );
  }

  if (!hasPermission("COMPANIES_VIEW")) {
    return (
      <div className={`h-screen flex flex-col items-center justify-center space-y-4 transition-colors duration-300 ${
        "bg-gray-50"
      }`}>
        <div className="p-4 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400">
          <Lock className="h-10 w-10" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Access Denied</h2>
        <p className="text-xs text-gray-500">You do not have capabilities to view the Company Master.</p>
      </div>
    );
  }

  return (
    <div className={`h-screen overflow-y-auto flex flex-col font-sans p-6 space-y-6 ${
      "bg-gray-50"
    }`}>
      <div className="flex items-center justify-between pb-4 border-b border-white/5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Building2 className={`h-6 w-6 text-accent`} />
            <h1 className={`text-2xl font-bold tracking-tight ${"text-foreground"}`}>Company Master</h1>
            <AppBadge variant="info">Global Enterprise</AppBadge>
          </div>
          <p className="text-xs text-gray-500">Manage client engagements, sister organizations, and enterprise structures.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <AppButton 
            variant="outline" 
            size="sm" 
            leftIcon={<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />}
            onClick={fetchCompanies}
          >
            Refresh
          </AppButton>
          <AppButton variant="primary" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={openCreateModal}>
            Register Company
          </AppButton>
        </div>
      </div>

      {errorAlert && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> {errorAlert}
        </div>
      )}

      {successAlert && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> {successAlert}
        </div>
      )}

      <AppCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <AppInput 
              placeholder="Search by code or name..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <span className="text-xs text-gray-500 font-semibold">{filteredData.length} records found</span>
        </div>

        <div className="overflow-x-auto">
          <AppTableContainer><AppTable className="w-full text-left border-collapse">
            <AppTableHeader>
              <AppTableRow className={`border-b text-xs uppercase tracking-wider border-border text-muted`}>
                <AppTableHead className="pb-3 px-4 font-semibold">Code</AppTableHead>
                <AppTableHead className="pb-3 px-4 font-semibold">Company Name</AppTableHead>
                <AppTableHead className="pb-3 px-4 font-semibold">Contact</AppTableHead>
                <AppTableHead className="pb-3 px-4 font-semibold">Status</AppTableHead>
                <AppTableHead className="pb-3 px-4 font-semibold text-right">Actions</AppTableHead>
              </AppTableRow>
            </AppTableHeader>
            <AppTableBody>
              {filteredData.map(c => (
                <AppTableRow key={c.id} className={`border-b last:border-0 transition-colors ${
                  "border-border hover:bg-elevated"
                }`}>
                  <AppTableCell className="py-3 px-4 font-mono text-xs font-bold text-accent">{c.code}</AppTableCell>
                  <AppTableCell className="py-3 px-4">
                    <div className="flex flex-col">
                      <span className={`text-sm font-bold ${"text-foreground"}`}>{c.name}</span>
                      <span className="text-xs text-gray-500">{c.short_name}</span>
                    </div>
                  </AppTableCell>
                  <AppTableCell className="py-3 px-4 text-xs text-gray-400">
                    <div className="flex flex-col">
                      <span>{c.email}</span>
                      <span>{c.contact}</span>
                    </div>
                  </AppTableCell>
                  <AppTableCell className="py-3 px-4">
                    <AppBadge variant={c.is_active ? 'success' : 'neutral'}>
                      {c.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </AppBadge>
                  </AppTableCell>
                  <AppTableCell className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <AppButton variant="secondary" onClick={() => toggleActive(c)} className={`p-1.5 rounded-lg transition-colors ${c.is_active ? 'text-rose-400 hover:bg-rose-500/10' : 'text-emerald-400 hover:bg-emerald-500/10'}`}>
                        {c.is_active ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                      </AppButton>
                      <AppButton variant="secondary" onClick={() => openEditModal(c)} className="p-1.5 rounded-lg text-accent hover:bg-accent/10 transition-colors">
                        Edit
                      </AppButton>
                      <AppButton variant="secondary" onClick={() => handleDelete(c)} className="p-1.5 rounded-lg text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </AppButton>
                    </div>
                  </AppTableCell>
                </AppTableRow>
              ))}
              {filteredData.length === 0 && (
                <AppTableRow>
                  <AppTableCell colSpan={5} className="py-12 text-center text-sm text-gray-500">
                    No company records found. Ensure database migrations are synced.
                  </AppTableCell>
                </AppTableRow>
              )}
            </AppTableBody>
          </AppTable></AppTableContainer>
        </div>
      </AppCard>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start pt-24 pb-24 overflow-y-auto justify-center px-4 p-4 animate-in fade-in-50">
          <AppCard className="w-full max-w-xl p-6 shadow-2xl border-accent/20">
            <h2 className="text-xl font-bold text-foreground mb-4">{editId ? 'Edit' : 'Register'} Company</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-wider text-gray-400 font-bold">Company Code</label>
                  <AppInput disabled placeholder="[Auto-Generated]" value={editId ? formCode : "[Auto-Generated]"} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-wider text-gray-400 font-bold">Company Name *</label>
                  <AppInput required placeholder="Acme Corporation" value={formName} onChange={e => setFormName(e.target.value)} />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-wider text-gray-400 font-bold">Short Name</label>
                  <AppInput placeholder="Acme" value={formShortName} onChange={e => setFormShortName(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-wider text-gray-400 font-bold">Email Address</label>
                  <AppInput type="email" placeholder="contact@acme.com" value={formEmail} onChange={e => setFormEmail(e.target.value)} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wider text-gray-400 font-bold">Contact Number</label>
                <AppInput placeholder="+1 (555) 000-0000" value={formContact} onChange={e => setFormContact(e.target.value)} />
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wider text-gray-400 font-bold">Physical Address</label>
                <textarea 
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-accent focus:outline-none"
                  rows={2}
                  value={formAddress}
                  onChange={e => setFormAddress(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wider text-gray-400 font-bold">Remarks</label>
                <textarea 
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-accent focus:outline-none"
                  rows={2}
                  value={formRemarks}
                  onChange={e => setFormRemarks(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <AppButton variant="ghost" type="button" onClick={() => setShowModal(false)}>Cancel</AppButton>
                <AppButton variant="primary" type="submit">Save Company Record</AppButton>
              </div>
            </form>
          </AppCard>
        </div>
      )}
    </div>
  );
}


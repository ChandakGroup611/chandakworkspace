"use client";

import { useFlashHighlight } from "@/components/ui/record";
import { Eye as RecordEyeIcon, Pencil as RecordPencilIcon } from "lucide-react";
import React, { useState, useEffect } from "react";
import { AppCard } from "@/components/ui/AppCard";
import { AppBadge } from "@/components/ui/AppBadge";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { AppTableContainer, AppTable, AppTableHeader, AppTableBody, AppTableRow, AppTableHead, AppTableCell } from "@/components/ui/AppTable";
import { useTheme } from "@/components/theme/ThemeProvider";
import { createClient } from "@/utils/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { Save, Plus, Edit2, Trash2, MapPin, Globe, Phone, FileText, CheckCircle2, XCircle, Search, AlertTriangle, Building2, Check, RefreshCw, Lock, X, FileSpreadsheet } from "lucide-react";
import { saveMasterEntity, deleteMasterEntity } from "@/lib/actions/masters";
import { SystemMasterBulkImportModal, MasterTableConfig } from "@/components/masters/SystemMasterBulkImportModal";
import ChandakLoader from "@/components/ui/ChandakLoader";
import { confirmAction } from "@/components/ui/feedback/confirm";
import { AccessRestricted } from "@/components/errors/AccessRestricted";

const COMPANY_MASTER_CONFIG: MasterTableConfig[] = [
  {
    id: "company_master",
    table: "company_master",
    scopeId: null,
    label: "Company master",
    category: "ORGANIZATION",
    icon: Building2,
    desc: "Companies, subsidiaries & sister business entities",
    parentTable: null,
    parentKey: null,
    parentRequired: false
  }
];

export default function CompanyMasterPage() {
  const supabase = createClient();
  const { isLight: isLightMode } = useTheme();
  const { hasPermission, roleCode, loading: permsLoading } = usePermissions();

  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modals and Alerts
  const [showModal, setShowModal] = useState(false);
  // Record standard: View opens this same form read-only; Edit switches it on.
  const [viewOnly, setViewOnly] = useState(false);
  const [highlightId, flashHighlight] = useFlashHighlight();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
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
    setViewOnly(false);
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

  const handleOpenView = (rec: any) => {
    openEditModal(rec);
    setViewOnly(true);
  };

  const openEditModal = (company: any) => {
    setViewOnly(false);
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
      let res;
      if (editId) {
        res = await saveMasterEntity('company_master', payload, editId);
        if (!res.success) throw new Error(res.error);
        setSuccessAlert("Company successfully updated.");
      } else {
        res = await saveMasterEntity('company_master', payload);
        if (!res.success) throw new Error(res.error);
        setSuccessAlert("Company successfully created.");
      }
      if (editId) flashHighlight(editId);
      setShowModal(false);
      fetchCompanies();
    } catch (err: any) {
      setErrorAlert(`Failed to save company: ${err.message}`);
    }
  };

  const toggleActive = async (company: any) => {
    try {
      const res = await saveMasterEntity('company_master', { is_active: !company.is_active }, company.id);
      if (!res.success) throw new Error(res.error);
      setSuccessAlert(`Company marked as ${!company.is_active ? 'Active' : 'Inactive'}.`);
      fetchCompanies();
    } catch (err: any) {
      setErrorAlert(err.message);
    }
  };

  const handleDelete = async (company: any) => {
    if (!(await confirmAction(`Are you sure you want to delete ${company.name}?`))) return;
    try {
      const res = await saveMasterEntity('company_master', { is_deleted: true, is_active: false }, company.id);
      if (!res.success) throw new Error(res.error);
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
      <div className="h-screen flex items-center justify-center bg-surface">
        <ChandakLoader
          size="lg"
          title="Loading company architecture…"
          subtitle="Fetching enterprise entities & subsidiary records"
        />
      </div>
    );
  }

  if (!hasPermission("COMPANIES_VIEW") && !hasPermission("MASTERS_VIEW") && !hasPermission("SYSTEM_MASTERS_VIEW") && !hasPermission("MASTERS_MANAGE") && roleCode !== "SUPER_ADMIN") {
    return (
      <AccessRestricted
        requiredRole="Company Admin"
        requiredPermission="COMPANIES_VIEW"
        moduleName="Company Masters"
      />
    );
  }

  return (
    <div className={`h-screen overflow-y-auto flex flex-col font-sans p-6 space-y-6 ${
      "bg-surface"
    }`}>
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Building2 className={`h-6 w-6 text-accent-soft-text`} />
            <h1 className={`text-[20px] sm:text-[22px] font-semibold tracking-[-0.01em] text-heading ${""}`}>Company master</h1>
            <AppBadge variant="info">Global enterprise</AppBadge>
          </div>
          <p className="text-xs text-muted">Manage client engagements, sister organisations, and enterprise structures.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <AppButton 
            variant="outline" 
            size="sm" 
            leftIcon={<FileSpreadsheet className="h-4 w-4 text-success-text" />}
            onClick={() => setIsImportModalOpen(true)}
          >
            Import Excel
          </AppButton>
          <AppButton 
            variant="outline" 
            size="sm" 
            leftIcon={<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />}
            onClick={fetchCompanies}
          >
            Refresh
          </AppButton>
          <AppButton variant="primary" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={openCreateModal}>
            Register company
          </AppButton>
        </div>
      </div>

      {errorAlert && (
        <div className="p-4 rounded-lg bg-danger-soft border border-danger-border text-danger-text text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> {errorAlert}
        </div>
      )}

      {successAlert && (
        <div className="p-4 rounded-lg bg-success-soft border border-success-border text-success-text text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> {successAlert}
        </div>
      )}

      <AppCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <AppInput 
              placeholder="Search by code or name…" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <span className="text-xs text-muted font-semibold">{filteredData.length} records found</span>
        </div>

        <div className="overflow-x-auto">
          <AppTableContainer><AppTable className="w-full text-left border-collapse">
            <AppTableHeader>
              <AppTableRow className={`border-b text-xs border-border text-muted`}>
                <AppTableHead className="pb-3 px-4 font-semibold">Code</AppTableHead>
                <AppTableHead className="pb-3 px-4 font-semibold">Company name</AppTableHead>
                <AppTableHead className="pb-3 px-4 font-semibold">Contact</AppTableHead>
                <AppTableHead className="pb-3 px-4 font-semibold">Status</AppTableHead>
                <AppTableHead className="pb-3 px-4 font-semibold text-right">Actions</AppTableHead>
              </AppTableRow>
            </AppTableHeader>
            <AppTableBody>
              {filteredData.map(c => (
                <AppTableRow key={c.id} className={`border-b last:border-0 transition-colors ${
                  "border-border hover:bg-elevated"
                }`} data-record-id={c.id} data-highlight={highlightId === c.id || undefined} onClick={() => handleOpenView(c)}>
                  <AppTableCell className="py-3 px-4 font-mono text-xs font-semibold text-accent-soft-text">{c.code}</AppTableCell>
                  <AppTableCell className="py-3 px-4">
                    <div className="flex flex-col">
                      <span className={`text-sm font-semibold ${"text-foreground"}`}>{c.name}</span>
                      <span className="text-xs text-muted">{c.short_name}</span>
                    </div>
                  </AppTableCell>
                  <AppTableCell className="py-3 px-4 text-xs text-muted">
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
                    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      <AppButton variant="secondary" onClick={() => toggleActive(c)} className={`p-1.5 rounded-lg transition-colors ${c.is_active ? 'text-danger-text hover:bg-danger-soft' : 'text-success-text hover:bg-success-soft'}`}>
                        {c.is_active ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                      </AppButton>
                      <AppButton aria-label="View" title="View" variant="ghost" size="icon-sm" onClick={() => handleOpenView(c)} className="text-muted hover:text-foreground">
                              <RecordEyeIcon className="h-4 w-4" />
                            </AppButton>
                            <AppButton variant="secondary" onClick={() => openEditModal(c)} className="p-1.5 rounded-lg text-accent-soft-text hover:bg-accent-soft transition-colors">
                        Edit
                      </AppButton>
                      <AppButton aria-label="Delete" variant="secondary" onClick={() => handleDelete(c)} className="p-1.5 rounded-lg text-muted hover:text-danger-text hover:bg-danger-soft transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </AppButton>
                    </div>
                  </AppTableCell>
                </AppTableRow>
              ))}
              {filteredData.length === 0 && (
                <AppTableRow>
                  <AppTableCell colSpan={5} className="py-12 text-center text-sm text-muted">
                    No company records found. Ensure database migrations are synced.
                  </AppTableCell>
                </AppTableRow>
              )}
            </AppTableBody>
          </AppTable></AppTableContainer>
        </div>
      </AppCard>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-surface/60 flex items-start pt-24 pb-24 overflow-y-auto justify-center px-4 p-4 animate-in fade-in-50">
          <AppCard className="w-full max-w-xl p-6 shadow-lg border-border-active">
            <h2 className="text-xl font-semibold text-foreground mb-4">{viewOnly ? "Company details" : `${editId ? 'Edit' : 'Register'} Company`}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <fieldset disabled={viewOnly} className={viewOnly ? "record-readonly contents" : "contents"}>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm text-muted font-semibold">Company code</label>
                  <AppInput disabled placeholder="[Auto-Generated]" value={editId ? formCode : "[Auto-Generated]"} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted font-semibold">Company name *</label>
                  <AppInput required placeholder="Acme corporation" value={formName} onChange={e => setFormName(e.target.value)} />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm text-muted font-semibold">Short name</label>
                  <AppInput placeholder="Acme" value={formShortName} onChange={e => setFormShortName(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted font-semibold">Email address</label>
                  <AppInput type="email" placeholder="contact@acme.com" value={formEmail} onChange={e => setFormEmail(e.target.value)} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm text-muted font-semibold">Contact number</label>
                <AppInput placeholder="+1 (555) 000-0000" value={formContact} onChange={e => setFormContact(e.target.value)} />
              </div>

              <div className="space-y-1">
                <label className="text-sm text-muted font-semibold">Physical address</label>
                <textarea 
                  className="w-full bg-surface border border-border dark:border-border rounded-lg p-3 text-sm text-foreground focus:border-primary focus:outline-none"
                  rows={2}
                  value={formAddress}
                  onChange={e => setFormAddress(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm text-muted font-semibold">Remarks</label>
                <textarea 
                  className="w-full bg-surface border border-border dark:border-border rounded-lg p-3 text-sm text-foreground focus:border-primary focus:outline-none"
                  rows={2}
                  value={formRemarks}
                  onChange={e => setFormRemarks(e.target.value)}
                />
              </div>

              </fieldset>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <AppButton variant="outline" type="button" onClick={() => setShowModal(false)} className="text-danger-text border-danger-border hover:bg-danger-soft hover:border-danger hover:text-danger-text">{viewOnly ? "Close" : "Discard"}</AppButton>
                {viewOnly ? (
                <AppButton type="button" variant="primary" onClick={() => setViewOnly(false)} leftIcon={<RecordPencilIcon className="h-4 w-4" />}>Edit</AppButton>
              ) : (
              <AppButton variant="primary" type="submit">Save company record</AppButton>
              )}
              </div>
            </form>
          </AppCard>
        </div>
      )}

      {/* Bulk Excel Import Modal */}
      <SystemMasterBulkImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        masterTables={COMPANY_MASTER_CONFIG}
        initialTabId="company_master"
        existingRecords={companies}
        onSuccess={fetchCompanies}
      />
    </div>
  );
}


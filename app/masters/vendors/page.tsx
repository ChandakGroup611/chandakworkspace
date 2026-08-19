import { toast } from 'react-toastify';
"use client";

import React, { useState, useEffect } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppCard, AppCardHeader, AppCardTitle, AppCardContent } from "@/components/ui/AppCard";
import { saveMasterEntity, deleteMasterEntity } from "@/lib/actions/masters";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { AppBadge } from "@/components/ui/AppBadge";
import { AppTableContainer, AppTable, AppTableHeader, AppTableBody, AppTableRow, AppTableHead, AppTableCell } from "@/components/ui/AppTable";
import { createClient } from "@/utils/supabase/client";
import { Building2, Search, Plus, Edit, Trash2, X, RefreshCw, FileText, Briefcase, Landmark, Settings, Check } from "lucide-react";
import { CityManagerModal } from "@/components/shared/CityManagerModal";
import { FormMultiSelect } from "@/components/ui/FormMultiSelect";
import { MasterOptionsManager } from "@/components/shared/MasterOptionsManager";

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", 
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", 
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", 
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", 
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

export default function VendorMasterPage() {
  const supabase = createClient();
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [cityOptions, setCityOptions] = useState<any[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [bankCityOptions, setBankCityOptions] = useState<any[]>([]);
  const [loadingBankCities, setLoadingBankCities] = useState(false);

  const [showCityManager, setShowCityManager] = useState(false);
  const [managingStateName, setManagingStateName] = useState("");

  // Form State
  const [formName, setFormName] = useState("");
  const [formWebsite, setFormWebsite] = useState("");
  const [formContactName, setFormContactName] = useState("");
  const [formContactEmail, setFormContactEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const [formAddr1, setFormAddr1] = useState("");
  const [formAddr2, setFormAddr2] = useState("");
  const [formCity, setFormCity] = useState("");
  const [formState, setFormState] = useState("");
  const [formPincode, setFormPincode] = useState("");

  const [formTaxGstin, setFormTaxGstin] = useState("");
  const [formTaxPan, setFormTaxPan] = useState("");
  const [formTaxCode, setFormTaxCode] = useState("");

  const [formBankName, setFormBankName] = useState("");
  const [formBankAcctName, setFormBankAcctName] = useState("");
  const [formBankAcctNo, setFormBankAcctNo] = useState("");
  const [formBankIfsc, setFormBankIfsc] = useState("");
  const [formBankBranch, setFormBankBranch] = useState("");
  const [formBankState, setFormBankState] = useState("");
  const [formBankCity, setFormBankCity] = useState("");

  const [formIndustryType, setFormIndustryType] = useState<string[]>([]);
  const [formVendorType, setFormVendorType] = useState<string[]>([]);
  
  const [masterIndustryTypes, setMasterIndustryTypes] = useState<any[]>([]);
  const [masterVendorTypes, setMasterVendorTypes] = useState<any[]>([]);

  const [manageModalType, setManageModalType] = useState<"industry" | "vendor" | null>(null);

  useEffect(() => {
    fetchVendors();
    fetchDependencies();
  }, []);

  const fetchDependencies = async () => {
    try {
      const [indRes, venRes] = await Promise.all([
        supabase.from("master_industry_types").select("*").eq("is_active", true).order("name"),
        supabase.from("master_vendor_types").select("*").eq("is_active", true).order("name")
      ]);
      if (indRes.data) setMasterIndustryTypes(indRes.data);
      if (venRes.data) setMasterVendorTypes(venRes.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (formState) {
      fetchCitiesForState(formState);
    } else {
      setCityOptions([]);
    }
  }, [formState]);

  const fetchCitiesForState = async (stateName: string) => {
    setLoadingCities(true);
    try {
      const { data, error } = await supabase
        .from("master_cities")
        .select("city_name")
        .eq("state_name", stateName)
        .eq("is_active", true)
        .order("city_name");
      if (error) throw error;
      setCityOptions(data || []);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoadingCities(false);
    }
  };

  const handleAddNewCity = async () => {
    if (!formState) {
      toast.warning("Please select a State first.");
      return;
    }
    const newCity = prompt(`Enter new city name for ${formState}:`);
    if (!newCity || !newCity.trim()) return;

    try {
      const res = await saveMasterEntity("master_cities", { state_name: formState, city_name: newCity.trim() });
      if (!res.success && res.error && !res.error.includes("duplicate key")) throw new Error(res.error);
      
      setFormCity(newCity.trim());
      await fetchCitiesForState(formState);
    } catch (e: any) {
      toast.error("Error adding city: " + e.message);
    }
  };

  useEffect(() => {
    if (formBankState) {
      fetchBankCitiesForState(formBankState);
    } else {
      setBankCityOptions([]);
    }
  }, [formBankState]);

  const fetchBankCitiesForState = async (stateName: string) => {
    setLoadingBankCities(true);
    try {
      const { data, error } = await supabase
        .from("master_cities")
        .select("city_name")
        .eq("state_name", stateName)
        .eq("is_active", true)
        .order("city_name");
      if (error) throw error;
      setBankCityOptions(data || []);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoadingBankCities(false);
    }
  };

  const handleAddNewBankCity = async () => {
    if (!formBankState) {
      toast.warning("Please select a Bank State first.");
      return;
    }
    const newCity = prompt(`Enter new city name for ${formBankState}:`);
    if (!newCity || !newCity.trim()) return;

    try {
      const res = await saveMasterEntity("master_cities", { state_name: formBankState, city_name: newCity.trim() });
      if (!res.success && res.error && !res.error.includes("duplicate key")) throw new Error(res.error);
      
      setFormBankCity(newCity.trim());
      await fetchBankCitiesForState(formBankState);
    } catch (e: any) {
      toast.error("Error adding bank city: " + e.message);
    }
  };

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("vendor_master").select("*").order("name");
      if (error) throw error;
      setVendors(data || []);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditId(null);
    setFormName("");
    setFormWebsite("");
    setFormContactName("");
    setFormContactEmail("");
    setFormPhone("");
    setFormNotes("");
    setFormAddr1("");
    setFormAddr2("");
    setFormCity("");
    setFormState("");
    setFormPincode("");
    setFormTaxGstin("");
    setFormTaxPan("");
    setFormTaxCode("");
    setFormBankName("");
    setFormBankAcctName("");
    setFormBankAcctNo("");
    setFormBankIfsc("");
    setFormBankBranch("");
    setFormBankState("");
    setFormBankCity("");
    setFormIndustryType([]);
    setFormVendorType([]);
    setErrorMsg(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const handleOpenEdit = (vendor: any) => {
    resetForm();
    setEditId(vendor.id);
    setFormName(vendor.name || "");
    setFormWebsite(vendor.website || "");
    setFormContactName(vendor.contact_name || "");
    setFormContactEmail(vendor.contact_email || "");
    setFormPhone(vendor.phone || "");
    setFormNotes(vendor.notes || "");

    setFormAddr1(vendor.address_line1 || "");
    setFormAddr2(vendor.address_line2 || "");
    setFormCity(vendor.city || "");
    setFormState(vendor.state || "");
    setFormPincode(vendor.pincode || "");

    setFormTaxGstin(vendor.tax_gstin || "");
    setFormTaxPan(vendor.tax_pan || "");
    setFormTaxCode(vendor.tax_code || "");

    setFormBankName(vendor.bank_name || "");
    setFormBankAcctName(vendor.bank_account_name || "");
    setFormBankAcctNo(vendor.bank_account_number || "");
    setFormBankIfsc(vendor.bank_ifsc || "");
    setFormBankBranch(vendor.bank_branch || "");
    setFormBankState(vendor.bank_state || "");
    setFormBankCity(vendor.bank_city || "");
    
    setFormIndustryType(vendor.industry_type ? vendor.industry_type.split(",").map((s: string) => s.trim()) : []);
    setFormVendorType(vendor.vendor_type ? vendor.vendor_type.split(",").map((s: string) => s.trim()) : []);

    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setErrorMsg("Vendor name is required");
      return;
    }
    if (!formContactName.trim()) {
      setErrorMsg("Contact Person Name is required");
      return;
    }
    if (!formContactEmail.trim()) {
      setErrorMsg("Contact Email is required");
      return;
    }
    if (!formPhone.trim()) {
      setErrorMsg("Phone Number is required");
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    try {
      const payload = {
        name: formName.trim(),
        website: formWebsite.trim(),
        contact_name: formContactName.trim(),
        contact_email: formContactEmail.trim(),
        phone: formPhone.trim(),
        notes: formNotes.trim(),
        address_line1: formAddr1.trim(),
        address_line2: formAddr2.trim(),
        city: formCity.trim(),
        state: formState.trim(),
        pincode: formPincode.trim(),
        tax_gstin: formTaxGstin.trim(),
        tax_pan: formTaxPan.trim(),
        tax_code: formTaxCode.trim(),
        bank_name: formBankName.trim(),
        bank_account_name: formBankAcctName.trim(),
        bank_account_number: formBankAcctNo.trim(),
        bank_ifsc: formBankIfsc.trim(),
        bank_branch: formBankBranch.trim(),
        bank_state: formBankState.trim(),
        bank_city: formBankCity.trim(),
        industry_type: formIndustryType.length > 0 ? formIndustryType.join(", ") : null,
        vendor_type: formVendorType.length > 0 ? formVendorType.join(", ") : null
      };

      let res;
      if (editId) {
        res = await saveMasterEntity("vendor_master", payload, editId);
      } else {
        res = await saveMasterEntity("vendor_master", payload);
      }
      if (!res.success) throw new Error(res.error);

      setShowModal(false);
      fetchVendors();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save vendor.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this vendor? This cannot be undone.")) return;
    try {
      const res = await deleteMasterEntity("vendor_master", id, true);
      if (!res.success) throw new Error(res.error);
      fetchVendors();
    } catch (e: any) {
      toast.error("Error deleting vendor: " + e.message);
    }
  };

  const filtered = vendors.filter(v => v.name?.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <PageContainer>
      <div className="flex flex-col h-full gap-6 px-4 md:px-8 py-6">
        <PageHeader 
          title="Provider / Vendor Master" 
          description="Manage software providers, OEMs, and general vendors across the organization." 
          icon={<Building2 className="h-6 w-6 text-theme-icon" />}
        />

        <AppCard className="flex-1 flex flex-col overflow-hidden">
          <AppCardHeader className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 shrink-0">
            <AppCardTitle className="text-lg">Vendor Directory</AppCardTitle>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                <AppInput 
                  placeholder="Search vendors..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 w-full"
                />
              </div>
              <AppButton variant="outline" size="sm" onClick={fetchVendors} className="h-10 px-3 hidden sm:flex">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </AppButton>
              <AppButton size="sm" className="h-10 shrink-0 shadow-md shadow-theme-btn-primary/20" onClick={handleOpenCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Add Vendor
              </AppButton>
            </div>
          </AppCardHeader>
          <AppCardContent className="flex-1 overflow-hidden p-0 relative">
            <AppTableContainer>
              <AppTable>
                <AppTableHeader>
                  <AppTableRow>
                    <AppTableHead>Vendor Name</AppTableHead>
                    <AppTableHead>Contact Person</AppTableHead>
                    <AppTableHead>Contact Info</AppTableHead>
                    <AppTableHead>GSTIN / Tax</AppTableHead>
                    <AppTableHead>City</AppTableHead>
                    <AppTableHead className="w-[100px] text-right">Actions</AppTableHead>
                  </AppTableRow>
                </AppTableHeader>
                <AppTableBody>
                  {loading ? (
                    <AppTableRow>
                      <AppTableCell colSpan={6} className="h-40 text-center text-muted">
                        Loading vendors...
                      </AppTableCell>
                    </AppTableRow>
                  ) : filtered.length === 0 ? (
                    <AppTableRow>
                      <AppTableCell colSpan={6} className="h-40 text-center text-muted">
                        No vendors found.
                      </AppTableCell>
                    </AppTableRow>
                  ) : (
                    filtered.map(v => (
                      <AppTableRow key={v.id} className="hover:bg-theme-btn-primary/5 group">
                        <AppTableCell className="font-bold text-foreground">{v.name}</AppTableCell>
                        <AppTableCell>{v.contact_name || '-'}</AppTableCell>
                        <AppTableCell>
                          <div className="text-xs">
                            {v.contact_email && <div>{v.contact_email}</div>}
                            {v.phone && <div className="text-muted">{v.phone}</div>}
                          </div>
                        </AppTableCell>
                        <AppTableCell>
                          {v.tax_gstin ? <AppBadge variant="neutral" className="text-[10px]">{v.tax_gstin}</AppBadge> : '-'}
                        </AppTableCell>
                        <AppTableCell>{v.city || '-'}</AppTableCell>
                        <AppTableCell className="text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <AppButton variant="secondary" onClick={() => handleOpenEdit(v)} className="p-1.5 rounded bg-blue-50 text-accent hover:bg-blue-100 transition-colors">
                              <Edit className="h-4 w-4" />
                            </AppButton>
                            <AppButton variant="secondary" onClick={() => handleDelete(v.id)} className="p-1.5 rounded bg-red-50 text-danger hover:bg-red-100 transition-colors">
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 backdrop-blur-sm bg-surface/40">
          <div className="bg-surface border border-border shadow-2xl rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
              <h2 className="text-xl font-black text-foreground">
                {editId ? "Edit Vendor Profile" : "Add New Vendor"}
              </h2>
              <AppButton variant="secondary" onClick={() => setShowModal(false)} className="p-2 rounded-full hover:bg-surface/5 transition-colors">
                <X className="h-5 w-5 text-muted" />
              </AppButton>
            </div>

            <div className="flex-1 overflow-y-auto">
              <form id="vendorForm" onSubmit={handleSave} className="p-6 md:p-8 space-y-10">
                {errorMsg && (
                  <div className="p-4 rounded-xl bg-red-50 text-danger border border-red-100 text-sm font-semibold">
                    {errorMsg}
                  </div>
                )}

                {/* Section 1: General Info */}
                <div className="space-y-6">
                  <h4 className="text-sm font-bold text-theme-icon flex items-center gap-2 border-b border-border pb-2">
                    <Briefcase className="h-4 w-4" /> General & Contact Details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-bold text-muted uppercase">Vendor / Company Name <span className="text-danger">*</span></label>
                      <AppInput value={formName} onChange={e => setFormName(e.target.value)} required placeholder="e.g. Microsoft Corporation" className="h-11 font-semibold" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-muted uppercase">Industry Type (Multi-Select)</label>
                      <div className="flex gap-2">
                        <FormMultiSelect 
                          options={masterIndustryTypes.map(i => ({ value: i.name, label: i.name }))}
                          selectedValues={formIndustryType}
                          onChange={(vals) => {
                            setFormIndustryType(vals);
                            // Only clear vendor types if they don't match the new industries
                            const validIndustryNames = new Set(vals);
                            const validVendorTypes = masterVendorTypes
                              .filter(v => validIndustryNames.has(v.industry_name))
                              .map(v => v.name);
                            setFormVendorType(formVendorType.filter(vt => validVendorTypes.includes(vt)));
                          }}
                          placeholder="Select Industries..."
                          className="flex-1"
                        />
                        <AppButton type="button" variant="outline" onClick={async () => {
                          const newInd = prompt("Enter new Industry Type:");
                          if (newInd && newInd.trim()) {
                            await saveMasterEntity("master_industry_types", { name: newInd.trim() });
                            await fetchDependencies();
                            setFormIndustryType([...formIndustryType, newInd.trim()]);
                          }
                        }} className="h-11 w-11 px-0 shrink-0" title="Add New Industry">
                          <Plus className="h-4 w-4" />
                        </AppButton>
                        <AppButton type="button" variant="outline" onClick={() => setManageModalType("industry")} className="h-11 w-11 px-0 shrink-0 text-muted" title="Manage Industry Types">
                          <Settings className="h-4 w-4" />
                        </AppButton>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-muted uppercase">Vendor Type (Multi-Select)</label>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <FormMultiSelect 
                            options={masterVendorTypes
                              .filter(v => formIndustryType.length === 0 || formIndustryType.includes(v.industry_name))
                              .map(v => ({ value: v.name, label: `${v.name} (${v.industry_name})` }))}
                            selectedValues={formVendorType}
                            onChange={setFormVendorType}
                            placeholder={formIndustryType.length > 0 ? "Select Vendor Types..." : "Select Industry First"}
                            disabled={formIndustryType.length === 0}
                          />
                        </div>
                        {formIndustryType.length > 0 && (
                          <AppButton type="button" variant="outline" onClick={async () => {
                            let targetIndustry = formIndustryType[0];
                            if (formIndustryType.length > 1) {
                               const choice = prompt(`Which industry does this new Vendor Type belong to?\nAvailable: ${formIndustryType.join(", ")}`);
                               if (!choice || !formIndustryType.includes(choice.trim())) {
                                 toast.error("Invalid industry selected. Creation cancelled.");
                                 return;
                               }
                               targetIndustry = choice.trim();
                            }
                            const newVen = prompt(`Enter new Vendor Type for ${targetIndustry}:`);
                            if (newVen && newVen.trim()) {
                              await saveMasterEntity("master_vendor_types", { name: newVen.trim(), industry_name: targetIndustry });
                              await fetchDependencies();
                              setFormVendorType([...formVendorType, newVen.trim()]);
                            }
                          }} className="h-11 w-11 px-0 shrink-0" title="Add New Vendor Type">
                            <Plus className="h-4 w-4" />
                          </AppButton>
                        )}
                        <AppButton type="button" variant="outline" onClick={() => setManageModalType("vendor")} className="h-11 w-11 px-0 shrink-0 text-muted" title="Manage Vendor Types">
                          <Settings className="h-4 w-4" />
                        </AppButton>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-muted uppercase">Contact Person Name <span className="text-danger">*</span></label>
                      <AppInput value={formContactName} onChange={e => setFormContactName(e.target.value)} required placeholder="John Doe" className="h-11" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-muted uppercase">Contact Email <span className="text-danger">*</span></label>
                      <AppInput type="email" value={formContactEmail} onChange={e => setFormContactEmail(e.target.value)} required placeholder="john@example.com" className="h-11" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-muted uppercase">Phone Number <span className="text-danger">*</span></label>
                      <AppInput value={formPhone} onChange={e => setFormPhone(e.target.value)} required placeholder="+91 ..." className="h-11" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-muted uppercase">Website</label>
                      <AppInput value={formWebsite} onChange={e => setFormWebsite(e.target.value)} placeholder="https://..." className="h-11" />
                    </div>
                  </div>
                </div>

                {/* Section 2: Address */}
                <div className="space-y-6">
                  <h4 className="text-sm font-bold text-theme-icon flex items-center gap-2 border-b border-border pb-2">
                    <Building2 className="h-4 w-4" /> Registered Address
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-bold text-muted uppercase">Address Line 1</label>
                      <AppInput value={formAddr1} onChange={e => setFormAddr1(e.target.value)} placeholder="Suite, Building" className="h-11" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-bold text-muted uppercase">Address Line 2</label>
                      <AppInput value={formAddr2} onChange={e => setFormAddr2(e.target.value)} placeholder="Street, Area" className="h-11" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-muted uppercase">State</label>
                      <select 
                        value={formState} 
                        onChange={e => {
                          setFormState(e.target.value);
                          setFormCity(""); // reset city when state changes
                        }} 
                        className="w-full h-11 px-4 rounded-xl text-sm transition-all focus:ring-2 outline-none bg-surface border-border text-foreground focus:border-theme-btn-primary focus:ring-theme-btn-primary/20 border"
                      >
                        <option value="">-- Select State --</option>
                        {INDIAN_STATES.map(st => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-muted uppercase">City</label>
                      <div className="flex gap-2">
                        <select 
                          value={formCity} 
                          onChange={e => setFormCity(e.target.value)} 
                          className="flex-1 h-11 px-4 rounded-xl text-sm transition-all focus:ring-2 outline-none bg-surface border-border text-foreground focus:border-theme-btn-primary focus:ring-theme-btn-primary/20 border"
                          disabled={!formState || loadingCities}
                        >
                          <option value="">-- Select City --</option>
                          {cityOptions.map(c => (
                            <option key={c.city_name} value={c.city_name}>{c.city_name}</option>
                          ))}
                          {formCity && !cityOptions.find(c => c.city_name === formCity) && (
                            <option value={formCity}>{formCity}</option>
                          )}
                        </select>
                        <AppButton type="button" variant="outline" onClick={handleAddNewCity} className="h-11 w-11 px-0 shrink-0" title="Add New City">
                          <Plus className="h-4 w-4" />
                        </AppButton>
                        <AppButton type="button" variant="outline" onClick={() => { setManagingStateName(formState); setShowCityManager(true); }} className="h-11 w-11 px-0 shrink-0 text-muted" disabled={!formState} title="Manage Cities">
                          <Settings className="h-4 w-4" />
                        </AppButton>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-muted uppercase">Pincode / Zip</label>
                      <AppInput value={formPincode} onChange={e => setFormPincode(e.target.value)} placeholder="Postal Code" className="h-11" />
                    </div>
                  </div>
                </div>

                {/* Section 3: Taxation & Bank */}
                <div className="space-y-8">
                  <div className="space-y-6">
                    <h4 className="text-sm font-bold text-theme-icon flex items-center gap-2 border-b border-border pb-2">
                      <FileText className="h-4 w-4" /> Financial & Taxation
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-muted uppercase">GSTIN Number</label>
                        <AppInput value={formTaxGstin} onChange={e => setFormTaxGstin(e.target.value)} placeholder="22AAAAA0000A1Z5" className="h-11 uppercase" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-muted uppercase">PAN Number</label>
                        <AppInput value={formTaxPan} onChange={e => setFormTaxPan(e.target.value)} placeholder="ABCDE1234F" className="h-11 uppercase" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-muted uppercase">Other Tax Code (MSME/LUT)</label>
                        <AppInput value={formTaxCode} onChange={e => setFormTaxCode(e.target.value)} placeholder="Tax Code" className="h-11" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h4 className="text-sm font-bold text-theme-icon flex items-center gap-2 border-b border-border pb-2">
                      <Landmark className="h-4 w-4" /> Bank Account Details
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-muted uppercase">Bank Name</label>
                        <AppInput value={formBankName} onChange={e => setFormBankName(e.target.value)} placeholder="HDFC Bank" className="h-11" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-muted uppercase">Account Name</label>
                        <AppInput value={formBankAcctName} onChange={e => setFormBankAcctName(e.target.value)} placeholder="Beneficiary Name" className="h-11" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-muted uppercase">Account Number</label>
                        <AppInput value={formBankAcctNo} onChange={e => setFormBankAcctNo(e.target.value)} placeholder="00000000000" className="h-11" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-muted uppercase">IFSC Code / Swift</label>
                        <AppInput value={formBankIfsc} onChange={e => setFormBankIfsc(e.target.value)} placeholder="HDFC0000001" className="h-11 uppercase" />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-bold text-muted uppercase">Branch Name</label>
                        <AppInput value={formBankBranch} onChange={e => setFormBankBranch(e.target.value)} placeholder="Branch Name" className="h-11" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-muted uppercase">Bank State</label>
                        <select 
                          value={formBankState} 
                          onChange={e => {
                            setFormBankState(e.target.value);
                            setFormBankCity(""); // reset city when state changes
                          }} 
                          className="w-full h-11 px-4 rounded-xl text-sm transition-all focus:ring-2 outline-none bg-surface border-border text-foreground focus:border-theme-btn-primary focus:ring-theme-btn-primary/20 border"
                        >
                          <option value="">-- Select State --</option>
                          {INDIAN_STATES.map(st => (
                            <option key={st} value={st}>{st}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-muted uppercase">Bank City</label>
                        <div className="flex gap-2">
                          <select 
                            value={formBankCity} 
                            onChange={e => setFormBankCity(e.target.value)} 
                            className="flex-1 h-11 px-4 rounded-xl text-sm transition-all focus:ring-2 outline-none bg-surface border-border text-foreground focus:border-theme-btn-primary focus:ring-theme-btn-primary/20 border"
                            disabled={!formBankState || loadingBankCities}
                          >
                            <option value="">-- Select City --</option>
                            {bankCityOptions.map(c => (
                              <option key={c.city_name} value={c.city_name}>{c.city_name}</option>
                            ))}
                            {formBankCity && !bankCityOptions.find(c => c.city_name === formBankCity) && (
                              <option value={formBankCity}>{formBankCity}</option>
                            )}
                          </select>
                          <AppButton type="button" variant="outline" onClick={handleAddNewBankCity} className="h-11 w-11 px-0 shrink-0" title="Add New Bank City">
                            <Plus className="h-4 w-4" />
                          </AppButton>
                          <AppButton type="button" variant="outline" onClick={() => { setManagingStateName(formBankState); setShowCityManager(true); }} className="h-11 w-11 px-0 shrink-0 text-muted" disabled={!formBankState} title="Manage Cities">
                            <Settings className="h-4 w-4" />
                          </AppButton>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 4: Notes */}
                <div className="space-y-2 pt-4">
                  <label className="text-sm font-bold text-muted uppercase">Internal Notes</label>
                  <textarea 
                    value={formNotes} 
                    onChange={e => setFormNotes(e.target.value)} 
                    placeholder="Any specific instructions or terms related to this vendor..." 
                    className="w-full min-h-[100px] p-4 rounded-xl text-sm transition-all focus:ring-2 outline-none bg-surface border-border text-foreground focus:border-theme-btn-primary focus:ring-theme-btn-primary/20 border resize-y"
                  />
                </div>

              </form>
            </div>

            <div className="p-6 border-t border-border shrink-0 flex items-center justify-end gap-3 bg-surface/50">
              <AppButton type="button" variant="outline" onClick={() => setShowModal(false)} className="h-11 px-6">
                Cancel
              </AppButton>
              <AppButton type="submit" form="vendorForm" disabled={saving} className="h-11 px-8 font-bold shadow-lg shadow-theme-btn-primary/20">
                {saving ? "Saving..." : editId ? "Update Profile" : "Create Vendor"}
              </AppButton>
            </div>

          </div>
        </div>
      )}

      {showCityManager && (
        <CityManagerModal
          stateName={managingStateName}
          onClose={() => setShowCityManager(false)}
          onCityChanged={() => {
            if (formState === managingStateName) fetchCitiesForState(formState);
            if (formBankState === managingStateName) fetchBankCitiesForState(formBankState);
          }}
        />
      )}

      {manageModalType && (
        <MasterOptionsManager 
          title={manageModalType === "industry" ? "Industry Types" : "Vendor Types"}
          tableName={manageModalType === "industry" ? "master_industry_types" : "master_vendor_types"}
          options={manageModalType === "industry" ? masterIndustryTypes : masterVendorTypes}
          onClose={() => setManageModalType(null)}
          onUpdate={fetchDependencies}
        />
      )}
    </PageContainer>
  );
}

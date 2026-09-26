"use client";

import React, { useState, useMemo, useEffect, useCallback, memo } from "react";
import { toast } from "react-toastify";
import { 
  DesignMasterStore 
} from "../../services/designMasterStore";
import { ConsultantPartner } from "../../types";
import { CategoryMaster, EntityDependencyReport } from "../../types/masterTypes";
import { 
  Users,
  Upload, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Mail, 
  Phone, 
  Star, 
  Clock, 
  Check, 
  X, 
  Tag, 
  CheckSquare, 
  Square,
  AlertCircle,
  ShieldCheck
} from "lucide-react";
import { DeleteDependencyModal } from "../DeleteDependencyModal";
import { MasterBulkImportModal } from "./MasterBulkImportModal";
import { TransactionFormLayout } from "../DesignTransactionLayout";


// ==============================================================================
// Main Consultant Master View Component
// ==============================================================================
interface ConsultantMasterViewProps {
  onSelectConsultant?: (consultant: ConsultantPartner) => void;
}

export const ConsultantMasterView: React.FC<ConsultantMasterViewProps> = () => {
  const [storeState, setStoreState] = useState(() => DesignMasterStore.getState());
  const [viewMode, setViewMode] = useState<"DIRECTORY" | "FORM">("DIRECTORY");

  // In-Page Dedicated Form States
  const [formName, setFormName] = useState("");
  const [formLeadContact, setFormLeadContact] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formTatDays, setFormTatDays] = useState("3.0");
  const [formRating, setFormRating] = useState("4.8");
  const [formSelectedCategories, setFormSelectedCategories] = useState<string[]>([]);
  const [formCategorySearch, setFormCategorySearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Subscribe to DesignMasterStore for reactive updates
  useEffect(() => {
    const unsubscribe = DesignMasterStore.subscribe(() => {
      setStoreState({ ...DesignMasterStore.getState() });
    });
    return () => unsubscribe();
  }, []);

  const consultants = storeState.consultants || [];
  const categories = useMemo(() => DesignMasterStore.getCategories(), [storeState.disciplines]);

  // Fast map lookup for categories to avoid repeated O(N) searching
  const categoryMap = useMemo(() => {
    const map = new Map<string, CategoryMaster>();
    categories.forEach(c => map.set(c.name, c));
    return map;
  }, [categories]);

  // Precompute category counts to avoid O(N * M) calculations on every render
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    consultants.forEach(c => {
      const cats = c.categories && c.categories.length > 0 ? c.categories : (c.category ? [c.category as string] : []);
      cats.forEach(catName => {
        counts[catName] = (counts[catName] || 0) + 1;
      });
    });
    return counts;
  }, [consultants]);

  const onboardedCount = useMemo(() => {
    return consultants.filter(c => c.onboardingStatus === "Onboard" || (c.activeProjects || []).length > 0).length;
  }, [consultants]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("ALL");
  const [selectedOnboardingFilter, setSelectedOnboardingFilter] = useState("ALL");

  // Modal states
      // Delete modal states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [deleteReport, setDeleteReport] = useState<EntityDependencyReport | null>(null);
  const [consultantToDeleteId, setConsultantToDeleteId] = useState<string | null>(null);

  const handleOpenAdd = useCallback(() => {
    // Open in dedicated form mode
    setEditingId(null);
    setFormName("");
    setFormLeadContact("");
    setFormEmail("");
    setFormPhone("");
    setFormTatDays("3.0");
    setFormRating("4.8");
    setFormSelectedCategories([]);
    setFormCategorySearch("");
    setViewMode("FORM");
  }, []);

    const handleOpenEdit = useCallback((c: ConsultantPartner) => {
    setEditingId(c.id);
    setFormName(c.name || "");
    setFormLeadContact(c.leadContact || "");
    setFormEmail(c.email || "");
    setFormPhone(c.phone || "");
    setFormTatDays(c.averageTatDays?.toString() || "3.0");
    setFormRating(c.rating?.toString() || "4.8");
    const existingCats = c.categories && c.categories.length > 0 
      ? c.categories 
      : (c.category ? [c.category as string] : []);
    setFormSelectedCategories(existingCats);
    setFormCategorySearch("");
    setViewMode("FORM");
  }, []);

    const handleInPageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error("Consultant firm name is required.");
      return;
    }
    if (formEmail.trim() && !formEmail.includes("@")) {
      toast.error("Please enter a valid official email address or leave blank.");
      return;
    }
    if (formSelectedCategories.length === 0) {
      toast.error("Please map at least one discipline category.");
      return;
    }

    const primaryCategory = formSelectedCategories[0] || "Architectural";
    const leadContact = formLeadContact.trim() || formName.trim() || "Main Office";
    const email = formEmail.trim();
    const phone = formPhone.trim();

    if (editingId) {
      DesignMasterStore.updateConsultant(editingId, {
        name: formName.trim(),
        leadContact,
        email,
        phone,
        category: primaryCategory as any,
        categories: formSelectedCategories,
        averageTatDays: parseFloat(formTatDays) || 3.0,
        rating: parseFloat(formRating) || 5.0
      });
      toast.success(`Consultant firm "${formName.trim()}" updated successfully!`);
    } else {
      DesignMasterStore.addConsultant({
        name: formName.trim(),
        leadContact,
        email,
        phone,
        category: primaryCategory as any,
        categories: formSelectedCategories,
        expertise: [],
        activeProjects: [],
        onboardingStatus: "Not Onboard",
        totalDrawingsSubmitted: 0,
        averageTatDays: parseFloat(formTatDays) || 3.0,
        rating: parseFloat(formRating) || 5.0
      });
      toast.success(`Consultant firm "${formName.trim()}" registered successfully!`);
    }

    setViewMode("DIRECTORY");
    setEditingId(null);
  };

    const handleTriggerDelete = useCallback((c: ConsultantPartner) => {
    const report = DesignMasterStore.getEntityDependencies("CONSULTANT", c.id);
    setDeleteReport(report);
    setConsultantToDeleteId(c.id);
    setIsDeleteModalOpen(true);
  }, []);

  const handleConfirmDelete = useCallback((reason: string) => {
    if (consultantToDeleteId) {
      const c = consultants.find(cons => cons.id === consultantToDeleteId);
      DesignMasterStore.deleteConsultant(consultantToDeleteId, reason, "Design Lead");
      toast.success(`Consultant firm "${c?.name || "Partner"}" deleted successfully.`);
      setIsDeleteModalOpen(false);
      setConsultantToDeleteId(null);
    }
  }, [consultantToDeleteId, consultants]);

  // Filtered consultants memoized
  const filteredConsultants = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return consultants.filter(c => {
      // Category filter
      if (selectedCategoryFilter !== "ALL") {
        const cCategories = c.categories || (c.category ? [c.category as string] : []);
        if (!cCategories.includes(selectedCategoryFilter)) {
          return false;
        }
      }

      // Onboarding filter
      if (selectedOnboardingFilter !== "ALL") {
        const isOnboard = c.onboardingStatus === "Onboard" || (c.activeProjects || []).length > 0;
        if (selectedOnboardingFilter === "ONBOARD" && !isOnboard) return false;
        if (selectedOnboardingFilter === "NOT_ONBOARD" && isOnboard) return false;
      }

      // Search query
      if (q) {
        const matchName = c.name.toLowerCase().includes(q);
        const matchContact = (c.leadContact || "").toLowerCase().includes(q);
        const matchEmail = (c.email || "").toLowerCase().includes(q);
        const matchCat = (c.categories || []).some(cat => cat.toLowerCase().includes(q)) || (c.category && (c.category as string).toLowerCase().includes(q));
        if (!matchName && !matchContact && !matchEmail && !matchCat) return false;
      }

      return true;
    });
  }, [consultants, selectedCategoryFilter, selectedOnboardingFilter, searchQuery]);

  const filteredInPageCategories = useMemo(() => {
    if (!formCategorySearch.trim()) return categories;
    const q = formCategorySearch.toLowerCase();
    return categories.filter(c => 
      c.name.toLowerCase().includes(q) || (c.code && c.code.toLowerCase().includes(q))
    );
  }, [categories, formCategorySearch]);

  return (
    <div className="w-full space-y-4 animate-in fade-in duration-150">
      {/* ========================================================================= */}
      {/* MODE 1: DEDICATED IN-PAGE CREATION / EDIT VIEW */}
      {/* ========================================================================= */}
      {viewMode === "FORM" && (
        <TransactionFormLayout
          title={editingId ? `Edit Consultant: ${formName || "Partner"}` : "Create New Consultant Master"}
          icon={Users}
          description="Register consultant firm credentials, lead personnel, and map engineering packages from Package Master"
          onBack={() => setViewMode("DIRECTORY")}
          backLabel="Back to Directory"
          breadcrumbs={[
            { label: "Design Masters", onClick: () => setViewMode("DIRECTORY") },
            { label: "Consultant Master", onClick: () => setViewMode("DIRECTORY") },
            { label: editingId ? (formName || "Edit Consultant") : "Register Consultant" }
          ]}
          onSave={handleInPageSubmit}
          saveLabel={editingId ? "Save Changes" : "Register Consultant Master"}
          onReset={editingId ? () => {
            const c = consultants.find(x => x.id === editingId);
            if (c) handleOpenEdit(c);
          } : handleOpenAdd}
        >
          <form id="in-page-consultant-form" onSubmit={handleInPageSubmit} className="space-y-6">
            {/* Section 1: Firm & Lead Contact Credentials */}
            <div className="p-5 rounded-2xl bg-surface border border-border shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-border/60">
                <Users className="h-4 w-4 text-purple-500" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  1. Firm Information & Lead Personnel
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">
                    Consultant Firm Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder="e.g., Sterling Engineering & Structural Consultants"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">
                    Lead Contact Person <span className="text-muted-foreground text-[10px] font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={formLeadContact}
                    onChange={e => setFormLeadContact(e.target.value)}
                    placeholder="e.g., Er. Rajesh Sharma (Optional)"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">
                    Official Email <span className="text-muted-foreground text-[10px] font-normal">(Optional)</span>
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={e => setFormEmail(e.target.value)}
                    placeholder="e.g., r.sharma@sterlingconsultants.in (Optional)"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">
                    Direct Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formPhone}
                    onChange={e => setFormPhone(e.target.value)}
                    placeholder="+91 98200 00000"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">
                    Target Turnaround Time (TAT Days)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="30"
                    value={formTatDays}
                    onChange={e => setFormTatDays(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">
                    Initial Quality Rating (1.0 - 5.0)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    value={formRating}
                    onChange={e => setFormRating(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Package Master Mapping */}
            <div className="p-5 rounded-2xl bg-surface border border-border shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-purple-500" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    2. Map Tagged Packages from Package Master <span className="text-rose-500">*</span>
                  </h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold">
                    {formSelectedCategories.length} Selected
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFormSelectedCategories(categories.map(c => c.name))}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 transition-colors cursor-pointer inline-flex items-center gap-1"
                  >
                    <CheckSquare className="h-3.5 w-3.5" />
                    <span>Select All</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormSelectedCategories([])}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-500/10 text-slate-600 dark:text-slate-400 hover:bg-slate-500/20 transition-colors cursor-pointer inline-flex items-center gap-1"
                  >
                    <Square className="h-3.5 w-3.5" />
                    <span>Remove All</span>
                  </button>
                </div>
              </div>

              {/* Search Category Box */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  value={formCategorySearch}
                  onChange={e => setFormCategorySearch(e.target.value)}
                  placeholder="Filter engineering packages from Package Master (e.g. Structural, MEP, Landscape, Façade)..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                />
              </div>

              {/* Grid of Interactive Category Chips */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {filteredInPageCategories.map(cat => {
                  const isSelected = formSelectedCategories.includes(cat.name);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setFormSelectedCategories(prev =>
                          prev.includes(cat.name) ? prev.filter(c => c !== cat.name) : [...prev, cat.name]
                        );
                      }}
                      className={`p-3 rounded-xl text-left text-xs border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                        isSelected
                          ? "bg-purple-50 dark:bg-purple-950/40 border-purple-500 text-purple-900 dark:text-purple-100 font-bold shadow-xs ring-1 ring-purple-500/30"
                          : "bg-background border-border text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base shrink-0">{cat.icon || "📁"}</span>
                        <div className="min-w-0">
                          <div className="truncate font-semibold">{cat.name}</div>
                          <span className="text-[10px] text-muted-foreground font-mono font-normal">
                            {cat.code}
                          </span>
                        </div>
                      </div>

                      <div className={`h-4 w-4 rounded-md flex items-center justify-center shrink-0 border ${
                        isSelected
                          ? "bg-purple-600 border-purple-600 text-white"
                          : "border-border bg-background"
                      }`}>
                        {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setViewMode("DIRECTORY")}
                className="px-5 py-2.5 rounded-xl border border-border bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-foreground cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md cursor-pointer transition-all"
              >
                {editingId ? "Save Consultant Changes" : "Register Consultant Master"}
              </button>
            </div>
          </form>
        </TransactionFormLayout>
      )}

      {viewMode === "DIRECTORY" && (
        <div className="space-y-4">
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/20 shrink-0">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-foreground">
                  Consultant Master (Partner Directory)
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl border border-border bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 text-foreground text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all shrink-0 whitespace-nowrap"
              >
                <Upload className="h-3.5 w-3.5 text-purple-600" />
                <span>Import Consultants (Excel)</span>
              </button>
              <button
                type="button"
                onClick={handleOpenAdd}
                className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-md cursor-pointer transition-all shrink-0 whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create Consultant Master</span>
              </button>
            </div>
          </div>

          {/* Metrics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-surface border border-border flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-muted-foreground block">Total Consultants</span>
                <span className="text-lg font-black text-foreground">{consultants.length}</span>
              </div>
              <Users className="h-4 w-4 text-purple-500" />
            </div>
            <div className="p-3 rounded-xl bg-surface border border-border flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-muted-foreground block">Onboarded & Tagged</span>
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                  {onboardedCount}
                </span>
              </div>
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="p-3 rounded-xl bg-surface border border-border flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-muted-foreground block">Pending Tagging</span>
                <span className="text-lg font-black text-amber-600 dark:text-amber-400">
                  {consultants.length - onboardedCount}
                </span>
              </div>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <div className="p-3 rounded-xl bg-surface border border-border flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-muted-foreground block">Package Coverage</span>
                <span className="text-lg font-black text-blue-600 dark:text-blue-400">
                  {categories.length} Pkgs
                </span>
              </div>
              <Tag className="h-4 w-4 text-blue-500" />
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="p-3 rounded-2xl border border-border bg-surface shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                {/* Onboarding Filter */}
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-[11px] font-semibold text-muted-foreground">Status:</span>
                  <select
                    value={selectedOnboardingFilter}
                    onChange={e => setSelectedOnboardingFilter(e.target.value)}
                    className="px-2.5 py-1 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-hidden"
                  >
                    <option value="ALL">All ({consultants.length})</option>
                    <option value="ONBOARD">Onboarded</option>
                    <option value="NOT_ONBOARD">Not Onboard</option>
                  </select>
                </div>
                <div className="text-xs text-muted-foreground font-medium pl-2 border-l border-border">
                  <strong>{filteredConsultants.length}</strong> of {consultants.length}
                </div>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 text-xs">
              <span className="text-[11px] font-bold text-muted-foreground mr-1 shrink-0 flex items-center gap-1">
                <Tag className="h-3 w-3" />
                <span>Package:</span>
              </span>
              <button
                type="button"
                onClick={() => setSelectedCategoryFilter("ALL")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                  selectedCategoryFilter === "ALL"
                    ? "bg-purple-600 text-white font-bold shadow-2xs"
                    : "bg-muted/40 text-muted-foreground hover:text-foreground"
                }`}
              >
                All Packages
              </button>
              {categories.map(cat => {
                const count = categoryCounts[cat.name] || 0;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategoryFilter(cat.name)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 ${
                      selectedCategoryFilter === cat.name
                        ? "bg-purple-600 text-white font-bold shadow-2xs"
                        : "bg-muted/40 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span>{cat.icon || "📁"}</span>
                    <span>{cat.name}</span>
                    <span className="opacity-70 text-[10px]">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Consultants Cards Grid */}
          {filteredConsultants.length === 0 ? (
            <div className="p-8 rounded-2xl border border-dashed border-border bg-surface text-center space-y-3">
              <div className="h-10 w-10 mx-auto rounded-xl bg-muted text-muted-foreground flex items-center justify-center">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h5 className="text-sm font-bold text-foreground">No Consultants Found</h5>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {searchQuery || selectedCategoryFilter !== "ALL"
                    ? "Try adjusting your search or package filter criteria."
                    : "Register your specialized external architectural and engineering consultants."}
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenAdd}
                className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create First Consultant</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3.5 w-full">
              {filteredConsultants.map(c => {
                const mappedCats = c.categories && c.categories.length > 0 
                  ? c.categories 
                  : (c.category ? [c.category as string] : ["Architectural"]);
                const isOnboard = c.onboardingStatus === "Onboard" || (c.activeProjects || []).length > 0;

                return (
                  <div
                    key={c.id}
                    className="p-4 rounded-2xl border border-border bg-surface hover:border-purple-500/40 shadow-xs transition-all flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-3">
                      {/* Top: Firm Name & Status */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {isOnboard ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                <span>Onboarded ({c.activeProjects?.length || 0} Projs)</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
                                Available / Standby
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm font-bold text-foreground mt-1 truncate">
                            {c.name}
                          </h4>
                          <span className="text-xs text-muted-foreground font-medium flex items-center gap-1 mt-0.5">
                            <Users className="h-3 w-3" />
                            <span>{c.leadContact}</span>
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(c)}
                            className="h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                            title="Edit Consultant & Packages"
                          >
                            <Edit2 className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTriggerDelete(c)}
                            className="h-7 w-7 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 flex items-center justify-center transition-colors cursor-pointer"
                            title="Delete Consultant"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      {/* Contact Info Chips */}
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5 truncate">
                          <Mail className="h-3 w-3 shrink-0 text-muted-foreground" />
                          <span className="truncate">{c.email}</span>
                        </div>
                        {c.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-3 w-3 shrink-0 text-muted-foreground" />
                            <span>{c.phone}</span>
                          </div>
                        )}
                      </div>

                      {/* Mapped Categories Badges */}
                      <div className="space-y-1 pt-1.5 border-t border-border">
                        <span className="text-[10px] font-bold text-muted-foreground block">
                          Tagged Packages ({mappedCats.length}):
                        </span>
                        <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto custom-scrollbar">
                          {mappedCats.map((catName, idx) => {
                            const catMaster = categoryMap.get(catName);
                            return (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 flex items-center gap-1"
                              >
                                <span>{catMaster?.icon || "📁"}</span>
                                <span>{catName}</span>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Footer KPIs */}
                    <div className="pt-2.5 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3 text-amber-500" />
                          <span className="font-semibold text-foreground">{c.averageTatDays || 3}d</span> TAT
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                          <span className="font-semibold text-foreground">{c.rating || 5.0}</span>
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenEdit(c)}
                        className="h-6 px-2.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/25 text-[11px] font-bold inline-flex items-center transition-colors cursor-pointer"
                      >
                        Edit Packages
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          

          {/* Delete Dependency Safety Modal */}
          <DeleteDependencyModal
            isOpen={isDeleteModalOpen}
            onClose={() => {
              setIsDeleteModalOpen(false);
              setConsultantToDeleteId(null);
            }}
            report={deleteReport}
            onConfirmDelete={handleConfirmDelete}
          />

          <MasterBulkImportModal
            isOpen={isImportModalOpen}
            onClose={() => setIsImportModalOpen(false)}
            initialMasterType="CONSULTANTS"
          />
        </div>
      )}
    </div>
  );
};

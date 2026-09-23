"use client";

import React, { useState, useMemo } from "react";
import { 
  DesignMasterStore 
} from "../../services/designMasterStore";
import { ConsultantPartner } from "../../types";
import { CategoryMaster, EntityDependencyReport } from "../../types/masterTypes";
import { 
  Users, 
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
  SlidersHorizontal, 
  Tag, 
  Sparkles, 
  CheckSquare, 
  Square,
  Building2,
  AlertCircle,
  ShieldCheck
} from "lucide-react";
import { DeleteDependencyModal } from "../DeleteDependencyModal";

interface ConsultantMasterViewProps {
  onSelectConsultant?: (consultant: ConsultantPartner) => void;
}

export const ConsultantMasterView: React.FC<ConsultantMasterViewProps> = () => {
  const store = DesignMasterStore.getState();
  const consultants = store.consultants || [];
  const categories = DesignMasterStore.getCategories();
  const projects = store.projects || [];

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("ALL");
  const [selectedOnboardingFilter, setSelectedOnboardingFilter] = useState("ALL");

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConsultant, setEditingConsultant] = useState<ConsultantPartner | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [leadContact, setLeadContact] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [tatDays, setTatDays] = useState("3.0");
  const [rating, setRating] = useState("4.8");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categorySearchQuery, setCategorySearchQuery] = useState("");
  const [formError, setFormError] = useState("");

  // Delete modal states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteReport, setDeleteReport] = useState<EntityDependencyReport | null>(null);
  const [consultantToDeleteId, setConsultantToDeleteId] = useState<string | null>(null);

  const handleOpenAdd = () => {
    setEditingConsultant(null);
    setName("");
    setLeadContact("");
    setEmail("");
    setPhone("");
    setTatDays("3.0");
    setRating("4.8");
    // Start with empty categories - user selects required mapped categories explicitly
    setSelectedCategories([]);
    setCategorySearchQuery("");
    setFormError("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: ConsultantPartner) => {
    setEditingConsultant(c);
    setName(c.name);
    setLeadContact(c.leadContact);
    setEmail(c.email);
    setPhone(c.phone);
    setTatDays(c.averageTatDays?.toString() || "3.0");
    setRating(c.rating?.toString() || "4.8");
    
    // Resolve categories
    const existingCats = c.categories && c.categories.length > 0 
      ? c.categories 
      : (c.category ? [c.category as string] : []);
    setSelectedCategories(existingCats);
    setCategorySearchQuery("");
    setFormError("");
    setIsModalOpen(true);
  };

  const handleToggleCategory = (catName: string) => {
    setSelectedCategories(prev => 
      prev.includes(catName) ? prev.filter(c => c !== catName) : [...prev, catName]
    );
  };

  const handleSelectAllCategories = () => {
    setSelectedCategories(categories.map(c => c.name));
  };

  const handleRemoveAllCategories = () => {
    setSelectedCategories([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError("Consultant firm name is required.");
      return;
    }
    if (!leadContact.trim()) {
      setFormError("Lead contact person name is required.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setFormError("Valid official email address is required.");
      return;
    }
    if (selectedCategories.length === 0) {
      setFormError("Please map at least one discipline category.");
      return;
    }

    const primaryCategory = selectedCategories[0] || "Architectural";

    if (editingConsultant) {
      DesignMasterStore.updateConsultant(editingConsultant.id, {
        name: name.trim(),
        leadContact: leadContact.trim(),
        email: email.trim(),
        phone: phone.trim() || "+91 22 0000 0000",
        category: primaryCategory as any,
        categories: selectedCategories,
        averageTatDays: parseFloat(tatDays) || 3.0,
        rating: parseFloat(rating) || 5.0
      });
    } else {
      DesignMasterStore.addConsultant({
        name: name.trim(),
        leadContact: leadContact.trim(),
        email: email.trim(),
        phone: phone.trim() || "+91 22 0000 0000",
        category: primaryCategory as any,
        categories: selectedCategories,
        expertise: [],
        activeProjects: [],
        onboardingStatus: "Not Onboard",
        totalDrawingsSubmitted: 0,
        averageTatDays: parseFloat(tatDays) || 3.0,
        rating: parseFloat(rating) || 5.0
      });
    }

    setIsModalOpen(false);
    setEditingConsultant(null);
  };

  const handleTriggerDelete = (c: ConsultantPartner) => {
    const report = DesignMasterStore.getEntityDependencies("CONSULTANT", c.id);
    setDeleteReport(report);
    setConsultantToDeleteId(c.id);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = (reason: string) => {
    if (consultantToDeleteId) {
      DesignMasterStore.deleteConsultant(consultantToDeleteId, reason, "Design Lead");
      setIsDeleteModalOpen(false);
      setConsultantToDeleteId(null);
    }
  };

  // Filtered consultants
  const filteredConsultants = useMemo(() => {
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
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = c.name.toLowerCase().includes(q);
        const matchContact = (c.leadContact || "").toLowerCase().includes(q);
        const matchEmail = (c.email || "").toLowerCase().includes(q);
        const matchCat = (c.categories || []).some(cat => cat.toLowerCase().includes(q)) || (c.category && (c.category as string).toLowerCase().includes(q));
        if (!matchName && !matchContact && !matchEmail && !matchCat) return false;
      }

      return true;
    });
  }, [consultants, selectedCategoryFilter, selectedOnboardingFilter, searchQuery]);

  // Filtered categories in modal
  const filteredModalCategories = useMemo(() => {
    if (!categorySearchQuery.trim()) return categories;
    const q = categorySearchQuery.toLowerCase();
    return categories.filter(c => 
      c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [categories, categorySearchQuery]);

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
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
            <p className="text-xs text-muted-foreground">
              Register consultant firms and map their specialized engineering categories from Category Master
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-md cursor-pointer transition-all shrink-0 whitespace-nowrap"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Consultant</span>
        </button>
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
              {consultants.filter(c => c.onboardingStatus === "Onboard" || (c.activeProjects || []).length > 0).length}
            </span>
          </div>
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
        </div>
        <div className="p-3 rounded-xl bg-surface border border-border flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground block">Pending Tagging</span>
            <span className="text-lg font-black text-amber-600 dark:text-amber-400">
              {consultants.filter(c => c.onboardingStatus !== "Onboard" && (!c.activeProjects || c.activeProjects.length === 0)).length}
            </span>
          </div>
          <Clock className="h-4 w-4 text-amber-500" />
        </div>
        <div className="p-3 rounded-xl bg-surface border border-border flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground block">Category Coverage</span>
            <span className="text-lg font-black text-blue-600 dark:text-blue-400">
              {categories.length} Cats
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
            <span>Category:</span>
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
            All Categories
          </button>
          {categories.map(cat => {
            const count = consultants.filter(c => 
              (c.categories && c.categories.includes(cat.name)) || c.category === cat.name
            ).length;

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
                ? "Try adjusting your search or category filter criteria."
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
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
                        title="Edit Consultant & Categories"
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
                      Mapped Categories ({mappedCats.length}):
                    </span>
                    <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto custom-scrollbar">
                      {mappedCats.map((catName, idx) => {
                        const catMaster = categories.find(cat => cat.name === catName);
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
                    className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                  >
                    Edit Categories
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Consultant Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="relative w-full max-w-4xl xl:max-w-5xl rounded-3xl bg-surface border border-border shadow-2xl p-6 sm:p-8 space-y-5 animate-in zoom-in-95 duration-150 my-8">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Users className="h-4 w-4" />
                </div>
                <h3 className="text-base font-bold text-foreground">
                  {editingConsultant ? "Edit Consultant Master" : "Create New Consultant Partner"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-muted-foreground flex items-center justify-center cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {formError && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Firm Name & Lead Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">
                    Consultant Firm Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">
                    Lead Contact Person <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={leadContact}
                    onChange={e => setLeadContact(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">
                    Official Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">
                    Direct Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* TAT & Rating */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">
                    Target TAT (Days)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="30"
                    value={tatDays}
                    onChange={e => setTatDays(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">
                    Quality Rating (1.0 - 5.0)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    value={rating}
                    onChange={e => setRating(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* 🎯 CATEGORY MASTER MAPPING SECTION */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-border space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-purple-500" />
                    <label className="text-xs font-bold text-foreground">
                      Map Categories from Category Master <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold">
                      {selectedCategories.length} Selected
                    </span>
                  </div>

                  {/* Quick Select All / Remove All Buttons */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleSelectAllCategories}
                      className="px-2 py-1 rounded-lg text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 transition-colors cursor-pointer inline-flex items-center gap-1"
                    >
                      <CheckSquare className="h-3 w-3" />
                      <span>Select All</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveAllCategories}
                      className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-500/10 text-slate-600 dark:text-slate-400 hover:bg-slate-500/20 transition-colors cursor-pointer inline-flex items-center gap-1"
                    >
                      <Square className="h-3 w-3" />
                      <span>Remove All</span>
                    </button>
                  </div>
                </div>

                {/* Category Search */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <input
                    type="text"
                    value={categorySearchQuery}
                    onChange={e => setCategorySearchQuery(e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                {/* Interactive Category Chips Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-56 overflow-y-auto custom-scrollbar p-1">
                  {filteredModalCategories.map(cat => {
                    const isSelected = selectedCategories.includes(cat.name);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleToggleCategory(cat.name)}
                        className={`p-2 rounded-xl text-left text-xs border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                          isSelected
                            ? "bg-purple-50 dark:bg-purple-950/40 border-purple-500/60 text-purple-900 dark:text-purple-100 font-bold shadow-2xs"
                            : "bg-background border-border text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-sm shrink-0">{cat.icon || "📁"}</span>
                          <div className="min-w-0">
                            <div className="truncate font-semibold">{cat.name}</div>
                            <span className="text-[9px] text-muted-foreground font-mono font-normal">
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

              {/* Modal Action Buttons */}
              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-border bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-foreground cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md cursor-pointer transition-all"
                >
                  {editingConsultant ? "Save Consultant" : "Register Consultant"}
                </button>
              </div>
            </form>
          </div>
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
    </div>
  );
};

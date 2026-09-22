"use client";

import React, { useState, useMemo } from "react";
import { ConsultantPartner, DesignDiscipline } from "../types";
import { DesignMultiSelectDropdown, DropdownOption } from "./DesignMultiSelectDropdown";
import { 
  Users, 
  Mail, 
  Phone, 
  Building, 
  Star, 
  Clock, 
  Plus, 
  Search, 
  Trash2, 
  SlidersHorizontal, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Tag, 
  Check, 
  Edit2, 
  Filter, 
  Layers, 
  Sparkles, 
  ShieldCheck 
} from "lucide-react";

interface ConsultantDirectoryProps {
  consultants: ConsultantPartner[];
  onAddConsultant?: (consultant: Omit<ConsultantPartner, "id">) => void;
  onUpdateConsultant?: (id: string, updates: Partial<ConsultantPartner>) => void;
  onDeleteConsultant?: (id: string) => void;
  availableProjects?: string[];
  availableWorkPackages?: string[];
}

export const ConsultantDirectory: React.FC<ConsultantDirectoryProps> = ({
  consultants,
  onAddConsultant,
  onUpdateConsultant,
  onDeleteConsultant,
  availableProjects = [],
  availableWorkPackages = []
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDisciplineFilters, setSelectedDisciplineFilters] = useState<string[]>([]);
  const [selectedProjectFilters, setSelectedProjectFilters] = useState<string[]>([]);
  const [selectedPackageFilters, setSelectedPackageFilters] = useState<string[]>([]);
  const [selectedOnboardingFilters, setSelectedOnboardingFilters] = useState<string[]>([]);
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingConsultant, setEditingConsultant] = useState<ConsultantPartner | null>(null);

  // Form State for Add / Edit
  const [name, setName] = useState("");
  const [category, setCategory] = useState<DesignDiscipline>("Architectural");
  const [leadContact, setLeadContact] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedExpertise, setSelectedExpertise] = useState<string[]>([]);
  const [modalPackageSearch, setModalPackageSearch] = useState("");
  const [customExpertiseInput, setCustomExpertiseInput] = useState("");
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [tatDays, setTatDays] = useState("3.0");
  const [rating, setRating] = useState("4.8");
  const [formError, setFormError] = useState("");

  const disciplines: DesignDiscipline[] = [
    "Architectural", 
    "Structural", 
    "MEP", 
    "Landscape", 
    "Interior"
  ];

  // Open modal for Create
  const handleOpenAddModal = () => {
    setEditingConsultant(null);
    setName("");
    setCategory("Architectural");
    setLeadContact("");
    setEmail("");
    setPhone("");
    // Default ALL work packages selected YES (user can untick whichever is not needed)
    setSelectedExpertise([...availableWorkPackages]);
    setModalPackageSearch("");
    setCustomExpertiseInput("");
    setSelectedProjects([]);
    setTatDays("3.0");
    setRating("4.8");
    setFormError("");
    setIsAddModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEditModal = (c: ConsultantPartner) => {
    setEditingConsultant(c);
    setName(c.name);
    setCategory(c.category);
    setLeadContact(c.leadContact);
    setEmail(c.email);
    setPhone(c.phone);
    setSelectedExpertise(c.expertise || []);
    setModalPackageSearch("");
    setCustomExpertiseInput("");
    setSelectedProjects(c.activeProjects || []);
    setTatDays(c.averageTatDays?.toString() || "3.0");
    setRating(c.rating?.toString() || "4.8");
    setFormError("");
    setIsAddModalOpen(true);
  };

  // Multi-select toggle helpers
  const handleToggleExpertise = (tag: string) => {
    setSelectedExpertise(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleAddCustomExpertise = (e: React.KeyboardEvent | React.MouseEvent) => {
    if (("key" in e && e.key === "Enter") || !("key" in e)) {
      e.preventDefault();
      const val = customExpertiseInput.trim();
      if (val && !selectedExpertise.includes(val)) {
        setSelectedExpertise(prev => [...prev, val]);
        setCustomExpertiseInput("");
      }
    }
  };

  const handleToggleProject = (proj: string) => {
    setSelectedProjects(prev => 
      prev.includes(proj) ? prev.filter(p => p !== proj) : [...prev, proj]
    );
  };

  // Submit Handler
  const handleSubmitConsultant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError("Please enter the consultant firm name.");
      return;
    }
    if (!leadContact.trim()) {
      setFormError("Please enter the lead contact person.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setFormError("Please enter a valid official email address.");
      return;
    }

    const computedOnboardingStatus: "Onboard" | "Not Onboard" = selectedProjects.length > 0 ? "Onboard" : "Not Onboard";

    if (editingConsultant) {
      if (onUpdateConsultant) {
        onUpdateConsultant(editingConsultant.id, {
          name: name.trim(),
          category,
          leadContact: leadContact.trim(),
          email: email.trim(),
          phone: phone.trim() || "+91 22 0000 0000",
          expertise: selectedExpertise,
          activeProjects: selectedProjects,
          onboardingStatus: computedOnboardingStatus,
          averageTatDays: parseFloat(tatDays) || 3.0,
          rating: parseFloat(rating) || 5.0
        });
      }
    } else {
      if (onAddConsultant) {
        onAddConsultant({
          name: name.trim(),
          category,
          leadContact: leadContact.trim(),
          email: email.trim(),
          phone: phone.trim() || "+91 22 0000 0000",
          expertise: selectedExpertise,
          activeProjects: selectedProjects,
          onboardingStatus: computedOnboardingStatus,
          totalDrawingsSubmitted: 0,
          averageTatDays: parseFloat(tatDays) || 3.0,
          rating: parseFloat(rating) || 5.0
        });
      }
    }

    setIsAddModalOpen(false);
    setEditingConsultant(null);
  };

  // Filtered Consultants
  const filteredConsultants = useMemo(() => {
    return consultants.filter(c => {
      // Discipline filter
      if (selectedDisciplineFilters.length > 0 && !selectedDisciplineFilters.includes(c.category)) {
        return false;
      }

      // Project filter
      if (selectedProjectFilters.length > 0) {
        const hasMatchingProject = (c.activeProjects || []).some(p => selectedProjectFilters.includes(p));
        if (!hasMatchingProject) return false;
      }

      // Work Package filter
      if (selectedPackageFilters.length > 0) {
        const hasMatchingPackage = (c.expertise || []).some(p => selectedPackageFilters.includes(p));
        if (!hasMatchingPackage) return false;
      }

      // Onboarding Status filter
      if (selectedOnboardingFilters.length > 0) {
        const isOnboard = c.onboardingStatus === "Onboard" || (c.activeProjects || []).length > 0;
        const matches = selectedOnboardingFilters.some(f => {
          if (f === "ONBOARD" && isOnboard) return true;
          if (f === "NOT_ONBOARD" && !isOnboard) return true;
          return false;
        });
        if (!matches) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches = 
          c.name.toLowerCase().includes(q) ||
          c.leadContact.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          (c.expertise || []).some(exp => exp.toLowerCase().includes(q)) ||
          (c.activeProjects || []).some(p => p.toLowerCase().includes(q));
        if (!matches) return false;
      }

      return true;
    });
  }, [consultants, selectedDisciplineFilters, selectedProjectFilters, selectedPackageFilters, selectedOnboardingFilters, searchQuery]);

  const getDisciplineBadge = (cat: string) => {
    switch (cat) {
      case "Architectural": return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
      case "Structural": return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "MEP": return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
      case "Landscape": return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "Interior": return "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20";
      default: return "bg-slate-100 dark:bg-slate-800 text-muted-foreground border-border";
    }
  };

  const totalOnboarded = consultants.filter(c => (c.activeProjects && c.activeProjects.length > 0) || c.onboardingStatus === "Onboard").length;
  const totalNotOnboarded = consultants.length - totalOnboarded;

  // Multi-Select Dropdown Options
  const disciplineOptions = useMemo<DropdownOption[]>(() => {
    return disciplines.map(d => {
      const cnt = consultants.filter(c => c.category === d).length;
      return {
        value: d,
        label: d,
        count: cnt,
        subtitle: `${cnt} firm${cnt === 1 ? "" : "s"}`
      };
    });
  }, [disciplines, consultants]);

  const projectOptions = useMemo<DropdownOption[]>(() => {
    return availableProjects.map(p => {
      const cnt = consultants.filter(c => (c.activeProjects || []).includes(p)).length;
      return {
        value: p,
        label: p,
        count: cnt,
        subtitle: `${cnt} firm${cnt === 1 ? "" : "s"} tagged`
      };
    });
  }, [availableProjects, consultants]);

  const packageOptions = useMemo<DropdownOption[]>(() => {
    const allPkgNames = Array.from(new Set([...availableWorkPackages, ...consultants.flatMap(c => c.expertise || [])]));
    return allPkgNames.map(pkg => {
      const cnt = consultants.filter(c => (c.expertise || []).includes(pkg)).length;
      return {
        value: pkg,
        label: pkg,
        count: cnt,
        subtitle: `${cnt} consultant${cnt === 1 ? "" : "s"}`
      };
    });
  }, [availableWorkPackages, consultants]);

  const onboardingOptions = useMemo<DropdownOption[]>(() => {
    return [
      {
        value: "ONBOARD",
        label: "Onboard",
        count: totalOnboarded,
        colorDot: "#10b981",
        subtitle: "Active on 1+ project"
      },
      {
        value: "NOT_ONBOARD",
        label: "Not Onboard",
        count: totalNotOnboarded,
        colorDot: "#f59e0b",
        subtitle: "No active projects tagged"
      }
    ];
  }, [totalOnboarded, totalNotOnboarded]);

  const totalActiveFilterCount =
    selectedDisciplineFilters.length +
    selectedProjectFilters.length +
    selectedPackageFilters.length +
    selectedOnboardingFilters.length;

  const handleClearAllFilters = () => {
    setSelectedDisciplineFilters([]);
    setSelectedProjectFilters([]);
    setSelectedPackageFilters([]);
    setSelectedOnboardingFilters([]);
    setSearchQuery("");
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Header & Control Ribbon */}
      <div className="p-4 sm:p-5 rounded-2xl border border-border bg-surface shadow-xs space-y-3.5">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/20 shrink-0">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                Consultants & Engineering Partners
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                aria-label="Search firm, contact, package tag"
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-border bg-slate-50/50 dark:bg-slate-900/50 text-foreground focus:outline-none focus:border-purple-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Register Consultant Button */}
            {onAddConsultant && (
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95 shrink-0 whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Consultant</span>
              </button>
            )}
          </div>
        </div>

        {/* Multi-Selection Dropdowns Filter Row */}
        <div className="pt-3 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* 1. Discipline Dropdown */}
            <DesignMultiSelectDropdown
              label="Discipline"
              icon={<SlidersHorizontal className="h-3.5 w-3.5" />}
              options={disciplineOptions}
              selectedValues={selectedDisciplineFilters}
              onChange={setSelectedDisciplineFilters}
              colorTheme="purple"
              placeholder={`All Disciplines (${consultants.length})`}
              searchPlaceholder="Search discipline..."
            />

            {/* 2. Tagged Project Dropdown */}
            <DesignMultiSelectDropdown
              label="Projects"
              icon={<Building className="h-3.5 w-3.5" />}
              options={projectOptions}
              selectedValues={selectedProjectFilters}
              onChange={setSelectedProjectFilters}
              colorTheme="blue"
              placeholder={`All Projects (${availableProjects.length})`}
              searchPlaceholder="Search project..."
            />

            {/* 3. Work Package Dropdown */}
            <DesignMultiSelectDropdown
              label="Work Packages"
              icon={<Layers className="h-3.5 w-3.5" />}
              options={packageOptions}
              selectedValues={selectedPackageFilters}
              onChange={setSelectedPackageFilters}
              colorTheme="teal"
              placeholder={`All Packages (${packageOptions.length})`}
              searchPlaceholder="Search work package..."
            />

            {/* 4. Onboarding Status Dropdown */}
            <DesignMultiSelectDropdown
              label="Onboarding"
              icon={<CheckCircle2 className="h-3.5 w-3.5" />}
              options={onboardingOptions}
              selectedValues={selectedOnboardingFilters}
              onChange={setSelectedOnboardingFilters}
              colorTheme="emerald"
              placeholder="All Statuses"
              searchPlaceholder="Filter onboarding..."
              showSearch={false}
            />

            {/* Clear All Filters Button */}
            {totalActiveFilterCount > 0 && (
              <button
                type="button"
                onClick={handleClearAllFilters}
                className="h-9 px-3 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-2xs"
                title="Reset all active filters"
              >
                <X className="h-3.5 w-3.5" />
                <span>Reset Filters ({totalActiveFilterCount})</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0 text-muted-foreground text-xs">
            <span>Showing <strong className="text-foreground">{filteredConsultants.length}</strong> of {consultants.length} partners</span>
          </div>
        </div>

        {/* 🏷️ Active Selected Filter Badges */}
        {totalActiveFilterCount > 0 && (
          <div className="pt-2 border-t border-border flex flex-wrap items-center gap-1.5 text-xs animate-in fade-in duration-100">
            <span className="text-[10px] font-bold uppercase text-muted-foreground mr-1 shrink-0">
              Active Filters:
            </span>

            {/* Discipline Badges */}
            {selectedDisciplineFilters.map(d => (
              <span
                key={`disc-${d}`}
                className="px-2 py-0.5 rounded-lg bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/30 text-[11px] font-semibold inline-flex items-center gap-1 shadow-2xs"
              >
                <SlidersHorizontal className="h-2.5 w-2.5" />
                <span>{d}</span>
                <button
                  type="button"
                  onClick={() => setSelectedDisciplineFilters(prev => prev.filter(x => x !== d))}
                  className="hover:text-rose-500 cursor-pointer p-0.5"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}

            {/* Project Badges */}
            {selectedProjectFilters.map(p => (
              <span
                key={`proj-${p}`}
                className="px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/30 text-[11px] font-semibold inline-flex items-center gap-1 shadow-2xs"
              >
                <Building className="h-2.5 w-2.5" />
                <span>{p}</span>
                <button
                  type="button"
                  onClick={() => setSelectedProjectFilters(prev => prev.filter(x => x !== p))}
                  className="hover:text-rose-500 cursor-pointer p-0.5"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}

            {/* Work Package Badges */}
            {selectedPackageFilters.map(pkg => (
              <span
                key={`pkg-${pkg}`}
                className="px-2 py-0.5 rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/30 text-[11px] font-semibold inline-flex items-center gap-1 shadow-2xs"
              >
                <Layers className="h-2.5 w-2.5" />
                <span>{pkg}</span>
                <button
                  type="button"
                  onClick={() => setSelectedPackageFilters(prev => prev.filter(x => x !== pkg))}
                  className="hover:text-rose-500 cursor-pointer p-0.5"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}

            {/* Onboarding Badges */}
            {selectedOnboardingFilters.map(f => (
              <span
                key={`onb-${f}`}
                className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold inline-flex items-center gap-1 shadow-2xs"
              >
                <CheckCircle2 className="h-2.5 w-2.5" />
                <span>{f === "ONBOARD" ? "Onboard" : "Not Onboard"}</span>
                <button
                  type="button"
                  onClick={() => setSelectedOnboardingFilters(prev => prev.filter(x => x !== f))}
                  className="hover:text-rose-500 cursor-pointer p-0.5"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}

            <button
              type="button"
              onClick={handleClearAllFilters}
              className="text-[11px] text-muted-foreground hover:text-rose-500 underline ml-1 cursor-pointer font-medium"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Empty State */}
      {filteredConsultants.length === 0 && (
        <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-surface space-y-3">
          <Users className="h-10 w-10 text-muted-foreground/40 mx-auto" />
          <h4 className="text-sm font-bold text-foreground">No Matching Consultants Found</h4>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            No consultant partners match your current filters. Adjust your filters or click &ldquo;Add Consultant&rdquo; to register a new partner.
          </p>
        </div>
      )}

      {/* Consultant Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredConsultants.map((c) => {
          const isOnboarded = (c.activeProjects && c.activeProjects.length > 0) || c.onboardingStatus === "Onboard";
          return (
            <div 
              key={c.id} 
              className="p-5 rounded-2xl border border-border bg-surface shadow-xs space-y-4 hover:border-purple-500/40 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3.5">
                {/* Card Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-base font-bold text-foreground truncate">{c.name}</h4>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap shrink-0 ${getDisciplineBadge(c.category)}`}>
                        {c.category}
                      </span>
                    </div>

                    {/* Onboarding Status Badge */}
                    <div className="mt-1.5 flex items-center gap-2">
                      {isOnboarded ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1 shadow-2xs">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                          <span>Onboard (Active in {c.activeProjects.length} Projects)</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 inline-flex items-center gap-1 shadow-2xs">
                          <AlertCircle className="h-3 w-3 text-amber-500" />
                          <span>Not Onboard (No Project Tagged)</span>
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                      <span>Lead Contact:</span>
                      <strong className="text-foreground">{c.leadContact}</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-xs border border-amber-500/20">
                      <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                      <span>{c.rating || 5.0}</span>
                    </div>

                    {/* Edit Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(c)}
                      className="h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                      title="Edit consultant & project tags"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>

                    {/* Delete Button */}
                    {onDeleteConsultant && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Remove consultant "${c.name}" from directory?`)) {
                            onDeleteConsultant(c.id);
                          }
                        }}
                        className="h-7 w-7 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 flex items-center justify-center transition-colors cursor-pointer"
                        title="Delete consultant"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Contact Links */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-0.5">
                  <a 
                    href={`mailto:${c.email}`} 
                    className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground truncate"
                  >
                    <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{c.email}</span>
                  </a>
                  <a 
                    href={`tel:${c.phone}`} 
                    className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground whitespace-nowrap"
                  >
                    <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span>{c.phone}</span>
                  </a>
                </div>

                {/* Expertise (Work Package) Multi-Selection Tags */}
                <div className="space-y-1.5 pt-1 border-t border-border">
                  <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                    <Tag className="h-3 w-3 text-purple-500" />
                    <span>Work Package Expertise:</span>
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto custom-scrollbar">
                    {(c.expertise && c.expertise.length > 0) ? (
                      c.expertise.map((exp, idx) => (
                        <span 
                          key={idx}
                          className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20"
                        >
                          {exp}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-muted-foreground italic">No specialized work package tagged</span>
                    )}
                  </div>
                </div>

                {/* Performance Stats */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-border grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Submitted Drawings:</span>
                    <span className="font-mono font-bold text-foreground text-sm">{c.totalDrawingsSubmitted || 0} Sheets</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Average TAT:</span>
                    <span className="font-mono font-bold text-foreground text-sm flex items-center gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span>{c.averageTatDays || 3.0} days</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Tagged Projects Assignment */}
              <div className="pt-3 border-t border-border">
                <span className="text-[11px] font-semibold text-muted-foreground block mb-1.5 flex items-center justify-between">
                  <span>Tagged Projects ({c.activeProjects?.length || 0}):</span>
                  {isOnboarded && (
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      ✓ Project Onboarded
                    </span>
                  )}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(c.activeProjects && c.activeProjects.length > 0) ? (
                    c.activeProjects.map((proj, idx) => (
                      <span 
                        key={idx} 
                        className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 flex items-center gap-1"
                      >
                        <Building className="h-3 w-3 text-blue-500 shrink-0" />
                        <span>{proj}</span>
                      </span>
                    ))
                  ) : (
                    <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                      ⚠️ Not tagged with any project yet. Tag project to onboard.
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Consultant Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-surface border border-border w-full max-w-xl rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  <span>Partner Onboarding & Work Package Tagging</span>
                </span>
                <h3 className="text-base font-bold text-foreground mt-0.5">
                  {editingConsultant ? `Edit Consultant: ${editingConsultant.name}` : "Register New Consultant Partner"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitConsultant} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-foreground mb-1">Consultant Firm / Company Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  aria-label="Consultant Firm or Company Name"
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground font-semibold focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-foreground mb-1">Primary Discipline *</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as DesignDiscipline)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground font-semibold focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    {disciplines.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-foreground mb-1">Lead Contact Person *</label>
                  <input
                    type="text"
                    required
                    value={leadContact}
                    onChange={e => setLeadContact(e.target.value)}
                    aria-label="Lead Contact Person"
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground font-semibold focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-foreground mb-1">Official Email Address *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    aria-label="Official Email Address"
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground font-semibold focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block font-bold text-foreground mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    aria-label="Phone Number"
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground font-semibold focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* 🎯 Multi-Selection: WORK PACKAGES (Assign Packages to Consultant) */}
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <label className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                    <Layers className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <span>WORK PACKAGES (All Selected by Default • Click to Untick / Remove) *</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">
                      {selectedExpertise.length} of {availableWorkPackages.length} selected
                    </span>
                    {availableWorkPackages.length > 0 && (
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setSelectedExpertise([...availableWorkPackages])}
                          className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 font-bold cursor-pointer transition-colors"
                        >
                          Select All
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() => setSelectedExpertise([])}
                          className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 font-medium cursor-pointer transition-colors"
                        >
                          Clear All
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Search / Filter for available work packages if > 4 */}
                {availableWorkPackages.length > 4 && (
                  <div className="relative">
                    <Search className="h-3 w-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <input
                      type="text"
                      value={modalPackageSearch}
                      onChange={e => setModalPackageSearch(e.target.value)}
                      aria-label="Filter available packages"
                      className="w-full pl-7 pr-3 py-1 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                    />
                  </div>
                )}

                {/* Available Work Packages List or Empty Prompt */}
                {availableWorkPackages.length === 0 ? (
                  <div className="p-3 rounded-xl border border-dashed border-border bg-muted/20 text-xs space-y-1">
                    <p className="text-muted-foreground font-medium">
                      No work packages configured in <strong>Work Packages Master</strong> yet.
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      You can type custom package names in the box below to tag this consultant, or configure them in the Work Packages Master tab.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl border border-border bg-muted/20 max-h-36 overflow-y-auto custom-scrollbar">
                    {availableWorkPackages
                      .filter(pkg => !modalPackageSearch.trim() || pkg.toLowerCase().includes(modalPackageSearch.toLowerCase()))
                      .map(pkg => {
                        const isSelected = selectedExpertise.includes(pkg);
                        return (
                          <button
                            key={pkg}
                            type="button"
                            onClick={() => handleToggleExpertise(pkg)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all border flex items-center gap-1.5 ${
                              isSelected
                                ? "bg-purple-600 text-white border-purple-600 shadow-2xs font-bold"
                                : "bg-surface text-muted-foreground border-border hover:text-foreground hover:border-purple-500/40"
                            }`}
                          >
                            {isSelected ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3 text-muted-foreground" />}
                            <span>{pkg}</span>
                          </button>
                        );
                      })}
                  </div>
                )}

                {/* Selected Work Packages Chips Preview (if custom or selected) */}
                {selectedExpertise.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <span className="text-[11px] font-bold text-muted-foreground block">
                      Assigned Work Packages ({selectedExpertise.length}):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedExpertise.map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/30 flex items-center gap-1 shadow-2xs"
                        >
                          <span>{tag}</span>
                          <button
                            type="button"
                            onClick={() => handleToggleExpertise(tag)}
                            className="text-muted-foreground hover:text-rose-500 p-0.5 cursor-pointer"
                            title="Remove tag"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Custom Work Package Tag Input */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={customExpertiseInput}
                    onChange={e => setCustomExpertiseInput(e.target.value)}
                    onKeyDown={handleAddCustomExpertise}
                    aria-label="Add custom work package tag"
                    className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomExpertise}
                    className="px-3 py-1.5 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-500 cursor-pointer shadow-2xs"
                  >
                    Add Tag
                  </button>
                </div>
              </div>

              {/* 🏢 Multi-Selection: Project Tagging & Onboarding Lifecycle */}
              <div className="space-y-1.5 pt-1 border-t border-border">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <label className="font-bold text-foreground flex items-center gap-1.5">
                    <Building className="h-3.5 w-3.5 text-blue-500" />
                    <span>Tag with Projects (Multi-Select):</span>
                  </label>
                  <div className="flex items-center gap-2">
                    {availableProjects.length > 0 && (
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setSelectedProjects([...availableProjects])}
                          className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-medium"
                        >
                          Select All
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() => setSelectedProjects([])}
                          className="text-muted-foreground hover:text-rose-500 cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    )}
                    {selectedProjects.length > 0 ? (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                        ✓ Status: Onboard ({selectedProjects.length})
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                        ⚠️ Status: Not Onboard
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Once tagged to one or more development projects, consultant onboarding will automatically become <strong>Onboard</strong>.
                </p>

                <div className="flex flex-wrap gap-2 p-2.5 rounded-xl border border-border bg-muted/20 max-h-32 overflow-y-auto custom-scrollbar">
                  {availableProjects.map((proj) => {
                    const isSelected = selectedProjects.includes(proj);
                    return (
                      <button
                        key={proj}
                        type="button"
                        onClick={() => handleToggleProject(proj)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all border flex items-center gap-1.5 ${
                          isSelected
                            ? "bg-blue-600 text-white border-blue-600 shadow-2xs font-bold"
                            : "bg-surface text-muted-foreground border-border hover:text-foreground"
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                        <span>{proj}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Expected TAT & Quality Rating */}
              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border">
                <div>
                  <label className="block font-bold text-foreground mb-1">Expected TAT (Days)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.5"
                    value={tatDays}
                    onChange={e => setTatDays(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground font-mono focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block font-bold text-foreground mb-1">Quality Rating (1 to 5)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1.0"
                    max="5.0"
                    value={rating}
                    onChange={e => setRating(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground font-mono focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border bg-background hover:bg-muted text-foreground text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md cursor-pointer transition-all active:scale-95"
                >
                  {editingConsultant ? "Update Consultant" : "Register & Onboard Consultant"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

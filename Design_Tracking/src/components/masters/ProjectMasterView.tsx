"use client";

import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { toast } from "react-toastify";
import { 
  DesignMasterStore 
} from "../../services/designMasterStore";
import { ProjectMaster, EntityDependencyReport, TowerMaster } from "../../types/masterTypes";
import { 
  Building2,
  Upload, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  SlidersHorizontal, 
  Check, 
  X, 
  ShieldCheck, 
  Users, 
  Tag, 
  CheckSquare, 
  Square,
  Calendar,
  Layers,
  MapPin,
  Sparkles,
  AlertCircle
} from "lucide-react";
import { DeleteDependencyModal } from "../DeleteDependencyModal";
import { MasterBulkImportModal } from "./MasterBulkImportModal";
import { TransactionFormLayout } from "../DesignTransactionLayout";

interface ProjectMasterViewProps {
  onSelectProject?: (project: ProjectMaster) => void;
  onNavigateToSubProjects?: (projectId: string) => void;
}

const PROJECT_TYPE_OPTIONS = [
  "Residential High-Rise",
  "Luxury Residential",
  "Commercial Office",
  "Mixed-Use Development",
  "Township",
  "SRA / Redevelopment",
  "Hospitality",
  "Infrastructure & Utilities"
];

const PROJECT_STATUS_OPTIONS = [
  "Planning & Design",
  "Statutory Approvals",
  "Tendering",
  "Under Construction",
  "Finishing & Handover",
  "Completed"
];

export const ProjectMasterView: React.FC<ProjectMasterViewProps> = ({ onNavigateToSubProjects }) => {
  const [mounted, setMounted] = useState(false);
  const store = DesignMasterStore.getState();
  // Filter ONLY main / parent projects (no subprojects mixed in)
  const projects = (store.projects || []).filter(p => !p.isSubProject);
  const consultants = store.consultants || [];
  const categories = DesignMasterStore.getCategories();

  useEffect(() => {
    setMounted(true);
  }, []);
  const allTowers = store.towers || [];

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("ALL");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState("ALL");

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectMaster | null>(null);

  // Form states
  const [projectName, setProjectName] = useState("");
  const [projectCode, setProjectCode] = useState("");
  const [location, setLocation] = useState("Mumbai MMR");
  const [projectType, setProjectType] = useState("Residential High-Rise");
  const [projectStatus, setProjectStatus] = useState("Planning & Design");
  const [plotArea, setPlotArea] = useState("");
  const [builtUpArea, setBuiltUpArea] = useState("");
  const [estimatedBudget, setEstimatedBudget] = useState("");
  const [reraNumber, setReraNumber] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [leadManager, setLeadManager] = useState("");
  const [leadManagerEmail, setLeadManagerEmail] = useState("");
  const [description, setDescription] = useState("");

  // Consultant & Category mapping states
  const [selectedConsultants, setSelectedConsultants] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [consultantSearch, setConsultantSearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [showAllMasterCategories, setShowAllMasterCategories] = useState(false);
  const [formTab, setFormTab] = useState<"SPECS" | "CONSULTANTS_CATEGORIES">("SPECS");
  const [formError, setFormError] = useState("");

  // Delete modal states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteReport, setDeleteReport] = useState<EntityDependencyReport | null>(null);
  const [projectToDeleteId, setProjectToDeleteId] = useState<string | null>(null);

  const handleOpenAdd = () => {
    setEditingProject(null);
    setProjectName("");
    setProjectCode("");
    setLocation("Mumbai MMR");
    setProjectType("Residential High-Rise");
    setProjectStatus("Planning & Design");
    setPlotArea("");
    setBuiltUpArea("");
    setEstimatedBudget("");
    setReraNumber("");
    setTargetDate("");
    setLeadManager("");
    setLeadManagerEmail("");
    setDescription("");
    // Start with empty selections - user chooses consultants, which then populate categories
    setSelectedConsultants([]);
    setSelectedCategories([]);
    setShowAllMasterCategories(false);
    setConsultantSearch("");
    setCategorySearch("");
    setFormTab("SPECS");
    setFormError("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: ProjectMaster) => {
    setEditingProject(p);
    setProjectName(p.name);
    setProjectCode(p.code);
    setLocation(p.location || "Mumbai MMR");
    setProjectType(p.projectType || "Residential High-Rise");
    setProjectStatus(p.projectStatus || "Planning & Design");
    setPlotArea(p.plotArea || "");
    setBuiltUpArea(p.builtUpArea || "");
    setEstimatedBudget(p.estimatedBudget || "");
    setReraNumber(p.reraNumber || "");
    setTargetDate(p.targetCompletionDate || "");
    setLeadManager(p.leadManager || "");
    setLeadManagerEmail(p.leadManagerEmail || "");
    setDescription(p.description || "");
    
    const taggedCons = p.taggedConsultants || [];
    setSelectedConsultants(taggedCons);

    const taggedCats = p.taggedCategories || p.subProjectCategories?.default || [];
    setSelectedCategories(taggedCats);
    setShowAllMasterCategories(false);

    setConsultantSearch("");
    setCategorySearch("");
    setFormTab("SPECS");
    setFormError("");
    setIsModalOpen(true);
  };

  // Consultant selection helpers
  const handleToggleConsultant = (consName: string) => {
    const isAdding = !selectedConsultants.includes(consName);
    const updatedCons = isAdding 
      ? [...selectedConsultants, consName] 
      : selectedConsultants.filter(c => c !== consName);
    setSelectedConsultants(updatedCons);

    if (isAdding) {
      // Auto-surface mapped categories from this selected consultant
      const addedCats = DesignMasterStore.getCategoriesForConsultants([consName]);
      setSelectedCategories(prev => Array.from(new Set([...prev, ...addedCats])));
    } else {
      // Remove categories that belonged exclusively to the removed consultant
      if (updatedCons.length === 0 && !showAllMasterCategories) {
        setSelectedCategories([]);
      } else {
        const remainingCats = new Set(DesignMasterStore.getCategoriesForConsultants(updatedCons));
        setSelectedCategories(prev => prev.filter(cat => remainingCats.has(cat)));
      }
    }
  };

  const handleSelectAllConsultants = () => {
    const allConsNames = consultants.map(c => c.name);
    setSelectedConsultants(allConsNames);
    const allMappedCats = DesignMasterStore.getCategoriesForConsultants(allConsNames);
    setSelectedCategories(allMappedCats);
  };

  const handleRemoveAllConsultants = () => {
    setSelectedConsultants([]);
    if (!showAllMasterCategories) {
      setSelectedCategories([]);
    }
  };

  // Category selection helpers
  const handleToggleCategory = (catName: string) => {
    setSelectedCategories(prev => 
      prev.includes(catName) ? prev.filter(c => c !== catName) : [...prev, catName]
    );
  };

  const handleSelectAllCategories = (targetCategories: string[]) => {
    setSelectedCategories(Array.from(new Set(targetCategories)));
  };

  const handleRemoveAllCategories = () => {
    setSelectedCategories([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) {
      setFormError("Project Name is required.");
      toast.error("Project Name is required.");
      return;
    }

    const cleanCode = projectCode.trim().toUpperCase() || `CDK-${projectName.trim().slice(0, 3).toUpperCase()}`;

    if (editingProject) {
      DesignMasterStore.updateProject(editingProject.id, {
        name: projectName.trim(),
        code: cleanCode,
        location: location.trim(),
        projectType,
        projectStatus,
        plotArea: plotArea.trim() || undefined,
        builtUpArea: builtUpArea.trim() || undefined,
        estimatedBudget: estimatedBudget.trim() || undefined,
        reraNumber: reraNumber.trim() || undefined,
        targetCompletionDate: targetDate.trim() || undefined,
        leadManager: leadManager.trim() || undefined,
        leadManagerEmail: leadManagerEmail.trim() || undefined,
        description: description.trim() || undefined,
        taggedConsultants: selectedConsultants,
        taggedCategories: selectedCategories,
        subProjectCategories: { default: selectedCategories }
      });
      toast.success(`Project "${projectName.trim()}" updated successfully!`);
    } else {
      DesignMasterStore.addProject({
        name: projectName.trim(),
        code: cleanCode,
        location: location.trim(),
        projectType,
        projectStatus,
        plotArea: plotArea.trim() || undefined,
        builtUpArea: builtUpArea.trim() || undefined,
        estimatedBudget: estimatedBudget.trim() || undefined,
        reraNumber: reraNumber.trim() || undefined,
        targetCompletionDate: targetDate.trim() || undefined,
        leadManager: leadManager.trim() || undefined,
        leadManagerEmail: leadManagerEmail.trim() || undefined,
        description: description.trim() || undefined,
        taggedConsultants: selectedConsultants,
        taggedCategories: selectedCategories,
        isSubProject: false,
        subProjectCategories: { default: selectedCategories }
      });
      toast.success(`Project "${projectName.trim()}" created successfully!`);
    }

    setIsModalOpen(false);
    setEditingProject(null);
  };

  const handleTriggerDelete = (p: ProjectMaster) => {
    const report = DesignMasterStore.getEntityDependencies("PROJECT", p.id);
    setDeleteReport(report);
    setProjectToDeleteId(p.id);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = (reason: string) => {
    if (projectToDeleteId) {
      const proj = projects.find(p => p.id === projectToDeleteId);
      DesignMasterStore.deleteProject(projectToDeleteId, reason, "Design Lead");
      toast.success(`Project "${proj?.name || "Selected"}" deleted successfully.`);
      setIsDeleteModalOpen(false);
      setProjectToDeleteId(null);
    }
  };

  // Filtered projects
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      if (selectedStatusFilter !== "ALL" && p.projectStatus !== selectedStatusFilter) return false;
      if (selectedTypeFilter !== "ALL" && p.projectType !== selectedTypeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchCode = p.code.toLowerCase().includes(q);
        const matchLoc = (p.location || "").toLowerCase().includes(q);
        const matchRera = (p.reraNumber || "").toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchLoc && !matchRera) return false;
      }
      return true;
    });
  }, [projects, selectedStatusFilter, selectedTypeFilter, searchQuery]);

  // Filtered lists in modal
  const filteredModalConsultants = useMemo(() => {
    if (!consultantSearch.trim()) return consultants;
    const q = consultantSearch.toLowerCase();
    return consultants.filter(c => 
      c.name.toLowerCase().includes(q) ||
      (c.leadContact || "").toLowerCase().includes(q) ||
      (c.categories || []).some(cat => cat.toLowerCase().includes(q))
    );
  }, [consultants, consultantSearch]);

  // Categories derived from selected consultants
  const consultantMappedCategories = useMemo(() => {
    if (selectedConsultants.length === 0) return [];
    return DesignMasterStore.getCategoriesForConsultants(selectedConsultants);
  }, [selectedConsultants, consultants]);

  const availableCategoriesList = useMemo(() => {
    if (showAllMasterCategories) {
      return categories;
    }
    if (selectedConsultants.length === 0) {
      return [];
    }
    return categories.filter(c => consultantMappedCategories.includes(c.name));
  }, [showAllMasterCategories, selectedConsultants, consultantMappedCategories, categories]);

  const filteredModalCategories = useMemo(() => {
    if (!categorySearch.trim()) return availableCategoriesList;
    const q = categorySearch.toLowerCase();
    return availableCategoriesList.filter(c => 
      c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [availableCategoriesList, categorySearch]);

  return (
    <div className="w-full space-y-4 animate-in fade-in duration-150">
      {!isModalOpen && (
        <div className="space-y-4">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 shrink-0">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-foreground">
              Project Master (Parent Development Projects)
            </h3>
            
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl border border-border bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 text-foreground text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all shrink-0 whitespace-nowrap"
          >
            <Upload className="h-3.5 w-3.5 text-emerald-600" />
            <span>Import Projects (Excel)</span>
          </button>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-md cursor-pointer transition-all shrink-0 whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Project</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-surface border border-border flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground block">Parent Projects</span>
            <span className="text-lg font-black text-foreground">{projects.length}</span>
          </div>
          <Building2 className="h-4 w-4 text-emerald-500" />
        </div>
        <div className="p-3 rounded-xl bg-surface border border-border flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground block">Total Sub-Projects / Wings</span>
            <span className="text-lg font-black text-purple-600 dark:text-purple-400">
              {allTowers.length}
            </span>
          </div>
          <Layers className="h-4 w-4 text-purple-500" />
        </div>
        <div className="p-3 rounded-xl bg-surface border border-border flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground block">Registered Consultants</span>
            <span className="text-lg font-black text-blue-600 dark:text-blue-400">
              {consultants.length}
            </span>
          </div>
          <Users className="h-4 w-4 text-blue-500" />
        </div>
        <div className="p-3 rounded-xl bg-surface border border-border flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground block">Active Packages</span>
            <span className="text-lg font-black text-amber-600 dark:text-amber-400">
              {categories.length}
            </span>
          </div>
          <Tag className="h-4 w-4 text-amber-500" />
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="p-3 rounded-2xl border border-border bg-surface shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
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

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <select
              value={selectedStatusFilter}
              onChange={e => setSelectedStatusFilter(e.target.value)}
              className="px-2.5 py-1 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-hidden"
            >
              <option value="ALL">All Statuses</option>
              {PROJECT_STATUS_OPTIONS.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>

            <select
              value={selectedTypeFilter}
              onChange={e => setSelectedTypeFilter(e.target.value)}
              className="px-2.5 py-1 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-hidden"
            >
              <option value="ALL">All Types</option>
              {PROJECT_TYPE_OPTIONS.map(tp => (
                <option key={tp} value={tp}>{tp}</option>
              ))}
            </select>

            <div className="text-xs text-muted-foreground font-medium pl-2 border-l border-border">
              <strong>{filteredProjects.length}</strong> of {projects.length}
            </div>
          </div>
        </div>
      </div>

      {/* Projects Cards Grid */}
      {filteredProjects.length === 0 ? (
        <div className="p-8 rounded-2xl border border-dashed border-border bg-surface text-center space-y-3">
          <div className="h-10 w-10 mx-auto rounded-xl bg-muted text-muted-foreground flex items-center justify-center">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h5 className="text-sm font-bold text-foreground">No Projects Found</h5>
            <p className="text-xs text-muted-foreground mt-0.5">
              {searchQuery || selectedStatusFilter !== "ALL"
                ? "Try adjusting your search query or filter options."
                : "Register your parent real estate development projects and map consultants."}
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create First Project</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4 w-full">
          {filteredProjects.map(proj => {
            const projTowers = allTowers.filter(t => t.projectId === proj.id);
            const taggedCons = proj.taggedConsultants || [];
            const taggedCats = proj.taggedCategories || proj.subProjectCategories?.default || [];

            return (
              <div
                key={proj.id}
                className="p-5 rounded-2xl border border-border bg-surface shadow-xs space-y-4 flex flex-col justify-between hover:border-emerald-500/40 transition-all"
              >
                <div className="space-y-3.5">
                  {/* Top: Code, Type, Status, Actions */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 whitespace-nowrap">
                          {proj.code}
                        </span>
                        {proj.projectType && (
                          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 whitespace-nowrap">
                            {proj.projectType}
                          </span>
                        )}
                        {proj.projectStatus && (
                          <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 whitespace-nowrap">
                            {proj.projectStatus}
                          </span>
                        )}
                      </div>
                      <h4 className="text-base font-black text-foreground mt-1 truncate">
                        {proj.name}
                      </h4>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span>{proj.location}</span>
                        {proj.reraNumber && (
                          <>
                            <span>•</span>
                            <span className="font-mono text-[11px]">RERA: {proj.reraNumber}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(proj)}
                        className="h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                        title="Edit Project Specs & Mappings"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTriggerDelete(proj)}
                        className="h-7 w-7 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 flex items-center justify-center transition-colors cursor-pointer"
                        title="Delete Project & Cascade"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Project Specs Grid */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-border grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                    {proj.builtUpArea && (
                      <div>
                        <span className="text-[10px] text-muted-foreground block font-medium">Built-Up Area:</span>
                        <span className="font-bold text-foreground">{proj.builtUpArea}</span>
                      </div>
                    )}
                    {proj.plotArea && (
                      <div>
                        <span className="text-[10px] text-muted-foreground block font-medium">Plot Area:</span>
                        <span className="font-bold text-foreground">{proj.plotArea}</span>
                      </div>
                    )}
                    {proj.estimatedBudget && (
                      <div>
                        <span className="text-[10px] text-muted-foreground block font-medium">Budget:</span>
                        <span className="font-bold text-foreground">{proj.estimatedBudget}</span>
                      </div>
                    )}
                    {proj.targetCompletionDate && (
                      <div>
                        <span className="text-[10px] text-muted-foreground block font-medium">Target Handover:</span>
                        <span className="font-bold text-foreground">{proj.targetCompletionDate}</span>
                      </div>
                    )}
                    {proj.leadManager && (
                      <div className="col-span-2">
                        <span className="text-[10px] text-muted-foreground block font-medium">Lead Manager:</span>
                        <span className="font-bold text-foreground truncate block">{proj.leadManager}</span>
                      </div>
                    )}
                  </div>

                  {/* Tagged Consultants & Packages Summary */}
                  <div className="space-y-2 pt-1 border-t border-border text-xs">
                    {/* Consultants */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                          <Users className="h-3 w-3 text-purple-500" />
                          <span>Mapped Consultants ({taggedCons.length}):</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            handleOpenEdit(proj);
                            setFormTab("CONSULTANTS_CATEGORIES");
                          }}
                          className="text-[10px] text-purple-600 dark:text-purple-400 hover:underline font-semibold cursor-pointer"
                        >
                          Manage
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto custom-scrollbar">
                        {taggedCons.length > 0 ? (
                          taggedCons.map((consName, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20"
                            >
                              {consName}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-muted-foreground italic">
                            No consultants mapped yet.
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Categories */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                          <Tag className="h-3 w-3 text-blue-500" />
                          <span>Tagged Packages ({taggedCats.length}):</span>
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 max-h-14 overflow-y-auto custom-scrollbar">
                        {taggedCats.map((catName, idx) => (
                          <span
                            key={idx}
                            className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20"
                          >
                            {catName}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Footer: Sub-Projects Link */}
                <div className="pt-3 border-t border-border flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-emerald-500" />
                    <span>{projTowers.length} Sub-Project Wing{projTowers.length !== 1 ? "s" : ""}</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => onNavigateToSubProjects ? onNavigateToSubProjects(proj.id) : handleOpenEdit(proj)}
                    className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-bold cursor-pointer"
                  >
                    View Wings →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

        </div>
      )}

      {/* Add / Edit Project Transaction Form Layout (Attached directly to sidebar) */}
      {isModalOpen && (
        <TransactionFormLayout
          title={editingProject ? `Edit Project: ${projectName || editingProject.name}` : "Create New Project Master"}
          icon={Building2}
          description="Configure specifications, map consultant partners, and define package scopes"
          onBack={() => setIsModalOpen(false)}
          backLabel="Back to Projects"
          breadcrumbs={[
            { label: "Design Masters", onClick: () => setIsModalOpen(false) },
            { label: "Project Master", onClick: () => setIsModalOpen(false) },
            { label: editingProject ? (projectName || editingProject.name) : "Create Project" }
          ]}
          onSave={handleSubmit}
          saveLabel={editingProject ? "Save Project" : "Create Project"}
          onReset={editingProject ? () => handleOpenEdit(editingProject) : handleOpenAdd}
        >
          <div className="space-y-6">
            {/* Sub Tabs Inside Form */}
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <button
                type="button"
                onClick={() => setFormTab("SPECS")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  formTab === "SPECS"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground bg-muted/40"
                }`}
              >
                <Building2 className="h-4 w-4" />
                <span>1. Project Specs</span>
              </button>
              <button
                type="button"
                onClick={() => setFormTab("CONSULTANTS_CATEGORIES")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  formTab === "CONSULTANTS_CATEGORIES"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground bg-muted/40"
                }`}
              >
                <Users className="h-4 w-4" />
                <span>2. Map Consultants & Packages ({selectedConsultants.length} Cons / {selectedCategories.length} Pkgs)</span>
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {formTab === "SPECS" && (
                <div className="space-y-4">
                  {/* Project Name & Code */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-xs font-bold text-foreground">
                        Project Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={projectName}
                        onChange={e => setProjectName(e.target.value)}
                        required
                        className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-foreground">
                        Project Code
                      </label>
                      <input
                        type="text"
                        value={projectCode}
                        onChange={e => setProjectCode(e.target.value.toUpperCase())}
                        className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Location, Type, Status */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-foreground">
                        Location / Micro-Market
                      </label>
                      <input
                        type="text"
                        value={location}
                        onChange={e => setLocation(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-foreground">
                        Project Type
                      </label>
                      <select
                        value={projectType}
                        onChange={e => setProjectType(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-hidden"
                      >
                        {PROJECT_TYPE_OPTIONS.map(tp => (
                          <option key={tp} value={tp}>{tp}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-foreground">
                        Project Lifecycle Status
                      </label>
                      <select
                        value={projectStatus}
                        onChange={e => setProjectStatus(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-hidden"
                      >
                        {PROJECT_STATUS_OPTIONS.map(st => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Areas, Budget, RERA */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-foreground">
                        Built-Up Area
                      </label>
                      <input
                        type="text"
                        value={builtUpArea}
                        onChange={e => setBuiltUpArea(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-foreground">
                        Plot Area
                      </label>
                      <input
                        type="text"
                        value={plotArea}
                        onChange={e => setPlotArea(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-foreground">
                        Estimated Budget
                      </label>
                      <input
                        type="text"
                        value={estimatedBudget}
                        onChange={e => setEstimatedBudget(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-foreground">
                        MahaRERA Number
                      </label>
                      <input
                        type="text"
                        value={reraNumber}
                        onChange={e => setReraNumber(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Target Date, Lead Manager */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-foreground">
                        Target Completion Date
                      </label>
                      <input
                        type="date"
                        value={targetDate}
                        onChange={e => setTargetDate(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-foreground">
                        Lead Design Manager
                      </label>
                      <input
                        type="text"
                        value={leadManager}
                        onChange={e => setLeadManager(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-foreground">
                        Manager Email
                      </label>
                      <input
                        type="email"
                        value={leadManagerEmail}
                        onChange={e => setLeadManagerEmail(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground">
                      Project Scope & Description
                    </label>
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              )}

              {/* 🤝 CONSULTANT & PACKAGE MAPPING SECTION (2-COLUMN WIDE GRID) */}
              {formTab === "CONSULTANTS_CATEGORIES" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Column 1: Consultants Mapping */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-border space-y-3 flex flex-col justify-between">
                    <div className="space-y-2.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <Users className="h-4 w-4 text-purple-500" />
                          <label className="text-xs font-bold text-foreground">
                            Map Consultant Partners
                          </label>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold">
                            {selectedConsultants.length} of {consultants.length} Selected
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={handleSelectAllConsultants}
                            className="px-2 py-1 rounded-lg text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 transition-colors cursor-pointer inline-flex items-center gap-1"
                          >
                            <CheckSquare className="h-3 w-3" />
                            <span>Select All</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleRemoveAllConsultants}
                            className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-500/10 text-slate-600 dark:text-slate-400 hover:bg-slate-500/20 transition-colors cursor-pointer inline-flex items-center gap-1"
                          >
                            <Square className="h-3 w-3" />
                            <span>Remove All</span>
                          </button>
                        </div>
                      </div>

                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                        <input
                          type="text"
                          value={consultantSearch}
                          onChange={e => setConsultantSearch(e.target.value)}
                          className="w-full pl-7 pr-3 py-1.5 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                        />
                      </div>

                      {/* Consultant Selection List */}
                      <div className="space-y-1.5 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                        {filteredModalConsultants.length === 0 ? (
                          <div className="p-4 text-center text-xs text-muted-foreground italic">
                            No consultants found matching search.
                          </div>
                        ) : (
                          filteredModalConsultants.map(c => {
                            const isSelected = selectedConsultants.includes(c.name);
                            const cCats = c.categories || (c.category ? [c.category as string] : []);
                            return (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => handleToggleConsultant(c.name)}
                                className={`w-full p-2.5 rounded-xl text-left text-xs border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                                  isSelected
                                    ? "bg-purple-50 dark:bg-purple-950/40 border-purple-500/60 text-purple-900 dark:text-purple-100 font-bold shadow-2xs"
                                    : "bg-background border-border text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
                                }`}
                              >
                                <div className="min-w-0">
                                  <div className="truncate font-semibold text-foreground">{c.name}</div>
                                  <div className="text-[10px] text-muted-foreground truncate font-normal mt-0.5">
                                    {cCats.length > 0 ? cCats.join(" • ") : "No packages defined"}
                                  </div>
                                </div>
                                <div className={`h-4 w-4 rounded flex items-center justify-center shrink-0 border ${
                                  isSelected
                                    ? "bg-purple-600 border-purple-600 text-white"
                                    : "border-border bg-background"
                                }`}>
                                  {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Tagged Packages Scope Mapping */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-border space-y-3 flex flex-col justify-between">
                    <div className="space-y-2.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <Tag className="h-4 w-4 text-blue-500" />
                          <label className="text-xs font-bold text-foreground">
                            Tagged Packages Scope
                          </label>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 font-bold">
                            {selectedCategories.length} of {availableCategoriesList.length} Selected
                          </span>
                        </div>

                        {availableCategoriesList.length > 0 && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleSelectAllCategories(availableCategoriesList.map(c => c.name))}
                              className="px-2 py-1 rounded-lg text-[10px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 hover:bg-blue-500/20 transition-colors cursor-pointer inline-flex items-center gap-1"
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
                        )}
                      </div>

                      {availableCategoriesList.length > 0 && (
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                          <input
                            type="text"
                            value={categorySearch}
                            onChange={e => setCategorySearch(e.target.value)}
                            className="w-full pl-7 pr-3 py-1.5 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      )}

                      {/* Empty State when no consultants selected */}
                      {selectedConsultants.length === 0 && !showAllMasterCategories ? (
                        <div className="p-8 rounded-2xl border border-dashed border-border bg-background/50 text-center space-y-2.5 my-4">
                          <div className="h-10 w-10 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                            <Tag className="h-5 w-5" />
                          </div>
                          <h4 className="text-xs font-bold text-foreground">No Consultants Selected Yet</h4>
                          <p className="text-[11px] text-muted-foreground max-w-xs mx-auto leading-relaxed">
                            Select one or more consultant partners on the left to auto-load their mapped packages here.
                          </p>
                          <button
                            type="button"
                            onClick={() => setShowAllMasterCategories(true)}
                            className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer pt-1 inline-block"
                          >
                            Or browse all {categories.length} Package Master packages →
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1.5 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                          {filteredModalCategories.length === 0 ? (
                            <div className="p-4 text-center text-xs text-muted-foreground italic">
                              No packages found matching search.
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {filteredModalCategories.map(cat => {
                                const isSelected = selectedCategories.includes(cat.name);
                                return (
                                  <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => handleToggleCategory(cat.name)}
                                    className={`p-2 rounded-xl text-left text-xs border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                                      isSelected
                                        ? "bg-blue-50 dark:bg-blue-950/40 border-blue-500/60 text-blue-900 dark:text-blue-100 font-bold shadow-2xs"
                                        : "bg-background border-border text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
                                    }`}
                                  >
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span className="text-sm shrink-0">{cat.icon || "📁"}</span>
                                      <span className="truncate font-semibold">{cat.name}</span>
                                    </div>
                                    <div className={`h-4 w-4 rounded flex items-center justify-center shrink-0 border ${
                                      isSelected
                                        ? "bg-blue-600 border-blue-600 text-white"
                                        : "border-border bg-background"
                                    }`}>
                                      {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Mode Toggle Footer */}
                    <div className="pt-2 border-t border-border flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">
                        {showAllMasterCategories ? "Viewing all Master packages" : "Filtered by selected consultants"}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowAllMasterCategories(!showAllMasterCategories)}
                        className="text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
                      >
                        {showAllMasterCategories ? "Filter by selected consultants" : "View all master packages"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom Form Action Buttons */}
              <div className="pt-4 border-t border-border flex items-center justify-between gap-3">
                <div className="text-xs text-muted-foreground">
                  {formTab === "SPECS" ? (
                    <button
                      type="button"
                      onClick={() => setFormTab("CONSULTANTS_CATEGORIES")}
                      className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
                    >
                      Next: Map Consultants & Packages →
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setFormTab("SPECS")}
                      className="text-muted-foreground font-semibold hover:underline cursor-pointer"
                    >
                      ← Back to Specs
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-border bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-foreground cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md cursor-pointer transition-all"
                  >
                    {editingProject ? "Save Changes" : "Create Project"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </TransactionFormLayout>
      )}

      {/* Delete Dependency Safety Modal */}
      <DeleteDependencyModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setProjectToDeleteId(null);
        }}
        report={deleteReport}
        onConfirmDelete={handleConfirmDelete}
      />

      <MasterBulkImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        initialMasterType="PROJECTS"
      />
    </div>
  );
};

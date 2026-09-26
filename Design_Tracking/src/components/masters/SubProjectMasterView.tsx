"use client";

import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { toast } from "react-toastify";
import { 
  DesignMasterStore 
} from "../../services/designMasterStore";
import { TowerMaster, ProjectMaster, EntityDependencyReport, SubProjectMaster } from "../../types/masterTypes";
import { 
  Layers,
  Upload, 
  Building2, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  SlidersHorizontal, 
  Users, 
  Tag, 
  CheckSquare, 
  Square, 
  Sparkles, 
  AlertCircle,
  Building,
  RotateCcw
} from "lucide-react";
import { DeleteDependencyModal } from "../DeleteDependencyModal";
import { MasterBulkImportModal } from "./MasterBulkImportModal";
import { TransactionFormLayout } from "../DesignTransactionLayout";

interface SubProjectMasterViewProps {
  initialParentProjectId?: string;
}

const TOWER_TYPE_OPTIONS: Array<TowerMaster["towerType"]> = [
  "Sale",
  "Society",
  "Commercial",
  "Rehab / SRA",
  "PTC / Hostel",
  "Plot / Infrastructure"
];

export const SubProjectMasterView: React.FC<SubProjectMasterViewProps> = ({ initialParentProjectId }) => {
  const [mounted, setMounted] = useState(false);
  const store = DesignMasterStore.getState();
  const projects = (store.projects || []).filter(p => !p.isSubProject);
  const subProjects = DesignMasterStore.getSubProjects();
  const consultants = store.consultants || [];
  const categories = DesignMasterStore.getCategories();

  useEffect(() => {
    setMounted(true);
  }, []);

  const [selectedParentProjectFilter, setSelectedParentProjectFilter] = useState<string>(
    initialParentProjectId || "ALL"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState("ALL");

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingSubProject, setEditingSubProject] = useState<SubProjectMaster | null>(null);

  // Form states
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id || "");
  const [subProjectName, setSubProjectName] = useState("");
  const [subProjectCode, setSubProjectCode] = useState("");
  const [towerType, setTowerType] = useState<TowerMaster["towerType"]>("Sale");
  const [totalFloors, setTotalFloors] = useState("");
  const [heightMeters, setHeightMeters] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [description, setDescription] = useState("");

  // Consultant & Category mappings
  const [selectedConsultants, setSelectedConsultants] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [consultantSearch, setConsultantSearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [showAllMasterCategories, setShowAllMasterCategories] = useState(false);
  const [formTab, setFormTab] = useState<"SPECS" | "MAPPINGS">("SPECS");
  const [formError, setFormError] = useState("");

  // Delete modal states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteReport, setDeleteReport] = useState<EntityDependencyReport | null>(null);
  const [subProjectToDeleteId, setSubProjectToDeleteId] = useState<string | null>(null);

  const handleOpenAdd = (defaultProjectId?: string) => {
    setEditingSubProject(null);
    const pId = defaultProjectId || (selectedParentProjectFilter !== "ALL" ? selectedParentProjectFilter : projects[0]?.id || "");
    setSelectedProjectId(pId);
    setSubProjectName("");
    setSubProjectCode("");
    setTowerType("Sale");
    setTotalFloors("");
    setHeightMeters("");
    setTargetDate("");
    setDescription("");
    
    // Start with empty mappings - user can click "Inherit from Parent Project" or map manually
    setSelectedConsultants([]);
    setSelectedCategories([]);
    setShowAllMasterCategories(false);

    setConsultantSearch("");
    setCategorySearch("");
    setFormTab("SPECS");
    setFormError("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (twr: SubProjectMaster) => {
    setEditingSubProject(twr);
    setSelectedProjectId(twr.projectId);
    setSubProjectName(twr.towerName);
    setSubProjectCode(twr.subProjectCode || "");
    setTowerType(twr.towerType);
    setTotalFloors(twr.totalFloors?.toString() || "");
    setHeightMeters(twr.heightMeters?.toString() || "");
    setTargetDate(twr.targetCompletionDate || "");
    setDescription(twr.description || "");

    const taggedCons = twr.taggedConsultants || [];
    setSelectedConsultants(taggedCons);

    const taggedCats = twr.taggedCategories || [];
    setSelectedCategories(taggedCats);
    setShowAllMasterCategories(false);

    setConsultantSearch("");
    setCategorySearch("");
    setFormTab("SPECS");
    setFormError("");
    setIsModalOpen(true);
  };

  // Inherit shortcut from parent project
  const handleInheritFromParent = () => {
    const parent = projects.find(p => p.id === selectedProjectId);
    if (parent) {
      if (parent.taggedConsultants && parent.taggedConsultants.length > 0) {
        setSelectedConsultants([...parent.taggedConsultants]);
      }
      if (parent.taggedCategories && parent.taggedCategories.length > 0) {
        setSelectedCategories([...parent.taggedCategories]);
      }
    }
  };

  // Consultant selection helpers
  const handleToggleConsultant = (consName: string) => {
    const isAdding = !selectedConsultants.includes(consName);
    const updatedCons = isAdding
      ? [...selectedConsultants, consName]
      : selectedConsultants.filter(c => c !== consName);
    setSelectedConsultants(updatedCons);

    if (isAdding) {
      const addedCats = DesignMasterStore.getCategoriesForConsultants([consName]);
      setSelectedCategories(prev => Array.from(new Set([...prev, ...addedCats])));
    } else {
      if (updatedCons.length === 0 && !showAllMasterCategories) {
        setSelectedCategories([]);
      } else {
        const remainingCats = new Set(DesignMasterStore.getCategoriesForConsultants(updatedCons));
        setSelectedCategories(prev => prev.filter(cat => remainingCats.has(cat)));
      }
    }
  };

  const handleSelectAllConsultants = () => {
    const allCons = consultants.map(c => c.name);
    setSelectedConsultants(allCons);
    const allConsCats = DesignMasterStore.getCategoriesForConsultants(allCons);
    setSelectedCategories(allConsCats);
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
    if (!subProjectName.trim()) {
      setFormError("Sub-Project / Wing Name is required.");
      toast.error("Sub-Project / Wing Name is required.");
      return;
    }
    if (!selectedProjectId) {
      setFormError("Parent Project must be selected.");
      toast.error("Parent Project must be selected.");
      return;
    }

    const cleanCode = subProjectCode.trim().toUpperCase() || undefined;

    if (editingSubProject) {
      DesignMasterStore.updateSubProject(editingSubProject.id, {
        projectId: selectedProjectId,
        towerName: subProjectName.trim(),
        subProjectCode: cleanCode,
        towerType,
        totalFloors: totalFloors ? parseInt(totalFloors, 10) : undefined,
        heightMeters: heightMeters ? parseFloat(heightMeters) : undefined,
        targetCompletionDate: targetDate.trim() || undefined,
        description: description.trim() || undefined,
        taggedConsultants: selectedConsultants,
        taggedCategories: selectedCategories
      });
      toast.success(`Sub-Project "${subProjectName.trim()}" updated successfully!`);
    } else {
      DesignMasterStore.addSubProject({
        projectId: selectedProjectId,
        towerName: subProjectName.trim(),
        subProjectCode: cleanCode,
        towerType,
        totalFloors: totalFloors ? parseInt(totalFloors, 10) : undefined,
        heightMeters: heightMeters ? parseFloat(heightMeters) : undefined,
        targetCompletionDate: targetDate.trim() || undefined,
        description: description.trim() || undefined,
        taggedConsultants: selectedConsultants,
        taggedCategories: selectedCategories
      });
      toast.success(`Sub-Project "${subProjectName.trim()}" created successfully!`);
    }

    setIsModalOpen(false);
    setEditingSubProject(null);
  };

  const handleTriggerDelete = (twr: SubProjectMaster) => {
    const report = DesignMasterStore.getEntityDependencies("TOWER", twr.id);
    setDeleteReport(report);
    setSubProjectToDeleteId(twr.id);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = (reason: string) => {
    if (subProjectToDeleteId) {
      const sp = subProjects.find(s => s.id === subProjectToDeleteId);
      DesignMasterStore.deleteSubProject(subProjectToDeleteId, reason, "Design Lead");
      toast.success(`Sub-Project "${sp?.towerName || "Selected"}" deleted successfully.`);
      setIsDeleteModalOpen(false);
      setSubProjectToDeleteId(null);
    }
  };

  // Filtered sub-projects
  const filteredSubProjects = useMemo(() => {
    return subProjects.filter(twr => {
      if (selectedParentProjectFilter !== "ALL" && twr.projectId !== selectedParentProjectFilter) {
        return false;
      }
      if (selectedTypeFilter !== "ALL" && twr.towerType !== selectedTypeFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = twr.towerName.toLowerCase().includes(q);
        const matchCode = (twr.subProjectCode || "").toLowerCase().includes(q);
        const matchParent = (twr.projectName || "").toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchParent) return false;
      }
      return true;
    });
  }, [subProjects, selectedParentProjectFilter, selectedTypeFilter, searchQuery]);

  // Modal filters
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
          <div className="h-9 w-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/20 shrink-0">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-foreground">
              Sub Project Master (Tower Wings & Phases)
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
            <span>Import Sub-Projects (Excel)</span>
          </button>
          <button
            type="button"
            onClick={() => handleOpenAdd()}
            className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-md cursor-pointer transition-all shrink-0 whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Sub-Project / Wing</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
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

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            {/* Parent Project Filter */}
            <div className="flex items-center gap-1 text-xs">
              <span className="text-[11px] font-semibold text-muted-foreground">Parent Project:</span>
              <select
                value={selectedParentProjectFilter}
                onChange={e => setSelectedParentProjectFilter(e.target.value)}
                className="px-2.5 py-1 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-hidden max-w-[200px]"
              >
                <option value="ALL">All Parent Projects ({projects.length})</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Wing Type Filter */}
            <select
              value={selectedTypeFilter}
              onChange={e => setSelectedTypeFilter(e.target.value)}
              className="px-2.5 py-1 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-hidden"
            >
              <option value="ALL">All Types</option>
              {TOWER_TYPE_OPTIONS.map(tp => (
                <option key={tp} value={tp}>{tp}</option>
              ))}
            </select>

            <div className="text-xs text-muted-foreground font-medium pl-2 border-l border-border">
              <strong>{filteredSubProjects.length}</strong> Wings
            </div>
          </div>
        </div>
      </div>

      {/* Sub Projects Cards Grid */}
      {filteredSubProjects.length === 0 ? (
        <div className="p-8 rounded-2xl border border-dashed border-border bg-surface text-center space-y-3">
          <div className="h-10 w-10 mx-auto rounded-xl bg-muted text-muted-foreground flex items-center justify-center">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h5 className="text-sm font-bold text-foreground">No Sub-Projects Found</h5>
            <p className="text-xs text-muted-foreground mt-0.5">
              {searchQuery || selectedParentProjectFilter !== "ALL"
                ? "Try clearing filters to view all sub-projects."
                : "Add tower wings or sub-project phases under your development projects."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleOpenAdd()}
            className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create First Sub-Project</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3.5 w-full">
          {filteredSubProjects.map(twr => {
            const parent = projects.find(p => p.id === twr.projectId);
            const taggedCons = twr.taggedConsultants || [];
            const taggedCats = twr.taggedCategories || [];

            return (
              <div
                key={twr.id}
                className="p-4 rounded-2xl border border-border bg-surface hover:border-purple-500/40 shadow-xs transition-all flex flex-col justify-between space-y-3"
              >
                <div className="space-y-3">
                  {/* Top: Parent Project, Type, Actions */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {parent && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 truncate max-w-[160px]">
                            {parent.name}
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/20">
                          {twr.towerType}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-foreground mt-1 truncate">
                        {twr.towerName}
                      </h4>
                      {twr.subProjectCode && (
                        <span className="text-[10px] font-mono text-muted-foreground">
                          Code: {twr.subProjectCode}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(twr)}
                        className="h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                        title="Edit Sub-Project"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTriggerDelete(twr)}
                        className="h-7 w-7 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 flex items-center justify-center transition-colors cursor-pointer"
                        title="Delete Sub-Project"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* Physical Specs */}
                  {(twr.totalFloors || twr.heightMeters || twr.targetCompletionDate) && (
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-border grid grid-cols-2 gap-2 text-xs">
                      {twr.totalFloors && (
                        <div>
                          <span className="text-[10px] text-muted-foreground block">Floors:</span>
                          <span className="font-bold text-foreground">{twr.totalFloors} Storeys</span>
                        </div>
                      )}
                      {twr.targetCompletionDate && (
                        <div>
                          <span className="text-[10px] text-muted-foreground block">Target:</span>
                          <span className="font-bold text-foreground">{twr.targetCompletionDate}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tagged Consultants & Packages */}
                  <div className="space-y-1.5 pt-1.5 border-t border-border text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground block mb-0.5">
                        Consultants ({taggedCons.length}):
                      </span>
                      <div className="flex flex-wrap gap-1 max-h-12 overflow-y-auto custom-scrollbar">
                        {taggedCons.length > 0 ? (
                          taggedCons.map((cn, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20"
                            >
                              {cn}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-muted-foreground italic">Default to Project</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground block mb-0.5">
                        Tagged Packages ({taggedCats.length}):
                      </span>
                      <div className="flex flex-wrap gap-1 max-h-10 overflow-y-auto custom-scrollbar">
                        {taggedCats.map((cat, idx) => (
                          <span
                            key={idx}
                            className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20"
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Link */}
                <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
                  <span className="text-muted-foreground text-[11px]">
                    {parent?.name || "Parent Project"}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(twr)}
                    className="h-6 px-2.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/25 text-[11px] font-bold inline-flex items-center transition-colors cursor-pointer"
                  >
                    Configure Mappings
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

        </div>
      )}

      {/* Add / Edit Sub-Project Transaction Form Layout (Attached directly to sidebar) */}
      {isModalOpen && (
        <TransactionFormLayout
          title={editingSubProject ? `Edit Sub-Project / Wing: ${subProjectName || editingSubProject.towerName}` : "Create New Sub-Project / Wing"}
          icon={Layers}
          description="Define tower specifications, parent project linkage, and consultant/package mappings"
          onBack={() => setIsModalOpen(false)}
          backLabel="Back to Sub-Projects"
          breadcrumbs={[
            { label: "Design Masters", onClick: () => setIsModalOpen(false) },
            { label: "Sub-Project Master", onClick: () => setIsModalOpen(false) },
            { label: editingSubProject ? (subProjectName || editingSubProject.towerName) : "Create Sub-Project" }
          ]}
          onSave={handleSubmit}
          saveLabel={editingSubProject ? "Save Sub-Project" : "Create Sub-Project"}
          onReset={editingSubProject ? () => handleOpenEdit(editingSubProject) : () => handleOpenAdd()}
        >
          <div className="space-y-6">
            {/* Sub Tabs */}
            <div className="flex items-center justify-between border-b border-border pb-3 gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFormTab("SPECS")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    formTab === "SPECS"
                      ? "bg-purple-600 text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground bg-muted/40"
                  }`}
                >
                  <Building className="h-4 w-4" />
                  <span>1. Wing Specs</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormTab("MAPPINGS")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    formTab === "MAPPINGS"
                      ? "bg-purple-600 text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground bg-muted/40"
                  }`}
                >
                  <Users className="h-4 w-4" />
                  <span>2. Map Consultants & Packages ({selectedConsultants.length} Cons / {selectedCategories.length} Pkgs)</span>
                </button>
              </div>

              {/* Inherit button */}
              <button
                type="button"
                onClick={handleInheritFromParent}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 hover:bg-purple-500/20 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                title="Inherit all tagged consultants and packages from the selected parent project"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Inherit from Parent Project</span>
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
                  {/* Parent Project Selector */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground">
                      Parent Project <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={selectedProjectId}
                      onChange={e => setSelectedProjectId(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-hidden"
                    >
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                      ))}
                    </select>
                  </div>

                  {/* Wing Name & Code */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-xs font-bold text-foreground">
                        Sub-Project / Wing Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={subProjectName}
                        onChange={e => setSubProjectName(e.target.value)}
                        required
                        className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-foreground">
                        Sub-Project Code
                      </label>
                      <input
                        type="text"
                        value={subProjectCode}
                        onChange={e => setSubProjectCode(e.target.value.toUpperCase())}
                        className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                  </div>

                  {/* Type, Floors, Height */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-foreground">
                        Wing / Unit Type
                      </label>
                      <select
                        value={towerType}
                        onChange={e => setTowerType(e.target.value as TowerMaster["towerType"])}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-hidden"
                      >
                        {TOWER_TYPE_OPTIONS.map(tp => (
                          <option key={tp} value={tp}>{tp}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-foreground">
                        Total Floors
                      </label>
                      <input
                        type="number"
                        value={totalFloors}
                        onChange={e => setTotalFloors(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-foreground">
                        Height (Meters)
                      </label>
                      <input
                        type="number"
                        value={heightMeters}
                        onChange={e => setHeightMeters(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                  </div>

                  {/* Target Date & Description */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-foreground">
                        Target Completion
                      </label>
                      <input
                        type="date"
                        value={targetDate}
                        onChange={e => setTargetDate(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                      />
                    </div>

                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-xs font-bold text-foreground">
                        Wing Scope / Description
                      </label>
                      <input
                        type="text"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* MAPPINGS TAB (2-COLUMN WIDE GRID) */}
              {formTab === "MAPPINGS" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Column 1: Consultants Mapping */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-border space-y-3 flex flex-col justify-between">
                    <div className="space-y-2.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <Users className="h-4 w-4 text-purple-500" />
                          <label className="text-xs font-bold text-foreground">
                            Map Consultants to Sub-Project
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
                            Sub-Project Tagged Packages Scope
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
                            Select one or more consultant partners on the left to auto-load their mapped packages here, or inherit from the parent project.
                          </p>
                          <button
                            type="button"
                            onClick={() => setShowAllMasterCategories(true)}
                            className="h-6 px-2.5 rounded-lg border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 text-[10px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer mt-1"
                          >
                            Browse all {categories.length} Package Master packages →
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
                        className="h-5 px-2 rounded-md border border-border bg-surface hover:bg-surface-hover text-foreground text-[10px] font-bold inline-flex items-center transition-colors cursor-pointer"
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
                      onClick={() => setFormTab("MAPPINGS")}
                      className="h-7 px-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs inline-flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                    >
                      Next: Map Consultants & Packages →
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setFormTab("SPECS")}
                      className="h-7 px-3 rounded-lg border border-border bg-surface hover:bg-surface-hover text-foreground font-semibold text-xs inline-flex items-center gap-1 transition-colors cursor-pointer"
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
                    className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md cursor-pointer transition-all"
                  >
                    {editingSubProject ? "Save Sub-Project" : "Create Sub-Project"}
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
          setSubProjectToDeleteId(null);
        }}
        report={deleteReport}
        onConfirmDelete={handleConfirmDelete}
      />

      <MasterBulkImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        initialMasterType="SUB_PROJECTS"
      />
    </div>
  );
};

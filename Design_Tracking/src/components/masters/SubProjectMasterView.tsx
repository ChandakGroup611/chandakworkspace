"use client";

import React, { useState, useMemo } from "react";
import { 
  DesignMasterStore 
} from "../../services/designMasterStore";
import { TowerMaster, ProjectMaster, EntityDependencyReport, SubProjectMaster } from "../../types/masterTypes";
import { 
  Layers, 
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
  const store = DesignMasterStore.getState();
  const projects = (store.projects || []).filter(p => !p.isSubProject);
  const subProjects = DesignMasterStore.getSubProjects();
  const consultants = store.consultants || [];
  const categories = DesignMasterStore.getCategories();

  const [selectedParentProjectFilter, setSelectedParentProjectFilter] = useState<string>(
    initialParentProjectId || "ALL"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState("ALL");

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
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
    
    // Automatically inherit from parent project by default
    const parentProj = projects.find(p => p.id === pId);
    if (parentProj) {
      setSelectedConsultants(parentProj.taggedConsultants || consultants.map(c => c.name));
      setSelectedCategories(parentProj.taggedCategories || categories.map(c => c.name));
    } else {
      setSelectedConsultants(consultants.map(c => c.name));
      setSelectedCategories(categories.map(c => c.name));
    }

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

    const taggedCons = twr.taggedConsultants && twr.taggedConsultants.length > 0
      ? twr.taggedConsultants
      : consultants.map(c => c.name);
    setSelectedConsultants(taggedCons);

    const taggedCats = twr.taggedCategories && twr.taggedCategories.length > 0
      ? twr.taggedCategories
      : categories.map(c => c.name);
    setSelectedCategories(taggedCats);

    setConsultantSearch("");
    setCategorySearch("");
    setFormTab("SPECS");
    setFormError("");
    setIsModalOpen(true);
  };

  // Inherit shortcut
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
    const updated = isAdding
      ? [...selectedConsultants, consName]
      : selectedConsultants.filter(c => c !== consName);
    setSelectedConsultants(updated);

    if (isAdding) {
      const consMaster = consultants.find(c => c.name === consName);
      if (consMaster) {
        const consCats = consMaster.categories || (consMaster.category ? [consMaster.category as string] : []);
        setSelectedCategories(prev => Array.from(new Set([...prev, ...consCats])));
      }
    }
  };

  const handleSelectAllConsultants = () => {
    setSelectedConsultants(consultants.map(c => c.name));
    const allConsCats = DesignMasterStore.getCategoriesForConsultants(consultants.map(c => c.name));
    setSelectedCategories(prev => Array.from(new Set([...prev, ...allConsCats])));
  };

  const handleRemoveAllConsultants = () => {
    setSelectedConsultants([]);
  };

  // Category selection helpers
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
    if (!subProjectName.trim()) {
      setFormError("Sub-Project / Wing Name is required.");
      return;
    }
    if (!selectedProjectId) {
      setFormError("Parent Project must be selected.");
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
      DesignMasterStore.deleteSubProject(subProjectToDeleteId, reason, "Design Lead");
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

  const filteredModalCategories = useMemo(() => {
    if (!categorySearch.trim()) return categories;
    const q = categorySearch.toLowerCase();
    return categories.filter(c => 
      c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [categories, categorySearch]);

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
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
            <p className="text-xs text-muted-foreground">
              Manage discrete tower wings, execution phases, and their specific consultant & category mappings
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => handleOpenAdd()}
          className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-md cursor-pointer transition-all shrink-0 whitespace-nowrap"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Sub-Project / Wing</span>
        </button>
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
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

                  {/* Tagged Consultants & Categories */}
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
                        Categories ({taggedCats.length}):
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
                    className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                  >
                    Configure Mappings
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Sub-Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-2xl bg-surface border border-border shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150 my-8 max-h-[90vh] flex flex-col justify-between">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Layers className="h-4 w-4" />
                </div>
                <h3 className="text-base font-bold text-foreground">
                  {editingSubProject ? "Edit Sub-Project / Wing Master" : "Create New Sub-Project / Wing"}
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

            {/* Sub Tabs */}
            <div className="flex items-center justify-between border-b border-border pb-2 gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFormTab("SPECS")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                    formTab === "SPECS"
                      ? "bg-purple-600 text-white shadow-2xs"
                      : "text-muted-foreground hover:text-foreground bg-muted/40"
                  }`}
                >
                  <Building className="h-3.5 w-3.5" />
                  <span>1. Wing Specs</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormTab("MAPPINGS")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                    formTab === "MAPPINGS"
                      ? "bg-purple-600 text-white shadow-2xs"
                      : "text-muted-foreground hover:text-foreground bg-muted/40"
                  }`}
                >
                  <Users className="h-3.5 w-3.5" />
                  <span>2. Map Consultants & Categories</span>
                </button>
              </div>

              {/* Inherit button */}
              <button
                type="button"
                onClick={handleInheritFromParent}
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 hover:bg-purple-500/20 transition-colors cursor-pointer flex items-center gap-1"
                title="Inherit all tagged consultants and categories from the selected parent project"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Inherit from Parent Project</span>
              </button>
            </div>

            {formError && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-4">
              {formTab === "SPECS" && (
                <div className="space-y-3.5">
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

              {/* MAPPINGS TAB */}
              {formTab === "MAPPINGS" && (
                <div className="space-y-4">
                  {/* Consultants Mapping */}
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-border space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-purple-500" />
                        <label className="text-xs font-bold text-foreground">
                          Map Consultants to Sub-Project
                        </label>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold">
                          {selectedConsultants.length} Selected
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleSelectAllConsultants}
                          className="px-2 py-0.8 rounded text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 transition-colors cursor-pointer inline-flex items-center gap-1"
                        >
                          <CheckSquare className="h-3 w-3" />
                          <span>Select All</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveAllConsultants}
                          className="px-2 py-0.8 rounded text-[10px] font-bold bg-slate-500/10 text-slate-600 dark:text-slate-400 hover:bg-slate-500/20 transition-colors cursor-pointer inline-flex items-center gap-1"
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
                        className="w-full pl-7 pr-3 py-1 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-40 overflow-y-auto custom-scrollbar p-1">
                      {filteredModalConsultants.map(c => {
                        const isSelected = selectedConsultants.includes(c.name);
                        const cCats = c.categories || (c.category ? [c.category as string] : []);
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => handleToggleConsultant(c.name)}
                            className={`p-2 rounded-xl text-left text-xs border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                              isSelected
                                ? "bg-purple-50 dark:bg-purple-950/40 border-purple-500/60 text-purple-900 dark:text-purple-100 font-bold"
                                : "bg-background border-border text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="truncate font-semibold">{c.name}</div>
                              <div className="text-[10px] text-muted-foreground truncate font-normal">
                                {cCats.join(", ") || "General"}
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

                  {/* Categories Scope Mapping */}
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-border space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Tag className="h-3.5 w-3.5 text-blue-500" />
                        <label className="text-xs font-bold text-foreground">
                          Sub-Project Category Scope
                        </label>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-700 dark:text-blue-300 font-bold">
                          {selectedCategories.length} Categories
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleSelectAllCategories}
                          className="px-2 py-0.8 rounded text-[10px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 hover:bg-blue-500/20 transition-colors cursor-pointer inline-flex items-center gap-1"
                        >
                          <CheckSquare className="h-3 w-3" />
                          <span>Select All</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveAllCategories}
                          className="px-2 py-0.8 rounded text-[10px] font-bold bg-slate-500/10 text-slate-600 dark:text-slate-400 hover:bg-slate-500/20 transition-colors cursor-pointer inline-flex items-center gap-1"
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
                        value={categorySearch}
                        onChange={e => setCategorySearch(e.target.value)}
                        className="w-full pl-7 pr-3 py-1 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto custom-scrollbar p-1">
                      {filteredModalCategories.map(cat => {
                        const isSelected = selectedCategories.includes(cat.name);
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => handleToggleCategory(cat.name)}
                            className={`p-1.5 rounded-lg text-left text-xs border transition-all cursor-pointer flex items-center justify-between gap-1.5 ${
                              isSelected
                                ? "bg-blue-50 dark:bg-blue-950/40 border-blue-500/60 text-blue-900 dark:text-blue-100 font-bold"
                                : "bg-background border-border text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <span className="truncate">{cat.icon || "📁"} {cat.name}</span>
                            <div className={`h-3.5 w-3.5 rounded flex items-center justify-center shrink-0 border ${
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
                  </div>
                </div>
              )}

              {/* Modal Buttons */}
              <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
                <div className="text-[11px] text-muted-foreground">
                  {formTab === "SPECS" ? (
                    <button
                      type="button"
                      onClick={() => setFormTab("MAPPINGS")}
                      className="text-purple-600 dark:text-purple-400 font-bold hover:underline cursor-pointer"
                    >
                      Next: Map Consultants & Categories →
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

                <div className="flex items-center gap-2">
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
                    {editingSubProject ? "Save Sub-Project" : "Create Sub-Project"}
                  </button>
                </div>
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
          setSubProjectToDeleteId(null);
        }}
        report={deleteReport}
        onConfirmDelete={handleConfirmDelete}
      />
    </div>
  );
};

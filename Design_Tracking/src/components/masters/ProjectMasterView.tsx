"use client";

import React, { useState, useMemo } from "react";
import { 
  DesignMasterStore 
} from "../../services/designMasterStore";
import { ProjectMaster, EntityDependencyReport, TowerMaster } from "../../types/masterTypes";
import { 
  Building2, 
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
  const store = DesignMasterStore.getState();
  // Filter ONLY main / parent projects (no subprojects mixed in)
  const projects = (store.projects || []).filter(p => !p.isSubProject);
  const consultants = store.consultants || [];
  const categories = DesignMasterStore.getCategories();
  const allTowers = store.towers || [];

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("ALL");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState("ALL");

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
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
    // Default: all available consultants selected
    setSelectedConsultants(consultants.map(c => c.name));
    setSelectedCategories(categories.map(c => c.name));
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
    
    // Tagged consultants
    const taggedCons = p.taggedConsultants && p.taggedConsultants.length > 0 
      ? p.taggedConsultants 
      : consultants.map(c => c.name);
    setSelectedConsultants(taggedCons);

    // Tagged categories
    const taggedCats = p.taggedCategories && p.taggedCategories.length > 0
      ? p.taggedCategories
      : (p.subProjectCategories?.default || categories.map(c => c.name));
    setSelectedCategories(taggedCats);

    setConsultantSearch("");
    setCategorySearch("");
    setFormTab("SPECS");
    setFormError("");
    setIsModalOpen(true);
  };

  // Consultant selection helpers
  const handleToggleConsultant = (consName: string) => {
    const isAdding = !selectedConsultants.includes(consName);
    const updated = isAdding 
      ? [...selectedConsultants, consName] 
      : selectedConsultants.filter(c => c !== consName);
    setSelectedConsultants(updated);

    // When consultant is selected, auto-surface / merge their mapped categories
    if (isAdding) {
      const consMaster = consultants.find(c => c.name === consName);
      if (consMaster) {
        const consCats = consMaster.categories || (consMaster.category ? [consMaster.category as string] : []);
        setSelectedCategories(prev => {
          const merged = new Set([...prev, ...consCats]);
          return Array.from(merged);
        });
      }
    }
  };

  const handleSelectAllConsultants = () => {
    setSelectedConsultants(consultants.map(c => c.name));
    // Also include all consultant categories
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
    if (!projectName.trim()) {
      setFormError("Project Name is required.");
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
      DesignMasterStore.deleteProject(projectToDeleteId, reason, "Design Lead");
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
          <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 shrink-0">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-foreground">
              Project Master (Parent Development Projects)
            </h3>
            <p className="text-xs text-muted-foreground">
              Master real estate developments with specifications, consultant mappings, and discipline scopes
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-md cursor-pointer transition-all shrink-0 whitespace-nowrap"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Project</span>
        </button>
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
            <span className="text-[11px] font-semibold text-muted-foreground block">Active Disciplines</span>
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
              placeholder="Search projects by name, code, RERA, location..."
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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

                  {/* Tagged Consultants & Categories Summary */}
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
                          <span>Active Categories ({taggedCats.length}):</span>
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

      {/* Add / Edit Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-2xl bg-surface border border-border shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150 my-8 max-h-[90vh] flex flex-col justify-between">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Building2 className="h-4 w-4" />
                </div>
                <h3 className="text-base font-bold text-foreground">
                  {editingProject ? "Edit Project Master" : "Create New Project Master"}
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

            {/* Sub Tabs Inside Form */}
            <div className="flex items-center gap-2 border-b border-border pb-2">
              <button
                type="button"
                onClick={() => setFormTab("SPECS")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  formTab === "SPECS"
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "text-muted-foreground hover:text-foreground bg-muted/40"
                }`}
              >
                <Building2 className="h-3.5 w-3.5" />
                <span>1. Project Specs</span>
              </button>
              <button
                type="button"
                onClick={() => setFormTab("CONSULTANTS_CATEGORIES")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  formTab === "CONSULTANTS_CATEGORIES"
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "text-muted-foreground hover:text-foreground bg-muted/40"
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                <span>2. Map Consultants & Categories ({selectedConsultants.length} Cons / {selectedCategories.length} Cats)</span>
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
                        placeholder="e.g. Chandak Green Horizon, Chandak Stella..."
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
                        placeholder="e.g. CDK-STEL"
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
                        placeholder="e.g. Goregaon West, Mumbai"
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
                        placeholder="e.g. 450,000 sq.ft"
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
                        placeholder="e.g. 3.5 Acres"
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
                        placeholder="e.g. ₹180 Cr"
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
                        placeholder="P518000XXXXX"
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
                        placeholder="e.g. Rajesh Sharma"
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
                        placeholder="manager@chandakgroup.com"
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
                      placeholder="High-level project development overview..."
                      rows={2}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              )}

              {/* 🤝 CONSULTANT & CATEGORY MAPPING SECTION */}
              {formTab === "CONSULTANTS_CATEGORIES" && (
                <div className="space-y-4">
                  {/* Step 1: Consultants Mapping */}
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-border space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-purple-500" />
                        <label className="text-xs font-bold text-foreground">
                          Map Consultant Partners to Project
                        </label>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold">
                          {selectedConsultants.length} of {consultants.length} Selected
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
                        placeholder="Search consultant firms..."
                        className="w-full pl-7 pr-3 py-1 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                      />
                    </div>

                    {/* Consultant Selection Cards */}
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
                                ? "bg-purple-50 dark:bg-purple-950/40 border-purple-500/60 text-purple-900 dark:text-purple-100 font-bold shadow-2xs"
                                : "bg-background border-border text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
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

                  {/* Step 2: Discipline Categories Scope Mapping */}
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-border space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Tag className="h-3.5 w-3.5 text-blue-500" />
                        <label className="text-xs font-bold text-foreground">
                          Project Category Scope (Auto-populated from Consultants)
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
                        placeholder="Search categories..."
                        className="w-full pl-7 pr-3 py-1 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    {/* Category Selection Pills Grid */}
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

              {/* Modal Action Buttons */}
              <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
                <div className="text-[11px] text-muted-foreground">
                  {formTab === "SPECS" ? (
                    <button
                      type="button"
                      onClick={() => setFormTab("CONSULTANTS_CATEGORIES")}
                      className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
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
                    className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md cursor-pointer transition-all"
                  >
                    {editingProject ? "Save Changes" : "Create Project"}
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
          setProjectToDeleteId(null);
        }}
        report={deleteReport}
        onConfirmDelete={handleConfirmDelete}
      />
    </div>
  );
};

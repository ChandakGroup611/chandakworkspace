"use client";

import React, { useState, useEffect } from "react";
import { 
  DesignMasterStore, 
  MasterStoreState 
} from "../services/designMasterStore";
import { 
  WorkPackageMaster, 
  StatutoryAuthorityMaster,
  EntityDependencyReport
} from "../types/masterTypes";
import { 
  Building2, 
  Layers, 
  Users,
  Tag,
  ShieldCheck, 
  Plus, 
  Trash2, 
  RotateCcw, 
  Download, 
  Upload, 
  Sparkles, 
  CheckCircle2, 
  Check,
  X,
  SlidersHorizontal,
  Settings,
  AlertTriangle,
  Edit2,
  Search
} from "lucide-react";
import { ProjectMasterView } from "./masters/ProjectMasterView";
import { SubProjectMasterView } from "./masters/SubProjectMasterView";
import { ConsultantMasterView } from "./masters/ConsultantMasterView";
import { CategoryMasterView } from "./masters/CategoryMasterView";
import { DesignRbacGovernance } from "./DesignRbacGovernance";
import { DeleteDependencyModal } from "./DeleteDependencyModal";

export type MasterSubTab = 
  | "PROJECTS" 
  | "SUB_PROJECTS" 
  | "CONSULTANTS" 
  | "CATEGORIES" 
  | "PACKAGES" 
  | "AUTHORITIES" 
  | "RBAC" 
  | "TEMPLATES";

interface MastersSetupViewProps {
  initialSubTab?: MasterSubTab;
}

export const MastersSetupView: React.FC<MastersSetupViewProps> = ({ initialSubTab = "PROJECTS" }) => {
  const [storeState, setStoreState] = useState<MasterStoreState>(DesignMasterStore.getState());
  const [activeSubTab, setActiveSubTab] = useState<MasterSubTab>(initialSubTab);

  // Foreign Key Dependency Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteModalReport, setDeleteModalReport] = useState<EntityDependencyReport | null>(null);
  const [activeDeleteExecutor, setActiveDeleteExecutor] = useState<((reason: string) => void) | null>(null);

  const handleTriggerDelete = (
    entityType: "PROJECT" | "SUB_PROJECT" | "TOWER" | "PACKAGE" | "CONSULTANT" | "AUTHORITY" | "CATEGORY",
    entityId: string,
    executor: (reason: string) => void
  ) => {
    const report = DesignMasterStore.getEntityDependencies(entityType, entityId);
    setDeleteModalReport(report);
    setActiveDeleteExecutor(() => executor);
    setIsDeleteModalOpen(true);
  };

  const handleExecuteDelete = (reason: string) => {
    if (activeDeleteExecutor) {
      activeDeleteExecutor(reason);
    }
    setIsDeleteModalOpen(false);
    setActiveDeleteExecutor(null);
  };

  // Sync activeSubTab if initialSubTab prop changes
  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  useEffect(() => {
    const unsubscribe = DesignMasterStore.subscribe(() => {
      setStoreState({ ...DesignMasterStore.getState() });
    });
    return () => unsubscribe();
  }, []);

  // Form states: Work Package (Add & Edit)
  const [isNewPackageModalOpen, setIsNewPackageModalOpen] = useState(false);
  const [isEditPackageModalOpen, setIsEditPackageModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<WorkPackageMaster | null>(null);
  const [newPackageName, setNewPackageName] = useState("");
  const [newPackageCode, setNewPackageCode] = useState("");
  const [newPackageDiscipline, setNewPackageDiscipline] = useState("Civil & RCC");
  const [newPackageDescription, setNewPackageDescription] = useState("");
  const [packageSearchQuery, setPackageSearchQuery] = useState("");
  const [selectedDisciplineFilter, setSelectedDisciplineFilter] = useState("ALL");

  // Form states: New Authority
  const [isNewAuthorityModalOpen, setIsNewAuthorityModalOpen] = useState(false);
  const [newAuthorityName, setNewAuthorityName] = useState("");
  const [newAuthorityScope, setNewAuthorityScope] = useState("");

  const categories = DesignMasterStore.getCategories();
  const parentProjects = storeState.projects.filter(p => !p.isSubProject);

  const handleOpenAddPackage = () => {
    setEditingPackage(null);
    setNewPackageName("");
    setNewPackageCode("");
    setNewPackageDiscipline(categories[0]?.name || "Civil & RCC");
    setNewPackageDescription("");
    setIsNewPackageModalOpen(true);
  };

  const handleOpenEditPackage = (pkg: WorkPackageMaster) => {
    setEditingPackage(pkg);
    setNewPackageName(pkg.packageName);
    setNewPackageCode(pkg.packageCode || "");
    setNewPackageDiscipline(pkg.disciplineName || categories[0]?.name || "Civil & RCC");
    setNewPackageDescription(pkg.description || "");
    setIsEditPackageModalOpen(true);
  };

  const handleCreatePackage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPackageName.trim()) return;

    const generatedCode = newPackageCode.trim() || `PKG-${(storeState.packages.length + 1).toString().padStart(2, "0")}`;

    DesignMasterStore.addPackage({
      disciplineId: `disc-${newPackageDiscipline.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
      disciplineName: newPackageDiscipline,
      packageName: newPackageName.trim(),
      packageCode: generatedCode,
      description: newPackageDescription.trim() || undefined
    });

    setNewPackageName("");
    setNewPackageCode("");
    setNewPackageDescription("");
    setIsNewPackageModalOpen(false);
  };

  const handleUpdatePackage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPackage || !newPackageName.trim()) return;

    DesignMasterStore.updatePackage(editingPackage.id, {
      disciplineId: `disc-${newPackageDiscipline.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
      disciplineName: newPackageDiscipline,
      packageName: newPackageName.trim(),
      packageCode: newPackageCode.trim() || editingPackage.packageCode,
      description: newPackageDescription.trim() || undefined
    });

    setIsEditPackageModalOpen(false);
    setEditingPackage(null);
  };

  const handleCreateAuthority = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAuthorityName.trim()) return;

    DesignMasterStore.addAuthority({
      authorityName: newAuthorityName.trim(),
      scope: newAuthorityScope.trim() || "Statutory clearance",
      category: "Municipal"
    });

    setNewAuthorityName("");
    setNewAuthorityScope("");
    setIsNewAuthorityModalOpen(false);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* Top Masters Control Header */}
      <div className="p-4 sm:p-5 rounded-2xl border border-border bg-surface shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-500/20 shrink-0">
            <Settings className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">
              Design & Engineering Masters Directory
            </h2>
            <p className="text-xs text-muted-foreground">
              Separated master entities for Projects, Sub-Projects, Consultants, Categories, and Work Packages
            </p>
          </div>
        </div>

        {/* Sub-tab Navigation */}
        <div className="p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-border flex items-center gap-1 text-xs overflow-x-auto custom-scrollbar max-w-full">
          <button
            type="button"
            onClick={() => setActiveSubTab("PROJECTS")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
              activeSubTab === "PROJECTS" ? "bg-surface text-foreground shadow-2xs font-bold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Building2 className="h-3.5 w-3.5 text-emerald-500" />
            <span>Project Master ({parentProjects.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("SUB_PROJECTS")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
              activeSubTab === "SUB_PROJECTS" ? "bg-surface text-foreground shadow-2xs font-bold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="h-3.5 w-3.5 text-purple-500" />
            <span>Sub-Project Master ({storeState.towers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("CONSULTANTS")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
              activeSubTab === "CONSULTANTS" ? "bg-surface text-foreground shadow-2xs font-bold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="h-3.5 w-3.5 text-purple-500" />
            <span>Consultant Master ({storeState.consultants.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("CATEGORIES")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
              activeSubTab === "CATEGORIES" ? "bg-surface text-foreground shadow-2xs font-bold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Tag className="h-3.5 w-3.5 text-blue-500" />
            <span>Category Master ({categories.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("PACKAGES")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
              activeSubTab === "PACKAGES" ? "bg-surface text-foreground shadow-2xs font-bold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="h-3.5 w-3.5 text-teal-500" />
            <span>Work Packages ({storeState.packages.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("AUTHORITIES")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
              activeSubTab === "AUTHORITIES" ? "bg-surface text-foreground shadow-2xs font-bold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5 text-purple-500" />
            <span>Authorities ({storeState.authorities.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("RBAC")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
              activeSubTab === "RBAC" ? "bg-teal-600 text-white shadow-2xs font-bold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5 text-teal-400" />
            <span>RBAC Policies</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("TEMPLATES")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
              activeSubTab === "TEMPLATES" ? "bg-surface text-foreground shadow-2xs font-bold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <RotateCcw className="h-3.5 w-3.5 text-amber-500" />
            <span>Backup & Templates</span>
          </button>
        </div>
      </div>

      {/* Sub-tab 1: Project Master (Parent Projects) */}
      {activeSubTab === "PROJECTS" && (
        <ProjectMasterView 
          onNavigateToSubProjects={() => setActiveSubTab("SUB_PROJECTS")}
        />
      )}

      {/* Sub-tab 2: Sub-Project Master (Wings / Towers) */}
      {activeSubTab === "SUB_PROJECTS" && (
        <SubProjectMasterView />
      )}

      {/* Sub-tab 3: Consultant Master */}
      {activeSubTab === "CONSULTANTS" && (
        <ConsultantMasterView />
      )}

      {/* Sub-tab 4: Category Master */}
      {activeSubTab === "CATEGORIES" && (
        <CategoryMasterView />
      )}

      {/* Sub-tab 5: Work Packages Master */}
      {activeSubTab === "PACKAGES" && (() => {
        const filteredPackages = storeState.packages.filter(pkg => {
          if (selectedDisciplineFilter !== "ALL" && pkg.disciplineName !== selectedDisciplineFilter) {
            return false;
          }
          if (packageSearchQuery.trim()) {
            const q = packageSearchQuery.toLowerCase();
            const matchName = pkg.packageName.toLowerCase().includes(q);
            const matchCode = (pkg.packageCode || "").toLowerCase().includes(q);
            const matchDisc = pkg.disciplineName.toLowerCase().includes(q);
            const matchDesc = (pkg.description || "").toLowerCase().includes(q);
            if (!matchName && !matchCode && !matchDisc && !matchDesc) return false;
          }
          return true;
        });

        return (
          <div className="space-y-4">
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-foreground">Standard Work Packages Directory</h4>
                <p className="text-xs text-muted-foreground">Master engineering work packages used for tracking drawings, tenders, and consultant tagging</p>
              </div>
              <button
                type="button"
                onClick={handleOpenAddPackage}
                className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-md cursor-pointer transition-all shrink-0 whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Work Package</span>
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="p-3 rounded-2xl border border-border bg-surface shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    value={packageSearchQuery}
                    onChange={e => setPackageSearchQuery(e.target.value)}
                    placeholder="Search work packages..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <div className="text-xs text-muted-foreground font-medium">
                  Showing <strong>{filteredPackages.length}</strong> of {storeState.packages.length} Packages
                </div>
              </div>

              {/* Discipline Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 text-xs">
                <span className="text-[11px] font-bold text-muted-foreground mr-1 shrink-0 flex items-center gap-1">
                  <SlidersHorizontal className="h-3 w-3" />
                  <span>Category:</span>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedDisciplineFilter("ALL")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                    selectedDisciplineFilter === "ALL"
                      ? "bg-teal-600 text-white font-bold shadow-2xs"
                      : "bg-muted/40 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All ({storeState.packages.length})
                </button>
                {categories.map(cat => {
                  const count = storeState.packages.filter(p => p.disciplineName === cat.name).length;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedDisciplineFilter(cat.name)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                        selectedDisciplineFilter === cat.name
                          ? "bg-teal-600 text-white font-bold shadow-2xs"
                          : "bg-muted/40 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span>{cat.name}</span>
                      <span className="opacity-70 text-[10px]">({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Packages Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredPackages.map(pkg => (
                <div
                  key={pkg.id}
                  className="p-3.5 rounded-xl border border-border bg-surface hover:border-teal-500/40 shadow-xs transition-all flex items-start justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20">
                        {pkg.packageCode || "PKG"}
                      </span>
                      <span className="text-[10px] font-semibold text-muted-foreground bg-muted/40 px-1.5 py-0.2 rounded">
                        {pkg.disciplineName}
                      </span>
                    </div>
                    <h5 className="text-xs font-bold text-foreground truncate">{pkg.packageName}</h5>
                    {pkg.description && (
                      <p className="text-[11px] text-muted-foreground line-clamp-1">{pkg.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEditPackage(pkg)}
                      className="h-6 w-6 rounded hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTriggerDelete("PACKAGE", pkg.id, (reason) => {
                        DesignMasterStore.deletePackage(pkg.id, reason, "Design Lead");
                      })}
                      className="h-6 w-6 rounded hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 flex items-center justify-center cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Sub-tab 6: Statutory Authorities Master */}
      {activeSubTab === "AUTHORITIES" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-foreground">Statutory Authorities & NOC Clearance Bodies</h4>
              <p className="text-xs text-muted-foreground">Municipal, fire, environmental, and regulatory authorities</p>
            </div>
            <button
              type="button"
              onClick={() => setIsNewAuthorityModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-md cursor-pointer transition-all shrink-0 whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Authority</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {storeState.authorities.map(auth => (
              <div
                key={auth.id}
                className="p-3.5 rounded-xl border border-border bg-surface hover:border-purple-500/40 shadow-xs transition-all flex items-start justify-between gap-3"
              >
                <div className="space-y-1 min-w-0">
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                    {auth.category}
                  </span>
                  <h5 className="text-xs font-bold text-foreground truncate">{auth.authorityName}</h5>
                  <p className="text-[11px] text-muted-foreground line-clamp-1">{auth.scope}</p>
                </div>

                <button
                  type="button"
                  onClick={() => handleTriggerDelete("AUTHORITY", auth.id, (reason) => {
                    DesignMasterStore.deleteAuthority(auth.id, reason, "Design Lead");
                  })}
                  className="h-6 w-6 rounded hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 flex items-center justify-center cursor-pointer shrink-0"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub-tab 7: RBAC Governance */}
      {activeSubTab === "RBAC" && (
        <DesignRbacGovernance />
      )}

      {/* Sub-tab 8: Backup & Templates */}
      {activeSubTab === "TEMPLATES" && (
        <div className="space-y-4 max-w-2xl">
          <div className="p-4 rounded-xl border border-border bg-surface space-y-3">
            <h4 className="text-sm font-bold text-foreground">Workspace State Management</h4>
            <p className="text-xs text-muted-foreground">Export your configured masters or reset to clean state.</p>
            
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(DesignMasterStore.exportToJson());
                  const downloadAnchor = document.createElement("a");
                  downloadAnchor.setAttribute("href", dataStr);
                  downloadAnchor.setAttribute("download", `chandak_design_masters_${new Date().toISOString().split("T")[0]}.json`);
                  document.body.appendChild(downloadAnchor);
                  downloadAnchor.click();
                  downloadAnchor.remove();
                }}
                className="px-3.5 py-1.5 rounded-xl border border-border bg-background hover:bg-muted text-foreground text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export JSON Backup</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (confirm("Reset all masters to initial clean state?")) {
                    DesignMasterStore.resetToBlank();
                  }
                }}
                className="px-3.5 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset to Blank</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: New Package */}
      {isNewPackageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-surface border border-border w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-foreground">Create New Work Package</h4>
              <button type="button" onClick={() => setIsNewPackageModalOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePackage} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-foreground">Package Name / Title *</label>
                <input
                  type="text"
                  required
                  value={newPackageName}
                  onChange={e => setNewPackageName(e.target.value)}
                  placeholder="e.g. RCC Core, HVAC, Facade ACP..."
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Discipline Category *</label>
                  <select
                    value={newPackageDiscipline}
                    onChange={e => setNewPackageDiscipline(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground font-semibold focus:outline-hidden focus:ring-1 focus:ring-teal-500 cursor-pointer"
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-foreground">Package Code</label>
                  <input
                    type="text"
                    value={newPackageCode}
                    onChange={e => setNewPackageCode(e.target.value)}
                    placeholder="PKG-01"
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground font-mono focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">Scope / Description</label>
                <textarea
                  rows={2}
                  value={newPackageDescription}
                  onChange={e => setNewPackageDescription(e.target.value)}
                  placeholder="Engineering deliverable scope..."
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button type="button" onClick={() => setIsNewPackageModalOpen(false)} className="px-4 py-1.5 rounded-xl border border-border bg-background text-foreground hover:bg-muted transition-colors cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold cursor-pointer transition-all shadow-md">
                  Create Package
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Package */}
      {isEditPackageModalOpen && editingPackage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-surface border border-border w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-foreground">Edit Work Package</h4>
              <button type="button" onClick={() => setIsEditPackageModalOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdatePackage} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-foreground">Package Name / Title *</label>
                <input
                  type="text"
                  required
                  value={newPackageName}
                  onChange={e => setNewPackageName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Discipline Category *</label>
                  <select
                    value={newPackageDiscipline}
                    onChange={e => setNewPackageDiscipline(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground font-semibold focus:outline-hidden focus:ring-1 focus:ring-teal-500 cursor-pointer"
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-foreground">Package Code</label>
                  <input
                    type="text"
                    value={newPackageCode}
                    onChange={e => setNewPackageCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground font-mono focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">Scope / Description</label>
                <textarea
                  rows={2}
                  value={newPackageDescription}
                  onChange={e => setNewPackageDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button type="button" onClick={() => setIsEditPackageModalOpen(false)} className="px-4 py-1.5 rounded-xl border border-border bg-background text-foreground hover:bg-muted transition-colors cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold cursor-pointer transition-all shadow-md">
                  Update Package
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Authority */}
      {isNewAuthorityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-surface border border-border w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-foreground">Add Statutory Authority</h4>
              <button type="button" onClick={() => setIsNewAuthorityModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAuthority} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-foreground">Authority / Body Name *</label>
                <input
                  type="text"
                  required
                  value={newAuthorityName}
                  onChange={e => setNewAuthorityName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">Scope / Category Description</label>
                <input
                  type="text"
                  value={newAuthorityScope}
                  onChange={e => setNewAuthorityScope(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button type="button" onClick={() => setIsNewAuthorityModalOpen(false)} className="px-4 py-1.5 rounded-xl border border-border bg-background text-foreground hover:bg-muted transition-colors cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold cursor-pointer transition-all shadow-md">
                  Add Authority
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Foreign Key Dependency Guard Deletion Modal */}
      <DeleteDependencyModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setActiveDeleteExecutor(null);
          setDeleteModalReport(null);
        }}
        report={deleteModalReport}
        onConfirmDelete={handleExecuteDelete}
      />
    </div>
  );
};

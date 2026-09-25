"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { toast } from "react-toastify";
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
import { TransactionFormLayout } from "./DesignTransactionLayout";
import { AppCard, AppCardContent, AppCardHeader, AppCardTitle } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
    if (!newPackageName.trim()) {
      toast.error("Package Name / Title is required.");
      return;
    }

    const generatedCode = newPackageCode.trim() || `PKG-${(storeState.packages.length + 1).toString().padStart(2, "0")}`;

    DesignMasterStore.addPackage({
      disciplineId: `disc-${newPackageDiscipline.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
      disciplineName: newPackageDiscipline,
      packageName: newPackageName.trim(),
      packageCode: generatedCode,
      description: newPackageDescription.trim() || undefined
    });

    toast.success(`Work Package "${newPackageName.trim()}" created successfully!`);
    setNewPackageName("");
    setNewPackageCode("");
    setNewPackageDescription("");
    setIsNewPackageModalOpen(false);
  };

  const handleUpdatePackage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPackage || !newPackageName.trim()) {
      toast.error("Package Name / Title is required.");
      return;
    }

    DesignMasterStore.updatePackage(editingPackage.id, {
      disciplineId: `disc-${newPackageDiscipline.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
      disciplineName: newPackageDiscipline,
      packageName: newPackageName.trim(),
      packageCode: newPackageCode.trim() || editingPackage.packageCode,
      description: newPackageDescription.trim() || undefined
    });

    toast.success(`Work Package "${newPackageName.trim()}" updated successfully!`);
    setIsEditPackageModalOpen(false);
    setEditingPackage(null);
  };

  const handleCreateAuthority = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAuthorityName.trim()) {
      toast.error("Authority / Body Name is required.");
      return;
    }

    DesignMasterStore.addAuthority({
      authorityName: newAuthorityName.trim(),
      scope: newAuthorityScope.trim() || "Statutory clearance",
      category: "Municipal"
    });

    toast.success(`Statutory Authority "${newAuthorityName.trim()}" registered successfully!`);
    setNewAuthorityName("");
    setNewAuthorityScope("");
    setIsNewAuthorityModalOpen(false);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {!isNewPackageModalOpen && !(isEditPackageModalOpen && editingPackage) && !isNewAuthorityModalOpen && (
        <>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3.5 w-full">
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
                        toast.success(`Work Package "${pkg.packageName}" deleted successfully.`);
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3.5 w-full">
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
                    toast.success(`Statutory Authority "${auth.authorityName}" deleted successfully.`);
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
                  toast.success("Design masters JSON backup exported successfully!");
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
                    toast.info("Design masters reset to initial blank state.");
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

        </>
      )}

      {/* Create New Work Package Transaction Layout */}
      {isNewPackageModalOpen && (
        <TransactionFormLayout
          title="Create New Work Package"
          category="Standard Work Packages Directory"
          icon={Layers}
          iconBg="bg-teal-500/10 text-teal-600 dark:text-teal-400"
          description="Register standardized engineering work package for drawing schedules, tender matrices, and consultant scopes."
          breadcrumbs={[
            { label: "Design Desk" },
            { label: "Masters Setup", onClick: () => setIsNewPackageModalOpen(false) },
            { label: "New Work Package" }
          ]}
          onBack={() => setIsNewPackageModalOpen(false)}
          backLabel="Back to Masters Setup"
          onReset={() => {
            setNewPackageName("");
            setNewPackageCode("");
            setNewPackageDescription("");
          }}
          onSave={handleCreatePackage}
          saveLabel="Create Work Package"
        >
          <div className="max-w-3xl space-y-6">
            <AppCard>
              <AppCardHeader>
                <AppCardTitle className="text-sm font-bold text-foreground">Package Specifications</AppCardTitle>
              </AppCardHeader>
              <AppCardContent className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-bold text-foreground block">Package Name / Title <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Structural Foundation & Superstructure"
                    value={newPackageName}
                    onChange={e => setNewPackageName(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-teal-500 font-semibold"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-bold text-foreground block">Discipline Category <span className="text-rose-500">*</span></label>
                    <select
                      value={newPackageDiscipline}
                      onChange={e => setNewPackageDiscipline(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-border bg-background text-foreground font-semibold focus:outline-hidden focus:ring-1 focus:ring-teal-500 cursor-pointer"
                    >
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-foreground block">Package Code</label>
                    <input
                      type="text"
                      placeholder="e.g. STR-001"
                      value={newPackageCode}
                      onChange={e => setNewPackageCode(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-border bg-background text-foreground font-mono focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-foreground block">Scope / Description</label>
                  <textarea
                    rows={3}
                    placeholder="Detailed deliverable scope, technical specifications, and milestones..."
                    value={newPackageDescription}
                    onChange={e => setNewPackageDescription(e.target.value)}
                    className="w-full p-3 rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </AppCardContent>
            </AppCard>
          </div>
        </TransactionFormLayout>
      )}

      {/* Edit Work Package Transaction Layout */}
      {isEditPackageModalOpen && editingPackage && (
        <TransactionFormLayout
          title={`Edit Work Package: ${editingPackage.packageName}`}
          category="Standard Work Packages Directory"
          icon={Layers}
          iconBg="bg-teal-500/10 text-teal-600 dark:text-teal-400"
          description="Update engineering scope, code identifier, or discipline categorization."
          breadcrumbs={[
            { label: "Design Desk" },
            { label: "Masters Setup", onClick: () => setIsEditPackageModalOpen(false) },
            { label: editingPackage.packageName }
          ]}
          onBack={() => setIsEditPackageModalOpen(false)}
          backLabel="Back to Masters Setup"
          onSave={handleUpdatePackage}
          saveLabel="Update Work Package"
        >
          <div className="max-w-3xl space-y-6">
            <AppCard>
              <AppCardHeader>
                <AppCardTitle className="text-sm font-bold text-foreground">Package Specifications</AppCardTitle>
              </AppCardHeader>
              <AppCardContent className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-bold text-foreground block">Package Name / Title <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={newPackageName}
                    onChange={e => setNewPackageName(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-teal-500 font-semibold"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-bold text-foreground block">Discipline Category <span className="text-rose-500">*</span></label>
                    <select
                      value={newPackageDiscipline}
                      onChange={e => setNewPackageDiscipline(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-border bg-background text-foreground font-semibold focus:outline-hidden focus:ring-1 focus:ring-teal-500 cursor-pointer"
                    >
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-foreground block">Package Code</label>
                    <input
                      type="text"
                      value={newPackageCode}
                      onChange={e => setNewPackageCode(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-border bg-background text-foreground font-mono focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-foreground block">Scope / Description</label>
                  <textarea
                    rows={3}
                    value={newPackageDescription}
                    onChange={e => setNewPackageDescription(e.target.value)}
                    className="w-full p-3 rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </AppCardContent>
            </AppCard>
          </div>
        </TransactionFormLayout>
      )}

      {/* Add Statutory Authority Transaction Layout */}
      {isNewAuthorityModalOpen && (
        <TransactionFormLayout
          title="Add Statutory Authority"
          category="Statutory Authority Directory"
          icon={ShieldCheck}
          iconBg="bg-purple-500/10 text-purple-600 dark:text-purple-400"
          description="Register civic, municipal, or regulatory authority for compliance and NOC tracking."
          breadcrumbs={[
            { label: "Design Desk" },
            { label: "Masters Setup", onClick: () => setIsNewAuthorityModalOpen(false) },
            { label: "New Authority" }
          ]}
          onBack={() => setIsNewAuthorityModalOpen(false)}
          backLabel="Back to Masters Setup"
          onReset={() => {
            setNewAuthorityName("");
            setNewAuthorityScope("");
          }}
          onSave={handleCreateAuthority}
          saveLabel="Save Statutory Authority"
        >
          <div className="max-w-3xl space-y-6">
            <AppCard>
              <AppCardHeader>
                <AppCardTitle className="text-sm font-bold text-foreground">Authority Scope Details</AppCardTitle>
              </AppCardHeader>
              <AppCardContent className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-bold text-foreground block">Authority / Regulatory Body Name <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Chief Fire Officer (CFO) / Tree Authority / MahaRERA"
                    value={newAuthorityName}
                    onChange={e => setNewAuthorityName(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-purple-500 font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-foreground block">Scope / Category Description</label>
                  <input
                    type="text"
                    placeholder="e.g. Fire Fighting & Life Safety NOC / Environmental Clearance"
                    value={newAuthorityScope}
                    onChange={e => setNewAuthorityScope(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </AppCardContent>
            </AppCard>
          </div>
        </TransactionFormLayout>
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

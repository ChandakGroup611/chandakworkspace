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
  Search,
  FolderTree,
  FileSpreadsheet
} from "lucide-react";
import { ProjectMasterView } from "./masters/ProjectMasterView";
import { SubProjectMasterView } from "./masters/SubProjectMasterView";
import { ConsultantMasterView } from "./masters/ConsultantMasterView";
import { CategoryMasterView } from "./masters/CategoryMasterView";
import { MasterBulkImportModal } from "./masters/MasterBulkImportModal";
import { MasterImportType } from "../services/masterImportExportService";
import { DesignRbacGovernance } from "./DesignRbacGovernance";
import { DeleteDependencyModal } from "./DeleteDependencyModal";
import { TransactionFormLayout } from "./DesignTransactionLayout";
import { AppCard, AppCardContent, AppCardHeader, AppCardTitle } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { 
  DmsDocTypeItem, 
  fetchDocTypesAndFieldsAction, 
  createDocTypeAction 
} from "@/lib/actions/dms-core";
import { confirmAction } from "@/components/ui/feedback/confirm";

export type MasterSubTab = 
  | "PROJECTS" 
  | "SUB_PROJECTS" 
  | "CONSULTANTS" 
  | "PACKAGES" 
  | "SUB_PACKAGES" 
  | "CATEGORIES" 
  | "AUTHORITIES" 
  | "RBAC" 
  | "TEMPLATES"
  | "DOC_TYPES";

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
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [bulkImportTarget, setBulkImportTarget] = useState<MasterImportType>("ALL");
  const [deleteModalReport, setDeleteModalReport] = useState<EntityDependencyReport | null>(null);
  const [activeDeleteExecutor, setActiveDeleteExecutor] = useState<((reason: string) => void) | null>(null);

  const handleTriggerDelete = (
    entityType: "PROJECT" | "SUB_PROJECT" | "TOWER" | "PACKAGE" | "SUB_PACKAGE" | "CONSULTANT" | "AUTHORITY" | "CATEGORY",
    entityId: string,
    executor: (reason: string) => void
  ) => {
    const report = DesignMasterStore.getEntityDependencies(entityType === "SUB_PACKAGE" ? "PACKAGE" : entityType, entityId);
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

  // Form states: Sub Package (Add & Edit)
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

  // Document Type Master State (Doc Sets)
  const [docTypes, setDocTypes] = useState<DmsDocTypeItem[]>([]);
  const [docTypeSearch, setDocTypeSearch] = useState<string>("");
  const [isNewDocTypeModalOpen, setIsNewDocTypeModalOpen] = useState<boolean>(false);
  const [newDocTypeName, setNewDocTypeName] = useState<string>("");
  const [newDocTypeCode, setNewDocTypeCode] = useState<string>("");
  const [newDocTypeDesc, setNewDocTypeDesc] = useState<string>("");
  const [isCreatingDocType, setIsCreatingDocType] = useState<boolean>(false);

  useEffect(() => {
    fetchDocTypesAndFieldsAction().then((res) => {
      if (res.success && res.docTypes) {
        setDocTypes(res.docTypes);
      }
    });
  }, []);

  const handleCreateDocType = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newDocTypeName.trim()) {
      toast.error("Document type name is required.");
      return;
    }
    setIsCreatingDocType(true);
    try {
      const res = await createDocTypeAction({
        name: newDocTypeName.trim(),
        code: newDocTypeCode.trim() || undefined,
        description: newDocTypeDesc.trim() || undefined,
      });
      if (res.success && res.docType) {
        setDocTypes((prev) => {
          const exists = prev.some((d) => d.id === res.docType!.id);
          return exists ? prev : [...prev, res.docType!];
        });
        toast.success(`Document Type "${res.docType.name}" created successfully!`);
        setIsNewDocTypeModalOpen(false);
        setNewDocTypeName("");
        setNewDocTypeCode("");
        setNewDocTypeDesc("");
      } else {
        toast.error(res.error || "Failed to create document type");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create document type");
    } finally {
      setIsCreatingDocType(false);
    }
  };

  const categories = DesignMasterStore.getPackagesMaster();
  const parentProjects = storeState.projects.filter(p => !p.isSubProject);

  const handleOpenAddPackage = () => {
    setEditingPackage(null);
    setNewPackageName("");
    setNewPackageCode("");
    setNewPackageDiscipline(categories[0]?.name || "Architectural");
    setNewPackageDescription("");
    setIsNewPackageModalOpen(true);
  };

  const handleOpenEditPackage = (pkg: WorkPackageMaster) => {
    setEditingPackage(pkg);
    setNewPackageName(pkg.subPackageName || pkg.packageName);
    setNewPackageCode(pkg.subPackageCode || pkg.packageCode || "");
    setNewPackageDiscipline(pkg.disciplineName || categories[0]?.name || "Architectural");
    setNewPackageDescription(pkg.description || "");
    setIsEditPackageModalOpen(true);
  };

  const handleCreatePackage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPackageName.trim()) {
      toast.error("Sub-package title / deliverable name is required.");
      return;
    }

    const generatedCode = newPackageCode.trim() || `PKG-${(storeState.packages.length + 1).toString().padStart(2, "0")}`;

    DesignMasterStore.addSubPackage({
      disciplineId: `disc-${newPackageDiscipline.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
      disciplineName: newPackageDiscipline,
      packageName: newPackageName.trim(),
      subPackageName: newPackageName.trim(),
      packageCode: generatedCode,
      subPackageCode: generatedCode,
      description: newPackageDescription.trim() || undefined
    });

    toast.success(`Sub-Package "${newPackageName.trim()}" created successfully!`);
    setNewPackageName("");
    setNewPackageCode("");
    setNewPackageDescription("");
    setIsNewPackageModalOpen(false);
  };

  const handleUpdatePackage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPackage || !newPackageName.trim()) {
      toast.error("Sub-package title / deliverable name is required.");
      return;
    }

    DesignMasterStore.updateSubPackage(editingPackage.id, {
      disciplineId: `disc-${newPackageDiscipline.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
      disciplineName: newPackageDiscipline,
      packageName: newPackageName.trim(),
      subPackageName: newPackageName.trim(),
      packageCode: newPackageCode.trim() || editingPackage.packageCode,
      subPackageCode: newPackageCode.trim() || editingPackage.packageCode,
      description: newPackageDescription.trim() || undefined
    });

    toast.success(`Sub-Package "${newPackageName.trim()}" updated successfully!`);
    setIsEditPackageModalOpen(false);
    setEditingPackage(null);
  };

  const handleCreateAuthority = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAuthorityName.trim()) {
      toast.error("Authority / body name is required.");
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
          {/* Top Master Sub-Tab Navigation Bar & Excel Import Action */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 rounded-lg bg-surface border border-border shadow-xs">
            <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 sm:pb-0 text-xs">
              {[
                { id: "PROJECTS" as MasterSubTab, label: "Projects", icon: Building2, count: parentProjects.length, color: "text-success-text" },
                { id: "SUB_PROJECTS" as MasterSubTab, label: "Sub-projects / wings", icon: FolderTree, count: storeState.towers.length, color: "text-accent-soft-text" },
                { id: "CONSULTANTS" as MasterSubTab, label: "Consultants", icon: Users, count: storeState.consultants.length, color: "text-info-text" },
                { id: "PACKAGES" as MasterSubTab, label: "Package Master", icon: Tag, count: categories.length, color: "text-accent-soft-text" },
                { id: "SUB_PACKAGES" as MasterSubTab, label: "Sub-Packages", icon: Layers, count: storeState.packages.length, color: "text-info-text" },
                { id: "AUTHORITIES" as MasterSubTab, label: "Authorities", icon: ShieldCheck, count: storeState.authorities.length, color: "text-warning-text" },
                { id: "DOC_TYPES" as MasterSubTab, label: "Document types", icon: Tag, count: docTypes.length, color: "text-accent-soft-text" },
                { id: "TEMPLATES" as MasterSubTab, label: "Templates & backup", icon: FileSpreadsheet, color: "text-subtle" }
              ].map(tab => {
                const Icon = tab.icon;
                const isSelected = activeSubTab === tab.id || (activeSubTab === "CATEGORIES" && tab.id === "PACKAGES");
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveSubTab(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                      isSelected
                        ? "bg-accent-soft text-accent-soft-text font-semibold"
                        : "text-muted hover:text-foreground hover:bg-sunken"
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${isSelected ? "text-current" : tab.color}`} />
                    <span>{tab.label}</span>
                    {tab.count !== undefined && (
                      <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-mono ${
                        isSelected ? "bg-surface/20 text-current" : "bg-sunken text-muted"
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <button
                type="button"
                onClick={() => {
                  const res = DesignMasterStore.loadEyTenderMasterData();
                  toast.success(`Loaded Chandak Tender Tracker: ${res.projects} Projects, ${res.towers} Towers, ${res.packages} Sub-Packages, ${res.matrixEntries} Matrix Entries.`);
                }}
                className="px-3.5 py-1.5 rounded-lg border border-warning-border bg-warning-soft hover:bg-warning-soft text-warning-text text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all shrink-0 whitespace-nowrap"
                title="Reload the full Chandak Tender Design Tracker R2 master dataset"
              >
                <Sparkles className="h-3.5 w-3.5 text-warning-text" />
                <span>Load Chandak master data (r2)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = activeSubTab === "TEMPLATES" || activeSubTab === "RBAC" 
                    ? "ALL" 
                    : activeSubTab === "CATEGORIES" 
                    ? "PACKAGES" 
                    : (activeSubTab as MasterImportType);
                  setBulkImportTarget(target);
                  setIsBulkImportOpen(true);
                }}
                className="px-3.5 py-1.5 rounded-lg border border-info-border bg-info-soft hover:bg-info-soft text-info-text text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all shrink-0 whitespace-nowrap"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span>Import Excel (.xlsx)</span>
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

      {/* Sub-tab 4: Package Master (Parent Engineering Packages) */}
      {(activeSubTab === "PACKAGES" || activeSubTab === "CATEGORIES") && (
        <CategoryMasterView />
      )}

      {/* Sub-tab 5: Sub Package Master (Deliverables linked to Parent Package) */}
      {activeSubTab === "SUB_PACKAGES" && (() => {
        const filteredPackages = storeState.packages.filter(pkg => {
          if (selectedDisciplineFilter !== "ALL" && pkg.disciplineName !== selectedDisciplineFilter) {
            return false;
          }
          if (packageSearchQuery.trim()) {
            const q = packageSearchQuery.toLowerCase();
            const matchName = (pkg.subPackageName || pkg.packageName).toLowerCase().includes(q);
            const matchCode = (pkg.subPackageCode || pkg.packageCode || "").toLowerCase().includes(q);
            const matchDisc = (pkg.disciplineName || "").toLowerCase().includes(q);
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
                <h4 className="text-sm font-semibold text-foreground">Sub-package deliverables master</h4>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setBulkImportTarget("SUB_PACKAGES");
                    setIsBulkImportOpen(true);
                  }}
                  className="px-3.5 py-1.5 rounded-lg border border-border bg-surface hover:bg-sunken text-foreground text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all shrink-0 whitespace-nowrap"
                >
                  <Upload className="h-3.5 w-3.5 text-info-text" />
                  <span>Import Sub-Packages</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenAddPackage}
                  className="px-3.5 py-1.5 rounded-lg bg-surface border border-border-active hover:bg-surface-hover text-foreground text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs cursor-pointer transition-all shrink-0 whitespace-nowrap"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add sub package</span>
                </button>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="p-3 rounded-lg border border-border bg-surface shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    value={packageSearchQuery}
                    onChange={e => setPackageSearchQuery(e.target.value)}
                    placeholder="Search sub-packages by name, code…"
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-info-border"
                  />
                </div>

                <div className="text-xs text-muted-foreground font-medium">
                  Showing <strong>{filteredPackages.length}</strong> of {storeState.packages.length} Sub-Packages
                </div>
              </div>

              {/* Parent Package Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 text-xs">
                <span className="text-[11px] font-semibold text-muted-foreground mr-1 shrink-0 flex items-center gap-1">
                  <SlidersHorizontal className="h-3 w-3" />
                  <span>Parent Package:</span>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedDisciplineFilter("ALL")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                    selectedDisciplineFilter === "ALL"
                      ? "bg-accent-soft text-accent-soft-text font-semibold"
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
                          ? "bg-accent-soft text-accent-soft-text font-semibold"
                          : "bg-muted/40 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span>{cat.name}</span>
                      <span className="opacity-70 text-[11px]">({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sub-Packages Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3.5 w-full">
              {filteredPackages.map(pkg => (
                <div
                  key={pkg.id}
                  className="p-3.5 rounded-lg border border-border bg-surface hover:border-info-border shadow-xs transition-all flex items-start justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-mono font-semibold px-1.5 py-0.2 rounded bg-info-soft text-info-text border border-info-border">
                        {pkg.subPackageCode || pkg.packageCode || "PKG"}
                      </span>
                      <span className="text-[11px] font-semibold text-muted-foreground bg-muted/40 px-1.5 py-0.2 rounded">
                        {pkg.disciplineName}
                      </span>
                    </div>
                    <h5 className="text-xs font-semibold text-foreground truncate">{pkg.subPackageName || pkg.packageName}</h5>
                    {pkg.description && (
                      <p className="text-[11px] text-muted-foreground line-clamp-1">{pkg.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button aria-label="Edit"
                      type="button"
                      onClick={() => handleOpenEditPackage(pkg)}
                      className="h-6 w-6 rounded hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                    <button aria-label="Delete"
                      type="button"
                      onClick={() => handleTriggerDelete("PACKAGE", pkg.id, (reason) => {
                        DesignMasterStore.deleteSubPackage(pkg.id, reason, "Design Lead");
                        toast.success(`Sub-Package "${pkg.subPackageName || pkg.packageName}" deleted successfully.`);
                      })}
                      className="h-6 w-6 rounded hover:bg-danger-soft text-muted-foreground hover:text-danger-text flex items-center justify-center cursor-pointer"
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
              <h4 className="text-sm font-semibold text-foreground">Statutory authorities & NOC clearance bodies</h4>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setBulkImportTarget("AUTHORITIES");
                  setIsBulkImportOpen(true);
                }}
                className="px-3.5 py-1.5 rounded-lg border border-border bg-surface hover:bg-sunken text-foreground text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all shrink-0 whitespace-nowrap"
              >
                <Upload className="h-3.5 w-3.5 text-accent-soft-text" />
                <span>Import authorities (Excel)</span>
              </button>
              <button
                type="button"
                onClick={() => setIsNewAuthorityModalOpen(true)}
                className="px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs cursor-pointer transition-all shrink-0 whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add authority</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3.5 w-full">
            {storeState.authorities.map(auth => (
              <div
                key={auth.id}
                className="p-3.5 rounded-lg border border-border bg-surface hover:border-border-active shadow-xs transition-all flex items-start justify-between gap-3"
              >
                <div className="space-y-1 min-w-0">
                  <span className="text-[11px] font-semibold px-1.5 py-0.2 rounded bg-surface text-foreground dark:text-muted-foreground border border-border">
                    {auth.category}
                  </span>
                  <h5 className="text-xs font-semibold text-foreground truncate">{auth.authorityName}</h5>
                  <p className="text-[11px] text-muted-foreground line-clamp-1">{auth.scope}</p>
                </div>

                <button aria-label="Delete"
                  type="button"
                  onClick={() => handleTriggerDelete("AUTHORITY", auth.id, (reason) => {
                    DesignMasterStore.deleteAuthority(auth.id, reason, "Design Lead");
                    toast.success(`Statutory Authority "${auth.authorityName}" deleted successfully.`);
                  })}
                  className="h-6 w-6 rounded hover:bg-danger-soft text-muted-foreground hover:text-danger-text flex items-center justify-center cursor-pointer shrink-0"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub-tab: Document Types Master (Doc Sets) */}
      {activeSubTab === "DOC_TYPES" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-foreground">Document types & doc sets master</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Classifications and folder indexing schemas for drawing sets, specifications, and dossiers.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="relative w-48 sm:w-60">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  value={docTypeSearch}
                  onChange={e => setDocTypeSearch(e.target.value)}
                  placeholder="Filter document types…"
                  className="w-full text-xs rounded-lg bg-surface border border-border pl-8 pr-3 py-1.5 text-foreground focus:ring-1 focus:ring-ring"
                />
              </div>
              <button
                type="button"
                onClick={() => setIsNewDocTypeModalOpen(true)}
                className="px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs cursor-pointer transition-all shrink-0 whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add document type</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3.5 w-full">
            {docTypes
              .filter(dt => {
                if (!docTypeSearch.trim()) return true;
                const q = docTypeSearch.toLowerCase();
                return dt.name.toLowerCase().includes(q) || dt.code.toLowerCase().includes(q);
              })
              .map(dt => (
                <div
                  key={dt.id}
                  className="p-3.5 rounded-lg border border-border bg-surface hover:border-border-active shadow-xs transition-all flex items-start justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <span className="text-[11px] font-mono font-semibold px-1.5 py-0.2 rounded bg-accent-soft text-accent-soft-text border border-border">
                      {dt.code}
                    </span>
                    <h5 className="text-xs font-semibold text-foreground truncate">{dt.name}</h5>
                    <p className="text-[11px] text-muted-foreground line-clamp-2">
                      {dt.description || "Core DMS classification set"}
                    </p>
                  </div>
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
          <div className="p-4 rounded-lg border border-border bg-surface space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Workspace state management</h4>
            
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setBulkImportTarget("ALL");
                  setIsBulkImportOpen(true);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-surface border border-border-active hover:bg-surface-hover text-foreground text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm cursor-pointer transition-all"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Bulk import & template center</span>
              </button>
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
                className="px-3.5 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-foreground text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export JSON backup</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  if (await confirmAction({ title: "Reset all design masters?", description: "Every master returns to its initial blank state. Export a JSON backup first if you need the current data.", confirmLabel: "Reset masters", tone: "danger" })) {
                    DesignMasterStore.resetToBlank();
                    toast.info("Design masters reset to initial blank state.");
                  }
                }}
                className="px-3.5 py-1.5 rounded-lg border border-danger-border bg-danger-soft hover:bg-danger-soft text-danger-text text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset to blank</span>
              </button>
            </div>
          </div>
        </div>
      )}

        </>
      )}

      {/* Create New Sub-Package Transaction Layout */}
      {isNewPackageModalOpen && (
        <TransactionFormLayout
          title="Create new sub-package"
          category="Sub-Package Deliverables Master"
          icon={Layers}
          iconBg="bg-info-soft text-info-text"
          description="Register standardized engineering sub-package deliverable for drawing schedules, tender matrices, and consultant scopes."
          breadcrumbs={[
            { label: "Design Desk" },
            { label: "Masters Setup", onClick: () => setIsNewPackageModalOpen(false) },
            { label: "New Sub-Package" }
          ]}
          onBack={() => setIsNewPackageModalOpen(false)}
          backLabel="Back to Masters Setup"
          onReset={() => {
            setNewPackageName("");
            setNewPackageCode("");
            setNewPackageDescription("");
          }}
          onSave={handleCreatePackage}
          saveLabel="Create Sub-Package"
        >
          <div className="max-w-3xl space-y-6">
            <AppCard>
              <AppCardHeader>
                <AppCardTitle className="text-sm font-semibold text-foreground">Sub-package specifications</AppCardTitle>
              </AppCardHeader>
              <AppCardContent className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground block">Sub-package title / deliverable name <span className="text-danger-text">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., structural foundation & superstructure"
                    value={newPackageName}
                    onChange={e => setNewPackageName(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-info-border font-semibold"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground block">Parent package <span className="text-danger-text">*</span></label>
                    <select
                      value={newPackageDiscipline}
                      onChange={e => setNewPackageDiscipline(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground font-semibold focus:outline-hidden focus:ring-1 focus:ring-info-border cursor-pointer"
                    >
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground block">Sub-package code</label>
                    <input
                      type="text"
                      placeholder="e.g. STR-001"
                      value={newPackageCode}
                      onChange={e => setNewPackageCode(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground font-mono focus:outline-hidden focus:ring-1 focus:ring-info-border"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground block">Scope / description</label>
                  <textarea
                    rows={3}
                    placeholder="Detailed deliverable scope, technical specifications, and milestones…"
                    value={newPackageDescription}
                    onChange={e => setNewPackageDescription(e.target.value)}
                    className="w-full p-3 rounded-lg border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-info-border"
                  />
                </div>
              </AppCardContent>
            </AppCard>
          </div>
        </TransactionFormLayout>
      )}

      {/* Edit Sub-Package Transaction Layout */}
      {isEditPackageModalOpen && editingPackage && (
        <TransactionFormLayout
          title={`Edit Sub-Package: ${editingPackage.subPackageName || editingPackage.packageName}`}
          category="Sub-Package Deliverables Master"
          icon={Layers}
          iconBg="bg-info-soft text-info-text"
          description="Update engineering deliverable scope, code identifier, or parent package linkage."
          breadcrumbs={[
            { label: "Design Desk" },
            { label: "Masters Setup", onClick: () => setIsEditPackageModalOpen(false) },
            { label: editingPackage.subPackageName || editingPackage.packageName }
          ]}
          onBack={() => setIsEditPackageModalOpen(false)}
          backLabel="Back to Masters Setup"
          onSave={handleUpdatePackage}
          saveLabel="Update Sub-Package"
        >
          <div className="max-w-3xl space-y-6">
            <AppCard>
              <AppCardHeader>
                <AppCardTitle className="text-sm font-semibold text-foreground">Sub-package specifications</AppCardTitle>
              </AppCardHeader>
              <AppCardContent className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground block">Sub-package title / deliverable name <span className="text-danger-text">*</span></label>
                  <input
                    type="text"
                    required
                    value={newPackageName}
                    onChange={e => setNewPackageName(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-info-border font-semibold"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground block">Parent package <span className="text-danger-text">*</span></label>
                    <select
                      value={newPackageDiscipline}
                      onChange={e => setNewPackageDiscipline(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground font-semibold focus:outline-hidden focus:ring-1 focus:ring-info-border cursor-pointer"
                    >
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground block">Sub-package code</label>
                    <input
                      type="text"
                      value={newPackageCode}
                      onChange={e => setNewPackageCode(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground font-mono focus:outline-hidden focus:ring-1 focus:ring-info-border"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground block">Scope / description</label>
                  <textarea
                    rows={3}
                    value={newPackageDescription}
                    onChange={e => setNewPackageDescription(e.target.value)}
                    className="w-full p-3 rounded-lg border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-info-border"
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
          title="Add statutory authority"
          category="Statutory Authority Directory"
          icon={ShieldCheck}
          iconBg="bg-surface text-accent-soft-text dark:text-muted-foreground"
          description="Register civic, municipal, or regulatory authority for compliance and NOC tracking."
          breadcrumbs={[
            { label: "Design Desk" },
            { label: "Masters Setup", onClick: () => setIsNewAuthorityModalOpen(false) },
            { label: "New authority" }
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
                <AppCardTitle className="text-sm font-semibold text-foreground">Authority scope details</AppCardTitle>
              </AppCardHeader>
              <AppCardContent className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground block">Authority / regulatory body name <span className="text-danger-text">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Chief fire officer (CFO) / tree authority / MahaRERA"
                    value={newAuthorityName}
                    onChange={e => setNewAuthorityName(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground block">Scope / category description</label>
                  <input
                    type="text"
                    placeholder="e.g. Fire fighting & life safety NOC / environmental clearance"
                    value={newAuthorityScope}
                    onChange={e => setNewAuthorityScope(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring"
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

      <MasterBulkImportModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        initialMasterType={bulkImportTarget}
      />

      {/* QUICK ADD DOCUMENT TYPE MODAL IN MASTERS */}
      {isNewDocTypeModalOpen && (
        <div className="fixed inset-0 z-70 bg-[var(--overlay)] flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-lg shadow-lg max-w-md w-full overflow-hidden animate-in zoom-in-95">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-accent-soft-text" />
                <h3 className="text-sm font-semibold text-foreground">Add document type master</h3>
              </div>
              <button aria-label="Close"
                type="button"
                onClick={() => setIsNewDocTypeModalOpen(false)}
                className="p-1 hover:bg-surface rounded-md text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDocType} className="p-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  Document type name *
                </label>
                <input
                  type="text"
                  value={newDocTypeName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewDocTypeName(val);
                    if (
                      !newDocTypeCode ||
                      newDocTypeCode ===
                        newDocTypeName.toUpperCase().replace(/[^A-Z0-9_]/g, "_").slice(0, 32)
                    ) {
                      setNewDocTypeCode(val.toUpperCase().replace(/[^A-Z0-9_]/g, "_").slice(0, 32));
                    }
                  }}
                  placeholder="e.g. Facade engineering & details"
                  className="w-full mt-1.5 text-xs rounded-lg bg-surface border border-border p-2.5 text-foreground focus:ring-1 focus:ring-ring"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  Type code *
                </label>
                <input
                  type="text"
                  value={newDocTypeCode}
                  onChange={(e) =>
                    setNewDocTypeCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "_"))
                  }
                  placeholder="e.g. FACADE_ENG"
                  className="w-full mt-1.5 text-xs font-mono rounded-lg bg-surface border border-border p-2.5 text-foreground focus:ring-1 focus:ring-ring"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  Description
                </label>
                <textarea
                  value={newDocTypeDesc}
                  onChange={(e) => setNewDocTypeDesc(e.target.value)}
                  placeholder="Brief description of documents classified under this type…"
                  rows={2}
                  className="w-full mt-1.5 text-xs rounded-lg bg-surface border border-border p-2.5 text-foreground focus:ring-1 focus:ring-ring resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsNewDocTypeModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border hover:bg-surface text-muted-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingDocType || !newDocTypeName.trim()}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-primary hover:bg-primary-hover text-primary-foreground shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>{isCreatingDocType ? "Saving..." : "Create Master"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

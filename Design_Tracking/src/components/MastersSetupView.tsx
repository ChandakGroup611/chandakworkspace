"use client";

import React, { useState, useEffect } from "react";
import { 
  DesignMasterStore, 
  MasterStoreState 
} from "../services/designMasterStore";
import { 
  ProjectMaster, 
  TowerMaster, 
  WorkPackageMaster, 
  StatutoryAuthorityMaster 
} from "../types/masterTypes";
import { 
  Building2, 
  Building,
  Layers, 
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
  Tag
} from "lucide-react";
import { DesignRbacGovernance } from "./DesignRbacGovernance";

type MasterSubTab = "PROJECTS" | "PACKAGES" | "AUTHORITIES" | "RBAC" | "TEMPLATES";

interface MastersSetupViewProps {
  initialSubTab?: MasterSubTab;
}

export const MastersSetupView: React.FC<MastersSetupViewProps> = ({ initialSubTab = "PROJECTS" }) => {
  const [storeState, setStoreState] = useState<MasterStoreState>(DesignMasterStore.getState());
  const [activeSubTab, setActiveSubTab] = useState<MasterSubTab>(initialSubTab);

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

  // Form states: Project (Add & Edit)
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isEditProjectModalOpen, setIsEditProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectMaster | null>(null);

  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectCode, setNewProjectCode] = useState("");
  const [newProjectLocation, setNewProjectLocation] = useState("Mumbai MMR");
  const [newProjectType, setNewProjectType] = useState("Residential High-Rise");
  const [newProjectPlotArea, setNewProjectPlotArea] = useState("");
  const [newProjectBUA, setNewProjectBUA] = useState("");
  const [newProjectBudget, setNewProjectBudget] = useState("");
  const [newProjectRera, setNewProjectRera] = useState("");
  const [newProjectStatus, setNewProjectStatus] = useState("Planning & Design");
  const [newProjectTargetDate, setNewProjectTargetDate] = useState("");
  const [newProjectLeadManager, setNewProjectLeadManager] = useState("");
  const [newProjectLeadManagerEmail, setNewProjectLeadManagerEmail] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [selectedTaggedConsultants, setSelectedTaggedConsultants] = useState<string[]>([]);
  const [selectedTaggedCategories, setSelectedTaggedCategories] = useState<string[]>([]);
  const [projectConsultantSearch, setProjectConsultantSearch] = useState("");
  const [customProjectConsultantInput, setCustomProjectConsultantInput] = useState("");

  // Sub-Project & Scope Hierarchy State
  const [isSubProject, setIsSubProject] = useState(false);
  const [parentProjectId, setParentProjectId] = useState("");
  const [subProjectScopeLevel, setSubProjectScopeLevel] = useState<"PROJECT" | "SUBPROJECT">("PROJECT");

  // Form states: New / Edit Tower (Sub-Project Wing)
  const [isNewTowerModalOpen, setIsNewTowerModalOpen] = useState(false);
  const [isEditTowerModalOpen, setIsEditTowerModalOpen] = useState(false);
  const [editingTower, setEditingTower] = useState<TowerMaster | null>(null);
  const [selectedProjectIdForTower, setSelectedProjectIdForTower] = useState("");
  const [newTowerName, setNewTowerName] = useState("");
  const [newTowerType, setNewTowerType] = useState<TowerMaster["towerType"]>("Sale");
  const [newTowerTaggedConsultants, setNewTowerTaggedConsultants] = useState<string[]>([]);
  const [newTowerTaggedCategories, setNewTowerTaggedCategories] = useState<string[]>([]);
  const [towerConsultantSearch, setTowerConsultantSearch] = useState("");

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

  const DISCIPLINE_OPTIONS = [
    "Civil & RCC",
    "Structural",
    "MEPF Services",
    "Architectural",
    "Finishing & Interiors",
    "Facade & Glazing",
    "Landscape & Infrastructure",
    "Vertical Transport",
    "Geotechnical & Soil",
    "Specialist Studies",
    "BIM Coordination"
  ];

  const handleOpenAddProject = () => {
    setEditingProject(null);
    setNewProjectName("");
    setNewProjectCode("");
    setNewProjectLocation("Mumbai MMR");
    setNewProjectType("Residential High-Rise");
    setNewProjectPlotArea("");
    setNewProjectBUA("");
    setNewProjectBudget("");
    setNewProjectRera("");
    setNewProjectStatus("Planning & Design");
    setNewProjectTargetDate("");
    setNewProjectLeadManager("");
    setNewProjectLeadManagerEmail("");
    setNewProjectDescription("");
    // Default ALL consultants and ALL categories allowed/selected (user can remove non-applicable ones)
    setSelectedTaggedConsultants(storeState.consultants.map(c => c.name));
    setSelectedTaggedCategories([...DISCIPLINE_OPTIONS]);
    setProjectConsultantSearch("");
    setCustomProjectConsultantInput("");
    setIsSubProject(false);
    setParentProjectId("");
    setSubProjectScopeLevel("PROJECT");
    setIsNewProjectModalOpen(true);
  };

  const handleOpenEditProject = (proj: ProjectMaster) => {
    setEditingProject(proj);
    setNewProjectName(proj.name);
    setNewProjectCode(proj.code);
    setNewProjectLocation(proj.location || "Mumbai MMR");
    setNewProjectType(proj.projectType || "Residential High-Rise");
    setNewProjectPlotArea(proj.plotArea || "");
    setNewProjectBUA(proj.builtUpArea || "");
    setNewProjectBudget(proj.estimatedBudget || "");
    setNewProjectRera(proj.reraNumber || "");
    setNewProjectStatus(proj.projectStatus || "Planning & Design");
    setNewProjectTargetDate(proj.targetCompletionDate || "");
    setNewProjectLeadManager(proj.leadManager || "");
    setNewProjectLeadManagerEmail(proj.leadManagerEmail || "");
    setNewProjectDescription(proj.description || "");
    setSelectedTaggedConsultants(proj.taggedConsultants && proj.taggedConsultants.length > 0 ? proj.taggedConsultants : storeState.consultants.map(c => c.name));
    setSelectedTaggedCategories(proj.subProjectCategories?.default || [...DISCIPLINE_OPTIONS]);
    setProjectConsultantSearch("");
    setCustomProjectConsultantInput("");
    setIsSubProject(!!proj.isSubProject);
    setParentProjectId(proj.parentProjectId || "");
    setSubProjectScopeLevel(proj.isSubProject ? "SUBPROJECT" : "PROJECT");
    setIsEditProjectModalOpen(true);
  };

  const handleToggleProjectConsultant = (consName: string) => {
    setSelectedTaggedConsultants(prev => 
      prev.includes(consName) ? prev.filter(c => c !== consName) : [...prev, consName]
    );
  };

  const handleToggleProjectCategory = (catName: string) => {
    setSelectedTaggedCategories(prev => 
      prev.includes(catName) ? prev.filter(c => c !== catName) : [...prev, catName]
    );
  };

  const handleToggleTowerConsultant = (consName: string) => {
    setNewTowerTaggedConsultants(prev =>
      prev.includes(consName) ? prev.filter(c => c !== consName) : [...prev, consName]
    );
  };

  const handleToggleTowerCategory = (catName: string) => {
    setNewTowerTaggedCategories(prev =>
      prev.includes(catName) ? prev.filter(c => c !== catName) : [...prev, catName]
    );
  };

  const handleAddCustomProjectConsultant = (e: React.KeyboardEvent | React.MouseEvent) => {
    if (("key" in e && e.key === "Enter") || !("key" in e)) {
      e.preventDefault();
      const val = customProjectConsultantInput.trim();
      if (val && !selectedTaggedConsultants.includes(val)) {
        setSelectedTaggedConsultants(prev => [...prev, val]);
        setCustomProjectConsultantInput("");
      }
    }
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    const parentProj = parentProjectId ? storeState.projects.find(p => p.id === parentProjectId) : null;
    const code = newProjectCode.trim() || `CDK-${newProjectName.slice(0, 3).toUpperCase()}`;
    DesignMasterStore.addProject({
      name: newProjectName.trim(),
      code,
      location: newProjectLocation.trim(),
      projectType: newProjectType,
      plotArea: newProjectPlotArea.trim() || undefined,
      builtUpArea: newProjectBUA.trim() || undefined,
      estimatedBudget: newProjectBudget.trim() || undefined,
      reraNumber: newProjectRera.trim() || undefined,
      projectStatus: newProjectStatus,
      targetCompletionDate: newProjectTargetDate.trim() || undefined,
      leadManager: newProjectLeadManager.trim() || undefined,
      leadManagerEmail: newProjectLeadManagerEmail.trim() || undefined,
      description: newProjectDescription.trim() || undefined,
      taggedConsultants: selectedTaggedConsultants,
      isSubProject,
      parentProjectId: isSubProject ? parentProjectId : undefined,
      parentProjectName: isSubProject && parentProj ? parentProj.name : undefined,
      subProjectCategories: { default: selectedTaggedCategories }
    });

    setIsNewProjectModalOpen(false);
  };

  const handleUpdateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject || !newProjectName.trim()) return;

    const parentProj = parentProjectId ? storeState.projects.find(p => p.id === parentProjectId) : null;
    DesignMasterStore.updateProject(editingProject.id, {
      name: newProjectName.trim(),
      code: newProjectCode.trim() || editingProject.code,
      location: newProjectLocation.trim(),
      projectType: newProjectType,
      plotArea: newProjectPlotArea.trim() || undefined,
      builtUpArea: newProjectBUA.trim() || undefined,
      estimatedBudget: newProjectBudget.trim() || undefined,
      reraNumber: newProjectRera.trim() || undefined,
      projectStatus: newProjectStatus,
      targetCompletionDate: newProjectTargetDate.trim() || undefined,
      leadManager: newProjectLeadManager.trim() || undefined,
      leadManagerEmail: newProjectLeadManagerEmail.trim() || undefined,
      description: newProjectDescription.trim() || undefined,
      taggedConsultants: selectedTaggedConsultants,
      isSubProject,
      parentProjectId: isSubProject ? parentProjectId : undefined,
      parentProjectName: isSubProject && parentProj ? parentProj.name : undefined,
      subProjectCategories: { default: selectedTaggedCategories }
    });

    setIsEditProjectModalOpen(false);
    setEditingProject(null);
  };

  const handleOpenAddTower = (projectId: string) => {
    setSelectedProjectIdForTower(projectId);
    setEditingTower(null);
    setNewTowerName("");
    setNewTowerType("Sale");
    setNewTowerTaggedConsultants(storeState.consultants.map(c => c.name));
    setNewTowerTaggedCategories([...DISCIPLINE_OPTIONS]);
    setTowerConsultantSearch("");
    setIsNewTowerModalOpen(true);
  };

  const handleOpenEditTower = (twr: TowerMaster) => {
    setEditingTower(twr);
    setSelectedProjectIdForTower(twr.projectId);
    setNewTowerName(twr.towerName);
    setNewTowerType(twr.towerType);
    setNewTowerTaggedConsultants(twr.taggedConsultants && twr.taggedConsultants.length > 0 ? twr.taggedConsultants : storeState.consultants.map(c => c.name));
    setNewTowerTaggedCategories(twr.taggedCategories && twr.taggedCategories.length > 0 ? twr.taggedCategories : [...DISCIPLINE_OPTIONS]);
    setTowerConsultantSearch("");
    setIsEditTowerModalOpen(true);
  };

  const handleCreateTower = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTowerName.trim() || !selectedProjectIdForTower) return;

    DesignMasterStore.addTower({
      projectId: selectedProjectIdForTower,
      towerName: newTowerName.trim(),
      towerType: newTowerType,
      taggedConsultants: newTowerTaggedConsultants,
      taggedCategories: newTowerTaggedCategories
    });

    setNewTowerName("");
    setIsNewTowerModalOpen(false);
  };

  const handleUpdateTower = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTower || !newTowerName.trim()) return;

    DesignMasterStore.updateTower(editingTower.id, {
      towerName: newTowerName.trim(),
      towerType: newTowerType,
      taggedConsultants: newTowerTaggedConsultants,
      taggedCategories: newTowerTaggedCategories
    });

    setEditingTower(null);
    setIsEditTowerModalOpen(false);
  };

  const handleOpenAddPackage = () => {
    setEditingPackage(null);
    setNewPackageName("");
    setNewPackageCode("");
    setNewPackageDiscipline("Civil & RCC");
    setNewPackageDescription("");
    setIsNewPackageModalOpen(true);
  };

  const handleOpenEditPackage = (pkg: WorkPackageMaster) => {
    setEditingPackage(pkg);
    setNewPackageName(pkg.packageName);
    setNewPackageCode(pkg.packageCode || "");
    setNewPackageDiscipline(pkg.disciplineName || "Civil & RCC");
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
      <div className="p-5 rounded-2xl border border-border bg-surface shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-500/20 shrink-0">
            <Settings className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">
              Design Masters Setup
            </h2>
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
            <Building2 className="h-3.5 w-3.5" />
            <span>Projects & Wings ({storeState.projects.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("PACKAGES")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
              activeSubTab === "PACKAGES" ? "bg-surface text-foreground shadow-2xs font-bold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Work Packages ({storeState.packages.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("AUTHORITIES")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
              activeSubTab === "AUTHORITIES" ? "bg-surface text-foreground shadow-2xs font-bold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
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
            <span>RBAC Policies (CRUD)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("TEMPLATES")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
              activeSubTab === "TEMPLATES" ? "bg-surface text-foreground shadow-2xs font-bold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Backup & Templates</span>
          </button>
        </div>
      </div>

      {/* Sub-tab 1: Projects & Towers Master */}
      {activeSubTab === "PROJECTS" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-foreground">Development Projects & Tower Wings</h4>
              <p className="text-xs text-muted-foreground">Comprehensive real estate project masters with specifications, tagged consultants, and tower wings</p>
            </div>
            <button
              type="button"
              onClick={handleOpenAddProject}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-md cursor-pointer transition-all shrink-0 whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add New Project</span>
            </button>
          </div>

          {storeState.projects.length === 0 ? (
            <div className="p-8 rounded-2xl border border-dashed border-border bg-surface text-center space-y-3">
              <div className="h-10 w-10 mx-auto rounded-xl bg-muted text-muted-foreground flex items-center justify-center">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h5 className="text-sm font-bold text-foreground">No Projects Created Yet</h5>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Register your development projects, specify area parameters, and tag specialized consultant partners.
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenAddProject}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create First Project</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {storeState.projects.map(proj => {
                const projTowers = storeState.towers.filter(t => t.projectId === proj.id);
                const taggedConsList = proj.taggedConsultants || [];

                return (
                  <div 
                    key={proj.id}
                    className="p-5 rounded-2xl border border-border bg-surface shadow-xs space-y-4 flex flex-col justify-between hover:border-emerald-500/40 transition-all"
                  >
                    <div className="space-y-3.5">
                      {/* Project Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 whitespace-nowrap">
                              {proj.code}
                            </span>
                            {proj.isSubProject ? (
                              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/30 whitespace-nowrap flex items-center gap-1">
                                <Building className="h-2.5 w-2.5" />
                                <span>Sub-Project {proj.parentProjectName ? `(Parent: ${proj.parentProjectName})` : ""}</span>
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 bg-slate-500/10 px-2 py-0.5 rounded border border-slate-500/20 whitespace-nowrap">
                                Main Project
                              </span>
                            )}
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
                          <span className="text-xs text-muted-foreground">{proj.location}</span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenEditProject(proj)}
                            className="h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                            title="Edit project details & consultants"
                          >
                            <SlidersHorizontal className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Delete project "${proj.name}" and all its associated wings?`)) {
                                DesignMasterStore.deleteProject(proj.id);
                              }
                            }}
                            className="h-7 w-7 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 flex items-center justify-center transition-colors cursor-pointer"
                            title="Delete project"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Detailed Project Specifications Grid */}
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
                            <span className="text-[10px] text-muted-foreground block font-medium">Est. Budget:</span>
                            <span className="font-bold text-foreground">{proj.estimatedBudget}</span>
                          </div>
                        )}
                        {proj.reraNumber && (
                          <div>
                            <span className="text-[10px] text-muted-foreground block font-medium">MahaRERA No:</span>
                            <span className="font-mono font-bold text-foreground text-[11px]">{proj.reraNumber}</span>
                          </div>
                        )}
                        {proj.targetCompletionDate && (
                          <div>
                            <span className="text-[10px] text-muted-foreground block font-medium">Target Handover:</span>
                            <span className="font-bold text-foreground">{proj.targetCompletionDate}</span>
                          </div>
                        )}
                        {proj.leadManager && (
                          <div>
                            <span className="text-[10px] text-muted-foreground block font-medium">Lead Manager:</span>
                            <span className="font-bold text-foreground truncate block">{proj.leadManager}</span>
                          </div>
                        )}
                      </div>

                      {/* 🤝 Tagged Consultants Section (Project-Level) */}
                      <div className="space-y-1.5 pt-1 border-t border-border">
                        <span className="text-[11px] font-bold text-muted-foreground flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <ShieldCheck className="h-3.5 w-3.5 text-purple-500" />
                            <span>Tagged Consultants ({taggedConsList.length}):</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenEditProject(proj)}
                            className="text-[10px] text-purple-600 dark:text-purple-400 hover:underline cursor-pointer font-semibold"
                          >
                            + Tag / Manage
                          </button>
                        </span>
                        <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto custom-scrollbar">
                          {taggedConsList.length > 0 ? (
                            taggedConsList.map((consName, idx) => {
                              const consMaster = storeState.consultants.find(c => c.name === consName || c.id === consName);
                              return (
                                <span 
                                  key={idx}
                                  className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 flex items-center gap-1"
                                >
                                  <span>{consName}</span>
                                  {consMaster && (
                                    <span className="text-[9px] text-muted-foreground">({consMaster.category})</span>
                                  )}
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-[11px] text-muted-foreground italic">
                              No consultants tagged yet. Click &ldquo;+ Tag / Manage&rdquo; to assign partners.
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Sub-Project Wings / Towers list */}
                      <div className="space-y-1.5 pt-1 border-t border-border">
                        <span className="text-[11px] font-bold text-muted-foreground flex items-center justify-between">
                          <span>Sub-Projects / Tower Wings ({projTowers.length}):</span>
                          <button
                            type="button"
                            onClick={() => handleOpenAddTower(proj.id)}
                            className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer font-semibold"
                          >
                            + Add Sub-Project Wing
                          </button>
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {projTowers.map(twr => (
                            <span 
                              key={twr.id}
                              className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-foreground border border-border flex items-center gap-1.5 group whitespace-nowrap shadow-2xs"
                            >
                              <span>{twr.towerName}</span>
                              <span className="text-[9px] text-muted-foreground font-normal">({twr.towerType})</span>
                              {twr.taggedConsultants && twr.taggedConsultants.length > 0 && (
                                <span className="text-[9px] px-1 py-0.2 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 font-mono">
                                  {twr.taggedConsultants.length} cons
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => handleOpenEditTower(twr)}
                                className="text-muted-foreground hover:text-purple-600 dark:hover:text-purple-400 ml-0.5 cursor-pointer p-0.5"
                                title="Edit wing consultants & categories"
                              >
                                <Edit2 className="h-2.5 w-2.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => DesignMasterStore.deleteTower(twr.id)}
                                className="text-muted-foreground hover:text-rose-500 ml-0.5 cursor-pointer p-0.5"
                                title="Delete wing"
                              >
                                <X className="h-2.5 w-2.5" />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleOpenAddTower(proj.id)}
                        className="text-xs text-emerald-600 dark:text-emerald-400 font-bold inline-flex items-center gap-1 hover:underline cursor-pointer whitespace-nowrap"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Add Wing / Sub-Project</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEditProject(proj)}
                        className="text-xs text-muted-foreground hover:text-foreground font-semibold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                      >
                        <span>Edit Project Specs</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Sub-tab 2: Work Packages Master */}
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
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-md cursor-pointer transition-all shrink-0 whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Work Package</span>
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="p-3 rounded-2xl border border-border bg-surface shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                {/* Search */}
                <div className="relative w-full sm:w-72">
                  <input
                    type="text"
                    value={packageSearchQuery}
                    onChange={e => setPackageSearchQuery(e.target.value)}
                    aria-label="Search work packages"
                    className="w-full pl-3 pr-3 py-1.5 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="text-xs text-muted-foreground self-start sm:self-auto font-medium">
                  Showing <strong>{filteredPackages.length}</strong> of {storeState.packages.length} Packages
                </div>
              </div>

              {/* Discipline Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 text-xs">
                <span className="text-[11px] font-bold text-muted-foreground mr-1 shrink-0 flex items-center gap-1">
                  <SlidersHorizontal className="h-3 w-3" />
                  <span>Discipline:</span>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedDisciplineFilter("ALL")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                    selectedDisciplineFilter === "ALL"
                      ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                      : "bg-muted/40 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All ({storeState.packages.length})
                </button>
                {DISCIPLINE_OPTIONS.map(disc => {
                  const count = storeState.packages.filter(p => p.disciplineName === disc).length;
                  return (
                    <button
                      key={disc}
                      type="button"
                      onClick={() => setSelectedDisciplineFilter(disc)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                        selectedDisciplineFilter === disc
                          ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                          : "bg-muted/40 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {disc} {count > 0 ? `(${count})` : ""}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Packages Table or Empty State */}
            {filteredPackages.length === 0 ? (
              <div className="p-8 rounded-2xl border border-dashed border-border bg-surface text-center space-y-3">
                <div className="h-10 w-10 mx-auto rounded-xl bg-muted text-muted-foreground flex items-center justify-center">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <h5 className="text-sm font-bold text-foreground">No Work Packages Found</h5>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {storeState.packages.length === 0 
                      ? "No work packages have been defined in the master yet. Create your first work package to start tracking."
                      : "No work packages match the selected search or discipline filter."}
                  </p>
                </div>
                {storeState.packages.length === 0 && (
                  <button
                    type="button"
                    onClick={handleOpenAddPackage}
                    className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Create First Work Package</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-xs">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left text-xs border-collapse min-w-[650px]">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                        <th className="p-3.5 whitespace-nowrap min-w-[140px]">Discipline</th>
                        <th className="p-3.5 whitespace-nowrap min-w-[130px]">Package Code</th>
                        <th className="p-3.5 min-w-[260px]">Package Name</th>
                        <th className="p-3.5 min-w-[200px]">Description</th>
                        <th className="p-3.5 text-right whitespace-nowrap min-w-[100px]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {filteredPackages.map(pkg => (
                        <tr key={pkg.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="p-3.5 whitespace-nowrap min-w-[140px]">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 whitespace-nowrap">
                              {pkg.disciplineName}
                            </span>
                          </td>
                          <td className="p-3.5 font-mono font-bold text-foreground whitespace-nowrap min-w-[130px]">
                            {pkg.packageCode || "—"}
                          </td>
                          <td className="p-3.5 font-bold text-foreground min-w-[260px]">
                            {pkg.packageName}
                          </td>
                          <td className="p-3.5 text-muted-foreground min-w-[200px] truncate max-w-xs">
                            {pkg.description || "—"}
                          </td>
                          <td className="p-3.5 text-right whitespace-nowrap min-w-[100px]">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenEditPackage(pkg)}
                                className="h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-muted-foreground hover:text-foreground inline-flex items-center justify-center transition-colors cursor-pointer"
                                title="Edit work package"
                              >
                                <SlidersHorizontal className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Delete work package "${pkg.packageName}" from master?`)) {
                                    DesignMasterStore.deletePackage(pkg.id);
                                  }
                                }}
                                className="h-7 w-7 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 inline-flex items-center justify-center transition-colors cursor-pointer"
                                title="Delete work package"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Sub-tab 3: Authorities Master */}
      {activeSubTab === "AUTHORITIES" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-foreground">Statutory Authorities & NOC Bodies</h4>
              <p className="text-xs text-muted-foreground">Governing municipal and state bodies required for clearance</p>
            </div>
            <button
              type="button"
              onClick={() => setIsNewAuthorityModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Authority</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {storeState.authorities.map(auth => (
              <div key={auth.id} className="p-4 rounded-2xl border border-border bg-surface shadow-xs space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                      {auth.category}
                    </span>
                    <h4 className="text-xs font-bold text-foreground mt-1">
                      {auth.authorityName}
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{auth.scope}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub-Tab 4: RBAC Policies (Project-Wise / Role-Based / CRUD Options) */}
      {activeSubTab === "RBAC" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <DesignRbacGovernance />
        </div>
      )}

      {/* Sub-Tab 5: Pre-filled Reference Templates & Backup */}
      {activeSubTab === "TEMPLATES" && (
        <div className="p-6 rounded-2xl border border-border bg-surface shadow-xs space-y-6">
          <div>
            <h4 className="text-base font-black text-foreground">Workspace Seed, Backup & Reset Controls</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage your master dataset: load reference templates, export full JSON database backups, or import an external backup.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Box 1: Reference Template */}
            <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 space-y-3 flex flex-col justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-500" />
                  <h5 className="text-sm font-bold text-foreground">Load EY Reference Template</h5>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Pre-populates with all 11 Chandak projects, 24 wings, 65 packages, and look-ahead milestones extracted from the official Excel sheet.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (confirm("Load the reference EY Tender R2 template into your active workspace?")) {
                    DesignMasterStore.loadEyReferenceTemplate();
                    alert("Reference template loaded successfully!");
                  }
                }}
                className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                Load Reference Dataset
              </button>
            </div>

            {/* Box 2: JSON Backup & Restore */}
            <div className="p-5 rounded-2xl border border-blue-500/30 bg-blue-500/5 space-y-3 flex flex-col justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4 text-blue-500" />
                  <h5 className="text-sm font-bold text-foreground">JSON Backup & Restore</h5>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Export all master configurations, drawings, look-ahead items, and clearance matrices as a single JSON file for offline backup or transfer.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const jsonStr = DesignMasterStore.exportToJson();
                    const blob = new Blob([jsonStr], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `Chandak_Design_Master_Backup_${new Date().toISOString().split("T")[0]}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  Export Backup
                </button>

                <label className="flex-1 py-2 rounded-xl border border-blue-500/40 bg-surface hover:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold text-center transition-all cursor-pointer">
                  Import Backup
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = evt => {
                        const content = evt.target?.result as string;
                        if (content) {
                          const success = DesignMasterStore.importFromJson(content);
                          if (success) alert("Backup imported successfully!");
                          else alert("Failed to parse backup JSON. Invalid structure.");
                        }
                      };
                      reader.readAsText(file);
                    }}
                  />
                </label>
              </div>
            </div>

            {/* Box 3: Blank Slate */}
            <div className="p-5 rounded-2xl border border-rose-500/30 bg-rose-500/5 space-y-3 flex flex-col justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-500" />
                  <h5 className="text-sm font-bold text-foreground">Reset to Clean Blank State</h5>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Wipes all projects, packages, and transactions, giving you a fresh canvas to create your own custom developments.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (confirm("Are you sure you want to wipe all records and start with blank masters?")) {
                    DesignMasterStore.resetToBlank();
                    alert("Workspace reset to blank state.");
                  }
                }}
                className="w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                Reset to Blank Workspace
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: New Project */}
      {isNewProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-surface border border-border w-full max-w-2xl rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-foreground">Create New Development Project</h4>
                  <p className="text-[11px] text-muted-foreground">Register full project parameters, MahaRERA details, and tag consultant partners</p>
                </div>
              </div>
              <button type="button" onClick={() => setIsNewProjectModalOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-3.5 text-xs">
              {/* Project Hierarchy: Main vs Sub-Project */}
              <div className="p-3 rounded-xl border border-border bg-muted/20 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                    <Building className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Project Hierarchy & Governance Level</span>
                  </label>
                  <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">
                    {isSubProject ? "🏙️ Sub-Project Level Governance" : "🏢 Main Project Level Governance"}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setIsSubProject(false); setParentProjectId(""); setSubProjectScopeLevel("PROJECT"); }}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer border text-left flex items-center gap-2 transition-all ${
                      !isSubProject
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs font-bold"
                        : "bg-surface text-muted-foreground border-border hover:text-foreground"
                    }`}
                  >
                    <Building2 className="h-4 w-4 shrink-0" />
                    <div>
                      <div className="font-bold text-xs">Main Master Project</div>
                      <div className="text-[10px] opacity-80 font-normal">Standalone master development</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setIsSubProject(true); setSubProjectScopeLevel("SUBPROJECT"); }}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer border text-left flex items-center gap-2 transition-all ${
                      isSubProject
                        ? "bg-purple-600 text-white border-purple-600 shadow-2xs font-bold"
                        : "bg-surface text-muted-foreground border-border hover:text-foreground"
                    }`}
                  >
                    <Layers className="h-4 w-4 shrink-0" />
                    <div>
                      <div className="font-bold text-xs">Sub-Project / Phase</div>
                      <div className="text-[10px] opacity-80 font-normal">Tied to Parent Master Development</div>
                    </div>
                  </button>
                </div>

                {isSubProject && (
                  <div className="space-y-1.5 pt-1.5 border-t border-border animate-in fade-in duration-150">
                    <label className="font-bold text-foreground flex items-center justify-between text-[11px]">
                      <span>Select Parent Development Project *</span>
                      <span className="text-purple-600 dark:text-purple-400 font-semibold text-[10px]">Sub-Project Level Governance</span>
                    </label>
                    <select
                      value={parentProjectId}
                      onChange={e => setParentProjectId(e.target.value)}
                      required={isSubProject}
                      className="w-full px-3 py-2 rounded-xl border border-purple-500/40 bg-background text-foreground font-semibold focus:outline-hidden focus:ring-1 focus:ring-purple-500 cursor-pointer"
                    >
                      <option value="">-- Choose Parent Master Project --</option>
                      {storeState.projects
                        .filter(p => !p.isSubProject)
                        .map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.code})
                          </option>
                        ))}
                    </select>
                    <p className="text-[10px] text-muted-foreground">
                      All consultants and their discipline categories are loaded and defaulted at Sub-Project level below.
                    </p>
                  </div>
                )}
              </div>

              {/* Row 1: Name & Code */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="font-bold text-foreground">{isSubProject ? "Sub-Project Name *" : "Project Name *"}</label>
                  <input
                    type="text"
                    required
                    value={newProjectName}
                    onChange={e => setNewProjectName(e.target.value)}
                    placeholder={isSubProject ? "e.g., Chandak Trees - Phase 2 (Tower C & D)" : "e.g., Chandak Trees"}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground font-semibold focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Project Code</label>
                  <input
                    type="text"
                    value={newProjectCode}
                    onChange={e => setNewProjectCode(e.target.value)}
                    placeholder="e.g., CDK-TRS"
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground font-mono focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Row 2: Location & Project Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Location / Micro-Market *</label>
                  <input
                    type="text"
                    required
                    value={newProjectLocation}
                    onChange={e => setNewProjectLocation(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Project Type / Asset Class *</label>
                  <select
                    value={newProjectType}
                    onChange={e => setNewProjectType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground font-semibold focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    {PROJECT_TYPE_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 3: Plot Area & BUA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Plot / Land Area</label>
                  <input
                    type="text"
                    value={newProjectPlotArea}
                    onChange={e => setNewProjectPlotArea(e.target.value)}
                    placeholder="e.g., 4.5 Acres"
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Total Built-Up Area (BUA)</label>
                  <input
                    type="text"
                    value={newProjectBUA}
                    onChange={e => setNewProjectBUA(e.target.value)}
                    placeholder="e.g., 850,000 sq.ft."
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Row 4: Budget & RERA Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Estimated Budget / Cost</label>
                  <input
                    type="text"
                    value={newProjectBudget}
                    onChange={e => setNewProjectBudget(e.target.value)}
                    placeholder="e.g., ₹240 Cr"
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-foreground">MahaRERA / RERA Reg. No.</label>
                  <input
                    type="text"
                    value={newProjectRera}
                    onChange={e => setNewProjectRera(e.target.value)}
                    placeholder="P51800000000"
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground font-mono focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Row 5: Lifecycle Status & Target Handover Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Lifecycle Status</label>
                  <select
                    value={newProjectStatus}
                    onChange={e => setNewProjectStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground font-semibold focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    {PROJECT_STATUS_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Target Completion / Handover</label>
                  <input
                    type="date"
                    value={newProjectTargetDate}
                    onChange={e => setNewProjectTargetDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Row 6: Lead Manager */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Lead Design Manager / Director</label>
                  <input
                    type="text"
                    value={newProjectLeadManager}
                    onChange={e => setNewProjectLeadManager(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Lead Manager Email</label>
                  <input
                    type="email"
                    value={newProjectLeadManagerEmail}
                    onChange={e => setNewProjectLeadManagerEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Row 7: Scope / Brief Description */}
              <div className="space-y-1">
                <label className="font-bold text-foreground">Scope / Architectural Brief Description</label>
                <textarea
                  rows={2}
                  value={newProjectDescription}
                  onChange={e => setNewProjectDescription(e.target.value)}
                  placeholder="Architectural summary and scope details..."
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* 🤝 Row 8: TAGGED CONSULTANTS (Default All Allowed • Click to Untick) */}
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <label className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                    <ShieldCheck className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <span>TAGGED CONSULTANTS (Default All Allowed • Click to Untick / Remove) *</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">
                      {selectedTaggedConsultants.length} of {storeState.consultants.length} tagged
                    </span>
                    {storeState.consultants.length > 0 && (
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setSelectedTaggedConsultants(storeState.consultants.map(c => c.name))}
                          className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 font-bold cursor-pointer transition-colors"
                        >
                          Select All
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() => setSelectedTaggedConsultants([])}
                          className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 font-medium cursor-pointer transition-colors"
                        >
                          Clear All
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {storeState.consultants.length > 4 && (
                  <div className="relative">
                    <input
                      type="text"
                      value={projectConsultantSearch}
                      onChange={e => setProjectConsultantSearch(e.target.value)}
                      placeholder="Filter consultants list..."
                      aria-label="Filter consultants list"
                      className="w-full px-3 py-1 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                    />
                  </div>
                )}

                {/* Available Consultants List */}
                {storeState.consultants.length === 0 ? (
                  <div className="p-3 rounded-xl border border-dashed border-border bg-muted/20 text-xs space-y-1">
                    <p className="text-muted-foreground font-medium">
                      No consultant partners registered in <strong>Consultant Directory</strong> yet.
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      You can type custom consultant firm names in the box below to tag this project, or register them in the Consultants tab.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl border border-border bg-muted/20 max-h-36 overflow-y-auto custom-scrollbar">
                    {storeState.consultants
                      .filter(c => !projectConsultantSearch.trim() || c.name.toLowerCase().includes(projectConsultantSearch.toLowerCase()) || c.category.toLowerCase().includes(projectConsultantSearch.toLowerCase()))
                      .map(cons => {
                        const isSelected = selectedTaggedConsultants.includes(cons.name);
                        return (
                          <button
                            key={cons.id}
                            type="button"
                            onClick={() => handleToggleProjectConsultant(cons.name)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all border flex items-center gap-1.5 ${
                              isSelected
                                ? "bg-purple-600 text-white border-purple-600 shadow-2xs font-bold"
                                : "bg-surface text-muted-foreground border-border hover:text-foreground hover:border-purple-500/40"
                            }`}
                          >
                            {isSelected ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5 text-muted-foreground" />}
                            <span>{cons.name}</span>
                            <span className={`text-[9px] px-1 py-0.2 rounded ${isSelected ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"}`}>
                              {cons.category}
                            </span>
                          </button>
                        );
                      })}
                  </div>
                )}

                {/* Selected Tagged Consultants Chips */}
                {selectedTaggedConsultants.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <span className="text-[11px] font-bold text-muted-foreground block">
                      Currently Assigned ({selectedTaggedConsultants.length}) — click 'x' to untick:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedTaggedConsultants.map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/30 flex items-center gap-1 shadow-2xs"
                        >
                          <span>{tag}</span>
                          <button
                            type="button"
                            onClick={() => handleToggleProjectConsultant(tag)}
                            className="text-muted-foreground hover:text-rose-500 p-0.5 cursor-pointer"
                            title="Untag consultant"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Custom Consultant Tag Input */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={customProjectConsultantInput}
                    onChange={e => setCustomProjectConsultantInput(e.target.value)}
                    onKeyDown={handleAddCustomProjectConsultant}
                    placeholder="Type custom consultant name and press Enter / Add Tag..."
                    aria-label="Add custom consultant tag"
                    className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomProjectConsultant}
                    className="px-3 py-1.5 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-500 cursor-pointer shadow-2xs"
                  >
                    Add Tag
                  </button>
                </div>
              </div>

              {/* 🧩 Row 9: DISCIPLINE CATEGORIES (All Selected by Default • Click to Untick / Remove) */}
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <label className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                    <Layers className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span>DISCIPLINE CATEGORIES (All Pre-Selected by Default • Click to Untick) *</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      {selectedTaggedCategories.length} of {DISCIPLINE_OPTIONS.length} active
                    </span>
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setSelectedTaggedCategories([...DISCIPLINE_OPTIONS])}
                        className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 font-bold cursor-pointer transition-colors"
                      >
                        Select All
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => setSelectedTaggedCategories([])}
                        className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 font-medium cursor-pointer transition-colors"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl border border-border bg-muted/20">
                  {DISCIPLINE_OPTIONS.map(disc => {
                    const isSelected = selectedTaggedCategories.includes(disc);
                    return (
                      <button
                        key={disc}
                        type="button"
                        onClick={() => handleToggleProjectCategory(disc)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all border flex items-center gap-1.5 ${
                          isSelected
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs font-bold"
                            : "bg-surface text-muted-foreground border-border hover:text-foreground hover:border-emerald-500/40"
                        }`}
                      >
                        {isSelected ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5 text-muted-foreground" />}
                        <span>{disc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button type="button" onClick={() => setIsNewProjectModalOpen(false)} className="px-4 py-1.5 rounded-xl border border-border bg-background text-foreground hover:bg-muted transition-colors cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer transition-all shadow-md">
                  Create Project & Tag Consultants
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Project */}
      {isEditProjectModalOpen && editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-surface border border-border w-full max-w-2xl rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-foreground">Edit Project: {editingProject.name}</h4>
                  <p className="text-[11px] text-muted-foreground">Update project parameters, specifications, and assigned consultant partners</p>
                </div>
              </div>
              <button type="button" onClick={() => setIsEditProjectModalOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateProject} className="space-y-3.5 text-xs">
              {/* Project Hierarchy: Main vs Sub-Project */}
              <div className="p-3 rounded-xl border border-border bg-muted/20 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                    <Building className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Project Hierarchy & Governance Level</span>
                  </label>
                  <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">
                    {isSubProject ? "🏙️ Sub-Project Level Governance" : "🏢 Main Project Level Governance"}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setIsSubProject(false); setParentProjectId(""); setSubProjectScopeLevel("PROJECT"); }}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer border text-left flex items-center gap-2 transition-all ${
                      !isSubProject
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs font-bold"
                        : "bg-surface text-muted-foreground border-border hover:text-foreground"
                    }`}
                  >
                    <Building2 className="h-4 w-4 shrink-0" />
                    <div>
                      <div className="font-bold text-xs">Main Master Project</div>
                      <div className="text-[10px] opacity-80 font-normal">Standalone master development</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setIsSubProject(true); setSubProjectScopeLevel("SUBPROJECT"); }}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer border text-left flex items-center gap-2 transition-all ${
                      isSubProject
                        ? "bg-purple-600 text-white border-purple-600 shadow-2xs font-bold"
                        : "bg-surface text-muted-foreground border-border hover:text-foreground"
                    }`}
                  >
                    <Layers className="h-4 w-4 shrink-0" />
                    <div>
                      <div className="font-bold text-xs">Sub-Project / Phase</div>
                      <div className="text-[10px] opacity-80 font-normal">Tied to Parent Master Development</div>
                    </div>
                  </button>
                </div>

                {isSubProject && (
                  <div className="space-y-1.5 pt-1.5 border-t border-border animate-in fade-in duration-150">
                    <label className="font-bold text-foreground flex items-center justify-between text-[11px]">
                      <span>Select Parent Development Project *</span>
                      <span className="text-purple-600 dark:text-purple-400 font-semibold text-[10px]">Sub-Project Level Governance</span>
                    </label>
                    <select
                      value={parentProjectId}
                      onChange={e => setParentProjectId(e.target.value)}
                      required={isSubProject}
                      className="w-full px-3 py-2 rounded-xl border border-purple-500/40 bg-background text-foreground font-semibold focus:outline-hidden focus:ring-1 focus:ring-purple-500 cursor-pointer"
                    >
                      <option value="">-- Choose Parent Master Project --</option>
                      {storeState.projects
                        .filter(p => !p.isSubProject && p.id !== editingProject.id)
                        .map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.code})
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Row 1: Name & Code */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="font-bold text-foreground">{isSubProject ? "Sub-Project Name *" : "Project Name *"}</label>
                  <input
                    type="text"
                    required
                    value={newProjectName}
                    onChange={e => setNewProjectName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground font-semibold focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Project Code</label>
                  <input
                    type="text"
                    value={newProjectCode}
                    onChange={e => setNewProjectCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground font-mono focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Row 2: Location & Project Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Location / Micro-Market *</label>
                  <input
                    type="text"
                    required
                    value={newProjectLocation}
                    onChange={e => setNewProjectLocation(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Project Type / Asset Class *</label>
                  <select
                    value={newProjectType}
                    onChange={e => setNewProjectType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground font-semibold focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    {PROJECT_TYPE_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 3: Plot Area & BUA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Plot / Land Area</label>
                  <input
                    type="text"
                    value={newProjectPlotArea}
                    onChange={e => setNewProjectPlotArea(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Total Built-Up Area (BUA)</label>
                  <input
                    type="text"
                    value={newProjectBUA}
                    onChange={e => setNewProjectBUA(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Row 4: Budget & RERA Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Estimated Budget / Cost</label>
                  <input
                    type="text"
                    value={newProjectBudget}
                    onChange={e => setNewProjectBudget(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-foreground">MahaRERA / RERA Reg. No.</label>
                  <input
                    type="text"
                    value={newProjectRera}
                    onChange={e => setNewProjectRera(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground font-mono focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Row 5: Lifecycle Status & Target Handover Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Lifecycle Status</label>
                  <select
                    value={newProjectStatus}
                    onChange={e => setNewProjectStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground font-semibold focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    {PROJECT_STATUS_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Target Completion / Handover</label>
                  <input
                    type="date"
                    value={newProjectTargetDate}
                    onChange={e => setNewProjectTargetDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Row 6: Lead Manager */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Lead Design Manager / Director</label>
                  <input
                    type="text"
                    value={newProjectLeadManager}
                    onChange={e => setNewProjectLeadManager(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Lead Manager Email</label>
                  <input
                    type="email"
                    value={newProjectLeadManagerEmail}
                    onChange={e => setNewProjectLeadManagerEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Row 7: Scope / Brief Description */}
              <div className="space-y-1">
                <label className="font-bold text-foreground">Scope / Architectural Brief Description</label>
                <textarea
                  rows={2}
                  value={newProjectDescription}
                  onChange={e => setNewProjectDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* 🤝 Row 8: TAGGED CONSULTANTS (Multi-Selection with Select All / Clear All & Untick) */}
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <label className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                    <ShieldCheck className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <span>TAGGED CONSULTANTS (Default All Allowed • Click to Untick / Remove) *</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">
                      {selectedTaggedConsultants.length} of {storeState.consultants.length} tagged
                    </span>
                    {storeState.consultants.length > 0 && (
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setSelectedTaggedConsultants(storeState.consultants.map(c => c.name))}
                          className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 font-bold cursor-pointer transition-colors"
                        >
                          Select All
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() => setSelectedTaggedConsultants([])}
                          className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 font-medium cursor-pointer transition-colors"
                        >
                          Clear All
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {storeState.consultants.length > 4 && (
                  <div className="relative">
                    <input
                      type="text"
                      value={projectConsultantSearch}
                      onChange={e => setProjectConsultantSearch(e.target.value)}
                      placeholder="Filter consultants list..."
                      aria-label="Filter consultants list"
                      className="w-full px-3 py-1 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                    />
                  </div>
                )}

                {/* Available Consultants List */}
                {storeState.consultants.length === 0 ? (
                  <div className="p-3 rounded-xl border border-dashed border-border bg-muted/20 text-xs space-y-1">
                    <p className="text-muted-foreground font-medium">
                      No consultant partners registered in <strong>Consultant Directory</strong> yet.
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      You can type custom consultant firm names in the box below to tag this project, or register them in the Consultants tab.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl border border-border bg-muted/20 max-h-36 overflow-y-auto custom-scrollbar">
                    {storeState.consultants
                      .filter(c => !projectConsultantSearch.trim() || c.name.toLowerCase().includes(projectConsultantSearch.toLowerCase()) || c.category.toLowerCase().includes(projectConsultantSearch.toLowerCase()))
                      .map(cons => {
                        const isSelected = selectedTaggedConsultants.includes(cons.name);
                        return (
                          <button
                            key={cons.id}
                            type="button"
                            onClick={() => handleToggleProjectConsultant(cons.name)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all border flex items-center gap-1.5 ${
                              isSelected
                                ? "bg-purple-600 text-white border-purple-600 shadow-2xs font-bold"
                                : "bg-surface text-muted-foreground border-border hover:text-foreground hover:border-purple-500/40"
                            }`}
                          >
                            {isSelected ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5 text-muted-foreground" />}
                            <span>{cons.name}</span>
                            <span className={`text-[9px] px-1 py-0.2 rounded ${isSelected ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"}`}>
                              {cons.category}
                            </span>
                          </button>
                        );
                      })}
                  </div>
                )}

                {/* Selected Tagged Consultants Chips */}
                {selectedTaggedConsultants.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <span className="text-[11px] font-bold text-muted-foreground block">
                      Currently Assigned ({selectedTaggedConsultants.length}) — click 'x' to untick:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedTaggedConsultants.map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/30 flex items-center gap-1 shadow-2xs"
                        >
                          <span>{tag}</span>
                          <button
                            type="button"
                            onClick={() => handleToggleProjectConsultant(tag)}
                            className="text-muted-foreground hover:text-rose-500 p-0.5 cursor-pointer"
                            title="Untag consultant"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Custom Consultant Tag Input */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={customProjectConsultantInput}
                    onChange={e => setCustomProjectConsultantInput(e.target.value)}
                    onKeyDown={handleAddCustomProjectConsultant}
                    placeholder="Type custom consultant name and press Enter / Add Tag..."
                    aria-label="Add custom consultant tag"
                    className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomProjectConsultant}
                    className="px-3 py-1.5 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-500 cursor-pointer shadow-2xs"
                  >
                    Add Tag
                  </button>
                </div>
              </div>

              {/* 🧩 Row 9: DISCIPLINE CATEGORIES (All Selected by Default • Click to Untick / Remove) */}
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <label className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                    <Layers className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span>DISCIPLINE CATEGORIES (All Pre-Selected by Default • Click to Untick) *</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      {selectedTaggedCategories.length} of {DISCIPLINE_OPTIONS.length} active
                    </span>
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setSelectedTaggedCategories([...DISCIPLINE_OPTIONS])}
                        className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 font-bold cursor-pointer transition-colors"
                      >
                        Select All
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => setSelectedTaggedCategories([])}
                        className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 font-medium cursor-pointer transition-colors"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl border border-border bg-muted/20">
                  {DISCIPLINE_OPTIONS.map(disc => {
                    const isSelected = selectedTaggedCategories.includes(disc);
                    return (
                      <button
                        key={disc}
                        type="button"
                        onClick={() => handleToggleProjectCategory(disc)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all border flex items-center gap-1.5 ${
                          isSelected
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs font-bold"
                            : "bg-surface text-muted-foreground border-border hover:text-foreground hover:border-emerald-500/40"
                        }`}
                      >
                        {isSelected ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5 text-muted-foreground" />}
                        <span>{disc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button type="button" onClick={() => setIsEditProjectModalOpen(false)} className="px-4 py-1.5 rounded-xl border border-border bg-background text-foreground hover:bg-muted transition-colors cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer transition-all shadow-md">
                  Update Project & Consultant Tags
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Tower (Sub-Project Wing) */}
      {isNewTowerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-surface border border-border w-full max-w-xl rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                  <Building className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-foreground">Add Sub-Project Wing / Tower</h4>
                  <p className="text-[11px] text-muted-foreground">Configure wing parameters and subproject-level consultant & category assignments</p>
                </div>
              </div>
              <button type="button" onClick={() => setIsNewTowerModalOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTower} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Tower / Wing Name *</label>
                  <input
                    type="text"
                    required
                    value={newTowerName}
                    onChange={e => setNewTowerName(e.target.value)}
                    placeholder="e.g., Tower A - Iris"
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-foreground">Tower Type</label>
                  <select
                    value={newTowerType}
                    onChange={e => setNewTowerType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground font-semibold focus:outline-hidden focus:ring-1 focus:ring-primary"
                  >
                    <option value="Sale">Sale Tower</option>
                    <option value="Society">Society Wing</option>
                    <option value="Commercial">Commercial</option>
                    <option value="Rehab / SRA">Rehab / SRA</option>
                    <option value="PTC / Hostel">PTC / Hostel</option>
                    <option value="Plot / Infrastructure">Plot / Infrastructure</option>
                  </select>
                </div>
              </div>

              {/* Sub-Project Tagged Consultants */}
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <label className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                    <ShieldCheck className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <span>Sub-Project Tagged Consultants (All Allowed by Default)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">
                      {newTowerTaggedConsultants.length} of {storeState.consultants.length} tagged
                    </span>
                    {storeState.consultants.length > 0 && (
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setNewTowerTaggedConsultants(storeState.consultants.map(c => c.name))}
                          className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 font-bold cursor-pointer transition-colors"
                        >
                          Select All
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() => setNewTowerTaggedConsultants([])}
                          className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 font-medium cursor-pointer transition-colors"
                        >
                          Clear All
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {storeState.consultants.length > 4 && (
                  <div className="relative">
                    <input
                      type="text"
                      value={towerConsultantSearch}
                      onChange={e => setTowerConsultantSearch(e.target.value)}
                      placeholder="Filter consultants..."
                      aria-label="Filter tower consultants"
                      className="w-full px-3 py-1 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                    />
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl border border-border bg-muted/20 max-h-32 overflow-y-auto custom-scrollbar">
                  {storeState.consultants
                    .filter(c => !towerConsultantSearch.trim() || c.name.toLowerCase().includes(towerConsultantSearch.toLowerCase()) || c.category.toLowerCase().includes(towerConsultantSearch.toLowerCase()))
                    .map(cons => {
                      const isSelected = newTowerTaggedConsultants.includes(cons.name);
                      return (
                        <button
                          key={cons.id}
                          type="button"
                          onClick={() => handleToggleTowerConsultant(cons.name)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all border flex items-center gap-1.5 ${
                            isSelected
                              ? "bg-purple-600 text-white border-purple-600 shadow-2xs font-bold"
                              : "bg-surface text-muted-foreground border-border hover:text-foreground hover:border-purple-500/40"
                          }`}
                        >
                          {isSelected ? <CheckCircle2 className="h-3 w-3" /> : <Plus className="h-3 w-3 text-muted-foreground" />}
                          <span>{cons.name}</span>
                          <span className={`text-[9px] px-1 py-0.2 rounded ${isSelected ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"}`}>
                            {cons.category}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Sub-Project Tagged Categories */}
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <label className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                    <Layers className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Sub-Project Discipline Categories (All Selected by Default)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      {newTowerTaggedCategories.length} of {DISCIPLINE_OPTIONS.length} active
                    </span>
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setNewTowerTaggedCategories([...DISCIPLINE_OPTIONS])}
                        className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 font-bold cursor-pointer transition-colors"
                      >
                        Select All
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => setNewTowerTaggedCategories([])}
                        className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 font-medium cursor-pointer transition-colors"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl border border-border bg-muted/20">
                  {DISCIPLINE_OPTIONS.map(disc => {
                    const isSelected = newTowerTaggedCategories.includes(disc);
                    return (
                      <button
                        key={disc}
                        type="button"
                        onClick={() => handleToggleTowerCategory(disc)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all border flex items-center gap-1.5 ${
                          isSelected
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs font-bold"
                            : "bg-surface text-muted-foreground border-border hover:text-foreground hover:border-emerald-500/40"
                        }`}
                      >
                        {isSelected ? <CheckCircle2 className="h-3 w-3" /> : <Plus className="h-3 w-3 text-muted-foreground" />}
                        <span>{disc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button type="button" onClick={() => setIsNewTowerModalOpen(false)} className="px-4 py-1.5 rounded-xl border border-border bg-background text-foreground hover:bg-muted transition-colors cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer transition-all shadow-md">
                  Add Sub-Project Wing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Tower (Sub-Project Wing) */}
      {isEditTowerModalOpen && editingTower && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-surface border border-border w-full max-w-xl rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                  <Building className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-foreground">Edit Sub-Project Wing: {editingTower.towerName}</h4>
                  <p className="text-[11px] text-muted-foreground">Update wing parameters and subproject-level consultant & category assignments</p>
                </div>
              </div>
              <button type="button" onClick={() => setIsEditTowerModalOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateTower} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Tower / Wing Name *</label>
                  <input
                    type="text"
                    required
                    value={newTowerName}
                    onChange={e => setNewTowerName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-foreground">Tower Type</label>
                  <select
                    value={newTowerType}
                    onChange={e => setNewTowerType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground font-semibold focus:outline-hidden focus:ring-1 focus:ring-primary"
                  >
                    <option value="Sale">Sale Tower</option>
                    <option value="Society">Society Wing</option>
                    <option value="Commercial">Commercial</option>
                    <option value="Rehab / SRA">Rehab / SRA</option>
                    <option value="PTC / Hostel">PTC / Hostel</option>
                    <option value="Plot / Infrastructure">Plot / Infrastructure</option>
                  </select>
                </div>
              </div>

              {/* Sub-Project Tagged Consultants */}
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <label className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                    <ShieldCheck className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <span>Sub-Project Tagged Consultants</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">
                      {newTowerTaggedConsultants.length} of {storeState.consultants.length} tagged
                    </span>
                    {storeState.consultants.length > 0 && (
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setNewTowerTaggedConsultants(storeState.consultants.map(c => c.name))}
                          className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 font-bold cursor-pointer transition-colors"
                        >
                          Select All
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() => setNewTowerTaggedConsultants([])}
                          className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 font-medium cursor-pointer transition-colors"
                        >
                          Clear All
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {storeState.consultants.length > 4 && (
                  <div className="relative">
                    <input
                      type="text"
                      value={towerConsultantSearch}
                      onChange={e => setTowerConsultantSearch(e.target.value)}
                      placeholder="Filter consultants..."
                      aria-label="Filter tower consultants"
                      className="w-full px-3 py-1 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                    />
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl border border-border bg-muted/20 max-h-32 overflow-y-auto custom-scrollbar">
                  {storeState.consultants
                    .filter(c => !towerConsultantSearch.trim() || c.name.toLowerCase().includes(towerConsultantSearch.toLowerCase()) || c.category.toLowerCase().includes(towerConsultantSearch.toLowerCase()))
                    .map(cons => {
                      const isSelected = newTowerTaggedConsultants.includes(cons.name);
                      return (
                        <button
                          key={cons.id}
                          type="button"
                          onClick={() => handleToggleTowerConsultant(cons.name)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all border flex items-center gap-1.5 ${
                            isSelected
                              ? "bg-purple-600 text-white border-purple-600 shadow-2xs font-bold"
                              : "bg-surface text-muted-foreground border-border hover:text-foreground hover:border-purple-500/40"
                          }`}
                        >
                          {isSelected ? <CheckCircle2 className="h-3 w-3" /> : <Plus className="h-3 w-3 text-muted-foreground" />}
                          <span>{cons.name}</span>
                          <span className={`text-[9px] px-1 py-0.2 rounded ${isSelected ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"}`}>
                            {cons.category}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Sub-Project Tagged Categories */}
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <label className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                    <Layers className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Sub-Project Discipline Categories</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      {newTowerTaggedCategories.length} of {DISCIPLINE_OPTIONS.length} active
                    </span>
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setNewTowerTaggedCategories([...DISCIPLINE_OPTIONS])}
                        className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 font-bold cursor-pointer transition-colors"
                      >
                        Select All
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => setNewTowerTaggedCategories([])}
                        className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 font-medium cursor-pointer transition-colors"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl border border-border bg-muted/20">
                  {DISCIPLINE_OPTIONS.map(disc => {
                    const isSelected = newTowerTaggedCategories.includes(disc);
                    return (
                      <button
                        key={disc}
                        type="button"
                        onClick={() => handleToggleTowerCategory(disc)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all border flex items-center gap-1.5 ${
                          isSelected
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs font-bold"
                            : "bg-surface text-muted-foreground border-border hover:text-foreground hover:border-emerald-500/40"
                        }`}
                      >
                        {isSelected ? <CheckCircle2 className="h-3 w-3" /> : <Plus className="h-3 w-3 text-muted-foreground" />}
                        <span>{disc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button type="button" onClick={() => setIsEditTowerModalOpen(false)} className="px-4 py-1.5 rounded-xl border border-border bg-background text-foreground hover:bg-muted transition-colors cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer transition-all shadow-md">
                  Update Sub-Project Wing
                </button>
              </div>
            </form>
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
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Discipline *</label>
                  <select
                    value={newPackageDiscipline}
                    onChange={e => setNewPackageDiscipline(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground font-semibold focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    {DISCIPLINE_OPTIONS.map(disc => (
                      <option key={disc} value={disc}>{disc}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-foreground">Package Code</label>
                  <input
                    type="text"
                    value={newPackageCode}
                    onChange={e => setNewPackageCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground font-mono focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">Scope / Description</label>
                <textarea
                  rows={2}
                  value={newPackageDescription}
                  onChange={e => setNewPackageDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button type="button" onClick={() => setIsNewPackageModalOpen(false)} className="px-4 py-1.5 rounded-xl border border-border bg-background text-foreground hover:bg-muted transition-colors cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer transition-all shadow-md">
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
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Discipline *</label>
                  <select
                    value={newPackageDiscipline}
                    onChange={e => setNewPackageDiscipline(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground font-semibold focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    {DISCIPLINE_OPTIONS.map(disc => (
                      <option key={disc} value={disc}>{disc}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-foreground">Package Code</label>
                  <input
                    type="text"
                    value={newPackageCode}
                    onChange={e => setNewPackageCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground font-mono focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">Scope / Description</label>
                <textarea
                  rows={2}
                  value={newPackageDescription}
                  onChange={e => setNewPackageDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button type="button" onClick={() => setIsEditPackageModalOpen(false)} className="px-4 py-1.5 rounded-xl border border-border bg-background text-foreground hover:bg-muted transition-colors cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer transition-all shadow-md">
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
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">Scope / Category Description</label>
                <input
                  type="text"
                  value={newAuthorityScope}
                  onChange={e => setNewAuthorityScope(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
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
    </div>
  );
};

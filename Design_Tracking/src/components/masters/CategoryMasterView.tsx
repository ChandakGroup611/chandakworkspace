"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { toast } from "react-toastify";
import { 
  DesignMasterStore, 
  DEFAULT_DESIGN_CATEGORIES 
} from "../../services/designMasterStore";
import { CategoryMaster, EntityDependencyReport } from "../../types/masterTypes";
import { 
  Layers, 
  Plus,
  Upload, 
  Search, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  SlidersHorizontal, 
  Tag, 
  Sparkles, 
  AlertCircle,
  FolderTree,
  Building2,
  Users
} from "lucide-react";
import { DeleteDependencyModal } from "../DeleteDependencyModal";
import { MasterBulkImportModal } from "./MasterBulkImportModal";
import { TransactionFormLayout } from "../DesignTransactionLayout";

interface CategoryMasterViewProps {
  onCategorySelect?: (categoryName: string) => void;
}

const COLOR_THEMES = [
  { id: "purple", label: "Purple", bg: "bg-surface", text: "text-accent-soft-text dark:text-muted-foreground", border: "border-border", dot: "bg-primary" },
  { id: "blue", label: "Blue", bg: "bg-info-soft", text: "text-info-text", border: "border-info-border", dot: "bg-info" },
  { id: "emerald", label: "Emerald", bg: "bg-success-soft", text: "text-success-text", border: "border-success-border", dot: "bg-success" },
  { id: "amber", label: "Amber", bg: "bg-warning-soft", text: "text-warning-text", border: "border-warning-border", dot: "bg-warning" },
  { id: "teal", label: "Teal", bg: "bg-info-soft", text: "text-info-text", border: "border-border", dot: "bg-info" },
  { id: "rose", label: "Rose", bg: "bg-danger-soft", text: "text-danger-text", border: "border-danger-border", dot: "bg-danger-solid" },
  { id: "slate", label: "Slate", bg: "bg-sunken", text: "text-subtle", border: "border-border", dot: "bg-muted" }
];

const PRESET_ICONS = ["🏛️", "🏗️", "⚡", "🧱", "🏢", "🌳", "🛋️", "⛰️", "🔥", "🌱", "🚗", "💻", "🔬", "📐", "📋", "⚙️"];

export const CategoryMasterView: React.FC<CategoryMasterViewProps> = () => {
  const [mounted, setMounted] = useState(false);
  const [store, setStore] = useState(() => DesignMasterStore.getState());
  const categories = store.disciplines || [];
  const consultants = store.consultants || [];
  const packages = store.packages || [];

  useEffect(() => {
    setMounted(true);
    const unsubscribe = DesignMasterStore.subscribe(() => {
      setStore({ ...DesignMasterStore.getState() });
    });
    return () => unsubscribe();
  }, []);

  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryMaster | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("🏛️");
  const [selectedColor, setSelectedColor] = useState("purple");
  const [formError, setFormError] = useState("");

  // Delete modal states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteReport, setDeleteReport] = useState<EntityDependencyReport | null>(null);
  const [categoryToDeleteId, setCategoryToDeleteId] = useState<string | null>(null);

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setName("");
    setCode("");
    setDescription("");
    setSelectedIcon("🏛️");
    setSelectedColor("purple");
    setFormError("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat: CategoryMaster) => {
    setEditingCategory(cat);
    setName(cat.name);
    setCode(cat.code);
    setDescription(cat.description || "");
    setSelectedIcon(cat.icon || "🏛️");
    setSelectedColor(cat.color || "purple");
    setFormError("");
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError("Package name is required.");
      toast.error("Package name is required.");
      return;
    }

    const cleanCode = code.trim().toUpperCase() || name.trim().slice(0, 4).toUpperCase();

    if (editingCategory) {
      DesignMasterStore.updatePackageMaster(editingCategory.id, {
        name: name.trim(),
        code: cleanCode,
        description: description.trim() || undefined,
        icon: selectedIcon,
        color: selectedColor
      });
      toast.success(`Package "${name.trim()}" updated successfully!`);
    } else {
      DesignMasterStore.addPackageMaster({
        name: name.trim(),
        code: cleanCode,
        description: description.trim() || undefined,
        icon: selectedIcon,
        color: selectedColor
      });
      toast.success(`Package "${name.trim()}" created successfully!`);
    }

    setIsModalOpen(false);
    setEditingCategory(null);
  };

  const handleTriggerDelete = (cat: CategoryMaster) => {
    const report = DesignMasterStore.getEntityDependencies("CATEGORY", cat.id);
    setDeleteReport(report);
    setCategoryToDeleteId(cat.id);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = (reason: string) => {
    if (categoryToDeleteId) {
      const cat = categories.find(c => c.id === categoryToDeleteId);
      DesignMasterStore.deletePackageMaster(categoryToDeleteId, reason, "Design Lead");
      toast.success(`Package "${cat?.name || "Discipline"}" deleted successfully.`);
      setIsDeleteModalOpen(false);
      setCategoryToDeleteId(null);
    }
  };

  // Filtered categories
  const filteredCategories = categories.filter(cat => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      cat.name.toLowerCase().includes(q) ||
      cat.code.toLowerCase().includes(q) ||
      (cat.description && cat.description.toLowerCase().includes(q))
    );
  });

  return (
    <div className="w-full space-y-4 animate-in fade-in duration-150">
      {!isModalOpen && (
        <div className="space-y-4">
      {/* Header Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-surface text-accent-soft-text dark:text-muted-foreground flex items-center justify-center border border-border shrink-0">
            <Tag className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-semibold text-foreground">
              Package master (engineering packages)
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="px-3.5 py-1.5 rounded-lg border border-border bg-surface hover:bg-sunken text-foreground text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all shrink-0 whitespace-nowrap"
          >
            <Upload className="h-3.5 w-3.5 text-accent-soft-text" />
            <span>Import packages (Excel)</span>
          </button>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-md cursor-pointer transition-all shrink-0 whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add package</span>
          </button>
        </div>
      </div>

      {/* Quick Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg bg-surface border border-border flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground block">Total packages</span>
            <span className="text-lg font-semibold text-foreground">{categories.length}</span>
          </div>
          <Tag className="h-4 w-4 text-accent-soft-text" />
        </div>
        <div className="p-3 rounded-lg bg-surface border border-border flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground block">Mapped consultants</span>
            <span className="text-lg font-semibold text-success-text">
              {consultants.length}
            </span>
          </div>
          <Users className="h-4 w-4 text-success-text" />
        </div>
        <div className="p-3 rounded-lg bg-surface border border-border flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground block">Sub-Packages</span>
            <span className="text-lg font-semibold text-info-text">
              {packages.length}
            </span>
          </div>
          <Layers className="h-4 w-4 text-info-text" />
        </div>
        <div className="p-3 rounded-lg bg-surface border border-border flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground block">Active projects</span>
            <span className="text-lg font-semibold text-warning-text">
              {store.projects.length}
            </span>
          </div>
          <Building2 className="h-4 w-4 text-warning-text" />
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-3 rounded-lg border border-border bg-surface shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search parent packages by name, code, description…"
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring"
          />
          {searchQuery && (
            <button aria-label="Close"
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <div className="text-xs text-muted-foreground font-medium self-start sm:self-auto">
          Showing <strong>{filteredCategories.length}</strong> of {categories.length} Packages
        </div>
      </div>

      {/* Category Grid Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-3.5 w-full">
        {filteredCategories.map(cat => {
          const theme = COLOR_THEMES.find(t => t.id === (cat.color || "purple")) || COLOR_THEMES[0];
          
          // Count linked consultants
          const linkedConsultants = consultants.filter(c => 
            (c.categories && c.categories.includes(cat.name)) || c.category === cat.name
          );

          // Count linked packages
          const linkedPackages = packages.filter(p => 
            p.disciplineName === cat.name || p.disciplineId === cat.id
          );

          return (
            <div
              key={cat.id}
              className="p-4 rounded-lg border border-border bg-surface hover:border-border-active shadow-xs transition-all flex flex-col justify-between space-y-3 group"
            >
              <div className="space-y-2.5">
                {/* Header with Icon & Code */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xl shrink-0 select-none">
                      {cat.icon || "🏛️"}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold ${theme.bg} ${theme.text} border ${theme.border}`}>
                          {cat.code}
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-foreground mt-0.5 truncate">
                        {cat.name}
                      </h4>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button aria-label="Edit package"
                      type="button"
                      onClick={() => handleOpenEdit(cat)}
                      className="h-7 w-7 rounded-lg hover:bg-sunken text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                      title="Edit package"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                    <button aria-label="Delete package"
                      type="button"
                      onClick={() => handleTriggerDelete(cat)}
                      className="h-7 w-7 rounded-lg hover:bg-danger-soft text-muted-foreground hover:text-danger-text flex items-center justify-center transition-colors cursor-pointer"
                      title="Delete package"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* Description */}
                {cat.description ? (
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {cat.description}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    No description provided.
                  </p>
                )}
              </div>

              {/* Linked Counts Chips */}
              <div className="pt-2.5 border-t border-border flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3 w-3 text-accent-soft-text" />
                    <span className="font-semibold text-foreground">{linkedConsultants.length}</span>
                    <span className="text-[11px]">Consultants</span>
                  </span>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1">
                    <Layers className="h-3 w-3 text-info-text" />
                    <span className="font-semibold text-foreground">{linkedPackages.length}</span>
                    <span className="text-[11px]">Packages</span>
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenEdit(cat)}
                  className="h-6 px-2.5 rounded-lg bg-surface hover:bg-surface text-accent-soft-text dark:text-muted-foreground border border-border text-[11px] font-semibold inline-flex items-center transition-colors cursor-pointer"
                >
                  Configure
                </button>
              </div>
            </div>
          );
        })}
      </div>

        </div>
      )}

      {/* Add / Edit Package Transaction Form Layout (Attached directly to sidebar) */}
      {isModalOpen && (
        <TransactionFormLayout
          title={editingCategory ? `Edit Package: ${name || editingCategory.name}` : "Create new package master"}
          icon={Tag}
          description="Define parent engineering package scope, identification code, icon, and colour theme"
          onBack={() => setIsModalOpen(false)}
          backLabel="Back to Packages"
          breadcrumbs={[
            { label: "Design Masters", onClick: () => setIsModalOpen(false) },
            { label: "Package Master", onClick: () => setIsModalOpen(false) },
            { label: editingCategory ? (name || editingCategory.name) : "Create Package" }
          ]}
          onSave={handleSubmit}
          saveLabel={editingCategory ? "Save Package" : "Create Package"}
          onReset={editingCategory ? () => handleOpenEdit(editingCategory) : handleOpenAdd}
        >
          <div className="space-y-6">
            {formError && (
              <div className="p-3 rounded-lg bg-danger-soft border border-danger-border text-danger-text text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Package Name & Code in 2 columns */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    Package name <span className="text-danger-text">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    placeholder="e.g., structural, architectural, MEPF services"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    Package code
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={e => setCode(e.target.value.toUpperCase())}
                    maxLength={6}
                    placeholder="e.g., STR, ARCH, MEP"
                    className="w-full px-3 py-2 text-xs font-mono font-semibold rounded-lg border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>

              {/* Icon Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Package icon
                </label>
                <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-sunken border border-border max-h-24 overflow-y-auto custom-scrollbar">
                  {PRESET_ICONS.map(icon => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setSelectedIcon(icon)}
                      className={`h-8 w-8 rounded-lg flex items-center justify-center text-base transition-all cursor-pointer ${
                        selectedIcon === icon
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "hover:bg-sunken"
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Theme Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Colour badge theme
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                  {COLOR_THEMES.map(theme => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => setSelectedColor(theme.id)}
                      className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer flex flex-col items-center gap-1 ${
                        selectedColor === theme.id
                          ? `${theme.bg} ${theme.text} ${theme.border} ring-2 ring-ring`
                          : "bg-background border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span className={`h-2 w-2 rounded-full ${theme.dot}`} />
                      <span>{theme.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Scope / description
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Overview of engineering deliverable scope, technical specifications, and milestones…"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring"
                />
              </div>

              {/* Bottom Action Triggers */}
              <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-border bg-surface hover:bg-sunken text-xs font-semibold text-foreground cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-md cursor-pointer transition-all"
                >
                  {editingCategory ? "Save Changes" : "Create Package"}
                </button>
              </div>
            </form>
          </div>
        </TransactionFormLayout>
      )}

      <MasterBulkImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        initialMasterType="PACKAGES"
      />

      {/* Delete Dependency Safety Modal */}
      <DeleteDependencyModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setCategoryToDeleteId(null);
        }}
        report={deleteReport}
        onConfirmDelete={handleConfirmDelete}
      />
    </div>
  );
};

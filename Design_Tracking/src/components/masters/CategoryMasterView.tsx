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
import { TransactionFormLayout } from "../DesignTransactionLayout";

interface CategoryMasterViewProps {
  onCategorySelect?: (categoryName: string) => void;
}

const COLOR_THEMES = [
  { id: "purple", label: "Purple", bg: "bg-purple-500/10", text: "text-purple-600 dark:text-purple-400", border: "border-purple-500/30", dot: "bg-purple-500" },
  { id: "blue", label: "Blue", bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/30", dot: "bg-blue-500" },
  { id: "emerald", label: "Emerald", bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/30", dot: "bg-emerald-500" },
  { id: "amber", label: "Amber", bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/30", dot: "bg-amber-500" },
  { id: "teal", label: "Teal", bg: "bg-teal-500/10", text: "text-teal-600 dark:text-teal-400", border: "border-teal-500/30", dot: "bg-teal-500" },
  { id: "rose", label: "Rose", bg: "bg-rose-500/10", text: "text-rose-600 dark:text-rose-400", border: "border-rose-500/30", dot: "bg-rose-500" },
  { id: "slate", label: "Slate", bg: "bg-slate-500/10", text: "text-slate-600 dark:text-slate-400", border: "border-slate-500/30", dot: "bg-slate-500" }
];

const PRESET_ICONS = ["🏛️", "🏗️", "⚡", "🧱", "🏢", "🌳", "🛋️", "⛰️", "🔥", "🌱", "🚗", "💻", "🔬", "📐", "📋", "⚙️"];

export const CategoryMasterView: React.FC<CategoryMasterViewProps> = () => {
  const [mounted, setMounted] = useState(false);
  const store = DesignMasterStore.getState();
  const categories = store.disciplines || [];
  const consultants = store.consultants || [];
  const packages = store.packages || [];

  useEffect(() => {
    setMounted(true);
  }, []);

  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
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
      setFormError("Category name is required.");
      toast.error("Category name is required.");
      return;
    }

    const cleanCode = code.trim().toUpperCase() || name.trim().slice(0, 4).toUpperCase();

    if (editingCategory) {
      DesignMasterStore.updateCategory(editingCategory.id, {
        name: name.trim(),
        code: cleanCode,
        description: description.trim() || undefined,
        icon: selectedIcon,
        color: selectedColor
      });
      toast.success(`Category "${name.trim()}" updated successfully!`);
    } else {
      DesignMasterStore.addCategory({
        name: name.trim(),
        code: cleanCode,
        description: description.trim() || undefined,
        icon: selectedIcon,
        color: selectedColor
      });
      toast.success(`Category "${name.trim()}" created successfully!`);
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
      DesignMasterStore.deleteCategory(categoryToDeleteId, reason, "Design Lead");
      toast.success(`Category "${cat?.name || "Discipline"}" deleted successfully.`);
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
          <div className="h-9 w-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/20 shrink-0">
            <Tag className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-foreground">
              Category Master (Engineering Disciplines)
            </h3>
            <p className="text-xs text-muted-foreground">
              Master discipline dictionary mapped to Consultant Firms, Projects, and Work Packages
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-md cursor-pointer transition-all shrink-0 whitespace-nowrap"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Category</span>
        </button>
      </div>

      {/* Quick Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-surface border border-border flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground block">Total Categories</span>
            <span className="text-lg font-black text-foreground">{categories.length}</span>
          </div>
          <Tag className="h-4 w-4 text-purple-500" />
        </div>
        <div className="p-3 rounded-xl bg-surface border border-border flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground block">Mapped Consultants</span>
            <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
              {consultants.length}
            </span>
          </div>
          <Users className="h-4 w-4 text-emerald-500" />
        </div>
        <div className="p-3 rounded-xl bg-surface border border-border flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground block">Work Packages</span>
            <span className="text-lg font-black text-blue-600 dark:text-blue-400">
              {packages.length}
            </span>
          </div>
          <Layers className="h-4 w-4 text-blue-500" />
        </div>
        <div className="p-3 rounded-xl bg-surface border border-border flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground block">Active Projects</span>
            <span className="text-lg font-black text-amber-600 dark:text-amber-400">
              {store.projects.length}
            </span>
          </div>
          <Building2 className="h-4 w-4 text-amber-500" />
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-3 rounded-2xl border border-border bg-surface shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
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

        <div className="text-xs text-muted-foreground font-medium self-start sm:self-auto">
          Showing <strong>{filteredCategories.length}</strong> of {categories.length} Categories
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
              className="p-4 rounded-2xl border border-border bg-surface hover:border-purple-500/40 shadow-xs transition-all flex flex-col justify-between space-y-3 group"
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
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${theme.bg} ${theme.text} border ${theme.border}`}>
                          {cat.code}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-foreground mt-0.5 truncate">
                        {cat.name}
                      </h4>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(cat)}
                      className="h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                      title="Edit Category"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTriggerDelete(cat)}
                      className="h-7 w-7 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 flex items-center justify-center transition-colors cursor-pointer"
                      title="Delete Category"
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
                    <Users className="h-3 w-3 text-purple-500" />
                    <span className="font-semibold text-foreground">{linkedConsultants.length}</span>
                    <span className="text-[11px]">Consultants</span>
                  </span>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1">
                    <Layers className="h-3 w-3 text-blue-500" />
                    <span className="font-semibold text-foreground">{linkedPackages.length}</span>
                    <span className="text-[11px]">Packages</span>
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenEdit(cat)}
                  className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
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

      {/* Add / Edit Category Transaction Form Layout (Attached directly to sidebar) */}
      {isModalOpen && (
        <TransactionFormLayout
          title={editingCategory ? `Edit Category: ${name || editingCategory.name}` : "Create New Category Master"}
          icon={Tag}
          description="Define engineering discipline scope, identification code, icon, and color theme"
          onBack={() => setIsModalOpen(false)}
          backLabel="Back to Categories"
          breadcrumbs={[
            { label: "Design Masters", onClick: () => setIsModalOpen(false) },
            { label: "Category Master", onClick: () => setIsModalOpen(false) },
            { label: editingCategory ? (name || editingCategory.name) : "Create Category" }
          ]}
          onSave={handleSubmit}
          saveLabel={editingCategory ? "Save Category" : "Create Category"}
          onReset={editingCategory ? () => handleOpenEdit(editingCategory) : handleOpenAdd}
        >
          <div className="space-y-6">
            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Category Name & Code in 2 columns */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-foreground">
                    Category / Discipline Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">
                    Discipline Code
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={e => setCode(e.target.value.toUpperCase())}
                    maxLength={6}
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Icon Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  Category Icon
                </label>
                <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-border max-h-24 overflow-y-auto custom-scrollbar">
                  {PRESET_ICONS.map(icon => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setSelectedIcon(icon)}
                      className={`h-8 w-8 rounded-lg flex items-center justify-center text-base transition-all cursor-pointer ${
                        selectedIcon === icon
                          ? "bg-purple-500 text-white shadow-xs scale-105"
                          : "hover:bg-slate-200 dark:hover:bg-slate-800"
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Theme Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  Color Badge Theme
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                  {COLOR_THEMES.map(theme => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => setSelectedColor(theme.id)}
                      className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer flex flex-col items-center gap-1 ${
                        selectedColor === theme.id
                          ? `${theme.bg} ${theme.text} ${theme.border} ring-2 ring-purple-500`
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
                <label className="text-xs font-bold text-foreground">
                  Scope / Description
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                />
              </div>

              {/* Bottom Action Triggers */}
              <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-foreground cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md cursor-pointer transition-all"
                >
                  {editingCategory ? "Save Changes" : "Create Category"}
                </button>
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
          setCategoryToDeleteId(null);
        }}
        report={deleteReport}
        onConfirmDelete={handleConfirmDelete}
      />
    </div>
  );
};

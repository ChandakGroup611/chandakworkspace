"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { AppButton } from "@/components/ui/AppButton";
import * as A from "@/lib/budget/actions";
import { addTowerFull } from "@/lib/budget/manual-actions";
import { BUILDING_TYPES, RATE_BASES, fmt, fmtRupees, formatBudgetPeriod, versionTitle, versionSubtitle, dmy } from "@/lib/budget/format";
import {
  Building2,
  Layers,
  Plus,
  Pencil,
  Trash2,
  Receipt,
  DollarSign,
  AlertCircle,
  FileText,
  Calculator,
  ArrowRight,
  CheckCircle2,
  Calendar,
  Search,
} from "lucide-react";

// ==========================================
// 1. ADD TOWER MODAL
// ==========================================
export function AddTowerModal({
  projectId,
  trigger,
  buildingTypes,
}: {
  projectId: number;
  trigger?: React.ReactNode;
  buildingTypes?: string[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const types = buildingTypes && buildingTypes.length > 0 ? buildingTypes : BUILDING_TYPES;
  const [name, setName] = useState("");
  const [type, setType] = useState(types[0] ?? "Sales Building");
  const [carpetArea, setCarpetArea] = useState("");
  const [engArea, setEngArea] = useState("");
  const [ocDate, setOcDate] = useState("");

  const reset = () => {
    setName("");
    setType(types[0] ?? "Sales Building");
    setCarpetArea("");
    setEngArea("");
    setOcDate("");
    setError(null);
  };

  const handleSave = () => {
    if (!name.trim()) {
      setError("Please enter a tower name (e.g. Tower A, Wing 1).");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await addTowerFull(projectId, {
        name: name.trim(),
        type,
        carpet_area: carpetArea.trim(),
        eng_area: engArea.trim(),
        oc_date: ocDate.trim(),
      });
      if (!res.ok) {
        setError(res.error);
      } else {
        setOpen(false);
        reset();
        router.refresh();
      }
    });
  };

  return (
    <>
      {trigger ? (
        <span onClick={() => { reset(); setOpen(true); }}>{trigger}</span>
      ) : (
        <button
          type="button"
          className="btn-action primary"
          onClick={() => { reset(); setOpen(true); }}
        >
          <Plus className="h-3.5 w-3.5 inline mr-1" />
          Add Tower
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <Building2 className="h-5 w-5 text-primary" />
              Add New Tower / Subproject
            </DialogTitle>
          </DialogHeader>

          {error && (
            <div className="banner error text-sm p-3 rounded" role="alert">
              <AlertCircle className="h-4 w-4 inline mr-1 text-bad" />
              {error}
            </div>
          )}

          <div className="budget-modal-grid">
            <div className="budget-modal-field sm:col-span-2">
              <label htmlFor="tower-name">Tower Name *</label>
              <input
                id="tower-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Tower A, Wing 1, Club House"
                autoFocus
              />
            </div>

            <div className="budget-modal-field">
              <label htmlFor="tower-type">Building Type</label>
              <select
                id="tower-type"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                {types.map((bt) => (
                  <option key={bt} value={bt}>
                    {bt}
                  </option>
                ))}
              </select>
            </div>

            <div className="budget-modal-field">
              <label htmlFor="tower-oc-date">Planned OC Date</label>
              <input
                id="tower-oc-date"
                type="date"
                value={ocDate}
                onChange={(e) => setOcDate(e.target.value)}
              />
            </div>

            <div className="budget-modal-field">
              <label htmlFor="tower-carpet">Carpet Area (sft)</label>
              <input
                id="tower-carpet"
                type="number"
                min="0"
                step="any"
                value={carpetArea}
                onChange={(e) => setCarpetArea(e.target.value)}
                placeholder="e.g. 50000"
              />
            </div>

            <div className="budget-modal-field">
              <label htmlFor="tower-eng-area">Construction BUA (sft)</label>
              <input
                id="tower-eng-area"
                type="number"
                min="0"
                step="any"
                value={engArea}
                onChange={(e) => setEngArea(e.target.value)}
                placeholder="e.g. 75000"
              />
            </div>
          </div>

          <DialogFooter className="mt-4 flex items-center justify-end gap-2">
            <AppButton
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Cancel
            </AppButton>
            <AppButton
              size="sm"
              disabled={pending}
              onClick={handleSave}
            >
              {pending ? "Adding..." : "Add Tower"}
            </AppButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ==========================================
// 2. EDIT TOWER MODAL
// ==========================================
export function EditTowerModal({
  t,
  trigger,
  buildingTypes,
}: {
  t: {
    id: number;
    name: string;
    type: string | null;
    carpet_area: number | null;
    eng_area: number | null;
    oc_date: string | null;
  };
  trigger?: React.ReactNode;
  buildingTypes?: string[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const types = buildingTypes && buildingTypes.length > 0 ? buildingTypes : BUILDING_TYPES;
  const [name, setName] = useState(t.name);
  const [type, setType] = useState(t.type ?? "");
  const [carpetArea, setCarpetArea] = useState(t.carpet_area != null ? String(t.carpet_area) : "");
  const [engArea, setEngArea] = useState(t.eng_area != null ? String(t.eng_area) : "");
  const [ocDate, setOcDate] = useState(t.oc_date ?? "");

  const handleOpen = () => {
    setName(t.name);
    setType(t.type ?? "");
    setCarpetArea(t.carpet_area != null ? String(t.carpet_area) : "");
    setEngArea(t.eng_area != null ? String(t.eng_area) : "");
    setOcDate(t.oc_date ?? "");
    setError(null);
    setOpen(true);
  };

  const handleSave = () => {
    if (!name.trim()) {
      setError("Tower name cannot be empty.");
      return;
    }
    setError(null);
    startTransition(async () => {
      // Save changed fields sequentially
      if (name.trim() !== t.name) {
        const r = await A.updateTower(t.id, "name", name.trim());
        if (!r.ok) { setError(r.error); return; }
      }
      if (type !== (t.type ?? "")) {
        const r = await A.updateTower(t.id, "type", type);
        if (!r.ok) { setError(r.error); return; }
      }
      if (carpetArea.trim() !== (t.carpet_area != null ? String(t.carpet_area) : "")) {
        const r = await A.updateTower(t.id, "carpet_area", carpetArea.trim());
        if (!r.ok) { setError(r.error); return; }
      }
      if (engArea.trim() !== (t.eng_area != null ? String(t.eng_area) : "")) {
        const r = await A.updateTower(t.id, "eng_area", engArea.trim());
        if (!r.ok) { setError(r.error); return; }
      }
      if (ocDate.trim() !== (t.oc_date ?? "")) {
        const r = await A.updateTower(t.id, "oc_date", ocDate.trim());
        if (!r.ok) { setError(r.error); return; }
      }

      setOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      {trigger ? (
        <span onClick={handleOpen}>{trigger}</span>
      ) : (
        <button
          type="button"
          className="btn-action"
          title="Edit tower details"
          onClick={handleOpen}
        >
          <Pencil className="h-3 w-3 inline mr-1" />
          Edit
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <Pencil className="h-5 w-5 text-primary" />
              Edit Tower · {t.name}
            </DialogTitle>
          </DialogHeader>

          {error && (
            <div className="banner error text-sm p-3 rounded" role="alert">
              <AlertCircle className="h-4 w-4 inline mr-1 text-bad" />
              {error}
            </div>
          )}

          <div className="budget-modal-grid">
            <div className="budget-modal-field sm:col-span-2">
              <label htmlFor={`edit-tower-name-${t.id}`}>Tower Name *</label>
              <input
                id={`edit-tower-name-${t.id}`}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="budget-modal-field">
              <label htmlFor={`edit-tower-type-${t.id}`}>Building Type</label>
              <select
                id={`edit-tower-type-${t.id}`}
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="">Not set</option>
                {types.map((bt) => (
                  <option key={bt} value={bt}>
                    {bt}
                  </option>
                ))}
              </select>
            </div>

            <div className="budget-modal-field">
              <label htmlFor={`edit-tower-oc-${t.id}`}>Planned OC Date</label>
              <input
                id={`edit-tower-oc-${t.id}`}
                type="date"
                value={ocDate}
                onChange={(e) => setOcDate(e.target.value)}
              />
            </div>

            <div className="budget-modal-field">
              <label htmlFor={`edit-tower-carpet-${t.id}`}>Carpet Area (sft)</label>
              <input
                id={`edit-tower-carpet-${t.id}`}
                type="number"
                min="0"
                step="any"
                value={carpetArea}
                onChange={(e) => setCarpetArea(e.target.value)}
              />
            </div>

            <div className="budget-modal-field">
              <label htmlFor={`edit-tower-eng-${t.id}`}>Construction BUA (sft)</label>
              <input
                id={`edit-tower-eng-${t.id}`}
                type="number"
                min="0"
                step="any"
                value={engArea}
                onChange={(e) => setEngArea(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="mt-4 flex items-center justify-end gap-2">
            <AppButton
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Cancel
            </AppButton>
            <AppButton
              size="sm"
              disabled={pending}
              onClick={handleSave}
            >
              {pending ? "Saving..." : "Save Changes"}
            </AppButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ==========================================
// 3. DELETE TOWER CONFIRMATION MODAL
// ==========================================
export function DeleteTowerConfirmDialog({
  towerId,
  towerName,
  trigger,
}: {
  towerId: number;
  towerName: string;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleDelete = () => {
    startTransition(async () => {
      const res = await A.deleteTower(towerId);
      if (!res.ok) {
        setError(res.error);
      } else {
        setOpen(false);
        router.refresh();
      }
    });
  };

  return (
    <>
      {trigger ? (
        <span onClick={() => { setError(null); setOpen(true); }}>{trigger}</span>
      ) : (
        <button
          type="button"
          className="btn-action danger"
          title="Delete tower"
          onClick={() => { setError(null); setOpen(true); }}
        >
          <Trash2 className="h-3 w-3 inline mr-1" />
          Delete
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold text-bad">
              <AlertCircle className="h-5 w-5" />
              Delete Tower · {towerName}
            </DialogTitle>
          </DialogHeader>

          {error && (
            <div className="banner error text-sm p-3 rounded" role="alert">
              {error}
            </div>
          )}

          <p className="text-sm text-muted">
            Are you sure you want to delete <strong>{towerName}</strong>? All tower allocations, areas, and linked tower splits in drafts will be removed.
          </p>

          <DialogFooter className="mt-4 flex items-center justify-end gap-2">
            <AppButton
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Cancel
            </AppButton>
            <AppButton
              variant="destructive"
              size="sm"
              disabled={pending}
              onClick={handleDelete}
            >
              {pending ? "Deleting..." : "Confirm Delete"}
            </AppButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ==========================================
// 4. ADD COST HEAD MODAL
// ==========================================
export interface GstRuleOpt {
  id: number;
  name: string;
  rate: number;
  share: number;
}

export function AddCostHeadModal({
  projectId,
  departments,
  summaryOptions,
  gstRules = [],
  baseOptions = [],
  trigger,
}: {
  projectId: number;
  departments: { id: number; name: string; summary_category: string }[];
  summaryOptions: Record<string, string[]>;
  gstRules?: GstRuleOpt[];
  baseOptions?: { value: string; label: string; ids: number[] }[];
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const [deptId, setDeptId] = useState<number>(departments[0]?.id ?? 1);
  const [category, setCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [summarySub, setSummarySub] = useState("");
  const [isTax, setIsTax] = useState(false);
  const [taxRate, setTaxRate] = useState("18");
  const [taxShare, setTaxShare] = useState("100");
  const [selectedBase, setSelectedBase] = useState<number[]>([]);

  const dept = departments.find((d) => d.id === deptId) ?? departments[0];
  const subOptions = dept ? (summaryOptions[dept.summary_category] ?? []) : [];

  const reset = () => {
    setDeptId(departments[0]?.id ?? 1);
    setCategory("");
    setSubCategory("");
    setSummarySub("");
    setIsTax(false);
    setTaxRate("18");
    setTaxShare("100");
    setSelectedBase([]);
    setError(null);
  };

  const handleSave = () => {
    if (!category.trim()) {
      setError("Please enter a category name (e.g. RCC Work, Plumbing).");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await A.addHead(projectId, {
        department_id: deptId,
        category: category.trim(),
        sub_category: subCategory.trim(),
        summary_subcategory: summarySub || null,
        is_tax: isTax,
        tax_rate_pct: isTax ? Number(taxRate) : null,
        tax_share_pct: isTax ? Number(taxShare) : null,
        tax_base: isTax ? selectedBase : [],
      });
      if (!res.ok) {
        setError(res.error);
      } else {
        setOpen(false);
        reset();
        router.refresh();
      }
    });
  };

  return (
    <>
      {trigger ? (
        <span onClick={() => { reset(); setOpen(true); }}>{trigger}</span>
      ) : (
        <button
          type="button"
          className="btn-action primary"
          onClick={() => { reset(); setOpen(true); }}
        >
          <Plus className="h-3.5 w-3.5 inline mr-1" />
          Add Cost Head
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <Layers className="h-5 w-5 text-primary" />
              Add Cost Head Master
            </DialogTitle>
          </DialogHeader>

          {error && (
            <div className="banner error text-sm p-3 rounded" role="alert">
              <AlertCircle className="h-4 w-4 inline mr-1 text-bad" />
              {error}
            </div>
          )}

          <div className="budget-modal-grid">
            <div className="budget-modal-field sm:col-span-2">
              <label htmlFor="head-dept">Department *</label>
              <select
                id="head-dept"
                value={deptId}
                onChange={(e) => {
                  setDeptId(Number(e.target.value));
                  setSummarySub("");
                }}
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.summary_category})
                  </option>
                ))}
              </select>
            </div>

            <div className="budget-modal-field">
              <label htmlFor="head-cat">Category *</label>
              <input
                id="head-cat"
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Civil Contractor"
              />
            </div>

            <div className="budget-modal-field">
              <label htmlFor="head-subcat">Sub-category (Optional)</label>
              <input
                id="head-subcat"
                type="text"
                value={subCategory}
                onChange={(e) => setSubCategory(e.target.value)}
                placeholder="e.g. Tower A Works"
              />
            </div>

            {subOptions.length > 0 && (
              <div className="budget-modal-field sm:col-span-2">
                <label htmlFor="head-summary-sub">Summary Row Mapping</label>
                <select
                  id="head-summary-sub"
                  value={summarySub}
                  onChange={(e) => setSummarySub(e.target.value)}
                >
                  <option value="">Mapped to Department default</option>
                  {subOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="budget-modal-field sm:col-span-2 mt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isTax}
                  onChange={(e) => setIsTax(e.target.checked)}
                />
                <span className="font-semibold text-ink text-sm">
                  This is a GST / Tax Head (auto-computed)
                </span>
              </label>
            </div>

            {isTax && (
              <>
                <div className="budget-modal-field">
                  <label htmlFor="head-tax-rate">GST Rate (%)</label>
                  <input
                    id="head-tax-rate"
                    type="number"
                    min="0"
                    step="0.1"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                  />
                </div>
                <div className="budget-modal-field">
                  <label htmlFor="head-tax-share">Share (%)</label>
                  <input
                    id="head-tax-share"
                    type="number"
                    min="0"
                    max="100"
                    value={taxShare}
                    onChange={(e) => setTaxShare(e.target.value)}
                  />
                </div>

                {baseOptions.length > 0 && (
                  <div className="budget-modal-field sm:col-span-2">
                    <label htmlFor="head-tax-base">Tax Base (Head / Group)</label>
                    <select
                      id="head-tax-base"
                      onChange={(e) => {
                        const opt = baseOptions.find((b) => b.value === e.target.value);
                        if (opt) setSelectedBase(opt.ids);
                      }}
                    >
                      <option value="">Select Base Heads</option>
                      {baseOptions.map((b) => (
                        <option key={b.value} value={b.value}>
                          {b.label}
                        </option>
                      ))}
                    </select>
                    <span className="text-xs text-muted mt-1">
                      {selectedBase.length} base head(s) selected for tax calculation.
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter className="mt-4 flex items-center justify-end gap-2">
            <AppButton
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Cancel
            </AppButton>
            <AppButton
              size="sm"
              disabled={pending}
              onClick={handleSave}
            >
              {pending ? "Adding..." : "Add Cost Head"}
            </AppButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ==========================================
// 5. EDIT COST HEAD MODAL
// ==========================================
export function EditCostHeadModal({
  h,
  deptName,
  options = [],
  trigger,
}: {
  h: {
    id: number;
    category: string;
    sub_category: string | null;
    summary_subcategory: string | null;
    is_tax: boolean;
    tax_rate_pct: number | null;
    tax_share_pct: number | null;
  };
  deptName: string;
  options?: string[];
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const [category, setCategory] = useState(h.category);
  const [subCategory, setSubCategory] = useState(h.sub_category ?? "");
  const [summarySub, setSummarySub] = useState(h.summary_subcategory ?? "");
  const [taxRate, setTaxRate] = useState(h.tax_rate_pct != null ? String(h.tax_rate_pct) : "18");
  const [taxShare, setTaxShare] = useState(h.tax_share_pct != null ? String(h.tax_share_pct) : "100");

  const handleOpen = () => {
    setCategory(h.category);
    setSubCategory(h.sub_category ?? "");
    setSummarySub(h.summary_subcategory ?? "");
    setTaxRate(h.tax_rate_pct != null ? String(h.tax_rate_pct) : "18");
    setTaxShare(h.tax_share_pct != null ? String(h.tax_share_pct) : "100");
    setError(null);
    setOpen(true);
  };

  const handleSave = () => {
    if (!category.trim()) {
      setError("Category name cannot be empty.");
      return;
    }
    setError(null);
    startTransition(async () => {
      // 1. Rename category / sub_category if changed
      if (category.trim() !== h.category || subCategory.trim() !== (h.sub_category ?? "")) {
        const r1 = await A.renameHead(h.id, category.trim(), subCategory.trim());
        if (!r1.ok) { setError(r1.error); return; }
      }

      // 2. Update summary row or tax fields if changed
      const patch: { summary_subcategory?: string; tax_rate_pct?: number; tax_share_pct?: number } = {};
      if (summarySub !== (h.summary_subcategory ?? "")) {
        patch.summary_subcategory = summarySub;
      }
      if (h.is_tax) {
        if (taxRate !== String(h.tax_rate_pct ?? "")) patch.tax_rate_pct = Number(taxRate);
        if (taxShare !== String(h.tax_share_pct ?? 100)) patch.tax_share_pct = Number(taxShare);
      }

      if (Object.keys(patch).length > 0) {
        const r2 = await A.updateHead(h.id, patch);
        if (!r2.ok) { setError(r2.error); return; }
      }

      setOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      {trigger ? (
        <span onClick={handleOpen}>{trigger}</span>
      ) : (
        <button
          type="button"
          className="btn-action"
          title="Edit cost head"
          onClick={handleOpen}
        >
          <Pencil className="h-3 w-3 inline mr-1" />
          Edit
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <Pencil className="h-5 w-5 text-primary" />
              Edit Cost Head · {deptName}
            </DialogTitle>
          </DialogHeader>

          {error && (
            <div className="banner error text-sm p-3 rounded" role="alert">
              <AlertCircle className="h-4 w-4 inline mr-1 text-bad" />
              {error}
            </div>
          )}

          <div className="budget-modal-grid">
            <div className="budget-modal-field">
              <label htmlFor={`edit-head-cat-${h.id}`}>Category *</label>
              <input
                id={`edit-head-cat-${h.id}`}
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>

            <div className="budget-modal-field">
              <label htmlFor={`edit-head-subcat-${h.id}`}>Sub-category</label>
              <input
                id={`edit-head-subcat-${h.id}`}
                type="text"
                value={subCategory}
                onChange={(e) => setSubCategory(e.target.value)}
              />
            </div>

            {options.length > 0 && (
              <div className="budget-modal-field sm:col-span-2">
                <label htmlFor={`edit-head-summary-${h.id}`}>Summary Row Mapping</label>
                <select
                  id={`edit-head-summary-${h.id}`}
                  value={summarySub}
                  onChange={(e) => setSummarySub(e.target.value)}
                >
                  <option value="">Mapped to Department default</option>
                  {options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {h.is_tax && (
              <>
                <div className="budget-modal-field">
                  <label htmlFor={`edit-head-rate-${h.id}`}>GST Rate (%)</label>
                  <input
                    id={`edit-head-rate-${h.id}`}
                    type="number"
                    min="0"
                    step="0.1"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                  />
                </div>
                <div className="budget-modal-field">
                  <label htmlFor={`edit-head-share-${h.id}`}>Share (%)</label>
                  <input
                    id={`edit-head-share-${h.id}`}
                    type="number"
                    min="0"
                    max="100"
                    value={taxShare}
                    onChange={(e) => setTaxShare(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter className="mt-4 flex items-center justify-end gap-2">
            <AppButton
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Cancel
            </AppButton>
            <AppButton
              size="sm"
              disabled={pending}
              onClick={handleSave}
            >
              {pending ? "Saving..." : "Save Changes"}
            </AppButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ==========================================
// 6. DELETE COST HEAD CONFIRMATION MODAL
// ==========================================
export function DeleteCostHeadConfirmDialog({
  headId,
  headName,
  trigger,
}: {
  headId: number;
  headName: string;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleDelete = () => {
    startTransition(async () => {
      const res = await A.deleteHead(headId);
      if (!res.ok) {
        setError(res.error);
      } else {
        setOpen(false);
        router.refresh();
      }
    });
  };

  return (
    <>
      {trigger ? (
        <span onClick={() => { setError(null); setOpen(true); }}>{trigger}</span>
      ) : (
        <button
          type="button"
          className="btn-action danger"
          title="Delete cost head"
          onClick={() => { setError(null); setOpen(true); }}
        >
          <Trash2 className="h-3 w-3 inline mr-1" />
          Delete
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold text-bad">
              <AlertCircle className="h-5 w-5" />
              Delete Cost Head · {headName}
            </DialogTitle>
          </DialogHeader>

          {error && (
            <div className="banner error text-sm p-3 rounded" role="alert">
              {error}
            </div>
          )}

          <p className="text-sm text-muted">
            Are you sure you want to delete <strong>{headName}</strong>? This head and its budget line entries across draft versions will be deleted.
          </p>

          <DialogFooter className="mt-4 flex items-center justify-end gap-2">
            <AppButton
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Cancel
            </AppButton>
            <AppButton
              variant="destructive"
              size="sm"
              disabled={pending}
              onClick={handleDelete}
            >
              {pending ? "Deleting..." : "Confirm Delete"}
            </AppButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ==========================================
// 7. EDIT PROJECT MODAL
// ==========================================
export function EditProjectModal({
  p,
  trigger,
}: {
  p: { id: number; name: string; code: string; location: string | null };
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const [name, setName] = useState(p.name);
  const [code, setCode] = useState(p.code);
  const [location, setLocation] = useState(p.location ?? "");

  const handleOpen = () => {
    setName(p.name);
    setCode(p.code);
    setLocation(p.location ?? "");
    setError(null);
    setOpen(true);
  };

  const handleSave = () => {
    if (!name.trim()) { setError("Project name is required."); return; }
    if (!code.trim()) { setError("Project code is required."); return; }
    setError(null);

    startTransition(async () => {
      const res = await A.updateProject(p.id, {
        name: name.trim(),
        code: code.trim(),
        location: location.trim(),
      });
      if (!res.ok) {
        setError(res.error);
      } else {
        setOpen(false);
        router.refresh();
      }
    });
  };

  return (
    <>
      {trigger ? (
        <span onClick={handleOpen}>{trigger}</span>
      ) : (
        <button
          type="button"
          className="btn-action"
          onClick={handleOpen}
        >
          <Pencil className="h-3.5 w-3.5 inline mr-1" />
          Edit Details
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <Building2 className="h-5 w-5 text-primary" />
              Edit Project Details · {p.name}
            </DialogTitle>
          </DialogHeader>

          {error && (
            <div className="banner error text-sm p-3 rounded" role="alert">
              <AlertCircle className="h-4 w-4 inline mr-1 text-bad" />
              {error}
            </div>
          )}

          <div className="budget-modal-grid">
            <div className="budget-modal-field sm:col-span-2">
              <label htmlFor="edit-proj-name">Project Name *</label>
              <input
                id="edit-proj-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="budget-modal-field">
              <label htmlFor="edit-proj-code">Project Code *</label>
              <input
                id="edit-proj-code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>

            <div className="budget-modal-field">
              <label htmlFor="edit-proj-location">Location</label>
              <input
                id="edit-proj-location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Borivali East, Mumbai"
              />
            </div>
          </div>

          <DialogFooter className="mt-4 flex items-center justify-end gap-2">
            <AppButton
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Cancel
            </AppButton>
            <AppButton
              size="sm"
              disabled={pending}
              onClick={handleSave}
            >
              {pending ? "Saving..." : "Save Details"}
            </AppButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ==========================================
// 8. RECORD / EDIT VENDOR BILL MODAL
// ==========================================
export interface SplitRow {
  head: number;
  tower: number | null;
  amount: string;
}

export function RecordBillModal({
  projectId,
  heads,
  towers,
  date,
  bill,
  vendors,
  onDone,
  trigger,
}: {
  projectId: number;
  heads: { id: number; label: string }[];
  towers: { id: number; name: string }[];
  date: string;
  bill?: {
    bill_id: number;
    vendor: string;
    bill_no: string;
    bill_date: string;
    work_order: string | null;
    gst_paise: number;
    note: string | null;
    splits?: { head: number; tower: number | null; amount_paise: number }[];
  };
  vendors?: { id: string; name: string }[];
  onDone?: () => void;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const [vendor, setVendor] = useState(bill?.vendor ?? "");
  const [billNo, setBillNo] = useState(bill?.bill_no ?? "");
  const [billDate, setBillDate] = useState(bill?.bill_date ?? date);
  const [workOrder, setWorkOrder] = useState(bill?.work_order ?? "");
  const [gstAmount, setGstAmount] = useState(bill ? String(bill.gst_paise / 100) : "0");
  const [note, setNote] = useState(bill?.note ?? "");

  const initialSplits: SplitRow[] = bill?.splits?.length
    ? bill.splits.map((s) => ({
        head: s.head,
        tower: s.tower,
        amount: String(s.amount_paise / 100),
      }))
    : [{ head: heads[0]?.id ?? 0, tower: null, amount: "" }];

  const [splits, setSplits] = useState<SplitRow[]>(initialSplits);

  const reset = () => {
    setVendor(bill?.vendor ?? "");
    setBillNo(bill?.bill_no ?? "");
    setBillDate(bill?.bill_date ?? date);
    setWorkOrder(bill?.work_order ?? "");
    setGstAmount(bill ? String(bill.gst_paise / 100) : "0");
    setNote(bill?.note ?? "");
    setSplits(initialSplits);
    setError(null);
  };

  const addSplit = () => {
    setSplits([...splits, { head: heads[0]?.id ?? 0, tower: null, amount: "" }]);
  };

  const removeSplit = (index: number) => {
    if (splits.length > 1) {
      setSplits(splits.filter((_, i) => i !== index));
    }
  };

  const updateSplit = (index: number, patch: Partial<SplitRow>) => {
    setSplits(splits.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };

  const totalBasic = splits.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
  const gstNum = parseFloat(gstAmount) || 0;
  const totalGross = totalBasic + gstNum;

  const handleSave = () => {
    if (!vendor.trim()) { setError("Vendor name is required."); return; }
    if (!billNo.trim()) { setError("Bill number is required."); return; }
    if (!billDate) { setError("Bill date is required."); return; }
    if (splits.some((s) => !s.head || !(parseFloat(s.amount) > 0))) {
      setError("Every split line must have a cost head and an amount > 0.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const billInput = {
        vendor: vendor.trim(),
        billNo: billNo.trim(),
        date: billDate,
        workOrder: workOrder.trim(),
        gst: gstAmount.trim(),
        note: note.trim(),
      };
      const splitInputs = splits.map((s) => ({
        head: s.head,
        tower: s.tower,
        amount: s.amount,
      }));

      const res = bill
        ? await A.updateBill(bill.bill_id, billInput, splitInputs)
        : await A.addBill(projectId, billInput, splitInputs);

      if (!res.ok) {
        setError(res.error);
      } else {
        setOpen(false);
        reset();
        onDone?.();
        router.refresh();
      }
    });
  };

  return (
    <>
      {trigger ? (
        <span onClick={() => { reset(); setOpen(true); }}>{trigger}</span>
      ) : (
        <button
          type="button"
          className="btn-action primary"
          onClick={() => { reset(); setOpen(true); }}
        >
          <Receipt className="h-3.5 w-3.5 inline mr-1" />
          {bill ? "Edit Bill" : "Record Bill"}
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <Receipt className="h-5 w-5 text-primary" />
              {bill ? `Edit Bill · ${bill.bill_no}` : "Record Vendor Bill"}
            </DialogTitle>
          </DialogHeader>

          {error && (
            <div className="banner error text-sm p-3 rounded" role="alert">
              <AlertCircle className="h-4 w-4 inline mr-1 text-bad" />
              {error}
            </div>
          )}

          <div className="budget-modal-grid">
            <div className="budget-modal-field">
              <label htmlFor="bill-vendor">Vendor Name *</label>
              <input
                id="bill-vendor"
                type="text"
                list="bill-vendor-list"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                placeholder="Select or enter vendor name"
              />
              {vendors && vendors.length > 0 && (
                <datalist id="bill-vendor-list">
                  {vendors.map((v) => (
                    <option key={v.id} value={v.name} />
                  ))}
                </datalist>
              )}
            </div>

            <div className="budget-modal-field">
              <label htmlFor="bill-no">Bill / Invoice No. *</label>
              <input
                id="bill-no"
                type="text"
                value={billNo}
                onChange={(e) => setBillNo(e.target.value)}
                placeholder="e.g. INV/2026/042"
              />
            </div>

            <div className="budget-modal-field">
              <label htmlFor="bill-date">Bill Date *</label>
              <input
                id="bill-date"
                type="date"
                value={billDate}
                onChange={(e) => setBillDate(e.target.value)}
              />
            </div>

            <div className="budget-modal-field">
              <label htmlFor="bill-wo">Work Order / PO Ref</label>
              <input
                id="bill-wo"
                type="text"
                value={workOrder}
                onChange={(e) => setWorkOrder(e.target.value)}
                placeholder="e.g. WO-2025-089"
              />
            </div>

            <div className="budget-modal-field">
              <label htmlFor="bill-gst">GST Amount (₹)</label>
              <input
                id="bill-gst"
                type="number"
                min="0"
                step="any"
                value={gstAmount}
                onChange={(e) => setGstAmount(e.target.value)}
                placeholder="0"
              />
            </div>

            <div className="budget-modal-field">
              <label htmlFor="bill-note">Notes / Remarks</label>
              <input
                id="bill-note"
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional billing remarks"
              />
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h4 className="text-sm font-semibold text-ink flex items-center gap-1.5">
                <Calculator className="h-4 w-4 text-muted" />
                Cost Head Splits (Basic ₹)
              </h4>
              <button
                type="button"
                className="btn-action text-xs"
                onClick={addSplit}
              >
                <Plus className="h-3 w-3 inline mr-1" />
                Add Split Line
              </button>
            </div>

            <table className="split-builder-table">
              <thead>
                <tr>
                  <th>Cost Head</th>
                  <th>Tower (Optional)</th>
                  <th style={{ width: 140 }}>Basic (₹)</th>
                  <th style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {splits.map((s, idx) => (
                  <tr key={idx}>
                    <td>
                      <select
                        value={s.head}
                        onChange={(e) => updateSplit(idx, { head: Number(e.target.value) })}
                      >
                        {heads.map((h) => (
                          <option key={h.id} value={h.id}>
                            {h.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        value={s.tower ?? ""}
                        onChange={(e) =>
                          updateSplit(idx, { tower: e.target.value ? Number(e.target.value) : null })
                        }
                      >
                        <option value="">Common / Project-wide</option>
                        {towers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={s.amount}
                        onChange={(e) => updateSplit(idx, { amount: e.target.value })}
                        placeholder="Amount ₹"
                      />
                    </td>
                    <td>
                      {splits.length > 1 && (
                        <button
                          type="button"
                          className="text-bad hover:opacity-80 p-1"
                          title="Remove split"
                          onClick={() => removeSplit(idx)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-3 flex items-center justify-between text-xs bg-sunken p-2.5 rounded border border-border">
              <div>
                Basic Total: <strong>₹{totalBasic.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</strong> · GST: <strong>₹{gstNum.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</strong>
              </div>
              <div className="text-sm font-semibold text-ink">
                Gross Total: ₹{totalGross.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4 flex items-center justify-end gap-2">
            <AppButton
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Cancel
            </AppButton>
            <AppButton
              size="sm"
              disabled={pending}
              onClick={handleSave}
            >
              {pending ? "Saving..." : bill ? "Update Bill" : "Save Bill"}
            </AppButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ==========================================
// 9. RECORD SINGLE COST ENTRY MODAL
// ==========================================
export function RecordEntryModal({
  projectId,
  heads,
  towers,
  month,
  trigger,
}: {
  projectId: number;
  heads: { id: number; label: string }[];
  towers: { id: number; name: string }[];
  month: string;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const [headId, setHeadId] = useState<number>(heads[0]?.id ?? 0);
  const [towerId, setTowerId] = useState<number | null>(null);
  const [entryMonth, setEntryMonth] = useState(month);
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");

  const reset = () => {
    setHeadId(heads[0]?.id ?? 0);
    setTowerId(null);
    setEntryMonth(month);
    setAmount("");
    setReference("");
    setError(null);
  };

  const handleSave = () => {
    if (!headId) { setError("Please select a cost head."); return; }
    if (!amount.trim() || !(parseFloat(amount) > 0)) {
      setError("Please enter a valid amount in rupees.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await A.addEntry(projectId, headId, towerId, entryMonth, amount.trim(), reference.trim());
      if (!res.ok) {
        setError(res.error);
      } else {
        setOpen(false);
        reset();
        router.refresh();
      }
    });
  };

  return (
    <>
      {trigger ? (
        <span onClick={() => { reset(); setOpen(true); }}>{trigger}</span>
      ) : (
        <button
          type="button"
          className="btn-action primary"
          onClick={() => { reset(); setOpen(true); }}
        >
          <Plus className="h-3.5 w-3.5 inline mr-1" />
          Record Entry
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <DollarSign className="h-5 w-5 text-primary" />
              Record Cost Incurred Entry
            </DialogTitle>
          </DialogHeader>

          {error && (
            <div className="banner error text-sm p-3 rounded" role="alert">
              <AlertCircle className="h-4 w-4 inline mr-1 text-bad" />
              {error}
            </div>
          )}

          <div className="budget-modal-grid">
            <div className="budget-modal-field sm:col-span-2">
              <label htmlFor="entry-head">Cost Head *</label>
              <select
                id="entry-head"
                value={headId}
                onChange={(e) => setHeadId(Number(e.target.value))}
              >
                {heads.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="budget-modal-field">
              <label htmlFor="entry-tower">Tower (Optional)</label>
              <select
                id="entry-tower"
                value={towerId ?? ""}
                onChange={(e) => setTowerId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">Common / Project-wide</option>
                {towers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="budget-modal-field">
              <label htmlFor="entry-month">Month (YYYY-MM) *</label>
              <input
                id="entry-month"
                type="month"
                value={entryMonth}
                onChange={(e) => setEntryMonth(e.target.value)}
              />
            </div>

            <div className="budget-modal-field">
              <label htmlFor="entry-amount">Amount (Rupees ₹) *</label>
              <input
                id="entry-amount"
                type="number"
                min="0"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 250000"
              />
            </div>

            <div className="budget-modal-field">
              <label htmlFor="entry-ref">Reference / Narration</label>
              <input
                id="entry-ref"
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. Advance paid, Chq #1024"
              />
            </div>
          </div>

          <DialogFooter className="mt-4 flex items-center justify-end gap-2">
            <AppButton
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Cancel
            </AppButton>
            <AppButton
              size="sm"
              disabled={pending}
              onClick={handleSave}
            >
              {pending ? "Recording..." : "Save Entry"}
            </AppButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ==========================================
// 10. EDIT BUDGET LINE MODAL (Entry Sheet)
// ==========================================
export function EditLineModal({
  line,
  trigger,
}: {
  line: {
    id: number;
    title: string;
    department: string;
    tower?: string | null;
    initial_cr: number | null;
    ctc_cr: number | null;
    remark: string | null;
    ruleKind: "typed" | "rate" | "balance" | "memo" | "schedule";
    rate?: number | null;
    basis?: string | null;
    totalCr?: number | null;
    scope?: string | null;
    isTax: boolean;
    editable: boolean;
  };
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const [initial, setInitial] = useState(line.initial_cr != null ? String(line.initial_cr) : "");
  const [ctc, setCtc] = useState(line.ctc_cr != null ? String(line.ctc_cr) : "");
  const [remark, setRemark] = useState(line.remark ?? "");
  const [ruleKind, setRuleKind] = useState(line.ruleKind);
  const [rateVal, setRateVal] = useState(line.rate != null ? String(line.rate) : "");
  const [basisVal, setBasisVal] = useState(line.basis ?? "eng_area");
  const [totalVal, setTotalVal] = useState(line.totalCr != null ? String(line.totalCr) : "");
  const [scopeVal, setScopeVal] = useState<"category" | "department">((line.scope as "category" | "department") ?? "category");

  const handleOpen = () => {
    setInitial(line.initial_cr != null ? String(line.initial_cr) : "");
    setCtc(line.ctc_cr != null ? String(line.ctc_cr) : "");
    setRemark(line.remark ?? "");
    setRuleKind(line.ruleKind);
    setRateVal(line.rate != null ? String(line.rate) : "");
    setBasisVal(line.basis ?? "eng_area");
    setTotalVal(line.totalCr != null ? String(line.totalCr) : "");
    setScopeVal((line.scope as "category" | "department") ?? "category");
    setError(null);
    setOpen(true);
  };

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      // 1. Update Initial & CTC figures if typed
      if (initial !== String(line.initial_cr ?? "")) {
        const r1 = await A.updateLine(line.id, "initial", initial, line.isTax);
        if (!r1.ok) { setError(r1.error); return; }
      }
      if (ruleKind === "typed" && ctc !== String(line.ctc_cr ?? "")) {
        const r2 = await A.updateLine(line.id, "ctc", ctc, line.isTax);
        if (!r2.ok) { setError(r2.error); return; }
      }
      if (remark !== (line.remark ?? "")) {
        const r3 = await A.updateLine(line.id, "remark", remark, line.isTax);
        if (!r3.ok) { setError(r3.error); return; }
      }

      // 2. Update CTC rule if non-tax and changed
      if (!line.isTax && ruleKind !== line.ruleKind) {
        if (ruleKind === "rate") {
          const rr = await A.setLineRule(line.id, { kind: "rate", rate: rateVal, basis: basisVal });
          if (!rr.ok) { setError(rr.error); return; }
        } else if (ruleKind === "balance") {
          const rr = await A.setLineRule(line.id, { kind: "balance", total: totalVal, scope: scopeVal });
          if (!rr.ok) { setError(rr.error); return; }
        } else if (ruleKind === "memo" || ruleKind === "typed") {
          const rr = await A.setLineRule(line.id, { kind: ruleKind });
          if (!rr.ok) { setError(rr.error); return; }
        }
      }

      setOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      {trigger ? (
        <span onClick={handleOpen}>{trigger}</span>
      ) : (
        <button
          type="button"
          className="btn-action"
          title="Edit line figures and calculation rule"
          onClick={handleOpen}
        >
          <Pencil className="h-3 w-3 inline mr-1" />
          Edit
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <Calculator className="h-5 w-5 text-primary" />
              Edit Line · {line.title}
            </DialogTitle>
            <p className="text-xs text-muted">
              {line.department} {line.tower && `· ${line.tower}`}
            </p>
          </DialogHeader>

          {error && (
            <div className="banner error text-sm p-3 rounded" role="alert">
              <AlertCircle className="h-4 w-4 inline mr-1 text-bad" />
              {error}
            </div>
          )}

          <div className="budget-modal-grid">
            <div className="budget-modal-field">
              <label htmlFor="line-initial">Initial Budget (Cr)</label>
              <input
                id="line-initial"
                type="number"
                min="0"
                step="any"
                value={initial}
                disabled={!line.editable}
                onChange={(e) => setInitial(e.target.value)}
              />
            </div>

            <div className="budget-modal-field">
              <label htmlFor="line-rule-kind">CTC Calculation Rule</label>
              <select
                id="line-rule-kind"
                value={ruleKind}
                disabled={!line.editable || line.isTax}
                onChange={(e) => setRuleKind(e.target.value as typeof ruleKind)}
              >
                <option value="typed">Directly Typed (Cr)</option>
                <option value="rate">Rate per sft × Area</option>
                <option value="balance">Balance of Category/Dept</option>
                <option value="memo">Memo Item (outside totals)</option>
                <option value="schedule">Worked out in Schedule</option>
              </select>
            </div>

            {ruleKind === "typed" && (
              <div className="budget-modal-field sm:col-span-2">
                <label htmlFor="line-ctc">Estimated CTC (Cr)</label>
                <input
                  id="line-ctc"
                  type="number"
                  min="0"
                  step="any"
                  value={ctc}
                  disabled={!line.editable}
                  onChange={(e) => setCtc(e.target.value)}
                />
              </div>
            )}

            {ruleKind === "rate" && (
              <>
                <div className="budget-modal-field">
                  <label htmlFor="line-rate-val">₹ per sq ft</label>
                  <input
                    id="line-rate-val"
                    type="number"
                    min="0"
                    step="any"
                    value={rateVal}
                    onChange={(e) => setRateVal(e.target.value)}
                  />
                </div>
                <div className="budget-modal-field">
                  <label htmlFor="line-basis-val">Area Basis</label>
                  <select
                    id="line-basis-val"
                    value={basisVal}
                    onChange={(e) => setBasisVal(e.target.value)}
                  >
                    {RATE_BASES.map(([k, t]) => (
                      <option key={k} value={k}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {ruleKind === "balance" && (
              <>
                <div className="budget-modal-field">
                  <label htmlFor="line-total-val">Total Cap (Cr)</label>
                  <input
                    id="line-total-val"
                    type="number"
                    min="0"
                    step="any"
                    value={totalVal}
                    onChange={(e) => setTotalVal(e.target.value)}
                  />
                </div>
                <div className="budget-modal-field">
                  <label htmlFor="line-scope-val">Less other lines of</label>
                  <select
                    id="line-scope-val"
                    value={scopeVal}
                    onChange={(e) => setScopeVal(e.target.value as "category" | "department")}
                  >
                    <option value="category">Category</option>
                    <option value="department">Department</option>
                  </select>
                </div>
              </>
            )}

            <div className="budget-modal-field sm:col-span-2">
              <label htmlFor="line-remark">Remark / Variance Explanation</label>
              <textarea
                id="line-remark"
                rows={2}
                value={remark}
                disabled={!line.editable}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="Reason for revision or cost assumptions"
              />
            </div>
          </div>

          <DialogFooter className="mt-4 flex items-center justify-end gap-2">
            <AppButton
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Cancel
            </AppButton>
            {line.editable && (
              <AppButton
                size="sm"
                disabled={pending}
                onClick={handleSave}
              >
                {pending ? "Saving..." : "Save Line"}
              </AppButton>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ==========================================
// 12. PROJECTS MASTER DIRECTORY LIST TABLE
// ==========================================
export function ProjectsMasterTable({
  summaries,
  canManage = true,
  canCreate = false,
}: {
  summaries: {
    project: { id: number; name: string; code: string; location: string | null };
    cur?: {
      number: number;
      as_on: string;
      status: string;
      initial_cr: number;
      ctc_cr: number;
      incurred_cr: number;
      balance_cr: number;
      variance_cr: number;
      util_pct: number | null;
    };
    hasApproved: boolean;
  }[];
  canManage?: boolean;
  canCreate?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return summaries;
    return summaries.filter((s) => {
      const matchName = s.project.name.toLowerCase().includes(q);
      const matchCode = s.project.code.toLowerCase().includes(q);
      const matchLoc = (s.project.location ?? "").toLowerCase().includes(q);
      return matchName || matchCode || matchLoc;
    });
  }, [summaries, search]);

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>Projects Master Directory</h2>
          <span className="sub">
            {filtered.length} of {summaries.length} projects · latest approved or active revision
          </span>
        </div>

        <div className="row" style={{ alignItems: "center", gap: 8 }}>
          <div className="segmented-nav">
            <button
              type="button"
              className={`segmented-btn ${viewMode === "table" ? "active" : ""}`}
              onClick={() => setViewMode("table")}
            >
              Table View
            </button>
            <button
              type="button"
              className={`segmented-btn ${viewMode === "cards" ? "active" : ""}`}
              onClick={() => setViewMode("cards")}
            >
              Spend Cards
            </button>
          </div>

          {canCreate && (
            <Link href="/budget/create" className="btn-action primary">
              <Plus className="h-3.5 w-3.5 inline mr-1" />
              Create Budget
            </Link>
          )}
        </div>
      </div>

      <div className="list-toolbar">
        <div className="list-search-box">
          <Search className="h-4 w-4 text-muted" />
          <input
            type="text"
            className="list-search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects by name, code, or location..."
          />
          {search && (
            <button
              type="button"
              className="text-xs text-muted hover:text-ink px-1"
              onClick={() => setSearch("")}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {viewMode === "table" ? (
        <div className="scroll">
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th className="label">Project Name</th>
                <th>Revision</th>
                <th className="n">Initial (Cr)</th>
                <th className="n">CTC (Cr)</th>
                <th className="n">Incurred (Cr)</th>
                <th className="n">Balance (Cr)</th>
                <th className="n">Variance (Cr)</th>
                <th className="n">Utilised</th>
                <th className="actions-col">Quick Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(({ project: p, cur }) => {
                if (!cur) {
                  return (
                    <tr key={p.id}>
                      <td><span className="chip">{p.code}</span></td>
                      <td>
                        <Link href={`/budget/${p.id}`} className="font-semibold text-primary hover:underline">
                          {p.name}
                        </Link>
                        {p.location && (
                          <div className="text-xs text-muted mt-0.5">{p.location}</div>
                        )}
                      </td>
                      <td colSpan={6} className="sub">
                        No version opened yet
                      </td>
                      <td>—</td>
                      <td className="actions">
                        <div className="actions-group">
                          <Link href={`/budget/${p.id}/setup`} className="btn-action">
                            Setup
                          </Link>
                          {canCreate && (
                            <Link href={`/budget/${p.id}/create`} className="btn-action primary">
                              + Start
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                }

                const isOver = cur.variance_cr < 0;
                return (
                  <tr key={p.id}>
                    <td><span className="chip">{p.code}</span></td>
                    <td>
                      <Link href={`/budget/${p.id}/overview`} className="font-semibold text-primary hover:underline">
                        {p.name}
                      </Link>
                      {p.location && (
                        <div className="text-xs text-muted mt-0.5">{p.location}</div>
                      )}
                    </td>
                    <td>
                      <span className={`pill ${cur.status}`}>
                        R{cur.number} · {cur.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="n">{fmt(cur.initial_cr)}</td>
                    <td className="n">
                      <strong>{fmt(cur.ctc_cr)}</strong>
                    </td>
                    <td className="n">{fmt(cur.incurred_cr)}</td>
                    <td className="n">
                      <span className={cur.balance_cr < 0 ? "neg" : ""}>
                        {fmt(cur.balance_cr)}
                      </span>
                    </td>
                    <td className="n">
                      <span className={isOver ? "neg" : ""}>
                        {fmt(cur.variance_cr)}
                      </span>
                    </td>
                    <td className="n">
                      {cur.util_pct != null ? (
                        <span>
                          <span className="bar inline-block mr-1.5 align-middle">
                            <i
                              className={cur.util_pct > 100 ? "over" : cur.util_pct >= 90 ? "near" : ""}
                              style={{ width: `${Math.min(100, Math.max(0, cur.util_pct))}%` }}
                            />
                          </span>
                          {fmt(cur.util_pct)}%
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="actions">
                      <div className="actions-group">
                        <Link href={`/budget/${p.id}/overview?v=${cur.number}`} className="btn-action">
                          Overview
                        </Link>
                        <Link href={`/budget/${p.id}/budgets`} className="btn-action">
                          Budgets
                        </Link>
                        <Link href={`/budget/${p.id}/entry?v=${cur.number}`} className="btn-action">
                          Entry
                        </Link>
                        <Link href={`/budget/${p.id}/setup`} className="btn-action">
                          Setup
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="sub text-center py-6">
                    No projects matching &quot;{search}&quot;.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="project-progress-grid">
          {filtered.map(({ project: p, cur }) => {
            if (!cur) return null;
            const util = cur.util_pct ?? (cur.ctc_cr > 0 ? (cur.incurred_cr / cur.ctc_cr) * 100 : 0);
            return (
              <div key={p.id} className="project-progress-card">
                <div className="project-progress-header">
                  <div>
                    <Link href={`/budget/${p.id}/overview?v=${cur.number}`} className="project-progress-title">
                      {p.name}
                    </Link>
                    {p.location && <div className="project-progress-loc">{p.location}</div>}
                  </div>
                  <span className={`pill ${cur.status}`}>
                    R{cur.number}
                  </span>
                </div>
                <div className="project-progress-amounts">
                  <span>CTC: <b>₹{fmt(cur.ctc_cr)} Cr</b></span>
                  <span>Incurred: <b>₹{fmt(cur.incurred_cr)} Cr</b></span>
                </div>
                <div className="progress-bar-lg">
                  <i
                    className={util > 100 ? "over" : util >= 90 ? "near" : ""}
                    style={{ width: `${Math.min(100, Math.max(0, util))}%` }}
                  />
                </div>
                <div className="project-progress-footer">
                  <span>Utilised: <strong>{fmt(util)}%</strong></span>
                  <span>Bal: <strong>₹{fmt(cur.balance_cr)} Cr</strong></span>
                </div>
                <div className="mt-2 pt-2 border-t border-border flex items-center justify-between text-xs">
                  <Link href={`/budget/${p.id}/budgets`} className="text-primary hover:underline font-medium">
                    All Budgets →
                  </Link>
                  <Link href={`/budget/${p.id}/entry?v=${cur.number}`} className="text-muted hover:text-ink">
                    Entry
                  </Link>
                  <Link href={`/budget/${p.id}/setup`} className="text-muted hover:text-ink">
                    Setup
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ==========================================
// 13. 5-STAGE PROCESS WORKFLOW RIBBON
// ==========================================
export function StageProcessBar({
  projectId,
  activeTab,
  versionNumber,
}: {
  projectId: number;
  activeTab: string;
  versionNumber: number | null;
}) {
  const q = versionNumber ? `?v=${versionNumber}` : "";
  const stages = [
    { num: 1, title: "Setup & Masters", tab: "setup", activeFor: ["setup", "masters"] },
    { num: 2, title: "Budget Planning", tab: "entry", activeFor: ["entry", "create", "workings", "schedules", "import", "line"] },
    { num: 3, title: "Review & Sign-Off", tab: "overview", activeFor: ["overview", "signoff"] },
    { num: 4, title: "Execution & Actuals", tab: "incurred", activeFor: ["incurred", "periods"] },
    { num: 5, title: "Reports & Analytics", tab: "summary", activeFor: ["summary", "detail", "compare"] },
  ];

  return (
    <nav className="stage-nav" aria-label="Budget 5-stage lifecycle">
      {stages.map((st, i) => {
        const isActive = st.activeFor.includes(activeTab);
        return (
          <React.Fragment key={st.num}>
            {i > 0 && <span className="stage-sep" aria-hidden>→</span>}
            <Link
              href={`/budget/${projectId}/${st.tab}${q}`}
              className={`stage-item ${isActive ? "active" : ""}`}
            >
              <span className="stage-num">{st.num}</span>
              <span>{st.title}</span>
            </Link>
          </React.Fragment>
        );
      })}
    </nav>
  );
}

// ==========================================
// 14. EDIT BUDGET DETAILS MODAL
// ==========================================
export function EditBudgetDetailsModal({
  version,
  project,
  trigger,
}: {
  version: { id: number; number: number; as_on: string; reason: string | null; status: string };
  project: { id: number; name: string; fy_start_month?: number };
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const [asOn, setAsOn] = useState(version.as_on.slice(0, 10));
  const [reason, setReason] = useState(version.reason ?? "");

  const period = formatBudgetPeriod(asOn, project.fy_start_month ?? 4);
  const title = versionTitle(version.number);

  const handleOpen = () => {
    setAsOn(version.as_on.slice(0, 10));
    setReason(version.reason ?? "");
    setError(null);
    setOpen(true);
  };

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      const res = await A.updateVersion(version.id, {
        as_on: asOn,
        reason: reason.trim() || null,
      });
      if (!res.ok) {
        setError(res.error);
      } else {
        setOpen(false);
        router.refresh();
      }
    });
  };

  return (
    <>
      {trigger ? (
        <span onClick={handleOpen}>{trigger}</span>
      ) : (
        <button
          type="button"
          className="btn-action"
          onClick={handleOpen}
        >
          <Pencil className="h-3 w-3 inline mr-1" />
          Edit Details
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <Calendar className="h-5 w-5 text-primary" />
              Edit Budget Details · {title}
            </DialogTitle>
          </DialogHeader>

          {error && (
            <div className="banner error text-sm p-3 rounded" role="alert">
              <AlertCircle className="h-4 w-4 inline mr-1 text-bad" />
              {error}
            </div>
          )}

          <div className="budget-modal-grid">
            <div className="budget-modal-field sm:col-span-2">
              <label>Budget Title / Classification</label>
              <div className="p-2.5 rounded bg-elevated border border-border text-xs space-y-1">
                <div className="font-semibold text-ink flex items-center gap-1.5">
                  <span className={`pill ${version.status}`}>R{version.number} · {version.status.replace("_", " ")}</span>
                  <span>{title}</span>
                </div>
                <div className="text-muted">
                  {version.number === 1 ? "Initial baseline budget for this development project." : `Revision ${version.number - 1} against initial baseline.`}
                </div>
              </div>
            </div>

            <div className="budget-modal-field">
              <label htmlFor="bvm-as-on">As-On / Cutoff Date *</label>
              <input
                id="bvm-as-on"
                type="date"
                value={asOn}
                onChange={(e) => setAsOn(e.target.value)}
              />
            </div>

            <div className="budget-modal-field">
              <label>Financial Period & Quarter</label>
              <div className="p-2 rounded bg-elevated border border-border text-xs text-ink font-medium">
                <div>{period.fy} · {period.quarter}</div>
                <div className="text-muted text-[11px]">{period.range}</div>
              </div>
            </div>

            <div className="budget-modal-field sm:col-span-2">
              <label htmlFor="bvm-reason">Revision Reason / Planning Notes</label>
              <textarea
                id="bvm-reason"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe the context for this budget revision (e.g. Design adjustments in Tower A, commodity price movements, RERA revision)..."
                className="w-full text-xs rounded border border-border bg-surface p-2 text-ink"
              />
            </div>
          </div>

          <DialogFooter className="mt-4 flex items-center justify-end gap-2">
            <AppButton variant="outline" size="sm" disabled={pending} onClick={() => setOpen(false)}>
              Cancel
            </AppButton>
            <AppButton size="sm" disabled={pending} onClick={handleSave}>
              {pending ? "Saving..." : "Save Budget Details"}
            </AppButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ==========================================
// 15. DEDICATED BUDGETS REGISTRY TABLE
// ==========================================
export interface BudgetRegistryRow {
  version: {
    id: number;
    project_id: number;
    number: number;
    as_on: string;
    status: "draft" | "in_review" | "approved";
    reason: string | null;
    prepared_by: string | null;
    approved_by: string | null;
    approved_at: string | null;
  };
  totals?: {
    initial_cr: number;
    ctc_cr: number;
    incurred_cr: number;
    balance_cr: number;
    variance_cr: number;
    util_pct: number | null;
  } | null;
  names: Record<string, string>;
}

export function BudgetsRegistryTable({
  project,
  rows,
  canCreate,
  canManage,
}: {
  project: { id: number; name: string; code: string; location: string | null; fy_start_month: number };
  rows: BudgetRegistryRow[];
  canCreate: boolean;
  canManage: boolean;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = rows.filter(({ version: v, totals: t, names }) => {
    if (statusFilter !== "all" && v.status !== statusFilter) return false;
    const q = search.toLowerCase();
    const prep = (v.prepared_by && names[v.prepared_by]?.toLowerCase()) ?? "";
    const apprv = (v.approved_by && names[v.approved_by]?.toLowerCase()) ?? "";
    const reason = (v.reason ?? "").toLowerCase();
    const title = versionTitle(v.number).toLowerCase();
    return (
      title.includes(q) ||
      `r${v.number}`.includes(q) ||
      prep.includes(q) ||
      apprv.includes(q) ||
      reason.includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <div className="list-toolbar">
        <div className="flex flex-wrap items-center gap-2">
          <div className="list-search-box">
            <Search className="h-4 w-4 text-muted" />
            <input
              type="text"
              className="list-search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search budgets by title, revision, reason, or preparer..."
            />
            {search && (
              <button
                type="button"
                className="text-xs text-muted hover:text-ink px-1"
                onClick={() => setSearch("")}
              >
                Clear
              </button>
            )}
          </div>

          <div className="segmented-nav">
            <button
              type="button"
              className={`segmented-btn ${statusFilter === "all" ? "active" : ""}`}
              onClick={() => setStatusFilter("all")}
            >
              All ({rows.length})
            </button>
            <button
              type="button"
              className={`segmented-btn ${statusFilter === "approved" ? "active" : ""}`}
              onClick={() => setStatusFilter("approved")}
            >
              Approved ({rows.filter((r) => r.version.status === "approved").length})
            </button>
            <button
              type="button"
              className={`segmented-btn ${statusFilter === "in_review" ? "active" : ""}`}
              onClick={() => setStatusFilter("in_review")}
            >
              In Review ({rows.filter((r) => r.version.status === "in_review").length})
            </button>
            <button
              type="button"
              className={`segmented-btn ${statusFilter === "draft" ? "active" : ""}`}
              onClick={() => setStatusFilter("draft")}
            >
              Drafts ({rows.filter((r) => r.version.status === "draft").length})
            </button>
          </div>
        </div>

        {canCreate && (
          <Link href={`/budget/${project.id}/create`} className="btn-action primary">
            <Plus className="h-3.5 w-3.5 inline mr-1" />
            Create Next Revision
          </Link>
        )}
      </div>

      <div className="scroll">
        <table>
          <thead>
            <tr>
              <th className="label">Budget Classification</th>
              <th>Financial Period & Cutoff</th>
              <th>Status</th>
              <th className="n">Initial (Cr)</th>
              <th className="n">Estimated CTC (Cr)</th>
              <th className="n">Incurred (Cr)</th>
              <th className="n">Balance (Cr)</th>
              <th className="n">Variance vs Initial</th>
              <th className="n">Utilised</th>
              <th>Prepared & Approved</th>
              <th className="actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(({ version: v, totals: t, names }) => {
              const period = formatBudgetPeriod(v.as_on, project.fy_start_month);
              const title = versionTitle(v.number);
              const subtitle = versionSubtitle(v.number);
              const isOver = (t?.variance_cr ?? 0) < 0;

              return (
                <tr key={v.id}>
                  <td>
                    <div>
                      <strong className="text-sm text-foreground block">{title}</strong>
                      <span className="text-xs text-muted block mt-0.5">{subtitle}</span>
                      {v.reason && (
                        <div className="text-[11px] text-muted italic mt-1 line-clamp-1" title={v.reason}>
                          Note: {v.reason}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="space-y-0.5">
                      <div className="font-semibold text-xs text-ink">{period.fy} · {period.quarter}</div>
                      <div className="text-[11px] text-muted">As on {period.asOnFormatted}</div>
                      <div className="text-[10px] text-muted">{period.range}</div>
                    </div>
                  </td>
                  <td>
                    <span className={`pill ${v.status}`}>
                      R{v.number} · {v.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="n">{t ? fmt(t.initial_cr) : "—"}</td>
                  <td className="n">
                    <strong>{t ? fmt(t.ctc_cr) : "—"}</strong>
                  </td>
                  <td className="n">{t ? fmt(t.incurred_cr) : "—"}</td>
                  <td className="n">
                    <span className={(t?.balance_cr ?? 0) < 0 ? "neg" : ""}>
                      {t ? fmt(t.balance_cr) : "—"}
                    </span>
                  </td>
                  <td className="n">
                    <span className={isOver ? "neg" : ""}>
                      {t ? fmt(t.variance_cr) : "—"}
                    </span>
                  </td>
                  <td className="n">
                    {t?.util_pct != null ? (
                      <span>
                        <span className="bar inline-block mr-1 align-middle">
                          <i
                            className={t.util_pct > 100 ? "over" : t.util_pct >= 90 ? "near" : ""}
                            style={{ width: `${Math.min(100, Math.max(0, t.util_pct))}%` }}
                          />
                        </span>
                        {fmt(t.util_pct)}%
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="text-xs text-muted space-y-0.5">
                    {v.prepared_by && (
                      <div>By: {names[v.prepared_by] ?? "Preparer"}</div>
                    )}
                    {v.approved_by && (
                      <div className="text-good">
                        Approved: {names[v.approved_by] ?? "Approver"}
                        {v.approved_at && ` (${dmy(v.approved_at)})`}
                      </div>
                    )}
                  </td>
                  <td className="actions">
                    <div className="actions-group">
                      <Link
                        href={`/budget/${project.id}/overview?v=${v.number}`}
                        className="btn-action"
                        title="View Dashboard for this Budget"
                      >
                        Overview
                      </Link>
                      <Link
                        href={`/budget/${project.id}/entry?v=${v.number}`}
                        className="btn-action"
                        title="Open Budget Entry Form"
                      >
                        Entry
                      </Link>
                      <Link
                        href={`/budget/${project.id}/summary?v=${v.number}`}
                        className="btn-action"
                        title="View Executive Summary Report"
                      >
                        Summary
                      </Link>
                      {canManage && (
                        <EditBudgetDetailsModal
                          version={v}
                          project={project}
                          trigger={<button type="button" className="btn-action">Edit Details</button>}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={11} className="sub text-center py-6">
                  No budgets found matching &quot;{search}&quot;.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}



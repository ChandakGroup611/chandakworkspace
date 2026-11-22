"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as M from "@/lib/budget/masters-actions";
import { useAction } from "./forms";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { AppButton } from "@/components/ui/AppButton";
import {
  Building2,
  Layers,
  Plus,
  Pencil,
  Trash2,
  Search,
  AlertCircle,
  Filter,
  CheckCircle2,
  XCircle,
  FolderTree,
  Percent,
  Users,
  Briefcase,
  Calendar,
  ExternalLink,
} from "lucide-react";

export type MasterSection =
  | "projects"
  | "towers"
  | "building-types"
  | "departments"
  | "cost-heads"
  | "summary"
  | "gst"
  | "vendors";

export interface SummaryRow {
  category: string;
  subcategory: string;
  category_sort: number;
  subcategory_sort: number;
}
export interface DepartmentRow {
  id: number;
  name: string;
  summary_category: string;
  sort: number;
  heads: number;
}
export interface GstRule {
  id: number;
  name: string;
  rate_pct: number;
  share_pct: number;
  sort: number;
  active: boolean;
}
export interface ProjectRow {
  id: number;
  code: string;
  name: string;
  location: string | null;
  fy_start_month: number;
}
export interface TowerRow {
  id: number;
  project_id: number;
  name: string;
  type: string | null;
  carpet_area: number | null;
  eng_area: number | null;
  oc_date: string | null;
  sort: number;
  project_name?: string;
  project_code?: string;
}
export interface CostHeadRow {
  id: number;
  project_id: number;
  department_id: number;
  category: string;
  sub_category: string | null;
  summary_subcategory: string | null;
  is_tax: boolean;
  tax_rate_pct: number | null;
  tax_share_pct: number | null;
  active: boolean;
  project_name?: string;
  department_name?: string;
  department_category?: string;
}
export interface VendorRow {
  id: string;
  name: string;
  website: string | null;
  contact_email: string | null;
  phone: string | null;
  notes: string | null;
}

export function MastersSettings({
  projects = [],
  towers = [],
  departments = [],
  heads = [],
  summary = [],
  gst = [],
  vendors = [],
  buildingTypes = [],
  editable = true,
  section = "projects",
}: {
  projects?: ProjectRow[];
  towers?: TowerRow[];
  departments?: DepartmentRow[];
  heads?: CostHeadRow[];
  summary?: SummaryRow[];
  gst?: GstRule[];
  vendors?: VendorRow[];
  buildingTypes?: string[];
  editable?: boolean;
  section?: MasterSection;
}) {
  const categories = [...new Map(summary.map((r) => [r.category, r.category_sort])).entries()].sort((a, b) => a[1] - b[1]);

  return (
    <div className="space-y-6">
      {!editable && (
        <div className="banner info">
          <div>
            <strong>Read-only mode.</strong> Changing master records requires administrative rights (project.setup).
          </div>
        </div>
      )}

      {section === "projects" && (
        <ProjectsMaster
          projects={projects}
          towers={towers}
          heads={heads}
          editable={editable}
        />
      )}

      {section === "towers" && (
        <TowersMaster
          towers={towers}
          projects={projects}
          buildingTypes={buildingTypes}
          editable={editable}
        />
      )}

      {section === "building-types" && (
        <BuildingTypesMaster
          buildingTypes={buildingTypes}
          towers={towers}
        />
      )}

      {section === "departments" && (
        <DepartmentsMaster
          rows={departments}
          categories={categories.map(([c]) => c)}
          editable={editable}
        />
      )}

      {section === "cost-heads" && (
        <CostHeadsMaster
          heads={heads}
          projects={projects}
          departments={departments}
          summaryRows={summary}
          gstRules={gst}
          editable={editable}
        />
      )}

      {section === "summary" && (
        <SummaryRowsMaster
          rows={summary}
          categories={categories}
          editable={editable}
        />
      )}

      {section === "gst" && (
        <GstRulesMaster
          rows={gst}
          editable={editable}
        />
      )}

      {section === "vendors" && (
        <VendorsMaster
          vendors={vendors}
          editable={editable}
        />
      )}
    </div>
  );
}

// ==========================================
// 1. PROJECTS MASTER
// ==========================================
function ProjectsMaster({
  projects,
  towers,
  heads,
  editable,
}: {
  projects: ProjectRow[];
  towers: TowerRow[];
  heads: CostHeadRow[];
  editable: boolean;
}) {
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editProject, setEditProject] = useState<ProjectRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProjectRow | null>(null);

  const filtered = projects.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q) ||
      (p.location && p.location.toLowerCase().includes(q))
    );
  });

  const towerCountByProj = new Map<number, number>();
  for (const t of towers) {
    towerCountByProj.set(t.project_id, (towerCountByProj.get(t.project_id) ?? 0) + 1);
  }

  const headCountByProj = new Map<number, number>();
  for (const h of heads) {
    headCountByProj.set(h.project_id, (headCountByProj.get(h.project_id) ?? 0) + 1);
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>Project Master</h2>
          <span className="sub">
            All registered development projects with their codes, financial calendars, and locations.
          </span>
        </div>
        {editable && (
          <AppButton size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-3.5 w-3.5 inline mr-1" />
            Add Project
          </AppButton>
        )}
      </div>

      <div className="master-kpi-strip">
        <div className="master-kpi-tile">
          <span className="kpi-label">Total Projects</span>
          <span className="kpi-val">{projects.length}</span>
          <span className="kpi-sub">Registered projects</span>
        </div>
        <div className="master-kpi-tile">
          <span className="kpi-label">Configured Towers</span>
          <span className="kpi-val">{towers.length}</span>
          <span className="kpi-sub">Across all projects</span>
        </div>
        <div className="master-kpi-tile">
          <span className="kpi-label">Standard FY Calendar</span>
          <span className="kpi-val">April (Month 4)</span>
          <span className="kpi-sub">Financial year start</span>
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
        <span className="text-xs text-muted">Showing {filtered.length} of {projects.length}</span>
      </div>

      <div className="scroll">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th className="label">Project Name</th>
              <th>Location</th>
              <th>FY Start Month</th>
              <th className="n">Towers</th>
              <th className="n">Cost Heads</th>
              {editable && <th className="actions-col">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id}>
                <td>
                  <span className="chip">{p.code}</span>
                </td>
                <td>
                  <Link
                    href={`/budget/${p.id}/overview`}
                    className="font-semibold text-primary hover:underline flex items-center gap-1"
                  >
                    {p.name}
                    <ExternalLink className="h-3 w-3 inline text-muted" />
                  </Link>
                </td>
                <td>{p.location || <span className="sub">Not set</span>}</td>
                <td>
                  {new Date(2026, p.fy_start_month - 1, 1).toLocaleString("en-IN", { month: "long" })} (Month {p.fy_start_month})
                </td>
                <td className="n">{towerCountByProj.get(p.id) ?? 0}</td>
                <td className="n">{headCountByProj.get(p.id) ?? 0}</td>
                {editable && (
                  <td className="actions">
                    <div className="actions-group">
                      <button
                        type="button"
                        className="btn-action"
                        onClick={() => setEditProject(p)}
                      >
                        <Pencil className="h-3 w-3 inline mr-1" />
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn-action text-bad hover:bg-bad/10"
                        onClick={() => setDeleteTarget(p)}
                      >
                        <Trash2 className="h-3 w-3 inline mr-1" />
                        Delete
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={editable ? 7 : 6} className="sub text-center py-6">
                  No projects matching &quot;{search}&quot;.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {addOpen && (
        <ProjectFormDialog
          open={addOpen}
          onClose={() => setAddOpen(false)}
        />
      )}

      {editProject && (
        <ProjectFormDialog
          project={editProject}
          open={!!editProject}
          onClose={() => setEditProject(null)}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmDialog
          title={`Delete Project: ${deleteTarget.name}`}
          message={`Are you sure you want to delete project ${deleteTarget.name} (${deleteTarget.code})? This will permanently delete the project and all its subprojects if no active transactions exist.`}
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => M.deleteProjectMaster(deleteTarget.id)}
        />
      )}
    </section>
  );
}

// Project Dialog (Add / Edit)
function ProjectFormDialog({
  project,
  open,
  onClose,
}: {
  project?: ProjectRow;
  open: boolean;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const [name, setName] = useState(project?.name ?? "");
  const [code, setCode] = useState(project?.code ?? "");
  const [location, setLocation] = useState(project?.location ?? "");
  const [fyMonth, setFyMonth] = useState(project?.fy_start_month ?? 4);

  const handleSave = () => {
    if (!name.trim()) { setError("Project name is required."); return; }
    if (!code.trim()) { setError("Project code is required."); return; }
    setError(null);

    startTransition(async () => {
      const res = await M.saveProjectMaster(project ? project.id : null, {
        name: name.trim(),
        code: code.trim(),
        location: location.trim(),
        fyStartMonth: fyMonth,
      });
      if (!res.ok) {
        setError(res.error);
      } else {
        onClose();
        router.refresh();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="budget-dialog max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <Building2 className="h-5 w-5 text-primary" />
            {project ? `Edit Project · ${project.name}` : "Create New Project"}
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
            <label htmlFor="pm-name">Project Name *</label>
            <input
              id="pm-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Chandak Stellar, Nostalgia"
              autoFocus
            />
          </div>

          <div className="budget-modal-field">
            <label htmlFor="pm-code">Project Code *</label>
            <input
              id="pm-code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. CSW, CHN"
            />
          </div>

          <div className="budget-modal-field">
            <label htmlFor="pm-fy">FY Start Month</label>
            <select
              id="pm-fy"
              value={fyMonth}
              onChange={(e) => setFyMonth(Number(e.target.value))}
            >
              <option value={4}>April (Standard India FY)</option>
              <option value={1}>January (Calendar Year)</option>
              <option value={7}>July</option>
              <option value={10}>October</option>
            </select>
          </div>

          <div className="budget-modal-field sm:col-span-2">
            <label htmlFor="pm-loc">Location / Site Address</label>
            <input
              id="pm-loc"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Goregaon West, Mumbai"
            />
          </div>
        </div>

        <DialogFooter className="mt-4 flex items-center justify-end gap-2">
          <AppButton variant="outline" size="sm" disabled={pending} onClick={onClose}>
            Cancel
          </AppButton>
          <AppButton size="sm" disabled={pending} onClick={handleSave}>
            {pending ? "Saving..." : project ? "Save Changes" : "Create Project"}
          </AppButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==========================================
// 2. TOWERS MASTER
// ==========================================
function TowersMaster({
  towers,
  projects,
  buildingTypes,
  editable,
}: {
  towers: TowerRow[];
  projects: ProjectRow[];
  buildingTypes: string[];
  editable: boolean;
}) {
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editTower, setEditTower] = useState<TowerRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TowerRow | null>(null);

  const filtered = towers.filter((t) => {
    if (selectedProject !== "all" && String(t.project_id) !== selectedProject) return false;
    const q = search.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      (t.type && t.type.toLowerCase().includes(q)) ||
      (t.project_name && t.project_name.toLowerCase().includes(q))
    );
  });

  const totalCarpet = towers.reduce((s, t) => s + (t.carpet_area ?? 0), 0);
  const totalEng = towers.reduce((s, t) => s + (t.eng_area ?? 0), 0);

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>Tower & Building Master</h2>
          <span className="sub">
            All physical towers, wings, and subprojects across projects with their building types and areas.
          </span>
        </div>
        {editable && (
          <AppButton size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-3.5 w-3.5 inline mr-1" />
            Add Tower
          </AppButton>
        )}
      </div>

      <div className="master-kpi-strip">
        <div className="master-kpi-tile">
          <span className="kpi-label">Total Towers</span>
          <span className="kpi-val">{towers.length}</span>
          <span className="kpi-sub">Across all projects</span>
        </div>
        <div className="master-kpi-tile">
          <span className="kpi-label">Total Carpet Area</span>
          <span className="kpi-val">{totalCarpet.toLocaleString()} sft</span>
          <span className="kpi-sub">Carpet allocation</span>
        </div>
        <div className="master-kpi-tile">
          <span className="kpi-label">Total Construction BUA</span>
          <span className="kpi-val">{totalEng.toLocaleString()} sft</span>
          <span className="kpi-sub">Engineering BUA</span>
        </div>
      </div>

      <div className="list-toolbar">
        <div className="flex flex-wrap items-center gap-2">
          <div className="list-search-box">
            <Search className="h-4 w-4 text-muted" />
            <input
              type="text"
              className="list-search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tower name, type, or project..."
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

          <div className="flex items-center gap-1.5 text-xs text-muted">
            <Filter className="h-3.5 w-3.5" />
            <span>Project:</span>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="px-2 py-1 text-xs rounded border border-border bg-surface text-ink"
            >
              <option value="all">All Projects ({projects.length})</option>
              {projects.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
          </div>
        </div>
        <span className="text-xs text-muted">Showing {filtered.length} of {towers.length}</span>
      </div>

      <div className="scroll">
        <table>
          <thead>
            <tr>
              <th>Project</th>
              <th className="label">Tower / Wing</th>
              <th>Building Type</th>
              <th className="n">Carpet Area (sft)</th>
              <th className="n">Engg. BUA (sft)</th>
              <th>Planned OC Date</th>
              {editable && <th className="actions-col">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id}>
                <td>
                  <span className="chip">{t.project_name ?? `Project #${t.project_id}`}</span>
                </td>
                <td>
                  <strong>{t.name}</strong>
                </td>
                <td>
                  {t.type ? <span className="chip">{t.type}</span> : <span className="sub">Not set</span>}
                </td>
                <td className="n">
                  {t.carpet_area ? `${t.carpet_area.toLocaleString()} sft` : "—"}
                </td>
                <td className="n">
                  {t.eng_area ? `${t.eng_area.toLocaleString()} sft` : "—"}
                </td>
                <td>{t.oc_date ?? "—"}</td>
                {editable && (
                  <td className="actions">
                    <div className="actions-group">
                      <button
                        type="button"
                        className="btn-action"
                        onClick={() => setEditTower(t)}
                      >
                        <Pencil className="h-3 w-3 inline mr-1" />
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn-action text-bad hover:bg-bad/10"
                        onClick={() => setDeleteTarget(t)}
                      >
                        <Trash2 className="h-3 w-3 inline mr-1" />
                        Delete
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={editable ? 7 : 6} className="sub text-center py-6">
                  No towers found for the selected criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {addOpen && (
        <TowerFormDialog
          projects={projects}
          buildingTypes={buildingTypes}
          open={addOpen}
          onClose={() => setAddOpen(false)}
        />
      )}

      {editTower && (
        <TowerFormDialog
          tower={editTower}
          projects={projects}
          buildingTypes={buildingTypes}
          open={!!editTower}
          onClose={() => setEditTower(null)}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmDialog
          title={`Delete Tower: ${deleteTarget.name}`}
          message={`Are you sure you want to delete tower "${deleteTarget.name}"? If it carries cost entries or line figures, deletion will be safely rejected by the database.`}
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => M.deleteTowerMaster(deleteTarget.id)}
        />
      )}
    </section>
  );
}

// Tower Dialog (Add / Edit)
function TowerFormDialog({
  tower,
  projects,
  buildingTypes,
  open,
  onClose,
}: {
  tower?: TowerRow;
  projects: ProjectRow[];
  buildingTypes: string[];
  open: boolean;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const [projectId, setProjectId] = useState<number>(tower?.project_id ?? projects[0]?.id ?? 1);
  const [name, setName] = useState(tower?.name ?? "");
  const [type, setType] = useState(tower?.type ?? buildingTypes[0] ?? "Sales Building");
  const [carpetArea, setCarpetArea] = useState(tower?.carpet_area != null ? String(tower.carpet_area) : "");
  const [engArea, setEngArea] = useState(tower?.eng_area != null ? String(tower.eng_area) : "");
  const [ocDate, setOcDate] = useState(tower?.oc_date ?? "");

  const handleSave = () => {
    if (!name.trim()) { setError("Tower name is required."); return; }
    if (!projectId) { setError("Please choose a project."); return; }
    setError(null);

    startTransition(async () => {
      const res = await M.saveTowerMaster(tower ? tower.id : null, {
        project_id: projectId,
        name: name.trim(),
        type: type.trim() || null,
        carpet_area: carpetArea.trim(),
        eng_area: engArea.trim(),
        oc_date: ocDate.trim() || null,
      });
      if (!res.ok) {
        setError(res.error);
      } else {
        onClose();
        router.refresh();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="budget-dialog max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <Building2 className="h-5 w-5 text-primary" />
            {tower ? `Edit Tower · ${tower.name}` : "Add New Tower"}
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
            <label htmlFor="tm-project">Project *</label>
            <select
              id="tm-project"
              value={projectId}
              onChange={(e) => setProjectId(Number(e.target.value))}
              disabled={!!tower}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
          </div>

          <div className="budget-modal-field sm:col-span-2">
            <label htmlFor="tm-name">Tower / Wing Name *</label>
            <input
              id="tm-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Tower A, Wing 1"
              autoFocus
            />
          </div>

          <div className="budget-modal-field">
            <label htmlFor="tm-type">Building Type</label>
            <select
              id="tm-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {buildingTypes.map((bt) => (
                <option key={bt} value={bt}>
                  {bt}
                </option>
              ))}
            </select>
          </div>

          <div className="budget-modal-field">
            <label htmlFor="tm-oc">Planned OC Date</label>
            <input
              id="tm-oc"
              type="date"
              value={ocDate}
              onChange={(e) => setOcDate(e.target.value)}
            />
          </div>

          <div className="budget-modal-field">
            <label htmlFor="tm-carpet">Carpet Area (sft)</label>
            <input
              id="tm-carpet"
              type="number"
              min="0"
              step="any"
              value={carpetArea}
              onChange={(e) => setCarpetArea(e.target.value)}
              placeholder="e.g. 50000"
            />
          </div>

          <div className="budget-modal-field">
            <label htmlFor="tm-eng">Construction BUA (sft)</label>
            <input
              id="tm-eng"
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
          <AppButton variant="outline" size="sm" disabled={pending} onClick={onClose}>
            Cancel
          </AppButton>
          <AppButton size="sm" disabled={pending} onClick={handleSave}>
            {pending ? "Saving..." : tower ? "Save Changes" : "Add Tower"}
          </AppButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==========================================
// 3. BUILDING TYPES MASTER
// ==========================================
function BuildingTypesMaster({
  buildingTypes,
  towers,
}: {
  buildingTypes: string[];
  towers: TowerRow[];
}) {
  const towerCountByType = new Map<string, number>();
  const carpetByType = new Map<string, number>();
  const engByType = new Map<string, number>();

  for (const t of towers) {
    if (t.type) {
      towerCountByType.set(t.type, (towerCountByType.get(t.type) ?? 0) + 1);
      carpetByType.set(t.type, (carpetByType.get(t.type) ?? 0) + (t.carpet_area ?? 0));
      engByType.set(t.type, (engByType.get(t.type) ?? 0) + (t.eng_area ?? 0));
    }
  }

  const descriptions: Record<string, string> = {
    "Sales Building": "Primary saleable residential or commercial inventory tower.",
    "Society Building": "Rehabilitation / replacement building for existing society members.",
    "Rehab Building": "Slum rehabilitation or municipal tenant replacement structures.",
    "Common Infra": "Site-wide civil works, podiums, clubhouses, basements, and sub-stations.",
    "MHADA Building": "Mandatory low-cost housing handed over to the housing authority.",
    "Reservation Building": "Public amenity or municipal reservation handed over to the authority.",
    "Open Space Area / MCGM": "Designated public open space, recreational ground, or garden area.",
    "School / Other Building": "Institutional structures, primary schools, or auxiliary buildings.",
  };

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>Building Types Master</h2>
          <span className="sub">
            The 8 standardized corporate building types that determine construction summary grouping and allocation logic.
          </span>
        </div>
      </div>

      <div className="master-kpi-strip">
        <div className="master-kpi-tile">
          <span className="kpi-label">Defined Types</span>
          <span className="kpi-val">{buildingTypes.length}</span>
          <span className="kpi-sub">Standardized building types</span>
        </div>
        <div className="master-kpi-tile">
          <span className="kpi-label">Mapped Towers</span>
          <span className="kpi-val">{towers.filter((t) => t.type).length}</span>
          <span className="kpi-sub">Towers assigned to types</span>
        </div>
        <div className="master-kpi-tile">
          <span className="kpi-label">Summary Roll-Up</span>
          <span className="kpi-val">Construction</span>
          <span className="kpi-sub">Summary category</span>
        </div>
      </div>

      <div className="banner info">
        <div>
          <strong>Architecture Note:</strong> Building types are codified in the database check constraint and summary template so that tower allocation views, corporate summaries, and PSF math always remain mathematically aligned.
        </div>
      </div>

      <div className="scroll">
        <table>
          <thead>
            <tr>
              <th className="label">Building Type</th>
              <th>Category Roll-Up</th>
              <th className="n">Active Towers</th>
              <th className="n">Total Carpet (sft)</th>
              <th className="n">Total BUA (sft)</th>
              <th>Functional Scope</th>
            </tr>
          </thead>
          <tbody>
            {buildingTypes.map((bt) => {
              const count = towerCountByType.get(bt) ?? 0;
              const carpet = carpetByType.get(bt) ?? 0;
              const eng = engByType.get(bt) ?? 0;
              return (
                <tr key={bt}>
                  <td>
                    <strong>{bt}</strong>
                  </td>
                  <td>
                    <span className="chip">Construction</span>
                  </td>
                  <td className="n">
                    {count > 0 ? <strong>{count}</strong> : <span className="sub">0</span>}
                  </td>
                  <td className="n">
                    {carpet > 0 ? `${carpet.toLocaleString()} sft` : "—"}
                  </td>
                  <td className="n">
                    {eng > 0 ? `${eng.toLocaleString()} sft` : "—"}
                  </td>
                  <td className="text-muted text-xs">
                    {descriptions[bt] ?? "Standard building development category."}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ==========================================
// 4. DEPARTMENTS MASTER
// ==========================================
function DepartmentsMaster({
  rows,
  categories,
  editable,
}: {
  rows: DepartmentRow[];
  categories: string[];
  editable: boolean;
}) {
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editDept, setEditDept] = useState<DepartmentRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DepartmentRow | null>(null);

  const filtered = rows.filter((d) => {
    if (selectedCat !== "all" && d.summary_category !== selectedCat) return false;
    return d.name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>Departments Master</h2>
          <span className="sub">
            Shared by every project. Each department rolls into one category of the Project Budget Summary.
          </span>
        </div>
        {editable && (
          <AppButton size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-3.5 w-3.5 inline mr-1" />
            Add Department
          </AppButton>
        )}
      </div>

      <div className="master-kpi-strip">
        <div className="master-kpi-tile">
          <span className="kpi-label">Total Departments</span>
          <span className="kpi-val">{rows.length}</span>
          <span className="kpi-sub">Operating departments</span>
        </div>
        <div className="master-kpi-tile">
          <span className="kpi-label">Categories Covered</span>
          <span className="kpi-val">{categories.length}</span>
          <span className="kpi-sub">Summary categories</span>
        </div>
        <div className="master-kpi-tile">
          <span className="kpi-label">Total Cost Heads</span>
          <span className="kpi-val">{rows.reduce((s, d) => s + d.heads, 0)}</span>
          <span className="kpi-sub">Across all departments</span>
        </div>
      </div>

      <div className="list-toolbar">
        <div className="flex flex-wrap items-center gap-2">
          <div className="list-search-box">
            <Search className="h-4 w-4 text-muted" />
            <input
              type="text"
              className="list-search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search department..."
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

          <div className="flex items-center gap-1.5 text-xs text-muted">
            <Filter className="h-3.5 w-3.5" />
            <span>Category:</span>
            <select
              value={selectedCat}
              onChange={(e) => setSelectedCat(e.target.value)}
              className="px-2 py-1 text-xs rounded border border-border bg-surface text-ink"
            >
              <option value="all">All Categories ({categories.length})</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
        <span className="text-xs text-muted">Showing {filtered.length} of {rows.length}</span>
      </div>

      <div className="scroll">
        <table>
          <thead>
            <tr>
              <th className="n">Order</th>
              <th className="label">Department</th>
              <th>Summary Category</th>
              <th className="n">Cost Heads</th>
              {editable && <th className="actions-col">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => (
              <tr key={d.id}>
                <td className="n">{d.sort}</td>
                <td>
                  <strong>{d.name}</strong>
                </td>
                <td>
                  <span className="chip">{d.summary_category}</span>
                </td>
                <td className="n">{d.heads}</td>
                {editable && (
                  <td className="actions">
                    <div className="actions-group">
                      <button
                        type="button"
                        className="btn-action"
                        onClick={() => setEditDept(d)}
                      >
                        <Pencil className="h-3 w-3 inline mr-1" />
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn-action text-bad hover:bg-bad/10"
                        disabled={d.heads > 0}
                        title={d.heads > 0 ? "Cannot delete while used by cost heads" : "Delete department"}
                        onClick={() => setDeleteTarget(d)}
                      >
                        <Trash2 className="h-3 w-3 inline mr-1" />
                        Delete
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={editable ? 5 : 4} className="sub text-center py-6">
                  No departments found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {addOpen && (
        <DepartmentFormDialog
          categories={categories}
          nextSort={(rows[rows.length - 1]?.sort ?? 0) + 1}
          open={addOpen}
          onClose={() => setAddOpen(false)}
        />
      )}

      {editDept && (
        <DepartmentFormDialog
          department={editDept}
          categories={categories}
          nextSort={editDept.sort}
          open={!!editDept}
          onClose={() => setEditDept(null)}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmDialog
          title={`Delete Department: ${deleteTarget.name}`}
          message={`Are you sure you want to delete department "${deleteTarget.name}"? It currently has ${deleteTarget.heads} cost heads.`}
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => M.deleteDepartment(deleteTarget.id)}
        />
      )}
    </section>
  );
}

// Department Dialog
function DepartmentFormDialog({
  department,
  categories,
  nextSort,
  open,
  onClose,
}: {
  department?: DepartmentRow;
  categories: string[];
  nextSort: number;
  open: boolean;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const [name, setName] = useState(department?.name ?? "");
  const [category, setCategory] = useState(department?.summary_category ?? categories[0] ?? "");
  const [sort, setSort] = useState(department?.sort ?? nextSort);

  const handleSave = () => {
    if (!name.trim()) { setError("Department name is required."); return; }
    if (!category.trim()) { setError("Please choose a summary category."); return; }
    setError(null);

    startTransition(async () => {
      const res = await M.saveDepartment(department ? department.id : null, {
        name: name.trim(),
        summary_category: category.trim(),
        sort,
      });
      if (!res.ok) {
        setError(res.error);
      } else {
        onClose();
        router.refresh();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="budget-dialog max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <FolderTree className="h-5 w-5 text-primary" />
            {department ? `Edit Department · ${department.name}` : "Add New Department"}
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
            <label htmlFor="dept-name">Department Name *</label>
            <input
              id="dept-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Legal & Approvals, Site Logistics"
              autoFocus
            />
          </div>

          <div className="budget-modal-field">
            <label htmlFor="dept-cat">Summary Category *</label>
            <select
              id="dept-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="budget-modal-field">
            <label htmlFor="dept-sort">Sort Order</label>
            <input
              id="dept-sort"
              type="number"
              value={sort}
              onChange={(e) => setSort(Number(e.target.value))}
            />
          </div>
        </div>

        <DialogFooter className="mt-4 flex items-center justify-end gap-2">
          <AppButton variant="outline" size="sm" disabled={pending} onClick={onClose}>
            Cancel
          </AppButton>
          <AppButton size="sm" disabled={pending} onClick={handleSave}>
            {pending ? "Saving..." : department ? "Save Changes" : "Add Department"}
          </AppButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==========================================
// 5. COST HEADS MASTER
// ==========================================
function CostHeadsMaster({
  heads,
  projects,
  departments,
  summaryRows,
  gstRules,
  editable,
}: {
  heads: CostHeadRow[];
  projects: ProjectRow[];
  departments: DepartmentRow[];
  summaryRows: SummaryRow[];
  gstRules: GstRule[];
  editable: boolean;
}) {
  const [selectedProj, setSelectedProj] = useState<string>("all");
  const [selectedDept, setSelectedDept] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editHead, setEditHead] = useState<CostHeadRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CostHeadRow | null>(null);

  const filtered = heads.filter((h) => {
    if (selectedProj !== "all" && String(h.project_id) !== selectedProj) return false;
    if (selectedDept !== "all" && String(h.department_id) !== selectedDept) return false;
    const q = search.toLowerCase();
    return (
      h.category.toLowerCase().includes(q) ||
      (h.sub_category && h.sub_category.toLowerCase().includes(q)) ||
      (h.summary_subcategory && h.summary_subcategory.toLowerCase().includes(q))
    );
  });

  const taxCount = heads.filter((h) => h.is_tax).length;

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>Cost Heads Master</h2>
          <span className="sub">
            Master cost line items (category & sub-category) mapped to departments and summary report rows.
          </span>
        </div>
        {editable && (
          <AppButton size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-3.5 w-3.5 inline mr-1" />
            Add Cost Head
          </AppButton>
        )}
      </div>

      <div className="master-kpi-strip">
        <div className="master-kpi-tile">
          <span className="kpi-label">Total Cost Heads</span>
          <span className="kpi-val">{heads.length}</span>
          <span className="kpi-sub">Across all projects</span>
        </div>
        <div className="master-kpi-tile">
          <span className="kpi-label">Standard Base Heads</span>
          <span className="kpi-val">{heads.length - taxCount}</span>
          <span className="kpi-sub">Non-tax cost items</span>
        </div>
        <div className="master-kpi-tile">
          <span className="kpi-label">GST / Tax Heads</span>
          <span className="kpi-val">{taxCount}</span>
          <span className="kpi-sub">Calculated tax lines</span>
        </div>
      </div>

      <div className="list-toolbar">
        <div className="flex flex-wrap items-center gap-2">
          <div className="list-search-box">
            <Search className="h-4 w-4 text-muted" />
            <input
              type="text"
              className="list-search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search category or sub-category..."
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

          <div className="flex items-center gap-1.5 text-xs text-muted">
            <Filter className="h-3.5 w-3.5" />
            <span>Project:</span>
            <select
              value={selectedProj}
              onChange={(e) => setSelectedProj(e.target.value)}
              className="px-2 py-1 text-xs rounded border border-border bg-surface text-ink"
            >
              <option value="all">All Projects ({projects.length})</option>
              {projects.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted">
            <span>Dept:</span>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="px-2 py-1 text-xs rounded border border-border bg-surface text-ink"
            >
              <option value="all">All Departments ({departments.length})</option>
              {departments.map((d) => (
                <option key={d.id} value={String(d.id)}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <span className="text-xs text-muted">Showing {filtered.length} of {heads.length}</span>
      </div>

      <div className="scroll">
        <table>
          <thead>
            <tr>
              <th>Project</th>
              <th>Department</th>
              <th className="label">Category</th>
              <th>Sub-Category</th>
              <th>Summary Row Mapping</th>
              <th>Type / Tax</th>
              <th>Status</th>
              {editable && <th className="actions-col">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((h) => (
              <tr key={h.id}>
                <td>
                  <span className="chip">{h.project_name ?? `#${h.project_id}`}</span>
                </td>
                <td>{h.department_name ?? `#${h.department_id}`}</td>
                <td>
                  <strong>{h.category}</strong>
                </td>
                <td>{h.sub_category || <span className="sub">—</span>}</td>
                <td>
                  {h.summary_subcategory ? (
                    <span className="chip">{h.summary_subcategory}</span>
                  ) : (
                    <span className="sub">Default</span>
                  )}
                </td>
                <td>
                  {h.is_tax ? (
                    <span className="chip warn">
                      GST {h.tax_rate_pct}% × {h.tax_share_pct ?? 100}%
                    </span>
                  ) : (
                    <span className="chip">Base</span>
                  )}
                </td>
                <td>
                  {h.active ? (
                    <span className="chip good">Active</span>
                  ) : (
                    <span className="chip bad">Inactive</span>
                  )}
                </td>
                {editable && (
                  <td className="actions">
                    <div className="actions-group">
                      <button
                        type="button"
                        className="btn-action"
                        onClick={() => setEditHead(h)}
                      >
                        <Pencil className="h-3 w-3 inline mr-1" />
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn-action text-bad hover:bg-bad/10"
                        onClick={() => setDeleteTarget(h)}
                      >
                        <Trash2 className="h-3 w-3 inline mr-1" />
                        Delete
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={editable ? 8 : 7} className="sub text-center py-6">
                  No cost heads found for the chosen filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {addOpen && (
        <CostHeadFormDialog
          projects={projects}
          departments={departments}
          summaryRows={summaryRows}
          gstRules={gstRules}
          open={addOpen}
          onClose={() => setAddOpen(false)}
        />
      )}

      {editHead && (
        <CostHeadFormDialog
          head={editHead}
          projects={projects}
          departments={departments}
          summaryRows={summaryRows}
          gstRules={gstRules}
          open={!!editHead}
          onClose={() => setEditHead(null)}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmDialog
          title={`Delete Cost Head: ${deleteTarget.category}`}
          message={`Are you sure you want to delete cost head "${deleteTarget.category}"? If it carries figures or recorded bills, deletion will be rejected.`}
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => M.deleteCostHeadMaster(deleteTarget.id)}
        />
      )}
    </section>
  );
}

// Cost Head Dialog
function CostHeadFormDialog({
  head,
  projects,
  departments,
  summaryRows,
  gstRules,
  open,
  onClose,
}: {
  head?: CostHeadRow;
  projects: ProjectRow[];
  departments: DepartmentRow[];
  summaryRows: SummaryRow[];
  gstRules: GstRule[];
  open: boolean;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const [projectId, setProjectId] = useState<number>(head?.project_id ?? projects[0]?.id ?? 1);
  const [deptId, setDeptId] = useState<number>(head?.department_id ?? departments[0]?.id ?? 1);
  const [category, setCategory] = useState(head?.category ?? "");
  const [subCategory, setSubCategory] = useState(head?.sub_category ?? "");
  const [summarySub, setSummarySub] = useState(head?.summary_subcategory ?? "");
  const [isTax, setIsTax] = useState(head?.is_tax ?? false);
  const [taxRate, setTaxRate] = useState(head?.tax_rate_pct != null ? String(head.tax_rate_pct) : "18");
  const [taxShare, setTaxShare] = useState(head?.tax_share_pct != null ? String(head.tax_share_pct) : "100");
  const [active, setActive] = useState(head?.active ?? true);

  const selectedDept = departments.find((d) => d.id === deptId);
  const availableSubcategories = summaryRows
    .filter((r) => !selectedDept || r.category === selectedDept.summary_category)
    .map((r) => r.subcategory);

  const handleSave = () => {
    if (!category.trim()) { setError("Category name is required."); return; }
    if (!projectId) { setError("Choose a project."); return; }
    if (!deptId) { setError("Choose a department."); return; }
    setError(null);

    startTransition(async () => {
      const res = await M.saveCostHeadMaster(head ? head.id : null, {
        project_id: projectId,
        department_id: deptId,
        category: category.trim(),
        sub_category: subCategory.trim() || null,
        summary_subcategory: summarySub.trim() || null,
        is_tax: isTax,
        tax_rate_pct: isTax ? Number(taxRate) : null,
        tax_share_pct: isTax ? Number(taxShare) : null,
        active,
      });
      if (!res.ok) {
        setError(res.error);
      } else {
        onClose();
        router.refresh();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="budget-dialog max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <Layers className="h-5 w-5 text-primary" />
            {head ? `Edit Cost Head · ${head.category}` : "Add New Cost Head"}
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
            <label htmlFor="chm-proj">Project *</label>
            <select
              id="chm-proj"
              value={projectId}
              onChange={(e) => setProjectId(Number(e.target.value))}
              disabled={!!head}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="budget-modal-field">
            <label htmlFor="chm-dept">Department *</label>
            <select
              id="chm-dept"
              value={deptId}
              onChange={(e) => setDeptId(Number(e.target.value))}
              disabled={!!head}
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="budget-modal-field">
            <label htmlFor="chm-cat">Category *</label>
            <input
              id="chm-cat"
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Civil Contractor, Elevators"
              autoFocus
            />
          </div>

          <div className="budget-modal-field">
            <label htmlFor="chm-subcat">Sub-Category</label>
            <input
              id="chm-subcat"
              type="text"
              value={subCategory}
              onChange={(e) => setSubCategory(e.target.value)}
              placeholder="e.g. Labor & Materials"
            />
          </div>

          <div className="budget-modal-field sm:col-span-2">
            <label htmlFor="chm-summary">Summary Row Mapping</label>
            <select
              id="chm-summary"
              value={summarySub}
              onChange={(e) => setSummarySub(e.target.value)}
            >
              <option value="">Mapped to Department default</option>
              {availableSubcategories.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>

          <div className="budget-modal-field sm:col-span-2 flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="chm-tax"
              checked={isTax}
              onChange={(e) => setIsTax(e.target.checked)}
            />
            <label htmlFor="chm-tax" className="font-medium cursor-pointer">
              This is a GST / Tax calculation head
            </label>
          </div>

          {isTax && (
            <>
              <div className="budget-modal-field">
                <label htmlFor="chm-tax-rule">Select GST Rule</label>
                <select
                  id="chm-tax-rule"
                  onChange={(e) => {
                    const rule = gstRules.find((r) => String(r.id) === e.target.value);
                    if (rule) {
                      setTaxRate(String(rule.rate_pct));
                      setTaxShare(String(rule.share_pct));
                    }
                  }}
                >
                  <option value="">Choose preset GST rule...</option>
                  {gstRules.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.rate_pct}% x {r.share_pct}%)
                    </option>
                  ))}
                </select>
              </div>

              <div className="budget-modal-field flex items-center gap-2">
                <div>
                  <label htmlFor="chm-rate">Rate %</label>
                  <input
                    id="chm-rate"
                    type="number"
                    min="0"
                    step="0.1"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="chm-share">Share %</label>
                  <input
                    id="chm-share"
                    type="number"
                    min="0"
                    max="100"
                    value={taxShare}
                    onChange={(e) => setTaxShare(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          <div className="budget-modal-field sm:col-span-2 flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="chm-active"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            <label htmlFor="chm-active" className="cursor-pointer">
              Active in budget entries
            </label>
          </div>
        </div>

        <DialogFooter className="mt-4 flex items-center justify-end gap-2">
          <AppButton variant="outline" size="sm" disabled={pending} onClick={onClose}>
            Cancel
          </AppButton>
          <AppButton size="sm" disabled={pending} onClick={handleSave}>
            {pending ? "Saving..." : head ? "Save Changes" : "Add Cost Head"}
          </AppButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==========================================
// 6. SUMMARY ROWS MASTER
// ==========================================
function SummaryRowsMaster({
  rows,
  categories,
  editable,
}: {
  rows: SummaryRow[];
  categories: [string, number][];
  editable: boolean;
}) {
  const { pending, run, banner, setNotice } = useAction();
  const [confirm, setConfirm] = useState<string | null>(null);
  const LOCKED = "Construction";

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>Project Budget Summary Categories & Rows</h2>
          <span className="sub">
            Category and sub-category rows of the Project Budget Summary in corporate presentation order.
          </span>
        </div>
      </div>
      {banner}

      <div className="space-y-4 mt-3">
        {categories.map(([cat, cs]) => {
          const list = rows
            .filter((r) => r.category === cat)
            .sort((a, b) => a.subcategory_sort - b.subcategory_sort);
          const locked = cat === LOCKED || !editable;

          return (
            <div key={`${cat}-${cs}`} className="border border-border rounded-lg bg-surface p-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <span className="chip font-bold">{cs}</span>
                  <h3 className="font-semibold text-base">{cat}</h3>
                  <span className="text-xs text-muted">({list.length} rows)</span>
                  {locked && <span className="chip warn">Locked</span>}
                </div>
              </div>

              <div className="scroll mt-3">
                <table>
                  <thead>
                    <tr>
                      <th className="n w-16">Order</th>
                      <th className="label">Sub-Category Row</th>
                      {!locked && <th className="actions-col">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((r) => {
                      const k = `${r.category}|${r.subcategory}`;
                      return (
                        <tr key={k}>
                          <td className="n">{r.subcategory_sort}</td>
                          <td>
                            <strong>{r.subcategory}</strong>
                          </td>
                          {!locked && (
                            <td className="actions">
                              <button
                                type="button"
                                className="btn-action text-bad hover:bg-bad/10"
                                disabled={pending}
                                onClick={() => {
                                  if (confirm !== k) return setConfirm(k);
                                  run(
                                    () => M.deleteSummaryRow(r.category, r.subcategory),
                                    () => setConfirm(null)
                                  );
                                }}
                              >
                                <Trash2 className="h-3 w-3 inline mr-1" />
                                {confirm === k ? "Confirm Delete" : "Delete"}
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ==========================================
// 7. GST RULES MASTER
// ==========================================
function GstRulesMaster({
  rows,
  editable,
}: {
  rows: GstRule[];
  editable: boolean;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [editRule, setEditRule] = useState<GstRule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GstRule | null>(null);

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>GST & Tax Rules Master</h2>
          <span className="sub">
            Preset GST rules (rate % × eligible share %) applied to tax cost heads across project budgets.
          </span>
        </div>
        {editable && (
          <AppButton size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-3.5 w-3.5 inline mr-1" />
            Add GST Rule
          </AppButton>
        )}
      </div>

      <div className="master-kpi-strip">
        <div className="master-kpi-tile">
          <span className="kpi-label">Active Rules</span>
          <span className="kpi-val">{rows.filter((r) => r.active).length}</span>
          <span className="kpi-sub">Available for cost heads</span>
        </div>
        <div className="master-kpi-tile">
          <span className="kpi-label">Standard Rate</span>
          <span className="kpi-val">18%</span>
          <span className="kpi-sub">Default GST rate</span>
        </div>
        <div className="master-kpi-tile">
          <span className="kpi-label">Total Rules</span>
          <span className="kpi-val">{rows.length}</span>
          <span className="kpi-sub">All rules</span>
        </div>
      </div>

      <div className="scroll">
        <table>
          <thead>
            <tr>
              <th className="n">Order</th>
              <th className="label">Rule Name</th>
              <th className="n">Rate %</th>
              <th className="n">Eligible Share %</th>
              <th className="n">Effective Tax %</th>
              <th>Status</th>
              {editable && <th className="actions-col">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const effective = (r.rate_pct * r.share_pct) / 100;
              return (
                <tr key={r.id}>
                  <td className="n">{r.sort}</td>
                  <td>
                    <strong>{r.name}</strong>
                  </td>
                  <td className="n">{r.rate_pct}%</td>
                  <td className="n">{r.share_pct}%</td>
                  <td className="n">
                    <strong>{effective.toFixed(2)}%</strong>
                  </td>
                  <td>
                    {r.active ? (
                      <span className="chip good">Active</span>
                    ) : (
                      <span className="chip bad">Inactive</span>
                    )}
                  </td>
                  {editable && (
                    <td className="actions">
                      <div className="actions-group">
                        <button
                          type="button"
                          className="btn-action"
                          onClick={() => setEditRule(r)}
                        >
                          <Pencil className="h-3 w-3 inline mr-1" />
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn-action text-bad hover:bg-bad/10"
                          onClick={() => setDeleteTarget(r)}
                        >
                          <Trash2 className="h-3 w-3 inline mr-1" />
                          Delete
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {addOpen && (
        <GstRuleFormDialog
          nextSort={(rows[rows.length - 1]?.sort ?? 0) + 1}
          open={addOpen}
          onClose={() => setAddOpen(false)}
        />
      )}

      {editRule && (
        <GstRuleFormDialog
          rule={editRule}
          nextSort={editRule.sort}
          open={!!editRule}
          onClose={() => setEditRule(null)}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmDialog
          title={`Delete GST Rule: ${deleteTarget.name}`}
          message={`Are you sure you want to delete rule "${deleteTarget.name}"?`}
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => M.deleteGstRule(deleteTarget.id)}
        />
      )}
    </section>
  );
}

// GST Rule Dialog
function GstRuleFormDialog({
  rule,
  nextSort,
  open,
  onClose,
}: {
  rule?: GstRule;
  nextSort: number;
  open: boolean;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const [name, setName] = useState(rule?.name ?? "");
  const [rate, setRate] = useState(rule?.rate_pct != null ? String(rule.rate_pct) : "18");
  const [share, setShare] = useState(rule?.share_pct != null ? String(rule.share_pct) : "100");
  const [sort, setSort] = useState(rule?.sort ?? nextSort);
  const [active, setActive] = useState(rule?.active ?? true);

  const handleSave = () => {
    if (!name.trim()) { setError("Rule name is required."); return; }
    setError(null);

    startTransition(async () => {
      const res = await M.saveGstRule(rule ? rule.id : null, {
        name: name.trim(),
        rate: rate.trim(),
        share: share.trim(),
        sort,
        active,
      });
      if (!res.ok) {
        setError(res.error);
      } else {
        onClose();
        router.refresh();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="budget-dialog max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <Percent className="h-5 w-5 text-primary" />
            {rule ? `Edit GST Rule · ${rule.name}` : "Add GST Rule"}
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
            <label htmlFor="gr-name">Rule Name *</label>
            <input
              id="gr-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. GST 18% x 74.08%"
              autoFocus
            />
          </div>

          <div className="budget-modal-field">
            <label htmlFor="gr-rate">GST Rate (%) *</label>
            <input
              id="gr-rate"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
            />
          </div>

          <div className="budget-modal-field">
            <label htmlFor="gr-share">Eligible Share (%) *</label>
            <input
              id="gr-share"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={share}
              onChange={(e) => setShare(e.target.value)}
            />
          </div>

          <div className="budget-modal-field">
            <label htmlFor="gr-sort">Sort Order</label>
            <input
              id="gr-sort"
              type="number"
              value={sort}
              onChange={(e) => setSort(Number(e.target.value))}
            />
          </div>

          <div className="budget-modal-field flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              id="gr-active"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            <label htmlFor="gr-active" className="cursor-pointer">
              Active rule
            </label>
          </div>
        </div>

        <DialogFooter className="mt-4 flex items-center justify-end gap-2">
          <AppButton variant="outline" size="sm" disabled={pending} onClick={onClose}>
            Cancel
          </AppButton>
          <AppButton size="sm" disabled={pending} onClick={handleSave}>
            {pending ? "Saving..." : rule ? "Save Changes" : "Add GST Rule"}
          </AppButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==========================================
// 8. VENDORS MASTER
// ==========================================
function VendorsMaster({
  vendors,
  editable,
}: {
  vendors: VendorRow[];
  editable: boolean;
}) {
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editVendor, setEditVendor] = useState<VendorRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VendorRow | null>(null);

  const filtered = vendors.filter((v) => {
    const q = search.toLowerCase();
    return (
      v.name.toLowerCase().includes(q) ||
      (v.contact_email && v.contact_email.toLowerCase().includes(q)) ||
      (v.phone && v.phone.toLowerCase().includes(q)) ||
      (v.notes && v.notes.toLowerCase().includes(q))
    );
  });

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>Vendors Master</h2>
          <span className="sub">
            Approved vendor directory used for recording and tracking contractor and supplier bills.
          </span>
        </div>
        {editable && (
          <AppButton size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-3.5 w-3.5 inline mr-1" />
            Add Vendor
          </AppButton>
        )}
      </div>

      <div className="master-kpi-strip">
        <div className="master-kpi-tile">
          <span className="kpi-label">Registered Vendors</span>
          <span className="kpi-val">{vendors.length}</span>
          <span className="kpi-sub">Total active directory</span>
        </div>
        <div className="master-kpi-tile">
          <span className="kpi-label">With Email Contact</span>
          <span className="kpi-val">{vendors.filter((v) => v.contact_email).length}</span>
          <span className="kpi-sub">Direct communications</span>
        </div>
        <div className="master-kpi-tile">
          <span className="kpi-label">With Phone</span>
          <span className="kpi-val">{vendors.filter((v) => v.phone).length}</span>
          <span className="kpi-sub">Phone numbers on file</span>
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
            placeholder="Search vendor by name, email, phone..."
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
        <span className="text-xs text-muted">Showing {filtered.length} of {vendors.length}</span>
      </div>

      <div className="scroll">
        <table>
          <thead>
            <tr>
              <th className="label">Vendor Name</th>
              <th>Contact Email</th>
              <th>Phone</th>
              <th>Website</th>
              <th>Notes</th>
              {editable && <th className="actions-col">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((v) => (
              <tr key={v.id}>
                <td>
                  <strong>{v.name}</strong>
                </td>
                <td>{v.contact_email ?? <span className="sub">—</span>}</td>
                <td>{v.phone ?? <span className="sub">—</span>}</td>
                <td>
                  {v.website ? (
                    <a
                      href={v.website.startsWith("http") ? v.website : `https://${v.website}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline text-xs flex items-center gap-1"
                    >
                      {v.website}
                      <ExternalLink className="h-3 w-3 inline" />
                    </a>
                  ) : (
                    <span className="sub">—</span>
                  )}
                </td>
                <td className="text-xs text-muted">{v.notes ?? "—"}</td>
                {editable && (
                  <td className="actions">
                    <div className="actions-group">
                      <button
                        type="button"
                        className="btn-action"
                        onClick={() => setEditVendor(v)}
                      >
                        <Pencil className="h-3 w-3 inline mr-1" />
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn-action text-bad hover:bg-bad/10"
                        onClick={() => setDeleteTarget(v)}
                      >
                        <Trash2 className="h-3 w-3 inline mr-1" />
                        Delete
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={editable ? 6 : 5} className="sub text-center py-6">
                  No vendors matching &quot;{search}&quot;.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {addOpen && (
        <VendorFormDialog
          open={addOpen}
          onClose={() => setAddOpen(false)}
        />
      )}

      {editVendor && (
        <VendorFormDialog
          vendor={editVendor}
          open={!!editVendor}
          onClose={() => setEditVendor(null)}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmDialog
          title={`Delete Vendor: ${deleteTarget.name}`}
          message={`Are you sure you want to delete vendor "${deleteTarget.name}"? Deletion will be rejected if any budget bills reference this vendor.`}
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => M.deleteVendorMaster(deleteTarget.id)}
        />
      )}
    </section>
  );
}

// Vendor Dialog
function VendorFormDialog({
  vendor,
  open,
  onClose,
}: {
  vendor?: VendorRow;
  open: boolean;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const [name, setName] = useState(vendor?.name ?? "");
  const [email, setEmail] = useState(vendor?.contact_email ?? "");
  const [phone, setPhone] = useState(vendor?.phone ?? "");
  const [website, setWebsite] = useState(vendor?.website ?? "");
  const [notes, setNotes] = useState(vendor?.notes ?? "");

  const handleSave = () => {
    if (!name.trim()) { setError("Vendor name is required."); return; }
    setError(null);

    startTransition(async () => {
      const res = await M.saveVendorMaster(vendor ? vendor.id : null, {
        name: name.trim(),
        contact_email: email.trim() || null,
        phone: phone.trim() || null,
        website: website.trim() || null,
        notes: notes.trim() || null,
      });
      if (!res.ok) {
        setError(res.error);
      } else {
        onClose();
        router.refresh();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="budget-dialog max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <Users className="h-5 w-5 text-primary" />
            {vendor ? `Edit Vendor · ${vendor.name}` : "Add New Vendor"}
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
            <label htmlFor="vm-name">Vendor Name *</label>
            <input
              id="vm-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Shapoorji Pallonji, OTIS Elevators"
              autoFocus
            />
          </div>

          <div className="budget-modal-field">
            <label htmlFor="vm-email">Contact Email</label>
            <input
              id="vm-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="billing@vendor.com"
            />
          </div>

          <div className="budget-modal-field">
            <label htmlFor="vm-phone">Phone Number</label>
            <input
              id="vm-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
            />
          </div>

          <div className="budget-modal-field sm:col-span-2">
            <label htmlFor="vm-web">Website</label>
            <input
              id="vm-web"
              type="text"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://vendor.com"
            />
          </div>

          <div className="budget-modal-field sm:col-span-2">
            <label htmlFor="vm-notes">Notes / Specialization</label>
            <input
              id="vm-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Structural steel contractor, MEP vendor"
            />
          </div>
        </div>

        <DialogFooter className="mt-4 flex items-center justify-end gap-2">
          <AppButton variant="outline" size="sm" disabled={pending} onClick={onClose}>
            Cancel
          </AppButton>
          <AppButton size="sm" disabled={pending} onClick={handleSave}>
            {pending ? "Saving..." : vendor ? "Save Changes" : "Add Vendor"}
          </AppButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==========================================
// SHARED DELETE CONFIRMATION DIALOG
// ==========================================
function DeleteConfirmDialog({
  title,
  message,
  open,
  onClose,
  onConfirm,
}: {
  title: string;
  message: string;
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<M.Result>;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleConfirm = () => {
    setError(null);
    startTransition(async () => {
      const res = await onConfirm();
      if (!res.ok) {
        setError(res.error);
      } else {
        onClose();
        router.refresh();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="budget-dialog max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold text-bad">
            <Trash2 className="h-5 w-5 text-bad" />
            {title}
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="banner error text-sm p-3 rounded" role="alert">
            <AlertCircle className="h-4 w-4 inline mr-1 text-bad" />
            {error}
          </div>
        )}

        <p className="text-sm text-foreground my-2">{message}</p>

        <DialogFooter className="mt-4 flex items-center justify-end gap-2">
          <AppButton variant="outline" size="sm" disabled={pending} onClick={onClose}>
            Cancel
          </AppButton>
          <AppButton
            variant="destructive"
            size="sm"
            disabled={pending}
            onClick={handleConfirm}
          >
            {pending ? "Deleting..." : "Confirm Delete"}
          </AppButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

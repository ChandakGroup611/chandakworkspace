"use client";

import { Fragment, useMemo, useState } from "react";
import {
  Crown,
  ShieldCheck,
  Check,
  X,
  Trash2,
  Edit3,
  Plus,
  Users,
  Lock,
  Info,
  SlidersHorizontal,
  FolderKanban,
  GitBranch,
  FileSpreadsheet,
  Receipt,
  BarChart3,
  Settings,
  Key,
  RefreshCw,
  Eye,
  AlertTriangle,
} from "lucide-react";
import * as A from "@/lib/budget/actions";
import type { CustomField, Entity, RoleRow } from "@/lib/budget/data";
import {
  BUILTINS,
  Dec,
  ENTITIES,
  FIELD_TYPES,
  FUNCTIONS,
  RESULT_TYPES,
  calculate,
  checkFormula,
  display,
  parse,
  refsOf,
  type FieldDef,
  type Value,
} from "@/lib/budget/formula";
import { useAction } from "./forms";

// Settings of the budget module: who may do what (roles, rights, members from Chandak Workspace) and
// the custom fields of each form. The database enforces both; these screens edit them.

// ---------- access ----------
interface Member {
  user_id: string;
  name: string;
  email: string | null;
  role_id: number;
  project_ids: number[] | null;
  department_ids: number[] | null;
  active: boolean;
}
type Opt = { id: number; name: string };

export interface ResourceDefinition {
  key: string;
  name: string;
  area: string;
  description: string;
  viewCode: string;
  createCode: string;
  updateCode: string;
  deleteCode: string;
}

export const BUDGET_CRUD_RESOURCES: ResourceDefinition[] = [
  {
    key: "projects",
    name: "Projects & Structure Setup",
    area: "Projects",
    description: "Project master details, towers, carpet areas, cost heads, and GST configuration",
    viewCode: "project.view",
    createCode: "project.create",
    updateCode: "project.setup",
    deleteCode: "project.delete",
  },
  {
    key: "versions",
    name: "Budget Versions & Baselines",
    area: "Versions",
    description: "Opening new quarterly/annual budget versions, revisions, approvals, and overrides",
    viewCode: "version.view",
    createCode: "version.open",
    updateCode: "version.approve",
    deleteCode: "version.override",
  },
  {
    key: "budget",
    name: "Budget Figures & Worksheets",
    area: "Budget",
    description: "Typing budget estimates, rates, CTC formulas, remarks, and Excel detail workbooks",
    viewCode: "budget.view",
    createCode: "budget.edit",
    updateCode: "budget.import",
    deleteCode: "budget.delete",
  },
  {
    key: "cost",
    name: "Cost Incurred & Actuals",
    area: "Cost",
    description: "Recording cost vouchers, importing cost actuals, and expenditure audit lines",
    viewCode: "cost.view",
    createCode: "cost.enter",
    updateCode: "cost.import",
    deleteCode: "cost.delete",
  },
  {
    key: "reports",
    name: "Reports, Analytics & Audit",
    area: "Reports",
    description: "Summary and detail reports, variance tracking, Excel exports, and change audit trail",
    viewCode: "report.view",
    createCode: "report.export",
    updateCode: "audit.view",
    deleteCode: "audit.delete",
  },
  {
    key: "fields",
    name: "Custom Fields & Forms",
    area: "Settings",
    description: "Custom formulas, form schema extensions, and project-specific inputs",
    viewCode: "fields.view",
    createCode: "fields.manage",
    updateCode: "fields.manage",
    deleteCode: "fields.delete",
  },
  {
    key: "access",
    name: "Access, Roles & Governance",
    area: "Settings",
    description: "Member directory, role management, and granular permission matrix",
    viewCode: "access.view",
    createCode: "access.manage",
    updateCode: "access.manage",
    deleteCode: "access.delete",
  },
];

const RESOURCE_ICONS: Record<string, any> = {
  projects: FolderKanban,
  versions: GitBranch,
  budget: FileSpreadsheet,
  cost: Receipt,
  reports: BarChart3,
  fields: SlidersHorizontal,
  access: ShieldCheck,
};

function MultiPick({
  label,
  all,
  chosen,
  onChange,
  disabled,
}: {
  label: string;
  all: Opt[];
  chosen: number[] | null;
  onChange: (v: number[] | null) => void;
  disabled?: boolean;
}) {
  const set = new Set(chosen ?? []);
  const text =
    chosen == null
      ? `All ${label}`
      : chosen.length
      ? all
          .filter((o) => set.has(o.id))
          .map((o) => o.name)
          .join(", ")
      : `No ${label}`;
  return (
    <details className="multi">
      <summary aria-label={label} title={text}>
        {text}
      </summary>
      <label>
        <input
          type="checkbox"
          checked={chosen == null}
          disabled={disabled}
          onChange={(e) => onChange(e.currentTarget.checked ? null : [])}
        />{" "}
        All {label}
      </label>
      {chosen != null &&
        all.map((o) => (
          <label key={o.id}>
            <input
              type="checkbox"
              checked={set.has(o.id)}
              disabled={disabled}
              onChange={(e) => {
                const next = new Set(set);
                if (e.currentTarget.checked) next.add(o.id);
                else next.delete(o.id);
                onChange(all.filter((x) => next.has(x.id)).map((x) => x.id));
              }}
            />{" "}
            {o.name}
          </label>
        ))}
    </details>
  );
}

function MemberRow({
  m,
  roles,
  projects,
  departments,
  me,
}: {
  m: Member;
  roles: RoleRow[];
  projects: Opt[];
  departments: Opt[];
  me: string;
}) {
  const { pending, run, banner, setNotice } = useAction();
  const [row, setRow] = useState(m);
  const changed = JSON.stringify(row) !== JSON.stringify(m);
  return (
    <tr className={row.active ? "" : "muted"}>
      <td>
        <span className="font-semibold text-heading">{m.name}</span>
        {m.user_id === me && <span className="chip">you</span>}
        <div className="note font-mono text-[11px] text-muted">{m.email}</div>
        {banner}
      </td>
      <td>
        <select
          aria-label="Role"
          value={row.role_id}
          onChange={(e) => setRow({ ...row, role_id: Number(e.currentTarget.value) })}
        >
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </td>
      <td>
        <MultiPick
          label="projects"
          all={projects}
          chosen={row.project_ids}
          onChange={(v) => setRow({ ...row, project_ids: v })}
        />
      </td>
      <td>
        <MultiPick
          label="departments"
          all={departments}
          chosen={row.department_ids}
          onChange={(v) => setRow({ ...row, department_ids: v })}
        />
      </td>
      <td>
        <input
          type="checkbox"
          aria-label="Active"
          checked={row.active}
          onChange={(e) => setRow({ ...row, active: e.currentTarget.checked })}
        />
      </td>
      <td className="actions nowrap">
        <div className="actions-group">
          <button
            className="btn-action primary"
            disabled={!changed || pending}
            onClick={() => run(() => A.saveMember(row, false), () => setNotice("Saved"))}
          >
            Save
          </button>
          <button
            className="btn-action danger"
            disabled={pending}
            onClick={() => {
              if (confirm(`Remove ${m.name} from the budget module?`)) {
                run(() => A.removeMember(m.user_id));
              }
            }}
          >
            Remove
          </button>
        </div>
      </td>
    </tr>
  );
}

export function AccessSettings({
  permissions,
  roles,
  members,
  directory,
  projects,
  departments,
  me,
  isSuperAdmin = false,
}: {
  permissions: { code: string; area: string; label: string }[];
  roles: RoleRow[];
  members: Member[];
  directory: { user_id: string; email: string | null; full_name: string | null; member: boolean }[];
  projects: Opt[];
  departments: Opt[];
  me: string;
  isSuperAdmin?: boolean;
}) {
  const { pending, run, banner, setNotice } = useAction();
  const [search, setSearch] = useState("");
  const candidates = directory.filter(
    (u) =>
      !u.member &&
      (!search || `${u.full_name} ${u.email}`.toLowerCase().includes(search.toLowerCase()))
  );

  // Selected role for focused CRUD matrix
  const [selectedRoleId, setSelectedRoleId] = useState<number>(roles[0]?.id || 1);
  const activeRole = roles.find((r) => r.id === selectedRoleId) || roles[0];

  // Matrix View Mode: "crud" = Role-by-Role Granular CRUD, "comparison" = All Roles Side-by-Side
  const [matrixView, setMatrixView] = useState<"crud" | "comparison">("crud");

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [newRolePerms, setNewRolePerms] = useState<Set<string>>(new Set(["project.view", "version.view", "budget.view", "cost.view", "report.view"]));

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editRoleName, setEditRoleName] = useState("");
  const [editRoleDesc, setEditRoleDesc] = useState("");

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingRole, setDeletingRole] = useState<RoleRow | null>(null);

  // Quick template for new role
  const applyPreset = (preset: "full" | "approver" | "preparer" | "viewer" | "custom") => {
    const s = new Set<string>();
    if (preset === "full") {
      BUDGET_CRUD_RESOURCES.forEach((r) => {
        s.add(r.viewCode);
        s.add(r.createCode);
        s.add(r.updateCode);
        s.add(r.deleteCode);
      });
    } else if (preset === "approver") {
      BUDGET_CRUD_RESOURCES.forEach((r) => s.add(r.viewCode));
      s.add("version.approve");
      s.add("version.override");
      s.add("report.export");
    } else if (preset === "preparer") {
      BUDGET_CRUD_RESOURCES.forEach((r) => s.add(r.viewCode));
      s.add("version.open");
      s.add("budget.edit");
      s.add("budget.import");
      s.add("cost.enter");
      s.add("cost.import");
      s.add("report.export");
    } else if (preset === "viewer") {
      BUDGET_CRUD_RESOURCES.forEach((r) => s.add(r.viewCode));
      s.add("report.export");
    }
    setNewRolePerms(s);
  };

  const handleOpenEdit = (role: RoleRow) => {
    setEditRoleName(role.name);
    setEditRoleDesc(role.description || "");
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editRoleName.trim() || !activeRole) return;
    run(
      () => A.saveRole(activeRole.id, editRoleName.trim(), editRoleDesc.trim()),
      () => {
        setIsEditModalOpen(false);
        setNotice("Role details updated.");
      }
    );
  };

  const handleOpenDelete = (role: RoleRow) => {
    setDeletingRole(role);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!deletingRole) return;
    run(
      () => A.deleteRole(deletingRole.id),
      () => {
        setIsDeleteModalOpen(false);
        setDeletingRole(null);
        setSelectedRoleId(roles[0]?.id || 1);
        setNotice("Role deleted.");
      }
    );
  };

  const handleCreateRole = () => {
    if (!newRoleName.trim()) return;
    run(
      () => A.saveRole(null, newRoleName.trim(), newRoleDesc.trim(), Array.from(newRolePerms)),
      () => {
        setIsCreateModalOpen(false);
        setNewRoleName("");
        setNewRoleDesc("");
        setNotice("New role created with configured CRUD permissions.");
      }
    );
  };

  // Toggle permission for active role
  const handleTogglePerm = (code: string) => {
    if (!activeRole || activeRole.is_system) return;
    const hasPerm = activeRole.permissions.includes(code);
    run(
      () => A.setRolePermission(activeRole.id, code, !hasPerm),
      () => setNotice(`Permission ${hasPerm ? "revoked" : "granted"}.`)
    );
  };

  // Grant or revoke all for a specific resource
  const handleToggleResourceAll = (res: ResourceDefinition) => {
    if (!activeRole || activeRole.is_system) return;
    const codes = [res.viewCode, res.createCode, res.updateCode, res.deleteCode];
    const allActive = codes.every((c) => activeRole.permissions.includes(c));
    const nextPerms = new Set(activeRole.permissions);
    if (allActive) {
      codes.forEach((c) => nextPerms.delete(c));
    } else {
      codes.forEach((c) => nextPerms.add(c));
    }
    run(
      () => A.batchSetRolePermissions(activeRole.id, Array.from(nextPerms)),
      () => setNotice(`Updated ${res.name} permissions.`)
    );
  };

  // Grant all CRUD to active role
  const handleGrantAllToRole = () => {
    if (!activeRole || activeRole.is_system) return;
    const allCodes = BUDGET_CRUD_RESOURCES.flatMap((r) => [
      r.viewCode,
      r.createCode,
      r.updateCode,
      r.deleteCode,
    ]);
    run(
      () => A.batchSetRolePermissions(activeRole.id, Array.from(new Set(allCodes))),
      () => setNotice(`All CRUD rights granted to ${activeRole.name}.`)
    );
  };

  // Revoke all from active role
  const handleRevokeAllFromRole = () => {
    if (!activeRole || activeRole.is_system) return;
    run(
      () => A.batchSetRolePermissions(activeRole.id, []),
      () => setNotice(`All rights revoked from ${activeRole.name}.`)
    );
  };

  return (
    <>
      {banner}

      {/* SUPER ADMIN MASTER AUTHORITY BANNER */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 dark:border-amber-400/30 dark:bg-amber-400/10 mb-4 transition-all">
        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0 self-start">
            <Crown className="h-5 w-5" />
          </div>
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-heading">Super Administrator Master Authority</h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/25 text-amber-800 dark:text-amber-200 font-bold uppercase tracking-wider">
                Unrestricted Bypass Active
              </span>
              {isSuperAdmin && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold">
                  You are signed in as Super Admin
                </span>
              )}
            </div>
            <p className="text-[12.5px] text-muted leading-relaxed">
              Super Admins (<code>SUPER_ADMIN</code> / <code>ROLE_SUPER_ADMIN</code>) have universal, unrestricted operational authority across all activities (<strong>View</strong>, <strong>Create</strong>, <strong>Update</strong>, <strong>Delete</strong>) across all projects, versions, budget line items, cost actuals, reports, and IAM configurations. Super Admin authority automatically bypasses all role constraints and department/project limits.
            </p>
          </div>
        </div>
      </div>

      {/* MEMBERS SECTION */}
      <section className="panel">
        <div className="panel-head">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <h2>Budget Members</h2>
          </div>
          <span className="sub">Assign Chandak Workspace users to roles and department / project scopes</span>
        </div>
        <div className="scroll">
          <table>
            <thead>
              <tr>
                <th>Person</th>
                <th>Role</th>
                <th>Projects</th>
                <th>Departments</th>
                <th>Active</th>
                <th className="actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <MemberRow
                  key={`${m.user_id}-${m.role_id}-${m.active}-${m.project_ids}-${m.department_ids}`}
                  m={m}
                  roles={roles}
                  projects={projects}
                  departments={departments}
                  me={me}
                />
              ))}
            </tbody>
          </table>
        </div>

        <div className="pt-2 border-t border-line">
          <h3 className="text-sm font-semibold text-heading mb-2">Add a Chandak Workspace user</h3>
          <div className="row">
            <label style={{ minWidth: 200 }}>
              Search
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.currentTarget.value)}
                placeholder="Name or email"
              />
            </label>
            <label style={{ flex: 1, minWidth: 240 }}>
              User
              <select id="nm-user">
                {candidates.map((u) => (
                  <option key={u.user_id} value={u.user_id}>
                    {u.full_name} · {u.email}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Role
              <select id="nm-role">
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="primary"
              disabled={pending || !candidates.length}
              onClick={() => {
                const user = (document.getElementById("nm-user") as HTMLSelectElement).value;
                const role = Number((document.getElementById("nm-role") as HTMLSelectElement).value);
                run(
                  () =>
                    A.saveMember(
                      { user_id: user, role_id: role, project_ids: null, department_ids: null, active: true },
                      true
                    ),
                  () => setNotice("User added as budget member.")
                );
              }}
            >
              Add member
            </button>
          </div>
          {!candidates.length && <p className="note">All matching workspace users are already budget members.</p>}
        </div>
      </section>

      {/* ROLES AND RIGHTS CRUD MATRIX SECTION */}
      <section className="panel">
        <div className="panel-head">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <h2>Roles and Rights (CRUD Capability Matrix)</h2>
            </div>
            <span className="sub">
              Action permissions are structured by View, Create, Update, and Delete capabilities across each functional domain.
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle */}
            <div className="inline-flex rounded-lg border border-line bg-row-sub p-0.5 text-[12px]">
              <button
                type="button"
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  matrixView === "crud"
                    ? "bg-surface text-foreground shadow-xs font-semibold"
                    : "text-muted hover:text-foreground"
                }`}
                onClick={() => setMatrixView("crud")}
              >
                CRUD Matrix by Role
              </button>
              <button
                type="button"
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  matrixView === "comparison"
                    ? "bg-surface text-foreground shadow-xs font-semibold"
                    : "text-muted hover:text-foreground"
                }`}
                onClick={() => setMatrixView("comparison")}
              >
                All Roles Grid
              </button>
            </div>

            {/* Create New Role Action */}
            <button
              type="button"
              className="primary inline-flex items-center gap-1.5"
              onClick={() => {
                applyPreset("preparer");
                setIsCreateModalOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              <span>Create New Role</span>
            </button>
          </div>
        </div>

        {/* ROLE SELECTOR CARDS BAR */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1">
          {roles.map((r) => {
            const isSelected = r.id === activeRole.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelectedRoleId(r.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-left shrink-0 ${
                  isSelected
                    ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/30"
                    : "border-line bg-surface hover:bg-surface-hover text-muted hover:text-foreground"
                }`}
              >
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-[13px]">{r.name}</span>
                    {r.is_system ? (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-primary/20 text-primary font-bold uppercase">
                        System
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-line text-muted font-medium">
                        Custom
                      </span>
                    )}
                  </div>
                  {r.description && (
                    <span className="text-[11px] text-muted line-clamp-1 max-w-[200px]">
                      {r.description}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* SELECTED ROLE HEADER & ACTION TOOLBAR */}
        {matrixView === "crud" && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg border border-line bg-row-sub">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-surface border border-line">
                <Key className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[14px] text-heading">{activeRole.name}</span>
                  {activeRole.is_system ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <Lock className="h-3 w-3" /> System Role (Protected)
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-surface text-muted border border-line">
                      Custom Role
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-muted">
                  {activeRole.description || (activeRole.is_system ? "System role with fixed operational rights." : "Custom configurable role.")}
                </p>
              </div>
            </div>

            {/* Role Action Controls: View / Edit / Delete / Grant All / Clear */}
            <div className="flex items-center gap-2">
              {!activeRole.is_system ? (
                <>
                  <button
                    type="button"
                    className="btn-action inline-flex items-center gap-1 text-[12px]"
                    onClick={() => handleOpenEdit(activeRole)}
                    title="Edit Role Name & Description"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>Edit Role</span>
                  </button>
                  <button
                    type="button"
                    className="btn-action danger inline-flex items-center gap-1 text-[12px]"
                    onClick={() => handleOpenDelete(activeRole)}
                    title="Delete Role"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete Role</span>
                  </button>
                  <button
                    type="button"
                    className="btn-action inline-flex items-center gap-1 text-[12px]"
                    onClick={handleGrantAllToRole}
                    disabled={pending}
                    title="Grant all View, Create, Update, Delete rights"
                  >
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Grant All</span>
                  </button>
                  <button
                    type="button"
                    className="btn-action inline-flex items-center gap-1 text-[12px]"
                    onClick={handleRevokeAllFromRole}
                    disabled={pending}
                    title="Revoke all rights from this role"
                  >
                    <X className="h-3.5 w-3.5 text-rose-500" />
                    <span>Clear All</span>
                  </button>
                </>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold text-[12px]">
                  <Check className="h-4 w-4" />
                  <span>All CRUD Rights Permanently Active</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 1. VIEW MODE: ROLE-BY-ROLE GRANULAR CRUD MATRIX */}
        {matrixView === "crud" && (
          <div className="scroll">
            <table className="matrix">
              <thead>
                <tr>
                  <th style={{ minWidth: 260 }}>Functional Module / Entity</th>
                  <th className="text-center" style={{ width: 140 }}>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold text-[11px]">
                      View [R]
                    </span>
                  </th>
                  <th className="text-center" style={{ width: 140 }}>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                      Create [C]
                    </span>
                  </th>
                  <th className="text-center" style={{ width: 140 }}>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-[11px]">
                      Update [U]
                    </span>
                  </th>
                  <th className="text-center" style={{ width: 140 }}>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold text-[11px]">
                      Delete [D]
                    </span>
                  </th>
                  <th className="text-center" style={{ width: 100 }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {BUDGET_CRUD_RESOURCES.map((res) => {
                  const Icon = RESOURCE_ICONS[res.key] || FolderKanban;
                  const isSys = activeRole.is_system;

                  const hasView = isSys || activeRole.permissions.includes(res.viewCode);
                  const hasCreate = isSys || activeRole.permissions.includes(res.createCode);
                  const hasUpdate = isSys || activeRole.permissions.includes(res.updateCode);
                  const hasDelete = isSys || activeRole.permissions.includes(res.deleteCode);

                  const allChecked = hasView && hasCreate && hasUpdate && hasDelete;

                  return (
                    <tr key={res.key} className="hover:bg-surface-hover/60 transition-colors">
                      {/* Resource Name and Description */}
                      <td className="py-3">
                        <div className="flex items-start gap-2.5">
                          <div className="p-1.5 rounded-md bg-row-sub text-primary shrink-0 mt-0.5">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="font-semibold text-heading block text-[13px]">{res.name}</span>
                            <span className="text-[11.5px] text-muted leading-tight block">{res.description}</span>
                          </div>
                        </div>
                      </td>

                      {/* View [R] */}
                      <td className="text-center py-2.5">
                        <label className="inline-flex items-center justify-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={hasView}
                            disabled={isSys || pending}
                            onChange={() => handleTogglePerm(res.viewCode)}
                            className="h-4 w-4 rounded border-line text-sky-600 focus:ring-sky-500 accent-sky-600 cursor-pointer"
                          />
                          <span className={`text-[11.5px] font-medium ${hasView ? "text-sky-600 dark:text-sky-400 font-semibold" : "text-muted"}`}>
                            View
                          </span>
                        </label>
                      </td>

                      {/* Create [C] */}
                      <td className="text-center py-2.5">
                        <label className="inline-flex items-center justify-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={hasCreate}
                            disabled={isSys || pending}
                            onChange={() => handleTogglePerm(res.createCode)}
                            className="h-4 w-4 rounded border-line text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                          />
                          <span className={`text-[11.5px] font-medium ${hasCreate ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-muted"}`}>
                            Create
                          </span>
                        </label>
                      </td>

                      {/* Update [U] */}
                      <td className="text-center py-2.5">
                        <label className="inline-flex items-center justify-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={hasUpdate}
                            disabled={isSys || pending}
                            onChange={() => handleTogglePerm(res.updateCode)}
                            className="h-4 w-4 rounded border-line text-amber-600 focus:ring-amber-500 accent-amber-600 cursor-pointer"
                          />
                          <span className={`text-[11.5px] font-medium ${hasUpdate ? "text-amber-600 dark:text-amber-400 font-semibold" : "text-muted"}`}>
                            Update
                          </span>
                        </label>
                      </td>

                      {/* Delete [D] */}
                      <td className="text-center py-2.5">
                        <label className="inline-flex items-center justify-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={hasDelete}
                            disabled={isSys || pending}
                            onChange={() => handleTogglePerm(res.deleteCode)}
                            className="h-4 w-4 rounded border-line text-rose-600 focus:ring-rose-500 accent-rose-600 cursor-pointer"
                          />
                          <span className={`text-[11.5px] font-medium ${hasDelete ? "text-rose-600 dark:text-rose-400 font-semibold" : "text-muted"}`}>
                            Delete
                          </span>
                        </label>
                      </td>

                      {/* Row Action: Toggle All */}
                      <td className="text-center py-2.5">
                        {!isSys ? (
                          <button
                            type="button"
                            className="btn-action text-[11px] px-2 py-0.5"
                            onClick={() => handleToggleResourceAll(res)}
                            disabled={pending}
                            title={allChecked ? "Revoke all actions for this entity" : "Grant all actions for this entity"}
                          >
                            {allChecked ? "Revoke All" : "Grant All"}
                          </button>
                        ) : (
                          <span className="text-[11px] text-emerald-600 font-medium">Locked</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 2. VIEW MODE: ALL ROLES SIDE-BY-SIDE GRID */}
        {matrixView === "comparison" && (
          <div className="scroll">
            <table className="matrix">
              <thead>
                <tr>
                  <th style={{ minWidth: 220 }}>Resource</th>
                  {roles.map((r) => (
                    <th key={r.id} className="text-center" style={{ minWidth: 160 }}>
                      <div className="flex flex-col items-center gap-1">
                        <span className="font-bold text-[13px]">{r.name}</span>
                        {r.is_system ? (
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-primary/20 text-primary font-bold">
                            System
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-line text-muted">
                            Custom
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {BUDGET_CRUD_RESOURCES.map((res) => {
                  const Icon = RESOURCE_ICONS[res.key] || FolderKanban;
                  return (
                    <tr key={res.key}>
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-primary shrink-0" />
                          <span className="font-semibold text-heading text-[12.5px]">{res.name}</span>
                        </div>
                      </td>
                      {roles.map((r) => {
                        const isSys = r.is_system;
                        const hasV = isSys || r.permissions.includes(res.viewCode);
                        const hasC = isSys || r.permissions.includes(res.createCode);
                        const hasU = isSys || r.permissions.includes(res.updateCode);
                        const hasD = isSys || r.permissions.includes(res.deleteCode);

                        return (
                          <td key={r.id} className="text-center py-2.5">
                            <div className="inline-flex items-center gap-1 bg-row-sub px-2 py-1 rounded border border-line text-[11px] font-mono">
                              <span className={hasV ? "text-sky-600 font-bold" : "text-muted/40"}>V</span>
                              <span className="text-line-strong">·</span>
                              <span className={hasC ? "text-emerald-600 font-bold" : "text-muted/40"}>C</span>
                              <span className="text-line-strong">·</span>
                              <span className={hasU ? "text-amber-600 font-bold" : "text-muted/40"}>U</span>
                              <span className="text-line-strong">·</span>
                              <span className={hasD ? "text-rose-600 font-bold" : "text-muted/40"}>D</span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* CREATE NEW ROLE MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-line bg-surface p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-line mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <h3 className="text-base font-bold text-heading">Create New Budget Role</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-muted hover:text-foreground p-1 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted block mb-1">Role Name *</label>
                <input
                  type="text"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="e.g. Site Engineer, Billing Manager, Project Reviewer"
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted block mb-1">Role Description</label>
                <input
                  type="text"
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  placeholder="Briefly describe what responsibilities this role handles"
                  className="w-full"
                />
              </div>

              {/* Presets */}
              <div>
                <label className="text-xs font-semibold text-muted block mb-1">Quick Capability Presets</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => applyPreset("preparer")}
                    className="btn-action text-xs"
                  >
                    Budget Preparer (CRUD Budget & Cost)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset("approver")}
                    className="btn-action text-xs"
                  >
                    Approver (View + Approve Versions)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset("viewer")}
                    className="btn-action text-xs"
                  >
                    Auditor / Read-Only (View all)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset("full")}
                    className="btn-action text-xs"
                  >
                    Full CRUD on All Modules
                  </button>
                </div>
              </div>

              {/* Initial CRUD matrix configuration */}
              <div>
                <label className="text-xs font-semibold text-muted block mb-2">Configure Initial CRUD Rights</label>
                <div className="rounded-lg border border-line overflow-hidden">
                  <table className="matrix w-full text-xs">
                    <thead>
                      <tr>
                        <th>Resource</th>
                        <th className="text-center">View</th>
                        <th className="text-center">Create</th>
                        <th className="text-center">Update</th>
                        <th className="text-center">Delete</th>
                      </tr>
                    </thead>
                    <tbody>
                      {BUDGET_CRUD_RESOURCES.map((res) => {
                        const toggle = (code: string) => {
                          const next = new Set(newRolePerms);
                          if (next.has(code)) next.delete(code);
                          else next.add(code);
                          setNewRolePerms(next);
                        };

                        return (
                          <tr key={res.key}>
                            <td className="font-medium text-heading py-1.5">{res.name}</td>
                            <td className="text-center py-1.5">
                              <input
                                type="checkbox"
                                checked={newRolePerms.has(res.viewCode)}
                                onChange={() => toggle(res.viewCode)}
                              />
                            </td>
                            <td className="text-center py-1.5">
                              <input
                                type="checkbox"
                                checked={newRolePerms.has(res.createCode)}
                                onChange={() => toggle(res.createCode)}
                              />
                            </td>
                            <td className="text-center py-1.5">
                              <input
                                type="checkbox"
                                checked={newRolePerms.has(res.updateCode)}
                                onChange={() => toggle(res.updateCode)}
                              />
                            </td>
                            <td className="text-center py-1.5">
                              <input
                                type="checkbox"
                                checked={newRolePerms.has(res.deleteCode)}
                                onChange={() => toggle(res.deleteCode)}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-line mt-6">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="btn-action"
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary"
                disabled={pending || !newRoleName.trim()}
                onClick={handleCreateRole}
              >
                Create Role with Configured Rights
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT ROLE MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-line bg-surface p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-line mb-4">
              <div className="flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-primary" />
                <h3 className="text-base font-bold text-heading">Edit Role Details</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-muted hover:text-foreground p-1 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted block mb-1">Role Name *</label>
                <input
                  type="text"
                  value={editRoleName}
                  onChange={(e) => setEditRoleName(e.target.value)}
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted block mb-1">Role Description</label>
                <input
                  type="text"
                  value={editRoleDesc}
                  onChange={(e) => setEditRoleDesc(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-line mt-6">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="btn-action"
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary"
                disabled={pending || !editRoleName.trim()}
                onClick={handleSaveEdit}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE ROLE MODAL */}
      {isDeleteModalOpen && deletingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-bad/30 bg-surface p-6 shadow-xl">
            <div className="flex items-center gap-3 text-bad mb-3">
              <AlertTriangle className="h-6 w-6 shrink-0" />
              <h3 className="text-base font-bold text-heading">Delete Role: {deletingRole.name}</h3>
            </div>

            <p className="text-sm text-muted mb-4 leading-relaxed">
              Are you sure you want to delete the role <strong>{deletingRole.name}</strong>?
              This action will revoke all permissions linked to this role. If any workspace users currently have this role, reassign them before deleting.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeletingRole(null);
                }}
                className="btn-action"
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-action danger"
                disabled={pending}
                onClick={handleConfirmDelete}
              >
                Yes, Delete Role
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


// ---------- custom fields ----------
const NUMERIC = ["number", "integer", "amount_cr", "amount_inr", "percent"];
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").replace(/^(\d)/, "f_$1").slice(0, 40);
const blank = (entity: Entity): A.FieldInput => ({
  entity, project_id: null, key: "", label: "", help: null, field_type: "text", options: {}, formula: null, result_type: null, required: false,
  input_source: "both", excel_header: null, section: null, sort: 0, show_in_entry: true, show_in_reports: true, edit_permission: null,
});

export function FieldSettings({ fields, projects, permissions }: { fields: CustomField[]; projects: Opt[]; permissions: { code: string; label: string }[] }) {
  const [entity, setEntity] = useState<Entity>("line");
  const [editing, setEditing] = useState<A.FieldInput | null>(null);
  const { pending, run, banner, setNotice } = useAction();
  const list = fields.filter((f) => f.entity === entity);
  const pname = new Map(projects.map((p) => [p.id, p.name]));
  const typeLabel = (f: CustomField) => (f.field_type === "formula" ? `Formula → ${RESULT_TYPES.find((r) => r[0] === f.result_type)?.[1]}` : FIELD_TYPES.find((t) => t.type === f.field_type)?.label);
  return (
    <>
      {banner}
      <section className="panel">
        <div className="panel-head"><h2>Custom fields and forms</h2><span className="sub">Add, change or remove the fields of each form. Values are checked by the database whether typed or imported.</span></div>
        <nav className="tabs" aria-label="Forms">
          {ENTITIES.map((e) => <a key={e.entity} href="#" aria-current={entity === e.entity ? "page" : undefined} onClick={(ev) => { ev.preventDefault(); setEntity(e.entity as Entity); setEditing(null); }}>
            {e.label} ({fields.filter((f) => f.entity === e.entity).length})</a>)}
        </nav>
        <p className="note">{ENTITIES.find((e) => e.entity === entity)!.where}.</p>
        <div className="scroll"><table><thead><tr><th>#</th><th>Field</th><th>Key</th><th>Type</th><th>Projects</th><th>Filled by</th><th>Required</th><th>Shown</th><th>Status</th><th className="actions-col">Actions</th></tr></thead><tbody>
          {list.map((f) => (
            <tr key={f.id} className={f.active ? "" : "muted"}>
              <td>{f.sort}</td><td>{f.label}{f.section && <div className="note">{f.section}</div>}</td><td><code>{f.key}</code></td>
              <td>{typeLabel(f)}{f.formula && <div className="note"><code>= {f.formula}</code></div>}</td>
              <td>{f.project_id ? pname.get(f.project_id) : "All"}</td>
              <td>{f.field_type === "formula" ? "Calculated" : f.input_source === "typed" ? "Typed" : f.input_source === "excel" ? `Excel "${f.excel_header}"` : `Typed or Excel${f.excel_header ? ` "${f.excel_header}"` : ""}`}</td>
              <td>{f.required ? "Yes" : ""}</td><td>{[f.show_in_entry && "entry", f.show_in_reports && "reports"].filter(Boolean).join(", ")}</td>
              <td>{f.active ? <span className="chip ok">active</span> : <span className="chip">off</span>}</td>
              <td className="actions nowrap">
                <div className="actions-group">
                  <button className="btn-action" onClick={() => setEditing({ ...f })}>Edit</button>
                  <button className="btn-action" disabled={pending} onClick={() => run(() => A.setFieldActive(f.id, !f.active), () => setNotice(f.active ? `${f.label} is switched off; its values are kept.` : `${f.label} is back on.`))}>{f.active ? "Switch off" : "Switch on"}</button>
                  <button className="btn-action danger" disabled={pending} onClick={() => { if (confirm(`Delete ${f.label} and all its values? Switch it off instead to keep the values.`)) run(() => A.deleteField(f.id), () => setNotice(`${f.label} deleted.`)); }}>Delete</button>
                </div>
              </td>
            </tr>
          ))}
          {!list.length && <tr><td colSpan={10} className="sub">No custom fields on this form yet.</td></tr>}
        </tbody></table></div>
        {!editing && <div className="row"><button className="primary" onClick={() => setEditing({ ...blank(entity), sort: (list.at(-1)?.sort ?? 0) + 1 })}>Add a field to {ENTITIES.find((e) => e.entity === entity)!.label}</button></div>}
      </section>
      {editing && <FieldEditor key={editing.id ?? "new"} start={editing} fields={fields} projects={projects} permissions={permissions} onDone={(msg) => { setEditing(null); if (msg) setNotice(msg); }} />}
    </>
  );
}

function FieldEditor({ start, fields, projects, permissions, onDone }: {
  start: A.FieldInput; fields: CustomField[]; projects: Opt[]; permissions: { code: string; label: string }[]; onDone: (msg?: string) => void;
}) {
  const { pending, run, banner } = useAction();
  const [f, setF] = useState<A.FieldInput>(start);
  const [keyTouched, setKeyTouched] = useState(!!start.id);
  const [sample, setSample] = useState<Record<string, string>>({});
  const set = (patch: Partial<A.FieldInput>) => setF((x) => ({ ...x, ...patch }));
  const opt = (patch: Partial<CustomField["options"]>) => setF((x) => ({ ...x, options: { ...x.options, ...patch } }));
  const isFormula = f.field_type === "formula";
  const same = fields.filter((x) => x.entity === f.entity && x.id !== f.id && x.active && (x.project_id == null || f.project_id == null || x.project_id === f.project_id));
  const lineFields = fields.filter((x) => x.entity === "line" && x.active);
  const check = useMemo(() => (isFormula ? checkFormula({ ...f, formula: f.formula ?? "" } as FieldDef, f.entity, same as unknown as FieldDef[], lineFields as unknown as FieldDef[]) : null),
    [f, isFormula, same, lineFields]);
  const refs = useMemo(() => { try { return isFormula && !check ? [...refsOf(parse(f.formula ?? "")).refs] : []; } catch { return []; } }, [f.formula, isFormula, check]);
  const kinds = new Map<string, { label: string; type: string }>([
    ...(BUILTINS[f.entity] ?? []).map((b): [string, { label: string; type: string }] => [b.key, { label: `${b.label}${b.unit ? ` (${b.unit})` : ""}`, type: b.kind === "date" ? "date" : "number" }]),
    ...same.map((x): [string, { label: string; type: string }] => [x.key, { label: x.label, type: x.field_type === "formula" ? x.result_type ?? "number" : x.field_type }]),
  ]);
  const trial = useMemo(() => {
    if (!isFormula || check) return null;
    const values: Record<string, Value> = {};
    for (const k of refs) {
      const t = kinds.get(k)?.type ?? "number", s = sample[k] ?? "";
      values[k] = !s ? null : t === "date" || t === "month" ? { date: s } : t === "yes_no" ? /^y|true|1/i.test(s) : NUMERIC.includes(t) || t === "number" ? Dec.parse(s) : s;
    }
    const others = same.filter((x) => x.field_type === "formula") as unknown as FieldDef[];
    const r = calculate([...others, f as unknown as FieldDef], { values })[f.key || "_"];
    return r;
  }, [isFormula, check, refs, sample, f, same, kinds]);
  const insert = (text: string) => set({ formula: `${(f.formula ?? "").replace(/\s+$/, "")}${f.formula ? " " : ""}${text}` });
  const where = ENTITIES.find((e) => e.entity === f.entity)!;
  return (
    <section className="panel">
      <div className="panel-head"><h2>{f.id ? `Change ${start.label}` : `New field on ${where.label}`}</h2><span className="sub">{where.where}</span></div>
      {banner}
      <h3>1. What is it?</h3>
      <div className="row">
        <label style={{ minWidth: 220, flex: 1 }}>Field name<input type="text" value={f.label} onChange={(e) => { const label = e.currentTarget.value; set({ label, ...(keyTouched ? {} : { key: slug(label) }), ...(f.excel_header || f.id ? {} : {}) }); }} placeholder="For example: Planned quantity" /></label>
        <label>Key (used in formulas)<input type="text" value={f.key} disabled={!!f.id} onChange={(e) => { setKeyTouched(true); set({ key: e.currentTarget.value }); }} /></label>
        <label style={{ minWidth: 220 }}>Type<select value={f.field_type} onChange={(e) => {
          const t = e.currentTarget.value;
          set({ field_type: t, formula: t === "formula" ? f.formula ?? "" : null, result_type: t === "formula" ? f.result_type ?? "number" : null, required: t === "formula" ? false : f.required });
        }}>{FIELD_TYPES.map((t) => <option key={t.type} value={t.type}>{t.label}</option>)}</select></label>
        <label>Projects<select value={f.project_id ?? ""} disabled={!!f.id} onChange={(e) => set({ project_id: e.currentTarget.value ? Number(e.currentTarget.value) : null })}>
          <option value="">All projects</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name} only</option>)}</select></label>
      </div>
      <p className="note">{FIELD_TYPES.find((t) => t.type === f.field_type)?.hint}. The key cannot change once saved, because formulas and imports refer to it.</p>
      <label style={{ display: "block" }}>Help text shown to people filling it in<input type="text" value={f.help ?? ""} onChange={(e) => set({ help: e.currentTarget.value })} style={{ width: "100%" }} /></label>

      {(f.field_type === "dropdown" || f.field_type === "multi_select") && <>
        <h3>2. Choices</h3>
        <label style={{ display: "block" }}>One choice per line<textarea rows={4} style={{ width: "100%" }} value={(f.options.choices ?? []).join("\n")}
          onChange={(e) => opt({ choices: e.currentTarget.value.split("\n").map((x) => x.trim()).filter(Boolean) })} /></label>
        <p className="note">Typed and imported values must match a choice (capitals do not matter). Removing a choice that is in use is refused.</p>
      </>}
      {NUMERIC.includes(f.field_type) && <>
        <h3>2. Number rules</h3>
        <div className="row">
          {f.field_type === "number" || f.field_type === "percent" ? <label>Decimals<input type="number" min={0} max={9} value={f.options.decimals ?? ""} onChange={(e) => opt({ decimals: e.currentTarget.value === "" ? null : Number(e.currentTarget.value) })} /></label> : null}
          <label>Minimum<input type="text" inputMode="decimal" value={f.options.min ?? ""} onChange={(e) => opt({ min: e.currentTarget.value === "" ? null : Number(e.currentTarget.value) })} /></label>
          <label>Maximum<input type="text" inputMode="decimal" value={f.options.max ?? ""} onChange={(e) => opt({ max: e.currentTarget.value === "" ? null : Number(e.currentTarget.value) })} /></label>
          <label>Unit shown<input type="text" value={f.options.unit ?? ""} onChange={(e) => opt({ unit: e.currentTarget.value || null })} placeholder="sft, nos, MT" /></label>
        </div>
        <p className="note">Values are stored as exact decimals. A value with more decimals than allowed is refused, not rounded, so nothing changes silently.</p>
      </>}
      {(f.field_type === "text" || f.field_type === "long_text") && <div className="row"><label>Longest allowed (characters)<input type="number" min={1} value={f.options.max_length ?? ""} onChange={(e) => opt({ max_length: e.currentTarget.value === "" ? null : Number(e.currentTarget.value) })} /></label></div>}

      {isFormula && <>
        <h3>2. Formula</h3>
        <div className="row">
          <label style={{ flex: 1, minWidth: 320 }}>= <input className="formula" type="text" aria-label="Formula" value={f.formula ?? ""} onChange={(e) => set({ formula: e.currentTarget.value })} placeholder="planned_qty * rate" /></label>
          <label>Result<select value={f.result_type ?? "number"} onChange={(e) => set({ result_type: e.currentTarget.value })}>{RESULT_TYPES.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></label>
          {(f.result_type === "number" || f.result_type === "percent") && <label>Decimals<input type="number" min={0} max={9} value={f.options.decimals ?? 2} onChange={(e) => opt({ decimals: Number(e.currentTarget.value) })} /></label>}
        </div>
        <p id="formula-check" className={check ? "bad-text" : "ok-text"} role="status">{f.formula ? (check ? `✗ ${check}` : "✓ The formula is valid") : "Type a formula, or click the fields and functions below."}</p>
        <div className="note">Fields of this form:</div>
        <div className="pickers">{[...kinds].map(([k, v]) => <button key={k} type="button" title={v.label} onClick={() => insert(k)}>{k}</button>)}</div>
        {f.entity === "version" && <><div className="note">Totals of budget line fields:</div>
          <div className="pickers">{[...BUILTINS.line.map((b) => b.key), ...lineFields.filter((x) => NUMERIC.includes(x.field_type) || (x.field_type === "formula" && !["text", "yes_no", "date"].includes(x.result_type ?? ""))).map((x) => x.key)]
            .map((k) => <button key={k} type="button" onClick={() => insert(`SUMLINES(${k})`)}>SUMLINES({k})</button>)}</div></>}
        <div className="note">Functions:</div>
        <div className="pickers">{Object.entries(FUNCTIONS).filter(([n]) => f.entity === "version" || !n.endsWith("LINES")).map(([n, d]) => <button key={n} type="button" title={d.help} onClick={() => insert(`${n}(`)}>{n}</button>)}</div>
        <p className="note">Operators: + − * / ^ and % (10% = 0.1), comparisons = &lt;&gt; &lt; &lt;= &gt; &gt;=, &amp; joins text. Blank numbers count as 0. Division by zero shows Error on that value only; use DIVIDE(a, b, 0) to show 0 instead. Calculated with exact decimals, then rounded to the result type.</p>
        {refs.length > 0 && <>
          <h3>Try it</h3>
          <div className="row">
            {refs.map((k) => <label key={k}>{kinds.get(k)?.label ?? k}<input type={kinds.get(k)?.type === "date" ? "date" : "text"} value={sample[k] ?? ""} onChange={(e) => setSample({ ...sample, [k]: e.currentTarget.value })} /></label>)}
            <div><div className="note">Result</div><b>{trial && typeof trial === "object" && "error" in trial ? <span className="bad-text">{trial.error}</span> : display(f as unknown as FieldDef, trial as Value)}</b></div>
          </div>
        </>}
      </>}

      {!isFormula && <>
        <h3>3. How is it filled?</h3>
        <div className="row">
          <label>Filled by<select value={f.input_source} onChange={(e) => set({ input_source: e.currentTarget.value as A.FieldInput["input_source"] })}>
            <option value="both">Typing or Excel import</option><option value="typed">Typing only</option><option value="excel">Excel import only</option></select></label>
          {f.input_source !== "typed" && <label style={{ minWidth: 220 }}>Excel column header<input type="text" value={f.excel_header ?? ""} placeholder={f.label} onChange={(e) => set({ excel_header: e.currentTarget.value })} /></label>}
          <label style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><input type="checkbox" checked={f.required} onChange={(e) => set({ required: e.currentTarget.checked })} /> Required before approval</label>
        </div>
        {f.input_source !== "typed" && <p className="note">The imports read any column with this header (in the header row of the {f.entity === "cost_entry" ? "cost incurred sheet" : "detail budget workbook"}). Cells that do not fit the rules are listed in the import result; the rest of the file is still imported.</p>}
      </>}

      <h3>{isFormula ? "3" : "4"}. Where is it shown?</h3>
      <div className="row">
        <label>Section<input type="text" value={f.section ?? ""} onChange={(e) => set({ section: e.currentTarget.value })} placeholder="More details" /></label>
        <label>Order<input type="number" value={f.sort} onChange={(e) => set({ sort: Number(e.currentTarget.value) })} style={{ width: 80 }} /></label>
        <label style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><input type="checkbox" checked={f.show_in_entry} onChange={(e) => set({ show_in_entry: e.currentTarget.checked })} /> On entry screens</label>
        <label style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><input type="checkbox" checked={f.show_in_reports} onChange={(e) => set({ show_in_reports: e.currentTarget.checked })} /> In reports</label>
        {!isFormula && <label>Extra right needed to change it<select value={f.edit_permission ?? ""} onChange={(e) => set({ edit_permission: e.currentTarget.value || null })}>
          <option value="">None</option>{permissions.map((p) => <option key={p.code} value={p.code}>{p.label}</option>)}</select></label>}
      </div>
      <div className="row">
        <button className="primary" disabled={pending || (isFormula && !!check)} onClick={() => run(() => A.saveField({ ...f, excel_header: f.input_source !== "typed" ? (f.excel_header?.trim() || f.label) : null }),
          () => onDone(`${f.label} saved.`))}>Save field</button>
        <button onClick={() => onDone()}>Cancel</button>
      </div>
    </section>
  );
}

"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  Edit3,
  Plus,
  Search,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  createDmsGroupAction,
  deleteDmsGroupAction,
  fetchDmsGroupsAction,
  setDmsGroupMembersAction,
  updateDmsGroupAction,
  type DmsActiveUserOption,
  type DmsDepartmentOption,
  type DmsGroupRow,
} from "@/lib/actions/dms-groups";

const inputCls =
  "w-full text-xs rounded-lg bg-surface border border-border px-2.5 py-2 text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary";

export function DmsGroupsView() {
  const [groups, setGroups] = useState<DmsGroupRow[]>([]);
  const [departments, setDepartments] = useState<DmsDepartmentOption[]>([]);
  const [users, setUsers] = useState<DmsActiveUserOption[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [deptFilter, setDeptFilter] = useState<string>("ALL");

  // Create / Edit Group form state
  const [editingGroup, setEditingGroup] = useState<DmsGroupRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [memberSearch, setMemberSearch] = useState("");
  const [saving, setSaving] = useState(false);

  // Quick Member Manager state
  const [managingMembersFor, setManagingMembersFor] = useState<DmsGroupRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetchDmsGroupsAction();
    setLoading(false);
    if (!res.success) {
      setError(res.error || "Could not load groups.");
      return;
    }
    setGroups(res.groups || []);
    setDepartments(res.departments || []);
    setUsers(res.users || []);
    setCanManage(!!res.canManage);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return groups.filter((g) => {
      if (statusFilter === "ACTIVE" && !g.isActive) return false;
      if (statusFilter === "INACTIVE" && g.isActive) return false;
      if (deptFilter !== "ALL" && g.departmentId !== deptFilter) return false;
      if (
        q &&
        !g.name.toLowerCase().includes(q) &&
        !(g.code || "").toLowerCase().includes(q) &&
        !(g.description || "").toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [groups, query, statusFilter, deptFilter]);

  const filteredUsers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
    );
  }, [users, memberSearch]);

  const openCreate = () => {
    setEditingGroup(null);
    setManagingMembersFor(null);
    setName("");
    setCode("");
    setDescription("");
    setDepartmentId("");
    setIsActive(true);
    setSelectedMemberIds(new Set());
    setMemberSearch("");
    setFormOpen(true);
  };

  const openEdit = (g: DmsGroupRow) => {
    setEditingGroup(g);
    setManagingMembersFor(null);
    setName(g.name);
    setCode(g.code || "");
    setDescription(g.description || "");
    setDepartmentId(g.departmentId || "");
    setIsActive(g.isActive);
    setSelectedMemberIds(new Set(g.members.map((m) => m.userId)));
    setMemberSearch("");
    setFormOpen(true);
  };

  const openMembers = (g: DmsGroupRow) => {
    setFormOpen(false);
    setEditingGroup(null);
    setManagingMembersFor(g);
    setSelectedMemberIds(new Set(g.members.map((m) => m.userId)));
    setMemberSearch("");
  };

  const toggleMember = (uid: string) => {
    setSelectedMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    if (editingGroup) {
      const res = await updateDmsGroupAction({
        id: editingGroup.id,
        name,
        code,
        description,
        departmentId: departmentId || null,
        isActive,
      });
      if (!res.success) {
        setSaving(false);
        return toast.error(res.error || "Could not update group.");
      }
      const mRes = await setDmsGroupMembersAction({
        groupId: editingGroup.id,
        userIds: Array.from(selectedMemberIds),
      });
      setSaving(false);
      if (!mRes.success) return toast.error(mRes.error || "Could not update group members.");
      toast.success("Group updated.");
    } else {
      const res = await createDmsGroupAction({
        name,
        code,
        description,
        departmentId: departmentId || null,
        memberIds: Array.from(selectedMemberIds),
      });
      setSaving(false);
      if (!res.success) return toast.error(res.error || "Could not create group.");
      toast.success("Group created.");
    }
    setFormOpen(false);
    setEditingGroup(null);
    load();
  };

  const handleSaveMembers = async () => {
    if (!managingMembersFor) return;
    setSaving(true);
    const res = await setDmsGroupMembersAction({
      groupId: managingMembersFor.id,
      userIds: Array.from(selectedMemberIds),
    });
    setSaving(false);
    if (!res.success) return toast.error(res.error || "Could not save members.");
    toast.success("Group members updated.");
    setManagingMembersFor(null);
    load();
  };

  const handleToggleActive = async (g: DmsGroupRow) => {
    const res = await updateDmsGroupAction({
      id: g.id,
      name: g.name,
      code: g.code || undefined,
      description: g.description || undefined,
      departmentId: g.departmentId,
      isActive: !g.isActive,
    });
    if (!res.success) return toast.error(res.error || "Could not change status.");
    toast.success(g.isActive ? "Group deactivated." : "Group activated.");
    load();
  };

  const handleDelete = async (g: DmsGroupRow) => {
    if (!confirm(`Delete group "${g.name}"? This cannot be undone.`)) return;
    const res = await deleteDmsGroupAction(g.id);
    if (!res.success) return toast.error(res.error || "Could not delete group.");
    toast.success("Group deleted.");
    load();
  };

  if (formOpen) {
    return (
      <form onSubmit={handleSaveGroup} className="space-y-4 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {editingGroup ? `Edit Group · ${editingGroup.name}` : "Create Group"}
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Groups allow folder and document sharing with multiple team members at once.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setFormOpen(false);
              setEditingGroup(null);
            }}
            className="px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-sunken font-semibold cursor-pointer"
          >
            Cancel
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-6 space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="font-semibold text-foreground">Group Name *</span>
                <input
                  required
                  minLength={2}
                  maxLength={100}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputCls}
                  placeholder="e.g. Structural Consultants"
                />
              </label>
              <label className="block space-y-1">
                <span className="font-semibold text-foreground">Group Code</span>
                <input
                  maxLength={40}
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className={`${inputCls} font-mono`}
                  placeholder="e.g. STR_CONS"
                />
              </label>
            </div>

            <label className="block space-y-1">
              <span className="font-semibold text-foreground">Department (optional)</span>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className={inputCls}
              >
                <option value="">No department association</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} {d.code ? `(${d.code})` : ""}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1">
              <span className="font-semibold text-foreground">Description</span>
              <textarea
                rows={3}
                maxLength={500}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={inputCls}
                placeholder="Purpose of this group…"
              />
            </label>

            {editingGroup && (
              <label className="inline-flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                <span className="font-semibold text-foreground">Group is Active</span>
              </label>
            )}
          </div>

          <div className="lg:col-span-6 space-y-2.5 rounded-lg border border-border bg-sunken/40 p-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-foreground">
                Group Members ({selectedMemberIds.size} selected)
              </span>
              {selectedMemberIds.size > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedMemberIds(new Set())}
                  className="text-[11px] text-primary hover:underline cursor-pointer"
                >
                  Clear all
                </button>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Search active users by name or email…"
                className={`${inputCls} pl-8`}
              />
            </div>
            <div className="max-h-60 overflow-y-auto border border-border rounded-lg bg-surface divide-y divide-border">
              {filteredUsers.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">No matching active users.</div>
              ) : (
                filteredUsers.map((u) => {
                  const checked = selectedMemberIds.has(u.id);
                  return (
                    <label
                      key={u.id}
                      className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-sunken/60 ${
                        checked ? "bg-accent-soft/30" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleMember(u.id)}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-foreground truncate">{u.fullName}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{u.email}</div>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold disabled:opacity-50 cursor-pointer"
          >
            <Check className="h-3.5 w-3.5" />
            <span>{saving ? "Saving…" : editingGroup ? "Save Changes" : "Create Group"}</span>
          </button>
        </div>
      </form>
    );
  }

  if (managingMembersFor) {
    return (
      <div className="space-y-4 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Manage Members · {managingMembersFor.name}
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Select active users who belong to this group ({selectedMemberIds.size} selected).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setManagingMembersFor(null)}
              className="px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-sunken font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveMembers}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold disabled:opacity-50 cursor-pointer"
            >
              <Check className="h-3.5 w-3.5" />
              <span>{saving ? "Saving…" : "Save Members"}</span>
            </button>
          </div>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
            placeholder="Filter active users…"
            className={`${inputCls} pl-8`}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[55vh] overflow-y-auto p-1">
          {filteredUsers.map((u) => {
            const checked = selectedMemberIds.has(u.id);
            return (
              <label
                key={u.id}
                className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                  checked ? "border-primary bg-accent-soft/40" : "border-border bg-surface hover:bg-sunken/50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleMember(u.id)}
                />
                <div className="min-w-0">
                  <div className="font-semibold text-foreground truncate">{u.fullName}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{u.email}</div>
                </div>
              </label>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-1 min-w-44 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search groups…"
              className={`${inputCls} pl-8`}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            aria-label="Filter by status"
            className="rounded-lg border border-border bg-surface px-2.5 py-2 text-xs"
          >
            <option value="ALL">All statuses</option>
            <option value="ACTIVE">Active only</option>
            <option value="INACTIVE">Inactive only</option>
          </select>
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            aria-label="Filter by department"
            className="rounded-lg border border-border bg-surface px-2.5 py-2 text-xs"
          >
            <option value="ALL">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary text-primary-foreground font-semibold cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Group</span>
          </button>
        )}
      </div>

      {error && (
        <p className="p-2.5 rounded-lg border border-danger-border bg-danger-soft text-danger-text">{error}</p>
      )}

      {loading ? (
        <p className="py-8 text-center text-muted-foreground">Loading groups…</p>
      ) : filteredGroups.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground space-y-2 border border-dashed border-border rounded-lg">
          <Users className="h-7 w-7 mx-auto stroke-1" />
          <p>{groups.length ? "No groups match your filters." : "No DMS groups created yet."}</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-border rounded-lg">
          <table className="w-full text-left border-collapse">
            <thead className="bg-sunken border-b border-border text-[11px] text-muted-foreground uppercase">
              <tr>
                <th className="py-2.5 px-3">Group</th>
                <th className="py-2.5 px-3">Department</th>
                <th className="py-2.5 px-3">Members</th>
                <th className="py-2.5 px-3">Status</th>
                {canManage && <th className="py-2.5 px-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {filteredGroups.map((g) => (
                <tr key={g.id} className="hover:bg-sunken/40">
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{g.name}</span>
                      {g.code && (
                        <span className="px-1.5 py-0.5 rounded bg-sunken border border-border font-mono text-[10px]">
                          {g.code}
                        </span>
                      )}
                    </div>
                    {g.description && (
                      <div className="text-[11px] text-muted-foreground truncate max-w-md">{g.description}</div>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-muted-foreground">
                    {g.departmentName || "—"}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="font-semibold text-foreground">{g.memberCount}</span>
                      <span className="text-muted-foreground">
                        {g.memberCount === 1 ? "member" : "members"}
                      </span>
                      {g.members.slice(0, 3).map((m) => (
                        <span
                          key={m.userId}
                          className="px-1.5 py-0.5 rounded bg-sunken text-[10px] text-muted-foreground"
                        >
                          {m.fullName}
                        </span>
                      ))}
                      {g.members.length > 3 && (
                        <span className="text-[10px] text-muted-foreground">+{g.members.length - 3} more</span>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full border text-[10px] font-semibold ${
                        g.isActive
                          ? "bg-success-soft text-success-text border-success-border"
                          : "bg-sunken text-muted-foreground border-border"
                      }`}
                    >
                      {g.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  {canManage && (
                    <td className="py-2.5 px-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openMembers(g)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded border border-border bg-surface hover:bg-sunken text-[11px] font-medium cursor-pointer"
                          title="Manage members"
                        >
                          <UserPlus className="h-3 w-3" />
                          <span>Members</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(g)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded border border-border bg-surface hover:bg-sunken text-[11px] font-medium cursor-pointer"
                          title="Edit group"
                        >
                          <Edit3 className="h-3 w-3" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(g)}
                          className="px-2 py-1 rounded border border-border bg-surface hover:bg-sunken text-[11px] font-medium cursor-pointer"
                        >
                          {g.isActive ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(g)}
                          aria-label={`Delete ${g.name}`}
                          className="p-1.5 rounded border border-border text-danger-text hover:bg-danger-soft cursor-pointer"
                          title="Delete group"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

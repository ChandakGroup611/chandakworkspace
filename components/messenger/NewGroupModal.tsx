"use client";

import React, { useState, useMemo } from "react";
import { X, Search, Users, Loader2, Check, Building } from "lucide-react";
import { WorkspaceUser, createGroupConversation, MessengerConversation } from "@/lib/actions/messenger";

interface NewGroupModalProps {
  users: WorkspaceUser[];
  currentUserId: string;
  onClose: () => void;
  onGroupCreated: (conversation: MessengerConversation) => void;
}

export function NewGroupModal({
  users,
  currentUserId,
  onClose,
  onGroupCreated,
}: NewGroupModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableUsers = useMemo(() => {
    return users.filter((u) => u.id !== currentUserId);
  }, [users, currentUserId]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return availableUsers;
    return availableUsers.filter((u) => {
      return (
        u.full_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.department_name && u.department_name.toLowerCase().includes(q))
      );
    });
  }, [availableUsers, search]);

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please provide a group title.");
      return;
    }
    if (selectedUserIds.length === 0) {
      setError("Please select at least one colleague to add to the group.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await createGroupConversation(
        title.trim(),
        selectedUserIds,
        description.trim() || undefined
      );

      if (res.success && res.conversation) {
        onGroupCreated(res.conversation);
        onClose();
      } else {
        setError(res.error || "Failed to create group.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("");
  };

  return (
    <div className="fixed inset-0 z-[var(--z-modal,9999)] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="relative flex flex-col w-full max-w-lg bg-elevated rounded-xl border border-border shadow-2xl overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-border bg-surface">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-accent" />
            <div>
              <h2 className="text-base font-semibold text-foreground">Create New Group</h2>
              <p className="text-xs text-muted">Collaborate with multiple workspace colleagues</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-muted hover:text-foreground hover:bg-surface-hover rounded-md transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleCreateGroup} className="flex flex-col flex-1 overflow-hidden">
          {/* Group Inputs */}
          <div className="p-4 border-b border-border space-y-3 bg-surface/40">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Group Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. ERP Project Rollout, Design Review, Fleet Ops"
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-elevated text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Description / Purpose (Optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief summary of group purpose"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-elevated text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>

            {error && <p className="text-xs text-danger font-medium">{error}</p>}
          </div>

          {/* Members Selection Header */}
          <div className="px-4 py-2 border-b border-border bg-surface flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground">
              Add Members ({selectedUserIds.length} selected)
            </span>
            <div className="relative w-48">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter colleagues..."
                className="w-full pl-7 pr-2 py-1 text-xs rounded border border-border bg-elevated text-foreground placeholder:text-muted focus:outline-none"
              />
            </div>
          </div>

          {/* Selected chips bar */}
          {selectedUserIds.length > 0 && (
            <div className="px-4 py-2 border-b border-border bg-accent-soft/30 flex items-center gap-1.5 overflow-x-auto max-h-20 flex-wrap">
              {selectedUserIds.map((uid) => {
                const u = availableUsers.find((x) => x.id === uid);
                if (!u) return null;
                return (
                  <span
                    key={uid}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-accent text-accent-contrast font-medium"
                  >
                    <span>{u.full_name}</span>
                    <button
                      type="button"
                      onClick={() => toggleUser(uid)}
                      className="hover:opacity-75 focus:outline-none"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          {/* Members List */}
          <div className="flex-1 overflow-y-auto divide-y divide-border/40 max-h-[35vh]">
            {filteredUsers.length === 0 ? (
              <div className="py-8 text-center text-muted text-xs">No colleagues found.</div>
            ) : (
              filteredUsers.map((u) => {
                const isSelected = selectedUserIds.includes(u.id);
                return (
                  <div
                    key={u.id}
                    onClick={() => toggleUser(u.id)}
                    className={`flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-surface-hover transition-colors ${
                      isSelected ? "bg-accent-soft/20" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-accent-soft text-xs font-semibold text-accent-soft-text shrink-0">
                        {u.profile_photo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={u.profile_photo} alt="" className="h-full w-full object-cover" />
                        ) : (
                          getInitials(u.full_name)
                        )}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-foreground truncate">{u.full_name}</div>
                        <div className="text-[11px] text-muted truncate flex items-center gap-1">
                          {u.department_name && (
                            <span className="flex items-center gap-0.5">
                              <Building className="h-2.5 w-2.5" /> {u.department_name}
                            </span>
                          )}
                          {u.department_name && u.designation_name && <span>•</span>}
                          {u.designation_name && <span>{u.designation_name}</span>}
                        </div>
                      </div>
                    </div>

                    <div
                      className={`h-4 w-4 rounded border flex items-center justify-center transition-colors ${
                        isSelected
                          ? "bg-accent border-accent text-accent-contrast"
                          : "border-border bg-surface"
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-border bg-surface flex items-center justify-between">
            <span className="text-xs text-muted">
              {selectedUserIds.length} member{selectedUserIds.length === 1 ? "" : "s"} selected
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs font-medium rounded-md border border-border hover:bg-surface-hover text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !title.trim() || selectedUserIds.length === 0}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-md bg-accent text-accent-contrast hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Create Group</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}


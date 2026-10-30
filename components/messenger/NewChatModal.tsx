"use client";

import React, { useState, useMemo } from "react";
import { X, Search, User, Loader2, Building, Shield } from "lucide-react";
import { WorkspaceUser, getOrCreateDirectConversation, MessengerConversation } from "@/lib/actions/messenger";

interface NewChatModalProps {
  users: WorkspaceUser[];
  currentUserId: string;
  onClose: () => void;
  onConversationCreated: (conversation: MessengerConversation) => void;
}

export function NewChatModal({
  users,
  currentUserId,
  onClose,
  onConversationCreated,
}: NewChatModalProps) {
  const [search, setSearch] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Exclude current user from candidate list
  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users
      .filter((u) => u.id !== currentUserId)
      .filter((u) => {
        if (!q) return true;
        return (
          u.full_name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.department_name && u.department_name.toLowerCase().includes(q)) ||
          (u.designation_name && u.designation_name.toLowerCase().includes(q))
        );
      });
  }, [users, currentUserId, search]);

  const handleSelectUser = async (targetUser: WorkspaceUser) => {
    setLoadingId(targetUser.id);
    setError(null);
    try {
      const res = await getOrCreateDirectConversation(targetUser.id);
      if (res.success && res.conversation) {
        onConversationCreated(res.conversation);
        onClose();
      } else {
        setError(res.error || "Failed to start conversation.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoadingId(null);
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
      <div className="relative flex flex-col w-full max-w-lg bg-elevated rounded-xl border border-border shadow-2xl overflow-hidden max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-border bg-surface">
          <div>
            <h2 className="text-base font-semibold text-foreground">New Direct Chat</h2>
            <p className="text-xs text-muted">Select a colleague from Chandak Workspace</p>
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

        {/* Search */}
        <div className="p-3 border-b border-border bg-surface/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, department, or email..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-elevated text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
              autoFocus
            />
          </div>
          {error && <p className="text-xs text-danger mt-2">{error}</p>}
        </div>

        {/* User List */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/50 max-h-[50vh]">
          {filteredUsers.length === 0 ? (
            <div className="py-12 text-center text-muted text-sm">
              No colleagues found matching &quot;{search}&quot;.
            </div>
          ) : (
            filteredUsers.map((u) => {
              const isLoading = loadingId === u.id;
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleSelectUser(u)}
                  disabled={isLoading || !!loadingId}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-surface-hover transition-colors disabled:opacity-50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <span className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-accent-soft text-sm font-semibold text-accent-soft-text">
                        {u.profile_photo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={u.profile_photo} alt="" className="h-full w-full object-cover" />
                        ) : (
                          getInitials(u.full_name)
                        )}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{u.full_name}</div>
                      <div className="text-xs text-muted truncate flex items-center gap-1.5 mt-0.5">
                        {u.department_name && (
                          <span className="flex items-center gap-1">
                            <Building className="h-3 w-3" /> {u.department_name}
                          </span>
                        )}
                        {u.department_name && u.designation_name && <span>•</span>}
                        {u.designation_name && <span>{u.designation_name}</span>}
                      </div>
                    </div>
                  </div>

                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-accent shrink-0 ml-2" />
                  ) : (
                    <span className="text-xs font-medium text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                      Chat →
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-border bg-surface text-xs text-muted flex items-center justify-between">
          <span>{filteredUsers.length} colleagues available</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 text-xs font-medium rounded border border-border hover:bg-surface-hover text-foreground transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}


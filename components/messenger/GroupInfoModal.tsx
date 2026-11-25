"use client";
import { confirmAction, promptAction } from "@/components/ui/feedback/confirm";

import React, { useState } from "react";
import { X, Users, UserPlus, LogOut, Shield, ShieldCheck, Building, Loader2 } from "lucide-react";
import { MessengerConversation, WorkspaceUser, addGroupMembers, leaveGroupConversation } from "@/lib/actions/messenger";

interface GroupInfoModalProps {
  conversation: MessengerConversation;
  currentUserId: string;
  allUsers: WorkspaceUser[];
  onClose: () => void;
  onMembersUpdated: () => void;
  onLeftGroup: () => void;
}

export function GroupInfoModal({
  conversation,
  currentUserId,
  allUsers,
  onClose,
  onMembersUpdated,
  onLeftGroup,
}: GroupInfoModalProps) {
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedNewUserIds, setSelectedNewUserIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const myPart = conversation.participants.find((p) => p.user_id === currentUserId);
  const isAdmin = myPart?.role === "admin";

  // Filter out existing participants
  const existingUserIds = new Set(conversation.participants.map((p) => p.user_id));
  const candidateUsers = allUsers.filter((u) => !existingUserIds.has(u.id));

  const handleAddMembers = async () => {
    if (selectedNewUserIds.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await addGroupMembers(conversation.id, selectedNewUserIds);
      if (res.success) {
        setShowAddMember(false);
        setSelectedNewUserIds([]);
        onMembersUpdated();
      } else {
        setError(res.error || "Failed to add members.");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!(await confirmAction("Are you sure you want to leave this group conversation?"))) return;
    setLeaving(true);
    try {
      const res = await leaveGroupConversation(conversation.id);
      if (res.success) {
        onLeftGroup();
        onClose();
      } else {
        setError(res.error || "Failed to leave group.");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setLeaving(false);
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
      <div className="relative flex flex-col w-full max-w-md bg-elevated rounded-xl border border-border shadow-2xl overflow-hidden max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-border bg-surface">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-accent" />
            <h2 className="text-base font-semibold text-foreground">Group Information</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-muted hover:text-foreground hover:bg-surface-hover rounded-md transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Group Card */}
          <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-surface/50">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent-soft-text font-bold text-lg">
              <Users className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-foreground truncate">{conversation.title || "Group"}</h3>
              {conversation.description && (
                <p className="text-xs text-muted mt-0.5 line-clamp-2">{conversation.description}</p>
              )}
              <p className="text-[11px] text-muted mt-1">
                {conversation.participants.length} members • Created {new Date(conversation.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          {error && <p className="text-xs text-danger font-medium">{error}</p>}

          {/* Add Members section (if admin) */}
          {isAdmin && (
            <div>
              {!showAddMember ? (
                <button
                  type="button"
                  onClick={() => setShowAddMember(true)}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-lg border border-dashed border-border hover:border-accent hover:bg-surface-hover text-accent transition-colors"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Add Colleague to Group</span>
                </button>
              ) : (
                <div className="p-3 border border-border rounded-lg bg-surface/40 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                    <span>Select Colleagues</span>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddMember(false);
                        setSelectedNewUserIds([]);
                      }}
                      className="text-muted hover:text-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="max-h-36 overflow-y-auto divide-y divide-border/40">
                    {candidateUsers.length === 0 ? (
                      <p className="py-4 text-center text-xs text-muted">All active colleagues are already members.</p>
                    ) : (
                      candidateUsers.map((u) => {
                        const isPicked = selectedNewUserIds.includes(u.id);
                        return (
                          <div
                            key={u.id}
                            onClick={() => {
                              setSelectedNewUserIds((prev) =>
                                prev.includes(u.id) ? prev.filter((x) => x !== u.id) : [...prev, u.id]
                              );
                            }}
                            className={`flex items-center justify-between py-1.5 px-2 rounded cursor-pointer text-xs ${
                              isPicked ? "bg-accent-soft/30 font-medium" : "hover:bg-surface-hover"
                            }`}
                          >
                            <span className="truncate">{u.full_name} ({u.department_name || "General"})</span>
                            <span className="text-[11px] text-accent">{isPicked ? "✓ Added" : "+"}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                  {selectedNewUserIds.length > 0 && (
                    <button
                      type="button"
                      onClick={handleAddMembers}
                      disabled={loading}
                      className="w-full mt-2 py-1.5 text-xs font-semibold rounded bg-accent text-accent-contrast hover:opacity-90 flex items-center justify-center gap-1.5"
                    >
                      {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      <span>Add ({selectedNewUserIds.length}) Selected</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Participants Roster */}
          <div>
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
              Group Members ({conversation.participants.length})
            </h4>
            <div className="divide-y divide-border/50 border border-border rounded-lg overflow-hidden bg-surface/30">
              {conversation.participants.map((p) => {
                const u = p.user;
                const isMe = p.user_id === currentUserId;
                return (
                  <div key={p.id} className="flex items-center justify-between p-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-accent-soft text-xs font-semibold text-accent-soft-text shrink-0">
                        {u?.profile_photo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={u.profile_photo} alt="" className="h-full w-full object-cover" />
                        ) : (
                          getInitials(u?.full_name || "Colleague")
                        )}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-foreground truncate">
                          {u?.full_name || "Colleague"} {isMe && <span className="text-muted">(You)</span>}
                        </div>
                        <div className="text-[11px] text-muted truncate">
                          {u?.department_name || "Workspace Member"}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 ml-2">
                      {p.role === "admin" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-success-soft text-success-text">
                          <ShieldCheck className="h-3 w-3" /> Admin
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted">Member</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border bg-surface flex items-center justify-between">
          <button
            type="button"
            onClick={handleLeaveGroup}
            disabled={leaving}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-danger hover:underline disabled:opacity-50"
          >
            {leaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
            <span>Leave Group</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium rounded border border-border hover:bg-surface-hover text-foreground transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}


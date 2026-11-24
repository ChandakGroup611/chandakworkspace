"use client";

import React, { useState, useTransition } from "react";
import { CheckCircle2, HelpCircle, XCircle, Clock, Send, Calendar, UserCheck, AlertTriangle, X } from "lucide-react";
import type { MeetInvitation, RSVPResponse } from "@/types/meet";
import { respondToInvitation, moveMeetingToProposedTime, sendRSVPReminders } from "@/lib/actions/meet/invitations";
import { toast } from "react-toastify";

interface Props {
  sessionId: string;
  isOrganizer: boolean;
  initialData: {
    invitations: MeetInvitation[];
    counts: {
      accepted: number;
      maybe: number;
      declined: number;
      proposed: number;
      pending: number;
      total: number;
    };
    currentUserInvite?: MeetInvitation | null;
  };
  usersList?: { id: string; full_name: string; email: string }[];
}

export default function InvitationsCard({
  sessionId,
  isOrganizer,
  initialData,
  usersList = [],
}: Props) {
  const [data, setData] = useState(initialData);
  const [isPending, startTransition] = useTransition();

  // Decline Modal state
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [delegateId, setDelegateId] = useState("");

  // Propose New Time Modal state
  const [isProposeModalOpen, setIsProposeModalOpen] = useState(false);
  const [proposedDateTime, setProposedDateTime] = useState("");
  const [proposeNote, setProposeNote] = useState("");

  const handleSimpleResponse = (response: RSVPResponse) => {
    startTransition(async () => {
      const res = await respondToInvitation(sessionId, response);
      if (res.success) {
        toast.success(`RSVP response recorded: ${response}`);
        // Optimistic update
        setData((prev) => {
          const updated = prev.invitations.map((inv) =>
            inv.id === prev.currentUserInvite?.id ? { ...inv, response } : inv
          );
          return {
            ...prev,
            invitations: updated,
            currentUserInvite: prev.currentUserInvite ? { ...prev.currentUserInvite, response } : null,
          };
        });
      } else {
        toast.error(res.error || "Failed to record response");
      }
    });
  };

  const handleConfirmDecline = () => {
    startTransition(async () => {
      const res = await respondToInvitation(sessionId, "declined", {
        note: declineReason,
        delegate_user_id: delegateId || undefined,
      });
      if (res.success) {
        toast.success("Declined with reason/delegate recorded");
        setIsDeclineModalOpen(false);
      } else {
        toast.error(res.error || "Failed to decline");
      }
    });
  };

  const handleConfirmPropose = () => {
    if (!proposedDateTime) {
      toast.error("Please pick proposed start time");
      return;
    }
    startTransition(async () => {
      const res = await respondToInvitation(sessionId, "proposed", {
        note: proposeNote,
        proposed_start: new Date(proposedDateTime).toISOString(),
      });
      if (res.success) {
        toast.success("Proposed new meeting time sent to organizer");
        setIsProposeModalOpen(false);
      } else {
        toast.error(res.error || "Failed to propose time");
      }
    });
  };

  const handleRemindNonResponders = () => {
    startTransition(async () => {
      const res = await sendRSVPReminders(sessionId);
      if (res.success) {
        toast.success(`Reminded ${res.remindedCount} attendees who haven't replied.`);
      }
    });
  };

  const handleAcceptProposal = (proposedStart: string) => {
    if (!confirm(`Reschedule session to ${new Date(proposedStart).toLocaleString()}? This will re-invite attendees.`)) {
      return;
    }
    startTransition(async () => {
      const res = await moveMeetingToProposedTime(sessionId, proposedStart);
      if (res.success) {
        toast.success("Meeting moved to proposed time. Attendees re-invited.");
      } else {
        toast.error(res.error || "Failed to move meeting");
      }
    });
  };

  const myResponse = data.currentUserInvite?.response || "pending";

  return (
    <div className="rounded-lg border border-border bg-elevated overflow-hidden shadow-sm">
      {/* Header with RSVP Counters */}
      <div className="p-4 border-b border-border bg-elevated/80 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-theme-btn-primary" />
            Meeting Invitations & RSVP
          </h3>
          <p className="text-[12.5px] text-muted mt-0.5">Track attendance confirmation and time change proposals.</p>
        </div>

        {/* Counts Badges */}
        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-success-soft text-success-text font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" /> {data.counts.accepted} Accepted
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-warning-soft text-warning-text font-semibold">
            <HelpCircle className="w-3.5 h-3.5" /> {data.counts.maybe} Maybe
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-danger-soft text-danger-text font-semibold">
            <XCircle className="w-3.5 h-3.5" /> {data.counts.declined} Declined
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-accent-soft text-accent-soft-text font-semibold">
            <Clock className="w-3.5 h-3.5" /> {data.counts.proposed} Proposed
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface border border-border text-muted">
            {data.counts.pending} Pending
          </span>
        </div>
      </div>

      {/* User Response Action Bar */}
      <div className="p-3 bg-surface border-b border-border flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-foreground">Your RSVP:</span>
          <span
            className={`px-2 py-0.5 rounded font-bold capitalize text-[12.5px] ${
              myResponse === "accepted"
                ? "bg-success-soft text-success-text"
                : myResponse === "declined"
                ? "bg-danger-soft text-danger-text"
                : myResponse === "tentative"
                ? "bg-warning-soft text-warning-text"
                : myResponse === "proposed"
                ? "bg-accent-soft text-accent-soft-text"
                : "bg-elevated text-muted"
            }`}
          >
            {myResponse}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <button
            onClick={() => handleSimpleResponse("accepted")}
            disabled={isPending}
            className={`px-3 py-1 rounded font-semibold transition-all ${
              myResponse === "accepted"
                ? "bg-success text-white shadow-sm"
                : "bg-elevated hover:bg-success-soft text-success-text border border-success-border"
            }`}
          >
            Accept
          </button>
          <button
            onClick={() => handleSimpleResponse("tentative")}
            disabled={isPending}
            className={`px-3 py-1 rounded font-semibold transition-all ${
              myResponse === "tentative"
                ? "bg-warning text-white shadow-sm"
                : "bg-elevated hover:bg-warning-soft text-warning-text border border-warning-border"
            }`}
          >
            Maybe
          </button>
          <button
            onClick={() => setIsDeclineModalOpen(true)}
            disabled={isPending}
            className={`px-3 py-1 rounded font-semibold transition-all ${
              myResponse === "declined"
                ? "bg-danger-solid text-white shadow-sm"
                : "bg-elevated hover:bg-danger-soft text-danger-text border border-danger-border"
            }`}
          >
            Decline...
          </button>
          <button
            onClick={() => setIsProposeModalOpen(true)}
            disabled={isPending}
            className={`px-3 py-1 rounded font-semibold transition-all ${
              myResponse === "proposed"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-elevated hover:bg-accent-soft text-accent-soft-text border border-primary/30"
            }`}
          >
            Propose New Time...
          </button>
        </div>
      </div>

      {/* Organizer Tools & List of Attendees */}
      <div className="p-4 space-y-3">
        {isOrganizer && data.counts.pending > 0 && (
          <div className="p-2.5 rounded bg-accent-soft border border-primary/30 flex items-center justify-between text-xs">
            <span className="text-accent-soft-text">
              {data.counts.pending} member{data.counts.pending > 1 ? "s" : ""} haven&apos;t replied yet.
            </span>
            <button
              onClick={handleRemindNonResponders}
              disabled={isPending}
              className="px-2.5 py-1 rounded bg-primary hover:bg-primary-hover text-primary-foreground font-semibold flex items-center gap-1"
            >
              <Send className="w-3 h-3" /> Remind Now
            </button>
          </div>
        )}

        <div className="divide-y divide-border">
          {data.invitations.map((inv) => (
            <div key={inv.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-full bg-surface border border-border flex items-center justify-center font-bold text-muted shrink-0 text-[12px]">
                  {inv.user?.full_name?.charAt(0) || "U"}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground truncate">{inv.user?.full_name}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[12px] font-bold capitalize ${
                        inv.response === "accepted"
                          ? "text-success-text"
                          : inv.response === "declined"
                          ? "text-danger-text"
                          : inv.response === "tentative"
                          ? "text-warning-text"
                          : inv.response === "proposed"
                          ? "text-accent-soft-text"
                          : "text-muted"
                      }`}
                    >
                      {inv.response}
                    </span>
                  </div>
                  {inv.note && <p className="text-[12.5px] text-muted italic mt-0.5">&quot;{inv.note}&quot;</p>}
                  {inv.delegate && (
                    <p className="text-[12.5px] text-info-text mt-0.5">
                      Delegated to: {inv.delegate.full_name}
                    </p>
                  )}
                  {inv.proposed_start && (
                    <p className="text-[12.5px] text-accent-soft-text mt-0.5">
                      Proposed: {new Date(inv.proposed_start).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>

              {/* Organizer action on proposed time */}
              {isOrganizer && inv.response === "proposed" && inv.proposed_start && (
                <button
                  onClick={() => handleAcceptProposal(inv.proposed_start!)}
                  disabled={isPending}
                  className="px-2.5 py-1 text-[12.5px] font-semibold rounded bg-primary hover:bg-primary-hover text-primary-foreground shrink-0"
                >
                  Move Meeting Here
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Decline with Reason & Delegate Modal */}
      {isDeclineModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-elevated border border-border rounded-lg max-w-md w-full p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-sm font-bold text-foreground">Decline Meeting</h3>
              <button onClick={() => setIsDeclineModalOpen(false)} className="text-muted hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 py-4 text-xs">
              <div>
                <label className="block text-muted font-medium mb-1">Reason for Declining</label>
                <textarea
                  rows={2}
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="e.g. Prior customer site visit in Akola"
                  className="w-full px-3 py-2 bg-surface border border-border rounded text-foreground focus:outline-none focus:border-theme-btn-primary"
                />
              </div>

              <div>
                <label className="block text-muted font-medium mb-1">Optional Delegate</label>
                <select
                  value={delegateId}
                  onChange={(e) => setDelegateId(e.target.value)}
                  className="w-full px-3 py-2 bg-surface border border-border rounded text-foreground focus:outline-none focus:border-theme-btn-primary"
                >
                  <option value="">No delegate</option>
                  {usersList.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} ({u.email})
                    </option>
                  ))}
                </select>
                <p className="text-[12px] text-muted mt-1">
                  The selected delegate will be invited automatically with delegate permissions.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                onClick={() => setIsDeclineModalOpen(false)}
                className="px-3 py-1.5 text-xs rounded border border-border text-subtle"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDecline}
                disabled={isPending}
                className="px-4 py-1.5 text-xs font-semibold rounded bg-danger-solid hover:opacity-90 text-white"
              >
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Propose New Time Modal */}
      {isProposeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-elevated border border-border rounded-lg max-w-md w-full p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-sm font-bold text-foreground">Propose New Meeting Time</h3>
              <button onClick={() => setIsProposeModalOpen(false)} className="text-muted hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 py-4 text-xs">
              <div>
                <label className="block text-muted font-medium mb-1">Proposed Start Time *</label>
                <input
                  type="datetime-local"
                  value={proposedDateTime}
                  onChange={(e) => setProposedDateTime(e.target.value)}
                  className="w-full px-3 py-2 bg-surface border border-border rounded text-foreground focus:outline-none focus:border-theme-btn-primary"
                />
              </div>

              <div>
                <label className="block text-muted font-medium mb-1">Reason / Note for Organizer</label>
                <textarea
                  rows={2}
                  value={proposeNote}
                  onChange={(e) => setProposeNote(e.target.value)}
                  placeholder="e.g. Clashes with monthly review call, free after 3 PM"
                  className="w-full px-3 py-2 bg-surface border border-border rounded text-foreground focus:outline-none focus:border-theme-btn-primary"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                onClick={() => setIsProposeModalOpen(false)}
                className="px-3 py-1.5 text-xs rounded border border-border text-subtle"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPropose}
                disabled={isPending || !proposedDateTime}
                className="px-4 py-1.5 text-xs font-semibold rounded bg-primary hover:bg-primary-hover text-primary-foreground disabled:opacity-50"
              >
                Submit Proposal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

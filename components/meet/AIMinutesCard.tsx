"use client";

import React, { useState, useTransition } from "react";
import { Sparkles, CheckCircle2, RefreshCw, Send, Edit2, FileText, Check, AlertCircle } from "lucide-react";
import type { MeetAIMinutes } from "@/types/meet";
import { generateAIMinutes, updateAIMinutes, approveAndSendMoM } from "@/lib/actions/meet/ai-minutes";
import { toast } from "react-toastify";

interface Props {
  sessionId: string;
  initialAIMinutes?: MeetAIMinutes | null;
  totalAttendeesCount: number;
}

export default function AIMinutesCard({
  sessionId,
  initialAIMinutes,
  totalAttendeesCount,
}: Props) {
  const [aiMinutes, setAiMinutes] = useState<MeetAIMinutes | null>(initialAIMinutes || null);
  const [isEditing, setIsEditing] = useState(false);
  const [overview, setOverview] = useState(initialAIMinutes?.overview || "");
  const [items, setItems] = useState<any[]>(initialAIMinutes?.items_json || []);
  const [isPending, startTransition] = useTransition();

  const handleGenerate = () => {
    startTransition(async () => {
      const res = await generateAIMinutes(sessionId);
      if (res.success && res.aiMinutes) {
        setAiMinutes(res.aiMinutes);
        setOverview(res.aiMinutes.overview);
        setItems(res.aiMinutes.items_json);
        toast.success("AI minutes generated successfully from session notes & points");
      } else {
        toast.error(res.error || "Failed to generate AI minutes");
      }
    });
  };

  const handleSaveEdits = () => {
    if (!aiMinutes) return;
    startTransition(async () => {
      const res = await updateAIMinutes(aiMinutes.id, {
        overview,
        items_json: items,
      });
      if (res.success) {
        toast.success("Minutes updated");
        setIsEditing(false);
      } else {
        toast.error(res.error || "Failed to save edits");
      }
    });
  };

  const handleApproveAndSend = () => {
    if (!aiMinutes) return;
    if (!confirm(`Publish and send MoM PDF to all ${totalAttendeesCount} attendees and item owners?`)) {
      return;
    }
    startTransition(async () => {
      const res = await approveAndSendMoM(sessionId, aiMinutes.id, overview);
      if (res.success) {
        toast.success(`MoM approved and officially sent to ${res.sentCount} recipients!`);
        setAiMinutes((prev) => (prev ? { ...prev, sent_at: new Date().toISOString() } : null));
      } else {
        toast.error(res.error || "Failed to dispatch MoM");
      }
    });
  };

  const isPublished = Boolean(aiMinutes?.sent_at);

  return (
    <div className="rounded-lg border border-border bg-surface-elevated overflow-hidden shadow-sm">
      <div className="p-4 border-b border-border bg-surface-elevated/80 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-warning-soft text-warning-text">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              AI Minutes & Auto MoM Distribution
            </h3>
            <p className="text-[12.5px] text-muted">
              Per-point executive summaries synthesized without hallucination from running notes.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {aiMinutes && !isPublished && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-2.5 py-1 text-xs rounded border border-border hover:bg-surface text-subtle flex items-center gap-1"
            >
              <Edit2 className="w-3 h-3" /> {isEditing ? "Done Editing" : "Edit Summaries"}
            </button>
          )}
          <button
            onClick={handleGenerate}
            disabled={isPending}
            className="px-2.5 py-1 text-xs rounded border border-border hover:bg-surface text-subtle flex items-center gap-1 disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isPending ? "animate-spin" : ""}`} />
            {aiMinutes ? "Regenerate" : "Generate AI Minutes"}
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {!aiMinutes ? (
          <div className="py-8 text-center text-muted text-xs">
            <p className="font-medium text-foreground">AI Minutes not generated yet for this session.</p>
            <p className="text-[12.5px] mt-1 max-w-md mx-auto">
              Click &quot;Generate AI Minutes&quot; to automatically review running notes, status changes, tasks and decisions into structured points.
            </p>
          </div>
        ) : (
          <>
            {/* Overview Section */}
            <div className="p-3.5 rounded bg-surface border border-border text-xs">
              <span className="text-[12.5px] font-bold text-warning-text block mb-1">Executive Overview</span>
              {isEditing ? (
                <textarea
                  rows={3}
                  value={overview}
                  onChange={(e) => setOverview(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-surface-elevated border border-border rounded text-foreground text-xs focus:outline-none focus:border-theme-btn-primary"
                />
              ) : (
                <p className="text-foreground leading-relaxed">{overview}</p>
              )}
            </div>

            {/* Per-Point Summaries */}
            <div className="space-y-2.5">
              <span className="text-xs font-bold text-foreground block">
                Points Discussed ({items.length})
              </span>
              {items.map((item, idx) => (
                <div key={item.point_id || idx} className="p-3 rounded bg-surface border border-border text-xs">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-semibold text-foreground">
                      {item.point_code}: {item.title}
                    </span>
                    <div className="flex items-center gap-1.5 text-[12px]">
                      {item.carry_forward && (
                        <span className="px-1.5 py-0.2 rounded bg-warning-soft text-warning-text font-bold">
                          Carried Forward
                        </span>
                      )}
                      <span className="text-muted">
                        Sources: {(item.sources || []).join(", ")}
                      </span>
                    </div>
                  </div>

                  {isEditing ? (
                    <textarea
                      rows={2}
                      value={item.text}
                      onChange={(e) => {
                        const newItems = [...items];
                        newItems[idx].text = e.target.value;
                        setItems(newItems);
                      }}
                      className="w-full px-2 py-1 bg-surface-elevated border border-border rounded text-foreground text-xs focus:outline-none focus:border-theme-btn-primary"
                    />
                  ) : (
                    <p className="text-muted leading-relaxed">{item.text}</p>
                  )}

                  {item.tasks && item.tasks.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border/50 text-[12.5px] text-subtle">
                      <span className="font-semibold text-accent-soft-text">Action: </span>
                      {item.tasks.map((t: any, tidx: number) => (
                        <span key={tidx} className="mr-2">
                          {t.title} → {t.owner} (Due: {t.due_date})
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-border flex items-center justify-between">
              <span className="text-[12.5px] text-muted">
                {isPublished ? (
                  <span className="text-success-text flex items-center gap-1 font-semibold">
                    <Check className="w-3.5 h-3.5" /> Published & sent on {new Date(aiMinutes.sent_at!).toLocaleString()}
                  </span>
                ) : (
                  <span>Ready for review and approval</span>
                )}
              </span>

              <div className="flex items-center gap-2">
                {isEditing && (
                  <button
                    onClick={handleSaveEdits}
                    className="px-3 py-1.5 text-xs font-semibold rounded bg-surface border border-border hover:bg-surface-elevated text-foreground"
                  >
                    Save Changes
                  </button>
                )}
                {!isPublished && (
                  <button
                    onClick={handleApproveAndSend}
                    disabled={isPending}
                    className="px-4 py-1.5 text-xs font-bold rounded bg-theme-btn-primary text-theme-btn-primary-text hover:brightness-110 flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Approve and send MoM to {totalAttendeesCount} people
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

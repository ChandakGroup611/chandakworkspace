"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import { StickyNote, Send, Sparkles, AlertCircle, CheckCircle2, Copy } from "lucide-react";
import type { MeetNote, MeetNoteBlock } from "@/types/meet";
import { getOrCreateSessionNotes, addNoteBlock, generateSessionSummary, useSummaryInMoM } from "@/lib/actions/meet/notes";
import { isActionLikeText } from "@/lib/utils/meet-notes";
import { toast } from "react-toastify";

interface Props {
  sessionId: string;
}

export default function MeetingNotesCard({ sessionId }: Props) {
  const [note, setNote] = useState<MeetNote | null>(null);
  const [inputText, setInputText] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [summaryData, setSummaryData] = useState<any | null>(null);

  useEffect(() => {
    let isMounted = true;
    getOrCreateSessionNotes(sessionId).then((n) => {
      if (isMounted && n) setNote(n);
    });
    return () => {
      isMounted = false;
    };
  }, [sessionId]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!inputText.trim() || !note) return;

      const raw = inputText.trim();
      setInputText("");

      startTransition(async () => {
        const res = await addNoteBlock({
          note_id: note.id,
          text: raw,
          type: "text",
        });

        if (res.success && res.block) {
          setNote((prev) =>
            prev ? { ...prev, blocks: [...(prev.blocks || []), res.block!] } : prev
          );
        }
      });
    }
  };

  const handleOpenSummary = async () => {
    setIsSummaryOpen(true);
    const summary = await generateSessionSummary(sessionId);
    setSummaryData(summary);
  };

  const handleUseInMoM = async () => {
    startTransition(async () => {
      const res = await useSummaryInMoM(sessionId);
      if (res.success) {
        toast.success("Summary incorporated into MoM draft");
        setIsSummaryOpen(false);
      } else {
        toast.error(res.error || "Failed to update MoM");
      }
    });
  };

  const blocks = note?.blocks || [];

  return (
    <div className="rounded-lg border border-border bg-elevated overflow-hidden shadow-sm">
      <div className="p-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StickyNote className="w-4 h-4 text-theme-btn-primary" />
          <h3 className="text-xs font-bold text-foreground">Meeting Notes</h3>
          <span className="text-[12px] text-muted">({blocks.length} entries)</span>
        </div>
        <button
          onClick={handleOpenSummary}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded bg-surface border border-border hover:bg-elevated text-foreground"
        >
          <Sparkles className="w-3.5 h-3.5 text-warning-text" />
          Summary
        </button>
      </div>

      <div className="p-3 max-h-56 overflow-y-auto space-y-1.5 text-xs">
        {blocks.length === 0 ? (
          <p className="text-muted text-center py-4">No notes captured yet. Add a quick note below.</p>
        ) : (
          blocks.map((b) => (
            <div key={b.id} className="p-2 rounded bg-surface border border-border flex items-start gap-2">
              <div className="mt-1.5 w-1 h-1 rounded-full bg-muted shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-foreground">{b.text}</p>
                <div className="flex items-center gap-2 mt-1 text-[12px] text-muted">
                  <span>{new Date(b.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  {b.point?.code && <span className="text-accent-soft-text font-medium">[{b.point.code}]</span>}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-2.5 border-t border-border bg-surface flex items-center gap-2">
        <input
          type="text"
          placeholder="Add quick meeting note..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isPending}
          className="flex-1 px-2.5 py-1.5 text-xs bg-elevated border border-border rounded text-foreground placeholder:text-muted focus:outline-none focus:border-theme-btn-primary"
        />
        <button
          onClick={() => {
            if (inputText.trim()) {
              handleKeyDown({ key: "Enter", preventDefault: () => {} } as any);
            }
          }}
          disabled={!inputText.trim() || isPending}
          className="px-2.5 py-1.5 text-xs font-semibold rounded bg-theme-btn-primary text-theme-btn-primary-text hover:brightness-110 disabled:opacity-50"
        >
          <Send className="w-3 h-3" />
        </button>
      </div>

      {/* Summary Dialog */}
      {isSummaryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-elevated border border-border rounded-lg max-w-lg w-full p-5 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-warning-text" /> Session Summary
            </h3>
            <p className="text-xs text-muted leading-relaxed">
              {summaryData?.overview || "Generating summary..."}
            </p>
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <button
                onClick={() => {
                  if (summaryData?.overview) {
                    navigator.clipboard.writeText(summaryData.overview);
                    toast.success("Copied");
                  }
                }}
                className="px-3 py-1.5 text-xs rounded border border-border text-subtle flex items-center gap-1"
              >
                <Copy className="w-3.5 h-3.5" /> Copy
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsSummaryOpen(false)}
                  className="px-3 py-1.5 text-xs rounded border border-border text-subtle"
                >
                  Close
                </button>
                <button
                  onClick={handleUseInMoM}
                  className="px-4 py-1.5 text-xs font-semibold rounded bg-theme-btn-primary text-theme-btn-primary-text"
                >
                  Use in MoM
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

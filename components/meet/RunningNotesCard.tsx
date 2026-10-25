"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import { StickyNote, Send, CheckSquare, AlertCircle, CheckCircle2, Trash2, ArrowRight } from "lucide-react";
import type { MeetNote, MeetNoteBlock } from "@/types/meet";
import { getOrCreateSessionNotes, addNoteBlock, updateNoteBlock, deleteNoteBlock, isActionLikeText } from "@/lib/actions/meet/notes";
import { toast } from "react-toastify";

interface Props {
  sessionId: string;
  focusedPointId?: string | null;
  focusedPointCode?: string | null;
  onOpenConvert?: (block: MeetNoteBlock) => void;
}

export default function RunningNotesCard({
  sessionId,
  focusedPointId,
  focusedPointCode,
  onOpenConvert,
}: Props) {
  const [note, setNote] = useState<MeetNote | null>(null);
  const [inputText, setInputText] = useState("");
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load session note on mount
  useEffect(() => {
    let isMounted = true;
    getOrCreateSessionNotes(sessionId).then((n) => {
      if (isMounted && n) setNote(n);
    });
    return () => {
      isMounted = false;
    };
  }, [sessionId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [note?.blocks?.length]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!inputText.trim() || !note) return;

      const raw = inputText.trim();
      setInputText("");

      const isTodo = raw.startsWith("[] ") || raw.startsWith("- [ ] ");
      const cleanText = isTodo ? raw.replace(/^(\[\]|- \[ \])\s*/, "") : raw;

      startTransition(async () => {
        const res = await addNoteBlock({
          note_id: note.id,
          text: cleanText,
          type: isTodo ? "todo" : "text",
          point_id: focusedPointId || null,
        });

        if (res.success && res.block) {
          setNote((prev) =>
            prev
              ? {
                  ...prev,
                  blocks: [...(prev.blocks || []), res.block!],
                }
              : prev
          );
        } else {
          toast.error("Failed to capture line");
        }
      });
    }
  };

  const handleToggleDone = (block: MeetNoteBlock) => {
    const newDone = !block.done;
    startTransition(async () => {
      await updateNoteBlock(block.id, { done: newDone });
      setNote((prev) =>
        prev
          ? {
              ...prev,
              blocks: (prev.blocks || []).map((b) => (b.id === block.id ? { ...b, done: newDone } : b)),
            }
          : prev
      );
    });
  };

  const handleDelete = (blockId: string) => {
    startTransition(async () => {
      await deleteNoteBlock(blockId);
      setNote((prev) =>
        prev
          ? {
              ...prev,
              blocks: (prev.blocks || []).filter((b) => b.id !== blockId),
            }
          : prev
      );
    });
  };

  const blocks = note?.blocks || [];

  return (
    <div className="rounded-lg border border-border bg-surface-elevated flex flex-col h-full shadow-sm">
      {/* Header */}
      <div className="p-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StickyNote className="w-4 h-4 text-theme-btn-primary" />
          <h3 className="text-xs font-bold text-slate-100">Live Running Notes</h3>
          {focusedPointCode && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-medium">
              Tagging: {focusedPointCode}
            </span>
          )}
        </div>
        <span className="text-[10px] text-muted">{blocks.length} lines</span>
      </div>

      {/* Stream of Notes */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2 min-h-[160px] max-h-[280px]">
        {blocks.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center text-muted text-xs p-4">
            Type notes below. Lines automatically tag to the current point ({focusedPointCode || "General"}).
          </div>
        ) : (
          blocks.map((block) => {
            const isAction = !block.not_action && !block.linked_id && !block.done && (block.type === "todo" || isActionLikeText(block.text));

            return (
              <div
                key={block.id}
                className={`group p-2 rounded text-xs flex items-start gap-2 border transition-all ${
                  isAction
                    ? "bg-amber-500/5 border-amber-500/30"
                    : "bg-surface border-border hover:border-border-hover"
                }`}
              >
                {block.type === "todo" ? (
                  <button
                    onClick={() => handleToggleDone(block)}
                    className={`mt-0.5 text-muted hover:text-slate-100 ${block.done ? "text-emerald-400" : ""}`}
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <div className="mt-1.5 w-1 h-1 rounded-full bg-muted/60 shrink-0" />
                )}

                <div className="flex-1 min-w-0">
                  <p className={`${block.done ? "line-through text-muted" : "text-slate-100"}`}>{block.text}</p>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-muted">
                    <span>{new Date(block.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    {block.point?.code && (
                      <span className="text-blue-400 font-medium">[{block.point.code}]</span>
                    )}
                    {isAction && (
                      <span className="text-amber-400 font-semibold flex items-center gap-0.5">
                        <AlertCircle className="w-2.5 h-2.5" /> Action loop
                      </span>
                    )}
                    {block.linked_type && (
                      <span className="text-emerald-400 font-bold">✓ {block.linked_type}</span>
                    )}
                  </div>
                </div>

                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
                  {onOpenConvert && !block.linked_type && (
                    <button
                      onClick={() => onOpenConvert(block)}
                      className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-surface-elevated border border-border hover:bg-surface text-theme-btn-primary"
                    >
                      Convert
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(block.id)}
                    className="p-1 text-muted hover:text-rose-400"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <div className="p-2.5 border-t border-border bg-surface flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          placeholder={`Type running note (tags to ${focusedPointCode || "session"})...`}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isPending}
          className="flex-1 px-2.5 py-1.5 text-xs bg-surface-elevated border border-border rounded text-slate-100 placeholder:text-muted focus:outline-none focus:border-theme-btn-primary"
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
    </div>
  );
}

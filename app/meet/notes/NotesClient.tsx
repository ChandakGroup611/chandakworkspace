"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import Link from "next/link";
import {
  StickyNote, Plus, Search, Pin, Share2, Tag, CheckSquare, Sparkles,
  ArrowRight, AlertCircle, CheckCircle2, Clock, Calendar, Video,
  Trash2, X, RefreshCw, Send, Lock, Copy, Check, Filter
} from "lucide-react";
import type { MeetNote, MeetNoteBlock } from "@/types/meet";
import {
  addNoteBlock, updateNoteBlock, deleteNoteBlock,
  convertBlockToItem, createPersonalNote, generateSessionSummary,
  useSummaryInMoM
} from "@/lib/actions/meet/notes";
import { isActionLikeText } from "@/lib/utils/meet-notes";
import { toast } from "react-toastify";
import { MeetHeader } from "@/components/meet/MeetHeader";

interface Props {
  initialNotes: MeetNote[];
  masters: any;
  initialKind?: string;
}

export default function NotesClient({ initialNotes, masters, initialKind = "all" }: Props) {
  const [notes, setNotes] = useState<MeetNote[]>(initialNotes);
  const [selectedNoteId, setSelectedNoteId] = useState<string>(initialNotes[0]?.id || "");
  const [activeTab, setActiveTab] = useState<string>(initialKind);
  const [searchQuery, setSearchQuery] = useState("");
  const [inputText, setInputText] = useState("");
  const [isPending, startTransition] = useTransition();

  // Summary Modal state
  const [summaryData, setSummaryData] = useState<any | null>(null);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);

  // Conversion Modal state
  const [convertBlock, setConvertBlock] = useState<MeetNoteBlock | null>(null);
  const [convertType, setConvertType] = useState<"task" | "point" | "decision">("task");
  const [convertTitle, setConvertTitle] = useState("");
  const [convertOwnerId, setConvertOwnerId] = useState("");
  const [convertTat, setConvertTat] = useState(3);
  const [convertPointId, setConvertPointId] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);
  const blocksEndRef = useRef<HTMLDivElement>(null);

  const selectedNote = notes.find((n) => n.id === selectedNoteId) || notes[0] || null;

  // Filter notes
  const filteredNotes = notes.filter((n) => {
    if (activeTab === "meetings" && n.kind !== "session") return false;
    if (activeTab === "mine" && n.kind !== "personal") return false;
    if (activeTab === "open_loops" && (!n.open_loops_count || n.open_loops_count === 0)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = n.title.toLowerCase().includes(q);
      const matchBlock = (n.blocks || []).some((b) => b.text.toLowerCase().includes(q));
      if (!matchTitle && !matchBlock) return false;
    }
    return true;
  });

  // Keep selected note valid
  useEffect(() => {
    if (filteredNotes.length > 0 && (!selectedNoteId || !filteredNotes.some(n => n.id === selectedNoteId))) {
      setSelectedNoteId(filteredNotes[0].id);
    }
  }, [filteredNotes, selectedNoteId]);

  // Scroll to bottom on block addition
  useEffect(() => {
    blocksEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedNote?.blocks?.length]);

  // Keyboard shortcut for adding block
  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!inputText.trim() || !selectedNote) return;

      const raw = inputText.trim();
      setInputText("");

      // Inline syntax checks
      if (raw.startsWith("/task ")) {
        const title = raw.replace("/task ", "").trim();
        openConversionDirect(title, "task");
        return;
      }
      if (raw.startsWith("/point ")) {
        const title = raw.replace("/point ", "").trim();
        openConversionDirect(title, "point");
        return;
      }
      if (raw.startsWith("/decision ")) {
        const title = raw.replace("/decision ", "").trim();
        openConversionDirect(title, "decision");
        return;
      }

      const isTodo = raw.startsWith("[] ") || raw.startsWith("- [ ] ");
      const cleanText = isTodo ? raw.replace(/^(\[\]|- \[ \])\s*/, "") : raw;

      startTransition(async () => {
        const res = await addNoteBlock({
          note_id: selectedNote.id,
          text: cleanText,
          type: isTodo ? "todo" : "text",
        });

        if (res.success && res.block) {
          setNotes((prev) =>
            prev.map((n) =>
              n.id === selectedNote.id
                ? {
                    ...n,
                    blocks: [...(n.blocks || []), res.block!],
                    open_loops_count: (n.open_loops_count || 0) + (isTodo || isActionLikeText(cleanText) ? 1 : 0),
                  }
                : n
            )
          );
        } else {
          toast.error("Failed to add note line");
        }
      });
    }
  };

  const handleCreatePersonalNote = () => {
    const title = prompt("Enter title for new personal note:", "New note");
    if (!title) return;

    startTransition(async () => {
      const res = await createPersonalNote(title);
      if (res.success && res.note) {
        setNotes((prev) => [res.note!, ...prev]);
        setSelectedNoteId(res.note.id);
        toast.success("Created personal note");
      }
    });
  };

  const handleToggleDone = (block: MeetNoteBlock) => {
    const newDone = !block.done;
    startTransition(async () => {
      await updateNoteBlock(block.id, { done: newDone });
      setNotes((prev) =>
        prev.map((n) =>
          n.id === selectedNote?.id
            ? {
                ...n,
                blocks: (n.blocks || []).map((b) => (b.id === block.id ? { ...b, done: newDone } : b)),
                open_loops_count: Math.max(0, (n.open_loops_count || 0) + (newDone ? -1 : 1)),
              }
            : n
        )
      );
    });
  };

  const handleDismissAction = (block: MeetNoteBlock) => {
    startTransition(async () => {
      await updateNoteBlock(block.id, { not_action: true });
      setNotes((prev) =>
        prev.map((n) =>
          n.id === selectedNote?.id
            ? {
                ...n,
                blocks: (n.blocks || []).map((b) => (b.id === block.id ? { ...b, not_action: true } : b)),
                open_loops_count: Math.max(0, (n.open_loops_count || 0) - 1),
              }
            : n
        )
      );
      toast.success("Marked as not an action item");
    });
  };

  const handleDeleteBlock = (blockId: string) => {
    startTransition(async () => {
      await deleteNoteBlock(blockId);
      setNotes((prev) =>
        prev.map((n) =>
          n.id === selectedNote?.id
            ? {
                ...n,
                blocks: (n.blocks || []).filter((b) => b.id !== blockId),
              }
            : n
        )
      );
    });
  };

  const openConversion = (block: MeetNoteBlock, type: "task" | "point" | "decision") => {
    setConvertBlock(block);
    setConvertType(type);
    setConvertTitle(block.text);
    setConvertOwnerId("");
    setConvertTat(3);
    setConvertPointId(block.point_id || "");
  };

  const openConversionDirect = (title: string, type: "task" | "point" | "decision") => {
    startTransition(async () => {
      if (!selectedNote) return;
      const blockRes = await addNoteBlock({
        note_id: selectedNote.id,
        text: title,
        type: "text",
      });
      if (blockRes.success && blockRes.block) {
        setNotes((prev) =>
          prev.map((n) =>
            n.id === selectedNote.id
              ? { ...n, blocks: [...(n.blocks || []), blockRes.block!] }
              : n
          )
        );
        openConversion(blockRes.block, type);
      }
    });
  };

  const executeConversion = async () => {
    if (!convertBlock || !selectedNote) return;

    startTransition(async () => {
      const res = await convertBlockToItem(convertBlock.id, convertType, {
        meeting_id: selectedNote.meeting_id || "",
        session_id: selectedNote.session_id || "",
        title: convertTitle,
        owner_id: convertOwnerId || undefined,
        tat_days: convertTat,
        point_id: convertPointId || undefined,
      });

      if (res.success && res.linked_item) {
        setNotes((prev) =>
          prev.map((n) =>
            n.id === selectedNote.id
              ? {
                  ...n,
                  blocks: (n.blocks || []).map((b) =>
                    b.id === convertBlock.id
                      ? {
                          ...b,
                          linked_type: convertType,
                          linked_item: res.linked_item,
                          not_action: true,
                        }
                      : b
                  ),
                  open_loops_count: Math.max(0, (n.open_loops_count || 0) - 1),
                }
              : n
          )
        );
        toast.success(`Converted to ${convertType}: ${res.linked_item.code}`);
        setConvertBlock(null);
      } else {
        toast.error(res.error || "Conversion failed");
      }
    });
  };

  const handleOpenSummary = async () => {
    if (!selectedNote?.session_id) {
      toast.error("Summary is available for meeting session notes.");
      return;
    }
    setIsSummarizing(true);
    setIsSummaryOpen(true);
    const summary = await generateSessionSummary(selectedNote.session_id);
    setSummaryData(summary);
    setIsSummarizing(false);
  };

  const handleUseInMoM = async () => {
    if (!selectedNote?.session_id) return;
    startTransition(async () => {
      const res = await useSummaryInMoM(selectedNote.session_id!);
      if (res.success) {
        toast.success("Summary incorporated into MoM draft");
        setIsSummaryOpen(false);
      } else {
        toast.error(res.error || "Failed to update MoM");
      }
    });
  };

  const totalOpenLoops = notes.reduce((acc, n) => acc + (n.open_loops_count || 0), 0);

  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)] bg-surface text-foreground">
      <div className="p-4 sm:p-6 border-b border-border bg-elevated">
        <MeetHeader
          title="Notes"
          description="Meeting notes and your own notes. Lines that sound like an action can be turned into a task or point."
          actions={
            <div className="flex items-center gap-2">
              <button
                onClick={handleCreatePersonalNote}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-theme-btn-primary text-theme-btn-primary-text hover:brightness-110 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                New Personal Note
              </button>
            </div>
          }
        />
      </div>

      {/* Main Two-Column Layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Column: Filter & Notes List */}
        <div className="w-full md:w-80 lg:w-96 border-r border-border flex flex-col bg-surface/50">
          {/* Search bar */}
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted" />
              <input
                type="text"
                placeholder="Search notes"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-elevated border border-border rounded text-foreground placeholder:text-muted focus:outline-none focus:border-theme-btn-primary"
              />
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 p-2 border-b border-border bg-elevated/40 text-xs">
            {[
              { id: "all", label: "All" },
              { id: "meetings", label: "Meetings" },
              { id: "mine", label: "Mine" },
              {
                id: "open_loops",
                label: `Open Loops (${totalOpenLoops})`,
                alert: totalOpenLoops > 0,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-theme-btn-primary text-theme-btn-primary-text font-semibold shadow-sm"
                    : tab.alert
                    ? "text-warning-text hover:bg-elevated"
                    : "text-muted hover:text-foreground hover:bg-elevated"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Notes List */}
          <div className="flex-1 overflow-y-auto divide-y divide-border">
            {filteredNotes.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted">
                No notes found matching your criteria.
              </div>
            ) : (
              filteredNotes.map((note) => {
                const isSelected = note.id === selectedNote?.id;
                const openLoops = note.open_loops_count || 0;
                return (
                  <button
                    key={note.id}
                    onClick={() => setSelectedNoteId(note.id)}
                    className={`w-full text-left p-3.5 transition-colors flex flex-col gap-1.5 ${
                      isSelected
                        ? "bg-theme-btn-primary/10 border-l-2 border-theme-btn-primary"
                        : "hover:bg-elevated/50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {note.pinned && <Pin className="w-3.5 h-3.5 text-warning-text shrink-0" />}
                        {note.kind === "session" ? (
                          <Video className="w-3.5 h-3.5 text-accent-soft-text shrink-0" />
                        ) : (
                          <StickyNote className="w-3.5 h-3.5 text-success-text shrink-0" />
                        )}
                        <span className="text-xs font-semibold text-foreground truncate">
                          {note.title}
                        </span>
                      </div>
                      {openLoops > 0 && (
                        <span className="px-1.5 py-0.5 text-[12px] font-bold rounded bg-warning-soft text-warning-text shrink-0">
                          {openLoops} loop{openLoops > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[12.5px] text-muted">
                      <span>{note.kind === "session" ? "Session Note" : "Personal Note"}</span>
                      <span>{new Date(note.updated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Active Note Editor */}
        <div className="flex-1 flex flex-col bg-surface overflow-hidden">
          {selectedNote ? (
            <>
              {/* Note Header */}
              <div className="p-4 border-b border-border bg-elevated flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded bg-surface border border-border">
                    {selectedNote.kind === "session" ? (
                      <Video className="w-4 h-4 text-accent-soft-text" />
                    ) : (
                      <StickyNote className="w-4 h-4 text-success-text" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-foreground truncate">{selectedNote.title}</h2>
                    <div className="flex items-center gap-2 text-xs text-muted mt-0.5">
                      <span>{selectedNote.kind === "session" ? "Shared Session Notes" : "Private Scratchpad"}</span>
                      {selectedNote.session && (
                        <Link
                          href={`/meet/sessions/${selectedNote.session.id}`}
                          className="text-theme-btn-primary hover:underline flex items-center gap-1"
                        >
                          View Session ({selectedNote.session.code})
                        </Link>
                      )}
                      <span>·</span>
                      <span>{(selectedNote.blocks || []).length} blocks</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {selectedNote.kind === "session" && (
                    <button
                      onClick={handleOpenSummary}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-surface border border-border hover:bg-elevated text-foreground"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-warning-text" />
                      Summary
                    </button>
                  )}
                  {selectedNote.kind === "session" && (
                    <Link
                      href={`/meet/live/${selectedNote.session_id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-theme-btn-primary text-theme-btn-primary-text hover:brightness-110"
                    >
                      <Video className="w-3.5 h-3.5" />
                      Open Live Mode
                    </Link>
                  )}
                </div>
              </div>

              {/* Note Blocks Canvas */}
              <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-2">
                {(!selectedNote.blocks || selectedNote.blocks.length === 0) ? (
                  <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-muted">
                    <StickyNote className="w-8 h-8 mb-2 opacity-40" />
                    <p className="text-xs font-medium">No notes written yet.</p>
                    <p className="text-[12.5px] mt-1 max-w-sm">
                      Type below and press Enter. Use inline commands <code className="text-theme-btn-primary">/task</code>,{" "}
                      <code className="text-theme-btn-primary">/point</code>, or <code className="text-theme-btn-primary">[]</code> to capture actions instantly.
                    </p>
                  </div>
                ) : (
                  selectedNote.blocks.map((block) => {
                    const looksAction = !block.not_action && !block.linked_id && !block.done && (block.type === "todo" || isActionLikeText(block.text));

                    return (
                      <div
                        key={block.id}
                        className={`group p-2.5 rounded border transition-all flex items-start gap-3 ${
                          looksAction
                            ? "bg-warning-soft border-warning-border"
                            : "bg-elevated/40 border-border hover:border-border-active"
                        }`}
                      >
                        {/* Block Type Trigger */}
                        {block.type === "todo" ? (
                          <button
                            onClick={() => handleToggleDone(block)}
                            className={`mt-0.5 rounded text-muted hover:text-foreground ${
                              block.done ? "text-success-text" : ""
                            }`}
                          >
                            <CheckSquare className="w-4 h-4" />
                          </button>
                        ) : (
                          <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-muted/60 shrink-0" />
                        )}

                        {/* Text and Badges */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs ${block.done ? "line-through text-muted" : "text-foreground"}`}>
                            {block.text}
                          </p>

                          <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[12px]">
                            <span className="text-muted">
                              {new Date(block.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            {block.author?.full_name && (
                              <span className="text-muted">by {block.author.full_name}</span>
                            )}
                            {block.point && (
                              <span className="px-1.5 py-0.5 rounded bg-accent-soft text-accent-soft-text font-medium">
                                {block.point.code} ({block.point.title})
                              </span>
                            )}
                            {looksAction && (
                              <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-warning-soft text-warning-text font-semibold">
                                  <AlertCircle className="w-3 h-3" />
                                  Looks like an action
                                </span>
                                <button
                                  onClick={() => handleDismissAction(block)}
                                  className="text-muted hover:text-foreground underline"
                                >
                                  Not an action
                                </button>
                              </div>
                            )}
                            {block.linked_type && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-success-soft text-success-text font-bold">
                                <CheckCircle2 className="w-3 h-3" />
                                Converted to {block.linked_type}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Line Actions (Hover on Desktop) */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
                          {!block.linked_type && (
                            <>
                              <button
                                onClick={() => openConversion(block, "task")}
                                className="px-2 py-1 text-[12px] font-semibold rounded bg-surface border border-border hover:bg-elevated text-accent-soft-text"
                              >
                                → Task
                              </button>
                              <button
                                onClick={() => openConversion(block, "point")}
                                className="px-2 py-1 text-[12px] font-semibold rounded bg-surface border border-border hover:bg-elevated text-purple-400"
                              >
                                → Point
                              </button>
                              <button
                                onClick={() => openConversion(block, "decision")}
                                className="px-2 py-1 text-[12px] font-semibold rounded bg-surface border border-border hover:bg-elevated text-warning-text"
                              >
                                → Decision
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleDeleteBlock(block.id)}
                            className="p-1 text-muted hover:text-danger-text rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={blocksEndRef} />
              </div>

              {/* Fast Line Input Bar */}
              <div className="p-4 border-t border-border bg-elevated">
                <div className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Type note line... (/task, /point, /decision, or [] for todo) and press Enter"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isPending}
                    className="flex-1 px-3 py-2 text-xs bg-surface border border-border rounded text-foreground placeholder:text-muted focus:outline-none focus:border-theme-btn-primary shadow-inner"
                  />
                  <button
                    onClick={() => {
                      if (inputText.trim()) {
                        handleKeyDown({ key: "Enter", preventDefault: () => {} } as any);
                      }
                    }}
                    disabled={!inputText.trim() || isPending}
                    className="px-3.5 py-2 text-xs font-semibold rounded bg-theme-btn-primary text-theme-btn-primary-text hover:brightness-110 disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Send
                  </button>
                </div>
                <div className="flex items-center justify-between text-[12.5px] text-muted mt-2 px-1">
                  <span>Fast capture: Enter saves line · /task opens task modal · /point creates point</span>
                  <span className="flex items-center gap-1 text-success-text">
                    <Check className="w-3 h-3" /> Autosaved
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted">
              <StickyNote className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm font-semibold text-foreground">No Note Selected</p>
              <p className="text-xs mt-1">Select a note from the left sidebar or create a new personal note.</p>
            </div>
          )}
        </div>
      </div>

      {/* Convert Line Modal */}
      {convertBlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-elevated border border-border rounded-lg max-w-md w-full p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-sm font-bold text-foreground">
                Convert Note Line to {convertType.toUpperCase()}
              </h3>
              <button onClick={() => setConvertBlock(null)} className="text-muted hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 py-4 text-xs">
              <div>
                <label className="block text-muted font-medium mb-1">Title</label>
                <input
                  type="text"
                  value={convertTitle}
                  onChange={(e) => setConvertTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-surface border border-border rounded text-foreground focus:outline-none focus:border-theme-btn-primary"
                />
              </div>

              {convertType === "task" && (
                <>
                  <div>
                    <label className="block text-muted font-medium mb-1">Under Point *</label>
                    <select
                      value={convertPointId}
                      onChange={(e) => setConvertPointId(e.target.value)}
                      className="w-full px-3 py-2 bg-surface border border-border rounded text-foreground focus:outline-none focus:border-theme-btn-primary"
                    >
                      <option value="">Select point...</option>
                      {(selectedNote?.blocks || [])
                        .filter((b) => b.point_id && b.point)
                        .map((b) => (
                          <option key={b.point_id!} value={b.point_id!}>
                            {b.point?.code} - {b.point?.title}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-muted font-medium mb-1">Owner</label>
                    <select
                      value={convertOwnerId}
                      onChange={(e) => setConvertOwnerId(e.target.value)}
                      className="w-full px-3 py-2 bg-surface border border-border rounded text-foreground focus:outline-none focus:border-theme-btn-primary"
                    >
                      <option value="">Assign to...</option>
                      {(masters.users || []).map((u: any) => (
                        <option key={u.id} value={u.id}>
                          {u.full_name} ({u.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-muted font-medium mb-1">TAT Working Days</label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={convertTat}
                      onChange={(e) => setConvertTat(parseInt(e.target.value, 10) || 1)}
                      className="w-full px-3 py-2 bg-surface border border-border rounded text-foreground focus:outline-none focus:border-theme-btn-primary"
                    />
                  </div>
                </>
              )}

              {convertType === "point" && (
                <div>
                  <label className="block text-muted font-medium mb-1">Owner</label>
                  <select
                    value={convertOwnerId}
                    onChange={(e) => setConvertOwnerId(e.target.value)}
                    className="w-full px-3 py-2 bg-surface border border-border rounded text-foreground focus:outline-none focus:border-theme-btn-primary"
                  >
                    <option value="">Assign to...</option>
                    {(masters.users || []).map((u: any) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                onClick={() => setConvertBlock(null)}
                className="px-3 py-1.5 text-xs rounded border border-border hover:bg-surface text-subtle"
              >
                Cancel
              </button>
              <button
                onClick={executeConversion}
                disabled={isPending || (convertType === "task" && !convertPointId)}
                className="px-4 py-1.5 text-xs font-semibold rounded bg-theme-btn-primary text-theme-btn-primary-text hover:brightness-110 disabled:opacity-50"
              >
                Confirm Conversion
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Structured Summary Modal (D2.7) */}
      {isSummaryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-elevated border border-border rounded-lg max-w-2xl w-full p-6 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-warning-text" />
                <h3 className="text-sm font-bold text-foreground">Automated Meeting Summary</h3>
              </div>
              <button onClick={() => setIsSummaryOpen(false)} className="text-muted hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs">
              {isSummarizing ? (
                <div className="py-12 text-center text-muted flex flex-col items-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-theme-btn-primary" />
                  Generating structured summary from notes, points, and decisions...
                </div>
              ) : summaryData ? (
                <>
                  <div className="p-3 rounded bg-surface border border-border">
                    <h4 className="font-bold text-foreground mb-1">Summary</h4>
                    <p className="text-muted leading-relaxed">{summaryData.overview}</p>
                  </div>

                  <div>
                    <h4 className="font-bold text-foreground mb-2">Points Discussed ({summaryData.pointsDiscussed?.length || 0})</h4>
                    <div className="space-y-2">
                      {summaryData.pointsDiscussed?.map((pt: any) => (
                        <div key={pt.id} className="p-2.5 rounded bg-surface border border-border">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-foreground">{pt.code}: {pt.title}</span>
                            <span className="px-1.5 py-0.5 rounded bg-elevated text-[12px] text-muted capitalize">
                              {pt.status}
                            </span>
                          </div>
                          {pt.tagged_notes?.length > 0 && (
                            <ul className="list-disc pl-4 mt-1.5 text-[12.5px] text-muted space-y-0.5">
                              {pt.tagged_notes.map((noteText: string, idx: number) => (
                                <li key={idx}>{noteText}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {summaryData.decisions?.length > 0 && (
                    <div>
                      <h4 className="font-bold text-foreground mb-2">Decisions Taken ({summaryData.decisions.length})</h4>
                      <div className="space-y-1.5">
                        {summaryData.decisions.map((d: any) => (
                          <div key={d.id} className="p-2 rounded bg-surface border border-border flex items-center justify-between">
                            <span className="font-medium text-foreground">{d.code}: {d.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {summaryData.actionItems?.length > 0 && (
                    <div>
                      <h4 className="font-bold text-foreground mb-2">Action Items ({summaryData.actionItems.length})</h4>
                      <div className="space-y-1.5">
                        {summaryData.actionItems.map((t: any) => (
                          <div key={t.id} className="p-2 rounded bg-surface border border-border flex items-center justify-between">
                            <span className="font-medium text-foreground">{t.code}: {t.title}</span>
                            <span className="text-[12px] text-muted">Due: {t.due_date} ({t.owner?.full_name || "Unassigned"})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border">
              <button
                onClick={() => {
                  if (summaryData?.overview) {
                    navigator.clipboard.writeText(summaryData.overview);
                    toast.success("Summary overview copied to clipboard");
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border border-border hover:bg-surface text-subtle"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy Overview
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsSummaryOpen(false)}
                  className="px-3 py-1.5 text-xs rounded border border-border hover:bg-surface text-subtle"
                >
                  Close
                </button>
                <button
                  onClick={handleUseInMoM}
                  disabled={isPending || !summaryData}
                  className="px-4 py-1.5 text-xs font-semibold rounded bg-theme-btn-primary text-theme-btn-primary-text hover:brightness-110 disabled:opacity-50"
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

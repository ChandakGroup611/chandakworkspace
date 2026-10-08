"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCw,
  Hand,
  MousePointer,
  Cloud,
  ArrowUpRight,
  MessageSquarePlus,
  Square,
  Ruler,
  PenTool,
  Download,
  Eye,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  X,
  Send,
  Trash2,
  Save,
  Check,
  ChevronRight,
  Layers,
  FileText,
  Building2,
  Calendar,
  Sparkles,
  Info
} from "lucide-react";
import { AppCard, AppCardContent, AppCardHeader, AppCardTitle } from "@/components/ui/AppCard";
import {
  createMarkupCommentAction,
  updateMarkupCommentAction,
  deleteMarkupCommentAction,
  addCommentThreadReplyAction,
  reviewDrawingRevisionAction
} from "@/lib/actions/dmac-drawings";

export type MarkupTool =
  | "select"
  | "pan"
  | "cloud"
  | "arrow"
  | "callout"
  | "rect"
  | "measure"
  | "pen";

export interface MarkupGeometry {
  id?: string;
  tool: MarkupTool;
  x: number; // 0..1 normalized coordinate
  y: number; // 0..1 normalized coordinate
  width?: number; // 0..1 normalized width
  height?: number; // 0..1 normalized height
  points?: { x: number; y: number }[]; // for freehand/cloud
  arrowEnd?: { x: number; y: number }; // for arrow
  commentNumber?: number;
  color?: string;
  strokeWidth?: number;
  measurementValue?: string;
}

export interface DrawingCommentItem {
  id: string;
  revision_id: string;
  comment_number: number;
  category: "DESIGN" | "COORDINATION" | "COMPLIANCE" | "DRAFTING";
  severity: "LOW" | "MEDIUM" | "HIGH" | "BLOCKER";
  comment_text: string;
  markup_geometry?: MarkupGeometry | null;
  status: "OPEN" | "RESOLVED" | "CLOSED";
  created_at?: string;
  author_role?: string;
  author_email?: string;
  dmac_comment_threads?: {
    id: string;
    author_id?: string;
    author_role?: string;
    author_email?: string;
    message: string;
    created_at: string;
  }[];
}

export interface DrawingMarkupViewerProps {
  isOpen: boolean;
  onClose: () => void;
  drawing: {
    id: string;
    drawingNumber: string;
    title: string;
    discipline: string;
    project?: string;
    currentStatus?: string;
    currentHolder?: string;
    latestRevNo?: number | null;
  };
  revisions?: {
    id: string;
    rev_no: number;
    is_superseded: boolean;
    is_gfc: boolean;
    dmac_revision_files?: {
      id: string;
      file_role: string;
      storage_key: string;
      file_name: string;
      file_size_bytes: number;
    }[];
  }[];
  initialComments?: DrawingCommentItem[];
  fileUrl?: string;
  userRole?: string;
  onDecisionCommitted?: () => void;
}

const COLOR_PALETTE = [
  { name: "Crimson Red", value: "#e11d48" },
  { name: "Amber Alert", value: "#d97706" },
  { name: "Cobalt Blue", value: "#2563eb" },
  { name: "Emerald Green", value: "#059669" },
  { name: "Royal Purple", value: "#9333ea" },
];

export const DrawingMarkupViewer: React.FC<DrawingMarkupViewerProps> = ({
  isOpen,
  onClose,
  drawing,
  revisions = [],
  initialComments = [],
  fileUrl,
  userRole = "ENGINEERING_REVIEWER",
  onDecisionCommitted,
}) => {
  const [activeRevId, setActiveRevId] = useState<string>(
    revisions.length > 0 ? revisions[revisions.length - 1].id : ""
  );
  const [activeTool, setActiveTool] = useState<MarkupTool>("select");
  const [activeColor, setActiveColor] = useState<string>("#e11d48");
  const [strokeWidth, setStrokeWidth] = useState<number>(3);
  const [zoom, setZoom] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [rotation, setRotation] = useState<number>(0);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const [comments, setComments] = useState<DrawingCommentItem[]>(initialComments);
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>("ALL");

  // Draft Markup during creation
  const [currentDraftMarkup, setCurrentDraftMarkup] = useState<MarkupGeometry | null>(null);
  const [draftCategory, setDraftCategory] = useState<"DESIGN" | "COORDINATION" | "COMPLIANCE" | "DRAFTING">("DESIGN");
  const [draftSeverity, setDraftSeverity] = useState<"LOW" | "MEDIUM" | "HIGH" | "BLOCKER">("MEDIUM");
  const [draftCommentText, setDraftCommentText] = useState<string>("");
  const [isSavingComment, setIsSavingComment] = useState<boolean>(false);

  // Thread reply text per comment
  const [replyTextMap, setReplyTextMap] = useState<Record<string, string>>({});
  const [isSubmittingReply, setIsSubmittingReply] = useState<boolean>(false);

  // Decision Modal State
  const [showDecisionDrawer, setShowDecisionDrawer] = useState<boolean>(false);
  const [decisionCode, setDecisionCode] = useState<"A" | "B" | "C" | "D">("B");
  const [decisionRemarks, setDecisionRemarks] = useState<string>("");
  const [isCommittingDecision, setIsCommittingDecision] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    setComments(initialComments);
  }, [initialComments]);

  useEffect(() => {
    if (revisions.length > 0 && !activeRevId) {
      setActiveRevId(revisions[revisions.length - 1].id);
    }
  }, [revisions, activeRevId]);

  // Zoom Helpers
  const handleZoom = (delta: number) => {
    setZoom((prev) => Math.min(Math.max(0.2, Number((prev + delta).toFixed(2))), 4.0));
  };

  const handleResetZoom = () => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
    setRotation(0);
  };

  // Pan & Canvas Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.clientX;
    const clientY = e.clientY;

    if (activeTool === "pan" || e.button === 1 || e.altKey) {
      setIsPanning(true);
      setPanStart({ x: clientX - panOffset.x, y: clientY - panOffset.y });
      return;
    }

    if (activeTool === "select") return;

    // Start drawing markup in normalized coordinates (0..1)
    const normX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const normY = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));

    if (activeTool === "callout") {
      const nextNo = comments.length + 1;
      const newMarkup: MarkupGeometry = {
        tool: "callout",
        x: normX,
        y: normY,
        commentNumber: nextNo,
        color: activeColor,
        strokeWidth,
      };
      setCurrentDraftMarkup(newMarkup);
      setDraftCommentText("");
      return;
    }

    if (activeTool === "rect") {
      setCurrentDraftMarkup({
        tool: "rect",
        x: normX,
        y: normY,
        width: 0.001,
        height: 0.001,
        color: activeColor,
        strokeWidth,
      });
    } else if (activeTool === "cloud") {
      setCurrentDraftMarkup({
        tool: "cloud",
        x: normX,
        y: normY,
        width: 0.001,
        height: 0.001,
        points: [{ x: normX, y: normY }],
        color: activeColor,
        strokeWidth,
      });
    } else if (activeTool === "arrow") {
      setCurrentDraftMarkup({
        tool: "arrow",
        x: normX,
        y: normY,
        arrowEnd: { x: normX + 0.01, y: normY + 0.01 },
        color: activeColor,
        strokeWidth,
      });
    } else if (activeTool === "measure") {
      setCurrentDraftMarkup({
        tool: "measure",
        x: normX,
        y: normY,
        arrowEnd: { x: normX + 0.01, y: normY + 0.01 },
        measurementValue: "0 mm",
        color: activeColor,
        strokeWidth,
      });
    } else if (activeTool === "pen") {
      setCurrentDraftMarkup({
        tool: "pen",
        x: normX,
        y: normY,
        points: [{ x: normX, y: normY }],
        color: activeColor,
        strokeWidth,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isPanning) {
      setPanOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
      return;
    }

    if (!currentDraftMarkup || !canvasRef.current || activeTool === "select" || activeTool === "callout") return;

    const rect = canvasRef.current.getBoundingClientRect();
    const normX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const normY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    if (currentDraftMarkup.tool === "rect" || currentDraftMarkup.tool === "cloud") {
      const startX = currentDraftMarkup.x;
      const startY = currentDraftMarkup.y;
      const width = Math.abs(normX - startX);
      const height = Math.abs(normY - startY);
      const minX = Math.min(startX, normX);
      const minY = Math.min(startY, normY);

      setCurrentDraftMarkup((prev) =>
        prev
          ? {
              ...prev,
              x: minX,
              y: minY,
              width,
              height,
            }
          : null
      );
    } else if (currentDraftMarkup.tool === "arrow" || currentDraftMarkup.tool === "measure") {
      const dx = (normX - currentDraftMarkup.x) * 10000; // Simulated engineering mm
      const dy = (normY - currentDraftMarkup.y) * 10000;
      const lengthMm = Math.round(Math.sqrt(dx * dx + dy * dy));

      setCurrentDraftMarkup((prev) =>
        prev
          ? {
              ...prev,
              arrowEnd: { x: normX, y: normY },
              measurementValue: `${lengthMm.toLocaleString()} mm`,
            }
          : null
      );
    } else if (currentDraftMarkup.tool === "pen") {
      setCurrentDraftMarkup((prev) =>
        prev
          ? {
              ...prev,
              points: [...(prev.points || []), { x: normX, y: normY }],
            }
          : null
      );
    }
  };

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (currentDraftMarkup && activeTool !== "callout" && !currentDraftMarkup.commentNumber) {
      const nextNo = comments.length + 1;
      setCurrentDraftMarkup((prev) => (prev ? { ...prev, commentNumber: nextNo } : null));
    }
  };

  // Commit Draft Markup to Server & Comments List
  const handleSaveDraftComment = async () => {
    if (!draftCommentText.trim() || !currentDraftMarkup) return;
    setIsSavingComment(true);

    const activeRev = revisions.find((r) => r.id === activeRevId) || revisions[0];
    if (!activeRev) {
      setIsSavingComment(false);
      return;
    }

    try {
      const res = await createMarkupCommentAction({
        revisionId: activeRev.id,
        category: draftCategory,
        severity: draftSeverity,
        commentText: draftCommentText,
        markupGeometry: {
          tool: (currentDraftMarkup.tool === "pen" ? "freehand" : currentDraftMarkup.tool) as "cloud" | "arrow" | "callout" | "rect" | "freehand" | "measure",
          x: currentDraftMarkup.x,
          y: currentDraftMarkup.y,
          width: currentDraftMarkup.width,
          height: currentDraftMarkup.height,
          points: currentDraftMarkup.points,
          arrowEnd: currentDraftMarkup.arrowEnd,
          measurementValue: currentDraftMarkup.measurementValue,
          color: currentDraftMarkup.color || activeColor,
          strokeWidth: currentDraftMarkup.strokeWidth || strokeWidth,
        },
      });

      if (res.success && res.comment) {
        const created: DrawingCommentItem = {
          ...res.comment,
          markup_geometry: res.comment.markup_geometry || currentDraftMarkup,
          dmac_comment_threads: [],
        };
        setComments((prev) => [...prev, created]);
        setSelectedCommentId(created.id);
        setCurrentDraftMarkup(null);
        setDraftCommentText("");
        setActiveTool("select");
      } else {
        alert(res.error || "Failed to save comment");
      }
    } catch (err: any) {
      console.error("Save comment error:", err);
    } finally {
      setIsSavingComment(false);
    }
  };

  const handleCancelDraft = () => {
    setCurrentDraftMarkup(null);
    setDraftCommentText("");
    setActiveTool("select");
  };

  // Submit Thread Reply
  const handleAddThreadReply = async (commentId: string) => {
    const text = replyTextMap[commentId];
    if (!text || !text.trim()) return;
    setIsSubmittingReply(true);

    try {
      const res = await addCommentThreadReplyAction({
        commentId,
        message: text.trim(),
        authorRole: userRole,
      });

      if (res.success && res.reply) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === commentId
              ? {
                  ...c,
                  dmac_comment_threads: [...(c.dmac_comment_threads || []), res.reply],
                }
              : c
          )
        );
        setReplyTextMap((prev) => ({ ...prev, [commentId]: "" }));
      }
    } catch (err: any) {
      console.error("Thread reply error:", err);
    } finally {
      setIsSubmittingReply(false);
    }
  };

  // Delete Comment
  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment and its markup?")) return;
    try {
      const res = await deleteMarkupCommentAction(commentId);
      if (res.success) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
        if (selectedCommentId === commentId) setSelectedCommentId(null);
      }
    } catch (err: any) {
      console.error("Delete comment error:", err);
    }
  };

  // Commit Decision (Code A/B/C/D)
  const handleCommitReviewDecision = async () => {
    if (!decisionRemarks.trim() && (decisionCode === "C" || decisionCode === "D")) {
      alert("Remarks are mandatory when returning drawings for revision.");
      return;
    }
    const activeRev = revisions.find((r) => r.id === activeRevId) || revisions[0];
    if (!activeRev) return;

    setIsCommittingDecision(true);
    try {
      const res = await reviewDrawingRevisionAction({
        drawingId: drawing.id,
        revisionId: activeRev.id,
        decisionCode,
        remarks: decisionRemarks,
      });

      if (res.success) {
        setShowDecisionDrawer(false);
        if (onDecisionCommitted) onDecisionCommitted();
        onClose();
      } else {
        alert(res.error || "Failed to commit decision");
      }
    } catch (err: any) {
      console.error("Commit decision error:", err);
    } finally {
      setIsCommittingDecision(false);
    }
  };

  if (!isOpen) return null;

  const filteredComments = comments.filter((c) =>
    activeCategoryFilter === "ALL" ? true : c.category === activeCategoryFilter
  );

  const activeRev = revisions.find((r) => r.id === activeRevId);
  const primaryFile = activeRev?.dmac_revision_files?.find((f) => f.file_role === "PRIMARY_PDF");

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xs flex flex-col overflow-hidden animate-in fade-in duration-150">
      {/* 1. TOP HEADER & WORKSPACE TOOLBAR */}
      <header className="h-14 border-b border-border bg-surface px-4 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-theme-btn-primary/10 border border-theme-btn-primary/25 flex items-center justify-center text-theme-btn-primary shrink-0">
            <Layers className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-foreground truncate">
                {drawing.drawingNumber}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-theme-btn-primary/15 text-theme-btn-primary">
                {drawing.discipline}
              </span>
              {activeRev && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  Rev R{activeRev.rev_no} {activeRev.is_gfc ? "• GFC" : ""}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">{drawing.title}</p>
          </div>
        </div>

        {/* Viewport Zoom & Rotation Controls */}
        <div className="hidden md:flex items-center gap-1 bg-surface border border-border rounded-lg p-1">
          <button
            onClick={() => handleZoom(-0.15)}
            className="p-1.5 hover:bg-surface rounded-sm text-muted-foreground hover:text-foreground transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="text-xs font-mono font-medium px-2 text-foreground min-w-[50px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => handleZoom(0.15)}
            className="p-1.5 hover:bg-surface rounded-sm text-muted-foreground hover:text-foreground transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={handleResetZoom}
            className="p-1.5 hover:bg-surface rounded-sm text-muted-foreground hover:text-foreground transition-colors"
            title="Fit to Window"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
          <div className="w-px h-4 bg-border my-auto mx-1" />
          <button
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="p-1.5 hover:bg-surface rounded-sm text-muted-foreground hover:text-foreground transition-colors"
            title="Rotate 90° Clockwise"
          >
            <RotateCw className="h-4 w-4" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {primaryFile && (
            <a
              href={`/api/proxy-attachment/${primaryFile.id}`}
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-surface hover:bg-surface text-foreground transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download Sheet</span>
            </a>
          )}
          <button
            onClick={() => setShowDecisionDrawer(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-theme-btn-primary text-theme-btn-primary-text hover:brightness-110 shadow-xs transition-all"
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Commit Decision</span>
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface rounded-lg text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* 2. SECONDARY MARKUP TOOLBAR */}
      <div className="h-11 border-b border-border bg-surface/50 px-4 flex items-center justify-between gap-2 overflow-x-auto shrink-0">
        <div className="flex items-center gap-1">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mr-2 hidden sm:inline">
            Tools:
          </span>

          <button
            onClick={() => setActiveTool("select")}
            className={`p-1.5 rounded-md flex items-center gap-1.5 text-xs font-medium transition-all ${
              activeTool === "select"
                ? "bg-theme-btn-primary text-theme-btn-primary-text"
                : "hover:bg-surface text-muted-foreground hover:text-foreground"
            }`}
            title="Select & Inspect"
          >
            <MousePointer className="h-4 w-4" />
            <span className="hidden lg:inline">Select</span>
          </button>

          <button
            onClick={() => setActiveTool("pan")}
            className={`p-1.5 rounded-md flex items-center gap-1.5 text-xs font-medium transition-all ${
              activeTool === "pan"
                ? "bg-theme-btn-primary text-theme-btn-primary-text"
                : "hover:bg-surface text-muted-foreground hover:text-foreground"
            }`}
            title="Pan Sheet"
          >
            <Hand className="h-4 w-4" />
            <span className="hidden lg:inline">Pan</span>
          </button>

          <div className="w-px h-4 bg-border mx-1" />

          <button
            onClick={() => setActiveTool("cloud")}
            className={`p-1.5 rounded-md flex items-center gap-1.5 text-xs font-medium transition-all ${
              activeTool === "cloud"
                ? "bg-theme-btn-primary text-theme-btn-primary-text"
                : "hover:bg-surface text-muted-foreground hover:text-foreground"
            }`}
            title="Revision Cloud"
          >
            <Cloud className="h-4 w-4" />
            <span className="hidden lg:inline">Cloud</span>
          </button>

          <button
            onClick={() => setActiveTool("arrow")}
            className={`p-1.5 rounded-md flex items-center gap-1.5 text-xs font-medium transition-all ${
              activeTool === "arrow"
                ? "bg-theme-btn-primary text-theme-btn-primary-text"
                : "hover:bg-surface text-muted-foreground hover:text-foreground"
            }`}
            title="Leader Arrow"
          >
            <ArrowUpRight className="h-4 w-4" />
            <span className="hidden lg:inline">Arrow</span>
          </button>

          <button
            onClick={() => setActiveTool("callout")}
            className={`p-1.5 rounded-md flex items-center gap-1.5 text-xs font-medium transition-all ${
              activeTool === "callout"
                ? "bg-theme-btn-primary text-theme-btn-primary-text"
                : "hover:bg-surface text-muted-foreground hover:text-foreground"
            }`}
            title="Callout Pin"
          >
            <MessageSquarePlus className="h-4 w-4" />
            <span className="hidden lg:inline">Callout Pin</span>
          </button>

          <button
            onClick={() => setActiveTool("rect")}
            className={`p-1.5 rounded-md flex items-center gap-1.5 text-xs font-medium transition-all ${
              activeTool === "rect"
                ? "bg-theme-btn-primary text-theme-btn-primary-text"
                : "hover:bg-surface text-muted-foreground hover:text-foreground"
            }`}
            title="Rectangle Box"
          >
            <Square className="h-4 w-4" />
            <span className="hidden lg:inline">Box</span>
          </button>

          <button
            onClick={() => setActiveTool("measure")}
            className={`p-1.5 rounded-md flex items-center gap-1.5 text-xs font-medium transition-all ${
              activeTool === "measure"
                ? "bg-theme-btn-primary text-theme-btn-primary-text"
                : "hover:bg-surface text-muted-foreground hover:text-foreground"
            }`}
            title="Dimension Ruler"
          >
            <Ruler className="h-4 w-4" />
            <span className="hidden lg:inline">Ruler</span>
          </button>

          <button
            onClick={() => setActiveTool("pen")}
            className={`p-1.5 rounded-md flex items-center gap-1.5 text-xs font-medium transition-all ${
              activeTool === "pen"
                ? "bg-theme-btn-primary text-theme-btn-primary-text"
                : "hover:bg-surface text-muted-foreground hover:text-foreground"
            }`}
            title="Freehand Pen"
          >
            <PenTool className="h-4 w-4" />
            <span className="hidden lg:inline">Freehand</span>
          </button>
        </div>

        {/* Color Palette & Stroke */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            {COLOR_PALETTE.map((c) => (
              <button
                key={c.value}
                onClick={() => setActiveColor(c.value)}
                className={`h-5 w-5 rounded-full transition-transform ${
                  activeColor === c.value
                    ? "ring-2 ring-foreground ring-offset-2 scale-110"
                    : "opacity-75 hover:opacity-100"
                }`}
                style={{ backgroundColor: c.value }}
                title={c.name}
              />
            ))}
          </div>

          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="text-[11px] font-medium hidden sm:inline">Stroke:</span>
            {[2, 3, 5].map((w) => (
              <button
                key={w}
                onClick={() => setStrokeWidth(w)}
                className={`px-2 py-0.5 text-[11px] font-bold rounded-sm ${
                  strokeWidth === w
                    ? "bg-surface text-foreground font-bold border border-border"
                    : "hover:bg-surface text-muted-foreground"
                }`}
              >
                {w}px
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. MAIN WORKSPACE: CANVAS + COMMENTS TRAY */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* VIEWPORT & CANVAS CONTAINER */}
        <div
          ref={containerRef}
          className="flex-1 bg-surface/50 overflow-hidden relative flex items-center justify-center select-none"
          style={{ cursor: activeTool === "pan" || isPanning ? "grab" : "crosshair" }}
        >
          {/* Transforming Sheet Stage */}
          <div
            className="relative transition-transform duration-75 origin-center shadow-2xl bg-white border border-border rounded-xs overflow-hidden"
            style={{
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom}) rotate(${rotation}deg)`,
              width: "1200px",
              height: "850px",
            }}
          >
            {/* Sheet Background / Simulation Grid */}
            <div className="absolute inset-0 bg-[#fafafa] flex items-center justify-center">
              {fileUrl ? (
                <iframe
                  src={fileUrl}
                  className="w-full h-full pointer-events-none border-none"
                  title="Drawing Sheet PDF"
                />
              ) : (
                <div className="w-full h-full p-8 flex flex-col justify-between border-8 border-slate-900/10 text-slate-800 pointer-events-none">
                  <div className="flex justify-between items-start border-b-2 border-slate-300 pb-4">
                    <div>
                      <span className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                        CHANDAK GROUP • ENGINEERING & ARCHITECTURE
                      </span>
                      <p className="text-sm font-semibold text-slate-600 mt-1">
                        PROJECT: {drawing.project || "TOWER A"} • DISCIPLINE: {drawing.discipline}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-mono font-black text-slate-900">
                        {drawing.drawingNumber}
                      </span>
                      <p className="text-xs font-bold text-slate-500">
                        STATUS: {drawing.currentStatus || "UNDER REVIEW"}
                      </p>
                    </div>
                  </div>

                  {/* Structural Grid Drawing Graphic Placeholder */}
                  <div className="flex-1 my-6 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center relative overflow-hidden bg-white/60">
                    <div className="absolute inset-0 grid grid-cols-6 grid-rows-4 gap-4 p-8 opacity-40">
                      {Array.from({ length: 24 }).map((_, i) => (
                        <div key={i} className="border border-slate-400/50 rounded-sm flex items-center justify-center">
                          <span className="text-[10px] font-mono font-bold text-slate-400">G-{i + 1}</span>
                        </div>
                      ))}
                    </div>
                    <div className="text-center z-10 space-y-2">
                      <Layers className="h-12 w-12 text-slate-400 mx-auto stroke-1" />
                      <p className="text-sm font-bold text-slate-600 uppercase tracking-wider">
                        {drawing.title}
                      </p>
                      <p className="text-xs text-slate-400">
                        Vector Preview Stage • Calibrated 1:100 Metric Blueprint
                      </p>
                    </div>
                  </div>

                  {/* Title Block Bottom */}
                  <div className="border-t-2 border-slate-300 pt-3 flex justify-between items-center text-xs font-mono text-slate-600">
                    <div>REV: R{drawing.latestRevNo !== null ? drawing.latestRevNo : 0}</div>
                    <div>SCALE: 1:100 (A1 METRIC)</div>
                    <div>DATE: {new Date().toLocaleDateString("en-IN")}</div>
                    <div>CHECKED BY: {userRole}</div>
                  </div>
                </div>
              )}
            </div>

            {/* INTERACTIVE MARKUP SVG OVERLAY */}
            <svg
              ref={canvasRef}
              className="absolute inset-0 w-full h-full pointer-events-auto"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            >
              <defs>
                <marker
                  id="arrow-head"
                  markerWidth="10"
                  markerHeight="10"
                  refX="6"
                  refY="3"
                  orient="auto"
                  markerUnits="strokeWidth"
                >
                  <path d="M0,0 L0,6 L9,3 z" fill={activeColor} />
                </marker>
              </defs>

              {/* Persisted Comments Markups */}
              {comments.map((comm) => {
                const geom = comm.markup_geometry;
                if (!geom) return null;
                const isSelected = selectedCommentId === comm.id;
                const color = geom.color || "#e11d48";
                const stroke = geom.strokeWidth || 3;

                return (
                  <g
                    key={comm.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCommentId(comm.id);
                    }}
                    className="cursor-pointer transition-all hover:opacity-100"
                    style={{ opacity: isSelected ? 1 : 0.85 }}
                  >
                    {/* Callout Pin */}
                    {geom.tool === "callout" && (
                      <g transform={`translate(${geom.x * 1200}, ${geom.y * 850})`}>
                        <circle
                          r={isSelected ? "18" : "15"}
                          fill={color}
                          stroke="#ffffff"
                          strokeWidth="2.5"
                          className="drop-shadow-md"
                        />
                        <text
                          textAnchor="middle"
                          dy="5"
                          fill="#ffffff"
                          fontSize="12"
                          fontWeight="bold"
                          fontFamily="sans-serif"
                        >
                          {comm.comment_number}
                        </text>
                      </g>
                    )}

                    {/* Rectangle Box */}
                    {geom.tool === "rect" && geom.width && geom.height && (
                      <g>
                        <rect
                          x={geom.x * 1200}
                          y={geom.y * 850}
                          width={geom.width * 1200}
                          height={geom.height * 850}
                          fill={color}
                          fillOpacity={isSelected ? "0.18" : "0.08"}
                          stroke={color}
                          strokeWidth={isSelected ? stroke + 2 : stroke}
                          strokeDasharray={comm.status === "RESOLVED" ? "6,4" : undefined}
                          rx="4"
                        />
                        <circle
                          cx={geom.x * 1200 + 12}
                          cy={geom.y * 850 + 12}
                          r="10"
                          fill={color}
                        />
                        <text
                          x={geom.x * 1200 + 12}
                          y={geom.y * 850 + 16}
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize="10"
                          fontWeight="bold"
                        >
                          {comm.comment_number}
                        </text>
                      </g>
                    )}

                    {/* Revision Cloud */}
                    {geom.tool === "cloud" && geom.width && geom.height && (
                      <g>
                        <rect
                          x={geom.x * 1200}
                          y={geom.y * 850}
                          width={geom.width * 1200}
                          height={geom.height * 850}
                          fill={color}
                          fillOpacity={isSelected ? "0.15" : "0.05"}
                          stroke={color}
                          strokeWidth={stroke}
                          strokeDasharray="8,6"
                          rx="16"
                        />
                        <circle
                          cx={geom.x * 1200 + 12}
                          cy={geom.y * 850 + 12}
                          r="10"
                          fill={color}
                        />
                        <text
                          x={geom.x * 1200 + 12}
                          y={geom.y * 850 + 16}
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize="10"
                          fontWeight="bold"
                        >
                          {comm.comment_number}
                        </text>
                      </g>
                    )}

                    {/* Arrow */}
                    {geom.tool === "arrow" && geom.arrowEnd && (
                      <g>
                        <line
                          x1={geom.x * 1200}
                          y1={geom.y * 850}
                          x2={geom.arrowEnd.x * 1200}
                          y2={geom.arrowEnd.y * 850}
                          stroke={color}
                          strokeWidth={stroke}
                          markerEnd="url(#arrow-head)"
                        />
                        <circle cx={geom.x * 1200} cy={geom.y * 850} r="9" fill={color} />
                        <text
                          x={geom.x * 1200}
                          y={geom.y * 850 + 3.5}
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize="9"
                          fontWeight="bold"
                        >
                          {comm.comment_number}
                        </text>
                      </g>
                    )}

                    {/* Measure Ruler */}
                    {geom.tool === "measure" && geom.arrowEnd && (
                      <g>
                        <line
                          x1={geom.x * 1200}
                          y1={geom.y * 850}
                          x2={geom.arrowEnd.x * 1200}
                          y2={geom.arrowEnd.y * 850}
                          stroke={color}
                          strokeWidth="2"
                          strokeDasharray="4,4"
                        />
                        <rect
                          x={(geom.x + geom.arrowEnd.x) * 600 - 35}
                          y={(geom.y + geom.arrowEnd.y) * 425 - 12}
                          width="70"
                          height="24"
                          rx="4"
                          fill="#0f172a"
                          fillOpacity="0.9"
                        />
                        <text
                          x={(geom.x + geom.arrowEnd.x) * 600}
                          y={(geom.y + geom.arrowEnd.y) * 425 + 4}
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize="10"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          {geom.measurementValue || "Dist"}
                        </text>
                      </g>
                    )}

                    {/* Freehand Pen */}
                    {geom.tool === "pen" && geom.points && geom.points.length > 1 && (
                      <polyline
                        points={geom.points.map((p) => `${p.x * 1200},${p.y * 850}`).join(" ")}
                        fill="none"
                        stroke={color}
                        strokeWidth={stroke}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}
                  </g>
                );
              })}

              {/* Current Active Draft Markup (In-Progress) */}
              {currentDraftMarkup && (
                <g className="opacity-90">
                  {currentDraftMarkup.tool === "callout" && (
                    <g
                      transform={`translate(${currentDraftMarkup.x * 1200}, ${
                        currentDraftMarkup.y * 850
                      })`}
                    >
                      <circle r="18" fill={activeColor} stroke="#ffffff" strokeWidth="2.5" />
                      <text
                        textAnchor="middle"
                        dy="5"
                        fill="#ffffff"
                        fontSize="12"
                        fontWeight="bold"
                      >
                        {currentDraftMarkup.commentNumber || comments.length + 1}
                      </text>
                    </g>
                  )}

                  {currentDraftMarkup.tool === "rect" &&
                    currentDraftMarkup.width &&
                    currentDraftMarkup.height && (
                      <rect
                        x={currentDraftMarkup.x * 1200}
                        y={currentDraftMarkup.y * 850}
                        width={currentDraftMarkup.width * 1200}
                        height={currentDraftMarkup.height * 850}
                        fill={activeColor}
                        fillOpacity="0.15"
                        stroke={activeColor}
                        strokeWidth={strokeWidth}
                        rx="4"
                      />
                    )}

                  {currentDraftMarkup.tool === "cloud" &&
                    currentDraftMarkup.width &&
                    currentDraftMarkup.height && (
                      <rect
                        x={currentDraftMarkup.x * 1200}
                        y={currentDraftMarkup.y * 850}
                        width={currentDraftMarkup.width * 1200}
                        height={currentDraftMarkup.height * 850}
                        fill={activeColor}
                        fillOpacity="0.15"
                        stroke={activeColor}
                        strokeWidth={strokeWidth}
                        strokeDasharray="8,6"
                        rx="16"
                      />
                    )}

                  {currentDraftMarkup.tool === "arrow" && currentDraftMarkup.arrowEnd && (
                    <line
                      x1={currentDraftMarkup.x * 1200}
                      y1={currentDraftMarkup.y * 850}
                      x2={currentDraftMarkup.arrowEnd.x * 1200}
                      y2={currentDraftMarkup.arrowEnd.y * 850}
                      stroke={activeColor}
                      strokeWidth={strokeWidth}
                      markerEnd="url(#arrow-head)"
                    />
                  )}

                  {currentDraftMarkup.tool === "measure" && currentDraftMarkup.arrowEnd && (
                    <g>
                      <line
                        x1={currentDraftMarkup.x * 1200}
                        y1={currentDraftMarkup.y * 850}
                        x2={currentDraftMarkup.arrowEnd.x * 1200}
                        y2={currentDraftMarkup.arrowEnd.y * 850}
                        stroke={activeColor}
                        strokeWidth="2"
                        strokeDasharray="4,4"
                      />
                      <rect
                        x={(currentDraftMarkup.x + currentDraftMarkup.arrowEnd.x) * 600 - 35}
                        y={(currentDraftMarkup.y + currentDraftMarkup.arrowEnd.y) * 425 - 12}
                        width="70"
                        height="24"
                        rx="4"
                        fill="#0f172a"
                      />
                      <text
                        x={(currentDraftMarkup.x + currentDraftMarkup.arrowEnd.x) * 600}
                        y={(currentDraftMarkup.y + currentDraftMarkup.arrowEnd.y) * 425 + 4}
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="10"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        {currentDraftMarkup.measurementValue}
                      </text>
                    </g>
                  )}

                  {currentDraftMarkup.tool === "pen" &&
                    currentDraftMarkup.points &&
                    currentDraftMarkup.points.length > 1 && (
                      <polyline
                        points={currentDraftMarkup.points
                          .map((p) => `${p.x * 1200},${p.y * 850}`)
                          .join(" ")}
                        fill="none"
                        stroke={activeColor}
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}
                </g>
              )}
            </svg>
          </div>
        </div>

        {/* RIGHT COMMENTS & OBSERVATION TRAY */}
        <aside className="w-96 border-l border-border bg-surface flex flex-col shrink-0 z-10 shadow-lg">
          {/* Header & Category Filter */}
          <div className="p-3.5 border-b border-border space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-theme-btn-primary" />
                <span>Observations & Comments ({comments.length})</span>
              </h3>
              <span className="text-[11px] font-mono text-muted-foreground">
                {comments.filter((c) => c.status === "OPEN").length} Open
              </span>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              {["ALL", "DESIGN", "COORDINATION", "COMPLIANCE", "DRAFTING"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategoryFilter(cat)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 transition-all ${
                    activeCategoryFilter === cat
                      ? "bg-theme-btn-primary text-theme-btn-primary-text"
                      : "bg-surface hover:bg-surface text-muted-foreground"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* DRAFT COMMENT COMPOSER (If new markup drawn) */}
          {currentDraftMarkup && (
            <div className="p-4 bg-theme-btn-primary/5 border-b border-theme-btn-primary/20 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-theme-btn-primary flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Draft Comment #{currentDraftMarkup.commentNumber || comments.length + 1}</span>
                </span>
                <span className="text-[10px] font-mono uppercase bg-theme-btn-primary/10 text-theme-btn-primary px-1.5 py-0.5 rounded-sm">
                  {currentDraftMarkup.tool}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Category</label>
                  <select
                    value={draftCategory}
                    onChange={(e: any) => setDraftCategory(e.target.value)}
                    className="w-full mt-1 text-xs rounded-md bg-surface border border-border px-2 py-1 text-foreground"
                  >
                    <option value="DESIGN">Design</option>
                    <option value="COORDINATION">Coordination</option>
                    <option value="COMPLIANCE">Compliance</option>
                    <option value="DRAFTING">Drafting</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Severity</label>
                  <select
                    value={draftSeverity}
                    onChange={(e: any) => setDraftSeverity(e.target.value)}
                    className="w-full mt-1 text-xs rounded-md bg-surface border border-border px-2 py-1 text-foreground"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="BLOCKER">Blocker</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Comment Observation</label>
                <textarea
                  value={draftCommentText}
                  onChange={(e) => setDraftCommentText(e.target.value)}
                  placeholder="State technical discrepancy or required revision..."
                  rows={2}
                  className="w-full mt-1 text-xs rounded-md bg-surface border border-border p-2 text-foreground focus:outline-hidden focus:ring-1 focus:ring-theme-btn-primary resize-none"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={handleCancelDraft}
                  className="px-2.5 py-1 text-xs rounded-md border border-border hover:bg-surface text-muted-foreground"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveDraftComment}
                  disabled={!draftCommentText.trim() || isSavingComment}
                  className="px-3 py-1 text-xs font-bold rounded-md bg-theme-btn-primary text-theme-btn-primary-text hover:brightness-110 disabled:opacity-50"
                >
                  {isSavingComment ? "Saving..." : "Save Markup"}
                </button>
              </div>
            </div>
          )}

          {/* Comments List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {filteredComments.length === 0 ? (
              <div className="text-center py-12 px-4 text-muted-foreground space-y-2">
                <MessageSquarePlus className="h-8 w-8 mx-auto opacity-40" />
                <p className="text-xs font-medium">No markup comments yet.</p>
                <p className="text-[11px] opacity-75">
                  Select a tool above (Cloud, Arrow, Callout) and draw on the drawing sheet to record an observation.
                </p>
              </div>
            ) : (
              filteredComments.map((comm) => {
                const isSelected = selectedCommentId === comm.id;
                return (
                  <div
                    key={comm.id}
                    onClick={() => setSelectedCommentId(comm.id)}
                    className={`p-3 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-theme-btn-primary/5 border-theme-btn-primary shadow-xs"
                        : "bg-surface/50 border-border hover:border-border"
                    }`}
                  >
                    {/* Comment Card Header */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-5 w-5 rounded-full text-[11px] font-bold text-white flex items-center justify-center shrink-0"
                          style={{ backgroundColor: comm.markup_geometry?.color || "#e11d48" }}
                        >
                          {comm.comment_number}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          {comm.category}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                            comm.severity === "BLOCKER" || comm.severity === "HIGH"
                              ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                              : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                          }`}
                        >
                          {comm.severity}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                            comm.status === "RESOLVED"
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                              : "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                          }`}
                        >
                          {comm.status}
                        </span>
                      </div>
                    </div>

                    {/* Text Body */}
                    <p className="text-xs text-foreground mt-2 leading-relaxed font-medium">
                      {comm.comment_text}
                    </p>

                    {/* Thread History */}
                    {comm.dmac_comment_threads && comm.dmac_comment_threads.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-border space-y-2">
                        {comm.dmac_comment_threads.map((reply) => (
                          <div
                            key={reply.id}
                            className="bg-surface p-2 rounded-md border border-border text-[11px] space-y-1"
                          >
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                              <span className="font-bold text-foreground">
                                {reply.author_role || "Reviewer"}
                              </span>
                              <span>{new Date(reply.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                            </div>
                            <p className="text-foreground">{reply.message}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reply Box (When Selected) */}
                    {isSelected && (
                      <div className="mt-3 pt-2 border-t border-border flex items-center gap-1.5">
                        <input
                          type="text"
                          value={replyTextMap[comm.id] || ""}
                          onChange={(e) =>
                            setReplyTextMap((prev) => ({ ...prev, [comm.id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleAddThreadReply(comm.id);
                          }}
                          placeholder="Reply in thread..."
                          className="flex-1 text-[11px] bg-surface border border-border rounded-md px-2 py-1 text-foreground focus:outline-hidden focus:ring-1 focus:ring-theme-btn-primary"
                        />
                        <button
                          onClick={() => handleAddThreadReply(comm.id)}
                          disabled={!replyTextMap[comm.id]?.trim() || isSubmittingReply}
                          className="p-1.5 bg-theme-btn-primary text-theme-btn-primary-text rounded-md hover:brightness-110 disabled:opacity-50"
                        >
                          <Send className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteComment(comm.id)}
                          className="p-1.5 hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 rounded-md"
                          title="Delete Observation"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </aside>
      </div>

      {/* 4. CODE A/B/C/D FORMAL REVIEW DECISION DRAWER */}
      {showDecisionDrawer && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-lg bg-theme-btn-primary/10 border border-theme-btn-primary/25 flex items-center justify-center text-theme-btn-primary">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Record Review Decision</h3>
                  <p className="text-xs text-muted-foreground">
                    {drawing.drawingNumber} • Rev R{activeRev?.rev_no ?? 0}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDecisionDrawer(false)}
                className="p-1 hover:bg-surface rounded-md text-muted-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Select Decision Code
                </label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {[
                    { code: "A", title: "Code A: Approved as Submitted", desc: "No changes required. Ready for IFC/GFC." },
                    { code: "B", title: "Code B: Approved with Comments", desc: "Minor updates. Proceed with execution." },
                    { code: "C", title: "Code C: Revise & Resubmit", desc: "Major observations. Resubmission mandatory." },
                    { code: "D", title: "Code D: Rejected", desc: "Fundamental deviations. Full redesign required." },
                  ].map((d) => (
                    <button
                      key={d.code}
                      onClick={() => setDecisionCode(d.code as any)}
                      className={`p-3 text-left rounded-lg border transition-all ${
                        decisionCode === d.code
                          ? "bg-theme-btn-primary/10 border-theme-btn-primary ring-1 ring-theme-btn-primary"
                          : "bg-surface border-border hover:border-border"
                      }`}
                    >
                      <span className="text-xs font-bold text-foreground">{d.title}</span>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{d.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Review Remarks & Executive Summary
                </label>
                <textarea
                  value={decisionRemarks}
                  onChange={(e) => setDecisionRemarks(e.target.value)}
                  placeholder="State technical summary, clearance notes, or directions for the consultant..."
                  rows={3}
                  className="w-full mt-1.5 text-xs rounded-lg bg-surface border border-border p-3 text-foreground focus:outline-hidden focus:ring-1 focus:ring-theme-btn-primary resize-none"
                />
              </div>

              {comments.filter((c) => c.status === "OPEN").length > 0 && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-lg flex items-start gap-2.5">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 dark:text-amber-300">
                    <strong className="font-bold">Comment Clearance Gate:</strong> There are{" "}
                    {comments.filter((c) => c.status === "OPEN").length} open observations. If returning as Code C/D, the consultant will be required to answer each item before resubmitting.
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 bg-surface/50 border-t border-border flex items-center justify-end gap-2">
              <button
                onClick={() => setShowDecisionDrawer(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-border hover:bg-surface text-muted-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleCommitReviewDecision}
                disabled={isCommittingDecision}
                className="px-5 py-2 text-xs font-bold rounded-lg bg-theme-btn-primary text-theme-btn-primary-text hover:brightness-110 shadow-xs"
              >
                {isCommittingDecision ? "Committing..." : "Commit Formal Decision"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

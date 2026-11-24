"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  StickyNote,
  X,
  GripVertical,
  Maximize2,
  Minimize2,
  Sparkles,
} from "lucide-react";
import RunningNotesCard from "@/components/meet/RunningNotesCard";
import type { MeetNoteBlock } from "@/types/meet";

interface DraggableLiveNotesWidgetProps {
  sessionId: string;
  focusedPointId?: string | null;
  focusedPointCode?: string | null;
  onOpenConvert?: (block: MeetNoteBlock) => void;
}

export default function DraggableLiveNotesWidget({
  sessionId,
  focusedPointId,
  focusedPointCode,
  onOpenConvert,
}: DraggableLiveNotesWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const isDraggingRef = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const elementStartPos = useRef({ x: 0, y: 0 });

  // Initialize position on client mount (bottom-right default)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const initialX = Math.max(20, window.innerWidth - 170);
      const initialY = Math.max(20, window.innerHeight - 90);
      setPosition({ x: initialX, y: initialY });
    }
  }, []);

  // Window resize bounds check
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
        if (!prev) return null;
        const clampedX = Math.max(16, Math.min(window.innerWidth - 160, prev.x));
        const clampedY = Math.max(16, Math.min(window.innerHeight - 80, prev.y));
        return { x: clampedX, y: clampedY };
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    // Only drag with primary pointer button
    if (e.button !== 0) return;

    isDraggingRef.current = false;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    elementStartPos.current = { x: position?.x || 0, y: position?.y || 0 };

    const handlePointerMove = (ev: PointerEvent) => {
      const dx = ev.clientX - dragStartPos.current.x;
      const dy = ev.clientY - dragStartPos.current.y;

      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        isDraggingRef.current = true;
      }

      const clampedX = Math.max(12, Math.min(window.innerWidth - 160, elementStartPos.current.x + dx));
      const clampedY = Math.max(12, Math.min(window.innerHeight - 70, elementStartPos.current.y + dy));
      setPosition({ x: clampedX, y: clampedY });
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  const handleButtonClick = () => {
    if (!isDraggingRef.current) {
      setIsOpen((prev) => !prev);
    }
  };

  if (!position) return null;

  return (
    <>
      {/* Draggable High-Visibility Floating Action Icon */}
      <div
        onPointerDown={handlePointerDown}
        style={{
          position: "fixed",
          left: `${position.x}px`,
          top: `${position.y}px`,
          zIndex: 9998,
          touchAction: "none",
        }}
        className="select-none group"
      >
        <button
          type="button"
          onClick={handleButtonClick}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-full shadow-xl transition-all duration-150 cursor-grab active:cursor-grabbing font-medium text-[13px] border ${
            isOpen
              ? "bg-primary-hover text-primary-foreground border-primary ring-4 ring-primary/20"
              : "bg-primary text-primary-foreground border-primary hover:scale-105 active:scale-95"
          }`}
          title="Drag to reposition · Click to open Live Notes"
        >
          {/* Grip Icon for clear moveability affordance */}
          <GripVertical className="h-4 w-4 opacity-75 group-hover:opacity-100 shrink-0" />

          {/* Sticky Note Icon */}
          <div className="relative">
            <StickyNote className="h-4 w-4 shrink-0" />
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
            </span>
          </div>

          <span className="font-semibold tracking-wide drop-shadow-xs">Live Notes</span>

          {focusedPointCode && (
            <span className="ml-0.5 rounded bg-black/25 px-1.5 py-0.2 text-[10.5px] font-mono font-bold text-primary-foreground">
              {focusedPointCode}
            </span>
          )}
        </button>
      </div>

      {/* Floating Live Notes Window / Drawer */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            right: "24px",
            bottom: "85px",
            zIndex: 9999,
          }}
          className={`transition-all duration-200 animate-in fade-in-0 slide-in-from-bottom-4 shadow-2xl rounded-2xl border border-border bg-surface flex flex-col overflow-hidden ${
            isExpanded
              ? "w-[min(94vw,720px)] h-[min(88vh,720px)]"
              : "w-[min(94vw,460px)] h-[min(82vh,560px)]"
          }`}
        >
          {/* Window Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-sunken/40">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-warning-soft text-warning-text border border-warning-border">
                <StickyNote className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-[13.5px] font-semibold text-heading">Live Running Notes</h3>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10.5px] font-semibold bg-success-soft text-success-text border border-success-border">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Live
                  </span>
                </div>
                {focusedPointCode ? (
                  <p className="text-[11px] text-muted">
                    Auto-tagging lines to <strong className="text-foreground">{focusedPointCode}</strong>
                  </p>
                ) : (
                  <p className="text-[11px] text-muted">Auto-saves every line with timestamps</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 text-muted">
              <button
                type="button"
                onClick={() => setIsExpanded((prev) => !prev)}
                className="p-1.5 hover:text-foreground rounded hover:bg-sunken transition-colors"
                title={isExpanded ? "Restore size" : "Expand size"}
              >
                {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:text-foreground rounded hover:bg-sunken transition-colors"
                title="Minimize notes widget"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Window Body: RunningNotesCard */}
          <div className="flex-1 overflow-y-auto p-4">
            <RunningNotesCard
              sessionId={sessionId}
              focusedPointId={focusedPointId}
              focusedPointCode={focusedPointCode}
              onOpenConvert={onOpenConvert}
            />
          </div>
        </div>
      )}
    </>
  );
}

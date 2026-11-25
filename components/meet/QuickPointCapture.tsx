"use client";

import React, { useState } from "react";
import { Plus, CornerDownLeft, Sparkles, Loader2 } from "lucide-react";
import { createPoint } from "@/lib/actions/meet/points";
import { toast } from "react-toastify";

interface QuickPointCaptureProps {
  meetingId: string;
  sessionId: string;
  users?: { id: string; full_name: string }[];
  categories?: { id: string; name: string }[];
  onPointCreated?: (newPoint: any) => void;
  className?: string;
}

export function QuickPointCapture({
  meetingId,
  sessionId,
  users = [],
  categories = [],
  onPointCreated,
  className = "",
}: QuickPointCaptureProps) {
  const [input, setInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = input.trim();
    if (!raw) return;

    try {
      setIsSubmitting(true);

      // Smart parse tokens: @owner, #category, and Nd (e.g., 3d)
      let title = raw;
      let ownerId: string | undefined;
      let categoryId: string | undefined;
      let tatDays = 3;

      // Extract TAT e.g. 5d or 2d
      const tatMatch = raw.match(/\b(\d+)d\b/i);
      if (tatMatch) {
        tatDays = parseInt(tatMatch[1], 10);
        title = title.replace(tatMatch[0], "").trim();
      }

      // Extract @mention for owner
      const atMatch = raw.match(/@(\w+)/);
      if (atMatch && users.length > 0) {
        const query = atMatch[1].toLowerCase();
        const found = users.find((u) => u.full_name.toLowerCase().includes(query));
        if (found) {
          ownerId = found.id;
          title = title.replace(atMatch[0], "").trim();
        }
      }

      // Extract #category
      const hashMatch = raw.match(/#(\w+)/);
      if (hashMatch && categories.length > 0) {
        const query = hashMatch[1].toLowerCase();
        const found = categories.find((c) => c.name.toLowerCase().includes(query));
        if (found) {
          categoryId = found.id;
          title = title.replace(hashMatch[0], "").trim();
        }
      }

      const res = await createPoint({
        meeting_id: meetingId,
        session_id: sessionId,
        title: title || raw,
        tat_days: tatDays,
        owner_id: ownerId,
        category_id: categoryId,
        point_type: "action",
      });

      if (res.success && res.point) {
        setInput("");
        toast.success(`Point ${res.point.code} captured with ${tatDays}-day TAT`);
        onPointCreated?.(res.point);
      } else {
        toast.error(res.error || "Failed to capture point");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to add point");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 shadow-xs focus-within:border-primary focus-within:ring-1 focus-within:ring-primary ${className}`}
    >
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
        <Plus className="h-3.5 w-3.5" />
      </div>

      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        disabled={isSubmitting}
        placeholder="Quick capture: Type point title... Use @name, #category, 3d (e.g. 'Review distributor collateral @Amit 2d')"
        className="flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted focus:outline-none"
      />

      <div className="flex items-center gap-1.5 text-[11px] text-muted">
        <span className="hidden sm:inline-flex items-center gap-1 rounded bg-sunken px-1.5 py-0.5 font-mono text-[11px]">
          Enter <CornerDownLeft className="h-2.5 w-2.5" />
        </span>
        <button
          type="submit"
          disabled={!input.trim() || isSubmitting}
          className="inline-flex h-7 items-center justify-center rounded bg-primary px-2.5 text-[12px] font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors"
        >
          {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Capture"}
        </button>
      </div>
    </form>
  );
}

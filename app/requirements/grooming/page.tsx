"use client";

import React, { useState, useEffect, useMemo } from "react";
import { AppCard } from "@/components/ui/AppCard";
import { AppBadge } from "@/components/ui/AppBadge";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppButton } from "@/components/ui/AppButton";
import { ArrowLeft, GripVertical, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchRequirements } from "@/lib/actions/requirements";
import { DndContext, DragOverlay, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import ChandakLoader from "@/components/ui/ChandakLoader";
import { formatDate, StatusBadge, PriorityIndicator } from "@/components/ui/data";
import { Info } from "lucide-react";

export default function RequirementsGroomingBoard() {
  const router = useRouter();
  const [reqs, setReqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    fetchRequirements().then(data => {
      setReqs(data);
      setLoading(false);
    });
  }, []);

  const columns = useMemo(() => {
    const statuses = [
      { id: "Draft", name: "Backlog", color: "var(--text-muted)" },
      { id: "Pending Approval", name: "In review", color: "var(--warning)" },
      { id: "Approved", name: "Ready for development", color: "var(--success)" },
      { id: "Rejected", name: "Rejected or cancelled", color: "var(--danger)" }
    ];

    return statuses.map(s => {
      return {
        ...s,
        items: reqs.filter(r => {
          const status = r.approval_status || 'Draft';
          if (s.id === "Pending Approval" && (status.includes("Pending") || status.includes("Review"))) return true;
          if (s.id === status) return true;
          if (s.id === "Draft" && status !== "Approved" && status !== "Rejected" && !status.includes("Pending")) return true;
          return false;
        })
      };
    });
  }, [reqs]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    
    // In a real implementation, we would call an API to update the requirement's status
    // For this UI demo/board, we'll just optimistically update local state if it's dropped on a column
    const overId = over.id as string;
    const activeReqId = active.id as string;
    
    let newStatus = "";
    if (columns.find(c => c.id === overId)) {
      newStatus = overId;
    } else {
      const overReq = reqs.find(r => r.id === overId || r.code === overId || r.requirement_code === overId);
      if (overReq) newStatus = overReq.approval_status;
    }

    if (newStatus && newStatus !== "Pending Approval") { // We can't force "Pending Approval" natively without workflows usually
      setReqs(prev => prev.map(r => 
        (r.id === activeReqId || r.code === activeReqId || r.requirement_code === activeReqId) 
          ? { ...r, approval_status: newStatus } 
          : r
      ));
    }
  };

  const activeReq = useMemo(() => reqs.find(r => r.id === activeId || r.code === activeId || r.requirement_code === activeId), [activeId, reqs]);

  return (
    <PageContainer strict={true}>
      <PageHeader
        title="Requirement grooming"
        description="Requirements grouped by approval stage"
        breadcrumbs={[{ label: "Requirements", href: "/requirements" }, { label: "Grooming" }]}
      />

      <div role="note" className="flex items-start gap-2 rounded-md border border-info-border bg-info-soft px-3 py-2 text-[13px] text-info-text">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>Moving a card here is for planning only and isn&apos;t saved. To change a requirement&apos;s status, open it and use its approval flow.</span>
      </div>

      <div className="mt-4 flex min-h-[500px] flex-1 flex-col overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full min-h-[400px]">
            <ChandakLoader size="md" title="Loading grooming board…" />
          </div>
        ) : (
          <div className="flex h-full gap-3 overflow-x-auto pb-2">
            <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              {columns.map(col => (
                <BoardColumn key={col.id} column={col} onClick={(req) => router.push(`/requirements/${req.id}?tab=analysis`)} />
              ))}
              <DragOverlay>
                {activeReq ? (
                  <div className="cursor-grabbing opacity-95 shadow-lg">
                    <ReqCard req={activeReq} />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
        )}
      </div>
    </PageContainer>
  );
}

function BoardColumn({ column, onClick }: { column: any, onClick: (req: any) => void }) {
  const { setNodeRef } = useSortable({
    id: column.id,
    data: { type: "Column", column }
  });

  return (
    <section aria-label={column.name} className="flex h-full w-[320px] min-w-[320px] flex-col rounded-[10px] border border-border bg-sunken">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: column.color }} aria-hidden />
          <h3 className="text-[13.5px] font-semibold text-heading">{column.name}</h3>
        </div>
        <span className="rounded bg-surface px-1.5 text-[12px] text-subtle tabular">{column.items.length}</span>
      </div>

      <div ref={setNodeRef} className="flex min-h-[150px] flex-1 flex-col space-y-2 overflow-y-auto p-2">
        <SortableContext items={column.items.map((r: any) => r.code || r.requirement_code || r.id)} strategy={verticalListSortingStrategy}>
          {column.items.map((req: any) => (
            <SortableReqCard key={req.code || req.requirement_code || req.id} req={req} onClick={() => onClick(req)} />
          ))}
        </SortableContext>
        
        {column.items.length === 0 && (
          <div className="flex flex-1 items-center justify-center rounded-md border border-border bg-surface/60 p-4 text-center text-[12.5px] text-muted">
            No requirements in this stage
          </div>
        )}
      </div>
    </section>
  );
}

function SortableReqCard({ req, onClick }: { req: any, onClick: () => void }) {
  const id = req.code || req.requirement_code || req.id;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id,
    data: { type: "Requirement", req }
  });

  const style = { transform: CSS.Transform.toString(transform), transition };

  if (isDragging) {
    return <div ref={setNodeRef} style={style} className="h-[132px] rounded-[10px] border-2 border-border-active bg-accent-soft opacity-50" />;
  }

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners} 
      role="button"
      tabIndex={0}
      onClick={() => { if (!isDragging) onClick(); }} 
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!isDragging) onClick(); } }}
      aria-label={`${req.code || req.requirement_code || "Requirement"}: ${req.title || "Untitled requirement"}. Press Enter to open.`}
      className="cursor-grab rounded-[10px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:cursor-grabbing"
    >
      <ReqCard req={req} />
    </div>
  );
}

function ReqCard({ req }: { req: any }) {
  const creator = req.creator?.full_name || req.requester?.full_name || "";
  return (
    <div className="theme-card-structural group p-3 shadow-sm transition-[border-color,box-shadow] hover:border-border-active hover:shadow-md">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <GripVertical className="h-4 w-4 text-muted opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
          <span className="font-mono text-[12px] font-medium text-accent-soft-text">
            {req.code || req.requirement_code || req.id?.substring(0, 8)}
          </span>
        </div>
        {req.priority?.name && <PriorityIndicator priority={req.priority.name} className="text-[12px] text-subtle" />}
      </div>

      <h4 className="mb-2 line-clamp-2 text-[13.5px] font-semibold leading-snug text-foreground" title={req.title}>
        {req.title || "Untitled requirement"}
      </h4>

      {req.module?.name && <div className="mb-2 truncate text-[12.5px] text-muted">{req.module.name}</div>}

      <div className="flex items-center justify-between gap-2 border-t border-border pt-2">
        <div className="flex min-w-0 items-center gap-2 text-[12px] text-muted">
          {creator && (
            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent-soft-text" title={creator}>
              {creator.split(/\s+/).slice(0, 2).map((n: string) => n[0]?.toUpperCase()).join("")}
            </span>
          )}
          <span className="tabular">{formatDate(req.created_at)}</span>
        </div>
        <StatusBadge status={req.approval_status || "Draft"} size="sm" />
      </div>
    </div>
  );
}

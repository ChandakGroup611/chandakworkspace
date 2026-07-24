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
      { id: "Draft", name: "Backlog / Draft", color: "#6B7280" },
      { id: "Pending Approval", name: "In Review (Grooming)", color: "#F59E0B" },
      { id: "Approved", name: "Ready for Dev (Approved)", color: "#10B981" },
      { id: "Rejected", name: "Rejected / Cancelled", color: "#EF4444" }
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
        title="Agile Requirements Grooming"
        description="Prioritize and refine business requirements visually."
        badge={<AppBadge variant="warning">Grooming Board</AppBadge>}
        actions={
          <Link href="/requirements">
            <AppButton variant="outline" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Back to List
            </AppButton>
          </Link>
        }
      />

      <div className="mt-4 flex-1 overflow-hidden flex flex-col min-h-[500px]">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
          </div>
        ) : (
          <div className="flex h-full overflow-x-auto pb-4 space-x-6">
            <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              {columns.map(col => (
                <BoardColumn key={col.id} column={col} onClick={(req) => router.push(`/requirements/${req.id}?tab=analysis`)} />
              ))}
              <DragOverlay>
                {activeReq ? (
                  <div className="rotate-3 opacity-90 cursor-grabbing shadow-2xl">
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
    <div className="flex flex-col w-[350px] min-w-[350px] bg-gray-50 dark:bg-surface/[0.02] rounded-2xl border border-gray-200 dark:border-white/5 h-full">
      <div className="p-4 border-b border-gray-200 dark:border-white/5 flex items-center justify-between bg-surface dark:bg-[#0B0F19] rounded-t-2xl shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: column.color }} />
          <h3 className="font-bold text-[15px] text-foreground tracking-tight">{column.name}</h3>
        </div>
        <div className="bg-gray-100 dark:bg-surface/10 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full text-xs font-bold">
          {column.items.length}
        </div>
      </div>
      
      <div ref={setNodeRef} className="flex-1 p-3 overflow-y-auto space-y-3 flex flex-col min-h-[150px]">
        <SortableContext items={column.items.map((r: any) => r.code || r.requirement_code || r.id)} strategy={verticalListSortingStrategy}>
          {column.items.map((req: any) => (
            <SortableReqCard key={req.code || req.requirement_code || req.id} req={req} onClick={() => onClick(req)} />
          ))}
        </SortableContext>
        
        {column.items.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-white/10 rounded-xl m-2">
            <span className="text-sm font-medium text-gray-400">Empty Queue</span>
          </div>
        )}
      </div>
    </div>
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
    return <div ref={setNodeRef} style={style} className="opacity-40 border-2 border-accent border-dashed rounded-xl h-[140px] bg-accent/5" />;
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} onClick={(e) => { if (!isDragging) onClick(); }} className="cursor-grab active:cursor-grabbing">
      <ReqCard req={req} />
    </div>
  );
}

function ReqCard({ req }: { req: any }) {
  return (
    <AppCard className="hover:shadow-lg hover:border-accent/40 transition-all group overflow-hidden bg-surface dark:bg-[#0f111a] border-gray-200 dark:border-white/10">
      <div className="p-4">
        <div className="flex justify-between items-start mb-3 gap-2">
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="font-mono text-xs font-bold text-accent bg-accent/10 px-2 py-0.5 rounded">
              {req.code || req.requirement_code || req.id?.substring(0, 8)}
            </div>
          </div>
          {req.priority?.name && (
            <span className="text-[10px] font-bold px-2 py-1 rounded shadow-sm text-white" style={{ backgroundColor: req.priority.priority_color || '#6B7280' }}>
              {req.priority.name}
            </span>
          )}
        </div>
        
        <h4 className="font-bold text-[14px] text-foreground leading-snug mb-3 line-clamp-2" title={req.title}>
          {req.title || "Untitled Requirement"}
        </h4>
        
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Module:</span>
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">{req.module?.name || '-'}</span>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-white/5">
          <div className="flex items-center gap-2">
             <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold" title={req.creator?.full_name || 'Requester'}>
               {(req.creator?.full_name || req.requester?.full_name || 'U').substring(0, 2).toUpperCase()}
             </div>
             <div className="text-[10px] font-medium text-gray-500">{new Date(req.created_at).toLocaleDateString()}</div>
          </div>
          
          <div className="flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 bg-gray-50 dark:bg-surface/5 rounded text-gray-600 dark:text-gray-400">
             {req.approval_status?.includes('Pending') ? <Clock className="w-3.5 h-3.5 text-amber-500" /> : req.approval_status === 'Approved' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <AlertCircle className="w-3.5 h-3.5 text-gray-400" />}
             {req.approval_status || 'Draft'}
          </div>
        </div>
      </div>
    </AppCard>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { X, GripVertical, Check, RefreshCw } from "lucide-react";
import { AppButton } from "@/components/ui/AppButton";
import { DashboardWidgetConfig } from "@/hooks/useDashboardConfig";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from "@/lib/utils";

interface CustomizeDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  layout: DashboardWidgetConfig[];
  onSave: (layout: DashboardWidgetConfig[]) => Promise<void>;
  onReset: () => Promise<void>;
}

export function CustomizeDashboardModal({ isOpen, onClose, layout, onSave, onReset }: CustomizeDashboardModalProps) {
  const [localLayout, setLocalLayout] = useState<DashboardWidgetConfig[]>([]);

  useEffect(() => {
    if (isOpen) {
      // Sort so active items are first, then inactive items
      const active = layout.filter(l => l.order !== -1).sort((a, b) => a.order - b.order);
      const inactive = layout.filter(l => l.order === -1);
      setLocalLayout([...active, ...inactive]);
    }
  }, [isOpen, layout]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setLocalLayout((items) => {
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over?.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const toggleVisibility = (id: string) => {
    setLocalLayout(items => items.map(i => {
      if (i.id === id) {
        return { ...i, order: i.order === -1 ? 999 : -1 }; // 999 will be fixed on save
      }
      return i;
    }));
  };

  const setSpan = (id: string, span: 1 | 2 | 3 | 4) => {
    setLocalLayout(items => items.map(i => i.id === id ? { ...i, colSpan: span } : i));
  };

  const handleSave = async () => {
    // Re-assign proper orders based on array index for active items
    let currentOrder = 1;
    const finalLayout = localLayout.map(item => {
      if (item.order !== -1) {
        return { ...item, order: currentOrder++ };
      }
      return item;
    });
    await onSave(finalLayout);
    onClose();
  };

  const handleReset = async () => {
    await onReset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl theme-card-structural shadow-2xl rounded-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-background/50">
          <div>
            <h2 className="text-lg font-bold text-foreground tracking-tight">Customize Dashboard</h2>
            <p className="text-xs text-muted-foreground mt-1">Drag to reorder widgets. Set widths for your command center.</p>
          </div>
          <AppButton variant="primary" onClick={onClose} className="p-2 text-muted-foreground hover:bg-accent/10 hover:text-accent rounded-full transition-colors">
            <X className="w-5 h-5" />
          </AppButton>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 bg-background/20">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={localLayout.map(l => l.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {localLayout.map((item) => (
                  <SortableWidgetItem 
                    key={item.id} 
                    item={item} 
                    onToggle={() => toggleVisibility(item.id)}
                    onSpanChange={(s) => setSpan(item.id, s)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-border bg-background/50">
          <AppButton variant="ghost" size="sm" onClick={handleReset} className="text-muted-foreground hover:text-foreground">
            <RefreshCw className="w-4 h-4 mr-2" /> Reset to Default
          </AppButton>
          <div className="flex gap-3">
            <AppButton variant="outline" onClick={onClose}>Cancel</AppButton>
            <AppButton variant="primary" onClick={handleSave} leftIcon={<Check className="w-4 h-4" />}>
              Save Layout
            </AppButton>
          </div>
        </div>

      </div>
    </div>
  );
}

interface SortableWidgetItemProps {
  item: DashboardWidgetConfig;
  onToggle: () => void;
  onSpanChange: (span: 1 | 2 | 3 | 4) => void;
}

function SortableWidgetItem({ item, onToggle, onSpanChange }: SortableWidgetItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  const isActive = item.order !== -1;

  // Pretty name for the ID
  const title = item.id.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={cn(
        "flex items-center gap-4 p-4 rounded-xl border transition-colors",
        isActive 
          ? "bg-surface border-border shadow-sm" 
          : "bg-surface/30 border-border/50 opacity-60",
        isDragging && "ring-2 ring-primary border-primary shadow-xl opacity-100"
      )}
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1">
        <GripVertical className="w-5 h-5" />
      </div>
      
      <div className="flex-1">
        <div className="font-semibold text-sm text-foreground">{title}</div>
        <div className="text-xs text-muted-foreground mt-0.5 font-mono">Type: {item.type}</div>
      </div>

      <div className="flex items-center gap-6">
        {/* Width Selector */}
        {isActive && (
          <div className="flex items-center gap-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground mr-2 tracking-wider">Width</span>
            {[1, 2, 3, 4].map(w => (
              <AppButton variant="secondary"
                key={w}
                onClick={() => onSpanChange(w as any)}
                className={cn(
                  "w-6 h-6 rounded flex items-center justify-center text-xs font-bold transition-all",
                  item.colSpan === w 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "bg-accent/10 text-muted-foreground hover:bg-accent/20 hover:text-foreground"
                )}
              >
                {w}/4
              </AppButton>
            ))}
          </div>
        )}

        {/* Toggle */}
        <AppButton variant="secondary"
          onClick={onToggle}
          className={cn(
            "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
            isActive ? "bg-primary" : "bg-muted"
          )}
        >
          <span className="sr-only">Toggle widget</span>
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
              isActive ? "translate-x-4" : "translate-x-0"
            )}
          />
        </AppButton>
      </div>
    </div>
  );
}

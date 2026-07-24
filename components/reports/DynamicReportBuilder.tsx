"use client";

import React, { useState, useEffect } from "react";
import { UserReportLayout, UIFieldDefinition } from "@/hooks/useLocalReportConfig";
import { X, Save, RotateCcw, GripVertical, Eye, EyeOff } from "lucide-react";
import { AppButton } from "@/components/ui/AppButton";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableColumnItem({ item, onToggle }: { item: UserReportLayout, onToggle: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.field_id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${item.is_visible ? "bg-surface border-slate-200 shadow-sm dark:bg-slate-800 dark:border-slate-700" : "bg-slate-50 border-dashed border-slate-300 opacity-60 dark:bg-slate-900 dark:border-slate-800"}`}>
      <AppButton variant="secondary" type="button" className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 p-1" {...attributes} {...listeners}>
        <GripVertical className="w-5 h-5" />
      </AppButton>
      <div className="flex-1 min-w-0">
        <span className={`text-sm font-bold block truncate ${item.is_visible ? 'text-slate-700 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400'}`}>
          {item.display_name}
        </span>
        <span className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">{item.data_type}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <AppButton variant="secondary"
          type="button"
          onClick={() => onToggle(item.field_id)}
          className={`p-2 rounded-lg border transition-colors ${item.is_visible ? "bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400" : "bg-slate-100 border-slate-200 text-slate-400 hover:bg-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700"}`}
          title={item.is_visible ? "Hide Column" : "Show Column"}
        >
          {item.is_visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </AppButton>
      </div>
    </div>
  );
}

interface DynamicReportBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  layout: UserReportLayout[];
  availableFields: UIFieldDefinition[];
  onSave: (newLayout: UserReportLayout[]) => Promise<void>;
  onReset: () => Promise<void>;
  reportName: string;
}

export default function DynamicReportBuilder({
  isOpen,
  onClose,
  layout,
  availableFields,
  onSave,
  onReset,
  reportName
}: DynamicReportBuilderProps) {
  const [draftLayout, setDraftLayout] = useState<UserReportLayout[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Sync props to draft state
      setDraftLayout(layout.map(l => ({ ...l })));
    }
  }, [isOpen, layout]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  if (!isOpen) return null;

  const handleToggleVisibility = (fieldId: string) => {
    setDraftLayout(prev => prev.map(item => 
      item.field_id === fieldId ? { ...item, is_visible: !item.is_visible } : item
    ));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setDraftLayout((items) => {
        const oldIndex = items.findIndex(i => i.field_id === active.id);
        const newIndex = items.findIndex(i => i.field_id === over.id);
        const newLayout = arrayMove(items, oldIndex, newIndex);
        newLayout.forEach((item, idx) => item.display_order = idx + 1);
        return newLayout;
      });
    }
  };

  // Add missing fields to the bottom of the layout, hidden by default
  const handleAddMissingField = (field: UIFieldDefinition) => {
    const newItem: UserReportLayout = {
      field_id: field.field_key,
      display_order: draftLayout.length + 1,
      is_visible: true,
      column_width: field.default_width || 150,
      field_key: field.field_key,
      display_name: field.display_name,
      data_type: field.data_type,
    };
    setDraftLayout([...draftLayout, newItem]);
  };

  // Determine which fields are not in the layout yet
  const unselectedFields = availableFields.filter(
    af => !draftLayout.some(dl => dl.field_key === af.field_key)
  );

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await onSave(draftLayout);
      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to save layout.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("Are you sure you want to reset to the system default layout?")) return;
    try {
      setIsResetting(true);
      await onReset();
      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to reset layout.");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-slate-200 dark:border-white/10 animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-white/5 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
              Configure Columns: {reportName}
            </h2>
            <p className="text-xs text-slate-500 mt-1 font-medium">Add, remove, or drag columns to rearrange your personal view.</p>
          </div>
          <AppButton variant="primary" onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-surface/10 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </AppButton>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-white/5">
          
          {/* Left Panel: Selected/Active Columns */}
          <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50 dark:bg-slate-950/30">
            <div className="p-4 border-b border-slate-100 dark:border-white/5 shrink-0 bg-surface dark:bg-slate-900">
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Report Layout</h3>
            </div>
            <div className="p-4 flex-1 overflow-y-auto space-y-2">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={draftLayout.map(i => i.field_id)} strategy={verticalListSortingStrategy}>
                  {draftLayout.map((item) => (
                    <SortableColumnItem key={item.field_id} item={item} onToggle={handleToggleVisibility} />
                  ))}
                </SortableContext>
              </DndContext>
              {draftLayout.length === 0 && (
                <div className="text-center py-10 text-sm text-slate-500 italic">No columns selected.</div>
              )}
            </div>
          </div>

          {/* Right Panel: Available Fields */}
          <div className="w-full md:w-72 lg:w-80 flex flex-col min-h-0 bg-surface dark:bg-slate-900">
            <div className="p-4 border-b border-slate-100 dark:border-white/5 shrink-0">
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Available Fields</h3>
            </div>
            <div className="p-4 flex-1 overflow-y-auto space-y-2">
              {unselectedFields.map(field => (
                <div 
                  key={field.field_key}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 hover:border-accent/30 dark:hover:border-accent/30 transition-colors group cursor-pointer"
                  onClick={() => handleAddMissingField(field)}
                >
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block truncate">{field.display_name}</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-accent bg-accent/10 px-2 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity dark:bg-accent/20 dark:text-accent shrink-0">
                    Add +
                  </span>
                </div>
              ))}
              {unselectedFields.length === 0 && (
                <div className="text-center py-10 text-xs text-slate-400">All available fields are already in your layout.</div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50 dark:bg-slate-900 rounded-b-2xl shrink-0">
          <AppButton 
            variant="ghost" 
            className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600"
            onClick={handleReset}
            disabled={isSaving || isResetting}
            leftIcon={<RotateCcw className={`w-4 h-4 ${isResetting ? 'animate-spin' : ''}`} />}
          >
            Reset to Default
          </AppButton>
          
          <div className="flex gap-3">
            <AppButton variant="outline" onClick={onClose} disabled={isSaving || isResetting}>
              Cancel
            </AppButton>
            <AppButton 
              variant="primary" 
              onClick={handleSave}
              disabled={isSaving || isResetting}
              leftIcon={<Save className="w-4 h-4" />}
            >
              {isSaving ? "Saving..." : "Save Layout"}
            </AppButton>
          </div>
        </div>
      </div>
    </div>
  );
}

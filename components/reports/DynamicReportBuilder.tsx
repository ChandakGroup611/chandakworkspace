"use client";

import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { UserReportLayout, UIFieldDefinition } from "@/hooks/useLocalReportConfig";
import { X, Save, RotateCcw, GripVertical, Eye, EyeOff } from "lucide-react";
import { AppButton } from "@/components/ui/AppButton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function SortableColumnItem({ item, onToggle }: { item: UserReportLayout; onToggle: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.field_id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
        item.is_visible
          ? "bg-surface border-border shadow-xs"
          : "bg-sunken border-border opacity-60"
      }`}
    >
      <AppButton
        variant="secondary"
        type="button"
        aria-label={`Drag ${item.display_name} to reorder`}
        className="cursor-grab active:cursor-grabbing text-muted hover:text-foreground p-1"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-5 h-5" />
      </AppButton>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-semibold text-foreground block truncate">
          {item.display_name}
        </span>
        <span className="theme-label font-mono text-muted">{item.data_type}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <AppButton
          variant="secondary"
          type="button"
          aria-label={item.is_visible ? `Hide ${item.display_name}` : `Show ${item.display_name}`}
          onClick={() => onToggle(item.field_id)}
          className={`p-2 rounded-lg border transition-colors ${
            item.is_visible
              ? "bg-success-soft border-success/30 text-success-text hover:bg-success-soft/80"
              : "bg-sunken border-border text-muted hover:bg-surface"
          }`}
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
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDraftLayout(layout.map((l) => ({ ...l })));
    }
  }, [isOpen, layout]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  if (!isOpen) return null;

  const handleToggleVisibility = (fieldId: string) => {
    setDraftLayout((prev) =>
      prev.map((item) => (item.field_id === fieldId ? { ...item, is_visible: !item.is_visible } : item))
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setDraftLayout((items) => {
        const oldIndex = items.findIndex((i) => i.field_id === active.id);
        const newIndex = items.findIndex((i) => i.field_id === over.id);
        const newLayout = arrayMove(items, oldIndex, newIndex);
        newLayout.forEach((item, idx) => {
          item.display_order = idx + 1;
        });
        return newLayout;
      });
    }
  };

  const handleAddMissingField = (field: UIFieldDefinition) => {
    const newItem: UserReportLayout = {
      field_id: field.field_key,
      display_order: draftLayout.length + 1,
      is_visible: true,
      column_width: field.default_width || 150,
      field_key: field.field_key,
      display_name: field.display_name,
      data_type: field.data_type
    };
    setDraftLayout([...draftLayout, newItem]);
  };

  const unselectedFields = availableFields.filter(
    (af) => !draftLayout.some((dl) => dl.field_key === af.field_key)
  );

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await onSave(draftLayout);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save layout.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4 sm:p-0">
        <div className="absolute inset-0 bg-[var(--overlay)]" onClick={onClose} role="presentation" tabIndex={-1} />
        <div className="relative bg-surface rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-border shadow-lg animate-in fade-in zoom-in-95">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                Configure Columns: {reportName}
              </h2>
            </div>
            <AppButton
              variant="ghost"
              type="button"
              aria-label="Close dialog"
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-surface text-muted hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </AppButton>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-border">
            {/* Left Panel: Selected/Active Columns */}
            <div className="flex-1 flex flex-col min-h-0 bg-surface">
              <div className="p-4 border-b border-border shrink-0 bg-surface">
                <h3 className="theme-label text-muted">Report Layout</h3>
              </div>
              <div className="p-4 flex-1 overflow-y-auto space-y-2">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={draftLayout.map((i) => i.field_id)} strategy={verticalListSortingStrategy}>
                    {draftLayout.map((item) => (
                      <SortableColumnItem key={item.field_id} item={item} onToggle={handleToggleVisibility} />
                    ))}
                  </SortableContext>
                </DndContext>
                {draftLayout.length === 0 && (
                  <div className="text-center py-10 text-sm text-muted italic">No columns selected.</div>
                )}
              </div>
            </div>

            {/* Right Panel: Available Fields */}
            <div className="w-full md:w-72 lg:w-80 flex flex-col min-h-0 bg-sunken">
              <div className="p-4 border-b border-border shrink-0 bg-sunken">
                <h3 className="theme-label text-muted">Available Fields</h3>
              </div>
              <div className="p-4 flex-1 overflow-y-auto space-y-2">
                {unselectedFields.map((field) => (
                  <div
                    key={field.field_key}
                    role="button"
                    tabIndex={0}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-border bg-surface hover:border-theme-btn-primary/40 transition-colors group cursor-pointer"
                    onClick={() => handleAddMissingField(field)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleAddMissingField(field);
                      }
                    }}
                  >
                    <div className="min-w-0">
                      <span className="text-xs font-medium text-foreground block truncate">
                        {field.display_name}
                      </span>
                    </div>
                    <span className="theme-label text-theme-btn-primary bg-theme-btn-primary/10 px-2 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      Add +
                    </span>
                  </div>
                ))}
                {unselectedFields.length === 0 && (
                  <div className="text-center py-10 text-xs text-muted">All available fields are already in your layout.</div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border flex items-center justify-between bg-surface rounded-b-2xl shrink-0">
            <AppButton
              variant="ghost"
              type="button"
              className="text-danger hover:bg-danger-soft hover:text-danger"
              onClick={() => setIsResetConfirmOpen(true)}
              disabled={isSaving || isResetting}
              leftIcon={<RotateCcw className={`w-4 h-4 ${isResetting ? "animate-spin" : ""}`} />}
            >
              Reset to Default
            </AppButton>

            <div className="flex gap-3">
              <AppButton variant="outline" type="button" onClick={onClose} disabled={isSaving || isResetting}>
                Cancel
              </AppButton>
              <AppButton
                variant="primary"
                type="button"
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

      <ConfirmDialog
        open={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        title="Reset Column Layout"
        description="Are you sure you want to reset to the system default layout?"
        confirmLabel="Reset to Default"
        tone="danger"
        onConfirm={async () => {
          try {
            setIsResetting(true);
            await onReset();
            onClose();
          } catch (err) {
            console.error(err);
            toast.error("Failed to reset layout.");
          } finally {
            setIsResetting(false);
          }
        }}
      />
    </>
  );
}

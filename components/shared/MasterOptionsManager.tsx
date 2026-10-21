"use client";

import React, { useState } from "react";
import { toast } from "react-toastify";
import { AppButton } from "@/components/ui/AppButton";
import { Settings, Trash2 } from "lucide-react";
import { deleteMasterEntity } from "@/lib/actions/masters";
import { EnterpriseModalShell } from "@/components/ui/enterprise/EnterpriseModalShell";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { InlineAlert } from "@/components/ui/feedback";

interface MasterOptionsManagerProps {
  title: string;
  tableName: string;
  options: any[];
  onClose: () => void;
  onUpdate: () => void;
}

export function MasterOptionsManager({
  title,
  tableName,
  options,
  onClose,
  onUpdate,
}: MasterOptionsManagerProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<{ id: string; name: string } | null>(null);

  const confirmDelete = async () => {
    if (!confirmTarget) return;
    const { id } = confirmTarget;
    setDeletingId(id);
    setConfirmTarget(null);

    try {
      const res = await deleteMasterEntity(tableName, id, true);
      if (!res.success) {
        toast.error("Error deleting option: " + res.error);
      } else {
        toast.success("Option deleted successfully");
        onUpdate();
      }
    } catch (e: any) {
      toast.error("Error: " + e.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <EnterpriseModalShell
        open={true}
        onClose={onClose}
        size="md"
        title={
          <span className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-primary" />
            Manage {title}
          </span>
        }
      >
        <div className="space-y-4">
          <InlineAlert tone="warning">
            Deleting a master option is permanent. Ensure no critical existing records rely on these options before removing them.
          </InlineAlert>

          <div className="max-h-[50vh] overflow-y-auto">
            {options.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted">No options found.</div>
            ) : (
              <ul className="space-y-1">
                {options.map((opt) => (
                  <li
                    key={opt.id}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-surface-hover group transition-colors border border-border"
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="text-xs font-semibold text-foreground truncate">{opt.name}</span>
                      {opt.industry_name && (
                        <span className="text-[11px] text-muted truncate">Under: {opt.industry_name}</span>
                      )}
                    </div>
                    <AppButton
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete option ${opt.name}`}
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 p-0 text-muted hover:text-danger rounded-md"
                      onClick={() => setConfirmTarget({ id: opt.id, name: opt.name })}
                      disabled={deletingId === opt.id}
                    >
                      <Trash2 className={`w-3.5 h-3.5 ${deletingId === opt.id ? "animate-pulse" : ""}`} />
                    </AppButton>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </EnterpriseModalShell>

      <ConfirmDialog
        open={Boolean(confirmTarget)}
        onClose={() => setConfirmTarget(null)}
        onConfirm={confirmDelete}
        title="Delete option"
        description={
          confirmTarget
            ? `Are you sure you want to delete '${confirmTarget.name}'? This may affect existing records that use this option.`
            : undefined
        }
        confirmLabel="Delete"
        tone="danger"
      />
    </>
  );
}

export default MasterOptionsManager;

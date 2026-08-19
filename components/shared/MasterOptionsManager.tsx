import { toast } from 'react-toastify';
"use client";

import React, { useState } from "react";
import { AppButton } from "@/components/ui/AppButton";
import { X, Settings, Trash2, ShieldAlert } from "lucide-react";
import { deleteMasterEntity } from "@/lib/actions/masters";

interface MasterOptionsManagerProps {
  title: string;
  tableName: string;
  options: any[];
  onClose: () => void;
  onUpdate: () => void;
}

export function MasterOptionsManager({ title, tableName, options, onClose, onUpdate }: MasterOptionsManagerProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete '${name}'? This may affect existing records that use this option.`)) return;
    
    setDeletingId(id);
    try {
      // Hard delete or soft delete depending on requirement. The action handles permissions.
      const res = await deleteMasterEntity(tableName, id, true);
      if (!res.success) {
        toast.error("Error deleting option: " + res.error);
      } else {
        onUpdate();
      }
    } catch (e: any) {
      toast.error("Error: " + e.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-sm bg-surface/40">
      <div className="theme-card-structural shadow-2xl rounded-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0 bg-surface/50">
          <h2 className="text-base font-black text-foreground flex items-center gap-2">
            <Settings className="w-5 h-5 text-theme-icon" />
            Manage {title}
          </h2>
          <AppButton variant="secondary" onClick={onClose} className="p-1.5 h-auto rounded-full hover:bg-surface/5">
            <X className="h-4 w-4 text-muted" />
          </AppButton>
        </div>

        <div className="p-4 bg-amber-50 border-b border-amber-100 flex items-start gap-3 shrink-0">
          <ShieldAlert className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 font-medium leading-relaxed">
            Deleting a master option is permanent. Ensure no critical existing records rely on these options before removing them.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {options.length === 0 ? (
            <div className="text-center p-8 text-sm text-muted">No options found.</div>
          ) : (
            <ul className="space-y-1 p-2">
              {options.map((opt) => (
                <li key={opt.id} className="flex items-center justify-between p-3 hover:opacity-90/5 rounded-xl group transition-colors border border-transparent hover:border-theme-btn-primary/10">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-foreground">{opt.name}</span>
                    {opt.industry_name && (
                      <span className="text-[10px] text-muted uppercase tracking-wider font-semibold">Under: {opt.industry_name}</span>
                    )}
                  </div>
                  <AppButton 
                    variant="outline" 
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 text-danger hover:text-danger hover:bg-red-50 hover:border-red-200 border-transparent bg-transparent shadow-none"
                    onClick={() => handleDelete(opt.id, opt.name)}
                    disabled={deletingId === opt.id}
                  >
                    <Trash2 className={`w-4 h-4 ${deletingId === opt.id ? 'animate-pulse' : ''}`} />
                  </AppButton>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

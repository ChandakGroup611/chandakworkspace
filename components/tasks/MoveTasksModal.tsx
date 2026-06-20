"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AppButton } from "@/components/ui/AppButton";
import { Loader2, ArrowRight } from "lucide-react";
import { fetchWorkspaceStakeholders, moveTasksBatchOperation, fetchTaskParticipants } from "@/lib/actions/compliance";
import { fetchComplianceWorkspaces } from "@/lib/actions/compliance";

interface MoveTasksModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskIds: string[];
  tasks: any[];
  onSuccess: () => void;
}

export function MoveTasksModal({ open, onOpenChange, taskIds, tasks, onSuccess }: MoveTasksModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  
  // Step 1: Select Workspace
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [targetWorkspaceId, setTargetWorkspaceId] = useState<string>("");
  
  // Step 2: Mapping
  const [stakeholders, setStakeholders] = useState<any[]>([]);
  const [mappings, setMappings] = useState<Record<string, { newExecutive?: string; newWatchers?: string[] }>>({});
  const [taskDetails, setTaskDetails] = useState<any[]>([]);

  useEffect(() => {
    if (open && step === 1) {
      setLoading(true);
      fetchComplianceWorkspaces(false)
        .then(setWorkspaces)
        .finally(() => setLoading(false));
    }
  }, [open, step]);

  const handleNext = async () => {
    if (!targetWorkspaceId) return;
    setLoading(true);
    try {
      const shs = await fetchWorkspaceStakeholders(targetWorkspaceId);
      setStakeholders(shs);
      
      const validUids = new Set(shs.map(s => s.user_id));

      const details = [];
      const newMappings: Record<string, { newExecutive?: string; newWatchers?: string[] }> = {};
      
      for (const id of taskIds) {
        const t = tasks.find(x => x.id === id);
        if (!t) continue;
        
        // Fetch current participants (watchers)
        const participants = await fetchTaskParticipants(id);
        
        // Check if assigned_to is valid
        let reqNewExec = false;
        if (t.assigned_to && !validUids.has(t.assigned_to)) {
          reqNewExec = true;
        }

        // Check if watchers are valid
        let reqNewWatchers = false;
        for (const p of participants) {
          if (!validUids.has(p)) reqNewWatchers = true;
        }

        if (reqNewExec || reqNewWatchers) {
          details.push({ ...t, reqNewExec, reqNewWatchers, oldWatchers: participants });
          newMappings[id] = { 
            newExecutive: reqNewExec ? "" : t.assigned_to, 
            newWatchers: reqNewWatchers ? [] : participants 
          };
        }
      }

      setTaskDetails(details);
      setMappings(newMappings);
      setStep(2);
    } catch (e) {
      console.error(e);
      alert("Failed to load stakeholders.");
    } finally {
      setLoading(false);
    }
  };

  const handleMove = async () => {
    // Validate mappings
    for (const d of taskDetails) {
      const map = mappings[d.id];
      if (d.reqNewExec && !map?.newExecutive) {
        alert(`Please select a new executive for task ${d.subject || d.id}`);
        return;
      }
    }

    setLoading(true);
    try {
      await moveTasksBatchOperation(taskIds, targetWorkspaceId, mappings);
      onSuccess();
      onOpenChange(false);
      setStep(1);
      setTargetWorkspaceId("");
    } catch (e: any) {
      alert("Move failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      onOpenChange(val);
      if (!val) { setStep(1); setTargetWorkspaceId(""); }
    }}>
      <DialogContent className="sm:max-w-[500px] bg-white dark:bg-[#0B0F19] border border-gray-200 dark:border-gray-800 shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-gray-100">
            {step === 1 ? `Move ${taskIds.length} Task(s)` : "Map Assignees & Watchers"}
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          {step === 1 && (
            <div className="space-y-4">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Target Workspace</label>
              <select
                value={targetWorkspaceId}
                onChange={(e) => setTargetWorkspaceId(e.target.value)}
                className="w-full text-sm bg-white dark:bg-[#151923] text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-white/10 rounded-lg px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select a Workspace...</option>
                {workspaces.map(w => (
                  <option key={w.id} value={w.id}>{w.workspace_name}</option>
                ))}
              </select>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
              {taskDetails.length === 0 ? (
                <div className="text-sm text-emerald-500 bg-emerald-500/10 p-4 rounded-lg border border-emerald-500/20">
                  All current assignees and watchers are already members of the target workspace. No mapping required!
                </div>
              ) : (
                <>
                  <div className="text-sm text-amber-500 bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
                    Some tasks have assignees or watchers who are <strong>not</strong> members of the target workspace. Please select valid stakeholders.
                  </div>
                  
                  {taskDetails.map((t) => (
                    <div key={t.id} className="p-3 border border-gray-200 dark:border-white/10 rounded-lg space-y-3 bg-gray-50 dark:bg-white/[0.02]">
                      <div className="font-semibold text-sm">{t.subject || t.id}</div>
                      
                      {t.reqNewExec && (
                        <div>
                          <label className="text-xs font-bold text-gray-500 uppercase">New Executive</label>
                          <select
                            value={mappings[t.id]?.newExecutive || ""}
                            onChange={(e) => setMappings(prev => ({ ...prev, [t.id]: { ...prev[t.id], newExecutive: e.target.value } }))}
                            className="w-full mt-1 text-xs bg-white dark:bg-[#151923] border border-gray-300 dark:border-white/10 rounded px-2 py-1.5"
                          >
                            <option value="">Select Executive...</option>
                            {stakeholders.map(s => (
                              <option key={s.user_id} value={s.user_id}>{s.full_name || s.email}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {t.reqNewWatchers && (
                        <div>
                          <label className="text-xs font-bold text-gray-500 uppercase">New Watchers</label>
                          {/* simple multiple select for watchers */}
                          <select
                            multiple
                            size={3}
                            value={mappings[t.id]?.newWatchers || []}
                            onChange={(e) => {
                              const opts = Array.from(e.target.selectedOptions, option => option.value);
                              setMappings(prev => ({ ...prev, [t.id]: { ...prev[t.id], newWatchers: opts } }));
                            }}
                            className="w-full mt-1 text-xs bg-white dark:bg-[#151923] border border-gray-300 dark:border-white/10 rounded px-2 py-1.5"
                          >
                            {stakeholders.map(s => (
                              <option key={s.user_id} value={s.user_id}>{s.full_name || s.email}</option>
                            ))}
                          </select>
                          <p className="text-[10px] text-gray-400 mt-1">Hold Ctrl/Cmd to select multiple.</p>
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
        
        <DialogFooter>
          {step === 1 ? (
            <>
              <AppButton variant="ghost" onClick={() => onOpenChange(false)}>Cancel</AppButton>
              <AppButton variant="primary" disabled={!targetWorkspaceId || loading} onClick={handleNext}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Next <ArrowRight className="h-4 w-4 ml-2" />
              </AppButton>
            </>
          ) : (
            <>
              <AppButton variant="ghost" onClick={() => setStep(1)}>Back</AppButton>
              <AppButton variant="primary" disabled={loading} onClick={handleMove}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Confirm Move
              </AppButton>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

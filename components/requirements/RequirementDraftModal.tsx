"use client";

import React, { useState } from "react";
import { AppCard, AppCardHeader, AppCardTitle, AppCardContent } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { X, Layers, Target, FileCheck2, Zap, AlertTriangle } from "lucide-react";

interface RequirementDraftModalProps {
  workspaceId: string;
  onClose: () => void;
  onSuccess: (data: any) => Promise<void>;
  regulatoryOptions: string[];
}

export default function RequirementDraftModal({ workspaceId, onClose, onSuccess, regulatoryOptions }: RequirementDraftModalProps) {
  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [functionalScope, setFunctionalScope] = useState("");
  const [technicalScope, setTechnicalScope] = useState("");
  const [risk, setRisk] = useState("Low");
  const [regulatoryScope, setRegulatoryScope] = useState("");
  const [budget, setBudget] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !objective || !functionalScope) {
      setError("Title, objective, and functional scope are required.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSuccess({
        workspace_id: workspaceId,
        title,
        objective,
        functional_scope: functionalScope,
        technical_scope: technicalScope,
        risk_assessment: risk,
        custom_fields: {
          regulatory_scope: regulatoryScope,
          budget_allocation_usd: budget ? Number(budget) : null,
          versionTag: "v1.0-DRAFT",
          versionHistory: [
            {
              v: "v1.0-DRAFT",
              author: "Author",
              date: new Date().toLocaleDateString(),
              changes: "Initial draft creation"
            }
          ],
          criteria: []
        }
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create requirement");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <AppCard className="w-full max-w-2xl bg-[#0a0d14] border-white/10 shadow-2xl relative my-auto animate-in fade-in zoom-in-95 duration-200">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <AppCardHeader className="border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <AppCardTitle className="text-xl text-white">Draft New Requirement Scope</AppCardTitle>
              <p className="text-xs text-gray-400 mt-1">Define the business and technical constraints for the new feature.</p>
            </div>
          </div>
        </AppCardHeader>

        <AppCardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Target className="h-3.5 w-3.5 text-blue-400" />
                  Requirement Title *
                </label>
                <AppInput 
                  placeholder="e.g. Universal queue-based async event dispatcher service" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  className="bg-white/5 border-white/10"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Target className="h-3.5 w-3.5 text-blue-400" />
                  Business Objective *
                </label>
                <textarea 
                  className="w-full h-24 p-3 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-200 focus:outline-none focus:border-amber-500/50 resize-none"
                  placeholder="Explain why this requirement exists and what value it brings..."
                  value={objective}
                  onChange={e => setObjective(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <FileCheck2 className="h-3.5 w-3.5 text-emerald-400" />
                    Functional Scope *
                  </label>
                  <textarea 
                    className="w-full h-32 p-3 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-200 focus:outline-none focus:border-amber-500/50 resize-none"
                    placeholder="Describe what the system should do..."
                    value={functionalScope}
                    onChange={e => setFunctionalScope(e.target.value)}
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-indigo-400" />
                    Technical Scope
                  </label>
                  <textarea 
                    className="w-full h-32 p-3 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-200 focus:outline-none focus:border-amber-500/50 resize-none"
                    placeholder="Describe how the system should do it (architecture, DB, APIs)..."
                    value={technicalScope}
                    onChange={e => setTechnicalScope(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Risk Assessment</label>
                  <select
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-300 outline-none focus:border-indigo-500 cursor-pointer"
                    value={risk}
                    onChange={(e) => setRisk(e.target.value)}
                  >
                    <option value="Low" className="bg-[#0a0d14]">Low Risk</option>
                    <option value="Medium" className="bg-[#0a0d14]">Medium Risk</option>
                    <option value="High" className="bg-[#0a0d14]">High Risk</option>
                  </select>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Regulatory Mapping</label>
                  <select
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-300 outline-none focus:border-indigo-500 cursor-pointer"
                    value={regulatoryScope}
                    onChange={(e) => setRegulatoryScope(e.target.value)}
                  >
                    <option value="" disabled className="bg-[#0a0d14]">Select Framework...</option>
                    {regulatoryOptions.map(opt => (
                      <option key={opt} value={opt} className="bg-[#0a0d14]">{opt}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">CAPEX Budget (USD)</label>
                  <AppInput 
                    type="number"
                    placeholder="e.g. 15000"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="h-8 text-xs font-mono bg-white/5 border-white/10"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
              <AppButton type="button" variant="ghost" onClick={onClose} disabled={loading}>
                Cancel
              </AppButton>
              <AppButton type="submit" variant="primary" disabled={loading}>
                {loading ? "Drafting..." : "Draft Requirement"}
              </AppButton>
            </div>
          </form>
        </AppCardContent>
      </AppCard>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { AppCard, AppCardContent } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { CheckCircle, XCircle, PauseCircle, MessageSquareWarning, ArrowRight } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";

interface ApprovalActionPanelProps {
  flowId: string;
  requirementId: string;
  currentLevel: number;
  departmentName: string;
  onAction: (action: string, remarks: string) => Promise<void>;
  isSuperAdmin?: boolean;
}

export default function ApprovalActionPanel({ 
  flowId, 
  requirementId, 
  currentLevel, 
  departmentName, 
  onAction,
  isSuperAdmin = false
}: ApprovalActionPanelProps) {
  const { theme } = useTheme();
  const isLightMode = ["executive-light", "material-ocean", "aurora-breeze", "pure-elegance", "pristine-white"].includes(theme);

  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!activeAction) return;
    if (remarks.trim() === "") {
      setError("Remarks are strictly mandatory for all workflow actions.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onAction(activeAction, remarks);
      setActiveAction(null);
      setRemarks("");
    } catch (err: any) {
      setError(err.message || "Failed to process workflow action");
    } finally {
      setLoading(false);
    }
  };

  const actions = [
    { id: "Approve", label: "Approve", icon: CheckCircle, color: "text-emerald-600 bg-emerald-50 hover:bg-emerald-100" },
    { id: "Reject", label: "Reject", icon: XCircle, color: "text-red-600 bg-red-50 hover:bg-red-100" },
    { id: "Hold", label: "Hold", icon: PauseCircle, color: "text-amber-600 bg-amber-50 hover:bg-amber-100" },
    { id: "Clarification", label: "Need Clarification", icon: MessageSquareWarning, color: "text-accent bg-accent/10 hover:bg-accent/10" }
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <AppCard className={`w-full overflow-hidden bg-surface border-border`}>
        <div className={`px-4 py-3 border-b flex items-center justify-between bg-elevated border-border`}>
          <div className="flex items-center gap-3">
            <div className={`p-1.5 rounded-full bg-accent/10 text-accent`}>
              <ArrowRight className="h-4 w-4" />
            </div>
            <div>
              <h4 className={`text-sm font-bold text-foreground`}>Workflow Action Required</h4>
              <p className={`text-[10px] uppercase tracking-wider text-muted`}>
                Level {currentLevel} • {departmentName}
                {isSuperAdmin && <span className="ml-2 text-accent font-bold">(Super Admin Override)</span>}
              </p>
            </div>
          </div>
        </div>

        <AppCardContent className="p-4 space-y-4">
          {error && (
            <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-xs font-medium">
              {error}
            </div>
          )}

          {!activeAction ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {actions.map((action) => {
                const Icon = action.icon;
                return (
                  <AppButton variant="secondary"
                    key={action.id}
                    onClick={() => { setActiveAction(action.id); setError(null); }}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${action.color} border-transparent`}
                  >
                    <Icon className="h-5 w-5 mb-1.5" />
                    <span className="text-xs font-bold">{action.label}</span>
                  </AppButton>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3 animate-in fade-in slide-in-from-right-2">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
                  actions.find(a => a.id === activeAction)?.color.split(' ')[0]
                }`}>
                  {React.createElement(actions.find(a => a.id === activeAction)?.icon || ArrowRight, { className: "h-4 w-4" })}
                  Action: {activeAction}
                </span>
                <AppButton variant="secondary" 
                  onClick={() => setActiveAction(null)}
                  className={`text-[10px] font-bold uppercase hover:underline text-muted`}
                >
                  Change Action
                </AppButton>
              </div>

              <div>
                <textarea
                  className={`w-full p-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-accent/50 min-h-[80px] resize-none ${
                    "bg-white border-border text-foreground placeholder:text-gray-400"
                  }`}
                  placeholder="Enter mandatory justification or remarks..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="flex justify-end gap-2">
                <AppButton variant="primary" onClick={handleSubmit} disabled={loading} className="w-full sm:w-auto">
                  {loading ? "Processing..." : "Confirm & Sign"}
                </AppButton>
              </div>
            </div>
          )}
        </AppCardContent>
      </AppCard>
    </div>
  );
}

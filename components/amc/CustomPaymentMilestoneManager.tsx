"use client";

import React from "react";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { 
  Plus, 
  Trash2, 
  Percent, 
  Layers, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  DollarSign, 
  Info, 
  ChevronRight,
  ShieldCheck,
  FileText
} from "lucide-react";

export interface PaymentMilestone {
  id: string;
  phaseName: string;
  percentage?: number;
  amount?: number;
  amountReleased?: number;
  status: 'Pending' | 'Amount Released' | 'Partially Released' | 'On Hold' | 'Completed';
  targetDate?: string;
  releaseDate?: string;
  remark?: string;
}

interface CustomPaymentMilestoneManagerProps {
  customType: 'percent_wise' | 'phase_wise';
  onCustomTypeChange: (type: 'percent_wise' | 'phase_wise') => void;
  milestones: PaymentMilestone[];
  onAddMilestone: () => void;
  onUpdateMilestone: (id: string, field: keyof PaymentMilestone, value: any) => void;
  onRemoveMilestone: (id: string) => void;
  totalBaseAmount: number;
  currencySymbol?: string;
  levelLabel?: string;
}

export function CustomPaymentMilestoneManager({
  customType,
  onCustomTypeChange,
  milestones = [],
  onAddMilestone,
  onUpdateMilestone,
  onRemoveMilestone,
  totalBaseAmount = 0,
  currencySymbol = "₹",
  levelLabel = "Payment Schedule"
}: CustomPaymentMilestoneManagerProps) {

  // Compute summary stats
  const totalAllocatedAmount = milestones.reduce((sum, m) => sum + (Number(m.amount) || 0), 0);
  const totalAllocatedPercent = totalBaseAmount > 0 
    ? (totalAllocatedAmount / totalBaseAmount) * 100 
    : milestones.reduce((sum, m) => sum + (Number(m.percentage) || 0), 0);
  
  const totalReleasedAmount = milestones.reduce((sum, m) => sum + (Number(m.amountReleased) || 0), 0);
  const totalReleasedPercent = totalBaseAmount > 0 
    ? (totalReleasedAmount / totalBaseAmount) * 100 
    : 0;

  const totalPendingAmount = Math.max(0, totalAllocatedAmount - totalReleasedAmount);

  const getStatusBadgeClass = (status: PaymentMilestone['status']) => {
    switch (status) {
      case 'Amount Released':
      case 'Completed':
        return 'bg-success/10 text-success border-success/30';
      case 'Partially Released':
        return 'bg-theme-btn-primary/10 text-theme-icon border-theme-btn-primary/30';
      case 'On Hold':
        return 'bg-danger/10 text-danger border-danger/30';
      case 'Pending':
      default:
        return 'bg-warning/10 text-warning border-warning/30';
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-border/80 bg-surface/80 p-4 sm:p-5 shadow-[var(--shadow-ambient)]">
      {/* Top Controls: Mode Selection & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border p-0.5 bg-elevated">
            <AppButton
              type="button"
              variant={customType === 'percent_wise' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => onCustomTypeChange('percent_wise')}
              leftIcon={<Percent className="h-3.5 w-3.5" />}
              className="h-7 px-3 text-xs font-semibold rounded-md"
            >
              % Wise Breakdown
            </AppButton>
            <AppButton
              type="button"
              variant={customType === 'phase_wise' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => onCustomTypeChange('phase_wise')}
              leftIcon={<Layers className="h-3.5 w-3.5" />}
              className="h-7 px-3 text-xs font-semibold rounded-md"
            >
              Phase Wise Breakdown
            </AppButton>
          </div>
        </div>

        <AppButton
          type="button"
          variant="outline"
          size="sm"
          onClick={onAddMilestone}
          leftIcon={<Plus className="h-3.5 w-3.5" />}
          className="h-8 text-xs font-semibold shrink-0"
        >
          Add {customType === 'percent_wise' ? '% Stage' : 'Phase Milestone'}
        </AppButton>
      </div>

      {/* Progress & Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-elevated/60 border border-border/60 text-xs">
        <div>
          <span className="text-muted block text-[11px] uppercase tracking-wider font-semibold">Total Amount</span>
          <span className="font-bold text-foreground font-mono text-sm">
            {currencySymbol}{totalBaseAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div>
          <span className="text-muted block text-[11px] uppercase tracking-wider font-semibold">Total Scheduled</span>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-foreground font-mono text-sm">
              {currencySymbol}{totalAllocatedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
              Math.abs(totalAllocatedPercent - 100) < 0.1 
                ? 'bg-success/10 text-success' 
                : 'bg-warning/10 text-warning'
            }`}>
              ({totalAllocatedPercent.toFixed(1)}%)
            </span>
          </div>
        </div>
        <div>
          <span className="text-muted block text-[11px] uppercase tracking-wider font-semibold">Amount Released</span>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-success font-mono text-sm">
              {currencySymbol}{totalReleasedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-muted">({totalReleasedPercent.toFixed(1)}%)</span>
          </div>
        </div>
        <div>
          <span className="text-muted block text-[11px] uppercase tracking-wider font-semibold">Pending Release</span>
          <span className="font-bold text-warning font-mono text-sm">
            {currencySymbol}{totalPendingAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Visual Multi-Segment Bar */}
      {totalBaseAmount > 0 && (
        <div className="space-y-1">
          <div className="w-full bg-border/60 h-2 rounded-full overflow-hidden flex">
            <div 
              className="bg-success transition-all duration-300 h-full" 
              style={{ width: `${Math.min(100, totalReleasedPercent)}%` }} 
              title={`Released: ${totalReleasedPercent.toFixed(1)}%`}
            />
            <div 
              className="bg-theme-btn-primary/60 transition-all duration-300 h-full" 
              style={{ width: `${Math.min(100, Math.max(0, totalAllocatedPercent - totalReleasedPercent))}%` }} 
              title={`Scheduled (Pending): ${(totalAllocatedPercent - totalReleasedPercent).toFixed(1)}%`}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted">
            <span>Released: {totalReleasedPercent.toFixed(1)}%</span>
            <span>Scheduled: {totalAllocatedPercent.toFixed(1)}% / 100%</span>
          </div>
        </div>
      )}

      {/* List of Milestones */}
      <div className="space-y-3 pt-1">
        {milestones.length === 0 ? (
          <div className="py-6 text-center text-muted border border-dashed border-border rounded-xl text-xs space-y-1">
            <p className="font-medium">No custom payment {customType === 'percent_wise' ? 'percentage stages' : 'phases'} added.</p>
            <p className="text-[11px] text-muted/80">Click &ldquo;Add {customType === 'percent_wise' ? '% Stage' : 'Phase Milestone'}&rdquo; to define release conditions and stages.</p>
          </div>
        ) : (
          milestones.map((m, idx) => (
            <div
              key={m.id}
              className="p-3.5 rounded-xl border border-border/80 bg-background/60 hover:border-theme-btn-primary/40 transition-colors space-y-3"
            >
              {/* Row 1: Phase Name & Status + Delete */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-border/40">
                <div className="flex items-center gap-2 flex-1">
                  <span className="h-5 w-5 rounded-full bg-theme-btn-primary/10 text-theme-icon font-bold text-[10px] flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <AppInput
                    value={m.phaseName}
                    onChange={(e) => onUpdateMilestone(m.id, 'phaseName', e.target.value)}
                    placeholder={`e.g., Phase ${idx + 1}: Advance / Sign-off / UAT`}
                    className="h-8 text-xs font-semibold flex-1"
                  />
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <select
                    value={m.status || 'Pending'}
                    onChange={(e) => onUpdateMilestone(m.id, 'status', e.target.value)}
                    className={`h-8 px-2.5 rounded-lg text-xs font-semibold border outline-none cursor-pointer ${getStatusBadgeClass(m.status)}`}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Amount Released">Amount Released</option>
                    <option value="Partially Released">Partially Released</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Completed">Completed</option>
                  </select>

                  <AppButton
                    variant="secondary"
                    type="button"
                    onClick={() => onRemoveMilestone(m.id)}
                    className="p-1.5 h-8 w-8 text-danger hover:bg-danger/10 rounded-lg transition-colors shrink-0"
                    title="Remove Milestone"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </AppButton>
                </div>
              </div>

              {/* Row 2: Percentage/Amount, Released Amount, Target Date, Release Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {customType === 'percent_wise' ? (
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-muted uppercase tracking-wider">
                      Percentage (%)
                    </label>
                    <div className="flex items-center gap-1.5">
                      <AppInput
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={m.percentage ?? ""}
                        onChange={(e) => onUpdateMilestone(m.id, 'percentage', e.target.value)}
                        placeholder="0.00"
                        className="h-8 text-xs font-mono font-medium flex-1"
                      />
                      <span className="text-xs font-bold text-muted font-mono whitespace-nowrap">
                        = {currencySymbol}{(m.amount || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-muted uppercase tracking-wider">
                      Milestone Amount ({currencySymbol})
                    </label>
                    <div className="flex items-center gap-1.5">
                      <AppInput
                        type="number"
                        step="0.01"
                        min="0"
                        value={m.amount ?? ""}
                        onChange={(e) => onUpdateMilestone(m.id, 'amount', e.target.value)}
                        placeholder="0.00"
                        className="h-8 text-xs font-mono font-medium flex-1"
                      />
                      {totalBaseAmount > 0 && (
                        <span className="text-xs font-bold text-muted font-mono whitespace-nowrap">
                          ({((Number(m.amount || 0) / totalBaseAmount) * 100).toFixed(1)}%)
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-muted uppercase tracking-wider">
                    Amount Released ({currencySymbol})
                  </label>
                  <AppInput
                    type="number"
                    step="0.01"
                    min="0"
                    value={m.amountReleased ?? ""}
                    onChange={(e) => onUpdateMilestone(m.id, 'amountReleased', e.target.value)}
                    placeholder="0.00"
                    className="h-8 text-xs font-mono font-semibold text-success"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-muted uppercase tracking-wider">
                    Target / Due Date
                  </label>
                  <AppInput
                    type="date"
                    value={m.targetDate || ""}
                    onChange={(e) => onUpdateMilestone(m.id, 'targetDate', e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-muted uppercase tracking-wider">
                    Release Date
                  </label>
                  <AppInput
                    type="date"
                    value={m.releaseDate || ""}
                    onChange={(e) => onUpdateMilestone(m.id, 'releaseDate', e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              {/* Row 3: Remarks / Release Conditions */}
              <div className="space-y-1 pt-1">
                <label className="text-[10px] font-semibold text-muted uppercase tracking-wider">
                  Remarks / Release Condition & Milestones
                </label>
                <AppInput
                  value={m.remark || ""}
                  onChange={(e) => onUpdateMilestone(m.id, 'remark', e.target.value)}
                  placeholder="e.g., After complete Phase 1 delivery, release amount upon IT verification sign-off."
                  className="h-8 text-xs"
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

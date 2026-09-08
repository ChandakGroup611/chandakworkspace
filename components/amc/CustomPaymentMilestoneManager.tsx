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
  FileText,
  Sparkles,
  Zap
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

  // Compute summary stats with 2-decimal precision
  const totalAllocatedAmount = parseFloat(milestones.reduce((sum, m) => sum + (Number(m.amount) || 0), 0).toFixed(2));
  const totalAllocatedPercent = totalBaseAmount > 0 
    ? parseFloat(((totalAllocatedAmount / totalBaseAmount) * 100).toFixed(2))
    : parseFloat(milestones.reduce((sum, m) => sum + (Number(m.percentage) || 0), 0).toFixed(2));
  
  const totalReleasedAmount = parseFloat(milestones.reduce((sum, m) => sum + (Number(m.amountReleased) || 0), 0).toFixed(2));
  const totalReleasedPercent = totalBaseAmount > 0 
    ? parseFloat(((totalReleasedAmount / totalBaseAmount) * 100).toFixed(2))
    : 0;

  const totalPendingAmount = Math.max(0, parseFloat((totalAllocatedAmount - totalReleasedAmount).toFixed(2)));
  const unallocatedAmount = Math.max(0, parseFloat((totalBaseAmount - totalAllocatedAmount).toFixed(2)));
  const unallocatedPercent = Math.max(0, parseFloat((100 - totalAllocatedPercent).toFixed(2)));

  const handleQuickRelease = (m: PaymentMilestone) => {
    const fullAmt = m.amount || 0;
    onUpdateMilestone(m.id, 'amountReleased', fullAmt);
    onUpdateMilestone(m.id, 'status', 'Amount Released');
    if (!m.releaseDate) {
      onUpdateMilestone(m.id, 'releaseDate', new Date().toISOString().split('T')[0]);
    }
  };

  const handleAutoFillRemainder = () => {
    if (unallocatedAmount <= 0 && unallocatedPercent <= 0) return;
    onAddMilestone();
  };

  const getStatusBadgeClass = (status: PaymentMilestone['status']) => {
    switch (status) {
      case 'Amount Released':
      case 'Completed':
        return 'bg-success/15 text-success border-success/30 font-semibold';
      case 'Partially Released':
        return 'bg-theme-btn-primary/15 text-theme-icon border-theme-btn-primary/30 font-semibold';
      case 'On Hold':
        return 'bg-danger/15 text-danger border-danger/30 font-semibold';
      case 'Pending':
      default:
        return 'bg-warning/15 text-warning border-warning/30 font-semibold';
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-border/80 bg-surface/90 p-4 sm:p-6 shadow-[var(--shadow-ambient)] transition-all">
      {/* Top Controls: Mode Selection & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className="flex rounded-xl border border-border p-1 bg-elevated/70">
            <AppButton
              type="button"
              variant={customType === 'percent_wise' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => onCustomTypeChange('percent_wise')}
              leftIcon={<Percent className="h-3.5 w-3.5" />}
              className="h-7 px-3 text-xs font-semibold rounded-lg"
            >
              % Wise Breakdown
            </AppButton>
            <AppButton
              type="button"
              variant={customType === 'phase_wise' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => onCustomTypeChange('phase_wise')}
              leftIcon={<Layers className="h-3.5 w-3.5" />}
              className="h-7 px-3 text-xs font-semibold rounded-lg"
            >
              Phase Wise Breakdown
            </AppButton>
          </div>
          <span className="text-xs text-muted hidden md:inline font-medium">({levelLabel})</span>
        </div>

        <div className="flex items-center gap-2">
          {unallocatedAmount > 0 && totalBaseAmount > 0 && (
            <AppButton
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAutoFillRemainder}
              leftIcon={<Sparkles className="h-3.5 w-3.5 text-theme-icon" />}
              className="h-8 text-xs font-semibold text-theme-icon border-theme-btn-primary/30 hover:bg-theme-btn-primary/10"
              title="Add remaining balance as next milestone"
            >
              Add Remainder ({currencySymbol}{unallocatedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
            </AppButton>
          )}

          <AppButton
            type="button"
            variant="primary"
            size="sm"
            onClick={onAddMilestone}
            leftIcon={<Plus className="h-3.5 w-3.5" />}
            className="h-8 text-xs font-semibold shrink-0 shadow-sm"
          >
            Add {customType === 'percent_wise' ? '% Stage' : 'Phase Milestone'}
          </AppButton>
        </div>
      </div>

      {/* Progress & Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-elevated/60 border border-border/60 text-xs">
        <div>
          <span className="text-muted block text-[11px] uppercase tracking-wider font-semibold">Total Contract Value</span>
          <span className="font-bold text-foreground font-mono text-base">
            {currencySymbol}{totalBaseAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div>
          <span className="text-muted block text-[11px] uppercase tracking-wider font-semibold">Total Scheduled</span>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-foreground font-mono text-base">
              {currencySymbol}{totalAllocatedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
              Math.abs(totalAllocatedPercent - 100) < 0.1 
                ? 'bg-success/15 text-success border border-success/30' 
                : 'bg-warning/15 text-warning border border-warning/30'
            }`}>
              {totalAllocatedPercent.toFixed(1)}%
            </span>
          </div>
        </div>
        <div>
          <span className="text-muted block text-[11px] uppercase tracking-wider font-semibold">Amount Released</span>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-success font-mono text-base">
              {currencySymbol}{totalReleasedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-muted font-medium">({totalReleasedPercent.toFixed(1)}%)</span>
          </div>
        </div>
        <div>
          <span className="text-muted block text-[11px] uppercase tracking-wider font-semibold">Pending Release</span>
          <span className="font-bold text-warning font-mono text-base">
            {currencySymbol}{totalPendingAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Visual Multi-Segment Progress Bar */}
      {totalBaseAmount > 0 && (
        <div className="space-y-1.5">
          <div className="w-full bg-border/60 h-2.5 rounded-full overflow-hidden flex shadow-inner">
            <div 
              className="bg-emerald-500 transition-all duration-300 h-full" 
              style={{ width: `${Math.min(100, totalReleasedPercent)}%` }} 
              title={`Released: ${totalReleasedPercent.toFixed(1)}%`}
            />
            <div 
              className="bg-theme-btn-primary transition-all duration-300 h-full opacity-80" 
              style={{ width: `${Math.min(100, Math.max(0, totalAllocatedPercent - totalReleasedPercent))}%` }} 
              title={`Scheduled (Pending): ${(totalAllocatedPercent - totalReleasedPercent).toFixed(1)}%`}
            />
          </div>
          <div className="flex justify-between text-[11px] font-medium text-muted">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Released: {currencySymbol}{totalReleasedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({totalReleasedPercent.toFixed(1)}%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-theme-btn-primary"></span>
              <span>Scheduled: {totalAllocatedPercent.toFixed(1)}% / 100%</span>
            </div>
          </div>
        </div>
      )}

      {/* Allocation Warning / Suggestion banner */}
      {totalBaseAmount > 0 && Math.abs(totalAllocatedPercent - 100) >= 0.1 && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
            <span>
              {totalAllocatedPercent < 100 
                ? `Milestones total ${totalAllocatedPercent.toFixed(1)}%. You have ${currencySymbol}${unallocatedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${unallocatedPercent.toFixed(1)}%) remaining to allocate.`
                : `Milestones exceed 100% (currently ${totalAllocatedPercent.toFixed(1)}%). Please adjust amounts to match total contract value.`}
            </span>
          </div>
        </div>
      )}

      {/* List of Milestones */}
      <div className="space-y-3 pt-1">
        {milestones.length === 0 ? (
          <div className="py-8 text-center text-muted border border-dashed border-border rounded-xl text-xs space-y-2 bg-elevated/30">
            <div className="p-3 rounded-full bg-theme-btn-primary/10 text-theme-icon w-fit mx-auto">
              <Layers className="h-5 w-5" />
            </div>
            <p className="font-semibold text-foreground text-sm">No payment milestones defined.</p>
            <p className="text-[11px] text-muted max-w-md mx-auto">Click &ldquo;Add {customType === 'percent_wise' ? '% Stage' : 'Phase Milestone'}&rdquo; to set up staged payouts, release triggers, and milestone approval conditions.</p>
          </div>
        ) : (
          milestones.map((m, idx) => (
            <div
              key={m.id}
              className="p-4 rounded-xl border border-border/80 bg-background/70 hover:border-theme-btn-primary/50 transition-all space-y-3.5 shadow-sm"
            >
              {/* Row 1: Phase Name & Status + Delete */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-border/50">
                <div className="flex items-center gap-2.5 flex-1">
                  <span className="h-6 w-6 rounded-lg bg-theme-btn-primary/15 text-theme-icon font-bold text-[11px] flex items-center justify-center shrink-0 border border-theme-btn-primary/20">
                    {idx + 1}
                  </span>
                  <AppInput
                    value={m.phaseName}
                    onChange={(e) => onUpdateMilestone(m.id, 'phaseName', e.target.value)}
                    placeholder={`e.g., Phase ${idx + 1}: Advance / Kickoff / UAT Signoff`}
                    className="h-8 text-xs font-semibold flex-1"
                  />
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {m.status !== 'Amount Released' && m.status !== 'Completed' && (
                    <AppButton
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleQuickRelease(m)}
                      leftIcon={<Zap className="h-3.5 w-3.5 text-emerald-500" />}
                      className="h-8 px-2.5 text-xs font-bold text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/20 rounded-lg"
                      title="Mark Full Amount Released"
                    >
                      Release
                    </AppButton>
                  )}

                  <select
                    value={m.status || 'Pending'}
                    onChange={(e) => onUpdateMilestone(m.id, 'status', e.target.value)}
                    className={`h-8 px-3 rounded-lg text-xs font-semibold border outline-none cursor-pointer ${getStatusBadgeClass(m.status)}`}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
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
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-muted uppercase tracking-wider">
                  Release Condition & Sign-off Notes
                </label>
                <AppInput
                  value={m.remark || ""}
                  onChange={(e) => onUpdateMilestone(m.id, 'remark', e.target.value)}
                  placeholder="e.g., Release 30% advance on PO issuance; 70% upon successful UAT sign-off by Finance Lead."
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

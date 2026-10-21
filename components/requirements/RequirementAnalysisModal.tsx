"use client";

import React, { useState, useEffect } from "react";
import { AppCard, AppCardHeader, AppCardTitle, AppCardContent } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { X, LayoutDashboard, Target, Briefcase, Server, Shield, FileCheck2, Calendar, AlertTriangle, Users } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { sanitizeErrorMessage } from "@/lib/utils";

interface RequirementAnalysisModalProps {
  requirement: any;
  masters: any; // { departments, priority_master, issue_types, user_master, etc }
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
}

export default function RequirementAnalysisModal({ requirement, masters, onClose, onSubmit }: RequirementAnalysisModalProps) {
  const { isLight: isLightMode } = useTheme();

  const [formData, setFormData] = useState({
    requirement_type_id: "",
    objective: requirement?.objective || "",
        requirement_domain: "General Business",
    target_system: "",
    integrations: "",
    data_privacy: "",
    software_cost: "",
    dev_cost: "",
    target_environment: "",
    hardware_needs: "",
    capex_amount: "",
    opex_amount: "",
    business_impact: "",
    business_value_id: "",
    business_criticality_id: "",
    functional_scope: requirement?.functional_scope || "",
    technical_scope: "",
    budget_impact: "",
    estimated_effort: "",
    estimated_cost: "",
    estimated_resources: "",
    dependency_notes: "",
    impacted_departments: [] as string[],
    department_approvers: {} as Record<string, string[]>,
    watchers: [] as string[],
    stakeholders: [] as string[],
    cc_users: [] as string[],
    start_date: "",
    due_date: "",
    expected_completion_date: "",
    signoff_approver_id: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDepartmentToggle = (deptId: string) => {
    setFormData(prev => {
      const isSelected = prev.impacted_departments.includes(deptId);
      if (isSelected) {
        const newApprovers = { ...prev.department_approvers };
        delete newApprovers[deptId];
        return { ...prev, impacted_departments: prev.impacted_departments.filter(id => id !== deptId), department_approvers: newApprovers };
      } else {
        return { ...prev, impacted_departments: [...prev.impacted_departments, deptId] }; // Preserves order of selection
      }
    });
  };

  const handleUserToggle = (field: 'watchers' | 'stakeholders' | 'cc_users', userId: string) => {
    setFormData(prev => {
      const isSelected = prev[field].includes(userId);
      if (isSelected) {
        return { ...prev, [field]: prev[field].filter(id => id !== userId) };
      } else {
        return { ...prev, [field]: [...prev[field], userId] };
      }
    });
  };

  const handleEffortChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    let newFormData = { ...formData, estimated_effort: val };
    
    const days = parseInt(val, 10);
    if (!isNaN(days) && days > 0) {
      let start = formData.start_date ? new Date(formData.start_date) : new Date();
      if (!formData.start_date) {
        newFormData.start_date = start.toISOString().slice(0, 10);
      }
      const due = new Date(start);
      due.setDate(due.getDate() + days);
      newFormData.due_date = due.toISOString().slice(0, 10);
    }
    setFormData(newFormData);
  };

  const handleDateChange = (field: 'start_date' | 'due_date', val: string) => {
    let newFormData = { ...formData, [field]: val };
    
    const start = newFormData.start_date ? new Date(newFormData.start_date) : null;
    const due = newFormData.due_date ? new Date(newFormData.due_date) : null;
    
    if (start && due && !isNaN(start.getTime()) && !isNaN(due.getTime())) {
      const diffTime = due.getTime() - start.getTime();
      let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays === 0) diffDays = 1;
      if (diffDays >= 0) {
        newFormData.estimated_effort = diffDays.toString();
      }
    }
    setFormData(newFormData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.dependency_notes || formData.dependency_notes.trim() === '') {
      setError("Dependency Notes are required.");
      return;
    }
    if (!formData.technical_scope || formData.technical_scope.trim() === '') {
      setError("Technical Scope / Architecture is required.");
      return;
    }
    if (!formData.estimated_effort || formData.estimated_effort.trim() === '') {
      setError("Estimated Effort is required.");
      return;
    }
    if (!formData.start_date || !formData.due_date) {
      setError("Start Date and Due Date are required.");
      return;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(formData.start_date);
    start.setHours(0, 0, 0, 0);
    if (start < today) {
      setError("Start Date cannot be less than today's date.");
      return;
    }
    const due = new Date(formData.due_date);
    due.setHours(0, 0, 0, 0);
    if (new Date(formData.due_date) < new Date(formData.start_date)) {
      setError("Due Date cannot be before Start Date.");
      return;
    }
    for (const deptId of formData.impacted_departments) {
      if (!formData.department_approvers[deptId] || formData.department_approvers[deptId].length === 0) {
        setError("Please select at least one approver for each Impacted Department.");
        return;
      }
    }

    setLoading(true);
    setError(null);
    try {
      await onSubmit(formData);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to submit analysis");
      setLoading(false);
    }
  };

  const inputClass = `w-full h-10 px-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-theme-btn-primary/50 ${
    "bg-surface border-border text-foreground"
  }`;
  const textareaClass = `w-full p-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-theme-btn-primary/50 resize-none min-h-[80px] ${
    "bg-surface border-border text-foreground"
  }`;
  const labelClass = "theme-label block mb-1.5";

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-[var(--overlay)] p-4 overflow-y-auto">
      <AppCard className="w-full max-w-5xl relative my-auto animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col bg-surface border-border">
        <AppButton 
          type="button"
          variant="ghost" 
          size="sm"
          aria-label="Close requirement analysis modal"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full transition-colors z-10 hover:bg-elevated text-muted"
        >
          <X className="h-5 w-5" />
        </AppButton>

        <AppCardHeader className="border-b shrink-0 pb-4 border-border bg-surface">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent-soft text-theme-icon">
              <LayoutDashboard className="h-5 w-5" />
            </div>
            <div>
              <AppCardTitle className="text-xl text-foreground">Requirement analysis</AppCardTitle>
            </div>
          </div>
        </AppCardHeader>

        <AppCardContent className="pt-6 overflow-y-auto custom-scrollbar flex-1">
          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="p-3.5 bg-danger-soft border border-danger/30 rounded-xl text-danger-text text-sm font-semibold flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-danger" />
                <span>{sanitizeErrorMessage(error)}</span>
              </div>
            )}

            {/* Business Section */}
            <div className="space-y-4">
              <h3 className="theme-label flex items-center gap-2 pb-2 border-b text-theme-icon border-border">
                <Briefcase className="h-4 w-4" /> Business classification
              </h3>
              
              
              <div className="grid grid-cols-1 mb-4">
                <div>
                  <label className={labelClass}>Requirement domain (scope) <span className="text-danger">*</span></label>
                  <select className={inputClass} value={formData.requirement_domain} onChange={e => setFormData({...formData, requirement_domain: e.target.value})} required>
                    <option value="General Business">General business</option>
                    <option value="IT & Software System">IT & software system</option>
                    <option value="Infrastructure & Hardware">Infrastructure & hardware</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Requirement type <span className="text-danger">*</span></label>
                  <select className={inputClass} value={formData.requirement_type_id} onChange={e => setFormData({...formData, requirement_type_id: e.target.value})} required>
                    <option value="">Select type</option>
                    {(masters?.issue_types || []).map((t: any) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Business criticality <span className="text-danger">*</span></label>
                  <select className={inputClass} value={formData.business_criticality_id} onChange={e => setFormData({...formData, business_criticality_id: e.target.value})} required>
                    <option value="" disabled>Select criticality</option>
                    {(masters?.priority_master || []).map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Business value</label>
                  <AppInput placeholder="e.g. Revenue impact, cost saving" value={formData.business_value_id} onChange={e => setFormData({...formData, business_value_id: e.target.value})} className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Business objective <span className="text-danger">*</span></label>
                  <textarea className={textareaClass} value={formData.objective} onChange={e => setFormData({...formData, objective: e.target.value})} required />
                </div>
                <div>
                  <label className={labelClass}>Business impact</label>
                  <textarea className={textareaClass} value={formData.business_impact} onChange={e => setFormData({...formData, business_impact: e.target.value})} />
                </div>
                <div>
                  <label className={labelClass}>Budget impact</label>
                  <AppInput placeholder="e.g. Unbudgeted, q3 budget allocation" value={formData.budget_impact} onChange={e => setFormData({...formData, budget_impact: e.target.value})} className={inputClass} />
                </div>
              </div>
            </div>

            {/* Technical Section */}
            <div className="space-y-4">
              <h3 className="theme-label flex items-center gap-2 pb-2 border-b text-success border-border">
                <Server className="h-4 w-4" /> Technical & execution scope
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Functional scope <span className="text-danger">*</span></label>
                  <textarea className={textareaClass} value={formData.functional_scope} onChange={e => setFormData({...formData, functional_scope: e.target.value})} required />
                </div>
                <div>
                  <label className={labelClass}>Technical scope / architecture <span className="text-danger">*</span></label>
                  <textarea className={textareaClass} value={formData.technical_scope} onChange={e => setFormData({...formData, technical_scope: e.target.value})} required />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Estimated effort (days) <span className="text-danger">*</span></label>
                  <AppInput type="number" placeholder="e.g. 10" value={formData.estimated_effort} onChange={handleEffortChange} className={inputClass} required />
                </div>
                <div>
                  <label className={labelClass}>Estimated cost</label>
                  <AppInput type="number" placeholder="e.g. 5000" value={formData.estimated_cost} onChange={e => setFormData({...formData, estimated_cost: e.target.value})} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Estimated resources</label>
                  <AppInput placeholder="e.g. 2 Developers" value={formData.estimated_resources} onChange={e => setFormData({...formData, estimated_resources: e.target.value})} className={inputClass} />
                </div>
              </div>
            </div>

            
            {/* IT System Conditional Section */}
            {formData.requirement_domain === "IT & Software System" && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                <h3 className="theme-label flex items-center gap-2 pb-2 border-b text-info border-border">
                  <Server className="h-4 w-4" /> IT & software system scope
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Target system / application</label>
                    <AppInput placeholder="e.g. Internal ERP, CRM" value={formData.target_system} onChange={e => setFormData({...formData, target_system: e.target.value})} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Data privacy & security</label>
                    <AppInput placeholder="e.g. Handles PII, needs security audit" value={formData.data_privacy} onChange={e => setFormData({...formData, data_privacy: e.target.value})} className={inputClass} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Integration dependencies</label>
                  <textarea className={textareaClass} value={formData.integrations} onChange={e => setFormData({...formData, integrations: e.target.value})} placeholder="Describe API or 3rd party integrations…" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Software license cost</label>
                    <AppInput type="number" placeholder="e.g. 1500" value={formData.software_cost} onChange={e => setFormData({...formData, software_cost: e.target.value})} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Development cost</label>
                    <AppInput type="number" placeholder="e.g. 5000" value={formData.dev_cost} onChange={e => setFormData({...formData, dev_cost: e.target.value})} className={inputClass} />
                  </div>
                </div>
              </div>
            )}

            {/* Infrastructure Conditional Section */}
            {formData.requirement_domain === "Infrastructure & Hardware" && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                <h3 className={`theme-label flex items-center gap-2 pb-2 border-b text-foreground border-border`}>
                  <Server className="h-4 w-4" /> Infrastructure scope
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Target environment / data center</label>
                    <AppInput placeholder="e.g. AWS, Azure, On-Premise" value={formData.target_environment} onChange={e => setFormData({...formData, target_environment: e.target.value})} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Hardware & capacity needs</label>
                    <AppInput placeholder="e.g. 2TB Storage, 32GB RAM" value={formData.hardware_needs} onChange={e => setFormData({...formData, hardware_needs: e.target.value})} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>CAPEX amount (capital expenditure)</label>
                    <AppInput type="number" placeholder="e.g. 10000" value={formData.capex_amount} onChange={e => setFormData({...formData, capex_amount: e.target.value})} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>OPEX amount (recurring / ops)</label>
                    <AppInput type="number" placeholder="e.g. 500" value={formData.opex_amount} onChange={e => setFormData({...formData, opex_amount: e.target.value})} className={inputClass} />
                  </div>
                </div>
              </div>
            )}

            {/* Governance & Dependency */}
            <div className="space-y-4">
              <h3 className="theme-label flex items-center gap-2 pb-2 border-b text-warning border-border">
                <Shield className="h-4 w-4" /> Governance & dependencies
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className={labelClass}>Dependency notes <span className="text-danger">*</span></label>
                  <AppInput placeholder="e.g. Blocked by REQ-002" value={formData.dependency_notes} onChange={e => setFormData({...formData, dependency_notes: e.target.value})} className={inputClass} required />
                </div>
              </div>

              <div className="space-y-2">
                <label className={labelClass}>Impacted departments (approval sequence) <span className="text-danger">*</span></label>
                <div className="p-4 rounded-xl flex flex-wrap gap-2 bg-elevated border border-border">
                  {(masters?.departments || []).map((d: any) => {
                    const isSelected = formData.impacted_departments.includes(d.id);
                    const index = formData.impacted_departments.indexOf(d.id);
                    return (
                      <AppButton variant="secondary"
                        type="button"
                        key={d.id}
                        onClick={() => handleDepartmentToggle(d.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-2 ${
                          isSelected 
                            ? "bg-theme-btn-primary border-theme-btn-primary text-theme-btn-primary-text" 
                            : "bg-surface border-border text-muted hover:bg-surface-hover"
                        }`}
                      >
                        {isSelected && <span className="bg-surface/20 w-4 h-4 rounded-full flex items-center justify-center text-[11px]">{index + 1}</span>}
                        {d.department_name}
                      </AppButton>
                    );
                  })}
                </div>

                {formData.impacted_departments.length > 0 && (
                  <div className="mt-4 space-y-3">
                    <label className={labelClass}>Define approval sequence <span className="text-danger">*</span></label>
                    {formData.impacted_departments.map((deptId) => {
                      const deptName = masters.departments?.find((d: any) => d.id === deptId)?.name;
                      const deptUsers = masters.users?.filter((u: any) => u.department_id === deptId) || [];
                      const selectedApprovers = formData.department_approvers[deptId] || [];
                      
                      return (
                        <div key={deptId} className="p-3 border rounded-md border-border bg-surface">
                          <div className="theme-label mb-2 text-theme-icon">{deptName} Approvers</div>
                          <div className="flex flex-wrap gap-2">
                            {deptUsers.map((u: any) => {
                              const isUserSelected = selectedApprovers.includes(u.id);
                              const orderIndex = selectedApprovers.indexOf(u.id) + 1;
                              
                              return (
                                <AppButton variant="secondary"
                                  type="button"
                                  key={u.id}
                                  onClick={() => {
                                    setFormData(prev => {
                                      const current = prev.department_approvers[deptId] || [];
                                      if (current.includes(u.id)) {
                                        return { ...prev, department_approvers: { ...prev.department_approvers, [deptId]: current.filter(id => id !== u.id) } };
                                      } else {
                                        return { ...prev, department_approvers: { ...prev.department_approvers, [deptId]: [...current, u.id] } };
                                      }
                                    });
                                  }}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${ isUserSelected ? "bg-theme-btn-primary border-theme-btn-primary text-theme-btn-primary-text" : "bg-elevated border-border text-muted hover:bg-elevated" }`}
                                >
                                  {isUserSelected && <span className="bg-surface/20 w-4 h-4 rounded-full flex items-center justify-center text-[11px]">{orderIndex}</span>}
                                  {u.full_name}
                                </AppButton>
                              );
                            })}
                            {deptUsers.length === 0 && <span className="theme-label text-muted">No users found in this department.</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Sign-Off Approver */}
              <div className="mt-4 pt-4 border-t border-border">
                <label className={labelClass}>
                  Designated sign-off approver <span className="text-danger">*</span>
                </label>
                <select 
                  className={inputClass}
                  value={formData.signoff_approver_id}
                  onChange={(e) => setFormData({ ...formData, signoff_approver_id: e.target.value })}
                  required
                >
                  <option value="" className="text-muted">-- Select sign-off approver --</option>
                  {(masters.users || []).map((u: any) => (
                    <option key={u.id} value={u.id} className="text-foreground">
                      {u.full_name || u.name || 'User'} {u.designation?.name ? `(${u.designation.name})` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted mt-1.5">
                  This user will be responsible for the final sign-off once all departmental approvals are complete.
                </p>
              </div>
            </div>

            {/* Stakeholders & Timelines */}
            <div className="space-y-4">
              <h3 className="theme-label flex items-center gap-2 pb-2 border-b text-theme-icon border-border">
                <Calendar className="h-4 w-4" /> Schedule & stakeholders
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Start date <span className="text-danger">*</span></label>
                  <AppInput type="date" value={formData.start_date} min={new Date().toISOString().slice(0, 10)} onChange={e => handleDateChange('start_date', e.target.value)} className={inputClass} required />
                </div>
                <div>
                  <label className={labelClass}>Due date <span className="text-danger">*</span></label>
                  <AppInput type="date" value={formData.due_date} min={formData.start_date || new Date().toISOString().slice(0, 10)} onChange={e => handleDateChange('due_date', e.target.value)} className={inputClass} required />
                </div>
                <div>
                  <label className={labelClass}>Expected completion</label>
                  <AppInput type="date" value={formData.expected_completion_date} onChange={e => setFormData({...formData, expected_completion_date: e.target.value})} className={inputClass} />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-border">
              <AppButton variant="outline" type="button" onClick={onClose} className="text-danger border-danger/30 hover:bg-danger/10 hover:border-danger hover:text-danger">
                Discard
              </AppButton>
              <AppButton type="submit" variant="primary" disabled={loading} className="min-w-[140px]">
                {loading ? "Submitting..." : "Submit Analysis"}
              </AppButton>
            </div>
          </form>
        </AppCardContent>
      </AppCard>
    </div>
  );
}


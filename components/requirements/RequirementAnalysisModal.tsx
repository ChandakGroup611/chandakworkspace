"use client";

import React, { useState, useEffect } from "react";
import { AppCard, AppCardHeader, AppCardTitle, AppCardContent } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { X, LayoutDashboard, Target, Briefcase, Server, Shield, FileCheck2, Calendar, AlertTriangle, Users } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";

interface RequirementAnalysisModalProps {
  requirement: any;
  masters: any; // { departments, priority_master, issue_types, user_master, etc }
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
}

export default function RequirementAnalysisModal({ requirement, masters, onClose, onSubmit }: RequirementAnalysisModalProps) {
  const { theme } = useTheme();
  const isLightMode = ["light-neumorphic", "glassmorphism", "pure-white"].includes(theme);

  const [formData, setFormData] = useState({
    requirement_type_id: "",
    objective: requirement?.objective || "",
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
    expected_completion_date: ""
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
        newFormData.start_date = start.toISOString().split('T')[0];
      }
      const due = new Date(start);
      due.setDate(due.getDate() + days);
      newFormData.due_date = due.toISOString().split('T')[0];
    }
    setFormData(newFormData);
  };

  const handleDateChange = (field: 'start_date' | 'due_date', val: string) => {
    let newFormData = { ...formData, [field]: val };
    
    const start = newFormData.start_date ? new Date(newFormData.start_date) : null;
    const due = newFormData.due_date ? new Date(newFormData.due_date) : null;
    
    if (start && due && !isNaN(start.getTime()) && !isNaN(due.getTime())) {
      const diffTime = due.getTime() - start.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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

  const inputClass = `w-full h-10 px-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-accent/50 ${
    "bg-surface border-border text-foreground"
  }`;
  const textareaClass = `w-full p-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none min-h-[80px] ${
    "bg-surface border-border text-foreground"
  }`;
  const labelClass = `text-[10px] font-bold uppercase tracking-wider block mb-1.5 text-muted`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <AppCard className={`w-full max-w-5xl border shadow-2xl relative my-auto animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col ${
        "bg-gray-50 border-border"
      }`}>
        <AppButton variant="secondary" 
          onClick={onClose}
          className={`absolute top-4 right-4 p-2 rounded-full transition-colors z-10 ${
            "hover:bg-gray-200 text-muted"
          }`}
        >
          <X className="h-5 w-5" />
        </AppButton>

        <AppCardHeader className={`border-b shrink-0 pb-4 border-border bg-surface`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-accent/10 text-accent`}>
              <LayoutDashboard className="h-5 w-5" />
            </div>
            <div>
              <AppCardTitle className={`text-xl text-foreground`}>Requirement Analysis</AppCardTitle>
              <p className={`text-xs mt-1 text-muted`}>Complete the business and technical analysis for {requirement?.code}</p>
            </div>
          </div>
        </AppCardHeader>

        <AppCardContent className="pt-6 overflow-y-auto custom-scrollbar flex-1">
          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-sm flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Business Section */}
            <div className="space-y-4">
              <h3 className={`text-sm font-bold flex items-center gap-2 pb-2 border-b text-accent border-border`}>
                <Briefcase className="h-4 w-4" /> Business Classification
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Requirement Type <span className="text-red-500">*</span></label>
                  <select className={inputClass} value={formData.requirement_type_id} onChange={e => setFormData({...formData, requirement_type_id: e.target.value})} required>
                    <option value="">Select Type</option>
                    {(masters?.issue_types || []).map((t: any) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Business Criticality <span className="text-red-500">*</span></label>
                  <select className={inputClass} value={formData.business_criticality_id} onChange={e => setFormData({...formData, business_criticality_id: e.target.value})} required>
                    <option value="">Select Criticality</option>
                    {(masters?.priority_master || []).map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Business Value</label>
                  <AppInput placeholder="e.g. Revenue Impact, Cost Saving" value={formData.business_value_id} onChange={e => setFormData({...formData, business_value_id: e.target.value})} className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Business Objective <span className="text-red-500">*</span></label>
                  <textarea className={textareaClass} value={formData.objective} onChange={e => setFormData({...formData, objective: e.target.value})} required />
                </div>
                <div>
                  <label className={labelClass}>Business Impact</label>
                  <textarea className={textareaClass} value={formData.business_impact} onChange={e => setFormData({...formData, business_impact: e.target.value})} />
                </div>
              </div>
            </div>

            {/* Technical Section */}
            <div className="space-y-4">
              <h3 className={`text-sm font-bold flex items-center gap-2 pb-2 border-b text-emerald-700 border-border`}>
                <Server className="h-4 w-4" /> Technical & Execution Scope
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Functional Scope <span className="text-red-500">*</span></label>
                  <textarea className={textareaClass} value={formData.functional_scope} onChange={e => setFormData({...formData, functional_scope: e.target.value})} required />
                </div>
                <div>
                  <label className={labelClass}>Technical Scope / Architecture <span className="text-red-500">*</span></label>
                  <textarea className={textareaClass} value={formData.technical_scope} onChange={e => setFormData({...formData, technical_scope: e.target.value})} required />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className={labelClass}>Estimated Effort (Days) <span className="text-red-500">*</span></label>
                  <AppInput type="number" placeholder="e.g. 10" value={formData.estimated_effort} onChange={handleEffortChange} className={inputClass} required />
                </div>
                <div>
                  <label className={labelClass}>Estimated Cost</label>
                  <AppInput type="number" placeholder="e.g. 5000" value={formData.estimated_cost} onChange={e => setFormData({...formData, estimated_cost: e.target.value})} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Estimated Resources</label>
                  <AppInput placeholder="e.g. 2 Developers" value={formData.estimated_resources} onChange={e => setFormData({...formData, estimated_resources: e.target.value})} className={inputClass} />
                </div>
              </div>
            </div>

            {/* Governance & Dependency */}
            <div className="space-y-4">
              <h3 className={`text-sm font-bold flex items-center gap-2 pb-2 border-b text-amber-700 border-border`}>
                <Shield className="h-4 w-4" /> Governance & Dependencies
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className={labelClass}>Dependency Notes <span className="text-red-500">*</span></label>
                  <AppInput placeholder="e.g. Blocked by REQ-002" value={formData.dependency_notes} onChange={e => setFormData({...formData, dependency_notes: e.target.value})} className={inputClass} required />
                </div>
              </div>

              <div className="space-y-2">
                <label className={labelClass}>Impacted Departments (Approval Sequence) <span className="text-red-500">*</span></label>
                <div className={`p-4 rounded-xl border flex flex-wrap gap-2 bg-surface border-border`}>
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
                            ? "bg-accent border-accent text-white" 
                            : "bg-elevated border-border text-muted hover:bg-elevated"
                        }`}
                      >
                        {isSelected && <span className="bg-surface/20 w-4 h-4 rounded-full flex items-center justify-center text-[10px]">{index + 1}</span>}
                        {d.department_name}
                      </AppButton>
                    );
                  })}
                </div>
                <p className={`text-[10px] text-muted`}>Select departments in the order they should approve this requirement.</p>

                {formData.impacted_departments.length > 0 && (
                  <div className="mt-4 space-y-3">
                    <label className={labelClass}>Define Approval Sequence <span className="text-red-500">*</span></label>
                    {formData.impacted_departments.map((deptId) => {
                      const deptName = masters.departments?.find((d: any) => d.id === deptId)?.name;
                      const deptUsers = masters.users?.filter((u: any) => u.department_id === deptId) || [];
                      const selectedApprovers = formData.department_approvers[deptId] || [];
                      
                      return (
                        <div key={deptId} className={`p-3 border rounded-md border-accent/20 bg-accent/10/30`}>
                          <div className={`text-xs font-semibold mb-2 text-accent`}>{deptName} Approvers</div>
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
                                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-2 ${
                                    isUserSelected 
                                      ? "bg-accent border-accent text-white" 
                                      : "bg-surface border-border text-muted hover:bg-elevated"
                                  }`}
                                >
                                  {isUserSelected && <span className="bg-surface/20 w-4 h-4 rounded-full flex items-center justify-center text-[10px]">{orderIndex}</span>}
                                  {u.full_name}
                                </AppButton>
                              );
                            })}
                            {deptUsers.length === 0 && <span className="text-xs text-gray-500">No users found in this department.</span>}
                          </div>
                          <p className="text-[9px] text-gray-400 mt-2">Select users in the order they should approve (1st = Approver, 2nd = Executive, etc).</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Stakeholders & Timelines */}
            <div className="space-y-4">
              <h3 className={`text-sm font-bold flex items-center gap-2 pb-2 border-b text-pink-700 border-border`}>
                <Calendar className="h-4 w-4" /> Schedule & Stakeholders
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Start Date <span className="text-red-500">*</span></label>
                  <AppInput type="date" value={formData.start_date} min={new Date().toISOString().split('T')[0]} onChange={e => handleDateChange('start_date', e.target.value)} className={inputClass} required />
                </div>
                <div>
                  <label className={labelClass}>Due Date <span className="text-red-500">*</span></label>
                  <AppInput type="date" value={formData.due_date} min={formData.start_date || new Date().toISOString().split('T')[0]} onChange={e => handleDateChange('due_date', e.target.value)} className={inputClass} required />
                </div>
                <div>
                  <label className={labelClass}>Expected Completion</label>
                  <AppInput type="date" value={formData.expected_completion_date} onChange={e => setFormData({...formData, expected_completion_date: e.target.value})} className={inputClass} />
                </div>
              </div>
            </div>

            <div className={`flex justify-end gap-3 pt-6 border-t border-border`}>
              <AppButton type="button" variant="ghost" onClick={onClose} disabled={loading} className={"text-muted"}>
                Cancel
              </AppButton>
              <AppButton type="submit" variant="primary" disabled={loading} className="bg-accent hover:bg-accent text-white min-w-[140px]">
                {loading ? "Submitting..." : "Submit Analysis"}
              </AppButton>
            </div>
          </form>
        </AppCardContent>
      </AppCard>
    </div>
  );
}


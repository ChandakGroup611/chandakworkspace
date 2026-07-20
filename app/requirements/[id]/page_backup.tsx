"use client";

import React, { useState, useEffect } from "react";
import { AppCard, AppCardContent } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { AppBadge } from "@/components/ui/AppBadge";
import { Briefcase, Server, Shield, Calendar, AlertTriangle, ArrowLeft } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";

export default function RequirementAnalyzePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = React.use(params);
  const reqId = resolvedParams.id;
  const router = useRouter();
  const supabase = createClient();
  const { theme } = useTheme();
  const isLightMode = ["executive-light", "material-ocean", "aurora-breeze", "pure-elegance", "pristine-white"].includes(theme);

  const [requirement, setRequirement] = useState<any>(null);
  const [masters, setMasters] = useState<any>({});
  const [loadingConfig, setLoadingConfig] = useState(true);
  
  const [formData, setFormData] = useState({
    requirement_type_id: "",
    objective: "",
    business_impact: "",
    business_value_id: "",
    business_criticality_id: "",
    functional_scope: "",
    technical_scope: "",
    risk_assessment: "Low",
    budget_impact: "",
    estimated_effort: "",
    estimated_cost: "",
    estimated_resources: "",
    regulatory_mapping: "",
    dependency_notes: "",
    impacted_departments: [] as string[],
    watchers: [] as string[],
    stakeholders: [] as string[],
    cc_users: [] as string[],
    start_date: "",
    due_date: "",
    expected_completion_date: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      setLoadingConfig(true);
      try {
        const m = await import("@/lib/actions/requirements");
        const req = await m.fetchRequirement(reqId);
        if (req) {
          setRequirement(req);
          setFormData(prev => ({
            ...prev,
            objective: req.objective || "",
            functional_scope: req.functional_scope || "",
            technical_scope: req.technical_scope || "",
            requirement_type_id: req.requirement_type_id || "",
            business_impact: req.business_impact || "",
            business_value_id: req.business_value_id || "",
            business_criticality_id: req.business_criticality_id || "",
            risk_assessment: req.risk_assessment || "Low",
            budget_impact: req.budget_impact || "",
            estimated_effort: req.estimated_effort || "",
            estimated_cost: req.estimated_cost?.toString() || "",
            estimated_resources: req.estimated_resources || "",
            regulatory_mapping: req.regulatory_mapping || "",
            dependency_notes: req.dependency_notes || "",
            start_date: req.start_date || "",
            due_date: req.due_date || "",
            expected_completion_date: req.expected_completion_date || ""
          }));
        }

        // Fetch Masters
        const [deptRes, prioRes, typeRes] = await Promise.all([
          supabase.from('departments').select('*'),
          supabase.from('priority_master').select('*').eq('is_deleted', false),
          supabase.from('issue_types').select('*').eq('is_deleted', false)
        ]);

        // Fetch selected impacted departments
        if (req) {
          const { data: impacts } = await supabase.from('requirement_impacted_departments')
            .select('department_id')
            .eq('requirement_id', req.id)
            .order('display_order');
          
          if (impacts) {
            setFormData(prev => ({
              ...prev,
              impacted_departments: impacts.map(i => i.department_id)
            }));
          }
        }

        setMasters({
          departments: deptRes.data || [],
          priority_master: prioRes.data || [],
          issue_types: typeRes.data || []
        });

      } catch (err) {
        console.error(err);
      } finally {
        setLoadingConfig(false);
      }
    };
    fetchAll();
  }, [reqId]);

  const handleDepartmentToggle = (deptId: string) => {
    setFormData(prev => {
      const isSelected = prev.impacted_departments.includes(deptId);
      if (isSelected) {
        return { ...prev, impacted_departments: prev.impacted_departments.filter(id => id !== deptId) };
      } else {
        return { ...prev, impacted_departments: [...prev.impacted_departments, deptId] };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.start_date || !formData.due_date) {
      setError("Start Date and Due Date are required.");
      return;
    }
    if (new Date(formData.due_date) < new Date(formData.start_date)) {
      setError("Due Date cannot be before Start Date.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const m = await import("@/lib/actions/requirements");
      await m.submitRequirementAnalysis(reqId, formData, user.id);
      
      // Navigate to Approval Engine or show success
      router.push(`/requirements/approvals`);
    } catch (err: any) {
      setError(err.message || "Failed to submit analysis");
      setLoading(false);
    }
  };

  const inputClass = `w-full h-10 px-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-accent/50 ${
    "bg-white border-border text-foreground"
  }`;
  const textareaClass = `w-full p-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none min-h-[80px] ${
    "bg-white border-border text-foreground"
  }`;
  const labelClass = `text-[10px] font-bold uppercase tracking-wider block mb-1.5 text-muted`;

  if (loadingConfig) {
    return (
      <div className="h-screen flex flex-col items-center justify-center space-y-4 transition-colors duration-300 bg-[#070913]">
        <div className="animate-spin h-10 w-10 border-2 border-accent border-t-transparent rounded-full shadow-lg shadow-indigo-500/20" />
      </div>
    );
  }

  return (
    <PageContainer strict={true}>
      <PageHeader
        title={`Analyze Requirement: ${requirement?.code || reqId}`}
        description="Complete the functional and technical analysis scope."
        badge={<AppBadge variant="info">Analysis Phase</AppBadge>}
        actions={
          <>
            <AppButton variant="outline" size="sm" onClick={() => router.push("/requirements")} leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Back to List
            </AppButton>
          </>
        }
      />

      <div className="flex-1 overflow-y-auto mt-4 custom-scrollbar">
        <AppCard className={`p-6 shadow-xl border bg-surface border-border`}>
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
                  <label className={labelClass}>Requirement Type</label>
                  <select className={inputClass} value={formData.requirement_type_id} onChange={e => setFormData({...formData, requirement_type_id: e.target.value})} required>
                    <option value="">Select Type</option>
                    {(masters?.issue_types || []).map((t: any) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Business Criticality</label>
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
                  <label className={labelClass}>Business Objective *</label>
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
                  <label className={labelClass}>Functional Scope *</label>
                  <textarea className={textareaClass} value={formData.functional_scope} onChange={e => setFormData({...formData, functional_scope: e.target.value})} required />
                </div>
                <div>
                  <label className={labelClass}>Technical Scope</label>
                  <textarea className={textareaClass} value={formData.technical_scope} onChange={e => setFormData({...formData, technical_scope: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className={labelClass}>Risk Assessment</label>
                  <select className={inputClass} value={formData.risk_assessment} onChange={e => setFormData({...formData, risk_assessment: e.target.value})}>
                    <option value="Low">Low Risk</option>
                    <option value="Medium">Medium Risk</option>
                    <option value="High">High Risk</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Estimated Effort</label>
                  <AppInput placeholder="e.g. 40 Hours" value={formData.estimated_effort} onChange={e => setFormData({...formData, estimated_effort: e.target.value})} className={inputClass} />
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
                <div>
                  <label className={labelClass}>Regulatory Mapping</label>
                  <AppInput placeholder="e.g. GDPR, HIPAA, SOC2" value={formData.regulatory_mapping} onChange={e => setFormData({...formData, regulatory_mapping: e.target.value})} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Dependency Notes</label>
                  <AppInput placeholder="e.g. Blocked by REQ-002" value={formData.dependency_notes} onChange={e => setFormData({...formData, dependency_notes: e.target.value})} className={inputClass} />
                </div>
              </div>

              <div className="space-y-2">
                <label className={labelClass}>Impacted Departments (Approval Sequence) *</label>
                <div className={`p-4 rounded-xl border flex flex-wrap gap-2 bg-white border-border`}>
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
                        {isSelected && <span className="bg-white/20 w-4 h-4 rounded-full flex items-center justify-center text-[10px]">{index + 1}</span>}
                        {d.department_name}
                      </AppButton>
                    );
                  })}
                </div>
                <p className={`text-[10px] text-muted`}>Select departments in the order they should approve this requirement.</p>
              </div>
            </div>

            {/* Timelines */}
            <div className="space-y-4">
              <h3 className={`text-sm font-bold flex items-center gap-2 pb-2 border-b text-pink-700 border-border`}>
                <Calendar className="h-4 w-4" /> Schedule & Timelines
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Start Date *</label>
                  <AppInput type="date" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} className={inputClass} required />
                </div>
                <div>
                  <label className={labelClass}>Due Date *</label>
                  <AppInput type="date" value={formData.due_date} onChange={e => setFormData({...formData, due_date: e.target.value})} className={inputClass} required />
                </div>
                <div>
                  <label className={labelClass}>Expected Completion</label>
                  <AppInput type="date" value={formData.expected_completion_date} onChange={e => setFormData({...formData, expected_completion_date: e.target.value})} className={inputClass} />
                </div>
              </div>
            </div>

            <div className={`flex justify-end gap-3 pt-6 border-t border-border`}>
              <AppButton type="button" variant="ghost" onClick={() => router.push("/requirements")} disabled={loading} className={"text-muted"}>
                Cancel
              </AppButton>
              <AppButton type="submit" variant="primary" disabled={loading} className="bg-accent hover:bg-accent text-white min-w-[140px]">
                {loading ? "Submitting Analysis..." : "Submit Requirement Analysis"}
              </AppButton>
            </div>
          </form>
        </AppCard>
      </div>
    </PageContainer>
  );
}

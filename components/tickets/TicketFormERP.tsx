"use client";

import React, { useState, useEffect } from "react";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { Monitor, Clock, Send, Paperclip, X, Loader2 } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { fetchMastersByScope, fetchDependentMasters } from "@/lib/actions/masters";

interface TicketFormERPProps {
  scope: any;
  onCancel: () => void;
  onDiscard?: () => void;
  onSubmit: (data: any) => void;
}

export function TicketFormERP({ scope, onCancel, onDiscard, onSubmit }: TicketFormERPProps) {
  const { theme } = useTheme();
  const isLightMode = ["light-neumorphic", "pure-white", "pure-white-neumorphic", "amazon-prime-upi"].includes(theme);
  
  const [loading, setLoading] = useState(true);
  const [masters, setMasters] = useState<any>({});
  const [modules, setModules] = useState<any[]>([]);
  const [submodules, setSubmodules] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    systemId: "",
    moduleId: "",
    submoduleId: "",
    categoryId: "",
    subcategoryId: "",
    priorityId: "",
    subject: "",
    remark: "",
    requirement_description: "",
    business_reason: "",
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
    budget_impact: "",
    attachment: null as File | null,
  });

  const [isReqCategory, setIsReqCategory] = useState(false);

  const [slaPreview, setSlaPreview] = useState<string | null>(null);

  // 1. Initial Load
  useEffect(() => {
    async function loadMasters() {
      setLoading(true);
      try {
        const data = await fetchMastersByScope(scope.id);
        setMasters(data);
        
        const prios = data.master_priority || [];
        const defaultPrio = prios.find((p: any) => p.code === "PRIO_MED_P3") || prios[0];
        if (defaultPrio) {
          setFormData(prev => ({ ...prev, priorityId: defaultPrio.id }));
          setSlaPreview(`${defaultPrio.sla_target_minutes || 240}m Standard`);
        }
      } catch (error) {
        console.error("Failed to load ERP masters:", error);
      } finally {
        setLoading(false);
      }
    }
    loadMasters();
  }, [scope.id]);

  // 2. Triple-Tier Dependency: System -> Module -> Submodule
  useEffect(() => {
    if (!formData.systemId) {
      setModules([]);
      return;
    }
    fetchDependentMasters("software_module", formData.systemId).then(setModules);
  }, [formData.systemId]);

  useEffect(() => {
    if (!formData.moduleId) {
      setSubmodules([]);
      return;
    }
    fetchDependentMasters("software_submodule", formData.moduleId).then(setSubmodules);
  }, [formData.moduleId]);

  useEffect(() => {
    if (!formData.categoryId) {
      setSubcategories([]);
      setIsReqCategory(false);
      return;
    }
    const cat = (masters.ticket_category || []).find((c: any) => c.id === formData.categoryId);
    setIsReqCategory(cat?.is_requirement_category || cat?.name?.toUpperCase().includes('REQUIREMENT') || false);

    fetchDependentMasters("ticket_subcategory", formData.categoryId).then(setSubcategories);
  }, [formData.categoryId, masters.ticket_category]);

  const handlePriorityChange = (id: string) => {
    const prios = masters.master_priority || [];
    const prio = prios.find((p: any) => p.id === id);
    setFormData(prev => ({ ...prev, priorityId: id }));
    if (prio) {
      setSlaPreview(`${prio.sla_target_minutes || 240}m Standard`);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-theme-icon" />
        <p className="text-sm text-muted font-medium tracking-widest uppercase">Fetching Software Matrix...</p>
      </div>
    );
  }

  return (
    <div className="animate-in slide-in-from-bottom-4 duration-500">
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onSubmit({ ...formData, isReqCategory }); }}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
            
            {/* Software Hierarchy */}
            <div className="space-y-2">
              <label className={`text-sm font-bold uppercase tracking-wider text-muted`}>Software System</label>
              <select 
                className={`w-full h-11 px-4 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-theme-btn-primary/50 ${ "theme-input-structural text-foreground" }`}
                value={formData.systemId}
                onChange={(e) => setFormData(prev => ({ ...prev, systemId: e.target.value, moduleId: "", submoduleId: "" }))}
                required
              >
                <option value="">Select System</option>
                {(masters.software_system || []).map((sys: any) => (
                  <option key={sys.id} value={sys.id}>{sys.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className={`text-sm font-bold uppercase tracking-wider text-muted`}>Operational Priority</label>
              <select 
                className={`w-full h-11 px-4 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-theme-btn-primary/50 ${ "theme-input-structural text-foreground" }`}
                value={formData.priorityId}
                onChange={(e) => handlePriorityChange(e.target.value)}
                required
              >
                {(masters.master_priority || []).map((prio: any) => (
                  <option key={prio.id} value={prio.id}>{prio.name}</option>
                ))}
              </select>

            </div>

            <div className="space-y-2">
              <label className={`text-sm font-bold uppercase tracking-wider text-muted`}>Module</label>
              <select 
                className={`w-full h-11 px-4 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-theme-btn-primary/50 disabled:opacity-50 ${ "theme-input-structural text-foreground" }`}
                value={formData.moduleId}
                onChange={(e) => setFormData(prev => ({ ...prev, moduleId: e.target.value, submoduleId: "" }))}
                required
                disabled={!formData.systemId}
              >
                <option value="">Select Module</option>
                {modules.map((mod: any) => (
                  <option key={mod.id} value={mod.id}>{mod.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className={`text-sm font-bold uppercase tracking-wider text-muted`}>Submodule</label>
              <select 
                className={`w-full h-11 px-4 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-theme-btn-primary/50 disabled:opacity-50 ${ "theme-input-structural text-foreground" }`}
                value={formData.submoduleId}
                onChange={(e) => setFormData(prev => ({ ...prev, submoduleId: e.target.value }))}
                required
                disabled={!formData.moduleId}
              >
                <option value="">Select Submodule</option>
                {submodules.map((sm: any) => (
                  <option key={sm.id} value={sm.id}>{sm.name}</option>
                ))}
              </select>
            </div>

            {/* Categories */}
            <div className="space-y-2">
              <label className={`text-sm font-bold uppercase tracking-wider text-muted`}>Issue Category</label>
              <select 
                className={`w-full h-11 px-4 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-theme-btn-primary/50 ${ "theme-input-structural text-foreground" }`}
                value={formData.categoryId}
                onChange={(e) => setFormData(prev => ({ ...prev, categoryId: e.target.value, subcategoryId: "" }))}
                required
              >
                <option value="">Select Category</option>
                {(masters.ticket_category || []).map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className={`text-sm font-bold uppercase tracking-wider text-muted`}>Issue Sub Category</label>
              <select 
                className={`w-full h-11 px-4 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-theme-btn-primary/50 disabled:opacity-50 ${ "theme-input-structural text-foreground" }`}
                value={formData.subcategoryId}
                onChange={(e) => setFormData(prev => ({ ...prev, subcategoryId: e.target.value }))}
                required
                disabled={!formData.categoryId}
              >
                <option value="">Select Subcategory</option>
                {subcategories.map((sc: any) => (
                  <option key={sc.id} value={sc.id}>{sc.name}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 lg:col-span-3 space-y-2">
              <label className={`text-sm font-bold uppercase tracking-wider text-muted`}>Subject <span className="text-red-500">*</span></label>
              <AppInput 
                
                value={formData.subject}
                onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                required
                className="theme-input-structural"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className={`text-sm font-bold uppercase tracking-wider text-muted`}>Issue Description <span className="text-red-500">*</span></label>
            <textarea 
              className={`w-full p-4 rounded-2xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-theme-btn-primary/50 min-h-[100px] resize-none ${ "theme-input-structural text-foreground placeholder:text-muted" }`}
              
              value={formData.remark}
              onChange={(e) => setFormData(prev => ({ ...prev, remark: e.target.value }))}
              required
            />
          </div>



          {isReqCategory && (
            <div className="grid grid-cols-1 gap-y-4 animate-in fade-in slide-in-from-top-2 p-4 bg-theme-btn-primary/5 border border-theme-btn-primary/20 rounded-2xl mt-4">
              <h4 className="text-sm font-bold text-theme-icon mb-2">Requirement Details (Mandatory)</h4>
              
              <div className="space-y-2">
                <label className={`text-sm font-bold uppercase tracking-wider text-muted`}>Requirement Reason <span className="text-danger">*</span></label>
                <textarea 
                  className={`w-full p-4 rounded-2xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-theme-btn-primary/50 min-h-[100px] resize-none ${ "theme-input-structural text-foreground placeholder:text-muted" }`}
                  
                  value={formData.business_reason}
                  onChange={(e) => setFormData(prev => ({ ...prev, business_reason: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className={`text-sm font-bold uppercase tracking-wider text-muted`}>Requirement Details <span className="text-danger">*</span></label>
                <textarea 
                  className={`w-full p-4 rounded-2xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-theme-btn-primary/50 min-h-[120px] resize-none ${ "theme-input-structural text-foreground placeholder:text-muted" }`}
                  
                  value={formData.requirement_description}
                  onChange={(e) => setFormData(prev => ({ ...prev, requirement_description: e.target.value }))}
                required
              />
            </div>
            
              <div className="space-y-2 mt-4 pt-4 border-t border-theme-btn-primary/20">
                <label className={`text-sm font-bold uppercase tracking-wider text-muted`}>Requirement Domain (Scope) <span className="text-danger">*</span></label>
                <select 
                  className={`w-full p-4 rounded-2xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-theme-btn-primary/50 ${"theme-input-structural text-foreground"}`}
                  value={formData.requirement_domain}
                  onChange={(e) => setFormData(prev => ({...prev, requirement_domain: e.target.value}))}
                  required
                >
                  <option value="General Business">General Business</option>
                  <option value="IT & Software System">IT & Software System</option>
                  <option value="Infrastructure & Hardware">Infrastructure & Hardware</option>
                </select>
              </div>

              {formData.requirement_domain === "IT & Software System" && (
                <div className="space-y-4 mt-4 animate-in fade-in slide-in-from-top-4 duration-300 bg-theme-btn-primary text-theme-btn-primary-text/5 p-4 rounded-xl border border-blue-500/20">
                  <h5 className="font-bold text-accent">IT & Software System Scope</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className={`text-xs font-bold uppercase tracking-wider text-muted`}>Target System / Application</label>
                      <input type="text" className={`w-full p-3 rounded-xl text-sm theme-input-structural text-foreground`} value={formData.target_system} onChange={e => setFormData(p => ({...p, target_system: e.target.value}))} placeholder="e.g. ERP, CRM" />
                    </div>
                    <div className="space-y-2">
                      <label className={`text-xs font-bold uppercase tracking-wider text-muted`}>Data Privacy & Security</label>
                      <input type="text" className={`w-full p-3 rounded-xl text-sm theme-input-structural text-foreground`} value={formData.data_privacy} onChange={e => setFormData(p => ({...p, data_privacy: e.target.value}))} placeholder="e.g. Handles PII" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className={`text-xs font-bold uppercase tracking-wider text-muted`}>Integration Dependencies</label>
                    <textarea className={`w-full p-3 rounded-xl text-sm theme-input-structural text-foreground min-h-[60px]`} value={formData.integrations} onChange={e => setFormData(p => ({...p, integrations: e.target.value}))} placeholder="List APIs or 3rd party tools..." />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className={`text-xs font-bold uppercase tracking-wider text-muted`}>Software License Cost</label>
                      <input type="number" className={`w-full p-3 rounded-xl text-sm theme-input-structural text-foreground`} value={formData.software_cost} onChange={e => setFormData(p => ({...p, software_cost: e.target.value}))} placeholder="e.g. 1500" />
                    </div>
                    <div className="space-y-2">
                      <label className={`text-xs font-bold uppercase tracking-wider text-muted`}>Development Cost</label>
                      <input type="number" className={`w-full p-3 rounded-xl text-sm theme-input-structural text-foreground`} value={formData.dev_cost} onChange={e => setFormData(p => ({...p, dev_cost: e.target.value}))} placeholder="e.g. 5000" />
                    </div>
                  </div>
                </div>
              )}

              {formData.requirement_domain === "Infrastructure & Hardware" && (
                <div className="space-y-4 mt-4 animate-in fade-in slide-in-from-top-4 duration-300 bg-theme-btn-primary text-theme-btn-primary-text/5 p-4 rounded-xl border border-indigo-500/20">
                  <h5 className="font-bold text-accent">Infrastructure Scope</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className={`text-xs font-bold uppercase tracking-wider text-muted`}>Target Environment</label>
                      <input type="text" className={`w-full p-3 rounded-xl text-sm theme-input-structural text-foreground`} value={formData.target_environment} onChange={e => setFormData(p => ({...p, target_environment: e.target.value}))} placeholder="e.g. AWS, Azure" />
                    </div>
                    <div className="space-y-2">
                      <label className={`text-xs font-bold uppercase tracking-wider text-muted`}>Hardware & Capacity</label>
                      <input type="text" className={`w-full p-3 rounded-xl text-sm theme-input-structural text-foreground`} value={formData.hardware_needs} onChange={e => setFormData(p => ({...p, hardware_needs: e.target.value}))} placeholder="e.g. 2TB Storage" />
                    </div>
                    <div className="space-y-2">
                      <label className={`text-xs font-bold uppercase tracking-wider text-muted`}>CAPEX Amount</label>
                      <input type="number" className={`w-full p-3 rounded-xl text-sm theme-input-structural text-foreground`} value={formData.capex_amount} onChange={e => setFormData(p => ({...p, capex_amount: e.target.value}))} placeholder="e.g. 10000" />
                    </div>
                    <div className="space-y-2">
                      <label className={`text-xs font-bold uppercase tracking-wider text-muted`}>OPEX Amount</label>
                      <input type="number" className={`w-full p-3 rounded-xl text-sm theme-input-structural text-foreground`} value={formData.opex_amount} onChange={e => setFormData(p => ({...p, opex_amount: e.target.value}))} placeholder="e.g. 500" />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2 mt-4">
                <label className={`text-sm font-bold uppercase tracking-wider text-muted`}>Budget Impact</label>
                <input type="text" className={`w-full p-4 rounded-2xl text-sm theme-input-structural text-foreground`} value={formData.budget_impact} onChange={e => setFormData(p => ({...p, budget_impact: e.target.value}))} placeholder="e.g. Unbudgeted, Approved in Q3" />
              </div>

            </div>
          )}

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mt-2">
            <div className="flex-1 space-y-2">
              <label className={`text-sm font-bold uppercase tracking-wider text-muted`}>Technical Evidence (Screenshots / Logs)</label>
              <div className={`relative group border-2 border-dashed rounded-2xl p-4 transition-all ${
                "border-border hover:border-theme-btn-primary/30 bg-elevated/50"
              } ${isReqCategory && !formData.attachment ? 'border-red-500/50 bg-danger/5' : ''}`}>
                <input 
                  type="file" 
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  onChange={(e) => setFormData({ ...formData, attachment: e.target.files?.[0] || null })}
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-surface shadow-sm`}>
                      <Paperclip className={`h-4 w-4 text-theme-icon`} />
                    </div>
                    <div>
                      <p className={`text-xs font-medium ${"text-foreground"}`}>
                        {formData.attachment ? formData.attachment.name : "Attach Bug Evidence or Logs"}
                      </p>
                      <p className="text-xs text-muted uppercase tracking-tight">Max 10MB • PDF, JPG, PNG, LOG</p>
                    </div>
                  </div>
                  {formData.attachment && (
                    <AppButton variant="secondary" 
                      type="button"
                      onClick={() => setFormData({ ...formData, attachment: null })}
                      className="p-1 rounded-md hover:bg-danger/10 text-danger transition-colors relative z-20"
                    >
                      <X className="h-4 w-4" />
                    </AppButton>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 pb-1">
              {onDiscard && (
                <AppButton variant="outline" type="button" onClick={onDiscard} className="text-danger border-danger/30 hover:bg-danger/10 hover:border-danger hover:text-danger">
                  Discard
                </AppButton>
              )}
              <AppButton variant="ghost" type="button" onClick={onCancel} className={"text-muted"}>
                Back
              </AppButton>
              <AppButton variant="primary" type="submit" className="bg-theme-btn-primary hover:opacity-90 text-theme-btn-primary-text min-w-[140px]">
                <Send className="h-4 w-4 mr-2" />
                Initialize Workflow
              </AppButton>
            </div>
          </div>
        </form>
    </div>
  );
}

// CACHE_BUSTER=1

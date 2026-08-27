"use client";

import React, { useState, useEffect } from "react";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { Server, AlertCircle, Clock, Paperclip, Send, X, Loader2 } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { fetchMastersByScope, fetchDependentMasters } from "@/lib/actions/masters";

interface TicketFormInfraProps {
  scope: any;
  onCancel: () => void;
  onDiscard?: () => void;
  onSubmit: (data: any) => void;
}

export function TicketFormInfra({ scope, onCancel, onDiscard, onSubmit }: TicketFormInfraProps) {
  const { theme } = useTheme();
  const isLightMode = ["light-neumorphic", "pure-white", "pure-white-neumorphic", "amazon-prime-upi"].includes(theme);
  
  const [loading, setLoading] = useState(true);
  const [masters, setMasters] = useState<any>({});
  const [subTypes, setSubTypes] = useState<any[]>([]);
  const [subCategories, setSubCategories] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    issueTypeId: "",
    issueSubtypeId: "",
    categoryId: "",
    subcategoryId: "",
    priorityId: "",
    assetId: "",
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
    infraSpecifications: [] as Array<{ id: string, item: string, cost: number, qty: number }>
  });

  const [isReqCategory, setIsReqCategory] = useState(false);
  const [slaPreview, setSlaPreview] = useState<string | null>(null);

  const handleAddSpec = () => {
    setFormData(prev => ({
      ...prev,
      infraSpecifications: [
        ...prev.infraSpecifications,
        { id: Math.random().toString(36).substr(2, 9), item: "", cost: 0, qty: 1 }
      ]
    }));
  };

  const handleUpdateSpec = (id: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      infraSpecifications: prev.infraSpecifications.map(spec => 
        spec.id === id ? { ...spec, [field]: value } : spec
      )
    }));
  };

  const handleRemoveSpec = (id: string) => {
    setFormData(prev => ({
      ...prev,
      infraSpecifications: prev.infraSpecifications.filter(spec => spec.id !== id)
    }));
  };

  // 1. Initial Load of Scoped Masters
  useEffect(() => {
    async function loadMasters() {
      setLoading(true);
      try {
        const data = await fetchMastersByScope(scope.id);
        console.log("[InfraForm] Fetched masters:", data);
        setMasters(data);
        
        // Auto-select default priority if available
        const prios = data.master_priority || [];
        const defaultPrio = prios.find((p: any) => p.code === "PRIO_MED_P3") || prios[0];
        if (defaultPrio) {
          setFormData(prev => ({ ...prev, priorityId: defaultPrio.id }));
          setSlaPreview(`${defaultPrio.sla_target_minutes || 240}m Standard`);
        }
      } catch (error) {
        console.error("Failed to load infra masters:", error);
      } finally {
        setLoading(false);
      }
    }
    loadMasters();
  }, [scope.id]);

  // 2. Reactive Dependency: Issue Type -> Issue Sub Type
  useEffect(() => {
    if (!formData.issueTypeId) {
      setSubTypes([]);
      return;
    }
    fetchDependentMasters("issue_subtype", formData.issueTypeId).then(setSubTypes);
  }, [formData.issueTypeId]);

  // 3. Reactive Dependency: Category -> Subcategory
  useEffect(() => {
    if (!formData.categoryId) {
      setSubCategories([]);
      setIsReqCategory(false);
      return;
    }
    const cat = (masters.ticket_category || []).find((c: any) => c.id === formData.categoryId);
    setIsReqCategory(cat?.is_requirement_category || cat?.name?.toUpperCase().includes('REQUIREMENT') || false);

    fetchDependentMasters("ticket_subcategory", formData.categoryId).then(setSubCategories);
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
        <p className="text-sm text-muted font-medium tracking-widest uppercase">Fetching Infrastructure Matrix...</p>
      </div>
    );
  }

  return (
    <div className="animate-in slide-in-from-right-4 duration-500">
        <form 
          onSubmit={(e) => { e.preventDefault(); onSubmit({ ...formData, isReqCategory }); }}
          className="space-y-4"
        >
          {/* Main Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
            
            {/* Issue Type & Subtype */}
            <div className="space-y-2">
              <label className={`text-sm font-bold uppercase tracking-wider text-muted`}>Issue Type</label>
              <select 
                className={`w-full h-11 px-4 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-theme-btn-primary/50 ${ "theme-input-structural text-foreground" }`}
                value={formData.issueTypeId}
                onChange={(e) => setFormData({ ...formData, issueTypeId: e.target.value, issueSubtypeId: "" })}
                required
              >
                <option value="">Select Type</option>
                {(masters.issue_type || []).map((t: any) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className={`text-sm font-bold uppercase tracking-wider text-muted`}>Issue Subtype</label>
              <select 
                className={`w-full h-11 px-4 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-theme-btn-primary/50 disabled:opacity-50 ${ "theme-input-structural text-foreground" }`}
                value={formData.issueSubtypeId}
                onChange={(e) => setFormData({ ...formData, issueSubtypeId: e.target.value })}
                required
                disabled={!formData.issueTypeId}
              >
                <option value="">Select Subtype</option>
                {subTypes.map((t: any) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            {/* Category & Subcategory */}
            <div className="space-y-2">
              <label className={`text-sm font-bold uppercase tracking-wider text-muted`}>Issue Category</label>
              <select 
                className={`w-full h-11 px-4 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-theme-btn-primary/50 ${ "theme-input-structural text-foreground" }`}
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value, subcategoryId: "" })}
                required
              >
                <option value="">Select Category</option>
                {(masters.ticket_category || []).map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className={`text-sm font-bold uppercase tracking-wider text-muted`}>Sub-Category</label>
              <select 
                className={`w-full h-11 px-4 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-theme-btn-primary/50 disabled:opacity-50 ${ "theme-input-structural text-foreground" }`}
                value={formData.subcategoryId}
                onChange={(e) => setFormData({ ...formData, subcategoryId: e.target.value })}
                required
                disabled={!formData.categoryId}
              >
                <option value="">Select Subcategory</option>
                {subCategories.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Asset Selection & Priority */}
            <div className="space-y-2">
              <label className={`text-sm font-bold uppercase tracking-wider text-muted`}>Affected Asset</label>
              <select 
                className={`w-full h-11 px-4 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-theme-btn-primary/50 ${ "theme-input-structural text-foreground" }`}
                value={formData.assetId}
                onChange={(e) => setFormData({ ...formData, assetId: e.target.value })}
                required
              >
                <option value="">Select Asset</option>
                {(masters.asset || []).map((a: any) => (
                  <option key={a.id} value={a.id}>{a.name} [{a.asset_tag}]</option>
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
                {(masters.master_priority || []).map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

            </div>

            <div className="md:col-span-2 lg:col-span-3 space-y-2">
              <label className={`text-sm font-bold uppercase tracking-wider text-muted`}>Subject <span className="text-red-500">*</span></label>
              <AppInput 
                placeholder="Summarize the infrastructure fault..."
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                required
                className="theme-input-structural"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className={`text-sm font-bold uppercase tracking-wider text-muted`}>Incident Description & Technical Details</label>
            <textarea 
              className={`w-full p-4 rounded-2xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-theme-btn-primary/50 min-h-[100px] resize-none ${ "theme-input-structural text-foreground placeholder:text-muted" }`}
              placeholder="Describe the hardware fault, server impact, or network outage in detail..."
              value={formData.remark}
              onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
              required
            />
          </div>



          {isReqCategory && (
            <div className="grid grid-cols-1 gap-y-4 animate-in fade-in slide-in-from-top-2 p-4 bg-theme-btn-primary/5 border border-theme-btn-primary/20 rounded-2xl">
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
              
              {formData.requirement_domain === "Infrastructure & Hardware" && (
                <div className="space-y-4 mt-6 p-4 rounded-xl border border-dashed border-theme-btn-primary/30 bg-elevated/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-bold text-accent">Infrastructure Specifications</h5>
                      <p className="text-xs text-muted">Itemize the exact hardware/software licenses, qty, and unit cost required.</p>
                    </div>
                    <AppButton type="button" size="sm" variant="outline" onClick={handleAddSpec} className="gap-2 text-xs h-8">
                      <span className="text-lg leading-none">+</span> Add Spec
                    </AppButton>
                  </div>
                  
                  {formData.infraSpecifications.length > 0 ? (
                    <div className="space-y-3 mt-4">
                      {formData.infraSpecifications.map((spec, index) => (
                        <div key={spec.id} className="flex flex-col md:flex-row gap-3 items-end bg-elevated/50 p-3 rounded-xl border border-border">
                          <div className="flex-1 space-y-1 w-full">
                            <label className="text-xs font-semibold text-muted uppercase">Item Description</label>
                            <input type="text" className="w-full h-10 px-3 rounded-lg text-sm theme-input-structural text-foreground" value={spec.item} onChange={(e) => handleUpdateSpec(spec.id, 'item', e.target.value)} placeholder="e.g. Dell PowerEdge R740" />
                          </div>
                          <div className="w-full md:w-32 space-y-1">
                            <label className="text-xs font-semibold text-muted uppercase">Unit Cost ($)</label>
                            <input type="number" className="w-full h-10 px-3 rounded-lg text-sm theme-input-structural text-foreground" value={spec.cost || ''} onChange={(e) => handleUpdateSpec(spec.id, 'cost', parseFloat(e.target.value) || 0)} placeholder="0.00" />
                          </div>
                          <div className="w-full md:w-24 space-y-1">
                            <label className="text-xs font-semibold text-muted uppercase">Qty</label>
                            <input type="number" className="w-full h-10 px-3 rounded-lg text-sm theme-input-structural text-foreground" value={spec.qty || ''} onChange={(e) => handleUpdateSpec(spec.id, 'qty', parseInt(e.target.value) || 0)} placeholder="1" />
                          </div>
                          <div className="w-full md:w-auto pt-2 md:pt-0">
                            <button type="button" onClick={() => handleRemoveSpec(spec.id)} className="w-full md:w-10 h-10 flex items-center justify-center rounded-lg hover:bg-danger/20 text-danger transition-colors">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                      
                      <div className="flex justify-end pt-2 border-t border-border mt-2">
                        <div className="text-sm font-semibold">
                          Total Estimate: <span className="text-theme-btn-primary ml-2">
                            ${formData.infraSpecifications.reduce((acc, curr) => acc + ((curr.cost || 0) * (curr.qty || 0)), 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-sm text-muted/70 italic border border-dashed border-border rounded-xl">
                      No specifications added. Click 'Add Spec' to itemize requirement.
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mt-2">
            <div className="flex-1 space-y-2">
              <label className={`text-sm font-bold uppercase tracking-wider text-muted`}>Operational Attachments (Log Files / Screenshots)</label>
              <div className={`relative group border-2 border-dashed rounded-2xl p-4 transition-all ${
                "border-border hover:border-theme-btn-primary/30 bg-elevated/50"
              }`}>
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
                        {formData.attachment ? formData.attachment.name : "Select or Drop Technical Evidence"}
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
                Submit Ticket
              </AppButton>
            </div>
          </div>
        </form>
    </div>
  );
}

// CACHE_BUSTER=1

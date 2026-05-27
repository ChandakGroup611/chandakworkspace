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
  onSubmit: (data: any) => void;
}

export function TicketFormERP({ scope, onCancel, onSubmit }: TicketFormERPProps) {
  const { theme } = useTheme();
  const isLightMode = ["executive-light", "material-ocean", "aurora-breeze"].includes(theme);
  
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

  // 3. Dependency: Category -> Subcategory
  useEffect(() => {
    if (!formData.categoryId) {
      setSubcategories([]);
      setIsReqCategory(false);
      return;
    }
    const cat = (masters.ticket_category || []).find((c: any) => c.id === formData.categoryId);
    setIsReqCategory(cat?.is_requirement_category || false);

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
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        <p className="text-sm text-gray-500 font-medium tracking-widest uppercase">Fetching Software Matrix...</p>
      </div>
    );
  }

  return (
    <div className="animate-in slide-in-from-bottom-4 duration-500">
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            
            {/* Software Hierarchy */}
            <div className="space-y-2">
              <label className={`text-xs font-bold uppercase tracking-wider ${isLightMode ? "text-gray-600" : "text-gray-500"}`}>Software System</label>
              <select 
                className={`w-full h-11 px-4 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                  isLightMode ? "bg-white border-gray-200 text-gray-900" : "bg-white/5 border-white/10 text-white"
                }`}
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
              <label className={`text-xs font-bold uppercase tracking-wider ${isLightMode ? "text-gray-600" : "text-gray-500"}`}>Operational Priority</label>
              <select 
                className={`w-full h-11 px-4 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                  isLightMode ? "bg-white border-gray-200 text-gray-900" : "bg-white/5 border-white/10 text-white"
                }`}
                value={formData.priorityId}
                onChange={(e) => handlePriorityChange(e.target.value)}
                required
              >
                {(masters.master_priority || []).map((prio: any) => (
                  <option key={prio.id} value={prio.id}>{prio.name}</option>
                ))}
              </select>
              {slaPreview && (
                <div className={`flex items-center gap-2 mt-2 px-3 py-2 rounded-lg border animate-in fade-in slide-in-from-top-1 ${
                  isLightMode ? "bg-indigo-50 border-indigo-100 text-indigo-700" : "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
                }`}>
                  <Clock className="h-3 w-3" />
                  <span className="text-xs font-bold uppercase tracking-tight">{slaPreview}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className={`text-xs font-bold uppercase tracking-wider ${isLightMode ? "text-gray-600" : "text-gray-500"}`}>Module</label>
              <select 
                className="w-full h-11 px-4 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50"
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
              <label className={`text-xs font-bold uppercase tracking-wider ${isLightMode ? "text-gray-600" : "text-gray-500"}`}>Submodule</label>
              <select 
                className="w-full h-11 px-4 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50"
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
              <label className={`text-xs font-bold uppercase tracking-wider ${isLightMode ? "text-gray-600" : "text-gray-500"}`}>Issue Category</label>
              <select 
                className={`w-full h-11 px-4 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                  isLightMode ? "bg-white border-gray-200 text-gray-900" : "bg-white/5 border-white/10 text-white"
                }`}
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
              <label className={`text-xs font-bold uppercase tracking-wider ${isLightMode ? "text-gray-600" : "text-gray-500"}`}>Issue Sub Category</label>
              <select 
                className="w-full h-11 px-4 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50"
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

            <div className="md:col-span-2 space-y-2">
              <label className={`text-xs font-bold uppercase tracking-wider ${isLightMode ? "text-gray-600" : "text-gray-500"}`}>Subject</label>
              <AppInput 
                placeholder="Operational summary of the software issue"
                value={formData.subject}
                onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                required
                className={isLightMode ? "bg-white border-gray-200" : ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className={`text-xs font-bold uppercase tracking-wider ${isLightMode ? "text-gray-600" : "text-gray-500"}`}>Issue Description</label>
            <textarea 
              className={`w-full p-4 rounded-2xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 min-h-[100px] resize-none ${
                isLightMode ? "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400" : "bg-white/5 border-white/10 text-white placeholder:text-gray-600"
              }`}
              placeholder="Describe the application fault, bug behavior, or system error in detail..."
              value={formData.remark}
              onChange={(e) => setFormData(prev => ({ ...prev, remark: e.target.value }))}
              required={!isReqCategory}
            />
          </div>

          {isReqCategory && (
            <div className="grid grid-cols-1 gap-y-4 animate-in fade-in slide-in-from-top-2 p-4 bg-indigo-900/10 border border-indigo-500/20 rounded-2xl">
              <h4 className="text-sm font-bold text-indigo-400 mb-2">Requirement Details (Mandatory)</h4>
              
              <div className="space-y-2">
                <label className={`text-xs font-bold uppercase tracking-wider ${isLightMode ? "text-gray-600" : "text-gray-500"}`}>Requirement Description <span className="text-red-500">*</span></label>
                <textarea 
                  className={`w-full p-4 rounded-2xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 min-h-[100px] resize-none ${
                    isLightMode ? "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400" : "bg-white/5 border-white/10 text-white placeholder:text-gray-600"
                  }`}
                  placeholder="Provide technical scope and required capabilities..."
                  value={formData.requirement_description}
                  onChange={(e) => setFormData(prev => ({ ...prev, requirement_description: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className={`text-xs font-bold uppercase tracking-wider ${isLightMode ? "text-gray-600" : "text-gray-500"}`}>Business Justification <span className="text-red-500">*</span></label>
                <textarea 
                  className={`w-full p-4 rounded-2xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 min-h-[80px] resize-none ${
                    isLightMode ? "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400" : "bg-white/5 border-white/10 text-white placeholder:text-gray-600"
                  }`}
                  placeholder="Explain why this requirement is needed for the business..."
                  value={formData.business_reason}
                  onChange={(e) => setFormData(prev => ({ ...prev, business_reason: e.target.value }))}
                  required
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className={`text-xs font-bold uppercase tracking-wider ${isLightMode ? "text-gray-600" : "text-gray-500"}`}>Technical Evidence (Screenshots / Logs)</label>
            <div className={`relative group border-2 border-dashed rounded-2xl p-4 transition-all ${
              isLightMode ? "border-gray-100 hover:border-indigo-200 bg-gray-50/50" : "border-white/5 hover:border-white/20 bg-white/[0.01]"
            } ${isReqCategory && !formData.attachment ? 'border-red-500/50 bg-red-500/5' : ''}`}>
              <input 
                type="file" 
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                onChange={(e) => setFormData({ ...formData, attachment: e.target.files?.[0] || null })}
                required={isReqCategory && !formData.attachment}
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isLightMode ? "bg-white shadow-sm" : "bg-white/5"}`}>
                    <Paperclip className={`h-4 w-4 ${isLightMode ? "text-indigo-600" : "text-gray-400"}`} />
                  </div>
                  <div>
                    <p className={`text-xs font-medium ${isLightMode ? "text-gray-700" : "text-gray-300"}`}>
                      {formData.attachment ? formData.attachment.name : "Attach Bug Evidence or Logs"}
                    </p>
                    <p className="text-xs text-gray-500 uppercase tracking-tight">Max 10MB • PDF, JPG, PNG, LOG</p>
                  </div>
                </div>
                {formData.attachment && (
                  <button 
                    type="button"
                    onClick={() => setFormData({ ...formData, attachment: null })}
                    className="p-1 rounded-md hover:bg-red-500/10 text-red-500 transition-colors relative z-20"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-6 border-t border-white/10">
            <AppButton variant="ghost" type="button" onClick={onCancel} className={isLightMode ? "text-gray-500" : "text-gray-400 hover:text-white"}>
              Cancel
            </AppButton>
            <AppButton variant="primary" type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white min-w-[140px]">
              <Send className="h-4 w-4 mr-2" />
              Initialize Workflow
            </AppButton>
          </div>
        </form>
    </div>
  );
}

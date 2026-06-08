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
  onSubmit: (data: any) => void;
}

export function TicketFormInfra({ scope, onCancel, onSubmit }: TicketFormInfraProps) {
  const { theme } = useTheme();
  const isLightMode = ["executive-light", "material-ocean", "aurora-breeze", "pure-elegance"].includes(theme);
  
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
    attachment: null as File | null,
  });

  const [slaPreview, setSlaPreview] = useState<string | null>(null);

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
      return;
    }
    fetchDependentMasters("ticket_subcategory", formData.categoryId).then(setSubCategories);
  }, [formData.categoryId]);

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
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        <p className="text-sm text-gray-500 font-medium tracking-widest uppercase">Fetching Infrastructure Matrix...</p>
      </div>
    );
  }

  return (
    <div className="animate-in slide-in-from-right-4 duration-500">
        <form 
          onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }}
          className="space-y-4"
        >
          {/* Main Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            
            {/* Issue Type & Subtype */}
            <div className="space-y-2">
              <label className={`text-xs font-bold uppercase tracking-wider ${isLightMode ? "text-gray-600" : "text-gray-500"}`}>Issue Type</label>
              <select 
                className={`w-full h-11 px-4 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                  isLightMode ? "bg-white border-gray-200 text-gray-900" : "bg-white/5 border-white/10 text-white"
                }`}
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
              <label className={`text-xs font-bold uppercase tracking-wider ${isLightMode ? "text-gray-600" : "text-gray-500"}`}>Issue Subtype</label>
              <select 
                className="w-full h-11 px-4 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50"
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
              <label className={`text-xs font-bold uppercase tracking-wider ${isLightMode ? "text-gray-600" : "text-gray-500"}`}>Asset Category</label>
              <select 
                className={`w-full h-11 px-4 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                  isLightMode ? "bg-white border-gray-200 text-gray-900" : "bg-white/5 border-white/10 text-white"
                }`}
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
              <label className={`text-xs font-bold uppercase tracking-wider ${isLightMode ? "text-gray-600" : "text-gray-500"}`}>Sub-Category</label>
              <select 
                className="w-full h-11 px-4 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50"
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
              <label className={`text-xs font-bold uppercase tracking-wider ${isLightMode ? "text-gray-600" : "text-gray-500"}`}>Affected Asset</label>
              <select 
                className={`w-full h-11 px-4 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                  isLightMode ? "bg-white border-gray-200 text-gray-900" : "bg-white/5 border-white/10 text-white"
                }`}
                value={formData.assetId}
                onChange={(e) => setFormData({ ...formData, assetId: e.target.value })}
              >
                <option value="">No Specific Asset (General Fault)</option>
                {(masters.asset || []).map((a: any) => (
                  <option key={a.id} value={a.id}>{a.name} [{a.asset_tag}]</option>
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
                {(masters.master_priority || []).map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
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

            <div className="md:col-span-2 space-y-2">
              <label className={`text-xs font-bold uppercase tracking-wider ${isLightMode ? "text-gray-600" : "text-gray-500"}`}>Subject</label>
              <AppInput 
                placeholder="Summarize the infrastructure fault..."
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                required
                className={isLightMode ? "bg-white border-gray-200" : ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className={`text-xs font-bold uppercase tracking-wider ${isLightMode ? "text-gray-600" : "text-gray-500"}`}>Incident Description & Technical Details</label>
            <textarea 
              className={`w-full p-4 rounded-2xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 min-h-[100px] resize-none ${
                isLightMode ? "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400" : "bg-white/5 border-white/10 text-white placeholder:text-gray-600"
              }`}
              placeholder="Describe the hardware fault, server impact, or network outage in detail..."
              value={formData.remark}
              onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <label className={`text-xs font-bold uppercase tracking-wider ${isLightMode ? "text-gray-600" : "text-gray-500"}`}>Operational Attachments (Log Files / Screenshots)</label>
            <div className={`relative group border-2 border-dashed rounded-2xl p-4 transition-all ${
              isLightMode ? "border-gray-100 hover:border-indigo-200 bg-gray-50/50" : "border-white/5 hover:border-white/20 bg-white/[0.01]"
            }`}>
              <input 
                type="file" 
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                onChange={(e) => setFormData({ ...formData, attachment: e.target.files?.[0] || null })}
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isLightMode ? "bg-white shadow-sm" : "bg-white/5"}`}>
                    <Paperclip className={`h-4 w-4 ${isLightMode ? "text-indigo-600" : "text-gray-400"}`} />
                  </div>
                  <div>
                    <p className={`text-xs font-medium ${isLightMode ? "text-gray-700" : "text-gray-300"}`}>
                      {formData.attachment ? formData.attachment.name : "Select or Drop Technical Evidence"}
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
              Submit Ticket
            </AppButton>
          </div>
        </form>
    </div>
  );
}

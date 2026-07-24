"use client";

import React, { useState, useEffect } from "react";
import { AppButton } from '@/components/ui/AppButton';
import { Plus, Trash2, Save, Filter, Users, Send, Loader2, Workflow } from "lucide-react";
import { saveSettingsEntity, deleteSettingsEntity } from "@/lib/actions/settings";
import { createClient } from "@/utils/supabase/client";

// Define available modules and their events/statuses
const MODULE_CONFIG: Record<string, { events: string[], statuses: string[] }> = {
  "Task": {
    events: ["Created", "Assigned", "Reassigned", "Status Changed", "Delayed", "Completed", "Closed"],
    statuses: ["ANY", "NEW", "IN_PROGRESS", "IN_REVIEW", "COMPLETED", "CLOSED", "DELAYED"]
  },
  "Workspace": {
    events: ["Created", "Updated", "Closed", "Archived"],
    statuses: ["ANY", "ACTIVE", "ON_HOLD", "COMPLETED", "CLOSED"]
  },
  "Ticket": {
    events: ["Created", "Assigned", "Escalated", "Status Changed", "Closed"],
    statuses: ["ANY", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]
  }
};

const RECIPIENT_TYPES = [
  "Creator", "Assigned User", "All Assignees", "Executors", 
  "Team Members", "Workspace Owner", "Workspace Members", 
  "Department Admin", "Project Head"
];

export default function NotificationRuleBuilder() {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState<{type: "success" | "error", text: string} | null>(null);
  
  const supabase = createClient();

  const triggerToast = (text: string, type: "success" | "error" = "success") => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3000);
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      const { data, error } = await supabase
        .from("notification_rules")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setRules(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRule = () => {
    setRules([
      {
        id: "temp_" + Date.now(),
        module: "Task",
        event: "Created",
        status_trigger: "ANY",
        recipient_type: ["Creator"],
        delivery_method: ["EMAIL"],
        is_active: true,
        is_new: true
      },
      ...rules
    ]);
  };

  const handleSaveRule = async (rule: any) => {
    try {
      const payload = {
        module: rule.module,
        event: rule.event,
        status_trigger: rule.status_trigger,
        recipient_type: rule.recipient_type,
        delivery_method: rule.delivery_method,
        is_active: rule.is_active
      };

      if (rule.is_new) {
        const res = await saveSettingsEntity("notification_rules", payload);
        if (!res.success) throw new Error(res.error);
        triggerToast("Rule created successfully");
      } else {
        const res = await saveSettingsEntity("notification_rules", payload, rule.id);
        if (!res.success) throw new Error(res.error);
        triggerToast("Rule updated successfully");
      }
      fetchRules();
    } catch (err: any) {
      triggerToast(err.message || "Failed to save rule", "error");
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (id.startsWith("temp_")) {
      setRules(rules.filter(r => r.id !== id));
      return;
    }
    if (!confirm("Delete this rule?")) return;
    try {
      const res = await deleteSettingsEntity("notification_rules", id, true);
      if (!res.success) throw new Error(res.error);
      triggerToast("Rule deleted");
      fetchRules();
    } catch (err: any) {
      triggerToast(err.message, "error");
    }
  };

  const updateLocalRule = (id: string, field: string, value: any) => {
    setRules(rules.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const toggleArrayItem = (id: string, field: string, item: string) => {
    setRules(rules.map(r => {
      if (r.id === id) {
        const arr = r[field] || [];
        if (arr.includes(item)) {
          return { ...r, [field]: arr.filter((x: string) => x !== item) };
        } else {
          return { ...r, [field]: [...arr, item] };
        }
      }
      return r;
    }));
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center bg-[#0A0D14] border border-white/10 p-4 rounded-xl shadow-lg">
        <div>
          <h2 className="text-lg font-bold text-foreground">Rule Engine</h2>
          <p className="text-xs text-gray-400">Configure declarative IF-THEN routing constraints.</p>
        </div>
        <AppButton
          onClick={handleAddRule}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-emerald-500/20 transition-all"
        >
          <Plus className="w-4 h-4" /> Add Rule
        </AppButton>
      </div>

      <div className="space-y-6">
        {rules.map((rule) => {
          const config = MODULE_CONFIG[rule.module] || MODULE_CONFIG["Task"];
          
          return (
            <div key={rule.id} className="bg-[#121620] border border-white/5 rounded-xl overflow-hidden shadow-xl">
              {/* Header IF block */}
              <div className="bg-surface/5 px-6 py-4 border-b border-white/5 flex flex-wrap items-center gap-4">
                <span className="font-mono text-emerald-400 font-bold text-lg">IF</span>
                
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-500 uppercase">Module =</span>
                  <select 
                    value={rule.module}
                    onChange={(e) => updateLocalRule(rule.id, "module", e.target.value)}
                    className="bg-[#0A0D14] border border-white/10 rounded-md px-3 py-1.5 text-sm font-semibold text-white focus:outline-none"
                  >
                    {Object.keys(MODULE_CONFIG).map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                <span className="font-mono text-emerald-400/70 font-bold text-sm">AND</span>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-500 uppercase">Event =</span>
                  <select 
                    value={rule.event}
                    onChange={(e) => updateLocalRule(rule.id, "event", e.target.value)}
                    className="bg-[#0A0D14] border border-white/10 rounded-md px-3 py-1.5 text-sm font-semibold text-white focus:outline-none"
                  >
                    {config.events.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>

                <span className="font-mono text-emerald-400/70 font-bold text-sm">AND</span>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-500 uppercase">Status =</span>
                  <select 
                    value={rule.status_trigger || "ANY"}
                    onChange={(e) => updateLocalRule(rule.id, "status_trigger", e.target.value)}
                    className="bg-[#0A0D14] border border-white/10 rounded-md px-3 py-1.5 text-sm font-semibold text-white focus:outline-none"
                  >
                    {config.statuses.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Body THEN block */}
              <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-accent font-bold text-lg">THEN</span>
                    <span className="text-sm font-bold text-gray-300">Resolve Recipients:</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {RECIPIENT_TYPES.map(type => {
                      const isSelected = rule.recipient_type.includes(type);
                      return (
                        <AppButton
                          key={type}
                          onClick={() => toggleArrayItem(rule.id, "recipient_type", type)}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors border ${
                            isSelected 
                              ? 'bg-accent/20 border-accent/50 text-blue-300' 
                              : 'bg-surface/5 border-transparent text-gray-400 hover:bg-surface/10'
                          }`}
                        >
                          {type}
                        </AppButton>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-accent font-bold text-lg">VIA</span>
                    <span className="text-sm font-bold text-gray-300">Delivery Method:</span>
                  </div>
                  
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={rule.delivery_method.includes("EMAIL")}
                        onChange={() => toggleArrayItem(rule.id, "delivery_method", "EMAIL")}
                        className="rounded border-gray-600 bg-gray-700 text-accent focus:ring-accent"
                      />
                      <span className="text-sm text-gray-300 font-medium">Email Dispatch</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={rule.delivery_method.includes("IN_APP")}
                        onChange={() => toggleArrayItem(rule.id, "delivery_method", "IN_APP")}
                        className="rounded border-gray-600 bg-gray-700 text-accent focus:ring-accent"
                      />
                      <span className="text-sm text-gray-300 font-medium">In-App Notification</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="bg-[#0A0D14] px-6 py-3 border-t border-white/5 flex justify-between items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${rule.is_active ? 'bg-emerald-500' : 'bg-gray-600'}`}>
                    <span className={`inline-block h-3 w-3 transform rounded-full bg-surface transition-transform ${rule.is_active ? 'translate-x-5' : 'translate-x-1'}`} />
                  </div>
                  <input 
                    type="checkbox" 
                    className="hidden" 
                    checked={rule.is_active} 
                    onChange={(e) => updateLocalRule(rule.id, "is_active", e.target.checked)}
                  />
                  <span className="text-xs font-bold text-gray-400 uppercase">Rule Active</span>
                </label>

                <div className="flex items-center gap-3">
                  <AppButton onClick={() => handleDeleteRule(rule.id)} className="text-gray-500 hover:text-rose-400 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </AppButton>
                  <AppButton 
                    onClick={() => handleSaveRule(rule)}
                    className="flex items-center gap-2 bg-surface/5 hover:bg-surface/10 text-white px-4 py-1.5 rounded text-sm font-bold transition-colors border border-white/10"
                  >
                    <Save className="w-4 h-4" /> Save
                  </AppButton>
                </div>
              </div>
            </div>
          );
        })}

        {rules.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-xl">
            <Workflow className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-400">No Routing Rules Configured</h3>
            <p className="text-sm text-gray-500 mt-1">Events will not trigger any notifications until rules are defined.</p>
          </div>
        )}
      </div>

      {toastMsg && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl px-4 py-3 shadow-2xl animate-in slide-in-from-bottom-5 duration-300 ${toastMsg.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'} text-white`}>
          <span className="text-xs font-semibold">{toastMsg.text}</span>
        </div>
      )}
    </div>
  );
}

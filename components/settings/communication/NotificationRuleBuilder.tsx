"use client";

import React, { useState, useEffect } from "react";
import { AppButton } from '@/components/ui/AppButton';
import { Plus, Trash2, Save, Filter, Users, Send, Loader2, Workflow } from "lucide-react";
import { saveSettingsEntity, deleteSettingsEntity } from "@/lib/actions/settings";
import { createClient } from "@/utils/supabase/client";
import { confirmAction } from "@/components/ui/feedback/confirm";
import { MEET_EVENTS, MEET_RECIPIENTS, REMINDER_TIMINGS, reminderTrigger } from "@/lib/utils/meet-email-config";

// Define available modules and their events/statuses
const MODULE_CONFIG: Record<string, { events: string[], statuses: string[] }> = {
  "Meet": {
    events: [...MEET_EVENTS],
    // Reminder rules keep their timing here ("BEFORE:<minutes>"); easier to edit in Meet › Automations › Emails
    statuses: ["ANY", ...REMINDER_TIMINGS.map((t) => reminderTrigger(t.minutes))]
  },
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
    if (!(await confirmAction("Delete this rule?"))) return;
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

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-success-text" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center bg-surface border border-border p-4 rounded-lg shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-heading">Rule engine</h2>
        </div>
        <AppButton
          variant="primary"
          onClick={handleAddRule}
          className="flex items-center gap-2"
          leftIcon={<Plus className="w-4 h-4" />}
        >
          <span>Add rule</span>
        </AppButton>
      </div>

      <div className="space-y-6">
        {rules.map((rule) => {
          const config = MODULE_CONFIG[rule.module] || MODULE_CONFIG["Task"];
          
          return (
            <div key={rule.id} className="bg-surface border border-border rounded-lg overflow-hidden shadow-sm">
              {/* Header IF block */}
              <div className="bg-sunken px-6 py-4 border-b border-border flex flex-wrap items-center gap-4">
                <span className="font-mono text-success-text font-semibold text-lg">IF</span>
                
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted">Module =</span>
                  <select 
                    value={rule.module}
                    onChange={(e) => updateLocalRule(rule.id, "module", e.target.value)}
                    className="bg-surface border border-input rounded-md px-3 py-1.5 text-sm font-semibold text-foreground focus:outline-none focus:border-border-active"
                  >
                    {Object.keys(MODULE_CONFIG).map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                <span className="font-mono text-muted font-semibold text-sm">AND</span>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted">Event =</span>
                  <select 
                    value={rule.event}
                    onChange={(e) => updateLocalRule(rule.id, "event", e.target.value)}
                    className="bg-surface border border-input rounded-md px-3 py-1.5 text-sm font-semibold text-foreground focus:outline-none focus:border-border-active"
                  >
                    {config.events.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>

                <span className="font-mono text-muted font-semibold text-sm">AND</span>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted">Status =</span>
                  <select 
                    value={rule.status_trigger || "ANY"}
                    onChange={(e) => updateLocalRule(rule.id, "status_trigger", e.target.value)}
                    className="bg-surface border border-input rounded-md px-3 py-1.5 text-sm font-semibold text-foreground focus:outline-none focus:border-border-active"
                  >
                    {config.statuses.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Body THEN block */}
              <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-primary font-semibold text-lg">Then</span>
                    <span className="text-sm font-semibold text-subtle">Resolve Recipients:</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {(rule.module === "Meet" ? [...MEET_RECIPIENTS] : RECIPIENT_TYPES).map(type => {
                      const isSelected = rule.recipient_type.includes(type);
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => toggleArrayItem(rule.id, "recipient_type", type)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border ${
                            isSelected 
                              ? 'bg-accent-soft border-primary text-accent-soft-text' 
                              : 'bg-sunken border-border text-subtle hover:bg-surface-hover'
                          }`}
                        >
                          {type}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-primary font-semibold text-lg">VIA</span>
                    <span className="text-sm font-semibold text-subtle">Delivery Method:</span>
                  </div>
                  
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={rule.delivery_method.includes("EMAIL")}
                        onChange={() => toggleArrayItem(rule.id, "delivery_method", "EMAIL")}
                        className="rounded border-input text-primary focus:ring-ring"
                      />
                      <span className="text-sm text-subtle font-medium">Email dispatch</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={rule.delivery_method.includes("IN_APP")}
                        onChange={() => toggleArrayItem(rule.id, "delivery_method", "IN_APP")}
                        className="rounded border-input text-primary focus:ring-ring"
                      />
                      <span className="text-sm text-subtle font-medium">In-app notification</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="bg-sunken px-6 py-3 border-t border-border flex justify-between items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${rule.is_active ? 'bg-success' : 'bg-surface border border-border'}`}>
                    <span className={`inline-block h-3 w-3 transform rounded-full bg-surface transition-transform ${rule.is_active ? 'translate-x-5' : 'translate-x-1'}`} />
                  </div>
                  <input 
                    type="checkbox" 
                    className="hidden" 
                    checked={rule.is_active} 
                    onChange={(e) => updateLocalRule(rule.id, "is_active", e.target.checked)}
                  />
                  <span className="text-xs font-semibold text-muted">Rule active</span>
                </label>

                <div className="flex items-center gap-3">
                  <button 
                    type="button"
                    aria-label="Delete rule"
                    onClick={() => handleDeleteRule(rule.id)} 
                    className="text-muted hover:text-danger-text p-1.5 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <AppButton 
                    variant="secondary"
                    onClick={() => handleSaveRule(rule)}
                    className="flex items-center gap-2 text-sm font-semibold"
                    leftIcon={<Save className="w-4 h-4" />}
                  >
                    <span>Save</span>
                  </AppButton>
                </div>
              </div>
            </div>
          );
        })}

        {rules.length === 0 && (
          <div className="text-center py-12 border border-border rounded-lg">
            <Workflow className="w-12 h-12 text-subtle mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-muted">No routing rules configured</h3>
            </div>
        )}
      </div>

      {toastMsg && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg px-4 py-3  animate-in slide-in-from-bottom-5 duration-300 ${toastMsg.type === 'error' ? 'bg-danger' : 'bg-success'} text-white`}>
          <span className="text-xs font-semibold">{toastMsg.text}</span>
        </div>
      )}
    </div>
  );
}

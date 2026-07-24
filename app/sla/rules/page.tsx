"use client";

import React, { useState, useEffect } from "react";
import { AppCard } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { AppBadge } from "@/components/ui/AppBadge";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { fetchSLARules, saveSLARule, deleteSLARule } from "@/lib/actions/sla";
import { toast } from "react-toastify";
import { Loader2, Plus, Save, Trash2, ShieldAlert, Clock, Play } from "lucide-react";

export default function SLARuleBuilder() {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [form, setForm] = useState({
    id: "",
    code: "",
    name: "",
    response_target_minutes: 60,
    resolution_target_minutes: 240,
    working_hours_code: "24x7",
    escalation_level: "STANDARD"
  });

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    setLoading(true);
    try {
      const data = await fetchSLARules();
      setRules(data);
    } catch (err) {
      toast.error("Failed to load SLA Rules");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (rule: any) => {
    setEditingId(rule.id);
    setForm({
      id: rule.id,
      code: rule.code,
      name: rule.name,
      response_target_minutes: rule.response_target_minutes,
      resolution_target_minutes: rule.resolution_target_minutes,
      working_hours_code: rule.working_hours_code,
      escalation_level: rule.escalation_level
    });
  };

  const handleCreateNew = () => {
    setEditingId("new");
    setForm({
      id: "",
      code: "NEW_RULE_" + Date.now().toString().slice(-4),
      name: "",
      response_target_minutes: 60,
      resolution_target_minutes: 240,
      working_hours_code: "24x7",
      escalation_level: "STANDARD"
    });
  };

  const handleSave = async () => {
    if (!form.name || !form.code) {
      toast.error("Name and Code are required");
      return;
    }
    setSaving(true);
    try {
      await saveSLARule(form);
      toast.success("SLA Rule saved successfully");
      setEditingId(null);
      await loadRules();
    } catch (err: any) {
      toast.error(err.message || "Failed to save SLA rule");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this SLA Policy? Active trackers using this policy will be impacted.")) return;
    try {
      await deleteSLARule(id);
      toast.success("SLA Rule deleted");
      await loadRules();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete SLA rule");
    }
  };

  if (loading) {
    return <div className="h-[80vh] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>;
  }

  return (
    <PageContainer strict={true}>
      <PageHeader
        title="SLA Rule Builder"
        description="Configure target response and resolution windows for operational governance."
        badge={<AppBadge variant="warning">Governance Engine</AppBadge>}
        actions={
          <AppButton variant="primary" onClick={handleCreateNew} leftIcon={<Plus className="w-4 h-4" />}>
            Create Policy
          </AppButton>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2 space-y-4">
          {rules.length === 0 && editingId !== "new" && (
            <div className="text-center py-12 bg-surface dark:bg-[#0B0F19] border border-border rounded-2xl">
              <ShieldAlert className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold">No SLA Policies Found</h3>
              <p className="text-sm text-gray-500 mt-1">Create your first policy to start tracking SLA breaches.</p>
            </div>
          )}

          {rules.map(rule => (
            <AppCard key={rule.id} className={`transition-all ${editingId === rule.id ? 'ring-2 ring-accent' : ''}`}>
              {editingId === rule.id ? (
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-center mb-4 border-b border-border pb-4">
                    <h3 className="font-bold text-lg">Edit SLA Policy</h3>
                    <div className="flex gap-2">
                      <AppButton size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</AppButton>
                      <AppButton size="sm" variant="primary" onClick={handleSave} disabled={saving} leftIcon={saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}>Save</AppButton>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase">Policy Name</label>
                      <AppInput value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. High Priority Issues" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase">System Code</label>
                      <AppInput value={form.code} onChange={e => setForm({...form, code: e.target.value})} className="font-mono" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase">Response Target (Minutes)</label>
                      <AppInput type="number" value={form.response_target_minutes} onChange={e => setForm({...form, response_target_minutes: parseInt(e.target.value) || 0})} />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase">Resolution Target (Minutes)</label>
                      <AppInput type="number" value={form.resolution_target_minutes} onChange={e => setForm({...form, resolution_target_minutes: parseInt(e.target.value) || 0})} />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase">Working Hours Code</label>
                      <select className="w-full mt-1 p-2 bg-transparent border border-border rounded-md text-sm focus:ring-accent" value={form.working_hours_code} onChange={e => setForm({...form, working_hours_code: e.target.value})}>
                        <option value="24x7">24x7 Continuous</option>
                        <option value="9x5">9x5 Business Hours</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase">Escalation Level</label>
                      <select className="w-full mt-1 p-2 bg-transparent border border-border rounded-md text-sm focus:ring-accent" value={form.escalation_level} onChange={e => setForm({...form, escalation_level: e.target.value})}>
                        <option value="STANDARD">Standard</option>
                        <option value="PRIORITY">Priority Escalate</option>
                        <option value="URGENT">Urgent (C-Level)</option>
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 flex flex-col sm:flex-row gap-6 justify-between items-start sm:items-center">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-bold text-lg">{rule.name}</h3>
                      <AppBadge variant="info">{rule.working_hours_code}</AppBadge>
                    </div>
                    <div className="text-xs text-gray-500 font-mono mt-1">{rule.code}</div>
                    
                    <div className="flex gap-6 mt-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-emerald-500" />
                        <span className="text-gray-600 dark:text-gray-400">Response:</span>
                        <span className="font-bold text-foreground">{rule.response_target_minutes}m</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Play className="w-4 h-4 text-amber-500" />
                        <span className="text-gray-600 dark:text-gray-400">Resolution:</span>
                        <span className="font-bold text-foreground">{rule.resolution_target_minutes}m</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <AppButton size="sm" variant="outline" onClick={() => handleEdit(rule)}>Edit</AppButton>
                    <AppButton size="sm" variant="outline" className="text-red-500 hover:bg-red-50" onClick={() => handleDelete(rule.id)}>
                      <Trash2 className="w-4 h-4" />
                    </AppButton>
                  </div>
                </div>
              )}
            </AppCard>
          ))}

          {editingId === "new" && (
            <AppCard className="ring-2 ring-accent">
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center mb-4 border-b border-border pb-4">
                  <h3 className="font-bold text-lg text-accent">Create New SLA Policy</h3>
                  <div className="flex gap-2">
                    <AppButton size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</AppButton>
                    <AppButton size="sm" variant="primary" onClick={handleSave} disabled={saving} leftIcon={saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}>Save Policy</AppButton>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Policy Name</label>
                    <AppInput value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Critical Outage" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">System Code</label>
                    <AppInput value={form.code} onChange={e => setForm({...form, code: e.target.value.toUpperCase().replace(/\s+/g, '_')})} className="font-mono" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Response Target (Minutes)</label>
                    <AppInput type="number" value={form.response_target_minutes} onChange={e => setForm({...form, response_target_minutes: parseInt(e.target.value) || 0})} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Resolution Target (Minutes)</label>
                    <AppInput type="number" value={form.resolution_target_minutes} onChange={e => setForm({...form, resolution_target_minutes: parseInt(e.target.value) || 0})} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Working Hours Code</label>
                    <select className="w-full mt-1 p-2 bg-transparent border border-border rounded-md text-sm focus:ring-accent" value={form.working_hours_code} onChange={e => setForm({...form, working_hours_code: e.target.value})}>
                      <option value="24x7">24x7 Continuous</option>
                      <option value="9x5">9x5 Business Hours</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Escalation Level</label>
                    <select className="w-full mt-1 p-2 bg-transparent border border-border rounded-md text-sm focus:ring-accent" value={form.escalation_level} onChange={e => setForm({...form, escalation_level: e.target.value})}>
                      <option value="STANDARD">Standard</option>
                      <option value="PRIORITY">Priority Escalate</option>
                      <option value="URGENT">Urgent (C-Level)</option>
                    </select>
                  </div>
                </div>
              </div>
            </AppCard>
          )}
        </div>

        <div className="space-y-6">
          <AppCard>
            <div className="p-4 border-b border-border bg-gray-50 dark:bg-surface/[0.02]">
              <h3 className="font-bold text-sm">How SLA Governance Works</h3>
            </div>
            <div className="p-4 space-y-4 text-sm text-gray-600 dark:text-gray-400">
              <p>SLA Policies are automatically attached to Tickets and internal Tasks based on their severity and priority configurations.</p>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg border border-blue-100 dark:border-blue-900/50">
                <strong>Example Evaluation:</strong>
                <div className="mt-2 font-mono text-xs">
                  IF Ticket.Priority == "URGENT"<br/>
                  THEN Attach("CRITICAL_OUTAGE_SLA")
                </div>
              </div>
              <p>When an SLA breaches its Response or Resolution target window, it will emit a webhook payload to the Escalation Engine for automated Slack/Email paging.</p>
            </div>
          </AppCard>
        </div>
      </div>
    </PageContainer>
  );
}

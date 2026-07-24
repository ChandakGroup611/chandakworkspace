"use client";

import React, { useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppCard } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { AppBadge } from "@/components/ui/AppBadge";
import { Plus, Save, Trash2, ArrowRight, Zap, Play, Filter, GitMerge } from "lucide-react";
import { toast } from "react-toastify";

export default function TicketAutomationsBuilder() {
  const [rules, setRules] = useState<any[]>([
    {
      id: "rule_1",
      name: "Auto-assign High Priority to Network Team",
      isActive: true,
      conditions: [{ field: "Priority", operator: "equals", value: "High" }, { field: "Category", operator: "equals", value: "Network" }],
      actions: [{ type: "Assign to Group", value: "Network Operations" }, { type: "Set SLA", value: "Priority Escalate" }]
    }
  ]);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [form, setForm] = useState({
    id: "",
    name: "",
    isActive: true,
    conditions: [{ field: "Priority", operator: "equals", value: "High" }],
    actions: [{ type: "Assign to Group", value: "" }]
  });

  const handleEdit = (rule: any) => {
    setEditingId(rule.id);
    setForm(JSON.parse(JSON.stringify(rule)));
  };

  const handleCreateNew = () => {
    setEditingId("new");
    setForm({
      id: "rule_" + Date.now(),
      name: "New Automation Rule",
      isActive: true,
      conditions: [{ field: "Category", operator: "equals", value: "" }],
      actions: [{ type: "Assign to Group", value: "" }]
    });
  };

  const handleSave = () => {
    if (!form.name) {
      toast.error("Rule name is required");
      return;
    }
    
    if (editingId === "new") {
      setRules([...rules, form]);
    } else {
      setRules(rules.map(r => r.id === form.id ? form : r));
    }
    
    setEditingId(null);
    toast.success("Automation Rule saved!");
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this automation rule?")) {
      setRules(rules.filter(r => r.id !== id));
      if (editingId === id) setEditingId(null);
    }
  };

  const addCondition = () => {
    setForm({ ...form, conditions: [...form.conditions, { field: "Priority", operator: "equals", value: "" }] });
  };
  
  const removeCondition = (index: number) => {
    const c = [...form.conditions];
    c.splice(index, 1);
    setForm({ ...form, conditions: c });
  };

  const addAction = () => {
    setForm({ ...form, actions: [...form.actions, { type: "Add Tag", value: "" }] });
  };

  const removeAction = (index: number) => {
    const a = [...form.actions];
    a.splice(index, 1);
    setForm({ ...form, actions: a });
  };

  return (
    <PageContainer strict={true}>
      <PageHeader
        title="Ticket Automations (IFTTT)"
        description="Build triggers and actions to auto-route, assign, and manage tickets efficiently."
        badge={<AppBadge variant="warning">Workflow Engine</AppBadge>}
        actions={
          <AppButton variant="primary" onClick={handleCreateNew} leftIcon={<Plus className="w-4 h-4" />}>
            Create Rule
          </AppButton>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Rules List */}
        <div className="lg:col-span-1 space-y-4">
          {rules.map(rule => (
            <div 
              key={rule.id}
              onClick={() => handleEdit(rule)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                editingId === rule.id 
                  ? "border-accent bg-accent/5 shadow-md shadow-accent/10" 
                  : "border-border bg-surface dark:bg-[#121620] hover:border-gray-400"
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className={`font-bold ${editingId === rule.id ? "text-accent" : "text-foreground"}`}>
                  {rule.name || "Untitled Rule"}
                </h3>
                <div className={`w-2 h-2 rounded-full ${rule.isActive ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" : "bg-gray-400"}`} />
              </div>
              <div className="text-xs text-gray-500 flex flex-col gap-1">
                <span className="flex items-center gap-1"><Filter className="w-3 h-3" /> {rule.conditions.length} Conditions</span>
                <span className="flex items-center gap-1"><Play className="w-3 h-3 text-accent" /> {rule.actions.length} Actions</span>
              </div>
            </div>
          ))}
          {rules.length === 0 && (
            <div className="p-8 text-center text-gray-500 border-2 border-dashed border-border rounded-xl">
              No automation rules defined.
            </div>
          )}
        </div>

        {/* Rule Builder */}
        <div className="lg:col-span-2">
          {editingId ? (
            <div className="bg-surface dark:bg-[#121620] rounded-2xl border border-border shadow-xl overflow-hidden animate-in slide-in-from-right-8 duration-300">
              <div className="p-6 border-b border-border flex justify-between items-center bg-gray-50 dark:bg-surface/[0.02]">
                <div className="flex-1 mr-4">
                  <label className="text-xs font-bold text-gray-500 uppercase">Rule Name</label>
                  <AppInput 
                    value={form.name} 
                    onChange={e => setForm({...form, name: e.target.value})} 
                    className="text-lg font-bold py-2 mt-1 bg-transparent border-transparent focus:bg-surface dark:focus:bg-[#0A0D14]" 
                    placeholder="Enter Rule Name"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-sm font-bold text-gray-500">Active</span>
                    <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.isActive ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-700'}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-surface transition-transform ${form.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                    </div>
                    <input 
                      type="checkbox" 
                      className="hidden" 
                      checked={form.isActive} 
                      onChange={e => setForm({...form, isActive: e.target.checked})}
                    />
                  </label>
                  <AppButton variant="outline" className="text-red-500" onClick={() => handleDelete(form.id)}>
                    <Trash2 className="w-4 h-4" />
                  </AppButton>
                  <AppButton variant="primary" onClick={handleSave} leftIcon={<Save className="w-4 h-4" />}>
                    Save Rule
                  </AppButton>
                </div>
              </div>

              <div className="p-6 bg-gray-50/50 dark:bg-[#0B0F19]">
                {/* Trigger / Conditions */}
                <div className="mb-8 relative">
                  <div className="absolute left-6 top-8 bottom-[-40px] w-0.5 bg-gray-300 dark:bg-gray-700 z-0" />
                  
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-black tracking-wider text-xl mb-4 relative z-10 bg-gray-50/50 dark:bg-[#0B0F19] pr-4 w-max">
                    <GitMerge className="w-6 h-6" /> WHEN (Trigger Conditions)
                  </div>
                  
                  <div className="space-y-3 pl-12 relative z-10">
                    {form.conditions.map((cond, i) => (
                      <div key={i} className="flex items-center gap-3 bg-surface dark:bg-[#121620] p-3 rounded-lg border border-border shadow-sm group">
                        {i > 0 && <span className="font-bold text-gray-400 text-xs mr-2 w-8 text-center">AND</span>}
                        <select 
                          className="p-2 bg-gray-50 dark:bg-[#0A0D14] border border-border rounded-md text-sm min-w-[150px]"
                          value={cond.field}
                          onChange={e => {
                            const c = [...form.conditions];
                            c[i].field = e.target.value;
                            setForm({...form, conditions: c});
                          }}
                        >
                          <option>Priority</option>
                          <option>Category</option>
                          <option>Status</option>
                          <option>Department</option>
                          <option>Ticket Source</option>
                        </select>
                        
                        <select 
                          className="p-2 bg-gray-50 dark:bg-[#0A0D14] border border-border rounded-md text-sm font-mono text-blue-600 dark:text-blue-400"
                          value={cond.operator}
                          onChange={e => {
                            const c = [...form.conditions];
                            c[i].operator = e.target.value;
                            setForm({...form, conditions: c});
                          }}
                        >
                          <option value="equals">== Equals</option>
                          <option value="not_equals">!= Not Equals</option>
                          <option value="contains">~ Contains</option>
                        </select>
                        
                        <input 
                          type="text" 
                          className="flex-1 p-2 bg-transparent border-b border-dashed border-gray-300 dark:border-gray-600 focus:outline-none focus:border-accent text-sm"
                          placeholder="Value..."
                          value={cond.value}
                          onChange={e => {
                            const c = [...form.conditions];
                            c[i].value = e.target.value;
                            setForm({...form, conditions: c});
                          }}
                        />
                        
                        <AppButton variant="secondary" onClick={() => removeCondition(i)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 className="w-4 h-4" />
                        </AppButton>
                      </div>
                    ))}
                    <AppButton variant="outline" size="sm" onClick={addCondition} className="mt-2 text-xs border-dashed" leftIcon={<Plus className="w-3 h-3" />}>
                      Add Condition
                    </AppButton>
                  </div>
                </div>

                {/* Actions */}
                <div className="relative mt-12">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black tracking-wider text-xl mb-4 relative z-10 bg-gray-50/50 dark:bg-[#0B0F19] pr-4 w-max">
                    <Zap className="w-6 h-6" /> THEN (Execute Actions)
                  </div>
                  
                  <div className="space-y-3 pl-12 relative z-10">
                    {form.actions.map((act, i) => (
                      <div key={i} className="flex items-center gap-3 bg-surface dark:bg-[#121620] p-3 rounded-lg border border-border shadow-sm group border-l-4 border-l-emerald-500">
                        <select 
                          className="p-2 bg-gray-50 dark:bg-[#0A0D14] border border-border rounded-md text-sm min-w-[150px] font-bold"
                          value={act.type}
                          onChange={e => {
                            const a = [...form.actions];
                            a[i].type = e.target.value;
                            setForm({...form, actions: a});
                          }}
                        >
                          <option>Assign to Group</option>
                          <option>Assign to User</option>
                          <option>Set SLA</option>
                          <option>Change Status</option>
                          <option>Add Tag</option>
                          <option>Send Email Notification</option>
                          <option>Trigger Webhook</option>
                        </select>
                        
                        <ArrowRight className="w-4 h-4 text-gray-400 mx-2" />
                        
                        <input 
                          type="text" 
                          className="flex-1 p-2 bg-transparent border-b border-dashed border-gray-300 dark:border-gray-600 focus:outline-none focus:border-emerald-500 text-sm font-mono text-emerald-600 dark:text-emerald-400"
                          placeholder="Action parameter..."
                          value={act.value}
                          onChange={e => {
                            const a = [...form.actions];
                            a[i].value = e.target.value;
                            setForm({...form, actions: a});
                          }}
                        />
                        
                        <AppButton variant="secondary" onClick={() => removeAction(i)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 className="w-4 h-4" />
                        </AppButton>
                      </div>
                    ))}
                    <AppButton variant="outline" size="sm" onClick={addAction} className="mt-2 text-xs border-dashed text-emerald-600 dark:text-emerald-500 border-emerald-200 dark:border-emerald-900/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/10" leftIcon={<Plus className="w-3 h-3" />}>
                      Add Action
                    </AppButton>
                  </div>
                </div>

              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full bg-surface dark:bg-[#0B0F19] rounded-2xl border border-dashed border-border p-12 text-gray-500">
              <Zap className="w-16 h-16 text-gray-300 dark:text-gray-700 mb-4" />
              <h3 className="text-xl font-bold text-foreground">Automation Builder</h3>
              <p className="mt-2 max-w-md text-center">Select an existing rule to edit its workflow, or create a new automation to streamline your ticket processing.</p>
              <AppButton variant="primary" className="mt-6" onClick={handleCreateNew} leftIcon={<Plus className="w-4 h-4" />}>Create New Rule</AppButton>
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}

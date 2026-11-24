"use client";

import React, { useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { AppBadge } from "@/components/ui/AppBadge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
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
  const [ruleToDelete, setRuleToDelete] = useState<string | null>(null);
  
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
    toast.success("Automation rule saved.");
  };

  const confirmDelete = () => {
    if (!ruleToDelete) return;
    setRules(rules.filter(r => r.id !== ruleToDelete));
    if (editingId === ruleToDelete) setEditingId(null);
    setRuleToDelete(null);
    toast.success("Automation rule deleted.");
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
        title="Ticket automations (IFTTT)"
        badge={<AppBadge variant="warning">Workflow engine</AppBadge>}
        actions={
          <AppButton variant="primary" onClick={handleCreateNew} leftIcon={<Plus className="w-4 h-4" />}>
            Create rule
          </AppButton>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Rules List */}
        <div className="lg:col-span-1 space-y-4">
          {rules.map(rule => (
            <div 
              key={rule.id}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleEdit(rule);
                }
              }}
              onClick={() => handleEdit(rule)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                editingId === rule.id 
                  ? "border-primary bg-primary-soft shadow-xs" 
                  : "border-border bg-surface hover:border-border-active"
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className={`font-semibold ${editingId === rule.id ? "text-accent-soft-text" : "text-foreground"}`}>
                  {rule.name || "Untitled Rule"}
                </h3>
                <div className={`w-2 h-2 rounded-full ${rule.isActive ? "bg-success" : "bg-muted"}`} />
              </div>
              <div className="text-xs text-muted flex flex-col gap-1">
                <span className="flex items-center gap-1"><Filter className="w-3 h-3" /> {rule.conditions.length} Conditions</span>
                <span className="flex items-center gap-1"><Play className="w-3 h-3 text-accent-soft-text" /> {rule.actions.length} Actions</span>
              </div>
            </div>
          ))}
          {rules.length === 0 && (
            <div className="p-8 text-center text-muted border border-border rounded-xl bg-sunken/40">
              No automation rules defined.
            </div>
          )}
        </div>

        {/* Rule Builder */}
        <div className="lg:col-span-2">
          {editingId ? (
            <div className="bg-surface rounded-2xl border border-border shadow-xs overflow-hidden animate-in slide-in-from-right-8 duration-300">
              <div className="p-6 border-b border-border flex justify-between items-center bg-surface">
                <div className="flex-1 mr-4">
                  <label className="text-xs font-semibold text-muted">Rule name</label>
                  <AppInput 
                    value={form.name} 
                    onChange={e => setForm({...form, name: e.target.value})} 
                    className="text-lg font-bold py-2 mt-1 bg-transparent border-transparent focus:bg-surface" 
                    placeholder="Enter rule name"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-sm font-semibold text-muted">Active</span>
                    <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.isActive ? 'bg-success' : 'bg-elevated'}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-surface transition-transform ${form.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                    </div>
                    <input 
                      type="checkbox" 
                      className="hidden" 
                      checked={form.isActive} 
                      onChange={e => setForm({...form, isActive: e.target.checked})}
                    />
                  </label>
                  <AppButton aria-label="Delete" variant="outline" className="text-danger border-danger-border hover:bg-danger-soft" onClick={() => setRuleToDelete(form.id)}>
                    <Trash2 className="w-4 h-4" />
                  </AppButton>
                  <AppButton variant="primary" onClick={handleSave} leftIcon={<Save className="w-4 h-4" />}>
                    Save rule
                  </AppButton>
                </div>
              </div>

              <div className="p-6 bg-sunken/30">
                {/* Trigger / Conditions */}
                <div className="mb-8 relative">
                  <div className="absolute left-6 top-8 bottom-[-40px] w-0.5 bg-border z-0" />
                  
                  <div className="flex items-center gap-2 text-foreground font-semibold tracking-wide text-lg mb-4 relative z-10 bg-surface px-3 py-1 rounded-md border border-border w-max">
                    <GitMerge className="w-5 h-5 text-accent-soft-text" /> When (Trigger Conditions)
                  </div>
                  
                  <div className="space-y-3 pl-12 relative z-10">
                    {form.conditions.map((cond, i) => (
                      <div key={i} className="flex items-center gap-3 bg-surface p-3 rounded-lg border border-border shadow-xs group">
                        {i > 0 && <span className="font-semibold text-muted text-xs mr-2 w-8 text-center">AND</span>}
                        <select 
                          className="p-2 bg-surface border border-border rounded-md text-sm min-w-[150px] text-foreground"
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
                          <option>Ticket source</option>
                        </select>
                        
                        <select 
                          className="p-2 bg-surface border border-border rounded-md text-sm font-mono text-accent-soft-text"
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
                          className="flex-1 p-2 bg-transparent border-b border-border focus:outline-none focus:border-primary text-sm text-foreground"
                          placeholder="Value…"
                          value={cond.value}
                          onChange={e => {
                            const c = [...form.conditions];
                            c[i].value = e.target.value;
                            setForm({...form, conditions: c});
                          }}
                        />
                        
                        <AppButton aria-label="Delete" variant="ghost" size="sm" onClick={() => removeCondition(i)} className="text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 className="w-4 h-4" />
                        </AppButton>
                      </div>
                    ))}
                    <AppButton variant="outline" size="sm" onClick={addCondition} className="mt-2 text-xs" leftIcon={<Plus className="w-3 h-3" />}>
                      Add condition
                    </AppButton>
                  </div>
                </div>

                {/* Actions */}
                <div className="relative mt-12">
                  <div className="flex items-center gap-2 text-foreground font-semibold tracking-wide text-lg mb-4 relative z-10 bg-surface px-3 py-1 rounded-md border border-border w-max">
                    <Zap className="w-5 h-5 text-success" /> Then (Execute Actions)
                  </div>
                  
                  <div className="space-y-3 pl-12 relative z-10">
                    {form.actions.map((act, i) => (
                      <div key={i} className="flex items-center gap-3 bg-surface p-3 rounded-lg border border-border shadow-xs group border-l-4 border-l-success">
                        <select 
                          className="p-2 bg-surface border border-border rounded-md text-sm min-w-[150px] font-semibold text-foreground"
                          value={act.type}
                          onChange={e => {
                            const a = [...form.actions];
                            a[i].type = e.target.value;
                            setForm({...form, actions: a});
                          }}
                        >
                          <option>Assign to group</option>
                          <option>Assign to user</option>
                          <option>Set SLA</option>
                          <option>Change status</option>
                          <option>Add tag</option>
                          <option>Send email notification</option>
                          <option>Trigger webhook</option>
                        </select>
                        
                        <ArrowRight className="w-4 h-4 text-muted mx-2" />
                        
                        <input 
                          type="text" 
                          className="flex-1 p-2 bg-transparent border-b border-border focus:outline-none focus:border-success text-sm font-mono text-success"
                          placeholder="Action parameter…"
                          value={act.value}
                          onChange={e => {
                            const a = [...form.actions];
                            a[i].value = e.target.value;
                            setForm({...form, actions: a});
                          }}
                        />
                        
                        <AppButton aria-label="Delete" variant="ghost" size="sm" onClick={() => removeAction(i)} className="text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 className="w-4 h-4" />
                        </AppButton>
                      </div>
                    ))}
                    <AppButton variant="outline" size="sm" onClick={addAction} className="mt-2 text-xs text-success border-success-border hover:bg-success-soft" leftIcon={<Plus className="w-3 h-3" />}>
                      Add action
                    </AppButton>
                  </div>
                </div>

              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full bg-surface rounded-2xl border border-border p-12 text-muted">
              <Zap className="w-16 h-16 text-muted mb-4" />
              <h3 className="text-xl font-bold text-foreground">Automation builder</h3>
              <p className="mt-2 max-w-md text-center">Select an existing rule to edit its workflow, or create a new automation to streamline your ticket processing.</p>
              <AppButton variant="primary" className="mt-6" onClick={handleCreateNew} leftIcon={<Plus className="w-4 h-4" />}>Create new rule</AppButton>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!ruleToDelete}
        onClose={() => setRuleToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete automation rule"
        description="Are you sure you want to delete this automation rule? This action cannot be undone."
        confirmLabel="Delete rule"
        tone="danger"
      />
    </PageContainer>
  );
}

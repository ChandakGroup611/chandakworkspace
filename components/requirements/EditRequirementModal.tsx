"use client";

import React, { useState, useEffect } from "react";
import { AppButton } from "@/components/ui/AppButton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { X, Save } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

interface EditRequirementModalProps {
  reqId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditRequirementModal({ reqId, onClose, onSuccess }: EditRequirementModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("general");
  
  const [formData, setFormData] = useState<any>({
    title: "",
    priority_id: "",
    department_id: "",
    software_system_id: "",
    target_release: "",
    story_points: 0,
    estimated_effort: "",
    estimated_cost: 0,
    budget_impact: "",
    start_date: "",
    expected_completion_date: "",
    acceptance_criteria: "",
    dependency_notes: "",
    requirement_reason: ""
  });

  const [masters, setMasters] = useState<any>({
    priorities: [],
    departments: [],
    systems: []
  });

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      try {
        const [reqRes, priRes, deptRes, sysRes] = await Promise.all([
          supabase.from("requirements").select("*").eq("id", reqId).single(),
          supabase.from("priority_master").select("id, priority_name"),
          supabase.from("departments").select("id, name"),
          supabase.from("software_systems").select("id, name")
        ]);

        if (reqRes.data) {
          setFormData({
            title: reqRes.data.title || "",
            priority_id: reqRes.data.priority_id || "",
            department_id: reqRes.data.department_id || "",
            software_system_id: reqRes.data.software_system_id || "",
            target_release: reqRes.data.target_release || "",
            story_points: reqRes.data.story_points || 0,
            estimated_effort: reqRes.data.estimated_effort || "",
            estimated_cost: reqRes.data.estimated_cost || 0,
            budget_impact: reqRes.data.budget_impact || "",
            start_date: reqRes.data.start_date ? new Date(reqRes.data.start_date).toISOString().split('T')[0] : "",
            expected_completion_date: reqRes.data.expected_completion_date ? new Date(reqRes.data.expected_completion_date).toISOString().split('T')[0] : "",
            acceptance_criteria: reqRes.data.acceptance_criteria || "",
            dependency_notes: reqRes.data.dependency_notes || "",
            requirement_reason: reqRes.data.requirement_reason || ""
          });
        }

        setMasters({
          priorities: priRes.data || [],
          departments: deptRes.data || [],
          systems: sysRes.data || []
        });
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [reqId]);

  const handleSubmit = async () => {
    if (!formData.title) {
      setError("Title is required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { updateRequirementIntake } = await import("@/lib/actions/requirements");
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      await updateRequirementIntake(reqId, formData, user!.id);
      onSuccess();
    } catch (e: any) {
      setError(e.message || "Failed to update requirement");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-border dark:border-white/10 bg-surface/50 dark:theme-card-structural /[0.02]">
          <DialogTitle>Update Requirement</DialogTitle>
        </DialogHeader>

        <div className="flex border-b border-border dark:border-white/10 overflow-x-auto bg-surface/30 px-6 pt-2">
          {['general', 'planning', 'details'].map(tab => {
            // eslint-disable-next-line no-restricted-syntax
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === tab 
                    ? 'border-theme-btn-primary text-theme-icon' 
                    : 'border-transparent text-muted hover:text-foreground hover:border-border'
                }`}
              >
                {tab === 'general' ? 'General' : tab === 'planning' ? 'Planning & Cost' : 'Advanced Details'}
              </button>
            );
          })}
        </div>

        <div className="p-6 space-y-4 flex-1 overflow-y-auto max-h-[60vh]">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 text-rose-600 text-sm border border-rose-100 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-400">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-8 flex justify-center"><div className="animate-spin h-6 w-6 border-2 border-theme-btn-primary border-t-transparent rounded-full" /></div>
          ) : (
            <>
              {activeTab === 'general' && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-subtle ">Title <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3 py-2 theme-card-structural dark:bg-[#151822] border-border dark:border-white/10 rounded-lg focus:ring-2 focus:ring-theme-btn-primary focus:border-theme-btn-primary text-sm"
                      placeholder="Requirement Title"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-subtle ">System</label>
                      <select
                        value={formData.software_system_id}
                        onChange={(e) => setFormData({ ...formData, software_system_id: e.target.value })}
                        className="w-full px-3 py-2 theme-card-structural dark:bg-[#151822] border-border dark:border-white/10 rounded-lg focus:ring-2 focus:ring-theme-btn-primary focus:border-theme-btn-primary text-sm"
                      >
                        <option value="">Select System</option>
                        {masters.systems.map((s: any) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-subtle ">Priority</label>
                      <select
                        value={formData.priority_id}
                        onChange={(e) => setFormData({ ...formData, priority_id: e.target.value })}
                        className="w-full px-3 py-2 theme-card-structural dark:bg-[#151822] border-border dark:border-white/10 rounded-lg focus:ring-2 focus:ring-theme-btn-primary focus:border-theme-btn-primary text-sm"
                      >
                        <option value="">Select Priority</option>
                        {masters.priorities.map((p: any) => (
                          <option key={p.id} value={p.id}>{p.priority_name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-subtle ">Department</label>
                      <select
                        value={formData.department_id}
                        onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                        className="w-full px-3 py-2 theme-card-structural dark:bg-[#151822] border-border dark:border-white/10 rounded-lg focus:ring-2 focus:ring-theme-btn-primary focus:border-theme-btn-primary text-sm"
                      >
                        <option value="">Select Department</option>
                        {masters.departments.map((d: any) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-subtle ">Target Release</label>
                      <input
                        type="text"
                        value={formData.target_release}
                        onChange={(e) => setFormData({ ...formData, target_release: e.target.value })}
                        className="w-full px-3 py-2 theme-card-structural dark:bg-[#151822] border-border dark:border-white/10 rounded-lg focus:ring-2 focus:ring-theme-btn-primary focus:border-theme-btn-primary text-sm"
                        placeholder="e.g. v2.4.0, Q3 Release"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'planning' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-subtle ">Story Points</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.story_points}
                        onChange={(e) => setFormData({ ...formData, story_points: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 theme-card-structural dark:bg-[#151822] border-border dark:border-white/10 rounded-lg focus:ring-2 focus:ring-theme-btn-primary focus:border-theme-btn-primary text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-subtle ">Estimated Effort</label>
                      <input
                        type="text"
                        value={formData.estimated_effort}
                        onChange={(e) => setFormData({ ...formData, estimated_effort: e.target.value })}
                        className="w-full px-3 py-2 theme-card-structural dark:bg-[#151822] border-border dark:border-white/10 rounded-lg focus:ring-2 focus:ring-theme-btn-primary focus:border-theme-btn-primary text-sm"
                        placeholder="e.g. 5 days, 2 sprints"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-subtle ">Estimated Cost ($)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.estimated_cost}
                        onChange={(e) => setFormData({ ...formData, estimated_cost: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 theme-card-structural dark:bg-[#151822] border-border dark:border-white/10 rounded-lg focus:ring-2 focus:ring-theme-btn-primary focus:border-theme-btn-primary text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-subtle ">Budget Impact</label>
                      <input
                        type="text"
                        value={formData.budget_impact}
                        onChange={(e) => setFormData({ ...formData, budget_impact: e.target.value })}
                        className="w-full px-3 py-2 theme-card-structural dark:bg-[#151822] border-border dark:border-white/10 rounded-lg focus:ring-2 focus:ring-theme-btn-primary focus:border-theme-btn-primary text-sm"
                        placeholder="High, Low, OPEX..."
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-subtle ">Start Date</label>
                      <input
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                        className="w-full px-3 py-2 theme-card-structural dark:bg-[#151822] border-border dark:border-white/10 rounded-lg focus:ring-2 focus:ring-theme-btn-primary focus:border-theme-btn-primary text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-subtle ">Target Completion</label>
                      <input
                        type="date"
                        value={formData.expected_completion_date}
                        onChange={(e) => setFormData({ ...formData, expected_completion_date: e.target.value })}
                        className="w-full px-3 py-2 theme-card-structural dark:bg-[#151822] border-border dark:border-white/10 rounded-lg focus:ring-2 focus:ring-theme-btn-primary focus:border-theme-btn-primary text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'details' && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-subtle ">Acceptance Criteria</label>
                    <textarea
                      rows={3}
                      value={formData.acceptance_criteria}
                      onChange={(e) => setFormData({ ...formData, acceptance_criteria: e.target.value })}
                      className="w-full px-3 py-2 theme-card-structural dark:bg-[#151822] border-border dark:border-white/10 rounded-lg focus:ring-2 focus:ring-theme-btn-primary focus:border-theme-btn-primary text-sm resize-none"
                      placeholder="What defines this as done?"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-subtle ">Dependency Notes</label>
                    <textarea
                      rows={2}
                      value={formData.dependency_notes}
                      onChange={(e) => setFormData({ ...formData, dependency_notes: e.target.value })}
                      className="w-full px-3 py-2 theme-card-structural dark:bg-[#151822] border-border dark:border-white/10 rounded-lg focus:ring-2 focus:ring-theme-btn-primary focus:border-theme-btn-primary text-sm resize-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-subtle ">Requirement Reason</label>
                    <textarea
                      rows={2}
                      value={formData.requirement_reason}
                      onChange={(e) => setFormData({ ...formData, requirement_reason: e.target.value })}
                      className="w-full px-3 py-2 theme-card-structural dark:bg-[#151822] border-border dark:border-white/10 rounded-lg focus:ring-2 focus:ring-theme-btn-primary focus:border-theme-btn-primary text-sm resize-none"
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="p-4 border-t border-border dark:border-white/10 bg-surface/50 dark:theme-card-structural /[0.02] flex justify-end gap-3">
          <AppButton variant="outline" onClick={onClose} disabled={saving}>Cancel</AppButton>
          <AppButton variant="primary" onClick={handleSubmit} disabled={saving || loading}>
            {saving ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Update Requirement
          </AppButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

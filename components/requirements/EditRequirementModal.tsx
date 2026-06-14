"use client";

import React, { useState, useEffect } from "react";
import { AppButton } from "@/components/ui/AppButton";
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
  
  const [formData, setFormData] = useState({
    title: "",
    priority_id: "",
    department_id: "",
    software_system_id: ""
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
            software_system_id: reqRes.data.software_system_id || ""
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#0f111a] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02]">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Update Requirement</h3>
          <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 flex-1 overflow-y-auto">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 text-rose-600 text-sm border border-rose-100 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-400">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-8 flex justify-center"><div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" /></div>
          ) : (
            <>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Title <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-[#151822] border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm"
                  placeholder="Requirement Title"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">System</label>
                <select
                  value={formData.software_system_id}
                  onChange={(e) => setFormData({ ...formData, software_system_id: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-[#151822] border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm"
                >
                  <option value="">Select System</option>
                  {masters.systems.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Priority</label>
                <select
                  value={formData.priority_id}
                  onChange={(e) => setFormData({ ...formData, priority_id: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-[#151822] border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm"
                >
                  <option value="">Select Priority</option>
                  {masters.priorities.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.priority_name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Department</label>
                <select
                  value={formData.department_id}
                  onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-[#151822] border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm"
                >
                  <option value="">Select Department</option>
                  {masters.departments.map((d: any) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02] flex justify-end gap-3">
          <AppButton variant="outline" onClick={onClose} disabled={saving}>Cancel</AppButton>
          <AppButton variant="primary" onClick={handleSubmit} disabled={saving || loading}>
            {saving ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Update Requirement
          </AppButton>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { AppCard } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { AppBadge } from "@/components/ui/AppBadge";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar, Plus, Save, Trash2, MapPin, Clock, Edit2, Shield, Pencil } from "lucide-react";
import { useFlashHighlight } from "@/components/ui/record";
import { toast } from "react-toastify";
import { usePermissions } from "@/hooks/usePermissions";
import ChandakLoader from "@/components/ui/ChandakLoader";
import { EmptyState } from "@/components/ui/feedback/States";
import { formatDate } from "@/components/ui/data";

// Mock data for UI demonstration since DB tables might not exist locally
const initialHolidays = [
  { id: "1", name: "New Year's Day", date: "2026-01-01", region: "Global" },
  { id: "2", name: "Christmas Day", date: "2026-12-25", region: "Global" },
  { id: "3", name: "Independence Day", date: "2026-07-04", region: "US Region" }
];

const initialWorkingHours = [
  { id: "24x7", name: "24×7 (always running)", timezone: "UTC", schedule: "Mon-Sun: 00:00 - 23:59" },
  { id: "9x5", name: "Standard business hours", timezone: "America/New_York", schedule: "Mon-Fri: 09:00 - 17:00" }
];

export default function HolidayCalendar() {
  const { hasPermission, roleCode, loading: permsLoading } = usePermissions();
  const isSuperAdmin = roleCode === "SUPER_ADMIN";
  const canView = isSuperAdmin || hasPermission("SLA_VIEW");
  const canCreate = isSuperAdmin || hasPermission("SLA_CREATE") || hasPermission("SLA_MANAGE");
  const canUpdate = isSuperAdmin || hasPermission("SLA_UPDATE") || hasPermission("SLA_MANAGE");
  const canDelete = isSuperAdmin || hasPermission("SLA_DELETE") || hasPermission("SLA_MANAGE");

  const [holidays, setHolidays] = useState<any[]>([]);
  const [workingHours, setWorkingHours] = useState(initialWorkingHours);
  const [activeTab, setActiveTab] = useState<"holidays" | "working_hours">("holidays");

  const supabase = createClient();

  useEffect(() => {
    async function loadHolidays() {
      const { data, error } = await supabase
        .from('sla_holidays')
        .select('*')
        .order('holiday_date', { ascending: true });
      if (!error && data) {
        setHolidays(data.map((h: any) => ({
          id: h.id,
          name: h.holiday_name,
          date: h.holiday_date,
          region: h.region || 'India'
        })));
      }
    }
    loadHolidays();
  }, []);

  const [newHoliday, setNewHoliday] = useState({ name: "", date: "", region: "India" });
  // Record standard: a holiday is edited in the same form it was added with.
  const [editingHolidayId, setEditingHolidayId] = useState<string | null>(null);
  const [highlightHolidayId, flashHoliday] = useFlashHighlight();

  const startEditHoliday = (h: any) => {
    setEditingHolidayId(h.id);
    setNewHoliday({ name: h.name || "", date: (h.date || "").slice(0, 10), region: h.region || "India" });
  };
  const cancelEditHoliday = () => {
    setEditingHolidayId(null);
    setNewHoliday({ name: "", date: "", region: "India" });
  };
  
  // Working Hours Modal State
  const [editingWorkingHours, setEditingWorkingHours] = useState<any | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({ name: "", timezone: "UTC", schedule: "" });

  const handleAddHoliday = async () => {
    if (editingHolidayId) {
      if (!canUpdate) {
        toast.error("You do not have permission to change holidays.");
        return;
      }
      if (!newHoliday.name || !newHoliday.date) {
        toast.warning("Please enter holiday name and date.");
        return;
      }
      const { data, error } = await supabase.from('sla_holidays').update({
        holiday_name: newHoliday.name.trim(),
        holiday_date: newHoliday.date,
        region: newHoliday.region || 'India'
      }).eq('id', editingHolidayId).select().single();
      if (error) {
        toast.error(error.message || "Failed to update holiday.");
        return;
      }
      setHolidays(holidays.map(h => h.id === editingHolidayId ? { id: data.id, name: data.holiday_name, date: data.holiday_date, region: data.region } : h));
      flashHoliday(editingHolidayId);
      cancelEditHoliday();
      toast.success("Holiday updated.");
      return;
    }
    if (!canCreate) {
      toast.error("You do not have permission to add holidays.");
      return;
    }
    if (!newHoliday.name || !newHoliday.date) {
      toast.warning("Please enter holiday name and date.");
      return;
    }
    const { data, error } = await supabase.from('sla_holidays').insert([{
      holiday_name: newHoliday.name.trim(),
      holiday_date: newHoliday.date,
      region: newHoliday.region || 'India'
    }]).select().single();

    if (error) {
      toast.error(error.message || "Failed to add holiday.");
      return;
    }

    setHolidays([...holidays, { id: data.id, name: data.holiday_name, date: data.holiday_date, region: data.region }]);
    setNewHoliday({ name: "", date: "", region: "India" });
    flashHoliday(data.id);
    toast.success("Holiday added to calendar.");
  };

  const handleDeleteHoliday = async (id: string) => {
    if (!canDelete) {
      toast.error("You do not have permission to delete holidays.");
      return;
    }
    const { error } = await supabase.from('sla_holidays').delete().eq('id', id);
    if (error) {
      toast.error(error.message || "Failed to remove holiday.");
      return;
    }
    setHolidays(holidays.filter(h => h.id !== id));
    toast.success("Holiday removed.");
  };

  const handleOpenEditSchedule = (wh: any) => {
    if (!canUpdate) {
      toast.error("You do not have permission to edit working hours schedule.");
      return;
    }
    setEditingWorkingHours(wh);
    setScheduleForm({ name: wh.name, timezone: wh.timezone, schedule: wh.schedule });
    setShowScheduleModal(true);
  };

  const handleOpenCreateSchedule = () => {
    if (!canCreate) {
      toast.error("You do not have permission to create working hours profile.");
      return;
    }
    setEditingWorkingHours(null);
    setScheduleForm({ name: "", timezone: "UTC", schedule: "Mon-Fri: 09:00 - 18:00" });
    setShowScheduleModal(true);
  };

  const handleSaveSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWorkingHours && !canCreate) {
      toast.error("You do not have permission to create working hours profile.");
      return;
    }
    if (editingWorkingHours && !canUpdate) {
      toast.error("You do not have permission to update working hours profile.");
      return;
    }
    if (!scheduleForm.name.trim() || !scheduleForm.schedule.trim()) {
      toast.warning("Please fill in the profile name and schedule.");
      return;
    }

    if (editingWorkingHours) {
      setWorkingHours(workingHours.map(wh => wh.id === editingWorkingHours.id ? { ...wh, ...scheduleForm } : wh));
      toast.success("Working hours profile updated.");
    } else {
      const newId = `wh-${Date.now()}`;
      setWorkingHours([...workingHours, { ...scheduleForm, id: newId }]);
      toast.success("Working hours profile created.");
    }
    setShowScheduleModal(false);
  };

  const handleDeleteWorkingHours = (id: string) => {
    if (!canDelete) {
      toast.error("You do not have permission to delete working hours profiles.");
      return;
    }
    setWorkingHours(workingHours.filter(wh => wh.id !== id));
    toast.success("Working hours profile deleted.");
  };

  const LABEL = "mb-1.5 block text-[13px] font-medium text-subtle";
  const SELECT = "h-9 w-full rounded-md border border-border bg-surface px-3 text-[13.5px] text-foreground focus:outline-none focus:ring-2 focus:ring-ring";
  const TAB = "rounded-none bg-transparent hover:bg-transparent -mb-px inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-[13px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  if (permsLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <ChandakLoader size="lg" title="Loading schedules…" />
      </div>
    );
  }

  if (!canView) {
    return (
      <PageContainer strict={true}>
        <EmptyState
          kind="error"
          title="You don't have access to SLA schedules"
          description="Ask an administrator for SLA view access."
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer strict={true}>
      <PageHeader
        title="Working hours and holidays"
        description="SLA timers pause outside working hours and on holidays."
        breadcrumbs={[{ label: "SLA tracking", href: "/sla" }, { label: "Working hours and holidays" }]}
      />

      <div role="tablist" aria-label="Schedules" className="flex gap-1 overflow-x-auto border-b border-border hide-scrollbar">
        <AppButton variant="ghost" type="button" role="tab" aria-selected={activeTab === 'holidays'} onClick={() => setActiveTab("holidays")} className={`${TAB} ${activeTab === 'holidays' ? 'border-primary text-foreground' : 'border-transparent text-muted hover:text-foreground'}`}>
          <Calendar className="w-4 h-4" aria-hidden /> Holidays
        </AppButton>
        <AppButton variant="ghost" type="button" role="tab" aria-selected={activeTab === 'working_hours'} onClick={() => setActiveTab("working_hours")} className={`${TAB} ${activeTab === 'working_hours' ? 'border-primary text-foreground' : 'border-transparent text-muted hover:text-foreground'}`}>
          <Clock className="w-4 h-4" aria-hidden /> Working hours
        </AppButton>
      </div>

      <div className="mt-5">
        {activeTab === "holidays" ? (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {(canCreate || editingHolidayId) && (
            <div className="space-y-4 lg:col-span-1">
                <AppCard className={`p-0 ${editingHolidayId ? "border-border-active" : ""}`}>
                  <div className="space-y-4 p-4">
                    <h2 className="text-[14px] font-semibold text-heading">{editingHolidayId ? "Edit holiday" : "Add a holiday"}</h2>
                      <div>
                        <label htmlFor="hol-name" className={LABEL}>Name</label>
                        <AppInput id="hol-name" value={newHoliday.name} onChange={e => setNewHoliday({...newHoliday, name: e.target.value})} placeholder="For example, Diwali" />
                      </div>
                      <div>
                        <label htmlFor="hol-date" className={LABEL}>Date</label>
                        <AppInput id="hol-date" type="date" value={newHoliday.date} onChange={e => setNewHoliday({...newHoliday, date: e.target.value})} />
                      </div>
                      <div>
                        <label htmlFor="hol-region" className={LABEL}>Region or office</label>
                        <select id="hol-region" className={SELECT} value={newHoliday.region} onChange={e => setNewHoliday({...newHoliday, region: e.target.value})}>
                          <option>Global</option>
                          <option>US region</option>
                          <option>EMEA region</option>
                          <option>APAC region</option>
                        </select>
                      </div>
                      <AppButton variant="primary" className="w-full" onClick={handleAddHoliday} leftIcon={editingHolidayId ? <Save className="w-4 h-4"/> : <Plus className="w-4 h-4"/>}>
                        {editingHolidayId ? "Save changes" : "Add holiday"}
                      </AppButton>
                      {editingHolidayId && (
                        <AppButton variant="ghost" className="w-full" onClick={cancelEditHoliday}>Cancel</AppButton>
                      )}
                  </div>
                </AppCard>
            </div>
            )}

            <div className={canCreate || editingHolidayId ? "lg:col-span-2" : "lg:col-span-3"}>
              <AppCard className="overflow-hidden p-0">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <h2 className="text-[14px] font-semibold text-heading">Holidays</h2>
                  <span className="text-[12.5px] text-muted">{holidays.length} {holidays.length === 1 ? "day" : "days"}</span>
                </div>
                <ul className="divide-y divide-border">
                  {holidays.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(holiday => (
                    <li
                      key={holiday.id}
                      data-record-id={holiday.id}
                      data-highlight={highlightHolidayId === holiday.id || editingHolidayId === holiday.id || undefined}
                      className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface-hover"
                    >
                      <div className="min-w-0">
                        <span className="block text-[13.5px] font-medium text-foreground">{holiday.name}</span>
                        <div className="mt-0.5 flex items-center gap-2 text-[12.5px] text-muted">
                          <span className="tabular-nums">{formatDate(holiday.date)}</span>
                          <span aria-hidden>·</span>
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" aria-hidden /> {holiday.region}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5">
                      {canUpdate && (
                        <AppButton aria-label={`Edit ${holiday.name}`} title="Edit" variant="ghost" size="icon-sm" className="text-muted hover:text-foreground" onClick={() => startEditHoliday(holiday)}>
                          <Pencil className="w-4 h-4" />
                        </AppButton>
                      )}
                      {canDelete && (
                        <AppButton aria-label={`Remove ${holiday.name}`} title="Remove" variant="ghost" size="icon-sm" className="text-muted hover:bg-danger-soft hover:text-danger-text" onClick={() => handleDeleteHoliday(holiday.id)}>
                          <Trash2 className="w-4 h-4" />
                        </AppButton>
                      )}
                      </div>
                    </li>
                  ))}
                </ul>
                {holidays.length === 0 && (
                  <EmptyState compact title="No holidays added" description="SLA timers will run every day." />
                )}
              </AppCard>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {workingHours.map(wh => (
              <AppCard key={wh.id} className="p-0">
                <div className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-[14.5px] font-semibold text-heading">{wh.name}</h2>
                    <AppBadge variant="neutral">{wh.timezone}</AppBadge>
                  </div>
                  <div className="flex items-center gap-2 rounded-md border border-border bg-sunken px-3 py-2 text-[13px]">
                    <Clock className="w-4 h-4 text-muted" aria-hidden />
                    <span className="text-muted">Schedule</span>
                    <span className="font-mono text-foreground">{wh.schedule}</span>
                  </div>
                  {(canUpdate || canDelete) && (
                    <div className="flex gap-2">
                      {canUpdate && (
                        <AppButton variant="secondary" size="sm" onClick={() => handleOpenEditSchedule(wh)} leftIcon={<Edit2 className="w-3.5 h-3.5" />}>
                          Edit
                        </AppButton>
                      )}
                      {canDelete && (
                        <AppButton variant="ghost" size="sm" className="text-danger-text hover:bg-danger-soft" onClick={() => handleDeleteWorkingHours(wh.id)}>
                          Delete
                        </AppButton>
                      )}
                    </div>
                  )}
                </div>
              </AppCard>
            ))}
            {canCreate && (
              <AppButton
                type="button"
                variant="outline"
                onClick={handleOpenCreateSchedule}
                className="flex min-h-[148px] h-auto flex-col items-center justify-center rounded-lg border border-border bg-sunken text-center transition-colors hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-ring p-4"
              >
                <span>
                  <Plus className="mx-auto mb-1.5 h-6 w-6 text-muted" aria-hidden />
                  <span className="text-[13.5px] font-medium text-subtle">New working hours profile</span>
                </span>
              </AppButton>
            )}
          </div>
        )}
      </div>

      {/* Schedule Edit / Create Dialog */}
      <Dialog open={showScheduleModal} onOpenChange={setShowScheduleModal}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          <DialogHeader className="px-5 py-4 border-b border-border">
            <DialogTitle>{editingWorkingHours ? "Edit working hours" : "New working hours profile"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveSchedule}>
            <div className="p-5 space-y-4">
              <div>
                <label htmlFor="wh-name" className={LABEL}>Name <span className="text-danger-text" aria-hidden>*</span></label>
                <AppInput 
                  id="wh-name"
                  value={scheduleForm.name} 
                  onChange={e => setScheduleForm({ ...scheduleForm, name: e.target.value })} 
                  placeholder="For example, Standard business hours"
                  required
                />
              </div>
              <div>
                <label htmlFor="wh-tz" className={LABEL}>Time zone</label>
                <select 
                  id="wh-tz"
                  className={SELECT}
                  value={scheduleForm.timezone} 
                  onChange={e => setScheduleForm({ ...scheduleForm, timezone: e.target.value })}
                >
                  <option value="UTC">UTC (Universal Time)</option>
                  <option value="America/New_York">America/New_York (EST/EDT)</option>
                  <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
                  <option value="Europe/London">Europe/London (GMT/BST)</option>
                  <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                  <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                </select>
              </div>
              <div>
                <label htmlFor="wh-sched" className={LABEL}>Schedule <span className="text-danger-text" aria-hidden>*</span></label>
                <AppInput 
                  id="wh-sched"
                  value={scheduleForm.schedule} 
                  onChange={e => setScheduleForm({ ...scheduleForm, schedule: e.target.value })} 
                  placeholder="For example, Mon-Fri: 09:00 - 18:00"
                  required
                />
              </div>
            </div>
            <DialogFooter className="px-5 py-3 bg-sunken border-t border-border">
              <AppButton variant="ghost" type="button" onClick={() => setShowScheduleModal(false)}>Cancel</AppButton>
              <AppButton variant="primary" type="submit" leftIcon={<Save className="w-4 h-4" />}>Save</AppButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

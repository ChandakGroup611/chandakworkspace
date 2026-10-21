"use client";

import React, { useState } from "react";
import { AppCard } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { AppBadge } from "@/components/ui/AppBadge";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar, Plus, Save, Trash2, MapPin, Clock, Edit2, Shield } from "lucide-react";
import { toast } from "react-toastify";
import { usePermissions } from "@/hooks/usePermissions";
import ChandakLoader from "@/components/ui/ChandakLoader";
import { EmptyState } from "@/components/ui/feedback/States";
import { formatDate } from "@/components/ui/data";
import { Info } from "lucide-react";

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

  const [holidays, setHolidays] = useState(initialHolidays);
  const [workingHours, setWorkingHours] = useState(initialWorkingHours);
  const [activeTab, setActiveTab] = useState<"holidays" | "working_hours">("holidays");

  const [newHoliday, setNewHoliday] = useState({ name: "", date: "", region: "Global" });
  
  // Working Hours Modal State
  const [editingWorkingHours, setEditingWorkingHours] = useState<any | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({ name: "", timezone: "UTC", schedule: "" });

  const handleAddHoliday = () => {
    if (!canCreate) {
      toast.error("You do not have permission to add holidays.");
      return;
    }
    if (!newHoliday.name || !newHoliday.date) {
      toast.warning("Please enter holiday name and date.");
      return;
    }
    setHolidays([...holidays, { ...newHoliday, id: Date.now().toString() }]);
    setNewHoliday({ name: "", date: "", region: "Global" });
    toast.success("Holiday added to calendar.");
  };

  const handleDeleteHoliday = (id: string) => {
    if (!canDelete) {
      toast.error("You do not have permission to delete holidays.");
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
  const TAB = "-mb-px inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-[13px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring";

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

      <div role="note" className="mb-4 flex items-start gap-2.5 rounded-md border border-info-border bg-info-soft p-3 text-[13px] text-info-text">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <p>This page shows sample data for now. Holidays and schedules you add here aren&apos;t saved yet and are cleared when you leave the page.</p>
      </div>

      <div role="tablist" aria-label="Schedules" className="flex gap-1 overflow-x-auto border-b border-border hide-scrollbar">
        <button type="button" role="tab" aria-selected={activeTab === 'holidays'} onClick={() => setActiveTab("holidays")} className={`${TAB} ${activeTab === 'holidays' ? 'border-primary text-foreground' : 'border-transparent text-muted hover:text-foreground'}`}>
          <Calendar className="w-4 h-4" aria-hidden /> Holidays
        </button>
        <button type="button" role="tab" aria-selected={activeTab === 'working_hours'} onClick={() => setActiveTab("working_hours")} className={`${TAB} ${activeTab === 'working_hours' ? 'border-primary text-foreground' : 'border-transparent text-muted hover:text-foreground'}`}>
          <Clock className="w-4 h-4" aria-hidden /> Working hours
        </button>
      </div>

      <div className="mt-5">
        {activeTab === "holidays" ? (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {canCreate && (
            <div className="space-y-4 lg:col-span-1">
                <AppCard className="p-0">
                  <div className="space-y-4 p-4">
                    <h2 className="text-[14px] font-semibold text-heading">Add a holiday</h2>
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
                      <AppButton variant="primary" className="w-full" onClick={handleAddHoliday} leftIcon={<Plus className="w-4 h-4"/>}>
                        Add holiday
                      </AppButton>
                  </div>
                </AppCard>
            </div>
            )}

            <div className={canCreate ? "lg:col-span-2" : "lg:col-span-3"}>
              <AppCard className="overflow-hidden p-0">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <h2 className="text-[14px] font-semibold text-heading">Holidays</h2>
                  <span className="text-[12.5px] text-muted">{holidays.length} {holidays.length === 1 ? "day" : "days"}</span>
                </div>
                <ul className="divide-y divide-border">
                  {holidays.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(holiday => (
                    <li key={holiday.id} className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface-hover">
                      <div className="min-w-0">
                        <span className="block text-[13.5px] font-medium text-foreground">{holiday.name}</span>
                        <div className="mt-0.5 flex items-center gap-2 text-[12.5px] text-muted">
                          <span className="tabular-nums">{formatDate(holiday.date)}</span>
                          <span aria-hidden>·</span>
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" aria-hidden /> {holiday.region}</span>
                        </div>
                      </div>
                      {canDelete && (
                        <AppButton aria-label={`Remove ${holiday.name}`} title="Remove" variant="ghost" size="icon-sm" className="text-muted hover:bg-danger-soft hover:text-danger-text" onClick={() => handleDeleteHoliday(holiday.id)}>
                          <Trash2 className="w-4 h-4" />
                        </AppButton>
                      )}
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
              <button
                type="button"
                onClick={handleOpenCreateSchedule}
                className="flex min-h-[148px] items-center justify-center rounded-lg border border-border bg-sunken text-center transition-colors hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span>
                  <Plus className="mx-auto mb-1.5 h-6 w-6 text-muted" aria-hidden />
                  <span className="text-[13.5px] font-medium text-subtle">New working hours profile</span>
                </span>
              </button>
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

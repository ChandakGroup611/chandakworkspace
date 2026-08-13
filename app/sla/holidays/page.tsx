"use client";

import React, { useState } from "react";
import { AppCard } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { AppBadge } from "@/components/ui/AppBadge";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Calendar, Plus, Save, Trash2, MapPin, Clock } from "lucide-react";

// Mock data for UI demonstration since DB tables might not exist locally
const initialHolidays = [
  { id: "1", name: "New Year's Day", date: "2026-01-01", region: "Global" },
  { id: "2", name: "Christmas Day", date: "2026-12-25", region: "Global" },
  { id: "3", name: "Independence Day", date: "2026-07-04", region: "US Region" }
];

const initialWorkingHours = [
  { id: "24x7", name: "24x7 Continuous", timezone: "UTC", schedule: "Mon-Sun: 00:00 - 23:59" },
  { id: "9x5", name: "Standard Business Hours", timezone: "America/New_York", schedule: "Mon-Fri: 09:00 - 17:00" }
];

export default function HolidayCalendar() {
  const [holidays, setHolidays] = useState(initialHolidays);
  const [workingHours, setWorkingHours] = useState(initialWorkingHours);
  const [activeTab, setActiveTab] = useState<"holidays" | "working_hours">("holidays");

  const [newHoliday, setNewHoliday] = useState({ name: "", date: "", region: "Global" });

  const handleAddHoliday = () => {
    if (!newHoliday.name || !newHoliday.date) return;
    setHolidays([...holidays, { ...newHoliday, id: Date.now().toString() }]);
    setNewHoliday({ name: "", date: "", region: "Global" });
  };

  const handleDeleteHoliday = (id: string) => {
    setHolidays(holidays.filter(h => h.id !== id));
  };

  return (
    <PageContainer strict={true}>
      <PageHeader
        title="Working Hours & Holidays"
        description="Configure schedules to accurately calculate SLA breaches across different regions."
        badge={<AppBadge variant="info">Governance Engine</AppBadge>}
      />

      <div className="p-4 border-b shrink-0 bg-surface/50 dark:bg-surface/50 border-border mt-6">
        <div className="flex gap-1.5 overflow-x-auto p-1.5 bg-surface/50 dark:bg-surface/30 border border-border/60 dark:border-white/5 rounded-xl w-max max-w-full shadow-sm">
          <AppButton 
            onClick={() => setActiveTab("holidays")}
            className={`px-5 py-2 text-[13px] font-bold rounded-lg transition-all whitespace-nowrap outline-none flex items-center justify-center min-w-[120px] ${
              activeTab === 'holidays' 
                ? 'bg-surface dark:bg-surface text-theme-icon dark:text-theme-icon shadow-sm border border-border/50 dark:border-white/10' 
                : 'text-muted hover:text-foreground dark:text-muted dark:hover:text-muted hover:bg-elevated/50 dark:hover:bg-surface/5 border border-transparent'
            }`}
          >
            <Calendar className="w-4 h-4 mr-2" /> Holiday Calendar
          </AppButton>
          <AppButton 
            onClick={() => setActiveTab("working_hours")}
            className={`px-5 py-2 text-[13px] font-bold rounded-lg transition-all whitespace-nowrap outline-none flex items-center justify-center min-w-[120px] ${
              activeTab === 'working_hours' 
                ? 'bg-surface dark:bg-surface text-theme-icon dark:text-theme-icon shadow-sm border border-border/50 dark:border-white/10' 
                : 'text-muted hover:text-foreground dark:text-muted dark:hover:text-muted hover:bg-elevated/50 dark:hover:bg-surface/5 border border-transparent'
            }`}
          >
            <Clock className="w-4 h-4 mr-2" /> Working Hours (Business Schedules)
          </AppButton>
        </div>
      </div>

      <div className="mt-6">
        {activeTab === "holidays" ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-4">
              <AppCard>
                <div className="p-6">
                  <h3 className="font-bold text-lg mb-4">Add Holiday</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-bold text-muted uppercase">Holiday Name</label>
                      <AppInput value={newHoliday.name} onChange={e => setNewHoliday({...newHoliday, name: e.target.value})} placeholder="e.g. Thanksgiving" />
                    </div>
                    <div>
                      <label className="text-sm font-bold text-muted uppercase">Date</label>
                      <AppInput type="date" value={newHoliday.date} onChange={e => setNewHoliday({...newHoliday, date: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-sm font-bold text-muted uppercase">Region / Office</label>
                      <select className="w-full mt-1 p-2 bg-transparent border border-border rounded-md text-sm focus:ring-theme-btn-primary" value={newHoliday.region} onChange={e => setNewHoliday({...newHoliday, region: e.target.value})}>
                        <option>Global</option>
                        <option>US Region</option>
                        <option>EMEA Region</option>
                        <option>APAC Region</option>
                      </select>
                    </div>
                    <AppButton variant="primary" className="w-full mt-2" onClick={handleAddHoliday} leftIcon={<Plus className="w-4 h-4"/>}>
                      Add to Calendar
                    </AppButton>
                  </div>
                </div>
              </AppCard>
              
              <AppCard className="bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-900/30">
                <div className="p-4 space-y-2">
                  <h4 className="font-bold text-amber-800 dark:text-amber-500 text-sm">SLA Impact</h4>
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    SLA timers are automatically paused on registered holidays based on the Ticket's or Task's assigned working hours code.
                  </p>
                </div>
              </AppCard>
            </div>
            
            <div className="lg:col-span-2">
              <AppCard>
                <div className="p-4 border-b border-border bg-surface dark:bg-surface/[0.02]">
                  <h3 className="font-bold text-sm">Upcoming Holidays (2026)</h3>
                </div>
                <div className="divide-y divide-border">
                  {holidays.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(holiday => (
                    <div key={holiday.id} className="p-4 flex items-center justify-between hover:bg-surface dark:hover:bg-surface/[0.02] transition-colors">
                      <div className="flex flex-col">
                        <span className="font-bold text-foreground">{holiday.name}</span>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted">
                          <span className="font-mono bg-surface dark:bg-surface/10 px-1.5 py-0.5 rounded">{holiday.date}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {holiday.region}</span>
                        </div>
                      </div>
                      <AppButton variant="outline" size="sm" className="text-red-500 hover:bg-red-50" onClick={() => handleDeleteHoliday(holiday.id)}>
                        <Trash2 className="w-4 h-4" />
                      </AppButton>
                    </div>
                  ))}
                  {holidays.length === 0 && (
                    <div className="p-8 text-center text-muted text-sm">
                      No holidays configured. SLA timers will run continuously.
                    </div>
                  )}
                </div>
              </AppCard>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {workingHours.map(wh => (
              <AppCard key={wh.id}>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-lg">{wh.name}</h3>
                      <AppBadge variant="warning" className="mt-1 font-mono">{wh.id}</AppBadge>
                    </div>
                    <AppBadge variant="info">{wh.timezone}</AppBadge>
                  </div>
                  <div className="p-4 bg-surface dark:bg-surface/5 rounded-xl border border-border">
                    <div className="text-sm font-semibold text-subtle dark:text-muted flex items-center gap-2">
                      <Clock className="w-4 h-4 text-theme-icon" /> Schedule
                    </div>
                    <div className="text-sm font-mono mt-2 text-foreground">
                      {wh.schedule}
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <AppButton variant="outline" size="sm">Edit Schedule</AppButton>
                    <AppButton variant="outline" size="sm" className="text-red-500 hover:bg-red-50">Delete</AppButton>
                  </div>
                </div>
              </AppCard>
            ))}
            <AppCard className="border-dashed border-2 flex items-center justify-center min-h-[200px] cursor-pointer hover:bg-surface dark:hover:bg-surface/[0.02] transition-colors">
              <div className="text-center">
                <Plus className="w-8 h-8 text-muted mx-auto mb-2" />
                <span className="font-bold text-muted">Create Working Hours Profile</span>
              </div>
            </AppCard>
          </div>
        )}
      </div>
    </PageContainer>
  );
}

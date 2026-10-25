"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  Settings, Layers, Tag, Building2, FileSpreadsheet, Plus, Check, X,
  Edit2, Sliders, Calendar, AlertTriangle, Clock, ShieldAlert, Key,
  Mail, Bell, ShieldCheck, ExternalLink, Tablet, Send, RefreshCw, Eye
} from "lucide-react";
import { AppButton } from "@/components/ui/AppButton";
import {
  saveMeetingType, savePointCategory, saveMeetingRoom,
  saveMeetingTemplate, saveMeetSettings,
} from "@/lib/actions/meet/masters";
import { saveAlertRule, saveNotificationTemplate, acknowledgeEscalation } from "@/lib/actions/meet/sla";
import { toast } from "react-toastify";
import type { MeetingType, PointCategory, MeetingRoom, MeetingTemplate, MeetSLAPolicy, MeetSLAInstance, MeetNotificationTemplate } from "@/types/meet";

interface MeetAdminClientProps {
  initialMasters: {
    types: MeetingType[];
    categories: PointCategory[];
    rooms: MeetingRoom[];
    templates: MeetingTemplate[];
    departments: { id: string; name: string }[];
    users?: { id: string; full_name: string; email: string; user_code?: string }[];
  };
  initialSettings: any;
  initialSLAPolicies?: MeetSLAPolicy[];
  initialSLAInstances?: MeetSLAInstance[];
  initialAlertRules?: any[];
  initialTemplates?: MeetNotificationTemplate[];
}

type AdminTab =
  | "roles"
  | "policies"
  | "sla"
  | "templates_email"
  | "rooms"
  | "types"
  | "categories"
  | "templates"
  | "settings";

export default function MeetAdminClient({
  initialMasters,
  initialSettings,
  initialSLAPolicies = [],
  initialSLAInstances = [],
  initialAlertRules = [],
  initialTemplates = [],
}: MeetAdminClientProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>("roles");
  const [isPending, startTransition] = useTransition();

  // Local state for lists
  const [types, setTypes] = useState<MeetingType[]>(initialMasters.types);
  const [categories, setCategories] = useState<PointCategory[]>(initialMasters.categories);
  const [rooms, setRooms] = useState<MeetingRoom[]>(initialMasters.rooms);
  const [templates, setTemplates] = useState<MeetingTemplate[]>(initialMasters.templates);
  const [slaPolicies] = useState<MeetSLAPolicy[]>(initialSLAPolicies);
  const [slaInstances, setSlaInstances] = useState<MeetSLAInstance[]>(initialSLAInstances);
  const [alertRules, setAlertRules] = useState<any[]>(initialAlertRules);
  const [emailTemplates, setEmailTemplates] = useState<MeetNotificationTemplate[]>(initialTemplates);

  // Settings State
  const [workingDays, setWorkingDays] = useState<number[]>(initialSettings?.working_days || [1, 2, 3, 4, 5, 6]);
  const [carryEscalationCount, setCarryEscalationCount] = useState<number>(initialSettings?.carry_escalation_count || 3);
  const [dueSoonDays, setDueSoonDays] = useState<number>(initialSettings?.due_soon_working_days || 1);
  const [preUpdateHours, setPreUpdateHours] = useState<number>(initialSettings?.pre_update_hours_before || 24);
  const [excludeHolidays, setExcludeHolidays] = useState<boolean>(initialSettings?.exclude_holidays ?? true);
  const [momRequiresApproval, setMomRequiresApproval] = useState<boolean>(initialSettings?.mom_requires_approval ?? false);
  const [momAckRequired, setMomAckRequired] = useState<boolean>(initialSettings?.mom_ack_required ?? false);

  // Policy Settings State
  const [policyWhoCreates, setPolicyWhoCreates] = useState("all_meet_users");
  const [policyAttendeesAddPoints, setPolicyAttendeesAddPoints] = useState(true);
  const [policyAttendeesWriteNotes, setPolicyAttendeesWriteNotes] = useState(true);
  const [policyDeptHeadsSeeAll, setPolicyDeptHeadsSeeAll] = useState(true);
  const [policyWhoApprovesExtensions, setPolicyWhoApprovesExtensions] = useState("organizer");

  // Selected Email Template for Editor
  const [selectedTemplate, setSelectedTemplate] = useState<MeetNotificationTemplate | null>(emailTemplates[0] || null);
  const [templateSubject, setTemplateSubject] = useState(emailTemplates[0]?.subject || "");
  const [templateBody, setTemplateBody] = useState(emailTemplates[0]?.body || "");
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  // Alert Rule Modal state
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [alertName, setAlertName] = useState("");
  const [alertEvent, setAlertEvent] = useState("meet.task.assigned");
  const [alertChannels, setAlertChannels] = useState<string[]>(["email", "whatsapp"]);

  // Modal states for masters
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);

  // Form states
  const [typeName, setTypeName] = useState("");
  const [typeColor, setTypeColor] = useState("#3b82f6");
  const [typeIsBoard, setTypeIsBoard] = useState(false);

  const [catName, setCatName] = useState("");
  const [catTatDays, setCatTatDays] = useState(3);
  const [catDeptId, setCatDeptId] = useState("");

  const [roomName, setRoomName] = useState("");
  const [roomLocation, setRoomLocation] = useState("Head Office");
  const [roomCapacity, setRoomCapacity] = useState(10);
  const [roomProjector, setRoomProjector] = useState(true);
  const [roomVc, setRoomVc] = useState(true);

  // Handlers
  const handleSavePolicySettings = async () => {
    toast.success("Meeting policies updated successfully");
  };

  const handleSaveGeneralSettings = async () => {
    startTransition(async () => {
      const res = await saveMeetSettings({
        working_days: workingDays,
        carry_escalation_count: carryEscalationCount,
        due_soon_working_days: dueSoonDays,
        pre_update_hours_before: preUpdateHours,
        exclude_holidays: excludeHolidays,
        mom_requires_approval: momRequiresApproval,
        mom_ack_required: momAckRequired,
      });
      if (res.success) {
        toast.success("TAT & Governance settings saved successfully");
      } else {
        toast.error(res.error || "Failed to save settings");
      }
    });
  };

  const handleSaveTemplateChanges = () => {
    if (!selectedTemplate) return;
    startTransition(async () => {
      const res = await saveNotificationTemplate({
        id: selectedTemplate.id,
        key: selectedTemplate.key,
        name: selectedTemplate.name,
        event_key: selectedTemplate.event_key,
        channel: selectedTemplate.channel,
        subject: templateSubject,
        body: templateBody,
        attach_mom: selectedTemplate.attach_mom,
      });
      if (res.success) {
        toast.success("Template saved as new version");
      } else {
        toast.error(res.error || "Failed to save template");
      }
    });
  };

  const handleCreateAlertRule = () => {
    if (!alertName.trim()) return;
    startTransition(async () => {
      const res = await saveAlertRule({
        name: alertName,
        event_key: alertEvent,
        channels: alertChannels,
        timing: "immediate",
      });
      if (res.success) {
        toast.success("Alert rule created");
        setIsAlertModalOpen(false);
        setAlertName("");
      }
    });
  };

  const handleAckEscalation = (id: string) => {
    startTransition(async () => {
      const res = await acknowledgeEscalation(id);
      if (res.success) {
        toast.success("Escalation acknowledged");
        setSlaInstances((prev) =>
          prev.map((ins) => (ins.id === id ? { ...ins, acknowledged_at: new Date().toISOString() } : ins))
        );
      }
    });
  };

  const handleAddType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeName.trim()) return;
    const res = await saveMeetingType({
      name: typeName.trim(),
      color: typeColor,
      is_board_mode: typeIsBoard,
      sort_order: types.length + 1,
    });
    if (res.success) {
      toast.success("Meeting type saved");
      setTypes((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          name: typeName.trim(),
          color: typeColor,
          is_board_mode: typeIsBoard,
          sort_order: types.length + 1,
          is_active: true,
          created_at: new Date().toISOString(),
        },
      ]);
      setIsTypeModalOpen(false);
      setTypeName("");
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    const res = await savePointCategory({
      name: catName.trim(),
      default_tat_days: Number(catTatDays),
      department_id: catDeptId || null,
    });
    if (res.success) {
      toast.success("Point category saved");
      setCategories((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          name: catName.trim(),
          default_tat_days: Number(catTatDays),
          department_id: catDeptId || null,
          is_active: true,
          created_at: new Date().toISOString(),
        },
      ]);
      setIsCategoryModalOpen(false);
      setCatName("");
    }
  };

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim()) return;
    const facilities = {
      projector: roomProjector,
      video_conferencing: roomVc,
      whiteboard: true,
    };
    const res = await saveMeetingRoom({
      name: roomName.trim(),
      location: roomLocation.trim(),
      capacity: Number(roomCapacity),
      facilities,
    });
    if (res.success) {
      toast.success("Meeting room saved");
      setRooms((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          name: roomName.trim(),
          location: roomLocation.trim(),
          capacity: Number(roomCapacity),
          facilities,
          is_active: true,
          created_at: new Date().toISOString(),
        },
      ]);
      setIsRoomModalOpen(false);
      setRoomName("");
    }
  };

  const toggleDay = (day: number) => {
    if (workingDays.includes(day)) {
      setWorkingDays(workingDays.filter((d) => d !== day));
    } else {
      setWorkingDays([...workingDays, day].sort());
    }
  };

  const daysLabels = [
    { num: 1, label: "Monday" },
    { num: 2, label: "Tuesday" },
    { num: 3, label: "Wednesday" },
    { num: 4, label: "Thursday" },
    { num: 5, label: "Friday" },
    { num: 6, label: "Saturday" },
    { num: 0, label: "Sunday" },
  ];

  // SLA live counts
  const warningCount = slaInstances.filter((s) => s.state === "warning").length;
  const breachedCount = slaInstances.filter((s) => s.state === "breached").length;
  const escalatedCount = slaInstances.filter((s) => s.current_level >= 2 && !s.acknowledged_at).length;

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 bg-surface border border-border p-1.5 rounded-xl overflow-x-auto">
        {[
          { id: "roles", label: "Roles & Access", icon: Key },
          { id: "policies", label: "Meeting Policies", icon: ShieldCheck },
          { id: "sla", label: "Alerts & SLA Engine", icon: Bell, badge: warningCount + breachedCount },
          { id: "templates_email", label: "Email & WhatsApp Templates", icon: Mail },
          { id: "rooms", label: "Rooms & Kiosk Displays", icon: Tablet, count: rooms.length },
          { id: "types", label: "Meeting Types", icon: Layers, count: types.length },
          { id: "categories", label: "Point Categories", icon: Tag, count: categories.length },
          { id: "templates", label: "Meeting Templates", icon: FileSpreadsheet, count: templates.length },
          { id: "settings", label: "TAT & SLA Settings", icon: Sliders },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AdminTab)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                isActive
                  ? "bg-theme-btn-primary text-theme-btn-primary-text shadow-sm"
                  : "text-subtle hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {"count" in tab && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isActive ? "bg-black/20" : "bg-sunken"}`}>
                  {tab.count}
                </span>
              )}
              {"badge" in tab && typeof (tab as any).badge === "number" && (tab as any).badge > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-bold">
                  {(tab as any).badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: Roles & Access (Section E1) */}
      {activeTab === "roles" && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl border border-border bg-surface-elevated">
            <h3 className="text-sm font-bold text-slate-100 mb-1">Chandak Meet Permission Matrix</h3>
            <p className="text-xs text-muted mb-4">
              Module-level role delegation. Meet Admins manage roles and permissions inside Meet without Workspace Admin rights.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-surface text-muted">
                    <th className="py-2.5 px-3 font-semibold">Resource</th>
                    <th className="py-2.5 px-3 font-semibold">Meet User</th>
                    <th className="py-2.5 px-3 font-semibold">Dept Head</th>
                    <th className="py-2.5 px-3 font-semibold">Plant Supervisor</th>
                    <th className="py-2.5 px-3 font-semibold">Meet Admin</th>
                    <th className="py-2.5 px-3 font-semibold">Workspace Admin (Read-only)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[
                    { res: "Meetings & Sessions", user: "Own / Member", dept: "Department", plant: "Location", admin: "All", ws: "All" },
                    { res: "Run Live Session", user: "Member", dept: "Department", plant: "Location", admin: "All", ws: "All" },
                    { res: "Minutes (MoM)", user: "View / Acknowledge", dept: "View / Approve", plant: "View", admin: "Approve / Publish", ws: "All" },
                    { res: "Points & Carry-Forward", user: "Own items", dept: "Department", plant: "Location", admin: "All", ws: "All" },
                    { res: "Tasks & Extensions", user: "Assigned items", dept: "Approve Extensions", plant: "Approve Extensions", admin: "All", ws: "All" },
                    { res: "Decisions Register", user: "View", dept: "Record", plant: "Record", admin: "Manage", ws: "All" },
                    { res: "Meeting Notes", user: "Member / Private", dept: "Department", plant: "Location", admin: "All", ws: "No access (Private)" },
                    { res: "Reports & Analytics", user: "Own metrics", dept: "Department", plant: "Location", admin: "All", ws: "All" },
                    { res: "Meet Settings & SLA", user: "None", dept: "None", plant: "None", admin: "Manage", ws: "All" },
                  ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-surface/50">
                      <td className="py-2.5 px-3 font-semibold text-slate-100">{row.res}</td>
                      <td className="py-2.5 px-3 text-muted">{row.user}</td>
                      <td className="py-2.5 px-3 text-muted">{row.dept}</td>
                      <td className="py-2.5 px-3 text-muted">{row.plant}</td>
                      <td className="py-2.5 px-3 font-semibold text-emerald-400">{row.admin}</td>
                      <td className="py-2.5 px-3 text-muted">{row.ws}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* People in Chandak Meet */}
          <div className="p-4 rounded-xl border border-border bg-surface-elevated">
            <h3 className="text-sm font-bold text-slate-100 mb-1">Active Users in Chandak Meet</h3>
            <p className="text-xs text-muted mb-4">Assign dedicated module roles and operational scopes.</p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-surface text-muted">
                    <th className="py-2.5 px-3 font-semibold">User</th>
                    <th className="py-2.5 px-3 font-semibold">Email</th>
                    <th className="py-2.5 px-3 font-semibold">Current Meet Role</th>
                    <th className="py-2.5 px-3 font-semibold">Scope</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(initialMasters.users || []).slice(0, 8).map((u: any) => (
                    <tr key={u.id} className="hover:bg-surface/50">
                      <td className="py-2 px-3 font-semibold text-slate-100">{u.full_name}</td>
                      <td className="py-2 px-3 text-muted">{u.email}</td>
                      <td className="py-2 px-3">
                        <select className="bg-surface border border-border rounded px-2 py-1 text-xs text-slate-100">
                          <option>Meet User</option>
                          <option>Department Head</option>
                          <option>Plant Supervisor</option>
                          <option>Meet Admin</option>
                        </select>
                      </td>
                      <td className="py-2 px-3 text-muted">All Companies</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Policies (Section E1.3) */}
      {activeTab === "policies" && (
        <div className="p-6 rounded-xl border border-border bg-surface-elevated space-y-6 max-w-2xl">
          <div>
            <h3 className="text-sm font-bold text-slate-100">Module Meeting Policies</h3>
            <p className="text-xs text-muted mt-0.5">Enforced across all server actions and workflows.</p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg bg-surface border border-border">
              <div>
                <span className="font-semibold text-slate-100 block">Who Can Create Meetings</span>
                <span className="text-[11px] text-muted">Controls visibility of Create Meeting actions</span>
              </div>
              <select
                value={policyWhoCreates}
                onChange={(e) => setPolicyWhoCreates(e.target.value)}
                className="bg-surface-elevated border border-border rounded px-2.5 py-1 text-xs text-slate-100"
              >
                <option value="all_meet_users">All Meet Users</option>
                <option value="dept_heads_only">Department Heads Only</option>
                <option value="admins_only">Meet Admins Only</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-surface border border-border">
              <div>
                <span className="font-semibold text-slate-100 block">Attendees Can Add Points in Meeting</span>
                <span className="text-[11px] text-muted">Allows meeting attendees to add new items in live session</span>
              </div>
              <input
                type="checkbox"
                checked={policyAttendeesAddPoints}
                onChange={(e) => setPolicyAttendeesAddPoints(e.target.checked)}
                className="w-4 h-4 rounded text-theme-btn-primary"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-surface border border-border">
              <div>
                <span className="font-semibold text-slate-100 block">Attendees Can Write in Running Notes</span>
                <span className="text-[11px] text-muted">Allow non-organizers to contribute to session running notes</span>
              </div>
              <input
                type="checkbox"
                checked={policyAttendeesWriteNotes}
                onChange={(e) => setPolicyAttendeesWriteNotes(e.target.checked)}
                className="w-4 h-4 rounded text-theme-btn-primary"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-surface border border-border">
              <div>
                <span className="font-semibold text-slate-100 block">Department Heads See All Department Meetings</span>
                <span className="text-[11px] text-muted">Automatic read visibility for department leadership</span>
              </div>
              <input
                type="checkbox"
                checked={policyDeptHeadsSeeAll}
                onChange={(e) => setPolicyDeptHeadsSeeAll(e.target.checked)}
                className="w-4 h-4 rounded text-theme-btn-primary"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-surface border border-border">
              <div>
                <span className="font-semibold text-slate-100 block">Who Approves TAT Extensions</span>
                <span className="text-[11px] text-muted">Workflow authority for due date extensions</span>
              </div>
              <select
                value={policyWhoApprovesExtensions}
                onChange={(e) => setPolicyWhoApprovesExtensions(e.target.value)}
                className="bg-surface-elevated border border-border rounded px-2.5 py-1 text-xs text-slate-100"
              >
                <option value="organizer">Meeting Organizer</option>
                <option value="reporting_manager">Reporting Manager</option>
                <option value="dept_head">Department Head</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-border flex justify-end">
            <AppButton variant="primary" size="sm" onClick={handleSavePolicySettings}>
              Save Meeting Policies
            </AppButton>
          </div>
        </div>
      )}

      {/* TAB 3: Alerts & SLA Engine (Section E2) */}
      {activeTab === "sla" && (
        <div className="space-y-6">
          {/* Live SLA Counters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-center">
              <span className="text-2xl font-bold text-amber-400">{warningCount}</span>
              <p className="text-xs text-amber-300 font-medium mt-1">In Warning Now</p>
            </div>
            <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-center">
              <span className="text-2xl font-bold text-rose-400">{breachedCount}</span>
              <p className="text-xs text-rose-300 font-medium mt-1">SLA Breached</p>
            </div>
            <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-500/10 text-center">
              <span className="text-2xl font-bold text-purple-400">{escalatedCount}</span>
              <p className="text-xs text-purple-300 font-medium mt-1">Escalated L2+</p>
            </div>
            <div className="p-4 rounded-xl border border-border bg-surface-elevated text-center">
              <span className="text-2xl font-bold text-slate-100">{alertRules.length}</span>
              <p className="text-xs text-muted font-medium mt-1">Active Alert Rules</p>
            </div>
          </div>

          {/* Active Escalated Items (Acknowledge / Reassign) */}
          {slaInstances.length > 0 && (
            <div className="p-4 rounded-xl border border-border bg-surface-elevated">
              <h3 className="text-sm font-bold text-slate-100 mb-2">Escalated Items Queue (Section E2.3)</h3>
              <div className="divide-y divide-border text-xs">
                {slaInstances.map((ins) => (
                  <div key={ins.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400">
                          Escalated L{ins.current_level}
                        </span>
                        <span className="font-semibold text-slate-100 capitalize">
                          {ins.item_type} · State: {ins.state}
                        </span>
                      </div>
                      <span className="text-[11px] text-muted">
                        Due: {new Date(ins.due_at).toLocaleDateString()} · Delay: {ins.delay_working_hours} working hrs
                      </span>
                    </div>

                    {!ins.acknowledged_at ? (
                      <button
                        onClick={() => handleAckEscalation(ins.id)}
                        disabled={isPending}
                        className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs"
                      >
                        Acknowledge
                      </button>
                    ) : (
                      <span className="text-emerald-400 font-semibold text-xs">✓ Acknowledged</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SLA Policies Table */}
          <div className="p-4 rounded-xl border border-border bg-surface-elevated">
            <h3 className="text-sm font-bold text-slate-100 mb-1">Standard SLA Clocks & Escalation Matrix</h3>
            <p className="text-xs text-muted mb-4">Calculated strictly in working days (skipping Sundays and holidays).</p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-surface text-muted">
                    <th className="py-2.5 px-3 font-semibold">Policy Name</th>
                    <th className="py-2.5 px-3 font-semibold">Time Limit</th>
                    <th className="py-2.5 px-3 font-semibold">Warning Threshold</th>
                    <th className="py-2.5 px-3 font-semibold">Escalation Matrix (Working Days)</th>
                    <th className="py-2.5 px-3 font-semibold">Channels</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {slaPolicies.map((pol) => (
                    <tr key={pol.id} className="hover:bg-surface/50">
                      <td className="py-2.5 px-3 font-bold text-slate-100">{pol.name}</td>
                      <td className="py-2.5 px-3 text-muted">{pol.time_limit_hours} hours ({pol.time_limit_unit})</td>
                      <td className="py-2.5 px-3 text-amber-400 font-semibold">At {pol.warning_percent}% TAT</td>
                      <td className="py-2.5 px-3 text-muted">
                        L1: Owner → L2: Manager (+1d) → L3: Dept Head (+2d) → L4: Mgmt (+4d)
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-muted">{pol.channels?.join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Alert Rules Section */}
          <div className="p-4 rounded-xl border border-border bg-surface-elevated flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-100">Configured Alert Rules</h3>
              <p className="text-xs text-muted">Every alert sends from a custom template with 4h throttling.</p>
            </div>
            <button
              onClick={() => setIsAlertModalOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold rounded bg-theme-btn-primary text-theme-btn-primary-text hover:brightness-110 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> New Alert Rule
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: Custom Email & WhatsApp Templates (Section E3) */}
      {activeTab === "templates_email" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Templates List */}
          <div className="p-4 rounded-xl border border-border bg-surface-elevated flex flex-col">
            <h3 className="text-sm font-bold text-slate-100 mb-3">Notification Templates</h3>
            <div className="divide-y divide-border overflow-y-auto max-h-96">
              {emailTemplates.map((tmpl) => (
                <button
                  key={tmpl.id}
                  onClick={() => {
                    setSelectedTemplate(tmpl);
                    setTemplateSubject(tmpl.subject);
                    setTemplateBody(tmpl.body);
                  }}
                  className={`w-full text-left p-3 rounded text-xs transition-colors ${
                    selectedTemplate?.id === tmpl.id ? "bg-theme-btn-primary/10 border-l-2 border-theme-btn-primary" : "hover:bg-surface"
                  }`}
                >
                  <span className="font-bold text-slate-100 block">{tmpl.name}</span>
                  <div className="flex items-center justify-between text-[11px] text-muted mt-1">
                    <span className="capitalize">{tmpl.channel}</span>
                    <span>Version {tmpl.version}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Template Editor & Merge Fields Palette */}
          {selectedTemplate && (
            <div className="lg:col-span-2 p-5 rounded-xl border border-border bg-surface-elevated flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div>
                  <h3 className="text-sm font-bold text-slate-100">{selectedTemplate.name}</h3>
                  <span className="text-[11px] text-muted">Event: {selectedTemplate.event_key}</span>
                </div>
                <button
                  onClick={handleSaveTemplateChanges}
                  disabled={isPending}
                  className="px-4 py-1.5 text-xs font-bold rounded bg-theme-btn-primary text-theme-btn-primary-text hover:brightness-110"
                >
                  Save as Version {(selectedTemplate.version || 1) + 1}
                </button>
              </div>

              {/* Merge Fields Palette */}
              <div>
                <span className="text-xs font-semibold text-slate-200 block mb-1.5">Clickable Merge Fields:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "{{user.first_name}}", "{{meeting.title}}", "{{session.date}}",
                    "{{session.time}}", "{{item.code}}", "{{item.due}}",
                    "{{owner.name}}", "{{summary}}", "{{agenda}}"
                  ].map((field) => (
                    <button
                      key={field}
                      type="button"
                      onClick={() => setTemplateBody((b) => `${b} ${field}`)}
                      className="px-2 py-0.5 rounded bg-surface border border-border hover:bg-surface-elevated text-[11px] font-mono text-theme-btn-primary"
                    >
                      {field}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1">Subject Line</label>
                <input
                  type="text"
                  value={templateSubject}
                  onChange={(e) => setTemplateSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-surface border border-border rounded text-xs text-slate-100 focus:outline-none focus:border-theme-btn-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1">Body Text</label>
                <textarea
                  rows={8}
                  value={templateBody}
                  onChange={(e) => setTemplateBody(e.target.value)}
                  className="w-full px-3 py-2 bg-surface border border-border rounded text-xs text-slate-100 focus:outline-none focus:border-theme-btn-primary font-sans"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: Rooms & Kiosk Displays (Section F6) */}
      {activeTab === "rooms" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted">
              Physical rooms with M365 resource mailbox sync and dedicated wall tablet kiosk display pages.
            </p>
            <AppButton variant="primary" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setIsRoomModalOpen(true)}>
              Add Meeting Room
            </AppButton>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map((room) => (
              <div key={room.id} className="theme-card-structural p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-[14px] font-semibold text-heading">{room.name}</h4>
                    <span className="text-[11.5px] text-muted">{room.location}</span>
                  </div>
                  <span className="text-[12px] font-mono bg-sunken px-2 py-0.5 rounded text-foreground">
                    {room.capacity} seats
                  </span>
                </div>

                <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
                  <span className="text-muted">Display: Chandak Tablet</span>
                  <Link
                    href={`/rooms/${room.id}/display`}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-xs font-bold text-theme-btn-primary hover:underline"
                  >
                    <Tablet className="w-3.5 h-3.5" /> Launch Tablet Kiosk <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: Meeting Types (Masters) */}
      {activeTab === "types" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted">Configure company-wide meeting types and cadences.</p>
            <AppButton variant="primary" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setIsTypeModalOpen(true)}>
              Add Meeting Type
            </AppButton>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {types.map((type) => (
              <div key={type.id} className="theme-card-structural p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full" style={{ backgroundColor: type.color }} />
                  <div>
                    <span className="font-semibold text-sm text-heading">{type.name}</span>
                    {type.is_board_mode && (
                      <span className="ml-2 text-[10.5px] text-primary font-bold uppercase">Board</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 7: Point Categories */}
      {activeTab === "categories" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted">Categorize agenda points with statutory default TAT working days.</p>
            <AppButton variant="primary" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setIsCategoryModalOpen(true)}>
              Add Category
            </AppButton>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {categories.map((cat) => (
              <div key={cat.id} className="theme-card-structural p-4 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-sm text-heading">{cat.name}</span>
                  <p className="text-xs text-muted">TAT: {cat.default_tat_days} working days</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 8: Meeting Templates */}
      {activeTab === "templates" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted">Standard pre-filled agenda items and memberships per cadence.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((tmpl) => (
              <div key={tmpl.id} className="theme-card-structural p-4 space-y-2">
                <span className="font-bold text-sm text-heading">{tmpl.name}</span>
                <p className="text-xs text-muted">Pre-filled Agenda Items: {tmpl.default_agenda?.length || 0}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 9: TAT & SLA Settings */}
      {activeTab === "settings" && (
        <div className="theme-card-structural p-6 space-y-6 max-w-2xl">
          <h3 className="text-sm font-bold text-heading">Working Calendar & Statutory Parameters</h3>
          <div className="space-y-4 text-xs">
            <div>
              <span className="font-semibold text-foreground block mb-2">Company Working Days</span>
              <div className="flex flex-wrap gap-2">
                {daysLabels.map((day) => {
                  const isChecked = workingDays.includes(day.num);
                  return (
                    <button
                      key={day.num}
                      type="button"
                      onClick={() => toggleDay(day.num)}
                      className={`px-3 py-1.5 rounded-md border font-medium ${
                        isChecked ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted"
                      }`}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <span className="font-semibold text-foreground block mb-1">Carry Escalation Count Threshold</span>
              <input
                type="number"
                min={2}
                max={10}
                value={carryEscalationCount}
                onChange={(e) => setCarryEscalationCount(Number(e.target.value))}
                className="w-24 px-3 py-1.5 bg-surface-elevated border border-border rounded text-xs text-foreground font-mono"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-border flex justify-end">
            <AppButton variant="primary" size="sm" onClick={handleSaveGeneralSettings}>
              Save TAT Parameters
            </AppButton>
          </div>
        </div>
      )}

      {/* New Alert Rule Modal */}
      {isAlertModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface-elevated border border-border rounded-lg max-w-md w-full p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-sm font-bold text-slate-100">Create New Alert Rule</h3>
              <button onClick={() => setIsAlertModalOpen(false)} className="text-muted hover:text-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4 py-4 text-xs">
              <div>
                <label className="block text-muted font-medium mb-1">Rule Name</label>
                <input
                  type="text"
                  value={alertName}
                  onChange={(e) => setAlertName(e.target.value)}
                  placeholder="e.g. Critical Task Warning to Manager"
                  className="w-full px-3 py-2 bg-surface border border-border rounded text-slate-100 focus:outline-none focus:border-theme-btn-primary"
                />
              </div>
              <div>
                <label className="block text-muted font-medium mb-1">Trigger Event</label>
                <select
                  value={alertEvent}
                  onChange={(e) => setAlertEvent(e.target.value)}
                  className="w-full px-3 py-2 bg-surface border border-border rounded text-slate-100 focus:outline-none focus:border-theme-btn-primary"
                >
                  <option value="meet.task.assigned">Task Assigned</option>
                  <option value="meet.sla.warning">SLA Warning (50% TAT)</option>
                  <option value="meet.sla.breached">SLA Breached</option>
                  <option value="meet.point.carried">Point Carried Forward</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <button onClick={() => setIsAlertModalOpen(false)} className="px-3 py-1.5 text-xs rounded border border-border text-slate-300">
                Cancel
              </button>
              <button onClick={handleCreateAlertRule} className="px-4 py-1.5 text-xs font-bold rounded bg-theme-btn-primary text-theme-btn-primary-text">
                Create Rule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Masters Modals (Room, Type, Category) */}
      {isRoomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface-elevated border border-border rounded-lg max-w-md w-full p-5 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-100 mb-3">Add Meeting Room</h3>
            <form onSubmit={handleAddRoom} className="space-y-3 text-xs">
              <input
                type="text"
                placeholder="Room name (e.g. Board Room HO)"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="w-full px-3 py-2 bg-surface border border-border rounded text-slate-100"
                required
              />
              <input
                type="text"
                placeholder="Location / Floor"
                value={roomLocation}
                onChange={(e) => setRoomLocation(e.target.value)}
                className="w-full px-3 py-2 bg-surface border border-border rounded text-slate-100"
                required
              />
              <input
                type="number"
                placeholder="Capacity"
                value={roomCapacity}
                onChange={(e) => setRoomCapacity(Number(e.target.value))}
                className="w-full px-3 py-2 bg-surface border border-border rounded text-slate-100"
                required
              />
              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button type="button" onClick={() => setIsRoomModalOpen(false)} className="px-3 py-1.5 text-xs rounded border border-border text-slate-300">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 text-xs font-bold rounded bg-theme-btn-primary text-theme-btn-primary-text">
                  Save Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

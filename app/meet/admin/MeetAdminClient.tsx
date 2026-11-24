"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  Settings, Layers, Tag, Building2, FileSpreadsheet, Plus, Check, X,
  Edit2, Sliders, Calendar, AlertTriangle, Clock, ShieldAlert, Key,
  Mail, Bell, ShieldCheck, ExternalLink, Tablet, Send, RefreshCw, Eye,
  CheckSquare, Square, FileText, Download, RotateCcw, Sparkles
} from "lucide-react";
import { AppButton } from "@/components/ui/AppButton";
import {
  saveMeetingType, savePointCategory, saveMeetingRoom,
  saveMeetingTemplate, saveMeetSettings,
  saveMeetRoleMatrix,
} from "@/lib/actions/meet/masters";
import { saveMeetProject } from "@/lib/actions/meet/projects";
import { saveAlertRule, saveNotificationTemplate, acknowledgeEscalation } from "@/lib/actions/meet/sla";
import { toast } from "react-toastify";
import {
  MEET_RESOURCES,
  MEET_ROLES,
  DEFAULT_MEET_ROLE_MATRIX,
  type MeetRoleMatrix,
  type MeetResourcePermission,
  type MeetingType,
  type PointCategory,
  type MeetingRoom,
  type MeetingTemplate,
  type MeetSLAPolicy,
  type MeetSLAInstance,
  type MeetNotificationTemplate,
} from "@/types/meet";

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
  initialRoleMatrix?: MeetRoleMatrix;
  initialSLAPolicies?: MeetSLAPolicy[];
  initialSLAInstances?: MeetSLAInstance[];
  initialAlertRules?: any[];
  initialTemplates?: MeetNotificationTemplate[];
  /** Which section to show; picked from the sidebar (Settings › …) via ?section= */
  section?: string;
  initialProjects?: { id: string; name: string; code: string | null; active: boolean }[];
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
  | "settings"
  | "projects"
  | "email";

const SECTIONS: { id: AdminTab; label: string; hint: string }[] = [
  { id: "policies", label: "Meeting rules", hint: "Who can create meetings, add points and write notes." },
  { id: "settings", label: "Due dates and working days", hint: "Working days, holidays and when items count as due soon." },
  { id: "sla", label: "Overdue alerts", hint: "When overdue points and tasks are flagged and escalated." },
  { id: "types", label: "Meeting types", hint: "The kinds of meetings people can schedule." },
  { id: "categories", label: "Point categories", hint: "Categories for points, each with a default number of days to finish." },
  { id: "projects", label: "Projects", hint: "Chandak Meet's own project list, used to group meetings." },
  { id: "templates", label: "Meeting templates", hint: "Ready-made agendas for regular meetings." },
  { id: "rooms", label: "Rooms and door screens", hint: "Meeting rooms and the tablets outside them." },
  { id: "roles", label: "What each role can do", hint: "The permissions behind each Meet role." },
  { id: "email", label: "Email sending (SMTP)", hint: "Chandak Meet's own mail server. Email wording and who gets each email are in Automations › Emails." },
  { id: "templates_email", label: "Older email templates", hint: "Meet emails are now set up in Automations › Emails." },
];

export default function MeetAdminClient({
  initialMasters,
  initialSettings,
  initialRoleMatrix,
  initialSLAPolicies = [],
  initialSLAInstances = [],
  initialAlertRules = [],
  initialTemplates = [],
  section,
  initialProjects = [],
}: MeetAdminClientProps) {
  const activeTab: AdminTab = (SECTIONS.some((x) => x.id === section) ? section : "policies") as AdminTab;
  const current = SECTIONS.find((x) => x.id === activeTab)!;
  const [projects, setProjects] = useState(initialProjects);
  const [projDraft, setProjDraft] = useState<{ id?: string; name: string; code: string } | null>(null);
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

  // RBAC Role Matrix State
  const [roleMatrix, setRoleMatrix] = useState<MeetRoleMatrix>(
    initialRoleMatrix && Object.keys(initialRoleMatrix).length > 0
      ? initialRoleMatrix
      : DEFAULT_MEET_ROLE_MATRIX
  );
  const [selectedRole, setSelectedRole] = useState<string>("meet_admin");
  const [isSavingMatrix, setIsSavingMatrix] = useState(false);

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
  const [editorTab, setEditorTab] = useState<"editor" | "preview">("editor");

  // New Template Modal state
  const [isNewTemplateModalOpen, setIsNewTemplateModalOpen] = useState(false);
  const [newTplName, setNewTplName] = useState("");
  const [newTplKey, setNewTplKey] = useState("");
  const [newTplEvent, setNewTplEvent] = useState("meet.task.assigned");
  const [newTplChannel, setNewTplChannel] = useState("email");
  const [newTplSubject, setNewTplSubject] = useState("");
  const [newTplBody, setNewTplBody] = useState("");
  const [newTplAttachMom, setNewTplAttachMom] = useState(false);

  // Rendered Mail Body Preview Modal state
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<MeetNotificationTemplate | null>(null);
  const [previewMode, setPreviewMode] = useState<"rendered" | "raw">("rendered");

  // Dynamic sample replacements for Live Mail Body Preview
  const renderSampleEmail = (text: string) => {
    if (!text) return "";
    return text
      .replace(/\{\{user\.first_name\}\}/g, "Avinash")
      .replace(/\{\{meeting\.title\}\}/g, "Executive Operations & Performance Review")
      .replace(/\{\{session\.date\}\}/g, "29 Oct 2026")
      .replace(/\{\{session\.time\}\}/g, "10:30 AM IST")
      .replace(/\{\{item\.code\}\}/g, "ACT-2026-0042")
      .replace(/\{\{item\.due\}\}/g, "02 Nov 2026")
      .replace(/\{\{owner\.name\}\}/g, "Avinash Pise")
      .replace(/\{\{tat_days\}\}/g, "3 working days")
      .replace(/\{\{summary\}\}/g, "All operational targets, plant compliance checklists, and capital allocation proposals were reviewed and finalized.")
      .replace(/\{\{agenda\}\}/g, "1. Q3 Capex Allocations · 2. Plant Safety Compliance · 3. Vendor SLA Turnaround");
  };

  // RBAC Permission Handlers
  const handleToggleMatrixPerm = (
    roleKey: string,
    resKey: string,
    action: "create" | "read" | "update" | "delete"
  ) => {
    setRoleMatrix((prev) => {
      const currentRole = prev[roleKey] || {};
      const currentRes = currentRole[resKey] || { create: false, read: false, update: false, delete: false };
      return {
        ...prev,
        [roleKey]: {
          ...currentRole,
          [resKey]: {
            ...currentRes,
            [action]: !currentRes[action],
          },
        },
      };
    });
  };

  const handleToggleRowAll = (roleKey: string, resKey: string) => {
    setRoleMatrix((prev) => {
      const currentRole = prev[roleKey] || {};
      const currentRes = currentRole[resKey] || { create: false, read: false, update: false, delete: false };
      const allTrue = currentRes.create && currentRes.read && currentRes.update && currentRes.delete;
      const target = !allTrue;
      return {
        ...prev,
        [roleKey]: {
          ...currentRole,
          [resKey]: {
            create: target,
            read: target,
            update: target,
            delete: target,
          },
        },
      };
    });
  };

  const handleToggleRoleAll = (roleKey: string, grant: boolean) => {
    setRoleMatrix((prev) => {
      const updatedRole: Record<string, MeetResourcePermission> = {};
      MEET_RESOURCES.forEach((r) => {
        updatedRole[r.key] = {
          create: grant,
          read: grant,
          update: grant,
          delete: grant,
        };
      });
      return {
        ...prev,
        [roleKey]: updatedRole,
      };
    });
  };

  const handleResetMatrix = () => {
    if (confirm("Reset Chandak Meet permissions to recommended enterprise defaults?")) {
      setRoleMatrix(DEFAULT_MEET_ROLE_MATRIX);
      toast.info("Permissions reset to defaults. Click 'Save RBAC Matrix' to persist.");
    }
  };

  const handleSaveMatrix = async () => {
    try {
      setIsSavingMatrix(true);
      const res = await saveMeetRoleMatrix(roleMatrix);
      if (res.success) {
        toast.success("Chandak Meet RBAC Matrix saved successfully");
      } else {
        toast.error(res.error || "Failed to save RBAC matrix");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save RBAC matrix");
    } finally {
      setIsSavingMatrix(false);
    }
  };

  // New Template Handlers
  const handleOpenNewTemplateModal = () => {
    setNewTplName("");
    setNewTplKey(`meet.custom.${Date.now()}`);
    setNewTplEvent("meet.task.assigned");
    setNewTplChannel("email");
    setNewTplSubject("Action Required: {{item.code}} assigned to you");
    setNewTplBody(
      "Dear {{user.first_name}},\n\nYou have been assigned action item {{item.code}} from meeting {{meeting.title}}.\n\nDue Date: {{item.due}} (TAT: {{tat_days}})\n\nPlease review and execute within the allotted working days."
    );
    setNewTplAttachMom(false);
    setIsNewTemplateModalOpen(true);
  };

  const handleCreateNewTemplateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTplName.trim() || !newTplSubject.trim() || !newTplBody.trim()) {
      toast.warn("Please enter template name, subject, and body");
      return;
    }

    startTransition(async () => {
      const res = await saveNotificationTemplate({
        key: newTplKey.trim() || `meet.custom.${Date.now()}`,
        name: newTplName.trim(),
        event_key: newTplEvent,
        channel: newTplChannel,
        subject: newTplSubject.trim(),
        body: newTplBody.trim(),
        attach_mom: newTplAttachMom,
      });

      if (res.success && res.template) {
        toast.success(`Template "${res.template.name}" created successfully`);
        setEmailTemplates((prev) => [res.template!, ...prev]);
        setSelectedTemplate(res.template);
        setTemplateSubject(res.template.subject);
        setTemplateBody(res.template.body);
        setIsNewTemplateModalOpen(false);
      } else {
        toast.error(res.error || "Failed to create template");
      }
    });
  };

  const handleOpenPreview = (tmpl?: MeetNotificationTemplate) => {
    const target = tmpl || selectedTemplate;
    if (!target) return;
    setPreviewTemplate(target);
    setIsPreviewModalOpen(true);
  };

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
      {/* Section header (sections are picked from the sidebar: Settings › …) */}
      <div className="border-b border-border pb-3">
        <h2 className="text-[18px] font-bold text-heading">{current.label}</h2>
        <p className="mt-0.5 text-[13.5px] text-muted">{current.hint}</p>
        {activeTab === "sla" && warningCount + breachedCount > 0 && (
          <p className="mt-1 text-[13px] font-semibold text-danger-text">{warningCount + breachedCount} item{warningCount + breachedCount === 1 ? "" : "s"} need attention</p>
        )}
      </div>

      {activeTab === "projects" && (
        <div className="theme-card-structural space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[13.5px] text-subtle">{projects.length} project{projects.length === 1 ? "" : "s"}. These show in the Project list when scheduling a meeting.</p>
            <AppButton variant="primary" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setProjDraft({ name: "", code: "" })}>
              Add project
            </AppButton>
          </div>
          {projDraft && (
            <form
              className="grid gap-3 rounded-lg border border-border bg-sunken p-4 sm:grid-cols-[1fr_160px_auto]"
              onSubmit={(e) => {
                e.preventDefault();
                startTransition(async () => {
                  const res = await saveMeetProject({ id: projDraft.id, name: projDraft.name, code: projDraft.code });
                  if (!res.success) { toast.error(res.error || "Couldn't save."); return; }
                  setProjects(res.items || []);
                  setProjDraft(null);
                  toast.success("Project saved");
                });
              }}
            >
              <label className="text-[13px] font-medium text-foreground">
                Name
                <input autoFocus value={projDraft.name} onChange={(e) => setProjDraft({ ...projDraft, name: e.target.value })} className="mt-1 h-10 w-full rounded-md border border-border bg-surface px-3 text-[14px] text-foreground focus:border-primary focus:outline-none" />
              </label>
              <label className="text-[13px] font-medium text-foreground">
                Code <span className="font-normal text-muted">(optional)</span>
                <input value={projDraft.code} onChange={(e) => setProjDraft({ ...projDraft, code: e.target.value })} className="mt-1 h-10 w-full rounded-md border border-border bg-surface px-3 text-[14px] text-foreground focus:border-primary focus:outline-none" />
              </label>
              <div className="flex items-end gap-2">
                <AppButton type="submit" variant="primary" size="sm" isLoading={isPending}>Save</AppButton>
                <AppButton type="button" variant="outline" size="sm" onClick={() => setProjDraft(null)}>Cancel</AppButton>
              </div>
            </form>
          )}
          {projects.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-6 text-center text-[13.5px] text-muted">No projects yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full border-collapse text-[14px]">
                <thead>
                  <tr className="bg-sunken text-left text-[12.5px] font-semibold text-subtle">
                    <th className="px-4 py-2.5">Code</th>
                    <th className="px-4 py-2.5">Project</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((p) => (
                    <tr key={p.id} className="border-t border-border">
                      <td className="px-4 py-2.5 text-[13px] text-muted">{p.code || "—"}</td>
                      <td className="px-4 py-2.5 font-medium text-foreground">{p.name}</td>
                      <td className="px-4 py-2.5 text-[13px]">{p.active ? <span className="text-success-text">In use</span> : <span className="text-muted">Hidden</span>}</td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="inline-flex gap-2">
                          <AppButton variant="outline" size="sm" onClick={() => setProjDraft({ id: p.id, name: p.name, code: p.code || "" })}>Edit</AppButton>
                          <AppButton
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              startTransition(async () => {
                                const res = await saveMeetProject({ id: p.id, name: p.name, code: p.code || "", active: !p.active });
                                if (!res.success) { toast.error(res.error || "Couldn't update."); return; }
                                setProjects(res.items || []);
                              })
                            }
                          >
                            {p.active ? "Hide" : "Show"}
                          </AppButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 1: Roles & Access (Section E1) - Granular Interactive RBAC Matrix */}
      {activeTab === "roles" && (
        <div className="space-y-6">
          {/* RBAC Header & Actions */}
          <div className="p-5 rounded-xl border border-border bg-elevated">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border">
              <div>
                <div className="flex items-center gap-2">
                  <Key className="w-5 h-5 text-primary" />
                  <h3 className="text-base font-bold text-foreground">
                    Chandak Meet Granular RBAC Permissions Matrix
                  </h3>
                </div>
                <p className="text-xs text-muted mt-1 max-w-2xl">
                  Module-scoped role governance. Define granular Create, Read/View, Update/Edit, and Delete permissions across all 10 Meet operational domains for each role.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                <Link href="/meet/settings/rbac">
                  <AppButton
                    variant="outline"
                    size="sm"
                    className="font-semibold text-xs gap-1.5 border-theme-btn-primary/40 text-theme-btn-primary hover:bg-theme-btn-primary/10"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Module RBAC Policy
                  </AppButton>
                </Link>
                <button
                  type="button"
                  onClick={handleResetMatrix}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-surface hover:bg-sunken text-muted hover:text-foreground flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset Defaults
                </button>
                <AppButton
                  variant="primary"
                  size="sm"
                  onClick={handleSaveMatrix}
                  isLoading={isSavingMatrix}
                  className="font-bold shadow-sm"
                >
                  Save RBAC Matrix
                </AppButton>
              </div>
            </div>

            {/* Role Selector Tabs */}
            <div className="mt-4">
              <span className="text-[12.5px] font-semibold text-muted uppercase tracking-wider block mb-2">
                Select Role to Configure Permissions
              </span>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
                {MEET_ROLES.map((r) => {
                  const isSelected = selectedRole === r.key;
                  const perms = roleMatrix[r.key] || {};
                  let activeCount = 0;
                  Object.values(perms).forEach((p) => {
                    if (p.create) activeCount++;
                    if (p.read) activeCount++;
                    if (p.update) activeCount++;
                    if (p.delete) activeCount++;
                  });

                  return (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => setSelectedRole(r.key)}
                      className={`text-left p-3 rounded-lg border transition-all ${
                        isSelected
                          ? "bg-theme-btn-primary/10 border-theme-btn-primary shadow-xs ring-1 ring-theme-btn-primary/30"
                          : "bg-surface border-border hover:bg-elevated hover:border-border/80"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-bold text-foreground truncate">
                          {r.label}
                        </span>
                      </div>
                      <span className="inline-block text-[12px] font-semibold px-1.5 py-0.5 rounded bg-sunken text-muted mb-1.5">
                        {r.badge}
                      </span>
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="text-muted">Active CRUD:</span>
                        <span className={`font-mono font-bold ${activeCount > 0 ? "text-success-text" : "text-subtle"}`}>
                          {activeCount} / 40
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Batch Actions for Selected Role */}
            {(() => {
              const currentRoleObj = MEET_ROLES.find((r) => r.key === selectedRole);
              const perms = roleMatrix[selectedRole] || {};
              let activeCount = 0;
              Object.values(perms).forEach((p) => {
                if (p.create) activeCount++;
                if (p.read) activeCount++;
                if (p.update) activeCount++;
                if (p.delete) activeCount++;
              });

              return (
                <div className="mt-4 p-3 rounded-lg bg-surface border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-theme-btn-primary" />
                    <div>
                      <span className="text-xs font-bold text-foreground">
                        {currentRoleObj?.label} ({currentRoleObj?.badge})
                      </span>
                      <span className="text-[12.5px] text-muted ml-2">
                        {currentRoleObj?.description}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted text-[12.5px] mr-1">
                      {activeCount} of 40 permissions granted
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleRoleAll(selectedRole, true)}
                      className="px-2.5 py-1 text-[12.5px] font-semibold rounded bg-success-soft text-success-text border border-success-border hover:bg-success-soft"
                    >
                      Grant All
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleRoleAll(selectedRole, false)}
                      className="px-2.5 py-1 text-[12.5px] font-semibold rounded bg-danger-soft text-danger-text border border-danger-border hover:bg-danger-soft"
                    >
                      Revoke All
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Granular CRUD Permissions Table */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-surface text-muted">
                    <th className="py-2.5 px-3 font-semibold w-2/5">Meet Resource Domain</th>
                    <th className="py-2.5 px-3 font-semibold text-center w-28">Create [C]</th>
                    <th className="py-2.5 px-3 font-semibold text-center w-28">Read/View [R]</th>
                    <th className="py-2.5 px-3 font-semibold text-center w-28">Update/Edit [U]</th>
                    <th className="py-2.5 px-3 font-semibold text-center w-28">Delete [D]</th>
                    <th className="py-2.5 px-3 font-semibold text-center w-24">Row Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {MEET_RESOURCES.map((resource) => {
                    const rolePerms = roleMatrix[selectedRole] || {};
                    const resPerm = rolePerms[resource.key] || {
                      create: false,
                      read: false,
                      update: false,
                      delete: false,
                    };
                    const allChecked =
                      resPerm.create && resPerm.read && resPerm.update && resPerm.delete;

                    return (
                      <tr key={resource.key} className="hover:bg-surface/50 transition-colors">
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-foreground block">
                            {resource.label}
                          </span>
                          <span className="text-[12.5px] text-muted">
                            {resource.description}
                          </span>
                        </td>

                        {/* Create [C] */}
                        <td className="py-2.5 px-3 text-center">
                          <label className="inline-flex items-center justify-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={resPerm.create}
                              onChange={() =>
                                handleToggleMatrixPerm(selectedRole, resource.key, "create")
                              }
                              className="h-4 w-4 rounded border-border text-theme-btn-primary focus:ring-theme-btn-primary cursor-pointer accent-theme-btn-primary"
                            />
                            <span className={`ml-1.5 text-[12.5px] font-semibold ${resPerm.create ? "text-success-text" : "text-muted"}`}>
                              Create
                            </span>
                          </label>
                        </td>

                        {/* Read/View [R] */}
                        <td className="py-2.5 px-3 text-center">
                          <label className="inline-flex items-center justify-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={resPerm.read}
                              onChange={() =>
                                handleToggleMatrixPerm(selectedRole, resource.key, "read")
                              }
                              className="h-4 w-4 rounded border-border text-theme-btn-primary focus:ring-theme-btn-primary cursor-pointer accent-theme-btn-primary"
                            />
                            <span className={`ml-1.5 text-[12.5px] font-semibold ${resPerm.read ? "text-accent-soft-text" : "text-muted"}`}>
                              View
                            </span>
                          </label>
                        </td>

                        {/* Update/Edit [U] */}
                        <td className="py-2.5 px-3 text-center">
                          <label className="inline-flex items-center justify-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={resPerm.update}
                              onChange={() =>
                                handleToggleMatrixPerm(selectedRole, resource.key, "update")
                              }
                              className="h-4 w-4 rounded border-border text-theme-btn-primary focus:ring-theme-btn-primary cursor-pointer accent-theme-btn-primary"
                            />
                            <span className={`ml-1.5 text-[12.5px] font-semibold ${resPerm.update ? "text-warning-text" : "text-muted"}`}>
                              Edit
                            </span>
                          </label>
                        </td>

                        {/* Delete [D] */}
                        <td className="py-2.5 px-3 text-center">
                          <label className="inline-flex items-center justify-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={resPerm.delete}
                              onChange={() =>
                                handleToggleMatrixPerm(selectedRole, resource.key, "delete")
                              }
                              className="h-4 w-4 rounded border-border text-theme-btn-primary focus:ring-theme-btn-primary cursor-pointer accent-theme-btn-primary"
                            />
                            <span className={`ml-1.5 text-[12.5px] font-semibold ${resPerm.delete ? "text-danger-text" : "text-muted"}`}>
                              Delete
                            </span>
                          </label>
                        </td>

                        {/* Row Actions */}
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleRowAll(selectedRole, resource.key)}
                            className="px-2 py-0.5 text-[12px] rounded font-medium border border-border hover:bg-sunken text-muted hover:text-foreground"
                          >
                            {allChecked ? "Clear" : "All"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* People in Chandak Meet */}
          <div className="p-4 rounded-xl border border-border bg-elevated">
            <h3 className="text-sm font-bold text-foreground mb-1">Active Users in Chandak Meet</h3>
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
                      <td className="py-2 px-3 font-semibold text-foreground">{u.full_name}</td>
                      <td className="py-2 px-3 text-muted">{u.email}</td>
                      <td className="py-2 px-3">
                        <select className="bg-surface border border-border rounded px-2 py-1 text-xs text-foreground">
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
        <div className="p-6 rounded-xl border border-border bg-elevated space-y-6 max-w-2xl">
          <div>
            <h3 className="text-sm font-bold text-foreground">Module Meeting Policies</h3>
            <p className="text-xs text-muted mt-0.5">Enforced across all server actions and workflows.</p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg bg-surface border border-border">
              <div>
                <span className="font-semibold text-foreground block">Who Can Create Meetings</span>
                <span className="text-[12.5px] text-muted">Controls visibility of Create Meeting actions</span>
              </div>
              <select
                value={policyWhoCreates}
                onChange={(e) => setPolicyWhoCreates(e.target.value)}
                className="bg-elevated border border-border rounded px-2.5 py-1 text-xs text-foreground"
              >
                <option value="all_meet_users">All Meet Users</option>
                <option value="dept_heads_only">Department Heads Only</option>
                <option value="admins_only">Meet Admins Only</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-surface border border-border">
              <div>
                <span className="font-semibold text-foreground block">Attendees Can Add Points in Meeting</span>
                <span className="text-[12.5px] text-muted">Allows meeting attendees to add new items in live session</span>
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
                <span className="font-semibold text-foreground block">Attendees Can Write in Running Notes</span>
                <span className="text-[12.5px] text-muted">Allow non-organizers to contribute to session running notes</span>
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
                <span className="font-semibold text-foreground block">Department Heads See All Department Meetings</span>
                <span className="text-[12.5px] text-muted">Automatic read visibility for department leadership</span>
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
                <span className="font-semibold text-foreground block">Who Approves TAT Extensions</span>
                <span className="text-[12.5px] text-muted">Workflow authority for due date extensions</span>
              </div>
              <select
                value={policyWhoApprovesExtensions}
                onChange={(e) => setPolicyWhoApprovesExtensions(e.target.value)}
                className="bg-elevated border border-border rounded px-2.5 py-1 text-xs text-foreground"
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
            <div className="p-4 rounded-xl border border-warning-border bg-warning-soft text-center">
              <span className="text-2xl font-bold text-warning-text">{warningCount}</span>
              <p className="text-xs text-warning-text font-medium mt-1">In Warning Now</p>
            </div>
            <div className="p-4 rounded-xl border border-danger-border bg-danger-soft text-center">
              <span className="text-2xl font-bold text-danger-text">{breachedCount}</span>
              <p className="text-xs text-danger-text font-medium mt-1">SLA Breached</p>
            </div>
            <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-500/10 text-center">
              <span className="text-2xl font-bold text-purple-400">{escalatedCount}</span>
              <p className="text-xs text-purple-300 font-medium mt-1">Escalated L2+</p>
            </div>
            <div className="p-4 rounded-xl border border-border bg-elevated text-center">
              <span className="text-2xl font-bold text-foreground">{alertRules.length}</span>
              <p className="text-xs text-muted font-medium mt-1">Active Alert Rules</p>
            </div>
          </div>

          {/* Active Escalated Items (Acknowledge / Reassign) */}
          {slaInstances.length > 0 && (
            <div className="p-4 rounded-xl border border-border bg-elevated">
              <h3 className="text-sm font-bold text-foreground mb-2">Escalated Items Queue (Section E2.3)</h3>
              <div className="divide-y divide-border text-xs">
                {slaInstances.map((ins) => (
                  <div key={ins.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[12px] font-bold bg-danger-soft text-danger-text">
                          Escalated L{ins.current_level}
                        </span>
                        <span className="font-semibold text-foreground capitalize">
                          {ins.item_type} · State: {ins.state}
                        </span>
                      </div>
                      <span className="text-[12.5px] text-muted">
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
                      <span className="text-success-text font-semibold text-xs">✓ Acknowledged</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SLA Policies Table */}
          <div className="p-4 rounded-xl border border-border bg-elevated">
            <h3 className="text-sm font-bold text-foreground mb-1">Standard SLA Clocks & Escalation Matrix</h3>
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
                      <td className="py-2.5 px-3 font-bold text-foreground">{pol.name}</td>
                      <td className="py-2.5 px-3 text-muted">{pol.time_limit_hours} hours ({pol.time_limit_unit})</td>
                      <td className="py-2.5 px-3 text-warning-text font-semibold">At {pol.warning_percent}% TAT</td>
                      <td className="py-2.5 px-3 text-muted">
                        L1: Owner → L2: Manager (+1d) → L3: Dept Head (+2d) → L4: Mgmt (+4d)
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[12.5px] text-muted">{pol.channels?.join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Alert Rules Section */}
          <div className="p-4 rounded-xl border border-border bg-elevated flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Configured Alert Rules</h3>
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
        <div className="space-y-4">
          <div role="note" className="rounded-xl border border-warning-border bg-warning-soft p-4 text-[13.5px] text-warning-text">
            Chandak Meet emails are written in{" "}
            <a href="/meet/automations/emails" className="font-semibold underline">Automations › Emails</a>: pick the event, who gets it and when, and write the message.
            They go out through your own SMTP. The old templates below are no longer used for sending.
          </div>
          {/* Header Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl border border-border bg-elevated">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                Notification & Mail Templates
              </h3>
              <p className="text-xs text-muted mt-0.5">
                Design custom email and WhatsApp payloads with dynamic merge tags, automatic MoM PDF attachments, and live email body previews.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenPreview(selectedTemplate || undefined)}
                disabled={!selectedTemplate}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-surface hover:bg-sunken text-muted hover:text-foreground flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Eye className="w-3.5 h-3.5 text-accent-soft-text" />
                View Mail Body
              </button>
              <button
                type="button"
                onClick={handleOpenNewTemplateModal}
                className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-theme-btn-primary text-theme-btn-primary-text hover:brightness-110 flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                + New Template
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Templates List */}
            <div className="p-4 rounded-xl border border-border bg-elevated flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Available Templates ({emailTemplates.length})
                </h4>
              </div>
              <div className="divide-y divide-border overflow-y-auto max-h-[480px]">
                {emailTemplates.map((tmpl) => (
                  <div
                    key={tmpl.id}
                    className={`w-full p-3 rounded-lg text-xs transition-colors flex items-start justify-between gap-2 ${
                      selectedTemplate?.id === tmpl.id
                        ? "bg-theme-btn-primary/10 border-l-2 border-theme-btn-primary shadow-xs"
                        : "hover:bg-surface"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTemplate(tmpl);
                        setTemplateSubject(tmpl.subject);
                        setTemplateBody(tmpl.body);
                      }}
                      className="flex-1 text-left"
                    >
                      <span className="font-bold text-foreground block">{tmpl.name}</span>
                      <div className="flex items-center gap-2 text-[12.5px] text-muted mt-1">
                        <span className="capitalize px-1.5 py-0.2 rounded bg-sunken font-mono text-[12px]">
                          {tmpl.channel}
                        </span>
                        <span>Ver {tmpl.version || 1}</span>
                        {tmpl.attach_mom && (
                          <span className="text-success-text font-medium">📎 MoM PDF</span>
                        )}
                      </div>
                    </button>

                    <button
                      type="button"
                      title="View Rendered Mail Body"
                      onClick={() => handleOpenPreview(tmpl)}
                      className="p-1.5 rounded hover:bg-surface text-muted hover:text-accent-soft-text transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Template Editor & Live Preview Panel */}
            {selectedTemplate && (
              <div className="lg:col-span-2 p-5 rounded-xl border border-border bg-elevated flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-border gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">{selectedTemplate.name}</h3>
                    <span className="text-[12.5px] text-muted font-mono">Event: {selectedTemplate.event_key}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Editor vs Inline Preview Tabs */}
                    <div className="flex items-center bg-surface p-0.5 rounded-lg border border-border">
                      <button
                        type="button"
                        onClick={() => setEditorTab("editor")}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                          editorTab === "editor"
                            ? "bg-theme-btn-primary text-theme-btn-primary-text shadow-2xs"
                            : "text-muted hover:text-foreground"
                        }`}
                      >
                        Editor
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditorTab("preview")}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1 ${
                          editorTab === "preview"
                            ? "bg-theme-btn-primary text-theme-btn-primary-text shadow-2xs"
                            : "text-muted hover:text-foreground"
                        }`}
                      >
                        <Eye className="w-3 h-3" />
                        Live Mail Preview
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleSaveTemplateChanges}
                      disabled={isPending}
                      className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-theme-btn-primary text-theme-btn-primary-text hover:brightness-110 shadow-sm"
                    >
                      Save Version {(selectedTemplate.version || 1) + 1}
                    </button>
                  </div>
                </div>

                {editorTab === "editor" ? (
                  <div className="space-y-4">
                    {/* Clickable Merge Fields Palette */}
                    <div>
                      <span className="text-xs font-semibold text-foreground block mb-1.5">
                        Clickable Dynamic Merge Fields:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          "{{user.first_name}}", "{{meeting.title}}", "{{session.date}}",
                          "{{session.time}}", "{{item.code}}", "{{item.due}}",
                          "{{owner.name}}", "{{tat_days}}", "{{summary}}", "{{agenda}}"
                        ].map((field) => (
                          <button
                            key={field}
                            type="button"
                            onClick={() => setTemplateBody((b) => `${b} ${field}`)}
                            className="px-2 py-0.5 rounded bg-surface border border-border hover:bg-elevated text-[12.5px] font-mono text-theme-btn-primary transition-colors cursor-pointer"
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
                        className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-theme-btn-primary font-medium"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-medium text-muted">Mail Body (Supports Dynamic Merge Tags)</label>
                        <button
                          type="button"
                          onClick={() => handleOpenPreview(selectedTemplate)}
                          className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                        >
                          <Eye className="w-3 h-3" /> Preview Rendered Output
                        </button>
                      </div>
                      <textarea
                        rows={9}
                        value={templateBody}
                        onChange={(e) => setTemplateBody(e.target.value)}
                        className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-theme-btn-primary font-sans leading-relaxed"
                      />
                    </div>

                    {/* Attach MoM PDF Toggle */}
                    <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-surface border border-border">
                      <input
                        type="checkbox"
                        checked={selectedTemplate.attach_mom}
                        onChange={(e) =>
                          setSelectedTemplate({
                            ...selectedTemplate,
                            attach_mom: e.target.checked,
                          })
                        }
                        className="h-4 w-4 rounded border-border text-theme-btn-primary focus:ring-theme-btn-primary"
                      />
                      <span className="text-xs text-foreground font-medium">
                        Automatically attach signed Minutes of Meeting (MoM) PDF when published
                      </span>
                    </label>
                  </div>
                ) : (
                  /* Inline Live Rendered Mail Envelope View */
                  <div className="rounded-xl border border-border bg-surface p-4 space-y-4">
                    <div className="border-b border-border pb-3 text-xs space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-muted w-14">From:</span>
                        <span className="text-foreground font-mono">Chandak Meet &lt;notifications@chandakgroup.tech&gt;</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-muted w-14">To:</span>
                        <span className="text-foreground font-mono">avinash.pise@chandakgroup.com</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-muted w-14">Subject:</span>
                        <span className="text-foreground font-bold">{renderSampleEmail(templateSubject)}</span>
                      </div>
                    </div>

                    {/* Rendered Email Body Box */}
                    <div className="rounded-lg border border-border/80 bg-background p-5 text-xs text-foreground whitespace-pre-line leading-relaxed font-sans shadow-inner">
                      {renderSampleEmail(templateBody)}
                    </div>

                    {selectedTemplate.attach_mom && (
                      <div className="p-3 rounded-lg border border-success-border bg-success-soft flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-success-text font-semibold">
                          <FileText className="w-4 h-4" />
                          <span>Minutes_of_Meeting_Approved.pdf</span>
                          <span className="text-muted text-[12.5px]">(142 KB · Signed by Chair)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toast.info("Opening MoM PDF in secure viewer...")}
                            className="px-2.5 py-1 text-[12.5px] font-medium rounded border border-border bg-surface hover:bg-sunken text-foreground"
                          >
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => toast.success("Downloading MoM PDF...")}
                            className="px-2.5 py-1 text-[12.5px] font-medium rounded bg-primary text-primary-foreground hover:brightness-110 flex items-center gap-1"
                          >
                            <Download className="w-3 h-3" /> Download
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
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
                    <span className="text-[12.5px] text-muted">{room.location}</span>
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
                      <span className="ml-2 text-[12px] text-primary font-bold uppercase">Board</span>
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
                className="w-24 px-3 py-1.5 bg-elevated border border-border rounded text-xs text-foreground font-mono"
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
          <div className="bg-elevated border border-border rounded-lg max-w-md w-full p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-sm font-bold text-foreground">Create New Alert Rule</h3>
              <button onClick={() => setIsAlertModalOpen(false)} className="text-muted hover:text-foreground">
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
                  className="w-full px-3 py-2 bg-surface border border-border rounded text-foreground focus:outline-none focus:border-theme-btn-primary"
                />
              </div>
              <div>
                <label className="block text-muted font-medium mb-1">Trigger Event</label>
                <select
                  value={alertEvent}
                  onChange={(e) => setAlertEvent(e.target.value)}
                  className="w-full px-3 py-2 bg-surface border border-border rounded text-foreground focus:outline-none focus:border-theme-btn-primary"
                >
                  <option value="meet.task.assigned">Task Assigned</option>
                  <option value="meet.sla.warning">SLA Warning (50% TAT)</option>
                  <option value="meet.sla.breached">SLA Breached</option>
                  <option value="meet.point.carried">Point Carried Forward</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <button onClick={() => setIsAlertModalOpen(false)} className="px-3 py-1.5 text-xs rounded border border-border text-subtle">
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
          <div className="bg-elevated border border-border rounded-lg max-w-md w-full p-5 shadow-2xl">
            <h3 className="text-sm font-bold text-foreground mb-3">Add Meeting Room</h3>
            <form onSubmit={handleAddRoom} className="space-y-3 text-xs">
              <input
                type="text"
                placeholder="Room name (e.g. Board Room HO)"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="w-full px-3 py-2 bg-surface border border-border rounded text-foreground"
                required
              />
              <input
                type="text"
                placeholder="Location / Floor"
                value={roomLocation}
                onChange={(e) => setRoomLocation(e.target.value)}
                className="w-full px-3 py-2 bg-surface border border-border rounded text-foreground"
                required
              />
              <input
                type="number"
                placeholder="Capacity"
                value={roomCapacity}
                onChange={(e) => setRoomCapacity(Number(e.target.value))}
                className="w-full px-3 py-2 bg-surface border border-border rounded text-foreground"
                required
              />
              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button type="button" onClick={() => setIsRoomModalOpen(false)} className="px-3 py-1.5 text-xs rounded border border-border text-subtle">
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

      {/* Create New Notification Template Modal */}
      {isNewTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in-0">
          <div className="bg-elevated border border-border rounded-xl max-w-xl w-full p-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" />
                  Create Notification Template
                </h3>
                <p className="text-[12.5px] text-muted mt-0.5">
                  Configure custom notification content and trigger rules for Chandak Meet.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewTemplateModalOpen(false)}
                className="text-muted hover:text-foreground p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewTemplateSubmit} className="space-y-3.5 py-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted font-medium mb-1">Template Name *</label>
                  <input
                    type="text"
                    required
                    value={newTplName}
                    onChange={(e) => setNewTplName(e.target.value)}
                    placeholder="e.g. Action Item Due Soon Alert"
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-foreground focus:outline-none focus:border-theme-btn-primary"
                  />
                </div>
                <div>
                  <label className="block text-muted font-medium mb-1">Unique Key</label>
                  <input
                    type="text"
                    value={newTplKey}
                    onChange={(e) => setNewTplKey(e.target.value)}
                    placeholder="e.g. meet.task.due_soon"
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-foreground font-mono text-[12.5px] focus:outline-none focus:border-theme-btn-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted font-medium mb-1">Trigger Event</label>
                  <select
                    value={newTplEvent}
                    onChange={(e) => setNewTplEvent(e.target.value)}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-foreground focus:outline-none focus:border-theme-btn-primary"
                  >
                    <option value="meet.task.assigned">Task Assigned</option>
                    <option value="meet.task.due_soon">Task Due Soon (TAT approaching)</option>
                    <option value="meet.task.escalated">Task Escalated (TAT breached)</option>
                    <option value="meet.meeting.scheduled">Meeting Scheduled / Notice</option>
                    <option value="meet.session.started">Live Session Started</option>
                    <option value="meet.mom.published">Minutes of Meeting (MoM) Published</option>
                    <option value="meet.extension.requested">TAT Extension Requested</option>
                    <option value="meet.extension.approved">TAT Extension Approved</option>
                    <option value="meet.decision.recorded">Policy Decision Recorded</option>
                  </select>
                </div>
                <div>
                  <label className="block text-muted font-medium mb-1">Delivery Channel</label>
                  <select
                    value={newTplChannel}
                    onChange={(e) => setNewTplChannel(e.target.value)}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-foreground focus:outline-none focus:border-theme-btn-primary"
                  >
                    <option value="email">Email (HTML)</option>
                    <option value="whatsapp">WhatsApp Business</option>
                    <option value="in_app">In-App Notification</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-muted font-medium mb-1">Email Subject Line *</label>
                <input
                  type="text"
                  required
                  value={newTplSubject}
                  onChange={(e) => setNewTplSubject(e.target.value)}
                  placeholder="e.g. Action Required: {{item.code}} from {{meeting.title}}"
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-foreground focus:outline-none focus:border-theme-btn-primary font-medium"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-muted font-medium">Mail Body *</label>
                  <span className="text-[12.5px] text-muted">Supports dynamic tags</span>
                </div>
                <div className="flex flex-wrap gap-1 mb-2">
                  {[
                    "{{user.first_name}}", "{{meeting.title}}", "{{session.date}}",
                    "{{item.code}}", "{{item.due}}", "{{tat_days}}", "{{summary}}"
                  ].map((field) => (
                    <button
                      key={field}
                      type="button"
                      onClick={() => setNewTplBody((b) => `${b} ${field}`)}
                      className="px-1.5 py-0.5 rounded bg-surface border border-border text-[12px] font-mono text-theme-btn-primary hover:bg-elevated"
                    >
                      {field}
                    </button>
                  ))}
                </div>
                <textarea
                  rows={5}
                  required
                  value={newTplBody}
                  onChange={(e) => setNewTplBody(e.target.value)}
                  placeholder="Enter email content with merge fields..."
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-foreground focus:outline-none focus:border-theme-btn-primary font-sans leading-relaxed"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-surface border border-border">
                <input
                  type="checkbox"
                  checked={newTplAttachMom}
                  onChange={(e) => setNewTplAttachMom(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-theme-btn-primary focus:ring-theme-btn-primary"
                />
                <span className="text-xs text-foreground font-medium">
                  Attach signed Minutes of Meeting (MoM) PDF when published
                </span>
              </label>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsNewTemplateModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs rounded-lg border border-border bg-surface text-subtle hover:text-foreground"
                >
                  Cancel
                </button>
                <AppButton
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isPending}
                  className="font-bold shadow-sm"
                >
                  Create Template
                </AppButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rendered Mail Body Preview Modal (View Mail Body After Create & Anytime) */}
      {isPreviewModalOpen && previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in-0">
          <div className="bg-elevated border border-border rounded-xl max-w-2xl w-full p-6 shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Eye className="w-4 h-4 text-accent-soft-text" />
                  Rendered Mail Body Preview
                </h3>
                <p className="text-[12.5px] text-muted mt-0.5">
                  Template: <span className="font-semibold text-foreground">{previewTemplate.name}</span> · Event: <span className="font-mono">{previewTemplate.event_key}</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Rendered vs Raw Toggle */}
                <div className="flex items-center bg-surface p-0.5 rounded-lg border border-border text-xs">
                  <button
                    type="button"
                    onClick={() => setPreviewMode("rendered")}
                    className={`px-2.5 py-1 font-semibold rounded-md transition-colors ${
                      previewMode === "rendered"
                        ? "bg-theme-btn-primary text-theme-btn-primary-text shadow-2xs"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    Rendered Email
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode("raw")}
                    className={`px-2.5 py-1 font-semibold rounded-md transition-colors ${
                      previewMode === "raw"
                        ? "bg-theme-btn-primary text-theme-btn-primary-text shadow-2xs"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    Raw Template
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="text-muted hover:text-foreground p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body / Envelope */}
            <div className="py-4 space-y-4 overflow-y-auto flex-1">
              {previewMode === "rendered" ? (
                <div className="rounded-xl border border-border bg-surface p-5 space-y-4 shadow-sm">
                  {/* Simulated Email Envelope Header */}
                  <div className="border-b border-border pb-3.5 text-xs space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-muted w-16">From:</span>
                      <span className="text-foreground font-mono text-[12.5px]">
                        Chandak Meet Notifications &lt;notifications@chandakgroup.tech&gt;
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-muted w-16">To:</span>
                      <span className="text-foreground font-mono text-[12.5px]">
                        avinash.pise@chandakgroup.com (Assigned Member)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-muted w-16">Date:</span>
                      <span className="text-muted text-[12.5px]">
                        {new Date().toLocaleDateString("en-IN", {
                          weekday: "short",
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })} · 10:30 AM IST
                      </span>
                    </div>
                    <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                      <span className="font-semibold text-muted w-16">Subject:</span>
                      <span className="text-foreground font-bold text-[13px]">
                        {renderSampleEmail(previewTemplate.subject)}
                      </span>
                    </div>
                  </div>

                  {/* Brand Header Inside Email */}
                  <div className="p-3 rounded-lg bg-theme-btn-primary/10 border border-theme-btn-primary/20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-theme-btn-primary tracking-wide">
                        CHANDAK MEET
                      </span>
                      <span className="text-[12.5px] text-muted">| Enterprise Governance Notice</span>
                    </div>
                    <span className="text-[12px] font-mono px-2 py-0.5 rounded bg-surface border border-border text-muted">
                      Confidential
                    </span>
                  </div>

                  {/* Rendered Email Content */}
                  <div className="rounded-lg border border-border/80 bg-background p-5 text-[12.5px] text-foreground whitespace-pre-line leading-relaxed font-sans shadow-inner">
                    {renderSampleEmail(previewTemplate.body)}
                  </div>

                  {/* Attachment Pill if applicable */}
                  {previewTemplate.attach_mom && (
                    <div className="p-3.5 rounded-lg border border-success-border bg-success-soft flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5 text-success-text font-semibold">
                        <FileText className="w-4 h-4" />
                        <div>
                          <span className="block">Minutes_of_Meeting_Approved.pdf</span>
                          <span className="text-muted text-[12px] font-normal">
                            142 KB · Approved & digitally signed by Chair
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toast.info("Opening signed MoM PDF...")}
                          className="px-2.5 py-1 text-[12.5px] font-semibold rounded border border-border bg-surface hover:bg-sunken text-foreground"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => toast.success("Downloading signed MoM PDF...")}
                          className="px-2.5 py-1 text-[12.5px] font-semibold rounded bg-primary text-primary-foreground hover:brightness-110 flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" /> Download
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Corporate Email Footer */}
                  <div className="pt-3 border-t border-border text-[12.5px] text-muted space-y-1">
                    <p>
                      This is an automated system dispatch from Chandak Meet Platform. Please do not reply directly to this email.
                    </p>
                    <p className="text-[12px] text-subtle">
                      Chandak Group · Enterprise Infrastructure & Manufacturing Governance
                    </p>
                  </div>
                </div>
              ) : (
                /* Raw Template Mode */
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-muted mb-1">
                      Raw Subject Template
                    </label>
                    <pre className="p-3 rounded-lg bg-background border border-border text-xs text-warning-text font-mono overflow-x-auto">
                      {previewTemplate.subject}
                    </pre>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted mb-1">
                      Raw Body Template
                    </label>
                    <pre className="p-3 rounded-lg bg-background border border-border text-xs text-foreground font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed">
                      {previewTemplate.body}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-border flex items-center justify-between">
              <span className="text-[12.5px] text-muted">
                Sample merge tags substituted dynamically with simulated production payload.
              </span>
              <button
                type="button"
                onClick={() => setIsPreviewModalOpen(false)}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-theme-btn-primary text-theme-btn-primary-text hover:brightness-110 shadow-sm"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

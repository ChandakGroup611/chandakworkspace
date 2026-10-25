"use client";

import React, { useState } from "react";
import {
  Settings,
  Layers,
  Tag,
  Building2,
  FileSpreadsheet,
  Plus,
  Check,
  X,
  Edit2,
  Sliders,
  Calendar,
  AlertTriangle,
  Clock,
  ShieldAlert,
} from "lucide-react";
import { AppButton } from "@/components/ui/AppButton";
import {
  saveMeetingType,
  savePointCategory,
  saveMeetingRoom,
  saveMeetingTemplate,
  saveMeetSettings,
} from "@/lib/actions/meet/masters";
import { toast } from "react-toastify";
import type { MeetingType, PointCategory, MeetingRoom, MeetingTemplate } from "@/types/meet";

interface MeetAdminClientProps {
  initialMasters: {
    types: MeetingType[];
    categories: PointCategory[];
    rooms: MeetingRoom[];
    templates: MeetingTemplate[];
    departments: { id: string; name: string }[];
  };
  initialSettings: any;
}

type AdminTab = "types" | "categories" | "rooms" | "templates" | "settings";

export default function MeetAdminClient({ initialMasters, initialSettings }: MeetAdminClientProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>("types");

  // Local state for lists
  const [types, setTypes] = useState<MeetingType[]>(initialMasters.types);
  const [categories, setCategories] = useState<PointCategory[]>(initialMasters.categories);
  const [rooms, setRooms] = useState<MeetingRoom[]>(initialMasters.rooms);
  const [templates, setTemplates] = useState<MeetingTemplate[]>(initialMasters.templates);

  // Settings State
  const [workingDays, setWorkingDays] = useState<number[]>(
    initialSettings?.working_days || [1, 2, 3, 4, 5, 6]
  );
  const [carryEscalationCount, setCarryEscalationCount] = useState<number>(
    initialSettings?.carry_escalation_count || 3
  );
  const [dueSoonDays, setDueSoonDays] = useState<number>(
    initialSettings?.due_soon_working_days || 1
  );
  const [preUpdateHours, setPreUpdateHours] = useState<number>(
    initialSettings?.pre_update_hours_before || 24
  );
  const [excludeHolidays, setExcludeHolidays] = useState<boolean>(
    initialSettings?.exclude_holidays ?? true
  );
  const [momRequiresApproval, setMomRequiresApproval] = useState<boolean>(
    initialSettings?.mom_requires_approval ?? false
  );
  const [momAckRequired, setMomAckRequired] = useState<boolean>(
    initialSettings?.mom_ack_required ?? false
  );
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Modal states
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
    } else {
      toast.error(res.error || "Failed to save");
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
    } else {
      toast.error(res.error || "Failed to save");
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
    } else {
      toast.error(res.error || "Failed to save");
    }
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      const res = await saveMeetSettings({
        working_days: workingDays,
        carry_escalation_count: Number(carryEscalationCount),
        due_soon_working_days: Number(dueSoonDays),
        pre_update_hours_before: Number(preUpdateHours),
        exclude_holidays: excludeHolidays,
        mom_requires_approval: momRequiresApproval,
        mom_ack_required: momAckRequired,
      });
      if (res.success) {
        toast.success("TAT & Governance settings saved successfully");
      } else {
        toast.error(res.error || "Failed to save settings");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings");
    } finally {
      setIsSavingSettings(false);
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

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 bg-surface border border-border p-1.5 rounded-xl overflow-x-auto">
        {(
          [
            { id: "types", label: "Meeting Types", icon: Layers, count: types.length },
            { id: "categories", label: "Point Categories", icon: Tag, count: categories.length },
            { id: "rooms", label: "Meeting Rooms", icon: Building2, count: rooms.length },
            { id: "templates", label: "Meeting Templates", icon: FileSpreadsheet, count: templates.length },
            { id: "settings", label: "TAT & Governance Settings", icon: Sliders },
          ] as const
        ).map((tab) => {
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
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive ? "bg-black/20 text-white" : "bg-surface-elevated text-subtle"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Meeting Types */}
      {activeTab === "types" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-heading">Standard Meeting Types & Cadences</h3>
            <AppButton
              variant="primary"
              size="sm"
              onClick={() => setIsTypeModalOpen(true)}
              className="flex items-center gap-1.5 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Type</span>
            </AppButton>
          </div>

          <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-elevated border-b border-border text-subtle uppercase">
                <tr>
                  <th className="py-3 px-4">Type Name</th>
                  <th className="py-3 px-4">Color Tag</th>
                  <th className="py-3 px-4">Board Mode</th>
                  <th className="py-3 px-4">Sort Order</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {types.map((t) => (
                  <tr key={t.id} className="hover:bg-surface-elevated/40">
                    <td className="py-3.5 px-4 font-semibold text-foreground">{t.name}</td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 font-mono text-[11px]">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }} />
                        {t.color}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {t.is_board_mode ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-500 border border-indigo-500/30">
                          Board / Committee
                        </span>
                      ) : (
                        <span className="text-subtle text-[11px]">Standard</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-subtle">{t.sort_order}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-500 font-semibold">
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Point Categories */}
      {activeTab === "categories" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-heading">Point Categories & Default TAT</h3>
            <AppButton
              variant="primary"
              size="sm"
              onClick={() => setIsCategoryModalOpen(true)}
              className="flex items-center gap-1.5 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Category</span>
            </AppButton>
          </div>

          <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-elevated border-b border-border text-subtle uppercase">
                <tr>
                  <th className="py-3 px-4">Category Name</th>
                  <th className="py-3 px-4">Default TAT (Working Days)</th>
                  <th className="py-3 px-4">Department Scope</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {categories.map((c) => (
                  <tr key={c.id} className="hover:bg-surface-elevated/40">
                    <td className="py-3.5 px-4 font-semibold text-foreground">{c.name}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-heading">
                      {c.default_tat_days} Working Days
                    </td>
                    <td className="py-3.5 px-4 text-subtle">
                      {initialMasters.departments.find((d) => d.id === c.department_id)?.name || "All Departments"}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-500 font-semibold">
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Meeting Rooms */}
      {activeTab === "rooms" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-heading">Physical & Hybrid Meeting Rooms</h3>
            <AppButton
              variant="primary"
              size="sm"
              onClick={() => setIsRoomModalOpen(true)}
              className="flex items-center gap-1.5 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Room</span>
            </AppButton>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map((room) => (
              <div key={room.id} className="bg-surface border border-border rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-heading">{room.name}</h4>
                    <p className="text-xs text-subtle mt-0.5">{room.location}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-surface-elevated text-foreground">
                    {room.capacity} seats
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border">
                  {room.facilities?.projector && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 font-medium">
                      Projector
                    </span>
                  )}
                  {room.facilities?.video_conferencing && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-medium">
                      VC Unit
                    </span>
                  )}
                  {room.facilities?.whiteboard && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 font-medium">
                      Whiteboard
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Meeting Templates */}
      {activeTab === "templates" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-heading">Pre-configured Meeting Templates</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((tpl) => (
              <div key={tpl.id} className="bg-surface border border-border rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-heading">{tpl.name}</h4>
                    <p className="text-xs text-subtle mt-1">{tpl.description || "Standing cadence template"}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-surface-elevated text-foreground">
                    {tpl.default_duration} mins
                  </span>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-border">
                  <span className="text-[10px] uppercase font-bold text-subtle">Standing Agenda Structure</span>
                  {(tpl.agenda_items || []).map((ag: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-surface-elevated">
                      <span className="font-medium text-foreground">{ag.title}</span>
                      <span className="font-mono text-subtle">{ag.duration_mins || ag.planned_minutes} min</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: TAT & Governance Settings */}
      {activeTab === "settings" && (
        <div className="bg-surface border border-border rounded-xl p-6 space-y-6 max-w-3xl">
          <div>
            <h3 className="text-base font-bold text-heading">TAT Calculation & Working Days SLA</h3>
            <p className="text-xs text-subtle mt-1">
              Controls statutory holiday exclusions and deadline resolution across Chandak Group meetings.
            </p>
          </div>

          {/* Working Days Checkbox */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-heading uppercase tracking-wider block">
              Official Working Days (Indian Business Standard)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {daysLabels.map((d) => {
                const isSelected = workingDays.includes(d.num);
                return (
                  <button
                    key={d.num}
                    type="button"
                    onClick={() => toggleDay(d.num)}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-xs font-semibold transition-all ${
                      isSelected
                        ? "bg-theme-btn-primary/10 border-theme-btn-primary text-theme-btn-primary"
                        : "bg-surface-elevated border-border text-subtle hover:text-foreground"
                    }`}
                  >
                    <span>{d.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Exclude Indian Holidays */}
          <div className="flex items-center justify-between p-4 bg-surface-elevated border border-border rounded-lg">
            <div>
              <p className="text-xs font-semibold text-foreground">Exclude Statutory Indian Holidays</p>
              <p className="text-[11px] text-subtle">
                Automatically skips holidays registered in the Group DMAC holiday calendar.
              </p>
            </div>
            <input
              type="checkbox"
              checked={excludeHolidays}
              onChange={(e) => setExcludeHolidays(e.target.checked)}
              className="w-4 h-4 rounded text-theme-btn-primary"
            />
          </div>

          {/* Numeric Governance Parameters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-subtle mb-1">
                Carry-Forward Escalation Threshold
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={carryEscalationCount}
                onChange={(e) => setCarryEscalationCount(Number(e.target.value))}
                className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-xs text-foreground font-mono"
              />
              <span className="text-[10px] text-subtle mt-0.5 block">Points carried ≥ 3 times flagged critical</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-subtle mb-1">
                Due Soon Window (Working Days)
              </label>
              <input
                type="number"
                min={1}
                max={7}
                value={dueSoonDays}
                onChange={(e) => setDueSoonDays(Number(e.target.value))}
                className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-xs text-foreground font-mono"
              />
              <span className="text-[10px] text-subtle mt-0.5 block">Highlights impending deadlines</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-subtle mb-1">
                Pre-Update Cutoff (Hours Before)
              </label>
              <input
                type="number"
                min={1}
                max={72}
                value={preUpdateHours}
                onChange={(e) => setPreUpdateHours(Number(e.target.value))}
                className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-xs text-foreground font-mono"
              />
              <span className="text-[10px] text-subtle mt-0.5 block">E.g. 24h prior to scheduled session</span>
            </div>
          </div>

          {/* MoM Governance Toggles */}
          <div className="space-y-3 pt-4 border-t border-border">
            <h4 className="text-xs font-bold text-heading uppercase tracking-wider">MoM Governance Policies</h4>

            <div className="flex items-center justify-between p-3 bg-surface-elevated border border-border rounded-lg">
              <div>
                <p className="text-xs font-semibold text-foreground">Require Chair Approval Before Publishing MoM</p>
                <p className="text-[11px] text-subtle">Minute taker draft must be approved by Session Chair</p>
              </div>
              <input
                type="checkbox"
                checked={momRequiresApproval}
                onChange={(e) => setMomRequiresApproval(e.target.checked)}
                className="w-4 h-4 rounded text-theme-btn-primary"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-surface-elevated border border-border rounded-lg">
              <div>
                <p className="text-xs font-semibold text-foreground">Require Formal Attendee MoM Acknowledgement</p>
                <p className="text-[11px] text-subtle">Standing members must record formal sign-off upon publication</p>
              </div>
              <input
                type="checkbox"
                checked={momAckRequired}
                onChange={(e) => setMomAckRequired(e.target.checked)}
                className="w-4 h-4 rounded text-theme-btn-primary"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-border flex justify-end">
            <AppButton
              variant="primary"
              size="sm"
              onClick={handleSaveSettings}
              disabled={isSavingSettings}
              className="text-xs"
            >
              {isSavingSettings ? "Saving Settings..." : "Save Governance Settings"}
            </AppButton>
          </div>
        </div>
      )}

      {/* Add Meeting Type Modal */}
      {isTypeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-border rounded-xl w-full max-w-md shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-bold text-heading">Add Meeting Type</h3>
              <button onClick={() => setIsTypeModalOpen(false)}>
                <X className="w-4 h-4 text-subtle" />
              </button>
            </div>
            <form onSubmit={handleAddType} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-subtle mb-1">Name</label>
                <input
                  type="text"
                  value={typeName}
                  onChange={(e) => setTypeName(e.target.value)}
                  placeholder="e.g. Sales Pipeline Review"
                  className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-xs text-foreground"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-subtle mb-1">Color Code</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={typeColor}
                    onChange={(e) => setTypeColor(e.target.value)}
                    className="w-8 h-8 rounded border-none cursor-pointer"
                  />
                  <input
                    type="text"
                    value={typeColor}
                    onChange={(e) => setTypeColor(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-surface-elevated border border-border rounded-lg text-xs font-mono"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="boardMode"
                  checked={typeIsBoard}
                  onChange={(e) => setTypeIsBoard(e.target.checked)}
                />
                <label htmlFor="boardMode" className="text-xs font-medium text-foreground cursor-pointer">
                  Requires Board Mode Protocol (Formal Voting & Redacted Disclosures)
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <AppButton type="button" variant="outline" size="sm" onClick={() => setIsTypeModalOpen(false)}>
                  Cancel
                </AppButton>
                <AppButton type="submit" variant="primary" size="sm">
                  Save Type
                </AppButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Point Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-border rounded-xl w-full max-w-md shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-bold text-heading">Add Point Category</h3>
              <button onClick={() => setIsCategoryModalOpen(false)}>
                <X className="w-4 h-4 text-subtle" />
              </button>
            </div>
            <form onSubmit={handleAddCategory} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-subtle mb-1">Category Name</label>
                <input
                  type="text"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="e.g. Audit & Statutory Compliance"
                  className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-xs text-foreground"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-subtle mb-1">Default TAT (Working Days)</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={catTatDays}
                  onChange={(e) => setCatTatDays(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-xs text-foreground font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-subtle mb-1">Department Scope (Optional)</label>
                <select
                  value={catDeptId}
                  onChange={(e) => setCatDeptId(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-xs text-foreground"
                >
                  <option value="">All Departments (Global)</option>
                  {initialMasters.departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <AppButton type="button" variant="outline" size="sm" onClick={() => setIsCategoryModalOpen(false)}>
                  Cancel
                </AppButton>
                <AppButton type="submit" variant="primary" size="sm">
                  Save Category
                </AppButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Room Modal */}
      {isRoomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-border rounded-xl w-full max-w-md shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-bold text-heading">Add Meeting Room</h3>
              <button onClick={() => setIsRoomModalOpen(false)}>
                <X className="w-4 h-4 text-subtle" />
              </button>
            </div>
            <form onSubmit={handleAddRoom} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-subtle mb-1">Room Name</label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="e.g. Innovation Boardroom"
                  className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-xs text-foreground"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-subtle mb-1">Location</label>
                <input
                  type="text"
                  value={roomLocation}
                  onChange={(e) => setRoomLocation(e.target.value)}
                  placeholder="e.g. Head Office - 3rd Floor"
                  className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-xs text-foreground"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-subtle mb-1">Seating Capacity</label>
                <input
                  type="number"
                  min={2}
                  max={100}
                  value={roomCapacity}
                  onChange={(e) => setRoomCapacity(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-xs text-foreground font-mono"
                  required
                />
              </div>
              <div className="space-y-2">
                <span className="text-xs font-medium text-subtle block">Facilities Available</span>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 text-xs text-foreground">
                    <input
                      type="checkbox"
                      checked={roomProjector}
                      onChange={(e) => setRoomProjector(e.target.checked)}
                    />
                    Projector
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-foreground">
                    <input
                      type="checkbox"
                      checked={roomVc}
                      onChange={(e) => setRoomVc(e.target.checked)}
                    />
                    Video Conferencing
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <AppButton type="button" variant="outline" size="sm" onClick={() => setIsRoomModalOpen(false)}>
                  Cancel
                </AppButton>
                <AppButton type="submit" variant="primary" size="sm">
                  Save Room
                </AppButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

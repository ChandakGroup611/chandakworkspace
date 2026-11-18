"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { AppCard, AppCardContent, AppCardHeader, AppCardTitle } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { useTheme } from "@/components/theme/ThemeProvider";
import { createClient } from "@/utils/supabase/client";
import { saveUserAction, fetchUsersDashboardData, fetchUserModulesAction, fetchUserDashboardsAction } from "@/lib/actions/users";
import { DASHBOARDS } from "@/lib/dashboards/registry";
import { assignUserModules } from "@/lib/actions/module-switcher";
import ChandakLoader from "@/components/ui/ChandakLoader";
import {
  ArrowLeft,
  Camera,
  RefreshCw,
  Save,
  User,
  Briefcase,
  Shield,
  MonitorSmartphone,
  X,
  ChevronDown,
  Eye,
  EyeOff,
  Image as ImageIcon,
  FolderKanban,
  Car,
  Compass,
  Layers,
  LineChart,
  Star,
  CheckCircle2,
  Video,
  Landmark,
  MessageSquare
} from "lucide-react";

const PRESET_AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=200",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200",
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=200",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200",
  "https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&q=80&w=200",
  "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=200",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200",
  "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=200",
  "https://images.unsplash.com/photo-1552058544-f2b08422138a?auto=format&fit=crop&q=80&w=200",
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200",
  "https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&q=80&w=200",
  "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?auto=format&fit=crop&q=80&w=200",
];

const getModuleMeta = (code: string) => {
  switch (code) {
    case "VEHICLE_DESK":
      return {
        icon: Car,
        badgeBg: "bg-warning-soft text-warning-text border-warning-border",
        description: "Fleet master, vehicle inventory, daily trip sheets, driver roster, maintenance & parts."
      };
    case "TASK_WORKFLOW":
      return {
        icon: FolderKanban,
        badgeBg: "bg-info-soft text-info-text border-info-border",
        description: "Executive task tracker, sprints, ticketing/helpdesk, requirements lifecycle & AMC."
      };
    case "DASHBOARDS":
      return {
        icon: LineChart,
        badgeBg: "bg-accent-soft text-accent-soft-text border-border",
        description: "IT & Marketing budget dashboards on live IN4 data. Actions are set by DASH_* role permissions."
      };
    case "DESIGN_TRACKING":
      return {
        icon: Compass,
        badgeBg: "bg-success-soft text-success-text border-success-border",
        description: "Architectural & structural drawing registers, consultant reviews, revisions & site GFC."
      };
    case "CHANDAK_MEET":
      return {
        icon: Video,
        badgeBg: "bg-purple-500/10 text-purple-500 border-purple-500/30",
        description: "Meetings, agendas, points with automated carry-forward, decisions & action items."
      };
    case "ORG_BUDGET":
      return {
        icon: Landmark,
        badgeBg: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
        description: "Project budgets, towers, cost heads, workings, approvals, actuals and financial reports."
      };
    default:
      return {
        icon: Layers,
        badgeBg: "bg-surface text-accent-soft-text border-border",
        description: "Enterprise operational suite and specialized workflows."
      };
  }
};

export default function UserFormPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isEditingMode = id !== "new";

  const supabase = createClient();
  const { isLight: isLightMode } = useTheme();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorAlert, setErrorAlert] = useState<string | null>(null);
  const [successAlert, setSuccessAlert] = useState<string | null>(null);

  // Lookups
  const [departments, setDepartments] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [availableAssets, setAvailableAssets] = useState<any[]>([]);
  const [availableManagers, setAvailableManagers] = useState<any[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isRealSuperAdmin, setIsRealSuperAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Module Entitlements
  const [availableModules, setAvailableModules] = useState<any[]>([]);
  const [selectedModuleCodes, setSelectedModuleCodes] = useState<string[]>(["TASK_WORKFLOW", "VEHICLE_DESK", "DESIGN_TRACKING"]);
  const [selectedDashboards, setSelectedDashboards] = useState<string[]>([]);
  const [defaultModuleCode, setDefaultModuleCode] = useState<string>("TASK_WORKFLOW");
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignModalSaving, setAssignModalSaving] = useState(false);

  // Form states
  const [formFullName, setFormFullName] = useState("");
  const [formUserCode, setFormUserCode] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formDeptId, setFormDeptId] = useState("");
  const [formDesigId, setFormDesigId] = useState("");
  const [formRoleId, setFormRoleId] = useState("");
  const [formManagerId, setFormManagerId] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formConfirmPassword, setFormConfirmPassword] = useState("");
  const [formPhoto, setFormPhoto] = useState(PRESET_AVATARS[0]);
  const [formAssignedAssets, setFormAssignedAssets] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);

  const [photoUploading, setPhotoUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchInitialData();
  }, [id]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const data = await fetchUsersDashboardData();
      const authUser = data.authUser;
      if (!authUser) {
        router.push("/login");
        return;
      }
      setCurrentUserId(authUser.id);

      setDepartments(data.departments || []);
      setDesignations(data.designations || []);
      setRoles(data.roles || []);
      setAvailableAssets(data.assets || []);

      const systemModules = (data as any).modules || [];
      setAvailableModules(systemModules);

      const rawUsers = data.users || [];
      const managers = rawUsers.filter((u: any) =>
        data.roles?.find((r: any) => r.id === u.role_id)?.code !== "VIEWER" && u.is_active
      );
      setAvailableManagers(managers);

      // Check current user permissions
      const me = rawUsers.find((u: any) => u.id === authUser.id || (authUser.email && u.email?.toLowerCase() === authUser.email.toLowerCase()));
      const myRole = data.roles?.find((r: any) => r.id === me?.role_id);
      const rights = (data as any).userRights || {};
      const isRealSuper = !!(data.isSuperAdmin || myRole?.code?.toUpperCase() === "SUPER_ADMIN");
      const canManageUsers = isRealSuper || !!rights.canManage;
      setIsRealSuperAdmin(isRealSuper);
      setIsSuperAdmin(canManageUsers);

      // Strict access control: If not Super Admin / User Manager
      // 1. Block creating new accounts
      if (!canManageUsers && !isEditingMode) {
        router.push("/users");
        return;
      }
      // 2. Block editing other users' accounts (standard users may only view/edit own profile)
      if (!canManageUsers && isEditingMode && id !== authUser.id && id !== me?.id) {
        router.push("/users");
        return;
      }

      if (isEditingMode) {
        const userToEdit = rawUsers.find((u: any) => u.id === id);
        if (userToEdit) {
          setFormFullName(userToEdit.full_name || "");
          setFormUserCode(userToEdit.user_code || "");
          setFormEmail(userToEdit.email || "");
          setFormDeptId(userToEdit.department_id || "");
          setFormDesigId(userToEdit.designation_id || "");
          setFormRoleId(userToEdit.role_id || "");
          setFormManagerId(userToEdit.manager_id || "");
          setFormPhoto(userToEdit.profile_photo || PRESET_AVATARS[0]);
          setFormIsActive(userToEdit.is_active ?? true);

          const userAssets = data.assets
            ? data.assets.filter((a: any) => a.assigned_user_id === userToEdit.id).map((a: any) => a.asset_tag || a.code)
            : ((userToEdit as any).assigned_assets || []);

          setFormAssignedAssets((userAssets).join(", "));
        }

        // Fetch assigned modules
        try {
          const [userModules, userDashboards]: [any[], any[]] = await Promise.all([
            fetchUserModulesAction(id) as any,
            fetchUserDashboardsAction(id) as any
          ]);
          setSelectedDashboards(userDashboards && userDashboards.length > 0 ? userDashboards : []);
          if (userModules && userModules.length > 0) {
            const assignedCodes: string[] = userModules
              .map((m: any) => {
                const mod = Array.isArray(m.module) ? m.module[0] : m.module;
                return mod?.code;
              })
              .filter(Boolean);

            if (assignedCodes.length > 0) {
              setSelectedModuleCodes(assignedCodes);
              const defaultEntry = userModules.find((m: any) => m.is_default);
              const defaultModObj = defaultEntry ? (Array.isArray(defaultEntry.module) ? defaultEntry.module[0] : defaultEntry.module) : null;
              const defaultMod = defaultModObj?.code;
              if (defaultMod && assignedCodes.includes(defaultMod)) {
                setDefaultModuleCode(defaultMod);
              } else {
                setDefaultModuleCode(assignedCodes[0]);
              }
            }
          }
        } catch (mErr) {
          console.error("Failed to load user module entitlements:", mErr);
        }
      } else {
        // New user: grant all active modules with TASK_WORKFLOW as default
        const allCodes = systemModules.map((m: any) => m.code);
        if (allCodes.length > 0) {
          setSelectedModuleCodes(allCodes);
        }
        setDefaultModuleCode("TASK_WORKFLOW");
      }
    } catch (err: any) {
      setErrorAlert("Failed to load dependency records.");
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorAlert("Invalid file format. Please upload an image (PNG, JPG, WebP).");
      return;
    }

    setPhotoUploading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error("Unauthenticated request.");

      const fileExt = file.name.split(".").pop();
      const fileName = `${authUser.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("profiles")
        .upload(fileName, file, { cacheControl: "3600", upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("profiles")
        .getPublicUrl(fileName);

      setFormPhoto(publicUrl);
    } catch (err: any) {
      setErrorAlert(`Upload failed: ${err.message || err}`);
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorAlert(null);

    if (!isEditingMode) {
      if (!formPassword) {
        setErrorAlert("Password is required for newly provisioned user accounts.");
        return;
      }
      if (formPassword !== formConfirmPassword) {
        setErrorAlert("Password and Confirm Password input values do not match.");
        return;
      }
      if (formPassword.length < 6) {
        setErrorAlert("Password constraint requires at least 6 characters.");
        return;
      }
    }

    if (selectedModuleCodes.length === 0) {
      setErrorAlert("At least one workspace module must be enabled for this user.");
      return;
    }

    const payload: any = {
      full_name: formFullName,
      email: formEmail,
      user_code: formUserCode,
      profile_photo: formPhoto,
      is_active: formIsActive,
      role_id: formRoleId || null,
      department_id: formDeptId || null,
      designation_id: formDesigId || null,
      manager_id: formManagerId || null,
      assigned_assets: formAssignedAssets.split(",").map(a => a.trim()).filter(Boolean),
      module_codes: selectedModuleCodes,
      default_module_code: defaultModuleCode || selectedModuleCodes[0] || "TASK_WORKFLOW",
      dashboard_keys: selectedDashboards
    };

    setSaving(true);
    try {
      const result = await saveUserAction(isEditingMode ? id : null, payload, formPassword);
      if (result && !result.success) {
        throw new Error(result.error || "An unknown error occurred during save.");
      }
      router.push("/users?refresh=true");
    } catch (err: any) {
      setErrorAlert(err.message || "Failed to save user record.");
      setSaving(false);
    }
  };

  const inputStyle = `w-full h-11 px-4 rounded-lg border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary ${"bg-surface border-border dark:border-border text-foreground disabled:bg-sunken disabled:text-muted disabled:dark:text-muted"
    }`;

  const labelStyle = `text-sm font-semibold mb-2 block text-foreground`;

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <ChandakLoader
          size="md"
          title="Loading configuration master…"
          subtitle="Fetching user profile & system permissions"
        />
      </div>
    );
  }

  return (
    <div className="w-full pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="-mx-4 md:-mx-6 -mt-4 md:-mt-6 sticky -top-4 md:-top-6 z-50 bg-surface border-b border-border shadow-sm px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <AppButton aria-label="Back"
            variant="outline"
            size="icon"
            onClick={() => router.push("/users")}
            className="rounded-full shadow-sm !h-10 !w-10"
          >
            <ArrowLeft className="h-5 w-5" />
          </AppButton>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {isEditingMode ? "Update Identity Record" : "Register New Account"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Provide necessary organizational and system access details
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isSuperAdmin && (
            <AppButton
              type="button"
              variant="outline"
              onClick={() => setAssignModalOpen(true)}
              className="px-4 h-10 font-semibold flex items-center gap-2 border-border bg-surface/60 dark:bg-surface text-foreground dark:text-muted-foreground hover:bg-accent-soft transition-all shadow-xs cursor-pointer"
              title="Configure and assign workspace modules"
            >
              <Layers className="h-4 w-4 text-accent-soft-text dark:text-muted-foreground" />
              <span>Assign modules ({selectedModuleCodes.length})</span>
            </AppButton>
          )}
          <AppButton
            variant="outline"
            onClick={() => router.push("/users")}
            className="px-6 h-10 font-semibold"
          >
            Cancel
          </AppButton>
          <AppButton
            onClick={handleSubmit}
            disabled={saving || (!isSuperAdmin && !isEditingMode)}
            className="bg-primary hover:bg-theme-btn-primary-secondary text-white px-8 h-10 gap-2 shadow-sm font-semibold"
          >
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>{saving ? "Committing..." : "Commit Record"}</span>
          </AppButton>
        </div>
      </div>

      {/* Interactive Assign Modules Modal Dialog */}
      {assignModalOpen && (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-[var(--overlay)] p-4 animate-in fade-in duration-200">
          <div className="bg-surface border border-border w-full max-w-xl rounded-lg shadow-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-border bg-surface/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-surface text-accent-soft-text flex items-center justify-center border border-border">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    Assign operational modules
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Configure permitted workspaces and default landing for {formFullName || "this user"}
                  </p>
                </div>
              </div>
              <AppButton aria-label="Close"
                variant="ghost"
                size="icon-sm"
                onClick={() => setAssignModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </AppButton>
            </div>

            <div className="p-5 space-y-3.5 overflow-y-auto flex-1">
              {(availableModules.length > 0 ? availableModules : [
                { id: "mod-1", code: "VEHICLE_DESK", name: "Vehicle Module", description: "Fleet master, vehicle inventory, daily trip sheets, driver roster, maintenance & parts." },
                { id: "mod-2", code: "TASK_WORKFLOW", name: "Workspace Module", description: "Executive task tracker, sprints, ticketing/helpdesk, requirements lifecycle & AMC." },
                { id: "mod-3", code: "DESIGN_TRACKING", name: "Design Tracking", description: "Architectural & structural drawing registers, consultant reviews, revisions & site GFC." },
                { id: "mod-4", code: "DASHBOARDS", name: "Dashboards", description: "Department budget & expense dashboards on live IN4 data." },
                { id: "mod-5", code: "CHANDAK_MEET", name: "Chandak Meet", description: "Meetings, agendas, points with automated carry-forward, decisions & action items." },
              ]).map((mod) => {
                const isChecked = selectedModuleCodes.includes(mod.code);
                const isDefault = defaultModuleCode === mod.code;
                const meta = getModuleMeta(mod.code);
                const Icon = meta.icon;

                return (
                  <div
                    key={mod.id || mod.code}
                    className={`p-4 rounded-lg border transition-all flex flex-col items-stretch gap-3 ${isChecked
                        ? "bg-surface border-border shadow-xs"
                        : "bg-muted/20 border-border/40 opacity-60"
                      }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 w-full">
                      <div className="flex items-start gap-3 flex-1 min-w-[200px]">
                        <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 border ${meta.badgeBg}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-foreground">
                              {mod.name}
                            </span>
                            {mod.code ? (
                              <span className="text-[11px] font-mono px-1.5 py-0.5 rounded border border-border text-muted-foreground bg-surface">
                                {mod.code}
                              </span>
                            ) : null}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {mod.description || meta.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        {isChecked && (
                          <AppButton
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={!isSuperAdmin || isDefault}
                            onClick={() => setDefaultModuleCode(mod.code)}
                            className={`text-xs h-7 px-2 rounded-lg border flex items-center gap-1 transition-all ${isDefault
                                ? "bg-warning-soft text-warning-text border-warning-border font-semibold cursor-default"
                                : "text-muted-foreground hover:text-foreground hover:bg-surface-hover border-border cursor-pointer"
                              }`}
                          >
                            <Star className={`h-3 w-3 ${isDefault ? "fill-warning text-warning-text" : ""}`} />
                            <span>{isDefault ? "Default" : "Make Default"}</span>
                          </AppButton>
                        )}

                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={!isSuperAdmin}
                            onChange={(e) => {
                              if (e.target.checked) {
                                const updated = [...selectedModuleCodes, mod.code];
                                setSelectedModuleCodes(updated);
                                if (!defaultModuleCode) setDefaultModuleCode(mod.code);
                              } else {
                                const updated = selectedModuleCodes.filter(c => c !== mod.code);
                                setSelectedModuleCodes(updated);
                                if (defaultModuleCode === mod.code && updated.length > 0) {
                                  setDefaultModuleCode(updated[0]);
                                }
                              }
                            }}
                            className="sr-only peer"
                          />
                          <div className="w-10 h-5 bg-sunken peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-border after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                      </div>
                    </div>

                    {mod.code === "DASHBOARDS" && isChecked && (
                      <div className="w-full mt-1 pt-3 border-t border-border space-y-2 bg-surface/50 rounded-lg p-2.5">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-foreground">
                          <span>Accessible Department Dashboards (User-Wise):</span>
                          <span className="text-[10px] text-muted-foreground">{selectedDashboards.length} selected</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {DASHBOARDS.map((d) => {
                            const isDashActive = selectedDashboards.includes(d.key);
                            return (
                              <label
                                key={d.key}
                                className={`flex items-start gap-2 p-2 rounded-md border text-xs cursor-pointer transition-all ${isDashActive
                                    ? "bg-amber-500/10 border-amber-500/40 text-foreground font-medium"
                                    : "bg-surface border-border text-muted-foreground opacity-75 hover:opacity-100"
                                  }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isDashActive}
                                  disabled={!isSuperAdmin}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedDashboards(prev => [...prev, d.key]);
                                    } else {
                                      setSelectedDashboards(prev => prev.filter(k => k !== d.key));
                                    }
                                  }}
                                  className="mt-0.5 h-3.5 w-3.5 rounded text-primary focus:ring-ring cursor-pointer"
                                />
                                <div className="min-w-0">
                                  <span className="block text-xs truncate font-semibold">{d.name}</span>
                                  <span className="block text-[10px] text-muted-foreground truncate">{d.description}</span>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t border-border bg-surface/50 flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">
                {selectedModuleCodes.length} of {availableModules.length || 3} modules enabled
              </span>
              <div className="flex items-center gap-2">
                <AppButton
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAssignModalOpen(false)}
                >
                  Close
                </AppButton>
                <AppButton
                  type="button"
                  size="sm"
                  className="bg-primary hover:bg-theme-btn-primary-secondary text-white font-semibold gap-1.5"
                  onClick={async () => {
                    if (isEditingMode && id) {
                      setAssignModalSaving(true);
                      try {
                        const res = await assignUserModules(id, selectedModuleCodes, defaultModuleCode, selectedDashboards);
                        if (res.success) {
                          setAssignModalOpen(false);
                          setSuccessAlert("Workspace module entitlements updated successfully!");
                          setTimeout(() => setSuccessAlert(null), 4000);
                        } else {
                          setErrorAlert(res.error || "Failed to update module entitlements");
                        }
                      } catch (err: any) {
                        setErrorAlert(err.message || "Failed to update modules");
                      } finally {
                        setAssignModalSaving(false);
                      }
                    } else {
                      setAssignModalOpen(false);
                      setSuccessAlert("Module selections applied to user profile form.");
                      setTimeout(() => setSuccessAlert(null), 4000);
                    }
                  }}
                  disabled={assignModalSaving}
                >
                  {assignModalSaving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  <span>{assignModalSaving ? "Saving..." : "Apply & Save Modules"}</span>
                </AppButton>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 sm:px-6 lg:px-8">

        {successAlert && (
          <div className="p-4 mb-6 rounded-lg bg-success-soft border border-success-border text-success-text text-sm flex items-center justify-between animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-5 w-5 text-success-text shrink-0" />
              <span className="font-semibold">{successAlert}</span>
            </div>
            <AppButton aria-label="Close" variant="ghost" size="icon-sm" onClick={() => setSuccessAlert(null)}>
              <X className="h-4 w-4" />
            </AppButton>
          </div>
        )}

        {errorAlert && (
          <div className="p-4 mb-6 rounded-lg bg-danger-soft border border-danger-border text-danger-text text-sm flex items-start gap-3">
            <X className="h-5 w-5 shrink-0 mt-0.5" />
            <p className="font-medium">{errorAlert}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 xl:grid-cols-12 gap-8">

          {/* LEFT COLUMN: Identity & Org */}
          <div className="xl:col-span-8 space-y-8">

            {/* SECTION 1: Personal Identity */}
            <AppCard className={`overflow-hidden transition-all border-border`}>
              <AppCardHeader className={"bg-surface/50 pb-4"}>
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-accent-soft-text" />
                  <AppCardTitle className="text-lg">Personal identity</AppCardTitle>
                </div>
              </AppCardHeader>
              <AppCardContent className="p-6 space-y-8">
                {/* Photo Upload Row */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pb-6 border-b border-border">
                  <div className="relative shrink-0 group cursor-pointer" onClick={() => fileInputRef.current?.click()} role="button" tabIndex={0} onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); (e.currentTarget as HTMLElement).click(); } }}>
                    <div className={`w-28 h-28 rounded-full overflow-hidden flex items-center justify-center ring-4 ring-offset-2 bg-sunken text-muted ring-border ring-offset-surface`}>
                      {formPhoto && formPhoto !== PRESET_AVATARS[0] ? (
                        <img src={formPhoto} alt="Profile" className="w-full h-full object-cover" onError={(e) => { (e.target as any).src = '' }} />
                      ) : (
                        <ImageIcon className="w-12 h-12 opacity-50" />
                      )}
                    </div>
                    <div className="absolute bottom-0 right-0 w-9 h-9 bg-primary text-white rounded-full flex items-center justify-center border-[3px] border-surface shadow-sm transition-transform">
                      <Camera className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="flex flex-col items-start gap-3 flex-1">
                    <div>
                      <h3 className="font-semibold text-base mb-1">Profile photo</h3>
                      <p className="text-sm text-muted-foreground max-w-sm">Upload a professional headshot. Recommended dimensions: 400x400px.</p>
                    </div>
                    <div className="flex items-center gap-3 w-full">
                      <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />
                      <AppButton
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={photoUploading}
                        className="shrink-0 font-medium"
                      >
                        {photoUploading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Camera className="h-4 w-4 mr-2" />}
                        <span>{photoUploading ? 'Uploading...' : 'Browse Files'}</span>
                      </AppButton>
                      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none ml-2">
                        {PRESET_AVATARS.map((avatar, idx) => (
                          <img
                            key={idx} src={avatar} alt="Preset"
                            className="w-10 h-10 rounded-full object-cover cursor-pointer shrink-0 hover:ring-2 hover:ring-ring transition-all opacity-80 hover:opacity-100"
                            onClick={() => setFormPhoto(avatar)}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Identity Inputs Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div>
                    <label className={labelStyle}>Full name *</label>
                    <input
                      placeholder="e.g. Sarah chen"
                      value={formFullName}
                      onChange={(e) => setFormFullName(e.target.value)}
                      required
                      disabled={!isSuperAdmin}
                      className={inputStyle}
                    />
                  </div>
                  <div>
                    <label className={labelStyle}>Corporate email *</label>
                    <input
                      type="email"
                      placeholder="e.g. sarah.chen@company.com"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      required
                      disabled={!isSuperAdmin}
                      className={inputStyle}
                    />
                  </div>
                </div>
              </AppCardContent>
            </AppCard>

            {/* SECTION 2: Organization Alignment */}
            <AppCard className={`overflow-hidden transition-all border-border`}>
              <AppCardHeader className={"bg-surface/50 pb-4"}>
                <div className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-warning-text" />
                  <AppCardTitle className="text-lg">Organisation alignment</AppCardTitle>
                </div>
              </AppCardHeader>
              <AppCardContent className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div>
                    <label className={labelStyle}>Department</label>
                    <div className="relative">
                      <select
                        value={formDeptId}
                        onChange={(e) => {
                          setFormDeptId(e.target.value);
                          setFormDesigId("");
                        }}
                        disabled={!isSuperAdmin}
                        className={`${inputStyle} appearance-none pr-10`}
                      >
                        <option value="">Select Department…</option>
                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                      <ChevronDown className="absolute right-4 top-3 h-5 w-5 pointer-events-none text-muted-foreground" />
                    </div>
                  </div>

                  <div>
                    <label className={labelStyle}>Designation</label>
                    <div className="relative">
                      <select
                        value={formDesigId}
                        onChange={(e) => setFormDesigId(e.target.value)}
                        disabled={!isSuperAdmin || !formDeptId}
                        className={`${inputStyle} appearance-none pr-10`}
                      >
                        <option value="">{formDeptId ? "Select Designation..." : "Select Department First"}</option>
                        {designations
                          .filter(d => !formDeptId || d.department_id === formDeptId)
                          .map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                      <ChevronDown className="absolute right-4 top-3 h-5 w-5 pointer-events-none text-muted-foreground" />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className={labelStyle}>Reporting manager</label>
                    <div className="relative">
                      <select
                        value={formManagerId}
                        onChange={(e) => setFormManagerId(e.target.value)}
                        disabled={!isSuperAdmin}
                        className={`${inputStyle} appearance-none pr-10`}
                      >
                        <option value="">Select a Manager…</option>
                        {availableManagers.map(mgr => <option key={mgr.id} value={mgr.id}>{mgr.full_name} ({mgr.user_code})</option>)}
                      </select>
                      <ChevronDown className="absolute right-4 top-3 h-5 w-5 pointer-events-none text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Used for organizational hierarchy charts and automated workflow approvals.
                    </p>
                  </div>
                </div>
              </AppCardContent>
            </AppCard>

            {/* SECTION 3: Workspace Module Entitlements */}
            <AppCard className="overflow-hidden transition-all border-border shadow-xs">
              <AppCardHeader className="bg-surface/50 pb-4 flex flex-row items-center justify-between border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-surface text-accent-soft-text flex items-center justify-center border border-border">
                    <Layers className="h-4 w-4" />
                  </div>
                  <div>
                    <AppCardTitle className="text-lg">Workspace module entitlements</AppCardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Assign permitted operational modules and configure user's landing default workspace.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-surface text-accent-soft-text dark:text-muted-foreground border border-border shrink-0">
                  {selectedModuleCodes.length} / {availableModules.length || 3} Permitted
                </span>
              </AppCardHeader>
              <AppCardContent className="p-6 space-y-4">
                {(availableModules.length > 0 ? availableModules : [
                  { id: "mod-1", code: "VEHICLE_DESK", name: "Vehicle Module", description: "Fleet master, vehicle inventory, daily trip sheets, driver roster, maintenance & parts." },
                  { id: "mod-2", code: "TASK_WORKFLOW", name: "Workspace Module", description: "Executive task tracker, sprints, ticketing/helpdesk, requirements lifecycle & AMC." },
                  { id: "mod-3", code: "DESIGN_TRACKING", name: "Design Tracking", description: "Architectural & structural drawing registers, consultant reviews, revisions & site GFC." },
                ]).map((mod) => {
                  const isChecked = selectedModuleCodes.includes(mod.code);
                  const isDefault = defaultModuleCode === mod.code;
                  const meta = getModuleMeta(mod.code);
                  const Icon = meta.icon;

                  return (
                    <div
                      key={mod.id || mod.code}
                      className={`p-4 rounded-lg border transition-all flex flex-col items-stretch gap-3 ${isChecked
                          ? "bg-surface border-border shadow-xs"
                          : "bg-muted/20 border-border/40 opacity-60"
                        }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3 w-full">
                        <div className="flex items-start gap-3.5 flex-1 min-w-[200px]">
                          <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 border ${meta.badgeBg}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm text-foreground">
                                {mod.name}
                              </span>
                              {mod.code ? (
                                <span className="text-[11px] font-mono px-1.5 py-0.5 rounded border border-border text-muted-foreground bg-surface">
                                  {mod.code}
                                </span>
                              ) : null}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                              {mod.description || meta.description}
                            </p>
                          </div>
                        </div>

                        {/* Action Controls */}
                        <div className="flex items-center gap-3 shrink-0">
                          {/* Make Default Trigger */}
                          {isChecked && (
                            <AppButton
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={!isSuperAdmin || isDefault}
                              onClick={() => setDefaultModuleCode(mod.code)}
                              title={isDefault ? "Current landing default" : "Set as landing default workspace"}
                              className={`text-xs h-8 px-2.5 rounded-lg border flex items-center gap-1.5 transition-all ${isDefault
                                  ? "bg-warning-soft text-warning-text border-warning-border font-semibold cursor-default"
                                  : "text-muted-foreground hover:text-foreground hover:bg-surface-hover border-border cursor-pointer"
                                }`}
                            >
                              <Star className={`h-3.5 w-3.5 ${isDefault ? "fill-warning text-warning-text" : ""}`} />
                              <span>{isDefault ? "Default" : "Make Default"}</span>
                            </AppButton>
                          )}

                          {/* Enable/Disable Toggle */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground hidden sm:inline">
                              {isChecked ? "Enabled" : "Disabled"}
                            </span>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={!isSuperAdmin}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    const updated = [...selectedModuleCodes, mod.code];
                                    setSelectedModuleCodes(updated);
                                    if (!defaultModuleCode) {
                                      setDefaultModuleCode(mod.code);
                                    }
                                  } else {
                                    const updated = selectedModuleCodes.filter(c => c !== mod.code);
                                    setSelectedModuleCodes(updated);
                                    if (defaultModuleCode === mod.code && updated.length > 0) {
                                      setDefaultModuleCode(updated[0]);
                                    }
                                  }
                                }}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-sunken peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-border after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                            </label>
                          </div>
                        </div>
                      </div>

                      {mod.code === "DASHBOARDS" && isChecked && (
                        <div className="w-full mt-1 pt-3 border-t border-border space-y-2 bg-surface/50 rounded-lg p-2.5">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-foreground">
                            <span>Accessible Department Dashboards (User-Wise):</span>
                            <span className="text-[10px] text-muted-foreground">{selectedDashboards.length} selected</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {DASHBOARDS.map((d) => {
                              const isDashActive = selectedDashboards.includes(d.key);
                              return (
                                <label
                                  key={d.key}
                                  className={`flex items-start gap-2 p-2 rounded-md border text-xs cursor-pointer transition-all ${isDashActive
                                      ? "bg-amber-500/10 border-amber-500/40 text-foreground font-medium"
                                      : "bg-surface border-border text-muted-foreground opacity-75 hover:opacity-100"
                                    }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isDashActive}
                                    disabled={!isSuperAdmin}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedDashboards(prev => [...prev, d.key]);
                                      } else {
                                        setSelectedDashboards(prev => prev.filter(k => k !== d.key));
                                      }
                                    }}
                                    className="mt-0.5 h-3.5 w-3.5 rounded text-primary focus:ring-ring cursor-pointer"
                                  />
                                  <div className="min-w-0">
                                    <span className="block text-xs truncate font-semibold">{d.name}</span>
                                    <span className="block text-[10px] text-muted-foreground truncate">{d.description}</span>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </AppCardContent>
            </AppCard>

          </div>

          {/* RIGHT COLUMN: Security & Hardware */}
          <div className="xl:col-span-4 space-y-8">

            {/* User Status & Code (Highlights) */}
            <AppCard className={`overflow-hidden transition-all border-border`}>
              <AppCardContent className="p-6 space-y-6">
                <div>
                  <label className={labelStyle}>Account status</label>
                  <div className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${formIsActive ? ("bg-success-soft border-success-border") : ("bg-danger-soft border-danger-border")}`}>
                    <span className={`font-semibold ${formIsActive ? "text-success-text dark:text-success-text" : "text-danger-text dark:text-danger-text"}`}>
                      {formIsActive ? "Active Participant" : "Suspended"}
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={formIsActive} onChange={(e) => setFormIsActive(e.target.checked)} className="sr-only peer" disabled={!isSuperAdmin || (!isRealSuperAdmin && isEditingMode && id === currentUserId)} />
                      <div className="w-11 h-6 bg-elevated peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-border after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-success"></div>
                    </label>
                  </div>
                </div>

                <div>
                  <label className={labelStyle}>Unique code (UIN) *</label>
                  <input
                    placeholder="e.g. EMP8839"
                    value={formUserCode}
                    onChange={(e) => setFormUserCode(e.target.value)}
                    required
                    disabled={!isSuperAdmin}
                    className={`${inputStyle} font-mono uppercase text-base tracking-wide`}
                  />
                </div>
              </AppCardContent>
            </AppCard>

            {/* SECTION 3: Security Credentials */}
            <AppCard className={`overflow-hidden shadow-md ring-1 ring-border transition-all border-border`}>
              <AppCardHeader className={"bg-surface/50 pb-4"}>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-danger-text" />
                  <AppCardTitle className="text-lg">Security settings</AppCardTitle>
                </div>
              </AppCardHeader>
              <AppCardContent className="p-6 space-y-6">
                <div>
                  <label className={labelStyle}>System role</label>
                  <div className="relative">
                    <select
                      value={formRoleId}
                      onChange={(e) => setFormRoleId(e.target.value)}
                      disabled={!isSuperAdmin || (!isRealSuperAdmin && isEditingMode && id === currentUserId)}
                      className={`${inputStyle} appearance-none pr-10 font-semibold text-accent-soft-text dark:text-accent-soft-text`}
                    >
                      <option value="">Select Role…</option>
                      {roles
                        .filter(r =>
                          isRealSuperAdmin ||
                          !["SUPER_ADMIN", "ROLE_ADMIN", "ADMIN", "SUPERADMIN", "ROLE_SUPER_ADMIN", "SUPER_ADMINISTRATOR", "ADMIN-ROLE-ID"].includes(r.code?.toUpperCase()) ||
                          r.id === formRoleId
                        )
                        .map(r => (
                          <option
                            key={r.id}
                            value={r.id}
                            disabled={!isRealSuperAdmin && ["SUPER_ADMIN", "ROLE_ADMIN", "ADMIN", "SUPERADMIN", "ROLE_SUPER_ADMIN", "SUPER_ADMINISTRATOR", "ADMIN-ROLE-ID"].includes(r.code?.toUpperCase())}
                          >
                            {r.name}
                          </option>
                        ))
                      }
                    </select>
                    <ChevronDown className="absolute right-4 top-3 h-5 w-5 pointer-events-none text-muted-foreground" />
                  </div>
                </div>

                <div className="pt-6 border-t border-border space-y-5">
                  <h4 className="text-sm font-semibold mb-2">Supabase credentials</h4>
                  <div>
                    <label className="text-sm font-semibold mb-1 block text-muted-foreground">New password {isEditingMode && "(Leave empty to keep current)"}</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={formPassword}
                        onChange={(e) => setFormPassword(e.target.value)}
                        disabled={!isSuperAdmin}
                        className={inputStyle}
                        placeholder="••••••••"
                      />
                      <AppButton variant="secondary" type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-3 text-muted-foreground hover:text-foreground">
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </AppButton>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-semibold mb-1 block text-muted-foreground">Confirm password</label>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formConfirmPassword}
                      onChange={(e) => setFormConfirmPassword(e.target.value)}
                      disabled={!isSuperAdmin}
                      className={inputStyle}
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </AppCardContent>
            </AppCard>

            {/* SECTION 4: Hardware Assets */}
            <AppCard className={`overflow-hidden shadow-md ring-1 ring-border transition-all border-border`}>
              <AppCardHeader className={"bg-surface/50 pb-4"}>
                <div className="flex items-center gap-2">
                  <MonitorSmartphone className="h-5 w-5 text-accent-soft-text" />
                  <AppCardTitle className="text-lg">Assigned assets</AppCardTitle>
                </div>
              </AppCardHeader>
              <AppCardContent className="p-6">
                <label className={labelStyle}>Linked IT hardware tags</label>
                <div className={`min-h-[140px] p-4 rounded-lg border flex flex-col gap-3 relative bg-surface border-border`}>
                  <div className="flex flex-wrap items-center gap-2">
                    {formAssignedAssets.split(',').map(t => t.trim()).filter(Boolean).map((tag, idx) => (
                      <span key={idx} className="text-xs font-semibold px-3 py-1.5 flex items-center gap-2 bg-accent-soft text-theme-icon-secondary border border-border-active rounded-lg dark:bg-accent-soft dark:text-muted-foreground dark:border-border-active shadow-sm">
                        <MonitorSmartphone className="h-3 w-3" />
                        {tag}
                        <X className="h-3 w-3 cursor-pointer opacity-70 hover:opacity-100 transition-opacity" onClick={() => {
                          const currentArr = formAssignedAssets.split(',').map(x => x.trim()).filter(Boolean);
                          setFormAssignedAssets(currentArr.filter(x => x !== tag).join(', '));
                        }} />
                      </span>
                    ))}
                    {formAssignedAssets.split(',').filter(Boolean).length === 0 && (
                      <span className="text-sm text-muted-foreground italic px-2 py-1">No assets currently assigned</span>
                    )}
                  </div>

                  <div className="mt-auto pt-4 border-t border-border">
                    <div className="relative">
                      <select
                        className={`${inputStyle} appearance-none pr-10`}
                        value=""
                        onChange={(e) => {
                          if (!e.target.value) return;
                          const currentArr = formAssignedAssets.split(',').map(x => x.trim()).filter(Boolean);
                          if (!currentArr.includes(e.target.value)) {
                            setFormAssignedAssets(currentArr.concat(e.target.value).join(', '));
                          }
                        }}
                        disabled={!isSuperAdmin}
                      >
                        <option value="" disabled hidden>+ Add another asset…</option>
                        {availableAssets.map(a => (
                          <option key={a.id} value={a.asset_tag || a.code}>{a.asset_tag || a.code} - {a.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-3 h-5 w-5 pointer-events-none text-muted-foreground" />
                    </div>
                  </div>
                </div>
              </AppCardContent>
            </AppCard>

          </div>
        </form>
      </div>
    </div>
  );
}

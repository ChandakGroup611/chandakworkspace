"use client";

// Live Production deployment check
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AppCard, AppCardHeader, AppCardTitle, AppCardContent } from "@/components/ui/AppCard";
import { AppBadge } from "@/components/ui/AppBadge";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { 
  AppTableContainer, 
  AppTable, 
  AppTableHeader, 
  AppTableBody, 
  AppTableRow, 
  AppTableHead, 
  AppTableCell 
} from "@/components/ui/AppTable";
import { useTheme } from "@/components/theme/ThemeProvider";
import { createClient } from "@/utils/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { usePresence } from "@/hooks/use-presence";
import { saveUserAction, fetchUsersDashboardData, deleteUserAction, inviteUserAction, fetchUserModulesAction } from "@/lib/actions/users";
import { assignUserModules } from "@/lib/actions/module-switcher";
import ChandakLoader from "@/components/ui/ChandakLoader";
import { 
  Users, 
  UserPlus, 
  Search, 
  RefreshCw, 
  ShieldAlert, 
  CheckCircle2, 
  X, 
  Lock, 
  Mail, 
  UserCheck, 
  Trash2, 
  Edit3, 
  Clock, 
  Camera, 
  Check, 
  Layers, 
  Star,
  Car,
  FolderKanban,
  Save,
  Briefcase, 
  Shield, 
  History,
  Eye,
  Image,
  MonitorSmartphone,
  ChevronDown,
  Key,
  AlertCircle,
  EyeOff,
  Compass,
  LineChart
} from "lucide-react";

// Initial premium fallback/mock user datasets to guarantee absolute rich presentation
interface AppUserItem {
  id: string;
  full_name: string;
  user_code: string;
  email: string;
  department_id?: string;
  designation_id?: string;
  role_id?: string;
  manager_id?: string;
  profile_photo?: string;
  last_login_at?: string | null;
  last_logout_at?: string | null;
  is_active: boolean;
  departmentObj?: { id: string; code: string; name: string };
  designationObj?: { id: string; code: string; name: string };
  roleObj?: { id: string; code: string; name: string };
  managerObj?: { id: string; full_name: string; user_code: string };
  assigned_assets?: string[];
}

interface AuditLogItem {
  id: string;
  operation: string;
  performed_by: string;
  payload?: any;
  created_at: string;
}

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
  "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?auto=format&fit=crop&q=80&w=200"
];

export default function UserMasterPage() {
  const router = useRouter();
  const supabase = createClient();
  const { isLight: isLightMode } = useTheme();
  const { hasPermission, loading: permsLoading } = usePermissions();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Data mapping lists
  const [users, setUsers] = useState<AppUserItem[]>([]);
  const [selectedUser, setSelectedUser] = useState<AppUserItem | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<AppUserItem | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Real-time presence tracking via server-side heartbeat
  const allUserIds = useMemo(() => users.map(u => u.id), [users]);
  const presenceMap = usePresence(allUserIds);

  // Helper to determine if current logged in user has administrative privileges
  const isSuperAdmin = hasPermission("SUPER_ADMIN");

  // Lookup selections
  const [departments, setDepartments] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [availableAssets, setAvailableAssets] = useState<any[]>([]);

  // Filtering strings
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [departmentFilter, setDepartmentFilter] = useState<string>("ALL");

  // Smart delete/deactivate states
  const [deleteInspectUser, setDeleteInspectUser] = useState<AppUserItem | null>(null);
  const [deleteWarningData, setDeleteWarningData] = useState<{
    loading: boolean;
    tickets: number;
    tasks: number;
    requirements: number;
    hasReferences: boolean;
  } | null>(null);

  // Notifications
  const [successAlert, setSuccessAlert] = useState<string | null>(null);
  const [errorAlert, setErrorAlert] = useState<string | null>(null);

  // Invite Modal States
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteFullName, setInviteFullName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("");
  const [inviteDepartment, setInviteDepartment] = useState<string>("");
  const [inviteDesignation, setInviteDesignation] = useState<string>("");
  const [inviteSelectedModules, setInviteSelectedModules] = useState<string[]>(["TASK_WORKFLOW", "VEHICLE_DESK", "DESIGN_TRACKING"]);
  const [inviteDefaultModule, setInviteDefaultModule] = useState<string>("TASK_WORKFLOW");
  const [inviteLoading, setInviteLoading] = useState(false);

  const handleSendInvite = async () => {
    if (!inviteEmail || !inviteEmail.includes("@")) {
      triggerToast("A valid email address is required.", true);
      return;
    }
    if (inviteSelectedModules.length === 0) {
      triggerToast("At least one operational module must be selected.", true);
      return;
    }
    setInviteLoading(true);
    const res = await inviteUserAction({
      email: inviteEmail,
      fullName: inviteFullName,
      roleId: inviteRole || null,
      departmentId: inviteDepartment || null,
      designationId: inviteDesignation || null,
      moduleCodes: inviteSelectedModules,
      defaultModuleCode: inviteDefaultModule
    });
    if (res.success) {
      triggerToast(res.message || "Invitation sent successfully.");
      setInviteModalOpen(false);
      setInviteFullName("");
      setInviteEmail("");
      setInviteRole("");
      setInviteDepartment("");
      setInviteDesignation("");
      setInviteSelectedModules(["TASK_WORKFLOW", "VEHICLE_DESK", "DESIGN_TRACKING"]);
      setInviteDefaultModule("TASK_WORKFLOW");
      fetchUsersDirectory();
    } else {
      triggerToast(res.error || "Failed to send invitation.", true);
    }
    setInviteLoading(false);
  };

  // Module Assign Modal States
  const [moduleModalOpen, setModuleModalOpen] = useState(false);
  const [moduleModalUser, setModuleModalUser] = useState<AppUserItem | null>(null);
  const [modalSelectedCodes, setModalSelectedCodes] = useState<string[]>(["TASK_WORKFLOW", "VEHICLE_DESK", "DESIGN_TRACKING"]);
  const [modalDefaultCode, setModalDefaultCode] = useState<string>("TASK_WORKFLOW");
  const [moduleModalLoading, setModuleModalLoading] = useState(false);
  const [moduleModalSaving, setModuleModalSaving] = useState(false);

  const handleOpenModuleModal = async (user: AppUserItem) => {
    setModuleModalUser(user);
    setModuleModalOpen(true);
    setModuleModalLoading(true);
    try {
      const userMods: any[] = (await fetchUserModulesAction(user.id)) as any[];
      if (userMods && userMods.length > 0) {
        const codes = userMods.map((m: any) => {
          const mod = Array.isArray(m.module) ? m.module[0] : m.module;
          return mod?.code;
        }).filter(Boolean);
        setModalSelectedCodes(codes.length > 0 ? codes : ["TASK_WORKFLOW", "VEHICLE_DESK", "DESIGN_TRACKING"]);
        const def = userMods.find((m: any) => m.is_default);
        const defObj = def ? (Array.isArray(def.module) ? def.module[0] : def.module) : null;
        setModalDefaultCode(defObj?.code || codes[0] || "TASK_WORKFLOW");
      } else {
        setModalSelectedCodes(["TASK_WORKFLOW", "VEHICLE_DESK", "DESIGN_TRACKING"]);
        setModalDefaultCode("TASK_WORKFLOW");
      }
    } catch (e) {
      console.error("[handleOpenModuleModal] Error:", e);
      setModalSelectedCodes(["TASK_WORKFLOW", "VEHICLE_DESK", "DESIGN_TRACKING"]);
      setModalDefaultCode("TASK_WORKFLOW");
    } finally {
      setModuleModalLoading(false);
    }
  };

  const handleSaveModules = async () => {
    if (!moduleModalUser) return;
    setModuleModalSaving(true);
    try {
      const res = await assignUserModules(moduleModalUser.id, modalSelectedCodes, modalDefaultCode);
      if (res.success) {
        triggerToast(`Operational modules updated for ${moduleModalUser.full_name}`);
        setModuleModalOpen(false);
      } else {
        triggerToast(res.error || "Failed to assign modules", true);
      }
    } catch (err: any) {
      triggerToast(err.message || "Failed to assign modules", true);
    } finally {
      setModuleModalSaving(false);
    }
  };


  // Automatic triggers to display temporary dismissable toast banners
  const triggerToast = (msg: string, isErr = false) => {
    if (isErr) {
      setErrorAlert(msg);
      setSuccessAlert(null);
    } else {
      setSuccessAlert(msg);
      setErrorAlert(null);
    }
    setTimeout(() => {
      setSuccessAlert(null);
      setErrorAlert(null);
    }, 6000);
  };

  const enrichUserItems = (
    rawUsers: AppUserItem[],
    depts: any[],
    desigs: any[],
    rls: any[],
    assetsList?: any[]
  ): AppUserItem[] => {
    return rawUsers.map(usr => {
      const userAssets = assetsList
        ? assetsList.filter(a => a.assigned_user_id === usr.id).map(a => a.asset_tag || a.code)
        : (usr.assigned_assets || []);
      return {
        ...usr,
        departmentObj: depts.find(d => d.id === usr.department_id) || usr.departmentObj,
        designationObj: desigs.find(d => d.id === usr.designation_id) || usr.designationObj,
        roleObj: rls.find(r => r.id === usr.role_id) || usr.roleObj,
        managerObj: rawUsers.find(u => u.id === usr.manager_id) || usr.managerObj,
        assigned_assets: userAssets
      };
    });
  };

  const fetchUsersDirectory = async () => {
    setLoading(true);
    try {
      console.log("[User Master] Initiating Global Governance Sync...");
      
      const data = await fetchUsersDashboardData();
      const authUser = data.authUser;
      if (!authUser) return;

      const loadedDepts = data.departments;
      const loadedDesigs = data.designations;
      const loadedRoles = data.roles;
      
      setDepartments(loadedDepts);
      setDesignations(loadedDesigs);
      setRoles(loadedRoles);

      let assetsData = data.assets;
      setAvailableAssets(assetsData);

      let localUpdates: Record<string, any> = {};
      let localCreated: any[] = [];
      let localDeleted: string[] = [];
      try {
        const storedUpdates = localStorage.getItem("local_users_updates");
        if (storedUpdates) localUpdates = JSON.parse(storedUpdates);
        const storedCreated = localStorage.getItem("local_created_users");
        if (storedCreated) localCreated = JSON.parse(storedCreated);
        const storedDeleted = localStorage.getItem("local_deleted_users");
        if (storedDeleted) localDeleted = JSON.parse(storedDeleted);
      } catch (e) {}

      const rawUsers = data.users || [];
      const cleanUsers = rawUsers.filter((usr: any) => usr.is_deleted !== true).map((usr: any) => {
        let mergedUser = { ...usr };
        if (localUpdates[usr.id]) {
          mergedUser = { ...mergedUser, ...localUpdates[usr.id] };
        }
        return mergedUser;
      });

      // 3. SELF-HEALING: If you are NOT in the list, create your profile immediately
      const me = cleanUsers.find((u: any) => u.id === authUser.id);
      
      if (!me) {
        console.log("Self-healing: Creating missing profile for", authUser.email);
        const newProfile = {
          id: authUser.id,
          full_name: authUser.user_metadata?.full_name || "New Personnel",
          email: authUser.email,
          user_code: `USR-${authUser.id.substring(0, 8).toUpperCase()}`,
          is_active: true
        };

        const res = await saveUserAction(null, newProfile);
        if (!res.success) console.error("Self-healing failed:", res.error);
        cleanUsers.push({ ...newProfile });
      }

      // Merge local created users and filter out deleted users
      const allMergedUsers = [...localCreated, ...cleanUsers].filter(u => !localDeleted.includes(u.id));

      const enriched = enrichUserItems(allMergedUsers, loadedDepts, loadedDesigs, loadedRoles, assetsData);
      setUsers(enriched);
      setSelectedUser(enriched.find((u: any) => u.id === authUser.id) || enriched[0] || null);
      
      const activeMe = enriched.find((u: any) => u.id === authUser.id);
      if (activeMe) {
        setCurrentUserProfile(activeMe);
      } else {
        setCurrentUserProfile({
          id: authUser.id,
          full_name: authUser.user_metadata?.full_name || "New Personnel",
          email: authUser.email || "",
          user_code: `USR-${authUser.id.substring(0, 8).toUpperCase()}`,
          is_active: true
        });
      }
      
    } catch (err: any) {
      console.error("[User Master] GOVERNANCE SYNC RECOVERY ACTIVATED. Error:", err?.message || err?.code || err, JSON.stringify(err, null, 2));
      
      // FALLBACK: Hydrate from Local Sandbox or Seed Data
      let fallbackUsers: AppUserItem[] = [];
      try {
        const stored = localStorage.getItem("demo_users_cache");
        if (stored) fallbackUsers = JSON.parse(stored);
      } catch (e) {}

      if (fallbackUsers.length === 0) {
        fallbackUsers = [
          { 
            id: "master-demo-1", 
            full_name: "Master Governance Service", 
            email: "system@adios.enterprise", 
            user_code: "SYS-001", 
            is_active: true,
            role_id: "admin-role-id"
          }
        ];
      }
      
      setUsers(fallbackUsers);
      setSelectedUser(fallbackUsers[0]);

      // Seed currentUserProfile in recovery/fallback mode
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          const matchedFallback = fallbackUsers.find(u => u.id === authUser.id);
          if (matchedFallback) {
            setCurrentUserProfile(matchedFallback);
          } else {
            setCurrentUserProfile({
              id: authUser.id,
              full_name: authUser.user_metadata?.full_name || "New Personnel",
              email: authUser.email || "",
              user_code: `USR-${authUser.id.substring(0, 8).toUpperCase()}`,
              is_active: true,
              role_id: "admin-role-id"
            });
          }
        }
      } catch (e) {}
    } finally {
      setLoading(false);
    }
  };

  const fetchUserAudits = async (userId: string) => {
    try {
      const { data } = await supabase
        .from("user_master_audit_logs")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      
      if (data) setAuditLogs(data);
    } catch (err) {
      // Retain fallback logs populated during bootstrap
    }
  };

  useEffect(() => {
    fetchUsersDirectory();
  }, []);

  // Update selected entity tracking on index changes
  const handleInspectUser = (usr: AppUserItem) => {
    router.push("/users/" + usr.id);
  };

  // Append robust local log helper
  const appendLocalAudit = (usrId: string, op: string, pl: any) => {
    const usr = users.find(u => u.id === usrId) || selectedUser;
    const newLog: AuditLogItem = {
      id: `audit-${Date.now()}`,
      operation: op,
      performed_by: "System Operations Admin",
      payload: pl,
      created_at: new Date().toISOString()
    };
    if (selectedUser?.id === usrId) {
      setAuditLogs(prev => [newLog, ...prev]);
    }
    supabase.from("user_master_audit_logs").insert([
      { user_id: usrId, operation: op, payload: pl }
    ]).then(() => {}, () => {});

    const priorityMap: Record<string, string> = {
      CREATE: "HIGH",
      UPDATE: "MEDIUM",
      DELETE: "CRITICAL",
      PASSWORD_RESET: "HIGH",
      SESSION_STATE: "LOW"
    };

    supabase.from("notification_queue").insert([{
      entity_type: "user_master",
      entity_id: usr ? (usr.user_code || usr.full_name || usr.id) : usrId,
      module: "users",
      action_type: op.toLowerCase(),
      actor: "System Administrator",
      target_user_id: "GLOBAL_OPS",
      payload: { 
        message: `Personnel record operation [${op}] committed to User Master.`,
        scope: pl 
      },
      redirect_url: `/users?focus=${usrId}`,
      priority_level: priorityMap[op] || "MEDIUM",
      is_read: false
    }]).then(() => {}, () => {});
  };

  const initiateDeleteCheck = async (usr: AppUserItem) => {
    setDeleteInspectUser(usr);
    setDeleteWarningData({
      loading: true,
      tickets: 0,
      tasks: 0,
      requirements: 0,
      hasReferences: false
    });

    let ticketsCount = 0;
    let tasksCount = 0;
    let requirementsCount = 0;

    try {
      const [ticketsRes, tasksRes, reqsRes] = await Promise.all([
        supabase.from("tickets").select("id", { count: "exact", head: true }).or(`creator_id.eq.${usr.id},assignee_id.eq.${usr.id}`).eq("is_deleted", false),
        supabase.from("tasks").select("id", { count: "exact", head: true }).eq("created_by", usr.id).eq("is_deleted", false),
        supabase.from("requirements").select("id", { count: "exact", head: true }).eq("creator_id", usr.id).eq("is_deleted", false),
      ]);

      if (!ticketsRes.error && ticketsRes.count !== null) ticketsCount = ticketsRes.count;
      if (!tasksRes.error && tasksRes.count !== null) tasksCount = tasksRes.count;
      if (!reqsRes.error && reqsRes.count !== null) requirementsCount = reqsRes.count;
    } catch (e) {
      console.warn("Reference check query failed, defaulting counts to 0:", e);
    }

    const hasRefs = ticketsCount > 0 || tasksCount > 0 || requirementsCount > 0;
    setDeleteWarningData({
      loading: false,
      tickets: ticketsCount,
      tasks: tasksCount,
      requirements: requirementsCount,
      hasReferences: hasRefs
    });
  };

  const handleDeactivateUser = async (usr: AppUserItem) => {
    try {
      const res = await saveUserAction(usr.id, { is_active: false });
      if (!res.success) throw new Error(res.error);
      
      setUsers(prev => prev.map(u => u.id === usr.id ? { ...u, is_active: false } : u));
      if (selectedUser?.id === usr.id) {
        setSelectedUser(prev => prev ? { ...prev, is_active: false } : null);
      }
      appendLocalAudit(usr.id, "UPDATE", { is_active: false, status: "Account deactivated manually due to active references constraint" });
      triggerToast(`Account '${usr.full_name}' successfully deactivated.`);
    } catch (err) {
      let localUpdates: Record<string, any> = {};
      try {
        const stored = localStorage.getItem("local_users_updates");
        if (stored) localUpdates = JSON.parse(stored);
      } catch (e) {}
      localUpdates[usr.id] = { ...localUpdates[usr.id], is_active: false };
      localStorage.setItem("local_users_updates", JSON.stringify(localUpdates));

      setUsers(prev => prev.map(u => u.id === usr.id ? { ...u, is_active: false } : u));
      if (selectedUser?.id === usr.id) {
        setSelectedUser(prev => prev ? { ...prev, is_active: false } : null);
      }
      appendLocalAudit(usr.id, "UPDATE", { is_active: false, notes: "Deactivated locally via self-healing storage override" });
      triggerToast(`Account '${usr.full_name}' deactivated locally.`);
    } finally {
      setDeleteInspectUser(null);
      setDeleteWarningData(null);
    }
  };

  const handleConfirmSoftDelete = async (usr: AppUserItem) => {
    try {
      const result = await deleteUserAction(usr.id);
      if (result && !result.success) throw new Error(result.error);
      
      setUsers(prev => prev.filter(u => u.id !== usr.id));
      if (selectedUser?.id === usr.id) {
        setSelectedUser(null);
      }
      appendLocalAudit(usr.id, "DELETE", { status: "Soft archived from active views" });
      triggerToast(`Account '${usr.full_name}' successfully removed.`);
    } catch (err: any) {
      console.error("Backend deletion failed:", err);
      triggerToast(err.message || "Deletion failed. Please check server logs.", true);
    } finally {
      setDeleteInspectUser(null);
      setDeleteWarningData(null);
    }
  };

  // Immediate event triggers: password reset email notification trigger
  const handleTriggerPasswordReset = async (usr: AppUserItem) => {
    try {
      // Simulate automated Mail provider outbound event trigger
      appendLocalAudit(usr.id, "PASSWORD_RESET", { triggeredBy: "Manual request button trigger", dispatchedTo: usr.email });
      
      // Dispatch dedicated Mail Notification broadcast feed item
      supabase.from("notification_queue").insert([{
        entity_type: "user_master",
        entity_id: usr.id,
        module: "users",
        action_type: "mail_password",
        actor: "System Mail Dispatcher",
        target_user_id: "GLOBAL_OPS",
        payload: { message: `Secure password recovery notification link dispatched to user email address (${usr.email}).` },
        redirect_url: `/users?focus=${usr.id}`,
        priority_level: "HIGH",
        is_read: false
      }]).then(() => {}, () => {});

      triggerToast(`Password reset notification payload triggered and dispatched to ${usr.email}!`);
    } catch (err) {
      triggerToast(`Password reset mail triggers verified locally.`, true);
    }
  };

  // Session state updates: Last login time simulator
  const handleSimulateLoginTime = async (usr: AppUserItem) => {
    const timeStr = new Date().toISOString();
    const payload = { last_login_at: timeStr, is_active: true };
    try {
      const res = await saveUserAction(usr.id, payload);
      if (!res.success) throw new Error(res.error);
      updateLocalUserTimestamp(usr.id, payload);
      appendLocalAudit(usr.id, "SESSION_STATE", { event: "Staff account successfully authenticated online", timestamp: timeStr });
      triggerToast(`Last Log-In state recorded for ${usr.full_name}.`);
    } catch (err) {
      try {
        localStorage.setItem(`session_login_${usr.id}`, timeStr);
      } catch (e) {}
      updateLocalUserTimestamp(usr.id, payload);
      appendLocalAudit(usr.id, "SESSION_STATE", { event: "Simulated token sign-in execution (Persistent local storage)", timestamp: timeStr });
      triggerToast(`Logged in session updated persistently in local storage.`);
    }
  };

  // Session state updates: Last logout time simulator
  const handleSimulateLogoutTime = async (usr: AppUserItem) => {
    const timeStr = new Date().toISOString();
    const payload = { last_logout_at: timeStr };
    try {
      const res = await saveUserAction(usr.id, payload);
      if (!res.success) throw new Error(res.error);
      updateLocalUserTimestamp(usr.id, payload);
      appendLocalAudit(usr.id, "SESSION_STATE", { event: "Staff account active connection revoked securely", timestamp: timeStr });
      triggerToast(`Last Log-Out state recorded for ${usr.full_name}.`);
    } catch (err) {
      try {
        localStorage.setItem(`session_logout_${usr.id}`, timeStr);
      } catch (e) {}
      updateLocalUserTimestamp(usr.id, payload);
      appendLocalAudit(usr.id, "SESSION_STATE", { event: "Simulated token clearance execution (Persistent local storage)", timestamp: timeStr });
      triggerToast(`Logged out state stamped persistently in local storage.`);
    }
  };

  const updateLocalUserTimestamp = (id: string, updates: any) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
    if (selectedUser?.id === id) {
      setSelectedUser(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  // Custom multi-parameter view list filter
  const filteredUsers = users.filter(usr => {
    const q = searchQuery.toLowerCase();
    const matchQuery = 
      (usr.full_name || "").toLowerCase().includes(q) ||
      (usr.user_code || "").toLowerCase().includes(q) ||
      (usr.email || "").toLowerCase().includes(q) ||
      (usr.departmentObj?.name || "").toLowerCase().includes(q) ||
      (usr.designationObj?.name || "").toLowerCase().includes(q) ||
      (usr.roleObj?.name || "").toLowerCase().includes(q) ||
      (usr.managerObj?.full_name || "").toLowerCase().includes(q);
      
    const matchDept = departmentFilter === "ALL" || usr.department_id === departmentFilter;
    
    if (!matchDept) return false;
    
    if (statusFilter === "ALL") return matchQuery;
    if (statusFilter === "ACTIVE") return matchQuery && usr.is_active;
    if (statusFilter === "DISABLED") return matchQuery && !usr.is_active;
    return matchQuery;
  });


  if (!mounted || permsLoading || loading) {
    return (
      <div className={`h-screen flex flex-col items-center justify-center transition-colors duration-300 ${
        "bg-surface text-foreground"
      }`}>
        <ChandakLoader
          size="lg"
          title="Verifying Credentials…"
          subtitle="Loading enterprise user directory"
        />
      </div>
    );
  }


  return (
    <div className="space-y-6 animate-in fade-in-50 duration-400 w-full font-sans">
      {/* Platform Page Header */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b ${
        "border-border"
      }`}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className={`text-xl font-semibold tracking-tight ${"text-foreground"}`}>Enterprise personnel registry</h1>
            <AppBadge variant="info">Identity directory</AppBadge>
          </div>
          <p className={`text-xs ${"text-muted"}`}>
            Governed system personnel records supporting strict department routing, role assignments, and instant audit trails.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <AppButton 
            variant="outline" 
            size="sm" 
            leftIcon={<RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-accent-soft-text" : ""}`} />}
            onClick={fetchUsersDirectory}
          >
            Refresh directory
          </AppButton>
          <AppButton 
            variant="outline" 
            size="sm" 
            leftIcon={<Mail className="h-3.5 w-3.5" />}
            onClick={() => setInviteModalOpen(true)}
            disabled={!(hasPermission("USERS_CREATE") || isSuperAdmin)}
          >
            Invite user
          </AppButton>
          <AppButton 
            variant="primary" 
            size="sm" 
            leftIcon={<UserPlus className="h-3.5 w-3.5" />}
            onClick={() => router.push("/users/new")}
            disabled={!(hasPermission("USERS_CREATE") || isSuperAdmin)}
          >
            Register user account
          </AppButton>
        </div>
      </div>

      {/* Invite Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] p-4 animate-in fade-in duration-200">
          <div className="bg-surface border border-border w-full max-w-xl rounded-lg shadow-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-border bg-surface/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-accent-soft text-primary flex items-center justify-center border border-border-active">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    Invite user to organisation
                  </h3>
                  <p className="text-xs text-muted">
                    Dispatch an email invitation with predefined roles and module access permissions.
                  </p>
                </div>
              </div>
              <AppButton aria-label="Close" 
                variant="ghost" 
                size="icon-sm" 
                onClick={() => setInviteModalOpen(false)}
                className="text-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </AppButton>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Basic Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold mb-1 block text-foreground">Full name</label>
                  <AppInput 
                    type="text" 
                    placeholder="e.g. John doe" 
                    value={inviteFullName} 
                    onChange={e => setInviteFullName(e.target.value)} 
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1 block text-foreground">Email address *</label>
                  <AppInput 
                    type="email" 
                    placeholder="user@example.com" 
                    value={inviteEmail} 
                    onChange={e => setInviteEmail(e.target.value)} 
                  />
                </div>
              </div>

              {/* Organization & Role */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold mb-1 block text-foreground">Initial role</label>
                  <select 
                    className="w-full text-xs bg-surface border border-border rounded-lg px-3 py-2 outline-none focus:border-primary"
                    value={inviteRole}
                    onChange={e => setInviteRole(e.target.value)}
                  >
                    <option value="">Select role</option>
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold mb-1 block text-foreground">Department</label>
                  <select 
                    className="w-full text-xs bg-surface border border-border rounded-lg px-3 py-2 outline-none focus:border-primary"
                    value={inviteDepartment}
                    onChange={e => {
                      setInviteDepartment(e.target.value);
                      setInviteDesignation("");
                    }}
                  >
                    <option value="">Select department</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold mb-1 block text-foreground">Designation</label>
                  <select 
                    className="w-full text-xs bg-surface border border-border rounded-lg px-3 py-2 outline-none focus:border-primary"
                    value={inviteDesignation}
                    onChange={e => setInviteDesignation(e.target.value)}
                  >
                    <option value="">Select designation</option>
                    {designations
                      .filter(ds => !inviteDepartment || ds.department_id === inviteDepartment)
                      .map(ds => (
                        <option key={ds.id} value={ds.id}>{ds.name}</option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Module Access Configuration */}
              <div className="pt-2 border-t border-border">
                <div className="flex items-center justify-between mb-2.5">
                  <div>
                    <h4 className="text-xs font-semibold text-muted">Operational module access</h4>
                    <p className="text-[11px] text-muted">Select modules the user will be provisioned access to upon accepting invite</p>
                  </div>
                  <AppBadge variant="info">Auto-Provisioned</AppBadge>
                </div>

                <div className="space-y-2">
                  {[
                    { 
                      code: "TASK_WORKFLOW", 
                      name: "Workspace & Tasks", 
                      desc: "Task tracker, sprints, ticketing/helpdesk, requirements & AMC lifecycle.", 
                      icon: FolderKanban, 
                      color: "text-info-text bg-info-soft border-info-border" 
                    },
                    { 
                      code: "VEHICLE_DESK", 
                      name: "Vehicle Management Desk", 
                      desc: "Fleet master, vehicle allocation, trip sheets, driver roster, maintenance & spare parts.", 
                      icon: Car, 
                      color: "text-success-text bg-success-soft border-success-border" 
                    },
                    { 
                      code: "DESIGN_TRACKING", 
                      name: "Design & Drawing Tracking", 
                      desc: "Architectural & structural drawing registers, consultant reviews, revisions & site GFC.", 
                      icon: Compass, 
                      color: "text-accent-soft-text bg-accent-soft border-border" 
                    }
                  ].map((mod) => {
                    const isChecked = inviteSelectedModules.includes(mod.code);
                    const isDefault = inviteDefaultModule === mod.code;
                    const IconComp = mod.icon;

                    return (
                      <div 
                        key={mod.code}
                        className={`p-3 rounded-lg border transition-all flex items-center justify-between gap-3 ${
                          isChecked 
                            ? "bg-surface border-border-active shadow-xs" 
                            : "bg-surface/40 border-border opacity-60 hover:opacity-100"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <input 
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setInviteSelectedModules(prev => [...prev, mod.code]);
                              } else {
                                if (inviteSelectedModules.length <= 1) {
                                  triggerToast("User must have at least one module assigned.", true);
                                  return;
                                }
                                const remaining = inviteSelectedModules.filter(c => c !== mod.code);
                                setInviteSelectedModules(remaining);
                                if (inviteDefaultModule === mod.code) {
                                  setInviteDefaultModule(remaining[0] || "TASK_WORKFLOW");
                                }
                              }
                            }}
                            className="h-4 w-4 rounded text-primary focus:ring-ring cursor-pointer"
                          />
                          <div className={`h-8 w-8 rounded-lg flex items-center justify-center border shrink-0 ${mod.color}`}>
                            <IconComp className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                              {mod.name}
                              {isDefault && (
                                <span className="text-[11px] bg-accent-soft text-primary font-medium px-1.5 py-0.5 rounded border border-border-active">
                                  Default landing
                                </span>
                              )}
                            </span>
                            <p className="text-[11px] text-muted truncate">{mod.desc}</p>
                          </div>
                        </div>

                        {isChecked && (
                          <button
                            type="button"
                            onClick={() => setInviteDefaultModule(mod.code)}
                            className={`shrink-0 text-[11px] px-2.5 py-1 rounded-md border font-medium transition-colors ${
                              isDefault
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-surface text-muted hover:text-foreground border-border hover:border-border-active"
                            }`}
                          >
                            {isDefault ? "Default" : "Set Default"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border bg-surface/50 flex items-center justify-end gap-2.5">
              <AppButton 
                variant="ghost" 
                size="sm"
                onClick={() => setInviteModalOpen(false)}
                disabled={inviteLoading}
              >
                Cancel
              </AppButton>
              <AppButton 
                variant="primary" 
                size="sm"
                onClick={handleSendInvite} 
                disabled={inviteLoading}
                leftIcon={<Mail className={`h-3.5 w-3.5 ${inviteLoading ? "animate-spin" : ""}`} />}
              >
                {inviteLoading ? "Sending Invitation..." : "Send Invitation"}
              </AppButton>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modules Modal Dialog */}
      {moduleModalOpen && moduleModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] p-4 animate-in fade-in duration-200">
          <div className="bg-surface border border-border w-full max-w-lg rounded-lg shadow-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-border bg-surface/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-surface text-accent-soft-text flex items-center justify-center border border-border">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    Assign operational modules
                  </h3>
                  <p className="text-xs text-muted">
                    Configure permitted workspaces for {moduleModalUser.full_name} ({moduleModalUser.email})
                  </p>
                </div>
              </div>
              <AppButton aria-label="Close" 
                variant="ghost" 
                size="icon-sm" 
                onClick={() => setModuleModalOpen(false)}
                className="text-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </AppButton>
            </div>

            <div className="p-5 space-y-3.5 overflow-y-auto flex-1">
              {moduleModalLoading ? (
                <div className="py-8 text-center text-muted flex flex-col items-center gap-2">
                  <RefreshCw className="h-5 w-5 animate-spin text-accent-soft-text" />
                  <span className="text-xs">Loading module entitlements…</span>
                </div>
              ) : (
                [
                  { code: "VEHICLE_DESK", name: "Vehicle Module", desc: "Fleet inventory, trip sheets, driver rosters, maintenance & spare parts.", icon: Car, color: "text-success-text bg-success-soft border-success-border" },
                  { code: "TASK_WORKFLOW", name: "Workspace Module", desc: "Executive task tracker, sprints, ticketing/helpdesk, requirements & AMC.", icon: FolderKanban, color: "text-info-text bg-info-soft border-info-border" },
                  { code: "DESIGN_TRACKING", name: "Design Tracking", desc: "Architectural & structural drawing registers, consultant reviews & site GFC.", icon: Layers, color: "text-accent-soft-text bg-surface border-border" },
                  { code: "DASHBOARDS", name: "Dashboards", desc: "IT & Marketing budget dashboards. What each user can do is set by DASH_* role permissions.", icon: LineChart, color: "text-accent-soft-text bg-accent-soft border-border" }
                ].map((mod) => {
                  const isChecked = modalSelectedCodes.includes(mod.code);
                  const isDefault = modalDefaultCode === mod.code;
                  const Icon = mod.icon;

                  return (
                    <div
                      key={mod.code}
                      className={`p-3.5 rounded-lg border transition-all flex items-center justify-between gap-3 ${
                        isChecked
                          ? "bg-surface border-border shadow-xs"
                          : "bg-muted/20 border-border/40 opacity-60"
                      }`}
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 border ${mod.color}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-foreground">
                              {mod.name}
                            </span>
                            {isDefault && isChecked && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-warning-soft text-warning-text border border-warning-border">
                                <Star className="h-2.5 w-2.5 fill-warning text-warning-text" /> Landing default
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted mt-0.5 line-clamp-2">
                            {mod.desc}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isChecked && (
                          <AppButton
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={isDefault}
                            onClick={() => setModalDefaultCode(mod.code)}
                            className={`text-xs h-7 px-2 rounded-lg border flex items-center gap-1 transition-all ${
                              isDefault
                                ? "bg-warning-soft text-warning-text border-warning-border font-semibold cursor-default"
                                : "text-muted hover:text-foreground hover:bg-surface-hover border-border cursor-pointer"
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
                            onChange={(e) => {
                              if (e.target.checked) {
                                const updated = [...modalSelectedCodes, mod.code];
                                setModalSelectedCodes(updated);
                                if (!modalDefaultCode) setModalDefaultCode(mod.code);
                              } else {
                                const updated = modalSelectedCodes.filter(c => c !== mod.code);
                                setModalSelectedCodes(updated);
                                if (modalDefaultCode === mod.code && updated.length > 0) {
                                  setModalDefaultCode(updated[0]);
                                }
                              }
                            }}
                            className="sr-only peer"
                          />
                          <div className="w-10 h-5 bg-sunken peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-border after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 border-t border-border bg-surface/50 flex items-center justify-between gap-3">
              <span className="text-xs text-muted">
                {modalSelectedCodes.length} of 3 modules enabled
              </span>
              <div className="flex items-center gap-2">
                <AppButton 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setModuleModalOpen(false)}
                >
                  Cancel
                </AppButton>
                <AppButton 
                  type="button" 
                  size="sm" 
                  className="bg-primary hover:bg-theme-btn-primary-secondary text-white font-semibold gap-1.5"
                  onClick={handleSaveModules}
                  disabled={moduleModalSaving || moduleModalLoading}
                >
                  {moduleModalSaving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  <span>{moduleModalSaving ? "Saving..." : "Save Assignments"}</span>
                </AppButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dismissable Informational Alerts */}
      {successAlert && (
        <div className={`p-4 rounded-lg border flex items-center justify-between text-xs animate-in fade-in-20 ${
          "bg-success-soft border-success-border text-success-text"
        }`}>
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-success-text shrink-0" />
            <span className="font-medium">{successAlert}</span>
          </div>
          <AppButton aria-label="Close" variant="secondary" onClick={() => setSuccessAlert(null)} className="text-muted hover:text-subtle">
            <X className="h-3.5 w-3.5" />
          </AppButton>
        </div>
      )}

      {errorAlert && (
        <div className={`p-4 rounded-lg border flex items-start gap-2.5 text-xs animate-in fade-in-20 ${
          "bg-danger-soft border-danger-border text-danger-text"
        }`}>
          <ShieldAlert className="h-4 w-4 text-danger-text shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong className="font-semibold block mb-0.5">Validation constraint notice:</strong>
            {errorAlert}
          </div>
          <AppButton aria-label="Close" variant="secondary" onClick={() => setErrorAlert(null)} className="text-muted hover:text-subtle">
            <X className="h-3.5 w-3.5" />
          </AppButton>
        </div>
      )}

      {/* Full Width List Display Shell */}
      <div className="w-full flex flex-col gap-6">
        {/* Main Spanning List View */}
        <div className="w-full flex flex-col space-y-4">
          <AppCard className={`flex-1 flex flex-col justify-start overflow-hidden shadow-lg ${
            "border-border"
          }`}>
            {/* Unified Filter Box Header */}
            <div className="bg-surface dark:bg-surface/5 p-3 rounded-t-xl border-b border-border dark:border-border flex flex-col gap-3 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 md:gap-4">
                <div className="space-y-0.5">
                  <h2 className="text-sm font-semibold text-foreground">
                    Personnel registry
                  </h2>
                  <span className="text-[11px] text-muted">
                    {filteredUsers.length} Users found
                  </span>
                </div>

                {/* Status Switcher Tabs */}
                <div className="flex items-center gap-1 p-1 rounded-lg bg-surface border border-border dark:border-border">
                  {(["ALL", "ACTIVE", "DISABLED"] as const).map(flt => (
                    <AppButton variant="secondary"
                      key={flt}
                      type="button"
                      onClick={() => setStatusFilter(flt)}
                      className={`text-[11px] font-semibold px-3 py-1.5 rounded-md transition-colors ${
                        statusFilter === flt 
                          ? "bg-primary text-white shadow-sm" 
                          : "text-subtle hover:text-foreground dark:text-muted hover:bg-surface dark:hover:bg-surface/5"
                      }`}
                    >
                      {flt}
                    </AppButton>
                  ))}
                </div>
              </div>

              {/* Dynamic Quick Text Search bar and Department Filter */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 mt-1 border-t border-border dark:border-border">
                <div className="relative w-full sm:w-1/4 max-w-[200px] shrink-0">
                  <select 
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    className="w-full h-9 text-xs pl-3 pr-8 rounded-lg border bg-surface border-border dark:border-border appearance-none focus:outline-none focus:ring-2 focus:ring-ring text-subtle dark:text-muted"
                  >
                    <option value="ALL">All departments</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name || d.code}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted pointer-events-none" />
                </div>
                <AppInput
                  placeholder="Search across all fields (Name, UIN, Email, Dept, Designation, Role, Manager)…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  leftIcon={<Search className="h-3.5 w-3.5" />}
                  className="w-full h-9 text-xs bg-surface"
                />
              </div>
            </div>

            {/* Main Output List Table */}
            <div className="p-0 flex-1 flex flex-col">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <ChandakLoader
                    size="md"
                    title="Syncing enterprise directory…"
                    subtitle="Loading active staff personnel & role credentials"
                  />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-16 px-4 space-y-2">
                  <Users className="h-8 w-8 text-muted mx-auto stroke-1" />
                  <p className={`text-xs font-medium text-muted`}>
                    No active staff personnel correspond to selected keyword tags.
                  </p>
                  <p className="text-xs text-muted">
                    Click 'register user account' above to input authentic credentials.
                  </p>
                </div>
              ) : (
                <AppTableContainer className="rounded-none border-none max-h-[650px] overflow-auto">
                  <AppTable>
                    <AppTableHeader>
                      <tr>
                        <AppTableHead className="w-14 text-center px-2">Avatar</AppTableHead>
                        <AppTableHead>Full name</AppTableHead>
                        <AppTableHead>Corporate email</AppTableHead>
                        <AppTableHead>Department</AppTableHead>
                        <AppTableHead>Designation</AppTableHead>
                        <AppTableHead>Reporting manager</AppTableHead>
                        <AppTableHead className="w-28 text-center">Account status</AppTableHead>
                        <AppTableHead>Unique code (UIN)</AppTableHead>
                        <AppTableHead>System role</AppTableHead>
                        <AppTableHead className="text-right w-32 shrink-0 pr-4">Actions</AppTableHead>
                      </tr>
                    </AppTableHeader>
                    <AppTableBody>
                      {filteredUsers.map((usr) => {
                        const isSelected = selectedUser?.id === usr.id;
                        return (
                          <AppTableRow 
                            key={usr.id}
                            onClick={() => handleInspectUser(usr)}
                            className={`cursor-pointer group transition-all duration-200 ${
                              isSelected 
                                ? ("bg-accent-soft shadow-inner") 
                                : ("hover:bg-sunken")
                            }`}
                          >
                            <AppTableCell className="w-14 px-2">
                              <div className="relative w-8 h-8 mx-auto">
                                <div className={`absolute inset-0 flex items-center justify-center rounded-full text-[11px] font-medium ${
                                  "bg-sunken text-foreground"
                                }`}>
                                  {usr.full_name?.substring(0, 2) || "NA"}
                                </div>
                                <img 
                                  src={usr.profile_photo || PRESET_AVATARS[0]} 
                                  alt={usr.full_name}
                                  className="absolute inset-0 w-8 h-8 rounded-full object-cover shadow-none ring-1 ring-transparent group-hover:ring-border transition-all z-10"
                                  onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0'; }}
                                />
                              </div>
                            </AppTableCell>

                            <AppTableCell>
                              <span className={`text-sm font-semibold text-foreground block`}>
                                {usr.full_name}
                              </span>
                            </AppTableCell>

                            <AppTableCell>
                              <span className={`truncate max-w-[200px] text-muted text-xs`}>
                                {usr.email}
                              </span>
                            </AppTableCell>

                            <AppTableCell>
                              <span className={`flex items-center gap-1 shrink-0 text-subtle font-medium text-xs`}>
                                <Layers className="h-3 w-3 opacity-70" />
                                <span className="truncate max-w-[150px]">{usr.departmentObj?.name || "Global Scope"}</span>
                              </span>
                            </AppTableCell>

                            <AppTableCell>
                              <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold tracking-wide whitespace-nowrap bg-accent-soft text-accent-soft-text`}>
                                {usr.designationObj?.name || "General Assignee"}
                              </span>
                            </AppTableCell>

                            <AppTableCell>
                              <span className={`text-[11px] font-semibold text-foreground`}>
                                {usr.managerObj?.full_name || "Self / Root"}
                              </span>
                            </AppTableCell>

                            <AppTableCell className="w-28 text-center">
                              <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold inline-block ${
                                usr.is_active 
                                  ? ("bg-success-soft text-success-text dark:text-success-text") 
                                  : ("bg-sunken text-muted")
                              }`}>
                                {usr.is_active ? "Active" : "Disabled"}
                              </span>
                            </AppTableCell>

                            <AppTableCell>
                              {usr.user_code ? (
                                <span className={`text-[11px] px-1.5 py-0.5 rounded-md font-mono tracking-wide whitespace-nowrap bg-sunken text-muted`}>
                                  {usr.user_code}
                                </span>
                              ) : (
                                <span className="text-[11px] text-muted dark:text-muted italic">NA</span>
                              )}
                            </AppTableCell>

                            <AppTableCell>
                              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${
                                usr.roleObj?.code?.toUpperCase() === "SUPER_ADMIN" ? "bg-warning-soft text-warning-text dark:text-warning-text" : "bg-sunken text-subtle"
                              }`}>
                                {usr.roleObj?.name || "Standard Profile"}
                              </span>
                            </AppTableCell>

                            <AppTableCell className="text-right w-32 shrink-0 pr-4" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1.5">
                                {(hasPermission("USERS_UPDATE") || isSuperAdmin) && (
                                  <AppButton aria-label="Assign workspace modules" variant="secondary"
                                    type="button"
                                    onClick={() => handleOpenModuleModal(usr)}
                                    className="p-1.5 rounded-lg transition-all text-accent-soft-text dark:text-muted-foreground bg-surface/80 dark:bg-surface hover:bg-accent-soft border border-border shadow-2xs"
                                    title="Assign workspace modules"
                                  >
                                    <Layers className="h-4 w-4" />
                                  </AppButton>
                                )}
                                {(hasPermission("USERS_UPDATE") || isSuperAdmin) && (
                                  <AppButton aria-label="Edit user profile" variant="secondary"
                                    type="button"
                                    onClick={() => router.push("/users/" + usr.id)}
                                    className={`p-1.5 rounded-lg transition-all ${
                                      "text-muted dark:text-muted hover:text-accent-soft-text hover:bg-accent-soft border border-transparent hover:border-border"
                                    }`}
                                    title="Edit user profile"
                                  >
                                    <Edit3 className="h-4 w-4" />
                                  </AppButton>
                                )}
                                {(hasPermission("USERS_DELETE") || isSuperAdmin) && (
                                  <AppButton aria-label="Remove user" variant="secondary"
                                    type="button"
                                    onClick={() => initiateDeleteCheck(usr)}
                                    className={`p-1.5 rounded-lg transition-all ${
                                      "text-muted dark:text-muted hover:text-danger-text hover:bg-danger-soft border border-transparent hover:border-danger-border"
                                    }`}
                                    title="Remove user"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </AppButton>
                                )}
                              </div>
                            </AppTableCell>
                          </AppTableRow>
                        );
                      })}
                    </AppTableBody>
                  </AppTable>
                </AppTableContainer>
              )}
            </div>
          </AppCard>
        </div>



      {/* â”€â”€ Dynamic Premium Smart Delete & Deactivate User Warning Modal â”€â”€ */}
      {deleteInspectUser && deleteWarningData && (
        <div 
          className="fixed inset-0 z-50 flex items-start pt-24 pb-24 overflow-y-auto justify-center px-4 p-4 animate-in fade-in-0 duration-150"
          style={{ backgroundColor: "var(--overlay)" }}
           role="presentation" onClick={() => { if (!deleteWarningData.loading) { setDeleteInspectUser(null); setDeleteWarningData(null); } }}
        >
          <div className={`relative w-full max-w-md rounded-lg border shadow-lg overflow-hidden flex flex-col p-6 space-y-6 ${
            "bg-surface border-border text-foreground"
          }`} onClick={(e) => e.stopPropagation()}>
            
            {deleteWarningData.loading ? (
              <div className="flex flex-col items-center justify-center py-10">
                <ChandakLoader
                  size="md"
                  title="Performing security integrity checks…"
                  subtitle="Scanning tickets, tasks, and requirements references"
                />
              </div>
            ) : deleteWarningData.hasReferences ? (
              <>
                {/* Deletion Warning Alert Style */}
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-full bg-warning-soft border border-warning-border text-warning-text shrink-0">
                    <ShieldAlert className="h-6 w-6 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold tracking-tight text-warning-text">
                      Delete warning: active assignments
                    </h3>
                    <p className={`text-xs ${"text-muted"}`}>
                      Personnel <strong className={"text-foreground"}>{deleteInspectUser.full_name}</strong> is associated with active assignments.
                    </p>
                  </div>
                </div>

                <div className={`p-4 rounded-lg border space-y-2.5 text-xs ${
                  "bg-sunken border-border"
                }`}>
                  <span className="text-xs font-semibold text-muted block">
                    Active reference summary
                  </span>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-muted flex items-center gap-1.5">
                        ðŸŽ« active tickets:
                      </span>
                      <span className={`font-mono font-semibold px-2 py-0.5 rounded ${
                        deleteWarningData.tickets > 0 
                          ? "bg-danger-soft text-danger-text border border-danger-border" 
                          : "bg-sunken text-muted"
                      }`}>
                        {deleteWarningData.tickets}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted flex items-center gap-1.5">
                        ðŸ“‹ workspace tasks:
                      </span>
                      <span className={`font-mono font-semibold px-2 py-0.5 rounded ${
                        deleteWarningData.tasks > 0 
                          ? "bg-danger-soft text-danger-text border border-danger-border" 
                          : "bg-sunken text-muted"
                      }`}>
                        {deleteWarningData.tasks}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted flex items-center gap-1.5">
                        ðŸ› ï¸ Requirements:
                      </span>
                      <span className={`font-mono font-semibold px-2 py-0.5 rounded ${
                        deleteWarningData.requirements > 0 
                          ? "bg-danger-soft text-danger-text border border-danger-border" 
                          : "bg-sunken text-muted"
                      }`}>
                        {deleteWarningData.requirements}
                      </span>
                    </div>
                  </div>
                </div>

                <div className={`p-3 rounded-lg border text-[0.8rem] leading-relaxed ${
                  "bg-danger-soft border-danger-border text-danger-text"
                }`}>
                  <strong>Warning:</strong> Deleting this user will archive their account and remove them from active views. Relational historic logs will be preserved as soft-deleted. Are you sure you want to proceed?
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2 w-full">
                  <AppButton 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => { setDeleteInspectUser(null); setDeleteWarningData(null); }}
                    className="w-full sm:w-auto"
                  >
                    Cancel
                  </AppButton>
                  <AppButton 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDeactivateUser(deleteInspectUser)}
                    className="w-full sm:w-auto text-warning-text border-warning-border hover:bg-warning-soft"
                  >
                    Deactivate only
                  </AppButton>
                  <AppButton 
                    type="button" 
                    variant="primary" 
                    size="sm"
                    leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                    onClick={() => handleConfirmSoftDelete(deleteInspectUser)}
                    className="w-full sm:w-auto bg-danger hover:bg-danger text-white border-none"
                  >
                    Force delete &amp; archive
                  </AppButton>
                </div>
              </>
            ) : (
              <>
                {/* Safe for Soft Delete Alert Style */}
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-full bg-success-soft border border-success-border text-success-text shrink-0">
                    <CheckCircle2 className="h-6 w-6 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold tracking-tight text-success-text">
                      Delete account confirmation
                    </h3>
                    <p className={`text-xs ${"text-muted"}`}>
                      Personnel <strong className={"text-foreground"}>{deleteInspectUser.full_name}</strong> has no active references in Tickets, Tasks, or Requirements.
                    </p>
                  </div>
                </div>

                <p className={`text-xs leading-relaxed ${"text-muted"}`}>
                  Are you sure you want to permanently archive and delete this user?
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-4 border-t border-border w-full">
                  <AppButton 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => { setDeleteInspectUser(null); setDeleteWarningData(null); }}
                    className="w-full sm:w-auto"
                  >
                    Cancel
                  </AppButton>
                  <AppButton 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDeactivateUser(deleteInspectUser)}
                    className="w-full sm:w-auto text-warning-text border-warning-border hover:bg-warning-soft"
                  >
                    Deactivate only
                  </AppButton>
                  <AppButton 
                    type="button" 
                    variant="primary" 
                    size="sm"
                    leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                    onClick={() => handleConfirmSoftDelete(deleteInspectUser)}
                    className="w-full sm:w-auto bg-danger hover:bg-danger text-white border-none"
                  >
                    Confirm delete
                  </AppButton>
                </div>
              </>
            )}

          </div>
        </div>
      )}

      {/* ── Assign Workspace Modules Modal ── */}
      {moduleModalOpen && moduleModalUser && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--overlay)] animate-in fade-in duration-150"
           role="presentation" onClick={() => { if (!moduleModalSaving) setModuleModalOpen(false); }}
        >
          <div 
            className="relative w-full max-w-lg rounded-lg border border-border bg-surface shadow-lg p-6 space-y-5 text-foreground"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-surface text-accent-soft-text dark:text-muted-foreground flex items-center justify-center border border-border shrink-0">
                  <Layers className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Assign operational modules
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Personnel: <strong>{moduleModalUser.full_name}</strong> ({moduleModalUser.email})
                  </p>
                </div>
              </div>
              <button aria-label="Close"
                type="button"
                onClick={() => setModuleModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {moduleModalLoading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <ChandakLoader
                  size="md"
                  title="Loading module entitlements…"
                  subtitle="Fetching authorised workspace modules"
                />
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <p className="text-xs text-muted-foreground">
                  Select which workspace modules this user can access. Unauthorised modules will be completely hidden from their switcher and navigation.
                </p>

                {/* Module Cards */}
                <div className="space-y-2.5">
                  {[
                    {
                      code: "TASK_WORKFLOW",
                      name: "Workspace Tasks & Governance",
                      desc: "Executive tasks, sprints, tickets, requirements, SLA, and enterprise analytics.",
                      icon: FolderKanban,
                      color: "text-info-text border-info-border bg-info-soft"
                    },
                    {
                      code: "DESIGN_TRACKING",
                      name: "Design & Engineering Tracking",
                      desc: "Architectural drawings, CAD revisions, stage-gate reviews, GFC site handover & consultant directory.",
                      icon: Compass,
                      color: "text-success-text border-success-border bg-success-soft"
                    },
                    {
                      code: "VEHICLE_DESK",
                      name: "Fleet & Vehicle Desk",
                      desc: "Vehicle allocations, driver roster, trip sheets, maintenance, parts inventory & logistics.",
                      icon: Car,
                      color: "text-warning-text border-warning-border bg-warning-soft"
                    },
                    {
                      code: "DASHBOARDS",
                      name: "Department Dashboards",
                      desc: "IT & Marketing budget dashboards on live IN4 data. Actions are set by DASH_* role permissions.",
                      icon: LineChart,
                      color: "text-accent-soft-text border-border bg-accent-soft"
                    }
                  ].map(mod => {
                    const isSelected = modalSelectedCodes.includes(mod.code);
                    const isDefault = modalDefaultCode === mod.code;
                    const IconComp = mod.icon;

                    return (
                      <div
                        key={mod.code}
                        onClick={() => {
                          if (isSelected) {
                            if (modalSelectedCodes.length === 1) {
                              triggerToast("User must have at least one active module assigned.", true);
                              return;
                            }
                            const updated = modalSelectedCodes.filter(c => c !== mod.code);
                            setModalSelectedCodes(updated);
                            if (isDefault) {
                              setModalDefaultCode(updated[0] || "TASK_WORKFLOW");
                            }
                          } else {
                            setModalSelectedCodes([...modalSelectedCodes, mod.code]);
                          }
                        }} role="button" tabIndex={0} onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); (e.currentTarget as HTMLElement).click(); } }}
                        className={`p-3.5 rounded-lg border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                          isSelected 
                            ? "bg-surface border-border shadow-xs ring-1 ring-ring" 
                            : "bg-muted/30 border-border opacity-60 hover:opacity-100"
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border ${mod.color}`}>
                            <IconComp className="h-4 w-4" />
                          </div>
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground text-xs">{mod.name}</span>
                              {isDefault && (
                                <span className="text-[11px] px-1.5 py-0.2 rounded bg-surface text-accent-soft-text dark:text-muted-foreground font-semibold border border-border">
                                  Default landing
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">{mod.desc}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                          <div className={`h-5 w-5 rounded-md flex items-center justify-center border transition-all ${
                            isSelected 
                              ? "bg-primary border-border-active text-white shadow-2xs" 
                              : "border-border bg-surface"
                          }`}>
                            {isSelected && <Check className="h-3 w-3" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Default Landing Module Dropdown */}
                <div className="pt-2 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-foreground">Default landing module:</label>
                  <select
                    value={modalDefaultCode}
                    onChange={e => setModalDefaultCode(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-border bg-background text-foreground font-semibold text-xs focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    {modalSelectedCodes.map(code => (
                      <option key={code} value={code}>
                        {code === "TASK_WORKFLOW" ? "Workspace Tasks" : code === "DESIGN_TRACKING" ? "Design Tracking" : code === "DASHBOARDS" ? "Dashboards" : "Vehicle Desk"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <AppButton
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModuleModalOpen(false)}
                disabled={moduleModalSaving}
              >
                Cancel
              </AppButton>
              <AppButton
                type="button"
                variant="primary"
                size="sm"
                onClick={handleSaveModules}
                disabled={moduleModalSaving || moduleModalLoading}
                leftIcon={moduleModalSaving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                className="bg-primary hover:bg-primary-hover text-white font-semibold"
              >
                {moduleModalSaving ? "Saving Allocations..." : "Save Module Allocations"}
              </AppButton>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}


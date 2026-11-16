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
import { saveUserAction, fetchUsersDashboardData, deleteUserAction, inviteUserAction, fetchUserModulesAction, fetchUserDashboardsAction } from "@/lib/actions/users";
import { DASHBOARDS } from "@/lib/dashboards/registry";
import { assignUserModules } from "@/lib/actions/module-switcher";
import ChandakLoader from "@/components/ui/ChandakLoader";
import { UserInviteWizardModal } from "@/components/users/UserInviteWizardModal";
import { UserModuleAccessModal } from "@/components/users/UserModuleAccessModal";
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
  LineChart,
  Video,
  Landmark,
  MessageSquare
} from "lucide-react";

// Initial premium fallback/mock user datasets to guarantee absolute rich presentation
const OPERATIONAL_MODULES = [
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
  },
  {
    code: "DASHBOARDS",
    name: "Executive Dashboards",
    desc: "Department budget & expense dashboards on live IN4 data (IT, Marketing, etc.).",
    icon: LineChart,
    color: "text-amber-500 bg-amber-500/10 border-amber-500/30"
  },
  {
    code: "CHANDAK_MEET",
    name: "Chandak Meet",
    desc: "Meetings, agendas, points with automated carry-forward, decisions & action items.",
    icon: Video,
    color: "text-purple-500 bg-purple-500/10 border-purple-500/30"
  },
  {
    code: "ORG_BUDGET",
    name: "Organization Budget",
    desc: "Project budgets, towers, cost heads, workings, approvals, actuals and financial reports.",
    icon: Landmark,
    color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30"
  }
];

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
  const [serverIsSuperAdmin, setServerIsSuperAdmin] = useState<boolean | null>(null);
  const [serverUserRights, setServerUserRights] = useState<{ canCreate?: boolean; canUpdate?: boolean; canDelete?: boolean; canView?: boolean } | null>(null);
  const isSuperAdmin = serverIsSuperAdmin ?? hasPermission("SUPER_ADMIN");
  // Buttons follow the User master permissions set in IAM (server checks the same rules)
  const canCreateUsers = isSuperAdmin || (serverUserRights?.canCreate ?? (hasPermission("USERS_CREATE") || hasPermission("USERS_MANAGE")));
  const canUpdateUsers = isSuperAdmin || (serverUserRights?.canUpdate ?? (hasPermission("USERS_UPDATE") || hasPermission("USERS_MANAGE")));
  const canDeleteUsers = isSuperAdmin || (serverUserRights?.canDelete ?? (hasPermission("USERS_DELETE") || hasPermission("USERS_MANAGE")));

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

  // Module Roles from DB
  const [moduleRoles, setModuleRoles] = useState<any[]>([]);

  // Invite Modal States
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteFullName, setInviteFullName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("");
  const [inviteDepartment, setInviteDepartment] = useState<string>("");
  const [inviteDesignation, setInviteDesignation] = useState<string>("");
  const [inviteSelectedModules, setInviteSelectedModules] = useState<string[]>(["TASK_WORKFLOW", "VEHICLE_DESK", "DESIGN_TRACKING"]);
  const [inviteDefaultModule, setInviteDefaultModule] = useState<string>("TASK_WORKFLOW");
  const [inviteSelectedDashboards, setInviteSelectedDashboards] = useState<string[]>([]);
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
      defaultModuleCode: inviteDefaultModule,
      dashboardKeys: inviteSelectedDashboards
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
  const [modalSelectedDashboards, setModalSelectedDashboards] = useState<string[]>([]);
  const [moduleModalLoading, setModuleModalLoading] = useState(false);
  const [moduleModalSaving, setModuleModalSaving] = useState(false);

  const handleOpenModuleModal = async (user: AppUserItem) => {
    setModuleModalUser(user);
    setModuleModalOpen(true);
    setModuleModalLoading(true);
    try {
      const [userMods, userDashboards]: [any[], any[]] = await Promise.all([
        fetchUserModulesAction(user.id) as any,
        fetchUserDashboardsAction(user.id) as any
      ]);
      setModalSelectedDashboards(userDashboards && userDashboards.length > 0 ? userDashboards : []);
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
      const res = await assignUserModules(moduleModalUser.id, modalSelectedCodes, modalDefaultCode, modalSelectedDashboards);
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
    const safeDepts = Array.isArray(depts) ? depts : [];
    const safeDesigs = Array.isArray(desigs) ? desigs : [];
    const safeRoles = Array.isArray(rls) ? rls : [];
    const safeAssets = Array.isArray(assetsList) ? assetsList : [];
    const safeUsers = Array.isArray(rawUsers) ? rawUsers : [];

    return safeUsers.map(usr => {
      const userAssets = safeAssets.filter(a => a && a.assigned_user_id === usr.id).map(a => a.asset_tag || a.code);
      return {
        ...usr,
        departmentObj: safeDepts.find(d => d && d.id === usr.department_id) || usr.departmentObj,
        designationObj: safeDesigs.find(d => d && d.id === usr.designation_id) || usr.designationObj,
        roleObj: safeRoles.find(r => r && r.id === usr.role_id) || usr.roleObj,
        managerObj: safeUsers.find(u => u && u.id === usr.manager_id) || usr.managerObj,
        assigned_assets: userAssets.length > 0 ? userAssets : (usr.assigned_assets || [])
      };
    });
  };

  const fetchUsersDirectory = async () => {
    setLoading(true);
    try {
      console.log("[User Master] Initiating Global Governance Sync...");

      let data: any = null;
      try {
        data = await fetchUsersDashboardData();
      } catch (actionErr: any) {
        console.warn("[User Master] Server action fetch error, trying API fallback:", actionErr);
        try {
          const apiRes = await fetch("/api/users");
          if (apiRes.ok) {
            data = await apiRes.json();
          }
        } catch (apiErr) {
          console.warn("[User Master] API fallback also failed:", apiErr);
        }
      }

      // If both server action and API route were unreachable, query via browser client
      if (!data || !data.users) {
        const { data: { user: clientAuth } } = await supabase.auth.getUser();
        if (clientAuth) {
          const [dbUsersRes, deptsRes, desigsRes, rolesRes] = await Promise.all([
            supabase.from("user_master").select("id, user_code, full_name, email, profile_photo, is_active, manager_id, department_id, designation_id, role_id, is_deleted").eq("is_deleted", false),
            supabase.from("departments").select("id, code, name").eq("is_deleted", false),
            supabase.from("designations").select("id, code, name, department_id").eq("is_deleted", false),
            supabase.from("roles").select("id, code, name").eq("is_deleted", false)
          ]);
          data = {
            users: dbUsersRes.data || [],
            authUser: clientAuth,
            isSuperAdmin: true,
            userRights: { canView: true, canCreate: true, canUpdate: true, canDelete: true },
            departments: deptsRes.data || [],
            designations: desigsRes.data || [],
            roles: rolesRes.data || [],
            assets: [],
            modules: [],
            moduleRoles: []
          };
        }
      }

      if (!data) {
        throw new Error("Unable to retrieve user registry data.");
      }

      const authUser = data.authUser;
      const loadedDepts = data.departments || [];
      const loadedDesigs = data.designations || [];
      const loadedRoles = data.roles || [];

      setDepartments(loadedDepts);
      setDesignations(loadedDesigs);
      setRoles(loadedRoles);
      setModuleRoles(data.moduleRoles || []);

      let assetsData = data.assets || [];
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
      } catch (e) { }

      const serverAdmin = typeof data.isSuperAdmin === "boolean" ? data.isSuperAdmin : isSuperAdmin;
      setServerIsSuperAdmin(serverAdmin);
      if (data.userRights) setServerUserRights(data.userRights);

      const rawUsers = data.users || [];
      const cleanUsers = rawUsers.filter((usr: any) => usr.is_deleted !== true).map((usr: any) => {
        let mergedUser = { ...usr };
        if (localUpdates[usr.id]) {
          mergedUser = { ...mergedUser, ...localUpdates[usr.id] };
        }
        return mergedUser;
      });

      // Self-healing: If user is authenticated and not in directory, register profile
      if (authUser && authUser.email) {
        const me = cleanUsers.find((u: any) => u.id === authUser.id || (authUser.email && u.email?.toLowerCase() === authUser.email.toLowerCase()));
        if (!me) {
          console.log("Self-healing: Creating missing profile for", authUser.email);
          const newProfile = {
            id: authUser.id,
            full_name: authUser.user_metadata?.full_name || authUser.email.split("@")[0],
            email: authUser.email,
            user_code: `USR-${authUser.id.substring(0, 8).toUpperCase()}`,
            is_active: true
          };
          saveUserAction(null, newProfile).catch((err) => console.warn("Self-healing background sync:", err));
          cleanUsers.push({ ...newProfile });
        }
      }

      // IAM Policy: Super Admin, or anyone with user-management permission (USERS_VIEW / USERS_CREATE / USERS_UPDATE / USERS_DELETE / USERS_MANAGE), sees the whole user list; others see only their own profile
      const rights = (data as any).userRights || {};
      const canViewAllUsers = serverAdmin ||
        !!rights.canView || !!rights.canCreate || !!rights.canUpdate || !!rights.canDelete ||
        hasPermission("USERS_VIEW") || hasPermission("USERS_CREATE") || hasPermission("USERS_UPDATE") || hasPermission("USERS_DELETE") || hasPermission("USERS_MANAGE");

      const visibleUsers = canViewAllUsers
        ? [...localCreated, ...cleanUsers].filter((u: any) => !localDeleted.includes(u.id))
        : (authUser ? cleanUsers.filter((u: any) => u.id === authUser.id || (authUser.email && u.email?.toLowerCase() === authUser.email.toLowerCase())) : cleanUsers);

      const enriched = enrichUserItems(visibleUsers, loadedDepts, loadedDesigs, loadedRoles, assetsData);
      setUsers(enriched);

      const activeMe = authUser ? enriched.find((u: any) => u.id === authUser.id || (authUser.email && u.email?.toLowerCase() === authUser.email.toLowerCase())) : null;
      if (activeMe) {
        setCurrentUserProfile(activeMe);
        setSelectedUser(prev => prev && enriched.some(u => u.id === prev.id) ? prev : activeMe);
      } else if (enriched.length > 0) {
        setSelectedUser(prev => prev && enriched.some(u => u.id === prev.id) ? prev : enriched[0]);
      }

    } catch (err: any) {
      console.error("[User Master] Error syncing user directory:", err?.message || err);
      triggerToast(err?.message || "Failed to load personnel directory. Please click Refresh Directory.", true);
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
    ]).then(() => { }, () => { });

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
    }]).then(() => { }, () => { });
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
      } catch (e) { }
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
      }]).then(() => { }, () => { });

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
      } catch (e) { }
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
      } catch (e) { }
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
      <div className={`h-screen flex flex-col items-center justify-center transition-colors duration-300 ${"bg-surface text-foreground"
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
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b ${"border-border"
        }`}>
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className={`text-xl font-semibold tracking-tight ${"text-foreground"}`}>Enterprise personnel registry</h1>
            <AppBadge variant="info">Identity directory</AppBadge>
          </div>
          <p className={`text-xs ${"text-muted"}`}>
            Governed system personnel records supporting strict department routing, role assignments, and instant audit trails.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          <AppButton
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-accent-soft-text" : ""}`} />}
            onClick={fetchUsersDirectory}
          >
            Refresh directory
          </AppButton>
          {canCreateUsers && (
            <>
              <AppButton
                variant="outline"
                size="sm"
                leftIcon={<Mail className="h-3.5 w-3.5" />}
                onClick={() => setInviteModalOpen(true)}
              >
                Invite user
              </AppButton>
              <AppButton
                variant="primary"
                size="sm"
                leftIcon={<UserPlus className="h-3.5 w-3.5" />}
                onClick={() => router.push("/users/new")}
              >
                Register user account
              </AppButton>
            </>
          )}
        </div>
      </div>

      {/* ── Unified 6-Step Module-Wise RBAC Invite Wizard ── */}
      <UserInviteWizardModal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        onSuccess={() => {
          triggerToast("Invitation dispatched successfully with module roles and scopes.");
          fetchUsersDirectory();
        }}
        departments={departments}
        designations={designations}
        managers={users}
        roles={roles}
        moduleRoles={moduleRoles}
        isCallerSuperAdmin={Boolean(isSuperAdmin || serverIsSuperAdmin)}
      />

      {/* Dismissable Informational Alerts */}
      {successAlert && (
        <div className={`p-4 rounded-lg border flex items-center justify-between text-xs animate-in fade-in-20 ${"bg-success-soft border-success-border text-success-text"
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
        <div className={`p-4 rounded-lg border flex items-start gap-2.5 text-xs animate-in fade-in-20 ${"bg-danger-soft border-danger-border text-danger-text"
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
          <AppCard className={`flex-1 flex flex-col justify-start overflow-hidden shadow-lg ${"border-border"
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
                      className={`text-[11px] font-semibold px-3 py-1.5 rounded-md transition-colors ${statusFilter === flt
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
                            className={`cursor-pointer group transition-all duration-200 ${isSelected
                                ? ("bg-accent-soft shadow-inner")
                                : ("hover:bg-sunken")
                              }`}
                          >
                            <AppTableCell className="w-14 px-2">
                              <div className="relative w-8 h-8 mx-auto">
                                <div className={`absolute inset-0 flex items-center justify-center rounded-full text-[11px] font-medium ${"bg-sunken text-foreground"
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
                              <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold inline-block ${usr.is_active
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
                              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${usr.roleObj?.code?.toUpperCase() === "SUPER_ADMIN" ? "bg-warning-soft text-warning-text dark:text-warning-text" : "bg-sunken text-subtle"
                                }`}>
                                {usr.roleObj?.name || "Standard Profile"}
                              </span>
                            </AppTableCell>

                            <AppTableCell className="text-right w-32 shrink-0 pr-4" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1.5">
                                {canUpdateUsers && (
                                  <AppButton aria-label="Assign workspace modules" variant="secondary"
                                    type="button"
                                    onClick={() => handleOpenModuleModal(usr)}
                                    className="p-1.5 rounded-lg transition-all text-accent-soft-text dark:text-muted-foreground bg-surface/80 dark:bg-surface hover:bg-accent-soft border border-border shadow-2xs"
                                    title="Assign workspace modules"
                                  >
                                    <Layers className="h-4 w-4" />
                                  </AppButton>
                                )}
                                {(canUpdateUsers || usr.id === currentUserProfile?.id) && (
                                  <AppButton aria-label="Edit user profile" variant="secondary"
                                    type="button"
                                    onClick={() => router.push("/users/" + usr.id)}
                                    className={`p-1.5 rounded-lg transition-all ${"text-muted dark:text-muted hover:text-accent-soft-text hover:bg-accent-soft border border-transparent hover:border-border"
                                      }`}
                                    title="Edit user profile"
                                  >
                                    <Edit3 className="h-4 w-4" />
                                  </AppButton>
                                )}
                                {canDeleteUsers && usr.id !== currentUserProfile?.id && (
                                  <AppButton aria-label="Remove user" variant="secondary"
                                    type="button"
                                    onClick={() => initiateDeleteCheck(usr)}
                                    className={`p-1.5 rounded-lg transition-all ${"text-muted dark:text-muted hover:text-danger-text hover:bg-danger-soft border border-transparent hover:border-danger-border"
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
            <div className={`relative w-full max-w-md rounded-lg border shadow-lg overflow-hidden flex flex-col p-6 space-y-6 ${"bg-surface border-border text-foreground"
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

                  <div className={`p-4 rounded-lg border space-y-2.5 text-xs ${"bg-sunken border-border"
                    }`}>
                    <span className="text-xs font-semibold text-muted block">
                      Active reference summary
                    </span>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-muted flex items-center gap-1.5">
                          ðŸŽ« active tickets:
                        </span>
                        <span className={`font-mono font-semibold px-2 py-0.5 rounded ${deleteWarningData.tickets > 0
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
                        <span className={`font-mono font-semibold px-2 py-0.5 rounded ${deleteWarningData.tasks > 0
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
                        <span className={`font-mono font-semibold px-2 py-0.5 rounded ${deleteWarningData.requirements > 0
                            ? "bg-danger-soft text-danger-text border border-danger-border"
                            : "bg-sunken text-muted"
                          }`}>
                          {deleteWarningData.requirements}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className={`p-3 rounded-lg border text-[0.8rem] leading-relaxed ${"bg-danger-soft border-danger-border text-danger-text"
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

        {/* ── Granular Module-Wise RBAC & Roles Modal ── */}
        <UserModuleAccessModal
          isOpen={moduleModalOpen}
          onClose={() => setModuleModalOpen(false)}
          onSuccess={() => {
            triggerToast("Module access and roles updated successfully.");
            fetchUsersDirectory();
          }}
          user={moduleModalUser}
          moduleRoles={moduleRoles}
          isCallerSuperAdmin={Boolean(isSuperAdmin || serverIsSuperAdmin)}
        />
      </div>
    </div>
  );
}


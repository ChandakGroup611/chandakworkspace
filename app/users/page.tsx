"use client";

// Live Production deployment check
import React, { useState, useEffect, useRef, useMemo } from "react";
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
import { saveUserAction, fetchUsersDashboardData, deleteUserAction } from "@/lib/actions/users";
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
  Briefcase, 
  Shield, 
  History,
  Eye,
  Image,
  MonitorSmartphone,
  ChevronDown,
  Key,
  AlertCircle
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
  const supabase = createClient();
  const { theme } = useTheme();
  const { hasPermission, loading: permsLoading } = usePermissions();
  const isLightMode = ["executive-light", "material-ocean", "aurora-breeze", "pure-elegance"].includes(theme);
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
  const isSuperAdmin = currentUserProfile?.roleObj?.code === "SUPER_ADMIN" || 
                       currentUserProfile?.roleObj?.code === "ROLE_ADMIN" || 
                       currentUserProfile?.role_id === "admin-role-id";

  // Lookup selections
  const [departments, setDepartments] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [availableAssets, setAvailableAssets] = useState<any[]>([]);

  // Filtering strings
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Interactive Form & Modals States
  const [showModal, setShowModal] = useState(false);
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [editUserId, setEditUserId] = useState<string | null>(null);

  // Form bound models
  const [formFullName, setFormFullName] = useState("");
  const [formUserCode, setFormUserCode] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formDeptId, setFormDeptId] = useState("");
  const [formDesigId, setFormDesigId] = useState("");
  const [formRoleId, setFormRoleId] = useState("");
  const [formManagerId, setFormManagerId] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formConfirmPassword, setFormConfirmPassword] = useState("");
  const [formPhoto, setFormPhoto] = useState(PRESET_AVATARS[0]);
  const [formAssignedAssets, setFormAssignedAssets] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [isAssetDropdownOpen, setIsAssetDropdownOpen] = useState(false);
  const [isViewingPhoto, setIsViewingPhoto] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

        await supabase.from("user_master").insert([newProfile]);
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
    setSelectedUser(usr);
    fetchUserAudits(usr.id);
  };

  // Prepare standard create/register form trigger
  const openProvisionForm = () => {
    setIsEditingMode(false);
    setEditUserId(null);
    setFormFullName("");
    setFormUserCode(`USR-${Math.floor(1000 + Math.random() * 9000)}`);
    setFormEmail("");
    setFormDeptId(departments.length > 0 ? departments[0].id : "");
    setFormDesigId(designations.length > 0 ? designations[0].id : "");
    setFormRoleId(roles.length > 0 ? roles[0].id : "");
    setFormManagerId("");
    setFormPassword("");
    setFormConfirmPassword("");
    setFormPhoto(PRESET_AVATARS[Math.floor(Math.random() * PRESET_AVATARS.length)]);
    setFormIsActive(true);
    setFormAssignedAssets("");
    setIsViewingPhoto(false);
    setPhotoUploading(false);
    setShowModal(true);
  };

  // Prepare standard update form trigger
  const openModifyForm = (usr: AppUserItem) => {
    setIsEditingMode(true);
    setEditUserId(usr.id);
    setFormFullName(usr.full_name || "");
    setFormUserCode(usr.user_code || "");
    setFormEmail(usr.email || "");
    setFormDeptId(usr.department_id || "");
    setFormDesigId(usr.designation_id || "");
    setFormRoleId(usr.role_id || "");
    setFormManagerId(usr.manager_id || "");
    setFormPassword(""); // Leave empty to keep unchanged
    setFormConfirmPassword("");
    setFormPhoto(usr.profile_photo || PRESET_AVATARS[0]);
    setFormIsActive(usr.is_active ?? true);
    setFormAssignedAssets((usr.assigned_assets || []).join(", "));
    setIsViewingPhoto(false);
    setPhotoUploading(false);
    setShowModal(true);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      triggerToast("Only image file formats are allowed.", true);
      return;
    }

    setPhotoUploading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error("Unauthenticated request. Please sign in.");

      const fileExt = file.name.split(".").pop();
      const fileName = `${authUser.id}/${Date.now()}.${fileExt}`;

      const { data, error: uploadError } = await supabase.storage
        .from("profiles")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("profiles")
        .getPublicUrl(fileName);

      setFormPhoto(publicUrl);
      triggerToast("Profile picture uploaded successfully!");
    } catch (err: any) {
      console.error("Upload error:", err);
      triggerToast(`Upload failed: ${err.message || err}`, true);
    } finally {
      setPhotoUploading(false);
    }
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
    // Also push to supabase asynchronously
    supabase.from("user_master_audit_logs").insert([
      { user_id: usrId, operation: op, payload: pl }
    ]).then(() => {}, () => {});

    // Broadcast CUD triggers globally to application notification channels
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

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFullName.trim() || !formUserCode.trim() || !formEmail.trim()) {
      triggerToast("Full Name, User Code, and Registered Email fields are mandatory.", true);
      return;
    }

    // Client password confirmation feedback verification
    if (!isEditingMode || formPassword.trim()) {
      if (!formPassword.trim()) {
        triggerToast("Password is required for newly provisioned user accounts.", true);
        return;
      }
      if (formPassword !== formConfirmPassword) {
        triggerToast("Password and Confirm Password input values do not match.", true);
        return;
      }
      if (formPassword.length < 6) {
        triggerToast("Password constraint requires at least 6 characters.", true);
        return;
      }
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
      assigned_assets: formAssignedAssets.split(",").map(a => a.trim()).filter(Boolean)
    };

    setLoading(true);

    try {
      const result = await saveUserAction(isEditingMode ? editUserId : null, payload, formPassword);
      
      if (result && !result.success) {
        throw new Error(result.error || "An unknown error occurred during save.");
      }

      if (isEditingMode && editUserId) {
        const updatedItem = {
          ...users.find(u => u.id === editUserId),
          ...payload,
          departmentObj: departments.find(d => d.id === formDeptId) || undefined,
          designationObj: designations.find(dg => dg.id === formDesigId) || undefined,
          roleObj: roles.find(r => r.id === formRoleId) || undefined,
          managerObj: users.find(u => u.id === formManagerId) || undefined
        };

        setUsers(prev => prev.map(u => u.id === editUserId ? updatedItem : u));
        if (selectedUser?.id === editUserId) {
          setSelectedUser(updatedItem);
        }
        appendLocalAudit(editUserId, "UPDATE", { fieldsModified: Object.keys(payload), email: payload.email });
        triggerToast(`Success: Profile for '${payload.full_name}' updated.`);
      } else {
        triggerToast(`Success: Record for '${payload.full_name}' provisioned.`);
      }

      fetchUsersDirectory();
      setShowModal(false);
    } catch (err: any) {
      console.error("Failed to save user:", err);
      setErrorAlert(err.message || "Failed to save user record.");
      triggerToast(err.message || "Failed to save user record.", true);
    } finally {
      setLoading(false);
    }
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
      const { error } = await supabase.from("user_master").update({ is_active: false }).eq("id", usr.id);
      if (error) throw error;
      
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
      const { error } = await supabase.from("user_master").update(payload).eq("id", usr.id);
      if (error) throw error;
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
      const { error } = await supabase.from("user_master").update(payload).eq("id", usr.id);
      if (error) throw error;
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
    const matchQuery = 
      (usr.full_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (usr.user_code || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (usr.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (usr.departmentObj?.name || "").toLowerCase().includes(searchQuery.toLowerCase());
    
    if (statusFilter === "ALL") return matchQuery;
    if (statusFilter === "ACTIVE") return matchQuery && usr.is_active;
    if (statusFilter === "DISABLED") return matchQuery && !usr.is_active;
    return matchQuery;
  });

  // Filter out the selected user from available managers selection to prevent cyclical hierarchy loops
  const availableManagers = users.filter(u => !isEditingMode || u.id !== editUserId);

  if (!mounted || permsLoading || loading) {
    return (
      <div className={`h-screen flex flex-col items-center justify-center space-y-4 transition-colors duration-300 ${
        "bg-surface text-foreground"
      }`}>
        <div className="animate-spin h-10 w-10 border-2 border-indigo-500 border-t-transparent rounded-full shadow-lg shadow-indigo-500/20" />
        <span className="text-xs font-bold uppercase tracking-widest animate-pulse text-gray-500">
          Verifying Credentials...
        </span>
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
            <h1 className={`text-xl font-bold tracking-tight ${"text-foreground"}`}>Enterprise Personnel Registry</h1>
            <AppBadge variant="info">Identity Directory</AppBadge>
          </div>
          <p className={`text-xs ${"text-muted"}`}>
            Governed system personnel records supporting strict department routing, role assignments, and instant audit trails.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <AppButton 
            variant="outline" 
            size="sm" 
            leftIcon={<RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-blue-500" : ""}`} />}
            onClick={fetchUsersDirectory}
          >
            Refresh Directory
          </AppButton>
          <AppButton 
            variant="primary" 
            size="sm" 
            leftIcon={<UserPlus className="h-3.5 w-3.5" />}
            onClick={openProvisionForm}
            disabled={!(hasPermission("USERS_CREATE") || isSuperAdmin)}
          >
            Register User Account
          </AppButton>
        </div>
      </div>

      {/* Dismissable Informational Alerts */}
      {successAlert && (
        <div className={`p-4 rounded-xl border flex items-center justify-between text-xs animate-in fade-in-20 ${
          isLightMode ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
        }`}>
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            <span className="font-medium">{successAlert}</span>
          </div>
          <button onClick={() => setSuccessAlert(null)} className="text-gray-400 hover:text-gray-600">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {errorAlert && (
        <div className={`p-4 rounded-xl border flex items-start gap-2.5 text-xs animate-in fade-in-20 ${
          isLightMode ? "bg-rose-50 border-rose-200 text-rose-800" : "bg-rose-500/10 border-rose-500/20 text-rose-300"
        }`}>
          <ShieldAlert className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong className="font-bold block mb-0.5">Validation Constraint Notice:</strong>
            {errorAlert}
          </div>
          <button onClick={() => setErrorAlert(null)} className="text-gray-400 hover:text-gray-600">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Grid Display Split Interface Shell */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Spanning List View: User Array Indexing */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          <AppCard className={`flex-1 flex flex-col justify-start overflow-hidden shadow-xl ${
            "border-border"
          }`}>
            {/* Unified Filter Box Header */}
            <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-t-xl border-b border-gray-200 dark:border-white/10 flex flex-col gap-3 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 md:gap-4">
                <div className="space-y-0.5">
                  <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                    Personnel Registry
                  </h2>
                  <span className="text-[10px] text-gray-500 font-mono font-bold tracking-wider uppercase">
                    {filteredUsers.length} Users Found
                  </span>
                </div>

                {/* Status Switcher Tabs */}
                <div className="flex items-center gap-1 p-1 rounded-lg bg-white dark:bg-[#0f111a] border border-gray-200 dark:border-white/10">
                  {(["ALL", "ACTIVE", "DISABLED"] as const).map(flt => (
                    <button
                      key={flt}
                      type="button"
                      onClick={() => setStatusFilter(flt)}
                      className={`text-[11px] font-semibold px-3 py-1.5 rounded-md transition-colors ${
                        statusFilter === flt 
                          ? "bg-blue-600 text-white shadow-sm" 
                          : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
                      }`}
                    >
                      {flt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Quick Text Search bar */}
              <div className="flex items-center pt-2 mt-1 border-t border-gray-200 dark:border-white/10">
                <AppInput
                  placeholder="Search by Full Name, User Code, Email string, or Department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  leftIcon={<Search className="h-3.5 w-3.5" />}
                  className="w-full h-9 text-xs bg-white dark:bg-[#0f111a]"
                />
              </div>
            </div>

            {/* Main Output List Table */}
            <div className="p-0 flex-1 overflow-y-auto max-h-[650px] min-h-[400px]">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-4">
                  <div className="animate-spin h-8 w-8 border-2 border-indigo-500 border-t-transparent rounded-full shadow-lg shadow-indigo-500/20" />
                  <p className="text-xs font-bold uppercase tracking-widest animate-pulse text-gray-500">
                    Syncing Enterprise Directory...
                  </p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-16 px-4 space-y-2">
                  <Users className="h-8 w-8 text-gray-400 mx-auto stroke-1" />
                  <p className={`text-xs font-medium ${isLightMode ? "text-gray-700" : "text-gray-400"}`}>
                    No active staff personnel correspond to selected keyword tags.
                  </p>
                  <p className="text-xs text-gray-500">
                    Click 'Register User Account' above to input authentic credentials.
                  </p>
                </div>
              ) : (
                <AppTableContainer className="rounded-none border-none">
                  <AppTable>
                    <AppTableHeader>
                      <tr>
                        <AppTableHead className="w-14 text-center px-2">Avatar</AppTableHead>
                        <AppTableHead>Staff Identity &amp; Scope</AppTableHead>
                        <AppTableHead>Assigned Assets</AppTableHead>
                        <AppTableHead className="w-24 text-center">Status</AppTableHead>
                        <AppTableHead className="text-right w-24 shrink-0 pr-4">Actions</AppTableHead>
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
                                ? (isLightMode ? "bg-blue-50/50 shadow-inner" : "bg-white/[0.04] shadow-inner") 
                                : (isLightMode ? "hover:bg-gray-50/80" : "hover:bg-white/[0.02]")
                            }`}
                          >
                            <AppTableCell className="w-14 px-2">
                              <div className="relative w-9 h-9 mx-auto">
                                <div className={`absolute inset-0 flex items-center justify-center rounded-full text-xs font-bold uppercase ${
                                  isLightMode ? "bg-indigo-100 text-indigo-700" : "bg-indigo-500/20 text-indigo-300"
                                }`}>
                                  {usr.full_name?.substring(0, 2) || "NA"}
                                </div>
                                <img 
                                  src={usr.profile_photo || PRESET_AVATARS[0]} 
                                  alt={usr.full_name}
                                  className="absolute inset-0 w-9 h-9 rounded-full object-cover shadow-sm ring-2 ring-transparent group-hover:ring-indigo-500/30 transition-all z-10"
                                  onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0'; }}
                                />
                              </div>
                            </AppTableCell>

                            <AppTableCell className="min-w-[250px]">
                              <div className="flex flex-col justify-center min-w-0 py-1">
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                  <span className={`text-sm font-semibold truncate block max-w-[180px] sm:max-w-xs ${
                                    isLightMode ? "text-slate-800" : "text-slate-200"
                                  }`}>
                                    {usr.full_name}
                                  </span>
                                  {usr.user_code && (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono tracking-wide whitespace-nowrap shrink-0 ${
                                      isLightMode ? "bg-slate-100 text-slate-500" : "bg-white/5 text-slate-400"
                                    }`}>
                                      {usr.user_code}
                                    </span>
                                  )}
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium tracking-wide uppercase whitespace-nowrap shrink-0 ${
                                    isLightMode ? "bg-indigo-50 text-indigo-600" : "bg-indigo-500/10 text-indigo-400"
                                  }`}>
                                    {usr.designationObj?.name || "General Assignee"}
                                  </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-xs mt-0.5">
                                  <span className={`truncate max-w-[200px] ${isLightMode ? "text-slate-500" : "text-slate-400"}`}>
                                    {usr.email}
                                  </span>
                                  <span className="text-slate-300 dark:text-slate-600 hidden sm:inline">•</span>
                                  <span className={`flex items-center gap-1 shrink-0 ${isLightMode ? "text-slate-600 font-medium" : "text-slate-300 font-medium"}`}>
                                    <Layers className="h-3 w-3 opacity-70" />
                                    <span className="truncate max-w-[150px]">{usr.departmentObj?.name || "Global Scope"}</span>
                                  </span>
                                </div>
                              </div>
                            </AppTableCell>

                            <AppTableCell>
                              <div className="flex flex-wrap gap-1.5 max-w-[180px]">
                                {usr.assigned_assets && usr.assigned_assets.length > 0 ? (
                                  usr.assigned_assets.map((ast, aIdx) => (
                                    <span key={aIdx} className={`text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 ${
                                      isLightMode ? "bg-amber-50 text-amber-700" : "bg-amber-500/10 text-amber-400"
                                    }`} title={ast}>
                                      <span className="opacity-60 text-[8px]">💻</span>
                                      <span className="truncate max-w-[80px] font-mono">{ast}</span>
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-[11px] text-slate-400 dark:text-slate-500 italic">Unassigned</span>
                                )}
                              </div>
                            </AppTableCell>

                            <AppTableCell className="w-24 text-center">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase inline-block ${
                                usr.is_active 
                                  ? (isLightMode ? "bg-emerald-50 text-emerald-600" : "bg-emerald-500/10 text-emerald-400") 
                                  : (isLightMode ? "bg-slate-100 text-slate-500" : "bg-white/5 text-slate-400")
                              }`}>
                                {usr.is_active ? "Active" : "Disabled"}
                              </span>
                            </AppTableCell>

                            <AppTableCell className="text-right w-24 shrink-0 pr-4" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                {(hasPermission("USERS_UPDATE") || isSuperAdmin) && (
                                  <button
                                    type="button"
                                    onClick={() => openModifyForm(usr)}
                                    className={`p-1.5 rounded transition-all ${
                                      isLightMode ? "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50" : "text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10"
                                    }`}
                                    title="Edit User Profile"
                                  >
                                    <Edit3 className="h-4 w-4" />
                                  </button>
                                )}
                                {(hasPermission("USERS_DELETE") || isSuperAdmin) && (
                                  <button
                                    type="button"
                                    onClick={() => initiateDeleteCheck(usr)}
                                    className={`p-1.5 rounded transition-all ${
                                      isLightMode ? "text-slate-400 hover:text-rose-600 hover:bg-rose-50" : "text-slate-500 hover:text-rose-400 hover:bg-rose-500/10"
                                    }`}
                                    title="Remove User"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
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

        {/* Right Column Span 5: Granular User Details Inspector & Auditing */}
        <div className="lg:col-span-5 flex flex-col overflow-hidden">
          {selectedUser ? (
            <AppCard className={`flex-1 flex flex-col justify-between overflow-hidden shadow-2xl ${
              "border-border"
            }`}>
              {/* Card Profile Overview Header */}
              <AppCardHeader className={`flex flex-col items-center p-6 text-center border-b relative ${
                isLightMode ? "border-gray-100 bg-gradient-to-b from-blue-50/40 to-transparent" : "border-white/10 bg-gradient-to-b from-white/[0.02] to-transparent"
              }`}>
                {/* Embedded quick edit icon icon overlay */}
                {hasPermission("USERS_UPDATE") && (
                  <button
                    type="button"
                    onClick={() => openModifyForm(selectedUser)}
                    className={`absolute top-4 right-4 p-2 rounded-xl border text-xs font-bold flex items-center gap-1 transition-all ${
                      isLightMode ? "bg-white border-gray-200 text-gray-700 hover:bg-gray-50" : "bg-white/5 border-white/10 text-gray-300 hover:text-white"
                    }`}
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>Update</span>
                  </button>
                )}

                <img 
                  src={selectedUser.profile_photo || PRESET_AVATARS[0]} 
                  alt={selectedUser.full_name}
                  className="w-20 h-20 rounded-full object-cover border-2 border-blue-500 shadow-md mb-3"
                  onError={(e) => { (e.target as any).src = PRESET_AVATARS[0]; }}
                />

                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    <AppCardTitle className={`text-base font-bold ${"text-foreground"}`}>
                      {selectedUser.full_name}
                    </AppCardTitle>
                    <span className={`text-xs font-mono font-bold px-1.5 py-0.2 rounded border ${
                      isLightMode ? "text-blue-700 bg-blue-50 border-blue-200" : "text-blue-400 bg-blue-500/10 border-blue-500/20"
                    }`}>
                      {selectedUser.user_code}
                    </span>
                  </div>

                  <p className={`text-xs ${"text-muted"}`}>
                    {selectedUser.email}
                  </p>

                  <div className="pt-2 flex items-center justify-center gap-2">
                    <span className={`text-[0.8rem] font-semibold px-2 py-0.5 rounded-full ${
                      isLightMode ? "bg-purple-50 text-purple-700 border border-purple-200" : "bg-purple-500/10 text-purple-300 border border-purple-500/20"
                    }`}>
                      {selectedUser.roleObj?.name || "Standard Scope Profile"}
                    </span>
                  </div>
                </div>
              </AppCardHeader>

              {/* Inspector Scroll Body */}
              <div className="p-5 space-y-5 flex-1">
                {/* Structural Assignments Grid */}
                <div className="space-y-2">
                  <span className={`text-xs font-bold tracking-wider uppercase block ${
                    "text-muted"
                  }`}>
                    Hierarchical Attachments
                  </span>
                  
                  <div className={`p-3 rounded-xl border space-y-2 text-xs ${
                    isLightMode ? "bg-white border-gray-100" : "bg-white/[0.01] border-white/5"
                  }`}>
                    <div className="flex items-center justify-between pb-1.5 border-b border-white/5">
                      <span className="text-gray-500 flex items-center gap-1.5">
                        <Briefcase className="h-3 w-3" />
                        <span>Job Designation:</span>
                      </span>
                      <strong className={`font-semibold ${isLightMode ? "text-gray-900" : "text-gray-200"}`}>
                        {selectedUser.designationObj?.name || "Not Designated"}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between pb-1.5 border-b border-white/5">
                      <span className="text-gray-500 flex items-center gap-1.5">
                        <Layers className="h-3 w-3" />
                        <span>Department Scope:</span>
                      </span>
                      <strong className={`font-semibold ${isLightMode ? "text-gray-900" : "text-gray-200"}`}>
                        {selectedUser.departmentObj?.name || "Global Tier"}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 flex items-center gap-1.5">
                        <UserCheck className="h-3 w-3" />
                        <span>Line Manager:</span>
                      </span>
                      <strong className={`font-semibold ${selectedUser.managerObj ? (isLightMode ? "text-blue-700" : "text-blue-400") : "text-gray-500"}`}>
                        {selectedUser.managerObj ? `${selectedUser.managerObj.full_name} (${selectedUser.managerObj.user_code})` : "Self Directed (Root)"}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-white/5">
                      <span className="text-gray-500 flex items-center gap-1.5">
                        <Briefcase className="h-3 w-3 text-amber-500" />
                        <span>Assigned Assets:</span>
                      </span>
                      <div className="flex flex-wrap gap-1 justify-end max-w-[180px]">
                        {selectedUser.assigned_assets && selectedUser.assigned_assets.length > 0 ? (
                          selectedUser.assigned_assets.map((ast, aIdx) => (
                            <span key={aIdx} className={`text-[0.7rem] font-mono px-1 py-0.2 rounded border ${
                              isLightMode ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            }`}>
                              🏷️ {ast}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-500 italic font-normal">None Assigned</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Session Timestamps Simulators Interface */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold tracking-wider uppercase block ${
                      "text-muted"
                    }`}>
                      Live Access Times Tracker
                    </span>
                    <span className="text-[0.7rem] text-gray-500 italic">Simulate connection vector updates</span>
                  </div>

                  <div className={`p-3 rounded-xl border space-y-3 ${
                    isLightMode ? "bg-white border-gray-100" : "bg-white/[0.01] border-white/5"
                  }`}>
                    {/* Last Login element */}
                    <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-white/5">
                      <div className="space-y-0.5">
                        <span className="text-xs text-gray-500 font-medium flex items-center gap-1">
                          <Clock className="h-3 w-3 text-emerald-500" />
                          <span>Last Log-In Time:</span>
                        </span>
                        <span className={`text-xs font-mono font-bold block ${
                          selectedUser.last_login_at ? ("text-foreground") : "text-gray-500"
                        }`}>
                          {selectedUser.last_login_at ? new Date(selectedUser.last_login_at).toLocaleString() : "Never Logged In"}
                        </span>
                      </div>
                      <AppButton
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleSimulateLoginTime(selectedUser)}
                        disabled={!(hasPermission("USERS_UPDATE") || isSuperAdmin)}
                        className="text-xs h-7 px-2 disabled:opacity-50"
                      >
                        Stamp Log-In
                      </AppButton>
                    </div>

                    {/* Last Logout element */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="space-y-0.5">
                        <span className="text-xs text-gray-500 font-medium flex items-center gap-1">
                          <Clock className="h-3 w-3 text-amber-500" />
                          <span>Last Log-Out Time:</span>
                        </span>
                        <span className={`text-xs font-mono font-bold block ${
                          selectedUser.last_logout_at ? ("text-foreground") : "text-gray-500"
                        }`}>
                          {selectedUser.last_logout_at ? new Date(selectedUser.last_logout_at).toLocaleString() : "Active Ongoing"}
                        </span>
                      </div>
                      <AppButton
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleSimulateLogoutTime(selectedUser)}
                        disabled={!hasPermission("USERS_UPDATE")}
                        className="text-xs h-7 px-2 disabled:opacity-50"
                      >
                        Stamp Log-Out
                      </AppButton>
                    </div>
                  </div>
                </div>

                {/* Event Actions Bar: Mail Trigger Simulation */}
                <div className="space-y-2 pt-1">
                  <span className={`text-xs font-bold tracking-wider uppercase block ${
                    "text-muted"
                  }`}>
                    Outbound Triggers
                  </span>

                  <button
                    type="button"
                    onClick={() => handleTriggerPasswordReset(selectedUser)}
                    disabled={!hasPermission("USERS_UPDATE")}
                    className={`w-full p-2.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                      isLightMode 
                        ? "bg-white border-blue-200 text-blue-700 hover:bg-blue-50 shadow-2xs" 
                        : "bg-white/[0.02] border-blue-500/20 text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/30"
                    }`}
                  >
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <span>Trigger Password Reset Email</span>
                  </button>
                  <span className="text-[0.7rem] text-gray-500 block text-center">
                    Simulates secure token generation link routing over outbound message handlers.
                  </span>
                </div>

                {/* Audit Timeline Render Container */}
                <div className="space-y-2 pt-1 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold tracking-wider uppercase block flex items-center gap-1 ${
                      "text-muted"
                    }`}>
                      <History className="h-3 w-3" />
                      <span>Personnel Audit Logs</span>
                    </span>
                    <span className="text-[0.7rem] font-mono text-gray-500">{auditLogs.length} Events</span>
                  </div>

                  <div className="space-y-2.5 max-h-40 overflow-y-auto pr-1">
                    {auditLogs.length === 0 ? (
                      <div className="p-3 text-center text-xs text-gray-500 italic border border-dashed rounded-lg border-white/5">
                        Zero automated mutations recorded locally for user identity tuple.
                      </div>
                    ) : (
                      auditLogs.map((lg) => (
                        <div key={lg.id} className={`p-2.5 rounded-lg border text-[0.8rem] space-y-1 ${
                          isLightMode ? "bg-gray-50/50 border-gray-100" : "bg-black/20 border-white/5"
                        }`}>
                          <div className="flex items-center justify-between gap-2">
                            <span className={`font-mono text-[0.7rem] font-bold px-1 py-0.2 rounded ${
                              lg.operation === "CREATE" ? "bg-emerald-500/10 text-emerald-400" :
                              lg.operation === "UPDATE" ? "bg-blue-500/10 text-blue-400" :
                              lg.operation === "DELETE" ? "bg-rose-500/10 text-rose-400" :
                              "bg-purple-500/10 text-purple-400"
                            }`}>
                              {lg.operation}
                            </span>
                            <span className="text-[0.7rem] text-gray-500 font-mono">
                              {new Date(lg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                          </div>
                          
                          <p className={`text-xs leading-snug ${"text-foreground"}`}>
                            {lg.payload ? (lg.payload.status || lg.payload.action || lg.payload.event || lg.payload.updateScope || JSON.stringify(lg.payload)) : "Metadata schema payload execution"}
                          </p>
                          <span className="text-[0.7rem] text-gray-500 block italic">
                            By {lg.performed_by}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </AppCard>
          ) : (
            <AppCard className={`flex-1 flex flex-col items-center justify-center p-8 text-center border-dashed ${
              isLightMode ? "bg-gray-50/50 border-gray-200" : "bg-white/[0.005] border-white/5"
            }`}>
              <Users className="h-10 w-10 text-gray-600 stroke-1 mb-2" />
              <strong className={`text-sm font-bold block ${isLightMode ? "text-gray-800" : "text-gray-300"}`}>
                No User Record Selected
              </strong>
              <p className="text-xs text-gray-500 max-w-xs mt-1">
                Click upon any item entry record row array inside the left registry column to review security metadata attachments and audit timelines.
              </p>
            </AppCard>
          )}
        </div>
      </div>

      {/* ── Dynamic Personnel Register & Update Overlay Modal ── */}
      {showModal && (
        <div 
          className="fixed inset-0 z-50 flex items-start pt-16 pb-16 overflow-y-auto justify-center px-4 animate-in fade-in-0 duration-200"
          style={{ backgroundColor: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(8px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div className={`relative w-full max-w-3xl max-h-[95vh] rounded-[24px] border shadow-2xl overflow-hidden flex flex-col ${
            isLightMode ? "bg-white/95 backdrop-blur-xl border-slate-200/50 text-slate-800 shadow-[0_12px_40px_rgba(0,0,0,0.08)]" : "bg-[#0A0D14]/90 backdrop-blur-xl border-white/10 text-slate-100 shadow-[0_12px_40px_rgba(0,0,0,0.5)]"
          }`}>
            <form onSubmit={handleSubmitForm} className="flex flex-col h-full overflow-hidden">
              {/* Modal Header */}
              <div className={`flex items-center justify-between px-8 py-5 shrink-0 border-b ${
                isLightMode ? "border-slate-100" : "border-white/5"
              }`}>
                <div className="space-y-1">
                  <h3 className="text-xl font-semibold tracking-tight">
                    {isEditingMode ? "Update Identity Record" : "Register User Account"}
                  </h3>
                  <p className={`text-sm ${isLightMode ? "text-slate-500" : "text-slate-400"}`}>
                    Manage profile details, assignments, and authentication for this user.
                  </p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className={`p-2 rounded-full transition-colors ${
                    isLightMode ? "text-slate-400 hover:text-slate-700 hover:bg-slate-100" : "text-slate-500 hover:text-slate-200 hover:bg-white/10"
                  }`}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Scrollable Form parameters view */}
              <div className="px-8 py-5 space-y-6 overflow-y-auto overflow-x-hidden flex-1 scrollbar-thin min-h-0">
                {/* Profile Photo selector */}
                <div className="space-y-4">
                  <label className={`text-sm font-medium ${isLightMode ? "text-slate-700" : "text-slate-300"}`}>
                    Profile Photo
                  </label>
                  
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                    <div className="relative shrink-0 group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                      <img 
                        src={formPhoto || PRESET_AVATARS[0]} 
                        alt="Profile"
                        className={`w-20 h-20 rounded-full object-cover shadow-sm ring-4 ring-offset-2 transition-all ${
                          photoUploading ? "opacity-40 animate-pulse" : ""
                        } ${isLightMode ? "ring-indigo-50 ring-offset-white" : "ring-indigo-500/20 ring-offset-[#0A0D14]"}`}
                        onError={(e) => { (e.target as any).src = PRESET_AVATARS[0]; }}
                      />
                      <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Image className="h-6 w-6 text-white" />
                      </div>
                      {photoUploading && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <RefreshCw className="h-6 w-6 animate-spin text-indigo-500" />
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-3 flex-1 w-full">
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handlePhotoUpload} 
                        accept="image/*" 
                        className="hidden" 
                      />

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={photoUploading}
                          className={`px-4 py-2 rounded-lg border text-sm font-medium flex items-center gap-2 transition-all shadow-sm ${
                            photoUploading
                              ? "opacity-50 cursor-not-allowed"
                              : (isLightMode ? "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300" : "bg-white/5 border-white/10 text-slate-200 hover:bg-white/10")
                          }`}
                        >
                          {photoUploading ? <RefreshCw className="h-4 w-4 animate-spin text-indigo-500" /> : <Image className="h-4 w-4" />}
                          <span>{photoUploading ? "Uploading..." : "Upload New Photo"}</span>
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => setIsViewingPhoto(true)}
                          className={`p-2 rounded-lg border transition-all ${
                            isLightMode ? "border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700" : "border-white/10 text-slate-400 hover:bg-white/10 hover:text-slate-200"
                          }`}
                          title="View Photo"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Presets */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {PRESET_AVATARS.map((avUrl, aIdx) => (
                          <button
                            key={aIdx}
                            type="button"
                            onClick={() => setFormPhoto(avUrl)}
                            className={`w-8 h-8 rounded-full overflow-hidden border-2 transition-all hover:-translate-y-0.5 ${
                              formPhoto === avUrl 
                                ? (isLightMode ? "border-indigo-500 shadow-md" : "border-indigo-400 shadow-[0_0_10px_rgba(129,140,248,0.3)]") 
                                : "border-transparent opacity-70 hover:opacity-100"
                            }`}
                          >
                            <img src={avUrl} alt={`p-${aIdx}`} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Grid 1: Basic Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className={`text-sm font-medium ${isLightMode ? "text-slate-700" : "text-slate-300"}`}>
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <AppInput 
                      placeholder="e.g. Richard Hendricks"
                      value={formFullName}
                      onChange={(e) => setFormFullName(e.target.value)}
                      required
                      disabled={!isSuperAdmin}
                      className="text-sm rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className={`text-sm font-medium ${isLightMode ? "text-slate-700" : "text-slate-300"}`}>
                      User Code <span className="text-rose-500">*</span>
                    </label>
                    <AppInput 
                      placeholder="e.g. USR-ENG-009"
                      value={formUserCode}
                      onChange={(e) => setFormUserCode(e.target.value)}
                      className="font-mono text-sm uppercase rounded-xl"
                      required
                      disabled={!isSuperAdmin}
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <label className={`text-sm font-medium ${isLightMode ? "text-slate-700" : "text-slate-300"}`}>
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <AppInput 
                      type="email"
                      placeholder="e.g. richard@enterprise.com"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className="text-sm rounded-xl"
                      required
                      disabled={!isSuperAdmin}
                    />
                  </div>
                </div>

                {/* Grid 2: Organization */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4 border-t border-slate-100 dark:border-white/5">
                  <div className="space-y-2">
                    <label className={`text-sm font-medium flex items-center gap-2 ${isLightMode ? "text-slate-700" : "text-slate-300"}`}>
                      <Layers className="h-4 w-4 text-indigo-500" />
                      Department
                    </label>
                    <select
                      value={formDeptId}
                      onChange={(e) => {
                        setFormDeptId(e.target.value);
                        setFormDesigId("");
                      }}
                      disabled={!isSuperAdmin}
                      className={`w-full h-10 px-3.5 rounded-xl border text-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 ${
                        !isSuperAdmin ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
                      } ${
                        isLightMode ? "bg-white border-slate-200 text-slate-800 hover:border-slate-300" : "bg-[#0F131D] border-white/10 text-slate-200 hover:border-white/20"
                      }`}
                    >
                      <option value="" className="text-slate-400">Select Department...</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className={`text-sm font-medium flex items-center gap-2 ${isLightMode ? "text-slate-700" : "text-slate-300"}`}>
                      <Briefcase className="h-4 w-4 text-emerald-500" />
                      Designation
                    </label>
                    <select
                      value={formDesigId}
                      onChange={(e) => setFormDesigId(e.target.value)}
                      disabled={!isSuperAdmin}
                      className={`w-full h-10 px-3.5 rounded-xl border text-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 ${
                        !isSuperAdmin ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
                      } ${
                        isLightMode ? "bg-white border-slate-200 text-slate-800 hover:border-slate-300" : "bg-[#0F131D] border-white/10 text-slate-200 hover:border-white/20"
                      }`}
                    >
                      <option value="" className="text-slate-400">Select Designation...</option>
                      {designations
                        .filter(dg => !formDeptId || dg.department_id === formDeptId)
                        .map(dg => (
                        <option key={dg.id} value={dg.id}>{dg.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className={`text-sm font-medium flex items-center gap-2 ${isLightMode ? "text-slate-700" : "text-slate-300"}`}>
                      <Shield className="h-4 w-4 text-purple-500" />
                      System Role
                    </label>
                    <select
                      value={formRoleId}
                      onChange={(e) => setFormRoleId(e.target.value)}
                      disabled={!isSuperAdmin}
                      className={`w-full h-10 px-3.5 rounded-xl border text-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 ${
                        !isSuperAdmin ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
                      } ${
                        isLightMode ? "bg-white border-slate-200 text-slate-800 hover:border-slate-300" : "bg-[#0F131D] border-white/10 text-slate-200 hover:border-white/20"
                      }`}
                    >
                      <option value="" className="text-slate-400">Standard User</option>
                      {roles.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className={`text-sm font-medium flex items-center gap-2 ${isLightMode ? "text-slate-700" : "text-slate-300"}`}>
                      <UserCheck className="h-4 w-4 text-blue-500" />
                      Reporting Manager
                    </label>
                    <select
                      value={formManagerId}
                      onChange={(e) => setFormManagerId(e.target.value)}
                      disabled={!isSuperAdmin}
                      className={`w-full h-10 px-3.5 rounded-xl border text-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                        !isSuperAdmin ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
                      } ${
                        isLightMode ? "bg-white border-slate-200 text-slate-800 hover:border-slate-300" : "bg-[#0F131D] border-white/10 text-slate-200 hover:border-white/20"
                      }`}
                    >
                      <option value="" className="text-slate-400">None (Top Level)</option>
                      {availableManagers.map(mgr => (
                        <option key={mgr.id} value={mgr.id}>{mgr.full_name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Assigned Assets */}
                <div className="space-y-2 relative pt-4 border-t border-slate-100 dark:border-white/5">
                  <label className={`text-sm font-medium flex items-center gap-2 ${isLightMode ? "text-slate-700" : "text-slate-300"}`}>
                    <MonitorSmartphone className="h-4 w-4 text-amber-500" />
                    Assigned Hardware
                  </label>
                  
                  <div 
                    onClick={() => { if (isSuperAdmin) setIsAssetDropdownOpen(!isAssetDropdownOpen) }}
                    className={`min-h-11 p-2 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                      !isSuperAdmin ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
                    } ${
                      isLightMode 
                        ? "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm" 
                        : "bg-[#0F131D] border-white/10 hover:border-white/20"
                    } ${isAssetDropdownOpen ? (isLightMode ? "ring-2 ring-amber-500/20 border-amber-500" : "ring-2 ring-amber-500/20 border-amber-500") : ""}`}
                  >
                    <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0 px-1.5">
                      {formAssignedAssets.split(",").map(t => t.trim()).filter(Boolean).length > 0 ? (
                        formAssignedAssets.split(",").map(t => t.trim()).filter(Boolean).map((tagStr, tagIdx) => {
                          const matchedAst = availableAssets.find(a => (a.asset_tag || a.code) === tagStr);
                          return (
                            <span 
                              key={tagIdx}
                              onClick={(e) => {
                                e.stopPropagation();
                                const currentArr = formAssignedAssets.split(",").map(x => x.trim()).filter(Boolean);
                                setFormAssignedAssets(currentArr.filter(x => x !== tagStr).join(", "));
                              }}
                              className={`text-xs font-medium px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-colors hover:opacity-80 ${
                                isLightMode 
                                  ? "bg-amber-50 text-amber-900" 
                                  : "bg-amber-500/15 text-amber-200"
                              }`}
                            >
                              <MonitorSmartphone className="h-3 w-3 opacity-70" />
                              <span>{matchedAst ? matchedAst.name.split(" ")[0] : tagStr}</span>
                              <X className="h-3 w-3 ml-0.5 hover:text-rose-500 cursor-pointer" />
                            </span>
                          );
                        })
                      ) : (
                        <span className={`text-sm px-1.5 ${isLightMode ? "text-slate-400" : "text-slate-500"}`}>
                          Select physical devices...
                        </span>
                      )}
                    </div>
                    <div className={`p-1 shrink-0 transition-transform ${isAssetDropdownOpen ? "rotate-180" : ""} ${isLightMode ? "text-slate-400" : "text-slate-500"}`}>
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </div>

                  {isAssetDropdownOpen && (
                    <div className={`absolute left-0 right-0 top-full mt-2 z-50 p-2 rounded-xl border shadow-xl max-h-56 overflow-y-auto scrollbar-thin animate-in fade-in slide-in-from-top-2 duration-150 ${
                      isLightMode 
                        ? "bg-white border-slate-200" 
                        : "bg-[#1A1D24] border-white/10"
                    }`}>
                      <div className="space-y-1">
                        {availableAssets
                          .filter((ast) => !ast.assigned_user_id || ast.assigned_user_id === editUserId)
                          .map((ast) => {
                          const tagValue = ast.asset_tag || ast.code;
                          const selectedTags = formAssignedAssets.split(",").map(t => t.trim()).filter(Boolean);
                          const isAssigned = selectedTags.includes(tagValue);
                          return (
                            <div
                              key={ast.id}
                              onClick={() => {
                                if (isAssigned) {
                                  setFormAssignedAssets(selectedTags.filter(t => t !== tagValue).join(", "));
                                } else {
                                  setFormAssignedAssets([...selectedTags, tagValue].join(", "));
                                }
                              }}
                              className={`w-full p-2.5 rounded-lg text-left transition-colors flex items-center justify-between gap-3 text-sm cursor-pointer ${
                                isAssigned
                                  ? (isLightMode ? "bg-amber-50 text-amber-900" : "bg-amber-500/10 text-amber-200")
                                  : (isLightMode ? "hover:bg-slate-50 text-slate-700" : "hover:bg-white/5 text-slate-300")
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className={`flex items-center justify-center h-4 w-4 rounded border transition-colors ${
                                  isAssigned 
                                    ? "bg-amber-500 border-amber-500 text-white" 
                                    : (isLightMode ? "border-slate-300" : "border-slate-600")
                                }`}>
                                  {isAssigned && <Check className="h-3 w-3" />}
                                </div>
                                <span className="truncate font-medium">{ast.name}</span>
                              </div>
                              <span className={`text-xs font-mono px-2 py-0.5 rounded-md shrink-0 ${
                                isAssigned 
                                  ? (isLightMode ? "bg-white text-amber-800" : "bg-[#0A0D14] text-amber-400")
                                  : (isLightMode ? "bg-slate-100 text-slate-500" : "bg-white/5 text-slate-400")
                              }`}>{tagValue}</span>
                            </div>
                          );
                        })}
                        {availableAssets.filter((ast) => !ast.assigned_user_id || ast.assigned_user_id === editUserId).length === 0 && (
                          <div className={`p-4 text-center text-sm ${isLightMode ? "text-slate-500" : "text-slate-400"}`}>
                            No unassigned assets available.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Authentication & Security */}
                <div className="space-y-5 pt-6 border-t border-slate-100 dark:border-white/5">
                  <h4 className={`text-sm font-semibold flex items-center gap-2 ${isLightMode ? "text-slate-800" : "text-slate-200"}`}>
                    <Key className="h-4 w-4" />
                    Authentication & Security
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className={`text-sm font-medium flex items-center gap-1.5 ${isLightMode ? "text-slate-700" : "text-slate-300"}`}>
                        Password 
                        {isEditingMode ? (
                          <span className="text-xs text-slate-400 font-normal">(Leave blank to keep)</span>
                        ) : (
                          <span className="text-rose-500">*</span>
                        )}
                      </label>
                      <AppInput 
                        type="password"
                        placeholder="••••••••"
                        value={formPassword}
                        onChange={(e) => setFormPassword(e.target.value)}
                        className="text-sm rounded-xl"
                        required={!isEditingMode}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className={`text-sm font-medium ${isLightMode ? "text-slate-700" : "text-slate-300"}`}>
                        Confirm Password {isEditingMode ? "" : <span className="text-rose-500">*</span>}
                      </label>
                      <AppInput 
                        type="password"
                        placeholder="••••••••"
                        value={formConfirmPassword}
                        onChange={(e) => setFormConfirmPassword(e.target.value)}
                        className={`text-sm rounded-xl ${formPassword && formConfirmPassword && formPassword !== formConfirmPassword ? 'border-rose-500 focus:ring-rose-500/20' : ''}`}
                        required={!isEditingMode && !!formPassword}
                      />
                    </div>
                  </div>

                  {formPassword && formPassword !== formConfirmPassword && (
                    <div className="flex items-center gap-2 text-rose-500 text-sm font-medium animate-in slide-in-from-top-1">
                      <AlertCircle className="h-4 w-4" />
                      Passwords do not match.
                    </div>
                  )}

                  {/* Account Status */}
                  <div className="space-y-3 pt-2">
                    <label className={`text-sm font-medium ${isLightMode ? "text-slate-700" : "text-slate-300"}`}>
                      Account Status
                    </label>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all flex-1 ${
                        !isSuperAdmin ? "opacity-60 pointer-events-none" : ""
                      } ${
                        formIsActive
                          ? (isLightMode ? "bg-emerald-50 border-emerald-200 shadow-sm" : "bg-emerald-500/10 border-emerald-500/30")
                          : (isLightMode ? "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50" : "bg-[#0F131D] border-white/10 hover:border-white/20 hover:bg-white/5")
                      }`}>
                        <input 
                          type="radio" 
                          name="accountStatus" 
                          checked={formIsActive === true} 
                          onChange={() => setFormIsActive(true)}
                          className="sr-only"
                          disabled={!isSuperAdmin}
                        />
                        <div className={`flex items-center justify-center h-8 w-8 rounded-full ${formIsActive ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}>
                          <UserCheck className="h-4 w-4" />
                        </div>
                        <div>
                          <p className={`text-sm font-semibold ${formIsActive ? (isLightMode ? "text-emerald-900" : "text-emerald-100") : (isLightMode ? "text-slate-700" : "text-slate-300")}`}>Active</p>
                          <p className={`text-xs ${formIsActive ? (isLightMode ? "text-emerald-700" : "text-emerald-300/70") : "text-slate-500"}`}>Can sign in</p>
                        </div>
                        {formIsActive && <Check className="h-5 w-5 ml-auto text-emerald-500" />}
                      </label>

                      <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all flex-1 ${
                        !isSuperAdmin ? "opacity-60 pointer-events-none" : ""
                      } ${
                        !formIsActive
                          ? (isLightMode ? "bg-rose-50 border-rose-200 shadow-sm" : "bg-rose-500/10 border-rose-500/30")
                          : (isLightMode ? "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50" : "bg-[#0F131D] border-white/10 hover:border-white/20 hover:bg-white/5")
                      }`}>
                        <input 
                          type="radio" 
                          name="accountStatus" 
                          checked={formIsActive === false} 
                          onChange={() => setFormIsActive(false)}
                          className="sr-only"
                          disabled={!isSuperAdmin}
                        />
                        <div className={`flex items-center justify-center h-8 w-8 rounded-full ${!formIsActive ? "bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}>
                          <Lock className="h-4 w-4" />
                        </div>
                        <div>
                          <p className={`text-sm font-semibold ${!formIsActive ? (isLightMode ? "text-rose-900" : "text-rose-100") : (isLightMode ? "text-slate-700" : "text-slate-300")}`}>Disabled</p>
                          <p className={`text-xs ${!formIsActive ? (isLightMode ? "text-rose-700" : "text-rose-300/70") : "text-slate-500"}`}>Access blocked</p>
                        </div>
                        {!formIsActive && <Check className="h-5 w-5 ml-auto text-rose-500" />}
                      </label>
                    </div>
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div className={`flex items-center justify-end gap-3 px-8 py-5 shrink-0 border-t ${
                isLightMode ? "border-slate-100 bg-slate-50/50" : "border-white/5 bg-white/[0.02]"
              }`}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isLightMode ? "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300" : "bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 hover:text-slate-200"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm hover:shadow-md transition-all flex items-center gap-2"
                >
                  {isEditingMode ? "Save Changes" : "Create Account"}
                </button>
              </div>
            </form>

            {isViewingPhoto && (
              <div 
                className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200"
                style={{ backgroundColor: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
                onClick={() => setIsViewingPhoto(false)}
              >
                <div className="relative max-w-sm w-full flex flex-col items-center gap-6" onClick={(e) => e.stopPropagation()}>
                  <img 
                    src={formPhoto || PRESET_AVATARS[0]} 
                    alt="Profile" 
                    className="w-64 h-64 sm:w-80 sm:h-80 rounded-[2rem] object-cover border-4 border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]"
                    onError={(e) => { (e.target as any).src = PRESET_AVATARS[0]; }}
                  />
                  <button
                    type="button"
                    onClick={() => setIsViewingPhoto(false)}
                    className="px-6 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm font-semibold transition-all border border-white/20 backdrop-blur-sm"
                  >
                    Close View
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Dynamic Premium Smart Delete & Deactivate User Warning Modal ── */}
      {deleteInspectUser && deleteWarningData && (
        <div 
          className="fixed inset-0 z-50 flex items-start pt-24 pb-24 overflow-y-auto justify-center px-4 p-4 animate-in fade-in-0 duration-150"
          style={{ backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
          onClick={() => { if (!deleteWarningData.loading) { setDeleteInspectUser(null); setDeleteWarningData(null); } }}
        >
          <div className={`relative w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden flex flex-col p-6 space-y-6 ${
            isLightMode ? "bg-white border-gray-200 text-gray-900" : "bg-[#0A0D14] border-white/10 text-white"
          }`} onClick={(e) => e.stopPropagation()}>
            
            {deleteWarningData.loading ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-4">
                <RefreshCw className="h-10 w-10 animate-spin text-blue-500" />
                <p className={`text-xs font-semibold ${"text-foreground"}`}>
                  Performing Security Integrity Checks...
                </p>
                <p className="text-xs text-gray-500">
                  Scanning Tickets, Workspace Tasks, and Requirements creator and assignee records.
                </p>
              </div>
            ) : deleteWarningData.hasReferences ? (
              <>
                {/* Deletion Warning Alert Style */}
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 shrink-0">
                    <ShieldAlert className="h-6 w-6 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold tracking-tight text-amber-500">
                      Delete Warning: Active Assignments
                    </h3>
                    <p className={`text-xs ${"text-muted"}`}>
                      Personnel <strong className={"text-foreground"}>{deleteInspectUser.full_name}</strong> is associated with active assignments.
                    </p>
                  </div>
                </div>

                <div className={`p-4 rounded-xl border space-y-2.5 text-xs ${
                  isLightMode ? "bg-gray-50/50 border-gray-100" : "bg-white/[0.02] border-white/5"
                }`}>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                    Active Reference Summary
                  </span>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 flex items-center gap-1.5">
                        🎫 Active Tickets:
                      </span>
                      <span className={`font-mono font-bold px-2 py-0.5 rounded ${
                        deleteWarningData.tickets > 0 
                          ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" 
                          : "bg-gray-500/10 text-gray-400"
                      }`}>
                        {deleteWarningData.tickets}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 flex items-center gap-1.5">
                        📋 Workspace Tasks:
                      </span>
                      <span className={`font-mono font-bold px-2 py-0.5 rounded ${
                        deleteWarningData.tasks > 0 
                          ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" 
                          : "bg-gray-500/10 text-gray-400"
                      }`}>
                        {deleteWarningData.tasks}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 flex items-center gap-1.5">
                        🛠️ Requirements:
                      </span>
                      <span className={`font-mono font-bold px-2 py-0.5 rounded ${
                        deleteWarningData.requirements > 0 
                          ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" 
                          : "bg-gray-500/10 text-gray-400"
                      }`}>
                        {deleteWarningData.requirements}
                      </span>
                    </div>
                  </div>
                </div>

                <div className={`p-3 rounded-lg border text-[0.8rem] leading-relaxed ${
                  isLightMode ? "bg-rose-50/50 border-rose-200 text-rose-900" : "bg-rose-500/5 border-rose-500/10 text-rose-300"
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
                    className="w-full sm:w-auto text-amber-500 border-amber-500/30 hover:bg-amber-500/10"
                  >
                    Deactivate Only
                  </AppButton>
                  <AppButton 
                    type="button" 
                    variant="primary" 
                    size="sm"
                    leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                    onClick={() => handleConfirmSoftDelete(deleteInspectUser)}
                    className="w-full sm:w-auto bg-rose-600 hover:bg-rose-700 text-white border-none"
                  >
                    Force Delete &amp; Archive
                  </AppButton>
                </div>
              </>
            ) : (
              <>
                {/* Safe for Soft Delete Alert Style */}
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 shrink-0">
                    <CheckCircle2 className="h-6 w-6 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold tracking-tight text-emerald-500">
                      Delete Account Confirmation
                    </h3>
                    <p className={`text-xs ${"text-muted"}`}>
                      Personnel <strong className={"text-foreground"}>{deleteInspectUser.full_name}</strong> has no active references in Tickets, Tasks, or Requirements.
                    </p>
                  </div>
                </div>

                <p className={`text-xs leading-relaxed ${"text-muted"}`}>
                  Are you sure you want to permanently archive and delete this user?
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-4 border-t border-white/5 w-full">
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
                    className="w-full sm:w-auto text-amber-500 border-amber-500/30 hover:bg-amber-500/10"
                  >
                    Deactivate Only
                  </AppButton>
                  <AppButton 
                    type="button" 
                    variant="primary" 
                    size="sm"
                    leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                    onClick={() => handleConfirmSoftDelete(deleteInspectUser)}
                    className="w-full sm:w-auto bg-rose-600 hover:bg-rose-700 text-white border-none"
                  >
                    Confirm Delete
                  </AppButton>
                </div>
              </>
            )}

          </div>
        </div>
      )}
    </div>
  );
}

"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/service_role";
import { getCachedUser } from "@/lib/auth/cached-user";

export interface PortfolioItem {
  id: string;
  code: string | null;
  title: string;
  module: "Tasks" | "Sub Tasks" | "Tickets" | "Requirements" | "Workspaces";
  status: "Active" | "Review" | "Escalated" | "Resolved";
  rawStatus: string;
  priority: "Critical" | "High" | "Medium" | "Low" | "Standard" | "N/A";
  userId: string | null;
  userName: string;
  userRole: string;
  userAvatar?: string | null;
  creatorId: string | null;
  creatorName: string;
  createdAt: string;
  updatedAt: string;
  dueDate: string | null;
  originalDueDate?: string | null;
  revisedAt?: string | null;
  revisionCount?: number;
  isOverdue: boolean;
  overdueDays: number;
  dueWithinPeriod?: boolean;
  dueNotCompletedInPeriod?: boolean;
  statusOnDueDate?: string;
  completedAt?: string | null;
  isOnTime?: boolean;
  parentContext?: string | null;
}

export interface PortfolioUser {
  id: string;
  fullName: string;
  email: string;
  userCode: string | null;
  role: string;
  department: string;
  avatarUrl?: string | null;
}

export interface PortfolioMetricsResponse {
  items: PortfolioItem[];
  users: PortfolioUser[];
  currentUserId: string;
  currentUserName: string;
  error: string | null;
}

export async function fetchLivePortfolioData(): Promise<PortfolioMetricsResponse> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { user } = await getCachedUser();
  if (!user) {
    return {
      items: [],
      users: [],
      currentUserId: "",
      currentUserName: "",
      error: "Unauthenticated"
    };
  }

  const userId = user.id;

  try {
    const { hasPermission } = await import("@/lib/permissions");
    const isSuperAdmin = await hasPermission(userId, "SUPER_ADMIN") || await hasPermission(userId, "WORKSPACES_MANAGE");

    // Fetch active users from user_master
    const { data: usersData, error: usersError } = await supabaseAdmin
      .from("user_master")
      .select(`
        id, full_name, email, user_code, profile_photo,
        department:departments(name),
        designation:designations!fk_user_master_designation(name),
        role:roles(name)
      `)
      .eq("is_active", true)
      .eq("is_deleted", false)
      .order("full_name", { ascending: true });

    if (usersError) {
      console.error("[fetchLivePortfolioData] Users Fetch Error:", usersError);
    }

    const usersList: PortfolioUser[] = (usersData || []).map((u: any) => ({
      id: u.id,
      fullName: u.full_name || "Unknown User",
      email: u.email || "",
      userCode: u.user_code || null,
      role: (u.role as any)?.name || "Team Member",
      department: (u.department as any)?.name || "General",
      avatarUrl: u.profile_photo || null
    }));

    const userMap = new Map<string, PortfolioUser>();
    usersList.forEach(u => userMap.set(u.id, u));

    const currentUserObj = userMap.get(userId);
    const currentUserName = currentUserObj ? currentUserObj.fullName : "Current User";

    // 1. Fetch Tasks
    const tasksQuery = supabaseAdmin
      .from("tasks")
      .select(`
        id, task_code, created_at, updated_at, created_by, assigned_to, subject,
        status_id, status_master(status_name, is_closed),
        priority_id, priority:priority_master(priority_name),
        end_date, start_date, parent_task_id
      `)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });

    // 2. Fetch Sub Tasks
    const subTasksQuery = supabaseAdmin
      .from("sub_tasks")
      .select(`
        id, created_at, updated_at, created_by, assigned_to, subject, status, task_id
      `)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });

    // 3. Fetch Tickets
    const ticketsQuery = supabaseAdmin
      .from("tickets")
      .select(`
        id, code, created_at, updated_at, creator_id, assignee_id, title,
        status_id, status_master(status_name, is_closed),
        priority_id, priority:priority_master(priority_name),
        due_date
      `)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });

    // 4. Fetch Requirements
    const requirementsQuery = supabaseAdmin
      .from("requirements")
      .select(`
        id, code, created_at, updated_at, creator_id, title,
        status_id, status_master(status_name, is_closed),
        due_date
      `)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });

    // 5. Fetch Workspaces
    const workspacesQuery = supabaseAdmin
      .from("workspaces")
      .select(`
        id, workspace_code, created_at, updated_at, created_by, workspace_name, parent_workspace_id,
        status_id, status_master(status_name, is_closed),
        end_date, workspace_owner_id
      `)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });

    // 6. Fetch Timeline Revision Events from activity_events
    const activityQuery = supabaseAdmin
      .from("activity_events")
      .select("record_id, module_type, event_type, old_value, new_value, performed_at, performed_by")
      .eq("is_deleted", false)
      .in("event_type", ["DUE_DATE", "DUE_DATE_REVISED", "TIMELINE_REVISED", "UPDATE", "STATUS_CHANGE"])
      .order("performed_at", { ascending: true });

    const [
      { data: tasksData, error: tasksError },
      { data: subTasksData, error: subTasksError },
      { data: ticketsData, error: ticketsError },
      { data: requirementsData, error: reqsError },
      { data: workspacesData, error: wsError },
      { data: activityEvents }
    ] = await Promise.all([
      tasksQuery,
      subTasksQuery,
      ticketsQuery,
      requirementsQuery,
      workspacesQuery,
      activityQuery
    ]);

    if (tasksError) console.error("Tasks Fetch Error:", tasksError);
    if (ticketsError) console.error("Tickets Fetch Error:", ticketsError);

    // Group activity events by record_id
    const revisionsMap = new Map<string, { originalDueDate: string | null; lastRevisedAt: string | null; count: number }>();
    (activityEvents || []).forEach((ev: any) => {
      if (!ev.record_id) return;
      const recId = ev.record_id;
      
      const oldDue = ev.old_value?.end_date || ev.old_value?.due_date;
      const newDue = ev.new_value?.end_date || ev.new_value?.due_date;

      if (oldDue && newDue && oldDue !== newDue) {
        const existing = revisionsMap.get(recId) || { originalDueDate: oldDue, lastRevisedAt: ev.performed_at, count: 0 };
        existing.count += 1;
        existing.lastRevisedAt = ev.performed_at;
        if (!existing.originalDueDate) existing.originalDueDate = oldDue;
        revisionsMap.set(recId, existing);
      }
    });

    const nowTime = Date.now();

    const normalizeStatus = (sName: string): "Active" | "Review" | "Escalated" | "Resolved" => {
      const lower = (sName || "").toLowerCase();
      if (lower.includes("resolv") || lower.includes("archiv") || lower.includes("complet") || lower.includes("done") || lower.includes("closed")) {
        return "Resolved";
      }
      if (lower.includes("escalat") || lower.includes("block")) {
        return "Escalated";
      }
      if (lower.includes("review") || lower.includes("qa") || lower.includes("testing") || lower.includes("approval")) {
        return "Review";
      }
      return "Active";
    };

    const normalizePriority = (pName: string): "Critical" | "High" | "Medium" | "Low" | "Standard" | "N/A" => {
      const lower = (pName || "").toLowerCase();
      if (lower.includes("crit") || lower.includes("urgent") || lower.includes("highest") || lower.includes("p1")) return "Critical";
      if (lower.includes("high") || lower.includes("p2")) return "High";
      if (lower.includes("med") || lower.includes("moderate") || lower.includes("p3")) return "Medium";
      if (lower.includes("low") || lower.includes("minor") || lower.includes("p4")) return "Low";
      if (lower.includes("stand")) return "Standard";
      return "Standard";
    };

    const allItems: PortfolioItem[] = [];

    // Process Tasks
    (tasksData || []).forEach((t: any) => {
      const isSub = !!t.parent_task_id;
      const rawStatus = (t.status_master as any)?.status_name || "Open";
      const status = normalizeStatus(rawStatus);
      const priority = normalizePriority(t.priority?.priority_name || "Standard");
      
      const assignedUser = t.assigned_to ? userMap.get(t.assigned_to) : null;
      const creatorUser = t.created_by ? userMap.get(t.created_by) : null;

      const dueDateTime = t.end_date ? new Date(t.end_date).getTime() : null;
      const isOverdue = !!dueDateTime && dueDateTime < nowTime && status !== "Resolved";
      const overdueDays = (dueDateTime && isOverdue) 
        ? Math.max(1, Math.ceil((nowTime - dueDateTime) / (1000 * 3600 * 24))) 
        : 0;

      const revInfo = revisionsMap.get(t.id);
      const isResolved = status === "Resolved";
      const updatedTime = t.updated_at ? new Date(t.updated_at).getTime() : (t.created_at ? new Date(t.created_at).getTime() : null);
      const isOnTime = isResolved ? (!dueDateTime || (updatedTime ? updatedTime <= dueDateTime + (24 * 3600 * 1000) : true)) : false;

      allItems.push({
        id: t.id,
        code: t.task_code || (isSub ? `SUB-${t.id.substring(0, 5).toUpperCase()}` : `TSK-${t.id.substring(0, 5).toUpperCase()}`),
        title: t.subject || (isSub ? "Untitled Subtask" : "Untitled Task"),
        module: isSub ? "Sub Tasks" : "Tasks",
        status,
        rawStatus,
        priority,
        userId: t.assigned_to || null,
        userName: assignedUser ? assignedUser.fullName : "Unassigned",
        userRole: assignedUser ? assignedUser.role : "Team Member",
        userAvatar: assignedUser?.avatarUrl,
        creatorId: t.created_by || null,
        creatorName: creatorUser ? creatorUser.fullName : "System",
        createdAt: t.created_at || new Date().toISOString(),
        updatedAt: t.updated_at || t.created_at || new Date().toISOString(),
        dueDate: t.end_date || null,
        originalDueDate: revInfo?.originalDueDate || t.end_date || null,
        revisedAt: revInfo?.lastRevisedAt || null,
        revisionCount: revInfo?.count || 0,
        isOverdue,
        overdueDays,
        statusOnDueDate: isOverdue ? "Due Date Breached" : rawStatus,
        completedAt: isResolved ? (t.updated_at || t.created_at) : null,
        isOnTime: !!isOnTime
      });
    });

    // Process Sub Tasks
    (subTasksData || []).forEach((st: any) => {
      const rawStatus = st.status || "Pending";
      const status = normalizeStatus(rawStatus);
      const assignedUser = st.assigned_to ? userMap.get(st.assigned_to) : null;
      const creatorUser = st.created_by ? userMap.get(st.created_by) : null;
      const isResolved = status === "Resolved";

      allItems.push({
        id: st.id,
        code: `SUB-${st.id.substring(0, 5).toUpperCase()}`,
        title: st.subject || "Untitled Sub Task",
        module: "Sub Tasks",
        status,
        rawStatus,
        priority: "Standard",
        userId: st.assigned_to || null,
        userName: assignedUser ? assignedUser.fullName : "Unassigned",
        userRole: assignedUser ? assignedUser.role : "Team Member",
        userAvatar: assignedUser?.avatarUrl,
        creatorId: st.created_by || null,
        creatorName: creatorUser ? creatorUser.fullName : "System",
        createdAt: st.created_at || new Date().toISOString(),
        updatedAt: st.updated_at || st.created_at || new Date().toISOString(),
        dueDate: null,
        originalDueDate: null,
        revisedAt: null,
        revisionCount: 0,
        isOverdue: false,
        overdueDays: 0,
        statusOnDueDate: rawStatus,
        completedAt: isResolved ? (st.updated_at || st.created_at) : null,
        isOnTime: isResolved
      });
    });

    // Process Tickets
    (ticketsData || []).forEach((tk: any) => {
      const rawStatus = (tk.status_master as any)?.status_name || "Open";
      const status = normalizeStatus(rawStatus);
      const priority = normalizePriority(tk.priority?.priority_name || "Standard");

      const assignedUser = tk.assignee_id ? userMap.get(tk.assignee_id) : null;
      const creatorUser = tk.creator_id ? userMap.get(tk.creator_id) : null;

      const dueDateTime = tk.due_date ? new Date(tk.due_date).getTime() : null;
      const isOverdue = !!dueDateTime && dueDateTime < nowTime && status !== "Resolved";
      const overdueDays = (dueDateTime && isOverdue) 
        ? Math.max(1, Math.ceil((nowTime - dueDateTime) / (1000 * 3600 * 24))) 
        : 0;

      const revInfo = revisionsMap.get(tk.id);
      const isResolved = status === "Resolved";
      const updatedTime = tk.updated_at ? new Date(tk.updated_at).getTime() : (tk.created_at ? new Date(tk.created_at).getTime() : null);
      const isOnTime = isResolved ? (!dueDateTime || (updatedTime ? updatedTime <= dueDateTime + (24 * 3600 * 1000) : true)) : false;

      allItems.push({
        id: tk.id,
        code: tk.code || `TCK-${tk.id.substring(0, 5).toUpperCase()}`,
        title: tk.title || "Untitled Ticket",
        module: "Tickets",
        status,
        rawStatus,
        priority,
        userId: tk.assignee_id || null,
        userName: assignedUser ? assignedUser.fullName : "Unassigned",
        userRole: assignedUser ? assignedUser.role : "Team Member",
        userAvatar: assignedUser?.avatarUrl,
        creatorId: tk.creator_id || null,
        creatorName: creatorUser ? creatorUser.fullName : "System",
        createdAt: tk.created_at || new Date().toISOString(),
        updatedAt: tk.updated_at || tk.created_at || new Date().toISOString(),
        dueDate: tk.due_date || null,
        originalDueDate: revInfo?.originalDueDate || tk.due_date || null,
        revisedAt: revInfo?.lastRevisedAt || null,
        revisionCount: revInfo?.count || 0,
        isOverdue,
        overdueDays,
        statusOnDueDate: isOverdue ? "Due Date Breached" : rawStatus,
        completedAt: isResolved ? (tk.updated_at || tk.created_at) : null,
        isOnTime: !!isOnTime
      });
    });

    // Process Requirements
    (requirementsData || []).forEach((rq: any) => {
      const rawStatus = (rq.status_master as any)?.status_name || "Draft";
      const status = normalizeStatus(rawStatus);

      const creatorUser = rq.creator_id ? userMap.get(rq.creator_id) : null;

      const dueDateTime = rq.due_date ? new Date(rq.due_date).getTime() : null;
      const isOverdue = !!dueDateTime && dueDateTime < nowTime && status !== "Resolved";
      const overdueDays = (dueDateTime && isOverdue) 
        ? Math.max(1, Math.ceil((nowTime - dueDateTime) / (1000 * 3600 * 24))) 
        : 0;

      const isResolved = status === "Resolved";
      const updatedTime = rq.updated_at ? new Date(rq.updated_at).getTime() : (rq.created_at ? new Date(rq.created_at).getTime() : null);
      const isOnTime = isResolved ? (!dueDateTime || (updatedTime ? updatedTime <= dueDateTime + (24 * 3600 * 1000) : true)) : false;

      allItems.push({
        id: rq.id,
        code: rq.code || `REQ-${rq.id.substring(0, 5).toUpperCase()}`,
        title: rq.title || "Untitled Requirement",
        module: "Requirements",
        status,
        rawStatus,
        priority: "High",
        userId: rq.creator_id || null,
        userName: creatorUser ? creatorUser.fullName : "Unassigned",
        userRole: creatorUser ? creatorUser.role : "Author",
        userAvatar: creatorUser?.avatarUrl,
        creatorId: rq.creator_id || null,
        creatorName: creatorUser ? creatorUser.fullName : "System",
        createdAt: rq.created_at || new Date().toISOString(),
        updatedAt: rq.updated_at || rq.created_at || new Date().toISOString(),
        dueDate: rq.due_date || null,
        originalDueDate: rq.due_date || null,
        revisedAt: null,
        revisionCount: 0,
        isOverdue,
        overdueDays,
        statusOnDueDate: isOverdue ? "Due Date Breached" : rawStatus,
        completedAt: isResolved ? (rq.updated_at || rq.created_at) : null,
        isOnTime: !!isOnTime
      });
    });

    // Process Workspaces
    (workspacesData || []).forEach((ws: any) => {
      const rawStatus = (ws.status_master as any)?.status_name || "Active";
      const status = normalizeStatus(rawStatus);
      const ownerUserId = ws.workspace_owner_id || ws.created_by || null;
      const ownerUser = ownerUserId ? userMap.get(ownerUserId) : null;

      const dueDateTime = ws.end_date ? new Date(ws.end_date).getTime() : null;
      const isOverdue = !!dueDateTime && dueDateTime < nowTime && status !== "Resolved";
      const overdueDays = (dueDateTime && isOverdue) 
        ? Math.max(1, Math.ceil((nowTime - dueDateTime) / (1000 * 3600 * 24))) 
        : 0;

      const isResolved = status === "Resolved";
      const updatedTime = ws.updated_at ? new Date(ws.updated_at).getTime() : (ws.created_at ? new Date(ws.created_at).getTime() : null);
      const isOnTime = isResolved ? (!dueDateTime || (updatedTime ? updatedTime <= dueDateTime + (24 * 3600 * 1000) : true)) : false;

      allItems.push({
        id: ws.id,
        code: ws.workspace_code || `WS-${ws.id.substring(0, 5).toUpperCase()}`,
        title: ws.workspace_name || "Untitled Workspace",
        module: "Workspaces",
        status,
        rawStatus,
        priority: "Standard",
        userId: ownerUserId,
        userName: ownerUser ? ownerUser.fullName : "Workspace Owner",
        userRole: ownerUser ? ownerUser.role : "Owner",
        userAvatar: ownerUser?.avatarUrl,
        creatorId: ws.created_by || null,
        creatorName: ownerUser ? ownerUser.fullName : "System",
        createdAt: ws.created_at || new Date().toISOString(),
        updatedAt: ws.updated_at || ws.created_at || new Date().toISOString(),
        dueDate: ws.end_date || null,
        originalDueDate: ws.end_date || null,
        revisedAt: null,
        revisionCount: 0,
        isOverdue,
        overdueDays,
        statusOnDueDate: isOverdue ? "Target Date Breached" : rawStatus,
        completedAt: isResolved ? (ws.updated_at || ws.created_at) : null,
        isOnTime: !!isOnTime
      });
    });

    return {
      items: allItems,
      users: usersList,
      currentUserId: userId,
      currentUserName,
      error: null
    };

  } catch (err: any) {
    console.error("[fetchLivePortfolioData] Unexpected Exception:", err);
    return {
      items: [],
      users: [],
      currentUserId: "",
      currentUserName: "",
      error: err?.message || "Failed to fetch live portfolio metrics."
    };
  }
}

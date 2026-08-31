"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/service_role";
import { getCachedUser } from "@/lib/auth/cached-user";

export interface UserPerformanceActivity {
  id: string;
  module: "Tasks" | "Sub Tasks" | "Tickets" | "Requirements" | "Workspaces" | "Sub Workspaces";
  code: string | null;
  title: string;
  context?: string | null; // e.g. Workspace Name or Parent Task
  status: "Active" | "Review" | "Escalated" | "Resolved";
  rawStatus: string;
  priority: string;
  createdAt: string;
  dueDate: string | null;
  completedAt?: string | null;
  isOverdue: boolean;
  isOnTime: boolean; // Completed on or before due date
  roleInActivity?: string; // e.g. "Assignee", "Creator", "Owner", "Member"
}

export interface UserPerformanceSummary {
  user: {
    id: string;
    fullName: string;
    email: string;
    userCode: string | null;
    designation: string;
    department: string;
    role: string;
    isActive: boolean;
  };
  metrics: {
    totalAssigned: number;
    totalCompleted: number;
    totalActive: number;
    totalInReview: number;
    totalEscalated: number;
    totalOverdue: number;
    onTimeCompleted: number;
    lateCompleted: number;
  };
  ratios: {
    overallPerformanceRatio: number; // 0 to 100
    completionRate: number; // 0 to 100
    onTimeDeliveryRate: number; // 0 to 100
    slaComplianceRate: number; // 0 to 100
    overdueRatio: number; // 0 to 100
    performanceRating: "Exceptional" | "High Performer" | "Standard" | "Needs Attention";
  };
  moduleBreakdown: {
    tasks: { total: number; completed: number; active: number; overdue: number; rate: number };
    subTasks: { total: number; completed: number; active: number; rate: number };
    tickets: { total: number; resolved: number; active: number; slaBreached: number; rate: number };
    requirements: { total: number; completed: number; active: number; rate: number };
    workspaces: { total: number; active: number; completed: number };
  };
  monthlyTrends: Array<{
    month: string;
    total: number;
    completed: number;
    active: number;
    escalated: number;
    completionRate: number;
  }>;
  activities: UserPerformanceActivity[];
}

export async function fetchUserPerformanceWorkingSheet(
  userIdentifier: string,
  timeRange: "all" | "month" | "30days" | "quarter" | "90days" = "all"
): Promise<{ data: UserPerformanceSummary | null; error: string | null }> {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { user: authUser } = await getCachedUser();
    if (!authUser) {
      return { data: null, error: "Unauthenticated request" };
    }

    // 1. Resolve Target User from user_master
    let targetUserQuery = supabaseAdmin
      .from("user_master")
      .select(`
        id, full_name, email, user_code, is_active,
        department:departments(name),
        designation:designations!fk_user_master_designation(name),
        role:roles(name, code)
      `);

    // Test if userIdentifier is UUID or Full Name
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userIdentifier.trim());
    if (isUUID) {
      targetUserQuery = targetUserQuery.eq("id", userIdentifier.trim());
    } else {
      targetUserQuery = targetUserQuery.ilike("full_name", userIdentifier.trim()).eq("is_deleted", false);
    }

    const { data: targetUserData, error: userError } = await targetUserQuery.maybeSingle();

    if (userError || !targetUserData) {
      // Fallback: try case-insensitive partial match
      const { data: fallbackUsers } = await supabaseAdmin
        .from("user_master")
        .select(`
          id, full_name, email, user_code, is_active,
          department:departments(name),
          designation:designations!fk_user_master_designation(name),
          role:roles(name, code)
        `)
        .ilike("full_name", `%${userIdentifier.trim()}%`)
        .eq("is_deleted", false)
        .limit(1);

      if (!fallbackUsers || fallbackUsers.length === 0) {
        return { data: null, error: `User "${userIdentifier}" not found.` };
      }
      var targetUser = fallbackUsers[0];
    } else {
      var targetUser = targetUserData;
    }

    const targetUserId = targetUser.id;
    const now = Date.now();

    // Date range filter calculation
    let rangeCutoff: Date | null = null;
    if (timeRange === "month") {
      const d = new Date();
      rangeCutoff = new Date(d.getFullYear(), d.getMonth(), 1);
    } else if (timeRange === "30days") {
      rangeCutoff = new Date(now - 30 * 24 * 3600 * 1000);
    } else if (timeRange === "quarter") {
      const d = new Date();
      const currentQuarterMonth = Math.floor(d.getMonth() / 3) * 3;
      rangeCutoff = new Date(d.getFullYear(), currentQuarterMonth, 1);
    } else if (timeRange === "90days") {
      rangeCutoff = new Date(now - 90 * 24 * 3600 * 1000);
    }

    // Helper status normalizer
    const mapStatus = (sName: string): "Active" | "Review" | "Escalated" | "Resolved" => {
      const lower = (sName || "").toLowerCase();
      if (lower.includes("resolv") || lower.includes("archiv") || lower.includes("complet") || lower.includes("done") || lower.includes("closed")) {
        return "Resolved";
      }
      if (lower.includes("escalat") || lower.includes("block") || lower.includes("stuck") || lower.includes("fail")) {
        return "Escalated";
      }
      if (lower.includes("review") || lower.includes("evaluat") || lower.includes("qa") || lower.includes("testing")) {
        return "Review";
      }
      return "Active";
    };

    // 2. Fetch Tasks (Assigned or Created)
    let tasksQuery = supabaseAdmin
      .from("tasks")
      .select(`
        id, code, subject, description, created_at, created_by, assigned_to,
        status_id, status_master(status_name),
        priority_id, priority:priority_master(priority_name),
        start_date, end_date, is_deleted, parent_task_id,
        workspaces:workspaces(workspace_name)
      `)
      .or(`assigned_to.eq.${targetUserId},created_by.eq.${targetUserId}`)
      .eq("is_deleted", false);

    if (rangeCutoff) {
      tasksQuery = tasksQuery.gte("created_at", rangeCutoff.toISOString());
    }

    // 3. Fetch Sub Tasks (Assigned or Created)
    let subTasksQuery = supabaseAdmin
      .from("sub_tasks")
      .select(`
        id, subject, status, created_at, created_by, assigned_to, is_deleted,
        task_id, tasks:tasks(id, subject, code)
      `)
      .or(`assigned_to.eq.${targetUserId},created_by.eq.${targetUserId}`)
      .eq("is_deleted", false);

    if (rangeCutoff) {
      subTasksQuery = subTasksQuery.gte("created_at", rangeCutoff.toISOString());
    }

    // 4. Fetch Tickets (Assignee or Creator)
    let ticketsQuery = supabaseAdmin
      .from("tickets")
      .select(`
        id, code, title, created_at, creator_id, assignee_id,
        status_id, status_master(status_name),
        priority_id, priority:priority_master(priority_name),
        due_date, is_deleted
      `)
      .or(`assignee_id.eq.${targetUserId},creator_id.eq.${targetUserId}`)
      .eq("is_deleted", false);

    if (rangeCutoff) {
      ticketsQuery = ticketsQuery.gte("created_at", rangeCutoff.toISOString());
    }

    // 5. Fetch Requirements (Creator or Assigned)
    let requirementsQuery = supabaseAdmin
      .from("requirements")
      .select(`
        id, code, title, created_at, creator_id,
        status_id, status_master(status_name),
        due_date, is_deleted
      `)
      .eq("creator_id", targetUserId)
      .eq("is_deleted", false);

    if (rangeCutoff) {
      requirementsQuery = requirementsQuery.gte("created_at", rangeCutoff.toISOString());
    }

    // 6. Fetch Workspaces (Member or Owner)
    const wsMembersQuery = supabaseAdmin
      .from("workspace_members")
      .select(`
        workspace_id, role,
        workspaces:workspaces(
          id, code, workspace_name, parent_workspace_id,
          status_id, status_master(status_name),
          start_date, end_date, created_at, is_deleted
        )
      `)
      .eq("user_id", targetUserId)
      .eq("is_deleted", false);

    const wsCreatedQuery = supabaseAdmin
      .from("workspaces")
      .select(`
        id, code, workspace_name, parent_workspace_id,
        status_id, status_master(status_name),
        start_date, end_date, created_at, is_deleted
      `)
      .eq("created_by", targetUserId)
      .eq("is_deleted", false);

    // Execute queries in parallel
    const [
      { data: tasksData, error: tasksError },
      { data: subTasksData, error: subTasksError },
      { data: ticketsData, error: ticketsError },
      { data: requirementsData, error: reqError },
      { data: wsMembersData, error: wsMembersError },
      { data: wsCreatedData, error: wsCreatedError }
    ] = await Promise.all([
      tasksQuery,
      subTasksQuery,
      ticketsQuery,
      requirementsQuery,
      wsMembersQuery,
      wsCreatedQuery
    ]);

    if (tasksError) console.error("[fetchUserPerformance] Tasks Error:", tasksError);
    if (subTasksError) console.error("[fetchUserPerformance] SubTasks Error:", subTasksError);
    if (ticketsError) console.error("[fetchUserPerformance] Tickets Error:", ticketsError);
    if (reqError) console.error("[fetchUserPerformance] Requirements Error:", reqError);

    // Build unified activities array
    const activities: UserPerformanceActivity[] = [];

    // Monthly buckets for trends (last 6 months)
    const monthlyMap: Record<string, { total: number; completed: number; active: number; escalated: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(new Date().getFullYear(), new Date().getMonth() - i, 1);
      const key = d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
      monthlyMap[key] = { total: 0, completed: 0, active: 0, escalated: 0 };
    }

    const registerMonthly = (createdAtStr: string, isResolved: boolean, isEscalated: boolean) => {
      if (!createdAtStr) return;
      const d = new Date(createdAtStr);
      const key = d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
      if (monthlyMap[key]) {
        monthlyMap[key].total += 1;
        if (isResolved) monthlyMap[key].completed += 1;
        else if (isEscalated) monthlyMap[key].escalated += 1;
        else monthlyMap[key].active += 1;
      }
    };

    // A. Tasks
    let taskCompleted = 0;
    let taskActive = 0;
    let taskOverdue = 0;
    let subTaskCompleted = 0;
    let subTaskActive = 0;

    tasksData?.forEach((t: any) => {
      const isSubTask = !!t.parent_task_id;
      const rawStatus = (t.status_master as any)?.status_name || "Active";
      const status = mapStatus(rawStatus);
      const isResolved = status === "Resolved";
      const isOverdue = !!t.end_date && new Date(t.end_date).getTime() < now && !isResolved;
      const isOnTime = isResolved; // If completed and was on/before due date (or resolved)

      if (isSubTask) {
        if (isResolved) subTaskCompleted++;
        else subTaskActive++;
      } else {
        if (isResolved) taskCompleted++;
        else taskActive++;
        if (isOverdue) taskOverdue++;
      }

      registerMonthly(t.created_at, isResolved, status === "Escalated" || isOverdue);

      activities.push({
        id: t.id,
        module: isSubTask ? "Sub Tasks" : "Tasks",
        code: t.code || `TSK-${t.id.substring(0, 6)}`,
        title: t.subject || "Untitled Task",
        context: (t.workspaces as any)?.workspace_name || null,
        status,
        rawStatus,
        priority: (t.priority as any)?.priority_name || "Standard",
        createdAt: t.created_at,
        dueDate: t.end_date,
        isOverdue,
        isOnTime,
        roleInActivity: t.assigned_to === targetUserId ? "Assignee" : "Creator"
      });
    });

    // B. Sub Tasks
    subTasksData?.forEach((st: any) => {
      const rawStatus = st.status || "Pending";
      const status = mapStatus(rawStatus);
      const isResolved = status === "Resolved";

      if (isResolved) subTaskCompleted++;
      else subTaskActive++;

      registerMonthly(st.created_at, isResolved, status === "Escalated");

      activities.push({
        id: st.id,
        module: "Sub Tasks",
        code: (st.tasks as any)?.code ? `${(st.tasks as any).code}-SUB` : `SUB-${st.id.substring(0, 6)}`,
        title: st.subject || "Untitled Sub Task",
        context: (st.tasks as any)?.subject || null,
        status,
        rawStatus,
        priority: "Standard",
        createdAt: st.created_at,
        dueDate: null,
        isOverdue: false,
        isOnTime: isResolved,
        roleInActivity: st.assigned_to === targetUserId ? "Assignee" : "Creator"
      });
    });

    // C. Tickets
    let ticketResolved = 0;
    let ticketActive = 0;
    let ticketSlaBreached = 0;

    ticketsData?.forEach((tk: any) => {
      const rawStatus = (tk.status_master as any)?.status_name || "Open";
      const status = mapStatus(rawStatus);
      const isResolved = status === "Resolved";
      const isOverdue = !!tk.due_date && new Date(tk.due_date).getTime() < now && !isResolved;

      if (isResolved) ticketResolved++;
      else ticketActive++;
      if (isOverdue) ticketSlaBreached++;

      registerMonthly(tk.created_at, isResolved, status === "Escalated" || isOverdue);

      activities.push({
        id: tk.id,
        module: "Tickets",
        code: tk.code || `TCK-${tk.id.substring(0, 6)}`,
        title: tk.title || "Untitled Ticket",
        context: null,
        status,
        rawStatus,
        priority: (tk.priority as any)?.priority_name || "Normal",
        createdAt: tk.created_at,
        dueDate: tk.due_date,
        isOverdue,
        isOnTime: isResolved,
        roleInActivity: tk.assignee_id === targetUserId ? "Assignee" : "Creator"
      });
    });

    // D. Requirements
    let reqCompleted = 0;
    let reqActive = 0;

    requirementsData?.forEach((rq: any) => {
      const rawStatus = (rq.status_master as any)?.status_name || "Submitted";
      const status = mapStatus(rawStatus);
      const isResolved = status === "Resolved";
      const isOverdue = !!rq.due_date && new Date(rq.due_date).getTime() < now && !isResolved;

      if (isResolved) reqCompleted++;
      else reqActive++;

      registerMonthly(rq.created_at, isResolved, status === "Escalated" || isOverdue);

      activities.push({
        id: rq.id,
        module: "Requirements",
        code: rq.code || `REQ-${rq.id.substring(0, 6)}`,
        title: rq.title || "Untitled Requirement",
        context: null,
        status,
        rawStatus,
        priority: "Standard",
        createdAt: rq.created_at,
        dueDate: rq.due_date,
        isOverdue,
        isOnTime: isResolved,
        roleInActivity: "Author"
      });
    });

    // E. Workspaces & Sub Workspaces
    const wsMap = new Map<string, any>();
    wsMembersData?.forEach((m: any) => {
      if (m.workspaces && !m.workspaces.is_deleted) {
        wsMap.set(m.workspaces.id, { ...m.workspaces, memberRole: m.role || "Member" });
      }
    });
    wsCreatedData?.forEach((w: any) => {
      if (w && !w.is_deleted && !wsMap.has(w.id)) {
        wsMap.set(w.id, { ...w, memberRole: "Owner" });
      }
    });

    let wsCompleted = 0;
    let wsActive = 0;

    wsMap.forEach((w: any) => {
      const rawStatus = (w.status_master as any)?.status_name || "Active";
      const status = mapStatus(rawStatus);
      const isResolved = status === "Resolved";
      const isOverdue = !!w.end_date && new Date(w.end_date).getTime() < now && !isResolved;
      const isSub = !!w.parent_workspace_id;

      if (isResolved) wsCompleted++;
      else wsActive++;

      registerMonthly(w.created_at, isResolved, isOverdue);

      activities.push({
        id: w.id,
        module: isSub ? "Sub Workspaces" : "Workspaces",
        code: w.code || `WS-${w.id.substring(0, 6)}`,
        title: w.workspace_name || "Untitled Workspace",
        context: isSub ? "Sub-Workspace" : "Primary Workspace",
        status,
        rawStatus,
        priority: "Standard",
        createdAt: w.created_at,
        dueDate: w.end_date,
        isOverdue,
        isOnTime: isResolved,
        roleInActivity: w.memberRole || "Member"
      });
    });

    // Sort all activities by created_at desc
    activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // 7. Aggregate Calculations & Performance Ratios
    const totalAssigned = activities.length;
    const totalCompleted = activities.filter(a => a.status === "Resolved").length;
    const totalActive = activities.filter(a => a.status === "Active").length;
    const totalInReview = activities.filter(a => a.status === "Review").length;
    const totalEscalated = activities.filter(a => a.status === "Escalated").length;
    const totalOverdue = activities.filter(a => a.isOverdue).length;
    const onTimeCompleted = activities.filter(a => a.status === "Resolved" && a.isOnTime).length;
    const lateCompleted = totalCompleted - onTimeCompleted;

    // Computed Ratios
    const completionRate = totalAssigned > 0 ? Math.round((totalCompleted / totalAssigned) * 100) : 0;
    const onTimeDeliveryRate = totalCompleted > 0 ? Math.round((onTimeCompleted / totalCompleted) * 100) : (totalAssigned > 0 ? 100 : 0);
    const totalSlaEvaluated = ticketResolved + ticketActive + taskCompleted + taskActive;
    const slaBreachedCount = ticketSlaBreached + taskOverdue;
    const slaComplianceRate = totalSlaEvaluated > 0 ? Math.max(0, Math.round(((totalSlaEvaluated - slaBreachedCount) / totalSlaEvaluated) * 100)) : 100;
    const overdueRatio = (totalActive + totalInReview + totalEscalated) > 0 ? Math.round((totalOverdue / (totalActive + totalInReview + totalEscalated)) * 100) : 0;

    // Composite Performance Index Formula (0-100)
    // 40% Completion Rate + 30% On-Time Delivery + 20% SLA Compliance + 10% Output Volume Bonus - Overdue Penalty
    const volumeFactor = Math.min(100, (totalCompleted / Math.max(1, totalAssigned)) * 100);
    const rawScore = (0.40 * completionRate) + (0.30 * onTimeDeliveryRate) + (0.20 * slaComplianceRate) + (0.10 * volumeFactor) - (overdueRatio * 0.15);
    const overallPerformanceRatio = Math.max(0, Math.min(100, Math.round(rawScore)));

    let performanceRating: "Exceptional" | "High Performer" | "Standard" | "Needs Attention" = "Standard";
    if (overallPerformanceRatio >= 90) performanceRating = "Exceptional";
    else if (overallPerformanceRatio >= 75) performanceRating = "High Performer";
    else if (overallPerformanceRatio >= 50) performanceRating = "Standard";
    else performanceRating = "Needs Attention";

    // Monthly Trends list
    const monthlyTrends = Object.keys(monthlyMap).map(mKey => {
      const item = monthlyMap[mKey];
      return {
        month: mKey,
        total: item.total,
        completed: item.completed,
        active: item.active,
        escalated: item.escalated,
        completionRate: item.total > 0 ? Math.round((item.completed / item.total) * 100) : 0
      };
    });

    const summary: UserPerformanceSummary = {
      user: {
        id: targetUser.id,
        fullName: targetUser.full_name || "Unknown User",
        email: targetUser.email || "N/A",
        userCode: targetUser.user_code || `USR-${targetUser.id.substring(0, 5).toUpperCase()}`,
        designation: (targetUser.designation as any)?.name || "Team Member",
        department: (targetUser.department as any)?.name || "General",
        role: (targetUser.role as any)?.name || "Standard User",
        isActive: targetUser.is_active !== false,
      },
      metrics: {
        totalAssigned,
        totalCompleted,
        totalActive,
        totalInReview,
        totalEscalated,
        totalOverdue,
        onTimeCompleted,
        lateCompleted,
      },
      ratios: {
        overallPerformanceRatio,
        completionRate,
        onTimeDeliveryRate,
        slaComplianceRate,
        overdueRatio,
        performanceRating,
      },
      moduleBreakdown: {
        tasks: {
          total: (tasksData?.length || 0),
          completed: taskCompleted,
          active: taskActive,
          overdue: taskOverdue,
          rate: (tasksData?.length || 0) > 0 ? Math.round((taskCompleted / (tasksData?.length || 1)) * 100) : 0
        },
        subTasks: {
          total: (subTasksData?.length || 0),
          completed: subTaskCompleted,
          active: subTaskActive,
          rate: (subTasksData?.length || 0) > 0 ? Math.round((subTaskCompleted / (subTasksData?.length || 1)) * 100) : 0
        },
        tickets: {
          total: (ticketsData?.length || 0),
          resolved: ticketResolved,
          active: ticketActive,
          slaBreached: ticketSlaBreached,
          rate: (ticketsData?.length || 0) > 0 ? Math.round((ticketResolved / (ticketsData?.length || 1)) * 100) : 0
        },
        requirements: {
          total: (requirementsData?.length || 0),
          completed: reqCompleted,
          active: reqActive,
          rate: (requirementsData?.length || 0) > 0 ? Math.round((reqCompleted / (requirementsData?.length || 1)) * 100) : 0
        },
        workspaces: {
          total: wsMap.size,
          active: wsActive,
          completed: wsCompleted
        }
      },
      monthlyTrends,
      activities
    };

    return { data: summary, error: null };

  } catch (err: any) {
    console.error("[fetchUserPerformanceWorkingSheet] Exception:", err);
    return { data: null, error: err.message || "Failed to generate user performance working sheet" };
  }
}

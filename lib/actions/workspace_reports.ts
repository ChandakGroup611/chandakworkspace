"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/service_role";

export type ReportEntityType = "WORKSPACE" | "SUB_WORKSPACE" | "TASK" | "SUB_TASK";
export type ReportScope = "ALL" | "CREATED_BY_ME" | "ASSIGNED_TO_ME" | "TASK_OWNER";

export async function generateWorkspaceReportData(entityType: ReportEntityType, scope: ReportScope) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Unauthenticated");

  let query: any;
  let isTask = entityType === "TASK" || entityType === "SUB_TASK";

  if (isTask) {
    query = supabaseAdmin
      .from("tasks")
      .select(`
        id,
        code:task_code,
        title:subject,
        description,
        start_date,
        end_date,
        created_at,
        created_by,
        owner_id,
        workspace_id,
        parent_task_id,
        status:status_master!tasks_status_id_fkey(name:status_name, color:status_color),
        priority:priority_master(name:priority_name, color:priority_color),
        workspace:workspaces!workspace_id(name:workspace_name, code:workspace_code),
        assignees:task_participants(user_id, role:participation_role)
      `)
      .eq("is_deleted", false)
      .order('created_at', { ascending: false });

    if (entityType === "TASK") {
      query = query.is("parent_task_id", null);
    } else {
      query = query.not("parent_task_id", "is", null);
    }

  } else {
    query = supabaseAdmin
      .from("workspaces")
      .select(`
        id,
        code:workspace_code,
        title:workspace_name,
        description,
        start_date,
        end_date,
        created_at,
        created_by:workspace_owner_id,
        parent_workspace_id,
        company:company_master(name:company_name),
        status:status_master(name:status_name, color:status_color),
        members:workspace_members(user_id, role)
      `)
      .eq("is_deleted", false)
      .eq("workspace_members.is_deleted", false)
      .order('created_at', { ascending: false });

    if (entityType === "WORKSPACE") {
      query = query.is("parent_workspace_id", null);
    } else {
      query = query.not("parent_workspace_id", "is", null);
    }
  }

  const { data, error } = await query;
  if (error) {
    console.error("Report Generation Error:", error);
    throw new Error(error.message);
  }

  // Extract all unique user IDs needed (creators + assignees/members)
  const userIdsToFetch = new Set<string>();
  
  if (data) {
    data.forEach((item: any) => {
      if (item.created_by) userIdsToFetch.add(item.created_by);
      if (isTask && item.assignees) {
        item.assignees.forEach((a: any) => { if (a.user_id) userIdsToFetch.add(a.user_id); });
      } else if (!isTask && item.members) {
        item.members.forEach((m: any) => { if (m.user_id) userIdsToFetch.add(m.user_id); });
      }
    });
  }

  // Fetch all user details
  const usersMap: Record<string, any> = {};
  const userIdsArray = Array.from(userIdsToFetch);
  
  if (userIdsArray.length > 0) {
    const { data: users } = await supabaseAdmin
      .from("user_master")
      .select("id, full_name, manager_id")
      .in("id", userIdsArray);
      
    if (users) {
      users.forEach((u: any) => usersMap[u.id] = u);
    }
  }

  // Inject user data back into items
  const enrichedData = data ? data.map((item: any) => {
    item.creator = usersMap[item.created_by] || null;
    
    if (isTask && item.assignees) {
      item.assignees = item.assignees.map((a: any) => ({
        ...a,
        user: usersMap[a.user_id] || null
      }));
    } else if (!isTask && item.members) {
      item.members = item.members.map((m: any) => ({
        ...m,
        user: usersMap[m.user_id] || null
      }));
    }
    return item;
  }) : [];

  // Post-process filtering based on scope
  let filteredData = enrichedData;

  if (scope === "CREATED_BY_ME") {
    filteredData = filteredData.filter((item: any) => item.created_by === userId);
  } else if (scope === "ASSIGNED_TO_ME") {
    filteredData = filteredData.filter((item: any) => {
      if (isTask) {
        return item.assignees?.some((a: any) => a.user_id === userId);
      } else {
        return item.members?.some((m: any) => m.user_id === userId);
      }
    });
  } else if (scope === "TASK_OWNER") {
    filteredData = filteredData.filter((item: any) => {
      if (isTask) return item.owner_id === userId;
      else return item.created_by === userId; // workspace owner
    });
  } else if (scope === "ALL") {
    // Standard visibility
    filteredData = filteredData.filter((item: any) => {
      const isCreator = item.created_by === userId;
      const isOwner = isTask ? item.owner_id === userId : item.created_by === userId;
      const isAssigned = isTask 
        ? item.assignees?.some((a: any) => a.user_id === userId)
        : item.members?.some((m: any) => m.user_id === userId);
      return isCreator || isAssigned || isOwner;
    });
  }

  return filteredData.map((item: any) => {
    // Map assigned users to string for easy display
    const assignedArray = isTask ? item.assignees : item.members;
    const assignedString = assignedArray?.map((a: any) => a.user?.full_name || "Unknown").join(", ") || "—";

    return {
      id: item.id,
      code: item.code,
      title: item.title,
      description: item.description,
      workspace: item.workspace ? item.workspace.name : (item.company ? item.company.name : "—"),
      status: item.status?.name || "—",
      status_color: item.status?.color || null,
      priority: item.priority?.name || "—",
      priority_color: item.priority?.color || null,
      start_date: item.start_date,
      end_date: item.end_date,
      created_at: item.created_at,
      creator_name: item.creator?.full_name || "Unknown",
      assigned_to: assignedString
    };
  });
}

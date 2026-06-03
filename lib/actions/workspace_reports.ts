"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/service_role";

export type ReportEntityType = "WORKSPACE" | "SUB_WORKSPACE" | "TASK" | "SUB_TASK";
export type ReportScope = "ALL" | "CREATED_BY_ME" | "ASSIGNED_TO_ME" | "MANAGED_BY_ME";

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
        workspace_id,
        parent_task_id,
        status:status_master!tasks_status_id_fkey(name:status_name),
        priority:priority_master(name:priority_name),
        workspace:workspaces!workspace_id(name:workspace_name, code:workspace_code),
        creator:user_master!created_by(id, full_name, manager_id),
        assignees:task_participants(user_id, role:participation_role, user:user_master!user_id(full_name))
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
        status:status_master(name:status_name),
        creator:user_master!workspace_owner_id(id, full_name, manager_id),
        members:workspace_members(user_id, role, user:user_master!user_id(full_name))
      `)
      .eq("is_deleted", false)
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

  // Post-process filtering based on scope
  let filteredData = data || [];

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
  } else if (scope === "MANAGED_BY_ME") {
    filteredData = filteredData.filter((item: any) => item.creator?.manager_id === userId);
  } else if (scope === "ALL") {
    // Standard visibility
    filteredData = filteredData.filter((item: any) => {
      const isCreator = item.created_by === userId;
      const isAssigned = isTask 
        ? item.assignees?.some((a: any) => a.user_id === userId)
        : item.members?.some((m: any) => m.user_id === userId);
      const isManager = item.creator?.manager_id === userId;
      return isCreator || isAssigned || isManager;
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
      priority: item.priority?.name || "—",
      start_date: item.start_date,
      end_date: item.end_date,
      created_at: item.created_at,
      creator_name: item.creator?.full_name || "Unknown",
      assigned_to: assignedString
    };
  });
}

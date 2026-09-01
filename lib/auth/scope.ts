import { supabaseAdmin } from "@/lib/supabase/service_role";
import { hasPermission } from "@/lib/permissions";

export interface DepartmentSummary {
  id: string;
  name: string;
  code: string;
}

export interface UserAccessScope {
  userId: string;
  isSuperAdmin: boolean;
  isDepartmentHead: boolean;
  isManager: boolean;
  primaryDepartmentId: string | null;
  primaryDepartmentName: string | null;
  // All subordinate users in the reporting line (direct + indirect + self)
  subordinateUserIds: string[];
  // Direct reports only
  directReportIds: string[];
  // All departments managed or present in reporting tree (e.g. CFO managing multiple departments)
  managedDepartmentIds: string[];
  managedDepartments: DepartmentSummary[];
  allDepartments: DepartmentSummary[];
}

export interface ScopeFilterOptions {
  selectedScope?: "ALL" | "DEPT" | "TEAM" | "MINE";
  selectedDepartmentId?: string | null;
}

/**
 * Calculates the complete hierarchical access scope for any user.
 * 👑 Super Admin is 100% bypassed and given universal access by default.
 * 🏢 Multi-Department leadership (e.g. CFO, VP) is automatically aggregated from reporting tree.
 */
export async function getUserAccessScope(userId: string): Promise<UserAccessScope> {
  // 1. Check Super Admin permission first
  const isSuperAdmin = await hasPermission(userId, "SUPER_ADMIN");

  // 2. Fetch user's profile and primary department
  const { data: userProfile } = await supabaseAdmin
    .from("user_master")
    .select("id, full_name, role_id, department_id, manager_id, roles(name), departments(id, name, code)")
    .eq("id", userId)
    .single();

  const primaryDeptId = userProfile?.department_id || null;
  const primaryDeptName = (userProfile?.departments as any)?.name || null;

  // 3. Fetch all active departments in the organization
  const { data: allDeptsData } = await supabaseAdmin
    .from("departments")
    .select("id, name, code")
    .eq("is_deleted", false)
    .order("name", { ascending: true });

  const allDepartments: DepartmentSummary[] = allDeptsData || [];

  // 4. Fetch subordinate tree (direct + indirect reports) via DB recursive CTE RPC
  let subordinateUserIds: string[] = [userId];
  let directReportIds: string[] = [];

  try {
    const { data: rpcSubordinates, error: rpcErr } = await supabaseAdmin
      .rpc("get_subordinate_user_ids", { root_manager_id: userId });

    if (!rpcErr && rpcSubordinates && Array.isArray(rpcSubordinates)) {
      subordinateUserIds = Array.from(new Set([...rpcSubordinates, userId]));
    } else {
      // In-memory fallback
      const { data: directReports } = await supabaseAdmin
        .from("user_master")
        .select("id")
        .eq("manager_id", userId)
        .eq("is_deleted", false);
      if (directReports) {
        subordinateUserIds = Array.from(new Set([userId, ...directReports.map(d => d.id)]));
      }
    }
  } catch (e) {
    console.error("[ScopeEngine] Error fetching subordinate tree:", e);
  }

  // Get direct reports only
  const { data: directReps } = await supabaseAdmin
    .from("user_master")
    .select("id")
    .eq("manager_id", userId)
    .eq("is_deleted", false);
  directReportIds = directReps?.map(d => d.id) || [];

  const isManager = subordinateUserIds.length > 1;

  // 5. Multi-Department Scope Calculation (Handles CFO / Multi-Department Heads)
  let managedDepartmentIds: string[] = [];
  try {
    const { data: rpcDepts, error: rpcDeptErr } = await supabaseAdmin
      .rpc("get_user_managed_department_ids", { target_user_id: userId });

    if (!rpcDeptErr && rpcDepts && Array.isArray(rpcDepts)) {
      managedDepartmentIds = Array.from(new Set(rpcDepts.filter(Boolean)));
    } else {
      // In-memory fallback: own department + departments where subordinates work
      const deptIds = new Set<string>();
      if (primaryDeptId) deptIds.add(primaryDeptId);
      
      // Fetch departments of all subordinate users
      if (subordinateUserIds.length > 0) {
        const { data: subDeptUsers } = await supabaseAdmin
          .from("user_master")
          .select("department_id")
          .in("id", subordinateUserIds)
          .not("department_id", "is", null)
          .eq("is_deleted", false);
        subDeptUsers?.forEach(u => {
          if (u.department_id) deptIds.add(u.department_id);
        });
      }
      managedDepartmentIds = Array.from(deptIds);
    }
  } catch (e) {
    console.error("[ScopeEngine] Error calculating managed departments:", e);
    managedDepartmentIds = primaryDeptId ? [primaryDeptId] : [];
  }

  // Check if caller is explicit HOD / Manager of any department
  const isDepartmentHead = isSuperAdmin || managedDepartmentIds.length > 0 || (
    allDepartments.some(d => d.id === primaryDeptId)
  );

  const managedDepartments: DepartmentSummary[] = allDepartments.filter(d => 
    managedDepartmentIds.includes(d.id)
  );

  return {
    userId,
    isSuperAdmin,
    isDepartmentHead,
    isManager,
    primaryDepartmentId: primaryDeptId,
    primaryDepartmentName: primaryDeptName,
    subordinateUserIds,
    directReportIds,
    managedDepartmentIds,
    managedDepartments: isSuperAdmin ? allDepartments : managedDepartments,
    allDepartments
  };
}

/**
 * Applies hierarchical filtering constraints to any entity query.
 * 👑 Super Admin is 100% bypassed when viewing ALL scope.
 */
export function applyHierarchyScopeFilter(
  query: any,
  scope: UserAccessScope,
  options?: ScopeFilterOptions & {
    userField?: string;
    departmentField?: string;
    creatorField?: string;
  }
) {
  const userField = options?.userField || "assigned_to";
  const creatorField = options?.creatorField || "created_by";
  const deptField = options?.departmentField || "department_id";
  const selectedScope = options?.selectedScope || "ALL";

  // 1. Super Admin universal access
  if (scope.isSuperAdmin) {
    if (selectedScope === "ALL" && !options?.selectedDepartmentId) {
      return query; // 👑 Full universal visibility
    }
  }

  // 2. Specific Department explicitly chosen (e.g. CFO selecting "Finance" or "Accounts")
  if (options?.selectedDepartmentId) {
    return query.eq(deptField, options.selectedDepartmentId);
  }

  // 3. Personal Scope ("Assigned to Me / Created by Me")
  if (selectedScope === "MINE") {
    return query.or(`${userField}.eq.${scope.userId},${creatorField}.eq.${scope.userId}`);
  }

  // 4. Team Reporting Line Scope ("My Reporting Line")
  if (selectedScope === "TEAM" || (!scope.isSuperAdmin && scope.isManager && selectedScope !== "DEPT")) {
    if (scope.subordinateUserIds.length > 0) {
      return query.in(userField, scope.subordinateUserIds);
    }
  }

  // 5. Department Scope ("My Departments")
  if (selectedScope === "DEPT" || (!scope.isSuperAdmin && scope.managedDepartmentIds.length > 0)) {
    if (scope.managedDepartmentIds.length > 0) {
      return query.in(deptField, scope.managedDepartmentIds);
    }
  }

  // 6. Default Fallback for regular individual contributors
  if (!scope.isSuperAdmin) {
    return query.or(`${userField}.eq.${scope.userId},${creatorField}.eq.${scope.userId}`);
  }

  return query;
}

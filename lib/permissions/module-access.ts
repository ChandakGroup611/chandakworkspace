import { supabaseAdmin } from "@/lib/supabase/service_role";

// ============================================================================
// Chandak Workspace — Module-Wise RBAC Authorization Engine
// Specification: docs/MODULE_RBAC_DESIGN.md & docs/ACCESS_RULES.md
// ============================================================================

export type ModuleCode =
  | "TASK_WORKFLOW"
  | "VEHICLE_DESK"
  | "DESIGN_TRACKING"
  | "CHANDAK_MEET"
  | "ORG_BUDGET"
  | "DASHBOARDS";

export interface ModuleScope {
  type: "all" | "projects" | "departments" | "workspaces" | "vehicles" | "companies";
  project_ids?: (string | number)[];
  department_ids?: string[];
  workspace_ids?: string[];
  vehicle_ids?: string[];
  company_ids?: number[];
}

export interface UserModuleRole {
  module_code: ModuleCode;
  role_code: string;
  role_name: string;
  permissions: string[];
  scope: ModuleScope;
  is_default: boolean;
  dashboard_key?: string | null;
}

export interface RecordScopeConstraint {
  project_id?: string | number | null;
  department_id?: string | null;
  workspace_id?: string | null;
  vehicle_id?: string | null;
  company_id?: number | null;
  dashboard_key?: string | null;
}

interface ModuleRoleDef {
  module_code: string;
  role_code: string;
  name: string;
  permissions: string[];
}

// Global in-memory cache for static module roles (24 rows)
let moduleRolesCache: Map<string, ModuleRoleDef> | null = null;
let moduleRolesCacheExpiresAt = 0;
const ROLES_CACHE_TTL_MS = 5 * 60_000; // 5-minute TTL

// User-level context cache
interface UserContextCache {
  isSuperAdmin: boolean;
  modules: Map<string, UserModuleRole>;
  expiresAt: number;
}

const userAccessCache = new Map<string, UserContextCache>();
const USER_CACHE_TTL_MS = 60_000; // 1-minute TTL

/**
 * Fetch and cache all module role definitions.
 */
export async function getModuleRoleRegistry(): Promise<Map<string, ModuleRoleDef>> {
  if (moduleRolesCache && moduleRolesCacheExpiresAt > Date.now()) {
    return moduleRolesCache;
  }

  const { data, error } = await supabaseAdmin
    .from("module_roles")
    .select("module_code, role_code, name, permissions");

  if (error || !data) {
    console.error("Failed to load module_roles registry:", error);
    return moduleRolesCache || new Map();
  }

  const map = new Map<string, ModuleRoleDef>();
  for (const row of data) {
    const key = `${row.module_code}:${row.role_code}`;
    map.set(key, {
      module_code: row.module_code,
      role_code: row.role_code,
      name: row.name,
      permissions: Array.isArray(row.permissions) ? row.permissions : [],
    });
  }

  moduleRolesCache = map;
  moduleRolesCacheExpiresAt = Date.now() + ROLES_CACHE_TTL_MS;
  return map;
}

/**
 * Invalidate the module access cache for a specific user, or for all users.
 */
export function invalidateModuleAccessCache(userId?: string): void {
  if (userId) {
    userAccessCache.delete(userId);
  } else {
    userAccessCache.clear();
    moduleRolesCache = null;
    moduleRolesCacheExpiresAt = 0;
  }
}

/**
 * Fetch and cache the complete RBAC context for a user.
 */
async function loadUserModuleContext(userId: string): Promise<UserContextCache> {
  const cached = userAccessCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached;
  }

  // Pre-load roles registry and fetch user data in parallel
  const [roleRegistry, userRes, secondaryRolesRes, accessRes] = await Promise.all([
    getModuleRoleRegistry(),
    supabaseAdmin
      .from("user_master")
      .select("id, is_active, is_deleted, role_id, roles:role_id(code)")
      .eq("id", userId)
      .maybeSingle(),
    supabaseAdmin
      .from("user_roles")
      .select("roles:role_id(code)")
      .eq("user_id", userId),
    supabaseAdmin
      .from("user_module_access")
      .select("module_code, role_code, dashboard_key, scope, is_default")
      .eq("user_id", userId)
  ]);

  // If user does not exist, or is deleted, or is inactive -> zero access
  if (!userRes.data || userRes.data.is_deleted || !userRes.data.is_active) {
    const emptyContext: UserContextCache = {
      isSuperAdmin: false,
      modules: new Map(),
      expiresAt: Date.now() + USER_CACHE_TTL_MS,
    };
    userAccessCache.set(userId, emptyContext);
    return emptyContext;
  }

  // Determine Super Admin status
  const roleCodes: string[] = [];
  const primaryCode = (userRes.data?.roles as any)?.code;
  if (primaryCode) roleCodes.push(String(primaryCode).toUpperCase());

  if (secondaryRolesRes.data) {
    for (const r of secondaryRolesRes.data) {
      const code = (r.roles as any)?.code;
      if (code) roleCodes.push(String(code).toUpperCase());
    }
  }

  const isSuperAdmin = roleCodes.some(c =>
    ["SUPER_ADMIN", "ROLE_SUPER_ADMIN", "ADMIN", "ROLE_ADMIN"].includes(c)
  );

  // Build module map
  const moduleMap = new Map<string, UserModuleRole>();

  if (accessRes.data) {
    for (const row of accessRes.data) {
      const roleKey = `${row.module_code}:${row.role_code}`;
      const roleDef = roleRegistry.get(roleKey);

      const roleObj: UserModuleRole = {
        module_code: row.module_code as ModuleCode,
        role_code: row.role_code,
        role_name: roleDef?.name || row.role_code,
        permissions: roleDef?.permissions || [],
        scope: (row.scope as ModuleScope) || { type: "all" },
        is_default: Boolean(row.is_default),
        dashboard_key: row.dashboard_key || null,
      };

      // Register under specific key (e.g. DASHBOARDS:it) and general module code
      const mapKey = row.dashboard_key
        ? `${row.module_code}:${row.dashboard_key}`
        : row.module_code;
      moduleMap.set(mapKey, roleObj);

      if (!moduleMap.has(row.module_code)) {
        moduleMap.set(row.module_code, roleObj);
      }
    }
  }

  const userContext: UserContextCache = {
    isSuperAdmin,
    modules: moduleMap,
    expiresAt: Date.now() + USER_CACHE_TTL_MS,
  };

  userAccessCache.set(userId, userContext);
  return userContext;
}

/**
 * Authorize an operational action in a given module for a user.
 * 
 * 1. Checks if user is SUPER_ADMIN -> bypasses all checks and returns true.
 * 2. Fetches user's role and scope from user_module_access + module_roles.
 * 3. Checks if requested action exists in role permissions array.
 * 4. Evaluates record-level scope constraints (projects, departments, workspaces, vehicles, companies).
 */
export async function can(
  userId: string,
  moduleCode: ModuleCode,
  action: string,
  record?: RecordScopeConstraint
): Promise<boolean> {
  if (!userId) return false;

  const ctx = await loadUserModuleContext(userId);

  // 1. Root Super Admin Global Override
  if (ctx.isSuperAdmin) {
    return true;
  }

  // 2. Resolve Module Access Record
  let access: UserModuleRole | undefined;
  if (moduleCode === "DASHBOARDS" && record?.dashboard_key) {
    access = ctx.modules.get(`DASHBOARDS:${record.dashboard_key}`) || ctx.modules.get("DASHBOARDS");
  } else {
    access = ctx.modules.get(moduleCode);
  }

  if (!access) {
    return false;
  }

  // 3. Permission String Verification
  if (!access.permissions.includes(action)) {
    return false;
  }

  // 4. Record-level Scope Verification
  if (!record || !access.scope || access.scope.type === "all") {
    return true;
  }

  const scope = access.scope;

  if (scope.type === "projects" && record.project_id !== undefined && record.project_id !== null) {
    const allowedProjects = (scope.project_ids || []).map(String);
    return allowedProjects.includes(String(record.project_id));
  }

  if (scope.type === "departments" && record.department_id) {
    const allowedDepts = scope.department_ids || [];
    return allowedDepts.includes(record.department_id);
  }

  if (scope.type === "workspaces" && record.workspace_id) {
    const allowedWorkspaces = scope.workspace_ids || [];
    return allowedWorkspaces.includes(record.workspace_id);
  }

  if (scope.type === "vehicles" && record.vehicle_id) {
    const allowedVehicles = scope.vehicle_ids || [];
    return allowedVehicles.includes(record.vehicle_id);
  }

  if (scope.type === "companies" && record.company_id !== undefined && record.company_id !== null) {
    const allowedCompanies = (scope.company_ids || []).map(Number);
    return allowedCompanies.includes(Number(record.company_id));
  }

  return true;
}

/**
 * Retrieve active module role and scope details for a user in a module.
 */
export async function getModuleRole(
  userId: string,
  moduleCode: ModuleCode,
  dashboardKey?: string
): Promise<UserModuleRole | null> {
  if (!userId) return null;

  const ctx = await loadUserModuleContext(userId);

  if (ctx.isSuperAdmin) {
    if (moduleCode === "DASHBOARDS") {
      return {
        module_code: "DASHBOARDS",
        role_code: "EDITOR",
        role_name: "Super Administrator",
        permissions: ["VIEW", "DETAILS", "EXPORT", "SCHEDULE", "CHAT", "ADMIN"],
        scope: { type: "all" },
        is_default: false,
        dashboard_key: dashboardKey || null,
      };
    }
  }

  if (moduleCode === "DASHBOARDS" && dashboardKey) {
    const exact = ctx.modules.get(`DASHBOARDS:${dashboardKey}`);
    if (exact) return exact;
  }

  return ctx.modules.get(moduleCode) || null;
}

/**
 * Retrieve all module roles and scopes assigned to a user.
 */
export async function getAllUserModuleRoles(userId: string): Promise<UserModuleRole[]> {
  if (!userId) return [];
  const ctx = await loadUserModuleContext(userId);
  return Array.from(ctx.modules.values());
}

/**
 * Strict permission assertion: throws an Error if the user lacks the permission.
 */
export async function requireModulePermission(
  userId: string,
  moduleCode: ModuleCode,
  action: string,
  record?: RecordScopeConstraint
): Promise<void> {
  const allowed = await can(userId, moduleCode, action, record);
  if (!allowed) {
    throw new Error(`Unauthorized: User lacks "${action}" permission on ${moduleCode}`);
  }
}

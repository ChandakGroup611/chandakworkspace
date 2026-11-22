/**
 * Core Types & Contracts for Dynamic Module Registry & Module-Wise RBAC
 * Governance: Master Architecture Blueprint v2.0
 */

export type ModuleLifecycleStatus = "ACTIVE" | "BETA" | "DISABLED" | "ARCHIVED";

export type ScopeType =
  | "all"
  | "projects"
  | "departments"
  | "workspaces"
  | "vehicles"
  | "companies";

export interface ScopeConfiguration {
  supportedTypes: ScopeType[];
  defaultType: ScopeType;
  entityLabel?: string;
}

export type PermissionCategory =
  | "VIEW"
  | "CREATE"
  | "EDIT"
  | "DELETE"
  | "APPROVE"
  | "EXPORT"
  | "ADMINISTER"
  | "CONFIGURE";

export interface PermissionDeclaration {
  code: string;
  name: string;
  description?: string;
  category: PermissionCategory;
  isSensitive?: boolean;
}

export interface RoleDeclaration {
  code: string;
  name: string;
  description: string;
  isSystem: boolean; // Mandatory 'STANDARD' must have isSystem: true
}

export interface ModuleManifest {
  code: string;
  name: string;
  description: string;
  icon: string; // Lucide icon identifier
  routePath: string;
  displayOrder: number;
  status: ModuleLifecycleStatus;
  scopeConfig: ScopeConfiguration;
  rbacAdminRoute?: string;
  roles: RoleDeclaration[]; // MUST contain STANDARD
  permissions: PermissionDeclaration[];
  defaultPolicies: Record<string, string[]>; // role_code -> permission codes
}

export interface ModuleRegistryContract {
  modules: Record<string, ModuleManifest>;
  getModules: () => ModuleManifest[];
  getModule: (code: string) => ModuleManifest | null;
  getActiveModules: () => ModuleManifest[];
}

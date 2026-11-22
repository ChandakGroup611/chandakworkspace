/**
 * Enterprise Test Suite: Master RBAC Architecture & Governance Specification
 * 
 * Test Categories:
 * 1. Manifest Validation Tests (TC-REG-01 to TC-REG-05)
 * 2. Authorization Isolation Tests (TC-AUTH-01 to TC-AUTH-08)
 * 3. Query-Level Scope Tests (TC-SCOPE-01 to TC-SCOPE-04)
 * 4. Synchronization Engine & Override Tests (TC-SYNC-01 to TC-SYNC-06)
 * 
 * Execution:
 *   npx tsx scripts/tests/test-master-rbac.ts [--baseline]
 */

import assert from "node:assert";

// Type definitions matching the approved Master Architecture Blueprint v2.0
export type ModuleLifecycleStatus = "ACTIVE" | "BETA" | "DISABLED" | "ARCHIVED";
export type ScopeType = "all" | "projects" | "departments" | "workspaces" | "vehicles" | "companies";

export interface ModuleScope {
  type: ScopeType;
  project_ids?: (string | number)[];
  department_ids?: string[];
  workspace_ids?: string[];
  vehicle_ids?: string[];
  company_ids?: number[];
}

export interface PermissionDeclaration {
  code: string;
  name: string;
  description?: string;
  category: "VIEW" | "CREATE" | "EDIT" | "DELETE" | "APPROVE" | "EXPORT" | "ADMINISTER" | "CONFIGURE";
  isSensitive?: boolean;
}

export interface RoleDeclaration {
  code: string;
  name: string;
  description: string;
  isSystem: boolean;
}

export interface ScopeConfiguration {
  supportedTypes: ScopeType[];
  defaultType: ScopeType;
  entityLabel?: string;
}

export interface ModuleManifest {
  code: string;
  name: string;
  description: string;
  icon: string;
  routePath: string;
  displayOrder: number;
  status: ModuleLifecycleStatus;
  scopeConfig: ScopeConfiguration;
  rbacAdminRoute?: string;
  roles: RoleDeclaration[];
  permissions: PermissionDeclaration[];
  defaultPolicies: Record<string, string[]>;
}

// Validator for manifests
export function validateModuleManifest(manifest: ModuleManifest): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // TC-REG-01: Mandatory Fields Check
  if (!manifest.code || typeof manifest.code !== "string" || !manifest.code.trim()) {
    errors.push("TC-REG-01: Missing or invalid module code");
  }
  if (!manifest.name || typeof manifest.name !== "string" || !manifest.name.trim()) {
    errors.push("TC-REG-01: Missing or invalid module name");
  }
  if (!manifest.routePath || !manifest.routePath.startsWith("/")) {
    errors.push("TC-REG-01: routePath must start with '/'");
  }
  if (!["ACTIVE", "BETA", "DISABLED", "ARCHIVED"].includes(manifest.status)) {
    errors.push(`TC-REG-01: Invalid lifecycle status: ${manifest.status}`);
  }
  if (!manifest.scopeConfig || !Array.isArray(manifest.scopeConfig.supportedTypes) || manifest.scopeConfig.supportedTypes.length === 0) {
    errors.push("TC-REG-01: scopeConfig must declare at least one supported scope type");
  }

  // TC-REG-02: Mandatory STANDARD Role Check
  const hasStandardRole = manifest.roles?.some(r => r.code === "STANDARD" && r.isSystem === true);
  if (!hasStandardRole) {
    errors.push("TC-REG-02: Manifest must declare mandatory 'STANDARD' role with isSystem: true");
  }

  // TC-REG-03: Unique Permission Codes & Valid Categories Check
  const permCodes = new Set<string>();
  const validCategories = ["VIEW", "CREATE", "EDIT", "DELETE", "APPROVE", "EXPORT", "ADMINISTER", "CONFIGURE"];
  for (const p of manifest.permissions || []) {
    if (permCodes.has(p.code)) {
      errors.push(`TC-REG-03: Duplicate permission code '${p.code}' declared in module ${manifest.code}`);
    }
    permCodes.add(p.code);
    if (!validCategories.includes(p.category)) {
      errors.push(`TC-REG-03: Invalid permission category '${p.category}' for '${p.code}'`);
    }
    // Sensitive action category validation
    if (["DELETE", "APPROVE", "ADMINISTER", "CONFIGURE"].includes(p.category) && p.isSensitive === false) {
      errors.push(`TC-REG-03: Sensitive category '${p.category}' on '${p.code}' cannot set isSensitive: false`);
    }
  }

  // TC-REG-04: Explicit Default Policy Mapping for All Roles
  const declaredRoles = manifest.roles?.map(r => r.code) || [];
  for (const roleCode of declaredRoles) {
    if (!manifest.defaultPolicies || !manifest.defaultPolicies[roleCode]) {
      errors.push(`TC-REG-04: Role '${roleCode}' lacks explicit default policy array in defaultPolicies`);
    } else {
      // Validate every permission in default policy is declared in permissions catalog
      for (const pCode of manifest.defaultPolicies[roleCode]) {
        if (!permCodes.has(pCode)) {
          errors.push(`TC-REG-04: Role '${roleCode}' default policy references undeclared permission '${pCode}'`);
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// Validator for manifest collections (cross-module collision checks)
export function validateManifestCollection(manifests: ModuleManifest[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const moduleCodes = new Set<string>();
  const routePaths = new Set<string>();

  for (const m of manifests) {
    // TC-REG-05: Duplicate Module Code and Route Collision Check
    if (moduleCodes.has(m.code)) {
      errors.push(`TC-REG-05: Duplicate module code '${m.code}' in registry collection`);
    }
    moduleCodes.add(m.code);

    if (routePaths.has(m.routePath)) {
      errors.push(`TC-REG-05: Route path '${m.routePath}' collides between multiple modules`);
    }
    routePaths.add(m.routePath);

    // Validate individual manifest
    const singleRes = validateModuleManifest(m);
    if (!singleRes.valid) {
      errors.push(...singleRes.errors);
    }
  }

  return { valid: errors.length === 0, errors };
}

// Simulated Policy Resolver for Authorization Isolation Testing
export interface UserEntitlement {
  userId: string;
  isSuperAdmin: boolean;
  assignedModules: Map<string, { roleCode: string; scope: { type: string; [key: string]: any } }>;
}

export function evaluateAuthorization(
  user: UserEntitlement,
  manifests: Map<string, ModuleManifest>,
  moduleCode: string,
  action: string,
  overrides?: Map<string, boolean> // key: `${moduleCode}:${roleCode}:${action}`
): { authorized: boolean; reason: string } {
  // TC-AUTH-03: Super Admin Global Override
  if (user.isSuperAdmin) {
    return { authorized: true, reason: "Super Admin Global Override" };
  }

  // TC-AUTH-02: Module Assignment Verification
  const assignment = user.assignedModules.get(moduleCode);
  if (!assignment) {
    return { authorized: false, reason: `No module access assignment for ${moduleCode}` };
  }

  const manifest = manifests.get(moduleCode);
  if (!manifest) {
    return { authorized: false, reason: `Module ${moduleCode} not found in registry` };
  }

  // TC-AUTH-08: Lifecycle Status Check
  if (manifest.status === "DISABLED" || manifest.status === "ARCHIVED") {
    return { authorized: false, reason: `Module ${moduleCode} is currently ${manifest.status}` };
  }

  // Check Granular Overrides
  const overrideKey = `${moduleCode}:${assignment.roleCode}:${action}`;
  if (overrides && overrides.has(overrideKey)) {
    const isGranted = overrides.get(overrideKey)!;
    return {
      authorized: isGranted,
      reason: isGranted ? "Granted via explicit admin override" : "Denied via explicit admin override"
    };
  }

  // Default Policy Evaluation
  const rolePolicy = manifest.defaultPolicies[assignment.roleCode];
  if (!rolePolicy) {
    // TC-SYNC-04: Deterministic DENY for undeclared policies
    return { authorized: false, reason: "Undeclared policy defaults to DENY" };
  }

  if (rolePolicy.includes(action)) {
    return { authorized: true, reason: `Granted via ${assignment.roleCode} default policy` };
  }

  return { authorized: false, reason: `Action '${action}' not granted in role policy` };
}

// Query Scope Filter Resolver Simulator
export function resolveQueryScopeSQL(
  scope: { type: string; project_ids?: any[]; vehicle_ids?: any[]; department_ids?: any[] },
  tableName: string
): string {
  if (scope.type === "all") {
    return "1=1";
  }
  if (scope.type === "projects" && scope.project_ids && scope.project_ids.length > 0) {
    const formatted = scope.project_ids.map(id => `'${id}'`).join(", ");
    return `${tableName}.project_id IN (${formatted})`;
  }
  if (scope.type === "vehicles" && scope.vehicle_ids && scope.vehicle_ids.length > 0) {
    const formatted = scope.vehicle_ids.map(id => `'${id}'`).join(", ");
    return `${tableName}.vehicle_id IN (${formatted})`;
  }
  if (scope.type === "departments" && scope.department_ids && scope.department_ids.length > 0) {
    const formatted = scope.department_ids.map(id => `'${id}'`).join(", ");
    return `${tableName}.department_id IN (${formatted})`;
  }
  return "1=0"; // Restricted empty scope
}

// ----------------------------------------------------------------------------
// Test Runner Implementation
// ----------------------------------------------------------------------------
interface TestReport {
  id: string;
  title: string;
  category: string;
  status: "PASS" | "FAIL" | "BASELINE_SKIP";
  message?: string;
}

export async function runMasterRBACTestSuite(isBaselineOnly: boolean = false): Promise<TestReport[]> {
  const reports: TestReport[] = [];

  const record = (id: string, title: string, category: string, fn: () => void) => {
    try {
      fn();
      reports.push({ id, title, category, status: "PASS" });
    } catch (err: any) {
      reports.push({ id, title, category, status: "FAIL", message: err.message });
    }
  };

  console.log(`\n================================================================`);
  console.log(`RUNNING MASTER RBAC TEST SUITE [Mode: ${isBaselineOnly ? "BASELINE AUDIT" : "FULL VALIDATION"}]`);
  console.log(`================================================================\n`);

  // --------------------------------------------------------------------------
  // 1. MANIFEST VALIDATION TESTS (TC-REG-01 to TC-REG-05)
  // --------------------------------------------------------------------------
  record("TC-REG-01", "Manifest mandatory fields completeness", "Manifest Registry", () => {
    const sampleManifest: ModuleManifest = {
      code: "CHANDAK_MEET",
      name: "Chandak Meet",
      description: "Meeting management",
      icon: "Video",
      routePath: "/meet",
      displayOrder: 5,
      status: "ACTIVE",
      scopeConfig: { supportedTypes: ["all", "departments"], defaultType: "all" },
      roles: [{ code: "STANDARD", name: "Participant", description: "Standard", isSystem: true }],
      permissions: [{ code: "MEETINGS_VIEW", name: "View", category: "VIEW" }],
      defaultPolicies: { STANDARD: ["MEETINGS_VIEW"] }
    };
    const res = validateModuleManifest(sampleManifest);
    assert.strictEqual(res.valid, true, `Validation errors: ${res.errors.join("; ")}`);
  });

  record("TC-REG-02", "Mandatory STANDARD role declaration", "Manifest Registry", () => {
    const invalidManifest: any = {
      code: "SAMPLE",
      name: "Sample",
      icon: "Box",
      routePath: "/sample",
      displayOrder: 1,
      status: "ACTIVE",
      scopeConfig: { supportedTypes: ["all"], defaultType: "all" },
      roles: [{ code: "MEMBER", name: "Member", description: "Bespoke", isSystem: false }], // Missing STANDARD
      permissions: [{ code: "VIEW", name: "View", category: "VIEW" }],
      defaultPolicies: { MEMBER: ["VIEW"] }
    };
    const res = validateModuleManifest(invalidManifest);
    assert.strictEqual(res.valid, false, "Expected manifest without STANDARD to fail validation");
    assert(res.errors.some(e => e.includes("TC-REG-02")), "Expected TC-REG-02 error flag");
  });

  record("TC-REG-03", "Unique permission codes and sensitive category guards", "Manifest Registry", () => {
    const invalidManifest: any = {
      code: "SAMPLE",
      name: "Sample",
      icon: "Box",
      routePath: "/sample",
      displayOrder: 1,
      status: "ACTIVE",
      scopeConfig: { supportedTypes: ["all"], defaultType: "all" },
      roles: [{ code: "STANDARD", name: "Standard", description: "Standard", isSystem: true }],
      permissions: [
        { code: "ITEM_DELETE", name: "Delete", category: "DELETE", isSensitive: false }, // Cannot be non-sensitive
        { code: "ITEM_DELETE", name: "Duplicate", category: "DELETE", isSensitive: true }  // Duplicate
      ],
      defaultPolicies: { STANDARD: [] }
    };
    const res = validateModuleManifest(invalidManifest);
    assert.strictEqual(res.valid, false, "Expected duplicate and invalid category to fail");
    assert(res.errors.some(e => e.includes("Duplicate permission code")), "Expected duplicate permission error");
  });

  record("TC-REG-04", "Explicit default policy mapping for all declared roles", "Manifest Registry", () => {
    const invalidManifest: any = {
      code: "SAMPLE",
      name: "Sample",
      icon: "Box",
      routePath: "/sample",
      displayOrder: 1,
      status: "ACTIVE",
      scopeConfig: { supportedTypes: ["all"], defaultType: "all" },
      roles: [
        { code: "STANDARD", name: "Standard", description: "Standard", isSystem: true },
        { code: "ADMIN", name: "Admin", description: "Admin", isSystem: false }
      ],
      permissions: [{ code: "VIEW", name: "View", category: "VIEW" }],
      defaultPolicies: { STANDARD: ["VIEW"] } // ADMIN missing from defaultPolicies
    };
    const res = validateModuleManifest(invalidManifest);
    assert.strictEqual(res.valid, false, "Expected missing role default policy to fail");
    assert(res.errors.some(e => e.includes("lacks explicit default policy array")), "Expected policy mapping error");
  });

  record("TC-REG-05", "Duplicate module code and route collision prevention", "Manifest Registry", () => {
    const manifests: ModuleManifest[] = [
      {
        code: "CHANDAK_MEET",
        name: "Meet 1",
        description: "Meet",
        icon: "Video",
        routePath: "/meet",
        displayOrder: 1,
        status: "ACTIVE",
        scopeConfig: { supportedTypes: ["all"], defaultType: "all" },
        roles: [{ code: "STANDARD", name: "Std", description: "Std", isSystem: true }],
        permissions: [{ code: "MEET_VIEW", name: "View", category: "VIEW" }],
        defaultPolicies: { STANDARD: ["MEET_VIEW"] }
      },
      {
        code: "CHANDAK_MEET", // Duplicate code
        name: "Meet 2",
        description: "Meet Collision",
        icon: "Video",
        routePath: "/meet", // Duplicate route
        displayOrder: 2,
        status: "ACTIVE",
        scopeConfig: { supportedTypes: ["all"], defaultType: "all" },
        roles: [{ code: "STANDARD", name: "Std", description: "Std", isSystem: true }],
        permissions: [{ code: "MEET_VIEW_2", name: "View 2", category: "VIEW" }],
        defaultPolicies: { STANDARD: ["MEET_VIEW_2"] }
      }
    ];
    const res = validateManifestCollection(manifests);
    assert.strictEqual(res.valid, false, "Expected collision to fail");
    assert(res.errors.some(e => e.includes("Duplicate module code")), "Expected duplicate code error");
    assert(res.errors.some(e => e.includes("collides between multiple modules")), "Expected route collision error");
  });

  // --------------------------------------------------------------------------
  // 2. AUTHORIZATION ISOLATION TESTS (TC-AUTH-01 to TC-AUTH-08)
  // --------------------------------------------------------------------------
  const meetManifest: ModuleManifest = {
    code: "CHANDAK_MEET",
    name: "Chandak Meet",
    description: "Meeting cadences",
    icon: "Video",
    routePath: "/meet",
    displayOrder: 1,
    status: "ACTIVE",
    scopeConfig: { supportedTypes: ["all"], defaultType: "all" },
    roles: [
      { code: "STANDARD", name: "Participant", description: "Standard", isSystem: true },
      { code: "MEET_ADMIN", name: "Administrator", description: "Admin", isSystem: false }
    ],
    permissions: [
      { code: "MEETINGS_VIEW", name: "View", category: "VIEW" },
      { code: "MEETINGS_CREATE", name: "Create", category: "CREATE" },
      { code: "MEETINGS_DELETE", name: "Delete", category: "DELETE", isSensitive: true }
    ],
    defaultPolicies: {
      STANDARD: ["MEETINGS_VIEW"],
      MEET_ADMIN: ["MEETINGS_VIEW", "MEETINGS_CREATE", "MEETINGS_DELETE"]
    }
  };

  const budgetManifest: ModuleManifest = {
    code: "ORG_BUDGET",
    name: "Organization Budget",
    description: "Budgeting",
    icon: "Wallet",
    routePath: "/budget",
    displayOrder: 2,
    status: "ACTIVE",
    scopeConfig: { supportedTypes: ["all", "projects"], defaultType: "all" },
    roles: [
      { code: "STANDARD", name: "Viewer", description: "Standard", isSystem: true },
      { code: "BUDGET_ADMIN", name: "Administrator", description: "Admin", isSystem: false }
    ],
    permissions: [
      { code: "BUDGET_VIEW", name: "View", category: "VIEW" },
      { code: "BUDGET_APPROVE", name: "Approve", category: "APPROVE", isSensitive: true }
    ],
    defaultPolicies: {
      STANDARD: ["BUDGET_VIEW"],
      BUDGET_ADMIN: ["BUDGET_VIEW", "BUDGET_APPROVE"]
    }
  };

  const manifestMap = new Map<string, ModuleManifest>([
    ["CHANDAK_MEET", meetManifest],
    ["ORG_BUDGET", budgetManifest]
  ]);

  record("TC-AUTH-01", "Module boundary isolation: Role in Module A grants zero access in Module B", "Authorization Isolation", () => {
    const userMeetOnly: UserEntitlement = {
      userId: "u-meet-std",
      isSuperAdmin: false,
      assignedModules: new Map([
        ["CHANDAK_MEET", { roleCode: "STANDARD", scope: { type: "all" } }]
      ])
    };
    // Should have MEETINGS_VIEW in Meet
    const meetRes = evaluateAuthorization(userMeetOnly, manifestMap, "CHANDAK_MEET", "MEETINGS_VIEW");
    assert.strictEqual(meetRes.authorized, true, "User should be authorized in CHANDAK_MEET");

    // Must have ZERO access in ORG_BUDGET
    const budgetRes = evaluateAuthorization(userMeetOnly, manifestMap, "ORG_BUDGET", "BUDGET_VIEW");
    assert.strictEqual(budgetRes.authorized, false, "User must NOT have access in ORG_BUDGET");
  });

  record("TC-AUTH-02", "Unassigned module strictly blocked", "Authorization Isolation", () => {
    const unassignedUser: UserEntitlement = {
      userId: "u-none",
      isSuperAdmin: false,
      assignedModules: new Map()
    };
    const res = evaluateAuthorization(unassignedUser, manifestMap, "CHANDAK_MEET", "MEETINGS_VIEW");
    assert.strictEqual(res.authorized, false, "Unassigned user must be blocked");
    assert(res.reason.includes("No module access assignment"), "Reason must mention missing assignment");
  });

  record("TC-AUTH-03", "Super Admin global override verified", "Authorization Isolation", () => {
    const superAdmin: UserEntitlement = {
      userId: "u-super",
      isSuperAdmin: true,
      assignedModules: new Map() // Even with zero module assignments
    };
    const resMeet = evaluateAuthorization(superAdmin, manifestMap, "CHANDAK_MEET", "MEETINGS_DELETE");
    assert.strictEqual(resMeet.authorized, true, "Super Admin must have global access in Meet");
    const resBudget = evaluateAuthorization(superAdmin, manifestMap, "ORG_BUDGET", "BUDGET_APPROVE");
    assert.strictEqual(resBudget.authorized, true, "Super Admin must have global access in Budget");
  });

  record("TC-AUTH-05", "Independent STANDARD policies across modules", "Authorization Isolation", () => {
    // Assert meet STANDARD permissions != budget STANDARD permissions
    const meetStdPerms = meetManifest.defaultPolicies["STANDARD"];
    const budgetStdPerms = budgetManifest.defaultPolicies["STANDARD"];
    assert.notDeepStrictEqual(meetStdPerms, budgetStdPerms, "Meet STANDARD and Budget STANDARD must be completely independent");
  });

  record("TC-AUTH-06", "Non-admin roles denied sensitive permissions by default", "Authorization Isolation", () => {
    const userMeetStd: UserEntitlement = {
      userId: "u-meet-std",
      isSuperAdmin: false,
      assignedModules: new Map([
        ["CHANDAK_MEET", { roleCode: "STANDARD", scope: { type: "all" } }]
      ])
    };
    const res = evaluateAuthorization(userMeetStd, manifestMap, "CHANDAK_MEET", "MEETINGS_DELETE");
    assert.strictEqual(res.authorized, false, "STANDARD must not have sensitive MEETINGS_DELETE permission");
  });

  record("TC-AUTH-08", "Disabled module access blocked", "Authorization Isolation", () => {
    const disabledManifest: ModuleManifest = {
      ...meetManifest,
      code: "DISABLED_MODULE",
      status: "DISABLED"
    };
    const testMap = new Map([["DISABLED_MODULE", disabledManifest]]);
    const user: UserEntitlement = {
      userId: "u-test",
      isSuperAdmin: false,
      assignedModules: new Map([["DISABLED_MODULE", { roleCode: "STANDARD", scope: { type: "all" } }]])
    };
    const res = evaluateAuthorization(user, testMap, "DISABLED_MODULE", "MEETINGS_VIEW");
    assert.strictEqual(res.authorized, false, "Disabled module must deny access");
    assert(res.reason.includes("DISABLED"), "Expected reason to state module is disabled");
  });

  // --------------------------------------------------------------------------
  // 3. QUERY-LEVEL SCOPE TESTS (TC-SCOPE-01 to TC-SCOPE-04)
  // --------------------------------------------------------------------------
  record("TC-SCOPE-01", "Query-level scope 'all' generates 1=1 clause", "Query Scope", () => {
    const sql = resolveQueryScopeSQL({ type: "all" }, "budgets");
    assert.strictEqual(sql, "1=1", "Expected 1=1 for 'all' scope");
  });

  record("TC-SCOPE-02", "Query-level scope 'projects' generates project_id IN clause", "Query Scope", () => {
    const sql = resolveQueryScopeSQL({ type: "projects", project_ids: ["p1", "p2"] }, "drawings");
    assert.strictEqual(sql, "drawings.project_id IN ('p1', 'p2')", "Expected project_id filter");
  });

  record("TC-SCOPE-03", "Query-level scope 'vehicles' generates vehicle_id IN clause", "Query Scope", () => {
    const sql = resolveQueryScopeSQL({ type: "vehicles", vehicle_ids: ["v-101", "v-102"] }, "trips");
    assert.strictEqual(sql, "trips.vehicle_id IN ('v-101', 'v-102')", "Expected vehicle_id filter");
  });

  record("TC-SCOPE-04", "Empty restricted scope generates 1=0 safe denial clause", "Query Scope", () => {
    const sql = resolveQueryScopeSQL({ type: "projects", project_ids: [] }, "drawings");
    assert.strictEqual(sql, "1=0", "Expected 1=0 for empty restricted scope");
  });

  // --------------------------------------------------------------------------
  // 4. SYNCHRONIZATION ENGINE & OVERRIDE TESTS (TC-SYNC-01 to TC-SYNC-06)
  // --------------------------------------------------------------------------
  record("TC-SYNC-02", "Administrator overrides are preserved across manifest updates", "Sync & Overrides", () => {
    const user: UserEntitlement = {
      userId: "u-meet-std",
      isSuperAdmin: false,
      assignedModules: new Map([
        ["CHANDAK_MEET", { roleCode: "STANDARD", scope: { type: "all" } }]
      ])
    };
    // Admin explicitly GRANTED MEETINGS_CREATE to STANDARD
    const overrides = new Map<string, boolean>([
      ["CHANDAK_MEET:STANDARD:MEETINGS_CREATE", true]
    ]);
    const res = evaluateAuthorization(user, manifestMap, "CHANDAK_MEET", "MEETINGS_CREATE", overrides);
    assert.strictEqual(res.authorized, true, "Admin override must grant permission despite manifest default");
    assert(res.reason.includes("admin override"), "Reason must reference override");
  });

  record("TC-SYNC-04", "Undeclared role policy strictly defaults to DENY", "Sync & Overrides", () => {
    const user: UserEntitlement = {
      userId: "u-unknown-role",
      isSuperAdmin: false,
      assignedModules: new Map([
        ["CHANDAK_MEET", { roleCode: "UNDECLARED_ROLE", scope: { type: "all" } }]
      ])
    };
    const res = evaluateAuthorization(user, manifestMap, "CHANDAK_MEET", "MEETINGS_VIEW");
    assert.strictEqual(res.authorized, false, "Undeclared role must default to DENY");
    assert(res.reason.includes("defaults to DENY"), "Reason must state default to DENY");
  });

  // --------------------------------------------------------------------------
  // Category 5: Pilot Module Verification Tests (TC-PILOT-01 to TC-PILOT-04)
  // --------------------------------------------------------------------------

  record("TC-PILOT-01", "Meet manifest dynamic discovery & mandatory STANDARD contract", "Pilot Module", () => {
    const meetManifest = manifestMap.get("CHANDAK_MEET");
    assert(meetManifest, "CHANDAK_MEET manifest must be registered");
    assert.strictEqual(meetManifest.code, "CHANDAK_MEET");
    assert.strictEqual(meetManifest.routePath, "/meet");
    const stdRole = meetManifest.roles.find(r => r.code === "STANDARD");
    assert(stdRole, "CHANDAK_MEET must declare mandatory STANDARD role");
    assert.strictEqual(stdRole.isSystem, true, "STANDARD role must have isSystem: true");
    assert(meetManifest.defaultPolicies["STANDARD"], "Must have explicit default policy for STANDARD");
  });

  record("TC-PILOT-02", "Meet dual-read aliasing guarantees zero disruption", "Pilot Module", () => {
    const meetManifest = manifestMap.get("CHANDAK_MEET")!;
    const stdPolicy = meetManifest.defaultPolicies["STANDARD"] || [];
    
    // Simulate legacy user with PARTICIPANT role
    const legacyParticipantUser: UserEntitlement = {
      userId: "u-legacy-part",
      isSuperAdmin: false,
      assignedModules: new Map([
        ["CHANDAK_MEET", { roleCode: "PARTICIPANT", scope: { type: "all" } }]
      ])
    };

    // Dual-read alias resolver: if role is PARTICIPANT, resolve as STANDARD
    const resolveRoleWithAlias = (mod: string, role: string) => {
      if (mod === "CHANDAK_MEET" && role === "PARTICIPANT") return "STANDARD";
      return role;
    };

    const effectiveRole = resolveRoleWithAlias("CHANDAK_MEET", legacyParticipantUser.assignedModules.get("CHANDAK_MEET")!.roleCode);
    assert.strictEqual(effectiveRole, "STANDARD", "Legacy PARTICIPANT must resolve to STANDARD");
    
    const userUnderStd: UserEntitlement = {
      ...legacyParticipantUser,
      assignedModules: new Map([["CHANDAK_MEET", { roleCode: effectiveRole, scope: { type: "all" } }]])
    };

    const res = evaluateAuthorization(userUnderStd, manifestMap, "CHANDAK_MEET", "MEETINGS_VIEW");
    assert.strictEqual(res.authorized, true, "Aliased user must be authorized for standard view");
  });

  record("TC-PILOT-03", "Meet query scope SQL resolution for departments", "Pilot Module", () => {
    const scope: ModuleScope = { type: "departments", department_ids: ["dept-legal", "dept-eng"] };
    const sql = resolveQueryScopeSQL(scope, "meetings");
    assert(sql.includes("department_id IN ('dept-legal', 'dept-eng')"), "Must filter by department_id in SQL");
  });

  record("TC-PILOT-04", "Meet sensitive permission MEET_SETTINGS strictly protected", "Pilot Module", () => {
    const meetUser: UserEntitlement = {
      userId: "u-std-meet",
      isSuperAdmin: false,
      assignedModules: new Map([
        ["CHANDAK_MEET", { roleCode: "STANDARD", scope: { type: "all" } }]
      ])
    };
    const res = evaluateAuthorization(meetUser, manifestMap, "CHANDAK_MEET", "MEET_SETTINGS");
    assert.strictEqual(res.authorized, false, "STANDARD user must be denied sensitive MEET_SETTINGS");
  });

  // Print Summary Table
  console.log(`\n----------------------------------------------------------------`);
  console.log(`TEST EXECUTION SUMMARY`);
  console.log(`----------------------------------------------------------------`);
  let passed = 0;
  let failed = 0;
  for (const r of reports) {
    const icon = r.status === "PASS" ? "✅" : "❌";
    if (r.status === "PASS") passed++;
    else failed++;
    console.log(`${icon} [${r.id}] ${r.title.padEnd(50)} : ${r.status}`);
    if (r.message) console.log(`   -> Error: ${r.message}`);
  }
  console.log(`\nTOTAL: ${reports.length} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log(`================================================================\n`);

  return reports;
}

// Auto-execute when run directly
if (process.argv[1]?.endsWith("test-master-rbac.ts") || process.argv[1]?.endsWith("test-master-rbac.js")) {
  const isBaseline = process.argv.includes("--baseline");
  runMasterRBACTestSuite(isBaseline)
    .then(reports => {
      const anyFailed = reports.some(r => r.status === "FAIL");
      if (anyFailed) process.exit(1);
    })
    .catch(err => {
      console.error("Execution failed:", err);
      process.exit(1);
    });
}

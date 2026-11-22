import { supabaseAdmin } from "@/lib/supabase/service_role";
import type { ModuleManifest } from "./types";
import { getRegisteredModules } from "./registry.generated";
import { invalidateModuleAccessCache } from "@/lib/permissions/module-access";

export interface SyncOptions {
  dryRun?: boolean;
  executedBy?: string;
}

export interface SyncResult {
  moduleCode: string;
  status: "SUCCESS" | "WARNING" | "SKIPPED" | "FAILED";
  rolesAdded: string[];
  rolesUpdated: string[];
  rolesSkippedCustomized: string[];
  permissionsPruned: string[];
  overridesApplied: number;
  previousVersion: number;
  newVersion: number;
  diffSummary?: string;
  error?: string;
  details?: Record<string, any>;
}

/**
 * Synchronize a single module's manifest with the database.
 * 
 * Governance Rules (Master Architecture Blueprint v2.0):
 * 1. Declarative Manifest as Source of Truth for new and default roles.
 * 2. Uncustomized roles (is_customized = false) are synchronized with manifest defaults.
 * 3. Customized roles (is_customized = true) are NEVER overwritten by manifest defaults.
 * 4. Newly introduced permissions default to DENY for customized roles.
 * 5. Administrator overrides in module_role_overrides take precedence over manifest defaults.
 * 6. Every execution is audited in rbac_sync_audit_logs with full diff tracking.
 */
export async function syncModulePermissions(
  manifest: ModuleManifest,
  options: SyncOptions = {}
): Promise<SyncResult> {
  const { dryRun = false, executedBy = "SYSTEM_DEPLOY" } = options;
  const moduleCode = manifest.code;

  try {
    // 1. Fetch existing DB roles and overrides for this module
    const [rolesRes, overridesRes, currentLogRes] = await Promise.all([
      supabaseAdmin
        .from("module_roles")
        .select("role_code, name, description, permissions, is_system, policy_version, is_customized")
        .eq("module_code", moduleCode),
      supabaseAdmin
        .from("module_role_overrides")
        .select("role_code, permission_code, is_granted")
        .eq("module_code", moduleCode),
      supabaseAdmin
        .from("rbac_sync_audit_logs")
        .select("new_version")
        .eq("module_code", moduleCode)
        .order("executed_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (rolesRes.error) throw rolesRes.error;
    if (overridesRes.error) throw overridesRes.error;

    const dbRoles = rolesRes.data || [];
    const dbOverrides = overridesRes.data || [];
    const previousVersion = currentLogRes.data?.new_version || 1;

    // Build lookup maps
    const dbRoleMap = new Map<string, typeof dbRoles[0]>();
    dbRoles.forEach((r) => dbRoleMap.set(r.role_code, r));

    // Overrides map: role_code -> { permCode -> is_granted }
    const overridesMap = new Map<string, Map<string, boolean>>();
    for (const ov of dbOverrides) {
      if (!overridesMap.has(ov.role_code)) {
        overridesMap.set(ov.role_code, new Map());
      }
      overridesMap.get(ov.role_code)!.set(ov.permission_code, ov.is_granted);
    }

    const declaredPermCodes = new Set(manifest.permissions.map((p) => p.code));
    const rolesAdded: string[] = [];
    const rolesUpdated: string[] = [];
    const rolesSkippedCustomized: string[] = [];
    const permissionsPruned: string[] = [];
    let overridesAppliedCount = 0;

    const queriesToRun: Array<() => Promise<any>> = [];

    // 2. Iterate declared roles in manifest
    for (const roleDecl of manifest.roles) {
      const roleCode = roleDecl.code;
      const manifestDefaultPerms = manifest.defaultPolicies[roleCode] || [];
      const roleOverrides = overridesMap.get(roleCode);

      // Compute baseline permissions filtered to declared permissions
      let targetPerms = manifestDefaultPerms.filter((p) => declaredPermCodes.has(p));

      // Apply overrides if any
      if (roleOverrides && roleOverrides.size > 0) {
        const permSet = new Set(targetPerms);
        for (const [permCode, isGranted] of roleOverrides.entries()) {
          if (!declaredPermCodes.has(permCode)) continue;
          if (isGranted) {
            permSet.add(permCode);
          } else {
            permSet.delete(permCode);
          }
          overridesAppliedCount++;
        }
        targetPerms = Array.from(permSet);
      }

      const existing = dbRoleMap.get(roleCode);

      if (!existing) {
        // CASE A: New role declared in manifest -> INSERT
        rolesAdded.push(roleCode);
        if (!dryRun) {
          queriesToRun.push(async () =>
            supabaseAdmin.from("module_roles").insert({
              module_code: moduleCode,
              role_code: roleCode,
              name: roleDecl.name,
              description: roleDecl.description,
              permissions: targetPerms,
              is_system: roleDecl.isSystem,
              policy_version: 1,
              is_customized: false,
            })
          );
        }
      } else if (existing.is_customized) {
        // CASE B: Existing role is CUSTOMIZED by administrator -> DO NOT OVERWRITE
        rolesSkippedCustomized.push(roleCode);

        // Prune only undeclared/deprecated permissions from customized role
        const curPerms: string[] = Array.isArray(existing.permissions) ? existing.permissions : [];
        const validCustomPerms = curPerms.filter((p) => declaredPermCodes.has(p));

        if (validCustomPerms.length !== curPerms.length) {
          const pruned = curPerms.filter((p) => !declaredPermCodes.has(p));
          permissionsPruned.push(...pruned.map((p) => `${roleCode}:${p}`));

          if (!dryRun) {
            queriesToRun.push(async () =>
              supabaseAdmin
                .from("module_roles")
                .update({
                  permissions: validCustomPerms,
                  policy_version: (existing.policy_version || 1) + 1,
                })
                .eq("module_code", moduleCode)
                .eq("role_code", roleCode)
            );
          }
        }
      } else {
        // CASE C: Existing role is NOT customized -> SYNC WITH MANIFEST DEFAULTS
        const curPerms: string[] = Array.isArray(existing.permissions) ? existing.permissions : [];
        const curSorted = [...curPerms].sort();
        const tarSorted = [...targetPerms].sort();

        const permsDiffer =
          curSorted.length !== tarSorted.length ||
          curSorted.some((p, i) => p !== tarSorted[i]);

        const metaDiffer =
          existing.name !== roleDecl.name ||
          existing.description !== roleDecl.description ||
          existing.is_system !== roleDecl.isSystem;

        if (permsDiffer || metaDiffer) {
          rolesUpdated.push(roleCode);
          if (!dryRun) {
            queriesToRun.push(async () =>
              supabaseAdmin
                .from("module_roles")
                .update({
                  name: roleDecl.name,
                  description: roleDecl.description,
                  is_system: roleDecl.isSystem,
                  permissions: targetPerms,
                  policy_version: (existing.policy_version || 1) + 1,
                })
                .eq("module_code", moduleCode)
                .eq("role_code", roleCode)
            );
          }
        }
      }
    }

    // 3. Execute mutations if not dryRun
    if (!dryRun && queriesToRun.length > 0) {
      for (const query of queriesToRun) {
        const { error } = await query();
        if (error) throw error;
      }
    }

    const hasChanges = rolesAdded.length > 0 || rolesUpdated.length > 0 || permissionsPruned.length > 0;
    const newVersion = hasChanges ? previousVersion + 1 : previousVersion;

    const diffSummary = hasChanges
      ? `Sync applied for ${moduleCode}: Added [${rolesAdded.join(", ") || "none"}], Updated [${rolesUpdated.join(", ") || "none"}], Preserved Custom [${rolesSkippedCustomized.join(", ") || "none"}], Pruned [${permissionsPruned.join(", ") || "none"}]`
      : `No changes detected for ${moduleCode}. All declared policies match DB state.`;

    // 4. Record Audit Log if changes occurred and not dry run
    if (!dryRun && hasChanges) {
      await supabaseAdmin.from("rbac_sync_audit_logs").insert({
        module_code: moduleCode,
        previous_version: previousVersion,
        new_version: newVersion,
        added_permissions: rolesAdded,
        modified_roles: [...rolesAdded, ...rolesUpdated],
        sync_status: "SUCCESS",
        details: {
          rolesAdded,
          rolesUpdated,
          rolesSkippedCustomized,
          permissionsPruned,
          overridesAppliedCount,
        },
        executed_by: executedBy,
      });

      // Invalidate memory cache across system
      invalidateModuleAccessCache();
    }

    return {
      moduleCode,
      status: hasChanges ? "SUCCESS" : "SKIPPED",
      rolesAdded,
      rolesUpdated,
      rolesSkippedCustomized,
      permissionsPruned,
      overridesApplied: overridesAppliedCount,
      previousVersion,
      newVersion,
      diffSummary,
      details: {
        dryRun,
        executedBy,
        totalDeclaredRoles: manifest.roles.length,
        totalDeclaredPermissions: manifest.permissions.length,
      },
    };
  } catch (err: any) {
    console.error(`[Sync Engine Error: ${moduleCode}]`, err);

    if (!dryRun) {
      try {
        await supabaseAdmin.from("rbac_sync_audit_logs").insert({
          module_code: moduleCode,
          previous_version: 0,
          new_version: 0,
          sync_status: "FAILED",
          details: { error: err.message },
          executed_by: executedBy,
        });
      } catch {
        // Ignore failure to record audit log on error
      }
    }

    return {
      moduleCode,
      status: "FAILED",
      rolesAdded: [],
      rolesUpdated: [],
      rolesSkippedCustomized: [],
      permissionsPruned: [],
      overridesApplied: 0,
      previousVersion: 0,
      newVersion: 0,
      error: err.message || "Unknown error during sync",
    };
  }
}

/**
 * Synchronize all registered modules declared in the manifest registry.
 */
export async function syncAllRegisteredModules(options: SyncOptions = {}): Promise<SyncResult[]> {
  const manifests = getRegisteredModules();
  const results: SyncResult[] = [];

  for (const manifest of manifests) {
    if (manifest.status === "ACTIVE" || manifest.status === "BETA") {
      const res = await syncModulePermissions(manifest, options);
      results.push(res);
    }
  }

  return results;
}

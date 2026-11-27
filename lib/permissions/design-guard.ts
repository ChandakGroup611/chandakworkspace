import { supabaseAdmin } from "@/lib/supabase/service_role";

// ---------- server-side access guard for Design Tracking, DMAC and DMS ----------
// Server actions in this module run with full database access, so this guard is what enforces the
// Design access set on Design → Access & roles (design_user_access): the person's Design role, their
// project scope (all projects or the assigned ones) and the capability switches. Super Admin passes.
export type DesignCap = "any" | "admin" | "masters" | "matrix" | "drawings" | "gfc" | "transmittals" | "rfis";

const CAP_COLUMN: Record<Exclude<DesignCap, "any" | "admin">, string> = {
  masters: "can_masters_manage", matrix: "can_matrix_edit", drawings: "can_drawings_upload",
  gfc: "can_drawings_approve_gfc", transmittals: "can_transmittals_create", rfis: "can_rfis_manage",
};
const CAP_LABEL: Record<DesignCap, string> = {
  any: "use Design Tracking", admin: "manage Design access and policies", masters: "manage Design masters",
  matrix: "edit the design matrix", drawings: "upload or change drawings", gfc: "approve drawings for GFC",
  transmittals: "create transmittals", rfis: "manage RFIs",
};

const CAP_PERMISSION_MAP: Record<DesignCap, string> = {
  any: "DESIGN_PROJECTS_VIEW",
  admin: "DESIGN_SETTINGS",
  masters: "DESIGN_MASTERS_MANAGE",
  matrix: "MATRIX_EDIT",
  drawings: "DRAWINGS_UPLOAD",
  gfc: "DRAWINGS_APPROVE_GFC",
  transmittals: "TRANSMITTALS_CREATE",
  rfis: "RFIS_RAISE",
};

export async function requireDesign(
  cap: DesignCap,
  projectIds?: (string | null | undefined)[] | string | null,
  subProjectIds?: (string | null | undefined)[] | string | null
) {
  const { getCachedUser } = await import("@/lib/auth/cached-user");
  const { user } = await getCachedUser();
  if (!user) throw new Error("Please sign in again.");
  const { hasPermission } = await import("@/lib/permissions");
  if (await hasPermission(user.id, "SUPER_ADMIN")) return user;

  const { can } = await import("@/lib/permissions/module-access");
  const ids = (Array.isArray(projectIds) ? projectIds : [projectIds]).filter((x): x is string => !!x && x !== "ALL");
  const subIds = (Array.isArray(subProjectIds) ? subProjectIds : [subProjectIds]).filter((x): x is string => !!x && x !== "ALL");
  const reqPerm = CAP_PERMISSION_MAP[cap] || "DESIGN_PROJECTS_VIEW";

  let allowedByModule = false;
  if (ids.length > 0 || subIds.length > 0) {
    const pairs = ids.length > 0 ? ids : [null];
    const subPairs = subIds.length > 0 ? subIds : [null];
    const checks: Promise<boolean>[] = [];
    for (const pid of pairs) {
      for (const sid of subPairs) {
        checks.push(can(user.id, "DESIGN_TRACKING", reqPerm, { project_id: pid, sub_project_id: sid }));
      }
    }
    allowedByModule = (await Promise.all(checks)).every(Boolean);
  } else {
    allowedByModule = await can(user.id, "DESIGN_TRACKING", reqPerm);
  }

  const { data: access } = await supabaseAdmin.from("design_user_access").select("*").eq("user_id", user.id).maybeSingle();
  if (allowedByModule) {
    // Also enforce sub-project isolation if design_user_access restricts sub-projects
    if (access && subIds.length > 0) {
      const isDesignAdmin = String(access.design_role || "").toUpperCase() === "DESIGN_ADMIN";
      const assignedSubs: string[] = access.assigned_sub_project_ids || [];
      if (!isDesignAdmin && assignedSubs.length > 0 && subIds.some((sid) => !assignedSubs.includes(sid))) {
        throw new Error("This sub-project is outside your assigned Design sub-projects.");
      }
    }
    return user;
  }

  if (!access) throw new Error("You don't have access to Design Tracking. Ask a Design administrator to add you.");
  const isDesignAdmin = String(access.design_role || "").toUpperCase() === "DESIGN_ADMIN";
  if (cap === "admin" && !isDesignAdmin) throw new Error(`Only a Design administrator can ${CAP_LABEL.admin}.`);
  if (!isDesignAdmin && cap !== "any" && cap !== "admin" && !access[CAP_COLUMN[cap]]) {
    throw new Error(`Your Design access doesn't allow you to ${CAP_LABEL[cap]}.`);
  }
  if (!isDesignAdmin && ids.length && String(access.project_access_type || "ALL").toUpperCase() === "SPECIFIC") {
    const allowed: string[] = access.assigned_project_ids || [];
    if (ids.some((id) => !allowed.includes(id))) throw new Error("This project is outside your assigned Design projects.");
  }
  if (!isDesignAdmin && subIds.length > 0) {
    const allowedSubs: string[] = access.assigned_sub_project_ids || [];
    if (allowedSubs.length > 0 && subIds.some((sid) => !allowedSubs.includes(sid))) {
      throw new Error("This sub-project is outside your assigned Design sub-projects.");
    }
  }
  return user;
}

// Files this module may hand out signed links for. Anything else (tickets, vehicles, meet…) is refused.
const DESIGN_FILE_BUCKETS = new Set(["design-drawings", "ticket-attachments", "dms-documents"]);
const DESIGN_FILE_PREFIXES = ["drawings/", "dms/"];

export function isDesignStoragePath(bucket: string, path: string): boolean {
  if (!DESIGN_FILE_BUCKETS.has(bucket)) return false;
  if (!path || path.includes("..") || path.startsWith("/")) return false;
  return DESIGN_FILE_PREFIXES.some((p) => path.startsWith(p));
}

// One path segment for storage keys: letters, digits, dash and underscore only.
export function safeStorageSegment(value: string | null | undefined, fallback: string): string {
  const cleaned = String(value || "").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
  return cleaned.replace(/^_+$/, "") ? cleaned : fallback;
}

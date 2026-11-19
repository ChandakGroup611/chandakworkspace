import { supabaseAdmin } from "@/lib/supabase/service_role";

export interface HttpErrorLogPayload {
  status: number;
  method: string;
  path: string;
  userId?: string | null;
  module?: string | null;
  referrer?: string | null;
  buildCommit?: string | null;
  source: "app" | "server-firewall" | "storage";
  errorMessage?: string | null;
  errorStack?: string | null;
  metadata?: Record<string, any>;
}

/**
 * Sanitizes path to ensure no personal identifiable data (emails, passwords, tokens) are logged.
 */
export function sanitizePath(rawPath: string): string {
  if (!rawPath) return "/";
  try {
    const url = new URL(rawPath, "https://chandakgroup.tech");
    // Strip sensitive query parameters
    const sensitiveParams = [
      "token", "key", "secret", "password", "auth", "access_token",
      "refresh_token", "code", "email", "phone"
    ];
    for (const p of sensitiveParams) {
      if (url.searchParams.has(p)) {
        url.searchParams.set(p, "[REDACTED]");
      }
    }
    // Mask potential emails in path segments
    let cleanPath = url.pathname.replace(
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      "[email]"
    );
    const search = url.searchParams.toString();
    return cleanPath + (search ? `?${search}` : "");
  } catch {
    return rawPath.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[email]");
  }
}

/**
 * Derives module code from pathname.
 */
export function deriveModuleFromPath(path: string): string {
  if (!path) return "SYSTEM";
  const p = path.toLowerCase();
  if (p.startsWith("/tasks") || p.startsWith("/workspaces")) return "TASK_WORKFLOW";
  if (p.startsWith("/tickets")) return "TASK_WORKFLOW";
  if (p.startsWith("/requirements")) return "TASK_WORKFLOW";
  if (p.startsWith("/vehicle")) return "VEHICLE_DESK";
  if (p.startsWith("/design")) return "DESIGN_TRACKING";
  if (p.startsWith("/meet")) return "CHANDAK_MEET";
  if (p.startsWith("/budget")) return "ORG_BUDGET";
  if (p.startsWith("/dashboards")) return "DASHBOARDS";
  if (p.startsWith("/amc")) return "AMC";
  if (p.startsWith("/dms")) return "DMS";
  if (p.startsWith("/settings/iam") || p.startsWith("/settings/users")) return "IAM";
  if (p.startsWith("/login") || p.startsWith("/auth")) return "AUTH";
  return "GLOBAL";
}

/**
 * Asynchronously logs an HTTP error to the app_http_errors table.
 */
export async function logHttpError(payload: HttpErrorLogPayload): Promise<void> {
  try {
    const sanitizedPath = sanitizePath(payload.path);
    const resolvedModule = payload.module || deriveModuleFromPath(sanitizedPath);
    const currentCommit = payload.buildCommit || process.env.GIT_COMMIT || process.env.NEXT_PUBLIC_GIT_COMMIT || "live";

    await supabaseAdmin.from("app_http_errors").insert({
      status: payload.status,
      method: (payload.method || "GET").toUpperCase(),
      path: sanitizedPath,
      user_id: payload.userId || null,
      module: resolvedModule,
      referrer: payload.referrer ? sanitizePath(payload.referrer) : null,
      build_commit: currentCommit,
      source: payload.source || "app",
      error_message: payload.errorMessage ? String(payload.errorMessage).slice(0, 1000) : null,
      error_stack: payload.errorStack ? String(payload.errorStack).slice(0, 2000) : null,
      metadata: payload.metadata || {}
    });
  } catch (err) {
    // Failsafe: Error logging must never throw or crash the main request
    console.error("[HttpErrorLogger] Failed to write to app_http_errors:", err);
  }
}

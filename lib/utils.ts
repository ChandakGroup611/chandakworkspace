import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isReloadRequiredError(error: any): boolean {
  if (!error) return false;
  const msg = typeof error === "string" ? error : error?.message || error?.error || error?.details || "";
  if (typeof msg !== "string") return false;
  return (
    msg.includes("was not found on the server") ||
    msg.includes("failed-to-find-server-action") ||
    msg.includes("Failed to find Server Action") ||
    (msg.includes("Server Action") && msg.includes("not found")) ||
    msg.includes("Loading chunk") ||
    msg.includes("ChunkLoadError") ||
    msg.includes("Failed to load chunk")
  );
}

export function sanitizeErrorMessage(error: any, fallback = "An unexpected error occurred. Please try again."): string {
  if (!error) return fallback;
  const rawMsg = typeof error === "string" ? error : error?.message || error?.error || error?.details || fallback;
  if (typeof rawMsg !== "string") return fallback;
  
  const msg = rawMsg.trim();

  // Next.js Server Action build/deployment mismatch (Hash mismatch after updates)
  if (
    msg.includes("was not found on the server") ||
    msg.includes("failed-to-find-server-action") ||
    msg.includes("Failed to find Server Action") ||
    (msg.includes("Server Action") && msg.includes("not found"))
  ) {
    return "A new application update was deployed to the server. Please reload the page to continue with the latest version.";
  }

  // Next.js Chunk Loading / Asset Mismatch
  if (msg.includes("Loading chunk") || msg.includes("ChunkLoadError") || msg.includes("Failed to load chunk")) {
    return "Application files were updated. Please reload the page to load the latest version.";
  }

  // React Hydration / Minified Internal Errors
  if (
    msg.includes("react.dev/errors") ||
    msg.includes("Minified React error") ||
    msg.includes("#441") ||
    msg.includes("#418") ||
    msg.includes("#423") ||
    msg.includes("#425")
  ) {
    console.error("Masked React internal error:", error);
    return "A temporary interface synchronization error occurred. Please refresh the page.";
  }

  // Network / Connection Drops
  if (
    msg.includes("Failed to fetch") ||
    msg.includes("NetworkError") ||
    msg.includes("Network Error") ||
    msg.includes("Load failed") ||
    msg.includes("net::ERR_")
  ) {
    return "Unable to connect to the server. Please check your network connection and try again.";
  }

  // Database Foreign Key Errors
  if (msg.includes("violates foreign key constraint") || msg.includes("23503")) {
    return "Cannot delete or alter this record because it is currently linked to other records in the system.";
  }

  // Database Unique Constraint Errors
  if (msg.includes("duplicate key value violates unique constraint") || msg.includes("23505")) {
    return "A record with this identifier, name, or code already exists.";
  }

  // Database Not Null Constraint Errors
  if (msg.includes("violates not-null constraint") || msg.includes("23502")) {
    return "A required field is missing. Please fill in all mandatory fields.";
  }

  // Database Permission / RLS Errors
  if (msg.includes("row-level security") || msg.includes("permission denied for table") || msg.includes("42501")) {
    return "You do not have permission to perform this action. Please verify your role or assigned scope.";
  }

  // Supabase Auth / Session Expired
  if (msg.includes("JWT expired") || msg.includes("invalid claim") || msg.includes("token is expired") || msg.includes("session expired")) {
    return "Your session has expired. Please refresh the page or sign in again.";
  }
  
  return msg;
}

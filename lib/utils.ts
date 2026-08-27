import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function sanitizeErrorMessage(error: any, fallback = "An unexpected error occurred. Please try again."): string {
  if (!error) return fallback;
  const msg = typeof error === "string" ? error : error?.message || error?.error || error?.details || fallback;
  if (typeof msg !== "string") return fallback;
  
  // React Hydration Errors
  if (
    msg.includes("react.dev/errors") ||
    msg.includes("Minified React error") ||
    msg.includes("#441") ||
    msg.includes("#418") ||
    msg.includes("#423") ||
    msg.includes("#425")
  ) {
    console.error("Masked React internal error:", error);
    return "A temporary server communication error occurred. Please refresh or try again.";
  }

  // Database Foreign Key Errors
  if (msg.includes("violates foreign key constraint") || msg.includes("23503")) {
    return "Cannot delete or alter this record because it is currently linked to other records in the system.";
  }

  if (msg.includes("duplicate key value violates unique constraint")) {
    return "A record with this identifier already exists.";
  }
  
  return msg;
}

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function sanitizeErrorMessage(error: any, fallback = "An unexpected error occurred. Please try again."): string {
  if (!error) return fallback;
  const msg = typeof error === "string" ? error : error?.message || error?.error || fallback;
  if (typeof msg !== "string") return fallback;
  
  if (
    msg.includes("react.dev/errors") ||
    msg.includes("Minified React error") ||
    msg.includes("#441") ||
    msg.includes("#418") ||
    msg.includes("#423") ||
    msg.includes("#425")
  ) {
    return "A temporary server communication error occurred. Please refresh or try again.";
  }
  
  return msg;
}

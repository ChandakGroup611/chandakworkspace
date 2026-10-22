// =========================================================================
// MODULE GATE — one rule for "which module opens after sign-in"
//
//   1. Only one module allowed     → open it.
//   2. A default module is saved    → open it.
//   3. Otherwise                    → the "Choose a module" screen, every time,
//                                     until the person saves a default.
//   A deep link (e.g. a task link from an email) still opens, but only once rules 1–2
//   apply or the person picks that link's module on the selection screen.
//
// "module_chosen" is a browser-session cookie (no expiry): it is set once a module has been
// opened by one of the rules above and cleared at every sign-in, so re-opening the browser or
// signing in again always goes through the rules — the page you happened to be on last time,
// or the module the browser last remembered, no longer decides where you land.
// =========================================================================

export const MODULE_CHOSEN_COOKIE = "module_chosen";

export const MODULE_HOME: Record<string, string> = {
  TASK_WORKFLOW: "/",
  VEHICLE_DESK: "/vehicle",
  DESIGN_TRACKING: "/design/matrix",
  DASHBOARDS: "/dashboards",
};

/** Module that owns a path, or null if the path is shared across modules (e.g. /settings, /profile). */
export function moduleOfPath(path: string): string | null {
  if (path.startsWith("/vehicle")) return "VEHICLE_DESK";
  if (path.startsWith("/design")) return "DESIGN_TRACKING";
  if (path.startsWith("/dashboards")) return "DASHBOARDS";
  if (path.startsWith("/settings") || path.startsWith("/profile")) return null;
  return "TASK_WORKFLOW";
}

/** A "next" value worth honouring: a real page, not a module home, login or the selection screen. */
export function isDeepLink(next?: string | null): next is string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return false;
  const path = next.split("?")[0].split("#")[0];
  if (path === "/" || path.startsWith("/login") || path.startsWith("/register") || path.startsWith("/select-module") || path.startsWith("/auth/")) return false;
  return !Object.values(MODULE_HOME).includes(path);
}

/** Browser-side helpers (no-ops on the server). */
export function markModuleChosen() {
  if (typeof document !== "undefined") document.cookie = `${MODULE_CHOSEN_COOKIE}=1; path=/; SameSite=Lax`;
}
export function clearModuleChosen() {
  if (typeof document !== "undefined") document.cookie = `${MODULE_CHOSEN_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}

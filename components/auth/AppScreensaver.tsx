"use client";

/**
 * The 5-minute idle "live screen" for every page of the app (the login page mounts its own,
 * paused while signing in). Same 3D scene and rules as on the login page: after 5 minutes without
 * mouse, touch, scroll or key input it covers the screen; any input hides it and the page is
 * exactly as it was. Left off on Dashboards (wall screens) and on Meet / Rooms (live calls).
 */
import { usePathname } from "next/navigation";
import { LoginScreensaver } from "./LoginScreensaver";

// dashboards run on wall screens; meetings and rooms are watched without touching the mouse
const SKIP = [/^\/login/, /^\/register/, /^\/auth/, /^\/dashboards/, /^\/meet/, /^\/rooms/];

export function AppScreensaver({ idleMs = 5 * 60 * 1000 }: { idleMs?: number }) {
  const path = usePathname() || "/";
  if (SKIP.some((re) => re.test(path))) return null;
  return <LoginScreensaver idleMs={idleMs} />;
}

export default AppScreensaver;

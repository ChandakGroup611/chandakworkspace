import React from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getCachedUser } from "@/lib/auth/cached-user";
import { getUserAllowedModules } from "@/lib/actions/module-switcher";
import DesignTrackingHost from "@/components/design/DesignTrackingHost";

export const metadata = {
  title: "Design Tracking | Chandak Workspace",
  description: "Architectural drawings, CAD revisions, stage-gate reviews & site execution releases."
};

export default async function DesignModulePage() {
  const { user } = await getCachedUser();

  if (!user) {
    redirect("/login?next=/design");
  }

  // Verify module access
  const allowed = await getUserAllowedModules(user.id);
  const hasDesignAccess = allowed.isAdmin || allowed.modules.some(m => m.code === "DESIGN_TRACKING");

  if (!hasDesignAccess) {
    redirect("/select-module");
  }

  // Ensure active_module cookie is set to DESIGN_TRACKING
  const cookieStore = await cookies();
  const currentCookie = cookieStore.get("active_module")?.value;
  if (currentCookie !== "DESIGN_TRACKING") {
    cookieStore.set("active_module", "DESIGN_TRACKING", {
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      sameSite: "lax",
      httpOnly: false
    });
  }

  return <DesignTrackingHost />;
}

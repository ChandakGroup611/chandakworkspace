import React from "react";
import { redirect } from "next/navigation";
import { getCachedUser } from "@/lib/auth/cached-user";
import { getUserAllowedModules } from "@/lib/actions/module-switcher";
import { DesignRbacGovernance } from "@/Design_Tracking/src/components/DesignRbacGovernance";

export const metadata = {
  title: "RBAC Access Policies | Chandak Workspace",
  description: "Enterprise Role-Based Access Control, Project-Wise Governance, and Granular CRUD Policies."
};

export const dynamic = "force-dynamic";

export default async function RbacPage() {
  const { user } = await getCachedUser();

  if (!user) {
    redirect("/login?next=/rbac");
  }

  // Verify that user is Admin or has access to DESIGN_TRACKING module
  const allowed = await getUserAllowedModules(user.id);
  const hasAccess = allowed.isAdmin || allowed.modules.some(m => m.code === "DESIGN_TRACKING");

  if (!hasAccess) {
    redirect("/select-module");
  }

  return (
    <div className="w-full flex-1 flex flex-col min-w-0">
      <DesignRbacGovernance />
    </div>
  );
}

import React from "react";
import { redirect } from "next/navigation";
import { getCachedUser } from "@/lib/auth/cached-user";
import { getUserAllowedModules } from "@/lib/actions/module-switcher";
import IAMGovernanceCockpit from "@/components/iam/IAMGovernanceCockpit";

export const metadata = {
  title: "Workspace RBAC Access Policies | Chandak Workspace",
  description: "Enterprise Role-Based Access Control, Workspace Permissions, and IAM Governance."
};

export const dynamic = "force-dynamic";

export default async function RbacPage() {
  const { user } = await getCachedUser();

  if (!user) {
    redirect("/login?next=/rbac");
  }

  // Fetch user allowed modules and active module state
  const allowed = await getUserAllowedModules(user.id);

  if (!allowed.isAdmin && allowed.modules.length === 0) {
    redirect("/select-module");
  }

  const activeModuleCode = allowed.activeModuleCode || allowed.defaultModule?.code || "TASK_WORKFLOW";

  // Dedicated module routing - strict module isolation
  if (activeModuleCode === "VEHICLE_DESK") {
    redirect("/vehicle/rbac");
  }

  if (activeModuleCode === "DESIGN_TRACKING") {
    redirect("/design/rbac");
  }

  return (
    <div className="w-full flex-1 flex flex-col min-w-0">
      <IAMGovernanceCockpit />
    </div>
  );
}


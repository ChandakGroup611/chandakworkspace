import React from "react";
import { redirect } from "next/navigation";
import { getCachedUser } from "@/lib/auth/cached-user";
import { getUserAllowedModules } from "@/lib/actions/module-switcher";
import MultiModuleRbacHost from "@/components/rbac/MultiModuleRbacHost";

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

  // Fetch user allowed modules and active module state
  const allowed = await getUserAllowedModules(user.id);

  if (!allowed.isAdmin && allowed.modules.length === 0) {
    redirect("/select-module");
  }

  const initialActiveModule = allowed.activeModuleCode || allowed.defaultModule?.code || "TASK_WORKFLOW";

  return (
    <div className="w-full flex-1 flex flex-col min-w-0">
      <MultiModuleRbacHost 
        initialActiveModule={initialActiveModule}
        userModulesData={allowed}
      />
    </div>
  );
}

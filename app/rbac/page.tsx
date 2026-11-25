import React from "react";
import { redirect } from "next/navigation";
import { getCachedUser } from "@/lib/auth/cached-user";
import { getUserAllowedModules } from "@/lib/actions/module-switcher";
import { getAllModulesRbacSummaryAction, getModuleRbacDataAction } from "@/lib/actions/module-rbac";
import ModuleRbacManager from "@/components/rbac/ModuleRbacManager";
import IAMGovernanceCockpit from "@/components/iam/IAMGovernanceCockpit";

export const metadata = {
  title: "Workspace RBAC Access Policies | Chandak Workspace",
  description: "Who can see and do what in each module.",
};

export const dynamic = "force-dynamic";

interface RbacPageProps {
  searchParams?: Promise<{ module?: string }>;
}

export default async function RbacPage({ searchParams }: RbacPageProps) {
  const { user } = await getCachedUser();

  if (!user) {
    redirect("/login?next=/rbac");
  }

  // Fetch user allowed modules and active module state
  const allowed = await getUserAllowedModules(user.id);

  if (!allowed.isAdmin && allowed.modules.length === 0) {
    redirect("/select-module");
  }

  const sp = searchParams ? await searchParams : {};
  const requestedModule = (sp.module || "CHANDAK_MEET").toUpperCase();

  // Load summaries across all modules and initial active module state
  const [summaryRes, initialRbacRes] = await Promise.all([
    getAllModulesRbacSummaryAction(),
    getModuleRbacDataAction(requestedModule).catch(() => ({
      success: false,
      manifest: null,
      roles: [],
      auditLogs: [],
    })),
  ]);

  return (
    <div className="w-full flex-1 flex flex-col min-w-0 p-4 sm:p-6 lg:p-8 space-y-6">
      <ModuleRbacManager
        initialModuleCode={requestedModule}
        manifest={initialRbacRes.manifest}
        initialRoles={initialRbacRes.roles || []}
        initialAuditLogs={initialRbacRes.auditLogs || []}
        allModulesSummaries={summaryRes.modules || []}
        showModuleSwitcher={true}
        title="Chandak Workspace · Autonomous Module RBAC Directory"
        description="Autonomous module-scoped roles, permissions, and policy management across all 7 business modules"
        childrenLegacyIAM={<IAMGovernanceCockpit />}
      />
    </div>
  );
}

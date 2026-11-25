"use client";

import ReportsClient from "@/components/reports/ReportsClient";
import { usePermissions } from "@/hooks/usePermissions";
import { AccessRestricted } from "@/components/errors/AccessRestricted";

export default function ReportsPage() {
  const { hasPermission, roleCode } = usePermissions();
  const canView = roleCode === "SUPER_ADMIN" || hasPermission("REPORTS_VIEW");

  if (!canView) {
    return (
      <AccessRestricted
        requiredRole="Workspace Manager"
        requiredPermission="REPORTS_VIEW"
        moduleName="Workspaces & Tasks"
      />
    );
  }

  return (
    <div className="w-full space-y-3 animate-in fade-in-50 duration-150">
      <header className="pb-1">
        <h1 className="text-[20px] sm:text-[22px] font-semibold tracking-[-0.01em] text-heading ">Reports & analytics</h1>
        
      </header>

      <main>
        <ReportsClient />
      </main>
    </div>
  );
}

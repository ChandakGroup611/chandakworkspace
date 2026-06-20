"use client";

import ReportsClient from "@/components/reports/ReportsClient";
import { usePermissions } from "@/hooks/usePermissions";

export default function ReportsPage() {
  const { hasPermission, roleCode } = usePermissions();
  const canView = roleCode === "SUPER_ADMIN" || hasPermission("REPORTS_VIEW");

  if (!canView) {
    return (
      <div className="flex h-[80vh] w-full items-center justify-center">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-red-500">Access Denied</h2>
          <p className="text-gray-500">You do not have permission to view workspace reports.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3 animate-in fade-in-50 duration-500">
      <header className="pb-1">
        <h1 className="text-xl font-bold">Reports & Analytics</h1>
        <p className="text-xs text-gray-500 mt-0.5">Generate filtered analytical reports for workspaces and tasks with export capabilities.</p>
      </header>

      <main>
        <ReportsClient />
      </main>
    </div>
  );
}

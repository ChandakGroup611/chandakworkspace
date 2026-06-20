"use client";

import React from "react";
import { usePermissions } from "@/hooks/usePermissions";
import DataRetentionClient from "./DataRetentionClient";

export default function CompliancePage() {
  const { hasPermission, roleCode, loading } = usePermissions();

  if (loading) return <div>Loading...</div>;
  if (roleCode !== "SUPER_ADMIN" && !hasPermission("TRASH_VIEW")) {
    return (
      <div className="h-screen flex flex-col items-center justify-center space-y-4">
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-xs text-gray-500">You do not have capabilities to view Trash Data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-400 w-full">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white">Trash Data</h1>
          </div>
          <p className="text-xs text-gray-400">
            Securely manage, recover, or permanently purge soft-deleted records across the platform.
          </p>
        </div>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        <DataRetentionClient />
      </div>
    </div>
  );
}

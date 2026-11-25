"use client";

import React from "react";
import { usePermissions } from "@/hooks/usePermissions";
import DataRetentionClient from "./DataRetentionClient";

import ChandakLoader from "@/components/ui/ChandakLoader";
import { AccessRestricted } from "@/components/errors/AccessRestricted";

export default function CompliancePage() {
  const { hasPermission, roleCode, loading } = usePermissions();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <ChandakLoader
          size="lg"
          title="Loading compliance vault…"
          subtitle="Verifying statutory permissions & soft-deleted archives"
        />
      </div>
    );
  }
  if (roleCode !== "SUPER_ADMIN" && !hasPermission("TRASH_VIEW")) {
    return (
      <AccessRestricted
        requiredRole="Super Admin"
        requiredPermission="TRASH_VIEW"
        moduleName="Compliance & Vault"
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-150 w-full">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-[20px] sm:text-[22px] font-semibold tracking-[-0.01em] text-heading ">Trash data</h1>
          </div>
          <p className="text-xs text-muted">
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

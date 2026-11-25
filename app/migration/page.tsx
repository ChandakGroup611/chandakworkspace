import { checkServerPermission } from "@/lib/permissions";
import React from 'react';
import MigrationClient from './Client';
import { AccessRestricted } from "@/components/errors/AccessRestricted";

export default async function MigrationPage() {
  const canAccess = await checkServerPermission("DATA_MIGRATION_VIEW");
  if (!canAccess) {
    return (
      <AccessRestricted
        requiredRole="Data Migration Admin"
        requiredPermission="DATA_MIGRATION_VIEW"
        moduleName="Data Migration"
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col space-y-1">
        <h1 className="text-[20px] sm:text-[22px] font-semibold tracking-[-0.01em] text-heading">
          Data migration
        </h1>
        <p className="text-sm text-muted">Generate intelligent import templates and upload bulk data.</p>
      </div>
      
      <MigrationClient />
    </div>
  );
}

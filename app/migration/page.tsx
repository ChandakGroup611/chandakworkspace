import { checkServerPermission } from "@/lib/permissions";
import React from 'react';
import MigrationClient from './Client';

export default async function MigrationPage() {
  const canAccess = await checkServerPermission("DATA_MIGRATION_VIEW");
  if (!canAccess) {
    return (
      <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center p-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-semibold text-danger-text">Access denied</h2>
          <p className="text-muted">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Data migration
        </h1>
        <p className="text-sm text-muted">Generate intelligent import templates and upload bulk data.</p>
      </div>
      
      <MigrationClient />
    </div>
  );
}

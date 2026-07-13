import { checkServerPermission } from "@/lib/permissions";
import React from 'react';
import MigrationClient from './Client';

export default function MigrationPage() {
  const canAccess = await checkServerPermission("DATA_MIGRATION_VIEW");
  if (!canAccess) {
    return (
      <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center p-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-red-500">Access Denied</h2>
          <p className="text-gray-500">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col space-y-1">
        <h1 className="text-3xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-200 to-indigo-400">
          Data Migration
        </h1>
        <p className="text-sm text-gray-400">Generate intelligent import templates and upload bulk data.</p>
      </div>
      
      <MigrationClient />
    </div>
  );
}

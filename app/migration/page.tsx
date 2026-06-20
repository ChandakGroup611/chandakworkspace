import React from 'react';
import MigrationClient from './Client';

export default function MigrationPage() {
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

"use client";

import React from "react";
import SettingsGallery from "@/components/settings/SettingsGallery";
import { usePermissions } from "@/hooks/usePermissions";

export default function SettingsPage() {
  const { hasPermission, roleCode } = usePermissions();
  const canManage = roleCode === "SUPER_ADMIN" || hasPermission("SETTINGS_MANAGE");

  if (!canManage) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-red-500">Access Denied</h2>
          <p className="text-gray-500">You do not have permission to manage settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 animate-in fade-in-50 duration-500">
      {/* Semantic main header wrapper ensuring heading hierarchy */}
      <header className="border-b border-white/5 pb-4">
        <h1 id="settings-page-title" className="text-xl font-bold tracking-tight">
          Design Gallery & UI Governance Engine
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Centralized visual preference repository managing multi-tier styling layers, cognitive density, and tactile response metrics.
        </p>
      </header>

      {/* Interactive client sandbox orchestration layer */}
      <SettingsGallery />
    </div>
  );
}

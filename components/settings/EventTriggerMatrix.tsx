"use client";

import React, { useState } from "react";
import { updateEventTriggerConfig } from "@/lib/actions/email-config";
import { usePermissions } from "@/hooks/usePermissions";
import { Shield } from "lucide-react";
import ChandakLoader from "@/components/ui/ChandakLoader";
import { AccessRestricted } from "@/components/errors/AccessRestricted";

export default function EventTriggerMatrix({ configList }: { configList: any[] }) {
  const [configs, setConfigs] = useState(configList);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const { hasPermission, loading: permsLoading } = usePermissions();

  const handleToggle = async (id: string, field: "is_email_enabled" | "is_inapp_enabled", currentValue: boolean) => {
    setLoadingId(id);
    const newValue = !currentValue;
    try {
      await updateEventTriggerConfig(id, { [field]: newValue });
      setConfigs(configs.map(c => c.id === id ? { ...c, [field]: newValue } : c));
    } catch (e) {
      console.error("Failed to update", e);
    }
    setLoadingId(null);
  };

  const modules = Array.from(new Set(configs.map(c => c.module_code)));

  if (permsLoading) {
    return (
      <div className="py-12 flex justify-center">
        <ChandakLoader size="md" title="Loading notification matrix…" />
      </div>
    );
  }

  if (!hasPermission("SETTINGS_NOTIFICATIONS_VIEW")) {
    return (
      <AccessRestricted
        requiredRole="Super Admin"
        requiredPermission="SETTINGS_NOTIFICATIONS_VIEW"
        moduleName="Notification Settings"
      />
    );
  }

  const canManage = hasPermission("SETTINGS_NOTIFICATIONS_MANAGE");

  return (
    <div className="theme-card-structural border-border p-6 rounded-lg animate-in fade-in slide-in-from-bottom-6 duration-700 delay-150">
      <h2 className="text-xl font-semibold text-foreground mb-2">Event trigger controls</h2>
      <div className="space-y-8">
        {modules.map(mod => {
          const modConfigs = configs.filter(c => c.module_code === mod);
          return (
            <div key={mod} className="border border-border rounded-lg overflow-hidden">
              <div className="theme-card-structural px-4 py-3 border-b">
                <h3 className="text-sm font-semibold text-foreground">{mod}</h3>
              </div>
              <div className="divide-y divide-border">
                {modConfigs.map(config => (
                  <div key={config.id} className="flex items-center justify-between p-4 bg-surface/[0.02] hover:bg-surface/[0.04] transition-colors">
                    <div>
                      <p className="text-sm font-medium text-foreground">{config.event_code}</p>
                      <p className="text-xs text-muted mt-1">
                        Allowed Roles: <span className="text-muted">{config.allowed_roles?.length ? config.allowed_roles.join(', ') : 'All'}</span> | 
                        Statuses: <span className="text-muted">{config.allowed_statuses?.length ? config.allowed_statuses.join(', ') : 'Any'}</span>
                      </p>
                    </div>
                    <div className="flex gap-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <span className="text-xs font-medium text-muted">In-App</span>
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-border theme-card-structural text-accent-soft-text focus:ring-ring" 
                          checked={config.is_inapp_enabled !== false}
                          onChange={() => handleToggle(config.id, 'is_inapp_enabled', config.is_inapp_enabled !== false)}
                          disabled={loadingId === config.id || !canManage}
                        />
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <span className="text-xs font-medium text-muted">Email</span>
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-border theme-card-structural text-accent-soft-text focus:ring-ring" 
                          checked={config.is_email_enabled !== false}
                          onChange={() => handleToggle(config.id, 'is_email_enabled', config.is_email_enabled !== false)}
                          disabled={loadingId === config.id || !canManage}
                        />
                      </label>
                    </div>
                  </div>
                ))}
                {modConfigs.length === 0 && (
                  <div className="p-4 text-xs text-muted text-center">No configurable events found.</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

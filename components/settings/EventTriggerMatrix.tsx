"use client";

import React, { useState } from "react";
import { updateEventTriggerConfig } from "@/lib/actions/email-config";
import { usePermissions } from "@/hooks/usePermissions";
import { Shield } from "lucide-react";

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
    return <div className="animate-spin h-8 w-8 border-2 border-theme-btn-primary border-t-transparent rounded-full mx-auto my-12" />;
  }

  if (!hasPermission("SETTINGS_NOTIFICATIONS_VIEW")) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-12">
        <div className="p-4 rounded-full bg-danger/10 border border-rose-500/20 text-danger">
          <Shield className="h-10 w-10" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Access Denied</h2>
        <p className="text-xs text-muted">You do not have capabilities to view Notification Settings.</p>
      </div>
    );
  }

  const canManage = hasPermission("SETTINGS_NOTIFICATIONS_MANAGE");

  return (
    <div className="theme-card-structural /5 border-border p-6 rounded-xl animate-in fade-in slide-in-from-bottom-6 duration-700 delay-150">
      <h2 className="text-xl font-bold text-foreground mb-2">Event Trigger Controls</h2>
      <p className="text-sm text-muted mb-6">Granular control over which system events trigger notifications. Disabling here bypasses backend processing for maximum performance.</p>

      <div className="space-y-8">
        {modules.map(mod => {
          const modConfigs = configs.filter(c => c.module_code === mod);
          return (
            <div key={mod} className="border border-border rounded-lg overflow-hidden">
              <div className="bg-surface/30 px-4 py-3 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">{mod}</h3>
              </div>
              <div className="divide-y divide-white/5">
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
                        <span className="text-xs font-medium text-muted uppercase">In-App</span>
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-white/20 bg-surface/50 text-theme-icon focus:ring-theme-btn-primary/50" 
                          checked={config.is_inapp_enabled !== false}
                          onChange={() => handleToggle(config.id, 'is_inapp_enabled', config.is_inapp_enabled !== false)}
                          disabled={loadingId === config.id || !canManage}
                        />
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <span className="text-xs font-medium text-muted uppercase">Email</span>
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-white/20 bg-surface/50 text-theme-icon focus:ring-theme-btn-primary/50" 
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

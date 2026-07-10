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
    return <div className="animate-spin h-8 w-8 border-2 border-accent border-t-transparent rounded-full mx-auto my-12" />;
  }

  if (!hasPermission("SETTINGS_NOTIFICATIONS_VIEW")) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-12">
        <div className="p-4 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400">
          <Shield className="h-10 w-10" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Access Denied</h2>
        <p className="text-xs text-gray-500">You do not have capabilities to view Notification Settings.</p>
      </div>
    );
  }

  const canManage = hasPermission("SETTINGS_NOTIFICATIONS_MANAGE");

  return (
    <div className="bg-white/5 border border-white/10 p-6 rounded-xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-6 duration-700 delay-150">
      <h2 className="text-xl font-bold text-foreground mb-2">Event Trigger Controls</h2>
      <p className="text-sm text-gray-400 mb-6">Granular control over which system events trigger notifications. Disabling here bypasses backend processing for maximum performance.</p>

      <div className="space-y-8">
        {modules.map(mod => {
          const modConfigs = configs.filter(c => c.module_code === mod);
          return (
            <div key={mod} className="border border-white/5 rounded-lg overflow-hidden">
              <div className="bg-black/30 px-4 py-3 border-b border-white/5">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">{mod}</h3>
              </div>
              <div className="divide-y divide-white/5">
                {modConfigs.map(config => (
                  <div key={config.id} className="flex items-center justify-between p-4 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                    <div>
                      <p className="text-sm font-medium text-foreground">{config.event_code}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Allowed Roles: <span className="text-gray-400">{config.allowed_roles?.length ? config.allowed_roles.join(', ') : 'All'}</span> | 
                        Statuses: <span className="text-gray-400">{config.allowed_statuses?.length ? config.allowed_statuses.join(', ') : 'Any'}</span>
                      </p>
                    </div>
                    <div className="flex gap-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <span className="text-xs font-medium text-gray-400 uppercase">In-App</span>
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-white/20 bg-black/50 text-accent focus:ring-accent/50" 
                          checked={config.is_inapp_enabled !== false}
                          onChange={() => handleToggle(config.id, 'is_inapp_enabled', config.is_inapp_enabled !== false)}
                          disabled={loadingId === config.id || !canManage}
                        />
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <span className="text-xs font-medium text-gray-400 uppercase">Email</span>
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-white/20 bg-black/50 text-accent focus:ring-accent/50" 
                          checked={config.is_email_enabled !== false}
                          onChange={() => handleToggle(config.id, 'is_email_enabled', config.is_email_enabled !== false)}
                          disabled={loadingId === config.id || !canManage}
                        />
                      </label>
                    </div>
                  </div>
                ))}
                {modConfigs.length === 0 && (
                  <div className="p-4 text-xs text-gray-500 text-center">No configurable events found.</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

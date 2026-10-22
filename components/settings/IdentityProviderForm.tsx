"use client";

import React, { useState, useEffect } from "react";
import { AppButton } from '@/components/ui/AppButton';
import { CheckCircle, Shield, Key, Link2, Users, Save, Loader2, AlertCircle } from "lucide-react";
import { saveSettingsEntity } from "@/lib/actions/settings";
import { createClient } from "@/utils/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import ChandakLoader from "@/components/ui/ChandakLoader";

export default function IdentityProviderForm() {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [toastMsg, setToastMsg] = useState<{type: "success" | "error", text: string} | null>(null);
  const { hasPermission, loading: permsLoading } = usePermissions();

  const triggerToast = (text: string, type: "success" | "error" = "success") => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3000);
  };

  const [config, setConfig] = useState<any>({
    provider_type: "AZURE_AD",
    tenant_id: "",
    client_id: "",
    client_secret_encrypted: "",
    authority_url: "https://login.microsoftonline.com/common",
    is_active: false,
    force_sso: false,
    auto_provision_users: false
  });

  const supabase = createClient();

  useEffect(() => {
    async function loadConfig() {
      try {
        const { data, error } = await supabase
          .from("identity_provider_config")
          .select("*")
          .eq("provider_type", "AZURE_AD")
          .single();
        
        if (data && !error) {
          setConfig(data);
        }
      } catch (err) {
        // Ignore, likely no record exists yet
      } finally {
        setFetching(false);
      }
    }
    loadConfig();
  }, [supabase]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data: existing } = await supabase
        .from("identity_provider_config")
        .select("id")
        .eq("provider_type", "AZURE_AD")
        .single();

      if (existing?.id) {
        const res = await saveSettingsEntity("identity_provider_config", config, existing.id);
        if (!res.success) throw new Error(res.error);
      } else {
        const res = await saveSettingsEntity("identity_provider_config", config);
        if (!res.success) throw new Error(res.error);
      }

      triggerToast("Identity provider configuration saved", "success");
    } catch (err: any) {
      triggerToast(err.message || "Failed to save configuration", "error");
    } finally {
      setLoading(false);
    }
  };

  if (fetching || permsLoading) {
    return (
      <div className="flex justify-center py-12">
        <ChandakLoader size="md" title="Loading identity provider…" />
      </div>
    );
  }

  if (!hasPermission("SETTINGS_IDENTITY_VIEW")) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-12">
        <div className="p-4 rounded-full bg-danger-soft border border-danger-border text-danger-text">
          <Shield className="h-10 w-10" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Access denied</h2>
        <p className="text-xs text-muted">You do not have capabilities to view Identity Settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Overview Card */}
      <div className="bg-surface border border-border rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-accent-soft text-accent-soft-text rounded-lg">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-heading">Microsoft Entra ID (Azure AD)</h2>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-muted">Status</span>
            <button 
              type="button"
              role="switch"
              aria-checked={config.is_active}
              aria-label="Toggle Entra ID status"
              onClick={() => setConfig({ ...config, is_active: !config.is_active })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${config.is_active ? 'bg-primary' : 'bg-sunken border border-border'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-surface transition-transform ${config.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-subtle">Tenant ID</label>
            <input 
              type="text" 
              value={config.tenant_id || ""}
              onChange={(e) => setConfig({ ...config, tenant_id: e.target.value })}
              className="w-full bg-surface border border-input rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:border-border-active"
              placeholder="e.g. 8eaef023-…"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-subtle">Client ID (Application ID)</label>
            <input 
              type="text" 
              value={config.client_id || ""}
              onChange={(e) => setConfig({ ...config, client_id: e.target.value })}
              className="w-full bg-surface border border-input rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:border-border-active"
              placeholder="e.g. d2a2b023-…"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-subtle">Client secret (encrypted)</label>
            <div className="relative">
              <input 
                type="password" 
                value={config.client_secret_encrypted || ""}
                onChange={(e) => setConfig({ ...config, client_secret_encrypted: e.target.value })}
                className="w-full bg-surface border border-input rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:border-border-active pl-10"
                placeholder="Enter client secret value"
              />
              <Key className="w-4 h-4 text-muted absolute left-3 top-3.5" />
            </div>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-subtle">Authority URL</label>
            <div className="relative">
              <input 
                type="text" 
                value={config.authority_url || ""}
                onChange={(e) => setConfig({ ...config, authority_url: e.target.value })}
                className="w-full bg-surface border border-input rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:border-border-active pl-10"
                placeholder="https://login.microsoftonline.com/common"
              />
              <Link2 className="w-4 h-4 text-muted absolute left-3 top-3.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Auto Provisioning Settings */}
      <div className="bg-surface border border-border rounded-lg p-6 shadow-sm">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-accent-soft text-accent-soft-text rounded-lg">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-heading">Auto-provisioning settings</h2>
          </div>
        </div>

        <div className="space-y-4">
          <label className="flex items-center space-x-3 cursor-pointer group">
            <button 
              type="button"
              role="switch"
              aria-checked={config.auto_provision_users}
              aria-label="Enable JIT provisioning"
              onClick={() => setConfig({ ...config, auto_provision_users: !config.auto_provision_users })}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${config.auto_provision_users ? 'bg-primary' : 'bg-sunken border border-border'}`}
            >
              <span className={`inline-block h-3 w-3 transform rounded-full bg-surface transition-transform ${config.auto_provision_users ? 'translate-x-5' : 'translate-x-1'}`} />
            </button>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">Enable JIT (just-in-time) provisioning</span>
              <span className="text-xs text-muted">Automatically create user accounts in the system if they authenticate successfully via Azure AD.</span>
            </div>
          </label>

          <label className="flex items-center space-x-3 cursor-pointer group">
            <button 
              type="button"
              role="switch"
              aria-checked={config.force_sso}
              aria-label="Force SSO"
              onClick={() => setConfig({ ...config, force_sso: !config.force_sso })}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${config.force_sso ? 'bg-danger-solid' : 'bg-sunken border border-border'}`}
            >
              <span className={`inline-block h-3 w-3 transform rounded-full bg-surface transition-transform ${config.force_sso ? 'translate-x-5' : 'translate-x-1'}`} />
            </button>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">Force SSO (disable password login)</span>
              <span className="text-xs text-muted">If enabled, standard password login will be hidden and all users MUST use Microsoft SSO.</span>
            </div>
          </label>
        </div>

        {config.auto_provision_users && (
          <div className="mt-6 p-4 rounded-lg bg-info-soft border border-info-border text-info-text flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm leading-relaxed">
              When JIT provisioning is enabled, Supabase Auth will instantly map the incoming Azure AD profile to the `user_master` table. Ensure your default organizational policies in the Azure Portal restrict access to the correct Security Groups.
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-end pt-4">
        <AppButton
          variant="primary"
          onClick={handleSave}
          disabled={loading || !hasPermission("SETTINGS_IDENTITY_MANAGE")}
          className="flex items-center space-x-2"
          leftIcon={loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        >
          <span>{loading ? "Saving..." : "Save Configuration"}</span>
        </AppButton>
      </div>

      {/* Local Toast Notification */}
      {toastMsg && (
        <div className={`fixed bottom-6 right-6 z-[var(--z-toast)] flex items-center gap-2 rounded-lg px-4 py-3 shadow-lg animate-in slide-in-from-bottom-5 duration-300 ${toastMsg.type === 'error' ? 'bg-danger-solid text-white' : 'bg-success text-white'}`}>
          {toastMsg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span className="text-xs font-semibold">{toastMsg.text}</span>
        </div>
      )}

    </div>
  );
}

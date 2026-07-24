"use client";

import React, { useState, useEffect } from "react";
import { AppButton } from '@/components/ui/AppButton';
import { CheckCircle, Shield, Key, Link2, Users, Save, Loader2, AlertCircle } from "lucide-react";
import { saveSettingsEntity } from "@/lib/actions/settings";
import { createClient } from "@/utils/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";

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

      triggerToast("Identity Provider Configuration Saved", "success");
    } catch (err: any) {
      triggerToast(err.message || "Failed to save configuration", "error");
    } finally {
      setLoading(false);
    }
  };

  if (fetching || permsLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!hasPermission("SETTINGS_IDENTITY_VIEW")) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-12">
        <div className="p-4 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400">
          <Shield className="h-10 w-10" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Access Denied</h2>
        <p className="text-xs text-gray-500">You do not have capabilities to view Identity Settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Overview Card */}
      <div className="bg-[#0A0D14] border border-white/10 rounded-xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-accent/10 rounded-lg">
              <Shield className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Microsoft Entra ID (Azure AD)</h2>
              <p className="text-sm text-gray-400">Configure Microsoft 365 Single Sign-On and auto-provisioning.</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-400">Status</span>
            <AppButton 
              onClick={() => setConfig({ ...config, is_active: !config.is_active })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.is_active ? 'bg-accent' : 'bg-gray-700'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-surface transition-transform ${config.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
            </AppButton>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Tenant ID</label>
            <input 
              type="text" 
              value={config.tenant_id || ""}
              onChange={(e) => setConfig({ ...config, tenant_id: e.target.value })}
              className="w-full bg-[#121620] border border-white/5 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-accent/50"
              placeholder="e.g. 8eaef023-..."
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Client ID (Application ID)</label>
            <input 
              type="text" 
              value={config.client_id || ""}
              onChange={(e) => setConfig({ ...config, client_id: e.target.value })}
              className="w-full bg-[#121620] border border-white/5 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-accent/50"
              placeholder="e.g. d2a2b023-..."
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-gray-300">Client Secret (Encrypted)</label>
            <div className="relative">
              <input 
                type="password" 
                value={config.client_secret_encrypted || ""}
                onChange={(e) => setConfig({ ...config, client_secret_encrypted: e.target.value })}
                className="w-full bg-[#121620] border border-white/5 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-accent/50 pl-10"
                placeholder="Enter client secret value"
              />
              <Key className="w-4 h-4 text-gray-500 absolute left-3 top-3.5" />
            </div>
            <p className="text-xs text-gray-500 mt-1">This value is encrypted at rest and never exposed to the frontend after saving.</p>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-gray-300">Authority URL</label>
            <div className="relative">
              <input 
                type="text" 
                value={config.authority_url || ""}
                onChange={(e) => setConfig({ ...config, authority_url: e.target.value })}
                className="w-full bg-[#121620] border border-white/5 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-accent/50 pl-10"
                placeholder="https://login.microsoftonline.com/common"
              />
              <Link2 className="w-4 h-4 text-gray-500 absolute left-3 top-3.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Auto Provisioning Settings */}
      <div className="bg-[#0A0D14] border border-white/10 rounded-xl p-6 shadow-2xl">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-accent/10 rounded-lg">
            <Users className="w-6 h-6 text-accent" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Auto-Provisioning Settings</h2>
            <p className="text-sm text-gray-400">Control how users are mapped when they log in via SSO for the first time.</p>
          </div>
        </div>

        <div className="space-y-4">
          <label className="flex items-center space-x-3 cursor-pointer group">
            <AppButton 
              onClick={() => setConfig({ ...config, auto_provision_users: !config.auto_provision_users })}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${config.auto_provision_users ? 'bg-accent' : 'bg-gray-700'}`}
            >
              <span className={`inline-block h-3 w-3 transform rounded-full bg-surface transition-transform ${config.auto_provision_users ? 'translate-x-5' : 'translate-x-1'}`} />
            </AppButton>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors">Enable JIT (Just-In-Time) Provisioning</span>
              <span className="text-xs text-gray-500">Automatically create user accounts in the system if they authenticate successfully via Azure AD.</span>
            </div>
          </label>

          <label className="flex items-center space-x-3 cursor-pointer group">
            <AppButton 
              onClick={() => setConfig({ ...config, force_sso: !config.force_sso })}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${config.force_sso ? 'bg-red-500' : 'bg-gray-700'}`}
            >
              <span className={`inline-block h-3 w-3 transform rounded-full bg-surface transition-transform ${config.force_sso ? 'translate-x-5' : 'translate-x-1'}`} />
            </AppButton>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors">Force SSO (Disable Password Login)</span>
              <span className="text-xs text-gray-500">If enabled, standard password login will be hidden and all users MUST use Microsoft SSO.</span>
            </div>
          </label>
        </div>

        {config.auto_provision_users && (
          <div className="mt-6 p-4 rounded-lg bg-accent/5 border border-accent/20 flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-accent shrink-0 mt-0.5" />
            <p className="text-sm text-blue-200/80 leading-relaxed">
              When JIT provisioning is enabled, Supabase Auth will instantly map the incoming Azure AD profile to the `user_master` table. Ensure your default organizational policies in the Azure Portal restrict access to the correct Security Groups.
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-end pt-4">
        <AppButton
          onClick={handleSave}
          disabled={loading || !hasPermission("SETTINGS_IDENTITY_MANAGE")}
          className="flex items-center space-x-2 bg-accent hover:bg-accent text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{loading ? "Saving..." : "Save Configuration"}</span>
        </AppButton>
      </div>

      {/* Local Toast Notification */}
      {toastMsg && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl px-4 py-3 shadow-2xl animate-in slide-in-from-bottom-5 duration-300 ${toastMsg.type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`}>
          {toastMsg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span className="text-xs font-semibold">{toastMsg.text}</span>
        </div>
      )}

    </div>
  );
}

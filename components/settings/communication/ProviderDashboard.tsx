"use client";

import React, { useState, useEffect } from "react";
import { AppButton } from '@/components/ui/AppButton';
import { Server, Save, Loader2, ShieldAlert, Key, Zap } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { saveEmailProvider, updateEmailProvider, testProviderConnection, fetchEmailProviders } from "@/lib/actions/email-config";

const PROVIDER_TYPES = ["SMTP", "Microsoft 365", "Resend", "SendGrid"];

export default function ProviderDashboard() {
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{type: "success" | "error" | "warning", text: string} | null>(null);
  
  const supabase = createClient();

  const triggerToast = (text: string, type: "success" | "error" | "warning" = "success") => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      const data = await fetchEmailProviders();
      
      // Ensure we have exactly 3 slots: Primary, Fallback 1, Fallback 2
      let slots = [
        { id: "temp_1", priority_level: 1, provider_name: "SMTP", is_active: false, config: {} },
        { id: "temp_2", priority_level: 2, provider_name: "Resend", is_active: false, config: {} },
        { id: "temp_3", priority_level: 3, provider_name: "SendGrid", is_active: false, config: {} }
      ];

      if (data && data.length > 0) {
        data.forEach((p: any) => {
          if (p.priority_level >= 1 && p.priority_level <= 3) {
            if (slots[p.priority_level - 1].id.startsWith("temp_")) {
              slots[p.priority_level - 1] = { ...p, config: p.config || {} };
            }
          }
        });
      }
      
      setProviders(slots);
    } catch (err) {
      console.error("[ProviderDashboard Error]", JSON.stringify(err, null, 2));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (provider: any) => {
    try {
      const payload = {
        provider_name: provider.provider_name,
        priority_level: provider.priority_level,
        is_active: provider.is_active,
        config: provider.config
      };

      if (provider.id.startsWith("temp_")) {
        await saveEmailProvider(payload);
      } else {
        await updateEmailProvider(provider.id, payload);
      }
      
      triggerToast(`Provider level ${provider.priority_level} saved successfully`);
      fetchProviders();
    } catch (err: any) {
      triggerToast(err.message || "Failed to save provider", "error");
    }
  };

  const updateProviderConfig = (priority: number, field: string, value: any) => {
    setProviders(providers.map(p => {
      if (p.priority_level === priority) {
        return { ...p, config: { ...p.config, [field]: value } };
      }
      return p;
    }));
  };

  const updateProviderField = (priority: number, field: string, value: any) => {
    setProviders(providers.map(p => p.priority_level === priority ? { ...p, [field]: value } : p));
  };

  const handleTestConnection = async (provider: any) => {
    const hasPassword = Boolean(provider.config.password || provider.config.hasPassword);
    if (!provider.config.host || !provider.config.port || !provider.config.username || !hasPassword) {
      triggerToast("Please fill in all SMTP details (Host, Port, Username, Password) before testing.", "warning");
      return;
    }
    setTestingId(provider.id || provider.priority_level.toString());
    try {
      const result = await testProviderConnection(provider.provider_name, provider.config, provider.id);
      if (result.success) {
        triggerToast("Connection verified successfully! Your SMTP credentials are valid.", "success");
      } else {
        triggerToast(result.message || "Failed to connect to SMTP server.", "error");
      }
    } catch (err: any) {
      triggerToast(err.message || "An unexpected error occurred during testing.", "error");
    } finally {
      setTestingId(null);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-accent-soft-text" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="flex justify-between items-center bg-card border border-border p-4 rounded-lg shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Routing infrastructure</h2>
          </div>
      </div>

      <div className="space-y-6">
        {providers.map((prov) => (
          <div key={prov.id || prov.priority_level} className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
            <div className={`p-4 border-b border-border flex items-center justify-between ${prov.priority_level === 1 ? 'bg-accent-soft' : 'bg-muted/30'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${prov.priority_level === 1 ? 'bg-accent-soft' : 'bg-muted'}`}>
                  <Server className={`w-5 h-5 ${prov.priority_level === 1 ? 'text-accent-soft-text' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <h3 className={`font-semibold ${prov.priority_level === 1 ? 'text-accent-soft-text' : 'text-foreground'}`}>
                    {prov.priority_level === 1 ? 'PRIMARY DISPATCH' : `FALLBACK LEVEL ${prov.priority_level - 1}`}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {prov.priority_level === 1 ? 'All queues will attempt delivery via this provider first.' : `Used automatically if Level ${prov.priority_level - 1} fails.`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <select 
                  value={prov.provider_name}
                  onChange={(e) => updateProviderField(prov.priority_level, "provider_name", e.target.value)}
                  className="bg-background border border-border rounded-md px-3 py-1.5 text-sm font-semibold text-foreground focus:outline-none focus:border-primary"
                >
                  {PROVIDER_TYPES.map(pt => <option key={pt} value={pt}>{pt}</option>)}
                </select>
                <label className="flex items-center gap-2 cursor-pointer ml-4">
                  <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${prov.is_active ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
                    <span className={`inline-block h-3 w-3 transform rounded-full bg-surface transition-transform ${prov.is_active ? 'translate-x-5' : 'translate-x-1'}`} />
                  </div>
                  <input 
                    type="checkbox" 
                    className="hidden" 
                    checked={prov.is_active} 
                    onChange={(e) => updateProviderField(prov.priority_level, "is_active", e.target.checked)}
                  />
                  <span className="text-xs font-semibold text-muted-foreground">Active</span>
                </label>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {(prov.provider_name === "SMTP" || prov.provider_name === "Microsoft 365") && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-muted-foreground">SMTP host</label>
                    <input 
                      type="text" 
                      value={prov.config.host || ""}
                      onChange={(e) => updateProviderConfig(prov.priority_level, "host", e.target.value)}
                      className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                      placeholder="smtp.office365.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-muted-foreground">SMTP port</label>
                    <input 
                      type="number" 
                      value={prov.config.port || ""}
                      onChange={(e) => updateProviderConfig(prov.priority_level, "port", e.target.value)}
                      className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                      placeholder="587"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-muted-foreground">Username / email</label>
                    <input 
                      type="text" 
                      value={prov.config.username || ""}
                      onChange={(e) => updateProviderConfig(prov.priority_level, "username", e.target.value)}
                      className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                      placeholder="noreply@enterprise.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-muted-foreground flex items-center justify-between">
                      <span>Password / app password</span>
                      {prov.config.hasPassword && (
                        <span className="text-[11px] font-normal text-emerald-600 dark:text-emerald-400">Stored securely</span>
                      )}
                    </label>
                    <div className="relative">
                      <input 
                        type="password" 
                        value={prov.config.password || ""}
                        onChange={(e) => updateProviderConfig(prov.priority_level, "password", e.target.value)}
                        className="w-full bg-background border border-border rounded-md px-3 py-2 pl-9 text-sm text-foreground focus:outline-none focus:border-primary"
                        placeholder={prov.config.hasPassword ? "•••••••• (leave blank to keep current)" : "••••••••"}
                        autoComplete="new-password"
                      />
                      <Key className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-muted-foreground">Sender display name</label>
                    <input 
                      type="text" 
                      value={prov.config.sender_name || ""}
                      onChange={(e) => updateProviderConfig(prov.priority_level, "sender_name", e.target.value)}
                      className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                      placeholder="Noreply"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-muted-foreground">From email address</label>
                    <input 
                      type="text" 
                      value={prov.config.from_email || ""}
                      onChange={(e) => updateProviderConfig(prov.priority_level, "from_email", e.target.value)}
                      className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                      placeholder="Noreply@chandakgroup.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-muted-foreground">Reply-to email</label>
                    <input 
                      type="text" 
                      value={prov.config.reply_to || ""}
                      onChange={(e) => updateProviderConfig(prov.priority_level, "reply_to", e.target.value)}
                      className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                      placeholder="Noreply@chandakgroup.com"
                    />
                  </div>
                </>
              )}

              {(prov.provider_name === "Resend" || prov.provider_name === "SendGrid") && (
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-semibold text-muted-foreground flex items-center justify-between">
                    <span>API key</span>
                    {prov.config.hasApiKey && (
                      <span className="text-[11px] font-normal text-emerald-600 dark:text-emerald-400">Stored securely</span>
                    )}
                  </label>
                  <div className="relative">
                    <input 
                      type="password" 
                      value={prov.config.api_key || ""}
                      onChange={(e) => updateProviderConfig(prov.priority_level, "api_key", e.target.value)}
                      className="w-full bg-background border border-border rounded-md px-3 py-2 pl-9 text-sm text-foreground focus:outline-none focus:border-primary"
                      placeholder={prov.config.hasApiKey ? "•••••••• (leave blank to keep current)" : "re_..."}
                      autoComplete="new-password"
                    />
                    <Key className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3 text-warning-text" /> Keys are encrypted and never exposed in the browser.
                  </p>
                </div>
              )}
            </div>

            <div className="bg-muted/20 px-6 py-3 border-t border-border flex justify-end gap-3">
              {(prov.provider_name === "SMTP" || prov.provider_name === "Microsoft 365") && (
                <AppButton 
                  onClick={() => handleTestConnection(prov)}
                  disabled={testingId === (prov.id || prov.priority_level.toString())}
                  className="flex items-center gap-2 bg-background hover:bg-surface-hover text-foreground px-4 py-1.5 rounded text-sm font-semibold transition-colors border border-border disabled:opacity-50"
                >
                  {testingId === (prov.id || prov.priority_level.toString()) ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4 text-warning-text" />
                  )}
                  {testingId === (prov.id || prov.priority_level.toString()) ? 'Testing...' : 'Test Connection'}
                </AppButton>
              )}
              <AppButton 
                onClick={() => handleSave(prov)}
                className="flex items-center gap-2 bg-primary hover:opacity-90/90 text-primary-foreground px-4 py-1.5 rounded text-sm font-semibold transition-colors shadow-sm"
              >
                <Save className="w-4 h-4" /> Save details
              </AppButton>
            </div>
          </div>
        ))}
      </div>

      {toastMsg && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg px-4 py-3  animate-in slide-in-from-bottom-5 duration-300 ${toastMsg.type === 'error' ? 'bg-danger' : toastMsg.type === 'warning' ? 'bg-warning' : 'bg-primary'} text-primary-foreground`}>
          <span className="text-xs font-semibold">{toastMsg.text}</span>
        </div>
      )}
    </div>
  );
}

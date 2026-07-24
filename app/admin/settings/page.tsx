"use client";

import React, { useState, useEffect } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppCard, AppCardHeader, AppCardTitle, AppCardContent } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { createClient } from "@/utils/supabase/client";
import { Settings, ShieldAlert, Mail, Activity, AlertTriangle } from "lucide-react";

export default function GlobalSettingsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  // Form State
  const [settings, setSettings] = useState({
    disable_all_emails: false,
    disable_all_realtime: false,
    disable_digests: false,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("system_governance_switches")
        .select("*")
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is no rows
      
      if (data) {
        setSettings({
          disable_all_emails: data.disable_all_emails || false,
          disable_all_realtime: data.disable_all_realtime || false,
          disable_digests: data.disable_digests || false,
        });
      }
    } catch (e: any) {
      console.error(e);
      setMsg({ text: "Failed to load settings", type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMsg(null);
    try {
      // Typically there is only one row, or one per tenant
      const { data: existing } = await supabase.from("system_governance_switches").select("tenant_id").limit(1).single();

      if (existing) {
        const { error } = await supabase
          .from("system_governance_switches")
          .update(settings)
          .eq("tenant_id", existing.tenant_id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("system_governance_switches")
          .insert([settings]);
        if (error) throw error;
      }

      setMsg({ text: "Global settings saved successfully.", type: 'success' });
      setTimeout(() => setMsg(null), 3000);
    } catch (err: any) {
      setMsg({ text: err.message || "Failed to save settings.", type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <PageContainer>
      <div className="flex flex-col h-full gap-6 px-4 md:px-8 py-6 max-w-4xl mx-auto w-full">
        <PageHeader 
          title="Global Configuration" 
          description="Manage system-wide switches, global performance tunings, and kill switches." 
          icon={<Settings className="h-6 w-6 text-accent" />}
        />

        <div className="space-y-6">
          {msg && (
            <div className={`p-4 rounded-xl border text-sm font-bold flex items-center gap-3 ${
              msg.type === 'error' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-700 border-green-200'
            }`}>
              {msg.type === 'error' ? <AlertTriangle className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
              {msg.text}
            </div>
          )}

          <AppCard>
            <AppCardHeader className="border-b border-border py-5">
              <AppCardTitle className="text-lg flex items-center gap-2 text-rose-600">
                <ShieldAlert className="h-5 w-5" /> Emergency Kill Switches
              </AppCardTitle>
            </AppCardHeader>
            <AppCardContent className="p-6 space-y-6">
              {loading ? (
                <div className="text-gray-500 animate-pulse">Loading governance state...</div>
              ) : (
                <>
                  <div className="flex items-center justify-between p-5 border border-border rounded-xl bg-surface hover:border-rose-200 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl ${settings.disable_all_emails ? 'bg-rose-100 text-rose-600' : 'bg-accent/10 text-accent'}`}>
                        <Mail className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-foreground">Global Email Block</h3>
                        <p className="text-sm text-muted mt-1 max-w-md">
                          Immediately stops all outbound transactional emails from the system. Use during misconfiguration loops.
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={settings.disable_all_emails} onChange={() => toggleSetting('disable_all_emails')} className="sr-only peer" />
                      <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-rose-500"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-5 border border-border rounded-xl bg-surface hover:border-amber-200 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl ${settings.disable_all_realtime ? 'bg-amber-100 text-amber-600' : 'bg-accent/10 text-accent'}`}>
                        <Activity className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-foreground">Realtime Telemetry Suspend</h3>
                        <p className="text-sm text-muted mt-1 max-w-md">
                          Disconnects all websocket clients to reduce database pressure during critical workload spikes.
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={settings.disable_all_realtime} onChange={() => toggleSetting('disable_all_realtime')} className="sr-only peer" />
                      <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-amber-500"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-5 border border-border rounded-xl bg-surface hover:border-blue-200 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl ${settings.disable_digests ? 'bg-blue-100 text-blue-600' : 'bg-accent/10 text-accent'}`}>
                        <Mail className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-foreground">Suspend Background Digests</h3>
                        <p className="text-sm text-muted mt-1 max-w-md">
                          Pauses nightly/weekly email digests without stopping critical transactional emails like OTPs.
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={settings.disable_digests} onChange={() => toggleSetting('disable_digests')} className="sr-only peer" />
                      <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-500"></div>
                    </label>
                  </div>
                </>
              )}

              <div className="pt-6 border-t border-border flex justify-end">
                <AppButton onClick={handleSave} disabled={saving} className="min-w-[150px]">
                  {saving ? "Saving Changes..." : "Apply Configuration"}
                </AppButton>
              </div>
            </AppCardContent>
          </AppCard>

        </div>
      </div>
    </PageContainer>
  );
}

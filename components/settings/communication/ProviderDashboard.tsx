"use client";

import React, { useState, useEffect } from "react";
import { Server, Save, Loader2, ShieldAlert, Key } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

const PROVIDER_TYPES = ["SMTP", "Microsoft 365", "Resend", "SendGrid"];

export default function ProviderDashboard() {
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState<{type: "success" | "error", text: string} | null>(null);
  
  const supabase = createClient();

  const triggerToast = (text: string, type: "success" | "error" = "success") => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3000);
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      const { data, error } = await supabase
        .from("email_providers")
        .select("*")
        .order("priority_level", { ascending: true });
      
      if (error) throw error;
      
      // Ensure we have exactly 3 slots: Primary, Fallback 1, Fallback 2
      let slots = [
        { id: "temp_1", priority_level: 1, provider_name: "SMTP", is_active: false, config: {} },
        { id: "temp_2", priority_level: 2, provider_name: "Resend", is_active: false, config: {} },
        { id: "temp_3", priority_level: 3, provider_name: "SendGrid", is_active: false, config: {} }
      ];

      if (data && data.length > 0) {
        data.forEach(p => {
          if (p.priority_level >= 1 && p.priority_level <= 3) {
            slots[p.priority_level - 1] = p;
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
        const { error } = await supabase.from("email_providers").insert([payload]);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("email_providers").update(payload).eq("id", provider.id);
        if (error) throw error;
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

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center bg-[#0A0D14] border border-white/10 p-4 rounded-xl shadow-lg">
        <div>
          <h2 className="text-lg font-bold text-white">Routing Infrastructure</h2>
          <p className="text-xs text-gray-400">Configure Primary and Fallback SMTP/API gateways for high-availability delivery.</p>
        </div>
      </div>

      <div className="space-y-6">
        {providers.map((prov) => (
          <div key={prov.id || prov.priority_level} className="bg-[#121620] border border-white/5 rounded-xl overflow-hidden shadow-xl">
            <div className={`p-4 border-b border-white/5 flex items-center justify-between ${prov.priority_level === 1 ? 'bg-blue-500/10' : 'bg-white/5'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${prov.priority_level === 1 ? 'bg-blue-500/20' : 'bg-gray-700/50'}`}>
                  <Server className={`w-5 h-5 ${prov.priority_level === 1 ? 'text-blue-400' : 'text-gray-400'}`} />
                </div>
                <div>
                  <h3 className={`font-bold ${prov.priority_level === 1 ? 'text-blue-400' : 'text-white'}`}>
                    {prov.priority_level === 1 ? 'PRIMARY DISPATCH' : `FALLBACK LEVEL ${prov.priority_level - 1}`}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {prov.priority_level === 1 ? 'All queues will attempt delivery via this provider first.' : `Used automatically if Level ${prov.priority_level - 1} fails.`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <select 
                  value={prov.provider_name}
                  onChange={(e) => updateProviderField(prov.priority_level, "provider_name", e.target.value)}
                  className="bg-[#0A0D14] border border-white/10 rounded-md px-3 py-1.5 text-sm font-semibold text-white focus:outline-none focus:border-blue-500"
                >
                  {PROVIDER_TYPES.map(pt => <option key={pt} value={pt}>{pt}</option>)}
                </select>
                <label className="flex items-center gap-2 cursor-pointer ml-4">
                  <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${prov.is_active ? 'bg-blue-500' : 'bg-gray-600'}`}>
                    <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${prov.is_active ? 'translate-x-5' : 'translate-x-1'}`} />
                  </div>
                  <input 
                    type="checkbox" 
                    className="hidden" 
                    checked={prov.is_active} 
                    onChange={(e) => updateProviderField(prov.priority_level, "is_active", e.target.checked)}
                  />
                  <span className="text-xs font-bold text-gray-400 uppercase">Active</span>
                </label>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {(prov.provider_name === "SMTP" || prov.provider_name === "Microsoft 365") && (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">SMTP Host</label>
                    <input 
                      type="text" 
                      value={prov.config.host || ""}
                      onChange={(e) => updateProviderConfig(prov.priority_level, "host", e.target.value)}
                      className="w-full bg-[#0A0D14] border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                      placeholder="smtp.office365.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">SMTP Port</label>
                    <input 
                      type="number" 
                      value={prov.config.port || ""}
                      onChange={(e) => updateProviderConfig(prov.priority_level, "port", e.target.value)}
                      className="w-full bg-[#0A0D14] border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                      placeholder="587"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Username / Email</label>
                    <input 
                      type="text" 
                      value={prov.config.username || ""}
                      onChange={(e) => updateProviderConfig(prov.priority_level, "username", e.target.value)}
                      className="w-full bg-[#0A0D14] border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                      placeholder="noreply@enterprise.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Password / App Password</label>
                    <div className="relative">
                      <input 
                        type="password" 
                        value={prov.config.password || ""}
                        onChange={(e) => updateProviderConfig(prov.priority_level, "password", e.target.value)}
                        className="w-full bg-[#0A0D14] border border-white/10 rounded-md px-3 py-2 pl-9 text-sm text-white focus:outline-none focus:border-blue-500"
                        placeholder="••••••••"
                      />
                      <Key className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
                    </div>
                  </div>
                </>
              )}

              {(prov.provider_name === "Resend" || prov.provider_name === "SendGrid") && (
                <div className="md:col-span-2 space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">API Key</label>
                  <div className="relative">
                    <input 
                      type="password" 
                      value={prov.config.api_key || ""}
                      onChange={(e) => updateProviderConfig(prov.priority_level, "api_key", e.target.value)}
                      className="w-full bg-[#0A0D14] border border-white/10 rounded-md px-3 py-2 pl-9 text-sm text-white focus:outline-none focus:border-blue-500"
                      placeholder="re_..."
                    />
                    <Key className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
                  </div>
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3 text-amber-500" /> Keys are encrypted at rest.
                  </p>
                </div>
              )}
            </div>

            <div className="bg-[#0A0D14] px-6 py-3 border-t border-white/5 flex justify-end">
              <button 
                onClick={() => handleSave(prov)}
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white px-4 py-1.5 rounded text-sm font-bold transition-colors border border-white/10"
              >
                <Save className="w-4 h-4" /> Save Details
              </button>
            </div>
          </div>
        ))}
      </div>

      {toastMsg && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl px-4 py-3 shadow-2xl animate-in slide-in-from-bottom-5 duration-300 ${toastMsg.type === 'error' ? 'bg-rose-600' : 'bg-blue-600'} text-white`}>
          <span className="text-xs font-semibold">{toastMsg.text}</span>
        </div>
      )}
    </div>
  );
}

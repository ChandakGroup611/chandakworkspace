"use client";

import React, { useState, useEffect } from "react";
import { saveSystemEmailConfig, testEmailConnection } from "@/lib/actions/email-config";

export default function NotificationProviderForm({ initialData }: { initialData: any }) {
  const [provider, setProvider] = useState(initialData?.provider_type || "GMAIL");
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState("");
  
  const [formData, setFormData] = useState({
    smtp_host: initialData?.smtp_host || "",
    smtp_port: initialData?.smtp_port || 587,
    smtp_username: initialData?.smtp_username || "",
    smtp_password_encrypted: initialData?.smtp_password_encrypted || "",
    sender_name: initialData?.sender_name || "Enterprise Alert",
    sender_email: initialData?.sender_email || "",
    encryption_type: initialData?.encryption_type || "STARTTLS"
  });

  useEffect(() => {
    if (provider === "GMAIL") {
      setFormData(prev => ({ ...prev, smtp_host: "smtp.gmail.com", smtp_port: 587, encryption_type: "STARTTLS" }));
    } else if (provider === "OFFICE365") {
      setFormData(prev => ({ ...prev, smtp_host: "smtp.office365.com", smtp_port: 587, encryption_type: "STARTTLS" }));
    } else if (provider === "RESEND") {
      setFormData(prev => ({ ...prev, smtp_host: "smtp.resend.com", smtp_port: 465, encryption_type: "SSL/TLS", smtp_username: "resend" }));
    }
  }, [provider]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage("");
    try {
      await saveSystemEmailConfig({ ...formData, provider_type: provider });
      setMessage("Configuration saved successfully!");
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
    setLoading(false);
  };

  const handleTest = async () => {
    setTesting(true);
    setMessage("");
    const res = await testEmailConnection({ ...formData, provider_type: provider });
    setMessage(res.message);
    setTesting(false);
  };

  return (
    <div className="bg-white/5 border border-white/10 p-6 rounded-xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-700">
      <h2 className="text-xl font-bold text-white mb-2">Email Provider Setup</h2>
      <p className="text-sm text-gray-400 mb-6">Configure your primary outgoing email service. We recommend Gmail App Passwords or Resend for high deliverability.</p>
      
      <div className="flex gap-4 mb-8">
        {["GMAIL", "OFFICE365", "RESEND"].map((p) => (
          <button 
            key={p} 
            onClick={() => setProvider(p)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              provider === p ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]' : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            {p === 'OFFICE365' ? 'Office 365' : p === 'GMAIL' ? 'Gmail' : 'Resend API'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wider">SMTP Host</label>
          <input type="text" name="smtp_host" value={formData.smtp_host} onChange={handleChange} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wider">SMTP Port</label>
          <input type="number" name="smtp_port" value={formData.smtp_port} onChange={handleChange} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wider">Username / Email</label>
          <input type="text" name="smtp_username" value={formData.smtp_username} onChange={handleChange} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wider">{provider === 'RESEND' ? 'API Key' : 'App Password'}</label>
          <input type="password" name="smtp_password_encrypted" value={formData.smtp_password_encrypted} onChange={handleChange} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wider">Sender Name</label>
          <input type="text" name="sender_name" value={formData.sender_name} onChange={handleChange} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wider">Sender Email (From)</label>
          <input type="email" name="sender_email" value={formData.sender_email} onChange={handleChange} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-6">
        <span className={`text-sm ${message.includes('Error') || message.includes('Failed') ? 'text-red-400' : 'text-green-400'}`}>
          {message}
        </span>
        <div className="flex gap-3">
          <button onClick={handleTest} disabled={testing} className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50">
            {testing ? 'Testing...' : 'Test Connection'}
          </button>
          <button onClick={handleSave} disabled={loading} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)] hover:shadow-[0_0_25px_rgba(37,99,235,0.6)] disabled:opacity-50">
            {loading ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
}

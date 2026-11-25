"use client";

import React, { useState, useEffect } from "react";
import { AppButton } from '@/components/ui/AppButton';
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
    <div className="bg-surface border border-border p-6 rounded-lg shadow-sm">
      <h2 className="text-xl font-semibold text-heading mb-2">Email provider setup</h2>
      <div className="flex gap-2 mb-6">
        {["GMAIL", "OFFICE365", "RESEND"].map((p) => (
          <AppButton 
            key={p} 
            variant={provider === p ? "primary" : "secondary"}
            onClick={() => setProvider(p)}
            className="px-4 py-2 text-xs font-medium"
          >
            {p === "OFFICE365" ? "Office 365" : p === "GMAIL" ? "Gmail" : "Resend API"}
          </AppButton>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="block text-xs font-semibold text-subtle mb-1">SMTP host</label>
          <input type="text" name="smtp_host" value={formData.smtp_host} onChange={handleChange} className="w-full bg-surface border border-input rounded-md p-2 text-sm text-foreground focus:outline-none focus:border-border-active" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-subtle mb-1">SMTP port</label>
          <input type="number" name="smtp_port" value={formData.smtp_port} onChange={handleChange} className="w-full bg-surface border border-input rounded-md p-2 text-sm text-foreground focus:outline-none focus:border-border-active" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-subtle mb-1">Username / email</label>
          <input type="text" name="smtp_username" value={formData.smtp_username} onChange={handleChange} className="w-full bg-surface border border-input rounded-md p-2 text-sm text-foreground focus:outline-none focus:border-border-active" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-subtle mb-1">
            {provider === 'RESEND' ? 'API Key' : 'App Password'}
            {initialData?.hasPassword && (
              <span className="text-[11px] font-normal text-emerald-600 dark:text-emerald-400 ml-2">Stored securely</span>
            )}
          </label>
          <input 
            type="password" 
            name="smtp_password_encrypted" 
            value={formData.smtp_password_encrypted} 
            onChange={handleChange} 
            placeholder={initialData?.hasPassword ? "•••••••• (leave blank to keep current)" : "••••••••"}
            autoComplete="new-password"
            className="w-full bg-surface border border-input rounded-md p-2 text-sm text-foreground focus:outline-none focus:border-border-active" 
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-subtle mb-1">Sender name</label>
          <input type="text" name="sender_name" value={formData.sender_name} onChange={handleChange} className="w-full bg-surface border border-input rounded-md p-2 text-sm text-foreground focus:outline-none focus:border-border-active" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-subtle mb-1">Sender email (from)</label>
          <input type="email" name="sender_email" value={formData.sender_email} onChange={handleChange} className="w-full bg-surface border border-input rounded-md p-2 text-sm text-foreground focus:outline-none focus:border-border-active" />
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
        <span className={`text-sm ${message.includes('Error') || message.includes('Failed') ? 'text-danger-text' : 'text-success-text'}`}>
          {message}
        </span>
        <div className="flex gap-3">
          <AppButton variant="secondary" onClick={handleTest} disabled={testing} className="px-4 py-2 text-xs font-medium">
            {testing ? 'Testing...' : 'Test Connection'}
          </AppButton>
          <AppButton variant="primary" onClick={handleSave} disabled={loading} className="px-4 py-2 text-xs font-semibold">
            {loading ? 'Saving...' : 'Save Configuration'}
          </AppButton>
        </div>
      </div>
    </div>
  );
}

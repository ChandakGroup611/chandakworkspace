import React from "react";
import { Metadata } from "next";
import { fetchSystemEmailConfig } from "@/lib/actions/email-config";
import NotificationProviderForm from "@/components/settings/NotificationProviderForm";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: "Email Configuration | Enterprise Operations",
  description: "Configure system-wide email providers like Gmail, Office 365, or Resend API.",
};

export default async function EmailSettingsPage() {
  const dbConfig = await fetchSystemEmailConfig();
  
  const emailConfig = dbConfig || {
    provider_type: process.env.SMTP_HOST?.includes("resend") ? "RESEND" : "GMAIL",
    smtp_host: process.env.SMTP_HOST || "",
    smtp_port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
    smtp_username: process.env.SMTP_USER || "",
    smtp_password_encrypted: process.env.SMTP_PASS || "",
    sender_name: "Enterprise Alert",
    sender_email: process.env.SMTP_FROM || "",
    encryption_type: process.env.SMTP_SECURE === 'true' ? "SSL/TLS" : "STARTTLS"
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 pb-12">
      <header className="border-b border-white/5 pb-4 animate-in fade-in duration-500">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Email Provider Setup
        </h1>
        <p className="text-sm text-gray-400 mt-2 max-w-2xl">
          Control outgoing email integrations (Gmail, Office 365, Resend). Ensure these are verified before configuring your notification triggers.
        </p>
      </header>

      <div className="space-y-8">
        <NotificationProviderForm initialData={emailConfig || {}} />
      </div>
    </div>
  );
}

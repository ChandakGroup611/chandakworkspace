import React from "react";
import { Metadata } from "next";
import IdentityProviderForm from "@/components/settings/IdentityProviderForm";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Identity & Access | Enterprise Operations",
  description: "Configure Microsoft 365 Single Sign-On and enterprise authentication policies.",
};

export default function IdentitySettingsPage() {
  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 pb-12">
      <header className="border-b border-white/5 pb-4 animate-in fade-in duration-500">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Identity & Access Management
        </h1>
        <p className="text-sm text-gray-400 mt-2 max-w-2xl">
          Control enterprise authentication settings, configure Microsoft Entra ID (Azure AD), and manage Just-In-Time (JIT) provisioning rules.
        </p>
      </header>

      <div className="space-y-8">
        <IdentityProviderForm />
      </div>
    </div>
  );
}

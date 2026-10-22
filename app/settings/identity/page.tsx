import { checkServerPermission } from "@/lib/permissions";
import React from "react";
import { Metadata } from "next";
import IdentityProviderForm from "@/components/settings/IdentityProviderForm";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Identity & access | enterprise operations",
  description: "Configure Microsoft 365 single sign-on and enterprise authentication policies.",
};

export default async function IdentitySettingsPage() {
  const canAccess = await checkServerPermission("SETTINGS_IDENTITY_VIEW");
  if (!canAccess) {
    return (
      <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center p-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-semibold text-danger-text">Access denied</h2>
          <p className="text-muted">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 pb-12">
      <header className="border-b border-border pb-4 animate-in fade-in duration-500">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Identity & access management
        </h1>
        </header>

      <div className="space-y-8">
        <IdentityProviderForm />
      </div>
    </div>
  );
}

import { checkServerPermission } from "@/lib/permissions";
import React from "react";
import { Metadata } from "next";
import IdentityProviderForm from "@/components/settings/IdentityProviderForm";
import { AccessRestricted } from "@/components/errors/AccessRestricted";

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
      <AccessRestricted
        requiredRole="Super Admin"
        requiredPermission="SETTINGS_IDENTITY_VIEW"
        moduleName="Identity & Access"
      />
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 pb-12">
      <header className="border-b border-border pb-4 animate-in fade-in duration-150">
        <h1 className="text-[20px] sm:text-[22px] font-semibold tracking-[-0.01em] text-heading ">
          Identity & access management
        </h1>
        </header>

      <div className="space-y-8">
        <IdentityProviderForm />
      </div>
    </div>
  );
}

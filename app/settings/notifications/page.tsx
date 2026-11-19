import { checkServerPermission } from "@/lib/permissions";
import React from "react";
import { Metadata } from "next";
import { fetchEventTriggerConfig } from "@/lib/actions/email-config";
import EventTriggerMatrix from "@/components/settings/EventTriggerMatrix";
import { AccessRestricted } from "@/components/errors/AccessRestricted";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: "Notification triggers | enterprise operations",
  description: "Configure granular event triggers for system notifications."
};;

export default async function NotificationsSettingsPage() {
  const canAccess = await checkServerPermission("SETTINGS_NOTIFICATIONS_VIEW");
  if (!canAccess) {
    return (
      <AccessRestricted
        requiredRole="Super Admin"
        requiredPermission="SETTINGS_NOTIFICATIONS_VIEW"
        moduleName="Notification Settings"
      />
    );
  }

  const triggerConfig = await fetchEventTriggerConfig();

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 pb-12">
      <header className="border-b border-border pb-4 animate-in fade-in duration-500">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Notification triggers
        </h1>
        </header>

      <div className="space-y-8">
        <EventTriggerMatrix configList={triggerConfig || []} />
      </div>
    </div>
  );
}

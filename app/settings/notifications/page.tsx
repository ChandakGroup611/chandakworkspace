import React from "react";
import { Metadata } from "next";
import { fetchEventTriggerConfig } from "@/lib/actions/email-config";
import EventTriggerMatrix from "@/components/settings/EventTriggerMatrix";

export const metadata: Metadata = {
  title: "Notification Triggers | Enterprise Operations",
  description: "Configure granular event triggers for system notifications.",
};

export default async function NotificationsSettingsPage() {
  const triggerConfig = await fetchEventTriggerConfig();

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 pb-12">
      <header className="border-b border-white/5 pb-4 animate-in fade-in duration-500">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Notification Triggers
        </h1>
        <p className="text-sm text-gray-400 mt-2 max-w-2xl">
          Granularly define which system events trigger notifications. Disabling events here provides a performance boost by bypassing the routing engine entirely. Note: Set up your email provider first in the Email settings.
        </p>
      </header>

      <div className="space-y-8">
        <EventTriggerMatrix configList={triggerConfig || []} />
      </div>
    </div>
  );
}

import React from "react";
import { Metadata } from "next";
import NotificationRuleBuilder from "@/components/settings/communication/NotificationRuleBuilder";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Notification Rules | Enterprise Operations",
  description: "Configure dynamic event-driven notification routing constraints.",
};

export default function NotificationRulesPage() {
  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 pb-12">
      <header className="border-b border-white/5 pb-4 animate-in fade-in duration-500">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Notification Rule Engine
        </h1>
        <p className="text-sm text-gray-400 mt-2 max-w-2xl">
          Construct strict IF-THEN conditional routing mechanisms. Rules are evaluated asynchronously by the background processor when system events trigger.
        </p>
      </header>

      <NotificationRuleBuilder />
    </div>
  );
}

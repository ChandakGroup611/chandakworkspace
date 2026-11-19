"use client";

import React from "react";
import Link from "next/link";
import { Server, LayoutTemplate, Workflow, Activity, Shield } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import ChandakLoader from "@/components/ui/ChandakLoader";
import { AccessRestricted } from "@/components/errors/AccessRestricted";

const MODULES = [
  {
    title: "Email providers",
    description: "Manage Primary and Fallback SMTP/Graph providers for high-availability routing.",
    href: "/settings/communication/providers",
    icon: Server,
    color: "text-accent-soft-text",
    bg: "bg-accent-soft",
    border: "border-border-active"
  },
  {
    title: "Template designer",
    description: "Design dynamic HTML email templates with intelligent merge tag hydration.",
    href: "/settings/communication/templates",
    icon: LayoutTemplate,
    color: "text-accent-soft-text",
    bg: "bg-accent-soft",
    border: "border-border-active"
  },
  {
    title: "Notification rules",
    description: "Configure event-based routing, recipient resolution, and status triggers.",
    href: "/settings/communication/rules",
    icon: Workflow,
    color: "text-success-text",
    bg: "bg-success-soft",
    border: "border-success-border"
  },
  {
    title: "Delivery logs",
    description: "Audit trail of all communication dispatch, fallbacks, and delivery receipts.",
    href: "/settings/communication/logs",
    icon: Activity,
    color: "text-warning-text",
    bg: "bg-warning-soft",
    border: "border-warning-border"
  }
];

export default function CommunicationCenterHub() {
  const { hasPermission, loading: permsLoading } = usePermissions();

  if (permsLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <ChandakLoader size="lg" title="Loading communication settings…" subtitle="Fetching provider and template configurations" />
      </div>
    );
  }

  if (!hasPermission("SETTINGS_COMMUNICATION_VIEW")) {
    return (
      <AccessRestricted
        requiredRole="Super Admin"
        requiredPermission="SETTINGS_COMMUNICATION_VIEW"
        moduleName="Communication Settings"
      />
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 pb-12 animate-in fade-in duration-500">
      <header className="border-b border-border pb-4">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Communication center
        </h1>
        </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {MODULES.map((mod) => (
          <Link href={mod.href} key={mod.title}>
            <div className="bg-card border border-border rounded-lg p-6 shadow-sm hover:shadow-md hover:border-border-active hover:bg-accent-soft transition-all cursor-pointer group h-full">
              <div className="flex items-start space-x-4">
                <div className={`p-3 rounded-lg ${mod.bg} ${mod.border} border transition-colors group-hover:bg-opacity-20`}>
                  <mod.icon className={`w-6 h-6 ${mod.color}`} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground group-hover:text-accent-soft-text transition-colors">{mod.title}</h2>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{mod.description}</p>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

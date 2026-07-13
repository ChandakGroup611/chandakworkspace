"use client";

import React from "react";
import Link from "next/link";
import { Server, LayoutTemplate, Workflow, Activity, Shield } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";

const MODULES = [
  {
    title: "Email Providers",
    description: "Manage Primary and Fallback SMTP/Graph providers for high-availability routing.",
    href: "/settings/communication/providers",
    icon: Server,
    color: "text-accent",
    bg: "bg-accent/10",
    border: "border-accent/20"
  },
  {
    title: "Template Designer",
    description: "Design dynamic HTML email templates with intelligent merge tag hydration.",
    href: "/settings/communication/templates",
    icon: LayoutTemplate,
    color: "text-accent",
    bg: "bg-accent/10",
    border: "border-accent/20"
  },
  {
    title: "Notification Rules",
    description: "Configure event-based routing, recipient resolution, and status triggers.",
    href: "/settings/communication/rules",
    icon: Workflow,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20"
  },
  {
    title: "Delivery Logs",
    description: "Audit trail of all communication dispatch, fallbacks, and delivery receipts.",
    href: "/settings/communication/logs",
    icon: Activity,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20"
  }
];

export default function CommunicationCenterHub() {
  const { hasPermission, loading: permsLoading } = usePermissions();

  if (permsLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="animate-spin h-10 w-10 border-2 border-accent border-t-transparent rounded-full shadow-lg shadow-indigo-500/20" />
      </div>
    );
  }

  if (!hasPermission("SETTINGS_COMMUNICATION_VIEW")) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-12">
        <div className="p-4 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400">
          <Shield className="h-10 w-10" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Access Denied</h2>
        <p className="text-xs text-gray-500">You do not have capabilities to view Communication Settings.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 pb-12 animate-in fade-in duration-500">
      <header className="border-b border-white/5 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Communication Center
        </h1>
        <p className="text-sm text-gray-400 mt-2 max-w-2xl">
          Enterprise routing engine for automated notifications. All communications are processed asynchronously via background queues to ensure zero performance degradation.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {MODULES.map((mod) => (
          <Link href={mod.href} key={mod.title}>
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md hover:border-accent/50 hover:bg-accent/5 transition-all cursor-pointer group h-full">
              <div className="flex items-start space-x-4">
                <div className={`p-3 rounded-lg ${mod.bg} ${mod.border} border transition-colors group-hover:bg-opacity-20`}>
                  <mod.icon className={`w-6 h-6 ${mod.color}`} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground group-hover:text-accent transition-colors">{mod.title}</h2>
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

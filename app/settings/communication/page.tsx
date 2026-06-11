import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { Server, LayoutTemplate, Workflow, ActivityLog } from "lucide-react";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Communication Center | Enterprise Operations",
  description: "Enterprise Identity & Communication Framework hub.",
};

const MODULES = [
  {
    title: "Email Providers",
    description: "Manage Primary and Fallback SMTP/Graph providers for high-availability routing.",
    href: "/settings/communication/providers",
    icon: Server,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20"
  },
  {
    title: "Template Designer",
    description: "Design dynamic HTML email templates with intelligent merge tag hydration.",
    href: "/settings/communication/templates",
    icon: LayoutTemplate,
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20"
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
    icon: ActivityLog,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20"
  }
];

export default function CommunicationCenterHub() {
  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 pb-12 animate-in fade-in duration-500">
      <header className="border-b border-white/5 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Communication Center
        </h1>
        <p className="text-sm text-gray-400 mt-2 max-w-2xl">
          Enterprise routing engine for automated notifications. All communications are processed asynchronously via background queues to ensure zero performance degradation.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {MODULES.map((mod) => (
          <Link href={mod.href} key={mod.title}>
            <div className="bg-[#0A0D14] border border-white/10 rounded-xl p-6 shadow-xl hover:bg-[#121620] hover:border-white/20 transition-all cursor-pointer group h-full">
              <div className="flex items-start space-x-4">
                <div className={`p-3 rounded-lg ${mod.bg} ${mod.border} border transition-colors group-hover:bg-opacity-20`}>
                  <mod.icon className={`w-6 h-6 ${mod.color}`} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">{mod.title}</h2>
                  <p className="text-sm text-gray-400 mt-1 leading-relaxed">{mod.description}</p>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

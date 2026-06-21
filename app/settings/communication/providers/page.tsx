import React from "react";
import { Metadata } from "next";
import ProviderDashboard from "@/components/settings/communication/ProviderDashboard";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Email Providers | Enterprise Operations",
  description: "Configure multi-provider failover routing.",
};

export default function ProvidersPage() {
  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 pb-12">
      <header className="border-b border-white/5 pb-4 animate-in fade-in duration-500">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Provider Management
        </h1>
        <p className="text-sm text-gray-400 mt-2 max-w-2xl">
          Setup your primary outbound email gateway and designate secondary fallbacks. The async worker queue will automatically failover to secondary providers if the primary is unreachable.
        </p>
      </header>

      <ProviderDashboard />
    </div>
  );
}

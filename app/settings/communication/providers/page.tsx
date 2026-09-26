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
      <header className="border-b border-border pb-4 animate-in fade-in duration-500">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Provider Management
        </h1>
        </header>

      <ProviderDashboard />
    </div>
  );
}

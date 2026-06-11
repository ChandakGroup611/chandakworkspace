import React from "react";
import { Metadata } from "next";
import DeliveryLogs from "@/components/settings/communication/DeliveryLogs";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Delivery Logs | Enterprise Operations",
  description: "Communication center audit trail and delivery receipts.",
};

export default function DeliveryLogsPage() {
  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 pb-12">
      <header className="border-b border-white/5 pb-4 animate-in fade-in duration-500">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Delivery Logs
        </h1>
        <p className="text-sm text-gray-400 mt-2 max-w-2xl">
          Complete audit trail of all automated communication dispatch attempts, provider fallbacks, and final delivery statuses.
        </p>
      </header>

      <DeliveryLogs />
    </div>
  );
}

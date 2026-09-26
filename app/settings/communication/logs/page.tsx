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
      <header className="border-b border-border pb-4 animate-in fade-in duration-500">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Delivery Logs
        </h1>
        </header>

      <DeliveryLogs />
    </div>
  );
}

import React from "react";
import { Metadata } from "next";
import TemplateDesigner from "@/components/settings/communication/TemplateDesigner";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Email Templates | Enterprise Operations",
  description: "Design HTML email payloads with dynamic merge tags.",
};

export default function EmailTemplatesPage() {
  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 pb-12">
      <header className="border-b border-white/5 pb-4 animate-in fade-in duration-500">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Template Designer
        </h1>
        <p className="text-sm text-gray-400 mt-2 max-w-2xl">
          Construct dynamic HTML templates. The Notification Rule Engine will hydrate the merge tags `{"{{example}}"}` dynamically when a business event occurs.
        </p>
      </header>

      <TemplateDesigner />
    </div>
  );
}

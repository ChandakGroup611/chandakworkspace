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
      <header className="border-b border-border pb-4 animate-in fade-in duration-500">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Template Designer
        </h1>
        </header>

      <TemplateDesigner />
    </div>
  );
}

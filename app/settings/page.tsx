import React from "react";
import { Metadata } from "next";
import SettingsGallery from "@/components/settings/SettingsGallery";

export const metadata: Metadata = {
  title: "Design Gallery & Governance | Enterprise Operations",
  description: "Configure premium executive themes, bento grid layout density, and tactile interaction feedback layers.",
};

export default function SettingsPage() {
  return (
    <div className="w-full space-y-6 animate-in fade-in-50 duration-500">
      {/* Semantic main header wrapper ensuring heading hierarchy */}
      <header className="border-b border-white/5 pb-4">
        <h1 id="settings-page-title" className="text-xl font-bold tracking-tight">
          Design Gallery & UI Governance Engine
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Centralized visual preference repository managing multi-tier styling layers, cognitive density, and tactile response metrics.
        </p>
      </header>

      {/* Interactive client sandbox orchestration layer */}
      <SettingsGallery />
    </div>
  );
}

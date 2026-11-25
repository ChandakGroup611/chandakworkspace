"use client";

import React from "react";
import SettingsGallery from "@/components/settings/SettingsGallery";

export default function SettingsPage() {
  return (
    <div className="w-full space-y-6 animate-in fade-in-50 duration-150">
      <header className="border-b border-border pb-4">
        <h1 id="settings-page-title" className="text-xl font-semibold tracking-tight text-foreground">
          Design gallery
        </h1>
      </header>

      <SettingsGallery />
    </div>
  );
}

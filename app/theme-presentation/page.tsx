"use client";

import React from "react";
import { AppCard, AppCardHeader, AppCardTitle, AppCardContent } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { AppBadge } from "@/components/ui/AppBadge";
import { AppTable } from "@/components/ui/AppTable";

const ThemePreviewBlock = ({ themeId, themeName, description }: { themeId: string, themeName: string, description: string }) => {
  return (
    <div data-theme={themeId} className="w-full p-8 rounded-xl border border-white/10 relative overflow-hidden" style={{ minHeight: "400px" }}>
      {/* Background layer for the theme */}
      <div className="absolute inset-0 -z-10 bg-[var(--bg-primary)] opacity-50" />
      
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">{themeName}</h2>
          <p className="text-[var(--text-secondary)] mt-2 text-lg">{description}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          {/* Card Sample */}
          <AppCard className="theme-card-structural border-none">
            <AppCardHeader>
              <AppCardTitle className="text-[var(--text-primary)]">System Metrics</AppCardTitle>
            </AppCardHeader>
            <AppCardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-secondary)]">CPU Usage</span>
                <AppBadge className="theme-badge-structural">42% Stable</AppBadge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-secondary)]">Active Nodes</span>
                <AppBadge className="theme-badge-structural" variant="success">1,024 Online</AppBadge>
              </div>
              <div className="pt-4 border-t border-[var(--border-subtle)] flex gap-3">
                <AppButton className="theme-button-structural theme-btn-primary w-full">Deploy</AppButton>
                <AppButton className="theme-button-structural w-full">Configure</AppButton>
              </div>
            </AppCardContent>
          </AppCard>

          {/* Table Sample */}
          <div className="theme-table-structural overflow-hidden rounded-xl">
            <AppTable className="w-full text-left text-sm">
              <thead className="theme-table-header">
                <tr>
                  <th className="p-4 font-semibold text-[var(--text-primary)]">Project</th>
                  <th className="p-4 font-semibold text-[var(--text-primary)]">Status</th>
                  <th className="p-4 font-semibold text-[var(--text-primary)]">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr className="theme-table-row">
                  <td className="p-4 text-[var(--text-primary)] font-medium">Apollo Gateway</td>
                  <td className="p-4"><AppBadge className="theme-badge-structural">Active</AppBadge></td>
                  <td className="p-4"><AppButton size="sm" className="theme-button-structural">View</AppButton></td>
                </tr>
                <tr className="theme-table-row">
                  <td className="p-4 text-[var(--text-primary)] font-medium">Nexus Core</td>
                  <td className="p-4"><AppBadge className="theme-badge-structural" variant="warning">Pending</AppBadge></td>
                  <td className="p-4"><AppButton size="sm" className="theme-button-structural">View</AppButton></td>
                </tr>
                <tr className="theme-table-row">
                  <td className="p-4 text-[var(--text-primary)] font-medium">Shield Protocol</td>
                  <td className="p-4"><AppBadge className="theme-badge-structural" variant="danger">Offline</AppBadge></td>
                  <td className="p-4"><AppButton size="sm" className="theme-button-structural">View</AppButton></td>
                </tr>
              </tbody>
            </AppTable>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function ThemePresentationPage() {
  return (
    <div className="min-h-screen bg-[#050505] p-8 md:p-12 space-y-12">
      <div className="max-w-6xl mx-auto space-y-4 text-center pb-8">
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">3D UI Presentation Showcase</h1>
        <p className="text-gray-400 text-lg md:text-xl max-w-3xl mx-auto">
          Here are the 5 fully implemented 3D UI structural themes. You can use these live rendered samples directly in your presentation.
        </p>
      </div>

      <div className="space-y-16 max-w-7xl mx-auto">
        <ThemePreviewBlock 
          themeId="cyberpunk" 
          themeName="1. Cyberpunk" 
          description="Neon High Contrast with glowing cyan borders and holographic data tables." 
        />
        <ThemePreviewBlock 
          themeId="dark-neumorphic" 
          themeName="2. Dark Neumorphic" 
          description="Deep matte dark surfaces with soft extruded UI elements and realistic shadows." 
        />
        <ThemePreviewBlock 
          themeId="glassmorphism" 
          themeName="3. Glassmorphism" 
          description="Frosted glass translucent UI panels with heavy background blur and floating cards." 
        />
        <ThemePreviewBlock 
          themeId="industrial-control" 
          themeName="4. Industrial Control" 
          description="Utilitarian mechanical aesthetic with physical-looking panels and chunky inset buttons." 
        />
        <ThemePreviewBlock 
          themeId="light-neumorphic" 
          themeName="5. Light Neumorphic" 
          description="Pure white and soft gray surfaces, pillowy soft extruded cards, and bright highlights." 
        />
      </div>
    </div>
  );
}

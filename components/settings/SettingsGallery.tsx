"use client";

import React, { useState } from "react";
import { useTheme, FontFamilyType, FontWeightProfileType } from "@/components/theme/ThemeProvider";
import { ThemePicker } from "@/components/theme/ThemePicker";
import { FONTS } from "@/components/theme/theme-registry";
import { AppCard } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { AppBadge } from "@/components/ui/AppBadge";
import { 
  CheckCircle2, 
  Sliders, 
  Type, 
  Save 
} from "lucide-react";
import CustomFieldsConfigurator from "@/components/settings/CustomFieldsConfigurator";
import { saveDesignPreferences } from "@/lib/actions/preferences";

export default function SettingsGallery() {
  const { 
    theme, 
    density, 
    tactileFeedback, 
    fontFamily, 
    fontWeightProfile,
    baseFontSize,
    subtextFontSize,
    setFontFamily, 
    setFontWeightProfile,
    setBaseFontSize,
    setSubtextFontSize,
    accentColor,
    isLight
  } = useTheme();
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const triggerToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleSavePreferences = async () => {
    setIsSaving(true);
    const prefs = {
      theme, density, tactileFeedback, fontFamily, fontWeightProfile, accentColor, baseFontSize, subtextFontSize
    };
    const res = await saveDesignPreferences(prefs);
    setIsSaving(false);
    if (res.success) {
      triggerToast("Preferences saved to your account permanently.");
    } else {
      triggerToast(res.error || "Failed to save preferences.");
    }
  };

  const fontsList: { id: FontFamilyType; name: string; sample: string; familyValue: string }[] = [
    { id: "inter", name: "Inter (Default)", sample: "Crisp geometric precision.", familyValue: FONTS.inter.stack },
    { id: "roboto", name: "Roboto", sample: "Utilitarian highly legible.", familyValue: FONTS.roboto.stack },
    { id: "outfit", name: "Outfit", sample: "Warm modern corporate.", familyValue: FONTS.outfit.stack },
    { id: "system", name: "System UI", sample: "Native operating system typography.", familyValue: FONTS.system.stack },
  ];

  const weightProfilesList: { id: FontWeightProfileType; name: string; desc: string }[] = [
    { id: "standard", name: "Standard (Recommended)", desc: "Balanced legible emphasis (600 / 650 / 700)" },
    { id: "heavy", name: "Heavy / Thick", desc: "High contrast strong bolding (600 / 700 / 800)" },
    { id: "light", name: "Lightweight", desc: "Minimalist soft highlights (500 / 600 / 700)" }
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Toast feedback component */}
      {successToast && (
        <div id="settings-toast-alert" className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg bg-success text-white px-4 py-3 shadow-lg animate-in slide-in-from-bottom-5 duration-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span className="text-xs font-semibold">{successToast}</span>
        </div>
      )}

      {/* Row 1: The Design Gallery Theme Options & Density / Accents */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-semibold text-muted">
              1. Theme & appearance
            </h2>
          </div>
          <AppBadge variant="info">WCAG-AA compliant</AppBadge>
        </div>

        <AppCard className="p-6">
          <ThemePicker />
        </AppCard>
      </section>

      {/* Row 2: Typography Engine & Font Scale */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Type className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-semibold text-muted">
              2. Typography engine & font scale
            </h2>
          </div>
          <AppBadge variant="info">Hardware accelerated</AppBadge>
        </div>

        {/* Sub-grid A: Font Families Selection */}
        <div className="space-y-2">
          <span className="text-[0.8rem] font-semibold text-muted">A. Base typeface selector</span>
          <div className="p-4 rounded-lg border transition-all duration-200 theme-card-structural border-border">
            <label className="block text-sm font-semibold mb-2 text-foreground">System font style</label>
            <div className="relative">
              <select
                value={fontFamily}
                onChange={(e) => {
                  const selected = e.target.value as FontFamilyType;
                  setFontFamily(selected);
                  triggerToast(`Typeface active: ${fontsList.find(f => f.id === selected)?.name}`);
                }}
                className="w-full appearance-none p-3 pl-4 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-ring shadow-sm cursor-pointer text-base theme-card-structural text-foreground"
                style={{ fontFamily: fontsList.find(f => f.id === fontFamily)?.familyValue || 'inherit' }}
              >
                {fontsList.map((f) => (
                  <option 
                    key={f.id} 
                    value={f.id} 
                    style={{ fontFamily: f.familyValue, fontSize: '16px' }}
                  >
                    {f.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                <Type className="h-4 w-4 text-muted" />
              </div>
            </div>
          </div>
        </div>

        {/* Sub-grid B: Custom Font Sizer */}
        <div className="space-y-2 pt-2">
          <span className="text-[0.8rem] font-semibold text-muted">B. Custom numeric sizing</span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border transition-all duration-200 theme-card-structural border-border">
              <div className="flex items-center justify-between pb-2 border-b border-border mb-3">
                <span className="text-xs font-semibold text-foreground">Base text size</span>
                <AppBadge variant="info">{baseFontSize}px</AppBadge>
              </div>
              <div className="flex items-center gap-3">
                <input 
                  type="range" 
                  min="13" 
                  max="18" 
                  value={baseFontSize} 
                  onChange={(e) => setBaseFontSize(Number(e.target.value))}
                  className="w-full h-1 bg-elevated rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <input 
                  type="number"
                  min="13"
                  max="18"
                  value={baseFontSize}
                  onChange={(e) => setBaseFontSize(Number(e.target.value))}
                  className="w-14 px-2 py-1 text-xs rounded text-center theme-card-structural border border-border"
                />
              </div>
            </div>

            <div className="p-4 rounded-lg border transition-all duration-200 theme-card-structural border-border">
              <div className="flex items-center justify-between pb-2 border-b border-border mb-3">
                <span className="text-xs font-semibold text-foreground">Subtext / UI size</span>
                <AppBadge variant="info">{subtextFontSize}px</AppBadge>
              </div>
              <div className="flex items-center gap-3">
                <input 
                  type="range" 
                  min="10" 
                  max="18" 
                  value={subtextFontSize} 
                  onChange={(e) => setSubtextFontSize(Number(e.target.value))}
                  className="w-full h-1 bg-elevated rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <input 
                  type="number"
                  min="10"
                  max="18"
                  value={subtextFontSize}
                  onChange={(e) => setSubtextFontSize(Number(e.target.value))}
                  className="w-14 px-2 py-1 text-xs rounded text-center theme-card-structural border border-border"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sub-grid C: Font Weight Intensity */}
        <div className="space-y-2 pt-2">
          <span className="text-[0.8rem] font-semibold text-muted">C. Global font weight intensity</span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {weightProfilesList.map((w) => {
              const isSelected = fontWeightProfile === w.id;
              return (
                <button
                  type="button"
                  key={w.id}
                  onClick={() => {
                    setFontWeightProfile(w.id);
                    triggerToast(`Weight active: ${w.name}`);
                  }}
                  className={`p-4 rounded-lg border text-left transition-all duration-200 flex flex-col justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    isSelected 
                      ? "ring-2 ring-primary bg-selected border-primary theme-card-structural" 
                      : "hover:border-border-active theme-card-structural opacity-85 hover:opacity-100 border-border"
                  }`}
                >
                  <div className="space-y-1 w-full">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">{w.name}</span>
                      {isSelected && <div className="h-2 w-2 rounded-full bg-primary" />}
                    </div>
                    <p className="text-[0.8rem] text-muted">
                      {w.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Row 3: End-to-End Dynamic Custom Fields Dictionaries Map */}
      <section className="space-y-4 pt-4">
        <CustomFieldsConfigurator />
      </section>

      {/* Row 4: Persistent Saving */}
      <section className="space-y-4 pt-6 border-t border-border">
        <AppCard className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1 max-w-xl">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm tracking-tight text-foreground">
                Persistent database saving
              </h3>
              <AppBadge variant="success">Cloud sync</AppBadge>
            </div>
            <p className="text-xs text-muted">
              Save your layout, theme, colour combination, and density settings to your account. These preferences will automatically be downloaded and applied whenever you log in from any device.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <AppButton 
              id="save-preferences-btn"
              variant="primary"
              size="lg"
              onClick={handleSavePreferences}
              disabled={isSaving}
            >
              {isSaving ? (
                <span className="animate-pulse">Saving…</span>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  <span>Set as default account preferences</span>
                </>
              )}
            </AppButton>
          </div>
        </AppCard>
      </section>
    </div>
  );
}

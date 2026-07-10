"use client";

import React, { useState } from "react";
import { useTheme, ThemeType, DensityType, FontFamilyType, FontWeightProfileType, AccentColorType } from "@/components/theme/ThemeProvider";
import { AppCard, AppCardHeader, AppCardTitle, AppCardContent, AppCardDescription } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { AppBadge } from "@/components/ui/AppBadge";
import { 
  Sparkles, 
  Layers, 
  Check, 
  Grid, 
  CheckCircle2, 
  Zap, 
  Sliders, 
  Sun, 
  Moon, 
  MousePointerClick,
  Monitor,
  Maximize2,
  Minimize2,
  Type,
  Palette,
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
    setTheme,
    setDensity,
    setTactileFeedback,
    setFontFamily, 
    setFontWeightProfile,
    setBaseFontSize,
    setSubtextFontSize,
    accentColor,
    setAccentColor
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
      theme, density, tactile: tactileFeedback, fontFamily, fontWeightProfile, accentColor, baseFontSize, subtextFontSize
    };
    const res = await saveDesignPreferences(prefs);
    setIsSaving(false);
    if (res.success) {
      triggerToast("Preferences saved to your account permanently.");
    } else {
      triggerToast(res.error || "Failed to save preferences.");
    }
  };

  const themesList: {
    id: ThemeType;
    name: string;
    tagline: string;
    benefit: string;
    sentiment: string;
    icon: React.ElementType;
    previewBg: string;
    previewBorder: string;
    accentColor: string;
  }[] = [
    {
      id: "midnight-operations",
      name: "Layered Dark",
      tagline: "High-Performance Solid Graphite",
      benefit: "Optimized operational contrast",
      sentiment: "Tactical & Immersive",
      icon: Moon,
      previewBg: "bg-[#111827]",
      previewBorder: "border-[#334155]",
      accentColor: "bg-emerald-500",
    },
    {
      id: "executive-light",
      name: "Quiet Minimalist",
      tagline: "Warm Executive Whites",
      benefit: "Reduced cognitive load",
      sentiment: "Calm & Focused",
      icon: Sun,
      previewBg: "bg-[#F8F9FA] text-gray-900",
      previewBorder: "border-gray-200",
      accentColor: "bg-blue-600",
    },
    {
      id: "material-ocean",
      name: "Material Ocean",
      tagline: "Crisp Material UI Inspired",
      benefit: "Clean, high-contrast usability",
      sentiment: "Familiar & Solid",
      icon: Layers,
      previewBg: "bg-[#F0F2F5] text-[#1E293B]",
      previewBorder: "border-[#E2E8F0]",
      accentColor: "bg-[#0284C7]",
    },
    {
      id: "aurora-breeze",
      name: "Aurora Breeze",
      tagline: "Stylish Gradient Pastels",
      benefit: "Vibrant and aesthetic",
      sentiment: "Creative & Fresh",
      icon: Zap,
      previewBg: "bg-[#EEF2FF] text-[#312E81]",
      previewBorder: "border-indigo-500/30",
      accentColor: "bg-pink-500",
    },
    {
      id: "pure-elegance",
      name: "Pure Elegance",
      tagline: "Minimalist Warm Ivory",
      benefit: "Luxurious, sophisticated contrast",
      sentiment: "Premium & Refined",
      icon: Sparkles,
      previewBg: "bg-[#FCFBF9] text-[#1C1917]",
      previewBorder: "border-[#D6D3D1]",
      accentColor: "bg-[#D4AF37]",
    },
    {
      id: "pristine-white",
      name: "Pristine White",
      tagline: "Ultra Sharp Crystal Clear",
      benefit: "Maximum clarity and brightness",
      sentiment: "Pristine & Perfect",
      icon: Sun,
      previewBg: "bg-[#FFFFFF] text-[#0F172A]",
      previewBorder: "border-[#E2E8F0]",
      accentColor: "bg-[#3B82F6]",
    },
  ];

  const densitiesList: {
    id: DensityType;
    name: string;
    benefit: string;
    sentiment: string;
    icon: React.ElementType;
    gapClass: string;
  }[] = [
    {
      id: "dense",
      name: "Bento Grid",
      benefit: "Efficient data density",
      sentiment: "Organized & Intuitive",
      icon: Grid,
      gapClass: "gap-2 p-2",
    },
    {
      id: "compact",
      name: "Compact Layout",
      benefit: "Streamlined element groups",
      sentiment: "Responsive & Active",
      icon: Minimize2,
      gapClass: "gap-3 p-3",
    },
    {
      id: "comfortable",
      name: "Comfortable Rhythm",
      benefit: "Generous whitespace padding",
      sentiment: "Executive standard",
      icon: Maximize2,
      gapClass: "gap-4 p-4",
    },
  ];

  const fontsList: { id: FontFamilyType; name: string; sample: string; css: string; familyValue: string }[] = [
    { id: "inter", name: "Inter UI", sample: "Crisp geometric precision.", css: "font-sans", familyValue: "var(--font-inter), 'Inter', sans-serif" },
    { id: "outfit", name: "Outfit Premium", sample: "Warm modern corporate.", css: "font-sans tracking-wide", familyValue: "var(--font-outfit), 'Outfit', sans-serif" },
    { id: "roboto", name: "Roboto Stack", sample: "Utilitarian highly legible.", css: "font-sans", familyValue: "var(--font-roboto), 'Roboto', sans-serif" },
    { id: "arial", name: "Arial", sample: "Standard classic system font.", css: "font-sans", familyValue: "Arial, Helvetica, sans-serif" },
    { id: "times", name: "Times New Roman", sample: "Traditional serif reading.", css: "font-sans", familyValue: "'Times New Roman', Times, serif" },
    { id: "verdana", name: "Verdana", sample: "Wide readable geometry.", css: "font-sans", familyValue: "Verdana, Geneva, sans-serif" },
    { id: "courier", name: "Courier New", sample: "Monospaced technical feel.", css: "font-mono", familyValue: "'Courier New', Courier, monospace" },
    { id: "georgia", name: "Georgia", sample: "Elegant and classy serif.", css: "font-sans", familyValue: "Georgia, serif" },
    { id: "trebuchet", name: "Trebuchet MS", sample: "Sharp sans-serif style.", css: "font-sans", familyValue: "'Trebuchet MS', 'Lucida Sans Unicode', 'Lucida Grande', 'Lucida Sans', Arial, sans-serif" },
    { id: "comic-sans", name: "Comic Sans MS", sample: "Casual handwritten style.", css: "font-sans", familyValue: "'Comic Sans MS', 'Chalkboard SE', 'Comic Neue', sans-serif" },
    { id: "impact", name: "Impact", sample: "Heavy condensed titling.", css: "font-sans", familyValue: "Impact, Charcoal, sans-serif" }
  ];

  const weightProfilesList: { id: FontWeightProfileType; name: string; desc: string }[] = [
    { id: "heavy", name: "Heavy / Thick", desc: "High contrast strong bolding" },
    { id: "standard", name: "Standard", desc: "Balanced legible emphasis" },
    { id: "light", name: "Lightweight", desc: "Minimalist soft highlights" }
  ];

  const accentsList: { id: AccentColorType; name: string; hex: string }[] = [
    { id: "blue", name: "Executive Blue", hex: "bg-blue-500" },
    { id: "emerald", name: "Secure Emerald", hex: "bg-emerald-500" },
    { id: "rose", name: "Alert Rose", hex: "bg-rose-500" },
    { id: "amber", name: "Warm Amber", hex: "bg-amber-500" },
    { id: "purple", name: "Creative Purple", hex: "bg-purple-500" },
    { id: "slate", name: "Minimal Slate", hex: "bg-slate-500" }
  ];


  const isLightMode = theme === "executive-light" || theme === "material-ocean" || theme === "aurora-breeze" || theme === "pure-elegance" || theme === "pristine-white";

  return (
    <div className="space-y-8 pb-12">
      {/* Toast feedback component */}
      {successToast && (
        <div id="settings-toast-alert" className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-emerald-500 text-white px-4 py-3 shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span className="text-xs font-semibold">{successToast}</span>
        </div>
      )}

      {/* Row 1: The Design Gallery Theme Options */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className={`h-4 w-4 ${isLightMode ? "text-blue-600" : "text-blue-400"}`} />
            <h2 className={`text-sm font-semibold uppercase tracking-wider ${"text-muted"}`}>
              1. Aesthetic Palette System
            </h2>
          </div>
          <AppBadge variant="info">Zero-rerender variable mapping</AppBadge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {themesList.map((t) => {
            const IconComponent = t.icon;
            const isSelected = theme === t.id;

            return (
              <div 
                key={t.id}
                id={`theme-select-card-${t.id}`}
                onClick={() => {
                  setTheme(t.id);
                  triggerToast(`Theme applied: ${t.name}`);
                }}
                className={`group relative flex flex-col justify-between rounded-2xl border p-5 cursor-pointer transition-all duration-300 tactile-lift ${
                  isSelected 
                    ? `ring-2 ring-blue-500 shadow-xl ${isLightMode ? "bg-white border-blue-500" : "bg-white/[0.04] border-blue-500/50"}` 
                    : `${isLightMode ? "bg-white/50 border-gray-200 hover:bg-white" : "bg-white/[0.01] border-white/5 hover:border-white/10"}`
                }`}
              >
                {/* Active Check Indicator */}
                {isSelected && (
                  <div className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white shadow-md animate-in zoom-in-50">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>
                )}

                <div className="space-y-3">
                  {/* Internal preview display card reproducing specific visual tokens */}
                  <div className={`h-24 rounded-xl border ${t.previewBg} ${t.previewBorder} p-3 flex flex-col justify-between relative overflow-hidden shadow-inner`}>
                    {/* Simulated header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className={`h-2.5 w-2.5 rounded-full ${t.accentColor}`} />
                        <span className="text-xs font-bold opacity-80">{t.name}</span>
                      </div>
                      <span className="text-[0.7rem] px-1 py-0.2 rounded bg-black/10 font-mono">CSS var</span>
                    </div>

                    {/* Simulated content metrics */}
                    <div className="space-y-1">
                      <div className="h-1.5 w-3/4 rounded bg-current opacity-20" />
                      <div className="h-1.5 w-1/2 rounded bg-current opacity-10" />
                    </div>

                    {/* Bottom floating layered decoration */}
                    <div className="absolute bottom-1 right-2 flex items-center gap-1">
                      <div className="h-2 w-8 rounded bg-blue-500/20" />
                      <div className="h-2 w-2 rounded-full bg-emerald-500/40" />
                    </div>
                  </div>

                  {/* Descriptions matching exact requirement mappings */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <IconComponent className={`h-4 w-4 ${isSelected ? "text-blue-500" : "text-gray-400"}`} />
                      <h3 className={`font-bold text-sm tracking-tight ${"text-foreground"}`}>
                        {t.name}
                      </h3>
                    </div>
                    <p className={`text-[0.8rem] font-medium ${"text-muted"}`}>
                      {t.tagline}
                    </p>
                  </div>
                </div>

                {/* Benefits / Sentiment blocks */}
                <div className={`mt-4 pt-3 border-t space-y-1 text-[0.8rem] ${"border-border"}`}>
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-medium">Primary Benefit:</span>
                    <span className={`font-semibold text-right ${isLightMode ? "text-gray-800" : "text-gray-200"}`}>{t.benefit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-medium">User Sentiment:</span>
                    <span className="text-indigo-400 font-semibold text-right">{t.sentiment}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Row 1b: Color Combinations (Accents) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Palette className={`h-4 w-4 ${isLightMode ? "text-blue-600" : "text-blue-400"}`} />
            <h2 className={`text-sm font-semibold uppercase tracking-wider ${"text-muted"}`}>
              1B. Aesthetic Color Combinations
            </h2>
          </div>
          <AppBadge variant="info">Global Accent Color</AppBadge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
          {accentsList.map((a) => {
            const isSelected = accentColor === a.id;
            return (
              <div
                key={a.id}
                onClick={() => {
                  setAccentColor(a.id);
                  triggerToast(`Accent color applied: ${a.name}`);
                }}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                  isSelected 
                    ? `ring-2 ring-blue-500 ${isLightMode ? "bg-white border-blue-500 shadow-md" : "bg-white/5 border-blue-500"}`
                    : `${isLightMode ? "bg-white/50 border-gray-200 hover:bg-white" : "bg-white/[0.01] border-white/5 hover:border-white/10"}`
                }`}
              >
                <div className={`w-8 h-8 rounded-full ${a.hex} ${isSelected ? "ring-2 ring-offset-2 ring-offset-background ring-current" : ""}`} />
                <span className="text-[0.65rem] font-bold uppercase tracking-wider text-center">{a.name}</span>
              </div>
            );
          })}
          
          {/* Custom Color Picker Option */}
          <div
            className={`p-3 rounded-xl border transition-all flex flex-col items-center justify-center gap-2 ${
              accentColor.startsWith("#") 
                ? `ring-2 ring-blue-500 ${isLightMode ? "bg-white border-blue-500 shadow-md" : "bg-white/5 border-blue-500"}`
                : `${isLightMode ? "bg-white/50 border-gray-200 hover:bg-white" : "bg-white/[0.01] border-white/5 hover:border-white/10"}`
            }`}
          >
            <div 
              className={`w-8 h-8 rounded-full flex items-center justify-center relative overflow-hidden ${
                accentColor.startsWith("#") ? "ring-2 ring-offset-2 ring-offset-background ring-current" : ""
              }`} 
              style={{ backgroundColor: accentColor.startsWith("#") ? accentColor : (isLightMode ? "#e5e7eb" : "#374151") }}
            >
              <input
                type="color"
                value={accentColor.startsWith("#") ? accentColor : "#000000"}
                onChange={(e) => {
                  setAccentColor(e.target.value);
                  triggerToast("Custom color applied");
                }}
                className="absolute inset-[-10px] w-12 h-12 cursor-pointer opacity-0"
                title="Select Custom Color"
              />
              {!accentColor.startsWith("#") && <span className="absolute text-[14px] font-black mix-blend-difference text-foreground pointer-events-none">+</span>}
            </div>
            <span className="text-[0.65rem] font-bold uppercase tracking-wider text-center">Custom</span>
          </div>
        </div>
      </section>

      {/* Row 3: Typography Selection & Base Root Scale */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Type className={`h-4 w-4 ${isLightMode ? "text-blue-600" : "text-blue-400"}`} />
            <h2 className={`text-sm font-semibold uppercase tracking-wider ${"text-muted"}`}>
              3. Typography Engine & Font Scale
            </h2>
          </div>
          <AppBadge variant="info">Hardware Accelerated Binding</AppBadge>
        </div>

        {/* Sub-grid A: Font Families Selection */}
        <div className="space-y-2">
          <span className="text-[0.8rem] font-bold tracking-wider text-gray-400 uppercase">A. Base Typeface Selector</span>
          <div className={`p-4 rounded-xl border transition-all duration-200 ${isLightMode ? "bg-white/60 border-gray-200" : "bg-white/[0.01] border-white/5"}`}>
            <label className={`block text-xs font-bold mb-2 ${"text-foreground"}`}>System Font Style</label>
            <div className="relative">
              <select
                value={fontFamily}
                onChange={(e) => {
                  const selected = e.target.value as FontFamilyType;
                  setFontFamily(selected);
                  triggerToast(`Typeface active: ${fontsList.find(f => f.id === selected)?.name}`);
                }}
                className={`w-full appearance-none p-3 pl-4 pr-10 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer text-base ${
                  isLightMode ? "bg-white border-gray-300 text-gray-900" : "bg-[#0f111a] border-white/10 text-white"
                }`}
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
                <Type className={`h-4 w-4 ${isLightMode ? "text-gray-400" : "text-gray-500"}`} />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3 font-medium">Choose a font family from standard system styles or loaded web fonts, just like in a word processor.</p>
          </div>
        </div>

        {/* Sub-grid B: Custom Font Sizer */}
        <div className="space-y-2 pt-2">
          <span className="text-[0.8rem] font-bold tracking-wider text-gray-400 uppercase">B. Custom Numeric Sizing</span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div className={`p-4 rounded-xl border transition-all duration-200 ${isLightMode ? "bg-white/60 border-gray-200" : "bg-white/[0.01] border-white/5"}`}>
              <div className="flex items-center justify-between pb-2 border-b border-inherit/10 mb-3">
                <span className={`text-xs font-bold ${"text-foreground"}`}>Base Text Size</span>
                <AppBadge variant="info">{baseFontSize}px</AppBadge>
              </div>
              <div className="flex items-center gap-3">
                <input 
                  type="range" 
                  min="12" 
                  max="24" 
                  value={baseFontSize} 
                  onChange={(e) => setBaseFontSize(Number(e.target.value))}
                  className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <input 
                  type="number"
                  min="12"
                  max="24"
                  value={baseFontSize}
                  onChange={(e) => setBaseFontSize(Number(e.target.value))}
                  className={`w-14 px-2 py-1 text-xs rounded border text-center ${isLightMode ? "bg-white border-gray-300" : "bg-black/20 border-white/10"}`}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2 font-medium">Controls the root scaling of the entire application.</p>
            </div>

            <div className={`p-4 rounded-xl border transition-all duration-200 ${isLightMode ? "bg-white/60 border-gray-200" : "bg-white/[0.01] border-white/5"}`}>
              <div className="flex items-center justify-between pb-2 border-b border-inherit/10 mb-3">
                <span className={`text-xs font-bold ${"text-foreground"}`}>Subtext / UI Size</span>
                <AppBadge variant="info">{subtextFontSize}px</AppBadge>
              </div>
              <div className="flex items-center gap-3">
                <input 
                  type="range" 
                  min="10" 
                  max="18" 
                  value={subtextFontSize} 
                  onChange={(e) => setSubtextFontSize(Number(e.target.value))}
                  className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <input 
                  type="number"
                  min="10"
                  max="18"
                  value={subtextFontSize}
                  onChange={(e) => setSubtextFontSize(Number(e.target.value))}
                  className={`w-14 px-2 py-1 text-xs rounded border text-center ${isLightMode ? "bg-white border-gray-300" : "bg-black/20 border-white/10"}`}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2 font-medium">Controls the sizes of secondary labels and badges.</p>
            </div>

          </div>
        </div>

        {/* Sub-grid C: Font Weight Intensity */}
        <div className="space-y-2 pt-2">
          <span className="text-[0.8rem] font-bold tracking-wider text-gray-400 uppercase">C. Global Font Weight Intensity</span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {weightProfilesList.map((w) => {
              const isSelected = fontWeightProfile === w.id;
              return (
                <div
                  key={w.id}
                  onClick={() => {
                    setFontWeightProfile(w.id);
                    triggerToast(`Weight active: ${w.name}`);
                  }}
                  className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                    isSelected 
                      ? `ring-2 ring-blue-500 bg-blue-500/[0.04] ${isLightMode ? "border-blue-500" : "border-blue-500/40"}` 
                      : `hover:border-white/10 ${isLightMode ? "bg-white/60 border-gray-200" : "bg-white/[0.01] border-white/5"}`
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${"text-foreground"}`}>{w.name}</span>
                      {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />}
                    </div>
                    <p className={`text-[0.8rem] ${"text-muted"}`}>
                      {w.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Row 4: End-to-End Dynamic Custom Fields Dictionaries Map */}
      <section className="space-y-4 pt-4">
        <CustomFieldsConfigurator />
      </section>

      {/* Row 5: Persistent Saving */}
      <section className="space-y-4 pt-6 border-t border-white/5">
        <AppCard className={`p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${isLightMode ? "bg-white/80 border-gray-200" : ""}`}>
          <div className="space-y-1 max-w-xl">
            <div className="flex items-center gap-2">
              <h3 className={`font-bold text-sm tracking-tight ${"text-foreground"}`}>
                Persistent Database Saving
              </h3>
              <AppBadge variant="success">Cloud Sync</AppBadge>
            </div>
            <p className={`text-xs ${"text-muted"}`}>
              Save your perfect layout, theme, color combination, and density settings to your account. These preferences will automatically be downloaded and applied whenever you log in from any device.
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
                <span className="animate-pulse">Saving...</span>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  <span>Set as Default Account Preferences</span>
                </>
              )}
            </AppButton>
          </div>
        </AppCard>
      </section>
    </div>
  );
}

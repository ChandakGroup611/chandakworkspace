"use client";
/* ui-audit-allow hex-literal: the studio stage keeps fixed colours in every theme so the car stays readable, and paint colours come from the vehicle master */
/* ui-audit-allow rgb-literal: studio stage shadows and ink are fixed so they read the same in every theme */

/**
 * Picture of a vehicle, chosen automatically from the vehicle master:
 *   1. the approved picture for its make + model from the model picture library: a standardised
 *      studio cut-out, set up once per model by an admin (see VehicleModelPictures);
 *   2. when a studio-render service is configured on the server (IMAGIN_CUSTOMER_KEY), a missing
 *      model is fetched automatically and stored in the same library, so it fills in by itself;
 *   3. otherwise a clean brand tile (logo + model, "Picture pending" for admins) until an official
 *      picture is set for the model; street photos are never shown automatically.
 * Pictures of the individual car (number plates, streets) are not used here.
 * The studio stage does NOT follow the app theme (a dark car on a dark theme would vanish); it
 * adapts to the car instead: a dark car gets a bright white studio, a white/silver car a deeper
 * grey one, measured from the picture itself.
 */
import React, { useEffect, useMemo, useState } from "react";
import { VehicleBrandLogo } from "./VehicleBrandLogo";
import { colourKey, modelKey } from "@/lib/vehicle/model-key";

export type VehicleRenderInput = {
  make?: string | null;
  model?: string | null;
  variant?: string | null;
  year?: number | string | null;
  category?: string | null;
  paint_color?: string | null;
  image_url?: string | null;
  fuel_type?: string | null;
};

type Candidate = { src: string; kind: "library"; credit?: { page: string; title?: string; label?: string } };

/* ---------------- model picture library (one request per page) ---------------- */
export type LibraryItem = { key: string; make: string; model: string; variant: string | null; url: string; credit: string | null; source: "upload" | "commons" | "render" | "ai"; sourceUrl: string | null; flipped: boolean; updatedAt: string };
/** autoFill: a studio-render service is configured on the server, so missing models fill in by themselves */
export type ModelLibrary = { canManage: boolean; autoFill: boolean; items: Map<string, LibraryItem> };
let libraryPromise: Promise<ModelLibrary> | null = null;
let libraryValue: ModelLibrary | null = null;
const libraryListeners = new Set<(l: ModelLibrary) => void>();
export function loadModelLibrary(): Promise<ModelLibrary> {
  if (!libraryPromise) {
    libraryPromise = fetch("/api/vehicle/model-images", { credentials: "same-origin", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { canManage: false, autoFill: false, items: [] }))
      .catch(() => ({ canManage: false, autoFill: false, items: [] }))
      .then((j: { canManage: boolean; autoFill?: boolean; items: LibraryItem[] }) => {
        libraryValue = { canManage: !!j.canManage, autoFill: !!j.autoFill, items: new Map((j.items || []).map((i) => [i.key, i])) };
        libraryListeners.forEach((l) => l(libraryValue!));
        return libraryValue;
      });
  }
  return libraryPromise;
}
/** Re-read the library (after a picture is approved or removed); every picture on the page updates. */
export function refreshModelLibrary() { libraryPromise = null; return loadModelLibrary(); }
/* a model + colour with no picture yet: the server makes one (once, then it's stored for everyone).
   One request at a time from this page; 202 means "still making it", so ask again shortly. */
const autoFillAsked = new Set<string>();
let autoFillChain: Promise<unknown> = Promise.resolve();
export const autoFillPending = new Set<string>();
function requestAutoFill(key: string, v: VehicleRenderInput) {
  if (autoFillAsked.has(key)) return;
  autoFillAsked.add(key);
  autoFillPending.add(key);
  autoFillChain = autoFillChain.then(async () => {
    for (let attempt = 0; attempt < 30; attempt++) {
      const r = await fetch("/api/vehicle/model-image/auto", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ make: v.make, model: v.model, variant: v.variant, year: v.year, paint: v.paint_color, fuel: v.fuel_type, category: v.category }),
      }).catch(() => null);
      if (r?.status === 202) { await new Promise((ok) => setTimeout(ok, 4000)); continue; }
      if (r?.ok) await refreshModelLibrary();
      break;
    }
  }).finally(() => { autoFillPending.delete(key); libraryListeners.forEach((l) => libraryValue && l({ ...libraryValue })); });
}
export function useModelLibrary(): ModelLibrary | null {
  const [lib, setLib] = useState<ModelLibrary | null>(libraryValue);
  useEffect(() => {
    libraryListeners.add(setLib);
    loadModelLibrary().then(setLib);
    return () => { libraryListeners.delete(setLib); };
  }, []);
  return lib;
}
export type PaintTone = "dark" | "light" | null;

/* lightness of the car itself (opaque pixels of the cut-out), remembered per image */
const toneCache = new Map<string, PaintTone>();
function measureTone(img: HTMLImageElement): PaintTone {
  if (toneCache.has(img.src)) return toneCache.get(img.src)!;
  let tone: PaintTone = null;
  try {
    const c = document.createElement("canvas");
    c.width = 64; c.height = 32;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    if (ctx) {
      ctx.drawImage(img, 0, 0, 64, 32);
      const d = ctx.getImageData(0, 0, 64, 32).data;
      let sum = 0, n = 0;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 200) continue;
        sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
        n++;
      }
      if (n > 20) tone = sum / n / 255 > 0.5 ? "light" : "dark";
    }
  } catch { /* cross-origin image: keep the neutral studio */ }
  toneCache.set(img.src, tone);
  return tone;
}
/* before the picture loads, guess from the master's paint colour */
function toneFromPaint(paint?: string | null): PaintTone {
  const p = (paint || "").trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(p)) {
    const n = parseInt(p.slice(1), 16);
    const l = (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
    return l > 0.5 ? "light" : "dark";
  }
  if (/white|silver|beige|pearl|cream|yellow|gold/.test(p)) return "light";
  if (/black|grey|gray|blue|maroon|brown|green|red/.test(p)) return "dark";
  return null;
}

/** The standard picture for this vehicle's model and the car's tone. */
export function useVehicleImage(vehicle: VehicleRenderInput) {
  const lib = useModelLibrary();
  // a picture set for the whole model wins; otherwise the automatic one for this model in this colour
  const key = colourKey(vehicle.make, vehicle.model, vehicle.paint_color);
  const libItem = lib?.items.get(modelKey(vehicle.make, vehicle.model)) || lib?.items.get(key) || null;
  const [failed, setFailed] = useState(false);
  const [measured, setMeasured] = useState<PaintTone>(null);

  useEffect(() => { setFailed(false); setMeasured(null); }, [libItem?.url]);
  useEffect(() => {
    if (lib?.autoFill && !libItem && vehicle.model) requestAutoFill(key, vehicle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lib?.autoFill, !!libItem, key]);

  // every vehicle shows its model's standard picture, never a snapshot of the individual car
  const current: Candidate | undefined = libItem && !failed
    ? {
        src: libItem.url,
        kind: "library",
        credit: libItem.source === "commons" && libItem.sourceUrl ? { page: libItem.sourceUrl, title: libItem.credit || undefined, label: "Wikimedia" } : undefined,
      }
    : vehicle.image_url && !failed
    ? {
        src: vehicle.image_url,
        kind: "library",
      }
    : undefined;
  const src = current?.src || null;
  // the master's paint (when the user set one) wins; otherwise the measured lightness of the picture
  const tone = toneFromPaint(vehicle.paint_color) ?? measured;
  return {
    current,
    src,
    loading: !current && (!lib || (!libItem && !!lib?.autoFill && (autoFillPending.has(key) || !autoFillAsked.has(key)))),
    staged: true,
    /** true when no picture has been set for this model yet */
    suggested: !!lib && !libItem,
    canManage: !!lib?.canManage,
    tone,
    label: `${vehicle.make || ""} ${vehicle.model || ""}`.trim() || "Vehicle",
    onError: () => setFailed(true),
    onLoad: (e: React.SyntheticEvent<HTMLImageElement>) => setMeasured(measureTone(e.currentTarget)),
  };
}

/** Fixed studio colours (independent of the app theme), chosen by the car's tone. */
export function studioColors(tone: PaintTone) {
  if (tone === "dark") return { wall: "radial-gradient(120% 90% at 50% 18%, #ffffff 0%, #dde1e7 72%)", floor: "linear-gradient(180deg, #d3d8df, #eceef1)", shadow: "rgba(10,12,16,0.34)" };
  if (tone === "light") return { wall: "radial-gradient(120% 90% at 50% 18%, #eceff2 0%, #b4bbc5 72%)", floor: "linear-gradient(180deg, #a9b1bc, #c6cbd3)", shadow: "rgba(10,12,16,0.42)" };
  return { wall: "radial-gradient(120% 90% at 50% 18%, #f7f8fa 0%, #cfd4db 72%)", floor: "linear-gradient(180deg, #c5cbd3, #e1e4e8)", shadow: "rgba(10,12,16,0.36)" };
}
/** Ink for anything drawn on the stage; fixed like the stage, so it reads in every theme. */
export const STAGE_INK = { text: "#14161a", muted: "#4b515b", border: "rgba(20,22,26,0.16)", button: "#ffffff" };

function Credit({ credit, onStage }: { credit?: Candidate["credit"]; onStage: boolean }) {
  if (!credit) return null;
  return (
    <a
      href={credit.page}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      title={`Photo: ${credit.title || "Wikipedia"} (free licence)`}
      className="absolute bottom-1 right-1.5 z-[2] rounded px-1 text-[10.5px] leading-4 hover:underline"
      style={onStage ? { color: STAGE_INK.muted } : { background: "rgba(0,0,0,0.55)", color: "#ffffff" }}
    >
      {credit.label || "Wikipedia"}
    </a>
  );
}

function BrandMark({ vehicle, label, size, loading }: { vehicle: VehicleRenderInput; label: string; size: number; loading: boolean }) {
  return (
    <div className={`absolute inset-0 flex flex-col items-center justify-center gap-2 text-center ${loading ? "animate-pulse" : ""}`}>
      <VehicleBrandLogo brand={vehicle.make} model={vehicle.model} size={size} />
      <span className="max-w-[90%] truncate text-[13px] font-medium" style={{ color: STAGE_INK.muted }}>{loading ? "Preparing picture…" : label}</span>
    </div>
  );
}

/** Card picture: the car on a small studio stage (inventory grid, thumbnails). */
export function VehicleRender({ vehicle, className = "" }: { vehicle: VehicleRenderInput; className?: string }) {
  const { current, src, loading, staged, suggested, canManage, tone, label, onError, onLoad } = useVehicleImage(vehicle);
  const studio = studioColors(tone);
  return (
    <div className={`relative overflow-hidden ${className}`} role="img" aria-label={label} style={{ background: studio.wall, transition: "background 300ms" }}>
      <div className="absolute inset-x-0 bottom-0 h-[34%]" style={{ background: studio.floor }} aria-hidden />
      {src && staged && (
        <div className="absolute inset-x-[12%] bottom-[5%] h-[9%] rounded-[50%]" style={{ background: `radial-gradient(closest-side, ${studio.shadow}, rgba(0,0,0,0))` }} aria-hidden />
      )}
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt=""
          loading="lazy"
          onError={onError}
          onLoad={onLoad}
          className="absolute inset-0 h-full w-full object-contain" // the standard 16:9 canvas carries its own margins
        />
      ) : (
        <BrandMark vehicle={vehicle} label={label} size={44} loading={loading} />
      )}
      <Credit credit={current?.credit} onStage={staged} />
      {suggested && canManage && !loading && (
        <span className="absolute bottom-1 left-1.5 z-[2] text-[10.5px] leading-4" style={{ color: STAGE_INK.muted }} title="No official picture set for this model yet. Add one in Model pictures.">
          Picture pending
        </span>
      )}
    </div>
  );
}

/** A finished (transparent) picture on the studio stage, e.g. a preview in the picture library. */
export function StudioPicture({ src, className = "", tone = null, label = "Vehicle" }: { src: string | null; className?: string; tone?: PaintTone; label?: string }) {
  const [measured, setMeasured] = useState<PaintTone>(null);
  const studio = studioColors(tone ?? measured);
  return (
    <div className={`relative overflow-hidden ${className}`} role="img" aria-label={label} style={{ background: studio.wall, transition: "background 300ms" }}>
      <div className="absolute inset-x-0 bottom-0 h-[34%]" style={{ background: studio.floor }} aria-hidden />
      {src && <div className="absolute inset-x-[12%] bottom-[6%] h-[9%] rounded-[50%]" style={{ background: `radial-gradient(closest-side, ${studio.shadow}, rgba(0,0,0,0))` }} aria-hidden />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src && <img key={src} src={src} alt="" onLoad={(e) => setMeasured(measureTone(e.currentTarget))} className="absolute inset-0 h-full w-full object-contain" />}
    </div>
  );
}

/**
 * Large showroom stage: spotlight wall, floor, contact shadow and reflection.
 * `top` and `children` render on the stage above and below the car (use STAGE_INK colours there).
 */
export function VehicleStage({ vehicle, className = "", top, children }: { vehicle: VehicleRenderInput; className?: string; top?: React.ReactNode; children?: React.ReactNode }) {
  const { current, src, loading, staged, tone, label, onError, onLoad } = useVehicleImage(vehicle);
  const studio = studioColors(tone);
  return (
    <div className={`relative flex flex-col overflow-hidden ${className}`} style={{ background: studio.wall, color: STAGE_INK.text, transition: "background 300ms" }}>
      <div className="absolute inset-x-0 bottom-0 h-[38%]" style={{ background: studio.floor }} aria-hidden />
      {top && <div className="relative z-[1]">{top}</div>}
      <div className="relative min-h-0 flex-1" role="img" aria-label={label}>
        {src && staged && (
          <>
            <div className="absolute bottom-[22%] left-[14%] right-[14%] h-[8%] rounded-[50%]" style={{ background: `radial-gradient(closest-side, ${studio.shadow}, rgba(0,0,0,0))` }} aria-hidden />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img key={src} src={src} alt="" onError={onError} onLoad={onLoad} className="absolute bottom-[20%] left-[8%] h-[84%] w-[84%] object-contain object-bottom" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              aria-hidden
              className="pointer-events-none absolute left-[8%] top-[67%] h-[84%] w-[84%] object-contain object-bottom opacity-[0.18]"
              style={{ transform: "scaleY(-1)", WebkitMaskImage: "linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0) 30%)", maskImage: "linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0) 30%)" }}
            />
          </>
        )}
        {!src && <BrandMark vehicle={vehicle} label={label} size={72} loading={loading} />}
        <Credit credit={current?.credit} onStage={staged} />
      </div>
      {children && <div className="relative z-[1]">{children}</div>}
    </div>
  );
}

export default VehicleRender;

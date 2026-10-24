"use client";
/* ui-audit-allow hex-literal: the studio stage keeps fixed colours in every theme so the car stays readable, and paint colours come from the vehicle master */
/* ui-audit-allow rgb-literal: studio stage shadows and ink are fixed so they read the same in every theme */

/**
 * Picture of a vehicle for the inventory grid, chosen automatically from the vehicle master:
 *   1. the vehicle's own photo (image_url), if one was uploaded;
 *   2. optional: an exact studio 3D render from IMAGIN.studio, only if NEXT_PUBLIC_IMAGIN_CUSTOMER_KEY
 *      is set (paid; off by default);
 *   3. a free photo of that exact make + model from Wikipedia / Wikimedia Commons, looked up by
 *      /api/vehicle/image and credited on the card as the licence requires;
 *   4. otherwise a brand tile (logo + model), never a made-up drawing.
 * Photos are cut out of their background on the server (/api/vehicle/image/cutout) and placed on a
 * studio stage. The stage does NOT follow the app theme (a dark car on a dark theme would vanish);
 * it adapts to the car instead: a dark car gets a bright white studio, a white/silver car a deeper
 * grey one. The car's lightness is measured from the cut-out itself, so nothing needs setting.
 * If a cut-out fails, the photo itself is shown instead.
 * An image that fails to load (unknown model, no key, offline) falls back to the next option.
 */
import React, { useEffect, useMemo, useState } from "react";
import { resolveVehicleBrandKey, VehicleBrandLogo } from "./VehicleBrandLogo";

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

/* paint: the master stores a hex colour (or sometimes a name); the render service wants a paint name */
const NAMED: Record<string, string> = {
  white: "#f1f3f5", silver: "#b8bec6", grey: "#6b7280", black: "#1f2328", red: "#b91c1c", maroon: "#7f1d1d",
  blue: "#1d4ed8", green: "#15803d", brown: "#6b4226", beige: "#d6c7a8", gold: "#b08d3c", orange: "#c2410c", yellow: "#ca8a04",
};
function paintName(paint?: string | null): string | null {
  const p = (paint || "").trim().toLowerCase();
  if (!p) return null;
  const named = Object.keys(NAMED).find((k) => p.includes(k)) || (p.includes("gray") ? "grey" : null);
  if (named) return named;
  if (!/^#([0-9a-f]{6})$/.test(p)) return null;
  const n = parseInt(p.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  let best = "silver", d = Infinity;
  for (const [name, h] of Object.entries(NAMED)) {
    const m = parseInt(h.slice(1), 16);
    const dd = (r - ((m >> 16) & 255)) ** 2 + (g - ((m >> 8) & 255)) ** 2 + (b - (m & 255)) ** 2;
    if (dd < d) { d = dd; best = name; }
  }
  return best;
}

const IMAGIN_KEY = process.env.NEXT_PUBLIC_IMAGIN_CUSTOMER_KEY;
// brand keys from VehicleBrandLogo → the make names the render service uses
const MAKE_ALIAS: Record<string, string> = { mercedes: "mercedes-benz", "land rover": "land-rover", landrover: "land-rover" };

export function imaginRenderUrl(v: VehicleRenderInput, angle = "28"): string | null {
  if (!IMAGIN_KEY || !v.make || !v.model) return null;
  const cat = (v.category || "").toUpperCase();
  if (cat === "BIKE" || cat === "BUS") return null; // the service covers cars and light commercials
  const brand = resolveVehicleBrandKey(`${v.make} ${v.model}`) || v.make.toLowerCase().trim();
  const make = MAKE_ALIAS[brand] || brand.replace(/\s+/g, "-");
  const makeWord = v.make.toLowerCase().trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const model = v.model.toLowerCase().replace(new RegExp(`^${makeWord}\\s+`), "").trim();
  const words = model.split(/\s+/).filter(Boolean);
  if (!words.length) return null;
  const q = new URLSearchParams({ customer: IMAGIN_KEY, make, modelFamily: words[0], zoomtype: "fullscreen", angle });
  if (words.length > 1) q.set("modelRange", words.join("-"));
  const paint = paintName(v.paint_color);
  if (paint) q.set("paintDescription", paint);
  const y = String(v.year || "").match(/\d{4}/)?.[0];
  if (y) q.set("modelYear", y);
  const fuel = (v.fuel_type || "").toLowerCase();
  if (/electric|\bev\b|bev/.test(fuel)) q.set("powerTrain", "electric");
  else if (/hybrid/.test(fuel)) q.set("powerTrain", "hybrid");
  return `https://cdn.imagin.studio/getImage?${q.toString()}`;
}

/* one lookup per make + model for the whole page, however many cards show it */
type WikiHit = { image: string | null; page?: string; title?: string; credit?: string };
const wikiCache = new Map<string, Promise<WikiHit>>();
function lookupModelPhoto(make: string, model: string): Promise<WikiHit> {
  const key = `${make}|${model}`.toLowerCase();
  if (!wikiCache.has(key)) {
    wikiCache.set(
      key,
      fetch(`/api/vehicle/image?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}`)
        .then((r) => (r.ok ? r.json() : { image: null }))
        .catch(() => ({ image: null }))
    );
  }
  return wikiCache.get(key)!;
}

const cutoutUrl = (src: string) => `/api/vehicle/image/cutout?src=${encodeURIComponent(src)}`;
// sources the server will cut out (see lib/vehicle/cutout.ts → isAllowedSource)
const SUPABASE_HOST = (() => { try { return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "").hostname; } catch { return ""; } })();
const canCutOut = (src: string) => {
  try { const u = new URL(src); return u.protocol === "https:" && (u.hostname === "upload.wikimedia.org" || (!!SUPABASE_HOST && u.hostname === SUPABASE_HOST)); } catch { return false; }
};

/* cut-outs are fetched (not <img>) so we can wait while the server is still making one (HTTP 202),
   at most two at a time so the rest of the app's requests are never queued behind them */
const cutoutCache = new Map<string, Promise<string>>();
let cutoutActive = 0;
const cutoutWaiting: (() => void)[] = [];
async function withSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (cutoutActive >= 2) await new Promise<void>((r) => cutoutWaiting.push(r));
  cutoutActive++;
  try { return await fn(); } finally { cutoutActive--; cutoutWaiting.shift()?.(); }
}
function loadCutout(url: string): Promise<string> {
  if (!cutoutCache.has(url)) {
    const p = (async () => {
      for (let attempt = 0; attempt < 40; attempt++) {
        const res = await withSlot(() => fetch(url, { credentials: "same-origin" }));
        if (res.status === 200) return URL.createObjectURL(await res.blob());
        if (res.status !== 202) throw new Error(`cut-out ${res.status}`);
        const wait = Math.min(8, Number(res.headers.get("Retry-After")) || 3) * 1000;
        await new Promise((r) => setTimeout(r, wait));
      }
      throw new Error("cut-out timed out");
    })();
    p.catch(() => cutoutCache.delete(url)); // a later page visit may try again
    cutoutCache.set(url, p);
  }
  return cutoutCache.get(url)!;
}

type Candidate = { src: string; kind: "cutout" | "photo" | "render"; credit?: { page: string; title?: string } };
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

/** The best picture for this vehicle, its fallbacks and the car's tone. */
export function useVehicleImage(vehicle: VehicleRenderInput) {
  const [wiki, setWiki] = useState<WikiHit | null>(null);
  const [failed, setFailed] = useState(0);
  const [measured, setMeasured] = useState<PaintTone>(null);

  const base = useMemo(() => {
    const list: Candidate[] = [];
    if (vehicle.image_url) {
      if (canCutOut(vehicle.image_url)) list.push({ src: cutoutUrl(vehicle.image_url), kind: "cutout" });
      list.push({ src: vehicle.image_url, kind: "photo" });
    }
    const render = imaginRenderUrl(vehicle);
    if (render) list.push({ src: render, kind: "render" });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicle.image_url, vehicle.make, vehicle.model, vehicle.year, vehicle.paint_color, vehicle.category, vehicle.fuel_type]);

  const candidates = useMemo(() => {
    if (!wiki?.image) return base;
    const credit = wiki.page ? { page: wiki.page, title: wiki.title } : undefined;
    return [...base, { src: cutoutUrl(wiki.image), kind: "cutout" as const, credit }, { src: wiki.image, kind: "photo" as const, credit }];
  }, [base, wiki]);

  // look up the free model photo once our own sources are used up
  const needWiki = failed >= base.length;
  useEffect(() => {
    if (!needWiki || wiki || !vehicle.model) return;
    let alive = true;
    lookupModelPhoto(vehicle.make || "", vehicle.model).then((h) => { if (alive) setWiki(h); });
    return () => { alive = false; };
  }, [needWiki, wiki, vehicle.make, vehicle.model]);

  useEffect(() => { setFailed(0); setWiki(null); setMeasured(null); }, [vehicle.image_url, vehicle.make, vehicle.model]);

  const current: Candidate | undefined = candidates[failed];
  const staged = !current || current.kind !== "photo";

  // resolve a cut-out to a local object URL; until then the stage shows the brand mark
  const [resolved, setResolved] = useState<{ for: string; url: string } | null>(null);
  const cutoutSrc = current?.kind === "cutout" ? current.src : null;
  useEffect(() => {
    if (!cutoutSrc) return;
    let alive = true;
    loadCutout(cutoutSrc).then(
      (url) => { if (alive) setResolved({ for: cutoutSrc, url }); },
      () => { if (alive) setFailed((f) => f + 1); }
    );
    return () => { alive = false; };
  }, [cutoutSrc]);
  const src = !current ? null : current.kind === "cutout" ? (resolved?.for === current.src ? resolved.url : null) : current.src;
  const loading = !!current && !src;
  // the master's paint (when the user set one) wins; otherwise the measured lightness of the cut-out
  const tone = toneFromPaint(vehicle.paint_color) ?? (staged ? measured : null);
  return {
    current,
    src,
    loading,
    staged,
    tone,
    label: `${vehicle.make || ""} ${vehicle.model || ""}`.trim() || "Vehicle",
    onError: () => setFailed((f) => f + 1),
    onLoad: (e: React.SyntheticEvent<HTMLImageElement>) => { if (current && current.kind !== "photo") setMeasured(measureTone(e.currentTarget)); },
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
      Wikipedia
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
  const { current, src, loading, staged, tone, label, onError, onLoad } = useVehicleImage(vehicle);
  const studio = studioColors(tone);
  return (
    <div className={`relative overflow-hidden ${className}`} role="img" aria-label={label} style={{ background: studio.wall, transition: "background 300ms" }}>
      <div className="absolute inset-x-0 bottom-0 h-[34%]" style={{ background: studio.floor }} aria-hidden />
      {src && staged && (
        <div className="absolute inset-x-[12%] bottom-[9%] h-[9%] rounded-[50%]" style={{ background: `radial-gradient(closest-side, ${studio.shadow}, rgba(0,0,0,0))` }} aria-hidden />
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
          className={staged ? "absolute inset-x-[6%] bottom-[10%] top-[8%] h-[82%] w-[88%] object-contain object-bottom" : "absolute inset-0 h-full w-full object-cover"}
        />
      ) : (
        <BrandMark vehicle={vehicle} label={label} size={44} loading={loading} />
      )}
      <Credit credit={current?.credit} onStage={staged} />
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
            <div className="absolute bottom-[21%] left-[19%] right-[19%] h-[8%] rounded-[50%]" style={{ background: `radial-gradient(closest-side, ${studio.shadow}, rgba(0,0,0,0))` }} aria-hidden />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img key={src} src={src} alt="" onError={onError} onLoad={onLoad} className="absolute bottom-[24%] left-[15%] h-[70%] w-[70%] object-contain object-bottom" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              aria-hidden
              className="pointer-events-none absolute left-[15%] top-[76%] h-[70%] w-[70%] object-contain object-bottom opacity-[0.18]"
              style={{ transform: "scaleY(-1)", WebkitMaskImage: "linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0) 30%)", maskImage: "linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0) 30%)" }}
            />
          </>
        )}
        {src && !staged && (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={src} src={src} alt="" onError={onError} className="absolute inset-0 h-full w-full object-cover" />
        )}
        {!src && <BrandMark vehicle={vehicle} label={label} size={72} loading={loading} />}
        <Credit credit={current?.credit} onStage={staged} />
      </div>
      {children && <div className="relative z-[1]">{children}</div>}
    </div>
  );
}

export default VehicleRender;

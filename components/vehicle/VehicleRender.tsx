"use client";
/* ui-audit-allow hex-literal: paint colours come from the vehicle master and are matched to the render provider's paint names */

/**
 * Picture of a vehicle for the inventory grid, chosen automatically from the vehicle master:
 *   1. the vehicle's own photo (image_url), if one was uploaded;
 *   2. optional: an exact studio 3D render from IMAGIN.studio, only if NEXT_PUBLIC_IMAGIN_CUSTOMER_KEY
 *      is set (paid; off by default);
 *   3. a free photo of that exact make + model from Wikipedia / Wikimedia Commons, looked up by
 *      /api/vehicle/image and credited on the card as the licence requires;
 *   4. otherwise a brand tile (logo + model), never a made-up drawing.
 * Photos are cut out of their background on the server (/api/vehicle/image/cutout) and placed on
 * one standard studio backdrop, so every card looks the same; if a cut-out fails, the photo itself
 * is shown instead.
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

type Candidate = { src: string; kind: "cutout" | "photo" | "render"; credit?: { page: string; title?: string } };

/** One standard studio backdrop for every vehicle card (soft wall, floor line, contact shadow). */
function Studio({ children, shadow }: { children: React.ReactNode; shadow: boolean }) {
  return (
    <div className="absolute inset-0 bg-[linear-gradient(180deg,#fafbfc_0%,#eef0f3_66%,#e3e6ea_66.5%,#f1f3f5_100%)]">
      {shadow && <div className="absolute inset-x-[12%] bottom-[9%] h-[9%] rounded-[50%] bg-[radial-gradient(closest-side,rgba(0,0,0,0.28),rgba(0,0,0,0))]" aria-hidden />}
      {children}
    </div>
  );
}

export function VehicleRender({ vehicle, className = "" }: { vehicle: VehicleRenderInput; className?: string }) {
  const [wiki, setWiki] = useState<WikiHit | null>(null);
  const [failed, setFailed] = useState(0);

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

  useEffect(() => { setFailed(0); setWiki(null); }, [vehicle.image_url, vehicle.make, vehicle.model]);

  const current = candidates[failed];
  const label = `${vehicle.make || ""} ${vehicle.model || ""}`.trim() || "Vehicle";
  const onStage = !current || current.kind !== "photo";

  return (
    <div className={`relative overflow-hidden ${className}`} role="img" aria-label={label}>
      <Studio shadow={!!current && current.kind !== "photo"}>
        {current ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={current.src}
            src={current.src}
            alt=""
            loading="lazy"
            onError={() => setFailed((f) => f + 1)}
            className={
              current.kind === "photo"
                ? "absolute inset-0 h-full w-full object-cover"
                : "absolute inset-x-[6%] bottom-[10%] top-[8%] h-[82%] w-[88%] object-contain object-bottom drop-shadow-[0_6px_6px_rgba(0,0,0,0.12)]"
            }
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
            <VehicleBrandLogo brand={vehicle.make} model={vehicle.model} size={44} />
            <span className="max-w-[90%] truncate text-[13px] font-medium text-subtle">{label}</span>
          </div>
        )}
        {current?.credit && (
          <a
            href={current.credit.page}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            title={`Photo: ${current.credit.title || "Wikipedia"} (free licence)`}
            className={`absolute bottom-1 right-1.5 rounded px-1 text-[10.5px] leading-4 ${onStage ? "text-subtle hover:text-foreground" : "bg-[var(--overlay)] text-white/90 hover:text-white"}`}
          >
            Wikipedia
          </a>
        )}
      </Studio>
    </div>
  );
}

export default VehicleRender;

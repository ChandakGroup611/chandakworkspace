import { NextRequest, NextResponse } from "next/server";
import { getCachedUser } from "@/lib/auth/cached-user";

/**
 * Free picture of an exact make + model, looked up on Wikipedia / Wikimedia Commons.
 *   GET /api/vehicle/image?make=Audi&model=Q7
 *   → { image, page, title, credit }   or   { image: null }
 *
 * Wikipedia's car articles carry a curated photo of that model (usually a front three-quarter
 * shot). The photos are freely licensed (CC BY-SA / public domain), so the card shows a small
 * "Wikipedia" credit that links to the article — that credit is what the licence asks for.
 * Results are cached in memory for a week and in the browser for a day, so each model is looked
 * up once, not once per card.
 */
export const dynamic = "force-dynamic";

type Hit = { image: string | null; page?: string; title?: string; credit?: string };
const cache = new Map<string, { at: number; hit: Hit }>();
const TTL = 7 * 24 * 60 * 60 * 1000;
const UA = "ChandakWorkspace/1.0 (https://chandakgroup.tech; vehicle inventory thumbnails)";

const BRAND_FIX: Record<string, string> = { "maruti suzuki": "Suzuki", maruti: "Suzuki", "mercedes": "Mercedes-Benz", "vw": "Volkswagen" };

async function search(term: string, mustContain: string): Promise<Hit | null> {
  const url = new URL("https://en.wikipedia.org/w/api.php");
  url.search = new URLSearchParams({
    action: "query", format: "json", formatversion: "2", redirects: "1",
    generator: "search", gsrsearch: term, gsrlimit: "6", gsrnamespace: "0",
    prop: "pageimages", piprop: "thumbnail|name", pithumbsize: "800",
  }).toString();
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(6000) });
  if (!res.ok) return null;
  const json = await res.json();
  const pages: any[] = (json?.query?.pages || []).slice().sort((a: any, b: any) => (a.index ?? 99) - (b.index ?? 99));
  const need = mustContain.toLowerCase();
  for (const p of pages) {
    const title = String(p.title || "");
    const file = String(p.pageimage || "").toLowerCase();
    if (!p.thumbnail?.source) continue;
    if (!title.toLowerCase().includes(need)) continue;             // must be the model's own article
    if (file.endsWith(".svg") || /logo|emblem|badge/.test(file)) continue; // skip logos
    return {
      image: p.thumbnail.source,
      page: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`,
      title,
      credit: "Wikipedia",
    };
  }
  return null;
}

export async function GET(request: NextRequest) {
  const { user } = await getCachedUser();
  if (!user) return NextResponse.json({ image: null, error: "Unauthenticated" }, { status: 401 });

  const make = (request.nextUrl.searchParams.get("make") || "").trim();
  const model = (request.nextUrl.searchParams.get("model") || "").trim();
  if (!model) return NextResponse.json({ image: null });

  const key = `${make}|${model}`.toLowerCase();
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < TTL) {
    return NextResponse.json(cached.hit, { headers: { "Cache-Control": "private, max-age=86400" } });
  }

  // "Toyota Innova Crysta" → model word "innova"; drop the make if it was typed into the model too
  const brand = BRAND_FIX[make.toLowerCase()] || make;
  const cleanModel = model.replace(new RegExp(`^(${make.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}|${brand})\\s+`, "i"), "").trim();
  const modelWord = cleanModel.split(/\s+/)[0] || cleanModel;

  let hit: Hit | null = null;
  try {
    for (const term of [`${brand} ${cleanModel}`, `${brand} ${modelWord}`, `${make} ${cleanModel}`, `${cleanModel} car`]) {
      hit = await search(term, modelWord);
      if (hit) break;
    }
  } catch (e) {
    console.warn("[api/vehicle/image] lookup failed", e);
  }
  const result: Hit = hit || { image: null };
  cache.set(key, { at: Date.now(), hit: result });
  return NextResponse.json(result, { headers: { "Cache-Control": `private, max-age=${hit ? 86400 : 3600}` } });
}

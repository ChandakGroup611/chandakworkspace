import crypto from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/service_role";
import { hasPermission } from "@/lib/permissions";
import { removeBackground } from "./cutout";
import { colourKey, modelKey, paintName } from "./model-key";

export { modelKey };

/**
 * Vehicle model picture library (server side).
 *
 * One approved picture per make + model. Whatever goes in (a manufacturer press photo, a
 * Wikimedia Commons photo, a transparent PNG), what comes out is the same standard format:
 *   - background removed (skipped when the upload is already transparent),
 *   - optionally mirrored so every car faces the same way,
 *   - scaled to fit a fixed box and placed on a fixed baseline,
 *   - 1600 x 900 transparent WebP.
 * So every card, showroom stage and details page shows the cars at the same size and position.
 */

export const MODEL_IMAGE_BUCKET = "vehicle-model-images";
const TABLE = "vehicle_model_images";
export const CANVAS = { width: 1600, height: 900 };
const BOX = { width: 1400, height: 600 }; // the car is scaled to fit inside this
const BASELINE = 830;                       // y of the tyres' contact line

export type ModelImageRow = {
  id: string;
  model_key: string;
  make: string;
  model: string;
  variant: string | null;
  storage_path: string;
  source: "upload" | "commons" | "render" | "ai";
  source_url: string | null;
  credit: string | null;
  flipped: boolean;
  updated_at: string;
};

const norm = (s?: string | null) => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/* ---------------- permissions ---------------- */
/**
 * Who may approve or change library pictures: administrators and fleet managers only.
 * (Stricter than everyday vehicle editing, because one picture is used for the whole fleet.)
 */
export async function canManageModelImages(userId: string): Promise<boolean> {
  try {
    for (const code of ["SUPER_ADMIN", "ROLE_ADMIN", "ADMIN", "FLEET_ADMIN", "VEHICLES_MANAGE", "FLEET_MANAGE"]) {
      if (await hasPermission(userId, code)) return true;
    }
    const { data } = await supabaseAdmin.from("fleet_user_access").select("can_manage_vehicles, fleet_role").eq("user_id", userId).maybeSingle();
    return !!data && data.fleet_role !== "NONE" && (data.fleet_role === "FLEET_ADMIN" || data.fleet_role === "FLEET_MANAGER" || data.can_manage_vehicles === true);
  } catch {
    return false;
  }
}

/* ---------------- standardising ---------------- */
async function isAlreadyCutOut(input: Buffer): Promise<boolean> {
  const sharp = (await import("sharp")).default;
  const meta = await sharp(input).metadata();
  if (!meta.hasAlpha) return false;
  const { data, info } = await sharp(input).resize(96, 96, { fit: "inside" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let clear = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] < 16) clear++;
  return clear / (info.width * info.height) > 0.08; // a real cut-out has plenty of transparent pixels
}

/** Any picture → standard 1600 x 900 transparent WebP with the car on the baseline. */
export async function standardise(input: Buffer, opts: { flip?: boolean } = {}): Promise<{ webp: Buffer; width: number; height: number }> {
  const sharp = (await import("sharp")).default;
  const cut = (await isAlreadyCutOut(input))
    ? await sharp(input).rotate().ensureAlpha().trim({ threshold: 4 }).png().toBuffer()
    : await removeBackground(input);

  let car = sharp(cut).ensureAlpha();
  if (opts.flip) car = car.flop();
  const carBuf = await car.resize(BOX.width, BOX.height, { fit: "inside", withoutEnlargement: false }).png().toBuffer();
  const m = await sharp(carBuf).metadata();
  const w = m.width || BOX.width, h = m.height || BOX.height;
  const left = Math.round((CANVAS.width - w) / 2);
  const top = Math.max(0, BASELINE - h);

  const webp = await sharp({ create: { width: CANVAS.width, height: CANVAS.height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: carBuf, left, top }])
    .webp({ quality: 90, alphaQuality: 95, effort: 5 })
    .toBuffer();
  return { webp, width: w, height: h };
}

/* ---------------- previews (kept briefly so "Approve" doesn't re-process) ---------------- */
type Preview = { webp: Buffer; flip: boolean; source: "upload" | "commons"; sourceUrl: string | null; credit: string | null; userId: string; at: number };
const previews = new Map<string, Preview>();
const PREVIEW_TTL = 20 * 60 * 1000;
export function keepPreview(p: Omit<Preview, "at">): string {
  const now = Date.now();
  for (const [k, v] of previews) if (now - v.at > PREVIEW_TTL) previews.delete(k);
  const token = crypto.randomBytes(16).toString("hex");
  previews.set(token, { ...p, at: now });
  return token;
}
export function takePreview(token: string, userId: string): Preview | null {
  const p = previews.get(token);
  if (!p || p.userId !== userId || Date.now() - p.at > PREVIEW_TTL) return null;
  previews.delete(token);
  return p;
}

/* ---------------- storage + table ---------------- */
async function ensureBucket() {
  const { data } = await supabaseAdmin.storage.getBucket(MODEL_IMAGE_BUCKET);
  if (!data) await supabaseAdmin.storage.createBucket(MODEL_IMAGE_BUCKET, { public: false, fileSizeLimit: 5 * 1024 * 1024, allowedMimeTypes: ["image/webp"] });
}

export async function listModelImages(): Promise<ModelImageRow[]> {
  const { data, error } = await supabaseAdmin.from(TABLE).select("id, model_key, make, model, variant, storage_path, source, source_url, credit, flipped, updated_at");
  if (error) {
    // table not created yet (migration not applied): behave as an empty library
    console.warn("[vehicle-model-images] list failed:", error.message);
    return [];
  }
  return (data || []) as ModelImageRow[];
}

export async function saveModelImage(args: {
  key?: string; make: string; model: string; variant?: string | null; webp: Buffer; flip: boolean;
  source: "upload" | "commons" | "render" | "ai"; sourceUrl: string | null; credit: string | null; userId: string | null;
}): Promise<ModelImageRow> {
  const key = args.key || modelKey(args.make, args.model);
  const path = `models/${crypto.createHash("sha1").update(key).digest("hex")}-${Date.now()}.webp`;
  await ensureBucket();
  const up = await supabaseAdmin.storage.from(MODEL_IMAGE_BUCKET).upload(path, args.webp, { contentType: "image/webp", upsert: true });
  if (up.error) throw new Error(`storage upload failed: ${up.error.message}`);

  const { data: old } = await supabaseAdmin.from(TABLE).select("storage_path").eq("model_key", key).maybeSingle();
  const row = {
    model_key: key, make: args.make.trim(), model: args.model.trim(), variant: args.variant?.trim() || null,
    storage_path: path, source: args.source, source_url: args.sourceUrl, credit: args.credit, flipped: args.flip,
    width: CANVAS.width, height: CANVAS.height, updated_by: args.userId, updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabaseAdmin.from(TABLE).upsert({ ...row, created_by: args.userId }, { onConflict: "model_key" }).select("id, model_key, make, model, variant, storage_path, source, source_url, credit, flipped, updated_at").single();
  if (error) {
    await supabaseAdmin.storage.from(MODEL_IMAGE_BUCKET).remove([path]);
    throw new Error(error.message.includes("does not exist") ? "The picture library table is missing. Apply migration 20261025090000_vehicle_model_picture_library.sql." : error.message);
  }
  if (old?.storage_path && old.storage_path !== path) await supabaseAdmin.storage.from(MODEL_IMAGE_BUCKET).remove([old.storage_path]);
  return data as ModelImageRow;
}

export async function deleteModelImage(key: string): Promise<void> {
  const { data } = await supabaseAdmin.from(TABLE).select("storage_path").eq("model_key", key).maybeSingle();
  const { error } = await supabaseAdmin.from(TABLE).delete().eq("model_key", key);
  if (error) throw new Error(error.message);
  if (data?.storage_path) await supabaseAdmin.storage.from(MODEL_IMAGE_BUCKET).remove([data.storage_path]);
}

/** Picture bytes for a library entry (cached in memory; entries are immutable per storage path). */
const fileCache = new Map<string, Buffer>();
export async function readModelImage(key: string): Promise<{ data: Buffer; path: string } | null> {
  const { data: row } = await supabaseAdmin.from(TABLE).select("storage_path").eq("model_key", key).maybeSingle();
  if (!row?.storage_path) return null;
  const hit = fileCache.get(row.storage_path);
  if (hit) return { data: hit, path: row.storage_path };
  const { data, error } = await supabaseAdmin.storage.from(MODEL_IMAGE_BUCKET).download(row.storage_path);
  if (error || !data) return null;
  const buf = Buffer.from(await data.arrayBuffer());
  fileCache.set(row.storage_path, buf);
  if (fileCache.size > 200) fileCache.delete(fileCache.keys().next().value as string);
  return { data: buf, path: row.storage_path };
}

/* ---------------- candidate pictures from Wikimedia Commons ---------------- */
export type Candidate = { thumb: string; full: string; title: string; page: string; credit: string; width: number; height: number };
const UA = "ChandakWorkspace/1.0 (https://chandakgroup.tech; vehicle picture library)";
const strip = (html?: string) => (html || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

export async function findCandidates(make: string, model: string): Promise<Candidate[]> {
  const key = modelKey(make, model);
  const [brand, mdl] = key.split("|");
  const words = mdl.split(" ").filter((w) => w.length > 1 && !/^(vx|zx|lx|sx|o|at|mt|amt|cvt|dct|ivt|plus|std|base|top)$/.test(w));
  const core = words.slice(0, 3).join(" ");
  const queries = [`${brand} ${core} front`, `${brand} ${core}`, `${brand} ${words[0] || ""}`].map((q) => q.trim());
  const seen = new Set<string>();
  const out: Candidate[] = [];
  for (const q of queries) {
    if (out.length >= 18) break;
    const u = new URL("https://commons.wikimedia.org/w/api.php");
    u.search = new URLSearchParams({
      action: "query", format: "json", generator: "search", gsrnamespace: "6", gsrlimit: "30",
      gsrsearch: `${q} filetype:bitmap`, prop: "imageinfo", iiprop: "url|size|extmetadata|mime", iiurlwidth: "640", origin: "*",
    }).toString();
    try {
      const res = await fetch(u, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(12000) });
      if (!res.ok) continue;
      const json: any = await res.json();
      const pages: any[] = Object.values(json?.query?.pages || {}).sort((a: any, b: any) => (a.index || 0) - (b.index || 0));
      for (const p of pages) {
        const ii = p.imageinfo?.[0];
        if (!ii || seen.has(ii.url)) continue;
        if (!/image\/(jpeg|png|webp)/.test(ii.mime || "")) continue;
        if ((ii.width || 0) < 900 || (ii.height || 0) < 450 || ii.width < ii.height) continue; // landscape, reasonably large
        const title = String(p.title || "").replace(/^File:/, "");
        const t = norm(title);
        if (!t.includes(words[0] || "")) continue; // must be about this model
        if (/interior|dashboard|engine|badge|logo|wheel|rear light|seat|steering|detail/.test(t)) continue;
        seen.add(ii.url);
        const meta = ii.extmetadata || {};
        const credit = [strip(meta.Artist?.value), strip(meta.LicenseShortName?.value)].filter(Boolean).join(" · ") || "Wikimedia Commons";
        out.push({
          thumb: ii.thumburl || ii.url,
          // a 1600 px rendition is plenty and much smaller to fetch than the original
          full: ii.width > 1600 && ii.thumburl ? ii.thumburl.replace(/\/\d+px-/, "/1600px-") : ii.url,
          title, page: ii.descriptionurl, credit, width: ii.width, height: ii.height,
        });
      }
    } catch { /* try the next query */ }
  }
  return out.slice(0, 18);
}

export const isCommonsUrl = (src: string) => {
  try { const u = new URL(src); return u.protocol === "https:" && (u.hostname === "upload.wikimedia.org" || u.hostname === "thumb.wikimedia.org"); } catch { return false; }
};

/* ---------------- automatic pictures (no one uploads anything) ---------------- */
/**
 * A vehicle whose model + colour has no picture yet gets one made automatically, once, and stored
 * in the library like any other picture (so the next vehicle of that model and colour is instant):
 *   - IMAGIN.studio exact studio renders, if IMAGIN_CUSTOMER_KEY is set (paid); otherwise
 *   - an AI-generated studio photograph from Google Gemini, if GEMINI_API_KEY is set (best likeness,
 *     ~US$0.04 per picture); otherwise
 *   - an AI-generated studio photograph from Cloudflare Workers AI (free daily allowance), if
 *     CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_AI_TOKEN are set.
 * The result is cut out and placed on the standard canvas, so it matches every other picture.
 */
const RENDER_KEY = process.env.IMAGIN_CUSTOMER_KEY || process.env.NEXT_PUBLIC_IMAGIN_CUSTOMER_KEY || "";
// Google Gemini image model: knows real car models best, ~US$0.04 per picture, made once per model + colour
const GEMINI_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.VEHICLE_GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";
const CF_ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID || "";
const CF_TOKEN = process.env.CLOUDFLARE_AI_TOKEN || "";
// FLUX.2 [klein] follows camera directions far better than FLUX.1 schnell and makes wide pictures;
// schnell is kept as a fallback if klein isn't available on the account.
const CF_MODEL = process.env.VEHICLE_AI_IMAGE_MODEL || "@cf/black-forest-labs/flux-2-klein-4b";
const CF_FALLBACK = "@cf/black-forest-labs/flux-1-schnell";
/**
 * Style of the AI pictures. Changing it makes every AI picture regenerate in the new style the next
 * time it is shown (pictures set by an admin or from a render service are kept).
 */
export const AI_STYLE = GEMINI_KEY ? "ai-v5-gemini-side-profile" : "ai-v4-side-profile-reference";
export const isOutdatedAi = (r: Pick<ModelImageRow, "source" | "source_url">) => r.source === "ai" && r.source_url !== AI_STYLE;
export const autoFillEnabled = () => !!RENDER_KEY || !!GEMINI_KEY || (!!CF_ACCOUNT && !!CF_TOKEN);
export const autoFillProvider = () => (RENDER_KEY ? "render" : GEMINI_KEY ? "ai:gemini" : CF_ACCOUNT && CF_TOKEN ? "ai:cloudflare" : null);

const RENDER_MAKE: Record<string, string> = { mercedes: "mercedes-benz", "land rover": "land-rover", maruti: "maruti-suzuki", "rolls royce": "rolls-royce", "aston martin": "aston-martin", "alfa romeo": "alfa-romeo" };
const BRAND_NAME: Record<string, string> = { maruti: "Maruti Suzuki", mercedes: "Mercedes-Benz", bmw: "BMW", mg: "MG", "land rover": "Land Rover" };
export type AutoFillInput = { make?: string | null; model?: string | null; variant?: string | null; year?: string | number | null; paint?: string | null; fuel?: string | null; category?: string | null };

function renderUrl(v: AutoFillInput): string | null {
  if (!RENDER_KEY || !v.model) return null;
  const cat = (v.category || "").toUpperCase();
  if (cat === "BIKE" || cat === "BUS") return null;
  const [brand, mdl] = modelKey(v.make, v.model).split("|");
  const words = mdl.split(" ").filter(Boolean);
  if (!brand || !words.length) return null;
  const q = new URLSearchParams({ customer: RENDER_KEY, make: RENDER_MAKE[brand] || brand.replace(/\s+/g, "-"), modelFamily: words[0], zoomtype: "fullscreen", angle: "23", width: "1600" });
  if (words.length > 1) q.set("modelRange", words.join("-"));
  const paint = paintName(v.paint);
  if (paint) q.set("paintDescription", paint);
  const y = String(v.year || "").match(/\d{4}/)?.[0];
  if (y) q.set("modelYear", y);
  const fuel = (v.fuel || "").toLowerCase();
  if (/electric|\bev\b|bev/.test(fuel)) q.set("powerTrain", "electric");
  else if (/hybrid/.test(fuel)) q.set("powerTrain", "hybrid");
  return `https://cdn.imagin.studio/getImage?${q.toString()}`;
}

/** The prompt that makes every AI picture look like a manufacturer's side-profile studio photo. */
export function aiPrompt(v: AutoFillInput, attempt = 0, withReference = false): string {
  const [brand] = modelKey(v.make, v.model).split("|");
  const make = BRAND_NAME[brand] || (v.make || "").trim();
  const makeWord = (v.make || "").trim().toLowerCase();
  const model = (v.model || "").trim().replace(new RegExp(`^${makeWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+`, "i"), "");
  const year = String(v.year || "").match(/\d{4}/)?.[0];
  const paint = paintName(v.paint);
  const cat = (v.category || "").toUpperCase();
  const kind = cat === "BIKE" ? "motorcycle" : cat === "BUS" ? "bus" : cat === "COMMERCIAL" ? "commercial vehicle" : "car";
  const fuel = (v.fuel || "").toLowerCase();
  const ev = /electric|\bev\b|bev/.test(fuel) ? " (electric version)" : "";
  // the variant helps a model that knows the car ("Innova Crysta 2.4 VX"); skip placeholders like "Standard" or "VXi / ZXi"
  const variant = (v.variant || "").trim();
  const useVariant = variant && !/[\/|]/.test(variant) && !/^(std|standard|base|na|n\/a|-)$/i.test(variant) && variant.length <= 40;
  const name = [year, make, model, useVariant ? variant : ""].filter(Boolean).join(" ");
  // later attempts say the angle even more bluntly
  const angle = attempt === 0
    ? "pure side profile view, camera at exactly 90 degrees to the side of the vehicle, the vehicle faces left"
    : "flat side elevation like a blueprint: perfectly side-on, only one side of the vehicle visible, front bumper at the left edge of the vehicle and rear bumper at the right, both wheels on this side fully visible and the same size, no front or rear face visible";
  const subject = withReference
    ? `The reference image shows a real ${name}. Create a new side profile studio photograph of exactly this ${kind} model${ev}: identical body shape, roofline, grille, headlights, tail lights, windows, wheels and proportions as in the reference${paint ? `, painted ${paint}` : ""}`
    : `Side profile studio photograph of a ${name} ${kind}${ev}${paint ? `, ${paint} paint` : ""}`;
  return [
    subject,
    angle,
    "the entire vehicle is in the frame with clear empty space to its left, right and above, nothing cut off",
    "plain light grey seamless studio background, soft even lighting, soft shadow under the tyres",
    "accurate real-world design of this exact model, official manufacturer press photo, photorealistic, sharp, high detail",
    "no number plate text, no people, no other vehicles, no text or watermark",
  ].join(". ");
}

/* ---------------- reference photo of the real model ---------------- */
/**
 * A real photo of the exact model (the lead photo of its Wikipedia article). It is never shown; it is
 * given to the AI as a reference so the generated picture copies the real design instead of guessing.
 */
const WIKI_BRAND: Record<string, string> = { maruti: "Maruti Suzuki", mercedes: "Mercedes-Benz", vw: "Volkswagen" };
const TRIM_WORDS = /^(vx|zx|lx|sx|ex|o|at|mt|amt|cvt|dct|ivt|plus|std|standard|base|top|executive|lounge|vip|inscription|awd|4matic|d5|turbo|hybrid|ev|electric|petrol|diesel|\d+(\.\d+)?[a-z]*)$/;
const refCache = new Map<string, { at: number; url: string | null }>();
export async function findReferencePhoto(make?: string | null, model?: string | null): Promise<string | null> {
  const key = modelKey(make, model);
  const hit = refCache.get(key);
  if (hit && Date.now() - hit.at < 24 * 3600 * 1000) return hit.url;
  const [brand, mdl] = key.split("|");
  const words = mdl.split(" ").filter((w) => w && !TRIM_WORDS.test(w)).slice(0, 3);
  if (!words.length) return null;
  const brandName = WIKI_BRAND[brand] || brand;
  let url: string | null = null;
  // first the full model name; then without its last word ("Corolla Altis" → the "Toyota Corolla" article)
  const passes: string[][] = [words];
  if (words.length > 1) passes.push(words.slice(0, -1));
  for (const [term, need] of passes.flatMap((ws) => [[`${brandName} ${ws.join(" ")}`, ws], [`${ws.join(" ")} car`, ws]] as [string, string[]][])) {
    try {
      const u = new URL("https://en.wikipedia.org/w/api.php");
      u.search = new URLSearchParams({
        action: "query", format: "json", formatversion: "2", redirects: "1", generator: "search", gsrsearch: term, gsrlimit: "6",
        gsrnamespace: "0", prop: "pageimages", piprop: "thumbnail|name", pithumbsize: "800",
      }).toString();
      const res = await fetch(u, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const json: any = await res.json();
      const pages: any[] = (json?.query?.pages || []).slice().sort((a: any, b: any) => (a.index ?? 99) - (b.index ?? 99));
      for (const p of pages) {
        const title = norm(p.title);
        const file = String(p.pageimage || "").toLowerCase();
        if (!p.thumbnail?.source || file.endsWith(".svg") || /logo|emblem|badge|interior|concept/.test(file)) continue;
        if (!need.every((w) => title.split(" ").includes(w))) continue; // the model's own article (e.g. not "Urban Cruiser" for "Urban Cruiser Hyryder")
        if (/concept/.test(title)) continue;
        url = p.thumbnail.source; break;
      }
      if (url) break;
    } catch { /* try the next search */ }
  }
  refCache.set(key, { at: Date.now(), url });
  return url;
}

async function referenceImage(make?: string | null, model?: string | null): Promise<Blob | null> {
  const url = await findReferencePhoto(make, model);
  if (!url) return null;
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    const sharp = (await import("sharp")).default;
    // the model accepts reference images under 512 x 512
    const jpg = await sharp(Buffer.from(await res.arrayBuffer())).rotate().resize(508, 508, { fit: "inside" }).jpeg({ quality: 90 }).toBuffer();
    return new Blob([new Uint8Array(jpg)], { type: "image/jpeg" });
  } catch {
    return null;
  }
}

/** Width : height of a correct side view (front and corner views are much narrower). */
function minSideAspect(category?: string | null) {
  const c = (category || "").toUpperCase();
  return c === "BIKE" ? 1.35 : c === "BUS" ? 2.0 : c === "COMMERCIAL" ? 1.7 : 1.95;
}

async function callCloudflare(model: string, prompt: string, reference?: Blob | null): Promise<Buffer | null> {
  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/ai/run/${model}`;
  let res: Response;
  if (model.includes("flux-2")) {
    // FLUX.2 models take multipart form data; a wide frame suits a side view
    const form = new FormData();
    form.append("prompt", prompt);
    form.append("width", "1536");
    form.append("height", "768");
    form.append("seed", String(Math.floor(Math.random() * 2_000_000_000)));
    if (reference) form.append("input_image_0", reference, "reference.jpg");
    res = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${CF_TOKEN}` }, body: form, signal: AbortSignal.timeout(60000) });
  } else {
    res = await fetch(url, {
      method: "POST", headers: { Authorization: `Bearer ${CF_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, steps: 8 }), signal: AbortSignal.timeout(45000),
    });
  }
  if (!res.ok) throw new Error(`AI picture service (${model.split("/").pop()}): HTTP ${res.status} ${(await res.text().catch(() => "")).slice(0, 200)}`);
  const type = res.headers.get("content-type") || "";
  if (type.startsWith("image/")) return Buffer.from(await res.arrayBuffer());
  const j: any = await res.json();
  const b64 = j?.result?.image || j?.image;
  return b64 ? Buffer.from(b64, "base64") : null;
}

/* ---------------- hard monthly limit for Gemini (stay inside the free credit) ---------------- */
/**
 * Every Gemini request is counted in vehicle_ai_usage. At the limit (default 100 a month, about
 * US$4, well inside a US$10 monthly credit) Gemini is not called again until next month and the
 * free Cloudflare model is used instead. If the counter can't be read or written, Gemini is not
 * used at all, so a fault can never lead to spending.
 */
const GEMINI_MONTHLY_LIMIT = Math.max(0, Number(process.env.GEMINI_MONTHLY_LIMIT ?? 100) || 0);
const monthKey = () => new Date().toISOString().slice(0, 7);
export const geminiUsage: { month: string; calls: number; limit: number; blocked: string | null } = { month: monthKey(), calls: 0, limit: GEMINI_MONTHLY_LIMIT, blocked: null };
/** Reserve one Gemini request; false = limit reached or counter unavailable (then don't call Gemini). */
async function reserveGeminiCall(): Promise<boolean> {
  const month = monthKey();
  try {
    const { data, error } = await supabaseAdmin.from("vehicle_ai_usage").select("gemini_calls").eq("month", month).maybeSingle();
    if (error) throw new Error(error.message);
    const used = Number(data?.gemini_calls || 0);
    Object.assign(geminiUsage, { month, calls: used });
    if (used >= GEMINI_MONTHLY_LIMIT) { geminiUsage.blocked = `monthly limit of ${GEMINI_MONTHLY_LIMIT} reached`; return false; }
    const up = await supabaseAdmin.from("vehicle_ai_usage").upsert({ month, gemini_calls: used + 1, updated_at: new Date().toISOString() }, { onConflict: "month" });
    if (up.error) throw new Error(up.error.message);
    Object.assign(geminiUsage, { calls: used + 1, blocked: null });
    return true;
  } catch (e) {
    geminiUsage.blocked = `usage counter unavailable (${e instanceof Error ? e.message.slice(0, 120) : e}); apply migration 20261025120000_vehicle_ai_usage_limit.sql`;
    return false;
  }
}

/** Google Gemini image generation (REST, generateContent with an IMAGE response). */
async function callGemini(prompt: string): Promise<Buffer | null> {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": GEMINI_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "16:9" } },
    }),
    signal: AbortSignal.timeout(90000),
  });
  if (!res.ok) throw new Error(`Gemini picture service: HTTP ${res.status} ${(await res.text().catch(() => "")).slice(0, 240)}`);
  const j: any = await res.json();
  for (const part of j?.candidates?.[0]?.content?.parts || []) {
    const data = part.inlineData?.data || part.inline_data?.data;
    if (data) return Buffer.from(data, "base64");
  }
  const why = j?.candidates?.[0]?.finishReason || j?.promptFeedback?.blockReason || "no picture returned";
  throw new Error(`Gemini picture service: ${why}`);
}

let useFallbackModel = false;
async function generateAi(v: AutoFillInput, attempt: number, reference: Blob | null): Promise<Buffer | null> {
  // Gemini already knows real models well, so it works from the description alone.
  // Only while inside the monthly limit; otherwise the free Cloudflare model (below) is used.
  if (GEMINI_KEY && (await reserveGeminiCall())) return callGemini(aiPrompt(v, attempt, false));
  if (!CF_ACCOUNT || !CF_TOKEN) return null;
  if (!useFallbackModel) {
    try { return await callCloudflare(CF_MODEL, aiPrompt(v, attempt, !!reference), reference); }
    catch (e) {
      // model not available on this account / plan: use the older one from now on
      if (/HTTP (400|403|404)/.test(String(e)) && CF_MODEL !== CF_FALLBACK) { useFallbackModel = true; console.warn("[vehicle-ai] falling back to", CF_FALLBACK, String(e).slice(0, 200)); }
      else throw e;
    }
  }
  return callCloudflare(CF_FALLBACK, aiPrompt(v, attempt, false)); // the older model takes no reference
}

/**
 * Make an AI picture and check it really is a whole side view: cut the vehicle out, then require
 * a side-view shape (wide) and that it doesn't touch the edge of the frame (cut off). Up to four
 * tries; the best one is kept.
 */
async function makeCheckedAiPicture(v: AutoFillInput): Promise<Buffer | null> {
  const sharp = (await import("sharp")).default;
  let best: { cut: Buffer; score: number } | null = null;
  const need = minSideAspect(v.category);
  const reference = CF_ACCOUNT && CF_TOKEN ? await referenceImage(v.make, v.model) : null;
  console.info(`[vehicle-ai] ${v.make} ${v.model}: ${GEMINI_KEY ? `Gemini (${geminiUsage.calls}/${GEMINI_MONTHLY_LIMIT} this month), Cloudflare as backup` : reference ? "Cloudflare with a reference photo" : "Cloudflare, text only"}`);
  // Gemini gets the angle right far more often, so it gets fewer tries (each one counts toward the limit)
  const tries = GEMINI_KEY ? 2 : 4;
  for (let attempt = 0; attempt < tries; attempt++) {
    const raw = await generateAi(v, attempt, reference);
    if (!raw) continue;
    const meta = await sharp(raw).metadata();
    const W = meta.width || 1, H = meta.height || 1;
    const scale = Math.min(1, 1024 / Math.max(W, H));
    const workW = Math.round(W * scale), workH = Math.round(H * scale);
    const cut = await removeBackground(raw);
    const cm = await sharp(cut).metadata();
    const cw = cm.width || 0, ch = cm.height || 1;
    const aspect = cw / ch;
    const cutOff = cw >= workW - 6 || ch >= workH - 6;  // touches the frame on both sides / top and bottom
    const tooSmall = cw < workW * 0.35;                  // only a fragment survived
    const score = (cutOff || tooSmall ? 0 : 1) * Math.min(aspect / need, 1.2);
    console.info(`[vehicle-ai] ${v.make} ${v.model} attempt ${attempt + 1}: ${cw}x${ch} aspect ${aspect.toFixed(2)} (need ${need})${cutOff ? " cut off" : ""}${tooSmall ? " fragment" : ""}`);
    if (!best || score > best.score) best = { cut, score };
    if (score >= 1) break; // a proper side view
  }
  if (!best || best.score < 0.85) return null;
  // every car faces left: in a side view the roof sits toward the rear, so if the upper body leans
  // to the left the front is on the right and the picture is mirrored
  return (await facesRight(best.cut)) ? await sharp(best.cut).flop().webp({ quality: 88, alphaQuality: 92 }).toBuffer() : best.cut;
}

async function facesRight(cut: Buffer): Promise<boolean> {
  const sharp = (await import("sharp")).default;
  const W = 200, H = 100;
  const { data } = await sharp(cut).resize(W, H, { fit: "fill" }).ensureAlpha().extractChannel(3).raw().toBuffer({ resolveWithObject: true });
  let sx = 0, n = 0;
  for (let y = 0; y < H * 0.4; y++) for (let x = 0; x < W; x++) if (data[y * W + x] > 128) { sx += x; n++; }
  if (n < 50) return false;
  const offset = sx / n / W - 0.5; // > 0: upper body toward the right → front on the left (good)
  return offset < -0.03;
}

const autoInflight = new Map<string, Promise<ModelImageRow | null>>();
const autoMissed = new Map<string, number>(); // don't hammer a provider that failed for this model: retry after 10 minutes
let autoQueue: Promise<unknown> = Promise.resolve(); // one picture at a time
export const autoStatus: { provider: string | null; made: number; lastError: string | null; lastErrorAt: string | null } = { provider: null, made: 0, lastError: null, lastErrorAt: null };

export function autoFillModel(v: AutoFillInput): Promise<ModelImageRow | null> {
  const key = colourKey(v.make, v.model, v.paint);
  if (!v.model || !autoFillEnabled()) return Promise.resolve(null);
  const missedAt = autoMissed.get(key);
  if (missedAt && Date.now() - missedAt < 10 * 60 * 1000) return Promise.resolve(null);
  const running = autoInflight.get(key);
  if (running) return running;
  const job = autoQueue.then(async () => {
    autoStatus.provider = autoFillProvider();
    const { data: existing } = await supabaseAdmin.from(TABLE).select("id, model_key, make, model, variant, storage_path, source, source_url, credit, flipped, updated_at").eq("model_key", key).maybeSingle();
    if (existing && !isOutdatedAi(existing as ModelImageRow)) return existing as ModelImageRow;
    let picture: Buffer | null = null;
    let source: "render" | "ai" = "render";
    const url = renderUrl(v);
    if (url) {
      const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20000) });
      if (res.ok && (res.headers.get("content-type") || "").startsWith("image/")) {
        const b = Buffer.from(await res.arrayBuffer());
        if (b.length > 5000) picture = b;
      }
    }
    if (!picture && (GEMINI_KEY || (CF_ACCOUNT && CF_TOKEN))) { picture = await makeCheckedAiPicture(v); source = "ai"; }
    if (!picture) { autoMissed.set(key, Date.now()); return null; }
    const { webp } = await standardise(picture, { flip: false });
    const row = await saveModelImage({
      key, make: String(v.make || ""), model: String(v.model), variant: paintName(v.paint), webp, flip: false, source,
      sourceUrl: source === "ai" ? AI_STYLE : null, credit: source === "ai" ? "AI-generated picture" : "Studio render (IMAGIN.studio)", userId: null,
    });
    autoStatus.made++;
    return row;
  }).catch((e) => {
    autoMissed.set(key, Date.now());
    autoStatus.lastError = e instanceof Error ? e.message : String(e);
    autoStatus.lastErrorAt = new Date().toISOString();
    throw e;
  }).finally(() => autoInflight.delete(key));
  autoQueue = job.catch(() => undefined);
  autoInflight.set(key, job);
  return job;
}

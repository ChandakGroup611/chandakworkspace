import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import os from "node:os";
import { cleanMask } from "./model-key";

/**
 * Background removal for vehicle photos (server side, runs once per photo, result cached on disk).
 *
 * Model: "silueta" from the open-source rembg project — a compact U²-Net (Apache-2.0 / MIT),
 * ~43 MB, downloaded on first use. It runs on onnxruntime-web (pure WebAssembly), so the server
 * needs no native ONNX install. A photo takes ~1–5 s the first time and is served from the cache
 * after that, so each make/model is processed once for the whole company.
 *
 * Env (all optional):
 *   VEHICLE_CUTOUT_MODEL       silueta (default) | u2netp (4 MB, lighter, softer edges)
 *   VEHICLE_CUTOUT_MODEL_URL   where to download the .onnx file from
 *   VEHICLE_IMAGE_CACHE_DIR    cache folder (default: <app>/.cache/vehicle-images)
 */
const MODEL = process.env.VEHICLE_CUTOUT_MODEL || "silueta";
const MODEL_URLS = [
  process.env.VEHICLE_CUTOUT_MODEL_URL,
  `https://github.com/danielgatis/rembg/releases/download/v0.0.0/${MODEL}.onnx`,
].filter(Boolean) as string[];
const CACHE_DIRS = [
  process.env.VEHICLE_IMAGE_CACHE_DIR,
  path.join(process.cwd(), ".cache", "vehicle-images"),
  path.join(os.tmpdir(), "chandak-vehicle-images"),
].filter(Boolean) as string[];
const SIZE = 320; // silueta / u2netp input
const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];
const MAX_BYTES = 10 * 1024 * 1024;
const UA = "ChandakWorkspace/1.0 (https://chandakgroup.tech; vehicle inventory thumbnails)";

let sessionPromise: Promise<any> | null = null;
let queue: Promise<unknown> = Promise.resolve(); // one image at a time keeps memory flat
const inflight = new Map<string, Promise<Buffer>>();
const memory = new Map<string, Buffer>(); // small in-memory cache, in case no folder is writable
const MEMORY_MAX = 300;
/** last thing that went wrong, for /api/vehicle/image/cutout?debug=1 */
export const cutoutStatus: { cacheDir: string | null; modelReady: boolean; lastError: string | null; lastErrorAt: string | null } = {
  cacheDir: null, modelReady: false, lastError: null, lastErrorAt: null,
};
function noteError(e: unknown) {
  cutoutStatus.lastError = e instanceof Error ? e.message : String(e);
  cutoutStatus.lastErrorAt = new Date().toISOString();
}

/** first cache folder we can actually write to (the app folder may be read-only on some hosts) */
let cacheDirPromise: Promise<string | null> | null = null;
export function cacheDir(): Promise<string | null> {
  if (!cacheDirPromise) {
    cacheDirPromise = (async () => {
      for (const d of CACHE_DIRS) {
        try {
          await fs.mkdir(path.join(d, "models"), { recursive: true });
          const probe = path.join(d, `.probe-${process.pid}`);
          await fs.writeFile(probe, "ok");
          await fs.unlink(probe).catch(() => undefined);
          cutoutStatus.cacheDir = d;
          return d;
        } catch { /* try the next one */ }
      }
      return null;
    })();
  }
  return cacheDirPromise;
}

async function loadSession() {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      // @ts-ignore - optional dynamic wasm runtime
      const modName = "onnxruntime-web";
      const ort: any = await import(/* webpackIgnore: true */ modName);
      ort.env.wasm.numThreads = 1;
      const dir = await cacheDir();
      const modelPath = dir ? path.join(dir, "models", `${MODEL}.onnx`) : null;
      let bytes: Buffer | null = null;
      if (modelPath) { try { bytes = await fs.readFile(modelPath); } catch { /* not downloaded yet */ } }
      if (!bytes || bytes.length < 1_000_000) {
        const errors: string[] = [];
        for (const url of MODEL_URLS) {
          try {
            const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow", signal: AbortSignal.timeout(120000) });
            if (!res.ok) { errors.push(`${new URL(url).hostname}: HTTP ${res.status}`); continue; }
            bytes = Buffer.from(await res.arrayBuffer());
            break;
          } catch (e) { errors.push(`${new URL(url).hostname}: ${e instanceof Error ? e.message : e}`); }
        }
        if (!bytes) throw new Error(`model download failed (${errors.join("; ")})`);
        if (modelPath) await fs.writeFile(modelPath, bytes).catch(() => undefined);
      }
      const session = await ort.InferenceSession.create(new Uint8Array(bytes));
      cutoutStatus.modelReady = true;
      return { ort, session };
    })().catch((e) => { sessionPromise = null; noteError(e); throw e; });
  }
  return sessionPromise;
}

/** Photo → transparent, trimmed WebP of just the vehicle. */
export async function removeBackground(input: Buffer): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  const { ort, session } = await loadSession();
  // work at ≤1024 px: plenty for a card, keeps memory and time low
  const base = sharp(input).rotate().removeAlpha().resize(1024, 1024, { fit: "inside", withoutEnlargement: true });
  const { data: rgb, info } = await base.clone().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;

  const small = await sharp(rgb, { raw: { width, height, channels: 3 } }).resize(SIZE, SIZE, { fit: "fill" }).raw().toBuffer();
  const plane = SIZE * SIZE;
  const t = new Float32Array(3 * plane);
  let max = 1;
  for (let i = 0; i < small.length; i++) if (small[i] > max) max = small[i];
  for (let i = 0; i < plane; i++) for (let c = 0; c < 3; c++) t[c * plane + i] = (small[i * 3 + c] / max - MEAN[c]) / STD[c];

  const out = await session.run({ [session.inputNames[0]]: new ort.Tensor("float32", t, [1, 3, SIZE, SIZE]) });
  const m: Float32Array = out[session.outputNames[0]].data;
  let lo = Infinity, hi = -Infinity;
  for (const v of m) { if (v < lo) lo = v; if (v > hi) hi = v; }
  const mask = Buffer.alloc(plane);
  for (let i = 0; i < plane; i++) mask[i] = Math.round(((m[i] - lo) / (hi - lo || 1)) * 255);
  cleanMask(mask, SIZE, SIZE);

  const alpha = await sharp(mask, { raw: { width: SIZE, height: SIZE, channels: 1 } }).resize(width, height, { fit: "fill" }).extractChannel(0).raw().toBuffer();
  const px = Buffer.alloc(width * height * 4);
  for (let i = 0, j = 0; i < width * height; i++) { px[j++] = rgb[i * 3]; px[j++] = rgb[i * 3 + 1]; px[j++] = rgb[i * 3 + 2]; px[j++] = alpha[i]; }
  return sharp(px, { raw: { width, height, channels: 4 } }).trim({ threshold: 12 }).webp({ quality: 86, alphaQuality: 90 }).toBuffer();
}

/** Only fetch from places we trust: Wikimedia and this project's own Supabase storage. */
export function isAllowedSource(src: string): boolean {
  try {
    const u = new URL(src);
    if (u.protocol !== "https:") return false;
    // Wikipedia serves its photos from upload.wikimedia.org and (newer API answers) thumb.wikimedia.org
    if (u.hostname === "upload.wikimedia.org" || u.hostname === "thumb.wikimedia.org") return true;
    const supa = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : null;
    return !!supa && u.hostname === supa;
  } catch {
    return false;
  }
}

export class CutoutPending extends Error { constructor() { super("cut-out still being made"); } }

function remember(key: string, buf: Buffer) {
  memory.set(key, buf);
  if (memory.size > MEMORY_MAX) memory.delete(memory.keys().next().value as string);
}

/**
 * Cut-out (transparent WebP) for a photo URL, from cache or freshly made.
 * Waits at most `waitMs`; if it isn't ready by then it throws CutoutPending and keeps working in the
 * background, so the caller can answer "try again shortly" instead of hitting a proxy timeout.
 */
export async function getCutout(src: string, waitMs = 20000): Promise<Buffer> {
  const key = crypto.createHash("sha1").update(`${MODEL}|${src}`).digest("hex");
  const hit = memory.get(key);
  if (hit) return hit;
  const dir = await cacheDir();
  const file = dir ? path.join(dir, `${key}.webp`) : null;
  if (file) { try { const b = await fs.readFile(file); remember(key, b); return b; } catch { /* not cached yet */ } }

  let job = inflight.get(key);
  if (!job) {
    job = queue.then(async () => {
      const res = await fetch(src, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20000) });
      if (!res.ok) throw new Error(`image fetch failed: HTTP ${res.status}`);
      const len = Number(res.headers.get("content-length") || 0);
      if (len > MAX_BYTES) throw new Error("image too large");
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > MAX_BYTES) throw new Error("image too large");
      const out = await removeBackground(buf);
      remember(key, out);
      if (file) await fs.writeFile(file, out).catch(() => undefined);
      return out;
    });
    inflight.set(key, job);
    queue = job.catch(() => undefined);
    job.catch(noteError).finally(() => inflight.delete(key));
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([job, new Promise<never>((_, rej) => { timer = setTimeout(() => rej(new CutoutPending()), waitMs); })]);
  } finally {
    clearTimeout(timer);
  }
}

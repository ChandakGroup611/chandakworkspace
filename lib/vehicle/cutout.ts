import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

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
const MODEL_URL = process.env.VEHICLE_CUTOUT_MODEL_URL || `https://github.com/danielgatis/rembg/releases/download/v0.0.0/${MODEL}.onnx`;
const CACHE_DIR = process.env.VEHICLE_IMAGE_CACHE_DIR || path.join(process.cwd(), ".cache", "vehicle-images");
const SIZE = 320; // silueta / u2netp input
const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];
const MAX_BYTES = 10 * 1024 * 1024;
const UA = "ChandakWorkspace/1.0 (https://chandakgroup.tech; vehicle inventory thumbnails)";

let sessionPromise: Promise<any> | null = null;
let queue: Promise<unknown> = Promise.resolve(); // one image at a time keeps memory flat

async function ensureDir(d: string) { await fs.mkdir(d, { recursive: true }); }

async function loadSession() {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      // @ts-ignore - optional dynamic wasm runtime
      const modName = "onnxruntime-web";
      const ort: any = await import(/* webpackIgnore: true */ modName);
      ort.env.wasm.numThreads = 1;
      const modelPath = path.join(CACHE_DIR, "models", `${MODEL}.onnx`);
      let bytes: Buffer;
      try {
        bytes = await fs.readFile(modelPath);
      } catch {
        const res = await fetch(MODEL_URL, { headers: { "User-Agent": UA } });
        if (!res.ok) throw new Error(`model download failed: ${res.status}`);
        bytes = Buffer.from(await res.arrayBuffer());
        await ensureDir(path.dirname(modelPath));
        await fs.writeFile(modelPath, bytes);
      }
      return { ort, session: await ort.InferenceSession.create(new Uint8Array(bytes)) };
    })().catch((e) => { sessionPromise = null; throw e; });
  }
  return sessionPromise;
}

async function removeBackground(input: Buffer): Promise<Buffer> {
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
    if (u.hostname === "upload.wikimedia.org") return true;
    const supa = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : null;
    return !!supa && u.hostname === supa;
  } catch {
    return false;
  }
}

/** Cut-out (transparent WebP) for a photo URL, from cache or freshly made. */
export async function getCutout(src: string): Promise<Buffer> {
  const key = crypto.createHash("sha1").update(`${MODEL}|${src}`).digest("hex");
  const file = path.join(CACHE_DIR, `${key}.webp`);
  try { return await fs.readFile(file); } catch { /* not cached yet */ }

  const job = queue.then(async () => {
    try { return await fs.readFile(file); } catch { /* still not cached */ }
    const res = await fetch(src, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`image fetch failed: ${res.status}`);
    const len = Number(res.headers.get("content-length") || 0);
    if (len > MAX_BYTES) throw new Error("image too large");
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_BYTES) throw new Error("image too large");
    const png = await removeBackground(buf);
    await ensureDir(CACHE_DIR);
    await fs.writeFile(file, png);
    return png;
  });
  queue = job.catch(() => undefined);
  return job;
}

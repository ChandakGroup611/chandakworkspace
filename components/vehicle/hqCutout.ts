"use client";

/**
 * High-quality vehicle cut-out that runs in the admin's browser (picture library only).
 *
 * Uses IS-Net (from the open-source rembg project) at 1024 px through the WebAssembly ONNX
 * runtime. Both the runtime and the model come from our own server (no third-party CDN). The
 * model (~178 MB) is downloaded once and kept in the browser's cache storage, so later pictures
 * start immediately. Inference runs in a background worker, so the page stays responsive.
 */
import { cleanMask } from "@/lib/vehicle/model-key";

const RUNTIME = "/api/vehicle/model-image/runtime/";
const MODEL_URL = "/api/vehicle/model-image/segmenter";
const CACHE = "vehicle-segmenter-v1";
const S = 1024;
const WORK_MAX = 1800; // longest side we cut out at

export type Progress = (step: string, fraction?: number) => void;

async function fetchModel(onProgress: Progress): Promise<ArrayBuffer> {
  let cache: Cache | null = null;
  try { cache = await caches.open(CACHE); const hit = await cache.match(MODEL_URL); if (hit) return await hit.arrayBuffer(); } catch { cache = null; }

  for (let attempt = 0; attempt < 120; attempt++) {
    const res = await fetch(MODEL_URL, { credentials: "same-origin" });
    if (res.status === 202) { onProgress("Server is fetching the cut-out model (first time only)…"); await new Promise((r) => setTimeout(r, 5000)); continue; }
    if (!res.ok || !res.body) throw new Error((await res.text().catch(() => "")) || `model ${res.status}`);
    const total = Number(res.headers.get("content-length")) || 0;
    const reader = res.body.getReader();
    const parts: Uint8Array[] = [];
    let got = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      parts.push(value); got += value.length;
      onProgress("Downloading the cut-out model (first time only)…", total ? got / total : undefined);
    }
    const buf = new Uint8Array(got);
    let o = 0; for (const p of parts) { buf.set(p, o); o += p.length; }
    try { await cache?.put(MODEL_URL, new Response(buf, { headers: { "Content-Type": "application/octet-stream" } })); } catch { /* storage full: fine, download again next time */ }
    return buf.buffer;
  }
  throw new Error("The server is still fetching the cut-out model. Try again in a minute.");
}

let sessionPromise: Promise<{ ort: any; session: any }> | null = null;
function loadSession(onProgress: Progress) {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      onProgress("Loading the cut-out engine…");
      const ort: any = await import(/* webpackIgnore: true */ `${RUNTIME}ort.wasm.min.mjs`);
      ort.env.wasm.wasmPaths = RUNTIME;
      ort.env.wasm.numThreads = 1;
      ort.env.wasm.proxy = true; // run in a worker so the page doesn't freeze
      const model = await fetchModel(onProgress);
      onProgress("Starting the cut-out engine…");
      const session = await ort.InferenceSession.create(new Uint8Array(model), { executionProviders: ["wasm"] });
      return { ort, session };
    })().catch((e) => { sessionPromise = null; throw e; });
  }
  return sessionPromise;
}

const canvas = (w: number, h: number) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };

/** Picture → PNG of just the vehicle on a transparent background. */
export async function cutOutInBrowser(picture: Blob, onProgress: Progress = () => {}): Promise<Blob> {
  const { ort, session } = await loadSession(onProgress);
  onProgress("Cutting out the vehicle (about 10–30 seconds)…");
  const bmp = await createImageBitmap(picture);
  const scale = Math.min(1, WORK_MAX / Math.max(bmp.width, bmp.height));
  const W = Math.round(bmp.width * scale), H = Math.round(bmp.height * scale);
  const work = canvas(W, H);
  const wctx = work.getContext("2d", { willReadFrequently: true })!;
  wctx.drawImage(bmp, 0, 0, W, H);

  const inp = canvas(S, S);
  const ictx = inp.getContext("2d", { willReadFrequently: true })!;
  ictx.drawImage(bmp, 0, 0, S, S);
  bmp.close?.();
  const px = ictx.getImageData(0, 0, S, S).data;
  const plane = S * S;
  const t = new Float32Array(3 * plane);
  for (let i = 0; i < plane; i++) for (let k = 0; k < 3; k++) t[k * plane + i] = px[i * 4 + k] / 255 - 0.5;

  const out = await session.run({ [session.inputNames[0]]: new ort.Tensor("float32", t, [1, 3, S, S]) });
  const m: Float32Array = out[session.outputNames[0]].data;
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < m.length; i++) { const v = m[i]; if (v < lo) lo = v; if (v > hi) hi = v; }
  const mask = new Uint8ClampedArray(plane);
  for (let i = 0; i < plane; i++) mask[i] = ((m[i] - lo) / (hi - lo || 1)) * 255;
  onProgress("Finishing edges…");
  cleanMask(mask, S, S);

  // mask → grey image → scaled to the working size with smoothing
  const mc = canvas(S, S);
  const mctx = mc.getContext("2d")!;
  const mimg = mctx.createImageData(S, S);
  for (let i = 0; i < plane; i++) { const j = i * 4; mimg.data[j] = mimg.data[j + 1] = mimg.data[j + 2] = mask[i]; mimg.data[j + 3] = 255; }
  mctx.putImageData(mimg, 0, 0);
  const ms = canvas(W, H);
  const msctx = ms.getContext("2d", { willReadFrequently: true })!;
  msctx.imageSmoothingQuality = "high";
  msctx.drawImage(mc, 0, 0, W, H);
  const alpha = msctx.getImageData(0, 0, W, H).data;
  const img = wctx.getImageData(0, 0, W, H);
  for (let i = 0; i < W * H; i++) img.data[i * 4 + 3] = alpha[i * 4];
  wctx.putImageData(img, 0, 0);

  return await new Promise<Blob>((resolve, reject) => work.toBlob((b) => (b ? resolve(b) : reject(new Error("couldn't encode picture"))), "image/png"));
}

import { NextResponse } from "next/server";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { getCachedUser } from "@/lib/auth/cached-user";
import { cacheDir } from "@/lib/vehicle/cutout";
import { canManageModelImages } from "@/lib/vehicle/model-images";

/**
 * GET /api/vehicle/model-image/segmenter
 * The high-quality cut-out model (IS-Net, from the open-source rembg project, ~178 MB). It runs
 * in the admin's browser, not on the server; the server only stores and hands out the file.
 * The first request starts downloading it to the server's cache and answers 202 (try again
 * shortly); after that the file is streamed (never held in memory).
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NAME = "isnet-general-use.onnx";
const URL_ = process.env.VEHICLE_LIBRARY_MODEL_URL || `https://github.com/danielgatis/rembg/releases/download/v0.0.0/${NAME}`;
const UA = "ChandakWorkspace/1.0 (https://chandakgroup.tech; vehicle picture library)";
let downloading: Promise<void> | null = null;
let lastError: string | null = null;

async function download(target: string) {
  const tmp = `${target}.part-${process.pid}`;
  const res = await fetch(URL_, { headers: { "User-Agent": UA }, redirect: "follow" });
  if (!res.ok || !res.body) throw new Error(`download failed: HTTP ${res.status}`);
  await pipeline(Readable.fromWeb(res.body as any), fs.createWriteStream(tmp));
  const st = await fsp.stat(tmp);
  if (st.size < 50_000_000) { await fsp.unlink(tmp).catch(() => undefined); throw new Error("download incomplete"); }
  await fsp.rename(tmp, target);
}

export async function GET() {
  const { user } = await getCachedUser();
  if (!user) return new NextResponse("Unauthenticated", { status: 401 });
  if (!(await canManageModelImages(user.id))) return new NextResponse("Not allowed", { status: 403 });

  const dir = await cacheDir();
  if (!dir) return new NextResponse("No writable cache folder on the server", { status: 500 });
  const file = path.join(dir, "models", NAME);
  const st = await fsp.stat(file).catch(() => null);
  if (st && st.size > 50_000_000) {
    const body = Readable.toWeb(fs.createReadStream(file)) as unknown as ReadableStream;
    return new NextResponse(body, { headers: { "Content-Type": "application/octet-stream", "Content-Length": String(st.size), "Cache-Control": "private, max-age=31536000, immutable" } });
  }
  if (!downloading) {
    lastError = null;
    downloading = download(file).catch((e) => { lastError = e instanceof Error ? e.message : String(e); }).finally(() => { downloading = null; });
  }
  if (lastError) return new NextResponse(`Couldn't get the cut-out model: ${lastError}`, { status: 502 });
  return new NextResponse(null, { status: 202, headers: { "Retry-After": "5", "Cache-Control": "no-store" } });
}

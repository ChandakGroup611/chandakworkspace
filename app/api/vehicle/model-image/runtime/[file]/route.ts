import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { getCachedUser } from "@/lib/auth/cached-user";

/**
 * GET /api/vehicle/model-image/runtime/<file>
 * The WebAssembly runtime the picture library uses in the browser to cut out a car in high
 * quality (served from our own server, no third-party CDN). Only these three files are served.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const FILES: Record<string, string> = {
  "ort.wasm.min.mjs": "text/javascript; charset=utf-8",
  "ort-wasm-simd-threaded.mjs": "text/javascript; charset=utf-8",
  "ort-wasm-simd-threaded.wasm": "application/wasm",
};

export async function GET(_request: NextRequest, { params }: { params: Promise<{ file: string }> }) {
  const { user } = await getCachedUser();
  if (!user) return new NextResponse("Unauthenticated", { status: 401 });
  const { file } = await params;
  const type = FILES[file];
  if (!type) return new NextResponse("Not found", { status: 404 });
  try {
    const data = await fs.readFile(path.join(process.cwd(), "node_modules", "onnxruntime-web", "dist", file));
    return new NextResponse(new Uint8Array(data), { headers: { "Content-Type": type, "Cache-Control": "private, max-age=2592000, immutable" } });
  } catch {
    return new NextResponse("Runtime not available on this server", { status: 404 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getCachedUser } from "@/lib/auth/cached-user";
import { autoFillEnabled, autoFillModel, autoFillProvider, autoStatus, geminiUsage } from "@/lib/vehicle/model-images";

/**
 * POST /api/vehicle/model-image/auto   { make, model, variant?, year?, paint?, fuel?, category? }
 *   Makes and stores the picture for a model + colour that has none yet (AI-generated or a studio
 *   render, whichever is configured). Answers 200 when stored, 202 while it is still being made
 *   (ask again shortly), 404 when no picture can be made.
 * GET  /api/vehicle/model-image/auto   → which service is configured, how many made, last error.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  const { user } = await getCachedUser();
  if (!user) return new NextResponse("Unauthenticated", { status: 401 });
  return NextResponse.json({ ...autoStatus, enabled: autoFillEnabled(), provider: autoFillProvider(), gemini: geminiUsage }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const { user } = await getCachedUser();
  if (!user) return new NextResponse("Unauthenticated", { status: 401 });
  if (!autoFillEnabled()) return new NextResponse("No picture service configured", { status: 404 });
  const b = await request.json().catch(() => null);
  if (!b?.model) return new NextResponse("Missing model", { status: 400 });
  const clip = (x: unknown, n: number) => (x == null || x === "" ? null : String(x).slice(0, n));
  const job = autoFillModel({ make: clip(b.make, 80), model: clip(b.model, 120), variant: clip(b.variant, 120), year: clip(b.year, 8), paint: clip(b.paint, 40), fuel: clip(b.fuel, 40), category: clip(b.category, 40) });
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const row = await Promise.race([job, new Promise<"pending">((r) => { timer = setTimeout(() => r("pending"), 20000); })]);
    if (row === "pending") return new NextResponse(null, { status: 202, headers: { "Retry-After": "5", "Cache-Control": "no-store" } });
    if (!row) return new NextResponse("No picture available for this model", { status: 404 });
    return NextResponse.json({ ok: true, key: row.model_key });
  } catch (e) {
    console.warn("[api/vehicle/model-image/auto] failed", e instanceof Error ? e.message : e);
    return new NextResponse("Couldn't make a picture", { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}

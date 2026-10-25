import { NextRequest, NextResponse } from "next/server";
import { getCachedUser } from "@/lib/auth/cached-user";
import { canManageModelImages, deleteModelImage, modelKey, saveModelImage, takePreview } from "@/lib/vehicle/model-images";

/**
 * POST   /api/vehicle/model-image   { token, make, model, variant? }  → approve a previewed picture
 * DELETE /api/vehicle/model-image?key=<model key>                      → remove a model's picture
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const { user } = await getCachedUser();
  if (!user) return new NextResponse("Unauthenticated", { status: 401 });
  if (!(await canManageModelImages(user.id))) return new NextResponse("Not allowed", { status: 403 });
  const body = await request.json().catch(() => null) as { token?: string; make?: string; model?: string; variant?: string } | null;
  if (!body?.token || !body.model) return new NextResponse("Missing picture or model", { status: 400 });
  const preview = takePreview(body.token, user.id);
  if (!preview) return new NextResponse("This preview has expired. Prepare the picture again.", { status: 410 });
  try {
    const row = await saveModelImage({
      make: String(body.make || "").slice(0, 80), model: String(body.model).slice(0, 120), variant: body.variant ? String(body.variant).slice(0, 120) : null,
      webp: preview.webp, flip: preview.flip, source: preview.source, sourceUrl: preview.sourceUrl, credit: preview.credit, userId: user.id,
    });
    return NextResponse.json({ ok: true, key: row.model_key, updatedAt: row.updated_at });
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    console.warn("[api/vehicle/model-image] save failed", reason);
    return new NextResponse(reason.slice(0, 300), { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { user } = await getCachedUser();
  if (!user) return new NextResponse("Unauthenticated", { status: 401 });
  if (!(await canManageModelImages(user.id))) return new NextResponse("Not allowed", { status: 403 });
  const key = request.nextUrl.searchParams.get("key") || modelKey(request.nextUrl.searchParams.get("make"), request.nextUrl.searchParams.get("model"));
  if (!key || key === "|") return new NextResponse("Bad request", { status: 400 });
  try {
    await deleteModelImage(key);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return new NextResponse((e instanceof Error ? e.message : String(e)).slice(0, 300), { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getCachedUser } from "@/lib/auth/cached-user";
import { autoFillEnabled, canManageModelImages, listModelImages } from "@/lib/vehicle/model-images";

/**
 * GET /api/vehicle/model-images
 * → { canManage, autoFill, items: [{ key, make, model, variant, url, credit, source, flipped, updatedAt }] }
 * The approved picture for each make + model. Fetched once per page by the vehicle pictures.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const { user } = await getCachedUser();
  if (!user) return new NextResponse("Unauthenticated", { status: 401 });
  const [rows, canManage] = await Promise.all([listModelImages(), canManageModelImages(user.id)]);
  const items = rows.map((r) => ({
    key: r.model_key,
    make: r.make,
    model: r.model,
    variant: r.variant,
    url: `/api/vehicle/model-image/file?key=${encodeURIComponent(r.model_key)}&v=${encodeURIComponent(r.updated_at)}`,
    credit: r.credit,
    source: r.source,
    sourceUrl: r.source_url,
    flipped: r.flipped,
    updatedAt: r.updated_at,
  }));
  return NextResponse.json({ canManage, autoFill: autoFillEnabled(), items }, { headers: { "Cache-Control": "no-store" } });
}

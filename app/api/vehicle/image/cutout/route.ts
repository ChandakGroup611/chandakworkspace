import { NextRequest, NextResponse } from "next/server";
import { getCachedUser } from "@/lib/auth/cached-user";
import { CutoutPending, cutoutStatus, getCutout, isAllowedSource } from "@/lib/vehicle/cutout";

/**
 * GET /api/vehicle/image/cutout?src=<photo url>
 * → the photo with its background removed (transparent WebP), made once and cached.
 * Only Wikimedia and this project's Supabase storage are accepted as sources.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { user } = await getCachedUser();
  if (!user) return new NextResponse("Unauthenticated", { status: 401 });

  // ?debug=1 → where the cache lives, whether the model loaded, and the last error (signed-in users only)
  if (request.nextUrl.searchParams.get("debug")) return NextResponse.json(cutoutStatus, { headers: { "Cache-Control": "no-store" } });

  const src = request.nextUrl.searchParams.get("src") || "";
  if (!isAllowedSource(src)) return new NextResponse("Source not allowed", { status: 400 });

  try {
    const img = await getCutout(src);
    return new NextResponse(new Uint8Array(img), {
      headers: { "Content-Type": "image/webp", "Cache-Control": "private, max-age=604800, immutable" },
    });
  } catch (e) {
    if (e instanceof CutoutPending) {
      // still working: the browser asks again shortly (keeps each request well under proxy timeouts)
      return new NextResponse(null, { status: 202, headers: { "Retry-After": "3", "Cache-Control": "no-store" } });
    }
    const reason = (e instanceof Error ? e.message : String(e)).slice(0, 300);
    console.warn("[api/vehicle/image/cutout] failed", reason);
    return new NextResponse(`Cut-out failed: ${reason}`, { status: 502, headers: { "Cache-Control": "no-store", "X-Cutout-Error": reason.replace(/[^\x20-\x7e]/g, "?") } });
  }
}

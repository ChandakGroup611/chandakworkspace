import { NextRequest, NextResponse } from "next/server";
import { getCachedUser } from "@/lib/auth/cached-user";
import { getCutout, isAllowedSource } from "@/lib/vehicle/cutout";

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

  const src = request.nextUrl.searchParams.get("src") || "";
  if (!isAllowedSource(src)) return new NextResponse("Source not allowed", { status: 400 });

  try {
    const img = await getCutout(src);
    return new NextResponse(new Uint8Array(img), {
      headers: { "Content-Type": "image/webp", "Cache-Control": "private, max-age=604800, immutable" },
    });
  } catch (e) {
    console.warn("[api/vehicle/image/cutout] failed", e);
    return new NextResponse("Cut-out failed", { status: 502 });
  }
}

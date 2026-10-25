import { NextRequest, NextResponse } from "next/server";
import { getCachedUser } from "@/lib/auth/cached-user";
import { readModelImage } from "@/lib/vehicle/model-images";

/** GET /api/vehicle/model-image/file?key=<model key>&v=<version> → the standardised WebP. */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { user } = await getCachedUser();
  if (!user) return new NextResponse("Unauthenticated", { status: 401 });
  const key = request.nextUrl.searchParams.get("key") || "";
  if (!key || key.length > 200) return new NextResponse("Bad request", { status: 400 });
  const file = await readModelImage(key);
  if (!file) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(new Uint8Array(file.data), {
    headers: {
      "Content-Type": "image/webp",
      // the URL carries the version, so a changed picture gets a new URL
      "Cache-Control": request.nextUrl.searchParams.get("v") ? "private, max-age=2592000, immutable" : "private, max-age=300",
    },
  });
}

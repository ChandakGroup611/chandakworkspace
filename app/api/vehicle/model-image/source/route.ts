import { NextRequest, NextResponse } from "next/server";
import { getCachedUser } from "@/lib/auth/cached-user";
import { canManageModelImages, isCommonsUrl } from "@/lib/vehicle/model-images";

/** GET /api/vehicle/model-image/source?url=<Wikimedia Commons picture> → the picture, same-origin, so the browser can cut it out. */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const UA = "ChandakWorkspace/1.0 (https://chandakgroup.tech; vehicle picture library)";

export async function GET(request: NextRequest) {
  const { user } = await getCachedUser();
  if (!user) return new NextResponse("Unauthenticated", { status: 401 });
  if (!(await canManageModelImages(user.id))) return new NextResponse("Not allowed", { status: 403 });
  const url = request.nextUrl.searchParams.get("url") || "";
  if (!isCommonsUrl(url)) return new NextResponse("Source not allowed", { status: 400 });
  const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20000) });
  if (!res.ok) return new NextResponse(`Couldn't download that picture (HTTP ${res.status})`, { status: 502 });
  const type = res.headers.get("content-type") || "image/jpeg";
  if (!type.startsWith("image/")) return new NextResponse("Not a picture", { status: 415 });
  const buf = Buffer.from(await res.arrayBuffer());
  return new NextResponse(new Uint8Array(buf), { headers: { "Content-Type": type, "Cache-Control": "private, max-age=3600" } });
}

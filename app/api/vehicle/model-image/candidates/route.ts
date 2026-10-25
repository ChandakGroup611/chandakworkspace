import { NextRequest, NextResponse } from "next/server";
import { getCachedUser } from "@/lib/auth/cached-user";
import { canManageModelImages, findCandidates } from "@/lib/vehicle/model-images";

/** GET /api/vehicle/model-image/candidates?make=&model= → freely licensed photos of that model to choose from. */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { user } = await getCachedUser();
  if (!user) return new NextResponse("Unauthenticated", { status: 401 });
  if (!(await canManageModelImages(user.id))) return new NextResponse("Not allowed", { status: 403 });
  const make = (request.nextUrl.searchParams.get("make") || "").slice(0, 80);
  const model = (request.nextUrl.searchParams.get("model") || "").slice(0, 120);
  if (!model) return NextResponse.json({ items: [] });
  const items = await findCandidates(make, model);
  return NextResponse.json({ items }, { headers: { "Cache-Control": "private, max-age=600" } });
}

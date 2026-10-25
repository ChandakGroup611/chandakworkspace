import { NextRequest, NextResponse } from "next/server";
import { getCachedUser } from "@/lib/auth/cached-user";
import { canManageModelImages, isCommonsUrl, keepPreview, standardise } from "@/lib/vehicle/model-images";

/**
 * POST /api/vehicle/model-image/preview   (multipart form)
 *   file       an uploaded picture (JPG / PNG / WebP, up to 10 MB)   — or —
 *   sourceUrl  a Wikimedia Commons picture chosen from the candidates
 *   credit     licence / author line (Commons pictures)
 *   origin     "commons" + page  when the file is a Commons photo already cut out in the browser
 *   flip       "1" to mirror the car
 * → the standardised picture (WebP) with header X-Preview-Token, used by "Approve".
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

const MAX = 10 * 1024 * 1024;
const UA = "ChandakWorkspace/1.0 (https://chandakgroup.tech; vehicle picture library)";

export async function POST(request: NextRequest) {
  const { user } = await getCachedUser();
  if (!user) return new NextResponse("Unauthenticated", { status: 401 });
  if (!(await canManageModelImages(user.id))) return new NextResponse("Not allowed", { status: 403 });

  let form: FormData;
  try { form = await request.formData(); } catch { return new NextResponse("Expected a form upload", { status: 400 }); }
  const flip = form.get("flip") === "1";
  const file = form.get("file");
  const sourceUrl = String(form.get("sourceUrl") || "");
  let input: Buffer;
  let source: "upload" | "commons";
  let credit: string | null = String(form.get("credit") || "").slice(0, 300) || null;
  let origin: string | null = null;

  if (file && typeof file === "object" && "arrayBuffer" in file) {
    const f = file as File;
    if (f.size > MAX) return new NextResponse("The picture is larger than 10 MB", { status: 413 });
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) return new NextResponse("Use a JPG, PNG or WebP picture", { status: 415 });
    input = Buffer.from(await f.arrayBuffer());
    const page = String(form.get("page") || "");
    if (form.get("origin") === "commons" && /^https:\/\/commons\.wikimedia\.org\//.test(page)) {
      // a Commons photo already cut out in the browser
      source = "commons";
      origin = page.slice(0, 500);
      credit = credit || "Wikimedia Commons";
    } else {
      source = "upload";
      origin = f.name.slice(0, 200);
      credit = credit || "Uploaded by your team";
    }
  } else if (isCommonsUrl(sourceUrl)) {
    const res = await fetch(sourceUrl, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20000) });
    if (!res.ok) return new NextResponse(`Couldn't download that picture (HTTP ${res.status})`, { status: 502 });
    input = Buffer.from(await res.arrayBuffer());
    if (input.length > MAX * 2) return new NextResponse("That picture is too large", { status: 413 });
    source = "commons";
    origin = String(form.get("page") || sourceUrl).slice(0, 500);
  } else {
    return new NextResponse("Choose a picture or upload one", { status: 400 });
  }

  try {
    const { webp } = await standardise(input, { flip });
    const token = keepPreview({ webp, flip, source, sourceUrl: origin, credit, userId: user.id });
    return new NextResponse(new Uint8Array(webp), { headers: { "Content-Type": "image/webp", "Cache-Control": "no-store", "X-Preview-Token": token } });
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    console.warn("[api/vehicle/model-image/preview] failed", reason);
    return new NextResponse(`Couldn't prepare this picture: ${reason.slice(0, 200)}`, { status: 500 });
  }
}

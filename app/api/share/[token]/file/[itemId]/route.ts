import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/service_role";
import { clientInfo, hasShareSession, loadShareByToken, loadShareFiles, logShareAttempt, shareState, watermarkLine } from "@/lib/dms/share-session";
import { escapeHtml } from "@/lib/dms/share-crypto";
import { watermarkPdfBuffer } from "@/lib/dms/pdf-stamp";

/**
 * Files for the public share page. Needs a live share session in this browser (set after the
 * email + code checks). Views and downloads are counted atomically and logged. Images are
 * served with the recipient's watermark burned into the pixels; PDFs are shown inline.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const IMAGE_EXT = new Set(["png", "jpg", "jpeg", "webp", "tif", "tiff", "gif"]);

function deny(status: number, message: string) {
  return new NextResponse(message, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}

async function watermarkImage(input: Buffer, text: string): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  const img = sharp(input, { failOn: "none", animated: false }).rotate();
  const meta = await img.metadata();
  const w = Math.max(meta.autoOrient?.width || meta.width || 800, 200);
  const h = Math.max(meta.autoOrient?.height || meta.height || 600, 200);
  const size = Math.max(Math.round(Math.min(w, h) / 40), 12);
  const step = size * 6;
  const rows: string[] = [];
  for (let y = -h; y < h * 2; y += step) {
    rows.push(`<text x="${-w}" y="${y}">${escapeHtml(`${text}     ${text}     ${text}`)}</text>`);
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
<g transform="rotate(-30 ${w / 2} ${h / 2})" font-family="DejaVu Sans, Arial, sans-serif" font-size="${size}" font-weight="bold"
   fill="#000" fill-opacity="0.16" stroke="#fff" stroke-opacity="0.16" stroke-width="${Math.max(size / 12, 1)}">${rows.join("")}</g></svg>`;
  return img.composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).png().toBuffer();
}

export async function GET(request: Request, { params }: { params: Promise<{ token: string; itemId: string }> }) {
  const { token, itemId } = await params;
  const download = new URL(request.url).searchParams.get("download") === "1";

  const share = await loadShareByToken(token);
  const state = shareState(share);
  if (state !== "ok") return deny(state === "missing" ? 404 : 410, "This link is no longer active.");
  const s = share!;
  if (!(await hasShareSession(token, s))) return deny(401, "Please open the link again and verify your email.");

  const file = (await loadShareFiles(s.id)).find((f) => f.itemId === itemId);
  if (!file) return deny(404, "This document is no longer part of the share.");
  if (download && !s.allow_download) return deny(403, "This share is view only.");

  const ext = file.fileName.split(".").pop()?.toLowerCase() || "";
  const isImage = IMAGE_EXT.has(ext) || (file.mimeType.startsWith("image/") && file.mimeType !== "image/svg+xml");
  const isPdf = ext === "pdf" || file.mimeType === "application/pdf";
  if (!download && !isImage && !isPdf) return deny(415, "This file type cannot be previewed here.");

  // Count first, so the download limit holds even with parallel requests
  const { data: allowed, error: countErr } = await supabaseAdmin.rpc("fn_dms_share_count_access", { p_share: s.id, p_download: download });
  if (countErr) return deny(500, "Could not open the file. Try again.");
  if (!allowed) return deny(403, download ? "The download limit for this link has been reached." : "This link is no longer active.");

  const [, bucket = "", ...rest] = file.storageKey.split(":");
  const { data: blob, error } = await supabaseAdmin.storage.from(bucket).download(rest.join(":"));
  if (error || !blob) return deny(404, "The file could not be found.");
  let body: Buffer = Buffer.from(await blob.arrayBuffer());

  const { ip } = await clientInfo();
  let contentType = isPdf ? "application/pdf" : file.mimeType || "application/octet-stream";
  let fileName = file.fileName;
  const line = watermarkLine(s.recipient_email, ip);
  if (isImage) {
    try {
      body = await watermarkImage(body, line);
      contentType = "image/png";
      fileName = fileName.replace(/\.[^.]+$/, "") + ".png";
    } catch (err) {
      console.error("[share] watermark failed", err);
      return deny(500, "Could not prepare this image.");
    }
  } else if (isPdf) {
    body = await watermarkPdfBuffer(body, line);
  }

  await logShareAttempt(s.id, download ? "FILE_DOWNLOAD" : "FILE_VIEW", true, s.recipient_email);
  await supabaseAdmin.rpc("fn_dms_audit", {
    p_actor: null,
    p_action: download ? "SHARE_FILE_DOWNLOADED" : "SHARE_FILE_VIEWED",
    p_entity_type: "DOCUMENT",
    p_entity_id: file.documentId,
    p_details: { share_id: s.id, recipient: s.recipient_email, version: file.versionNo, ip },
  });

  const safeName = fileName.replace(/[^\w.\- ()]+/g, "_");
  return new NextResponse(new Uint8Array(body), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(body.length),
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "no-store, private",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

import JSZip from "jszip";
import * as XLSX from "xlsx";
import { escapeHtml } from "./share-crypto";

export const HTML_PREVIEW_EXT = new Set([
  "docx",
  "xlsx",
  "xls",
  "csv",
  "ods",
  "txt",
  "md",
  "log",
  "json",
  "xml",
  "yaml",
  "yml",
  "dxf",
]);

export function isHtmlPreviewExt(ext: string): boolean {
  return HTML_PREVIEW_EXT.has(ext.toLowerCase());
}

function unescapeXml(str: string): string {
  return str
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function renderParagraphRuns(pXml: string): string {
  const runs = pXml.match(/<w:r[\s>][\s\S]*?<\/w:r>/g) || [];
  const parts: string[] = [];
  for (const r of runs) {
    const rPr = r.match(/<w:rPr>[\s\S]*?<\/w:rPr>/)?.[0] || "";
    const isBold = /<w:b(?:\s|\/|>)/.test(rPr) && !/<w:b\s+w:val="(?:false|0)"/.test(rPr);
    const isItalic = /<w:i(?:\s|\/|>)/.test(rPr) && !/<w:i\s+w:val="(?:false|0)"/.test(rPr);
    const isUnderline = /<w:u(?:\s|\/|>)/.test(rPr) && !/<w:u\s+w:val="none"/.test(rPr);

    const tokens = r.match(/<w:t(?:\s[^>]*)?>[\s\S]*?<\/w:t>|<w:tab\s*\/>|<w:br\s*\/>/g) || [];
    let textHtml = "";
    for (const tok of tokens) {
      if (tok.startsWith("<w:tab")) {
        textHtml += "&nbsp;&nbsp;&nbsp;&nbsp;";
      } else if (tok.startsWith("<w:br")) {
        textHtml += "<br/>";
      } else {
        const inner = tok.replace(/^<w:t(?:\s[^>]*)?>/, "").replace(/<\/w:t>$/, "");
        textHtml += escapeHtml(unescapeXml(inner));
      }
    }
    if (!textHtml) continue;
    if (isBold) textHtml = `<strong>${textHtml}</strong>`;
    if (isItalic) textHtml = `<em>${textHtml}</em>`;
    if (isUnderline) textHtml = `<u>${textHtml}</u>`;
    parts.push(textHtml);
  }
  return parts.join("");
}

function renderDocxXmlToHtml(xml: string): string {
  const bodyMatch = xml.match(/<w:body>([\s\S]*)<\/w:body>/);
  const bodyXml = bodyMatch ? bodyMatch[1] : xml;

  // Split top-level blocks (<w:tbl> and <w:p>) in document order
  const blocks = bodyXml.match(/<w:tbl[\s>][\s\S]*?<\/w:tbl>|<w:p[\s>][\s\S]*?<\/w:p>/g) || [];
  const out: string[] = [];

  for (const blk of blocks) {
    if (blk.startsWith("<w:tbl")) {
      const rows = blk.match(/<w:tr[\s>][\s\S]*?<\/w:tr>/g) || [];
      out.push('<div class="tbl-wrap"><table>');
      rows.forEach((tr, rIdx) => {
        const cells = tr.match(/<w:tc[\s>][\s\S]*?<\/w:tc>/g) || [];
        out.push("<tr>");
        for (const tc of cells) {
          const ps = tc.match(/<w:p[\s>][\s\S]*?<\/w:p>/g) || [];
          const cellText = ps.map(renderParagraphRuns).filter(Boolean).join("<br/>") || "&nbsp;";
          const tag = rIdx === 0 ? "th" : "td";
          out.push(`<${tag}>${cellText}</${tag}>`);
        }
        out.push("</tr>");
      });
      out.push("</table></div>");
    } else {
      const style = blk.match(/<w:pStyle\s+w:val="([^"]+)"/)?.[1] || "";
      const isList = /<w:numPr>/.test(blk);
      const html = renderParagraphRuns(blk);
      if (!html.trim()) {
        out.push('<p class="spacer">&nbsp;</p>');
        continue;
      }
      if (/^Title$/i.test(style)) {
        out.push(`<h1>${html}</h1>`);
      } else if (/^Heading1$/i.test(style)) {
        out.push(`<h1>${html}</h1>`);
      } else if (/^Heading2$/i.test(style)) {
        out.push(`<h2>${html}</h2>`);
      } else if (/^Heading[3-6]$/i.test(style)) {
        out.push(`<h3>${html}</h3>`);
      } else if (isList) {
        out.push(`<p class="list-item">• ${html}</p>`);
      } else {
        out.push(`<p>${html}</p>`);
      }
    }
  }

  return out.length > 0 ? out.join("\n") : '<p class="muted">This document has no readable text content.</p>';
}

async function renderDocxBuffer(buf: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buf);
  const docFile = zip.file("word/document.xml");
  if (!docFile) {
    return '<p class="muted">Could not locate document body inside this DOCX file.</p>';
  }
  const xml = await docFile.async("string");
  return renderDocxXmlToHtml(xml);
}

function renderSpreadsheetBuffer(buf: Buffer): string {
  const wb = XLSX.read(buf, { type: "buffer" });
  if (!wb.SheetNames.length) return '<p class="muted">Empty workbook.</p>';

  const parts: string[] = [];
  for (const name of wb.SheetNames.slice(0, 12)) {
    const sheet = wb.Sheets[name];
    if (!sheet) continue;
    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: "" });
    parts.push(`<h2>${escapeHtml(name)}</h2>`);
    if (!rows.length) {
      parts.push('<p class="muted">(Empty sheet)</p>');
      continue;
    }
    const maxCols = Math.min(Math.max(...rows.slice(0, 500).map((r) => r.length), 1), 40);
    parts.push('<div class="tbl-wrap"><table>');
    rows.slice(0, 500).forEach((r, idx) => {
      parts.push("<tr>");
      for (let c = 0; c < maxCols; c++) {
        const val = r[c] === null || r[c] === undefined ? "" : String(r[c]);
        const tag = idx === 0 ? "th" : "td";
        parts.push(`<${tag}>${escapeHtml(val) || "&nbsp;"}</${tag}>`);
      }
      parts.push("</tr>");
    });
    parts.push("</table></div>");
    if (rows.length > 500) {
      parts.push(`<p class="muted">Showing first 500 of ${rows.length} rows.</p>`);
    }
  }
  return parts.join("\n");
}

function renderTextBuffer(buf: Buffer, ext: string): string {
  const raw = buf.toString("utf8");
  let display = raw.slice(0, 200_000);
  if (ext === "json") {
    try {
      display = JSON.stringify(JSON.parse(raw), null, 2).slice(0, 200_000);
    } catch {
      /* keep raw */
    }
  }
  const truncated = raw.length > 200_000 ? `<p class="muted">Preview truncated at 200 KB.</p>` : "";
  return `<pre>${escapeHtml(display)}</pre>${truncated}`;
}

/**
 * Renders DOCX, XLSX/XLS/CSV/ODS, and text/DXF buffers into a sandboxed,
 * self-contained HTML preview document with watermark footer.
 */
export async function renderDocumentPreviewHtml(buf: Buffer, fileName: string, watermarkText: string): Promise<string> {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  let bodyHtml = "";
  try {
    if (ext === "docx") {
      bodyHtml = await renderDocxBuffer(buf);
    } else if (["xlsx", "xls", "csv", "ods"].includes(ext)) {
      bodyHtml = renderSpreadsheetBuffer(buf);
    } else {
      bodyHtml = renderTextBuffer(buf, ext);
    }
  } catch (err) {
    console.error("[preview-render] failed for", fileName, err);
    bodyHtml = '<p class="muted">Could not render this file in the browser.</p>';
  }

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(fileName)}</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; padding: 24px 16px; background: #f1f5f9; color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.55; }
  .sheet { max-width: 860px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 32px 36px; box-shadow: 0 2px 10px rgba(15,23,42,0.05); }
  h1 { font-size: 20px; margin: 0 0 12px; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
  h2 { font-size: 16px; margin: 18px 0 8px; color: #1e293b; }
  h3 { font-size: 14px; margin: 14px 0 6px; color: #334155; }
  p { margin: 0 0 10px; font-size: 13.5px; white-space: pre-wrap; word-break: break-word; }
  p.spacer { margin: 0 0 4px; font-size: 8px; }
  p.list-item { padding-left: 16px; }
  p.muted { color: #64748b; font-size: 12px; }
  .tbl-wrap { overflow-x: auto; margin: 12px 0 16px; border: 1px solid #cbd5e1; border-radius: 6px; }
  table { border-collapse: collapse; width: 100%; font-size: 12px; }
  th, td { border: 1px solid #e2e8f0; padding: 6px 10px; text-align: left; vertical-align: top; }
  th { background: #f8fafc; font-weight: 600; color: #1e293b; }
  pre { margin: 0; padding: 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; overflow-x: auto; white-space: pre-wrap; word-break: break-word; }
  .wm { margin-top: 24px; padding-top: 10px; border-top: 1px dashed #cbd5e1; font-family: ui-monospace, monospace; font-size: 11px; color: #64748b; }
</style>
</head>
<body>
  <div class="sheet">
    ${bodyHtml}
    <div class="wm">${escapeHtml(watermarkText)}</div>
  </div>
</body>
</html>`;
}

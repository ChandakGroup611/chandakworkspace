/**
 * dMACQ Auto-Indexing from Filename (max 5 parts separated by _, -, or .).
 * Example: "INV_2026_VendorA_10500.pdf" with parts ["docType", "year", "vendor", "amount"]
 */
export type AutoIndexSeparator = "_" | "-" | ".";

export interface AutoIndexResult {
  parts: string[];
  docTypeCode?: string;
  title?: string;
  fields: Record<string, string>;
}

export function parseAutoIndexFilename(
  fileName: string,
  separator: AutoIndexSeparator,
  partMapping: string[]
): AutoIndexResult {
  const baseName = String(fileName || "").replace(/\.[^.]+$/, "").trim();
  if (!baseName) return { parts: [], fields: {} };

  const parts = baseName.split(separator).slice(0, 5).map((p) => p.trim());
  const out: AutoIndexResult = { parts, fields: {} };

  parts.forEach((val, idx) => {
    const role = (partMapping[idx] || "").trim();
    if (!role || role === "ignore" || role === "*") return;
    if (role === "docType") out.docTypeCode = val;
    else if (role === "title") out.title = val;
    else out.fields[role] = val;
  });

  if (!out.title) {
    out.title = parts.filter(Boolean).join(" ").trim() || baseName;
  }
  return out;
}

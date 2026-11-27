/**
 * dMACQ DMS 7.0 filename validation rules (from dMACQ DMS - Recommendations.pdf).
 * Blocks special characters that break storage/viewer paths or security filters.
 */
const PROHIBITED_FILENAME_RE = /[@#*~`^+%$?!=<>()[\]{}|/\\:;"',]/;

export function validateDmsFileName(fileName: string): string | null {
  const name = String(fileName || "").trim();
  if (!name) return "Choose a file with a valid name.";
  const match = name.match(PROHIBITED_FILENAME_RE);
  if (match) {
    return `Filename cannot contain "${match[0]}". Remove special characters (@ # * ~ ^ + % $ ? ! = < > ( ) [ ] { } | / \\ : ; " ' ,) and try again.`;
  }
  return null;
}

/** Returns true if the document was uploaded within the last 24 hours (dMACQ "New" badge). */
export function isUploadedWithin24Hours(isoDate?: string | null): boolean {
  if (!isoDate) return false;
  const ts = new Date(isoDate).getTime();
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts <= 24 * 60 * 60 * 1000;
}

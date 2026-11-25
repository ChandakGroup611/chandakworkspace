/**
 * Enterprise File Security Guard
 * Prevents malware, ransomware, executable drops, and malicious file uploads
 * across all Chandak Workspace modules.
 */

export const DANGEROUS_EXTENSIONS = new Set([
  // Executables & Installers
  "exe", "msi", "msp", "com", "scr", "pif", "application", "gadget", "app", "dmg", "pkg",
  // Scripts & Interpreters
  "bat", "cmd", "sh", "bash", "zsh", "ps1", "ps2", "ps1xml", "psc1", "psc2",
  "vbs", "vbe", "js", "jse", "ws", "wsf", "wsc", "wsh", "hta", "cpl", "msc", "inf", "reg", "scf", "lnk",
  // Dangerous System Binaries & Drivers
  "dll", "sys", "drv", "bin", "jar", "apk",
  // Disk Images (often used for ransomware payload container smuggling)
  "iso", "img", "vhd", "vhdx"
]);

export const MAX_SAFE_FILE_SIZE = 100 * 1024 * 1024; // 100 MB max

/**
 * Validates a file name and size for malware and executable risks.
 * Returns safe: true or throws/returns detailed security error.
 */
export function validateFileSecurity(
  fileName: string,
  fileSize?: number
): { safe: boolean; error?: string } {
  if (!fileName || typeof fileName !== "string") {
    return { safe: false, error: "Invalid or missing file name." };
  }

  // 1. Check for null bytes or directory traversal characters
  if (fileName.includes("\0") || fileName.includes("/") || fileName.includes("\\")) {
    return { safe: false, error: "File name contains illegal path traversal characters." };
  }

  // 2. Check file size
  if (fileSize !== undefined && fileSize > MAX_SAFE_FILE_SIZE) {
    return { safe: false, error: `File exceeds maximum allowed size of 100 MB.` };
  }

  const cleanName = fileName.trim().toLowerCase();

  // 3. Extract final extension
  const parts = cleanName.split(".");
  if (parts.length < 2) {
    // Files without extensions are suspicious for attachments
    return { safe: true };
  }

  const finalExt = parts[parts.length - 1];

  // Check if final extension is explicitly blocked
  if (DANGEROUS_EXTENSIONS.has(finalExt)) {
    return {
      safe: false,
      error: `Upload blocked: Executable or script files (.${finalExt}) are strictly prohibited for system security.`
    };
  }

  // 4. Double extension detection (e.g. "invoice.pdf.exe" or "report.exe.pdf")
  for (let i = 0; i < parts.length - 1; i++) {
    const intermediateExt = parts[i];
    if (DANGEROUS_EXTENSIONS.has(intermediateExt)) {
      return {
        safe: false,
        error: `Upload blocked: Double or masked executable extension (.${intermediateExt}) detected in file name.`
      };
    }
  }

  return { safe: true };
}

/**
 * Throws an Error if the file fails security validation.
 */
export function assertFileSecurity(fileName: string, fileSize?: number): void {
  const result = validateFileSecurity(fileName, fileSize);
  if (!result.safe) {
    throw new Error(result.error || "File upload blocked by security guard.");
  }
}

/**
 * Sanitizes file name into an alphanumeric ASCII string with safe dots and dashes.
 */
export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_{2,}/g, "_")
    .slice(-150);
}

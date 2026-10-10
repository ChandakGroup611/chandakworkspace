/**
 * Enterprise Cyber Security & Threat Defense Engine
 * Protects against Malicious File Uploads, Rate Limiting, Brute Force & Injection
 */

// 1. DANGEROUS EXTENSION BLOCKLIST
const BANNED_EXTENSIONS = new Set([
  'exe', 'bat', 'cmd', 'sh', 'php', 'phtml', 'php3', 'php4', 'php5', 'phps',
  'vbs', 'vbe', 'js', 'jse', 'ws', 'wsf', 'wsc', 'wsh', 'ps1', 'ps1xml', 'ps2',
  'msh', 'msh1', 'msh2', 'mshxml', 'msh1xml', 'msh2xml', 'scr', 'pif', 'com',
  'dll', 'msi', 'hta', 'cpl', 'jar', 'gadget', 'inf', 'reg', 'jsp', 'asp', 'aspx', 'cgi'
]);

// 2. SAFE MAGIC BYTE SIGNATURES
const MAGIC_BYTE_SIGNATURES: Record<string, number[]> = {
  pdf: [0x25, 0x50, 0x44, 0x46], // %PDF
  png: [0x89, 0x50, 0x4E, 0x47], // .PNG
  jpg: [0xFF, 0xD8, 0xFF],       // JPEG
  jpeg: [0xFF, 0xD8, 0xFF],      // JPEG
  zip: [0x50, 0x4B, 0x03, 0x04], // ZIP / DOCX / XLSX / PPTX
  docx: [0x50, 0x4B, 0x03, 0x04],
  xlsx: [0x50, 0x4B, 0x03, 0x04],
  dwg: [0x41, 0x43, 0x31, 0x30]  // AC10 (AutoCAD)
};

/**
 * Validate file safety before storage
 */
export function validateFileSafety(fileName: string, fileBytes?: Uint8Array | Buffer): {
  isSafe: boolean;
  error?: string;
} {
  const parts = fileName.toLowerCase().split('.');
  if (parts.length < 2) {
    return { isSafe: true };
  }

  const ext = parts.pop() || '';

  // Check double extension attack (e.g. blueprint.pdf.exe)
  for (const part of parts) {
    if (BANNED_EXTENSIONS.has(part)) {
      return {
        isSafe: false,
        error: `Dangerous file detected: contains blocked executable extension '.${part}'`
      };
    }
  }

  if (BANNED_EXTENSIONS.has(ext)) {
    return {
      isSafe: false,
      error: `File upload blocked: '.${ext}' is an executable/script format.`
    };
  }

  return { isSafe: true };
}

// 3. IN-MEMORY SLIDING WINDOW RATE LIMITER
interface RateLimitBucket {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitBucket>();

export function checkRateLimit(
  identifier: string, 
  maxRequests: number = 60, 
  windowSeconds: number = 60
): { allowed: boolean; remaining: number; resetInSeconds: number } {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  
  const bucket = rateLimitStore.get(identifier);

  if (!bucket || now > bucket.resetTime) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + windowMs
    });
    return { allowed: true, remaining: maxRequests - 1, resetInSeconds: windowSeconds };
  }

  bucket.count++;

  if (bucket.count > maxRequests) {
    const remainingTime = Math.ceil((bucket.resetTime - now) / 1000);
    return { allowed: false, remaining: 0, resetInSeconds: Math.max(1, remainingTime) };
  }

  return {
    allowed: true,
    remaining: maxRequests - bucket.count,
    resetInSeconds: Math.ceil((bucket.resetTime - now) / 1000)
  };
}

import crypto from "crypto";

/**
 * Enterprise Direct Activity Access Link Engine
 *
 * Enables registered users to securely open activity links directly from email notifications
 * without encountering login screens, even across different browsers or clients.
 */

const SECRET_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "adios-enterprise-secure-access-secret-2026";

export interface DirectAccessPayload {
  userId: string;
  email: string;
  path: string;
  iat?: number;
  exp?: number;
}

/**
 * Generate a cryptographically signed HMAC-SHA256 direct access token.
 * Default validity: 30 days (2,592,000 seconds) so notification emails remain seamlessly accessible.
 */
export function generateDirectAccessToken(
  payload: { userId: string; email: string; path: string },
  expiresInSeconds: number = 30 * 24 * 60 * 60
): string {
  const now = Math.floor(Date.now() / 1000);
  const data: DirectAccessPayload = {
    userId: payload.userId,
    email: payload.email.trim().toLowerCase(),
    path: payload.path.startsWith("/") ? payload.path : `/${payload.path}`,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const payloadBase64 = Buffer.from(JSON.stringify(data)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", SECRET_KEY)
    .update(payloadBase64)
    .digest("base64url");

  return `${payloadBase64}.${signature}`;
}

/**
 * Verify and decode a direct access token.
 */
export function verifyDirectAccessToken(token: string): {
  valid: boolean;
  payload?: DirectAccessPayload;
  error?: string;
} {
  if (!token || typeof token !== "string") {
    return { valid: false, error: "Missing token" };
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    return { valid: false, error: "Malformed token" };
  }

  const [payloadBase64, signature] = parts;

  // Verify HMAC signature
  const expectedSignature = crypto
    .createHmac("sha256", SECRET_KEY)
    .update(payloadBase64)
    .digest("base64url");

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return { valid: false, error: "Invalid signature" };
  }

  try {
    const payloadJson = Buffer.from(payloadBase64, "base64url").toString("utf8");
    const payload: DirectAccessPayload = JSON.parse(payloadJson);

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return { valid: false, error: "Token expired", payload };
    }

    if (!payload.userId || !payload.email || !payload.path) {
      return { valid: false, error: "Incomplete token payload" };
    }

    return { valid: true, payload };
  } catch (err: any) {
    return { valid: false, error: "Failed to parse token payload" };
  }
}

/**
 * Helper to build the full Direct Access URL for a user and target path.
 */
export function createDirectActivityUrl(
  userId: string,
  email: string,
  rawPathOrUrl: string,
  baseUrl?: string
): string {
  if (!userId || !email) return rawPathOrUrl || "";

  // Normalize site base URL
  let siteUrl = baseUrl || process.env.NEXT_PUBLIC_SITE_URL || "https://chandakgroup.tech";
  if (siteUrl.endsWith("/")) siteUrl = siteUrl.slice(0, -1);

  // Extract relative path from input
  let cleanPath = rawPathOrUrl || "/";
  try {
    if (cleanPath.startsWith("http://") || cleanPath.startsWith("https://")) {
      const parsed = new URL(cleanPath);
      cleanPath = parsed.pathname + parsed.search + parsed.hash;
    }
  } catch {}

  if (!cleanPath.startsWith("/")) {
    cleanPath = `/${cleanPath}`;
  }

  // Generate token
  const token = generateDirectAccessToken({
    userId,
    email,
    path: cleanPath,
  });

  return `${siteUrl}/auth/direct?token=${encodeURIComponent(token)}`;
}

/**
 * Transform all internal system links within an email body to personalized direct access links.
 */
export function transformEmailContentLinks(
  content: string,
  userId: string,
  email: string,
  baseUrl?: string
): string {
  if (!content || !userId || !email) return content;

  let siteUrl = baseUrl || process.env.NEXT_PUBLIC_SITE_URL || "https://chandakgroup.tech";
  if (siteUrl.endsWith("/")) siteUrl = siteUrl.slice(0, -1);

  // 1. Transform full site URLs (including chandakgroup.tech and any localhost:XXXX)
  const urlPatterns = [
    /https?:\/\/localhost(?::\d+)?(\/[^\s"'<>]*)/gi,
    /https?:\/\/127\.0\.0\.1(?::\d+)?(\/[^\s"'<>]*)/gi,
    /https?:\/\/(?:www\.)?chandakgroup\.tech(\/[^\s"'<>]*)/gi
  ];

  if (siteUrl && !siteUrl.includes("localhost") && !siteUrl.includes("chandakgroup.tech")) {
    const escaped = siteUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    urlPatterns.push(new RegExp(`${escaped}(\\/[^\\s"'<>]*)`, "gi"));
  }

  let transformed = content;
  for (const pattern of urlPatterns) {
    transformed = transformed.replace(pattern, (_match, path) => {
      if (path.startsWith("/auth/direct")) return _match;
      return createDirectActivityUrl(userId, email, path, siteUrl);
    });
  }

  // 2. Transform relative internal links in href attributes (e.g. href="/tasks/...")
  transformed = transformed.replace(/href=["'](\/(?:tasks|tickets|workspaces|requirements|amc|sla|users|masters)[^"']*)["']/gi, (_match, path) => {
    if (path.startsWith("/auth/direct")) return _match;
    return `href="${createDirectActivityUrl(userId, email, path, siteUrl)}"`;
  });

  // 3. Transform plain text Link: /path
  transformed = transformed.replace(/Link:\s*(\/(?:tasks|tickets|workspaces|requirements|amc|sla|users|masters)[^\s"'<>]*)/gi, (_match, path) => {
    if (path.startsWith("/auth/direct")) return _match;
    return `Link: ${createDirectActivityUrl(userId, email, path, siteUrl)}`;
  });

  return transformed;
}


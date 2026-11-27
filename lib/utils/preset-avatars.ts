/**
 * Local AI-stylized 3D character preset avatars (5 female + 10 male) hosted in /public/avatars/.
 * Zero external CDN dependencies (never blocked by CSP or corporate firewalls).
 */

export const FEMALE_AVATARS: string[] = [
  "/avatars/avatar-f1.jpg",
  "/avatars/avatar-f2.jpg",
  "/avatars/avatar-f3.jpg",
  "/avatars/avatar-f4.jpg",
  "/avatars/avatar-f5.jpg",
];

export const MALE_AVATARS: string[] = [
  "/avatars/avatar-m1.jpg",
  "/avatars/avatar-m2.jpg",
  "/avatars/avatar-m3.jpg",
  "/avatars/avatar-m4.jpg",
  "/avatars/avatar-m5.jpg",
  "/avatars/avatar-m6.jpg",
  "/avatars/avatar-m7.jpg",
  "/avatars/avatar-m8.jpg",
  "/avatars/avatar-m9.jpg",
  "/avatars/avatar-m10.jpg",
];

export const PRESET_AVATARS: string[] = [...FEMALE_AVATARS, ...MALE_AVATARS];

const INITIALS_PALETTES = [
  { bg: "#1e293b", fg: "#f8fafc" },
  { bg: "#312e81", fg: "#eef2ff" },
  { bg: "#064e3b", fg: "#ecfdf5" },
  { bg: "#7c2d12", fg: "#fff7ed" },
  { bg: "#581c87", fg: "#faf5ff" },
  { bg: "#0f766e", fg: "#f0fdfa" },
];

/** Generates a clean local SVG initials avatar data URI fallback for any user name. */
export function getInitialsAvatarUrl(name?: string | null): string {
  const parts = String(name || "User")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const initials =
    parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : (parts[0] || "U").slice(0, 2).toUpperCase();
  const hash = Array.from(name || "U").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const pal = INITIALS_PALETTES[hash % INITIALS_PALETTES.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="60" fill="${pal.bg}"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="${pal.fg}" font-family="system-ui,-apple-system,sans-serif" font-size="44" font-weight="600">${initials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

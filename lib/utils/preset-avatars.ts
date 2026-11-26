/**
 * Self-contained local SVG preset avatars & initials fallback.
 * Never depends on external CDNs (Unsplash / Dicebear) that can be blocked by CSP or firewalls.
 */

const AVATAR_PALETTES = [
  { bg: "#1e293b", fg: "#f8fafc", accent: "#38bdf8" },
  { bg: "#312e81", fg: "#eef2ff", accent: "#818cf8" },
  { bg: "#064e3b", fg: "#ecfdf5", accent: "#34d399" },
  { bg: "#7c2d12", fg: "#fff7ed", accent: "#fb923c" },
  { bg: "#581c87", fg: "#faf5ff", accent: "#c084fc" },
  { bg: "#0f766e", fg: "#f0fdfa", accent: "#2dd4bf" },
  { bg: "#881337", fg: "#fff1f2", accent: "#fb7185" },
  { bg: "#1e3a8a", fg: "#eff6ff", accent: "#60a5fa" },
  { bg: "#3f6212", fg: "#f7fee7", accent: "#a3e635" },
  { bg: "#78350f", fg: "#fffbeb", accent: "#fbbf24" },
  { bg: "#334155", fg: "#f8fafc", accent: "#94a3b8" },
  { bg: "#4c1d95", fg: "#f5f3ff", accent: "#a78bfa" },
];

function makePresetSvg({ bg, fg, accent }: { bg: string; fg: string; accent: string }): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="60" fill="${bg}"/><circle cx="60" cy="45" r="21" fill="${accent}" opacity="0.92"/><path d="M24 106c4-22 18-33 36-33s32 11 36 33" fill="${fg}" opacity="0.9"/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const PRESET_AVATARS: string[] = AVATAR_PALETTES.map(makePresetSvg);

/** Generates a clean local SVG initials avatar data URI for any user name. */
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
  const pal = AVATAR_PALETTES[hash % AVATAR_PALETTES.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="60" fill="${pal.bg}"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="${pal.fg}" font-family="system-ui,-apple-system,sans-serif" font-size="44" font-weight="600">${initials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

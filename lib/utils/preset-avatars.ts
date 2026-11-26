/**
 * Self-contained local illustrated human portrait avatars & initials fallback.
 * Zero external CDN dependencies (never blocked by CSP or corporate firewalls).
 */

interface AvatarSpec {
  bg: string;
  skin: string;
  hair: string;
  shirt: string;
  hairStyle: "short" | "parted" | "bob" | "bun" | "curly" | "long";
  glasses?: boolean;
  beard?: boolean;
}

const AVATAR_SPECS: AvatarSpec[] = [
  { bg: "#dbeafe", skin: "#f1c27d", hair: "#1e293b", shirt: "#2563eb", hairStyle: "short", glasses: true },
  { bg: "#fce7f3", skin: "#ffdbac", hair: "#451a03", shirt: "#db2777", hairStyle: "long" },
  { bg: "#dcfce7", skin: "#c68642", hair: "#0f172a", shirt: "#059669", hairStyle: "parted", beard: true },
  { bg: "#fef3c7", skin: "#e0ac69", hair: "#292524", shirt: "#d97706", hairStyle: "bob", glasses: true },
  { bg: "#ede9fe", skin: "#8d5524", hair: "#18181b", shirt: "#7c3aed", hairStyle: "curly" },
  { bg: "#ccfbf1", skin: "#f1c27d", hair: "#78350f", shirt: "#0d9488", hairStyle: "bun" },
  { bg: "#fee2e2", skin: "#ffdbac", hair: "#1c1917", shirt: "#e11d48", hairStyle: "parted", glasses: true, beard: true },
  { bg: "#e0e7ff", skin: "#c68642", hair: "#312e81", shirt: "#4f46e5", hairStyle: "long" },
  { bg: "#ecfccb", skin: "#e0ac69", hair: "#1e293b", shirt: "#65a30d", hairStyle: "short", beard: true },
  { bg: "#ffedd5", skin: "#f1c27d", hair: "#7c2d12", shirt: "#ea580c", hairStyle: "bob" },
  { bg: "#f1f5f9", skin: "#8d5524", hair: "#09090b", shirt: "#334155", hairStyle: "short", glasses: true },
  { bg: "#fae8ff", skin: "#ffdbac", hair: "#581c87", shirt: "#9333ea", hairStyle: "bun", glasses: true },
];

function renderHairBack(style: AvatarSpec["hairStyle"], hair: string): string {
  if (style === "long") return `<path d="M31 54c0-20 12-34 29-34s29 14 29 34v34H31V54z" fill="${hair}"/>`;
  if (style === "bob") return `<path d="M32 54c0-19 12-33 28-33s28 14 28 33v18H32V54z" fill="${hair}"/>`;
  if (style === "bun") return `<circle cx="60" cy="18" r="11" fill="${hair}"/><circle cx="60" cy="48" r="27" fill="${hair}"/>`;
  if (style === "curly") return `<circle cx="38" cy="40" r="13" fill="${hair}"/><circle cx="82" cy="40" r="13" fill="${hair}"/><circle cx="48" cy="27" r="14" fill="${hair}"/><circle cx="72" cy="27" r="14" fill="${hair}"/><circle cx="60" cy="24" r="14" fill="${hair}"/>`;
  return "";
}

function renderHairFront(style: AvatarSpec["hairStyle"], hair: string): string {
  if (style === "short") return `<path d="M36 48c0-16 10-26 24-26s24 10 24 26c-4-9-13-13-24-13s-20 4-24 13z" fill="${hair}"/>`;
  if (style === "parted") return `<path d="M36 50c0-17 11-28 25-28 13 0 23 10 23 26-6-8-14-11-22-9-9 2-17 1-26 11z" fill="${hair}"/>`;
  if (style === "bob" || style === "long") return `<path d="M36 48c2-15 11-24 24-24s22 9 24 24c-6-8-13-11-24-11s-18 3-24 11z" fill="${hair}"/>`;
  if (style === "bun") return `<path d="M37 47c2-14 11-22 23-22s21 8 23 22c-6-7-14-9-23-9s-17 2-23 9z" fill="${hair}"/>`;
  return "";
}

function makePortraitSvg(s: AvatarSpec): string {
  const hairBack = renderHairBack(s.hairStyle, s.hair);
  const hairFront = renderHairFront(s.hairStyle, s.hair);
  const glasses = s.glasses
    ? `<g stroke="#1e293b" stroke-width="2" fill="none"><rect x="42" y="48" width="14" height="10" rx="3"/><rect x="64" y="48" width="14" height="10" rx="3"/><line x1="56" y1="53" x2="64" y2="53"/></g>`
    : "";
  const beard = s.beard
    ? `<path d="M40 59c0 12 9 20 20 20s20-8 20-20c-3 6-10 9-20 9s-17-3-20-9z" fill="${s.hair}" opacity="0.88"/>`
    : "";

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">` +
    `<rect width="120" height="120" rx="60" fill="${s.bg}"/>` +
    hairBack +
    `<path d="M22 118c4-22 18-32 38-32s34 10 38 32" fill="${s.shirt}"/>` +
    `<rect x="52" y="72" width="16" height="16" rx="6" fill="${s.skin}"/>` +
    `<circle cx="37" cy="55" r="5" fill="${s.skin}"/><circle cx="83" cy="55" r="5" fill="${s.skin}"/>` +
    `<ellipse cx="60" cy="54" rx="22" ry="24" fill="${s.skin}"/>` +
    beard +
    `<circle cx="49" cy="53" r="2.6" fill="#1e293b"/><circle cx="71" cy="53" r="2.6" fill="#1e293b"/>` +
    `<path d="M53 65c3.5 3 10.5 3 14 0" stroke="#7c2d12" stroke-width="2.2" stroke-linecap="round" fill="none"/>` +
    glasses +
    hairFront +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const PRESET_AVATARS: string[] = AVATAR_SPECS.map(makePortraitSvg);

const INITIALS_PALETTES = [
  { bg: "#1e293b", fg: "#f8fafc" },
  { bg: "#312e81", fg: "#eef2ff" },
  { bg: "#064e3b", fg: "#ecfdf5" },
  { bg: "#7c2d12", fg: "#fff7ed" },
  { bg: "#581c87", fg: "#faf5ff" },
  { bg: "#0f766e", fg: "#f0fdfa" },
];

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
  const pal = INITIALS_PALETTES[hash % INITIALS_PALETTES.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="60" fill="${pal.bg}"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="${pal.fg}" font-family="system-ui,-apple-system,sans-serif" font-size="44" font-weight="600">${initials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

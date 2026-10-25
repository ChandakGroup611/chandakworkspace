/**
 * Shared by the server and the browser (no Node or DOM APIs here).
 */

const BRAND_ALIAS: Record<string, string> = { "maruti suzuki": "maruti", "mercedes benz": "mercedes", "land-rover": "land rover" };
const norm = (s?: string | null) => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** "Maruti Suzuki" + "Swift Dzire" → "maruti|swift dzire": one library picture per make + model. */
export function modelKey(make?: string | null, model?: string | null): string {
  let mk = norm(make);
  mk = BRAND_ALIAS[mk] || mk;
  let md = norm(model);
  for (const p of [norm(make), mk]) if (p && md.startsWith(p + " ")) md = md.slice(p.length + 1);
  return `${mk}|${md}`;
}

/* paint: the master stores a hex colour (or sometimes a name); pictures are made per colour family */
const PAINT: Record<string, [number, number, number]> = {
  white: [241, 243, 245], silver: [184, 190, 198], grey: [107, 114, 128], black: [31, 35, 40], red: [185, 28, 28], maroon: [127, 29, 29],
  blue: [29, 78, 216], green: [21, 128, 61], brown: [107, 66, 38], beige: [214, 199, 168], gold: [176, 141, 60], orange: [194, 65, 12], yellow: [202, 138, 4],
};
export function paintName(paint?: string | null): string | null {
  const p = (paint || "").trim().toLowerCase();
  if (!p) return null;
  const named = Object.keys(PAINT).find((k) => p.includes(k)) || (p.includes("gray") ? "grey" : p.includes("pearl") ? "white" : null);
  if (named) return named;
  if (!/^#[0-9a-f]{6}$/.test(p)) return null;
  const n = parseInt(p.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  let best = "silver", d = Infinity;
  for (const [name, [pr, pg, pb]] of Object.entries(PAINT)) {
    const dd = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
    if (dd < d) { d = dd; best = name; }
  }
  return best;
}
/** Library key for a model in a colour: "toyota|innova crysta#white" (AI pictures are made per colour). */
export const colourKey = (make?: string | null, model?: string | null, paint?: string | null) => `${modelKey(make, model)}#${paintName(paint) || "std"}`;

/**
 * Tidy a cut-out mask in place (size x size, 0–255): keep only the vehicle (the largest solid
 * region, plus parts inside its outline such as a wheel split off by a shadow), drop stray blobs
 * such as passers-by or fragments of other cars, and firm up soft edges.
 */
export function cleanMask(mask: Uint8Array | Uint8ClampedArray, width: number, height = width) {
  const n = width * height;
  const label = new Int32Array(n).fill(-1);
  const areas: number[] = [];
  const boxes: [number, number, number, number][] = [];
  const stack: number[] = [];
  for (let start = 0; start < n; start++) {
    if (label[start] !== -1 || mask[start] < 128) continue;
    const id = areas.length;
    let area = 0, x0 = width, y0 = height, x1 = 0, y1 = 0;
    label[start] = id; stack.push(start);
    while (stack.length) {
      const i = stack.pop()!;
      area++;
      const x = i % width, y = (i / width) | 0;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      if (x > 0) { const j = i - 1; if (label[j] === -1 && mask[j] >= 128) { label[j] = id; stack.push(j); } }
      if (x < width - 1) { const j = i + 1; if (label[j] === -1 && mask[j] >= 128) { label[j] = id; stack.push(j); } }
      if (y > 0) { const j = i - width; if (label[j] === -1 && mask[j] >= 128) { label[j] = id; stack.push(j); } }
      if (y < height - 1) { const j = i + width; if (label[j] === -1 && mask[j] >= 128) { label[j] = id; stack.push(j); } }
    }
    areas.push(area); boxes.push([x0, y0, x1, y1]);
  }
  if (!areas.length) return;
  let main = 0;
  for (let k = 1; k < areas.length; k++) if (areas[k] > areas[main]) main = k;
  // keep the main region plus every sizeable part (a car body can split into pieces where it
  // matches the background); drop only small stray blobs
  const keep = areas.map((a, k) => k === main || a >= areas[main] * 0.03);
  let [ux0, uy0, ux1, uy1] = boxes[main];
  areas.forEach((_, k) => { if (keep[k]) { const [x0, y0, x1, y1] = boxes[k]; ux0 = Math.min(ux0, x0); uy0 = Math.min(uy0, y0); ux1 = Math.max(ux1, x1); uy1 = Math.max(uy1, y1); } });
  // small pieces inside the vehicle's outline (e.g. a wheel split off by a shadow) stay too
  const padX = Math.max(2, Math.round(width * 0.006)), padY = Math.max(2, Math.round(height * 0.006));
  areas.forEach((a, k) => {
    if (keep[k]) return;
    const [x0, y0, x1, y1] = boxes[k];
    keep[k] = x0 >= ux0 - padX && x1 <= ux1 + padX && y0 >= uy0 - padY && y1 <= uy1 + padY && a > areas[main] * 0.002;
  });
  for (let i = 0; i < n; i++) {
    const l = label[i];
    if (l >= 0) { if (!keep[l]) mask[i] = 0; continue; }
    const x = i % width, y = (i / width) | 0;
    if (x < ux0 - padX || x > ux1 + padX || y < uy0 - padY || y > uy1 + padY) mask[i] = 0;
  }
  for (let i = 0; i < n; i++) {
    const v = mask[i];
    mask[i] = v <= 30 ? 0 : v >= 225 ? 255 : Math.round(((v - 30) / 195) * 255);
  }
}

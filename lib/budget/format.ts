// Display helpers. Every figure arrives calculated from the database views; these only format it.

const nf2 = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nf0 = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

export const PAISE_PER_CRORE = 1e9;
export const toCr = (paise: number | null | undefined) => (paise == null ? null : Number(paise) / PAISE_PER_CRORE);
export const num = (v: number | string | null | undefined) => (v == null || v === "" ? null : Number(v));
export const fmt = (v: number | string | null | undefined) => (num(v) == null ? "" : nf2.format(num(v)!));
export const fmtArea = (v: number | string | null | undefined) => (num(v) == null ? "" : nf0.format(num(v)!));
export const fmtPct = (v: number | string | null | undefined) => (num(v) == null ? "" : nf2.format(num(v)!) + "%");
export const fmtRupees = (paise: number) => nf2.format(paise / 100);
export const isNeg = (v: number | string | null | undefined) => (num(v) ?? 0) < -0.000001;

export function dmy(iso: string | null | undefined) {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}
export function monthName(iso: string) {
  return new Date(iso.slice(0, 7) + "-01T00:00:00").toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}
// Crore input value for an amount stored in paise.
export const inputCr = (paise: number | null) => (paise == null ? "" : String(+(paise / PAISE_PER_CRORE).toFixed(9)));

export function nextQuarterEnd(iso: string) {
  const d = new Date(iso + "T00:00:00");
  const m = d.getMonth() + 1;
  let y = d.getFullYear();
  let next = [3, 6, 9, 12].find((e) => e > m);
  if (!next) {
    next = 3;
    y += 1;
  }
  return `${y}-${String(next).padStart(2, "0")}-${String(new Date(y, next, 0).getDate()).padStart(2, "0")}`;
}

export const BUILDING_TYPES = [
  "Sales Building", "Society Building", "Rehab Building", "Common Infra", "MHADA Building",
  "Reservation Building", "Open Space Area / MCGM", "School / Other Building",
];

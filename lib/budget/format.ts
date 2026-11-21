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

/**
 * Formats a version number into user-friendly accounting terminology:
 * Version 1 = "Original Baseline Budget"
 * Version 2 = "Revision 1 (R2)"
 * Version 3 = "Revision 2 (R3)"
 */
export function versionTitle(versionNumber: number | null | undefined): string {
  if (versionNumber == null) return "Budget";
  if (versionNumber === 1) return "Original Baseline Budget";
  return `Revision ${versionNumber - 1} (R${versionNumber})`;
}

export function versionSubtitle(versionNumber: number | null | undefined): string {
  if (versionNumber == null) return "";
  if (versionNumber === 1) return "Initial project baseline budget";
  return `Revision ${versionNumber - 1} against original baseline`;
}

/**
 * Calculates Financial Year, Quarter, and date range from an ISO date string (YYYY-MM-DD)
 * and the project's FY start month (default: 4 for April in India).
 */
export function formatBudgetPeriod(isoDate: string | null | undefined, fyStartMonth: number = 4) {
  if (!isoDate) {
    return {
      fy: "Current FY",
      quarter: "—",
      range: "—",
      asOnFormatted: "—",
      label: "Annual Budget",
    };
  }

  const d = new Date(isoDate.slice(0, 10) + "T00:00:00");
  const year = d.getFullYear();
  const month = d.getMonth() + 1; // 1 to 12

  let fyStartYear = year;
  if (month < fyStartMonth) {
    fyStartYear = year - 1;
  }
  const fyEndYear = fyStartYear + 1;
  const startYearShort = String(fyStartYear);
  const endYearShort = String(fyEndYear).slice(-2);
  const fyString = `FY ${startYearShort}–${endYearShort}`;

  const offset = (month - fyStartMonth + 12) % 12; // 0 to 11
  const qNum = Math.floor(offset / 3) + 1; // 1, 2, 3, 4
  const quarterString = `Q${qNum}`;

  const [y, m, dayNum] = isoDate.slice(0, 10).split("-");
  const asOnFormatted = `${dayNum}/${m}/${y}`;
  const rangeStart = `01/${String(fyStartMonth).padStart(2, "0")}/${startYearShort}`;
  const lastDayOfPrevMonth = new Date(fyEndYear, (fyStartMonth - 1), 0).getDate();
  const endMonthPadded = String((fyStartMonth - 1 + 12) % 12 || 12).padStart(2, "0");
  const rangeEnd = `${lastDayOfPrevMonth}/${endMonthPadded}/${fyEndYear}`;

  return {
    fy: fyString,
    quarter: quarterString,
    range: `${rangeStart} – ${rangeEnd}`,
    asOnFormatted,
    label: `${fyString} · ${quarterString} (As on ${asOnFormatted})`,
  };
}

export const BUILDING_TYPES = [
  "Sales Building", "Society Building", "Rehab Building", "Common Infra", "MHADA Building",
  "Reservation Building", "Open Space Area / MCGM", "School / Other Building",
];

/** Areas a line's rate (₹ per sq ft) can apply to: keys of the version's areas, plus the net sale carpet area. */
export const RATE_BASES: [string, string][] = [
  ["eng_area", "Construction area (Engg)"], ["design_area", "Construction area (Design)"], ["total_carpet", "Total carpet area"],
  ["net_sale_carpet", "Net sale carpet area"], ["sold_area", "Sold area"], ["residential_area", "Residential area"],
  ["commercial_area", "Commercial area"], ["retail_area", "Retail area"], ["society_sale_area", "Society sale area"],
];

/**
 * Working Days & TAT Due Date Engine for Chandak Meet
 * Enforces Indian corporate work calendar (Mon-Sat, skipping Sundays & statutory holidays).
 */

export interface TATCalculationResult {
  dueDate: string;
  startDate: string;
  tatDays: number;
  nonWorkingDaysSkipped: number;
  skippedDates: string[];
}

export interface ReverseTATResult {
  tatDays: number;
  nonWorkingDaysSkipped: number;
}

// Default standard company holidays (can be augmented dynamically from DB)
const DEFAULT_HOLIDAYS = new Set([
  "2026-01-26", // Republic Day
  "2026-03-03", // Holi
  "2026-04-14", // Ambedkar Jayanti
  "2026-05-01", // Maharashtra Day
  "2026-08-15", // Independence Day
  "2026-09-14", // Ganesh Chaturthi
  "2026-10-02", // Gandhi Jayanti
  "2026-10-20", // Dussehra
  "2026-11-08", // Diwali Lakshmi Pujan
  "2026-11-09", // Diwali Balipratipada
  "2026-12-25", // Christmas
]);

/**
 * Checks whether a given Date is a working day (Mon-Sat, excluding holidays)
 */
export function isWorkingDay(
  date: Date,
  workingDays: number[] = [1, 2, 3, 4, 5, 6], // 0=Sun, 1=Mon, ..., 6=Sat
  holidays: Set<string> = DEFAULT_HOLIDAYS
): boolean {
  const dayOfWeek = date.getDay();
  if (!workingDays.includes(dayOfWeek)) {
    return false;
  }
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const dateStr = `${yyyy}-${mm}-${dd}`;
  if (holidays.has(dateStr)) {
    return false;
  }
  return true;
}

/**
 * Calculates due date given a start date and TAT in working days.
 */
export function calculateDueDateFromTAT(
  startDateStr: string,
  tatDays: number,
  workingDays: number[] = [1, 2, 3, 4, 5, 6],
  holidayList: string[] = []
): TATCalculationResult {
  const holidays = new Set([...DEFAULT_HOLIDAYS, ...holidayList]);
  const safeTat = Math.max(1, Math.floor(tatDays) || 1);

  // Parse start date in local date context
  const [sy, sm, sd] = startDateStr.split("-").map(Number);
  const curr = new Date(sy, sm - 1, sd, 12, 0, 0);

  const skippedDates: string[] = [];
  let workingDaysCounted = 0;

  // The start date itself counts as day 1 if it's a working day
  while (workingDaysCounted < safeTat) {
    if (isWorkingDay(curr, workingDays, holidays)) {
      workingDaysCounted++;
      if (workingDaysCounted === safeTat) {
        break;
      }
    } else {
      const yyyy = curr.getFullYear();
      const mm = String(curr.getMonth() + 1).padStart(2, "0");
      const dd = String(curr.getDate()).padStart(2, "0");
      skippedDates.push(`${yyyy}-${mm}-${dd}`);
    }
    curr.setDate(curr.getDate() + 1);
  }

  const yyyy = curr.getFullYear();
  const mm = String(curr.getMonth() + 1).padStart(2, "0");
  const dd = String(curr.getDate()).padStart(2, "0");
  const dueDate = `${yyyy}-${mm}-${dd}`;

  return {
    startDate: startDateStr,
    dueDate,
    tatDays: safeTat,
    nonWorkingDaysSkipped: skippedDates.length,
    skippedDates,
  };
}

/**
 * Calculates working days between start date and due date.
 */
export function calculateTATFromDates(
  startDateStr: string,
  dueDateStr: string,
  workingDays: number[] = [1, 2, 3, 4, 5, 6],
  holidayList: string[] = []
): ReverseTATResult {
  const holidays = new Set([...DEFAULT_HOLIDAYS, ...holidayList]);
  const [sy, sm, sd] = startDateStr.split("-").map(Number);
  const [ey, em, ed] = dueDateStr.split("-").map(Number);

  const start = new Date(sy, sm - 1, sd, 12, 0, 0);
  const end = new Date(ey, em - 1, ed, 12, 0, 0);

  if (end < start) {
    return { tatDays: 1, nonWorkingDaysSkipped: 0 };
  }

  let workingDaysCount = 0;
  let nonWorkingDaysSkipped = 0;
  const curr = new Date(start);

  while (curr <= end) {
    if (isWorkingDay(curr, workingDays, holidays)) {
      workingDaysCount++;
    } else {
      nonWorkingDaysSkipped++;
    }
    curr.setDate(curr.getDate() + 1);
  }

  return {
    tatDays: Math.max(1, workingDaysCount),
    nonWorkingDaysSkipped,
  };
}

/**
 * Formats YYYY-MM-DD into a human-readable string like "Thu, 29 Oct 2026"
 */
export function formatPrettyDate(dateStr: string): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d, 12, 0, 0);
  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

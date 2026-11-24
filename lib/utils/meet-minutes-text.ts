import type { MinutesReview } from "@/lib/actions/meet/review";

const IST = "Asia/Kolkata";
const due = (x: string | null) => (x ? new Date(`${String(x).slice(0, 10)}T12:00:00+05:30`).toLocaleDateString("en-IN", { timeZone: IST, day: "numeric", month: "short" }) : "—");

/**
 * The minutes as plain text, written like an email: shown on the minutes page ("Copy email")
 * and available to the "Minutes sent" email template as {{minutes_text}}.
 */
export function minutesAsText(review: MinutesReview, overview: string): string {
  const d = review.doc;
  const carried = review.points.filter((p) => p.carried);
  const next = review.nextSession
    ? new Date(review.nextSession.scheduledStart).toLocaleString("en-IN", { timeZone: IST, weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })
    : null;
  const present = d.attendance.filter((a) => a.status === "present" || a.status === "late");
  const away = d.attendance.filter((a) => a.status !== "present" && a.status !== "late");
  return [
    `Subject: Minutes of ${review.session.meetingTitle} – ${d.info.date}`,
    "",
    "Dear all,",
    "",
    `Please find below the minutes of ${review.session.meetingTitle}${review.session.meetingCode ? ` (${review.session.meetingCode})` : ""} held on ${d.info.date}, ${d.info.start}${d.info.end ? `–${d.info.end}` : ""} (${d.info.where}).`,
    "",
    `Attended (${present.length} of ${d.attendance.length}): ${present.map((a) => a.name).join(", ") || "—"}`,
    away.length ? `Not present: ${away.map((a) => `${a.name}${a.reason ? ` (${a.reason})` : ""}`).join(", ")}` : "",
    "",
    "SUMMARY",
    overview || "—",
    "",
    "DECISIONS",
    ...(d.decisions.length ? d.decisions.map((x, i) => `${i + 1}. ${x.text}${x.by ? ` (decided by ${x.by})` : ""}`) : ["None recorded."]),
    "",
    "ACTION ITEMS",
    ...(d.tasks.length ? d.tasks.map((t, i) => `${i + 1}. ${t.title} – ${t.owner || "owner to be assigned"}, by ${due(t.due)}`) : ["None."]),
    "",
    "OPEN POINTS",
    ...(carried.length ? carried.map((p) => `• ${p.code} ${p.title}${p.owner ? ` – ${p.owner}` : ""}`) : ["None."]),
    "",
    next ? `Next meeting: ${next}` : "",
    "",
    "Regards,",
    d.info.minuteTaker || d.info.organiser || "",
  ]
    .filter((l, i, a) => !(l === "" && a[i - 1] === ""))
    .join("\n");
}

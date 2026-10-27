/**
 * Native RFC 5545 iCalendar (.ics) generator for Chandak Meet
 * Generates standards-compliant calendar files for Outlook, Teams, Google Calendar, and Apple Calendar.
 */

export interface CalendarEventInput {
  uid: string;
  title: string;
  description?: string;
  location?: string;
  start: Date | string;
  end: Date | string;
  organizer?: {
    name: string;
    email: string;
  };
  attendees?: {
    name?: string;
    email?: string;
    role?: string;
  }[];
  sequence?: number;
  status?: "CONFIRMED" | "CANCELLED" | "TENTATIVE";
  url?: string;
}

function formatICSDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function escapeICS(str: string): string {
  if (!str) return "";
  return str
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\n|\r/g, "\\n");
}

export function generateICS(event: CalendarEventInput): string {
  const startDate = typeof event.start === "string" ? new Date(event.start) : event.start;
  const endDate = typeof event.end === "string" ? new Date(event.end) : event.end;
  const now = new Date();

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Chandak Group//Chandak Meet//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${formatICSDate(now)}`,
    `DTSTART:${formatICSDate(startDate)}`,
    `DTEND:${formatICSDate(endDate)}`,
    `SUMMARY:${escapeICS(event.title)}`,
    `STATUS:${event.status || "CONFIRMED"}`,
    `SEQUENCE:${event.sequence || 0}`,
  ];

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeICS(event.description)}`);
  }

  if (event.location) {
    lines.push(`LOCATION:${escapeICS(event.location)}`);
  }

  if (event.url) {
    lines.push(`URL:${escapeICS(event.url)}`);
  }

  if (event.organizer && event.organizer.email) {
    lines.push(`ORGANIZER;CN=${escapeICS(event.organizer.name || "Organizer")}:mailto:${event.organizer.email}`);
  }

  if (event.attendees && event.attendees.length > 0) {
    for (const att of event.attendees) {
      if (att.email) {
        lines.push(
          `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN=${escapeICS(
            att.name || att.email
          )}:mailto:${att.email}`
        );
      }
    }
  }

  lines.push("END:VEVENT");
  lines.push("END:VCALENDAR");

  return lines.join("\r\n");
}

/**
 * Chandak Meet emails: the events that can send an email, the people an email can go to, and the
 * placeholders a template can use. Shared by the Meet email editor, Settings › Communication and
 * the sender. Each event has at most one template (subject + body) and one list of recipients.
 */

export const MEET_EVENTS = [
  "Meeting created",
  "Reminder 1",
  "Reminder 2",
  "Reminder 3",
  "RSVP reminder",
  "Update requested",
  "Minutes sent",
  "Minutes not sent",
  "Point assigned",
  "Task assigned",
  "Point escalated",
  "Overdue",
] as const;

export type MeetEventName = (typeof MEET_EVENTS)[number];

export const REMINDER_EVENTS: MeetEventName[] = ["Reminder 1", "Reminder 2", "Reminder 3"];

export const MEET_RECIPIENTS = ["Organiser (creator)", "Chair", "Minute taker", "Everyone invited", "Point owner", "Task owner"] as const;

export type MeetRecipientRole = (typeof MEET_RECIPIENTS)[number];

/** What each event is, and who can sensibly receive it (the editor only offers these). */
export const MEET_EVENT_INFO: Record<MeetEventName, { when: string; roles: MeetRecipientRole[] }> = {
  "Meeting created": { when: "When a meeting is scheduled", roles: ["Organiser (creator)", "Chair", "Minute taker", "Everyone invited"] },
  "Reminder 1": { when: "Before the meeting, at the time you choose", roles: ["Organiser (creator)", "Chair", "Minute taker", "Everyone invited"] },
  "Reminder 2": { when: "Before the meeting, at the time you choose", roles: ["Organiser (creator)", "Chair", "Minute taker", "Everyone invited"] },
  "Reminder 3": { when: "Before the meeting, at the time you choose", roles: ["Organiser (creator)", "Chair", "Minute taker", "Everyone invited"] },
  "RSVP reminder": { when: "When the organiser chases people who haven't replied", roles: ["Everyone invited"] },
  "Update requested": { when: "About a day before, to owners of open points", roles: ["Point owner"] },
  "Minutes sent": { when: "When the minutes are approved and sent", roles: ["Organiser (creator)", "Chair", "Minute taker", "Everyone invited"] },
  "Minutes not sent": { when: "3 hours after a meeting ends, if the minutes haven't gone out", roles: ["Organiser (creator)", "Minute taker", "Chair"] },
  "Point assigned": { when: "When someone becomes the owner of a point", roles: ["Point owner", "Organiser (creator)"] },
  "Task assigned": { when: "When a task is given to someone", roles: ["Task owner", "Organiser (creator)"] },
  "Point escalated": { when: "When a point is carried forward 3 times", roles: ["Organiser (creator)", "Chair", "Point owner"] },
  Overdue: { when: "The day a point or task passes its due date", roles: ["Point owner", "Task owner", "Chair", "Organiser (creator)"] },
};

/** Reminder timings offered in the editor, in minutes before the meeting starts. */
export const REMINDER_TIMINGS: { minutes: number; label: string }[] = [
  { minutes: 15, label: "15 minutes before" },
  { minutes: 30, label: "30 minutes before" },
  { minutes: 60, label: "1 hour before" },
  { minutes: 120, label: "2 hours before" },
  { minutes: 240, label: "4 hours before" },
  { minutes: 1440, label: "1 day before" },
  { minutes: 2880, label: "2 days before" },
  { minutes: 10080, label: "1 week before" },
];

/** Reminder timing is kept on the rule as "BEFORE:<minutes>". */
export const reminderTrigger = (minutes: number) => `BEFORE:${Math.round(minutes)}`;
export const parseReminderTrigger = (v?: string | null): number | null => {
  const m = String(v || "").match(/^BEFORE:(\d{1,6})$/);
  return m ? Number(m[1]) : null;
};

export const MEET_MERGE_TAGS = [
  "recipient_name",
  "meeting_title",
  "meeting_code",
  "session_code",
  "start_time",
  "room",
  "join_link",
  "link",
  "organiser_name",
  "point_code",
  "point_title",
  "points_list",
  "task_code",
  "task_title",
  "due_date",
  "carry_count",
];

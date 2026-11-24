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
  "Room declined",
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
  "Room declined": { when: "When a room's Outlook calendar turns down the booking", roles: ["Organiser (creator)", "Minute taker", "Chair"] },
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

/**
 * Suggested wording for each email. Never sent on its own: the admin chooses to start from it in
 * the email editor (or adds it to all unwritten emails, which stay switched off until reviewed).
 */
export const MEET_EMAIL_STARTERS: Record<MeetEventName, { subject: string; body: string; recipients: MeetRecipientRole[]; timingMinutes?: number }> = {
  "Meeting created": {
    subject: "Invitation: {{meeting_title}} on {{start_time}}",
    body: "Dear {{recipient_name}},\n\nYou are invited to {{meeting_title}} ({{meeting_code}}).\n\nWhen: {{start_time}}\nWhere: {{room}}\nTeams: {{join_link}}\n\nThe agenda, open points and notes are in Chandak Meet:\n{{link}}\n\nRegards,\n{{organiser_name}}",
    recipients: ["Everyone invited"],
  },
  "Reminder 1": {
    subject: "Tomorrow: {{meeting_title}} at {{start_time}}",
    body: "Dear {{recipient_name}},\n\nA reminder that {{meeting_title}} is on {{start_time}}.\nWhere: {{room}}\nTeams: {{join_link}}\n\nPlease update your open points before the meeting:\n{{link}}\n\nRegards,\nChandak Meet",
    recipients: ["Everyone invited"],
    timingMinutes: 1440,
  },
  "Reminder 2": {
    subject: "In 1 hour: {{meeting_title}}",
    body: "Dear {{recipient_name}},\n\n{{meeting_title}} starts at {{start_time}}.\nJoin on Teams: {{join_link}}\nRoom: {{room}}\n\n{{link}}",
    recipients: ["Everyone invited"],
    timingMinutes: 60,
  },
  "Reminder 3": {
    subject: "Starting soon: {{meeting_title}}",
    body: "Dear {{recipient_name}},\n\n{{meeting_title}} starts in 15 minutes.\nJoin: {{join_link}}",
    recipients: ["Everyone invited"],
    timingMinutes: 15,
  },
  "RSVP reminder": {
    subject: "Please reply: {{meeting_title}} on {{start_time}}",
    body: "Dear {{recipient_name}},\n\nWe haven't had your reply for {{meeting_title}} on {{start_time}}. Please let us know if you can attend:\n{{link}}\n\nRegards,\n{{organiser_name}}",
    recipients: ["Everyone invited"],
  },
  "Update requested": {
    subject: "Update needed before {{meeting_title}}",
    body: "Dear {{recipient_name}},\n\n{{meeting_title}} is on {{start_time}}. Please send a one-line update on your open points so the meeting can start from where things stand:\n\n{{points_list}}\n\nRegards,\nChandak Meet",
    recipients: ["Point owner"],
  },
  "Minutes sent": {
    subject: "Minutes: {{meeting_title}} ({{session_code}})",
    body: "Dear {{recipient_name}},\n\nThe minutes of {{meeting_title}} are ready, with decisions, open points and who does what by when:\n{{link}}\n\nRegards,\n{{organiser_name}}",
    recipients: ["Everyone invited"],
  },
  "Minutes not sent": {
    subject: "Minutes not sent yet: {{meeting_title}}",
    body: "Dear {{recipient_name}},\n\nThe minutes for {{meeting_title}} ({{session_code}}) are drafted but haven't been sent. Review and send them here:\n{{link}}\n\nChandak Meet",
    recipients: ["Organiser (creator)", "Minute taker"],
  },
  "Point assigned": {
    subject: "You own {{point_code}}: {{point_title}}",
    body: "Dear {{recipient_name}},\n\nYou are now the owner of {{point_code}}: {{point_title}}.\nDue: {{due_date}}\n\nOpen it here:\n{{link}}\n\nChandak Meet",
    recipients: ["Point owner"],
  },
  "Task assigned": {
    subject: "New task {{task_code}}: {{task_title}}",
    body: "Dear {{recipient_name}},\n\nYou have a new task from {{meeting_title}}:\n{{task_code}} {{task_title}}\nDue: {{due_date}}\n\n{{link}}\n\nChandak Meet",
    recipients: ["Task owner"],
  },
  "Point escalated": {
    subject: "Carried {{carry_count}} times: {{point_code}} {{point_title}}",
    body: "Dear {{recipient_name}},\n\n{{point_code}} {{point_title}} in {{meeting_title}} has now been carried forward {{carry_count}} times without closing. Please review it:\n{{link}}\n\nChandak Meet",
    recipients: ["Organiser (creator)", "Chair"],
  },
  Overdue: {
    subject: "Overdue: {{point_code}}{{task_code}} {{point_title}}{{task_title}}",
    body: "Dear {{recipient_name}},\n\nThis item from {{meeting_title}} was due on {{due_date}} and is still open:\n{{point_code}}{{task_code}} {{point_title}}{{task_title}}\n\nPlease update it or ask for a new date:\n{{link}}\n\nChandak Meet",
    recipients: ["Point owner", "Task owner"],
  },
  "Room declined": {
    subject: "Room not available: {{room}} for {{meeting_title}}",
    body: "Dear {{recipient_name}},\n\n{{room}} turned down the booking for {{meeting_title}} on {{start_time}}; it is probably taken at that time. Please pick another room:\n{{link}}\n\nChandak Meet",
    recipients: ["Organiser (creator)"],
  },
};

/** Chandak Meet email events, roles and merge tags (shared by Settings › Communication and the sender). */

export const MEET_EVENTS = [
  "Invited",
  "RSVP reminder",
  "Reminder (1 day before)",
  "Reminder (1 hour before)",
  "Update requested",
  "Minutes sent",
  "Minutes not sent",
  "Point assigned",
  "Task assigned",
  "Point escalated",
  "Overdue",
] as const;

export const MEET_RECIPIENTS = ["Attendees", "Organiser", "Chair", "Minute taker", "Point owner", "Task owner"] as const;

export const MEET_MERGE_TAGS = [
  "recipient_name",
  "meeting_title",
  "meeting_code",
  "session_code",
  "start_time",
  "room",
  "join_link",
  "link",
  "point_code",
  "point_title",
  "points_list",
  "task_code",
  "task_title",
  "due_date",
  "carry_count",
];

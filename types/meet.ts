// ==============================================================================
// Chandak Meet - TypeScript Definitions
// Derived from CHANDAK_WORKSPACE_MEET_COMPLETE_SPEC.md (Parts A, B, C)
// ==============================================================================

export type MeetingMode = 'in_person' | 'online' | 'hybrid';
export type VideoProvider = 'none' | 'google_meet' | 'teams' | 'zoom' | 'builtin';
export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom';
export type MeetingStatus = 'active' | 'paused' | 'archived';

export type SessionStatus =
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'mom_draft'
  | 'mom_pending_approval'
  | 'mom_published'
  | 'cancelled';

export type MemberRole =
  | 'organizer'
  | 'co_organizer'
  | 'chair'
  | 'minute_taker'
  | 'required'
  | 'optional'
  | 'guest';

export type AttendanceStatus =
  | 'present'
  | 'late'
  | 'absent'
  | 'excused'
  | 'left_early';

export type InviteStatus = 'invited' | 'accepted' | 'declined' | 'tentative';

export type PointType =
  | 'discussion'
  | 'decision'
  | 'action'
  | 'issue'
  | 'information'
  | 'risk';

export type PointPriority = 'low' | 'medium' | 'high' | 'critical';

export type PointStatus =
  | 'open'
  | 'in_progress'
  | 'on_hold'
  | 'closed'
  | 'dropped'
  | 'reopened';

export type TaskStatus =
  | 'not_started'
  | 'in_progress'
  | 'on_hold'
  | 'completed'
  | 'cancelled';

export type DecisionStatus = 'active' | 'superseded' | 'revoked';

export interface MeetingType {
  id: string;
  name: string;
  color: string;
  is_board_mode: boolean;
  sort_order: number;
  is_active: boolean;
}

export interface PointCategory {
  id: string;
  name: string;
  default_tat_days: number;
  department_id?: string | null;
  is_active: boolean;
}

export interface MeetingRoom {
  id: string;
  name: string;
  location: string;
  capacity: number;
  facilities?: {
    projector?: boolean;
    video_conferencing?: boolean;
    whiteboard?: boolean;
  } | null;
  show_subject?: boolean;
  display_type?: string;
  m365_email?: string;
  is_active: boolean;
}

export interface MeetingTemplate {
  id: string;
  name: string;
  description?: string | null;
  meeting_type_id?: string | null;
  default_duration: number;
  default_agenda?: any[];
  agenda_items: {
    title: string;
    planned_minutes: number;
    description?: string;
  }[];
  is_active: boolean;
}

export interface MeetingMember {
  id: string;
  meeting_id: string;
  user_id?: string | null;
  role: MemberRole;
  guest_name?: string | null;
  guest_email?: string | null;
  guest_phone?: string | null;
  user?: {
    id: string;
    full_name: string;
    email: string;
    user_code?: string;
    profile_photo?: string | null;
  } | null;
}

export interface MeetingSeries {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  company_id?: string | null;
  department_id?: string | null;
  meeting_type_id: string;
  template_id?: string | null;
  organizer_id: string;
  chair_id?: string | null;
  default_minute_taker_id?: string | null;
  mode: MeetingMode;
  room_id?: string | null;
  venue_text?: string | null;
  video_provider: VideoProvider;
  video_link?: string | null;
  default_start_time: string;
  default_duration_minutes: number;
  recurrence: RecurrenceType;
  recurrence_rule?: string | null;
  allow_attendees_add_points: boolean;
  is_confidential: boolean;
  requires_mom_approval: boolean;
  pre_update_enabled: boolean;
  project_id?: string | null;
  project?: {
    id: string;
    name: string;
    code: string;
  } | null;
  status: MeetingStatus;
  created_at: string;
  organizer?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
  meeting_type?: MeetingType | null;
  room?: MeetingRoom | null;
  department?: {
    id: string;
    name: string;
  } | null;
  members?: MeetingMember[];
  sessions_count?: number;
  open_points_count?: number;
}

export interface MeetingSession {
  id: string;
  meeting_id: string;
  session_no: number;
  code: string;
  scheduled_start: string;
  scheduled_end: string;
  actual_start?: string | null;
  actual_end?: string | null;
  room_id?: string | null;
  room?: {
    id: string;
    name: string;
    location?: string;
  } | null;
  video_link?: string | null;
  minute_taker_id?: string | null;
  status: SessionStatus;
  previous_session_id?: string | null;
  summary_notes?: string | null;
  quorum_required: number;
  quorum_met: boolean;
  cancel_reason?: string | null;
  reschedule_count: number;
  mom_version: number;
  mom_published_at?: string | null;
  effectiveness_score: number;
  created_at: string;
  meeting?: MeetingSeries | null;
  minute_taker?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
  attendees?: SessionAttendee[];
  agenda_items?: AgendaItem[];
  points_count?: number;
  closed_points_count?: number;
}

export interface SessionAttendee {
  id: string;
  session_id: string;
  user_id?: string | null;
  guest_name?: string | null;
  guest_email?: string | null;
  role: MemberRole;
  invite_status: InviteStatus;
  attendance: AttendanceStatus;
  check_in_at?: string | null;
  check_in_method?: string;
  late_minutes?: number;
  left_at?: string | null;
  user?: {
    id: string;
    full_name: string;
    email: string;
    profile_photo?: string | null;
  } | null;
}

export interface AgendaItem {
  id: string;
  session_id: string;
  title: string;
  description?: string | null;
  presenter_id?: string | null;
  planned_minutes: number;
  actual_minutes: number;
  sort_order: number;
  status: 'pending' | 'in_progress' | 'discussed' | 'deferred';
  presenter?: {
    id: string;
    full_name: string;
  } | null;
}

export interface MeetingPoint {
  id: string;
  code: string;
  meeting_id: string;
  origin_session_id: string;
  current_session_id: string;
  agenda_item_id?: string | null;
  title: string;
  description?: string | null;
  point_type: PointType;
  category_id?: string | null;
  department_id?: string | null;
  priority: PointPriority;
  owner_id?: string | null;
  raised_by_id?: string | null;
  tat_days: number;
  due_date: string;
  status: PointStatus;
  progress_percent: number;
  closure_remarks?: string | null;
  closed_at?: string | null;
  closed_by?: string | null;
  carry_forward_count: number;
  is_backup: boolean;
  is_confidential: boolean;
  escalation_level: number;
  sort_order: number;
  project_id?: string | null;
  milestone_name?: string | null;
  project?: {
    id: string;
    name: string;
    code: string;
  } | null;
  created_at: string;
  owner?: {
    id: string;
    full_name: string;
    email: string;
    profile_photo?: string | null;
  } | null;
  raised_by?: {
    id: string;
    full_name: string;
  } | null;
  category?: PointCategory | null;
  department?: {
    id: string;
    name: string;
  } | null;
  tasks?: MeetingTask[];
  meeting?: {
    id: string;
    title: string;
    code: string;
  } | null;
  latest_pre_update?: PreMeetingUpdate | null;
}

export interface MeetingTask {
  id: string;
  code: string;
  point_id?: string | null;
  session_id?: string | null;
  parent_task_id?: string | null;
  project_id?: string | null;
  milestone_name?: string | null;
  project?: {
    id: string;
    name: string;
    code: string;
  } | null;
  title: string;
  description?: string | null;
  owner_id?: string | null;
  priority: PointPriority;
  tat_days: number;
  start_date: string;
  due_date: string;
  revised_due_date?: string | null;
  status: TaskStatus;
  progress_percent: number;
  completed_at?: string | null;
  tat_result?: 'within_tat' | 'breached' | null;
  delay_days: number;
  completion_remarks?: string | null;
  requires_verification: boolean;
  verified_by?: string | null;
  verified_at?: string | null;
  created_at: string;
  owner?: {
    id: string;
    full_name: string;
    email: string;
    profile_photo?: string | null;
  } | null;
  checklist?: TaskChecklistItem[];
  point?: {
    id: string;
    title: string;
    code: string;
    meeting_id: string;
  } | null;
}

export interface TaskChecklistItem {
  id: string;
  task_id: string;
  text: string;
  is_done: boolean;
  done_by?: string | null;
  done_at?: string | null;
  sort_order: number;
}

export interface TatExtension {
  id: string;
  entity_type: 'task' | 'point';
  entity_id: string;
  requested_by: string;
  old_due_date: string;
  requested_due_date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  decided_by?: string | null;
  decided_at?: string | null;
  remarks?: string | null;
  created_at: string;
  requester?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
}

export interface MeetingDecision {
  id: string;
  code: string;
  session_id: string;
  point_id?: string | null;
  text: string;
  decided_by: string;
  decided_at: string;
  effective_from: string;
  review_date?: string | null;
  status: DecisionStatus;
  superseded_by_id?: string | null;
  tags: string[];
  created_at: string;
  session?: {
    id: string;
    code: string;
    meeting_id: string;
    meeting?: {
      id: string;
      title: string;
    } | null;
  } | null;
  point?: {
    id: string;
    code: string;
    title: string;
  } | null;
}

export interface PreMeetingUpdate {
  id: string;
  session_id: string;
  point_id?: string | null;
  user_id: string;
  status_proposed?: string | null;
  progress_proposed?: number | null;
  text: string;
  channel: string;
  submitted_at: string;
  user?: {
    id: string;
    full_name: string;
  } | null;
}

export interface MeetingMoMVersion {
  id: string;
  session_id: string;
  version: number;
  snapshot: any;
  pdf_file_url?: string | null;
  status: 'draft' | 'pending_approval' | 'approved' | 'published';
  approved_by?: string | null;
  approved_at?: string | null;
  created_at: string;
}

export interface MeetDashboardKPIs {
  meetingsThisWeek: number;
  openPoints: number;
  openTasks: number;
  overdueTasks: number;
  tatCompliancePercent: number;
  repeatedlyCarriedPoints: number;
  pendingMoMApprovals: number;
  myPendingActions: number;
  upcomingSessions: MeetingSession[];
  myOpenItems: (MeetingPoint | MeetingTask)[];
  pointsByStatus: { status: string; count: number; color: string }[];
  overdueAgeing: { bucket: string; count: number }[];
}

export type NoteKind = 'session' | 'personal';
export type NoteVisibility = 'meeting' | 'private' | 'shared';
export type NoteBlockType = 'text' | 'todo' | 'heading' | 'addendum';

export interface MeetNote {
  id: string;
  kind: NoteKind;
  session_id?: string | null;
  meeting_id?: string | null;
  owner_id?: string | null;
  title: string;
  visibility: NoteVisibility;
  pinned: boolean;
  tags: string[];
  locked_at?: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  blocks?: MeetNoteBlock[];
  open_loops_count?: number;
  session?: {
    id: string;
    code: string;
    session_no: number;
    meeting?: {
      id: string;
      title: string;
      code: string;
    } | null;
  } | null;
  owner?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
}

export interface MeetNoteBlock {
  id: string;
  note_id: string;
  position: number;
  type: NoteBlockType;
  text: string;
  done: boolean;
  author_id?: string | null;
  point_id?: string | null;
  linked_type?: 'point' | 'task' | 'decision' | null;
  linked_id?: string | null;
  not_action: boolean;
  deleted_at?: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
  point?: {
    id: string;
    code: string;
    title: string;
  } | null;
  linked_item?: {
    code: string;
    title: string;
    status: string;
  } | null;
}

export type RSVPResponse = 'pending' | 'accepted' | 'tentative' | 'declined' | 'proposed';

export interface MeetInvitation {
  id: string;
  session_id: string;
  user_id: string;
  response: RSVPResponse;
  responded_at?: string | null;
  note?: string | null;
  delegate_user_id?: string | null;
  proposed_start?: string | null;
  channel: string;
  reminder_count: number;
  user?: {
    id: string;
    full_name: string;
    email: string;
    profile_photo?: string | null;
  } | null;
  delegate?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
}

export interface MeetAIMinutes {
  id: string;
  session_id: string;
  version: number;
  overview: string;
  items_json: {
    point_id: string;
    point_code: string;
    title: string;
    text: string;
    sources: string[];
    status?: string;
    carry_forward?: boolean;
    tasks?: { title: string; owner: string; due_date: string }[];
  }[];
  model: string;
  mode: 'review' | 'auto_send' | 'off';
  approved_by?: string | null;
  approved_at?: string | null;
  sent_at?: string | null;
  created_at: string;
}

export interface MeetSLAPolicy {
  id: string;
  name: string;
  applies_to_json: any;
  time_limit_hours: number;
  time_limit_unit: string;
  reminders_json: any;
  warning_percent: number;
  escalation_steps_json: { level: number; offset_days: number; role: string }[];
  channels: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MeetSLAInstance {
  id: string;
  item_type: 'point' | 'task' | 'session' | 'invite' | 'mom';
  item_id: string;
  policy_id: string;
  start_at: string;
  due_at: string;
  state: 'ok' | 'warning' | 'breached' | 'met';
  current_level: number;
  escalated_to_id?: string | null;
  escalated_at?: string | null;
  next_check_at?: string | null;
  acknowledged_at?: string | null;
  acknowledged_by?: string | null;
  delay_working_hours: number;
  policy?: MeetSLAPolicy | null;
  escalated_to?: {
    id: string;
    full_name: string;
  } | null;
}

export interface MeetNotificationTemplate {
  id: string;
  module_key: string;
  key: string;
  name: string;
  event_key: string;
  channel: string;
  language: string;
  subject: string;
  body: string;
  attach_mom: boolean;
  version: number;
  is_active: boolean;
  wa_template_name?: string | null;
  wa_status?: string | null;
  updated_at: string;
}

export interface MeetRoomBooking {
  id: string;
  session_id?: string | null;
  room_id: string;
  start_at: string;
  end_at: string;
  status: 'pending' | 'confirmed' | 'tentative' | 'declined' | 'checked_in' | 'released' | 'ended' | 'cancelled';
  external_event_id?: string | null;
  ical_uid?: string | null;
  teams_join_url?: string | null;
  booked_by?: string | null;
  approved_by?: string | null;
  checked_in_at?: string | null;
  released_at?: string | null;
  room?: MeetingRoom | null;
  booked_by_user?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
  session?: {
    id: string;
    code: string;
    scheduled_start: string;
    scheduled_end: string;
    meeting?: {
      id: string;
      title: string;
      code: string;
      organizer?: {
        id: string;
        full_name: string;
      } | null;
    } | null;
  } | null;
}

export interface MeetResourcePermission {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
}

export type MeetRoleMatrix = Record<string, Record<string, MeetResourcePermission>>;

export const MEET_RESOURCES = [
  { key: "meetings", label: "Meetings & Schedules", description: "Schedule meetings, invite participants, update series" },
  { key: "sessions", label: "Live Sessions & Clocks", description: "Start live session, run agenda timer, conclude meetings" },
  { key: "agenda_points", label: "Discussion Points & Agendas", description: "Create discussion points, reorder agenda, carry-over items" },
  { key: "mom", label: "Minutes of Meeting (MoM)", description: "Draft minutes, publish signed MoM, distribute executive summary" },
  { key: "tasks", label: "Action Items & Tasks", description: "Assign tasks with statutory working-days TAT, track checklist" },
  { key: "extensions", label: "TAT Extensions & Approvals", description: "Request due date extension, approve or reject revisions" },
  { key: "decisions", label: "Decisions Register", description: "Record official business decisions, ratify policy resolutions" },
  { key: "notes", label: "Meeting Notes & Scratchpad", description: "Private and shared scratchpads, meeting takeaways" },
  { key: "rooms", label: "Meeting Rooms & Kiosk Displays", description: "Configure conference rooms, tablet displays, VC equipment" },
  { key: "governance", label: "SLA Rules & Notification Templates", description: "Design mail templates, SLA breach alerts, working calendar" },
];

export const MEET_ROLES = [
  { key: "meet_admin", label: "Meet Administrator", badge: "Super Admin", description: "Full control over module configuration, masters, and governance" },
  { key: "dept_head", label: "Department Head", badge: "Executive", description: "Oversees department meetings, approves MoMs, verifies tasks" },
  { key: "chair", label: "Meeting Organizer / Chair", badge: "Organizer", description: "Coordinates sessions, manages attendees, drives agenda" },
  { key: "minute_taker", label: "Minute Taker / Secretary", badge: "Secretary", description: "Records discussions, timestamps decisions, logs action items" },
  { key: "meet_user", label: "Meet User (Standard)", badge: "Participant", description: "Attends meetings, executes assigned action items, takes notes" },
  { key: "guest", label: "External Guest / Auditor", badge: "Restricted", description: "Read-only access to published MoM and assigned action items" },
];

export const DEFAULT_MEET_ROLE_MATRIX: MeetRoleMatrix = {
  meet_admin: {
    meetings: { create: true, read: true, update: true, delete: true },
    sessions: { create: true, read: true, update: true, delete: true },
    agenda_points: { create: true, read: true, update: true, delete: true },
    mom: { create: true, read: true, update: true, delete: true },
    tasks: { create: true, read: true, update: true, delete: true },
    extensions: { create: true, read: true, update: true, delete: true },
    decisions: { create: true, read: true, update: true, delete: true },
    notes: { create: true, read: true, update: true, delete: true },
    rooms: { create: true, read: true, update: true, delete: true },
    governance: { create: true, read: true, update: true, delete: true },
  },
  dept_head: {
    meetings: { create: true, read: true, update: true, delete: false },
    sessions: { create: true, read: true, update: true, delete: false },
    agenda_points: { create: true, read: true, update: true, delete: false },
    mom: { create: true, read: true, update: true, delete: false },
    tasks: { create: true, read: true, update: true, delete: false },
    extensions: { create: true, read: true, update: true, delete: false },
    decisions: { create: true, read: true, update: true, delete: false },
    notes: { create: true, read: true, update: true, delete: true },
    rooms: { create: false, read: true, update: false, delete: false },
    governance: { create: false, read: true, update: false, delete: false },
  },
  chair: {
    meetings: { create: true, read: true, update: true, delete: true },
    sessions: { create: true, read: true, update: true, delete: false },
    agenda_points: { create: true, read: true, update: true, delete: true },
    mom: { create: true, read: true, update: true, delete: false },
    tasks: { create: true, read: true, update: true, delete: true },
    extensions: { create: true, read: true, update: true, delete: false },
    decisions: { create: true, read: true, update: true, delete: false },
    notes: { create: true, read: true, update: true, delete: true },
    rooms: { create: false, read: true, update: false, delete: false },
    governance: { create: false, read: true, update: false, delete: false },
  },
  minute_taker: {
    meetings: { create: false, read: true, update: false, delete: false },
    sessions: { create: false, read: true, update: true, delete: false },
    agenda_points: { create: true, read: true, update: true, delete: false },
    mom: { create: true, read: true, update: true, delete: false },
    tasks: { create: true, read: true, update: true, delete: false },
    extensions: { create: false, read: true, update: false, delete: false },
    decisions: { create: true, read: true, update: true, delete: false },
    notes: { create: true, read: true, update: true, delete: true },
    rooms: { create: false, read: true, update: false, delete: false },
    governance: { create: false, read: false, update: false, delete: false },
  },
  meet_user: {
    meetings: { create: true, read: true, update: false, delete: false },
    sessions: { create: false, read: true, update: false, delete: false },
    agenda_points: { create: true, read: true, update: false, delete: false },
    mom: { create: false, read: true, update: false, delete: false },
    tasks: { create: true, read: true, update: true, delete: false },
    extensions: { create: true, read: true, update: false, delete: false },
    decisions: { create: false, read: true, update: false, delete: false },
    notes: { create: true, read: true, update: true, delete: true },
    rooms: { create: false, read: true, update: false, delete: false },
    governance: { create: false, read: false, update: false, delete: false },
  },
  guest: {
    meetings: { create: false, read: true, update: false, delete: false },
    sessions: { create: false, read: true, update: false, delete: false },
    agenda_points: { create: false, read: true, update: false, delete: false },
    mom: { create: false, read: true, update: false, delete: false },
    tasks: { create: false, read: true, update: false, delete: false },
    extensions: { create: false, read: false, update: false, delete: false },
    decisions: { create: false, read: true, update: false, delete: false },
    notes: { create: false, read: false, update: false, delete: false },
    rooms: { create: false, read: false, update: false, delete: false },
    governance: { create: false, read: false, update: false, delete: false },
  },
};



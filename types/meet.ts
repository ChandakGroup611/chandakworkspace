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
  is_active: boolean;
}

export interface MeetingTemplate {
  id: string;
  name: string;
  description?: string | null;
  meeting_type_id?: string | null;
  default_duration: number;
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
  point_id: string;
  session_id?: string | null;
  parent_task_id?: string | null;
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

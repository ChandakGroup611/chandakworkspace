# Chandak Meet Gap Audit Checklist

**Specification Reference:** `CHANDAK_WORKSPACE_MEET_FINAL_SPEC.md` (v6.0 FINAL · 25 Oct 2026)  
**Target Repository:** `ChandakGroup611/chandakworkspace`  
**Audit Date:** 26 Oct 2026  
**Status Legend:**
- ✅ **Done and working**
- 🟡 **Partly implemented** (gaps noted)
- ❌ **Missing**

---

## D1. Feature Audit Checklist

### D1.1 Meetings
| # | Feature | Where the user finds it | Status | Audit Notes |
|---|---|---|---|---|
| M1 | Create meeting (title, type, department, organizer, chair, minute taker, date, time, duration, mode, room, video link, attendees, repeat) | "+ New meeting" on Home and Meetings; "+ Create" in the top bar | ✅ | Implemented in `app/meet/meetings/new/CreateMeetingClientForm.tsx` & `lib/actions/meet/meetings.ts`. |
| M2 | Create from template (agenda + members pre-filled) | Template picker at the top of the Create meeting form | ✅ | Implemented via template selector pre-filling agenda items and members in create form. |
| M3 | Recurring series creates the next session automatically | Meeting › Sessions tab | ✅ | `endSession` in `lib/actions/meet/sessions.ts` computes next recurrence date and inserts session S-(N+1). |
| M4 | Invite email with calendar file (.ics) to attendees | Sent on save | 🟡 | Basic notification logged on session creation, but native RFC 5545 .ics calendar attachment generator needs standardization. |
| M5 | Agenda items with presenter and minutes; reorder; agenda item → point | Session page › Agenda | ✅ | Agenda items listed with planned duration, live reordering and point linkage supported. |
| M6 | Start meeting → Live mode; attendance (present, late, absent) | Session page "Start in Live mode" | ✅ | Live meeting runner in `app/meet/live/[sessionId]/LiveMeetingClient.tsx` with attendance toggles. |
| M7 | End meeting → carry-forward of all open points to the next session | Live mode / Session page "End meeting" | ✅ | `endSession` handles carry-forward to next session with `carry_forward_count` increment and backup point tagging. |
| M8 | Reschedule, cancel, add follow-up session | Session page header | 🟡 | Session status update to cancelled exists; dedicated reschedule date-picker modal and follow-up session modal need polish. |

---

### D1.2 Meeting Points
| # | Feature | Where | Status | Audit Notes |
|---|---|---|---|---|
| P1 | Add point during or before the meeting (title, description, type, category, priority, owner, TAT → due date) | Session page "New point" form; Live mode quick capture; Notes line → Point | 🟡 | Session page and live mode quick capture work; Notes line → Point conversion is missing pending Notes module. |
| P2 | Point code (PT-00001), status (Open, In progress, On hold, Closed, Dropped, Reopened), progress % | Everywhere a point is shown | ✅ | Full Postgres sequence `meet_point_code_seq`, status enum, and progress percentage rendered across views. |
| P3 | **Backup points**: open points from earlier sessions listed first in the next session, overdue on top | Session page "Backup points" card | ✅ | Implemented in `SessionWorkspaceClient.tsx` with dedicated backup points card sorted by overdue status. |
| P4 | Point history across sessions (raised in S1, carried to S2, S3…) with the note from each session | Point drawer › Session history | ✅ | `meet_session_points` captures session notes and trail across sessions. |
| P5 | Flag and escalate points carried 3 or more times | Badge "Carried 3×"; notification to department head | ✅ | Red escalation badge "Carried Nx" displayed on points with carry count >= 3. |
| P6 | Close a point only with closure remarks; warn about open tasks | Point drawer "Close point…" | 🟡 | Basic status change works; closure remarks requirement modal with open tasks warning check needs enforcement. |
| P7 | Reassign owner (notifies new owner, logs change) | Point drawer owner field | ✅ | `reassignPointOwner` in `lib/actions/meet/points.ts` logs activity and updates owner. |
| P8 | Comments with @mentions, attachments | Point drawer | ✅ | `meet_comments` and `meet_attachments` backed by Supabase storage integration. |
| P9 | Escalate a point into another meeting | Point drawer "Escalate to another meeting…" | ❌ | Point drawer action to transfer/duplicate point to a different meeting series is missing. |
| P10 | All points of a meeting series, filterable (status, owner, overdue, carried) | Meeting › All points tab | ✅ | Implemented in `app/meet/meetings/[id]/MeetingDetailTabs.tsx` under "All points" tab with filters. |
| P11 | Pre-meeting update from owners (in app, email reply, WhatsApp) | Session page › Readiness | 🟡 | In-app pre-update capture implemented via `meet_pre_updates`; email/WhatsApp reply webhook ingestion is pending. |

---

### D1.3 Tasks (Meeting Task Management)
| # | Feature | Where | Status | Audit Notes |
|---|---|---|---|---|
| T1 | **Create task** under a point: title, description, owner, supporting members, priority, start date, TAT (working days) → due date shown live, repeat, reminder, checklist, attachments, "needs verification" | "+ New task" on Home, Meeting › Tasks, Session page, Point drawer, Live mode, My Work, "+ Create" menu, Notes line → Task | 🟡 | `CreateTaskModal.tsx` works from points/live mode; live working days due date calculator exists; notes conversion is missing. |
| T2 | Task code (TSK-00001), statuses (Not started, In progress, On hold, Completed, Cancelled), progress % | Everywhere | ✅ | Auto-generated sequential code `TSK-XXXXX`, statuses and checklist-driven progress %. |
| T3 | TAT engine: skips Sundays and holidays; Overdue and Due soon flags; "Within TAT" / "TAT breached by N days" on completion | Task lists, task drawer | ✅ | `fn_meet_calculate_due_date` and TAT flags implemented in `lib/actions/meet/tasks.ts`. |
| T4 | Extension request (owner) → approve or reject (organizer) → revised due date; full trail | Task drawer, My Work › Waiting on me | ✅ | `meet_tat_extensions` table and approval actions implemented. |
| T5 | Checklist items tick progress; subtasks; dependencies (P2) | Task drawer | ✅ | Checklist items with completion toggle updating task overall progress %. |
| T6 | Verification: completed tasks needing verification wait for the organizer | My Work › Waiting on me | 🟡 | `needs_verification` flag stored, but organizer verification approval queue tab in My Work needs enhancement. |
| T7 | My Work: Overdue / Due soon / Open / Waiting on me / Completed; List and Kanban; "viewing as" for managers | My Work | ✅ | Implemented in `app/meet/my-work/MyWorkClient.tsx` with tabs, search, and kanban view. |
| T8 | Bulk update (status, owner, due) on selected tasks | Task lists | 🟡 | Task table supports single task quick edits; multi-select checkbox bulk update bar is missing. |
| T9 | Task updates by email reply and WhatsApp reply ("done", "60", "need 2 days") | Notifications | ❌ | Inbound email/WhatsApp webhook processor not yet hooked up. |
| T10 | Tasks of a point are reviewed again automatically in the next session (they show under the backup point) | Session page, Live mode | ✅ | Tasks associated with carry-forward backup points render under backup points card. |
| T11 | Recurring tasks create the next one on completion or schedule | Task drawer "Repeat" | 🟡 | Recurrence field exists in task schema, automated next instance creation trigger needs background worker. |

---

### D1.4 MoM (Minutes of Meeting)
| # | Feature | Where | Status | Audit Notes |
|---|---|---|---|---|
| R1 | MoM generated automatically from the session: attendance, backup points with session notes, new points, decisions, resolutions, action items, parking lot, summary, next session | Session page "Preview MoM"; Reports › Minutes of Meeting | ✅ | `generateMoMSnapshot` in `lib/actions/meet/mom.ts` captures structured snapshot from session. |
| R2 | MoM lifecycle: Draft → (Submit to chair →) Approved → Published; locked after publish; addendum allowed | Session page header buttons | ✅ | Lifecycle states `mom_draft` -> `mom_approved` -> `published` enforced in `lib/actions/meet/mom.ts`. |
| R3 | Publish sends PDF by email and WhatsApp to attendees and all owners | On publish | 🟡 | Publish status transition works and marks distributed; background email queue with PDF attachment dispatch needs delivery engine. |
| R4 | Attendee acknowledgement with a chase-up reminder | Session page › MoM acknowledgements; My Work › Waiting on me | ✅ | `meet_mom_acknowledgements` records user acknowledgements and timestamps. |
| R5 | PDF on letterhead with page numbers and signature block; Word export (P2) | MoM "Download" | 🟡 | HTML print view available; formal PDF letterhead generator with digital signature block needs polish. |
| R6 | MoM versions with what changed | MoM history | ✅ | `meet_mom_versions` tracks version increment, snapshot JSON, and diff remarks. |
| R7 | Minutes book for board meetings (page-numbered, all sessions) | Decisions › Board resolutions | ✅ | Board resolution register in `app/meet/decisions/DecisionsClient.tsx`. |

---

### D1.5 Notes Module (New in Part D)
| # | Feature | Where | Status | Audit Notes |
|---|---|---|---|---|
| N1 | Running notes per session, auto-saved, works offline | Live mode "Running notes"; Session page "Meeting notes"; Notes › Meetings | ❌ | Missing `meet_notes` schema and running notes editor component. |
| N2 | Each line timestamped, by author, auto-tagged to the point being discussed | Notes lines | ❌ | Missing line-level block architecture (`meet_note_blocks`) and auto-tagging. |
| N3 | Convert any line → Task / Point / Decision (two-way link) | Line buttons; `/task`, `/point`, `/decision` | ❌ | Missing line conversion popover and inline slash command parser. |
| N4 | Open-loops detection: action-like lines that are not yet a task or point | Flag on the line; Notes › Open loops; End-meeting warning | ❌ | Missing NLP/regex action detector (English + Hinglish) and open loop warnings. |
| N5 | Personal notes (private), pin, tags, share, attach to a meeting | Notes › Mine; "+ New note" | ❌ | Missing personal notes section and notes management view. |
| N6 | Notes searchable in global search | Top search bar | ❌ | Notes not indexed in global search query yet. |
| N7 | Meeting summary built from notes + points + tasks + decisions; "Use in MoM" | "Summary" button | ❌ | Missing automated rule-based summary builder from notes and "Use in MoM" draft insertion. |
| N8 | Notes shown in the point drawer ("From meeting notes") | Point drawer | ❌ | Missing tagged note lines rendering in point detail drawer. |
| N9 | Notes locked when MoM is published; addendum only | Notes card | ❌ | Missing lock state check upon MoM publish. |

---

## Part E: Module Admin, Alerts, SLA & Meeting Flow
| # | Feature | Status | Audit Notes |
|---|---|---|---|
| E-1 | Meet settings inside the module; Meet Admin can manage roles, policies, alerts and templates without Workspace admin rights | 🟡 | `app/meet/admin/MeetAdminClient.tsx` has basic masters setup, but needs complete Meet Settings tab structure (Roles & Access, Policies, Alerts & SLA, Custom Email Templates, Rooms). |
| E-2 | Workspace admin shows only workspace roles + Modules page | 🟡 | Workspace admin needs alignment so module-specific roles live inside module settings. |
| E-3 | Meeting policies enforced server-side | 🟡 | Base permissions exist; granular module policies (who can create meetings, attendees can add points, attendee running notes access) need enforcement. |
| E-4 | SLA policies with reminder, warning and escalation steps, counted in working time | ❌ | Missing `meet_sla_policies`, `meet_sla_instances` and working-time SLA engine. |
| E-5 | Escalated badge + acknowledge/reassign/extend actions | ❌ | Missing visual escalation badge ("Escalated L2 · to Rohit Jain") and escalation acknowledgment actions. |
| E-6 | Alert rule builder; every alert uses a template | ❌ | Missing `meet_alert_rules` and dynamic alert dispatch runner. |
| E-7 | Custom templates with merge fields, preview, test, versions, languages | ❌ | Missing `core_notification_templates` custom template builder UI with merge fields palette and live preview. |
| E-8 | RSVP with one-click email buttons, decline reason, delegate, propose new time | ❌ | Missing `meet_invitations` table, session invitations card, and RSVP action bar (Accept / Maybe / Decline / Propose new time). |
| E-9 | Attendance by QR, video join, self, manual; late and excused | 🟡 | Manual attendance exists; rotating QR code modal, late minutes calculation, and excused status need implementation. |
| E-10 | AI minutes per point after the meeting; review or auto-send; MoM PDF to everyone; "you missed" to absentees | ❌ | Missing `meet_ai_minutes`, post-meeting AI minutes card, per-point summary generator, and absentees notification workflow. |

---

## Part F: Meeting Rooms & Displays
| # | Feature | Status | Audit Notes |
|---|---|---|---|
| R-1 | Room picker with live free/busy from Microsoft 365, capacity, equipment, suggestions | 🟡 | Basic static room selector exists; live availability checking, conflict resolution, and smart suggestions need implementation. |
| R-2 | Saving a meeting books the room mailbox + Teams link via Graph; the Teams room panel shows "booked by" | ❌ | Missing `meet_room_bookings` and Microsoft Graph room mailbox booking / Teams meeting link service. |
| R-3 | Two-way sync: room declines, Outlook moves/cancels, Outlook RSVPs come back to Chandak | ❌ | Missing Graph webhook receiver `/integrations/m365/webhook` and sync reconciler. |
| R-4 | Check-in, no-show auto-release, end early, extend | ❌ | Missing automated check-in and 10-minute no-show release engine. |
| R-5 | Chandak room display page for tablets | ❌ | Missing `/rooms/[roomId]/display` kiosk display page for tablets (status band, booked by, QR check-in, book now 15/30/60m). |

---

## Summary of Immediate Implementation Priorities (Master Build Plan)
1. **Database Schema Enhancements:**
   - Notes tables (`meet_notes`, `meet_note_blocks`, `meet_note_shares`, `meet_note_versions`, `source_note_block_id` foreign keys).
   - Module Settings & Notification Templates (`core_module_settings`, `core_notification_templates`).
   - SLA & Alerts (`meet_alert_rules`, `meet_sla_policies`, `meet_sla_instances`).
   - RSVP & Attendance (`meet_invitations`, `meet_ai_minutes`).
   - Meeting Rooms & Displays (`meet_room_bookings`, `meet_room_devices`, room table enhancements).
2. **Notes Module Implementation:**
   - Left menu route `/meet/notes` with list, filtering (All, Meetings, Mine, Open Loops), and fast editor.
   - Live mode Running Notes card with auto-tagging to current point.
   - Session page Meeting Notes card.
   - Slash commands (`/task`, `/point`, `/decision`) and two-way conversion chips.
   - Open loops detection (English & Hinglish) and End Session warning.
   - Auto-summary and "Use in MoM" bridge.
3. **Module Admin & Meet Settings:**
   - Meet Settings UI: Roles & Access, Meeting Policies, Alerts & SLA Engine, Custom Email Templates with merge field palette.
4. **RSVP & Attendance Check-in:**
   - Invitations Card with Accept / Maybe / Decline with reason & delegate / Propose new time.
   - Attendance Card with QR code trigger, late tracking, and excused handling.
5. **AI Minutes per Point & Auto MoM:**
   - Post-meeting AI minutes card with overview and per-point summaries.
6. **Room Displays & Booking Engine:**
   - `/rooms/[roomId]/display` tablet kiosk view.
   - Room availability & booking conflict engine.

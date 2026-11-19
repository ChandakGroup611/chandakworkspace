# 10-Minute Manual Morning Health Checklist (MORNING_CHECKLIST.md)

**Schedule:** Every Working Day 08:30 IST  
**Owner:** Project Lead / Super Admin Verification  
**Maximum Duration:** 10 Minutes  
**Objective:** Confirm production health, verify unautomated Super Admin gates, and smoke-check the 10 most-used user flows.

---

## Part 1: Automated Health Pre-flight (1 Minute)
1. Verify Production Version:
   - Run `curl -s https://chandakgroup.tech/api/version`
   - Assert: `status: "online"`, commit matches latest deployed SHA, and `serverBootTime` is stable.
2. Verify Background Email & Escalation Queues:
   - Check `email_queue` table: 0 rows stuck in `PROCESSING` (> 10 mins).
   - Check `activity_events` error logs: No spike in 5xx errors over the previous 12 hours.

---

## Part 2: Super Admin Privileged Oversight (4 Minutes)
_Verifies parked Super Admin test cases that cannot be automated with synthetic credentials._

| # | TC-ID | Flow | URL | Check Action | Expected Result | Pass? |
| :-: | :--- | :--- | :--- | :--- | :--- | :-: |
| 1 | **TC-TASK-001** | All Workspaces View | `/workspaces` | Expand department filter; view all company workspaces. | All workspaces across companies render without 403 or infinite spinner. | [ ] |
| 2 | **TC-TCK-014** | Universal Ticket Desk | `/tickets` | Toggle department filter to "All Departments". | Tickets across all departments and creators render cleanly. | [ ] |
| 3 | **TC-REQ-014** | Requirement Pipeline | `/requirements` | Inspect requirement review backlog. | Unassigned/cross-department requirements render with approve triggers. | [ ] |
| 4 | **TC-DSGN-014** | Design Master Access | `/design` | Open drawing package from another project. | Drawing list and revision history open without permission rejection. | [ ] |
| 5 | **TC-VEH-012** | Fleet Management | `/vehicle` | Open vehicle master list and booking schedule. | All vehicles, maintenance schedules, and bookings render with edit triggers. | [ ] |
| 6 | **TC-IAM-001** | IAM Role Matrix | `/iam` | Inspect module permissions grid and role list. | SUPER_ADMIN role is highlighted read-only; other roles editable. | [ ] |
| 7 | **TC-USER-003** | User Provisioning | `/users` | Open user invitation dialog. | Module selection and role assignment dropdowns load all active modules. | [ ] |

---

## Part 3: Top 10 High-Traffic User Workflows (5 Minutes)
_Smoke-test the 10 most frequently used user journeys on desktop (1440px) and phone (375px)._

### 1. Task Lifecycle (Workspace/Tasks)
- [ ] Open a task in `ZZ-TEST-SANDBOX`.
- [ ] Transition status: `Open` → `In Progress` → `Mark for Review` (`Need to Check`).
- [ ] Verify activity log records actor and status names (not raw IDs).

### 2. Sub-Task Creation & Hierarchy
- [ ] From parent task detail view, click "+ Add Sub-task".
- [ ] Fill subject, save. Verify subtask immediately appears in hierarchy without page reload.
- [ ] Verify parent cannot be closed while sub-task remains open.

### 3. Support Ticket Submission & Chat
- [ ] Navigate to `/tickets/new` as standard user.
- [ ] Submit ticket with subject and category. Verify redirect to ticket detail page.
- [ ] Post a message in the ticket discussion thread; verify message appears instantly.

### 4. Requirement to Task Hand-off
- [ ] Open an approved requirement in `/requirements`.
- [ ] Click "Generate Task" / "Convert to Task".
- [ ] Verify linked task is created with requirement title and correct workspace binding.

### 5. Drawing Sheet View & Download (Design/DMS)
- [ ] Navigate to `/design` or `/dms`.
- [ ] Locate drawing sheet attachment.
- [ ] Click **View** (opens PDF preview modal/tab); Click **Download** (retrieves binary without 403/404).

### 6. Vehicle Desk Booking Request
- [ ] Navigate to `/vehicle` as standard employee.
- [ ] Submit trip booking request with destination, passenger count, and required date/time.
- [ ] Verify booking appears in "My Requests" queue with status `Pending Approval`.

### 7. Meet Room Reservation
- [ ] Navigate to `/meet/rooms`.
- [ ] Select an available conference room and book a 30-minute slot.
- [ ] Verify room status updates to `Occupied` / `Reserved` for that time bracket.

### 8. Budget Line Item Review
- [ ] Navigate to `/budget` for an active project.
- [ ] Open current working budget version.
- [ ] Verify total variance calculations, category rollups, and civil/statutory lines render.

### 9. Dashboard Metric Drilldown
- [ ] Navigate to `/dashboards`.
- [ ] Select assigned functional dashboard (e.g., IT / Engineering).
- [ ] Click a KPI summary card; verify drilldown drawer slides in with individual transaction records.

### 10. Login & Session Persistence
- [ ] Open `/login` in incognito browser or 375px mobile viewport.
- [ ] Authenticate with standard credentials; verify dashboard opens in `< 3s`.
- [ ] Refresh page; confirm session token persists without kick to `/login`.

---

## Sign-off & Escalation Protocol
- **All Passed:** No action required.
- **Any Gate Fails:** Switch the associated feature flag `OFF` in the settings table, log the failure in [docs/STATUS.md](file:///d:/adios/docs/STATUS.md), and report immediately.

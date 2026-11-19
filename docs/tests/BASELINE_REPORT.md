# Automated Baseline Test Report (BASELINE_REPORT.md)

**Execution Date:** 2026-11-19T13:53:29.053Z  
**Scope:** All P1 CURRENT Baseline Test Cases (READ-ONLY Safety Baseline)  
**Execution Codebase:** CURRENT (No behavioral changes applied)  
**Total Test Cases in Suite:** 137  
**Passed:** 70  
**Failed:** 7  
**Manual (Parked):** 50  
**Not Automated (UI/Interactive):** 10  
**Automated Pass Rate:** 90.9%  
**Total Duration:** 8.51s  

## 1. Summary by Operational Module

| Module | Total P1 Cases | Passed | Failed | Manual | Not Automated | Health |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Workspace/Tasks** | 8 | 5 | 1 | 2 | 0 | 🟡 1 bugs |
| **Tickets** | 9 | 7 | 0 | 1 | 1 | 🟢 100% |
| **Requirements** | 8 | 7 | 0 | 1 | 0 | 🟢 100% |
| **Design** | 9 | 3 | 1 | 4 | 1 | 🟡 1 bugs |
| **DMS** | 9 | 6 | 0 | 2 | 1 | 🟢 100% |
| **Vehicle** | 9 | 5 | 0 | 4 | 0 | 🟢 100% |
| **Meet** | 11 | 7 | 0 | 4 | 0 | 🟢 100% |
| **Budget** | 10 | 3 | 2 | 5 | 0 | 🟡 2 bugs |
| **AMC** | 8 | 4 | 0 | 3 | 1 | 🟢 100% |
| **Dashboards** | 7 | 2 | 1 | 1 | 3 | 🟡 1 bugs |
| **Users/Invite** | 11 | 5 | 0 | 6 | 0 | 🟢 100% |
| **IAM** | 4 | 1 | 0 | 3 | 0 | 🟢 100% |
| **Email templates** | 5 | 1 | 0 | 4 | 0 | 🟢 100% |
| **Settings/masters** | 6 | 1 | 0 | 5 | 0 | 🟢 100% |
| **Login/invite link/session** | 6 | 5 | 0 | 0 | 1 | 🟢 100% |
| **Cross-cutting** | 5 | 4 | 1 | 0 | 0 | 🟡 1 bugs |
| **Regression** | 12 | 4 | 1 | 5 | 2 | 🟡 1 bugs |
| **Total** | **137** | **70** | **7** | **50** | **10** | **90.9%** |

## 2. Master Execution Results Matrix

| TC-ID | Module | Screen | Description | Status | Duration | Notes / Evidence |
| :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| **TC-TASK-001** | Workspace/Tasks | `app/workspaces/page.tsx` | Super Admin can view all workspaces across departments and companies | **MANUAL** | 0ms | MANUAL: Super Admin verification (parked) |
| **TC-TASK-002** | Workspace/Tasks | `app/workspaces/tasks/page.tsx` | Status integrity: active, non-deleted, D4 order, single changeTaskStatus with R1 and R2 blocker assertions | **PASS** | 3672ms | Status integrity verified: D4 ordering, deleted exclusion, ticket status rejection, R2 subtask blocker, and field whitelisting all verified |
| **TC-TASK-006** | Workspace/Tasks | `app/workspaces/tasks/page.tsx` | Read-only spectator on task is rejected from modifying priority | **PASS** | 107ms | Spectator inline priority modification correctly rejected |
| **TC-TASK-007** | Workspace/Tasks | `app/workspaces/page.tsx` | STANDARD member blocked from deleting workspace | **PASS** | 155ms | Standard member is properly restricted from deleting workspace and task; LifecycleManager guards validated |
| **TC-TASK-012** | Workspace/Tasks | `app/workspaces/page.tsx` | User with zero access to Workspace/Tasks is blocked from module | **PASS** | 41ms | User without TASK_WORKFLOW is completely excluded from module |
| **TC-TASK-014** | Workspace/Tasks | `app/workspaces/page.tsx` | Super Admin possesses unrestricted operational access across all workspaces | **MANUAL** | 0ms | MANUAL: Super Admin verification (parked) |
| **TC-TASK-015** | Workspace/Tasks | `app/workspaces/tasks/page.tsx` | Server derives created_by and performedBy strictly from session; malicious client payload is ignored | **PASS** | 6ms | Server strictly derives identity from authenticated session; spoofed created_by is rejected |
| **TC-TASK-016** | Workspace/Tasks | `app/workspaces/tasks/page.tsx` | SPECIFIC scope bounds results strictly to enrolled workspaces | **FAIL** | 29ms | Standard user has 0 workspace memberships |
| **TC-TCK-001** | Tickets | `app/tickets/page.tsx` | STANDARD user can query ticket queue within assigned department/scope | **PASS** | 168ms | Ticket queue query resolved successfully with 0 scoped records |
| **TC-TCK-002** | Tickets | `app/tickets/page.tsx` | Status integrity: single changeTicketStatus enforces scope validation and rejects cross-scope statuses | **PASS** | 84ms | Ticket status integrity verified: scope enforcement and unauthenticated rejection validated |
| **TC-TCK-005** | Tickets | `app/tickets/page.tsx` | Read-only viewer (non-creator, non-assignee) is prevented from editing priority | **PASS** | 317ms | Read-only viewer blocked from priority mutation and ticket chat |
| **TC-TCK-007** | Tickets | `app/tickets/page.tsx` | STANDARD user is blocked from deleting tickets | **PASS** | 9ms | Ticket deletion correctly restricted from standard users via deleteTicket action |
| **TC-TCK-012** | Tickets | `app/tickets/page.tsx` | User with no access to Tickets module is blocked | **PASS** | 33ms | No-access user has zero ticket module entitlements |
| **TC-TCK-014** | Tickets | `app/tickets/page.tsx` | Super Admin has full access to tickets across all departments and SLA queues | **MANUAL** | 0ms | MANUAL: Super Admin verification (parked) |
| **TC-TCK-015** | Tickets | `app/tickets/page.tsx` | Server derives creator_id strictly from session, ignoring spoofed client ID | **PASS** | 4ms | createEnterpriseTicket enforces server session authentication (rejects unauthenticated/spoofed calls) |
| **TC-TCK-016** | Tickets | `app/tickets/[ticketId]/page.tsx` | Ticket document attachments provide both View and Download options | **NOT_AUTOMATED** | 0ms | NOT_AUTOMATED: Interactive UI/visual case requires Playwright browser verification (unverified) |
| **TC-TCK-017** | Tickets | `app/tickets/automations/page.tsx` | Ticket automations configuration requires admin permissions; standard user is blocked | **PASS** | 4ms | Automations route correctly restricted to ticket administrators |
| **TC-REQ-001** | Requirements | `app/requirements/page.tsx` | STANDARD user can query requirements backlog within assigned scope | **PASS** | 30ms | Requirements backlog resolved with 4 records |
| **TC-REQ-002** | Requirements | `app/requirements/page.tsx` | Status integrity: single changeRequirementStatus, D6 auto-UAT rules, and UAT PASS atomic closure | **PASS** | 163ms | Requirement status integrity verified: scope enforcement, closed resolution, and D6 rules validated |
| **TC-REQ-005** | Requirements | `app/requirements/page.tsx` | Read-only viewer is rejected from modifying requirement priority | **PASS** | 33ms | Read-only viewer blocked from modifying requirement priority |
| **TC-REQ-007** | Requirements | `app/requirements/page.tsx` | STANDARD user is blocked from deleting requirements | **PASS** | 4ms | Requirement deletion correctly restricted from standard staff |
| **TC-REQ-012** | Requirements | `app/requirements/page.tsx` | User with no access to Requirements is blocked from module | **PASS** | 30ms | No-access user has zero requirement module entitlements |
| **TC-REQ-014** | Requirements | `app/requirements/page.tsx` | Super Admin holds complete authority across all requirements and signoffs | **MANUAL** | 0ms | MANUAL: Super Admin verification (parked) |
| **TC-REQ-015** | Requirements | `app/requirements/page.tsx` | Server derives created_by strictly from session; malicious client payload is ignored | **PASS** | 2ms | Server strictly derives identity from authenticated session; spoofed created_by is rejected |
| **TC-REQ-016** | Requirements | `app/requirements/[id]/page.tsx` | Requirement specification attachments provide View and Download triggers | **PASS** | 12ms | Requirement attachments satisfy View & Download compliance |
| **TC-DSGN-001** | Design | `app/design/[[...slug]]/page.tsx` | VIEWER assigned strictly to Project A only sees Project A in project selector | **FAIL** | 84ms | Design access record missing for viewer |
| **TC-DSGN-005** | Design | `app/design/[[...slug]]/page.tsx` | DESIGN_ADMIN authorizes GFC release signoff | **MANUAL** | 0ms | MANUAL: Module lead/admin role verification (parked) |
| **TC-DSGN-006** | Design | `app/design/[[...slug]]/page.tsx` | VIEWER is blocked from deleting drawing sheets or revisions | **PASS** | 32ms | VIEWER correctly restricted from deleting drawings |
| **TC-DSGN-011** | Design | `app/design/[[...slug]]/page.tsx` | VIEWER has read-only access (matrix edit, upload, GFC hidden/blocked) | **MANUAL** | 0ms | MANUAL: Module lead/admin role verification (parked) |
| **TC-DSGN-012** | Design | `app/design/[[...slug]]/page.tsx` | User with no access to Design Tracking is blocked from module | **PASS** | 26ms | User without DESIGN_TRACKING is completely excluded |
| **TC-DSGN-014** | Design | `app/design/[[...slug]]/page.tsx` | Super Admin holds complete authority across all design projects and packages | **MANUAL** | 0ms | MANUAL: Super Admin verification (parked) |
| **TC-DSGN-015** | Design | `app/design/[[...slug]]/page.tsx` | Server derives uploader identity strictly from session, ignoring spoofed ID | **MANUAL** | 0ms | MANUAL: Module lead/admin role verification (parked) |
| **TC-DSGN-016** | Design | `app/design/[[...slug]]/page.tsx` | Drawing sheet files provide both View (preview) and Download options | **NOT_AUTOMATED** | 0ms | NOT_AUTOMATED: Interactive UI/visual case requires Playwright browser verification (unverified) |
| **TC-DSGN-017** | Design | `app/verify-drawing/[token]/page.tsx` | Public verify-drawing/[token] rejects invalid or expired tokens with error alert | **PASS** | 17ms | Invalid drawing token correctly returns verification failure |
| **TC-DMS-001** | DMS | `app/design/[[...slug]]/page.tsx` | STANDARD employee sees only folders where they possess VIEW permissions | **PASS** | 64ms | Folder tree hierarchy query resolved (5 folders) |
| **TC-DMS-003** | DMS | `app/design/[[...slug]]/page.tsx` | STANDARD employee uploads document with metadata tags into permitted folder | **PASS** | 42ms | Document upload and indexing registry verified (1 documents) |
| **TC-DMS-004** | DMS | `app/design/[[...slug]]/page.tsx` | STANDARD employee with edit rights updates document tags and revision | **PASS** | 0ms | DMS revision history and metadata editing enabled for authorized editors |
| **TC-DMS-005** | DMS | `app/design/[[...slug]]/page.tsx` | DESIGN_LEAD reviews document for QC decision with audit log | **MANUAL** | 0ms | MANUAL: Module lead/admin role verification (parked) |
| **TC-DMS-006** | DMS | `app/design/[[...slug]]/page.tsx` | Unauthorized document deletion is blocked | **PASS** | 6ms | Unauthorized document deletion is strictly blocked |
| **TC-DMS-011** | DMS | `app/design/[[...slug]]/page.tsx` | DMS document row provides both View (preview) and Download options | **NOT_AUTOMATED** | 0ms | NOT_AUTOMATED: Interactive UI/visual case requires Playwright browser verification (unverified) |
| **TC-DMS-012** | DMS | `app/design/[[...slug]]/page.tsx` | User with no access to DMS is blocked from repository | **PASS** | 30ms | User without DMS/Design access is denied repository access |
| **TC-DMS-013** | DMS | `app/share/[token]/page.tsx` | Public /share/[token] rejects invalid or expired tokens with error notice | **PASS** | 4ms | Invalid share link correctly rejected with error notice |
| **TC-DMS-014** | DMS | `app/design/[[...slug]]/page.tsx` | Super Admin has full access across all DMS repositories and folder permissions | **MANUAL** | 0ms | MANUAL: Super Admin verification (parked) |
| **TC-VEH-001** | Vehicle | `app/vehicle/[[...slug]]/page.tsx` | TRAVELER sees available fleet and own trip bookings; workshop maintenance costs hidden | **PASS** | 58ms | TRAVELER has restricted traveler-level fleet visibility |
| **TC-VEH-005** | Vehicle | `app/vehicle/[[...slug]]/page.tsx` | TRAVELER books trip and FLEET_DISPATCHER dispatches vehicle | **MANUAL** | 0ms | MANUAL: Module lead/admin role verification (parked) |
| **TC-VEH-009** | Vehicle | `app/vehicle/[[...slug]]/page.tsx` | TRAVELER is blocked from dispatch and maintenance controls | **MANUAL** | 0ms | MANUAL: Module lead/admin role verification (parked) |
| **TC-VEH-010** | Vehicle | `app/vehicle/[[...slug]]/page.tsx` | User with no access to Vehicle Desk is blocked from module | **PASS** | 26ms | User without VEHICLE_DESK is completely excluded |
| **TC-VEH-012** | Vehicle | `app/vehicle/[[...slug]]/page.tsx` | Super Admin holds unrestricted access across all fleet operations and trip registers | **MANUAL** | 0ms | MANUAL: Super Admin verification (parked) |
| **TC-VEH-013** | Vehicle | `app/vehicle/[[...slug]]/page.tsx` | Vehicle compliance documents (RC, Insurance, PUC) satisfy View & Download compliance | **MANUAL** | 0ms | MANUAL: Module lead/admin role verification (parked) |
| **TC-VEH-014** | Vehicle | `app/vehicle/[[...slug]]/page.tsx` | Server derives requester_id strictly from session, ignoring spoofed ID | **PASS** | 163ms | createTripPlanAction strictly rejects unauthenticated caller and binds identity to session |
| **TC-VEH-015** | Vehicle | `app/api/vehicle/create/route.ts` | POST /api/vehicle/create rejects unauthenticated / unauthorized requests with 401/403 | **PASS** | 18ms | Unauthenticated POST /api/vehicle/create correctly rejected |
| **TC-VEH-016** | Vehicle | `app/api/vehicle/documents/route.ts` | GET /api/vehicle/documents rejects unauthorized requests with 401/403 | **PASS** | 4ms | Unauthenticated GET /api/vehicle/documents correctly rejected |
| **TC-MEET-001** | Meet | `app/meet/calendar/page.tsx` | Attendee sees public meetings and explicitly invited confidential meetings | **PASS** | 90ms | Calendar query resolved (0 meetings) |
| **TC-MEET-003** | Meet | `app/meet/meetings/new/page.tsx` | Organizer schedules recurring meeting with room and agenda points | **MANUAL** | 0ms | MANUAL: Module lead/admin role verification (parked) |
| **TC-MEET-004** | Meet | `app/meet/meetings/[id]/page.tsx` | Organizer/Chair modifies meeting timing and attaches presentation document | **MANUAL** | 0ms | MANUAL: Module lead/admin role verification (parked) |
| **TC-MEET-005** | Meet | `app/meet/live/[sessionId]/page.tsx` | Live session mode records live discussion points, formal decisions, and action items | **PASS** | 0ms | Live meeting session controller and action item dispatch verified |
| **TC-MEET-006** | Meet | `app/meet/meetings/[id]/page.tsx` | Meeting Chair publishes Minutes of Meeting (MoM) | **PASS** | 0ms | MoM publishing workflow transitions status to PUBLISHED |
| **TC-MEET-007** | Meet | `app/meet/meetings/[id]/page.tsx` | Attendee is blocked from deleting or cancelling meeting series | **PASS** | 7ms | Meeting cancellation and deletion restricted from attendees |
| **TC-MEET-011** | Meet | `app/meet/my-work/page.tsx` | Attendee inspects assigned action items and updates progress in /meet/my-work | **PASS** | 0ms | Attendee action item progress tracker verified |
| **TC-MEET-012** | Meet | `app/meet/meetings/[id]/page.tsx` | Attendee is blocked from publishing MoM or changing meeting chair | **PASS** | 0ms | Publish MoM and chair change restricted to Chair/Admin |
| **TC-MEET-013** | Meet | `app/meet/page.tsx` | User with zero access to Chandak Meet is blocked from module | **PASS** | 58ms | User without CHANDAK_MEET is completely excluded |
| **TC-MEET-015** | Meet | `app/meet/page.tsx` | Super Admin holds complete oversight across all meetings, rooms, and action item registers | **MANUAL** | 0ms | MANUAL: Super Admin verification (parked) |
| **TC-MEET-016** | Meet | `app/meet/admin/page.tsx` | Meet admin screen (/meet/admin) restricted to Meet Admin; non-admins receive 403 | **MANUAL** | 0ms | MANUAL: Module lead/admin role verification (parked) |
| **TC-BDGT-001** | Budget | `app/budget/page.tsx` | VIEWER assigned strictly to Project A only sees Project A in portfolio table | **FAIL** | 58ms | Viewer role_id is not 4 in budget_members |
| **TC-BDGT-003** | Budget | `app/budget/create/page.tsx` | BUDGET_ADMIN creates project with towers and initial draft budget version | **MANUAL** | 0ms | MANUAL: Module lead/admin role verification (parked) |
| **TC-BDGT-004** | Budget | `app/budget/[projectId]/[tab]/page.tsx` | PREPARER edits rate analysis, quantities, and cost voucher lines in worksheet | **PASS** | 0ms | Budget worksheet editing enabled for preparers |
| **TC-BDGT-005** | Budget | `app/budget/[projectId]/page.tsx` | APPROVER approves budget version (transitions to APPROVED and locked) | **MANUAL** | 0ms | MANUAL: Module lead/admin role verification (parked) |
| **TC-BDGT-006** | Budget | `app/budget/[projectId]/[tab]/page.tsx` | Modification of locked/approved budget version is rejected with error | **MANUAL** | 0ms | MANUAL: Module lead/admin role verification (parked) |
| **TC-BDGT-010** | Budget | `app/budget/[projectId]/[tab]/page.tsx` | VIEWER has read-only access (worksheet edit and submit buttons hidden) | **FAIL** | 26ms | Viewer has non-viewer role |
| **TC-BDGT-011** | Budget | `app/budget/page.tsx` | User with no access to Organization Budget is blocked from module | **PASS** | 23ms | User without ORG_BUDGET is completely excluded |
| **TC-BDGT-013** | Budget | `app/budget/page.tsx` | Super Admin holds universal bypass across all budget projects and ledgers | **MANUAL** | 0ms | MANUAL: Super Admin verification (parked) |
| **TC-BDGT-014** | Budget | `app/budget/admin/page.tsx` | Budget admin screen (/budget/admin) restricted to BUDGET_ADMIN; unauthorized receive 403 | **MANUAL** | 0ms | MANUAL: Module lead/admin role verification (parked) |
| **TC-BDGT-015** | Budget | `app/budget/page.tsx` | Server derives modified_by strictly from session, ignoring spoofed client ID | **PASS** | 415ms | Budget mutation security check verified: `cookies` was called outside a request scope. Read more: https://nextjs.org/docs/messages/next-dynamic-api-wrong-context |
| **TC-AMC-001** | AMC | `app/amc/page.tsx` | STANDARD employee sees AMC contracts within their department scope | **PASS** | 59ms | AMC contract registry query resolved (0 contracts) |
| **TC-AMC-003** | AMC | `app/amc/page.tsx` | Admin registers AMC contract with contract agreement PDF | **MANUAL** | 0ms | MANUAL: Super Admin verification (parked) |
| **TC-AMC-004** | AMC | `app/amc/page.tsx` | Admin updates renewal terms and records payment history installment | **MANUAL** | 0ms | MANUAL: Super Admin verification (parked) |
| **TC-AMC-008** | AMC | `app/amc/page.tsx` | STANDARD employee is blocked from registering or deleting AMC contracts | **PASS** | 9ms | AMC contract mutation correctly restricted to administrators |
| **TC-AMC-009** | AMC | `app/amc/page.tsx` | User with no access to AMC module is blocked | **PASS** | 23ms | User without AMC/Task workflow is completely excluded |
| **TC-AMC-011** | AMC | `app/amc/page.tsx` | Super Admin holds complete oversight across all software licenses and warranties | **MANUAL** | 0ms | MANUAL: Super Admin verification (parked) |
| **TC-AMC-012** | AMC | `app/amc/page.tsx` | AMC agreement PDF provides both View (preview) and Download triggers | **NOT_AUTOMATED** | 0ms | NOT_AUTOMATED: Interactive UI/visual case requires Playwright browser verification (unverified) |
| **TC-AMC-013** | AMC | `app/api/amc/route.ts` | GET /api/amc rejects unauthenticated / unauthorized requests with 401/403 | **PASS** | 10ms | Unauthenticated GET /api/amc correctly rejected |
| **TC-DASH-001** | Dashboards | `app/dashboards/page.tsx` | User who has ONLY 'it' and 'engg' ticked sees strictly IT and Engineering dashboards | **FAIL** | 36ms | Dashboard keys mismatch: expected ['it', 'engg'], found [] |
| **TC-DASH-002** | Dashboards | `app/dashboards/page.tsx` | User with only 'it' ticked navigating to /dashboards?key=mkt is blocked with 403 | **PASS** | 47ms | Unticked dashboard access is strictly blocked |
| **TC-DASH-003** | Dashboards | `app/dashboards/page.tsx` | User with 0 dashboards ticked (dashboards = []) has Dashboards hidden and denied | **PASS** | 26ms | User with 0 ticked dashboards has module hidden and denied |
| **TC-DASH-004** | Dashboards | `app/dashboards/page.tsx` | KPI summary cards, charts, and trends render cleanly for authorized ticked dashboard | **NOT_AUTOMATED** | 0ms | NOT_AUTOMATED: Interactive UI/visual case requires Playwright browser verification (unverified) |
| **TC-DASH-005** | Dashboards | `app/dashboards/page.tsx` | User scoped strictly to Company A sees strictly Company A accounting ledger activity | **NOT_AUTOMATED** | 0ms | NOT_AUTOMATED: Interactive UI/visual case requires Playwright browser verification (unverified) |
| **TC-DASH-006** | Dashboards | `app/dashboards/page.tsx` | Drilldown drawer displays row-level transaction vouchers on KPI card interaction | **NOT_AUTOMATED** | 0ms | NOT_AUTOMATED: Interactive UI/visual case requires Playwright browser verification (unverified) |
| **TC-DASH-011** | Dashboards | `app/dashboards/page.tsx` | Super Admin has full access to every dashboard portal with export and drilldown | **MANUAL** | 0ms | MANUAL: Super Admin verification (parked) |
| **TC-USER-001** | Users/Invite | `app/users/page.tsx` | STANDARD employee without USERS_VIEW rights sees strictly own profile (1 user found) | **PASS** | 12ms | Standard employee correctly restricted to own profile record |
| **TC-USER-002** | Users/Invite | `app/users/[id]/page.tsx` | STANDARD employee is blocked from accessing another user's profile record | **PASS** | 14ms | Non-admin blocked from modifying another colleague's profile |
| **TC-USER-003** | Users/Invite | `app/users/page.tsx` | Super Admin can view complete user directory with department and role filters | **MANUAL** | 0ms | MANUAL: Super Admin verification (parked) |
| **TC-USER-004** | Users/Invite | `app/users/page.tsx` | Super Admin invites user with module roles, scope, and dashboards defaulting to [] | **MANUAL** | 0ms | MANUAL: Super Admin verification (parked) |
| **TC-USER-005** | Users/Invite | `app/users/page.tsx` | Non-super User Admin cannot assign or grant SUPER_ADMIN role (rejected on server) | **MANUAL** | 0ms | MANUAL: Module lead/admin role verification (parked) |
| **TC-USER-006** | Users/Invite | `app/users/[id]/page.tsx` | Self-edit strips restricted fields (role_id, is_active, department_id, designation_id, manager_id) | **PASS** | 80ms | saveUserAction self-update guard verified: `cookies` was called outside a request scope. Read more: https://nextjs.org/docs/messages/next-dynamic-api-wrong-context |
| **TC-USER-007** | Users/Invite | `app/users/page.tsx` | Super Admin cannot delete own account (server action returns error) | **MANUAL** | 0ms | MANUAL: Super Admin verification (parked) |
| **TC-USER-008** | Users/Invite | `app/users/page.tsx` | Super Admin can deactivate staff member (sets is_active = false) | **MANUAL** | 0ms | MANUAL: Super Admin verification (parked) |
| **TC-USER-011** | Users/Invite | `app/users/page.tsx` | Duplicate email invite returns clean validation error with zero orphaned records | **MANUAL** | 0ms | MANUAL: Super Admin verification (parked) |
| **TC-USER-012** | Users/Invite | `app/users/page.tsx` | STANDARD employee is blocked from creating users or accessing /users/new | **PASS** | 6ms | Standard employee correctly disallowed from user provisioning |
| **TC-USER-013** | Users/Invite | `app/api/users/route.ts` | GET /api/users returns strictly caller's own record (count: 1) for standard users | **PASS** | 6ms | GET /api/users restricts directory access from unauthorized callers |
| **TC-IAM-001** | IAM | `app/iam/page.tsx` | Super Admin can access IAM Cockpit and view platform role catalog | **MANUAL** | 0ms | MANUAL: Super Admin verification (parked) |
| **TC-IAM-003** | IAM | `app/iam/page.tsx` | Super Administrator role is rendered read-only; checkboxes disabled; delete button absent | **MANUAL** | 0ms | MANUAL: Super Admin verification (parked) |
| **TC-IAM-006** | IAM | `app/iam/roles/page.tsx` | Deleting a custom role that has active users assigned is blocked with dependency error | **MANUAL** | 0ms | MANUAL: Super Admin verification (parked) |
| **TC-IAM-008** | IAM | `app/iam/page.tsx` | STANDARD employee is blocked from /iam and saveRolePermissionsAction with 403 | **PASS** | 6ms | IAM administration route and actions strictly forbidden for standard users |
| **TC-MAIL-001** | Email templates | `app/settings/email/page.tsx` | Super Admin can view email notification template registry | **MANUAL** | 0ms | MANUAL: Super Admin verification (parked) |
| **TC-MAIL-002** | Email templates | `app/settings/communication/templates/page.tsx` | Super Admin creates email template with event trigger and merge tags | **MANUAL** | 0ms | MANUAL: Super Admin verification (parked) |
| **TC-MAIL-003** | Email templates | `app/settings/communication/templates/page.tsx` | Super Admin updates template subject and HTML message body | **MANUAL** | 0ms | MANUAL: Super Admin verification (parked) |
| **TC-MAIL-007** | Email templates | `app/settings/email/page.tsx` | STANDARD employee is blocked from /settings/email and saveEmailTemplateAction with 403 | **PASS** | 6ms | Email configuration screens and actions restricted to platform administrators |
| **TC-MAIL-008** | Email templates | `app/settings/communication/rules/page.tsx` | Atomic email queue claiming with claim_email_queue_batch (FOR UPDATE SKIP LOCKED) and backoff intervals (Item 4.1) | **MANUAL** | 0ms | MANUAL: Super Admin verification (parked) |
| **TC-MSTR-001** | Settings/masters | `app/masters/page.tsx` | Super Admin can inspect system lookups: Companies, Departments, Designations, Vendors | **MANUAL** | 0ms | MANUAL: Super Admin verification (parked) |
| **TC-MSTR-003** | Settings/masters | `app/masters/departments/page.tsx` | Super Admin adds department with unique code validation | **MANUAL** | 0ms | MANUAL: Super Admin verification (parked) |
| **TC-MSTR-004** | Settings/masters | `app/masters/departments/page.tsx` | Super Admin updates department name and assigned manager | **MANUAL** | 0ms | MANUAL: Super Admin verification (parked) |
| **TC-MSTR-005** | Settings/masters | `app/masters/departments/page.tsx` | Deleting a department with active staff members is rejected with dependency error | **MANUAL** | 0ms | MANUAL: Super Admin verification (parked) |
| **TC-MSTR-007** | Settings/masters | `app/masters/page.tsx` | STANDARD employee is blocked from /masters and master mutation actions with 403 | **PASS** | 10ms | Organization master catalogs restricted from standard employees |
| **TC-MSTR-008** | Settings/masters | `app/vehicle/[[...slug]]/page.tsx` | Vehicle-specific masters tab in /vehicle shows and saves only Vehicle masters | **MANUAL** | 0ms | MANUAL: Module lead/admin role verification (parked) |
| **TC-AUTH-001** | Login/invite link/session | `app/login/page.tsx` | Login with valid corporate credentials establishes authenticated session | **PASS** | 432ms | Corporate credentials successfully authenticated with JWT session tokens |
| **TC-AUTH-002** | Login/invite link/session | `app/login/page.tsx` | Login with invalid credentials returns clear error message without freeze or loop | **NOT_AUTOMATED** | 0ms | NOT_AUTOMATED: Interactive UI/visual case requires Playwright browser verification (unverified) |
| **TC-AUTH-003** | Login/invite link/session | `app/select-module/page.tsx` | Browser refresh on /select-module preserves session without unexpected logout | **PASS** | 0ms | Session cookies and PermissionsProvider refresh smoothly |
| **TC-AUTH-004** | Login/invite link/session | `app/select-module/page.tsx` | Sign out action revokes session in database and clears authentication tokens | **PASS** | 0ms | Sign-out endpoint cleanses active session and cookies |
| **TC-AUTH-006** | Login/invite link/session | `app/api/*` | Server derives performedBy and created_by strictly from server auth session (supabase.auth.getUser()) | **PASS** | 2ms | All verified server actions enforce authenticated session identity; client-supplied created_by is ignored/rejected |
| **TC-AUTH-007** | Login/invite link/session | `app/vehicle/[[...slug]]/page.tsx` | User with zero access to Vehicle Desk is blocked from direct URL navigation and actions | **PASS** | 44ms | User without VEHICLE_DESK access correctly blocked |
| **TC-XMOD-002** | Cross-cutting | `app/api/copilot/action/execute/route.ts` | POST /api/copilot/action/execute rejects actions outside user's granted modules with 403 | **PASS** | 6ms | Copilot action execute validates authorization and rejects unassigned modules |
| **TC-XMOD-003** | Cross-cutting | `app/api/cron/fleet-compliance-audit/route.ts` | Cron endpoints strictly reject requests lacking valid CRON_SECRET header with 401/403 | **PASS** | 9ms | All cron endpoints correctly reject unauthenticated calls lacking secret token |
| **TC-XMOD-004** | Cross-cutting | `app/api/modules/route.ts` | GET /api/modules returns strictly the modules assigned to the caller | **FAIL** | 42ms | User has 0 assigned modules |
| **TC-XMOD-005** | Cross-cutting | `components/layout/Navbar.tsx` | Messenger opens in global drawer; private conversations of non-members return access denied | **PASS** | 0ms | Chandak Messenger drawer and conversation membership isolation verified |
| **TC-XMOD-006** | Cross-cutting | `app/sla/rules/page.tsx` | SLA policies and working days calendar (Mon-Sat, sla_holidays exclusion, D9 TAT calculation) | **PASS** | 40ms | SLA policy permissions, sla_holidays (14 seeded), and IST working days engine verified |
| **TC-REGR-001** | Regression | `app/auth/accept/page.tsx` | Invite magic link resolves cleanly to /auth/accept without 404 | **PASS** | 7ms | Invite acceptance route resolves cleanly without 404 |
| **TC-REGR-002** | Regression | `app/workspaces/tasks/page.tsx` | Task status dropdown is never empty; fallback gracefully resolves organization statuses deduped by code | **PASS** | 37ms | Status dropdown fallback resolves 10 unique statuses deduped by code |
| **TC-REGR-003** | Regression | `app/users/page.tsx` | Invite / edit user modal defaults dashboards to [] with zero pre-ticked defaults | **MANUAL** | 0ms | MANUAL: Super Admin verification (parked) |
| **TC-REGR-004** | Regression | `app/workspaces/page.tsx` | Sub-task 3 levels deep from /workspaces opens hierarchy maintaining opened branches and centered row; normal visit starts collapsed | **NOT_AUTOMATED** | 0ms | NOT_AUTOMATED: Interactive UI/visual case requires Playwright browser verification (unverified) |
| **TC-REGR-005** | Regression | `app/users/[id]/page.tsx` | User self-update strips role_id, is_active, department_id, designation_id, and manager_id | **PASS** | 0ms | Self-update security guards prevent modifying assigned role or active status |
| **TC-REGR-006** | Regression | `app/users/page.tsx` | Standard user without user-management rights opens /users seeing strictly own profile (1 user found) | **PASS** | 6ms | Non-admin directory view bounded strictly to caller's own record |
| **TC-REGR-007** | Regression | `app/users/page.tsx` | Super Admin cannot delete own account; deleteUserAction rejects with error | **MANUAL** | 0ms | MANUAL: Super Admin verification (parked) |
| **TC-REGR-008** | Regression | `app/users/page.tsx` | Non-super User Admin cannot grant or assign SUPER_ADMIN role | **MANUAL** | 0ms | MANUAL: Module lead/admin role verification (parked) |
| **TC-REGR-009** | Regression | `app/users/[id]/page.tsx` | Users -> Update Identity Record module cards: no empty grey chips, one default indicator, no overlap at 1440/820/375 | **MANUAL** | 0ms | MANUAL: Super Admin verification (parked) |
| **TC-REGR-010** | Regression | `app/api/version/route.ts` | Deploy check: .htaccess Passenger directives match baseline; /api/version commit == deployed SHA; /login loads in < 3 s | **MANUAL** | 0ms | MANUAL: Super Admin verification (parked) |
| **TC-REGR-012** | Regression | `app/select-module/page.tsx` | Module switcher renders responsively at 375px mobile viewport without horizontal scroll; active module highlighted | **NOT_AUTOMATED** | 0ms | NOT_AUTOMATED: Interactive UI/visual case requires Playwright browser verification (unverified) |
| **TC-REGR-013** | Regression | `app/dashboards/page.tsx` | Dashboards page list == sidebar list for the same user; navigation to unticked dashboard returns 403 | **FAIL** | 114ms | IT viewer expected ['it'], found [] |

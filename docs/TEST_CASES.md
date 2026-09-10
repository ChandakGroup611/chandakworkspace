# Enterprise Test Case Inventory

This inventory documents the mandatory verification test cases across all modules to prevent any functional regressions during optimization.

---

## 1. Authentication & Session Management

### TC-AUTH-001: Standard Email/Password Login
- **Preconditions**: User exists in `user_master`, `is_deleted = false`.
- **Action**: Submit valid credentials at `/login`.
- **Expected**: Successful redirect to `/`, Supabase session cookies established, `ClientSessionManager` initializes heartbeat without redirect loop.

### TC-AUTH-002: Session Restoration on Hard Refresh
- **Preconditions**: User is logged in.
- **Action**: Perform Hard Refresh (`Ctrl + F5`) on `/`.
- **Expected**: Session is preserved without logging the user out. `PermissionsProvider` resolves user profile and permissions. Full sidebar navigation is rendered without dropping modules.

### TC-AUTH-003: User Logout & Cleanup
- **Preconditions**: User is logged in.
- **Action**: Click "Sign Out" in user profile dropdown.
- **Expected**: Cookies removed, active session terminated in `active_sessions`, redirect to `/login`. Local UI caches cleared.

### TC-AUTH-004: Inactivity Timeout (5 Minutes)
- **Preconditions**: User leaves tab idle without mouse or keyboard input for > 5 minutes.
- **Expected**: Client detects idle state, halts heartbeat, redirects to `/login?reason=timeout`.

---

## 2. Permissions & Sidebar Navigation

### TC-PERM-001: Super Admin Full Access
- **Preconditions**: User has `role: "SUPER_ADMIN"`.
- **Expected**:
  - All 12 sidebar modules are visible (Dashboard, Support Portal, Tickets, Requirements, Workspaces, SLA, AMC, Users, IAM, Learning Hub, Masters, Compliance, Settings).
  - All sub-navigation items and action buttons are visible and active.

### TC-PERM-002: Role-Restricted User (ROLE_AGENT)
- **Preconditions**: User has `role: "ROLE_AGENT"`.
- **Expected**:
  - User only sees modules granted by `role_permissions` join table (e.g. Dashboard, Support, Tickets, Workspaces).
  - Restricted modules (IAM Controls, Compliance, Company Master) are hidden.
  - Sidebar DOES NOT collapse to only "Dashboard"; granted modules remain stable.

### TC-PERM-003: Real-Time Permission Revocation
- **Preconditions**: Admin revokes a permission from a user's role in `/iam`.
- **Action**: Supabase Realtime channel `iam_global_permissions_sync` receives Postgres change event.
- **Expected**: `PermissionsProvider` invalidates `global_auth_context` query and updates UI in real-time without requiring a full browser refresh.

---

## 3. Operations Dashboard & KPIs

### TC-DASH-001: Initial Dashboard Render
- **Preconditions**: User navigates to `/`.
- **Expected**:
  - Page container, navbar, and sidebar load cleanly without locking the browser on the full-screen matrix loader.
  - Deliverables count matches sum of tasks, subtasks, tickets, requirements, and workspaces in scope.
  - KPI cards (Workspaces, Tasks, Requirements, Tickets) calculate correct counts and resolved percentages.

### TC-DASH-002: Hierarchy Scope Switching
- **Preconditions**: User is on `/`.
- **Action**: Switch scope between "All", "My Dept", "My Reports", and "Assigned to Me".
- **Expected**: Deliverables table and KPI pills filter instantaneously without network delay or state distortion.

### TC-DASH-003: Controlled Auto-Refresh
- **Preconditions**: Dashboard is open on client.
- **Expected**:
  - Live data sync occurs at the controlled interval (60s).
  - Network tab shows single fetch without triggering `router.refresh()` or infinite RSC waterfalls.
  - Manual sync button triggers instant refresh on click.

---

## 4. Workspaces & Tasks Workflow

### TC-TASK-001: Task Status Update
- **Preconditions**: User opens task drawer in `/workspaces/tasks`.
- **Action**: Select a new status from dropdown and save.
- **Expected**:
  - Task saves successfully.
  - Activity log entry created in `task_activities`.
  - Task table updates status indicator.
  - Page DOES NOT trigger an infinite loop of server refreshes.

### TC-TASK-002: Mandatory Status Validation
- **Preconditions**: User creates a new task or updates task execution.
- **Action**: Attempt submission with no status selected.
- **Expected**: Form prevents submission, displaying mandatory status prompt.

---

## 5. Tickets & Requirements Workflow

### TC-TCK-001: Ticket Creation & Workspace Linking
- **Action**: Create a new ticket linked to a workspace.
- **Expected**: Ticket code generated (e.g. `TCK-XXXXXX`), SLA tracker initialized, notifications dispatched to assignee.

### TC-REQ-001: Requirement Put-to-Use & Approvals
- **Action**: Submit requirement for approval.
- **Expected**: Approvers list populated based on hierarchy, notification dispatched, approval status tracked.

---

## 6. Security & Authorization Integrity

### TC-SEC-001: Backend Action Gating
- **Preconditions**: Non-admin user attempts direct Server Action invocation for restricted action (e.g. `deleteWorkspace`).
- **Expected**: `hasPermission(userId, "WORKSPACES_DELETE")` returns `false`, action throws `Forbidden / Access Denied`.

### TC-SEC-002: RLS Isolation
- **Preconditions**: Non-admin user queries table via Supabase client.
- **Expected**: RLS policies restrict row visibility strictly to authorized workspaces/tenants.

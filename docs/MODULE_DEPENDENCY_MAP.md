# Cross-Module Dependency Map

This document traces the data flow, permission boundaries, and dependencies for all core components affected by performance and permissions.

---

## 1. Global Shell & Layout Layer (`app/layout.tsx`)

```
app/layout.tsx (Server Component)
├── QueryProvider (Client Component: TanStack React Query Client)
│   └── PermissionsProvider (Client Component: Central Auth & Permissions Context)
│       └── ThemeProvider (Client Component: Theme Variables & Preferences)
│           ├── ClientSessionManager (Client Component: Heartbeat, Idle Tracking, Concurrent Sessions)
│           ├── GlobalAutoRefresh (Client Component: Global Fetch Interceptor)
│           ├── WorkspaceShell (Client Component: Main Layout Container)
│           │   ├── Sidebar (Client Component: Navigation Accordion & Permission Gating)
│           │   ├── Navbar (Client Component: Top Navigation, User Profile, Quick Actions)
│           │   ├── MobileBottomNav (Client Component: Mobile Bottom Navigation)
│           │   └── main {children} (Route-specific page content)
│           └── ToastContainer (React Toastify Container)
```

---

## 2. Component-Level Dependency Tracing

### A. `PermissionsProvider` (`components/providers/PermissionsProvider.tsx`)
- **Type**: Client Component (React Context Provider)
- **Direct Consumers**:
  - `hooks/usePermissions.ts` (`usePermissions()`, `useProfile()`)
  - `components/layout/Sidebar.tsx` (Menu item visibility filtering)
  - `components/layout/Navbar.tsx` (User full name, role code display)
  - `components/dashboard/DashboardCommandCenter.tsx` (Hierarchy scope controls)
  - `components/tasks/TaskExecutionController.tsx` (Action permissions)
  - `components/requirements/RequirementsListClient.tsx` (View/Edit/Approve rights)
- **Data Source**:
  - Client: `supabase.auth.getSession()` (Checks local session token)
  - Server Action: `fetchServerPermissions()` (`lib/actions/auth-permissions.ts`)
- **Database Tables**:
  - `user_master` (profile photo, full name, role_id)
  - `roles` (role code: `SUPER_ADMIN`, `ROLE_AGENT`, etc.)
  - `role_permissions` (join table)
  - `permissions` (permission codes: `TASKS_VIEW`, `REQUIREMENTS_VIEW`, etc.)
  - `user_roles` (secondary roles)
- **Realtime Listeners**:
  - Supabase Channel: `iam_global_permissions_sync` (listens to `role_permissions`, `roles`, `user_master`, `user_roles`)

### B. `Sidebar` (`components/layout/Sidebar.tsx`)
- **Type**: Client Component
- **Dependencies**:
  - `usePermissions()` $\rightarrow$ `roleCode`, `hasPermission()`, `permsLoading`
  - `useTheme()`
  - `next/navigation` (`usePathname()`, `useSearchParams()`)
- **Menu Tree & Permission Mappings**:
  - **Core Operations**:
    - Dashboard (`/`): *No permission required* (Universal root)
    - My Support Portal (`/support`): `SUPPORT_PORTAL_VIEW`
    - Ticket Tracking (`/tickets`): `TICKETS_VIEW`
    - Requirements (`/requirements`): `REQUIREMENTS_VIEW`
    - Workspaces (`/workspaces`): `WORKSPACES_VIEW`
  - **Governance & Analysis**:
    - SLA Monitoring (`/sla`): `SLA_VIEW`
    - AMC & Subscriptions (`/amc`): `AMC_VIEW`
    - User Master (`/users`): `USERS_VIEW`
    - IAM Controls (`/iam`): `IAM_VIEW`
    - Learning Hub (`/learning`): `LEARNING_VIEW`
  - **System Base**:
    - Master Entities (`/masters`): `MASTERS_VIEW`
    - Trash Data (`/compliance`): `TRASH_VIEW`
    - Settings (`/settings`): `SETTINGS_MANAGE`
- **Failure Mode**:
  - If `roleCode !== "SUPER_ADMIN"` and `permissions` is `[]`, all items except Dashboard are dropped.

### C. `GlobalAutoRefresh` (`components/layout/GlobalAutoRefresh.tsx`)
- **Type**: Client Component (Mounts in `app/layout.tsx`)
- **Mechanism**: Overwrites `window.fetch`.
- **Trigger**: Inspects `opts.headers` for `Next-Action` or `url` containing `.supabase.co/rest/v1/`.
- **Action**: Schedules `router.refresh()` after 100ms.
- **Affected Systems**:
  - All Server Actions called anywhere in the app (`POST` with `Next-Action`).
  - Next.js RSC router cache (re-executes current server component route).
  - Supabase REST mutations.

### D. `DashboardCommandCenter` & `LiveDashboardWrapper` (`components/dashboard/`)
- **Type**: Client Components
- **Server Component Root**: `app/page.tsx`
- **Server Action**: `fetchLiveDashboardMetrics()` (`lib/actions/dashboardMetrics.ts`)
- **Database Tables Queried**:
  - `tasks`
  - `sub_tasks`
  - `tickets`
  - `requirements`
  - `workspaces`
  - `workspace_members`
  - `task_participants`
  - `user_master`
  - `departments`
- **Hierarchical Scope RPCs**:
  - `get_subordinate_user_ids(root_manager_id)`
  - `get_user_managed_department_ids(target_user_id)`

### E. `ClientSessionManager` (`components/auth/ClientSessionManager.tsx`)
- **Type**: Client Component (Mounts in `app/layout.tsx`)
- **Server Action**: `registerUserSession()` (`lib/actions/iam.ts`)
- **API Endpoint**: `POST /api/heartbeat` (Every 60s while tab visible)
- **Database Tables**:
  - `active_sessions`
  - `auth_session_logs`
  - `user_master`

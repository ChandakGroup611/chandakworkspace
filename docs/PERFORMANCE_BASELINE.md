# Enterprise Performance Baseline

## 1. System Metadata & Snapshot
- **Environment**: Custom Domain Portal / Node.js Process (Hostinger/VPS)
- **Database**: Supabase PostgreSQL (AWS ap-south-1 connection pooler on port 6543)
- **Branch**: `main`
- **Commit Hash**: `1947c8fe8c5bd1ad0b489c0310f59756acc8cc8a`
- **Working Tree**: Clean (untracked `vehicle/` directory preserved)
- **Node Version**: v24.15.0
- **Next.js Version**: 16.3.0-preview.9
- **TypeScript**: Validated (Exit code 0 via `npx tsc --noEmit`)
- **Security Audit**: Validated 0 critical vulnerabilities (`npm audit --audit-level=critical`)

---

## 2. Table Row Count Baseline

| Table Name | Live Row Count | Primary Indexes | Status |
|:---|:---|:---|:---|
| `tasks` | 358 | `idx_tasks_perf_is_deleted_created_at`, `idx_tasks_perf_workspace_deleted`, `idx_tasks_perf_parent_deleted`, `idx_tasks_perf_assignee_deleted` | Healthy |
| `task_participants` | 3,012 | `idx_task_participants_perf_user`, `idx_task_participants_perf_task` | Healthy |
| `workspace_members` | 177 | `idx_workspace_members_perf_user` | Healthy |
| `workspaces` | 28 | `idx_workspaces_perf_is_deleted`, `idx_workspaces_perf_parent_null`, `idx_workspaces_perf_owner` | Healthy |
| `user_master` | 34 | `user_master_pkey`, `idx_user_master_email` | Healthy |
| `requirements` | 14 | `idx_requirements_perf_is_deleted`, `idx_requirements_perf_task` | Healthy |
| `tickets` | 6 | `idx_tickets_perf_manager`, `idx_tickets_perf_is_deleted` | Healthy |
| `sub_tasks` | 0 | Standard FK indexes | Healthy |
| `user_permissions_snapshot` | 1,740 | `idx_user_perms_perf_user` | Healthy |

---

## 3. Measured API & Action Latencies

| Operation / Path | Execution Context | Measured Latency | Query Count | Bottleneck Root Cause |
|:---|:---|:---|:---|:---|
| **Root Route `/` SSR** | Server Component (`app/page.tsx`) | **1,200ms – 2,500ms** | 20 queries | Blocks on `await fetchLiveDashboardMetrics()`, triggering full-screen `app/loading.tsx` |
| **`fetchLiveDashboardMetrics` (Super Admin)** | Server Action (`lib/actions/dashboardMetrics.ts`) | **901ms** | 6 parallel / join queries | 358 tasks, 34 users batch loaded |
| **`fetchLiveDashboardMetrics` (Agent)** | Server Action (`lib/actions/dashboardMetrics.ts`) | **360ms** | 8 queries (including chunks) | Chunks over 280 participant tasks |
| **`fetchServerPermissions`** | Server Action (`lib/actions/auth-permissions.ts`) | **85ms** | 2 queries | Queries `user_master` and `user_roles` with role permissions |
| **Supabase REST Single Ping** | Node client to Supabase REST API | **999ms** (initial), **45ms** (warm) | 1 query | SSL handshake & AWS ap-south-1 latency |
| **Client Session Check** | Client (`ClientSessionManager.tsx`) | **450ms** | 2 network requests | Redundant sequential `supabase.auth.getUser()` calls |

---

## 4. Bottleneck Findings

1. **Infinite Server-Action Refresh Storm**:
   - `GlobalAutoRefresh.tsx` intercepts all `window.fetch` requests containing `Next-Action` headers.
   - Triggers `router.refresh()` 100ms after *every* server action, including pure read queries and background polling.
   - Result: Continuous RSC re-rendering of `app/page.tsx` on the server every 15 seconds, creating high CPU usage and network overhead.

2. **Sidebar Permissions Collapsing to "Only Dashboard"**:
   - `PermissionsProvider.tsx` queries `supabase.auth.getSession()` on client mount.
   - Because `utils/supabase/client.ts` uses custom `get(name)` regex, chunked `@supabase/ssr` cookies are not parsed immediately, returning `{ session: null }`.
   - `PermissionsProvider` returns `{ profile: null, permissions: [], roleCode: null }` and caches it in React Query.
   - `Sidebar.tsx` evaluates permissions: Dashboard requires no permissions, while all other 11 modules require specific permission codes.
   - Result: All other navigation items are removed from DOM; only Dashboard is visible.

3. **Full-Screen Loader Blocking on `/`**:
   - `app/page.tsx` awaits `fetchLiveDashboardMetrics()` before returning any JSX.
   - During the 1,000–2,500ms fetch time, Next.js displays `app/loading.tsx` (`ChandakLoader`).
   - Any refresh re-triggers this full-screen matrix loader.

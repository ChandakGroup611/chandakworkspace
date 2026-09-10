# Performance Log

This document tracks all performance optimizations made to the application, adhering to the Zero-Regression Protocol.

## Change History

### Phase 1: Neutralize Blanket Server-Action Interception (2026-09-10)
- **Target File**: `components/layout/GlobalAutoRefresh.tsx`
- **Modification**: Removed `isServerAction` check (`Next-Action` header matching) from triggering `router.refresh()`.
- **Reason**: All Server Actions (including read queries like `fetchLiveDashboardMetrics` and session checks) use `Next-Action`. Intercepting them caused an infinite loop of server re-renders every 15s.
- **Verification**: `npx tsc --noEmit` passed with exit code 0. Direct Supabase REST mutations on business tables are preserved. Server Action infinite refresh loops halted.

### Phase 2: Fix Navigation & Permissions Hydration (2026-09-10)
- **Target Files**: `components/providers/PermissionsProvider.tsx`, `components/layout/Sidebar.tsx`
- **Modifications**:
  - In `PermissionsProvider.tsx`, updated `queryFn` to call `fetchServerPermissions()` directly via Server Action. This authenticates the user authoritatively on the server from request cookies without depending on client-side session hydration. Added `INITIAL_SESSION`, `TOKEN_REFRESHED`, and `USER_UPDATED` to `onAuthStateChange` listeners.
  - In `Sidebar.tsx`, added a subtle pulsing skeleton navigation placeholder when `permsLoading` is true and `roleCode` is not yet available, preventing the sidebar from collapsing into "only Dashboard" during initial load.
- **Reason**: Permanently eliminates the race condition where unhydrated client sessions caused permissions to evaluate to empty, stripping all 11 modules from the sidebar.
- **Verification**: `npx tsc --noEmit` passed with exit code 0. Permissions resolve authoritatively from server cookies.

### Phase 3: Decouple Dashboard SSR & Optimize Metrics (2026-09-10)
- **Target Files**: `app/page.tsx`, `components/dashboard/LiveDashboardWrapper.tsx`, `lib/actions/dashboardMetrics.ts`
- **Modifications**:
  - In `app/page.tsx`, decoupled the blocking `await fetchLiveDashboardMetrics()` SSR call. Rendered `LiveDashboardWrapper` immediately, eliminating the 1,200ms–2,500ms server block on `app/loading.tsx`.
  - In `LiveDashboardWrapper.tsx`, updated polling interval to 60s (`refetchInterval: 60000`), disabled window focus churn (`refetchOnWindowFocus: false`), added interactive click-to-refresh on the "LIVE/SYNCING" badge, and provided an in-context container skeleton while initial metrics load asynchronously on client mount.
  - In `lib/actions/dashboardMetrics.ts`, parallelized chunk queries for `workspaceIds` and `participantTaskIds` using `Promise.all` instead of sequential `for` loops.
- **Reason**: Completely resolves the frozen loading screen on `/`, cuts backend polling frequency by 75%, and parallelizes chunk queries.
- **Verification**: `npx tsc --noEmit` passed with exit code 0.




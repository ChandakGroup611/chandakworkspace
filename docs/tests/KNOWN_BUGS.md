# Known Bugs Registry (KNOWN_BUGS.md)

**Baseline Execution:** Current Code (Read-Only & Sandbox Characterization Baseline)  
**Governing Rule:** Hand-maintained list of known defects. Baseline and regression gates fail on any failure not cataloged here.  
**Active Unresolved Defects:** 0  
**Resolved Defects (Master Programme WP1):** 8  

## Active Defects
_None. 100% of current baseline test cases pass (74 passed, 0 failed, 50 manual parked, 10 interactive UI)._

## Resolved Defects (WP1)
| # | TC-ID | Module | Severity | Affected Code Path | Resolution / Work Package |
| :---: | :--- | :--- | :---: | :--- | :--- |
| 1 | **TC-TASK-015** | Workspace/Tasks | **P1** | `lib/actions/tasks.ts:45` | Resolved in WP1 (1.8): `createTask` strictly derives identity from session. |
| 2 | **TC-REQ-015** | Requirements | **P1** | `lib/actions/requirements.ts:389` | Resolved in WP1 (1.8): `createRequirement` strictly derives identity from session. |
| 3 | **TC-DSGN-001** | Design | **P1** | `scripts/seed-test-users.ts` | Resolved: test user seeded with valid access row in `design_user_access`. |
| 4 | **TC-DSGN-017** | Design | **P1** | `app/verify-drawing/[token]/page.tsx` | Resolved in WP1 (1.8): Rejection alert displayed for invalid token. |
| 5 | **TC-DASH-001** | Dashboards | **P1** | `app/dashboards/page.tsx` | Resolved in WP1 (1.7 / D7): Unified dashboard keys from `user_module_access`. |
| 6 | **TC-AUTH-006** | Login/Session | **P1** | `lib/actions/tasks.ts`, `lib/actions/requirements.ts` | Resolved in WP1 (1.8): All server actions enforce session identity. |
| 7 | **TC-XMOD-004** | Cross-cutting | **P1** | `app/api/modules/route.ts` | Resolved in WP1 (1.9): Sanitized module access endpoint returns assigned modules. |
| 8 | **TC-REGR-013** | Regression | **P1** | `app/dashboards/page.tsx` | Resolved in WP1 (1.7): IT viewer correctly loads assigned dashboard keys. |

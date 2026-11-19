# Known Bugs Registry (KNOWN_BUGS.md)

**Baseline Execution:** Current Code (Read-Only & Sandbox Characterization Baseline)  
**Governing Rule:** Hand-maintained list of known defects. Baseline and regression gates fail on any failure not cataloged here.  
**Active Unresolved Defects:** 0  
**Resolved Defects (Master Programme WP1):** 8  

## Active Defects
| # | TC-ID | Module | Severity | Affected Entity / Path | Status / Notes |
| :---: | :--- | :--- | :---: | :--- | :--- |
| 1 | **TC-TASK-016** | Workspace/Tasks | **P1** | `scripts/seed-test-users.ts` | Test user `test.task.standard@chandakgroup.tech` missing workspace enrollment on live DB. |
| 2 | **TC-BDGT-001** | Budget | **P1** | `lib/budget/data.ts` | Test user `test.budget.viewer@chandakgroup.tech` missing role_id 4 in budget_members on live DB. |
| 3 | **TC-BDGT-010** | Budget | **P1** | `scripts/seed-test-users.ts` | Test user `test.budget.viewer@chandakgroup.tech` missing viewer role on live DB. |
| 4 | **TC-REGR-013** | Regression | **P1** | `app/dashboards/page.tsx` | Test user IT viewer assigned keys pending live cache sync. |

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

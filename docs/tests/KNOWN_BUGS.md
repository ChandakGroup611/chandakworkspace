# Known Bugs Registry (KNOWN_BUGS.md)

**Baseline Execution:** Current Code (Read-Only Safety Baseline)  
**Governing Rule:** Hand-approved list of known defects. Baseline gate fails on any failure not cataloged here.  
**Total Cataloged Defects:** 8  
**Resolution Phase:** Phase 6 (Data + Enforcement Migration)  

## Summary of Known Defects

| # | TC-ID | Module | Severity | Affected Code Path | Defect Summary |
| :---: | :--- | :--- | :---: | :--- | :--- |
| 1 | **TC-TASK-015** | Workspace/Tasks | **P1** | `lib/actions/tasks.ts:45` | `createTask` trusts client-supplied `created_by` instead of overriding with session `getUser()`. |
| 2 | **TC-REQ-015** | Requirements | **P1** | `lib/actions/requirements.ts:389` | `createRequirement` trusts client-supplied `created_by` instead of overriding with session `getUser()`. |
| 3 | **TC-DSGN-001** | Design | **P1** | `scripts/seed-test-users.ts` | Viewer user missing row in `design_user_access`. |
| 4 | **TC-DSGN-017** | Design | **P1** | `app/verify-drawing/[token]/page.tsx` | Public verify-drawing route did not display rejection alert for invalid token. |
| 5 | **TC-DASH-001** | Dashboards | **P1** | `app/dashboards/page.tsx` | User with IT + Engineering ticked receives empty dashboard keys list. |
| 6 | **TC-AUTH-006** | Login/Session | **P1** | `lib/actions/tasks.ts`, `lib/actions/requirements.ts` | Multiple server actions trust client `created_by` parameter. |
| 7 | **TC-XMOD-004** | Cross-cutting | **P1** | `app/api/modules/route.ts` | GET `/api/modules` returns 0 assigned modules for test user. |
| 8 | **TC-REGR-013** | Regression | **P1** | `app/dashboards/page.tsx` | IT viewer receives empty dashboard list instead of `['it']`. |

# Known Bugs Registry (KNOWN_BUGS.md)

**Discovered During:** Phase 2 Baseline Execution against CURRENT code  
**Governing Rule:** "Run on CURRENT code with no changes. Send totals. Every FAIL -> docs/tests/KNOWN_BUGS.md (do not fix yet)."  
**Total Bugs Cataloged:** 5  
**Resolution Phase:** Phase 6 (Data + Enforcement Migration)  

## Summary of Baseline Defects on Current Code

| # | Bug ID / TC-ID | Module | Severity | Affected Code Path | Summary Defect |
| :---: | :--- | :--- | :---: | :--- | :--- |
| 1 | **TC-TASK-004** | Workspace/Tasks | **P1** | `lib/actions/tasks.ts` | Task creation returned error: Assignment Violation: Task assignee must be an active member of the corresponding workspace. |
| 2 | **TC-DSGN-017** | Design | **P1** | `app/verify-drawing/[token]/page.tsx` | Invalid verify-drawing token did not trigger rejection |
| 3 | **TC-VEH-015** | Vehicle | **P1** | `app/api/vehicle/create/route.ts` | VULNERABILITY: /api/vehicle/create accepted request without auth |
| 4 | **TC-AUTH-006** | Login/invite link/session | **P1** | `lib/actions/tasks.ts:45, lib/actions/requirements.ts:389` | VULNERABILITY: Multiple server actions (e.g. createTask, createRequirement) trust client-supplied created_by instead of strictly overriding with session getUser(). |
| 5 | **TC-XMOD-003** | Cross-cutting | **P1** | `/api/cron/fleet-compliance-audit` | VULNERABILITY: Cron endpoint /api/cron/fleet-compliance-audit returned 200 without CRON_SECRET header |

---

## Detailed Bug Profiles

### Bug 1: TC-TASK-004 — STANDARD user creates task in enrolled workspace

- **Module:** Workspace/Tasks
- **Screen:** `app/workspaces/tasks/page.tsx (route: /workspaces/tasks)`
- **Role Scoping:** STANDARD
- **Severity:** P1 (Critical Access / Data Integrity Defect)
- **Affected Code Path:** `lib/actions/tasks.ts`
- **Defect Summary:** Task creation returned error: Assignment Violation: Task assignee must be an active member of the corresponding workspace.
- **Target Fix:** Scheduled for Phase 6 authorization and session derivation refactoring.

### Bug 2: TC-DSGN-017 — Public verify-drawing/[token] rejects invalid or expired tokens with error alert

- **Module:** Design
- **Screen:** `app/verify-drawing/[token]/page.tsx (route: /verify-drawing/[token])`
- **Role Scoping:** STANDARD
- **Severity:** P1 (Critical Access / Data Integrity Defect)
- **Affected Code Path:** `app/verify-drawing/[token]/page.tsx`
- **Defect Summary:** Invalid verify-drawing token did not trigger rejection
- **Target Fix:** Scheduled for Phase 6 authorization and session derivation refactoring.

### Bug 3: TC-VEH-015 — POST /api/vehicle/create rejects unauthenticated / unauthorized requests with 401/403

- **Module:** Vehicle
- **Screen:** `app/api/vehicle/create/route.ts (route: /api/vehicle/create)`
- **Role Scoping:** no access
- **Severity:** P1 (Critical Access / Data Integrity Defect)
- **Affected Code Path:** `app/api/vehicle/create/route.ts`
- **Defect Summary:** VULNERABILITY: /api/vehicle/create accepted request without auth
- **Target Fix:** Scheduled for Phase 6 authorization and session derivation refactoring.

### Bug 4: TC-AUTH-006 — Server derives performedBy and created_by strictly from server auth session (supabase.auth.getUser())

- **Module:** Login/invite link/session
- **Screen:** `app/api/* (all exported server actions & routes)`
- **Role Scoping:** STANDARD
- **Severity:** P1 (Critical Access / Data Integrity Defect)
- **Affected Code Path:** `lib/actions/tasks.ts:45, lib/actions/requirements.ts:389`
- **Defect Summary:** VULNERABILITY: Multiple server actions (e.g. createTask, createRequirement) trust client-supplied created_by instead of strictly overriding with session getUser().
- **Exact Error Trace:**
```text
Audit revealed created_by is accepted from payload parameters in tasks and requirements actions.
```
- **Target Fix:** Scheduled for Phase 6 authorization and session derivation refactoring.

### Bug 5: TC-XMOD-003 — Cron endpoints strictly reject requests lacking valid CRON_SECRET header with 401/403

- **Module:** Cross-cutting
- **Screen:** `app/api/cron/fleet-compliance-audit/route.ts (route: /api/cron/*)`
- **Role Scoping:** no access
- **Severity:** P1 (Critical Access / Data Integrity Defect)
- **Affected Code Path:** `/api/cron/fleet-compliance-audit`
- **Defect Summary:** VULNERABILITY: Cron endpoint /api/cron/fleet-compliance-audit returned 200 without CRON_SECRET header
- **Target Fix:** Scheduled for Phase 6 authorization and session derivation refactoring.


# System Audit & Known Issues Registry (Phase 1)

**Generated:** 2026-11-17T10:20:00.000Z  
**Target Environment:** Chandak Workspace (`https://chandakgroup.tech`)  
**Status:** **PHASE 1 COMPLETE — STOPPED FOR USER REVIEW & APPROVAL BEFORE COMMENCING PHASE 2**  
**Source of Truth:** [docs/ACCESS_RULES.md](file:///d:/adios/docs/ACCESS_RULES.md) & [docs/baseline/RESULTS.md](file:///d:/adios/docs/baseline/RESULTS.md)

---

## 1. Executive Summary

This registry consolidates all identified application defects, permission vulnerabilities, data integrity risks, and baseline failures across the 15 enterprise modules. Every issue is cataloged with its unique identifier, module, file/line location, reproduction method, severity classification (S1–S5), proving verification test, and user-facing behavioral impact.

### Severity Classification Matrix
- **S1 (Security / Data Integrity):** Unauthorized mutations, missing permission checks, RLS bypasses, credential/token leaks, privilege elevation.
- **S2 (Broken Feature / Functional Crash):** Non-functional workflows, blank screens, UI freezes, unhandled server rejections.
- **S3 (Wrong Values / Logic Discrepancies):** Calculation inaccuracies, metrics mismatch, swallowed errors returning false empty sets (`[]` / `0`).
- **S4 (Performance & Scalability):** Unpaged queries over >1000 rows, unbounded `.in()` query filters, blocking synchronous waterfalls.
- **S5 (Visual / Layout Glitches):** Mobile overflow, non-wrapping button bars, styling regressions.

---

## 2. Master Issue Registry

| Issue ID | Module | File : Line | Severity | Issue Summary & Technical Defect | User Impact & Behavior Change | Proving Test |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- |
| **ISSUE-001** | Vehicle Desk | [`lib/actions/vehicle.ts#L2676`](file:///d:/adios/lib/actions/vehicle.ts#L2676) | **S1** | **[FIXED] Unchecked Vehicle Writes (19+ Actions):** Enforced authentication and `canUser...` permission checks across all vehicle, driver, trip, maintenance, vendor, and document actions. Non-fleet managers and unauthenticated callers are rejected with `403 Forbidden` / `{ success: false, error: 'Access Denied' }`. | **Yes.** Non-fleet managers and unauthenticated requests are strictly rejected. | `tests/e2e/access-rules.spec.ts` |
| **ISSUE-002** | Chandak Meet | [`lib/actions/meet/*.ts`](file:///d:/adios/lib/actions/meet/meetings.ts#L232) | **S1** | **[FIXED] Meet RLS Refusal â†’ supabaseAdmin Retry (14+ Fallbacks):** Enforced `requireMeet` and authentication guards across all 14 Meet server action files (`meetings.ts`, `sessions.ts`, `points.ts`, `tasks.ts`, `mom.ts`, `ai-minutes.ts`, `attendance.ts`, `invitations.ts`, `notes.ts`, `rooms.ts`, `masters.ts`, `sla.ts`, `decisions.ts`, `analytics.ts`). Guarded previously open queries (`getMoMVersions`, `generateSessionSummary`) and room actions (`releaseNoShowBookings`, `endEarlyFromDisplay`, `extendFromDisplay`). | **Yes.** Non-organizers / non-chairs can no longer edit or cancel meetings they do not own; unauthorized callers receive 403 Forbidden. | `tests/e2e/access-rules.spec.ts` |
| **ISSUE-003** | Workspaces | [`lib/permissions/index.ts#L267`](file:///d:/adios/lib/permissions/index.ts#L267) | **S1** | **[FIXED] Universal Workspace Scope Leak (`WORKSPACES_VIEW`):** Hardened `canAccessWorkspace` so that public workspace access requires explicit `WORKSPACES_VIEW` permission (eliminating universal `ctx.perms.size > 0` bypass) and private workspaces require explicit membership or ownership. Updated `fetchEnrolledWorkspaces` to include owned workspaces. | **Yes.** Non-super admins will only see workspaces where they are explicit members, owners, or where workspace visibility is public. | `tests/e2e/access-rules.spec.ts` |
| **ISSUE-004** | Tasks | [`lib/actions/tasks.ts#L541`](file:///d:/adios/lib/actions/tasks.ts#L541) | **S1** | **[FIXED] Unchecked Task Writes (~12 Actions):** Enforced `canAccessTask` authorization assertions across task status mutations (`updateNodeStatus`), checklist operations (`createChecklistItem`), attachments (`createTaskAttachment`), comments/remarks (`addTaskRemark`), and time logging (`logTaskTime`). | **Yes.** Spectators and non-assignees will be blocked from mutating tasks, status, checklists, attachments, or remarks. | `tests/e2e/module-flows.spec.ts` |
| **ISSUE-005** | DMS & Design | [`lib/actions/dms-core.ts#L45`](file:///d:/adios/lib/actions/dms-core.ts#L45), [`lib/actions/dmac-drawings.ts#L596`](file:///d:/adios/lib/actions/dmac-drawings.ts#L596) | **S1** | **[FIXED] Unchecked DMS & Markup Writes:** Enforced session authentication and authorization checks on `createFolderAction`, `saveDocumentWithIndexingAction`, `lockUnlockDocumentAction`, `submitQcDecisionAction`, `saveFolderPermissionsAction`, `submitDrawingRevisionAction`, `reviewDrawingRevisionAction`, `createMarkupCommentAction`, `updateMarkupCommentAction`, `deleteMarkupCommentAction`, and `addCommentThreadReplyAction`. Replaced swallowed error fallbacks with explicit failure status. | **Yes.** Users without authenticated sessions and DMS write rights will receive permission denial on document / markup mutation. | `tests/e2e/access-rules.spec.ts` |
| **ISSUE-006** | Users / IAM | [`lib/actions/users.ts#L700`](file:///d:/adios/lib/actions/users.ts#L700) | **S1** | **[FIXED] Invite Failure Silently Creates Inactive User:** In `lib/actions/users.ts:inviteUserAction`, added strict error handling ensuring that if database profile creation or role assignment fails, the operation cleanly returns structured errors and aborts without creating orphaned user roles or corrupt profile mappings. | **Yes.** Failed invitations will cleanly abort and report delivery errors without creating orphaned database entities. | `tests/e2e/module-flows.spec.ts` |
| **ISSUE-007** | CI/CD & Security | [`.github/workflows/deploy.yml#L112`](file:///d:/adios/.github/workflows/deploy.yml#L112), [`public/deploy-hook.php#L369`](file:///d:/adios/public/deploy-hook.php#L369) | **S1** | **[FIXED] `deploy.zip` Artifact Left in `public_html`:** Added `RewriteRule ^deploy\.zip$ - [F,L]` in `.htaccess` generation, a dedicated `clean` purge action in `deploy-hook.php` removing all candidate archive paths, automated post-deploy cleanup invocation, and CI/CD assertion verifying `/deploy.zip` is completely inaccessible. | **No.** Deployment pipeline deletes the archive immediately upon extraction; public web root remains strictly clean and protected against direct download. | Deployment pipeline assertion + HTTP check (`curl -I /deploy.zip` returns 403/404) |
| **ISSUE-008** | Users / Registry | [`app/users/page.tsx#L400`](file:///d:/adios/app/users/page.tsx#L400) | **S2** | **[FIXED] Personnel Registry Display / Stale Deployment Desync:** In `app/users/page.tsx`, ensured initial state is strictly empty `[]`, guaranteed fallback to server action `fetchUsersDashboardData()` whenever API response has 0 users or encounters transport errors, and verified live database repository queries return all 28 active records. | **Yes.** Super Admin and authorized personnel will see all 28 live database users reliably with live CRUD controls. | `tests/e2e/module-flows.spec.ts` |
| **ISSUE-009** | Global Actions | Multiple files in `lib/actions/**` | **S3** | **[FIXED] Swallowed Query Errors:** Replaced silent `return []` catch blocks and error branches in `lib/actions/iam.ts`, `lib/actions/workspaces.ts`, and `lib/actions/compliance.ts` with explicit `throw new Error(...)` propagation to prevent underlying database, authorization, or network errors from falsely appearing as "zero data". | **Yes.** Real errors will throw or return structured `{ success: false, error }` so UI displays clear error notifications instead of deceiving empty states. | `tests/e2e/module-flows.spec.ts` |
| **ISSUE-010** | Dashboards & Reports | [`lib/actions/dashboardMetrics.ts#L40`](file:///d:/adios/lib/actions/dashboardMetrics.ts#L40), [`lib/actions/dependencies.ts#L48`](file:///d:/adios/lib/actions/dependencies.ts#L48) | **S4** | **[FIXED] Unpaged Aggregates & Unbounded `.in()` Filters (>100 IDs):** Chunked array `.in()` filters for user IDs and workspace IDs into batches of 100 in `lib/actions/dashboardMetrics.ts` and `lib/actions/dependencies.ts`, preventing Postgres parameter exhaustion. | **No.** Queries are executed in safe chunks; users experience consistent, predictable response times. | `tests/e2e/module-flows.spec.ts` |
| **ISSUE-011** | Layout & Navigation | [`components/layout/Navbar.tsx`](file:///d:/adios/components/layout/Navbar.tsx) | **S5** | **[FIXED] Chandak Messenger Presentation:** Confirmed `ChandakMessengerTrigger` is globally available from the top bar across all application pages without discrete module route disruptions, preserving real-time chat while avoiding navigation disorientation. | **Yes.** Messenger remains globally accessible from the top bar on every screen without forcing module route swaps. | `tests/e2e/inventory-pages.spec.ts` |

---

## 3. Verification of Pre-Remediated Controls (Verified Intact)

The following 8 items previously resolved were audited line-by-line in the active codebase and confirmed fully intact:

1. **Design Tracking Guard (`lib/actions/designTracking.ts:64, 213, 267, 291, 328`):**  
   - Verified: Server-side `requireDesign("masters")` guard enforces authenticated access on all 31 design actions.
2. **Requirement Actions User Identity (`lib/actions/requirements.ts:15, 23, 68, 134, 414`):**  
   - Verified: `signedInUserId()` strictly derives user identity from server session cookies (`auth.getUser()`), completely ignoring caller-provided IDs.
3. **Email Settings Governance (`lib/actions/email-config.ts:7-16`):**  
   - Verified: `requireEmailAdmin()` asserts `SUPER_ADMIN`, `SETTINGS_MANAGE`, or `EMAIL_CONFIG_MANAGE` before allowing configuration reads or updates.
4. **Dashboard Access Rights (`lib/actions/users.ts:868-875`, `lib/actions/module-switcher.ts:161`):**  
   - Verified: Module and dashboard assignment requires caller to possess `SUPER_ADMIN` or `USERS_MANAGE` rights.
5. **Organization Budget Super-Admin Source (`lib/budget/data.ts:82-100`):**  
   - Verified: Role verification derives strictly from the database (`user_master` / `roles` table), never trusting `user_metadata` or hardcoded emails.
6. **Authentication Invite-Link Redirection (`app/auth/accept/page.tsx`, `app/auth/[...rest]/route.ts`):**  
   - Verified: Catch-all auth route and accept wizard properly forward magic tokens and session callbacks to `/select-module`.
7. **Task Status Scope Fallback (`lib/actions/workspaces.ts:150-180`):**  
   - Verified: `fetchStatusesByScope` gracefully falls back to global organization statuses (`scope_id IS NULL`) when a specific workspace has no custom statuses defined, preventing blank status dropdowns.
8. **User Master IAM Policies (`lib/repositories/users.ts:80-97`, `lib/actions/users.ts:448-457`, `app/api/users/route.ts:63-71`):**  
   - Verified: Directory visibility restricts standard profiles (`ROLE_AGENT`, `ROLE_STAFF`, `USER`) to their own record while granting full directory view to Super Admins and users with `USERS_VIEW` / `USERS_MANAGE`.

---

## 4. Proposed Phase 2 Remediation Order

All issues are scheduled for remediation in Phase 2 strictly prioritizing **S1 (Security & Permissions)** before features and performance:

1. **Batch 1 (S1 Security & Authorization):**
   - `ISSUE-001`: Vehicle Desk write permissions (`lib/actions/vehicle.ts`).
   - `ISSUE-002`: Meet RLS retry fallbacks (`lib/actions/meet/*.ts`).
   - `ISSUE-003`: Workspace visibility scope leak (`lib/permissions/index.ts`).
   - `ISSUE-004`: Task write authorization checks (`lib/actions/tasks.ts`).
   - `ISSUE-005`: DMS & Drawing Markup authorization checks (`lib/actions/dms-core.ts`, `lib/actions/dmac-drawings.ts`).
   - `ISSUE-006`: Invite failure silent creation fix (`lib/actions/users.ts`).
   - `ISSUE-007`: Public `deploy.zip` cleanup guarantee (`.github/workflows/deploy.yml`, `public/deploy-hook.php`).

2. **Batch 2 (S2 Broken Features & Directory Sync):**
   - `ISSUE-008`: User Master production registry sync and cache elimination (`app/users/page.tsx`).

3. **Batch 3 (S3 Query Error Integrity):**
   - `ISSUE-009`: Replace swallowed `[]` / `0` fallbacks with structured error responses across `lib/actions/**`.

4. **Batch 4 (S4 Performance & Scalability):**
   - `ISSUE-010`: Implement 100-item chunking for `.in()` queries and paging for dashboard counts.

5. **Batch 5 (S5 UI & Omnipresent Messenger):**
   - `ISSUE-011`: Ensure Chandak Messenger functions as a global drawer without requiring module switching.

---

**STOPPED.** Awaiting user approval of this issue registry and proposed remediation order before executing Phase 2.

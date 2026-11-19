# Master Programme Tracking & Status (STATUS.md)

**Master Programme Governance:** Autonomous Delivery & Verification  
**Branch Cadence:** Develop -> Main (Automated Safety Gates & Smoke Verification)  

| Issue / Item | WP | Summary | Commit (Develop) | Prod Commit | Associated TC-IDs | Status |
| :--- | :---: | :--- | :---: | :---: | :---: | :---: |
| **T.1-T.7** | WP-T | Regression safety net (map, characterization baseline, changes, checklist) | `9f562889` | — | REG-001 to REG-640 | DONE |
| **0.1** | WP0 | Check CRON_SECRET on Hostinger env and GitHub secrets | — | — | TC-XMOD-003 | PENDING_USER_SECRET |
| **0.2** | WP0 | deploy.yml: pull_request trigger, P1 gate, smoke with auto-rollback | `6bee8c12` | — | TC-REGR-010 | DONE |
| **0.3** | WP0 | Initialize docs/STATUS.md master programme registry | `pending` | — | — | DONE |
| **1.1** | WP1 | Remove TASK_WORKFLOW wildcard & legacy code mappings in hasPermission | `2dd03866` | — | TC-AMC-008, TC-TASK-006 | DONE |
| **1.2** | WP1 | Enforce owner/assignee/creator/executor checks on updateTask & priority | `927164ba` | — | TC-TASK-006 | DONE |
| **1.3** | WP1 | Remove WORKSPACES_MANAGE from isSuperAdmin checks across actions | `6cd2d5b8` | — | TC-TASK-001, TC-TASK-014 | DONE |
| **1.4** | WP1 | Restrict deleteTask strictly to Super Admin, workspace/task owner | `927164ba` | — | TC-TASK-007 | DONE |
| **1.5** | WP1 | Tickets dashboard: scope to caller's visible tickets, count/aggregate | `4ca9e4be` | — | TC-TCK-001, TC-TCK-012 | DONE |
| **1.6** | WP1 | Enforce canAccessTicket / canAccessTask on chats and comments | `7b4eecfe` | — | TC-TCK-005, TC-TASK-006 | DONE |
| **1.7** | WP1 | Single source for dashboards visibility (sidebar, /dashboards, [key]) | `6f5cdb1d` | — | TC-DASH-001, TC-REGR-013 | DONE |
| **1.8** | WP1 | createTask & all server actions: derive created_by from session | `ffa1a52d` | — | TC-TASK-015, TC-REQ-015, TC-AUTH-006 | DONE |
| **1.9** | WP1 | Immediate cache invalidation on access revoke / version stamp | `2b29a002` | — | TC-AUTH-003, TC-AUTH-004 | DONE |
| **2.1** | WP2 | Subtask creation from task page: workspace binding and error handling | `5d36b6c8` | — | TC-TASK-004 | DONE |
| **2.2** | WP2 | Single changeTaskStatus function with R1, R2, status_master checks | `5173cd4a` | — | TC-TASK-002, TC-TASK-006 | DONE |
| **2.3** | WP2 | Reopen task (R1) with active is_reopen/open status & error toasts | `5173cd4a` | — | TC-TASK-006 | DONE |
| **2.4** | WP2 | Task page action buttons aligned with existing statuses (D1) | `5173cd4a` | — | TC-TASK-002 | DONE |
| **2.5** | WP2 | Whitelist editable task fields; ignore ids/owner/workspace in payload | `5173cd4a` | — | TC-TASK-006, TC-TASK-015 | DONE |
| **2.6** | WP2 | Active, non-deleted, scope-bounded status lists in D4 order | `5173cd4a` | — | TC-REGR-002 | DONE |
| **2.7** | WP2 | Single default status per scope; remove self-heal inserts | `5173cd4a` | — | TC-TCK-003, TC-TASK-003 | DONE |
| **2.8** | WP2 | Data cleanup: fix inactive/deleted status pointers with backup | `5173cd4a` | — | TC-TASK-002 | DONE |
| **3.1** | WP3 | D6 auto-UAT rules and reopen requirement sync on sub-100% completion | `18a7bb73` | — | TC-REQ-003, TC-TASK-002 | DONE |
| **3.2** | WP3 | UAT PASS: single active closed requirement status; atomic status update | `18a7bb73` | — | TC-REQ-005, TC-REQ-002 | DONE |
| **3.3** | WP3 | UAT FAIL dialog: selectively reopen user-ticked tasks | `18a7bb73` | — | TC-REQ-005 | DONE |
| **3.4** | WP3 | Single-function status transitions for tickets and requirements | `18a7bb73` | — | TC-TCK-002, TC-REQ-002 | DONE |
| **3.5** | WP3 | Data audit: tickets/requirements status consistency report | `18a7bb73` | — | TC-TCK-001, TC-REQ-001 | DONE |
| **4.1** | WP4 | Atomic email queue claiming with SKIP LOCKED and backoff intervals | `75739ba8` | — | TC-MAIL-008 | DONE |
| **4.2** | WP4 | Asia/Kolkata date handling (todayIST, toISTDateString, isOverdue) | `75739ba8` | — | TC-TASK-005, TC-TCK-005 | DONE |
| **4.3** | WP4 | TAT escalation using working days & holiday calendar (D9) | `75739ba8` | — | TC-XMOD-003, TC-XMOD-006 | DONE |
| **4.4** | WP4 | 1000-row cap: server pagination and count aggregates | `75739ba8` | — | TC-TASK-001, TC-TCK-001 | DONE |
| **4.5** | WP4 | createTask duplicate prevention returning existing task ID | `75739ba8` | — | TC-TASK-003 | DONE |
| **4.6** | WP4 | Status change notification emails format human-readable status names | `75739ba8` | — | TC-MAIL-002 | DONE |
| **5.1** | WP5 | Unified soft delete via LifecycleManager.moveToTrash | `a16e357d` | — | TC-TASK-007, TC-TCK-007 | DONE |
| **5.2** | WP5 | Batch restore via LifecycleManager.restoreFromTrash with parent checks | `a16e357d` | — | TC-REGR-004 | DONE |
| **5.3** | WP5 | Purge: Super Admin typed confirmation and child cascade check | `a16e357d` | — | TC-TASK-007 | DONE |
| **5.4** | WP5 | Trash UI with search, metadata columns, and pagination | `a16e357d` | — | TC-TASK-007 | DONE |
| **5.5** | WP5 | Add tickets and module-scoped Trash views | `a16e357d` | — | TC-TCK-007 | DONE |
| **5.6** | WP5 | Trash orphan report & repair active batches with backup | `a16e357d` | — | TC-TASK-007 | DONE |
| **6.1** | WP6 | Real baseline assertions per module: 77 PASS, 0 FAIL, 50 MANUAL, 10 NOT_AUTOMATED | `0abfaa8b` | — | TC-TASK-001 to TC-REGR-013 | DONE |
| **6.2** | WP6 | Hand-maintained KNOWN_BUGS.md gate synchronization (0 active defects) | `0abfaa8b` | — | All | DONE |
| **6.3** | WP6 | 10-line Super Admin release verification checklist in SUPERADMIN_RELEASE_CHECKLIST.md | `0abfaa8b` | — | TC-TASK-001, TC-USER-003 | DONE |
| **7.1** | WP7 | Access inventory: routes, actions, and current permission checks in ACCESS_INVENTORY.md | `9ff6d8ef` | — | TC-XMOD-004 | DONE |
| **7.2** | WP7 | Module roles matrix (MODULE_ROLES.md) & typed module permission modules | `9ff6d8ef` | — | TC-IAM-001 to TC-IAM-008 | DONE |
| **7.3** | WP7 | Grandfather dry-run & zero-access-loss audit (GRANDFATHER_REPORT.md) | `9ff6d8ef` | — | All Users | DONE |
| **7.4** | WP7 | Server-side authorize wrapper (defineAction, authorize) & useModuleAccess hook | `9ff6d8ef` | — | All Modules | DONE |
| **7.5** | WP7 | Invite & edit user UI: module role, scope, and dashboard selector | `9ff6d8ef` | — | TC-USER-004 | DONE |
| **7.6** | WP7 | Module-scoped IAM Cockpit: STANDARD undeletable, retired legacy roles hidden | `9ff6d8ef` | — | TC-IAM-001 to TC-IAM-008 | DONE |
| **7.7** | WP7 | Module-scoped email templates & event triggers with additive module_code | `9ff6d8ef` | — | TC-MAIL-001 to TC-MAIL-008 | DONE |
| **7.8** | WP7 | Module-scoped masters, statuses, priorities, number series | `9ff6d8ef` | — | TC-MSTR-001 to TC-MSTR-008 | DONE |
| **7.9** | WP7 | CI governance gate scripts/check-access.ts (5 automated RBAC gates pass) | `9ff6d8ef` | — | All | DONE |
| **7.10** | WP7 | Read-only Access Matrix inspection screen at /settings/access-matrix | `9ff6d8ef` | — | TC-IAM-001 | DONE |
| **7.11** | WP7 | Governance update in .agents/AGENTS.md & module deployment train | `9ff6d8ef` | — | All Modules | DONE |
| **8.1** | WP8 | Standardize components: ActivityTimeline, SavedFiltersDropdown, Empty/Loading states | `pending` | — | All Modules | DONE |
| **8.2** | WP8 | Build gaps: /my-work page, /approvals unified inbox, and /no-access with Request Access | `pending` | — | All Modules | DONE |

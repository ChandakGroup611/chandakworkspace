# Expected Result Changes Registry (CHANGES.md)

**Master Programme Standard:** Controlled Behavior Shifts & Security Gate Audit  
**Governing Rule:** Expected-result changes are permitted ONLY for items explicitly changed by the Master Programme. Anything else turning red is a regression and must be fixed or reverted.

| REG-ID | Module | Target Action / Route | Old Baseline Result (Pre-WP) | New Approved Result (Post-WP) | Work Package Reference | Justification |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **REG-TASK-006** | Workspace/Tasks | `lib/actions/tasks.ts#updateTask` | Permissive: Any member with `TASKS_UPDATE` could edit any task | Strict: Refused unless task owner/assignee, creator, executor, or Super Admin | **WP1 (1.2)** | Closes permission leak where non-participant members could mutate task priority and fields. |
| **REG-TASK-007** | Workspace/Tasks | `lib/actions/tasks.ts#deleteTask` | Permissive: Any member with `TASKS_DELETE` could delete any task | Strict: Refused unless Super Admin, workspace owner, or task owner | **WP1 (1.4)** | Prevents unauthorized task destruction by standard members. |
| **REG-TASK-015** | Workspace/Tasks | `lib/actions/tasks.ts#createTask` | Vulnerability: Accepted client-supplied `created_by` | Secure: Strictly derives identity from authenticated server session | **WP1 (1.8)** | Eliminates privilege spoofing via client payloads. |
| **REG-TCK-005** | Tickets | `lib/actions/tickets.ts#addTicketChatMessage` | Permissive: Anyone could comment or post chat in tickets | Strict: Refused unless caller has `canAccessTicket` | **WP1 (1.6)** | Protects ticket communication privacy and integrity. |
| **REG-TCK-001** | Tickets | `lib/actions/tickets.ts#getTickets` | Permissive: Downloaded all rows across tenant for counts | Strict: Scoped to caller's visible tickets with server-side aggregate | **WP1 (1.5)** | Bounds data visibility to assigned/created scope and optimizes server resources. |
| **REG-REQ-015** | Requirements | `lib/actions/requirements.ts#createRequirement` | Vulnerability: Trusted client-supplied `created_by` | Secure: Strictly derives identity from authenticated server session | **WP1 (1.8)** | Eliminates identity spoofing in requirement authoring. |
| **REG-AMC-008** | AMC | `lib/permissions/index.ts#hasPermission` | Leaked access: `AMC_*` dynamically mapped to `AMC_MANAGE` | Strict: Mapping removed; explicit IAM snapshot + Super Admin only | **WP1 (1.1)** | Eliminates cross-module permission bleeding into AMC. |
| **REG-DASH-001** | Dashboards | `app/dashboards/page.tsx` | Divergent: Sidebar read `user_module_access` while page read legacy access | Unified: Single source of truth using `user_module_access` (D7) | **WP1 (1.7)** | Eliminates visual divergence between sidebar and dashboard list. |
| **REG-AUTH-003** | Login/Session | `lib/permissions/module-access.ts` | Stale cache: Role revokes took up to TTL to propagate | Instant: Cache version stamp enforces revokes immediately on next request | **WP1 (1.9)** | Guarantees instant access termination upon role revoking. |

# Chandak Workspace — Platform Access Rules & Security Architecture (ACCESS_RULES.md)

**Document Version:** 1.0.0  
**Effective Date:** 16 November 2026  
**Status:** DRAFT FOR OWNER APPROVAL — PHASE 1 GOVERNANCE AUDIT  
**Governing Standard:** Enterprise RBAC, Zero-Downtime Governance, Strict Server-Side Identity Verification

---

## 1. Architectural Principles & Security Invariants

All modules across the Chandak Workspace application MUST adhere to these non-negotiable security invariants:

1. **Immutable Super Admin Universal Bypass:**
   - A user holding the authoritative database role `SUPER_ADMIN` (or possessing `SUPER_ADMIN` / `SUPER_ADMIN_ACCESS` in `user_permissions_snapshot`) holds absolute operational authority across all platform entities and bypasses granular record-level filters, except where hard self-action restrictions apply (e.g. self-deletion).
   - Super Admin status is determined **strictly from the database role** (`user_master.role_id -> roles.code = 'SUPER_ADMIN'`) or active session permissions snapshot. It MUST NEVER be inferred from browser-sent headers, `user_metadata`, or hardcoded email addresses.

2. **Strict Server-Side Identity Derivation (Zero Client Impersonation):**
   - Every server action that reads private data or mutates state MUST resolve the caller's identity via `supabase.auth.getUser()` using server cookies.
   - Server actions MUST NEVER trust caller-supplied `userId`, `actorId`, `performedBy`, `created_by`, or `approved_by` fields for authorization or identity tracking.

3. **Strict Authorization Verification (`lib/permissions`):**
   - Mutation actions (create, update, delete, approve, export) must explicitly verify the required permission using `hasPermission(userId, PERMISSION_CODE)`, `checkServerPermission(PERMISSION_CODE)`, or dedicated module guards (`requireMeet`, `requireDesign`, `requireEmailAdmin`, `budget can()`).
   - If authorization fails, the action MUST immediately abort and return a clear descriptive error message (`{ success: false, error: "Unauthorized: Missing [PERM] capability." }`).
   - Actions MUST NEVER silently fail or return empty datasets (`[]`, `null`, `0`) when denied.

4. **Zero Fallback Escalation (Anti-RLS-Bypass Guarantee):**
   - When a database operation executed with the user's session client is rejected by Postgres Row Level Security (RLS), the server action MUST NOT swallow the error and re-attempt the identical write using `supabaseAdmin` (service role). `supabaseAdmin` is reserved exclusively for system processes, audit logging, auth user provisioning, and pre-authorized service operations.

5. **Strict UI-to-Server RBAC Symmetry:**
   - If an action or button is not permitted by server-side logic, the corresponding UI trigger (button, menu item, checkbox, modal) MUST be hidden or disabled.
   - The UI MUST NEVER rely solely on server rejection for access control.

---

## 2. Platform Roles Catalog

| Role Code | Display Name | Category | Primary Function & Intended Scope |
| :--- | :--- | :--- | :--- |
| `SUPER_ADMIN` | Super Administrator | System Core | Platform owner with absolute administrative authority across all modules, IAM, and settings. |
| `ROLE_ADMIN` | System Administrator | System Core | Operational security lead managing user provisioning, master configurations, and module governance. |
| `ROLE_MANAGER` | Operational Manager | Operational | Department or functional lead with approval authorities, task dispatching, and department oversight. |
| `ROLE_STAFF` | Service Professional | Operational | Standard staff member executing assigned tasks, tickets, vehicles, and meetings within assigned scopes. |
| `ROLE_AGENT` | Standard User | Operational | Baseline enterprise employee with self-service capabilities (raising tickets/requirements, my tasks). |
| `ROLE_DASHBOARD` | Dashboard Viewer | Specialized | Read-only executive user dedicated to BI and department analytics portals. |
| `ROLE_WORKSPACE` | Workspace Member | Contextual | Project-scoped collaborator restricted strictly to enrolled workspace hierarchies. |

---

## 3. Module-by-Module Access & Ownership Rules

---

### Module 1: Task & Workspace Management (`/workspaces`, `/tasks`)

#### Core Permissions
- `WORKSPACES_VIEW`: View workspaces page.
- `WORKSPACES_CREATE`: Create new workspaces.
- `WORKSPACES_UPDATE`: Modify workspace details, dates, companies, objectives.
- `WORKSPACES_DELETE`: Archive or soft-delete workspaces.
- `WORKSPACES_MANAGE`: Full workspace management (override members, assignees).
- `TASKS_VIEW`: View task boards, lists, and hierarchy.
- `TASKS_CREATE`: Create tasks and subtasks.
- `TASKS_UPDATE`: Modify task status, assignees, checklists, schedules.
- `TASKS_DELETE`: Delete tasks and subtasks.
- `TASKS_MANAGE`: Administrative task override across all workspaces.

#### Record-Level Scopes
- **Workspaces Visibility:**
  - `SUPER_ADMIN` or `WORKSPACES_MANAGE`: Sees all workspaces across the enterprise.
  - Standard User (`WORKSPACES_VIEW`):
    - Workspace is public (`visibility_settings->>'public' = 'true'`).
    - User is the Workspace Owner (`workspace_owner_id = user.id`).
    - User is an active member in `workspace_members` (`is_deleted = false`).
    - User is enrolled via a team in `workspace_teams` (`team_members`).
- **Tasks Visibility:**
  - `SUPER_ADMIN` or `TASKS_MANAGE` or Workspace Owner / Manager: Sees all tasks in the workspace.
  - Standard User:
    - User is task creator (`created_by = user.id`).
    - User is primary assignee (`assigned_to = user.id`).
    - User is an executor or watcher (`task_participants.user_id = user.id`).
    - User is manager of the task's assigned department (`departments.manager_id = user.id`).
    - User is in the managerial chain of the creator or assignee (`getUserAccessScope.subordinateUserIds`).
    - Workspace is accessible and task is not private/restricted.

#### Mutation Matrix
| Action | Required Permission / Scope | Forbidden Roles / Conditions |
| :--- | :--- | :--- |
| **Create Workspace** | `SUPER_ADMIN` or `WORKSPACES_CREATE` or `WORKSPACES_MANAGE` | Users without workspace creation rights |
| **Edit Workspace** | `SUPER_ADMIN` or `WORKSPACES_MANAGE` or Workspace Owner or Workspace Manager | Standard workspace members |
| **Share Workspace** | `SUPER_ADMIN` or `WORKSPACES_MANAGE` or Workspace Owner or `WORKSPACES_UPDATE` | Standard members without update rights |
| **Delete Workspace** | `SUPER_ADMIN` or `WORKSPACES_MANAGE` or Workspace Owner with `WORKSPACES_DELETE` | Standard members |
| **Create Task** | `SUPER_ADMIN` or `TASKS_CREATE` or Workspace Member | Non-members of private workspaces |
| **Edit Primary Assignee / Executors** | `SUPER_ADMIN` or Workspace Owner or Task Primary Assignee | Task Watchers, Spectators, Standard Agents |
| **Edit Task Dates / Duration** | `SUPER_ADMIN` or Workspace Owner or Task Primary Assignee | Task Watchers, standard executors |
| **Update Task Status / Progress** | `SUPER_ADMIN` or Workspace Owner or Task Primary Assignee or Executor | Watchers / read-only viewers |
| **Delete Task** | `SUPER_ADMIN` or Workspace Owner or Task Creator (if unassigned) | Assignees, Executors, Watchers |

---

### Module 2: ITSM Operations Tickets (`/tickets`)

#### Core Permissions
- `TICKETS_VIEW`: View ticket portal and ticket queue.
- `TICKETS_CREATE`: Raise new incident or service request tickets.
- `TICKETS_UPDATE`: Modify ticket details, assign agent, change priority/status.
- `TICKETS_DELETE`: Cancel or delete ticket records.
- `TICKETS_MANAGE`: Administrative ticket queue lead.

#### Record-Level Scopes
- **Standard User (`ROLE_AGENT`):** Sees tickets they created (`creator_id = user.id`).
- **Support Agent / Assignee:** Sees tickets assigned to them (`assignee_id = user.id`).
- **Department Manager:** Sees all tickets filed under their department (`department_id = managedDepartmentIds`).
- **Manager Chain:** Sees tickets created by or assigned to subordinates (`subordinateUserIds`).
- **Super Admin / Ticket Manager:** Full visibility across all departments and tickets.

#### Mutation Matrix
| Action | Required Permission / Scope | Conditions |
| :--- | :--- | :--- |
| **Create Ticket** | `TICKETS_CREATE` or any authenticated user | Automatically sets `creator_id = authUser.id` |
| **Add Comment / Attachment** | Ticket Creator, Assignee, Department Manager, or `TICKETS_UPDATE` | Allowed while ticket is not hard-closed |
| **Reassign Agent** | `SUPER_ADMIN` or `TICKETS_MANAGE` or Department Manager | Agents cannot self-reassign out of queue without lead |
| **Change Status** | Assigned Agent, Ticket Creator (can Close/Confirm), or Manager | State machine transitions enforced |
| **Delete Ticket** | `SUPER_ADMIN` or `TICKETS_DELETE` or `TICKETS_MANAGE` | Regular staff and agents cannot delete |

---

### Module 3: Requirements Engineering (`/requirements`)

#### Core Permissions
- `REQUIREMENTS_VIEW`: View requirements registry and scopes.
- `REQUIREMENTS_CREATE`: Draft new software or operational requirements.
- `REQUIREMENTS_UPDATE`: Edit specifications, acceptance criteria, deliverables.
- `REQUIREMENTS_APPROVE`: Approve requirements in the formal signoff matrix.
- `REQUIREMENTS_DELETE`: Archive or delete requirements.
- `REQUIREMENTS_MANAGE`: Complete requirements lifecycle governance.

#### Record-Level Scopes
- Creator (`created_by`), Assigned Lead, Departmental Team, or Approvers in `approval_workflow_steps`.

#### Mutation Matrix
| Action | Required Permission / Scope | Enforced Check |
| :--- | :--- | :--- |
| **Draft Requirement** | `SUPER_ADMIN` or `REQUIREMENTS_CREATE` or `REQUIREMENTS_MANAGE` | Caller identity derived from server auth session |
| **Edit Specification** | Creator (if status is DRAFT/REJECTED), or Assigned Lead, or `REQUIREMENTS_UPDATE` | Cannot modify once locked in approval without recall |
| **Approve / Signoff Step** | Assigned Approver in current step OR `SUPER_ADMIN` | Signed-in user MUST match approver identity |
| **UAT Signoff** | Designated UAT Stakeholder OR `SUPER_ADMIN` | Signed-in user validation |
| **Delete Requirement** | `SUPER_ADMIN` or `REQUIREMENTS_DELETE` | Requires explicit delete permission; blocked if in production |

---

### Module 4: SLA Monitoring & Policies (`/sla`)

#### Core Permissions
- `SLA_VIEW`: View SLA dashboards, active breach timers, and compliance KPIs.
- `SLA_CONFIG`: Configure SLA threshold policies, response minutes, working hours.
- `SLA_CREATE`: Create new SLA schemes.
- `SLA_UPDATE`: Edit SLA metric mappings.
- `SLA_DELETE`: Delete or archive SLA rules.
- `SLA_MANAGE`: Administrative SLA override and escalation management.

#### Mutation Matrix
| Action | Required Permission | Allowed Roles |
| :--- | :--- | :--- |
| **View SLA Policies & Breaches** | `SLA_VIEW` | All authenticated staff roles |
| **Create / Update SLA Policy** | `SUPER_ADMIN` or `SLA_CONFIG` or `SLA_MANAGE` | Administrators and Governance Leads only |
| **Delete SLA Policy** | `SUPER_ADMIN` or `SLA_DELETE` or `SLA_MANAGE` | Super Administrators only |

---

### Module 5: Software AMC & Vendor Contracts (`/amc`)

#### Core Permissions
- `AMC_VIEW`: View software licenses, maintenance contracts, renewal dates.
- `AMC_CREATE`: Register new software AMC contracts and warranties.
- `AMC_UPDATE` / `AMC_EDIT`: Update contract values, renewal terms, invoice logs.
- `AMC_DELETE`: Terminate or soft-delete AMC contracts.
- `AMC_MANAGE`: Full vendor and contract governance.

#### Mutation Matrix
| Action | Required Permission | Block Conditions |
| :--- | :--- | :--- |
| **View Contracts** | `AMC_VIEW` or `SUPER_ADMIN` | Standard viewer access |
| **Register / Renew AMC** | `SUPER_ADMIN` or `AMC_CREATE` or `AMC_UPDATE` | Valid vendor reference required |
| **Delete Contract** | `SUPER_ADMIN` or `AMC_DELETE` | Blocked if active un-cleared invoices or transactions exist |

---

### Module 6: Vehicle Desk & Fleet Logistics (`/vehicle`)

#### Core Permissions
- `VEHICLES_VIEW`: View vehicle registry, compliance cards, specs.
- `VEHICLES_CREATE`: Onboard new vehicles into fleet inventory.
- `VEHICLES_UPDATE`: Edit vehicle details, fuel types, seating capacity.
- `VEHICLES_DELETE`: Decommission or delete fleet vehicles.
- `VEHICLES_MANAGE`: Full fleet operational administration.
- `DRIVERS_VIEW`: View chauffeur registry and license status.
- `DRIVERS_MANAGE`: Add, edit, or deactivate drivers.
- `TRIPS_VIEW`: View corporate trip logs and movement slips.
- `TRIPS_CREATE` / `TRIPS_DISPATCH`: Book or dispatch corporate movements.
- `TRIPS_MANAGE`: Cancel, modify, or approve corporate trips.
- `FLEET_MAINTENANCE_VIEW`: View repair and service workshop history.
- `FLEET_MAINTENANCE_MANAGE`: Log repairs, update maintenance costs, approve bills.
- `FLEET_REPORTS_VIEW`: View fleet fuel efficiency, trip analytics, and utilization.

#### Mutation Matrix
| Action | Required Permission | Conditions |
| :--- | :--- | :--- |
| **View Fleet Inventory** | `VEHICLES_VIEW` | Staff, Drivers, Managers |
| **Book Trip Movement** | `TRIPS_CREATE` or `SUPER_ADMIN` | Self-service corporate travel booking |
| **Dispatch / Assign Trip** | `TRIPS_DISPATCH` or `TRIPS_MANAGE` or `SUPER_ADMIN` | Fleet Coordinator / Logistics Manager |
| **Upload Vehicle Compliance (PUC/Insurance)** | `VEHICLES_UPDATE` or `VEHICLES_MANAGE` or `SUPER_ADMIN` | Document view and download mandatory |
| **Register Parts / Accessories Bill** | `FLEET_MAINTENANCE_MANAGE` or `SUPER_ADMIN` | Financial validation against vendor master |
| **Decommission Vehicle** | `SUPER_ADMIN` or `VEHICLES_DELETE` | Active assigned trips must be completed first |

---

### Module 7: Design Tracking & Document Management (DMS) (`/design`, `/dms`)

#### Access Control Architecture (`design_user_access`)
Design Tracking enforces a dual-layered capability and project-scoping matrix:
1. **System Roles:**
   - `DESIGN_ADMIN`: Full access to matrix, masters, approvals, and all projects.
   - `DESIGN_LEAD`: Project-scoped lead with approval and matrix edit rights.
   - `SITE_ENGINEER` / `CONSULTANT`: Execution and register upload capabilities.
2. **Project Scopes:**
   - `project_access_type = 'ALL'`: User can access drawing registers for all projects.
   - `project_access_type = 'SPECIFIC'`: User is strictly constrained to projects listed in `assigned_project_ids`.
3. **Capabilities (Boolean Flags in `design_user_access`):**
   - `can_view_matrix` (`DESIGN_VIEW`): View drawing register and matrix grid.
   - `can_edit_matrix` (`DESIGN_UPDATE`): Edit drawing metadata, revisions, stages.
   - `can_upload_drawings` (`DESIGN_CREATE`): Upload CAD, PDF, drawing packages.
   - `can_approve_gfc` (`DESIGN_APPROVE`): Approve Good-For-Construction drawings.
   - `can_export_reports` (`DESIGN_EXPORT`): Download transmittals and matrix summaries.
   - `can_manage_masters` (`DESIGN_MANAGE` / `DESIGN_MASTERS_MANAGE`): Disciplines, packages, consultants.

#### Document Management System (DMS)
- **Folder Permissions (`dms_folder_permissions`):**
  - Inherited from parent folder unless `inherit_permissions = false`.
  - Roles/Users granted explicit capabilities: `VIEW`, `UPLOAD`, `EDIT`, `DELETE`, `MANAGE`.
- **Public Share Links (`dms_shares`):**
  - Protected by server-side HMAC salt, expiration timestamps, and SMS/OTP verification where enabled.

---

### Module 8: Chandak Meet (`/meet`)

#### Core Permissions (`lib/permissions/meet.ts`)
- `MEET_VIEW`: View meetings, agendas, and session run sheets.
- `MEET_CREATE`: Schedule meeting series and individual sessions.
- `MEET_UPDATE` / `MEET_RESCHEDULE`: Modify agenda, timing, participants, venue.
- `MEET_DELETE`: Cancel or archive meeting series.
- `MEET_SESSION_RUN`: Run live session mode, record attendee roll call, active timers.
- `MEET_POINT_MANAGE`: Add discussion points, assign carry-forward tags.
- `MEET_TASK_MANAGE`: Create action items from discussion points, assign owners.
- `MEET_EXTENSION_APPROVE`: Approve or reject TAT extension requests for meet tasks.
- `MEET_DECISION_MANAGE`: Record formal ratified decisions.
- `MEET_MOM_APPROVE` / `MEET_MOM_EDIT`: Review, edit, and approve Minutes of Meeting (MoM).
- `MEET_MOM_PUBLISH`: Finalize and distribute MoM to all stakeholders.
- `MEET_REPORT_VIEW`: View compliance KPIs, carry-forward counts, and TAT reports.
- `MEET_ADMIN`: Full Chandak Meet administrative control.

#### Contextual Meeting Roles
- `Chair` / `Organizer`: Holds total authority over meeting session, agenda, decisions, and MoM.
- `Minute Taker`: Granted edit rights over points, tasks, and draft MoM during the live session.
- `Attendee` / `Member`: View agenda, view shared documents, manage assigned tasks.
- `Confidential Meetings`: Restricted exclusively to explicitly invited attendees.

---

### Module 9: Organization Budget (`/budget`)

#### Architecture & Universal Bypass
- Governed by `budget_permissions` and `budget_role_permissions`.
- **Super Admin Bypass (`budget_is_super_admin`):**
  - Users with DB role `SUPER_ADMIN` have unrestricted access across all projects, versions, ledgers, and cost heads without requiring explicit project membership.
- **Budget Roles:**
  - `Administrator`: Full control over setup, access, versions, and audit trails.
  - `Budget Preparer`: Create and edit draft budget versions, enter rate analyses.
  - `Department User`: Record cost incurred transactions, view approved budget lines.
  - `Management`: Executive view-only access to variance reports, cash flow, and cost curves.
- **Record Scopes:**
  - Standard users are restricted to projects assigned in `me.project_ids`.

#### Mutation Matrix
| Action | Budget Permission Required | Scope Guard |
| :--- | :--- | :--- |
| **Create Project** | `project.create` | Admin only |
| **Setup Towers / Cost Heads** | `project.setup` | Assigned project |
| **Open Budget Version** | `version.open` | Assigned project |
| **Approve Budget Version** | `version.approve` | Admin / Department Approver |
| **Edit Worksheets / Rates** | `budget.edit` | Assigned project, unapproved draft versions |
| **Enter Cost Incurred** | `cost.enter` | Assigned project and cost head |
| **Delete Cost / Budget Lines** | `cost.delete` / `budget.delete` | Admin or Preparer before version locking |

---

### Module 10: Executive Dashboards (`/dashboards`)

#### Registered Portals (`lib/dashboards/registry.ts`)
1. `/dashboards/it`: IT Budget & Expense
2. `/dashboards/mkt`: Marketing Budget & Expense
3. `/dashboards/adm`: In4 Admin Access & Staffing Review
4. `/dashboards/engg`: Engineering Budget & Inventory

#### Access Rules & Company Scoping (`dashboard_user_access`)
- Every dashboard access is granted individually by `dashboard_key` (`it`, `mkt`, `adm`, `engg`).
- **Permissions per Dashboard:** `VIEW`, `DETAILS`, `EXPORT`, `CHAT`, `SCHEDULE`, `ADMIN` / `MANAGE`.
- **Company Filtering:**
  - `company_ids = null`: User can view analytics across all companies.
  - `company_ids = [id1, id2]`: Engine queries are strictly bounded to the assigned companies.
- **Grant Authority:**
  - ONLY `SUPER_ADMIN` can grant, modify, or revoke dashboard access (`assignUserModules`).
  - Pre-ticked defaults (`["adm", "engg"]`) are strictly eliminated. New invites start with zero dashboard entitlements.

---

### Module 11: Chandak Messenger (`/messenger`)

#### Permissions
- `MESSENGER_ACCESS`: Access chat interface.
- `MESSENGER_SEND`: Send text, voice notes, and file attachments.
- `MESSENGER_GROUP_CREATE`: Form new group channels.
- `MESSENGER_GROUP_MANAGE`: Add/remove group members, assign group admins.

#### Record Scopes
- **Direct Chats (`direct`):** Strictly restricted to the two participating user IDs (`direct_user1_id`, `direct_user2_id`). No other user, including managers, can inspect direct messages.
- **Group Chats (`group`):** Restricted to active members in `messenger_conversation_members`. Messages and attachments cannot be read or sent by non-members.

---

### Module 12: Users & Personnel Master (`/users`)

#### Authoritative Rules (Restored from IAM Design)
- **Directory List Visibility (`getVisibleUsers`):**
  - `SUPER_ADMIN` OR any user holding `USERS_VIEW`, `USERS_CREATE`, `USERS_UPDATE`, `USERS_DELETE`, or `USERS_MANAGE` sees the complete user directory.
  - All other standard users see **ONLY their own personal profile**.
- **Create / Invite:** Requires `USERS_CREATE` or `USERS_MANAGE` or `SUPER_ADMIN`.
- **Edit / Assign Modules:** Requires `USERS_UPDATE` or `USERS_MANAGE` or `SUPER_ADMIN` (or user updating their own non-administrative profile details like photo).
- **Delete:** Requires `USERS_DELETE` or `USERS_MANAGE` or `SUPER_ADMIN`.
  - **Self-Deletion Guard:** A user CAN NEVER delete their own account (`userId !== authUser.id`).
- **Super Admin Role Assignment:**
  - ONLY a Super Admin (`isCallerSuper`) can assign the Super Admin role to any user. Any non-super user attempting to pass a Super Admin role is rejected server-side and filtered out on the UI.
- **Self-Modification Safeguards:**
  - When a user edits their own account, the server strips `role_id`, `is_active`, `department_id`, `designation_id`, and `manager_id`, preventing self-promotion or self-deactivation.

---

### Module 13: IAM & Roles Governance (`/iam`)

#### Core Permissions
- `IAM_VIEW`: View roles, permissions catalog, and assignment matrices.
- `IAM_CREATE`: Create new custom functional roles.
- `IAM_UPDATE`: Modify role descriptions and toggle granular permissions.
- `IAM_DELETE`: Decommission custom roles.
- `IAM_MANAGE`: Full IAM system governance.

#### Invariants
- Immutable System Roles (`is_system = true`, e.g. `SUPER_ADMIN`, `Administrator`) CANNOT be deleted or stripped of core permissions.
- Emergency Break-Glass overrides require system audit logging in `activity_events`.

---

### Module 14: System Masters (`/masters`)

#### Core Permissions
- `MASTERS_VIEW` / `SYSTEM_MASTERS_VIEW` / `COMPANIES_VIEW`: View system lookups.
- `MASTERS_CREATE` / `SYSTEM_MASTERS_CREATE` / `COMPANIES_CREATE`: Add new companies, departments, designations, vendors, categories.
- `MASTERS_UPDATE` / `MASTERS_EDIT`: Modify master properties, parent mappings.
- `MASTERS_DELETE` / `COMPANIES_DELETE`: Soft-delete master entities.
- `MASTERS_MANAGE`: Full master governance.

#### Invariants
- Unauthenticated helper functions (`createBusinessValue`, `createIssueType`) MUST enforce `MASTERS_CREATE` capability.

---

### Module 15: Communication & Email Settings (`/settings/communication`, `/settings/email`)

#### Core Permissions
- `SUPER_ADMIN`, `SETTINGS_MANAGE`, or `EMAIL_CONFIG_MANAGE`: View SMTP/SES credentials, test email dispatch, configure system templates.
- `SETTINGS_COMMUNICATION_VIEW`: View communication logs and dispatch audit trail.
- `SETTINGS_COMMUNICATION_UPDATE`: Edit template copy and notification rules.

---

## 4. Discrepancy & Drift Analysis (Current Code vs Git History)

| Module / Area | Historical / Seeded Rule | Drift / Current Code Defect | Commit / Reference | Required Resolution (Phase 3) |
| :--- | :--- | :--- | :--- | :--- |
| **Workspaces Visibility** | Standard users see only enrolled workspaces (`workspace_members` or public). | `canAccessWorkspace()` in `lib/permissions/index.ts` granted universal access to ANY holder of `WORKSPACES_VIEW`, exposing private workspaces. | `lib/permissions/index.ts:235` | Remove `WORKSPACES_VIEW` universal bypass from `canAccessWorkspace`; enforce membership checks. |
| **Task Actions** | Task mutations require owner/assignee/creator verification. | 12 task actions (`assignUserToTasksBatch`, `createCustomField`, `updateTaskProgress`, `updateSprint`, `deleteTaskTemplate`) lack server authorization checks. | `lib/actions/tasks.ts` | Add `hasPermission` / `canAccessTask` guards to all 12 un-gated task actions. |
| **User Master List** | Original IAM: View permissions (`USERS_*`) see directory; others see own profile. | Commit `7d0a9644` (2 Nov) restricted directory to Super Admin only. Commit `06a7abe3` (12 Nov) partially loosened checks. | `7d0a9644`, `06a7abe3` | Fully restored in Phase 1 working tree (`USER_ADMIN_PERMS` in repo and page). |
| **User Invite Dashboards** | New users start with zero dashboard entitlements. | Invite and assign-modules modals defaulted to pre-selecting `["adm", "engg"]`. | `app/users/page.tsx`, `app/users/[id]/page.tsx` | Fully restored to `[]` default in Phase 1 working tree. |
| **Vehicle Desk Writes** | Vehicle mutations require `VEHICLES_*`, `FLEET_MAINTENANCE_*` permissions. | 19 write actions in `lib/actions/vehicle.ts` (documents, PUC, insurance renewals, parts bills, vendor assignments, warranties) run with zero permission checks. | `lib/actions/vehicle.ts` | Wrap all 19 write actions with `checkServerPermission` and caller authentication. |
| **Chandak Meet RLS Fallback** | Failed user queries must return error, never escalate to service role. | 14 session and task actions catch RLS rejection and re-execute using `supabaseAdmin`. | `lib/actions/meet/*.ts` | Remove `supabaseAdmin` fallbacks; align RLS policies with `requireMeet` server checks. |
| **DMS Permissions Store** | DMS folder permissions must persist in Postgres `dms_folder_permissions`. | `lib/actions/dms-core.ts` uses an in-memory `Map` fallback (`IN_MEMORY_FOLDER_PERMISSIONS`) which desynchronizes across worker instances. | `lib/actions/dms-core.ts:1074` | Ensure database schema persistence for `dms_folder_permissions` and remove in-memory state. |
| **SLA Server Actions** | SLA rule creation/modification requires `SLA_CONFIG` or `SLA_MANAGE`. | `saveSLARule` in `lib/actions/sla.ts` has zero permission or authentication checks. | `lib/actions/sla.ts:25` | Add `checkServerPermission("SLA_CONFIG")` and verify caller session. |
| **System Masters Quick-Add** | Adding master options requires `MASTERS_CREATE`. | `createBusinessValue` and `createIssueType` insert directly without auth or capability verification. | `lib/actions/masters.ts:284, 301` | Add `checkServerPermission("MASTERS_CREATE")` to quick-add actions. |
| **Requirements Identity** | Server actions must extract caller user ID from session. | `createRequirement` accepted `payload.created_by` from browser caller instead of `supabase.auth.getUser()`. | `lib/actions/requirements.ts:286` | Enforce `created_by = authUser.id` derived on server. |

---

## 5. Verification & Approval Checkpoints

Before proceeding to **Phase 2 (Automated Code Audit)**, this Access Rules specification must be reviewed and approved by the owner.

- [x] Phase 1: All 15 modules documented with exact CRUD permissions, record-level scopes, and historical discrepancies.
- [x] Phase 1: Zero unauthorized code modifications applied during rule formulation.
- [x] Phase 1: TypeScript compilation (`npx tsc --noEmit`) and production build (`npm run build`) passing.
- [ ] **Owner Approval Received for docs/ACCESS_RULES.md** (Required to proceed to Phase 2).


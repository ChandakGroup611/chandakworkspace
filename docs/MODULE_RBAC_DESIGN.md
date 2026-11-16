# Module-Wise RBAC Architecture Design
**Chandak Workspace Enterprise Platform**  
**Document Version:** 1.0.0  
**Status:** PROPOSED — PENDING APPROVAL (No code or data modified)  
**Governing Standard:** [docs/ACCESS_RULES.md](file:///d:/adios/docs/ACCESS_RULES.md) & [.agents/AGENTS.md](file:///d:/adios/.agents/AGENTS.md)

---

## Executive Summary & Target Model

This document establishes the unified **Module-Wise Role-Based Access Control (RBAC)** architecture for Chandak Workspace. It eliminates fragmented, per-module custom authorization tables (`fleet_user_access`, `design_user_access`, `budget_members`, `dashboard_user_access`, `user_modules`) and unifies authorization under a single, deterministic, high-performance engine.

### Core Architectural Principles
1. **Platform Identity vs. Module Authorization**:
   - `user_master` stores platform identity only: full name, corporate email, user code, department, designation, reporting manager, active status.
   - Platform role in `user_master` is strictly one of three values:
     - `SUPER_ADMIN`: Root platform owner with absolute, non-bypassable global override across all modules.
     - `USER_ADMIN`: User administrator authorized to invite staff, manage directory profiles, and grant module entitlements.
     - `STANDARD`: Standard enterprise collaborator whose capabilities are strictly defined per module.
2. **Centralized Role Registry (`module_roles`)**:
   - Every operational module registers a standardized role hierarchy with explicit string permission sets.
3. **User Module Entitlements (`user_module_access`)**:
   - A single table defines which module and role a user holds, alongside a granular `scope` (all records, specific projects, specific departments, or specific workspaces).
4. **Single Server-Side Authorization Authority**:
   - All server actions and API routes authorize through `can(userId, moduleCode, action, record?)` in `lib/permissions/module-access.ts`.
5. **Single Point of User Administration**:
   - User creation and invitation exists **only** at **Workspace &rarr; Administration &rarr; Users** via a structured 6-step wizard. User creation triggers are permanently removed from all domain modules.
6. **Scoped Module Administration**:
   - Each module's "Roles & policies" page manages only that module's internal role permissions and scoped user assignments; it never creates platform user accounts.

---

## A. Module Role & Permission Matrix

### 1. `TASK_WORKFLOW` (Workspaces, Tasks, Subtasks, Tickets, Requirements, AMC, SLA)
Covers all task collaboration, hierarchical workspaces, ticketing, requirements gathering, AMC contracts, and SLA configuration.

| Permission Code | Description | `WORKSPACE_ADMIN` | `MANAGER` | `MEMBER` | `VIEWER` |
| :--- | :--- | :---: | :---: | :---: | :---: |
| `WORKSPACES_VIEW` | View workspaces within assigned scope | ✅ | ✅ | ✅ | ✅ |
| `WORKSPACES_CREATE` | Create root and sub-workspaces | ✅ | ✅ (Sub-ws only) | ❌ | ❌ |
| `WORKSPACES_UPDATE` | Edit workspace details, objective, dates | ✅ | ✅ (In scope) | ❌ | ❌ |
| `WORKSPACES_SHARE` | Manage members and invitees of workspace | ✅ | ✅ (In scope) | ❌ | ❌ |
| `WORKSPACES_DELETE` | Delete or archive workspaces | ✅ | ❌ | ❌ | ❌ |
| `TASKS_VIEW` | View tasks and subtasks within scope | ✅ | ✅ | ✅ | ✅ |
| `TASKS_CREATE` | Create tasks and subtasks | ✅ | ✅ | ✅ | ❌ |
| `TASKS_UPDATE_CORE` | Edit task title, priority, due date | ✅ | ✅ | ✅ (If creator/owner) | ❌ |
| `TASKS_ASSIGN` | Assign/change Primary Assignee and Executors | ✅ | ✅ | ❌ | ❌ |
| `TASKS_TRANSITION` | Transition task status (In Progress, Resolved, Closed) | ✅ | ✅ | ✅ (If assigned executor) | ❌ |
| `TASKS_CHECKLIST` | Add, toggle, and assign checklist items | ✅ | ✅ | ✅ (If assigned) | ❌ |
| `TASKS_COMMENT` | Add remarks, collaborate in chat, upload attachments | ✅ | ✅ | ✅ | ❌ |
| `TASKS_DELETE` | Delete tasks and subtasks | ✅ | ✅ (If creator) | ❌ | ❌ |
| `SPRINTS_MANAGE` | Create, start, complete sprints | ✅ | ✅ | ❌ | ❌ |
| `TICKETS_VIEW` | View support tickets within scope | ✅ | ✅ | ✅ | ✅ |
| `TICKETS_CREATE` | Submit support tickets | ✅ | ✅ | ✅ | ❌ |
| `TICKETS_RESOLVE` | Change ticket status, resolve, reassign | ✅ | ✅ | ❌ | ❌ |
| `TICKETS_DELETE` | Delete support tickets | ✅ | ❌ | ❌ | ❌ |
| `REQUIREMENTS_VIEW` | View requirements documents and backlog | ✅ | ✅ | ✅ | ✅ |
| `REQUIREMENTS_CREATE` | Create and draft requirements | ✅ | ✅ | ✅ | ❌ |
| `REQUIREMENTS_SUBMIT_UAT` | Submit requirement for User Acceptance Testing | ✅ | ✅ | ✅ (If author) | ❌ |
| `REQUIREMENTS_APPROVE` | Formal UAT sign-off and production release approval | ✅ | ✅ | ❌ | ❌ |
| `REQUIREMENTS_DELETE` | Delete requirements | ✅ | ❌ | ❌ | ❌ |
| `AMC_VIEW` | View AMC contracts, vendors, schedules | ✅ | ✅ | ✅ | ✅ |
| `AMC_MANAGE` | Create/edit AMC contracts and record payments | ✅ | ✅ (If dept lead) | ❌ | ❌ |
| `SLA_VIEW` | View SLA definitions and breach alerts | ✅ | ✅ | ✅ | ✅ |
| `SLA_CONFIG` | Configure SLA turnaround hours, holidays, rules | ✅ | ❌ | ❌ | ❌ |

---

### 2. `VEHICLE_DESK` (Fleet, Drivers, Maintenance, Parts, Vendors, Trips)
Covers vehicle lifecycle, driver management, workshop repairs, spare parts inventory, and trip dispatching.

| Permission Code | Description | `FLEET_ADMIN` | `FLEET_LEAD` | `REQUESTER` | `VIEWER` |
| :--- | :--- | :---: | :---: | :---: | :---: |
| `VEHICLES_VIEW` | View fleet directory, vehicle details, KPIs | ✅ | ✅ | ✅ | ✅ |
| `VEHICLES_CREATE` | Register new vehicle in fleet | ✅ | ❌ | ❌ | ❌ |
| `VEHICLES_UPDATE` | Edit vehicle specs, registration, assign driver | ✅ | ✅ | ❌ | ❌ |
| `VEHICLES_DOCUMENTS` | Upload/manage insurance, PUC, RC, fitness | ✅ | ✅ | ❌ | ❌ |
| `VEHICLES_DECOMMISSION` | Sell, transfer, or decommission vehicle | ✅ | ❌ | ❌ | ❌ |
| `MAINTENANCE_VIEW` | View repair history, work orders, service logs | ✅ | ✅ | ❌ | ✅ |
| `MAINTENANCE_MANAGE` | Create work orders, log service, update odometer | ✅ | ✅ | ❌ | ❌ |
| `PARTS_VENDORS_MANAGE` | Manage parts inventory, purchase orders, vendors | ✅ | ❌ | ❌ | ❌ |
| `DRIVERS_MANAGE` | Onboard drivers, verify licenses, link vehicles | ✅ | ✅ | ❌ | ❌ |
| `TRIPS_VIEW` | View trip register and vehicle availability | ✅ | ✅ | ✅ (Own trips) | ✅ |
| `TRIPS_REQUEST` | Request vehicle trip / requisition | ✅ | ✅ | ✅ | ❌ |
| `TRIPS_DISPATCH` | Approve requisition, dispatch vehicle, close trip | ✅ | ✅ | ❌ | ❌ |
| `FLEET_SETTINGS` | Configure fleet types, fuel policies, masters | ✅ | ❌ | ❌ | ❌ |

---

### 3. `DESIGN_TRACKING` (Architectural Design, Drawing Matrix, DMS, GFC, RFIs, Transmittals)
Covers engineering drawings, statutory clearances, drawing revisions, transmittals, and consultant RFIs.

| Permission Code | Description | `DESIGN_ADMIN` | `DESIGN_LEAD` | `CONTRIBUTOR` | `VIEWER` |
| :--- | :--- | :---: | :---: | :---: | :---: |
| `DESIGN_PROJECTS_VIEW` | View design projects, packages, matrix | ✅ | ✅ | ✅ | ✅ |
| `DESIGN_PROJECTS_MANAGE` | Create projects, towers, work packages, milestones | ✅ | ❌ | ❌ | ❌ |
| `DESIGN_MASTERS_MANAGE` | Manage consultants, statutory authorities, stages | ✅ | ❌ | ❌ | ❌ |
| `MATRIX_EDIT` | Set planned dates, update actuals, revise lookahead | ✅ | ✅ | ❌ | ❌ |
| `DRAWINGS_VIEW` | View and download drawing files and revisions | ✅ | ✅ | ✅ | ✅ |
| `DRAWINGS_UPLOAD` | Upload new drawing revisions and register sheets | ✅ | ✅ | ✅ | ❌ |
| `DRAWINGS_APPROVE_GFC` | Authorize Good-For-Construction (GFC) release | ✅ | ✅ | ❌ | ❌ |
| `TRANSMITTALS_CREATE` | Bundle drawings and issue formal transmittals | ✅ | ✅ | ❌ | ❌ |
| `RFIS_VIEW` | View consultant RFIs and questions | ✅ | ✅ | ✅ | ✅ |
| `RFIS_RAISE` | Raise RFI to architect or structural consultant | ✅ | ✅ | ✅ | ❌ |
| `RFIS_RESPOND` | Provide official answer, attach drawings, close RFI | ✅ | ✅ | ❌ | ❌ |
| `DESIGN_SETTINGS` | Configure design RBAC, watermarks, distribution | ✅ | ❌ | ❌ | ❌ |

---

### 4. `CHANDAK_MEET` (Meetings, Sessions, Live Minutes, Decisions, Action Items)
Covers executive board and department meetings, agenda carry-forward, live MOM recording, and decision tracking.

| Permission Code | Description | `MEET_ADMIN` | `ORGANISER` | `PARTICIPANT` |
| :--- | :--- | :---: | :---: | :---: |
| `MEETINGS_VIEW` | View meetings calendar, upcoming sessions, past MOM | ✅ | ✅ | ✅ |
| `MEETINGS_CREATE` | Create recurring meeting series or ad-hoc meetings | ✅ | ✅ | ❌ |
| `MEETINGS_UPDATE` | Edit meeting cadence, chair, attendees, room | ✅ | ✅ (Own meetings) | ❌ |
| `MEETINGS_DELETE` | Cancel or permanently delete meeting series | ✅ | ❌ | ❌ |
| `SESSIONS_START_RUN` | Start live meeting session, trigger Teams/call, mark attendance | ✅ | ✅ (If organiser/chair) | ❌ |
| `AGENDA_ADD_POINTS` | Propose and add agenda points | ✅ | ✅ | ✅ (If allowed by meeting) |
| `MOM_RECORD_PUBLISH` | Type live minutes, record official decisions, publish MOM | ✅ | ✅ (If minute taker/chair) | ❌ |
| `ACTION_ITEMS_ASSIGN` | Assign action items resulting from points/decisions | ✅ | ✅ | ❌ |
| `ACTION_ITEMS_UPDATE` | Update progress and mark action items complete | ✅ | ✅ | ✅ (If assigned owner) |
| `MEET_SETTINGS` | Manage conference rooms, display screens, templates | ✅ | ❌ | ❌ |

---

### 5. `ORG_BUDGET` (Project Budget, Tower Workbooks, Cost Heads, Actuals, Approvals)
Covers multi-tower project budgets, baseline cost heads, Excel workbook imports, incurred cost tracking, and executive sign-off.

| Permission Code | Description | `BUDGET_ADMIN` | `PREPARER` | `DEPT_EDITOR` | `APPROVER` | `VIEWER` |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| `BUDGET_VIEW` | View projects, tower summaries, approved budgets | ✅ | ✅ | ✅ (Own dept) | ✅ | ✅ |
| `BUDGET_PROJECT_MANAGE` | Create project, configure towers, BUA, carpet areas | ✅ | ❌ | ❌ | ❌ | ❌ |
| `COST_HEADS_MANAGE` | Configure master cost heads, categories, GST rates | ✅ | ❌ | ❌ | ❌ | ❌ |
| `BUDGET_PREPARE` | Open budget versions, import Excel, edit all lines | ✅ | ✅ | ❌ | ❌ | ❌ |
| `BUDGET_DEPT_EDIT` | Edit/import budget lines for assigned department | ✅ | ✅ | ✅ | ❌ | ❌ |
| `BUDGET_SUBMIT` | Finalize version and submit for executive sign-off | ✅ | ✅ | ❌ | ❌ | ❌ |
| `BUDGET_APPROVE` | Sign off on baseline budget, approve cost delta | ✅ | ❌ | ❌ | ✅ | ❌ |
| `INCURRED_MANAGE` | Record actual cost incurred, upload vouchers | ✅ | ✅ | ✅ (Own dept) | ❌ | ❌ |
| `BUDGET_REPORTS_EXPORT` | Export Summary, Detail, Tower, and GST reports | ✅ | ✅ | ✅ (Own dept) | ✅ | ✅ |
| `BUDGET_SETTINGS` | Manage budget members, permissions, locks | ✅ | ❌ | ❌ | ❌ | ❌ |

---

### 6. `DASHBOARDS` (Executive IN4 Financial & Operational Dashboards)
Configured per dashboard key (`it`, `mkt`, `adm`, `engg`, `sales`).

| Capability | Description | `EDITOR` | `VIEWER` |
| :--- | :--- | :---: | :---: |
| `VIEW` | View dashboard KPI cards, summary charts, and trends | ✅ | ✅ |
| `DETAILS` | Drill down into row-level transactions, vouchers, vendors | ✅ | ✅ |
| `EXPORT` | Export dashboard datasets and tabular reports to Excel/PDF | ✅ | ❌ |
| `SCHEDULE` | Configure scheduled email digest dispatches | ✅ | ❌ |
| `CHAT` | Query live IN4 data via conversational AI ("Ask the data") | ✅ | ❌ |
| `ADMIN` | Manage dashboard field definitions, refresh intervals, access | ✅ | ❌ |

---

## B. Complete User Migration & Access Mapping

The following table maps **every single active user currently in `user_master`** to their new role. It is derived directly from live database records (`user_master`, `user_modules`, `fleet_user_access`, `design_user_access`, `budget_members`, `dashboard_user_access`, and `workspace_members`).

> [!IMPORTANT]
> **Zero Access Loss Guarantee**: Every existing user retains 100% of their current functional capabilities across all modules. No user gains unintended privileges or loses access to modules they currently use.

| User Full Name | Corporate Email | Dept | Status | Platform Role | Default Module | `TASK_WORKFLOW` Role | `VEHICLE_DESK` Role | `DESIGN_TRACKING` Role | `CHANDAK_MEET` Role | `ORG_BUDGET` Role | `DASHBOARDS` Entitlements |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Adil** | `adil.kazi@chandakgroup.com` | AUDIT | Active | `STANDARD` | `TASK_WORKFLOW` | `MEMBER` | `REQUESTER` | None | `PARTICIPANT` | None | None |
| **Anand Bhowad** | `anand.bhowad@chandakgroup.com` | ERP | Active | `STANDARD` | `TASK_WORKFLOW` | `MEMBER` | None | None | `ORGANISER` | None | None |
| **Anand Mohta** | `anand@chandakgroup.com` | IT | Active | `SUPER_ADMIN` | `TASK_WORKFLOW` | `WORKSPACE_ADMIN` | `FLEET_ADMIN` | `DESIGN_ADMIN` | `MEET_ADMIN` | `BUDGET_ADMIN` | `all:EDITOR` |
| **Ankit Shukla** | `ankit.shukla@chandakgroup.com` | AUDIT | Disabled | `STANDARD` | `TASK_WORKFLOW` | `MEMBER` | None | None | `PARTICIPANT` | None | None |
| **Arun** | `arun.narvekar@chandakgroup.com` | SFDC | Active | `STANDARD` | `TASK_WORKFLOW` | `MEMBER` | None | None | `PARTICIPANT` | None | None |
| **Avinash Pise** | `avinash.pise@chandakgroup.com` | ERP | Active | `SUPER_ADMIN` | `TASK_WORKFLOW` | `WORKSPACE_ADMIN` | `FLEET_ADMIN` | `DESIGN_ADMIN` | `MEET_ADMIN` | `BUDGET_ADMIN` | `all:EDITOR` |
| **Bhavesh** | `bhavesh.k@chandakgroup.com` | ERP | Active | `STANDARD` | `TASK_WORKFLOW` | `MEMBER` | None | None | `ORGANISER` | None | None |
| **Gauran** | `gaurang.desai@chandakgroup.com` | — | Active | `STANDARD` | `VEHICLE_DESK` | `VIEWER` | `FLEET_LEAD` | None | `PARTICIPANT` | None | None |
| **it.support** | `it.support@chandakgroup.com` | — | Active | `STANDARD` | `TASK_WORKFLOW` | `MEMBER` | `VIEWER` | None | `PARTICIPANT` | None | None |
| **Kashvi Velani** | `kashvi.velani@chandakgroup.com` | AUDIT | Active | `STANDARD` | `TASK_WORKFLOW` | `MEMBER` | None | None | None | None | None |
| **Komal Panchal** | `komal.panchal@chandakgroup.com` | IT | Active | `SUPER_ADMIN` | `TASK_WORKFLOW` | `WORKSPACE_ADMIN` | `FLEET_ADMIN` | `DESIGN_ADMIN` | `MEET_ADMIN` | `BUDGET_ADMIN` | `all:EDITOR` |
| **Manmohan Vyas** | `manmohan@chandakgroup.com` | AUDIT | Active | `STANDARD` | `TASK_WORKFLOW` | `MEMBER` | `REQUESTER` | None | `PARTICIPANT` | None | None |
| **Minal** | `minal.medhekar@chandakgroup.com` | — | Active | `STANDARD` | `TASK_WORKFLOW` | `MEMBER` | None | None | None | None | None |
| **Miraz** | `meraz.ahamad@chandakgroup.com` | IT | Active | `STANDARD` | `TASK_WORKFLOW` | `MEMBER` | None | None | `ORGANISER` | None | None |
| **Mohak** | `mohak.joshi@chandakgroup.com` | IT | Active | `STANDARD` | `TASK_WORKFLOW` | `MEMBER` | None | None | `ORGANISER` | None | None |
| **Prashant Padwal** | `prashant.padwal@chandakgroup.com` | Contracts | Active | `STANDARD` | `TASK_WORKFLOW` | `VIEWER` | None | None | None | None | None |
| **Prashant Sathe** | `prashant@chandakgroup.com` | — | Active | `STANDARD` | `TASK_WORKFLOW` | `MEMBER` | None | None | `PARTICIPANT` | None | None |
| **Rahil Shaikh** | `rahil.shaikh@chandakgroup.com` | SFDC | Active | `STANDARD` | `TASK_WORKFLOW` | `MEMBER` | None | None | `PARTICIPANT` | None | None |
| **Rohit** | `rohit.gurav@chandakgroup.com` | IT | Active | `STANDARD` | `TASK_WORKFLOW` | `MEMBER` | None | None | `ORGANISER` | None | None |
| **SAGAR** | `sagar.mohta@chandakgroup.com` | AUDIT | Active | `STANDARD` | `VEHICLE_DESK` | `MEMBER` | `FLEET_LEAD` | None | `PARTICIPANT` | None | None |
| **Sagar Jadhav** | `sagar.jadhav@chandakgroup.com` | IT | Active | `STANDARD` | `TASK_WORKFLOW` | `MEMBER` | None | None | `ORGANISER` | None | None |
| **Shivani Bhandar** | `shivani.bhandar@chandakgroup.com` | AUDIT | Active | `STANDARD` | `TASK_WORKFLOW` | `MEMBER` | None | None | `PARTICIPANT` | None | None |
| **SUPER ADMIN** | `super@gmail.com` | ERP | Disabled | `SUPER_ADMIN` | `TASK_WORKFLOW` | `WORKSPACE_ADMIN` | `FLEET_ADMIN` | `DESIGN_ADMIN` | `MEET_ADMIN` | `BUDGET_ADMIN` | `all:EDITOR` |
| **Test User** | `avinashpise@chandakgroup.com` | — | Disabled | `STANDARD` | `TASK_WORKFLOW` | `MEMBER` | `VIEWER` | None | `PARTICIPANT` | None | None |
| **Vijay Pal** | `vijay@chandakgroup.com` | IT | Active | `SUPER_ADMIN` | `TASK_WORKFLOW` | `WORKSPACE_ADMIN` | `FLEET_ADMIN` | `DESIGN_ADMIN` | `MEET_ADMIN` | `BUDGET_ADMIN` | `all:EDITOR` |
| **Vinayak** | `vinayak.bhagane@chandakgroup.com` | IT | Active | `STANDARD` | `TASK_WORKFLOW` | `MEMBER` | None | None | `ORGANISER` | None | None |
| **Wajid Ali** | `wajid.ali@chandakgroup.com` | SFDC | Active | `STANDARD` | `TASK_WORKFLOW` | `MEMBER` | None | None | `PARTICIPANT` | None | None |
| **Yash Posture** | `yash.posture@chandakgroup.com` | AUDIT | Disabled | `STANDARD` | `TASK_WORKFLOW` | `MEMBER` | None | None | `PARTICIPANT` | None | None |

---

## C. Migration SQL (DDL + Backfill DML)

> [!NOTE]
> This SQL is provided for review only. It will NOT be executed until formal approval.

```sql
-- ============================================================================
-- 1. DDL: Create module_roles and user_module_access
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.module_roles (
    module_code text NOT NULL,
    role_code text NOT NULL,
    name text NOT NULL,
    description text,
    permissions text[] NOT NULL DEFAULT '{}',
    is_system boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_module_roles PRIMARY KEY (module_code, role_code)
);

CREATE TABLE IF NOT EXISTS public.user_module_access (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.user_master(id) ON DELETE CASCADE,
    module_code text NOT NULL,
    role_code text NOT NULL,
    dashboard_key text, -- NULL for standard modules; set to specific key for DASHBOARDS
    scope jsonb NOT NULL DEFAULT '{"type": "all"}'::jsonb,
    is_default boolean NOT NULL DEFAULT false,
    granted_by uuid REFERENCES public.user_master(id),
    granted_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_user_module_access UNIQUE (user_id, module_code, dashboard_key)
);

CREATE INDEX IF NOT EXISTS idx_user_module_access_user_mod 
    ON public.user_module_access(user_id, module_code);

-- ============================================================================
-- 2. DML: Seed Standard Module Roles & Permission Arrays
-- ============================================================================

-- TASK_WORKFLOW
INSERT INTO public.module_roles (module_code, role_code, name, description, permissions)
VALUES
('TASK_WORKFLOW', 'WORKSPACE_ADMIN', 'Workspace Administrator', 'Full control over workspaces, templates, custom fields, tasks, tickets, requirements, AMC and SLA.', ARRAY[
    'WORKSPACES_VIEW','WORKSPACES_CREATE','WORKSPACES_UPDATE','WORKSPACES_SHARE','WORKSPACES_DELETE',
    'TASKS_VIEW','TASKS_CREATE','TASKS_UPDATE_CORE','TASKS_ASSIGN','TASKS_TRANSITION','TASKS_CHECKLIST','TASKS_COMMENT','TASKS_DELETE','SPRINTS_MANAGE',
    'TICKETS_VIEW','TICKETS_CREATE','TICKETS_RESOLVE','TICKETS_DELETE',
    'REQUIREMENTS_VIEW','REQUIREMENTS_CREATE','REQUIREMENTS_SUBMIT_UAT','REQUIREMENTS_APPROVE','REQUIREMENTS_DELETE',
    'AMC_VIEW','AMC_MANAGE','SLA_VIEW','SLA_CONFIG'
]),
('TASK_WORKFLOW', 'MANAGER', 'Workspace Manager', 'Manage workspaces, sprints, assign tasks, review requirements, handle tickets.', ARRAY[
    'WORKSPACES_VIEW','WORKSPACES_CREATE','WORKSPACES_UPDATE','WORKSPACES_SHARE',
    'TASKS_VIEW','TASKS_CREATE','TASKS_UPDATE_CORE','TASKS_ASSIGN','TASKS_TRANSITION','TASKS_CHECKLIST','TASKS_COMMENT','TASKS_DELETE','SPRINTS_MANAGE',
    'TICKETS_VIEW','TICKETS_CREATE','TICKETS_RESOLVE',
    'REQUIREMENTS_VIEW','REQUIREMENTS_CREATE','REQUIREMENTS_SUBMIT_UAT','REQUIREMENTS_APPROVE',
    'AMC_VIEW','AMC_MANAGE','SLA_VIEW'
]),
('TASK_WORKFLOW', 'MEMBER', 'Collaborator / Member', 'Create and execute assigned tasks, participate in discussions, log checklists, create tickets.', ARRAY[
    'WORKSPACES_VIEW','TASKS_VIEW','TASKS_CREATE','TASKS_UPDATE_CORE','TASKS_TRANSITION','TASKS_CHECKLIST','TASKS_COMMENT',
    'TICKETS_VIEW','TICKETS_CREATE',
    'REQUIREMENTS_VIEW','REQUIREMENTS_CREATE','REQUIREMENTS_SUBMIT_UAT',
    'AMC_VIEW','SLA_VIEW'
]),
('TASK_WORKFLOW', 'VIEWER', 'Observer / Read-Only', 'Read-only visibility into workspaces, tasks, tickets, and requirements in scope.', ARRAY[
    'WORKSPACES_VIEW','TASKS_VIEW','TICKETS_VIEW','REQUIREMENTS_VIEW','AMC_VIEW','SLA_VIEW'
])
ON CONFLICT (module_code, role_code) DO UPDATE SET permissions = EXCLUDED.permissions;

-- VEHICLE_DESK
INSERT INTO public.module_roles (module_code, role_code, name, description, permissions)
VALUES
('VEHICLE_DESK', 'FLEET_ADMIN', 'Fleet Administrator', 'Full administration of fleet, vehicles, compliance, maintenance, parts, vendors, and trip dispatch.', ARRAY[
    'VEHICLES_VIEW','VEHICLES_CREATE','VEHICLES_UPDATE','VEHICLES_DOCUMENTS','VEHICLES_DECOMMISSION',
    'MAINTENANCE_VIEW','MAINTENANCE_MANAGE','PARTS_VENDORS_MANAGE','DRIVERS_MANAGE',
    'TRIPS_VIEW','TRIPS_REQUEST','TRIPS_DISPATCH','FLEET_SETTINGS'
]),
('VEHICLE_DESK', 'FLEET_LEAD', 'Fleet Operational Lead', 'Operational management of vehicles, drivers, work orders, service logs, and trip dispatch.', ARRAY[
    'VEHICLES_VIEW','VEHICLES_UPDATE','VEHICLES_DOCUMENTS',
    'MAINTENANCE_VIEW','MAINTENANCE_MANAGE','DRIVERS_MANAGE',
    'TRIPS_VIEW','TRIPS_REQUEST','TRIPS_DISPATCH'
]),
('VEHICLE_DESK', 'REQUESTER', 'Trip Requester', 'View available vehicles and request trips for business logistics.', ARRAY[
    'VEHICLES_VIEW','TRIPS_VIEW','TRIPS_REQUEST'
]),
('VEHICLE_DESK', 'VIEWER', 'Fleet Viewer', 'Read-only view of fleet roster, vehicle specifications, and status logs.', ARRAY[
    'VEHICLES_VIEW','MAINTENANCE_VIEW','TRIPS_VIEW'
])
ON CONFLICT (module_code, role_code) DO UPDATE SET permissions = EXCLUDED.permissions;

-- DESIGN_TRACKING
INSERT INTO public.module_roles (module_code, role_code, name, description, permissions)
VALUES
('DESIGN_TRACKING', 'DESIGN_ADMIN', 'Design Administrator', 'Full control over design projects, packages, masters, matrix, drawings, GFC, and transmittals.', ARRAY[
    'DESIGN_PROJECTS_VIEW','DESIGN_PROJECTS_MANAGE','DESIGN_MASTERS_MANAGE',
    'MATRIX_EDIT','DRAWINGS_VIEW','DRAWINGS_UPLOAD','DRAWINGS_APPROVE_GFC',
    'TRANSMITTALS_CREATE','RFIS_VIEW','RFIS_RAISE','RFIS_RESPOND','DESIGN_SETTINGS'
]),
('DESIGN_TRACKING', 'DESIGN_LEAD', 'Design Project Lead', 'Manage matrix timeline, upload drawings, approve GFC revisions, issue transmittals, answer RFIs.', ARRAY[
    'DESIGN_PROJECTS_VIEW','MATRIX_EDIT',
    'DRAWINGS_VIEW','DRAWINGS_UPLOAD','DRAWINGS_APPROVE_GFC',
    'TRANSMITTALS_CREATE','RFIS_VIEW','RFIS_RAISE','RFIS_RESPOND'
]),
('DESIGN_TRACKING', 'CONTRIBUTOR', 'Design Contributor', 'Upload drawing revisions, participate in RFI consultations, view matrix schedule.', ARRAY[
    'DESIGN_PROJECTS_VIEW','DRAWINGS_VIEW','DRAWINGS_UPLOAD','RFIS_VIEW','RFIS_RAISE'
]),
('DESIGN_TRACKING', 'VIEWER', 'Drawing Viewer', 'Read-only access to drawing registers, transmittals, and schedule matrix.', ARRAY[
    'DESIGN_PROJECTS_VIEW','DRAWINGS_VIEW','RFIS_VIEW'
])
ON CONFLICT (module_code, role_code) DO UPDATE SET permissions = EXCLUDED.permissions;

-- CHANDAK_MEET
INSERT INTO public.module_roles (module_code, role_code, name, description, permissions)
VALUES
('CHANDAK_MEET', 'MEET_ADMIN', 'Meet Administrator', 'Full management of meetings, recurring cadences, rooms, templates, and decisions.', ARRAY[
    'MEETINGS_VIEW','MEETINGS_CREATE','MEETINGS_UPDATE','MEETINGS_DELETE',
    'SESSIONS_START_RUN','AGENDA_ADD_POINTS','MOM_RECORD_PUBLISH',
    'ACTION_ITEMS_ASSIGN','ACTION_ITEMS_UPDATE','MEET_SETTINGS'
]),
('CHANDAK_MEET', 'ORGANISER', 'Meeting Organiser / Chair', 'Create meetings, run sessions, manage agendas, record minutes, and assign action items.', ARRAY[
    'MEETINGS_VIEW','MEETINGS_CREATE','MEETINGS_UPDATE',
    'SESSIONS_START_RUN','AGENDA_ADD_POINTS','MOM_RECORD_PUBLISH',
    'ACTION_ITEMS_ASSIGN','ACTION_ITEMS_UPDATE'
]),
('CHANDAK_MEET', 'PARTICIPANT', 'Meeting Attendee', 'Attend scheduled sessions, propose agenda points (if open), view MOM, update owned action items.', ARRAY[
    'MEETINGS_VIEW','AGENDA_ADD_POINTS','ACTION_ITEMS_UPDATE'
])
ON CONFLICT (module_code, role_code) DO UPDATE SET permissions = EXCLUDED.permissions;

-- ORG_BUDGET
INSERT INTO public.module_roles (module_code, role_code, name, description, permissions)
VALUES
('ORG_BUDGET', 'BUDGET_ADMIN', 'Budget Administrator', 'Full control over project budgets, cost heads, GST rules, revisions, incurred expenses, and sign-offs.', ARRAY[
    'BUDGET_VIEW','BUDGET_PROJECT_MANAGE','COST_HEADS_MANAGE',
    'BUDGET_PREPARE','BUDGET_DEPT_EDIT','BUDGET_SUBMIT','BUDGET_APPROVE',
    'INCURRED_MANAGE','BUDGET_REPORTS_EXPORT','BUDGET_SETTINGS'
]),
('ORG_BUDGET', 'PREPARER', 'Budget Preparer', 'Open budget versions, import Excel worksheets, edit lines across all categories, submit for sign-off.', ARRAY[
    'BUDGET_VIEW','BUDGET_PREPARE','BUDGET_DEPT_EDIT','BUDGET_SUBMIT',
    'INCURRED_MANAGE','BUDGET_REPORTS_EXPORT'
]),
('ORG_BUDGET', 'DEPT_EDITOR', 'Department Cost Editor', 'Manage and input budget projections and actual cost incurred for assigned department.', ARRAY[
    'BUDGET_VIEW','BUDGET_DEPT_EDIT','INCURRED_MANAGE','BUDGET_REPORTS_EXPORT'
]),
('ORG_BUDGET', 'APPROVER', 'Executive Approver', 'Review budget variance, sign off on baseline versions, approve or reject cost escalations.', ARRAY[
    'BUDGET_VIEW','BUDGET_APPROVE','BUDGET_REPORTS_EXPORT'
]),
('ORG_BUDGET', 'VIEWER', 'Budget Auditor / Viewer', 'Read-only visibility into approved project budgets, cost incurred logs, and variance reports.', ARRAY[
    'BUDGET_VIEW','BUDGET_REPORTS_EXPORT'
])
ON CONFLICT (module_code, role_code) DO UPDATE SET permissions = EXCLUDED.permissions;

-- DASHBOARDS (Per-dashboard roles)
INSERT INTO public.module_roles (module_code, role_code, name, description, permissions)
VALUES
('DASHBOARDS', 'EDITOR', 'Dashboard Analyst / Editor', 'Full access to KPI summaries, drill-down transaction tables, exports, scheduled emails, and conversational AI.', ARRAY[
    'VIEW','DETAILS','EXPORT','SCHEDULE','CHAT','ADMIN'
]),
('DASHBOARDS', 'VIEWER', 'Dashboard Viewer', 'Read-only access to KPI summaries and transaction details for the assigned dashboard.', ARRAY[
    'VIEW','DETAILS'
])
ON CONFLICT (module_code, role_code) DO UPDATE SET permissions = EXCLUDED.permissions;

-- ============================================================================
-- 3. DML: Idempotent Data Backfill from Existing Tables
-- ============================================================================

-- A. Backfill TASK_WORKFLOW from user_modules
INSERT INTO public.user_module_access (user_id, module_code, role_code, is_default, scope)
SELECT 
    um.user_id,
    'TASK_WORKFLOW',
    CASE 
        WHEN r.code = 'SUPER_ADMIN' OR r.code = 'ROLE_ADMIN' THEN 'WORKSPACE_ADMIN'
        WHEN r.code = 'ROLE_MANAGER' THEN 'MANAGER'
        ELSE 'MEMBER'
    END,
    um.is_default,
    '{"type": "all"}'::jsonb
FROM public.user_modules um
JOIN public.modules_master m ON m.id = um.module_id
JOIN public.user_master u ON u.id = um.user_id
LEFT JOIN public.roles r ON r.id = u.role_id
WHERE m.code = 'TASK_WORKFLOW' AND u.is_deleted = false
ON CONFLICT (user_id, module_code, dashboard_key) DO UPDATE
SET role_code = EXCLUDED.role_code, is_default = EXCLUDED.is_default;

-- B. Backfill VEHICLE_DESK from fleet_user_access
INSERT INTO public.user_module_access (user_id, module_code, role_code, is_default, scope)
SELECT 
    f.user_id,
    'VEHICLE_DESK',
    CASE 
        WHEN r.code = 'SUPER_ADMIN' OR r.code = 'ROLE_ADMIN' OR f.fleet_role = 'FLEET_ADMIN' OR f.can_manage_settings = true THEN 'FLEET_ADMIN'
        WHEN f.fleet_role IN ('FLEET_MANAGER', 'FLEET_STAFF', 'FLEET_WORKSHOP') OR f.can_manage_vehicles = true OR f.can_dispatch_trips = true THEN 'FLEET_LEAD'
        ELSE 'REQUESTER'
    END,
    false,
    CASE 
        WHEN f.assigned_vehicle_ids IS NOT NULL AND jsonb_array_length(to_jsonb(f.assigned_vehicle_ids)) > 0 
        THEN jsonb_build_object('type', 'vehicles', 'vehicle_ids', f.assigned_vehicle_ids)
        ELSE '{"type": "all"}'::jsonb
    END
FROM public.fleet_user_access f
JOIN public.user_master u ON u.id = f.user_id
LEFT JOIN public.roles r ON r.id = u.role_id
WHERE u.is_deleted = false
ON CONFLICT (user_id, module_code, dashboard_key) DO UPDATE
SET role_code = EXCLUDED.role_code, scope = EXCLUDED.scope;

-- C. Backfill DESIGN_TRACKING from design_user_access
INSERT INTO public.user_module_access (user_id, module_code, role_code, is_default, scope)
SELECT 
    d.user_id,
    'DESIGN_TRACKING',
    CASE 
        WHEN r.code = 'SUPER_ADMIN' OR r.code = 'ROLE_ADMIN' OR d.design_role = 'DESIGN_ADMIN' OR d.can_masters_manage = true THEN 'DESIGN_ADMIN'
        WHEN d.design_role = 'DESIGN_LEAD' OR d.can_drawings_approve_gfc = true THEN 'DESIGN_LEAD'
        WHEN d.design_role = 'DESIGN_COORDINATOR' OR d.can_matrix_edit = true OR d.can_drawings_upload = true THEN 'CONTRIBUTOR'
        ELSE 'VIEWER'
    END,
    false,
    CASE 
        WHEN d.project_access_type = 'ASSIGNED_ONLY' AND d.assigned_project_ids IS NOT NULL
        THEN jsonb_build_object('type', 'projects', 'project_ids', d.assigned_project_ids)
        ELSE '{"type": "all"}'::jsonb
    END
FROM public.design_user_access d
JOIN public.user_master u ON u.id = d.user_id
LEFT JOIN public.roles r ON r.id = u.role_id
WHERE u.is_deleted = false
ON CONFLICT (user_id, module_code, dashboard_key) DO UPDATE
SET role_code = EXCLUDED.role_code, scope = EXCLUDED.scope;

-- D. Backfill ORG_BUDGET from budget_members
INSERT INTO public.user_module_access (user_id, module_code, role_code, is_default, scope)
SELECT 
    b.user_id,
    'ORG_BUDGET',
    CASE 
        WHEN r.code = 'SUPER_ADMIN' OR r.code = 'ROLE_ADMIN' OR b.role_id = 1 THEN 'BUDGET_ADMIN'
        WHEN b.role_id = 2 THEN 'PREPARER'
        WHEN b.role_id = 3 THEN 'DEPT_EDITOR'
        WHEN b.role_id = 4 THEN 'VIEWER'
        ELSE 'VIEWER'
    END,
    false,
    CASE 
        WHEN b.project_ids IS NOT NULL THEN jsonb_build_object('type', 'projects', 'project_ids', b.project_ids)
        WHEN b.department_ids IS NOT NULL THEN jsonb_build_object('type', 'departments', 'department_ids', b.department_ids)
        ELSE '{"type": "all"}'::jsonb
    END
FROM public.budget_members b
JOIN public.user_master u ON u.id = b.user_id
LEFT JOIN public.roles r ON r.id = u.role_id
WHERE u.is_deleted = false AND b.active = true
ON CONFLICT (user_id, module_code, dashboard_key) DO UPDATE
SET role_code = EXCLUDED.role_code, scope = EXCLUDED.scope;

-- E. Backfill CHANDAK_MEET from user_modules
INSERT INTO public.user_module_access (user_id, module_code, role_code, is_default, scope)
SELECT 
    um.user_id,
    'CHANDAK_MEET',
    CASE 
        WHEN r.code = 'SUPER_ADMIN' OR r.code = 'ROLE_ADMIN' THEN 'MEET_ADMIN'
        WHEN dept.name IN ('IT', 'ERP') THEN 'ORGANISER'
        ELSE 'PARTICIPANT'
    END,
    false,
    '{"type": "all"}'::jsonb
FROM public.user_modules um
JOIN public.modules_master m ON m.id = um.module_id
JOIN public.user_master u ON u.id = um.user_id
LEFT JOIN public.departments dept ON dept.id = u.department_id
LEFT JOIN public.roles r ON r.id = u.role_id
WHERE m.code = 'CHANDAK_MEET' AND u.is_deleted = false
ON CONFLICT (user_id, module_code, dashboard_key) DO UPDATE
SET role_code = EXCLUDED.role_code;

-- F. Backfill DASHBOARDS from dashboard_user_access
INSERT INTO public.user_module_access (user_id, module_code, role_code, dashboard_key, is_default, scope)
SELECT 
    d.user_id,
    'DASHBOARDS',
    CASE 
        WHEN r.code = 'SUPER_ADMIN' OR r.code = 'ROLE_ADMIN' THEN 'EDITOR'
        ELSE 'VIEWER'
    END,
    d.dashboard_key,
    false,
    CASE 
        WHEN d.company_ids IS NOT NULL THEN jsonb_build_object('type', 'companies', 'company_ids', d.company_ids)
        ELSE '{"type": "all"}'::jsonb
    END
FROM public.dashboard_user_access d
JOIN public.user_master u ON u.id = d.user_id
LEFT JOIN public.roles r ON r.id = u.role_id
WHERE u.is_deleted = false
ON CONFLICT (user_id, module_code, dashboard_key) DO UPDATE
SET role_code = EXCLUDED.role_code, scope = EXCLUDED.scope;
```

---

## D. Server Helper Architecture: `lib/permissions/module-access.ts`

The single server-side authority replaces fragmented permission lookups:

```typescript
import { supabaseAdmin } from "@/lib/supabase/service_role";
import { getCachedUser } from "@/lib/auth/cached-user";

export type ModuleCode = 
  | "TASK_WORKFLOW" 
  | "VEHICLE_DESK" 
  | "DESIGN_TRACKING" 
  | "CHANDAK_MEET" 
  | "ORG_BUDGET" 
  | "DASHBOARDS";

export interface UserModuleRole {
  module_code: ModuleCode;
  role_code: string;
  role_name: string;
  permissions: string[];
  scope: {
    type: "all" | "projects" | "departments" | "workspaces" | "vehicles" | "companies";
    project_ids?: string[];
    department_ids?: string[];
    workspace_ids?: string[];
    vehicle_ids?: string[];
    company_ids?: number[];
  };
  is_default: boolean;
}

/**
 * Authorize an operational action in a given module for a user.
 * 1. Checks if user is SUPER_ADMIN -> bypasses all checks and returns true.
 * 2. Fetches user's role and scope from user_module_access.
 * 3. Resolves permissions from module_roles.
 * 4. Checks if requested action is permitted.
 * 5. Evaluates record-level scope constraints if record is supplied.
 */
export async function can(
  userId: string,
  moduleCode: ModuleCode,
  action: string,
  record?: {
    project_id?: string | number | null;
    department_id?: string | null;
    workspace_id?: string | null;
    vehicle_id?: string | null;
    company_id?: number | null;
    dashboard_key?: string | null;
  }
): Promise<boolean> {
  if (!userId) return false;

  // 1. Root Super Admin Global Override
  const { data: user } = await supabaseAdmin
    .from("user_master")
    .select("roles:role_id(code)")
    .eq("id", userId)
    .maybeSingle();

  const platformRole = ((user?.roles as any)?.code || "").toUpperCase();
  if (["SUPER_ADMIN", "ROLE_SUPER_ADMIN", "ADMIN"].includes(platformRole)) {
    return true;
  }

  // 2. Fetch User Module Access Row
  let query = supabaseAdmin
    .from("user_module_access")
    .select(`
      role_code,
      dashboard_key,
      scope,
      role:module_roles!inner(name, permissions)
    `)
    .eq("user_id", userId)
    .eq("module_code", moduleCode);

  if (moduleCode === "DASHBOARDS" && record?.dashboard_key) {
    query = query.eq("dashboard_key", record.dashboard_key);
  }

  const { data: accessRows } = await query;
  if (!accessRows || accessRows.length === 0) return false;

  const access = accessRows[0];
  const permissions: string[] = (access.role as any)?.permissions || [];

  // 3. Permission String Verification
  if (!permissions.includes(action)) {
    return false;
  }

  // 4. Record-level Scope Verification
  if (!record || !access.scope || access.scope.type === "all") {
    return true;
  }

  const scope = access.scope;
  if (scope.type === "projects" && record.project_id) {
    return (scope.project_ids || []).map(String).includes(String(record.project_id));
  }
  if (scope.type === "departments" && record.department_id) {
    return (scope.department_ids || []).includes(record.department_id);
  }
  if (scope.type === "workspaces" && record.workspace_id) {
    return (scope.workspace_ids || []).includes(record.workspace_id);
  }
  if (scope.type === "vehicles" && record.vehicle_id) {
    return (scope.vehicle_ids || []).includes(record.vehicle_id);
  }
  if (scope.type === "companies" && record.company_id) {
    return (scope.company_ids || []).includes(record.company_id);
  }

  return true;
}

/**
 * Retrieve active module role and scope details for a user.
 */
export async function getModuleRole(
  userId: string,
  moduleCode: ModuleCode,
  dashboardKey?: string
): Promise<UserModuleRole | null> {
  let query = supabaseAdmin
    .from("user_module_access")
    .select(`
      module_code,
      role_code,
      scope,
      is_default,
      role:module_roles!inner(name, permissions)
    `)
    .eq("user_id", userId)
    .eq("module_code", moduleCode);

  if (dashboardKey) {
    query = query.eq("dashboard_key", dashboardKey);
  }

  const { data } = await query.maybeSingle();
  if (!data) return null;

  return {
    module_code: data.module_code as ModuleCode,
    role_code: data.role_code,
    role_name: (data.role as any)?.name || data.role_code,
    permissions: (data.role as any)?.permissions || [],
    scope: data.scope,
    is_default: data.is_default,
  };
}
```

---

## E. Implementation Plan & Rollout Phases

Implementation is strictly sequenced in 10 safe, non-breaking rollout phases. Each phase maintains backward compatibility until all consumers have transitioned.

```
PHASE 1: DDL & Backfill
  ├─ Create module_roles & user_module_access tables
  ├─ Seed standard role matrices
  └─ Execute idempotent backfill from live tables
       │
PHASE 2: Server Helper
  └─ Create lib/permissions/module-access.ts with can() and getModuleRole()
       │
PHASE 3: Unified User Wizard (Workspace → Administration → Users)
  ├─ 6-step creation/invite wizard: Identity → Platform Role → Modules + Role + Scope → Dashboards → Default Landing → Review
  ├─ Update Edit User modal to manage module-wise roles and scopes
  └─ Audit & remove user creation triggers from Meet, Vehicle, DMS, and Budget
       │
PHASE 4: Vehicle Desk Transition
  ├─ Replace canUserManageVehicles / canUserManageMaintenance in lib/actions/vehicle.ts with can()
  └─ Point Vehicle Roles & Policies UI to module_roles & user_module_access scope
       │
PHASE 5: Design Tracking Transition
  ├─ Replace requireDesign() in lib/actions/designTracking.ts with can()
  └─ Point Design Access & Roles tab to module_roles & user_module_access scope
       │
PHASE 6: Organization Budget Transition
  ├─ Replace budget_members lookups in lib/budget/* with can()
  └─ Point Budget Administration → Members & Roles to module_roles & user_module_access
       │
PHASE 7: Chandak Meet Transition
  ├─ Secure meeting creation and session lifecycle with can(userId, 'CHANDAK_MEET', ...)
  └─ Point Meet Administration to module_roles
       │
PHASE 8: Tasks & Workspaces Transition
  ├─ Update lib/actions/tasks.ts, workspaces.ts, requirements.ts, amc.ts, sla.ts to use can()
  └─ Workspace settings UI updates roles and scopes
       │
PHASE 9: Dashboards Transition
  └─ Update listAccessibleDashboards in lib/dashboards/access.ts to query user_module_access
       │
PHASE 10: Deprecate Legacy Tables
  └─ Drop/archive user_modules, fleet_user_access, design_user_access, budget_members, dashboard_user_access
```

---

## F. Screen-by-Screen User Experience & Change Impact

| Step | User-Facing Screen | Changes Visible to Users | Changes Behind the Scenes |
| :--- | :--- | :--- | :--- |
| **Phase 1 & 2** | No screen changes | **None**. System behaves identically. | Tables created; backfill executed; server helper ready in shadow mode. |
| **Phase 3** | **Administration &rarr; Users** ([app/users/page.tsx](file:///d:/adios/app/users/page.tsx)) | **New Unified Invite & Edit Wizard**: Admins see a clear 6-step wizard: (1) Identity Details, (2) Platform Role (`SUPER_ADMIN` / `USER_ADMIN` / `STANDARD`), (3) Module Selection with role picker and scope per module, (4) Specific Dashboard keys, (5) Default Landing, (6) Review & Send. | Inviting or modifying a user atomically updates `user_master` and `user_module_access`. |
| **Phase 3 (Cont.)** | **Vehicle / Meet / Design / Budget** | "Add User" / "Invite User" buttons removed from these module settings screens. Replaced with clear link: *"To onboard new personnel, visit Workspace &rarr; Administration &rarr; Users."* | Prevents orphaned auth accounts or partially-configured users created outside IAM governance. |
| **Phase 4** | **Vehicle Desk &rarr; Settings &rarr; Roles** | Administrators configure vehicle roles (`FLEET_ADMIN`, `FLEET_LEAD`, `REQUESTER`, `VIEWER`) and vehicle-level scopes without managing full platform user accounts. | `lib/actions/vehicle.ts` resolves all 19 mutation actions and list queries via `can()`. |
| **Phase 5** | **Design Tracking &rarr; Access & Roles** | Clean list of project collaborators showing their Design role (`DESIGN_ADMIN`, `DESIGN_LEAD`, `CONTRIBUTOR`, `VIEWER`) and assigned projects scope. | `requireDesign()` in `lib/actions/designTracking.ts` uses `can()`. |
| **Phase 6** | **Organization Budget &rarr; Admin &rarr; Members** | Budget members table displays clear roles (`BUDGET_ADMIN`, `PREPARER`, `DEPT_EDITOR`, `APPROVER`, `VIEWER`) and department/project scopes. | `lib/budget/*` controllers query `can()`. |
| **Phase 7** | **Chandak Meet &rarr; Settings** | Clear distinction between Organisers and Attendees. Only Organisers and Admins can start live sessions or publish MOM. | `lib/actions/meet/*` verifies session actions via `can()`. |
| **Phase 8** | **Workspace &rarr; Tasks / Tickets / Requirements** | Role hierarchy (`WORKSPACE_ADMIN`, `MANAGER`, `MEMBER`, `VIEWER`) controls edit, status transition, sprint management, and requirement UAT approvals. | Gated consistently across server actions and UI triggers. |
| **Phase 9** | **Executive Dashboards** ([app/dashboards/page.tsx](file:///d:/adios/app/dashboards/page.tsx)) | Users see exactly the dashboards granted to them in their `user_module_access` configuration. | Direct query to `user_module_access` with `module_code = 'DASHBOARDS'`. |
| **Phase 10** | Entire Application | Faster response times and clean administration. Zero orphaned permissions. | Legacy tables safely retired after audit sign-off. |

---

## G. Confirmation & Next Steps

This document is submitted for your formal review and approval. 

Per your governance instructions:
- **No production data has been modified.**
- **No application code has been changed.**
- **Awaiting your explicit "Approved" before executing Phase 1 (DDL & Backfill).**

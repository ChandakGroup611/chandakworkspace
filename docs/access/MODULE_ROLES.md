# Module Roles & Permissions Matrix (MODULE_ROLES.md)

**Governance:** Master Programme WP7.2 (Module-Wise RBAC)  
**Status:** Canonical Reference  
**Platform Rule:** Every module defines its own discrete roles and permissions. Global roles grant zero capabilities within modules except `SUPER_ADMIN`. `STANDARD` role exists in every module as the immutable default and cannot be deleted.

---

## 1. `TASK_WORKFLOW` (Workspaces, Tasks, Subtasks, Tickets, Requirements, AMC, SLA)
- **STANDARD Role:** `MEMBER` (Default Collaborator)
- **Scope Model:** `all` OR `workspaces` (array of `workspace_id` UUIDs)

| Role Code | Role Name | Type | Description | Permissions |
| :--- | :--- | :---: | :--- | :--- |
| `WORKSPACE_ADMIN` | Workspace Administrator | Admin | Unrestricted administrative authority over workspaces, tasks, workflows, sprints, and policies within assigned scope. | `WORKSPACES_VIEW`, `WORKSPACES_CREATE`, `WORKSPACES_UPDATE`, `WORKSPACES_SHARE`, `WORKSPACES_DELETE`, `TASKS_VIEW`, `TASKS_CREATE`, `TASKS_UPDATE_CORE`, `TASKS_ASSIGN`, `TASKS_TRANSITION`, `TASKS_CHECKLIST`, `TASKS_COMMENT`, `TASKS_DELETE`, `SPRINTS_MANAGE`, `TICKETS_VIEW`, `TICKETS_CREATE`, `TICKETS_RESOLVE`, `TICKETS_DELETE`, `REQUIREMENTS_VIEW`, `REQUIREMENTS_CREATE`, `REQUIREMENTS_SUBMIT_UAT`, `REQUIREMENTS_APPROVE`, `REQUIREMENTS_DELETE`, `AMC_VIEW`, `AMC_MANAGE`, `SLA_VIEW`, `SLA_CONFIG` |
| `MANAGER` | Workspace Manager | Operational | Department lead or manager; manages team tasks, creates sub-workspaces, resolves tickets, and assigns work. | `WORKSPACES_VIEW`, `WORKSPACES_CREATE`, `WORKSPACES_UPDATE`, `WORKSPACES_SHARE`, `TASKS_VIEW`, `TASKS_CREATE`, `TASKS_UPDATE_CORE`, `TASKS_ASSIGN`, `TASKS_TRANSITION`, `TASKS_CHECKLIST`, `TASKS_COMMENT`, `TASKS_DELETE`, `SPRINTS_MANAGE`, `TICKETS_VIEW`, `TICKETS_CREATE`, `TICKETS_RESOLVE`, `REQUIREMENTS_VIEW`, `REQUIREMENTS_CREATE`, `REQUIREMENTS_SUBMIT_UAT`, `REQUIREMENTS_APPROVE`, `AMC_VIEW`, `AMC_MANAGE`, `SLA_VIEW` |
| `MEMBER` | Collaborator / Member | **STANDARD (Default)** | Standard enterprise collaborator; views assigned workspaces, creates and executes assigned tasks, logs comments, creates tickets. | `WORKSPACES_VIEW`, `TASKS_VIEW`, `TASKS_CREATE`, `TASKS_UPDATE_CORE`, `TASKS_TRANSITION`, `TASKS_CHECKLIST`, `TASKS_COMMENT`, `TICKETS_VIEW`, `TICKETS_CREATE`, `REQUIREMENTS_VIEW`, `REQUIREMENTS_CREATE`, `AMC_VIEW` |
| `VIEWER` | Observer / Read-Only | Read-Only | Read-only observer across workspaces, backlog, tickets, and requirement specs without edit/delete triggers. | `WORKSPACES_VIEW`, `TASKS_VIEW`, `TICKETS_VIEW`, `REQUIREMENTS_VIEW`, `AMC_VIEW` |

---

## 2. `VEHICLE_DESK` (Fleet Directory, Maintenance, Work Orders, Trip Requests, Dispatch)
- **STANDARD Role:** `REQUESTER` (Default Traveler)
- **Scope Model:** `all` OR `vehicles` (array of `vehicle_id` UUIDs)

| Role Code | Role Name | Type | Description | Permissions |
| :--- | :--- | :---: | :--- | :--- |
| `FLEET_ADMIN` | Fleet Administrator | Admin | Complete fleet control: vehicle acquisition, registration, decommissioning, driver onboarding, and maintenance policies. | `VEHICLES_VIEW`, `VEHICLES_CREATE`, `VEHICLES_UPDATE`, `VEHICLES_DOCUMENTS`, `VEHICLES_DECOMMISSION`, `MAINTENANCE_VIEW`, `MAINTENANCE_MANAGE`, `PARTS_VENDORS_MANAGE`, `DRIVERS_MANAGE`, `TRIPS_VIEW`, `TRIPS_REQUEST`, `TRIPS_DISPATCH`, `FLEET_SETTINGS` |
| `FLEET_LEAD` | Fleet Operational Lead | Operational | Garage supervisor; manages work orders, driver schedules, odometer logs, vehicle fitness, and dispatches trips. | `VEHICLES_VIEW`, `VEHICLES_UPDATE`, `VEHICLES_DOCUMENTS`, `MAINTENANCE_VIEW`, `MAINTENANCE_MANAGE`, `DRIVERS_MANAGE`, `TRIPS_VIEW`, `TRIPS_REQUEST`, `TRIPS_DISPATCH` |
| `REQUESTER` | Trip Requester | **STANDARD (Default)** | Corporate staff member requesting pool vehicle trips for business travel; sees vehicle availability and own trip history. | `VEHICLES_VIEW`, `TRIPS_VIEW`, `TRIPS_REQUEST` |
| `VIEWER` | Fleet Viewer | Read-Only | Executive observer with read-only visibility into fleet registry, utilization statistics, and trip logs. | `VEHICLES_VIEW`, `MAINTENANCE_VIEW`, `TRIPS_VIEW` |

---

## 3. `DESIGN_TRACKING` & `DMS` (Design Matrix, Revisions, Drawings, GFC Release, Transmittals)
- **STANDARD Role:** `VIEWER` (Default Viewer)
- **Scope Model:** `all` OR `projects` (array of `project_id` UUIDs/integers)

| Role Code | Role Name | Type | Description | Permissions |
| :--- | :--- | :---: | :--- | :--- |
| `DESIGN_ADMIN` | Design Administrator | Admin | Head of Architecture/Design; manages design projects, packages, consultants, master stages, and release permissions. | `DESIGN_PROJECTS_VIEW`, `DESIGN_PROJECTS_MANAGE`, `DESIGN_MASTERS_MANAGE`, `MATRIX_EDIT`, `DRAWINGS_VIEW`, `DRAWINGS_UPLOAD`, `DRAWINGS_APPROVE_GFC`, `TRANSMITTALS_CREATE`, `RFIS_VIEW`, `RFIS_RAISE`, `RFIS_RESPOND`, `DESIGN_SETTINGS` |
| `DESIGN_LEAD` | Design Project Lead | Operational | Lead architect / project coordinator; sets matrix lookahead dates, reviews revisions, signs off GFC drawings, issues transmittals. | `DESIGN_PROJECTS_VIEW`, `MATRIX_EDIT`, `DRAWINGS_VIEW`, `DRAWINGS_UPLOAD`, `DRAWINGS_APPROVE_GFC`, `TRANSMITTALS_CREATE`, `RFIS_VIEW`, `RFIS_RAISE`, `RFIS_RESPOND` |
| `CONTRIBUTOR` | Design Contributor | Operational | Consulting architect / engineer; uploads drawing sheets, raises consultant RFIs, reviews drawing revisions. | `DESIGN_PROJECTS_VIEW`, `DRAWINGS_VIEW`, `DRAWINGS_UPLOAD`, `RFIS_VIEW`, `RFIS_RAISE` |
| `VIEWER` | Drawing Viewer | **STANDARD (Default)** | Site engineer / project manager; inspects released drawings, views matrix schedules, reads transmittals and RFIs. | `DESIGN_PROJECTS_VIEW`, `DRAWINGS_VIEW`, `RFIS_VIEW` |

---

## 4. `CHANDAK_MEET` (Executive Meetings, Live Sessions, MOM Minutes, Action Items)
- **STANDARD Role:** `PARTICIPANT` (Default Attendee)
- **Scope Model:** `all` OR `departments`

| Role Code | Role Name | Type | Description | Permissions |
| :--- | :--- | :---: | :--- | :--- |
| `MEET_ADMIN` | Meet Administrator | Admin | Administrative governance over conference rooms, display consoles, recurring meeting series, and MOM publishing rules. | `MEETINGS_VIEW`, `MEETINGS_CREATE`, `MEETINGS_UPDATE`, `MEETINGS_DELETE`, `SESSIONS_START_RUN`, `AGENDA_ADD_POINTS`, `MOM_RECORD_PUBLISH`, `ACTION_ITEMS_ASSIGN`, `ACTION_ITEMS_UPDATE`, `MEET_SETTINGS` |
| `ORGANISER` | Meeting Organiser / Chair | Operational | Department chair or session leader; schedules series, leads live session, takes minutes, assigns action items, publishes MOM. | `MEETINGS_VIEW`, `MEETINGS_CREATE`, `MEETINGS_UPDATE`, `SESSIONS_START_RUN`, `AGENDA_ADD_POINTS`, `MOM_RECORD_PUBLISH`, `ACTION_ITEMS_ASSIGN`, `ACTION_ITEMS_UPDATE` |
| `PARTICIPANT` | Meeting Attendee | **STANDARD (Default)** | Active session attendee; attends meetings, contributes agenda discussion points, updates status on assigned action items. | `MEETINGS_VIEW`, `AGENDA_ADD_POINTS`, `ACTION_ITEMS_UPDATE` |
| `VIEWER` | Meeting Observer | Read-Only | Executive observer with read-only visibility into meeting schedules, agendas, and published Minutes of Meeting. | `MEETINGS_VIEW` |

---

## 5. `ORG_BUDGET` (Project Budget, Tower Workbooks, Cost Heads, Incurred Actuals)
- **STANDARD Role:** `VIEWER` (Corporate Viewer)
- **Scope Model:** `all` OR `projects` / `departments`

| Role Code | Role Name | Type | Description | Permissions |
| :--- | :--- | :---: | :--- | :--- |
| `BUDGET_ADMIN` | Budget Administrator | Admin | Finance controller; creates projects, configures tower BUAs, defines master cost heads, and manages budget cycle locks. | `BUDGET_VIEW`, `BUDGET_PROJECT_MANAGE`, `COST_HEADS_MANAGE`, `BUDGET_PREPARE`, `BUDGET_DEPT_EDIT`, `BUDGET_SUBMIT`, `BUDGET_APPROVE`, `INCURRED_MANAGE`, `BUDGET_REPORTS_EXPORT`, `BUDGET_SETTINGS` |
| `PREPARER` | Budget Preparer | Operational | Cost estimator; prepares project budget versions, imports Excel workbooks, edits cost lines across all departments. | `BUDGET_VIEW`, `BUDGET_PREPARE`, `BUDGET_DEPT_EDIT`, `BUDGET_SUBMIT`, `INCURRED_MANAGE` |
| `DEPT_EDITOR` | Department Cost Editor | Operational | Department lead; prepares and updates budget lines strictly for their assigned department, records incurred costs. | `BUDGET_VIEW`, `BUDGET_DEPT_EDIT`, `INCURRED_MANAGE`, `BUDGET_REPORTS_EXPORT` |
| `APPROVER` | Executive Approver | Operational | Executive leadership; reviews baseline budget submissions, compares versions, and formally signs off on budget releases. | `BUDGET_VIEW`, `BUDGET_APPROVE`, `BUDGET_REPORTS_EXPORT` |
| `VIEWER` | Budget Auditor / Viewer | **STANDARD (Default)** | Read-only access to approved project budgets, tower summaries, and financial reports without editing capabilities. | `BUDGET_VIEW`, `BUDGET_REPORTS_EXPORT` |

---

## 6. `DASHBOARDS` (Executive IN4 Financial & Operational Analytics)
- **STANDARD Role:** `VIEWER` (Dashboard Viewer)
- **Scope Model:** Per dashboard key (`it`, `mkt`, `adm`, `engg`, `sales`)

| Role Code | Role Name | Type | Description | Permissions |
| :--- | :--- | :---: | :--- | :--- |
| `EDITOR` | Dashboard Analyst / Editor | Operational | Analytics editor; views KPI cards, drills into transactions, exports Excel/PDF, configures schedules, queries data. | `VIEW`, `DETAILS`, `EXPORT`, `SCHEDULE`, `CHAT` |
| `VIEWER` | Dashboard Viewer | **STANDARD (Default)** | Executive viewer; inspects KPI summaries, charts, trends, and ledger voucher line items without export or schedule tools. | `VIEW`, `DETAILS` |

---

## 7. `CHANDAK_MESSENGER` (Enterprise Team Messaging)
- **STANDARD Role:** `MEMBER` (Messenger Collaborator)
- **Scope Model:** `all`

| Role Code | Role Name | Type | Description | Permissions |
| :--- | :--- | :---: | :--- | :--- |
| `ADMIN` | Messenger Administrator | Admin | Moderate messaging channels, configure retention policies, broadcast organization announcements. | `MESSAGES_SEND`, `CHANNELS_CREATE`, `CHANNELS_MANAGE`, `MESSAGES_MODERATE` |
| `MEMBER` | Messenger Collaborator | **STANDARD (Default)** | Standard user; creates project chat channels, sends direct and group messages, shares files. | `MESSAGES_SEND`, `CHANNELS_CREATE` |

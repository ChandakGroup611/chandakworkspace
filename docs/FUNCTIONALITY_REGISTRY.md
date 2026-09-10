# Enterprise Functionality Registry

This registry provides the comprehensive inventory of all business features and functional contracts across the Chandak Workspace application.

---

## 1. Core Operations Modules

### 1.1 Executive Dashboard (`/`)
- **Module**: Operations Dashboard
- **Frontend Location**: `app/page.tsx`, `components/dashboard/LiveDashboardWrapper.tsx`, `components/dashboard/DashboardCommandCenter.tsx`, `components/dashboard/engine/DashboardEngine.tsx`
- **Backend Location**: `lib/actions/dashboardMetrics.ts` (`fetchLiveDashboardMetrics`)
- **Database Dependency**: `tasks`, `sub_tasks`, `tickets`, `requirements`, `workspaces`, `user_master`, `departments`
- **Permissions**: Publicly accessible to all authenticated active users (Universal Root)
- **Scope Support**:
  - `ALL`: Organization-wide (Super Admin only)
  - `my_dept`: Primary department or all managed departments (CFO / Dept Heads)
  - `my_reports`: Recursive subordinate reporting tree (Managers)
  - `assigned_me`: Direct deliverables assigned to caller
- **Current Status**: Operational, but SSR blocked by sequential queries and impacted by refresh loop.

### 1.2 My Support Portal (`/support`)
- **Module**: IT Support & Service Desk
- **Frontend Location**: `app/support/page.tsx`, `components/support/SupportPortalClient.tsx`
- **Backend Location**: `lib/actions/tickets.ts`
- **Database Dependency**: `tickets`, `ticket_messages`, `categories`, `priorities`
- **Permissions**: `SUPPORT_PORTAL_VIEW`, `SUPPORT_PORTAL_CREATE`
- **Current Status**: Operational.

### 1.3 Ticket Tracking (`/tickets`)
- **Module**: Enterprise Ticketing System
- **Frontend Location**: `app/tickets/page.tsx`, `components/tickets/TicketWorkspaceConsole.tsx`
- **Backend Location**: `lib/actions/tickets.ts`
- **Database Dependency**: `tickets`, `ticket_messages`, `ticket_relations`, `user_master`, `status_master`
- **Permissions**: `TICKETS_VIEW`, `TICKETS_CREATE`, `TICKETS_UPDATE`, `TICKETS_DELETE`, `TICKETS_MANAGE`
- **Current Status**: Operational. Mandatory status selection enforced.

### 1.4 Requirements Management (`/requirements`)
- **Module**: Requirements & Put-to-Use Tracking
- **Frontend Location**: `app/requirements/page.tsx`, `components/requirements/RequirementsListClient.tsx`
- **Backend Location**: `lib/actions/requirements.ts`
- **Database Dependency**: `requirements`, `requirement_approvals`, `requirement_custom_fields`, `attachments`
- **Permissions**: `REQUIREMENTS_VIEW`, `REQUIREMENTS_CREATE`, `REQUIREMENTS_UPDATE`, `REQUIREMENTS_APPROVALS_VIEW`
- **Current Status**: Operational.

### 1.5 Workspaces & Tasks (`/workspaces`)
- **Module**: Project Management, Sprints & Deliverables
- **Frontend Location**: `app/workspaces/page.tsx`, `app/workspaces/WorkspacesClient.tsx`, `components/tasks/TaskExecutionController.tsx`
- **Backend Location**: `lib/actions/workspaces.ts`, `lib/actions/tasks.ts`
- **Database Dependency**: `workspaces`, `workspace_members`, `tasks`, `task_participants`, `task_assignees`, `task_checklists`
- **Permissions**: `WORKSPACES_VIEW`, `TASKS_VIEW`, `TASKS_CREATE`, `TASKS_UPDATE`, `TASKS_TRANSFER_VIEW`
- **Current Status**: Operational. SSR decoupled in commit `0c5dbb1` (0ms client transition).

---

## 2. Governance & Analysis Modules

### 2.1 SLA Monitoring (`/sla`)
- **Frontend Location**: `app/sla/page.tsx`, `components/sla/SLAMonitoringDashboard.tsx`
- **Backend Location**: `lib/actions/sla.ts`
- **Database Dependency**: `tickets`, `tasks`, `requirements`, `sla_policies`, `sla_breaches`
- **Permissions**: `SLA_VIEW`, `SLA_MANAGE`, `SLA_UPDATE`
- **Current Status**: Operational.

### 2.2 AMC & Subscriptions (`/amc`)
- **Frontend Location**: `app/amc/page.tsx`, `components/amc/AMCConsole.tsx`, `components/amc/AMCPaymentsTab.tsx`
- **Backend Location**: `lib/actions/amc.ts`
- **Database Dependency**: `amc_contracts`, `amc_payments`, `amc_milestones`, `amc_transactions`, `vendor_master`
- **Permissions**: `AMC_VIEW`, `AMC_CREATE`, `AMC_EDIT`, `AMC_DELETE`
- **Current Status**: Operational. Mandatory payment status enforced.

### 2.3 User Master (`/users`)
- **Frontend Location**: `app/users/page.tsx`, `components/users/UserMasterClient.tsx`
- **Backend Location**: `lib/actions/users.ts`
- **Database Dependency**: `user_master`, `departments`, `designations`, `roles`
- **Permissions**: `USERS_VIEW`, `USER_CREATE`, `USER_UPDATE`, `USER_DELETE`
- **Current Status**: Operational.

### 2.4 IAM Controls (`/iam`)
- **Frontend Location**: `app/iam/page.tsx`, `components/iam/IAMConsole.tsx`
- **Backend Location**: `lib/actions/iam.ts`
- **Database Dependency**: `roles`, `permissions`, `role_permissions`, `user_roles`, `user_permissions_snapshot`, `active_sessions`
- **Permissions**: `IAM_VIEW`, `IAM_ADMIN`, `IAM_MANAGE`
- **Current Status**: Operational.

### 2.5 Learning Hub (`/learning`)
- **Frontend Location**: `app/learning/page.tsx`
- **Permissions**: `LEARNING_VIEW`
- **Current Status**: Operational.

---

## 3. System Base Modules

### 3.1 Master Entities (`/masters`)
- **Frontend Location**: `app/masters/page.tsx`, `app/masters/companies/page.tsx`, `app/masters/vendors/page.tsx`
- **Database Dependency**: `company_master`, `vendor_master`, `system_masters`
- **Permissions**: `MASTERS_VIEW`, `COMPANIES_VIEW`, `SYSTEM_MASTERS_VIEW`
- **Current Status**: Operational.

### 3.2 Trash Data (`/compliance`)
- **Frontend Location**: `app/compliance/page.tsx`
- **Database Dependency**: `delete_batches`, soft-deleted records (`is_deleted = true`)
- **Permissions**: `TRASH_VIEW`, `TRASH_DELETE`
- **Current Status**: Operational.

### 3.3 Settings & Themes (`/settings`)
- **Frontend Location**: `app/settings/page.tsx`
- **Permissions**: `SETTINGS_MANAGE`, `SETTINGS_THEME_VIEW`, `SETTINGS_IDENTITY_VIEW`
- **Current Status**: Operational.

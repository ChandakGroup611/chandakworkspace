# System Inventory

This document details the comprehensive application architecture and subsystem inventory for the Chandak Workspace Platform.

## 1. Enterprise Subsystems & Modules
1. **Workspace & Execution Engine (`/workspaces`, `/tasks`)**: Hierarchical workspaces, projects, sprints, task delegation, checklist items, time logs, task relations, participant inheritance.
2. **Ticketing & SLA Service Desk (`/tickets`, `/sla`, `/support`)**: Ticket intake, prioritization, escalation cron schedules, macro automation, ticket relations, real-time collaboration chat.
3. **Requirement Intake & Lifecycle Scoping (`/requirements`)**: Ticket-to-requirement promotion, multi-stakeholder approval flow, amendment governance, scope matrices.
4. **Software & Infrastructure Asset AMC Management (`/amc`, `/subscription`)**: Annual maintenance contracts, software subscriptions, licenses, amortization, milestone payment terms, auto-renewals, audit history.
5. **FleetDesk & Logistics Operations (`/vehicle`)**: Commercial/passenger fleet master, detailed 14-tier on-road pricing breakdown, mounted spare parts, document compliance vault (PUC, Fitness, Insurance), service entitlements, workshop history.
6. **Design Tracking Engine (`/design`)**: Architectural review boards, revision histories, drawing vaults, design-specific RBAC.
7. **IAM & Role-Based Access Control (`/iam`, `/rbac`, `/admin`)**: User master synchronization, permissions snapshot engine, module & action-level matrices, scope-driven data scoping.
8. **Enterprise Dynamic Masters (`/masters`, `/users`)**: Configurable companies, departments, designations, priorities, statuses, categories, and city registries.
9. **Universal Document Vault & Stream Proxy (`/api/proxy-attachment/[id]`)**: Dual View & Download compliance, secure proxy streaming, MIME-type sanitization, zero blind uploads.
10. **Notification & Asynchronous Email Engine (`/api/email`, `lib/actions/email-queue.ts`)**: Realtime notification websocket bus, transactional email queue, automated escalation dispatch.
11. **Universal Compliance & Trash Framework (`/compliance`)**: Soft-deletion architecture, non-destructive trash bin, instant restoration, immutable system audit trail.
12. **Knowledge & Learning Base (`/knowledge`, `/learning`)**: Enterprise SOPs, training materials, knowledge artifacts.

## 2. Database Tables & Key Relations
- **Identity & IAM**: `user_master`, `permissions`, `roles`, `fleet_user_access`, `design_user_access`, `active_sessions`.
- **Workspaces & Tasks**: `workspaces`, `workspace_members`, `workspace_tasks`, `task_checklists`, `task_time_logs`, `task_tags`, `task_relations`, `task_participants`.
- **Tickets & Requirements**: `tickets`, `ticket_chat_messages`, `ticket_macros`, `ticket_relations`, `ticket_escalations`, `requirements`, `requirement_approvals`, `requirement_amendments`.
- **AMC & Assets**: `software_amc`, `amc_licenses`, `amc_invoices`, `amc_transactions`, `amc_payments`, `amc_auto_renewals`, `amc_audit_logs`.
- **FleetDesk**: `vehicles`, `vehicle_documents`, `vehicle_parts`, `vehicle_services`, `vehicle_service_entitlements`, `vehicle_policy_renewals`, `vehicle_puc_renewals`, `fleet_insurance_vendors`.
- **Masters & Core**: `companies`, `departments`, `designations`, `priorities`, `statuses`, `categories`, `master_cities`, `system_events`, `email_queue`.

## 3. Security & Access Control Gates
- **Session Layer**: Server-side cookie token verification via `@supabase/ssr` & cached-user IAM bridge.
- **Data Layer**: Row Level Security (RLS) policies scoped by user ID, workspace membership, and tenant boundaries.
- **UI Guard Layer**: Zero permissive fallback triggers; buttons mirror exact backend capability matrix.
- **Document Gate**: Mandatory dual View & Download on every upload with pre- and post-submission cross-check capability.

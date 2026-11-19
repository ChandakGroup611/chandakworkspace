# Application Routes & Method Contract (ROUTES.md)

> Authoritative contract of all active HTTP routes, allowed methods, and types.
> Automatically generated on 2026-11-19T10:39:40.246Z.

## 1. API Endpoints

| Endpoint Path | Allowed Methods | Source File |
| :--- | :--- | :--- |
| `/api/amc` | `POST, DELETE` | [`app/api/amc/route.ts`](file:///D:/adios/app/api/amc/route.ts) |
| `/api/auth/permissions` | `GET` | [`app/api/auth/permissions/route.ts`](file:///D:/adios/app/api/auth/permissions/route.ts) |
| `/api/build-info` | `GET` | [`app/api/build-info/route.ts`](file:///D:/adios/app/api/build-info/route.ts) |
| `/api/copilot/action/execute` | `POST` | [`app/api/copilot/action/execute/route.ts`](file:///D:/adios/app/api/copilot/action/execute/route.ts) |
| `/api/copilot/chat` | `POST` | [`app/api/copilot/chat/route.ts`](file:///D:/adios/app/api/copilot/chat/route.ts) |
| `/api/copilot/poc-stream` | `POST` | [`app/api/copilot/poc-stream/route.ts`](file:///D:/adios/app/api/copilot/poc-stream/route.ts) |
| `/api/cron/fleet-compliance-audit` | `GET, POST` | [`app/api/cron/fleet-compliance-audit/route.ts`](file:///D:/adios/app/api/cron/fleet-compliance-audit/route.ts) |
| `/api/cron/process-email-queue` | `GET, POST` | [`app/api/cron/process-email-queue/route.ts`](file:///D:/adios/app/api/cron/process-email-queue/route.ts) |
| `/api/cron/tat-escalation` | `GET, POST` | [`app/api/cron/tat-escalation/route.ts`](file:///D:/adios/app/api/cron/tat-escalation/route.ts) |
| `/api/heartbeat` | `POST` | [`app/api/heartbeat/route.ts`](file:///D:/adios/app/api/heartbeat/route.ts) |
| `/api/log-http-error` | `POST` | [`app/api/log-http-error/route.ts`](file:///D:/adios/app/api/log-http-error/route.ts) |
| `/api/mentions` | `POST` | [`app/api/mentions/route.ts`](file:///D:/adios/app/api/mentions/route.ts) |
| `/api/migration/upload` | `POST` | [`app/api/migration/upload/route.ts`](file:///D:/adios/app/api/migration/upload/route.ts) |
| `/api/modules` | `GET, POST` | [`app/api/modules/route.ts`](file:///D:/adios/app/api/modules/route.ts) |
| `/api/perf` | `GET` | [`app/api/perf/route.ts`](file:///D:/adios/app/api/perf/route.ts) |
| `/api/proxy-attachment/[id]` | `GET` | [`app/api/proxy-attachment/[id]/route.ts`](file:///D:/adios/app/api/proxy-attachment/[id]/route.ts) |
| `/api/revalidate-iam` | `GET` | [`app/api/revalidate-iam/route.ts`](file:///D:/adios/app/api/revalidate-iam/route.ts) |
| `/api/search` | `GET` | [`app/api/search/route.ts`](file:///D:/adios/app/api/search/route.ts) |
| `/api/session/conflict` | `POST` | [`app/api/session/conflict/route.ts`](file:///D:/adios/app/api/session/conflict/route.ts) |
| `/api/session/register` | `POST` | [`app/api/session/register/route.ts`](file:///D:/adios/app/api/session/register/route.ts) |
| `/api/sla` | `GET` | [`app/api/sla/route.ts`](file:///D:/adios/app/api/sla/route.ts) |
| `/api/users` | `GET` | [`app/api/users/route.ts`](file:///D:/adios/app/api/users/route.ts) |
| `/api/vehicle/create` | `POST` | [`app/api/vehicle/create/route.ts`](file:///D:/adios/app/api/vehicle/create/route.ts) |
| `/api/vehicle/document-content` | `GET` | [`app/api/vehicle/document-content/route.ts`](file:///D:/adios/app/api/vehicle/document-content/route.ts) |
| `/api/vehicle/documents` | `GET` | [`app/api/vehicle/documents/route.ts`](file:///D:/adios/app/api/vehicle/documents/route.ts) |
| `/api/vehicle/documents/delete` | `POST` | [`app/api/vehicle/documents/delete/route.ts`](file:///D:/adios/app/api/vehicle/documents/delete/route.ts) |
| `/api/vehicle/documents/update` | `POST` | [`app/api/vehicle/documents/update/route.ts`](file:///D:/adios/app/api/vehicle/documents/update/route.ts) |
| `/api/vehicle/documents/upload` | `POST` | [`app/api/vehicle/documents/upload/route.ts`](file:///D:/adios/app/api/vehicle/documents/upload/route.ts) |
| `/api/vehicle/image` | `GET` | [`app/api/vehicle/image/route.ts`](file:///D:/adios/app/api/vehicle/image/route.ts) |
| `/api/vehicle/image/cutout` | `GET` | [`app/api/vehicle/image/cutout/route.ts`](file:///D:/adios/app/api/vehicle/image/cutout/route.ts) |
| `/api/vehicle/lookup` | `GET` | [`app/api/vehicle/lookup/route.ts`](file:///D:/adios/app/api/vehicle/lookup/route.ts) |
| `/api/vehicle/model-image` | `POST, DELETE` | [`app/api/vehicle/model-image/route.ts`](file:///D:/adios/app/api/vehicle/model-image/route.ts) |
| `/api/vehicle/model-image/auto` | `GET, POST` | [`app/api/vehicle/model-image/auto/route.ts`](file:///D:/adios/app/api/vehicle/model-image/auto/route.ts) |
| `/api/vehicle/model-image/candidates` | `GET` | [`app/api/vehicle/model-image/candidates/route.ts`](file:///D:/adios/app/api/vehicle/model-image/candidates/route.ts) |
| `/api/vehicle/model-image/file` | `GET` | [`app/api/vehicle/model-image/file/route.ts`](file:///D:/adios/app/api/vehicle/model-image/file/route.ts) |
| `/api/vehicle/model-image/preview` | `POST` | [`app/api/vehicle/model-image/preview/route.ts`](file:///D:/adios/app/api/vehicle/model-image/preview/route.ts) |
| `/api/vehicle/model-image/runtime/[file]` | `GET` | [`app/api/vehicle/model-image/runtime/[file]/route.ts`](file:///D:/adios/app/api/vehicle/model-image/runtime/[file]/route.ts) |
| `/api/vehicle/model-image/segmenter` | `GET` | [`app/api/vehicle/model-image/segmenter/route.ts`](file:///D:/adios/app/api/vehicle/model-image/segmenter/route.ts) |
| `/api/vehicle/model-image/source` | `GET` | [`app/api/vehicle/model-image/source/route.ts`](file:///D:/adios/app/api/vehicle/model-image/source/route.ts) |
| `/api/vehicle/model-images` | `GET` | [`app/api/vehicle/model-images/route.ts`](file:///D:/adios/app/api/vehicle/model-images/route.ts) |
| `/api/version` | `GET` | [`app/api/version/route.ts`](file:///D:/adios/app/api/version/route.ts) |
| `/api/webhooks/event-worker` | `POST` | [`app/api/webhooks/event-worker/route.ts`](file:///D:/adios/app/api/webhooks/event-worker/route.ts) |
| `/auth/[...rest]` | `GET` | [`app/auth/[...rest]/route.ts`](file:///D:/adios/app/auth/[...rest]/route.ts) |
| `/auth/callback` | `GET` | [`app/auth/callback/route.ts`](file:///D:/adios/app/auth/callback/route.ts) |
| `/auth/direct` | `GET` | [`app/auth/direct/route.ts`](file:///D:/adios/app/auth/direct/route.ts) |
| `/budget/[projectId]/export/[kind]` | `GET` | [`app/budget/[projectId]/export/[kind]/route.ts`](file:///D:/adios/app/budget/[projectId]/export/[kind]/route.ts) |
| `/dashboards/[key]/[[...path]]` | `GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS` | [`app/dashboards/[key]/[[...path]]/route.ts`](file:///D:/adios/app/dashboards/[key]/[[...path]]/route.ts) |

## 2. Page & View Routes

| Page Route | Allowed Methods | Source File |
| :--- | :--- | :--- |
| `/admin` | `GET, HEAD, POST` | [`app/admin/page.tsx`](file:///D:/adios/app/admin/page.tsx) |
| `/admin/performance` | `GET, HEAD, POST` | [`app/admin/performance/page.tsx`](file:///D:/adios/app/admin/performance/page.tsx) |
| `/admin/settings` | `GET, HEAD, POST` | [`app/admin/settings/page.tsx`](file:///D:/adios/app/admin/settings/page.tsx) |
| `/amc` | `GET, HEAD, POST` | [`app/amc/page.tsx`](file:///D:/adios/app/amc/page.tsx) |
| `/amc/analytics` | `GET, HEAD, POST` | [`app/amc/analytics/page.tsx`](file:///D:/adios/app/amc/analytics/page.tsx) |
| `/amc/reports` | `GET, HEAD, POST` | [`app/amc/reports/page.tsx`](file:///D:/adios/app/amc/reports/page.tsx) |
| `/approvals` | `GET, HEAD, POST` | [`app/approvals/page.tsx`](file:///D:/adios/app/approvals/page.tsx) |
| `/auth/accept` | `GET, HEAD, POST` | [`app/auth/accept/page.tsx`](file:///D:/adios/app/auth/accept/page.tsx) |
| `/budget` | `GET, HEAD, POST` | [`app/budget/page.tsx`](file:///D:/adios/app/budget/page.tsx) |
| `/budget/[projectId]` | `GET, HEAD, POST` | [`app/budget/[projectId]/page.tsx`](file:///D:/adios/app/budget/[projectId]/page.tsx) |
| `/budget/[projectId]/[tab]` | `GET, HEAD, POST` | [`app/budget/[projectId]/[tab]/page.tsx`](file:///D:/adios/app/budget/[projectId]/[tab]/page.tsx) |
| `/budget/admin` | `GET, HEAD, POST` | [`app/budget/admin/page.tsx`](file:///D:/adios/app/budget/admin/page.tsx) |
| `/budget/admin/[section]` | `GET, HEAD, POST` | [`app/budget/admin/[section]/page.tsx`](file:///D:/adios/app/budget/admin/[section]/page.tsx) |
| `/budget/create` | `GET, HEAD, POST` | [`app/budget/create/page.tsx`](file:///D:/adios/app/budget/create/page.tsx) |
| `/budget/guide` | `GET, HEAD, POST` | [`app/budget/guide/page.tsx`](file:///D:/adios/app/budget/guide/page.tsx) |
| `/budget/import` | `GET, HEAD, POST` | [`app/budget/import/page.tsx`](file:///D:/adios/app/budget/import/page.tsx) |
| `/compliance` | `GET, HEAD, POST` | [`app/compliance/page.tsx`](file:///D:/adios/app/compliance/page.tsx) |
| `/dashboards` | `GET, HEAD, POST` | [`app/dashboards/page.tsx`](file:///D:/adios/app/dashboards/page.tsx) |
| `/design/[[...slug]]` | `GET, HEAD, POST` | [`app/design/[[...slug]]/page.tsx`](file:///D:/adios/app/design/[[...slug]]/page.tsx) |
| `/iam` | `GET, HEAD, POST` | [`app/iam/page.tsx`](file:///D:/adios/app/iam/page.tsx) |
| `/iam/cockpit` | `GET, HEAD, POST` | [`app/iam/cockpit/page.tsx`](file:///D:/adios/app/iam/cockpit/page.tsx) |
| `/iam/roles` | `GET, HEAD, POST` | [`app/iam/roles/page.tsx`](file:///D:/adios/app/iam/roles/page.tsx) |
| `/iam/sessions` | `GET, HEAD, POST` | [`app/iam/sessions/page.tsx`](file:///D:/adios/app/iam/sessions/page.tsx) |
| `/knowledge` | `GET, HEAD, POST` | [`app/knowledge/page.tsx`](file:///D:/adios/app/knowledge/page.tsx) |
| `/knowledge/articles` | `GET, HEAD, POST` | [`app/knowledge/articles/page.tsx`](file:///D:/adios/app/knowledge/articles/page.tsx) |
| `/learning` | `GET, HEAD, POST` | [`app/learning/page.tsx`](file:///D:/adios/app/learning/page.tsx) |
| `/learning/courses` | `GET, HEAD, POST` | [`app/learning/courses/page.tsx`](file:///D:/adios/app/learning/courses/page.tsx) |
| `/login` | `GET, HEAD, POST` | [`app/login/page.tsx`](file:///D:/adios/app/login/page.tsx) |
| `/masters` | `GET, HEAD, POST` | [`app/masters/page.tsx`](file:///D:/adios/app/masters/page.tsx) |
| `/masters/companies` | `GET, HEAD, POST` | [`app/masters/companies/page.tsx`](file:///D:/adios/app/masters/companies/page.tsx) |
| `/masters/departments` | `GET, HEAD, POST` | [`app/masters/departments/page.tsx`](file:///D:/adios/app/masters/departments/page.tsx) |
| `/masters/designations` | `GET, HEAD, POST` | [`app/masters/designations/page.tsx`](file:///D:/adios/app/masters/designations/page.tsx) |
| `/masters/vendors` | `GET, HEAD, POST` | [`app/masters/vendors/page.tsx`](file:///D:/adios/app/masters/vendors/page.tsx) |
| `/meet` | `GET, HEAD, POST` | [`app/meet/page.tsx`](file:///D:/adios/app/meet/page.tsx) |
| `/meet/admin` | `GET, HEAD, POST` | [`app/meet/admin/page.tsx`](file:///D:/adios/app/meet/admin/page.tsx) |
| `/meet/calendar` | `GET, HEAD, POST` | [`app/meet/calendar/page.tsx`](file:///D:/adios/app/meet/calendar/page.tsx) |
| `/meet/decisions` | `GET, HEAD, POST` | [`app/meet/decisions/page.tsx`](file:///D:/adios/app/meet/decisions/page.tsx) |
| `/meet/live` | `GET, HEAD, POST` | [`app/meet/live/page.tsx`](file:///D:/adios/app/meet/live/page.tsx) |
| `/meet/live/[sessionId]` | `GET, HEAD, POST` | [`app/meet/live/[sessionId]/page.tsx`](file:///D:/adios/app/meet/live/[sessionId]/page.tsx) |
| `/meet/meetings` | `GET, HEAD, POST` | [`app/meet/meetings/page.tsx`](file:///D:/adios/app/meet/meetings/page.tsx) |
| `/meet/meetings/[id]` | `GET, HEAD, POST` | [`app/meet/meetings/[id]/page.tsx`](file:///D:/adios/app/meet/meetings/[id]/page.tsx) |
| `/meet/meetings/new` | `GET, HEAD, POST` | [`app/meet/meetings/new/page.tsx`](file:///D:/adios/app/meet/meetings/new/page.tsx) |
| `/meet/my-work` | `GET, HEAD, POST` | [`app/meet/my-work/page.tsx`](file:///D:/adios/app/meet/my-work/page.tsx) |
| `/meet/notes` | `GET, HEAD, POST` | [`app/meet/notes/page.tsx`](file:///D:/adios/app/meet/notes/page.tsx) |
| `/meet/reports` | `GET, HEAD, POST` | [`app/meet/reports/page.tsx`](file:///D:/adios/app/meet/reports/page.tsx) |
| `/meet/sessions/[sessionId]` | `GET, HEAD, POST` | [`app/meet/sessions/[sessionId]/page.tsx`](file:///D:/adios/app/meet/sessions/[sessionId]/page.tsx) |
| `/migration` | `GET, HEAD, POST` | [`app/migration/page.tsx`](file:///D:/adios/app/migration/page.tsx) |
| `/my-work` | `GET, HEAD, POST` | [`app/my-work/page.tsx`](file:///D:/adios/app/my-work/page.tsx) |
| `/no-access` | `GET, HEAD, POST` | [`app/no-access/page.tsx`](file:///D:/adios/app/no-access/page.tsx) |
| `/page.tsx` | `GET, HEAD, POST` | [`app/page.tsx`](file:///D:/adios/app/page.tsx) |
| `/profile` | `GET, HEAD, POST` | [`app/profile/page.tsx`](file:///D:/adios/app/profile/page.tsx) |
| `/rbac` | `GET, HEAD, POST` | [`app/rbac/page.tsx`](file:///D:/adios/app/rbac/page.tsx) |
| `/requirements` | `GET, HEAD, POST` | [`app/requirements/page.tsx`](file:///D:/adios/app/requirements/page.tsx) |
| `/requirements/[id]` | `GET, HEAD, POST` | [`app/requirements/[id]/page.tsx`](file:///D:/adios/app/requirements/[id]/page.tsx) |
| `/requirements/approvals` | `GET, HEAD, POST` | [`app/requirements/approvals/page.tsx`](file:///D:/adios/app/requirements/approvals/page.tsx) |
| `/requirements/grooming` | `GET, HEAD, POST` | [`app/requirements/grooming/page.tsx`](file:///D:/adios/app/requirements/grooming/page.tsx) |
| `/requirements/reports` | `GET, HEAD, POST` | [`app/requirements/reports/page.tsx`](file:///D:/adios/app/requirements/reports/page.tsx) |
| `/rooms/[roomId]/display` | `GET, HEAD, POST` | [`app/rooms/[roomId]/display/page.tsx`](file:///D:/adios/app/rooms/[roomId]/display/page.tsx) |
| `/select-module` | `GET, HEAD, POST` | [`app/select-module/page.tsx`](file:///D:/adios/app/select-module/page.tsx) |
| `/settings` | `GET, HEAD, POST` | [`app/settings/page.tsx`](file:///D:/adios/app/settings/page.tsx) |
| `/settings/access-matrix` | `GET, HEAD, POST` | [`app/settings/access-matrix/page.tsx`](file:///D:/adios/app/settings/access-matrix/page.tsx) |
| `/settings/communication` | `GET, HEAD, POST` | [`app/settings/communication/page.tsx`](file:///D:/adios/app/settings/communication/page.tsx) |
| `/settings/communication/logs` | `GET, HEAD, POST` | [`app/settings/communication/logs/page.tsx`](file:///D:/adios/app/settings/communication/logs/page.tsx) |
| `/settings/communication/providers` | `GET, HEAD, POST` | [`app/settings/communication/providers/page.tsx`](file:///D:/adios/app/settings/communication/providers/page.tsx) |
| `/settings/communication/rules` | `GET, HEAD, POST` | [`app/settings/communication/rules/page.tsx`](file:///D:/adios/app/settings/communication/rules/page.tsx) |
| `/settings/communication/templates` | `GET, HEAD, POST` | [`app/settings/communication/templates/page.tsx`](file:///D:/adios/app/settings/communication/templates/page.tsx) |
| `/settings/email` | `GET, HEAD, POST` | [`app/settings/email/page.tsx`](file:///D:/adios/app/settings/email/page.tsx) |
| `/settings/identity` | `GET, HEAD, POST` | [`app/settings/identity/page.tsx`](file:///D:/adios/app/settings/identity/page.tsx) |
| `/settings/notifications` | `GET, HEAD, POST` | [`app/settings/notifications/page.tsx`](file:///D:/adios/app/settings/notifications/page.tsx) |
| `/share/[token]` | `GET, HEAD, POST` | [`app/share/[token]/page.tsx`](file:///D:/adios/app/share/[token]/page.tsx) |
| `/sla` | `GET, HEAD, POST` | [`app/sla/page.tsx`](file:///D:/adios/app/sla/page.tsx) |
| `/sla/holidays` | `GET, HEAD, POST` | [`app/sla/holidays/page.tsx`](file:///D:/adios/app/sla/holidays/page.tsx) |
| `/sla/rules` | `GET, HEAD, POST` | [`app/sla/rules/page.tsx`](file:///D:/adios/app/sla/rules/page.tsx) |
| `/subscription` | `GET, HEAD, POST` | [`app/subscription/page.tsx`](file:///D:/adios/app/subscription/page.tsx) |
| `/support` | `GET, HEAD, POST` | [`app/support/page.tsx`](file:///D:/adios/app/support/page.tsx) |
| `/tasks` | `GET, HEAD, POST` | [`app/tasks/page.tsx`](file:///D:/adios/app/tasks/page.tsx) |
| `/tasks/[taskId]` | `GET, HEAD, POST` | [`app/tasks/[taskId]/page.tsx`](file:///D:/adios/app/tasks/[taskId]/page.tsx) |
| `/tickets` | `GET, HEAD, POST` | [`app/tickets/page.tsx`](file:///D:/adios/app/tickets/page.tsx) |
| `/tickets/[ticketId]` | `GET, HEAD, POST` | [`app/tickets/[ticketId]/page.tsx`](file:///D:/adios/app/tickets/[ticketId]/page.tsx) |
| `/tickets/automations` | `GET, HEAD, POST` | [`app/tickets/automations/page.tsx`](file:///D:/adios/app/tickets/automations/page.tsx) |
| `/tickets/dashboard` | `GET, HEAD, POST` | [`app/tickets/dashboard/page.tsx`](file:///D:/adios/app/tickets/dashboard/page.tsx) |
| `/users` | `GET, HEAD, POST` | [`app/users/page.tsx`](file:///D:/adios/app/users/page.tsx) |
| `/users/[id]` | `GET, HEAD, POST` | [`app/users/[id]/page.tsx`](file:///D:/adios/app/users/[id]/page.tsx) |
| `/vehicle/[[...slug]]` | `GET, HEAD, POST` | [`app/vehicle/[[...slug]]/page.tsx`](file:///D:/adios/app/vehicle/[[...slug]]/page.tsx) |
| `/verify-drawing/[token]` | `GET, HEAD, POST` | [`app/verify-drawing/[token]/page.tsx`](file:///D:/adios/app/verify-drawing/[token]/page.tsx) |
| `/workspaces` | `GET, HEAD, POST` | [`app/workspaces/page.tsx`](file:///D:/adios/app/workspaces/page.tsx) |
| `/workspaces/enrolled` | `GET, HEAD, POST` | [`app/workspaces/enrolled/page.tsx`](file:///D:/adios/app/workspaces/enrolled/page.tsx) |
| `/workspaces/reports` | `GET, HEAD, POST` | [`app/workspaces/reports/page.tsx`](file:///D:/adios/app/workspaces/reports/page.tsx) |
| `/workspaces/tasks` | `GET, HEAD, POST` | [`app/workspaces/tasks/page.tsx`](file:///D:/adios/app/workspaces/tasks/page.tsx) |
| `/workspaces/transfer-tasks` | `GET, HEAD, POST` | [`app/workspaces/transfer-tasks/page.tsx`](file:///D:/adios/app/workspaces/transfer-tasks/page.tsx) |

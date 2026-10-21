# UI migration tracker
Baseline: 5190 errors / 2078 warnings on 21 Oct 2026. Current: 5190 errors / 2078 warnings.

## Modules (in order)
| # | Module | Pages | Errors at start | Errors now | Status |
|---|---|---:|---:|---:|---|
| 0 | Foundation (themes, shell, shared kit) | – | 0 | 0 | Done |
| 1 | Shared components outside the kit | 76 files | 787 | 787 | Todo |
| 2 | Task Workflow | 29 | 482 | 482 | Todo |
| 3 | Vehicle Desk | 1 | 2875 | 2875 | Todo |
| 4 | Design Tracking | 1 | 16 | 16 | Todo |
| 5 | Dashboards & Reports | 9 | 473 | 473 | Todo |
| 6 | Admin, RBAC, IAM, Masters, Settings | 31 | 488 | 488 | Todo |
| 7 | Auth, module select, profile, misc | 7 | 69 | 69 | Todo |
| 8 | Guardrails & cleanup | – | – | – | Todo |

## Pages
| Module | Route | Main file(s) | Page type (list/detail/form/dashboard/board/calendar/settings/auth/print) | Errors | Status |
|---|---|---|---|---:|---|
| Admin, RBAC, IAM, Masters, Settings | (overlay) SystemMasterBulkImportModal | components/masters/SystemMasterBulkImportModal.tsx | detail | 70 | Todo |
| Admin, RBAC, IAM, Masters, Settings | /admin | app/admin/page.tsx | list | 0 | Todo |
| Admin, RBAC, IAM, Masters, Settings | /admin/performance | app/admin/performance/page.tsx | dashboard | 23 | Todo |
| Admin, RBAC, IAM, Masters, Settings | /admin/settings | app/admin/settings/page.tsx | settings | 11 | Todo |
| Admin, RBAC, IAM, Masters, Settings | /compliance | app/compliance/page.tsx | list | 0 | Todo |
| Admin, RBAC, IAM, Masters, Settings | /iam | app/iam/page.tsx | list | 0 | Todo |
| Admin, RBAC, IAM, Masters, Settings | /iam/cockpit | app/iam/cockpit/page.tsx | dashboard | 0 | Todo |
| Admin, RBAC, IAM, Masters, Settings | /iam/roles | app/iam/roles/page.tsx | list | 4 | Todo |
| Admin, RBAC, IAM, Masters, Settings | /iam/sessions | app/iam/sessions/page.tsx | list | 1 | Todo |
| Admin, RBAC, IAM, Masters, Settings | /knowledge | app/knowledge/page.tsx | list | 0 | Todo |
| Admin, RBAC, IAM, Masters, Settings | /knowledge/articles | app/knowledge/articles/page.tsx | list | 2 | Todo |
| Admin, RBAC, IAM, Masters, Settings | /learning | app/learning/page.tsx | list | 0 | Todo |
| Admin, RBAC, IAM, Masters, Settings | /learning/courses | app/learning/courses/page.tsx | list | 8 | Todo |
| Admin, RBAC, IAM, Masters, Settings | /masters | app/masters/page.tsx | list | 32 | Todo |
| Admin, RBAC, IAM, Masters, Settings | /masters/companies | app/masters/companies/page.tsx | list | 9 | Todo |
| Admin, RBAC, IAM, Masters, Settings | /masters/departments | app/masters/departments/page.tsx | list | 3 | Todo |
| Admin, RBAC, IAM, Masters, Settings | /masters/designations | app/masters/designations/page.tsx | list | 3 | Todo |
| Admin, RBAC, IAM, Masters, Settings | /masters/vendors | app/masters/vendors/page.tsx | list | 13 | Todo |
| Admin, RBAC, IAM, Masters, Settings | /rbac | app/rbac/page.tsx | list | 0 | Todo |
| Admin, RBAC, IAM, Masters, Settings | /settings | app/settings/page.tsx | settings | 0 | Todo |
| Admin, RBAC, IAM, Masters, Settings | /settings/communication | app/settings/communication/page.tsx | settings | 3 | Todo |
| Admin, RBAC, IAM, Masters, Settings | /settings/communication/logs | app/settings/communication/logs/page.tsx | settings | 0 | Todo |
| Admin, RBAC, IAM, Masters, Settings | /settings/communication/providers | app/settings/communication/providers/page.tsx | settings | 0 | Todo |
| Admin, RBAC, IAM, Masters, Settings | /settings/communication/rules | app/settings/communication/rules/page.tsx | settings | 0 | Todo |
| Admin, RBAC, IAM, Masters, Settings | /settings/communication/templates | app/settings/communication/templates/page.tsx | settings | 0 | Todo |
| Admin, RBAC, IAM, Masters, Settings | /settings/email | app/settings/email/page.tsx | settings | 0 | Todo |
| Admin, RBAC, IAM, Masters, Settings | /settings/identity | app/settings/identity/page.tsx | settings | 0 | Todo |
| Admin, RBAC, IAM, Masters, Settings | /settings/notifications | app/settings/notifications/page.tsx | settings | 0 | Todo |
| Admin, RBAC, IAM, Masters, Settings | /subscription | app/subscription/page.tsx | list | 2 | Todo |
| Admin, RBAC, IAM, Masters, Settings | /users | app/users/page.tsx | list | 112 | Todo |
| Admin, RBAC, IAM, Masters, Settings | /users/:id | app/users/[id]/page.tsx | detail | 73 | Todo |
| Auth, module select, profile, misc | (overlay) CityManagerModal | components/shared/CityManagerModal.tsx | detail | 9 | Todo |
| Auth, module select, profile, misc | / | app/page.tsx | list | 0 | Todo |
| Auth, module select, profile, misc | /login | app/login/page.tsx | auth | 4 | Todo |
| Auth, module select, profile, misc | /profile | app/profile/page.tsx | list | 0 | Todo |
| Auth, module select, profile, misc | /select-module | app/select-module/page.tsx | auth | 65 | Todo |
| Auth, module select, profile, misc | /share/:token | app/share/[token]/page.tsx | detail | 38 | Todo |
| Auth, module select, profile, misc | /verify-drawing/:token | app/verify-drawing/[token]/page.tsx | detail | 25 | Todo |
| Dashboards & Reports | (overlay) CustomizeDashboardModal | components/dashboard/engine/CustomizeDashboardModal.tsx | detail | 3 | Todo |
| Dashboards & Reports | (overlay) MetricsListModal | components/dashboard/widgets/MetricsListModal.tsx | detail | 14 | Todo |
| Dashboards & Reports | (overlay) UserPerformanceWorkingSheetModal | components/dashboard/performance/UserPerformanceWorkingSheetModal.tsx | detail | 41 | Todo |
| Dashboards & Reports | /amc/analytics | app/amc/analytics/page.tsx | dashboard | 21 | Todo |
| Dashboards & Reports | /amc/reports | app/amc/reports/page.tsx | dashboard | 11 | Todo |
| Dashboards & Reports | /dashboards | app/dashboards/page.tsx | dashboard | 2 | Todo |
| Dashboards & Reports | /requirements/reports | app/requirements/reports/page.tsx | dashboard | 1 | Todo |
| Dashboards & Reports | /tickets/dashboard | app/tickets/dashboard/page.tsx | dashboard | 0 | Todo |
| Dashboards & Reports | /workspaces/reports | app/workspaces/reports/page.tsx | dashboard | 0 | Todo |
| Design Tracking | /design/* | app/design/[[...slug]]/page.tsx | list | 0 | Todo |
| Task Workflow | (overlay) AMCAllocationModal | components/amc/AMCAllocationModal.tsx | detail | 2 | Todo |
| Task Workflow | (overlay) AMCHistoryModal | components/amc/AMCHistoryModal.tsx | detail | 2 | Todo |
| Task Workflow | (overlay) AMCRenewalModal | components/amc/AMCRenewalModal.tsx | detail | 3 | Todo |
| Task Workflow | (overlay) EditRequirementModal | components/requirements/EditRequirementModal.tsx | detail | 19 | Todo |
| Task Workflow | (overlay) MoveTasksModal | components/tasks/MoveTasksModal.tsx | detail | 6 | Todo |
| Task Workflow | (overlay) QuickApprovalModal | components/requirements/QuickApprovalModal.tsx | detail | 3 | Todo |
| Task Workflow | (overlay) RealtimeNotificationsDrawer | components/layout/RealtimeNotificationsDrawer.tsx | detail | 35 | Todo |
| Task Workflow | (overlay) RequirementAnalysisModal | components/requirements/RequirementAnalysisModal.tsx | detail | 23 | Todo |
| Task Workflow | (overlay) RequirementDetailDrawer | components/requirements/RequirementDetailDrawer.tsx | detail | 11 | Todo |
| Task Workflow | (overlay) TaskDetailDrawer | components/tasks/TaskDetailDrawer.tsx | detail | 0 | Todo |
| Task Workflow | /amc | app/amc/page.tsx | list | 65 | Todo |
| Task Workflow | /migration | app/migration/page.tsx | form | 2 | Todo |
| Task Workflow | /requirements | app/requirements/page.tsx | list | 33 | Todo |
| Task Workflow | /requirements/:id | app/requirements/[id]/page.tsx | detail | 147 | Todo |
| Task Workflow | /requirements/approvals | app/requirements/approvals/page.tsx | list | 19 | Todo |
| Task Workflow | /requirements/grooming | app/requirements/grooming/page.tsx | form | 12 | Todo |
| Task Workflow | /sla | app/sla/page.tsx | list | 19 | Todo |
| Task Workflow | /sla/holidays | app/sla/holidays/page.tsx | list | 9 | Todo |
| Task Workflow | /sla/rules | app/sla/rules/page.tsx | settings | 9 | Todo |
| Task Workflow | /support | app/support/page.tsx | list | 0 | Todo |
| Task Workflow | /tasks | app/tasks/page.tsx | list | 0 | Todo |
| Task Workflow | /tasks/:taskId | app/tasks/[taskId]/page.tsx | detail | 7 | Todo |
| Task Workflow | /tickets | app/tickets/page.tsx | list | 4 | Todo |
| Task Workflow | /tickets/:ticketId | app/tickets/[ticketId]/page.tsx | detail | 1 | Todo |
| Task Workflow | /tickets/automations | app/tickets/automations/page.tsx | list | 26 | Todo |
| Task Workflow | /workspaces | app/workspaces/page.tsx | list | 0 | Todo |
| Task Workflow | /workspaces/enrolled | app/workspaces/enrolled/page.tsx | list | 0 | Todo |
| Task Workflow | /workspaces/tasks | app/workspaces/tasks/page.tsx | list | 0 | Todo |
| Task Workflow | /workspaces/transfer-tasks | app/workspaces/transfer-tasks/page.tsx | form | 0 | Todo |
| Vehicle Desk | /vehicle/* | app/vehicle/[[...slug]]/page.tsx | list | 0 | Todo |

## Decisions
- Baseline established with `tools/ui-audit.mjs` showing 5190 errors and 2078 warnings across 325 files.
- Phase 0 initialization: added _ui-kit and examples to tsconfig.json and eslint.config.mjs ignore lists.
- Extracted UI kit v3 to _ui-kit.
- Phase 1 Foundation completed:
  - Installed theme tokens and verified all 9 themes and 7 accents pass contrast checks (`npm run themes`).
  - Merged shared UI kit primitives (`AppButton`, `AppInput`, `AppBadge`, `AppCard`, `AppTable`, `AppSkeleton`, `AppTabs`, `FileDropzone`, multi-selects, enterprise shells, `data/`, `form/`, `detail/`, `feedback/`, `charts/`).
  - Preserved backward compatibility on `AppTableEmpty` supporting both legacy `message`/`children` and new `title`/`hint`.
  - Merged shell navigation components (`Sidebar`, `Navbar`, `ModuleSwitcher`, `WorkspaceShell`, `MobileBottomNav`, `PageHeader`, `PageContainer`) while preserving all routing, cookie logic, and permission filters.
  - Copied reference layouts to `examples/`.
  - Passed TypeScript type-check (`tsc --noEmit`), lint checks, and Next.js production build with 0 errors on touched foundation files.

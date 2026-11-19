# Super Admin Release Verification Checklist (10-Line Protocol)

1. **Login & Session Identity**: Log in as Super Admin; verify user profile displays Super Administrator role and full unrestricted navigation across all module tabs in the sidebar.
2. **Workspaces & Tasks**: Open `/workspaces` and `/workspaces/tasks`; verify visibility across all corporate workspaces, open any task, and confirm full edit, assign, status transition, and reopen controls.
3. **Tickets Queue**: Open `/tickets`; verify cross-department tickets and SLA queues are visible with unconstrained status transition, reassignment, and ticket priority controls.
4. **Requirements Backlog**: Open `/requirements`; confirm visibility across all projects, verify sign-off action triggers, UAT acceptance, and atomic closure workflows are active.
5. **Design & DMS**: Open `/design` and DMS document tree; confirm unrestricted access across all project drawing sheets, GFC release approvals, and root folder management.
6. **Vehicle Fleet**: Open `/vehicle`; confirm access to all fleet vehicles, dispatch console, workshop maintenance logs, and vehicle compliance document views.
7. **Meet & Minutes**: Open `/meet`; verify ability to view all scheduled sessions, publish Minutes of Meeting (MoM), and reassign meeting chairs across departments.
8. **User & Workspace IAM**: Open Workspace Management `/workspaces` user invite/edit modal; verify module-scoped role assignment, scope selector (ALL / SPECIFIC), and dashboard selection.
9. **IAM Cockpit & Roles**: Open IAM module settings; verify module role matrices, confirm `STANDARD` role is undeletable, and verify module role cloning/editing without errors.
10. **Trash & Purge Safety**: Open `/compliance` (Trash); verify all module tabs (Tasks, Tickets, AMC, etc.), test single restore, and verify the typed "PURGE" confirmation guard.

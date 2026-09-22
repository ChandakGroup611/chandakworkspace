# IAM / RBAC Matrix

This document tracks the IAM, RBAC, Roles, Permissions, and Scopes for the Chandak Workspace application.

## Roles
- `SUPER_ADMIN`: Unrestricted platform-wide administrative access.
- `ROLE_ADMIN`: Administrative operations manager.
- `ROLE_STAFF` / `ROLE_AGENT`: Standard employee/agent role. Scope-restricted to assigned entities.

## Action-level Permissions & Ownership Matrix (Tasks)

| Action | Super Admin | Primary Assignee (Owner) | Executor | Creator | Watcher / ROLE_AGENT |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Edit Primary Assignee** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Edit Executors** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Edit Watchers** | ✅ | ✅ | ❌ | ✅ | ❌ |
| **Edit Start/Due Dates & Duration** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Edit Title** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Change Status / Department** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Checklist Toggle / Add** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Upload Attachments** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Add Remarks / Realtime Chat** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Transfer Task** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Delete Task** | ✅ (`TASKS_DELETE`) | ✅ | ❌ | ❌ | ❌ |


# Complete Application Access Inventory (ACCESS_INVENTORY.md)

**Document Generation Date:** 2026-11-19  
**Governing Requirement:** Master Programme WP7.1 (Module-Wise RBAC)  
**Scope:** All application pages, API endpoints, and server actions across 11 functional domains.  

## Architectural Summary

The platform transitions from legacy composite role/string checks (`hasPermission`, `isSuperAdmin`) to deterministic, session-derived module authorization:  
`can(userId, moduleCode, action, recordScope)`.

### Legend of Current Problems
- **P1 (Global Leak)**: Global role check permits cross-module bypass.
- **P2 (Permissive Fallback)**: Missing server check or composite OR fallback allowing unauthorized mutations.
- **P3 (Client-Side Only)**: Mutation gate rendered conditionally on UI but omitted in server action.
- **P4 (Unbounded Scope)**: Action lacks entity-level scoping (project, department, or workspace).

---

## Module: `TASK_WORKFLOW`

### 1. Routes & Pages

| Route Path | Type | Current Access Check | Target Module Check | Status / Defect |
| :--- | :---: | :--- | :--- | :---: |
| `app/tasks/[taskId]/page.tsx` | Page | isSuperAdmin / Global Role | `can(user.id, "TASK_WORKFLOW", "VIEW")` | P1: Global Leak |
| `app/tasks/page.tsx` | Page | Session Authentication | `can(user.id, "TASK_WORKFLOW", "VIEW")` | P2: Implicit Trust |
| `app/workspaces/enrolled/page.tsx` | Page | Session Authentication | `can(user.id, "TASK_WORKFLOW", "VIEW")` | P2: Implicit Trust |
| `app/workspaces/page.tsx` | Page | Session Authentication | `can(user.id, "TASK_WORKFLOW", "VIEW")` | P2: Implicit Trust |
| `app/workspaces/reports/page.tsx` | Page | hasPermission (Legacy) | `can(user.id, "TASK_WORKFLOW", "VIEW")` | P1: Legacy Snapshot |
| `app/workspaces/tasks/page.tsx` | Page | Session Authentication | `can(user.id, "TASK_WORKFLOW", "VIEW")` | P2: Implicit Trust |
| `app/workspaces/transfer-tasks/page.tsx` | Page | Session Authentication | `can(user.id, "TASK_WORKFLOW", "VIEW")` | P2: Implicit Trust |

### 2. Server Actions & Mutations

| Action File | Exported Function | Current Guard | Target Enforcement Guard | Identified Risk |
| :--- | :--- | :--- | :--- | :--- |
| `tasks.ts` | `getDepartments` | isSuperAdmin check | `authorize("TASK_WORKFLOW", "GETDEPARTMENTS", scope)` | Global admin bypass |
| `tasks.ts` | `createTask` | isSuperAdmin check | `authorize("TASK_WORKFLOW", "CREATETASK", scope)` | Global admin bypass |
| `tasks.ts` | `changeTaskStatus` | isSuperAdmin check | `authorize("TASK_WORKFLOW", "CHANGETASKSTATUS", scope)` | Global admin bypass |
| `tasks.ts` | `transitionTaskStatus` | isSuperAdmin check | `authorize("TASK_WORKFLOW", "TRANSITIONTASKSTATUS", scope)` | Global admin bypass |
| `tasks.ts` | `updateNodeStatus` | isSuperAdmin check | `authorize("TASK_WORKFLOW", "UPDATENODESTATUS", scope)` | Global admin bypass |
| `tasks.ts` | `logActivityEvent` | isSuperAdmin check | `authorize("TASK_WORKFLOW", "LOGACTIVITYEVENT", scope)` | Global admin bypass |
| `tasks.ts` | `fetchCustomFields` | isSuperAdmin check | `authorize("TASK_WORKFLOW", "FETCHCUSTOMFIELDS", scope)` | Global admin bypass |
| `tasks.ts` | `createCustomField` | isSuperAdmin check | `authorize("TASK_WORKFLOW", "CREATECUSTOMFIELD", scope)` | Global admin bypass |
| `tasks.ts` | `fetchUsers` | isSuperAdmin check | `authorize("TASK_WORKFLOW", "FETCHUSERS", scope)` | Global admin bypass |
| `tasks.ts` | `getTaskDetails` | isSuperAdmin check | `authorize("TASK_WORKFLOW", "GETTASKDETAILS", scope)` | Global admin bypass |
| `tasks.ts` | `getTaskChecklists` | isSuperAdmin check | `authorize("TASK_WORKFLOW", "GETTASKCHECKLISTS", scope)` | Global admin bypass |
| `tasks.ts` | `getTaskAttachments` | isSuperAdmin check | `authorize("TASK_WORKFLOW", "GETTASKATTACHMENTS", scope)` | Global admin bypass |
| `tasks.ts` | `getWorkloadSnapshot` | isSuperAdmin check | `authorize("TASK_WORKFLOW", "GETWORKLOADSNAPSHOT", scope)` | Global admin bypass |
| `tasks.ts` | `updateTask` | isSuperAdmin check | `authorize("TASK_WORKFLOW", "UPDATETASK", scope)` | Global admin bypass |
| `tasks.ts` | `deleteTask` | isSuperAdmin check | `authorize("TASK_WORKFLOW", "DELETETASK", scope)` | Global admin bypass |
| `tasks.ts` | `resolveTask` | isSuperAdmin check | `authorize("TASK_WORKFLOW", "RESOLVETASK", scope)` | Global admin bypass |
| `tasks.ts` | `approveTask` | isSuperAdmin check | `authorize("TASK_WORKFLOW", "APPROVETASK", scope)` | Global admin bypass |
| `tasks.ts` | `reopenTask` | isSuperAdmin check | `authorize("TASK_WORKFLOW", "REOPENTASK", scope)` | Global admin bypass |
| `tasks.ts` | `createChecklistItem` | isSuperAdmin check | `authorize("TASK_WORKFLOW", "CREATECHECKLISTITEM", scope)` | Global admin bypass |
| `tasks.ts` | `createTaskAttachment` | isSuperAdmin check | `authorize("TASK_WORKFLOW", "CREATETASKATTACHMENT", scope)` | Global admin bypass |
| `tasks.ts` | `deleteTaskAttachment` | isSuperAdmin check | `authorize("TASK_WORKFLOW", "DELETETASKATTACHMENT", scope)` | Global admin bypass |
| `tasks.ts` | `fetchTeams` | isSuperAdmin check | `authorize("TASK_WORKFLOW", "FETCHTEAMS", scope)` | Global admin bypass |
| `tasks.ts` | `assignTeamToTask` | isSuperAdmin check | `authorize("TASK_WORKFLOW", "ASSIGNTEAMTOTASK", scope)` | Global admin bypass |
| `tasks.ts` | `getTaskComments` | isSuperAdmin check | `authorize("TASK_WORKFLOW", "GETTASKCOMMENTS", scope)` | Global admin bypass |
| `tasks.ts` | `addTaskRemark` | isSuperAdmin check | `authorize("TASK_WORKFLOW", "ADDTASKREMARK", scope)` | Global admin bypass |
| `tasks.ts` | `getTaskStatuses` | isSuperAdmin check | `authorize("TASK_WORKFLOW", "GETTASKSTATUSES", scope)` | Global admin bypass |
| `tasks.ts` | `updateTaskStatusInline` | isSuperAdmin check | `authorize("TASK_WORKFLOW", "UPDATETASKSTATUSINLINE", scope)` | Global admin bypass |
| `tasks.ts` | `logTaskTime` | isSuperAdmin check | `authorize("TASK_WORKFLOW", "LOGTASKTIME", scope)` | Global admin bypass |
| `tasks.ts` | `propagateTaskDependencies` | isSuperAdmin check | `authorize("TASK_WORKFLOW", "PROPAGATETASKDEPENDENCIES", scope)` | Global admin bypass |
| `tasks.ts` | `recalculateParentProgress` | isSuperAdmin check | `authorize("TASK_WORKFLOW", "RECALCULATEPARENTPROGRESS", scope)` | Global admin bypass |
| `tasks.ts` | `executeTaskBatchOperation` | isSuperAdmin check | `authorize("TASK_WORKFLOW", "EXECUTETASKBATCHOPERATION", scope)` | Global admin bypass |
| `tasks.ts` | `updateTaskAssignees` | isSuperAdmin check | `authorize("TASK_WORKFLOW", "UPDATETASKASSIGNEES", scope)` | Global admin bypass |
| `tasks.ts` | `updateTaskWatchers` | isSuperAdmin check | `authorize("TASK_WORKFLOW", "UPDATETASKWATCHERS", scope)` | Global admin bypass |
| `tasks.ts` | `moveTasksInBulk` | isSuperAdmin check | `authorize("TASK_WORKFLOW", "MOVETASKSINBULK", scope)` | Global admin bypass |
| `tasks.ts` | `transferTask` | isSuperAdmin check | `authorize("TASK_WORKFLOW", "TRANSFERTASK", scope)` | Global admin bypass |
| `tasks.ts` | `getTransferableWorkspaces` | isSuperAdmin check | `authorize("TASK_WORKFLOW", "GETTRANSFERABLEWORKSPACES", scope)` | Global admin bypass |
| `tasks.ts` | `acknowledgeTaskAmendment` | isSuperAdmin check | `authorize("TASK_WORKFLOW", "ACKNOWLEDGETASKAMENDMENT", scope)` | Global admin bypass |
| `tasks.ts` | `fetchWorkspaceTasksList` | isSuperAdmin check | `authorize("TASK_WORKFLOW", "FETCHWORKSPACETASKSLIST", scope)` | Global admin bypass |
| `tasks.ts` | `assignUserToTasksBatch` | isSuperAdmin check | `authorize("TASK_WORKFLOW", "ASSIGNUSERTOTASKSBATCH", scope)` | Global admin bypass |
| `workspaces.ts` | `fetchEnrolledWorkspaces` | hasPermission | `authorize("TASK_WORKFLOW", "FETCHENROLLEDWORKSPACES", scope)` | Legacy permissions snapshot |
| `workspaces.ts` | `fetchCompanies` | hasPermission | `authorize("TASK_WORKFLOW", "FETCHCOMPANIES", scope)` | Legacy permissions snapshot |
| `workspaces.ts` | `fetchPriorities` | hasPermission | `authorize("TASK_WORKFLOW", "FETCHPRIORITIES", scope)` | Legacy permissions snapshot |
| `workspaces.ts` | `fetchStatusesByScope` | hasPermission | `authorize("TASK_WORKFLOW", "FETCHSTATUSESBYSCOPE", scope)` | Legacy permissions snapshot |
| `workspaces.ts` | `createWorkspace` | hasPermission | `authorize("TASK_WORKFLOW", "CREATEWORKSPACE", scope)` | Legacy permissions snapshot |
| `workspaces.ts` | `fetchWorkspaces` | hasPermission | `authorize("TASK_WORKFLOW", "FETCHWORKSPACES", scope)` | Legacy permissions snapshot |
| `workspaces.ts` | `fetchWorkspacesInitialData` | hasPermission | `authorize("TASK_WORKFLOW", "FETCHWORKSPACESINITIALDATA", scope)` | Legacy permissions snapshot |
| `workspaces.ts` | `fetchWorkspaceDashboardData` | hasPermission | `authorize("TASK_WORKFLOW", "FETCHWORKSPACEDASHBOARDDATA", scope)` | Legacy permissions snapshot |
| `workspaces.ts` | `fetchHierarchyRoots` | hasPermission | `authorize("TASK_WORKFLOW", "FETCHHIERARCHYROOTS", scope)` | Legacy permissions snapshot |
| `workspaces.ts` | `getUserTaskEnrollmentContext` | hasPermission | `authorize("TASK_WORKFLOW", "GETUSERTASKENROLLMENTCONTEXT", scope)` | Legacy permissions snapshot |
| `workspaces.ts` | `fetchHierarchyChildren` | hasPermission | `authorize("TASK_WORKFLOW", "FETCHHIERARCHYCHILDREN", scope)` | Legacy permissions snapshot |
| `workspaces.ts` | `fetchTaskHierarchyAncestors` | hasPermission | `authorize("TASK_WORKFLOW", "FETCHTASKHIERARCHYANCESTORS", scope)` | Legacy permissions snapshot |
| `workspaces.ts` | `searchHierarchyDeep` | hasPermission | `authorize("TASK_WORKFLOW", "SEARCHHIERARCHYDEEP", scope)` | Legacy permissions snapshot |
| `workspaces.ts` | `fetchAllHierarchyBranches` | hasPermission | `authorize("TASK_WORKFLOW", "FETCHALLHIERARCHYBRANCHES", scope)` | Legacy permissions snapshot |
| `workspaces.ts` | `updateWorkspace` | hasPermission | `authorize("TASK_WORKFLOW", "UPDATEWORKSPACE", scope)` | Legacy permissions snapshot |
| `workspaces.ts` | `deleteWorkspace` | hasPermission | `authorize("TASK_WORKFLOW", "DELETEWORKSPACE", scope)` | Legacy permissions snapshot |
| `workspaces.ts` | `fetchWorkspaceStakeholders` | hasPermission | `authorize("TASK_WORKFLOW", "FETCHWORKSPACESTAKEHOLDERS", scope)` | Legacy permissions snapshot |
| `workspaces.ts` | `fetchTasksByWorkspace` | hasPermission | `authorize("TASK_WORKFLOW", "FETCHTASKSBYWORKSPACE", scope)` | Legacy permissions snapshot |
| `workspaces.ts` | `fetchAllTasks` | hasPermission | `authorize("TASK_WORKFLOW", "FETCHALLTASKS", scope)` | Legacy permissions snapshot |
| `workspaces.ts` | `toggleChecklistItem` | hasPermission | `authorize("TASK_WORKFLOW", "TOGGLECHECKLISTITEM", scope)` | Legacy permissions snapshot |
| `workspaces.ts` | `updateTaskProgress` | hasPermission | `authorize("TASK_WORKFLOW", "UPDATETASKPROGRESS", scope)` | Legacy permissions snapshot |
| `workspaces.ts` | `fetchSidebarCounts` | hasPermission | `authorize("TASK_WORKFLOW", "FETCHSIDEBARCOUNTS", scope)` | Legacy permissions snapshot |
| `workspaces.ts` | `fetchAssignableUsers` | hasPermission | `authorize("TASK_WORKFLOW", "FETCHASSIGNABLEUSERS", scope)` | Legacy permissions snapshot |
| `workspaces.ts` | `createSprint` | hasPermission | `authorize("TASK_WORKFLOW", "CREATESPRINT", scope)` | Legacy permissions snapshot |
| `workspaces.ts` | `fetchSprints` | hasPermission | `authorize("TASK_WORKFLOW", "FETCHSPRINTS", scope)` | Legacy permissions snapshot |
| `workspaces.ts` | `updateSprint` | hasPermission | `authorize("TASK_WORKFLOW", "UPDATESPRINT", scope)` | Legacy permissions snapshot |
| `workspaces.ts` | `createTaskTemplate` | hasPermission | `authorize("TASK_WORKFLOW", "CREATETASKTEMPLATE", scope)` | Legacy permissions snapshot |
| `workspaces.ts` | `fetchTaskTemplates` | hasPermission | `authorize("TASK_WORKFLOW", "FETCHTASKTEMPLATES", scope)` | Legacy permissions snapshot |
| `workspaces.ts` | `deleteTaskTemplate` | hasPermission | `authorize("TASK_WORKFLOW", "DELETETASKTEMPLATE", scope)` | Legacy permissions snapshot |

---

## Module: `TICKETS`

### 1. Routes & Pages

| Route Path | Type | Current Access Check | Target Module Check | Status / Defect |
| :--- | :---: | :--- | :--- | :---: |
| `app/tickets/[ticketId]/page.tsx` | Page | isSuperAdmin / Global Role | `can(user.id, "TICKETS", "VIEW")` | P1: Global Leak |
| `app/tickets/automations/page.tsx` | Page | Session Authentication | `can(user.id, "TICKETS", "VIEW")` | P2: Implicit Trust |
| `app/tickets/dashboard/page.tsx` | Page | hasPermission (Legacy) | `can(user.id, "TICKETS", "VIEW")` | P1: Legacy Snapshot |
| `app/tickets/page.tsx` | Page | hasPermission (Legacy) | `can(user.id, "TICKETS", "VIEW")` | P1: Legacy Snapshot |

### 2. Server Actions & Mutations

| Action File | Exported Function | Current Guard | Target Enforcement Guard | Identified Risk |
| :--- | :--- | :--- | :--- | :--- |
| `tickets.ts` | `fetchTicketComments` | isSuperAdmin check | `authorize("TICKETS", "FETCHTICKETCOMMENTS", scope)` | Global admin bypass |
| `tickets.ts` | `addTicketRemark` | isSuperAdmin check | `authorize("TICKETS", "ADDTICKETREMARK", scope)` | Global admin bypass |
| `tickets.ts` | `fetchTicketAuditLogs` | isSuperAdmin check | `authorize("TICKETS", "FETCHTICKETAUDITLOGS", scope)` | Global admin bypass |
| `tickets.ts` | `changeTicketStatus` | isSuperAdmin check | `authorize("TICKETS", "CHANGETICKETSTATUS", scope)` | Global admin bypass |
| `tickets.ts` | `updateTicketDetails` | isSuperAdmin check | `authorize("TICKETS", "UPDATETICKETDETAILS", scope)` | Global admin bypass |
| `tickets.ts` | `generateTeamsMeetingLink` | isSuperAdmin check | `authorize("TICKETS", "GENERATETEAMSMEETINGLINK", scope)` | Global admin bypass |
| `tickets.ts` | `fetchTicketDashboardData` | isSuperAdmin check | `authorize("TICKETS", "FETCHTICKETDASHBOARDDATA", scope)` | Global admin bypass |
| `tickets.ts` | `createEnterpriseTicket` | isSuperAdmin check | `authorize("TICKETS", "CREATEENTERPRISETICKET", scope)` | Global admin bypass |
| `tickets.ts` | `fetchTicketMetrics` | isSuperAdmin check | `authorize("TICKETS", "FETCHTICKETMETRICS", scope)` | Global admin bypass |
| `tickets.ts` | `linkTicket` | isSuperAdmin check | `authorize("TICKETS", "LINKTICKET", scope)` | Global admin bypass |
| `tickets.ts` | `searchTickets` | isSuperAdmin check | `authorize("TICKETS", "SEARCHTICKETS", scope)` | Global admin bypass |
| `tickets.ts` | `fetchTicketRelations` | isSuperAdmin check | `authorize("TICKETS", "FETCHTICKETRELATIONS", scope)` | Global admin bypass |
| `tickets.ts` | `fetchTicketMacros` | isSuperAdmin check | `authorize("TICKETS", "FETCHTICKETMACROS", scope)` | Global admin bypass |
| `tickets.ts` | `fetchSingleTicketDetails` | isSuperAdmin check | `authorize("TICKETS", "FETCHSINGLETICKETDETAILS", scope)` | Global admin bypass |
| `tickets.ts` | `deleteTicket` | isSuperAdmin check | `authorize("TICKETS", "DELETETICKET", scope)` | Global admin bypass |

---

## Module: `REQUIREMENTS`

### 1. Routes & Pages

| Route Path | Type | Current Access Check | Target Module Check | Status / Defect |
| :--- | :---: | :--- | :--- | :---: |
| `app/requirements/[id]/page.tsx` | Page | isSuperAdmin / Global Role | `can(user.id, "REQUIREMENTS", "VIEW")` | P1: Global Leak |
| `app/requirements/approvals/page.tsx` | Page | isSuperAdmin / Global Role | `can(user.id, "REQUIREMENTS", "VIEW")` | P1: Global Leak |
| `app/requirements/grooming/page.tsx` | Page | Session Authentication | `can(user.id, "REQUIREMENTS", "VIEW")` | P2: Implicit Trust |
| `app/requirements/page.tsx` | Page | isSuperAdmin / Global Role | `can(user.id, "REQUIREMENTS", "VIEW")` | P1: Global Leak |
| `app/requirements/reports/page.tsx` | Page | Session Authentication | `can(user.id, "REQUIREMENTS", "VIEW")` | P2: Implicit Trust |

### 2. Server Actions & Mutations

| Action File | Exported Function | Current Guard | Target Enforcement Guard | Identified Risk |
| :--- | :--- | :--- | :--- | :--- |
| `requirements.ts` | `changeRequirementStatus` | isSuperAdmin check | `authorize("REQUIREMENTS", "CHANGEREQUIREMENTSTATUS", scope)` | Global admin bypass |
| `requirements.ts` | `transitionRequirementStatus` | isSuperAdmin check | `authorize("REQUIREMENTS", "TRANSITIONREQUIREMENTSTATUS", scope)` | Global admin bypass |
| `requirements.ts` | `generateRequirementTask` | isSuperAdmin check | `authorize("REQUIREMENTS", "GENERATEREQUIREMENTTASK", scope)` | Global admin bypass |
| `requirements.ts` | `recalculateRequirementCompletion` | isSuperAdmin check | `authorize("REQUIREMENTS", "RECALCULATEREQUIREMENTCOMPLETION", scope)` | Global admin bypass |
| `requirements.ts` | `handleRequirementUAT` | isSuperAdmin check | `authorize("REQUIREMENTS", "HANDLEREQUIREMENTUAT", scope)` | Global admin bypass |
| `requirements.ts` | `fetchRequirements` | isSuperAdmin check | `authorize("REQUIREMENTS", "FETCHREQUIREMENTS", scope)` | Global admin bypass |
| `requirements.ts` | `createRequirement` | isSuperAdmin check | `authorize("REQUIREMENTS", "CREATEREQUIREMENT", scope)` | Global admin bypass |
| `requirements.ts` | `submitRequirementAnalysis` | isSuperAdmin check | `authorize("REQUIREMENTS", "SUBMITREQUIREMENTANALYSIS", scope)` | Global admin bypass |
| `requirements.ts` | `fetchRequirementStatuses` | isSuperAdmin check | `authorize("REQUIREMENTS", "FETCHREQUIREMENTSTATUSES", scope)` | Global admin bypass |
| `requirements.ts` | `generateApprovalFlow` | isSuperAdmin check | `authorize("REQUIREMENTS", "GENERATEAPPROVALFLOW", scope)` | Global admin bypass |
| `requirements.ts` | `deleteRequirement` | isSuperAdmin check | `authorize("REQUIREMENTS", "DELETEREQUIREMENT", scope)` | Global admin bypass |
| `requirements.ts` | `updateRequirementIntake` | isSuperAdmin check | `authorize("REQUIREMENTS", "UPDATEREQUIREMENTINTAKE", scope)` | Global admin bypass |
| `requirements.ts` | `fetchRequirementAuditLogs` | isSuperAdmin check | `authorize("REQUIREMENTS", "FETCHREQUIREMENTAUDITLOGS", scope)` | Global admin bypass |
| `requirements.ts` | `fetchRequirementAnalyticsData` | isSuperAdmin check | `authorize("REQUIREMENTS", "FETCHREQUIREMENTANALYTICSDATA", scope)` | Global admin bypass |
| `requirements.ts` | `fetchRequirement` | isSuperAdmin check | `authorize("REQUIREMENTS", "FETCHREQUIREMENT", scope)` | Global admin bypass |
| `requirements.ts` | `processApprovalAction` | isSuperAdmin check | `authorize("REQUIREMENTS", "PROCESSAPPROVALACTION", scope)` | Global admin bypass |
| `requirements.ts` | `fetchRequirementApprovalFlow` | isSuperAdmin check | `authorize("REQUIREMENTS", "FETCHREQUIREMENTAPPROVALFLOW", scope)` | Global admin bypass |
| `requirements.ts` | `createTaskFromRequirement` | isSuperAdmin check | `authorize("REQUIREMENTS", "CREATETASKFROMREQUIREMENT", scope)` | Global admin bypass |
| `requirements.ts` | `fetchLinkedTasks` | isSuperAdmin check | `authorize("REQUIREMENTS", "FETCHLINKEDTASKS", scope)` | Global admin bypass |
| `requirements.ts` | `markRequirementPutToUse` | isSuperAdmin check | `authorize("REQUIREMENTS", "MARKREQUIREMENTPUTTOUSE", scope)` | Global admin bypass |
| `requirements.ts` | `syncAmendmentToTasks` | isSuperAdmin check | `authorize("REQUIREMENTS", "SYNCAMENDMENTTOTASKS", scope)` | Global admin bypass |
| `requirements.ts` | `amendRequirement` | isSuperAdmin check | `authorize("REQUIREMENTS", "AMENDREQUIREMENT", scope)` | Global admin bypass |

---

## Module: `DESIGN_TRACKING`

### 1. Routes & Pages

| Route Path | Type | Current Access Check | Target Module Check | Status / Defect |
| :--- | :---: | :--- | :--- | :---: |
| `app/design/[[...slug]]/page.tsx` | Page | Session Authentication | `can(user.id, "DESIGN_TRACKING", "VIEW")` | P2: Implicit Trust |

### 2. Server Actions & Mutations

| Action File | Exported Function | Current Guard | Target Enforcement Guard | Identified Risk |
| :--- | :--- | :--- | :--- | :--- |
| `design.ts` | `fetchDrawingsListAction` | Auth session check | `authorize("DESIGN_TRACKING", "FETCHDRAWINGSLISTACTION", scope)` | None |
| `design.ts` | `createDrawingAction` | Auth session check | `authorize("DESIGN_TRACKING", "CREATEDRAWINGACTION", scope)` | None |
| `design.ts` | `updateDrawingStatusAction` | Auth session check | `authorize("DESIGN_TRACKING", "UPDATEDRAWINGSTATUSACTION", scope)` | None |
| `design.ts` | `fetchGfcReleasesAction` | Auth session check | `authorize("DESIGN_TRACKING", "FETCHGFCRELEASESACTION", scope)` | None |
| `design.ts` | `fetchConsultantsAction` | Auth session check | `authorize("DESIGN_TRACKING", "FETCHCONSULTANTSACTION", scope)` | None |
| `design.ts` | `uploadDesignDrawingFileAction` | Auth session check | `authorize("DESIGN_TRACKING", "UPLOADDESIGNDRAWINGFILEACTION", scope)` | None |
| `design.ts` | `fetchDesignDrawingSignedUrlAction` | Auth session check | `authorize("DESIGN_TRACKING", "FETCHDESIGNDRAWINGSIGNEDURLACTION", scope)` | None |

---

## Module: `DMS`

### 1. Routes & Pages

| Route Path | Type | Current Access Check | Target Module Check | Status / Defect |
| :--- | :---: | :--- | :--- | :---: |
| `app/share/[token]/page.tsx` | Page | Session Authentication | `can(user.id, "DMS", "VIEW")` | P2: Implicit Trust |

### 2. Server Actions & Mutations

| Action File | Exported Function | Current Guard | Target Enforcement Guard | Identified Risk |
| :--- | :--- | :--- | :--- | :--- |

---

## Module: `VEHICLE_DESK`

### 1. Routes & Pages

| Route Path | Type | Current Access Check | Target Module Check | Status / Defect |
| :--- | :---: | :--- | :--- | :---: |
| `app/api/vehicle/create/route.ts` | API | hasPermission (Legacy) | `can(user.id, "VEHICLE_DESK", "VIEW")` | P1: Legacy Snapshot |
| `app/api/vehicle/document-content/route.ts` | API | Session Authentication | `can(user.id, "VEHICLE_DESK", "VIEW")` | P2: Implicit Trust |
| `app/api/vehicle/documents/delete/route.ts` | API | Session Authentication | `can(user.id, "VEHICLE_DESK", "VIEW")` | P2: Implicit Trust |
| `app/api/vehicle/documents/route.ts` | API | Session Authentication | `can(user.id, "VEHICLE_DESK", "VIEW")` | P2: Implicit Trust |
| `app/api/vehicle/documents/update/route.ts` | API | Session Authentication | `can(user.id, "VEHICLE_DESK", "VIEW")` | P2: Implicit Trust |
| `app/api/vehicle/documents/upload/route.ts` | API | Session Authentication | `can(user.id, "VEHICLE_DESK", "VIEW")` | P2: Implicit Trust |
| `app/api/vehicle/image/cutout/route.ts` | API | Session Authentication | `can(user.id, "VEHICLE_DESK", "VIEW")` | P2: Implicit Trust |
| `app/api/vehicle/image/route.ts` | API | Session Authentication | `can(user.id, "VEHICLE_DESK", "VIEW")` | P2: Implicit Trust |
| `app/api/vehicle/lookup/route.ts` | API | Session Authentication | `can(user.id, "VEHICLE_DESK", "VIEW")` | P2: Implicit Trust |
| `app/api/vehicle/model-image/auto/route.ts` | API | Session Authentication | `can(user.id, "VEHICLE_DESK", "VIEW")` | P2: Implicit Trust |
| `app/api/vehicle/model-image/candidates/route.ts` | API | Session Authentication | `can(user.id, "VEHICLE_DESK", "VIEW")` | P2: Implicit Trust |
| `app/api/vehicle/model-image/file/route.ts` | API | Session Authentication | `can(user.id, "VEHICLE_DESK", "VIEW")` | P2: Implicit Trust |
| `app/api/vehicle/model-image/preview/route.ts` | API | Session Authentication | `can(user.id, "VEHICLE_DESK", "VIEW")` | P2: Implicit Trust |
| `app/api/vehicle/model-image/route.ts` | API | Session Authentication | `can(user.id, "VEHICLE_DESK", "VIEW")` | P2: Implicit Trust |
| `app/api/vehicle/model-image/runtime/[file]/route.ts` | API | Session Authentication | `can(user.id, "VEHICLE_DESK", "VIEW")` | P2: Implicit Trust |
| `app/api/vehicle/model-image/segmenter/route.ts` | API | Session Authentication | `can(user.id, "VEHICLE_DESK", "VIEW")` | P2: Implicit Trust |
| `app/api/vehicle/model-image/source/route.ts` | API | Session Authentication | `can(user.id, "VEHICLE_DESK", "VIEW")` | P2: Implicit Trust |
| `app/api/vehicle/model-images/route.ts` | API | Session Authentication | `can(user.id, "VEHICLE_DESK", "VIEW")` | P2: Implicit Trust |
| `app/vehicle/[[...slug]]/page.tsx` | Page | Session Authentication | `can(user.id, "VEHICLE_DESK", "VIEW")` | P2: Implicit Trust |

### 2. Server Actions & Mutations

| Action File | Exported Function | Current Guard | Target Enforcement Guard | Identified Risk |
| :--- | :--- | :--- | :--- | :--- |
| `vehicle.ts` | `getAuthenticatedUser` | isSuperAdmin check | `authorize("VEHICLE_DESK", "GETAUTHENTICATEDUSER", scope)` | Global admin bypass |
| `vehicle.ts` | `canUserManageVehicles` | isSuperAdmin check | `authorize("VEHICLE_DESK", "CANUSERMANAGEVEHICLES", scope)` | Global admin bypass |
| `vehicle.ts` | `fetchVehicleDashboardStats` | isSuperAdmin check | `authorize("VEHICLE_DESK", "FETCHVEHICLEDASHBOARDSTATS", scope)` | Global admin bypass |
| `vehicle.ts` | `fetchVehiclesList` | isSuperAdmin check | `authorize("VEHICLE_DESK", "FETCHVEHICLESLIST", scope)` | Global admin bypass |
| `vehicle.ts` | `fetchVehiclePortalDetailsAction` | isSuperAdmin check | `authorize("VEHICLE_DESK", "FETCHVEHICLEPORTALDETAILSACTION", scope)` | Global admin bypass |
| `vehicle.ts` | `createVehicleAction` | isSuperAdmin check | `authorize("VEHICLE_DESK", "CREATEVEHICLEACTION", scope)` | Global admin bypass |
| `vehicle.ts` | `updateVehicleAction` | isSuperAdmin check | `authorize("VEHICLE_DESK", "UPDATEVEHICLEACTION", scope)` | Global admin bypass |
| `vehicle.ts` | `fetchVehicleDocumentsAction` | isSuperAdmin check | `authorize("VEHICLE_DESK", "FETCHVEHICLEDOCUMENTSACTION", scope)` | Global admin bypass |
| `vehicle.ts` | `fetchVehicleDocumentContentAction` | isSuperAdmin check | `authorize("VEHICLE_DESK", "FETCHVEHICLEDOCUMENTCONTENTACTION", scope)` | Global admin bypass |
| `vehicle.ts` | `deleteVehicleDocumentAction` | isSuperAdmin check | `authorize("VEHICLE_DESK", "DELETEVEHICLEDOCUMENTACTION", scope)` | Global admin bypass |
| `vehicle.ts` | `createVehicleDocumentAction` | isSuperAdmin check | `authorize("VEHICLE_DESK", "CREATEVEHICLEDOCUMENTACTION", scope)` | Global admin bypass |
| `vehicle.ts` | `updateVehicleDocumentAction` | isSuperAdmin check | `authorize("VEHICLE_DESK", "UPDATEVEHICLEDOCUMENTACTION", scope)` | Global admin bypass |
| `vehicle.ts` | `deleteVehicleAction` | isSuperAdmin check | `authorize("VEHICLE_DESK", "DELETEVEHICLEACTION", scope)` | Global admin bypass |
| `vehicle.ts` | `fetchDriversList` | isSuperAdmin check | `authorize("VEHICLE_DESK", "FETCHDRIVERSLIST", scope)` | Global admin bypass |
| `vehicle.ts` | `fetchTripsList` | isSuperAdmin check | `authorize("VEHICLE_DESK", "FETCHTRIPSLIST", scope)` | Global admin bypass |
| `vehicle.ts` | `createTripPlanAction` | isSuperAdmin check | `authorize("VEHICLE_DESK", "CREATETRIPPLANACTION", scope)` | Global admin bypass |
| `vehicle.ts` | `fetchMaintenanceList` | isSuperAdmin check | `authorize("VEHICLE_DESK", "FETCHMAINTENANCELIST", scope)` | Global admin bypass |
| `vehicle.ts` | `fetchServiceAttachmentContentAction` | isSuperAdmin check | `authorize("VEHICLE_DESK", "FETCHSERVICEATTACHMENTCONTENTACTION", scope)` | Global admin bypass |
| `vehicle.ts` | `createServiceRecordAction` | isSuperAdmin check | `authorize("VEHICLE_DESK", "CREATESERVICERECORDACTION", scope)` | Global admin bypass |
| `vehicle.ts` | `updateServiceRecordAction` | isSuperAdmin check | `authorize("VEHICLE_DESK", "UPDATESERVICERECORDACTION", scope)` | Global admin bypass |
| `vehicle.ts` | `createDriverAction` | isSuperAdmin check | `authorize("VEHICLE_DESK", "CREATEDRIVERACTION", scope)` | Global admin bypass |
| `vehicle.ts` | `updateDriverAction` | isSuperAdmin check | `authorize("VEHICLE_DESK", "UPDATEDRIVERACTION", scope)` | Global admin bypass |
| `vehicle.ts` | `deleteDriverAction` | isSuperAdmin check | `authorize("VEHICLE_DESK", "DELETEDRIVERACTION", scope)` | Global admin bypass |
| `vehicle.ts` | `updateTripStatusAction` | isSuperAdmin check | `authorize("VEHICLE_DESK", "UPDATETRIPSTATUSACTION", scope)` | Global admin bypass |
| `vehicle.ts` | `deleteTripAction` | isSuperAdmin check | `authorize("VEHICLE_DESK", "DELETETRIPACTION", scope)` | Global admin bypass |
| `vehicle.ts` | `deleteServiceRecordAction` | isSuperAdmin check | `authorize("VEHICLE_DESK", "DELETESERVICERECORDACTION", scope)` | Global admin bypass |
| `vehicle.ts` | `fetchInsuranceVendorsListAction` | isSuperAdmin check | `authorize("VEHICLE_DESK", "FETCHINSURANCEVENDORSLISTACTION", scope)` | Global admin bypass |
| `vehicle.ts` | `createInsuranceVendorAction` | isSuperAdmin check | `authorize("VEHICLE_DESK", "CREATEINSURANCEVENDORACTION", scope)` | Global admin bypass |
| `vehicle.ts` | `updateInsuranceVendorAction` | isSuperAdmin check | `authorize("VEHICLE_DESK", "UPDATEINSURANCEVENDORACTION", scope)` | Global admin bypass |
| `vehicle.ts` | `deleteInsuranceVendorAction` | isSuperAdmin check | `authorize("VEHICLE_DESK", "DELETEINSURANCEVENDORACTION", scope)` | Global admin bypass |
| `vehicle.ts` | `fetchPurchaseVendorsListAction` | isSuperAdmin check | `authorize("VEHICLE_DESK", "FETCHPURCHASEVENDORSLISTACTION", scope)` | Global admin bypass |
| `vehicle.ts` | `fetchVehiclePartsList` | isSuperAdmin check | `authorize("VEHICLE_DESK", "FETCHVEHICLEPARTSLIST", scope)` | Global admin bypass |
| `vehicle.ts` | `createVehiclePartAction` | isSuperAdmin check | `authorize("VEHICLE_DESK", "CREATEVEHICLEPARTACTION", scope)` | Global admin bypass |
| `vehicle.ts` | `createVehiclePartsBatchAction` | isSuperAdmin check | `authorize("VEHICLE_DESK", "CREATEVEHICLEPARTSBATCHACTION", scope)` | Global admin bypass |
| `vehicle.ts` | `updateVehiclePartAction` | isSuperAdmin check | `authorize("VEHICLE_DESK", "UPDATEVEHICLEPARTACTION", scope)` | Global admin bypass |
| `vehicle.ts` | `deleteVehiclePartAction` | isSuperAdmin check | `authorize("VEHICLE_DESK", "DELETEVEHICLEPARTACTION", scope)` | Global admin bypass |
| `vehicle.ts` | `renewPartPolicyAction` | isSuperAdmin check | `authorize("VEHICLE_DESK", "RENEWPARTPOLICYACTION", scope)` | Global admin bypass |
| `vehicle.ts` | `fetchVehicleInsurancePoliciesAction` | isSuperAdmin check | `authorize("VEHICLE_DESK", "FETCHVEHICLEINSURANCEPOLICIESACTION", scope)` | Global admin bypass |
| `vehicle.ts` | `renewVehicleInsurancePolicyAction` | isSuperAdmin check | `authorize("VEHICLE_DESK", "RENEWVEHICLEINSURANCEPOLICYACTION", scope)` | Global admin bypass |
| `vehicle.ts` | `deleteVehicleInsurancePolicyAction` | isSuperAdmin check | `authorize("VEHICLE_DESK", "DELETEVEHICLEINSURANCEPOLICYACTION", scope)` | Global admin bypass |
| `vehicle.ts` | `fetchVehiclePucCertificatesAction` | isSuperAdmin check | `authorize("VEHICLE_DESK", "FETCHVEHICLEPUCCERTIFICATESACTION", scope)` | Global admin bypass |
| `vehicle.ts` | `renewVehiclePucCertificateAction` | isSuperAdmin check | `authorize("VEHICLE_DESK", "RENEWVEHICLEPUCCERTIFICATEACTION", scope)` | Global admin bypass |
| `vehicle.ts` | `deleteVehiclePucCertificateAction` | isSuperAdmin check | `authorize("VEHICLE_DESK", "DELETEVEHICLEPUCCERTIFICATEACTION", scope)` | Global admin bypass |
| `vehicle.ts` | `fetchVehicleSpecificationHistoryAction` | isSuperAdmin check | `authorize("VEHICLE_DESK", "FETCHVEHICLESPECIFICATIONHISTORYACTION", scope)` | Global admin bypass |
| `vehicle.ts` | `deleteVehicleSpecificationHistoryRecordAction` | isSuperAdmin check | `authorize("VEHICLE_DESK", "DELETEVEHICLESPECIFICATIONHISTORYRECORDACTION", scope)` | Global admin bypass |
| `vehicle.ts` | `fetchVehicleServiceEntitlementsAction` | isSuperAdmin check | `authorize("VEHICLE_DESK", "FETCHVEHICLESERVICEENTITLEMENTSACTION", scope)` | Global admin bypass |
| `vehicle.ts` | `createVehicleServiceEntitlementAction` | isSuperAdmin check | `authorize("VEHICLE_DESK", "CREATEVEHICLESERVICEENTITLEMENTACTION", scope)` | Global admin bypass |
| `vehicle.ts` | `redeemVehicleServiceEntitlementAction` | isSuperAdmin check | `authorize("VEHICLE_DESK", "REDEEMVEHICLESERVICEENTITLEMENTACTION", scope)` | Global admin bypass |
| `vehicle.ts` | `deleteVehicleServiceEntitlementAction` | isSuperAdmin check | `authorize("VEHICLE_DESK", "DELETEVEHICLESERVICEENTITLEMENTACTION", scope)` | Global admin bypass |
| `vehicle.ts` | `fetchVehicleUnifiedRenewalsTimelineAction` | isSuperAdmin check | `authorize("VEHICLE_DESK", "FETCHVEHICLEUNIFIEDRENEWALSTIMELINEACTION", scope)` | Global admin bypass |
| `vehicle.ts` | `sendVehicleComplianceExpiryReminderAction` | isSuperAdmin check | `authorize("VEHICLE_DESK", "SENDVEHICLECOMPLIANCEEXPIRYREMINDERACTION", scope)` | Global admin bypass |
| `vehicle.ts` | `runFleetComplianceExpiryAuditAction` | isSuperAdmin check | `authorize("VEHICLE_DESK", "RUNFLEETCOMPLIANCEEXPIRYAUDITACTION", scope)` | Global admin bypass |
| `vehicle.ts` | `fetchVehicleSalesListAction` | isSuperAdmin check | `authorize("VEHICLE_DESK", "FETCHVEHICLESALESLISTACTION", scope)` | Global admin bypass |
| `vehicle.ts` | `recordVehicleSaleAction` | isSuperAdmin check | `authorize("VEHICLE_DESK", "RECORDVEHICLESALEACTION", scope)` | Global admin bypass |
| `vehicle.ts` | `updateVehicleSaleAction` | isSuperAdmin check | `authorize("VEHICLE_DESK", "UPDATEVEHICLESALEACTION", scope)` | Global admin bypass |
| `vehicle.ts` | `deleteVehicleSaleAction` | isSuperAdmin check | `authorize("VEHICLE_DESK", "DELETEVEHICLESALEACTION", scope)` | Global admin bypass |

---

## Module: `CHANDAK_MEET`

### 1. Routes & Pages

| Route Path | Type | Current Access Check | Target Module Check | Status / Defect |
| :--- | :---: | :--- | :--- | :---: |
| `app/meet/admin/page.tsx` | Page | Session Authentication | `can(user.id, "CHANDAK_MEET", "VIEW")` | P2: Implicit Trust |
| `app/meet/calendar/page.tsx` | Page | Session Authentication | `can(user.id, "CHANDAK_MEET", "VIEW")` | P2: Implicit Trust |
| `app/meet/decisions/page.tsx` | Page | Session Authentication | `can(user.id, "CHANDAK_MEET", "VIEW")` | P2: Implicit Trust |
| `app/meet/live/[sessionId]/page.tsx` | Page | Session Authentication | `can(user.id, "CHANDAK_MEET", "VIEW")` | P2: Implicit Trust |
| `app/meet/live/page.tsx` | Page | Session Authentication | `can(user.id, "CHANDAK_MEET", "VIEW")` | P2: Implicit Trust |
| `app/meet/meetings/[id]/page.tsx` | Page | Session Authentication | `can(user.id, "CHANDAK_MEET", "VIEW")` | P2: Implicit Trust |
| `app/meet/meetings/new/page.tsx` | Page | Session Authentication | `can(user.id, "CHANDAK_MEET", "VIEW")` | P2: Implicit Trust |
| `app/meet/meetings/page.tsx` | Page | Session Authentication | `can(user.id, "CHANDAK_MEET", "VIEW")` | P2: Implicit Trust |
| `app/meet/my-work/page.tsx` | Page | Session Authentication | `can(user.id, "CHANDAK_MEET", "VIEW")` | P2: Implicit Trust |
| `app/meet/notes/page.tsx` | Page | Session Authentication | `can(user.id, "CHANDAK_MEET", "VIEW")` | P2: Implicit Trust |
| `app/meet/page.tsx` | Page | Session Authentication | `can(user.id, "CHANDAK_MEET", "VIEW")` | P2: Implicit Trust |
| `app/meet/reports/page.tsx` | Page | Session Authentication | `can(user.id, "CHANDAK_MEET", "VIEW")` | P2: Implicit Trust |
| `app/meet/sessions/[sessionId]/page.tsx` | Page | Session Authentication | `can(user.id, "CHANDAK_MEET", "VIEW")` | P2: Implicit Trust |

### 2. Server Actions & Mutations

| Action File | Exported Function | Current Guard | Target Enforcement Guard | Identified Risk |
| :--- | :--- | :--- | :--- | :--- |

---

## Module: `ORG_BUDGET`

### 1. Routes & Pages

| Route Path | Type | Current Access Check | Target Module Check | Status / Defect |
| :--- | :---: | :--- | :--- | :---: |
| `app/budget/[projectId]/[tab]/page.tsx` | Page | Module RBAC | `can(user.id, "ORG_BUDGET", "VIEW")` | OK (Target) |
| `app/budget/[projectId]/export/[kind]/route.ts` | API | Module RBAC | `can(user.id, "ORG_BUDGET", "VIEW")` | OK (Target) |
| `app/budget/[projectId]/page.tsx` | Page | Session Authentication | `can(user.id, "ORG_BUDGET", "VIEW")` | P2: Implicit Trust |
| `app/budget/admin/[section]/page.tsx` | Page | isSuperAdmin / Global Role | `can(user.id, "ORG_BUDGET", "VIEW")` | P1: Global Leak |
| `app/budget/admin/page.tsx` | Page | Session Authentication | `can(user.id, "ORG_BUDGET", "VIEW")` | P2: Implicit Trust |
| `app/budget/create/page.tsx` | Page | Module RBAC | `can(user.id, "ORG_BUDGET", "VIEW")` | OK (Target) |
| `app/budget/guide/page.tsx` | Page | Session Authentication | `can(user.id, "ORG_BUDGET", "VIEW")` | P2: Implicit Trust |
| `app/budget/import/page.tsx` | Page | Session Authentication | `can(user.id, "ORG_BUDGET", "VIEW")` | P2: Implicit Trust |
| `app/budget/page.tsx` | Page | Module RBAC | `can(user.id, "ORG_BUDGET", "VIEW")` | OK (Target) |

### 2. Server Actions & Mutations

| Action File | Exported Function | Current Guard | Target Enforcement Guard | Identified Risk |
| :--- | :--- | :--- | :--- | :--- |

---

## Module: `AMC`

### 1. Routes & Pages

| Route Path | Type | Current Access Check | Target Module Check | Status / Defect |
| :--- | :---: | :--- | :--- | :---: |
| `app/amc/analytics/page.tsx` | Page | isSuperAdmin / Global Role | `can(user.id, "AMC", "VIEW")` | P1: Global Leak |
| `app/amc/page.tsx` | Page | isSuperAdmin / Global Role | `can(user.id, "AMC", "VIEW")` | P1: Global Leak |
| `app/amc/reports/page.tsx` | Page | isSuperAdmin / Global Role | `can(user.id, "AMC", "VIEW")` | P1: Global Leak |

### 2. Server Actions & Mutations

| Action File | Exported Function | Current Guard | Target Enforcement Guard | Identified Risk |
| :--- | :--- | :--- | :--- | :--- |
| `amc.ts` | `saveAMCEntity` | isSuperAdmin check | `authorize("AMC", "SAVEAMCENTITY", scope)` | Global admin bypass |
| `amc.ts` | `deleteAMCEntity` | isSuperAdmin check | `authorize("AMC", "DELETEAMCENTITY", scope)` | Global admin bypass |

---

## Module: `DASHBOARDS`

### 1. Routes & Pages

| Route Path | Type | Current Access Check | Target Module Check | Status / Defect |
| :--- | :---: | :--- | :--- | :---: |
| `app/dashboards/[key]/[[...path]]/route.ts` | API | Session Authentication | `can(user.id, "DASHBOARDS", "VIEW")` | P2: Implicit Trust |
| `app/dashboards/page.tsx` | Page | Session Authentication | `can(user.id, "DASHBOARDS", "VIEW")` | P2: Implicit Trust |

### 2. Server Actions & Mutations

| Action File | Exported Function | Current Guard | Target Enforcement Guard | Identified Risk |
| :--- | :--- | :--- | :--- | :--- |

---

## Module: `USERS_IAM`

### 1. Routes & Pages

| Route Path | Type | Current Access Check | Target Module Check | Status / Defect |
| :--- | :---: | :--- | :--- | :---: |
| `app/admin/page.tsx` | Page | Session Authentication | `can(user.id, "USERS_IAM", "VIEW")` | P2: Implicit Trust |
| `app/admin/performance/page.tsx` | Page | hasPermission (Legacy) | `can(user.id, "USERS_IAM", "VIEW")` | P1: Legacy Snapshot |
| `app/admin/settings/page.tsx` | Page | Session Authentication | `can(user.id, "USERS_IAM", "VIEW")` | P2: Implicit Trust |
| `app/iam/cockpit/page.tsx` | Page | Session Authentication | `can(user.id, "USERS_IAM", "VIEW")` | P2: Implicit Trust |
| `app/iam/page.tsx` | Page | Session Authentication | `can(user.id, "USERS_IAM", "VIEW")` | P2: Implicit Trust |
| `app/iam/roles/page.tsx` | Page | Session Authentication | `can(user.id, "USERS_IAM", "VIEW")` | P2: Implicit Trust |
| `app/iam/sessions/page.tsx` | Page | Session Authentication | `can(user.id, "USERS_IAM", "VIEW")` | P2: Implicit Trust |
| `app/settings/communication/logs/page.tsx` | Page | Session Authentication | `can(user.id, "USERS_IAM", "VIEW")` | P2: Implicit Trust |
| `app/settings/communication/page.tsx` | Page | hasPermission (Legacy) | `can(user.id, "USERS_IAM", "VIEW")` | P1: Legacy Snapshot |
| `app/settings/communication/providers/page.tsx` | Page | Session Authentication | `can(user.id, "USERS_IAM", "VIEW")` | P2: Implicit Trust |
| `app/settings/communication/rules/page.tsx` | Page | Session Authentication | `can(user.id, "USERS_IAM", "VIEW")` | P2: Implicit Trust |
| `app/settings/communication/templates/page.tsx` | Page | Session Authentication | `can(user.id, "USERS_IAM", "VIEW")` | P2: Implicit Trust |
| `app/settings/email/page.tsx` | Page | Session Authentication | `can(user.id, "USERS_IAM", "VIEW")` | P2: Implicit Trust |
| `app/settings/identity/page.tsx` | Page | Session Authentication | `can(user.id, "USERS_IAM", "VIEW")` | P2: Implicit Trust |
| `app/settings/notifications/page.tsx` | Page | Session Authentication | `can(user.id, "USERS_IAM", "VIEW")` | P2: Implicit Trust |
| `app/settings/page.tsx` | Page | Session Authentication | `can(user.id, "USERS_IAM", "VIEW")` | P2: Implicit Trust |

### 2. Server Actions & Mutations

| Action File | Exported Function | Current Guard | Target Enforcement Guard | Identified Risk |
| :--- | :--- | :--- | :--- | :--- |
| `users.ts` | `saveUserAction` | isSuperAdmin check | `authorize("USERS_IAM", "SAVEUSERACTION", scope)` | Global admin bypass |
| `users.ts` | `fetchAssignees` | isSuperAdmin check | `authorize("USERS_IAM", "FETCHASSIGNEES", scope)` | Global admin bypass |
| `users.ts` | `fetchUsersDashboardData` | isSuperAdmin check | `authorize("USERS_IAM", "FETCHUSERSDASHBOARDDATA", scope)` | Global admin bypass |
| `users.ts` | `fetchUserModulesAction` | isSuperAdmin check | `authorize("USERS_IAM", "FETCHUSERMODULESACTION", scope)` | Global admin bypass |
| `users.ts` | `deleteUserAction` | isSuperAdmin check | `authorize("USERS_IAM", "DELETEUSERACTION", scope)` | Global admin bypass |
| `users.ts` | `inviteUserAction` | isSuperAdmin check | `authorize("USERS_IAM", "INVITEUSERACTION", scope)` | Global admin bypass |
| `users.ts` | `fetchUserDashboardsAction` | isSuperAdmin check | `authorize("USERS_IAM", "FETCHUSERDASHBOARDSACTION", scope)` | Global admin bypass |
| `users.ts` | `fetchUserModuleAccessAction` | isSuperAdmin check | `authorize("USERS_IAM", "FETCHUSERMODULEACCESSACTION", scope)` | Global admin bypass |
| `users.ts` | `saveUserModuleAccessAction` | isSuperAdmin check | `authorize("USERS_IAM", "SAVEUSERMODULEACCESSACTION", scope)` | Global admin bypass |
| `iam.ts` | `fetchRoles` | hasPermission | `authorize("USERS_IAM", "FETCHROLES", scope)` | Legacy permissions snapshot |
| `iam.ts` | `fetchPermissions` | hasPermission | `authorize("USERS_IAM", "FETCHPERMISSIONS", scope)` | Legacy permissions snapshot |
| `iam.ts` | `fetchRolePermissions` | hasPermission | `authorize("USERS_IAM", "FETCHROLEPERMISSIONS", scope)` | Legacy permissions snapshot |
| `iam.ts` | `createRole` | hasPermission | `authorize("USERS_IAM", "CREATEROLE", scope)` | Legacy permissions snapshot |
| `iam.ts` | `updateRole` | hasPermission | `authorize("USERS_IAM", "UPDATEROLE", scope)` | Legacy permissions snapshot |
| `iam.ts` | `syncRolePermissions` | hasPermission | `authorize("USERS_IAM", "SYNCROLEPERMISSIONS", scope)` | Legacy permissions snapshot |
| `iam.ts` | `toggleRolePermission` | hasPermission | `authorize("USERS_IAM", "TOGGLEROLEPERMISSION", scope)` | Legacy permissions snapshot |
| `iam.ts` | `cloneRole` | hasPermission | `authorize("USERS_IAM", "CLONEROLE", scope)` | Legacy permissions snapshot |
| `iam.ts` | `deleteRole` | hasPermission | `authorize("USERS_IAM", "DELETEROLE", scope)` | Legacy permissions snapshot |
| `iam.ts` | `fetchDepartments` | hasPermission | `authorize("USERS_IAM", "FETCHDEPARTMENTS", scope)` | Legacy permissions snapshot |
| `iam.ts` | `registerUserSession` | hasPermission | `authorize("USERS_IAM", "REGISTERUSERSESSION", scope)` | Legacy permissions snapshot |
| `iam.ts` | `checkActiveSessionConflict` | hasPermission | `authorize("USERS_IAM", "CHECKACTIVESESSIONCONFLICT", scope)` | Legacy permissions snapshot |
| `iam.ts` | `fetchActiveSessions` | hasPermission | `authorize("USERS_IAM", "FETCHACTIVESESSIONS", scope)` | Legacy permissions snapshot |
| `iam.ts` | `killSession` | hasPermission | `authorize("USERS_IAM", "KILLSESSION", scope)` | Legacy permissions snapshot |

---


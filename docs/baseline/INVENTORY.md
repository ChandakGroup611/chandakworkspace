# Chandak Workspace — Complete Route & Action Inventory

Generated as part of PHASE 0 baseline inventory.

## Summary Table

| Module | Page Routes | API Routes | Server Action Files | Server Actions Total |
| :--- | :---: | :---: | :---: | :---: |
| **Workspaces/Tasks** | 7 | 0 | 4 | 71 |
| **Tickets** | 4 | 0 | 1 | 13 |
| **Requirements** | 5 | 0 | 1 | 21 |
| **SLA** | 3 | 1 | 1 | 3 |
| **AMC** | 3 | 1 | 1 | 2 |
| **Vehicle** | 1 | 18 | 2 | 62 |
| **Design + DMS** | 3 | 0 | 5 | 64 |
| **Meet** | 14 | 0 | 14 | 92 |
| **Budget** | 7 | 1 | 5 | 67 |
| **Dashboards** | 1 | 1 | 2 | 2 |
| **Messenger** | 0 | 2 | 1 | 18 |
| **Users/IAM** | 7 | 1 | 4 | 27 |
| **Masters** | 4 | 0 | 1 | 10 |
| **Settings** | 12 | 1 | 4 | 28 |
| **Auth** | 2 | 4 | 1 | 2 |
| **Core/Shared** | 12 | 15 | 8 | 27 |
| **TOTAL** | **85** | **45** | **55** | **509** |

---

## Workspaces/Tasks

### 1. Page Routes (7)
- `/tasks` — [`app/tasks/page.tsx`](app/tasks/page.tsx)
- `/tasks/[taskId]` — [`app/tasks/[taskId]/page.tsx`](app/tasks/[taskId]/page.tsx)
- `/workspaces/enrolled` — [`app/workspaces/enrolled/page.tsx`](app/workspaces/enrolled/page.tsx)
- `/workspaces` — [`app/workspaces/page.tsx`](app/workspaces/page.tsx)
- `/workspaces/reports` — [`app/workspaces/reports/page.tsx`](app/workspaces/reports/page.tsx)
- `/workspaces/tasks` — [`app/workspaces/tasks/page.tsx`](app/workspaces/tasks/page.tsx)
- `/workspaces/transfer-tasks` — [`app/workspaces/transfer-tasks/page.tsx`](app/workspaces/transfer-tasks/page.tsx)

### 2. API Routes (0)
_None_

### 3. Server Actions (71 across 4 files)
#### [`lib/actions/dependencies.ts`](lib/actions/dependencies.ts) (3 actions)
- `checkWorkspaceUserDependencies()`
- `reassignAndRemoveWorkspaceUser()`
- `checkTaskUserDependencies()`

#### [`lib/actions/tasks.ts`](lib/actions/tasks.ts) (38 actions)
- `getDepartments()`
- `createTask()`
- `transitionTaskStatus()`
- `updateNodeStatus()`
- `logActivityEvent()`
- `fetchCustomFields()`
- `createCustomField()`
- `fetchUsers()`
- `getTaskDetails()`
- `getTaskChecklists()`
- `getTaskAttachments()`
- `getWorkloadSnapshot()`
- `updateTask()`
- `deleteTask()`
- `resolveTask()`
- `approveTask()`
- `reopenTask()`
- `createChecklistItem()`
- `createTaskAttachment()`
- `deleteTaskAttachment()`
- `fetchTeams()`
- `assignTeamToTask()`
- `getTaskComments()`
- `addTaskRemark()`
- `getTaskStatuses()`
- `updateTaskStatusInline()`
- `logTaskTime()`
- `propagateTaskDependencies()`
- `recalculateParentProgress()`
- `executeTaskBatchOperation()`
- `updateTaskAssignees()`
- `updateTaskWatchers()`
- `moveTasksInBulk()`
- `transferTask()`
- `getTransferableWorkspaces()`
- `acknowledgeTaskAmendment()`
- `fetchWorkspaceTasksList()`
- `assignUserToTasksBatch()`

#### [`lib/actions/workspaces.ts`](lib/actions/workspaces.ts) (28 actions)
- `fetchEnrolledWorkspaces()`
- `fetchCompanies()`
- `fetchPriorities()`
- `fetchStatusesByScope()`
- `createWorkspace()`
- `fetchWorkspaces()`
- `fetchWorkspacesInitialData()`
- `fetchWorkspaceDashboardData()`
- `fetchHierarchyRoots()`
- `getUserTaskEnrollmentContext()`
- `fetchHierarchyChildren()`
- `searchHierarchyDeep()`
- `fetchAllHierarchyBranches()`
- `updateWorkspace()`
- `deleteWorkspace()`
- `fetchWorkspaceStakeholders()`
- `fetchTasksByWorkspace()`
- `fetchAllTasks()`
- `toggleChecklistItem()`
- `updateTaskProgress()`
- `fetchSidebarCounts()`
- `fetchAssignableUsers()`
- `createSprint()`
- `fetchSprints()`
- `updateSprint()`
- `createTaskTemplate()`
- `fetchTaskTemplates()`
- `deleteTaskTemplate()`

#### [`lib/actions/workspace_reports.ts`](lib/actions/workspace_reports.ts) (2 actions)
- `generateWorkspaceReportData()`
- `getAllReportCustomFields()`

---

## Tickets

### 1. Page Routes (4)
- `/tickets/automations` — [`app/tickets/automations/page.tsx`](app/tickets/automations/page.tsx)
- `/tickets/dashboard` — [`app/tickets/dashboard/page.tsx`](app/tickets/dashboard/page.tsx)
- `/tickets` — [`app/tickets/page.tsx`](app/tickets/page.tsx)
- `/tickets/[ticketId]` — [`app/tickets/[ticketId]/page.tsx`](app/tickets/[ticketId]/page.tsx)

### 2. API Routes (0)
_None_

### 3. Server Actions (13 across 1 files)
#### [`lib/actions/tickets.ts`](lib/actions/tickets.ts) (13 actions)
- `fetchTicketComments()`
- `addTicketRemark()`
- `fetchTicketAuditLogs()`
- `updateTicketDetails()`
- `generateTeamsMeetingLink()`
- `fetchTicketDashboardData()`
- `createEnterpriseTicket()`
- `fetchTicketMetrics()`
- `linkTicket()`
- `searchTickets()`
- `fetchTicketRelations()`
- `fetchTicketMacros()`
- `fetchSingleTicketDetails()`

---

## Requirements

### 1. Page Routes (5)
- `/requirements/approvals` — [`app/requirements/approvals/page.tsx`](app/requirements/approvals/page.tsx)
- `/requirements/grooming` — [`app/requirements/grooming/page.tsx`](app/requirements/grooming/page.tsx)
- `/requirements` — [`app/requirements/page.tsx`](app/requirements/page.tsx)
- `/requirements/reports` — [`app/requirements/reports/page.tsx`](app/requirements/reports/page.tsx)
- `/requirements/[id]` — [`app/requirements/[id]/page.tsx`](app/requirements/[id]/page.tsx)

### 2. API Routes (0)
_None_

### 3. Server Actions (21 across 1 files)
#### [`lib/actions/requirements.ts`](lib/actions/requirements.ts) (21 actions)
- `transitionRequirementStatus()`
- `generateRequirementTask()`
- `recalculateRequirementCompletion()`
- `handleRequirementUAT()`
- `fetchRequirements()`
- `createRequirement()`
- `submitRequirementAnalysis()`
- `fetchRequirementStatuses()`
- `generateApprovalFlow()`
- `deleteRequirement()`
- `updateRequirementIntake()`
- `fetchRequirementAuditLogs()`
- `fetchRequirementAnalyticsData()`
- `fetchRequirement()`
- `processApprovalAction()`
- `fetchRequirementApprovalFlow()`
- `createTaskFromRequirement()`
- `fetchLinkedTasks()`
- `markRequirementPutToUse()`
- `syncAmendmentToTasks()`
- `amendRequirement()`

---

## SLA

### 1. Page Routes (3)
- `/sla/holidays` — [`app/sla/holidays/page.tsx`](app/sla/holidays/page.tsx)
- `/sla` — [`app/sla/page.tsx`](app/sla/page.tsx)
- `/sla/rules` — [`app/sla/rules/page.tsx`](app/sla/rules/page.tsx)

### 2. API Routes (1)
- `/api/sla` — [`app/api/sla/route.ts`](app/api/sla/route.ts)

### 3. Server Actions (3 across 1 files)
#### [`lib/actions/sla.ts`](lib/actions/sla.ts) (3 actions)
- `fetchSLARules()`
- `saveSLARule()`
- `deleteSLARule()`

---

## AMC

### 1. Page Routes (3)
- `/amc/analytics` — [`app/amc/analytics/page.tsx`](app/amc/analytics/page.tsx)
- `/amc` — [`app/amc/page.tsx`](app/amc/page.tsx)
- `/amc/reports` — [`app/amc/reports/page.tsx`](app/amc/reports/page.tsx)

### 2. API Routes (1)
- `/api/amc` — [`app/api/amc/route.ts`](app/api/amc/route.ts)

### 3. Server Actions (2 across 1 files)
#### [`lib/actions/amc.ts`](lib/actions/amc.ts) (2 actions)
- `saveAMCEntity()`
- `deleteAMCEntity()`

---

## Vehicle

### 1. Page Routes (1)
- `/vehicle/[[...slug]]` — [`app/vehicle/[[...slug]]/page.tsx`](app/vehicle/[[...slug]]/page.tsx)

### 2. API Routes (18)
- `/api/vehicle/create` — [`app/api/vehicle/create/route.ts`](app/api/vehicle/create/route.ts)
- `/api/vehicle/document-content` — [`app/api/vehicle/document-content/route.ts`](app/api/vehicle/document-content/route.ts)
- `/api/vehicle/documents/delete` — [`app/api/vehicle/documents/delete/route.ts`](app/api/vehicle/documents/delete/route.ts)
- `/api/vehicle/documents` — [`app/api/vehicle/documents/route.ts`](app/api/vehicle/documents/route.ts)
- `/api/vehicle/documents/update` — [`app/api/vehicle/documents/update/route.ts`](app/api/vehicle/documents/update/route.ts)
- `/api/vehicle/documents/upload` — [`app/api/vehicle/documents/upload/route.ts`](app/api/vehicle/documents/upload/route.ts)
- `/api/vehicle/image/cutout` — [`app/api/vehicle/image/cutout/route.ts`](app/api/vehicle/image/cutout/route.ts)
- `/api/vehicle/image` — [`app/api/vehicle/image/route.ts`](app/api/vehicle/image/route.ts)
- `/api/vehicle/lookup` — [`app/api/vehicle/lookup/route.ts`](app/api/vehicle/lookup/route.ts)
- `/api/vehicle/model-image/auto` — [`app/api/vehicle/model-image/auto/route.ts`](app/api/vehicle/model-image/auto/route.ts)
- `/api/vehicle/model-image/candidates` — [`app/api/vehicle/model-image/candidates/route.ts`](app/api/vehicle/model-image/candidates/route.ts)
- `/api/vehicle/model-image/file` — [`app/api/vehicle/model-image/file/route.ts`](app/api/vehicle/model-image/file/route.ts)
- `/api/vehicle/model-image/preview` — [`app/api/vehicle/model-image/preview/route.ts`](app/api/vehicle/model-image/preview/route.ts)
- `/api/vehicle/model-image` — [`app/api/vehicle/model-image/route.ts`](app/api/vehicle/model-image/route.ts)
- `/api/vehicle/model-image/runtime/[file]` — [`app/api/vehicle/model-image/runtime/[file]/route.ts`](app/api/vehicle/model-image/runtime/[file]/route.ts)
- `/api/vehicle/model-image/segmenter` — [`app/api/vehicle/model-image/segmenter/route.ts`](app/api/vehicle/model-image/segmenter/route.ts)
- `/api/vehicle/model-image/source` — [`app/api/vehicle/model-image/source/route.ts`](app/api/vehicle/model-image/source/route.ts)
- `/api/vehicle/model-images` — [`app/api/vehicle/model-images/route.ts`](app/api/vehicle/model-images/route.ts)

### 3. Server Actions (62 across 2 files)
#### [`lib/actions/vehicle.ts`](lib/actions/vehicle.ts) (54 actions)
- `fetchVehicleDashboardStats()`
- `fetchVehiclesList()`
- `fetchVehiclePortalDetailsAction()`
- `createVehicleAction()`
- `updateVehicleAction()`
- `fetchVehicleDocumentsAction()`
- `fetchVehicleDocumentContentAction()`
- `deleteVehicleDocumentAction()`
- `createVehicleDocumentAction()`
- `updateVehicleDocumentAction()`
- `deleteVehicleAction()`
- `fetchDriversList()`
- `fetchTripsList()`
- `createTripPlanAction()`
- `fetchMaintenanceList()`
- `fetchServiceAttachmentContentAction()`
- `createServiceRecordAction()`
- `updateServiceRecordAction()`
- `createDriverAction()`
- `updateDriverAction()`
- `deleteDriverAction()`
- `updateTripStatusAction()`
- `deleteTripAction()`
- `deleteServiceRecordAction()`
- `fetchInsuranceVendorsListAction()`
- `createInsuranceVendorAction()`
- `updateInsuranceVendorAction()`
- `deleteInsuranceVendorAction()`
- `fetchPurchaseVendorsListAction()`
- `fetchVehiclePartsList()`
- `createVehiclePartAction()`
- `createVehiclePartsBatchAction()`
- `updateVehiclePartAction()`
- `deleteVehiclePartAction()`
- `renewPartPolicyAction()`
- `fetchVehicleInsurancePoliciesAction()`
- `renewVehicleInsurancePolicyAction()`
- `deleteVehicleInsurancePolicyAction()`
- `fetchVehiclePucCertificatesAction()`
- `renewVehiclePucCertificateAction()`
- `deleteVehiclePucCertificateAction()`
- `fetchVehicleSpecificationHistoryAction()`
- `deleteVehicleSpecificationHistoryRecordAction()`
- `fetchVehicleServiceEntitlementsAction()`
- `createVehicleServiceEntitlementAction()`
- `redeemVehicleServiceEntitlementAction()`
- `deleteVehicleServiceEntitlementAction()`
- `fetchVehicleUnifiedRenewalsTimelineAction()`
- `sendVehicleComplianceExpiryReminderAction()`
- `runFleetComplianceExpiryAuditAction()`
- `fetchVehicleSalesListAction()`
- `recordVehicleSaleAction()`
- `updateVehicleSaleAction()`
- `deleteVehicleSaleAction()`

#### [`lib/actions/vehicleRbac.ts`](lib/actions/vehicleRbac.ts) (8 actions)
- `fetchFleetWorkspaceUsersAction()`
- `saveFleetUserAccessAction()`
- `deleteFleetUserAccessAction()`
- `toggleUserFleetModuleAccessAction()`
- `fetchMyFleetAccessAction()`
- `fetchFleetRbacPoliciesAction()`
- `saveSingleFleetRbacPolicyAction()`
- `saveFleetRbacPoliciesAction()`

---

## Design + DMS

### 1. Page Routes (3)
- `/design/[[...slug]]` — [`app/design/[[...slug]]/page.tsx`](app/design/[[...slug]]/page.tsx)
- `/masters/designations` — [`app/masters/designations/page.tsx`](app/masters/designations/page.tsx)
- `/verify-drawing/[token]` — [`app/verify-drawing/[token]/page.tsx`](app/verify-drawing/[token]/page.tsx)

### 2. API Routes (0)
_None_

### 3. Server Actions (64 across 5 files)
#### [`lib/actions/design.ts`](lib/actions/design.ts) (7 actions)
- `fetchDrawingsListAction()`
- `createDrawingAction()`
- `updateDrawingStatusAction()`
- `fetchGfcReleasesAction()`
- `fetchConsultantsAction()`
- `uploadDesignDrawingFileAction()`
- `fetchDesignDrawingSignedUrlAction()`

#### [`lib/actions/designTracking.ts`](lib/actions/designTracking.ts) (34 actions)
- `fetchFullDesignTrackingState()`
- `saveProjectAction()`
- `deleteProjectAction()`
- `saveTowerAction()`
- `deleteTowerAction()`
- `savePackageAction()`
- `deletePackageAction()`
- `saveSubPackageAction()`
- `deleteSubPackageAction()`
- `saveConsultantAction()`
- `deleteConsultantAction()`
- `saveStatutoryAuthorityAction()`
- `deleteStatutoryAuthorityAction()`
- `saveStatutoryClearanceAction()`
- `saveMatrixEntryAction()`
- `saveBatchMatrixEntriesAction()`
- `saveLookAheadAction()`
- `deleteLookAheadAction()`
- `saveDrawingAction()`
- `deleteDrawingAction()`
- `saveDrawingRevisionAction()`
- `saveTransmittalAction()`
- `deleteTransmittalAction()`
- `saveRfiAction()`
- `deleteRfiAction()`
- `recordMatrixAuditAction()`
- `fetchRbacPoliciesAction()`
- `saveSingleDesignRbacPolicyAction()`
- `saveRbacPoliciesAction()`
- `fetchDesignWorkspaceUsersAction()`
- `saveDesignUserAccessAction()`
- `deleteDesignUserAccessAction()`
- `toggleUserDesignModuleAccessAction()`
- `syncDesignTrackingBundle()`

#### [`lib/actions/dmac-drawings.ts`](lib/actions/dmac-drawings.ts) (9 actions)
- `fetchBuildingSectionMatrixAction()`
- `fetchDrawingDetailAction()`
- `submitDrawingRevisionAction()`
- `reviewDrawingRevisionAction()`
- `fetchWaitingLongestQueueAction()`
- `createMarkupCommentAction()`
- `updateMarkupCommentAction()`
- `deleteMarkupCommentAction()`
- `addCommentThreadReplyAction()`

#### [`lib/actions/dms-core.ts`](lib/actions/dms-core.ts) (11 actions)
- `fetchFolderTreeAction()`
- `createFolderAction()`
- `fetchFolderDocumentsAction()`
- `fetchDocTypesAndFieldsAction()`
- `createDocTypeAction()`
- `uploadDmsDocumentFileAction()`
- `saveDocumentWithIndexingAction()`
- `lockUnlockDocumentAction()`
- `submitQcDecisionAction()`
- `fetchFolderPermissionsAction()`
- `saveFolderPermissionsAction()`

#### [`lib/actions/dms-share-portal.ts`](lib/actions/dms-share-portal.ts) (3 actions)
- `fetchSharePublicMetadataAction()`
- `requestShareOtpAction()`
- `verifyShareAccessAction()`

---

## Meet

### 1. Page Routes (14)
- `/meet/admin` — [`app/meet/admin/page.tsx`](app/meet/admin/page.tsx)
- `/meet/calendar` — [`app/meet/calendar/page.tsx`](app/meet/calendar/page.tsx)
- `/meet/decisions` — [`app/meet/decisions/page.tsx`](app/meet/decisions/page.tsx)
- `/meet/live` — [`app/meet/live/page.tsx`](app/meet/live/page.tsx)
- `/meet/live/[sessionId]` — [`app/meet/live/[sessionId]/page.tsx`](app/meet/live/[sessionId]/page.tsx)
- `/meet/meetings/new` — [`app/meet/meetings/new/page.tsx`](app/meet/meetings/new/page.tsx)
- `/meet/meetings` — [`app/meet/meetings/page.tsx`](app/meet/meetings/page.tsx)
- `/meet/meetings/[id]` — [`app/meet/meetings/[id]/page.tsx`](app/meet/meetings/[id]/page.tsx)
- `/meet/my-work` — [`app/meet/my-work/page.tsx`](app/meet/my-work/page.tsx)
- `/meet/notes` — [`app/meet/notes/page.tsx`](app/meet/notes/page.tsx)
- `/meet` — [`app/meet/page.tsx`](app/meet/page.tsx)
- `/meet/reports` — [`app/meet/reports/page.tsx`](app/meet/reports/page.tsx)
- `/meet/sessions/[sessionId]` — [`app/meet/sessions/[sessionId]/page.tsx`](app/meet/sessions/[sessionId]/page.tsx)
- `/rooms/[roomId]/display` — [`app/rooms/[roomId]/display/page.tsx`](app/rooms/[roomId]/display/page.tsx)

### 2. API Routes (0)
_None_

### 3. Server Actions (92 across 14 files)
#### [`lib/actions/meet/ai-minutes.ts`](lib/actions/meet/ai-minutes.ts) (4 actions)
- `getAIMinutes()`
- `generateAIMinutes()`
- `updateAIMinutes()`
- `approveAndSendMoM()`

#### [`lib/actions/meet/analytics.ts`](lib/actions/meet/analytics.ts) (2 actions)
- `getMeetDashboardKPIs()`
- `getMeetReports()`

#### [`lib/actions/meet/attendance.ts`](lib/actions/meet/attendance.ts) (3 actions)
- `markAttendance()`
- `generateSessionCheckInQR()`
- `checkInWithQR()`

#### [`lib/actions/meet/decisions.ts`](lib/actions/meet/decisions.ts) (5 actions)
- `getDecisions()`
- `recordDecision()`
- `supersedeDecision()`
- `updateDecisionStatus()`
- `getDecisionEligibleSessions()`

#### [`lib/actions/meet/invitations.ts`](lib/actions/meet/invitations.ts) (4 actions)
- `getSessionInvitations()`
- `respondToInvitation()`
- `moveMeetingToProposedTime()`
- `sendRSVPReminders()`

#### [`lib/actions/meet/masters.ts`](lib/actions/meet/masters.ts) (9 actions)
- `getMeetingMasters()`
- `getMeetSettings()`
- `saveMeetingType()`
- `savePointCategory()`
- `saveMeetingRoom()`
- `saveMeetingTemplate()`
- `saveMeetSettings()`
- `getMeetRoleMatrix()`
- `saveMeetRoleMatrix()`

#### [`lib/actions/meet/meetings.ts`](lib/actions/meet/meetings.ts) (8 actions)
- `getMeetings()`
- `getMeetingById()`
- `createMeeting()`
- `archiveMeeting()`
- `updateMeeting()`
- `addMeetingMember()`
- `removeMeetingMember()`
- `getMeetingAllPoints()`

#### [`lib/actions/meet/mom.ts`](lib/actions/meet/mom.ts) (4 actions)
- `generateMoMSnapshot()`
- `publishMoM()`
- `acknowledgeMoM()`
- `getMoMVersions()`

#### [`lib/actions/meet/notes.ts`](lib/actions/meet/notes.ts) (9 actions)
- `getNotes()`
- `getOrCreateSessionNotes()`
- `createPersonalNote()`
- `addNoteBlock()`
- `updateNoteBlock()`
- `deleteNoteBlock()`
- `convertBlockToItem()`
- `generateSessionSummary()`
- `useSummaryInMoM()`

#### [`lib/actions/meet/points.ts`](lib/actions/meet/points.ts) (6 actions)
- `createPoint()`
- `updatePointStatus()`
- `updateSessionPointNotes()`
- `updatePoint()`
- `reassignPointOwner()`
- `deletePoint()`

#### [`lib/actions/meet/rooms.ts`](lib/actions/meet/rooms.ts) (10 actions)
- `checkRoomAvailability()`
- `getRoomsWithLiveAvailability()`
- `bookRoomForSession()`
- `checkInRoomBooking()`
- `releaseNoShowBookings()`
- `releaseRoomBooking()`
- `getRoomDisplayData()`
- `bookNowFromDisplay()`
- `endEarlyFromDisplay()`
- `extendFromDisplay()`

#### [`lib/actions/meet/sessions.ts`](lib/actions/meet/sessions.ts) (12 actions)
- `getSessionsForMeeting()`
- `getSessionById()`
- `startSession()`
- `endSessionAndCarryForward()`
- `updateSessionAttendance()`
- `submitPreMeetingUpdate()`
- `createSessionForMeeting()`
- `rescheduleSession()`
- `cancelSession()`
- `addAgendaItem()`
- `deleteAgendaItem()`
- `updateSessionVideoLink()`

#### [`lib/actions/meet/sla.ts`](lib/actions/meet/sla.ts) (9 actions)
- `getSLAPolicies()`
- `getSLAInstances()`
- `acknowledgeEscalation()`
- `reassignEscalation()`
- `extendEscalation()`
- `getAlertRules()`
- `saveAlertRule()`
- `getNotificationTemplates()`
- `saveNotificationTemplate()`

#### [`lib/actions/meet/tasks.ts`](lib/actions/meet/tasks.ts) (7 actions)
- `getTasks()`
- `createTask()`
- `updateTaskStatus()`
- `toggleTaskChecklist()`
- `requestTaskExtension()`
- `decideTaskExtension()`
- `deleteTask()`

---

## Budget

### 1. Page Routes (7)
- `/budget/admin` — [`app/budget/admin/page.tsx`](app/budget/admin/page.tsx)
- `/budget/admin/[section]` — [`app/budget/admin/[section]/page.tsx`](app/budget/admin/[section]/page.tsx)
- `/budget/guide` — [`app/budget/guide/page.tsx`](app/budget/guide/page.tsx)
- `/budget/import` — [`app/budget/import/page.tsx`](app/budget/import/page.tsx)
- `/budget` — [`app/budget/page.tsx`](app/budget/page.tsx)
- `/budget/[projectId]` — [`app/budget/[projectId]/page.tsx`](app/budget/[projectId]/page.tsx)
- `/budget/[projectId]/[tab]` — [`app/budget/[projectId]/[tab]/page.tsx`](app/budget/[projectId]/[tab]/page.tsx)

### 2. API Routes (1)
- `/budget/[projectId]/export/[kind]` — [`app/budget/[projectId]/export/[kind]/route.ts`](app/budget/[projectId]/export/[kind]/route.ts)

### 3. Server Actions (67 across 5 files)
#### [`lib/budget/actions.ts`](lib/budget/actions.ts) (54 actions)
- `updateLine()`
- `setLineRule()`
- `setDepartmentRemark()`
- `setTowerNote()`
- `setCertified()`
- `setTowerAreas()`
- `addSchedule()`
- `updateSchedule()`
- `deleteSchedule()`
- `saveScheduleRow()`
- `deleteScheduleRow()`
- `addTowerLine()`
- `removeLine()`
- `openVersion()`
- `approveVersion()`
- `submitVersion()`
- `signVersion()`
- `recallVersion()`
- `saveSignoffLevel()`
- `deleteSignoffLevel()`
- `deleteDraft()`
- `updateVersion()`
- `previewImport()`
- `importWorkbook()`
- `checkCostRows()`
- `importCostRows()`
- `addEntry()`
- `addBill()`
- `updateBill()`
- `updateEntry()`
- `deleteBill()`
- `deleteEntry()`
- `createProject()`
- `deleteTower()`
- `deleteHead()`
- `renameHead()`
- `updateProject()`
- `deleteProject()`
- `addComment()`
- `deleteComment()`
- `addTower()`
- `updateTower()`
- `addHead()`
- `updateHead()`
- `setCustomValues()`
- `saveField()`
- `setFieldActive()`
- `deleteField()`
- `saveRole()`
- `deleteRole()`
- `setRolePermission()`
- `batchSetRolePermissions()`
- `saveMember()`
- `removeMember()`

#### [`lib/budget/insights-actions.ts`](lib/budget/insights-actions.ts) (1 actions)
- `writeBudgetSummary()`

#### [`lib/budget/manual-actions.ts`](lib/budget/manual-actions.ts) (4 actions)
- `addTowerFull()`
- `createProjectGuided()`
- `addLinesBulk()`
- `saveLineFigures()`

#### [`lib/budget/masters-actions.ts`](lib/budget/masters-actions.ts) (7 actions)
- `saveDepartment()`
- `deleteDepartment()`
- `saveSummaryRow()`
- `renameSummaryCategory()`
- `deleteSummaryRow()`
- `saveGstRule()`
- `deleteGstRule()`

#### [`lib/budget/wizard-actions.ts`](lib/budget/wizard-actions.ts) (1 actions)
- `saveBudgetWizard()`

---

## Dashboards

### 1. Page Routes (1)
- `/dashboards` — [`app/dashboards/page.tsx`](app/dashboards/page.tsx)

### 2. API Routes (1)
- `/dashboards/[key]/[[...path]]` — [`app/dashboards/[key]/[[...path]]/route.ts`](app/dashboards/[key]/[[...path]]/route.ts)

### 3. Server Actions (2 across 2 files)
#### [`lib/actions/dashboardMetrics.ts`](lib/actions/dashboardMetrics.ts) (1 actions)
- `fetchLiveDashboardMetrics()`

#### [`lib/actions/portfolioMetrics.ts`](lib/actions/portfolioMetrics.ts) (1 actions)
- `fetchLivePortfolioData()`

---

## Messenger

### 1. Page Routes (0)
_None_

### 2. API Routes (2)
- `/api/copilot/chat` — [`app/api/copilot/chat/route.ts`](app/api/copilot/chat/route.ts)
- `/api/mentions` — [`app/api/mentions/route.ts`](app/api/mentions/route.ts)

### 3. Server Actions (18 across 1 files)
#### [`lib/actions/messenger.ts`](lib/actions/messenger.ts) (18 actions)
- `fetchWorkspaceUsersForMessenger()`
- `fetchMessengerConversations()`
- `getOrCreateDirectConversation()`
- `createGroupConversation()`
- `fetchMessengerMessages()`
- `sendMessengerMessage()`
- `markConversationAsRead()`
- `togglePinConversation()`
- `toggleMessageReaction()`
- `deleteMessengerMessage()`
- `editMessengerMessage()`
- `getMessengerTotalUnreadCount()`
- `fetchSenderInfoForNotification()`
- `addGroupMembers()`
- `leaveGroupConversation()`
- `fetchTaskOptionsForMessenger()`
- `createTaskFromChatMessage()`
- `startInstantCallFromChat()`

---

## Users/IAM

### 1. Page Routes (7)
- `/iam/cockpit` — [`app/iam/cockpit/page.tsx`](app/iam/cockpit/page.tsx)
- `/iam` — [`app/iam/page.tsx`](app/iam/page.tsx)
- `/iam/roles` — [`app/iam/roles/page.tsx`](app/iam/roles/page.tsx)
- `/iam/sessions` — [`app/iam/sessions/page.tsx`](app/iam/sessions/page.tsx)
- `/rbac` — [`app/rbac/page.tsx`](app/rbac/page.tsx)
- `/users` — [`app/users/page.tsx`](app/users/page.tsx)
- `/users/[id]` — [`app/users/[id]/page.tsx`](app/users/[id]/page.tsx)

### 2. API Routes (1)
- `/api/users` — [`app/api/users/route.ts`](app/api/users/route.ts)

### 3. Server Actions (27 across 4 files)
#### [`lib/actions/iam.ts`](lib/actions/iam.ts) (14 actions)
- `fetchRoles()`
- `fetchPermissions()`
- `fetchRolePermissions()`
- `createRole()`
- `updateRole()`
- `syncRolePermissions()`
- `toggleRolePermission()`
- `cloneRole()`
- `deleteRole()`
- `fetchDepartments()`
- `registerUserSession()`
- `checkActiveSessionConflict()`
- `fetchActiveSessions()`
- `killSession()`

#### [`lib/actions/userPerformance.ts`](lib/actions/userPerformance.ts) (1 actions)
- `fetchUserPerformanceWorkingSheet()`

#### [`lib/actions/users.ts`](lib/actions/users.ts) (9 actions)
- `saveUserAction()`
- `fetchAssignees()`
- `fetchUsersDashboardData()`
- `fetchUserModulesAction()`
- `deleteUserAction()`
- `inviteUserAction()`
- `fetchUserDashboardsAction()`
- `fetchUserModuleAccessAction()`
- `saveUserModuleAccessAction()`

#### [`lib/actions/user_report_layout.ts`](lib/actions/user_report_layout.ts) (3 actions)
- `getUserReportLayout()`
- `saveUserReportLayout()`
- `resetUserReportLayout()`

---

## Masters

### 1. Page Routes (4)
- `/masters/companies` — [`app/masters/companies/page.tsx`](app/masters/companies/page.tsx)
- `/masters/departments` — [`app/masters/departments/page.tsx`](app/masters/departments/page.tsx)
- `/masters` — [`app/masters/page.tsx`](app/masters/page.tsx)
- `/masters/vendors` — [`app/masters/vendors/page.tsx`](app/masters/vendors/page.tsx)

### 2. API Routes (0)
_None_

### 3. Server Actions (10 across 1 files)
#### [`lib/actions/masters.ts`](lib/actions/masters.ts) (10 actions)
- `fetchScopes()`
- `fetchMastersByScope()`
- `fetchDependentMasters()`
- `saveMasterEntity()`
- `deleteMasterEntity()`
- `executeMasterMutation()`
- `fetchBusinessValues()`
- `createBusinessValue()`
- `createIssueType()`
- `bulkImportMasterRecords()`

---

## Settings

### 1. Page Routes (12)
- `/admin/settings` — [`app/admin/settings/page.tsx`](app/admin/settings/page.tsx)
- `/compliance` — [`app/compliance/page.tsx`](app/compliance/page.tsx)
- `/settings/communication/logs` — [`app/settings/communication/logs/page.tsx`](app/settings/communication/logs/page.tsx)
- `/settings/communication` — [`app/settings/communication/page.tsx`](app/settings/communication/page.tsx)
- `/settings/communication/providers` — [`app/settings/communication/providers/page.tsx`](app/settings/communication/providers/page.tsx)
- `/settings/communication/rules` — [`app/settings/communication/rules/page.tsx`](app/settings/communication/rules/page.tsx)
- `/settings/communication/templates` — [`app/settings/communication/templates/page.tsx`](app/settings/communication/templates/page.tsx)
- `/settings/email` — [`app/settings/email/page.tsx`](app/settings/email/page.tsx)
- `/settings/identity` — [`app/settings/identity/page.tsx`](app/settings/identity/page.tsx)
- `/settings/notifications` — [`app/settings/notifications/page.tsx`](app/settings/notifications/page.tsx)
- `/settings` — [`app/settings/page.tsx`](app/settings/page.tsx)
- `/subscription` — [`app/subscription/page.tsx`](app/subscription/page.tsx)

### 2. API Routes (1)
- `/api/cron/fleet-compliance-audit` — [`app/api/cron/fleet-compliance-audit/route.ts`](app/api/cron/fleet-compliance-audit/route.ts)

### 3. Server Actions (28 across 4 files)
#### [`lib/actions/compliance.ts`](lib/actions/compliance.ts) (9 actions)
- `fetchComplianceWorkspaces()`
- `fetchComplianceTasks()`
- `fetchComplianceRequirements()`
- `fetchComplianceMaster()`
- `hardDeleteEntity()`
- `restoreEntity()`
- `fetchWorkspaceStakeholders()`
- `fetchTaskParticipants()`
- `moveTasksBatchOperation()`

#### [`lib/actions/email-config.ts`](lib/actions/email-config.ts) (12 actions)
- `fetchSystemEmailConfig()`
- `saveSystemEmailConfig()`
- `testEmailConnection()`
- `fetchEventTriggerConfig()`
- `updateEventTriggerConfig()`
- `fetchSpecificEventConfig()`
- `deleteEmailProvider()`
- `previewEmailTemplate()`
- `fetchEmailProviders()`
- `saveEmailProvider()`
- `updateEmailProvider()`
- `testProviderConnection()`

#### [`lib/actions/preferences.ts`](lib/actions/preferences.ts) (2 actions)
- `saveDesignPreferences()`
- `fetchDesignPreferences()`

#### [`lib/actions/settings.ts`](lib/actions/settings.ts) (5 actions)
- `saveSettingsEntity()`
- `getTemplates()`
- `saveTemplateAndRules()`
- `deleteSettingsEntity()`
- `updateMyProfile()`

---

## Auth

### 1. Page Routes (2)
- `/auth/accept` — [`app/auth/accept/page.tsx`](app/auth/accept/page.tsx)
- `/login` — [`app/login/page.tsx`](app/login/page.tsx)

### 2. API Routes (4)
- `/api/auth/permissions` — [`app/api/auth/permissions/route.ts`](app/api/auth/permissions/route.ts)
- `/auth/callback` — [`app/auth/callback/route.ts`](app/auth/callback/route.ts)
- `/auth/direct` — [`app/auth/direct/route.ts`](app/auth/direct/route.ts)
- `/auth/[...rest]` — [`app/auth/[...rest]/route.ts`](app/auth/[...rest]/route.ts)

### 3. Server Actions (2 across 1 files)
#### [`lib/actions/auth-permissions.ts`](lib/actions/auth-permissions.ts) (2 actions)
- `fetchServerPermissions()`
- `fetchOnboardingMasters()`

---

## Core/Shared

### 1. Page Routes (12)
- `/admin` — [`app/admin/page.tsx`](app/admin/page.tsx)
- `/admin/performance` — [`app/admin/performance/page.tsx`](app/admin/performance/page.tsx)
- `/knowledge/articles` — [`app/knowledge/articles/page.tsx`](app/knowledge/articles/page.tsx)
- `/knowledge` — [`app/knowledge/page.tsx`](app/knowledge/page.tsx)
- `/learning/courses` — [`app/learning/courses/page.tsx`](app/learning/courses/page.tsx)
- `/learning` — [`app/learning/page.tsx`](app/learning/page.tsx)
- `/migration` — [`app/migration/page.tsx`](app/migration/page.tsx)
- `/` — [`app/page.tsx`](app/page.tsx)
- `/profile` — [`app/profile/page.tsx`](app/profile/page.tsx)
- `/select-module` — [`app/select-module/page.tsx`](app/select-module/page.tsx)
- `/share/[token]` — [`app/share/[token]/page.tsx`](app/share/[token]/page.tsx)
- `/support` — [`app/support/page.tsx`](app/support/page.tsx)

### 2. API Routes (15)
- `/api/build-info` — [`app/api/build-info/route.ts`](app/api/build-info/route.ts)
- `/api/copilot/action/execute` — [`app/api/copilot/action/execute/route.ts`](app/api/copilot/action/execute/route.ts)
- `/api/copilot/poc-stream` — [`app/api/copilot/poc-stream/route.ts`](app/api/copilot/poc-stream/route.ts)
- `/api/cron/process-email-queue` — [`app/api/cron/process-email-queue/route.ts`](app/api/cron/process-email-queue/route.ts)
- `/api/cron/tat-escalation` — [`app/api/cron/tat-escalation/route.ts`](app/api/cron/tat-escalation/route.ts)
- `/api/heartbeat` — [`app/api/heartbeat/route.ts`](app/api/heartbeat/route.ts)
- `/api/migration/upload` — [`app/api/migration/upload/route.ts`](app/api/migration/upload/route.ts)
- `/api/modules` — [`app/api/modules/route.ts`](app/api/modules/route.ts)
- `/api/perf` — [`app/api/perf/route.ts`](app/api/perf/route.ts)
- `/api/proxy-attachment/[id]` — [`app/api/proxy-attachment/[id]/route.ts`](app/api/proxy-attachment/[id]/route.ts)
- `/api/revalidate-iam` — [`app/api/revalidate-iam/route.ts`](app/api/revalidate-iam/route.ts)
- `/api/session/conflict` — [`app/api/session/conflict/route.ts`](app/api/session/conflict/route.ts)
- `/api/session/register` — [`app/api/session/register/route.ts`](app/api/session/register/route.ts)
- `/api/version` — [`app/api/version/route.ts`](app/api/version/route.ts)
- `/api/webhooks/event-worker` — [`app/api/webhooks/event-worker/route.ts`](app/api/webhooks/event-worker/route.ts)

### 3. Server Actions (27 across 8 files)
#### [`lib/actions/attachments.ts`](lib/actions/attachments.ts) (3 actions)
- `initializeAttachmentUpload()`
- `getAttachmentDownloadUrl()`
- `fetchAttachments()`

#### [`lib/actions/collaboration.ts`](lib/actions/collaboration.ts) (4 actions)
- `addTicketRemark()`
- `addTicketChatMessage()`
- `saveCollaborationEntity()`
- `deleteCollaborationEntity()`

#### [`lib/actions/migration.ts`](lib/actions/migration.ts) (1 actions)
- `fetchMigrationMetadata()`

#### [`lib/actions/module-switcher.ts`](lib/actions/module-switcher.ts) (7 actions)
- `getUserAllowedModules()`
- `setActiveModule()`
- `getActiveModule()`
- `assignUserModules()`
- `clearActiveModule()`
- `fetchUserDashboardKeys()`
- `assignUserDashboardAccess()`

#### [`lib/actions/notifications.ts`](lib/actions/notifications.ts) (8 actions)
- `fetchUnreadNotifications()`
- `markNotificationAsRead()`
- `deleteNotification()`
- `deleteQueueNotification()`
- `clearAllQueueNotifications()`
- `dispatchNotification()`
- `handleMentions()`
- `markMentionsReadForTask()`

#### [`lib/actions/reports.ts`](lib/actions/reports.ts) (2 actions)
- `exportTicketReport()`
- `exportRequirementReport()`

#### [`lib/actions/search.ts`](lib/actions/search.ts) (1 actions)
- `globalSearch()`

#### [`app/admin/performance/actions.ts`](app/admin/performance/actions.ts) (1 actions)
- `getPerformanceServerMetrics()`

---


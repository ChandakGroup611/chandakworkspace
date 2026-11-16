# Comprehensive Application Security, Permission & Logic Audit Report (Phase 2)

**Generated:** 2026-11-16T07:06:45.301Z  
**Repository:** Chandak Workspace (Next.js 15 App Router + Supabase PostgreSQL)  
**Governance Protocol:** [.agents/rules/release_governance.md](file:///d:/adios/.agents/rules/release_governance.md) & [docs/ACCESS_RULES.md](file:///d:/adios/docs/ACCESS_RULES.md)  
**Status:** **PHASE 2 COMPLETE — AWAITING USER APPROVAL PRIOR TO PHASE 3 REMEDIATION**

---

## 1. Executive Summary & Audit Statistics

A full static and dynamic codebase scan was conducted across all Server Actions (`lib/actions/**`), Budget controllers (`lib/budget/**`), API route handlers (`app/api/**`), and client-to-server mutation boundaries (`"use server"` files).

Every finding was cross-referenced against the access control specifications defined in [docs/ACCESS_RULES.md](file:///d:/adios/docs/ACCESS_RULES.md).

### Finding Totals by Category
| Code | Category Description | Count | Primary Severity |
| :--- | :--- | :---: | :---: |
| **a** | Write actions (insert/update/upsert/delete/rpc) with no permission check | **245** | **HIGH** |
| **b** | "Refused by RLS → retry with supabaseAdmin" fallback patterns | **133** | **HIGH** |
| **c** | Functions accepting caller-supplied `performedBy` / `userId` / `actorId` | **28** | **HIGH** |
| **d** | Swallowed query errors returning empty `[]` / `null` / `0` / `{}` | **6** | **MEDIUM** |
| **e** | Unbounded `.in()` lists (>100 IDs) & unpaged sum/count queries | **112** | **LOW / MEDIUM** |
| **f** | Read actions returning records outside the authorized user's scope | **8** | **CRITICAL / HIGH** |
| **g** | Frontend buttons/pages gated differently from server authorization rules | **5** | **MEDIUM / HIGH** |
| **h** | Dropdowns / masters returning empty due to orphaned or invalid scope | **3** | **MEDIUM / HIGH** |
| **i** | Hard-coded emails, `user_metadata` / `app_metadata` role checks | **4** | **HIGH** |
| **TOTAL** | **All Identified Audit Findings** | **544** | — |

---

## 2. Verification of Pre-Remediated Controls

The following items previously addressed were re-verified and confirmed intact:
1. **Design Tracking Guard (`lib/actions/designTracking.ts`):** Server-side `requireDesign("masters")` guard verified on all 31 actions.
2. **Requirements User Identity (`lib/actions/requirements.ts`):** `signedInUserId()` server verification in place on intake/approval/status workflows.
3. **Email Settings Governance (`lib/actions/email-config.ts`):** Restricted to Super Admin / Admin only.
4. **Dashboard Access Rights (`lib/actions/module-switcher.ts`):** Dashboard access assignments restricted to Admin only.
5. **Budget Role Extraction (`lib/budget/data.ts`, `lib/repositories/users.ts`):** Role verified via DB `user_master` / `roles` (eliminated hard-coded emails).
6. **Authentication Invite Link Redirection (`app/auth/[...rest]`, `app/auth/accept`):** Fixed 404 handler for invitation magic links.
7. **Task Status Organization Fallback (`lib/actions/workspaces.ts`):** Fallback added to return global organization statuses when workspace status returns empty.
8. **User Master IAM Policies (`lib/actions/users.ts`, `lib/repositories/users.ts`, `app/users`):** Restored directory visibility, restricted self-elevation, prevented assignment of Super Admin by non-super users, cleared default pre-ticked dashboards.

---

## 3. High-Priority Module Breakdown

### 3.1 Task & Workspace Management
- **Scope Leakage (`lib/permissions/index.ts:235`):** `canAccessWorkspace` grants universal access to users with `WORKSPACES_VIEW`. Because standard roles (`ROLE_AGENT`, `ROLE_STAFF`, `USER`) receive this permission by default, private workspaces are accessible by non-members.
- **Unchecked Task Batch Assignment (`lib/actions/tasks.ts:2430`):** `assignUserToTasksBatch` accepts arbitrary task and user IDs without checking authentication or assignment authority, updating records via `supabaseAdmin`.
- **Unchecked Custom Fields & Progress (`lib/actions/tasks.ts:610`, `lib/actions/workspaces.ts:2057`):** `createCustomField`, `updateTaskProgress`, `updateSprint`, and `deleteTaskTemplate` perform direct database mutations without verifying workspace ownership or update rights.
- **Frontend Mismatch & Checkbox Glitch (`app/workspaces/WorkspacesClient.tsx:2170`, `components/workspaces/WorkspaceMasterTable.tsx:551, 759`):** Member selection checkboxes inside the Edit Workspace modal suffer from event bubbling and stale state, preventing Super Admins from toggling members. The "Share workspace" context menu action was conditionally hidden on mobile/desktop cards.

### 3.2 Vehicle Desk
- **19 Unchecked Writes (`lib/actions/vehicle.ts`):** Mutations managing vehicle documents, insurance policies, PUC certificates, spare parts, vendors, and service entitlements execute directly with `supabaseAdmin` without verifying `VEHICLES_UPDATE`, `FLEET_MAINTENANCE_MANAGE`, or `FLEET_VENDORS_MANAGE`.
- **Unrestricted Data Retrieval (`lib/actions/vehicle.ts:685, 3788, 3814, 3948`):** Vehicle listings, drivers, trips, maintenance logs, and parts inventory are fetched via `supabaseAdmin` without verifying read permissions.

### 3.3 Chandak Meet
- **RLS Bypasses & supabaseAdmin Reliance (`lib/actions/meet/*.ts`):** Over 40 action functions in `meetings.ts`, `sessions.ts`, `tasks.ts`, `notes.ts`, `decisions.ts`, and `invitations.ts` execute with `supabaseAdmin` service role rather than authenticated user context, bypassing row-level security.
- **Session Transitions:** RPC failures fall back to client-driven JavaScript mutations with service role permissions without checking organizer/chair identity.

### 3.4 DMS & Design Tracking
- **Volatile In-Memory Permissions (`lib/actions/dms-core.ts:45`):** Folder permissions rely on a local in-memory JavaScript `Map`, causing permission desynchronization across multi-process Node environments.
- **RLS Retry Fallbacks (`lib/actions/designTracking.ts:193, 214`):** Project upsert and deletion catch user client errors and retry with `supabaseAdmin`.

### 3.5 Organization Budget
- **Metadata Role Inspection (`lib/budget/actions.ts:24`, `lib/budget/manual-actions.ts:22`, `lib/budget/wizard-actions.ts:21`):** Access escalation checks `user.app_metadata?.role === "SUPER_ADMIN"`. Must be standardized to query `user_master` / `roles` table exclusively.

---

## 4. Complete Audit Findings Table

The table below catalogs every identified issue with file location, line number, target function, vulnerability description, category (a-i), and risk severity.

### Category a: Unchecked Write Actions (245 Items)

| File | Line | Function | Issue Description | Severity |
| :--- | :---: | :--- | :--- | :---: |
| [`lib/actions/attachments.ts`](file:///d:/adios/lib/actions/attachments.ts#L77) | `77` | `initializeAttachmentUpload` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/collaboration.ts`](file:///d:/adios/lib/actions/collaboration.ts#L84) | `84` | `senderName` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/collaboration.ts`](file:///d:/adios/lib/actions/collaboration.ts#L181) | `181` | `saveCollaborationEntity` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/collaboration.ts`](file:///d:/adios/lib/actions/collaboration.ts#L206) | `206` | `deleteCollaborationEntity` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/compliance.ts`](file:///d:/adios/lib/actions/compliance.ts#L102) | `102` | `hardDeleteEntity` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/compliance.ts`](file:///d:/adios/lib/actions/compliance.ts#L127) | `127` | `restoreEntity` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/compliance.ts`](file:///d:/adios/lib/actions/compliance.ts#L219) | `219` | `moveTasksBatchOperation` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/dependencies.ts`](file:///d:/adios/lib/actions/dependencies.ts#L151) | `151` | `reassignAndRemoveWorkspaceUser` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/design.ts`](file:///d:/adios/lib/actions/design.ts#L110) | `110` | `createDrawingAction` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/design.ts`](file:///d:/adios/lib/actions/design.ts#L155) | `155` | `updateDrawingStatusAction` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/designTracking.ts`](file:///d:/adios/lib/actions/designTracking.ts#L505) | `505` | `entryKey` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/designTracking.ts`](file:///d:/adios/lib/actions/designTracking.ts#L1125) | `1125` | `fetchRbacPoliciesAction` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/dmac-drawings.ts`](file:///d:/adios/lib/actions/dmac-drawings.ts#L270) | `270` | `submitDrawingRevisionAction` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/dmac-drawings.ts`](file:///d:/adios/lib/actions/dmac-drawings.ts#L419) | `419` | `reviewDrawingRevisionAction` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/dmac-drawings.ts`](file:///d:/adios/lib/actions/dmac-drawings.ts#L564) | `564` | `nextNo` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/dmac-drawings.ts`](file:///d:/adios/lib/actions/dmac-drawings.ts#L596) | `596` | `updateMarkupCommentAction` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/dmac-drawings.ts`](file:///d:/adios/lib/actions/dmac-drawings.ts#L631) | `631` | `deleteMarkupCommentAction` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/dmac-drawings.ts`](file:///d:/adios/lib/actions/dmac-drawings.ts#L648) | `648` | `addCommentThreadReplyAction` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/dms-core.ts`](file:///d:/adios/lib/actions/dms-core.ts#L297) | `297` | `createFolderAction` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/dms-core.ts`](file:///d:/adios/lib/actions/dms-core.ts#L663) | `663` | `cleanCode` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/dms-core.ts`](file:///d:/adios/lib/actions/dms-core.ts#L795) | `795` | `saveDocumentWithIndexingAction` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/dms-core.ts`](file:///d:/adios/lib/actions/dms-core.ts#L977) | `977` | `lockUnlockDocumentAction` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/dms-core.ts`](file:///d:/adios/lib/actions/dms-core.ts#L1018) | `1018` | `submitQcDecisionAction` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/dms-core.ts`](file:///d:/adios/lib/actions/dms-core.ts#L1160) | `1160` | `saveFolderPermissionsAction` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/dms-share-portal.ts`](file:///d:/adios/lib/actions/dms-share-portal.ts#L14) | `14` | `hashToken` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/dms-share-portal.ts`](file:///d:/adios/lib/actions/dms-share-portal.ts#L18) | `18` | `hashOtp` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/dms-share-portal.ts`](file:///d:/adios/lib/actions/dms-share-portal.ts#L165) | `165` | `requestShareOtpAction` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/dms-share-portal.ts`](file:///d:/adios/lib/actions/dms-share-portal.ts#L235) | `235` | `verifyShareAccessAction` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/dms-share-portal.ts`](file:///d:/adios/lib/actions/dms-share-portal.ts#L298) | `298` | `newFailedCount` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/dms-share-portal.ts`](file:///d:/adios/lib/actions/dms-share-portal.ts#L329) | `329` | `newOtpFailed` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/dms-share-portal.ts`](file:///d:/adios/lib/actions/dms-share-portal.ts#L470) | `470` | `logAccessAttempt` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/email-queue.ts`](file:///d:/adios/lib/actions/email-queue.ts#L3) | `3` | `processEmailQueueAsync` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/email-queue.ts`](file:///d:/adios/lib/actions/email-queue.ts#L128) | `128` | `markQueueFailed` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/iam.ts`](file:///d:/adios/lib/actions/iam.ts#L331) | `331` | `registerUserSession` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/masters.ts`](file:///d:/adios/lib/actions/masters.ts#L284) | `284` | `createBusinessValue` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/masters.ts`](file:///d:/adios/lib/actions/masters.ts#L301) | `301` | `createIssueType` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/masters.ts`](file:///d:/adios/lib/actions/masters.ts#L402) | `402` | `exName` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/meet/ai-minutes.ts`](file:///d:/adios/lib/actions/meet/ai-minutes.ts#L190) | `190` | `nextVersion` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/meet/ai-minutes.ts`](file:///d:/adios/lib/actions/meet/ai-minutes.ts#L283) | `283` | `items` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/meet/ai-minutes.ts`](file:///d:/adios/lib/actions/meet/ai-minutes.ts#L326) | `326` | `nextVersion` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/meet/ai-minutes.ts`](file:///d:/adios/lib/actions/meet/ai-minutes.ts#L371) | `371` | `targetName` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/meet/attendance.ts`](file:///d:/adios/lib/actions/meet/attendance.ts#L97) | `97` | `checkInWithQR` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/meet/invitations.ts`](file:///d:/adios/lib/actions/meet/invitations.ts#L76) | `76` | `respondToInvitation` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/meet/invitations.ts`](file:///d:/adios/lib/actions/meet/invitations.ts#L188) | `188` | `durationMs` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/meet/invitations.ts`](file:///d:/adios/lib/actions/meet/invitations.ts#L256) | `256` | `meetingTitle` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/meet/invitations.ts`](file:///d:/adios/lib/actions/meet/invitations.ts#L270) | `270` | `targetName` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/meet/meetings.ts`](file:///d:/adios/lib/actions/meet/meetings.ts#L310) | `310` | `durationMs` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/meet/meetings.ts`](file:///d:/adios/lib/actions/meet/meetings.ts#L395) | `395` | `emailRows` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/meet/mom.ts`](file:///d:/adios/lib/actions/meet/mom.ts#L209) | `209` | `email` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/meet/mom.ts`](file:///d:/adios/lib/actions/meet/mom.ts#L234) | `234` | `acknowledgeMoM` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/meet/notes.ts`](file:///d:/adios/lib/actions/meet/notes.ts#L138) | `138` | `activeBlocks` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/meet/notes.ts`](file:///d:/adios/lib/actions/meet/notes.ts#L195) | `195` | `createPersonalNote` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/meet/rooms.ts`](file:///d:/adios/lib/actions/meet/rooms.ts#L213) | `213` | `releaseNoShowBookings` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/meet/rooms.ts`](file:///d:/adios/lib/actions/meet/rooms.ts#L411) | `411` | `bookNowFromDisplay` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/meet/rooms.ts`](file:///d:/adios/lib/actions/meet/rooms.ts#L455) | `455` | `endEarlyFromDisplay` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/meet/rooms.ts`](file:///d:/adios/lib/actions/meet/rooms.ts#L495) | `495` | `extendFromDisplay` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/meet/sessions.ts`](file:///d:/adios/lib/actions/meet/sessions.ts#L237) | `237` | `first` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/meet/sessions.ts`](file:///d:/adios/lib/actions/meet/sessions.ts#L365) | `365` | `durationMs` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/meet/sessions.ts`](file:///d:/adios/lib/actions/meet/sessions.ts#L424) | `424` | `newCarryCount` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/meet/sessions.ts`](file:///d:/adios/lib/actions/meet/sessions.ts#L505) | `505` | `updateSessionAttendance` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/meet/sessions.ts`](file:///d:/adios/lib/actions/meet/sessions.ts#L524) | `524` | `submitPreMeetingUpdate` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/meet/sessions.ts`](file:///d:/adios/lib/actions/meet/sessions.ts#L614) | `614` | `email` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/meet/sessions.ts`](file:///d:/adios/lib/actions/meet/sessions.ts#L816) | `816` | `sortOrder` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/meet/sessions.ts`](file:///d:/adios/lib/actions/meet/sessions.ts#L879) | `879` | `cleanLink` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/meet/sla.ts`](file:///d:/adios/lib/actions/meet/sla.ts#L282) | `282` | `newVer` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/meet/tasks.ts`](file:///d:/adios/lib/actions/meet/tasks.ts#L348) | `348` | `requestTaskExtension` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/messenger.ts`](file:///d:/adios/lib/actions/messenger.ts#L332) | `332` | `getOrCreateDirectConversation` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/messenger.ts`](file:///d:/adios/lib/actions/messenger.ts#L427) | `427` | `createGroupConversation` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/messenger.ts`](file:///d:/adios/lib/actions/messenger.ts#L675) | `675` | `sendMessengerMessage` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/messenger.ts`](file:///d:/adios/lib/actions/messenger.ts#L819) | `819` | `markConversationAsRead` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/messenger.ts`](file:///d:/adios/lib/actions/messenger.ts#L837) | `837` | `togglePinConversation` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/messenger.ts`](file:///d:/adios/lib/actions/messenger.ts#L855) | `855` | `toggleMessageReaction` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/messenger.ts`](file:///d:/adios/lib/actions/messenger.ts#L888) | `888` | `deleteMessengerMessage` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/messenger.ts`](file:///d:/adios/lib/actions/messenger.ts#L930) | `930` | `editMessengerMessage` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/messenger.ts`](file:///d:/adios/lib/actions/messenger.ts#L1107) | `1107` | `addGroupMembers` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/messenger.ts`](file:///d:/adios/lib/actions/messenger.ts#L1160) | `1160` | `leaveGroupConversation` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/module-switcher.ts`](file:///d:/adios/lib/actions/module-switcher.ts#L251) | `251` | `setActiveModule` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/module-switcher.ts`](file:///d:/adios/lib/actions/module-switcher.ts#L443) | `443` | `keysToDelete` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/module-switcher.ts`](file:///d:/adios/lib/actions/module-switcher.ts#L517) | `517` | `clearActiveModule` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/module-switcher.ts`](file:///d:/adios/lib/actions/module-switcher.ts#L573) | `573` | `keysToDelete` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/notification-engine.ts`](file:///d:/adios/lib/actions/notification-engine.ts#L101) | `101` | `types` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/notifications.ts`](file:///d:/adios/lib/actions/notifications.ts#L32) | `32` | `markNotificationAsRead` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/notifications.ts`](file:///d:/adios/lib/actions/notifications.ts#L44) | `44` | `deleteNotification` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/notifications.ts`](file:///d:/adios/lib/actions/notifications.ts#L64) | `64` | `deleteQueueNotification` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/notifications.ts`](file:///d:/adios/lib/actions/notifications.ts#L80) | `80` | `clearAllQueueNotifications` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/notifications.ts`](file:///d:/adios/lib/actions/notifications.ts#L91) | `91` | `rCode` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/notifications.ts`](file:///d:/adios/lib/actions/notifications.ts#L102) | `102` | `dispatchNotification` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/notifications.ts`](file:///d:/adios/lib/actions/notifications.ts#L206) | `206` | `hydrate` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/notifications.ts`](file:///d:/adios/lib/actions/notifications.ts#L261) | `261` | `handleMentions` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/notifications.ts`](file:///d:/adios/lib/actions/notifications.ts#L358) | `358` | `msgIds` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/preferences.ts`](file:///d:/adios/lib/actions/preferences.ts#L8) | `8` | `saveDesignPreferences` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/requirements.ts`](file:///d:/adios/lib/actions/requirements.ts#L22) | `22` | `transitionRequirementStatus` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/requirements.ts`](file:///d:/adios/lib/actions/requirements.ts#L67) | `67` | `generateRequirementTask` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/requirements.ts`](file:///d:/adios/lib/actions/requirements.ts#L100) | `100` | `recalculateRequirementCompletion` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/requirements.ts`](file:///d:/adios/lib/actions/requirements.ts#L133) | `133` | `handleRequirementUAT` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/requirements.ts`](file:///d:/adios/lib/actions/requirements.ts#L348) | `348` | `reqScope` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/requirements.ts`](file:///d:/adios/lib/actions/requirements.ts#L623) | `623` | `updateRequirementIntake` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/requirements.ts`](file:///d:/adios/lib/actions/requirements.ts#L972) | `972` | `createTaskFromRequirement` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/requirements.ts`](file:///d:/adios/lib/actions/requirements.ts#L1090) | `1090` | `markRequirementPutToUse` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/requirements.ts`](file:///d:/adios/lib/actions/requirements.ts#L1110) | `1110` | `syncAmendmentToTasks` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/requirements.ts`](file:///d:/adios/lib/actions/requirements.ts#L1175) | `1175` | `newVersion` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/settings.ts`](file:///d:/adios/lib/actions/settings.ts#L166) | `166` | `updateMyProfile` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/sla.ts`](file:///d:/adios/lib/actions/sla.ts#L25) | `25` | `saveSLARule` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/sla.ts`](file:///d:/adios/lib/actions/sla.ts#L62) | `62` | `deleteSLARule` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/tasks.ts`](file:///d:/adios/lib/actions/tasks.ts#L308) | `308` | `cleanFileName` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/tasks.ts`](file:///d:/adios/lib/actions/tasks.ts#L541) | `541` | `updateNodeStatus` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/tasks.ts`](file:///d:/adios/lib/actions/tasks.ts#L582) | `582` | `logActivityEvent` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/tasks.ts`](file:///d:/adios/lib/actions/tasks.ts#L610) | `610` | `createCustomField` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/tasks.ts`](file:///d:/adios/lib/actions/tasks.ts#L988) | `988` | `cleanField` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/tasks.ts`](file:///d:/adios/lib/actions/tasks.ts#L1130) | `1130` | `createChecklistItem` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/tasks.ts`](file:///d:/adios/lib/actions/tasks.ts#L1164) | `1164` | `createTaskAttachment` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/tasks.ts`](file:///d:/adios/lib/actions/tasks.ts#L1218) | `1218` | `roleCode` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/tasks.ts`](file:///d:/adios/lib/actions/tasks.ts#L1291) | `1291` | `addTaskRemark` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/tasks.ts`](file:///d:/adios/lib/actions/tasks.ts#L1471) | `1471` | `logTaskTime` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/tasks.ts`](file:///d:/adios/lib/actions/tasks.ts#L1537) | `1537` | `completion_percentage` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/tasks.ts`](file:///d:/adios/lib/actions/tasks.ts#L1558) | `1558` | `recalculateParentProgress` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/tasks.ts`](file:///d:/adios/lib/actions/tasks.ts#L1673) | `1673` | `checklistInsertPromise` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/tasks.ts`](file:///d:/adios/lib/actions/tasks.ts#L1677) | `1677` | `checklistUpdatePromises` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/tasks.ts`](file:///d:/adios/lib/actions/tasks.ts#L1681) | `1681` | `commentPromise` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/tasks.ts`](file:///d:/adios/lib/actions/tasks.ts#L2059) | `2059` | `childIds` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/tasks.ts`](file:///d:/adios/lib/actions/tasks.ts#L2380) | `2380` | `newDescription` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/tasks.ts`](file:///d:/adios/lib/actions/tasks.ts#L2430) | `2430` | `assignUserToTasksBatch` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/tickets.ts`](file:///d:/adios/lib/actions/tickets.ts#L161) | `161` | `cleanField` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/tickets.ts`](file:///d:/adios/lib/actions/tickets.ts#L288) | `288` | `currentCustomFields` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/tickets.ts`](file:///d:/adios/lib/actions/tickets.ts#L417) | `417` | `cleanField` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/tickets.ts`](file:///d:/adios/lib/actions/tickets.ts#L623) | `623` | `month` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/tickets.ts`](file:///d:/adios/lib/actions/tickets.ts#L839) | `839` | `linkTicket` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/users.ts`](file:///d:/adios/lib/actions/users.ts#L341) | `341` | `currentAssetTags` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/users.ts`](file:///d:/adios/lib/actions/users.ts#L632) | `632` | `siteUrl` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/user_report_layout.ts`](file:///d:/adios/lib/actions/user_report_layout.ts#L46) | `46` | `saveUserReportLayout` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/user_report_layout.ts`](file:///d:/adios/lib/actions/user_report_layout.ts#L83) | `83` | `resetUserReportLayout` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/vehicle.ts`](file:///d:/adios/lib/actions/vehicle.ts#L1652) | `1652` | `evpBytesToKey` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/vehicle.ts`](file:///d:/adios/lib/actions/vehicle.ts#L1669) | `1669` | `decryptCarInfoPayload` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/vehicle.ts`](file:///d:/adios/lib/actions/vehicle.ts#L2336) | `2336` | `vehicleName` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/vehicle.ts`](file:///d:/adios/lib/actions/vehicle.ts#L2570) | `2570` | `creatorName` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/vehicle.ts`](file:///d:/adios/lib/actions/vehicle.ts#L2676) | `2676` | `updateVehicleAction` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/vehicle.ts`](file:///d:/adios/lib/actions/vehicle.ts#L3257) | `3257` | `performerName` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/vehicle.ts`](file:///d:/adios/lib/actions/vehicle.ts#L3298) | `3298` | `docIdsToDelete` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/vehicle.ts`](file:///d:/adios/lib/actions/vehicle.ts#L3496) | `3496` | `deleteVehicleDocumentAction` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/vehicle.ts`](file:///d:/adios/lib/actions/vehicle.ts#L3552) | `3552` | `createVehicleDocumentAction` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/vehicle.ts`](file:///d:/adios/lib/actions/vehicle.ts#L3611) | `3611` | `normDocType` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/vehicle.ts`](file:///d:/adios/lib/actions/vehicle.ts#L3646) | `3646` | `updateVehicleDocumentAction` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/vehicle.ts`](file:///d:/adios/lib/actions/vehicle.ts#L3710) | `3710` | `normDocType` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/vehicle.ts`](file:///d:/adios/lib/actions/vehicle.ts#L3871) | `3871` | `createTripPlanAction` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/vehicle.ts`](file:///d:/adios/lib/actions/vehicle.ts#L4142) | `4142` | `performerName` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/vehicle.ts`](file:///d:/adios/lib/actions/vehicle.ts#L4291) | `4291` | `performerName` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/vehicle.ts`](file:///d:/adios/lib/actions/vehicle.ts#L4462) | `4462` | `createDriverAction` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/vehicle.ts`](file:///d:/adios/lib/actions/vehicle.ts#L4514) | `4514` | `updateDriverAction` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/vehicle.ts`](file:///d:/adios/lib/actions/vehicle.ts#L4561) | `4561` | `deleteDriverAction` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/vehicle.ts`](file:///d:/adios/lib/actions/vehicle.ts#L4592) | `4592` | `updateTripStatusAction` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/vehicle.ts`](file:///d:/adios/lib/actions/vehicle.ts#L4636) | `4636` | `deleteTripAction` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/vehicle.ts`](file:///d:/adios/lib/actions/vehicle.ts#L4676) | `4676` | `deleteServiceRecordAction` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/vehicle.ts`](file:///d:/adios/lib/actions/vehicle.ts#L4706) | `4706` | `performerName` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/vehicle.ts`](file:///d:/adios/lib/actions/vehicle.ts#L4775) | `4775` | `createInsuranceVendorAction` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/vehicle.ts`](file:///d:/adios/lib/actions/vehicle.ts#L4855) | `4855` | `updateInsuranceVendorAction` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/vehicle.ts`](file:///d:/adios/lib/actions/vehicle.ts#L4912) | `4912` | `deleteInsuranceVendorAction` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/vehicle.ts`](file:///d:/adios/lib/actions/vehicle.ts#L5179) | `5179` | `createVehiclePartAction` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/vehicle.ts`](file:///d:/adios/lib/actions/vehicle.ts#L5366) | `5366` | `createVehiclePartsBatchAction` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/vehicle.ts`](file:///d:/adios/lib/actions/vehicle.ts#L5536) | `5536` | `updateVehiclePartAction` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/vehicle.ts`](file:///d:/adios/lib/actions/vehicle.ts#L5606) | `5606` | `deleteVehiclePartAction` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/vehicle.ts`](file:///d:/adios/lib/actions/vehicle.ts#L5626) | `5626` | `renewPartPolicyAction` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/vehicle.ts`](file:///d:/adios/lib/actions/vehicle.ts#L5757) | `5757` | `renewVehicleInsurancePolicyAction` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/vehicle.ts`](file:///d:/adios/lib/actions/vehicle.ts#L5906) | `5906` | `deleteVehicleInsurancePolicyAction` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/vehicle.ts`](file:///d:/adios/lib/actions/vehicle.ts#L6075) | `6075` | `renewVehiclePucCertificateAction` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/vehicle.ts`](file:///d:/adios/lib/actions/vehicle.ts#L6190) | `6190` | `deleteVehiclePucCertificateAction` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/vehicle.ts`](file:///d:/adios/lib/actions/vehicle.ts#L6415) | `6415` | `createVehicleServiceEntitlementAction` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/vehicle.ts`](file:///d:/adios/lib/actions/vehicle.ts#L6487) | `6487` | `redeemVehicleServiceEntitlementAction` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/vehicle.ts`](file:///d:/adios/lib/actions/vehicle.ts#L6542) | `6542` | `deleteVehicleServiceEntitlementAction` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/vehicle.ts`](file:///d:/adios/lib/actions/vehicle.ts#L7042) | `7042` | `recordedByName` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/vehicle.ts`](file:///d:/adios/lib/actions/vehicle.ts#L7245) | `7245` | `recordedByName` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/vehicle.ts`](file:///d:/adios/lib/actions/vehicle.ts#L7420) | `7420` | `restoredStatus` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/vehicleRbac.ts`](file:///d:/adios/lib/actions/vehicleRbac.ts#L134) | `134` | `saveFleetUserAccessAction` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/vehicleRbac.ts`](file:///d:/adios/lib/actions/vehicleRbac.ts#L190) | `190` | `deleteFleetUserAccessAction` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/vehicleRbac.ts`](file:///d:/adios/lib/actions/vehicleRbac.ts#L216) | `216` | `toggleUserFleetModuleAccessAction` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/vehicleRbac.ts`](file:///d:/adios/lib/actions/vehicleRbac.ts#L323) | `323` | `fetchFleetRbacPoliciesAction` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/vehicleRbac.ts`](file:///d:/adios/lib/actions/vehicleRbac.ts#L385) | `385` | `saveSingleFleetRbacPolicyAction` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/vehicleRbac.ts`](file:///d:/adios/lib/actions/vehicleRbac.ts#L425) | `425` | `saveFleetRbacPoliciesAction` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/workspaces.ts`](file:///d:/adios/lib/actions/workspaces.ts#L297) | `297` | `parentWorkspaceId` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/workspaces.ts`](file:///d:/adios/lib/actions/workspaces.ts#L1360) | `1360` | `effectiveParentId` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/workspaces.ts`](file:///d:/adios/lib/actions/workspaces.ts#L1489) | `1489` | `usersToDelete` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/workspaces.ts`](file:///d:/adios/lib/actions/workspaces.ts#L2033) | `2033` | `userId` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/workspaces.ts`](file:///d:/adios/lib/actions/workspaces.ts#L2057) | `2057` | `updateTaskProgress` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/workspaces.ts`](file:///d:/adios/lib/actions/workspaces.ts#L2105) | `2105` | `createSprint` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/workspaces.ts`](file:///d:/adios/lib/actions/workspaces.ts#L2153) | `2153` | `updateSprint` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/workspaces.ts`](file:///d:/adios/lib/actions/workspaces.ts#L2168) | `2168` | `createTaskTemplate` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/actions/workspaces.ts`](file:///d:/adios/lib/actions/workspaces.ts#L2197) | `2197` | `deleteTaskTemplate` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/budget/actions.ts`](file:///d:/adios/lib/budget/actions.ts#L45) | `45` | `updateLine` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/budget/actions.ts`](file:///d:/adios/lib/budget/actions.ts#L69) | `69` | `setLineRule` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/budget/actions.ts`](file:///d:/adios/lib/budget/actions.ts#L106) | `106` | `setCertified` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/budget/actions.ts`](file:///d:/adios/lib/budget/actions.ts#L130) | `130` | `addSchedule` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/budget/actions.ts`](file:///d:/adios/lib/budget/actions.ts#L141) | `141` | `updateSchedule` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/budget/actions.ts`](file:///d:/adios/lib/budget/actions.ts#L152) | `152` | `deleteSchedule` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/budget/actions.ts`](file:///d:/adios/lib/budget/actions.ts#L164) | `164` | `num` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/budget/actions.ts`](file:///d:/adios/lib/budget/actions.ts#L190) | `190` | `deleteScheduleRow` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/budget/actions.ts`](file:///d:/adios/lib/budget/actions.ts#L199) | `199` | `addTowerLine` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/budget/actions.ts`](file:///d:/adios/lib/budget/actions.ts#L207) | `207` | `removeLine` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/budget/actions.ts`](file:///d:/adios/lib/budget/actions.ts#L258) | `258` | `saveSignoffLevel` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/budget/actions.ts`](file:///d:/adios/lib/budget/actions.ts#L270) | `270` | `deleteSignoffLevel` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/budget/actions.ts`](file:///d:/adios/lib/budget/actions.ts#L279) | `279` | `deleteDraft` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/budget/actions.ts`](file:///d:/adios/lib/budget/actions.ts#L289) | `289` | `updateVersion` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/budget/actions.ts`](file:///d:/adios/lib/budget/actions.ts#L346) | `346` | `addEntry` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/budget/actions.ts`](file:///d:/adios/lib/budget/actions.ts#L411) | `411` | `updateEntry` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/budget/actions.ts`](file:///d:/adios/lib/budget/actions.ts#L425) | `425` | `deleteBill` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/budget/actions.ts`](file:///d:/adios/lib/budget/actions.ts#L434) | `434` | `deleteEntry` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/budget/actions.ts`](file:///d:/adios/lib/budget/actions.ts#L470) | `470` | `renameHead` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/budget/actions.ts`](file:///d:/adios/lib/budget/actions.ts#L481) | `481` | `updateProject` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/budget/actions.ts`](file:///d:/adios/lib/budget/actions.ts#L516) | `516` | `addComment` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/budget/actions.ts`](file:///d:/adios/lib/budget/actions.ts#L524) | `524` | `deleteComment` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/budget/actions.ts`](file:///d:/adios/lib/budget/actions.ts#L533) | `533` | `addTower` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/budget/actions.ts`](file:///d:/adios/lib/budget/actions.ts#L542) | `542` | `updateTower` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/budget/actions.ts`](file:///d:/adios/lib/budget/actions.ts#L554) | `554` | `addHead` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/budget/actions.ts`](file:///d:/adios/lib/budget/actions.ts#L575) | `575` | `updateHead` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/budget/actions.ts`](file:///d:/adios/lib/budget/actions.ts#L609) | `609` | `all` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/budget/actions.ts`](file:///d:/adios/lib/budget/actions.ts#L633) | `633` | `setFieldActive` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/budget/actions.ts`](file:///d:/adios/lib/budget/actions.ts#L642) | `642` | `deleteField` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/budget/actions.ts`](file:///d:/adios/lib/budget/actions.ts#L656) | `656` | `saveRole` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/budget/actions.ts`](file:///d:/adios/lib/budget/actions.ts#L687) | `687` | `deleteRole` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/budget/actions.ts`](file:///d:/adios/lib/budget/actions.ts#L698) | `698` | `setRolePermission` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/budget/actions.ts`](file:///d:/adios/lib/budget/actions.ts#L708) | `708` | `batchSetRolePermissions` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/budget/actions.ts`](file:///d:/adios/lib/budget/actions.ts#L730) | `730` | `saveMember` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/budget/actions.ts`](file:///d:/adios/lib/budget/actions.ts#L749) | `749` | `removeMember` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/budget/insights-actions.ts`](file:///d:/adios/lib/budget/insights-actions.ts#L20) | `20` | `project` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/budget/manual-actions.ts`](file:///d:/adios/lib/budget/manual-actions.ts#L56) | `56` | `addTowerFull` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/budget/manual-actions.ts`](file:///d:/adios/lib/budget/manual-actions.ts#L77) | `77` | `createProjectGuided` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/budget/manual-actions.ts`](file:///d:/adios/lib/budget/manual-actions.ts#L146) | `146` | `key` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/budget/manual-actions.ts`](file:///d:/adios/lib/budget/manual-actions.ts#L184) | `184` | `saveLineFigures` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/budget/masters-actions.ts`](file:///d:/adios/lib/budget/masters-actions.ts#L24) | `24` | `saveDepartment` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/budget/masters-actions.ts`](file:///d:/adios/lib/budget/masters-actions.ts#L42) | `42` | `deleteDepartment` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/budget/masters-actions.ts`](file:///d:/adios/lib/budget/masters-actions.ts#L52) | `52` | `saveSummaryRow` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/budget/masters-actions.ts`](file:///d:/adios/lib/budget/masters-actions.ts#L79) | `79` | `deleteSummaryRow` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/budget/masters-actions.ts`](file:///d:/adios/lib/budget/masters-actions.ts#L89) | `89` | `saveGstRule` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/budget/masters-actions.ts`](file:///d:/adios/lib/budget/masters-actions.ts#L106) | `106` | `deleteGstRule` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/budget/wizard-actions.ts`](file:///d:/adios/lib/budget/wizard-actions.ts#L101) | `101` | `step` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/budget/wizard-actions.ts`](file:///d:/adios/lib/budget/wizard-actions.ts#L137) | `137` | `k3` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/budget/wizard-actions.ts`](file:///d:/adios/lib/budget/wizard-actions.ts#L175) | `175` | `upsert` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`lib/budget/wizard-actions.ts`](file:///d:/adios/lib/budget/wizard-actions.ts#L218) | `218` | `diff` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`app/api/copilot/chat/route.ts`](file:///d:/adios/app/api/copilot/chat/route.ts#L22) | `22` | `POST` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`app/api/copilot/chat/route.ts`](file:///d:/adios/app/api/copilot/chat/route.ts#L532) | `532` | `stName` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`app/api/cron/tat-escalation/route.ts`](file:///d:/adios/app/api/cron/tat-escalation/route.ts#L26) | `26` | `requirements` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`app/api/heartbeat/route.ts`](file:///d:/adios/app/api/heartbeat/route.ts#L20) | `20` | `supabaseKey` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`app/api/migration/upload/route.ts`](file:///d:/adios/app/api/migration/upload/route.ts#L7) | `7` | `POST` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`app/api/modules/route.ts`](file:///d:/adios/app/api/modules/route.ts#L225) | `225` | `POST` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`app/api/session/register/route.ts`](file:///d:/adios/app/api/session/register/route.ts#L8) | `8` | `POST` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`app/api/webhooks/event-worker/route.ts`](file:///d:/adios/app/api/webhooks/event-worker/route.ts#L4) | `4` | `POST` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |
| [`app/api/webhooks/event-worker/route.ts`](file:///d:/adios/app/api/webhooks/event-worker/route.ts#L116) | `116` | `currentRetry` | Mutation query (.insert/.update/.delete/.upsert) without server authorization check | **HIGH** |

### Category b: RLS Refusal Retry with supabaseAdmin (133 Items)

| File | Line | Function | Issue Description | Severity |
| :--- | :---: | :--- | :--- | :---: |
| [`lib/actions/designTracking.ts`](file:///d:/adios/lib/actions/designTracking.ts#L193) | `193` | `saveProjectAction` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/designTracking.ts`](file:///d:/adios/lib/actions/designTracking.ts#L214) | `214` | `deleteProjectAction` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/designTracking.ts`](file:///d:/adios/lib/actions/designTracking.ts#L255) | `255` | `saveTowerAction` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/designTracking.ts`](file:///d:/adios/lib/actions/designTracking.ts#L275) | `275` | `deleteTowerAction` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/designTracking.ts`](file:///d:/adios/lib/actions/designTracking.ts#L309) | `309` | `savePackageAction` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/designTracking.ts`](file:///d:/adios/lib/actions/designTracking.ts#L314) | `314` | `savePackageAction` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/designTracking.ts`](file:///d:/adios/lib/actions/designTracking.ts#L325) | `325` | `deletePackageAction` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/designTracking.ts`](file:///d:/adios/lib/actions/designTracking.ts#L363) | `363` | `saveSubPackageAction` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/designTracking.ts`](file:///d:/adios/lib/actions/designTracking.ts#L368) | `368` | `saveSubPackageAction` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/designTracking.ts`](file:///d:/adios/lib/actions/designTracking.ts#L379) | `379` | `deleteSubPackageAction` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/designTracking.ts`](file:///d:/adios/lib/actions/designTracking.ts#L422) | `422` | `saveConsultantAction` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/designTracking.ts`](file:///d:/adios/lib/actions/designTracking.ts#L427) | `427` | `saveConsultantAction` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/designTracking.ts`](file:///d:/adios/lib/actions/designTracking.ts#L438) | `438` | `deleteConsultantAction` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/designTracking.ts`](file:///d:/adios/lib/actions/designTracking.ts#L470) | `470` | `saveStatutoryAuthorityAction` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/designTracking.ts`](file:///d:/adios/lib/actions/designTracking.ts#L475) | `475` | `saveStatutoryAuthorityAction` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/designTracking.ts`](file:///d:/adios/lib/actions/designTracking.ts#L486) | `486` | `deleteStatutoryAuthorityAction` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/designTracking.ts`](file:///d:/adios/lib/actions/designTracking.ts#L524) | `524` | `entryKey` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/designTracking.ts`](file:///d:/adios/lib/actions/designTracking.ts#L571) | `571` | `saveMatrixEntryAction` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/designTracking.ts`](file:///d:/adios/lib/actions/designTracking.ts#L618) | `618` | `saveBatchMatrixEntriesAction` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/designTracking.ts`](file:///d:/adios/lib/actions/designTracking.ts#L657) | `657` | `saveLookAheadAction` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/designTracking.ts`](file:///d:/adios/lib/actions/designTracking.ts#L662) | `662` | `saveLookAheadAction` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/designTracking.ts`](file:///d:/adios/lib/actions/designTracking.ts#L673) | `673` | `deleteLookAheadAction` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/designTracking.ts`](file:///d:/adios/lib/actions/designTracking.ts#L720) | `720` | `saveDrawingAction` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/designTracking.ts`](file:///d:/adios/lib/actions/designTracking.ts#L725) | `725` | `saveDrawingAction` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/designTracking.ts`](file:///d:/adios/lib/actions/designTracking.ts#L736) | `736` | `deleteDrawingAction` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/designTracking.ts`](file:///d:/adios/lib/actions/designTracking.ts#L768) | `768` | `saveDrawingRevisionAction` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/designTracking.ts`](file:///d:/adios/lib/actions/designTracking.ts#L812) | `812` | `saveTransmittalAction` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/designTracking.ts`](file:///d:/adios/lib/actions/designTracking.ts#L817) | `817` | `saveTransmittalAction` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/designTracking.ts`](file:///d:/adios/lib/actions/designTracking.ts#L828) | `828` | `deleteTransmittalAction` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/designTracking.ts`](file:///d:/adios/lib/actions/designTracking.ts#L872) | `872` | `saveRfiAction` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/designTracking.ts`](file:///d:/adios/lib/actions/designTracking.ts#L877) | `877` | `saveRfiAction` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/designTracking.ts`](file:///d:/adios/lib/actions/designTracking.ts#L888) | `888` | `deleteRfiAction` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/designTracking.ts`](file:///d:/adios/lib/actions/designTracking.ts#L1393) | `1393` | `saveDesignUserAccessAction` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/designTracking.ts`](file:///d:/adios/lib/actions/designTracking.ts#L1423) | `1423` | `saveDesignUserAccessAction` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/designTracking.ts`](file:///d:/adios/lib/actions/designTracking.ts#L1434) | `1434` | `deleteDesignUserAccessAction` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/dms-core.ts`](file:///d:/adios/lib/actions/dms-core.ts#L914) | `914` | `saveDocumentWithIndexingAction` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/dms-core.ts`](file:///d:/adios/lib/actions/dms-core.ts#L930) | `930` | `saveDocumentWithIndexingAction` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/dms-core.ts`](file:///d:/adios/lib/actions/dms-core.ts#L990) | `990` | `lockUnlockDocumentAction` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/dms-core.ts`](file:///d:/adios/lib/actions/dms-core.ts#L1032) | `1032` | `submitQcDecisionAction` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/email-config.ts`](file:///d:/adios/lib/actions/email-config.ts#L28) | `28` | `fetchSystemEmailConfig` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/email-config.ts`](file:///d:/adios/lib/actions/email-config.ts#L44) | `44` | `saveSystemEmailConfig` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/email-config.ts`](file:///d:/adios/lib/actions/email-config.ts#L90) | `90` | `fetchEventTriggerConfig` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/email-config.ts`](file:///d:/adios/lib/actions/email-config.ts#L114) | `114` | `fetchSpecificEventConfig` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/email-config.ts`](file:///d:/adios/lib/actions/email-config.ts#L391) | `391` | `fetchEmailProviders` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/email-config.ts`](file:///d:/adios/lib/actions/email-config.ts#L401) | `401` | `saveEmailProvider` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/email-config.ts`](file:///d:/adios/lib/actions/email-config.ts#L404) | `404` | `saveEmailProvider` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/email-queue.ts`](file:///d:/adios/lib/actions/email-queue.ts#L79) | `79` | `processEmailQueueAsync` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/email-queue.ts`](file:///d:/adios/lib/actions/email-queue.ts#L117) | `117` | `processEmailQueueAsync` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/email-queue.ts`](file:///d:/adios/lib/actions/email-queue.ts#L123) | `123` | `processEmailQueueAsync` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/iam.ts`](file:///d:/adios/lib/actions/iam.ts#L82) | `82` | `fetchRolePermissions` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/meet/ai-minutes.ts`](file:///d:/adios/lib/actions/meet/ai-minutes.ts#L408) | `408` | `targetName` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/meet/ai-minutes.ts`](file:///d:/adios/lib/actions/meet/ai-minutes.ts#L422) | `422` | `targetName` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/meet/attendance.ts`](file:///d:/adios/lib/actions/meet/attendance.ts#L58) | `58` | `markAttendance` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/meet/decisions.ts`](file:///d:/adios/lib/actions/meet/decisions.ts#L85) | `85` | `recordDecision` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/meet/decisions.ts`](file:///d:/adios/lib/actions/meet/decisions.ts#L184) | `184` | `updateDecisionStatus` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/meet/invitations.ts`](file:///d:/adios/lib/actions/meet/invitations.ts#L108) | `108` | `respondToInvitation` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/meet/invitations.ts`](file:///d:/adios/lib/actions/meet/invitations.ts#L133) | `133` | `respondToInvitation` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/meet/masters.ts`](file:///d:/adios/lib/actions/meet/masters.ts#L94) | `94` | `saveMeetingType` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/meet/masters.ts`](file:///d:/adios/lib/actions/meet/masters.ts#L131) | `131` | `savePointCategory` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/meet/masters.ts`](file:///d:/adios/lib/actions/meet/masters.ts#L169) | `169` | `saveMeetingRoom` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/meet/masters.ts`](file:///d:/adios/lib/actions/meet/masters.ts#L210) | `210` | `saveMeetingTemplate` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/meet/masters.ts`](file:///d:/adios/lib/actions/meet/masters.ts#L253) | `253` | `saveMeetSettings` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/meet/masters.ts`](file:///d:/adios/lib/actions/meet/masters.ts#L281) | `281` | `getMeetRoleMatrix` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/meet/meetings.ts`](file:///d:/adios/lib/actions/meet/meetings.ts#L232) | `232` | `createMeeting` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/meet/meetings.ts`](file:///d:/adios/lib/actions/meet/meetings.ts#L414) | `414` | `emailRows` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/meet/meetings.ts`](file:///d:/adios/lib/actions/meet/meetings.ts#L434) | `434` | `emailRows` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/meet/meetings.ts`](file:///d:/adios/lib/actions/meet/meetings.ts#L449) | `449` | `archiveMeeting` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/meet/meetings.ts`](file:///d:/adios/lib/actions/meet/meetings.ts#L507) | `507` | `updateMeeting` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/meet/meetings.ts`](file:///d:/adios/lib/actions/meet/meetings.ts#L558) | `558` | `addMeetingMember` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/meet/mom.ts`](file:///d:/adios/lib/actions/meet/mom.ts#L229) | `229` | `email` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/meet/notes.ts`](file:///d:/adios/lib/actions/meet/notes.ts#L189) | `189` | `activeBlocks` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/meet/notes.ts`](file:///d:/adios/lib/actions/meet/notes.ts#L279) | `279` | `addNoteBlock` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/meet/points.ts`](file:///d:/adios/lib/actions/meet/points.ts#L216) | `216` | `updatePointStatus` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/meet/points.ts`](file:///d:/adios/lib/actions/meet/points.ts#L329) | `329` | `updatePoint` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/meet/points.ts`](file:///d:/adios/lib/actions/meet/points.ts#L473) | `473` | `deletePoint` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/meet/rooms.ts`](file:///d:/adios/lib/actions/meet/rooms.ts#L167) | `167` | `bookRoomForSession` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/meet/rooms.ts`](file:///d:/adios/lib/actions/meet/rooms.ts#L248) | `248` | `releaseNoShowBookings` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/meet/sessions.ts`](file:///d:/adios/lib/actions/meet/sessions.ts#L182) | `182` | `attendeeEmails` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/meet/sessions.ts`](file:///d:/adios/lib/actions/meet/sessions.ts#L204) | `204` | `startSession` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/meet/sessions.ts`](file:///d:/adios/lib/actions/meet/sessions.ts#L449) | `449` | `newCarryCount` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/meet/sessions.ts`](file:///d:/adios/lib/actions/meet/sessions.ts#L499) | `499` | `newCarryCount` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/meet/sessions.ts`](file:///d:/adios/lib/actions/meet/sessions.ts#L545) | `545` | `submitPreMeetingUpdate` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/meet/sessions.ts`](file:///d:/adios/lib/actions/meet/sessions.ts#L629) | `629` | `email` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/meet/sessions.ts`](file:///d:/adios/lib/actions/meet/sessions.ts#L725) | `725` | `rescheduleSession` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/meet/sessions.ts`](file:///d:/adios/lib/actions/meet/sessions.ts#L774) | `774` | `cancelSession` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/meet/sessions.ts`](file:///d:/adios/lib/actions/meet/sessions.ts#L894) | `894` | `cleanLink` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/meet/sla.ts`](file:///d:/adios/lib/actions/meet/sla.ts#L74) | `74` | `acknowledgeEscalation` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/meet/sla.ts`](file:///d:/adios/lib/actions/meet/sla.ts#L112) | `112` | `reassignEscalation` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/meet/sla.ts`](file:///d:/adios/lib/actions/meet/sla.ts#L158) | `158` | `extendEscalation` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/meet/sla.ts`](file:///d:/adios/lib/actions/meet/sla.ts#L224) | `224` | `saveAlertRule` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/meet/sla.ts`](file:///d:/adios/lib/actions/meet/sla.ts#L299) | `299` | `newVer` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/meet/tasks.ts`](file:///d:/adios/lib/actions/meet/tasks.ts#L288) | `288` | `updateTaskStatus` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/meet/tasks.ts`](file:///d:/adios/lib/actions/meet/tasks.ts#L381) | `381` | `requestTaskExtension` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/meet/tasks.ts`](file:///d:/adios/lib/actions/meet/tasks.ts#L490) | `490` | `deleteTask` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/messenger.ts`](file:///d:/adios/lib/actions/messenger.ts#L810) | `810` | `senderName` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/messenger.ts`](file:///d:/adios/lib/actions/messenger.ts#L828) | `828` | `markConversationAsRead` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/module-switcher.ts`](file:///d:/adios/lib/actions/module-switcher.ts#L422) | `422` | `roleCode` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/module-switcher.ts`](file:///d:/adios/lib/actions/module-switcher.ts#L474) | `474` | `keysToDelete` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/notifications.ts`](file:///d:/adios/lib/actions/notifications.ts#L41) | `41` | `markNotificationAsRead` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/requirements.ts`](file:///d:/adios/lib/actions/requirements.ts#L904) | `904` | `processApprovalAction` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/tasks.ts`](file:///d:/adios/lib/actions/tasks.ts#L511) | `511` | `transitionTaskStatus` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/tasks.ts`](file:///d:/adios/lib/actions/tasks.ts#L565) | `565` | `updateNodeStatus` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/tasks.ts`](file:///d:/adios/lib/actions/tasks.ts#L1102) | `1102` | `isWorkspaceOwner` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/tasks.ts`](file:///d:/adios/lib/actions/tasks.ts#L1142) | `1142` | `createChecklistItem` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/tasks.ts`](file:///d:/adios/lib/actions/tasks.ts#L1192) | `1192` | `createTaskAttachment` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/tasks.ts`](file:///d:/adios/lib/actions/tasks.ts#L1304) | `1304` | `addTaskRemark` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/tasks.ts`](file:///d:/adios/lib/actions/tasks.ts#L1884) | `1884` | `updateTaskAssignees` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/tasks.ts`](file:///d:/adios/lib/actions/tasks.ts#L2422) | `2422` | `fetchWorkspaceTasksList` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/tasks.ts`](file:///d:/adios/lib/actions/tasks.ts#L2424) | `2424` | `fetchWorkspaceTasksList` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/tasks.ts`](file:///d:/adios/lib/actions/tasks.ts#L2438) | `2438` | `assignUserToTasksBatch` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/vehicle.ts`](file:///d:/adios/lib/actions/vehicle.ts#L2561) | `2561` | `vehicleName` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/vehicle.ts`](file:///d:/adios/lib/actions/vehicle.ts#L2563) | `2563` | `vehicleName` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/vehicle.ts`](file:///d:/adios/lib/actions/vehicle.ts#L2565) | `2565` | `vehicleName` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/vehicle.ts`](file:///d:/adios/lib/actions/vehicle.ts#L2601) | `2601` | `creatorName` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/vehicle.ts`](file:///d:/adios/lib/actions/vehicle.ts#L3528) | `3528` | `deleteVehicleDocumentAction` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/vehicle.ts`](file:///d:/adios/lib/actions/vehicle.ts#L3919) | `3919` | `createTripPlanAction` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/vehicle.ts`](file:///d:/adios/lib/actions/vehicle.ts#L4619) | `4619` | `updateTripStatusAction` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/vehicle.ts`](file:///d:/adios/lib/actions/vehicle.ts#L4660) | `4660` | `deleteTripAction` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/vehicle.ts`](file:///d:/adios/lib/actions/vehicle.ts#L4701) | `4701` | `deleteServiceRecordAction` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/vehicle.ts`](file:///d:/adios/lib/actions/vehicle.ts#L7106) | `7106` | `recordedByName` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/vehicle.ts`](file:///d:/adios/lib/actions/vehicle.ts#L7126) | `7126` | `recordedByName` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/vehicle.ts`](file:///d:/adios/lib/actions/vehicle.ts#L7324) | `7324` | `recordedByName` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/vehicle.ts`](file:///d:/adios/lib/actions/vehicle.ts#L7454) | `7454` | `restoredStatus` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/vehicleRbac.ts`](file:///d:/adios/lib/actions/vehicleRbac.ts#L240) | `240` | `toggleUserFleetModuleAccessAction` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/workspaces.ts`](file:///d:/adios/lib/actions/workspaces.ts#L328) | `328` | `parentWorkspaceId` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/workspaces.ts`](file:///d:/adios/lib/actions/workspaces.ts#L1506) | `1506` | `usersToDelete` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/workspaces.ts`](file:///d:/adios/lib/actions/workspaces.ts#L1531) | `1531` | `usersToDelete` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/workspaces.ts`](file:///d:/adios/lib/actions/workspaces.ts#L2045) | `2045` | `userId` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/workspaces.ts`](file:///d:/adios/lib/actions/workspaces.ts#L2098) | `2098` | `fetchAssignableUsers` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/workspaces.ts`](file:///d:/adios/lib/actions/workspaces.ts#L2149) | `2149` | `getDescendants` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/workspaces.ts`](file:///d:/adios/lib/actions/workspaces.ts#L2164) | `2164` | `updateSprint` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`lib/actions/workspaces.ts`](file:///d:/adios/lib/actions/workspaces.ts#L2184) | `2184` | `createTaskTemplate` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |
| [`app/api/heartbeat/route.ts`](file:///d:/adios/app/api/heartbeat/route.ts#L110) | `110` | `supabaseKey` | Error or RLS catch block retries write mutation using supabaseAdmin service role | **HIGH** |

### Category c: Caller-Supplied User / Actor Identity (28 Items)

| File | Line | Function | Issue Description | Severity |
| :--- | :---: | :--- | :--- | :---: |
| [`lib/actions/dependencies.ts`](file:///d:/adios/lib/actions/dependencies.ts#L19) | `19` | `checkWorkspaceUserDependencies` | Accepts caller-supplied `userId` without server session auth verification | **HIGH** |
| [`lib/actions/dependencies.ts`](file:///d:/adios/lib/actions/dependencies.ts#L312) | `312` | `checkTaskUserDependencies` | Accepts caller-supplied `userId` without server session auth verification | **HIGH** |
| [`lib/actions/designTracking.ts`](file:///d:/adios/lib/actions/designTracking.ts#L1429) | `1429` | `deleteDesignUserAccessAction` | Accepts caller-supplied `userId` without server session auth verification | **HIGH** |
| [`lib/actions/designTracking.ts`](file:///d:/adios/lib/actions/designTracking.ts#L1444) | `1444` | `toggleUserDesignModuleAccessAction` | Accepts caller-supplied `userId` without server session auth verification | **HIGH** |
| [`lib/actions/iam.ts`](file:///d:/adios/lib/actions/iam.ts#L414) | `414` | `checkActiveSessionConflict` | Accepts caller-supplied `userId` without server session auth verification | **HIGH** |
| [`lib/actions/messenger.ts`](file:///d:/adios/lib/actions/messenger.ts#L332) | `332` | `getOrCreateDirectConversation` | Accepts caller-supplied `UserId` without server session auth verification | **HIGH** |
| [`lib/actions/messenger.ts`](file:///d:/adios/lib/actions/messenger.ts#L1048) | `1048` | `getMessengerTotalUnreadCount` | Accepts caller-supplied `UserId` without server session auth verification | **HIGH** |
| [`lib/actions/reports.ts`](file:///d:/adios/lib/actions/reports.ts#L48) | `48` | `exportTicketReport` | Accepts caller-supplied `userId` without server session auth verification | **HIGH** |
| [`lib/actions/reports.ts`](file:///d:/adios/lib/actions/reports.ts#L71) | `71` | `exportRequirementReport` | Accepts caller-supplied `userId` without server session auth verification | **HIGH** |
| [`lib/actions/requirements.ts`](file:///d:/adios/lib/actions/requirements.ts#L22) | `22` | `transitionRequirementStatus` | Accepts caller-supplied `performedBy` without server session auth verification | **HIGH** |
| [`lib/actions/requirements.ts`](file:///d:/adios/lib/actions/requirements.ts#L67) | `67` | `generateRequirementTask` | Accepts caller-supplied `performedBy` without server session auth verification | **HIGH** |
| [`lib/actions/requirements.ts`](file:///d:/adios/lib/actions/requirements.ts#L133) | `133` | `handleRequirementUAT` | Accepts caller-supplied `performedBy` without server session auth verification | **HIGH** |
| [`lib/actions/requirements.ts`](file:///d:/adios/lib/actions/requirements.ts#L413) | `413` | `submitRequirementAnalysis` | Accepts caller-supplied `performedBy` without server session auth verification | **HIGH** |
| [`lib/actions/requirements.ts`](file:///d:/adios/lib/actions/requirements.ts#L552) | `552` | `generateApprovalFlow` | Accepts caller-supplied `performedBy` without server session auth verification | **HIGH** |
| [`lib/actions/requirements.ts`](file:///d:/adios/lib/actions/requirements.ts#L592) | `592` | `deleteRequirement` | Accepts caller-supplied `performedBy` without server session auth verification | **HIGH** |
| [`lib/actions/requirements.ts`](file:///d:/adios/lib/actions/requirements.ts#L623) | `623` | `updateRequirementIntake` | Accepts caller-supplied `performedBy` without server session auth verification | **HIGH** |
| [`lib/actions/requirements.ts`](file:///d:/adios/lib/actions/requirements.ts#L797) | `797` | `processApprovalAction` | Accepts caller-supplied `performedBy` without server session auth verification | **HIGH** |
| [`lib/actions/requirements.ts`](file:///d:/adios/lib/actions/requirements.ts#L1110) | `1110` | `syncAmendmentToTasks` | Accepts caller-supplied `performedBy` without server session auth verification | **HIGH** |
| [`lib/actions/tasks.ts`](file:///d:/adios/lib/actions/tasks.ts#L425) | `425` | `transitionTaskStatus` | Accepts caller-supplied `performedBy` without server session auth verification | **HIGH** |
| [`lib/actions/tasks.ts`](file:///d:/adios/lib/actions/tasks.ts#L582) | `582` | `logActivityEvent` | Accepts caller-supplied `performedBy` without server session auth verification | **HIGH** |
| [`lib/actions/tasks.ts`](file:///d:/adios/lib/actions/tasks.ts#L850) | `850` | `getWorkloadSnapshot` | Accepts caller-supplied `userId` without server session auth verification | **HIGH** |
| [`lib/actions/tasks.ts`](file:///d:/adios/lib/actions/tasks.ts#L2430) | `2430` | `assignUserToTasksBatch` | Accepts caller-supplied `userId` without server session auth verification | **HIGH** |
| [`lib/actions/users.ts`](file:///d:/adios/lib/actions/users.ts#L769) | `769` | `fetchUserDashboardsAction` | Accepts caller-supplied `UserId` without server session auth verification | **HIGH** |
| [`lib/actions/vehicleRbac.ts`](file:///d:/adios/lib/actions/vehicleRbac.ts#L190) | `190` | `deleteFleetUserAccessAction` | Accepts caller-supplied `userId` without server session auth verification | **HIGH** |
| [`lib/actions/vehicleRbac.ts`](file:///d:/adios/lib/actions/vehicleRbac.ts#L216) | `216` | `toggleUserFleetModuleAccessAction` | Accepts caller-supplied `userId` without server session auth verification | **HIGH** |
| [`lib/actions/workspaces.ts`](file:///d:/adios/lib/actions/workspaces.ts#L524) | `524` | `fetchHierarchyRoots` | Accepts caller-supplied `userId` without server session auth verification | **HIGH** |
| [`lib/actions/workspaces.ts`](file:///d:/adios/lib/actions/workspaces.ts#L556) | `556` | `getUserTaskEnrollmentContext` | Accepts caller-supplied `userId` without server session auth verification | **HIGH** |
| [`lib/budget/actions.ts`](file:///d:/adios/lib/budget/actions.ts#L749) | `749` | `removeMember` | Accepts caller-supplied `userId` without server session auth verification | **HIGH** |

### Category d: Swallowed Database Query Errors (6 Items)

| File | Line | Function | Issue Description | Severity |
| :--- | :---: | :--- | :--- | :---: |
| [`lib/actions/requirements.ts`](file:///d:/adios/lib/actions/requirements.ts#L548) | `548` | `fetchRequirementStatuses` | Swallows database error and returns empty []/null/0 instead of raising/reporting error | **MEDIUM** |
| [`lib/actions/requirements.ts`](file:///d:/adios/lib/actions/requirements.ts#L789) | `789` | `fetchRequirement` | Swallows database error and returns empty []/null/0 instead of raising/reporting error | **MEDIUM** |
| [`lib/actions/workspaces.ts`](file:///d:/adios/lib/actions/workspaces.ts#L2149) | `2149` | `getDescendants` | Swallows database error and returns empty []/null/0 instead of raising/reporting error | **MEDIUM** |
| [`lib/actions/workspaces.ts`](file:///d:/adios/lib/actions/workspaces.ts#L2193) | `2193` | `fetchTaskTemplates` | Swallows database error and returns empty []/null/0 instead of raising/reporting error | **MEDIUM** |
| [`lib/actions/workspaces.ts`](file:///d:/adios/lib/actions/workspaces.ts#L1937) | `1937` | `fetchAllTasks` | Swallows tasksError on database query and silently returns empty [] | **MEDIUM** |
| [`lib/actions/requirements.ts`](file:///d:/adios/lib/actions/requirements.ts#L254) | `254` | `fetchRequirements` | Swallows database query error and silently returns empty [] | **MEDIUM** |

### Category e: Unbounded .in() Filters & Unpaged Aggregates (112 Items)

| File | Line | Function | Issue Description | Severity |
| :--- | :---: | :--- | :--- | :---: |
| [`lib/actions/attachments.ts`](file:///d:/adios/lib/actions/attachments.ts#L264) | `264` | `isValidUUID` | Unbounded `.in(..., idsArray)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/attachments.ts`](file:///d:/adios/lib/actions/attachments.ts#L275) | `275` | `isValidUUID` | Unbounded `.in(..., idsArray)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/attachments.ts`](file:///d:/adios/lib/actions/attachments.ts#L297) | `297` | `isValidUUID` | Unbounded `.in(..., idsArray)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/collaboration.ts`](file:///d:/adios/lib/actions/collaboration.ts#L56) | `56` | `addTicketRemark` | Unbounded `.in(..., mentionedUsernames)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/compliance.ts`](file:///d:/adios/lib/actions/compliance.ts#L109) | `109` | `hardDeleteEntity` | Unbounded `.in(..., ids)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/compliance.ts`](file:///d:/adios/lib/actions/compliance.ts#L150) | `150` | `restoreEntity` | Unbounded `.in(..., ids)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/compliance.ts`](file:///d:/adios/lib/actions/compliance.ts#L178) | `178` | `restoreEntity` | Unbounded `.in(..., ids)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/dashboardMetrics.ts`](file:///d:/adios/lib/actions/dashboardMetrics.ts#L40) | `40` | `fetchLiveDashboardMetrics` | Unbounded `.in(..., userIdsForScope)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/dashboardMetrics.ts`](file:///d:/adios/lib/actions/dashboardMetrics.ts#L53) | `53` | `fetchLiveDashboardMetrics` | Unbounded `.in(..., userIdsForScope)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/dashboardMetrics.ts`](file:///d:/adios/lib/actions/dashboardMetrics.ts#L67) | `67` | `fetchLiveDashboardMetrics` | Unbounded `.in(..., userIdsForScope)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/dashboardMetrics.ts`](file:///d:/adios/lib/actions/dashboardMetrics.ts#L68) | `68` | `fetchLiveDashboardMetrics` | Unbounded `.in(..., userIdsForScope)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/dashboardMetrics.ts`](file:///d:/adios/lib/actions/dashboardMetrics.ts#L78) | `78` | `fetchLiveDashboardMetrics` | Unbounded `.in(..., chunk)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/dashboardMetrics.ts`](file:///d:/adios/lib/actions/dashboardMetrics.ts#L114) | `114` | `fetchLiveDashboardMetrics` | Unbounded `.in(..., userIdsForScope)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/dashboardMetrics.ts`](file:///d:/adios/lib/actions/dashboardMetrics.ts#L115) | `115` | `fetchLiveDashboardMetrics` | Unbounded `.in(..., userIdsForScope)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/dashboardMetrics.ts`](file:///d:/adios/lib/actions/dashboardMetrics.ts#L135) | `135` | `fetchLiveDashboardMetrics` | Unbounded `.in(..., userIdsForScope)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/dashboardMetrics.ts`](file:///d:/adios/lib/actions/dashboardMetrics.ts#L136) | `136` | `fetchLiveDashboardMetrics` | Unbounded `.in(..., userIdsForScope)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/dashboardMetrics.ts`](file:///d:/adios/lib/actions/dashboardMetrics.ts#L159) | `159` | `fetchLiveDashboardMetrics` | Unbounded `.in(..., userIdsForScope)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/dashboardMetrics.ts`](file:///d:/adios/lib/actions/dashboardMetrics.ts#L175) | `175` | `fetchLiveDashboardMetrics` | Unbounded `.in(..., idsToFetch)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/dependencies.ts`](file:///d:/adios/lib/actions/dependencies.ts#L48) | `48` | `checkWorkspaceUserDependencies` | Unbounded `.in(..., wsIdList)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/dependencies.ts`](file:///d:/adios/lib/actions/dependencies.ts#L63) | `63` | `workspaceTickets` | Unbounded `.in(..., wsIdList)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/dependencies.ts`](file:///d:/adios/lib/actions/dependencies.ts#L189) | `189` | `reassignAndRemoveWorkspaceUser` | Unbounded `.in(..., wsIdList)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/dependencies.ts`](file:///d:/adios/lib/actions/dependencies.ts#L200) | `200` | `reassignAndRemoveWorkspaceUser` | Unbounded `.in(..., taskIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/dependencies.ts`](file:///d:/adios/lib/actions/dependencies.ts#L208) | `208` | `reassignAndRemoveWorkspaceUser` | Unbounded `.in(..., wsIdList)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/dependencies.ts`](file:///d:/adios/lib/actions/dependencies.ts#L218) | `218` | `reassignAndRemoveWorkspaceUser` | Unbounded `.in(..., allWsTaskIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/dependencies.ts`](file:///d:/adios/lib/actions/dependencies.ts#L256) | `256` | `reassignAndRemoveWorkspaceUser` | Unbounded `.in(..., allWsTaskIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/dependencies.ts`](file:///d:/adios/lib/actions/dependencies.ts#L262) | `262` | `reassignAndRemoveWorkspaceUser` | Unbounded `.in(..., allWsTaskIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/dependencies.ts`](file:///d:/adios/lib/actions/dependencies.ts#L270) | `270` | `reassignAndRemoveWorkspaceUser` | Unbounded `.in(..., wsIdList)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/dmac-drawings.ts`](file:///d:/adios/lib/actions/dmac-drawings.ts#L246) | `246` | `revisionIds` | Unbounded `.in(..., revisionIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/email-config.ts`](file:///d:/adios/lib/actions/email-config.ts#L179) | `179` | `previewEmailTemplate` | Unbounded `.in(..., userIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/email-queue.ts`](file:///d:/adios/lib/actions/email-queue.ts#L35) | `35` | `processEmailQueueAsync` | Unbounded `.in(..., queueIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/email-queue.ts`](file:///d:/adios/lib/actions/email-queue.ts#L132) | `132` | `markQueueFailed` | Unbounded `.in(..., ids)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/iam.ts`](file:///d:/adios/lib/actions/iam.ts#L170) | `170` | `syncRolePermissions` | Unbounded `.in(..., toDelete)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/meet/meetings.ts`](file:///d:/adios/lib/actions/meet/meetings.ts#L107) | `107` | `meetingIds` | Unbounded `.in(..., meetingIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/meet/meetings.ts`](file:///d:/adios/lib/actions/meet/meetings.ts#L112) | `112` | `meetingIds` | Unbounded `.in(..., meetingIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/meet/meetings.ts`](file:///d:/adios/lib/actions/meet/meetings.ts#L193) | `193` | `createMeeting` | Unbounded `.in(..., memberUserIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/meet/meetings.ts`](file:///d:/adios/lib/actions/meet/meetings.ts#L393) | `393` | `durationMs` | Unbounded `.in(..., userIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/meet/rooms.ts`](file:///d:/adios/lib/actions/meet/rooms.ts#L244) | `244` | `releaseNoShowBookings` | Unbounded `.in(..., ids)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/meet/sessions.ts`](file:///d:/adios/lib/actions/meet/sessions.ts#L39) | `39` | `sessionIds` | Unbounded `.in(..., sessionIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/meet/sessions.ts`](file:///d:/adios/lib/actions/meet/sessions.ts#L145) | `145` | `pointIds` | Unbounded `.in(..., pointIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/messenger.ts`](file:///d:/adios/lib/actions/messenger.ts#L196) | `196` | `fetchMessengerConversations` | Unbounded `.in(..., conversationIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/messenger.ts`](file:///d:/adios/lib/actions/messenger.ts#L227) | `227` | `fetchMessengerConversations` | Unbounded `.in(..., conversationIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/messenger.ts`](file:///d:/adios/lib/actions/messenger.ts#L578) | `578` | `fetchMessengerMessages` | Unbounded `.in(..., replyIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/messenger.ts`](file:///d:/adios/lib/actions/messenger.ts#L605) | `605` | `fetchMessengerMessages` | Unbounded `.in(..., messageIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/notifications.ts`](file:///d:/adios/lib/actions/notifications.ts#L362) | `362` | `msgIds` | Unbounded `.in(..., msgIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/requirements.ts`](file:///d:/adios/lib/actions/requirements.ts#L118) | `118` | `recalculateRequirementCompletion` | Unbounded `.in(..., taskIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/requirements.ts`](file:///d:/adios/lib/actions/requirements.ts#L210) | `210` | `handleRequirementUAT` | Unbounded `.in(..., taskIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/requirements.ts`](file:///d:/adios/lib/actions/requirements.ts#L260) | `260` | `fetchRequirements` | Unbounded `.in(..., creatorIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/requirements.ts`](file:///d:/adios/lib/actions/requirements.ts#L571) | `571` | `generateApprovalFlow` | Unbounded `.in(..., deptIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/requirements.ts`](file:///d:/adios/lib/actions/requirements.ts#L668) | `668` | `fetchRequirementAuditLogs` | Unbounded `.in(..., userIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/requirements.ts`](file:///d:/adios/lib/actions/requirements.ts#L723) | `723` | `fetchRequirementAnalyticsData` | Unbounded `.in(..., reqIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/requirements.ts`](file:///d:/adios/lib/actions/requirements.ts#L726) | `726` | `fetchRequirementAnalyticsData` | Unbounded `.in(..., taskIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/requirements.ts`](file:///d:/adios/lib/actions/requirements.ts#L1074) | `1074` | `fetchLinkedTasks` | Unbounded `.in(..., assigneeIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/requirements.ts`](file:///d:/adios/lib/actions/requirements.ts#L1121) | `1121` | `syncAmendmentToTasks` | Unbounded `.in(..., taskIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/tasks.ts`](file:///d:/adios/lib/actions/tasks.ts#L862) | `862` | `getWorkloadSnapshot` | Unbounded `.in(..., workspaceIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/tasks.ts`](file:///d:/adios/lib/actions/tasks.ts#L970) | `970` | `updateTask` | Unbounded `.in(..., statusIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/tasks.ts`](file:///d:/adios/lib/actions/tasks.ts#L1274) | `1274` | `getTaskComments` | Unbounded `.in(..., userIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/tasks.ts`](file:///d:/adios/lib/actions/tasks.ts#L1401) | `1401` | `updateTaskStatusInline` | Unbounded `.in(..., statusIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/tasks.ts`](file:///d:/adios/lib/actions/tasks.ts#L1573) | `1573` | `recalculateParentProgress` | Unbounded `.in(..., statusIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/tasks.ts`](file:///d:/adios/lib/actions/tasks.ts#L2054) | `2054` | `moveTasksInBulk` | Unbounded `.in(..., currentBatch)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/tasks.ts`](file:///d:/adios/lib/actions/tasks.ts#L2080) | `2080` | `childIds` | Unbounded `.in(..., finalTaskIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/tasks.ts`](file:///d:/adios/lib/actions/tasks.ts#L2088) | `2088` | `childIds` | Unbounded `.in(..., taskIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/tasks.ts`](file:///d:/adios/lib/actions/tasks.ts#L2099) | `2099` | `childIds` | Unbounded `.in(..., finalTaskIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/tasks.ts`](file:///d:/adios/lib/actions/tasks.ts#L2127) | `2127` | `childIds` | Unbounded `.in(..., finalTaskIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/tasks.ts`](file:///d:/adios/lib/actions/tasks.ts#L2133) | `2133` | `childIds` | Unbounded `.in(..., finalTaskIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/tasks.ts`](file:///d:/adios/lib/actions/tasks.ts#L2246) | `2246` | `transferTask` | Unbounded `.in(..., allTaskIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/tasks.ts`](file:///d:/adios/lib/actions/tasks.ts#L2254) | `2254` | `transferTask` | Unbounded `.in(..., allTaskIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/tasks.ts`](file:///d:/adios/lib/actions/tasks.ts#L2255) | `2255` | `transferTask` | Unbounded `.in(..., droppedUsers)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/tasks.ts`](file:///d:/adios/lib/actions/tasks.ts#L2268) | `2268` | `transferTask` | Unbounded `.in(..., allTaskIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/tasks.ts`](file:///d:/adios/lib/actions/tasks.ts#L2269) | `2269` | `transferTask` | Unbounded `.in(..., newExecutors)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/tasks.ts`](file:///d:/adios/lib/actions/tasks.ts#L2283) | `2283` | `transferTask` | Unbounded `.in(..., allTaskIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/vehicle.ts`](file:///d:/adios/lib/actions/vehicle.ts#L742) | `742` | `vehiclesList` | Unbounded `.in(..., vehicleIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/vehicle.ts`](file:///d:/adios/lib/actions/vehicle.ts#L760) | `760` | `vehiclesList` | Unbounded `.in(..., vehicleIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/vehicle.ts`](file:///d:/adios/lib/actions/vehicle.ts#L3306) | `3306` | `docIdsToDelete` | Unbounded `.in(..., docIdsToDelete)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/vehicle.ts`](file:///d:/adios/lib/actions/vehicle.ts#L3852) | `3852` | `tripsList` | Unbounded `.in(..., vehicleIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/vehicle.ts`](file:///d:/adios/lib/actions/vehicle.ts#L3853) | `3853` | `tripsList` | Unbounded `.in(..., driverIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/vehicle.ts`](file:///d:/adios/lib/actions/vehicle.ts#L3999) | `3999` | `fetchMaintenanceList` | Unbounded `.in(..., vehicleIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/vehicle.ts`](file:///d:/adios/lib/actions/vehicle.ts#L5409) | `5409` | `createVehiclePartsBatchAction` | Unbounded `.in(..., targetVehIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/workspaces.ts`](file:///d:/adios/lib/actions/workspaces.ts#L57) | `57` | `fetchEnrolledWorkspaces` | Unbounded `.in(..., wsIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/workspaces.ts`](file:///d:/adios/lib/actions/workspaces.ts#L64) | `64` | `fetchEnrolledWorkspaces` | Unbounded `.in(..., wsIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/workspaces.ts`](file:///d:/adios/lib/actions/workspaces.ts#L632) | `632` | `fetchHierarchyChildren` | Unbounded `.in(..., allowedWorkspaceIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/workspaces.ts`](file:///d:/adios/lib/actions/workspaces.ts#L868) | `868` | `searchHierarchyDeep` | Unbounded `.in(..., selectedAssigneeIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/workspaces.ts`](file:///d:/adios/lib/actions/workspaces.ts#L932) | `932` | `hasEntityFilter` | Unbounded `.in(..., effectiveTaskWsIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/workspaces.ts`](file:///d:/adios/lib/actions/workspaces.ts#L940) | `940` | `hasEntityFilter` | Unbounded `.in(..., selectedStatusIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/workspaces.ts`](file:///d:/adios/lib/actions/workspaces.ts#L943) | `943` | `hasEntityFilter` | Unbounded `.in(..., selectedPriorityIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/workspaces.ts`](file:///d:/adios/lib/actions/workspaces.ts#L1014) | `1014` | `hasEntityFilter` | Unbounded `.in(..., filteredWsIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/workspaces.ts`](file:///d:/adios/lib/actions/workspaces.ts#L1021) | `1021` | `hasEntityFilter` | Unbounded `.in(..., selectedStatusIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/workspaces.ts`](file:///d:/adios/lib/actions/workspaces.ts#L1115) | `1115` | `hasEntityFilter` | Unbounded `.in(..., missingParentTaskIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/workspaces.ts`](file:///d:/adios/lib/actions/workspaces.ts#L1251) | `1251` | `fetchAllHierarchyBranches` | Unbounded `.in(..., visibleWsIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/workspaces.ts`](file:///d:/adios/lib/actions/workspaces.ts#L1491) | `1491` | `usersToDelete` | Unbounded `.in(..., usersToDelete)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/workspaces.ts`](file:///d:/adios/lib/actions/workspaces.ts#L1513) | `1513` | `usersToDelete` | Unbounded `.in(..., targetWorkspaceIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/workspaces.ts`](file:///d:/adios/lib/actions/workspaces.ts#L1521) | `1521` | `usersToDelete` | Unbounded `.in(..., wsTaskIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/workspaces.ts`](file:///d:/adios/lib/actions/workspaces.ts#L1522) | `1522` | `usersToDelete` | Unbounded `.in(..., removedUserIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/workspaces.ts`](file:///d:/adios/lib/actions/workspaces.ts#L1527) | `1527` | `usersToDelete` | Unbounded `.in(..., wsTaskIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/workspaces.ts`](file:///d:/adios/lib/actions/workspaces.ts#L1528) | `1528` | `usersToDelete` | Unbounded `.in(..., removedUserIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/workspaces.ts`](file:///d:/adios/lib/actions/workspaces.ts#L1712) | `1712` | `fetchWorkspaceStakeholders` | Unbounded `.in(..., userIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/workspaces.ts`](file:///d:/adios/lib/actions/workspaces.ts#L1761) | `1761` | `fetchTasksByWorkspace` | Unbounded `.in(..., targetWorkspaceIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/workspaces.ts`](file:///d:/adios/lib/actions/workspaces.ts#L1773) | `1773` | `fetchTasksByWorkspace` | Unbounded `.in(..., allowedWsIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/workspaces.ts`](file:///d:/adios/lib/actions/workspaces.ts#L1792) | `1792` | `fetchTasksByWorkspace` | Unbounded `.in(..., wsIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/workspaces.ts`](file:///d:/adios/lib/actions/workspaces.ts#L1810) | `1810` | `fetchTasksByWorkspace` | Unbounded `.in(..., taskIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/workspaces.ts`](file:///d:/adios/lib/actions/workspaces.ts#L1811) | `1811` | `fetchTasksByWorkspace` | Unbounded `.in(..., taskIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/workspaces.ts`](file:///d:/adios/lib/actions/workspaces.ts#L1812) | `1812` | `fetchTasksByWorkspace` | Unbounded `.in(..., taskIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/workspaces.ts`](file:///d:/adios/lib/actions/workspaces.ts#L1877) | `1877` | `fetchTasksByWorkspace` | Unbounded `.in(..., parentIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/workspaces.ts`](file:///d:/adios/lib/actions/workspaces.ts#L1929) | `1929` | `fetchAllTasks` | Unbounded `.in(..., visibleWsIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/workspaces.ts`](file:///d:/adios/lib/actions/workspaces.ts#L1946) | `1946` | `fetchAllTasks` | Unbounded `.in(..., wsIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/workspaces.ts`](file:///d:/adios/lib/actions/workspaces.ts#L1964) | `1964` | `fetchAllTasks` | Unbounded `.in(..., taskIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/workspaces.ts`](file:///d:/adios/lib/actions/workspaces.ts#L1965) | `1965` | `fetchAllTasks` | Unbounded `.in(..., taskIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/workspaces.ts`](file:///d:/adios/lib/actions/workspaces.ts#L1966) | `1966` | `fetchAllTasks` | Unbounded `.in(..., taskIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/workspaces.ts`](file:///d:/adios/lib/actions/workspaces.ts#L2147) | `2147` | `getDescendants` | Unbounded `.in(..., hierarchyIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/actions/workspace_reports.ts`](file:///d:/adios/lib/actions/workspace_reports.ts#L111) | `111` | `generateWorkspaceReportData` | Unbounded `.in(..., userIdsArray)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/budget/data.ts`](file:///d:/adios/lib/budget/data.ts#L179) | `179` | `getCategoryTotals` | Unbounded `.in(..., versionIds)` filter list could exceed database batch limit without chunking | **LOW** |
| [`lib/budget/export.ts`](file:///d:/adios/lib/budget/export.ts#L56) | `56` | `summaryExport` | Unbounded `.in(..., ids)` filter list could exceed database batch limit without chunking | **LOW** |
| [`app/api/migration/upload/route.ts`](file:///d:/adios/app/api/migration/upload/route.ts#L173) | `173` | `POST` | Unbounded `.in(..., taskIds)` filter list could exceed database batch limit without chunking | **LOW** |

### Category f: Read Action Scope Leakage (8 Items)

| File | Line | Function | Issue Description | Severity |
| :--- | :---: | :--- | :--- | :---: |
| [`lib/permissions/index.ts`](file:///d:/adios/lib/permissions/index.ts#L235) | `235` | `canAccessWorkspace` | WORKSPACES_VIEW grants access to ALL workspaces, exposing private workspaces to any non-member user holding the default view permission | **CRITICAL** |
| [`lib/actions/requirements.ts`](file:///d:/adios/lib/actions/requirements.ts#L221) | `221` | `fetchRequirements` | Queries requirements globally via supabaseAdmin without user authentication or department/workspace scoping | **HIGH** |
| [`lib/actions/vehicle.ts`](file:///d:/adios/lib/actions/vehicle.ts#L685) | `685` | `fetchVehiclesList` | Queries vehicles via supabaseAdmin without verifying VEHICLES_VIEW or role permission | **HIGH** |
| [`lib/actions/vehicle.ts`](file:///d:/adios/lib/actions/vehicle.ts#L3788) | `3788` | `fetchDriversList` | Fetches drivers list with supabaseAdmin without verifying FLEET_DISPATCH_VIEW or VEHICLES_VIEW | **HIGH** |
| [`lib/actions/vehicle.ts`](file:///d:/adios/lib/actions/vehicle.ts#L3814) | `3814` | `fetchTripsList` | Fetches trip records with supabaseAdmin without verifying FLEET_DISPATCH_VIEW or driver ownership | **HIGH** |
| [`lib/actions/vehicle.ts`](file:///d:/adios/lib/actions/vehicle.ts#L3948) | `3948` | `fetchMaintenanceList` | Fetches fleet maintenance records with supabaseAdmin without verifying FLEET_MAINTENANCE_VIEW | **HIGH** |
| [`lib/actions/vehicle.ts`](file:///d:/adios/lib/actions/vehicle.ts#L5112) | `5112` | `fetchVehiclePartsList` | Fetches inventory parts with supabaseAdmin without verifying FLEET_PARTS_VIEW | **HIGH** |
| [`lib/actions/dms-core.ts`](file:///d:/adios/lib/actions/dms-core.ts#L45) | `45` | `getFolderPermissions` | Relies on volatile in-memory Map (IN_MEMORY_FOLDER_PERMISSIONS) which desynchronizes across Node workers and allows unpermissioned folder traversal | **HIGH** |

### Category g: Frontend vs Server Authorization Mismatches (5 Items)

| File | Line | Function | Issue Description | Severity |
| :--- | :---: | :--- | :--- | :---: |
| [`components/workspaces/WorkspaceMasterTable.tsx`](file:///d:/adios/components/workspaces/WorkspaceMasterTable.tsx#L551) | `551` | `ActionContextMenu (Desktop)` | Share workspace/subworkspace action menu item conditionally hidden by frontend expression when user is not identified as direct node owner | **MEDIUM** |
| [`components/workspaces/WorkspaceMasterTable.tsx`](file:///d:/adios/components/workspaces/WorkspaceMasterTable.tsx#L759) | `759` | `ActionContextMenu (Mobile)` | Share workspace action missing on mobile view cards due to strict roleCode check and missing fallback trigger | **MEDIUM** |
| [`app/workspaces/WorkspacesClient.tsx`](file:///d:/adios/app/workspaces/WorkspacesClient.tsx#L2170) | `2170` | `EditWorkspaceModal` | Member selection checkboxes in workspace edit modal fail to register clicks or toggle selection due to parent event propagation and stale array state | **HIGH** |
| [`components/tasks/TaskExecutionController.tsx`](file:///d:/adios/components/tasks/TaskExecutionController.tsx#L142) | `142` | `TaskExecutionController` | Primary Assignee dropdown displayed to standard members who do not hold TASKS_MANAGE or workspace ownership | **MEDIUM** |
| [`app/users/page.tsx`](file:///d:/adios/app/users/page.tsx#L78) | `78` | `UserDirectoryPage` | Action buttons (Edit / Invite / Delete) gating previously relied on client-side composite flags rather than strict IAM permission tokens | **MEDIUM** |

### Category h: Dropdowns & Masters Empty Fallback Glitches (3 Items)

| File | Line | Function | Issue Description | Severity |
| :--- | :---: | :--- | :--- | :---: |
| [`lib/actions/workspaces.ts`](file:///d:/adios/lib/actions/workspaces.ts#L124) | `124` | `fetchStatusesByScope` | Task status query filters by non-existent workspace ID e3f8e8e8-e3e3-4e3e-a3e3-e3e3e3e3e3e3 resulting in empty status dropdown on Task creation (resolved with fallback) | **HIGH** |
| [`lib/actions/requirements.ts`](file:///d:/adios/lib/actions/requirements.ts#L546) | `546` | `fetchRequirementStatuses` | Queries status_master for scope_type=REQUIREMENT; returns empty array if error occurs or if statuses are scoped under a specific parent ID | **MEDIUM** |
| [`lib/actions/tasks.ts`](file:///d:/adios/lib/actions/tasks.ts#L600) | `600` | `fetchCustomFields` | Custom fields query only searches exact workspaceId and returns empty [] if workspace inherits organizational fields | **LOW** |

### Category i: Hard-coded Roles & Metadata Access Checks (4 Items)

| File | Line | Function | Issue Description | Severity |
| :--- | :---: | :--- | :--- | :---: |
| [`lib/budget/actions.ts`](file:///d:/adios/lib/budget/actions.ts#L24) | `24` | `getEffectiveClient` | Super Admin access check relies on user.app_metadata?.role === "SUPER_ADMIN" rather than database user_master/roles verification | **HIGH** |
| [`lib/budget/manual-actions.ts`](file:///d:/adios/lib/budget/manual-actions.ts#L22) | `22` | `getEffectiveClient` | Super Admin access check relies on user.app_metadata?.role === "SUPER_ADMIN" rather than database user_master/roles verification | **HIGH** |
| [`lib/budget/wizard-actions.ts`](file:///d:/adios/lib/budget/wizard-actions.ts#L21) | `21` | `getEffectiveClient` | Super Admin access check relies on user.app_metadata?.role === "SUPER_ADMIN" rather than database user_master/roles verification | **HIGH** |
| [`lib/budget/data.ts`](file:///d:/adios/lib/budget/data.ts#L23) | `23` | `getEffectiveClient` | Budget client escalation checks user.app_metadata?.role === "SUPER_ADMIN" | **HIGH** |

---

## 5. Proposed Phase 3 Remediation Roadmap

Remediation will proceed module-by-module in prioritized batches:
1. **Batch 1 (Security & Governance Core):**
   - Fix `canAccessWorkspace` in `lib/permissions/index.ts` (remove `WORKSPACES_VIEW` universal bypass; restrict to membership, ownership, or `WORKSPACES_MANAGE`).
   - Fix Budget metadata role checks in `lib/budget/actions.ts`, `manual-actions.ts`, `wizard-actions.ts`.
   - Eliminate RLS `supabaseAdmin` retry fallbacks in `lib/actions/designTracking.ts`.
2. **Batch 2 (Task & Workspace Management):**
   - Secure `assignUserToTasksBatch`, `createCustomField`, `updateTaskProgress`, `updateSprint`, `deleteTaskTemplate`.
   - Fix checkbox selection reactivity and event propagation in `WorkspacesClient.tsx`.
   - Restore "Share workspace" / "Share sub-workspace" action menu options on desktop and mobile in `WorkspaceMasterTable.tsx`.
3. **Batch 3 (Vehicle Desk):**
   - Add server session authentication and permission guards (`VEHICLES_VIEW`, `VEHICLES_UPDATE`, `FLEET_MAINTENANCE_MANAGE`, `FLEET_VENDORS_MANAGE`) across all 19 mutation actions and list queries.
4. **Batch 4 (Chandak Meet):**
   - Replace direct `supabaseAdmin` mutations with authenticated user client + server-side role/chairmanship verification.
5. **Batch 5 (DMS & Requirements Data Integrity):**
   - Persist DMS folder permissions in database rather than in-memory `Map`.
   - Address swallowed errors and enforce batch chunking for `.in()` queries exceeding 100 IDs.

Every module fix will be verified via `npx tsc --noEmit` and `npm run build` prior to commit.

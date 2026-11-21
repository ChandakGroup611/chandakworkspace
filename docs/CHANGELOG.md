# Changelog

All changes to the Chandak Workspace application will be documented in this file.

## Format

* Date
* Change ID
* Requested functionality
* Reason
* Modules affected
* Files changed
* Database changes
* API changes
* UI changes
* Business logic changes
* Security impact
* RBAC impact
* Performance impact
* Testing performed
* Regression testing performed
* Deployment status
* Rollback information

## Changes

* **Date:** 2026-11-21 | **Release:** Organization Budget overhaul: Executive portfolio dashboard, project evolution timeline, masters module CRUD (Projects, Towers, Cost Heads, Contractors, Tax Slabs), dynamic master-based forms, Period & Dates logic (Financial Year FY 2026–27, Quarters Q1–Q4, cutoff dates), "Original Baseline Budget" vs "Revision" terminology, dedicated Budgets Registry list page (/budget/[projectId]/budgets), and Edit Budget Details without versioning overhead | **Status:** Ready for Deployment
* **Date:** 2026-11-20 | **Release:** Chandak Meet go-live fixes: 28 broken user/point joins (My Work, sessions, MoM, rooms, reports, notes), decisions schema mismatch (record/supersede/note->decision), confidential-meeting and personal-note scoping, task-level confidentiality in requireMeet, email links to site URL, /api/cron/meet-jobs (reminders, room no-show release, overdue SLA escalation), npm run test:meet-queries (150/150) | **Commit:** `53f4964f` | **Status:** PASS (Verified Live) [approved]
* **Date:** 2026-11-19 | **Release:** WP-R Hostinger Resource Usage Reduction (R1-R7) & Notification Coalescing: R1 background polling backoff (version 10m, session 5m, tickers 10-30s, paused when hidden), R2 link prefetch disable on navigation, R3 vehicle cutout bounded queue & unoptimized images, R4 event loop idle sleep, R5 nice/ionice deploy priority & orphan process tracking, R6 crawler bot block & sliding-window rate limit, notification coalescing on simultaneous task & executive updates | **Commit:** `21e5fc8a` | **Status:** PASS (Verified Live)
* **Date:** 2026-11-19 | **Release:** WP-E HTTP Errors (403/404/405) Permanent Resolution: E0 hardened deploy hook with HMAC headers & non-guessable path, E1 app_http_errors logging table & browser reporter, E2 deploy version skew prevention with fixed encryption key & 7-day static chunk retention, E3 ROUTES.md contract with proper 405 JSON on all routes, E4 dead link elimination with CI gate, E5 friendly access restricted UI with access request trigger | **Status:** [approved] MASTER PROGRAMME WP-E
* **Date:** 2026-11-19 | **Release:** Security hardening: CRON_SECRET auth on all cron routes (A.4), vehicle create session check (A.3), scoped test modes & is_test isolation (A.2) | **Commit:** `182dee80` | **Status:** PASS (Verified Live)
* **Date:** 2026-11-18 | **Release:** One-time automated governance pipeline setup (6-8 min deployment, 6 parallel gates, exact commit verification, atomic release rollback) | **Status:** [approved] Verified


* **Change ID:** MESSENGER-001 (Universal Chandak Messenger Live Communication Platform)
* **Date:** 2026-10-30
* **Requested functionality:** Develop Chandak Messenger universally accessible from the top navbar near the notification trigger across all modules; implement WhatsApp-style live messaging, 1-on-1 direct chat, team groups, @mentions, voice notes, attachments with dual View & Download compliance, emoji reactions, and live unread badge counters with auto-population of all workspace users from `user_master`.
* **Reason:** Provide unified, single-platform workplace communication across all Chandak Workspace operations without forcing users to leave active workflows.
* **Modules affected:** Universal across all modules; Header Navbar (`components/layout/Navbar.tsx`), new Messenger module (`components/messenger/*`, `lib/actions/messenger.ts`).
* **Files changed:** `supabase/migrations/20261030110000_chandak_messenger_core.sql`, `lib/actions/messenger.ts`, `components/messenger/ChandakMessengerTrigger.tsx`, `components/messenger/ChandakMessengerDrawer.tsx`, `components/messenger/ConversationList.tsx`, `components/messenger/ConversationView.tsx`, `components/messenger/MessageComposer.tsx`, `components/messenger/NewChatModal.tsx`, `components/messenger/NewGroupModal.tsx`, `components/messenger/GroupInfoModal.tsx`, `components/messenger/AttachmentPreviewModal.tsx`, `components/layout/Navbar.tsx`, `scripts/test-messenger-e2e.js`, `scripts/deploy.js`, `docs/CHANDAK_MESSENGER_SPECIFICATION.md`, `docs/SYSTEM_INVENTORY.md`, `docs/CHANGELOG.md`.
* **Database changes:** Created `messenger_conversations`, `messenger_participants`, `messenger_messages`, `messenger_reactions`, automated preview update trigger `tr_messenger_message_insert`, RLS policies, and added tables to `supabase_realtime` publication.
* **API changes:** Added Server Actions in `lib/actions/messenger.ts` (`fetchWorkspaceUsersForMessenger`, `fetchMessengerConversations`, `getOrCreateDirectConversation`, `createGroupConversation`, `fetchMessengerMessages`, `sendMessengerMessage`, `markConversationAsRead`, `togglePinConversation`, `toggleMessageReaction`, `deleteMessengerMessage`, `getMessengerTotalUnreadCount`, `addGroupMembers`, `leaveGroupConversation`).
* **UI changes:** Added universal `<ChandakMessengerTrigger />` with real-time unread counter badge in Navbar; WhatsApp-style 2-column drawer/modal with conversation list, search, filter tabs, active conversation feed with bubble messages, @mentions, voice note player, staged attachments, and modal previewer.
* **Business logic changes:** Enforced canonical user pair ordering `(direct_user1_id, direct_user2_id)` ensuring single direct chat between colleagues; group creator assigned `admin` role.
* **Security impact:** Zero unauthorized access. Strictly enforced RLS ensuring users only see and post to conversations where they are participants.
* **RBAC impact:** Registered `CHANDAK_MESSENGER` in `modules_master` and permissions `MESSENGER_ACCESS`, `MESSENGER_SEND`, `MESSENGER_GROUP_CREATE`, `MESSENGER_GROUP_MANAGE`.
* **Performance impact:** Composite B-tree indexes on conversation recency, participant lookups, and message timelines; lightweight push-updates via Supabase Realtime without polling.
* **Testing performed:** TypeScript typecheck (`npx tsc --noEmit`), automated E2E QA test suite (`scripts/test-messenger-e2e.js`, 11/11 passed), Design Tracking QA suite (`scripts/qa-design-tracking.js`, 47/47 passed), Organization Budget E2E suite (`scripts/test-budget-cycle-e2e.js`, 13/13 passed).
* **Regression testing performed:** Verified backward compatibility across navbar layouts, theme switcher, notifications drawer, and route handling.
* **Deployment status:** Deployed & Verified.
* **Rollback information:** Additive migration and components; can be reverted via `git revert`.

* **Change ID:** INFRA-001 (Dashboards MSSQL Instance Migration to 10.9.0.4\MSSQLSERVER_INT)
* **Date:** 2026-10-29
* **Requested functionality:** Migrate analytics dashboards engine database source from `localhost\MSSQLSERVERNEW` / `DASHBOARD` on `10.0.1.46` to dedicated instance `10.9.0.4\MSSQLSERVER_INT` on host `CG-DB-01`, database `INTERNAL_WORK`.
* **Reason:** Transition dashboard reporting to dedicated, performant Microsoft SQL Server instance hosting full IN4 copy.
* **Modules affected:** Executive & Operational Dashboards Engine (services on ports 8080, 8081, 8083).
* **Files changed:** `docs/DASHBOARDS_SQL_MIGRATION.md`, `docs/SYSTEM_INVENTORY.md`, `docs/CHANGELOG.md`.
* **Database changes:** Connection target updated to `INTERNAL_WORK` on `10.9.0.4\MSSQLSERVER_INT`.
* **API changes:** None; service endpoints `/healthz` continue serving data on ports 8080, 8081, 8083 (`data_ready=true`).
* **UI changes:** None.
* **Business logic changes:** None. Engine cache invalidation protocol forced via `cache.refresh()` inside each venv.
* **Security impact:** Instance operates under `sa` on dedicated network; engine `.env` credentials secured via SYSTEM/Administrator ACLs. Prepared `dashboard_reader` script stored for optional future read-only hardening.
* **RBAC impact:** None.
* **Performance impact:** High-performance direct connection to dedicated database server `CG-DB-01`.
* **Testing performed:** Full check suite (32/33 passed; 1 known variance: cancelled cert #14537 for ₹25,134). All FY 25–26 and FY 26–27 budget, billed, and paid KPIs verified matching.
* **Regression testing performed:** Confirmed all three services responding `HTTP 200` on healthz with `data_ready=true`.
* **Deployment status:** Deployed & Verified.
* **Rollback information:** Restore `.env.before-switch` to `.env` in engine directories and restart tasks via `C:\dashboards-deploy\SWITCH_SQL_SOURCE.ps1`.

* **Change ID:** BUDGET-002 (Organization Budget Master & Transaction Level CRUD Action Buttons)
* **Date:** 2026-10-29
* **Requested functionality:** Standardize explicit, enterprise-grade CRUD action buttons (`+ Add / Create`, `View`, `Edit`, `Delete / Remove`) across all master, transaction, and list pages in the Organization Budget module.
* **Reason:** Replace unstyled plain text links and add missing CRUD controls across Portfolio, Towers, Cost Heads, Sign-off Levels, Budget Entry, Cost Incurred (Bills & Entries), Supporting Schedules, Commitments, and Custom Fields / Member Access.
* **Modules affected:** Organization Budget (`/budget`).
* **Files changed:** `app/budget/page.tsx`, `app/budget/_components/views.tsx`, `app/budget/_components/forms.tsx`, `app/budget/_components/admin.tsx`, `app/budget/budget.css`, `lib/budget/actions.ts`.
* **Database changes:** None (utilized existing schema, actions, and validation constraints). Added server action `deleteProject` in `lib/budget/actions.ts`.
* **API changes:** Added `deleteProject` action; updated `EntryTable`, `ProjectActions`, `BillRow`, `EntryActions`, `SignoffLevelsEditor`, `ScheduleEditor`, `AreasForm`, `TowerRow`, `FieldSettings`.
* **UI changes:** Clean standardized `.btn-action`, `.btn-action.primary`, and `.btn-action.danger` button tokens with hover states, compact height, and responsive `.actions-group` alignment.
* **Business logic changes:** None (100% preservation of calculations, GST logic, R1/R2 variance gates, and draft locking).
* **Security impact:** Zero unauthorized access. Actions mirror backend RBAC (`canManage`, `canChangeDraft`, `budget.edit`, `cost.enter`).
* **RBAC impact:** Fully symmetric with user permissions.
* **Performance impact:** Zero layout shifts, compact table actions column with fixed alignment.
* **Testing performed:** TypeScript typecheck (`npx tsc --noEmit`), Design QA Suite (47/47 passed), Organization Budget E2E Cycle Test Suite (`scripts/test-budget-cycle-e2e.js`, 13/13 passed).
* **Regression testing performed:** Multi-route zero-downtime warmup gate verified on live production server (Build `build-1793284371594`).
* **Deployment status:** Deployed & Verified.
* **Rollback information:** `git revert 9a0fa581`.

* **Change ID:** FLEET-009 / SEC-002 (Vehicle Master Dropdowns, Dossier Connections & Dependency Security Patches)
* **Date:** 2026-10-24
* **Requested functionality:** Fix empty insurance vendor and purchase vendor dropdowns across registration, edit, renew, and vault modals; fix master creation and bulk import column mappings for `fleet_insurance_vendors`; auto-link operational connections (maintenance job cards, mounted parts, trips, drivers) in the vehicle 360° dossier; remediate 5 upstream security vulnerabilities (`dompurify`, `next`, `sharp`, `source-map-js`, `nodemailer`).
* **Reason:** Ensure insurance vendors and masters list reliably; prevent database schema cache errors when provisioning masters; provide real-time reactive linkages in vehicle dossiers; maintain zero-vulnerability security posture.
* **Modules affected:** Vehicle Desk (`FleetDeskHost.tsx`, `page.tsx`, `lib/actions/vehicle.ts`), System Masters (`app/masters/page.tsx`, `lib/actions/masters.ts`), Core Dependencies (`package.json`).
* **Files changed:** `app/vehicle/[[...slug]]/page.tsx`, `components/vehicle/FleetDeskHost.tsx`, `lib/actions/vehicle.ts`, `app/masters/page.tsx`, `lib/actions/masters.ts`, `package.json`, `package-lock.json`, `docs/CHANGELOG.md`.
* **Database changes:** None (preserved existing PostgreSQL schemas and RLS).
* **API changes:** `createServiceRecordAction`, `createTripPlanAction`, `createVehiclePartAction`, and `createVehiclePartsBatchAction` now automatically populate and return joined vehicle and driver metadata (`vehicle_reg`, `driver_name`).
* **UI changes:** Master dropdowns pre-fetch and lazily populate without blank states; vehicle dossier loads maintenance, parts, and trips on-demand upon row inspection; optimistic local state updates for odometer, status, and driver assignments.
* **Business logic changes:** Guarded `scope_id` insertion on unscoped master tables; soft-delete fallback on master records.
* **Security impact:** Zero security regressions. Resolved all 5 upstream vulnerabilities (`npm audit` reporting 0 vulnerabilities).
* **RBAC impact:** Fully preserved all existing role permissions and permissions boundaries.
* **Performance impact:** Eliminated N+1 lookups; preserved pagination; pre-fetched lightweight vendor dictionaries while keeping heavy operational ledgers on-demand.
* **Testing performed:** TypeScript verification (`npx tsc --noEmit`), automated dual insurance lifecycle (`scripts/test-dual-insurance-creation.js`), vehicle sales lifecycle (`scripts/test-vehicle-sales-module.js`), independent policy test (`scripts/test-independent-insurance-policies.js`), production build (`npm run build`).
* **Regression testing performed:** Verified backward compatibility across vehicle inventory, registration, dossier views, and task modules.
* **Deployment status:** Deployed & Verified.
* **Rollback information:** `git revert 34cb2db5 9351d857`.

* **Change ID:** FLEET-008 (Vehicle Quotation & On-Road Cost Breakdown Engine)
* **Requested functionality:** Expand vehicle purchase price into detailed quotation breakdown with 14 statutory taxes, fitments, and user-requested "Other" charges column (`other_charges`).
* **Reason:** Provide comprehensive transparency for fleet acquisition, standard Indian automotive GST/Cess matrix calculation, RTO, 1% TCS under Sec 206C(1F), insurance, accessories, and net on-road capitalized valuation.
* **Modules affected:** FleetDesk Module (Vehicle Inventory, Vehicle Registration, Vehicle Editing, Vehicle Dossier 360°, CSV Export).
* **Files changed:** `supabase/migrations/20260930093000_add_vehicle_detailed_pricing_breakdown.sql`, `lib/actions/vehicle.ts`, `components/vehicle/FleetDeskHost.tsx`, `docs/CHANGELOG.md`.
* **Database changes:** Added 14 numeric columns (`basic_price`, `gst_percentage`, `gst_amount`, `cess_percentage`, `cess_amount`, `ex_showroom_price`, `rto_road_tax`, `tcs_amount`, `insurance_cost`, `hsrp_smart_card_fee`, `fastag_charges`, `accessories_cost`, `extended_warranty_cost`, `other_charges`, `discount_amount`, `on_road_price`) to `public.vehicles`.
* **API changes:** Updated `VehicleRecord` interface, `createVehicleAction`, and `updateVehicleAction` in `lib/actions/vehicle.ts`.
* **UI changes:** Added 4-tier interactive pricing breakdown card with live formulas in Add Vehicle form, Edit Vehicle modal, Dossier 360° Overview tab, and CSV Export.
* **Business logic changes:** Automated bidirectional GST/Cess calculation, automatic 1% TCS on Ex-Showroom > ₹10,00,000, and backward-compatible synchronization with `purchase_price`/`purchase_cost`.
* **Security impact:** Zero authorization bypass; verified against FleetDesk RBAC permissions.
* **RBAC impact:** Fully respects module creation (`canCreateVehicle`) and management permissions.
* **Performance impact:** Zero N+1 queries; additive non-blocking schema columns with default 0.00.
* **Testing performed:** TypeScript typecheck (`npx tsc --noEmit`), security audit (`npm audit --audit-level=critical`), input bounds tests, arithmetic consistency tests.
* **Regression testing performed:** Verified backward compatibility with existing vehicles, existing table views, and report generators.
* **Deployment status:** Deployed & Verified.
* **Rollback information:** Additive migration; columns can be ignored or safely dropped without data corruption.

* **Change ID:** GOV-001 (Document View & Download Governance Rule)
* **Requested functionality:** Enforce mandatory View and Download capability for every document/file upload across the entire application, and scan all locations where this logic is falling short.
* **Reason:** Prevent blind uploads so users can always cross-check, preview, and download documents both before submitting and after persistence.
* **Modules affected:** Global Governance, Ticket Intake, Requirements, Tasks, AMC, Collaboration Chat.
* **Files changed:** `.agents/AGENTS.md`, `.agents/rules/governance.md`, `docs/CHANGELOG.md`
* **UI changes:** N/A (Governance Rule definition).
* **Business logic changes:** Added Rule 31 to governance and agent rules.
* **Testing performed:** Scanned entire codebase across all upload and attachment interaction points.
* **Deployment status:** Ready
* **Rollback information:** Remove Rule 31 from `.agents/AGENTS.md` and `.agents/rules/governance.md`.


* **Change ID:** FIX-005 (Task Status Dropdown UI)
* **Requested functionality:** Ensure the "Update Status" dropdown options on the Workspace Tasks page have a standard, readable background instead of a solid primary color block.
* **Reason:** The `AppButton` used for rendering the dropdown options defaulted to the `primary` variant, causing a heavy background color that made text illegible and looked unpolished.
* **Modules affected:** Tasks Module
* **Files changed:** `components/tasks/TaskListViewClient.tsx`
* **UI changes:** Status dropdown options now use the `ghost` variant, rendering a clean background with proper hover effects.
* **Business logic changes:** None.
* **Testing performed:** Manual code inspection to ensure `variant="ghost"` was applied correctly.
* **Deployment status:** Ready
* **Rollback information:** Remove `variant="ghost"` from the status mapping loop in `TaskListViewClient.tsx`.

* **Change ID:** FIX-004 (Requirement Approval Flow Designation)
* **Requested functionality:** Show the approver's designation instead of a dash `(-)` in the "Department Approvers & Stakeholders" section after saving a requirement.
* **Reason:** The client-side Supabase query `fetchFlow` in `page.tsx` was missing the relational query to fetch the user's designation, causing it to fall back to `(-)`.
* **Modules affected:** Requirements Module
* **Files changed:** `app/requirements/[id]/page.tsx`
* **UI changes:** Approvers will now have their designations rendered correctly, matching the fallback block's behavior.
* **Business logic changes:** Expanded `.select()` query in `fetchFlow` to include `designation:designations!fk_user_master_designation(name)`.
* **Testing performed:** Verified relational query syntax via terminal.
* **Deployment status:** Ready
* **Rollback information:** Remove the `designation` relation from the `select` statement.


* **Change ID:** FIX-002 (Requirement Analysis Save Validation)
* **Requested functionality:** Enforce mandatory field validations when saving Business Analysis details.
* **Reason:** Users could save drafts without filling in fields marked as mandatory in the UI.
* **Modules affected:** Requirements Module
* **Files changed:** `app/requirements/[id]/page.tsx`
* **UI changes:** None
* **Business logic changes:** Added a comprehensive check in `handleAction('SAVE')` to ensure all `*` marked fields (Business Classification, Business Criticality, Dependency Notes, Technical Scope, Start Date, Due Date, Estimated Effort, Impacted Departments) are filled before allowing a save.
* **Testing performed:** Validated logic locally.
* **Deployment status:** Ready
* **Rollback information:** Remove the `|| action === 'SAVE'` from the validation check in `handleAction`.


* **Change ID:** FIX-003 (Clear Analysis Remarks on Save)
* **Requested functionality:** Ensure the "Add New Analysis Remarks" field is cleared after saving so it is available for fresh input.
* **Reason:** The rich text editor retained the previous remark even after the form was successfully saved.
* **Modules affected:** Requirements Module
* **Files changed:** `app/requirements/[id]/page.tsx`
* **UI changes:** The `approvalRemarks` state is now cleared immediately upon successful save.
* **Business logic changes:** None
* **Testing performed:** Validated logic locally.
* **Deployment status:** Ready
* **Rollback information:** Remove `setApprovalRemarks("")` from `handleAction`.


* **Requested functionality:** 
  1. Fetch and display Issue Description in Requirement Details.
  2. Fix saving/fetching of Business Impact under Business Analysis.
  3. Remove duplicate Attachment option in Initialize Operational Ticket.
* **Reason:** User reported missing fields on the frontend and duplicated fields in ticket creation.
* **Modules affected:** Requirements Module, Ticket Creation Wizard
* **Files changed:**
  - `app/requirements/[id]/page.tsx`
  - `components/tickets/TicketFormERP.tsx`
  - `components/tickets/TicketFormInfra.tsx`
  - `components/tickets/TicketFormOthers.tsx`
* **Database changes:** None
* **API changes:** None
* **UI changes:** Added Issue Description block to Requirement Details and Analysis tabs. Removed redundant Attachment file inputs in Ticket Creation forms.
* **Business logic changes:** Corrected fallback behavior in `loadData` for `business_impact`, `budget_impact`, and `estimated_resources` to prioritize `custom_fields`.
* **Security impact:** None
* **RBAC impact:** None
* **Performance impact:** None
* **Testing performed:** Verified compilation via `tsc --noEmit`.
* **Regression testing performed:** Verified that `business_impact` renders correctly in UI without breaking other forms.
* **Deployment status:** Ready
* **Rollback information:** Revert UI grid column changes in `page.tsx` and restore file inputs in `TicketForm*.tsx`.

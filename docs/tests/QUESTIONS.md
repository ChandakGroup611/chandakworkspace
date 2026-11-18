# Chandak Workspace — RBAC & Business Rules Question Registry (QUESTIONS.md)

**Document Version:** 1.0.0  
**Generated Date:** 2026-11-18  
**Status:** PENDING OWNER DECISION  
**Governing Standard:** Phase 1 Governance Protocol & Test Baseline Formulation  

---

## Executive Summary

Per the Phase 1 ground rules, no business rule or role assumption may be invented or enforced as a test assertion without explicit owner approval. The following 11 items have been removed from the active test case catalog and cataloged here for owner review and decision.

---

## Cataloged Questions & Decision Registry

### Q-001: Ticket Queue Visibility for STANDARD Users
- **Context:** In today's codebase, `app/tickets/page.tsx` displays tickets based on global permissions and department filters.
- **Question:** Under the module-wise RBAC model, does a user with role `STANDARD` in Tickets see:
  - Option A: Strictly tickets they created (`creator_id = authUser.id`) or are assigned to?
  - Option B: All tickets filed under their department?
  - Option C: All organization tickets (with action restrictions)?
- **Current Code Behavior:** Queries rely on `hasPermission("TICKETS_VIEW")` and department join filters.
- **Owner Decision:** `[PENDING]`

---

### Q-002: Ticket Reassignment Authority
- **Context:** Support agents handling tickets in `lib/actions/tickets.ts`.
- **Question:** Can a standard support agent reassign a ticket to a colleague, or is reassignment strictly restricted to department managers / ticket queue leads?
- **Owner Decision:** `[PENDING]`

---

### Q-003: Vehicle Decommissioning Constraints
- **Context:** Fleet vehicle lifecycle in `lib/actions/vehicle.ts`.
- **Question:** Should decommissioning or soft-deleting a vehicle be hard-blocked on the server if the vehicle has an active in-progress trip, or can fleet managers decommission/archive a vehicle with an audit warning?
- **Current Code Behavior:** `lib/actions/vehicle.ts` updates vehicle status to `INACTIVE` / `DECOMMISSIONED` without querying active trips in `fleet_trips`.
- **Owner Decision:** `[PENDING]`

---

### Q-004: Software AMC Contract Termination Constraints
- **Context:** Contract termination in `app/amc/page.tsx` and `lib/actions/amc.ts`.
- **Question:** Should terminating or deleting an AMC contract be hard-blocked on the server if un-cleared invoices or active renewal payment obligations exist?
- **Current Code Behavior:** Soft-deletes contract record directly without inspecting un-cleared vendor invoice lines.
- **Owner Decision:** `[PENDING]`

---

### Q-005: Good-For-Construction (GFC) Release Watermarking
- **Context:** Design drawing GFC release in `lib/actions/designTracking.ts`.
- **Question:** Does GFC release require automated server-side raster watermarking of the underlying PDF/DWG files, or is GFC status tracked strictly via metadata badges, status flags, and transmittal registers?
- **Current Code Behavior:** Sets `gfc_status = true`, `gfc_released_at = timestamp`, `gfc_released_by = userId` in `design_drawings` metadata; no direct byte manipulation of drawing files.
- **Owner Decision:** `[PENDING]`

---

### Q-006: Chandak Meet Room Conflict Enforcement
- **Context:** Meeting scheduling and room booking in `lib/actions/meet/meetings.ts`.
- **Question:** Does the system enforce a hard conflict rejection when two meetings book the same room for overlapping time slots, or does it display an overbooking warning allowing concurrent sessions?
- **Current Code Behavior:** Room booking records the reservation; visual schedule highlights overlaps without rejecting the mutation.
- **Owner Decision:** `[PENDING]`

---

### Q-007: DMS File Locking & Concurrent Modification Model
- **Context:** Document Management System in `lib/actions/dms-core.ts` (`app/design/[[...slug]]/page.tsx` route `/design/dms`).
- **Question:** Should DMS enforce single-user checkout locks (blocking concurrent edits), or should it support concurrent uploads with revision numbers (V1.0, V1.1, V2.0)?
- **Current Code Behavior:** `dms_documents` stores version history and indexing tags; strict lock/unlock state was handled via temporary in-memory map.
- **Owner Decision:** `[PENDING]`

---

### Q-008: Signed Minutes of Meeting (MoM) Generation
- **Context:** Concluded meeting MoM publication in `lib/actions/meet/mom.ts`.
- **Question:** Upon publishing an MoM, should the system generate a cryptographically signed/watermarked PDF file, or does it render the standardized exportable HTML/PDF meeting summary document?
- **Current Code Behavior:** MoM publishes and locks draft points; users can export PDF from live UI.
- **Owner Decision:** `[PENDING]`

---

### Q-009: Actor Self-Notification Suppression & Recipient Deduplication
- **Context:** Email and in-app notification engine in `lib/actions/email-config.ts` and event workers.
- **Question:** Should the notification engine automatically suppress dispatching email/push notifications to the actor who performed the action (e.g. task remark author), and coalesce recipient sets to guarantee zero duplicate emails?
- **Owner Decision:** `[PENDING]` (Parked from `TC-MAIL-006/007` and `TC-REGR-012`).

---

### Q-010: Scoped Module Administration Routes Architecture
- **Context:** Per-module admin screens for statuses, priorities, categories, and stages.
- **Question:** Today, ticket categories, AMC categories, and workspace statuses do not have dedicated sub-routes (e.g. `/tickets/admin/categories` does not exist; categories are in `/masters` or within entity drawers). In Phase 6, should new dedicated sub-routes be created under each module (e.g. `/tickets/settings`, `/workspaces/settings`), or should `/masters` and module host drawers remain the standard configuration surfaces?
- **Owner Decision:** `[PENDING]`

---

### Q-011: Requirement Backlog Formal Signoff State Machine
- **Context:** Requirements lifecycle in `app/requirements/approvals/page.tsx`.
- **Question:** What is the authoritative state machine for requirement specifications? Specifically:
  - Is editing priority/specs locked immediately upon submission to `IN_REVIEW`, or only upon `APPROVED` / `UAT` signoff?
  - Who can recall an approved requirement back to draft?
- **Owner Decision:** `[PENDING]`

# Architecture Guide: Design & Engineering Tracking Module

**Target Module**: `DESIGN_TRACKING`  
**Host Framework**: Next.js 16 (App Router + Turbopack)  
**Database**: Supabase PostgreSQL + Row Level Security (RLS)  
**State Architecture**: Server Actions + Optimistic Client State  

---

## 1. System Architecture Overview

The Design Tracking module operates as an autonomous, self-contained sub-system within the multi-module Chandak Workspace ecosystem.

```
┌─────────────────────────────────────────────────────────────┐
│                 Next.js Frontend Portal                     │
│               (/design/[[...slug]]/page.tsx)                │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│              DesignTrackingHost (Coordinator)               │
├───────────────┬─────────────────────────────┬───────────────┤
│ DrawingTable  │  Stage-Gate Approvals & GFC │  Consultants  │
└───────┬───────┴──────────────┬──────────────┴───────┬───────┘
        │                      │                      │
        ▼                      ▼                      ▼
┌─────────────────────────────────────────────────────────────┐
│             Server Actions Layer (lib/actions/design.ts)    │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Supabase PostgreSQL Backend                 │
│  - public.design_projects       - public.consultant_reviews │
│  - public.design_drawings       - public.gfc_releases       │
│  - public.drawing_revisions     - public.consultants        │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Database Schema Design

### 2.1 `design_projects`
Stores high-level Chandak residential and commercial developments.
- `id` (UUID / TEXT, PK)
- `code` (VARCHAR(50), UNIQUE) e.g., `CK-STELLA`, `CK-HIGHSAPE`
- `name` (VARCHAR(200)) e.g., `Chandak Stella`
- `location` (VARCHAR(200)) e.g., `Goregaon West, Mumbai`
- `architect_firm` (VARCHAR(200))
- `status` (VARCHAR(50)) DEFAULT `'ACTIVE'`

### 2.2 `design_drawings`
Core drawing ledger holding the primary drawing identity and latest state.
- `id` (TEXT, PK) e.g., `drw-01`
- `project_id` (TEXT, FK -> design_projects.id)
- `code` (VARCHAR(100), UNIQUE) e.g., `CK-CHD-ARC-L04-001`
- `title` (VARCHAR(300))
- `discipline` (VARCHAR(50)) e.g., `Architectural`, `Structural`, `MEP`, `Landscape`, `Interior`
- `current_revision` (VARCHAR(20)) e.g., `R3`
- `status` (VARCHAR(50)) e.g., `Under Review`, `Approved (GFC)`, `Revision Requested`, `Site Handed Over`
- `consultant_id` (TEXT)
- `file_url` (TEXT)
- `file_size` (VARCHAR(50))
- `submitted_date` (DATE)
- `approved_date` (DATE)

### 2.3 `drawing_revisions`
Audit trail of every iteration submitted for a drawing.
- `id` (TEXT, PK)
- `drawing_id` (TEXT, FK -> design_drawings.id)
- `revision_number` (VARCHAR(20)) e.g., `R0`, `R1`, `R2`
- `file_url` (TEXT)
- `file_size` (VARCHAR(50))
- `changes_summary` (TEXT)
- `submitted_by` (VARCHAR(150))
- `created_at` (TIMESTAMPTZ)

### 2.4 `consultant_reviews`
Stage-gate review comments and approvals logged by design managers.
- `id` (TEXT, PK)
- `drawing_id` (TEXT)
- `revision_id` (TEXT)
- `reviewer_name` (VARCHAR(150))
- `decision` (VARCHAR(50)) e.g., `APPROVED`, `REVISION_REQUIRED`, `REJECTED`
- `comments` (TEXT)
- `created_at` (TIMESTAMPTZ)

### 2.5 `gfc_releases`
Good For Construction site handover tracking.
- `id` (TEXT, PK)
- `drawing_id` (TEXT)
- `revision_number` (VARCHAR(20))
- `site_engineer_name` (VARCHAR(150))
- `contractor_firm` (VARCHAR(200))
- `handover_date` (DATE)
- `physical_copies_issued` (INTEGER)

---

## 3. Access Control & Permissions

Module access is governed through the `user_allowed_modules` database relationship where `module_code = 'DESIGN_TRACKING'`.

- **Super Admins (`SUPER_ADMIN`)**: Unrestricted access across all projects, drawing uploads, and GFC stamps.
- **Design Managers (`ROLE_ADMIN`)**: Ability to approve revisions, stamp drawings as GFC, and edit drawing metadata.
- **Engineers / Viewers (`ROLE_USER`)**: Read-only access to view active drawing registers and download GFC-stamped prints for construction site execution.

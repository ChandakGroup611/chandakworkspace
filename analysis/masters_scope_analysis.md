# Deep Analysis: Master Data Scope & Governance Architecture

This document provides a technical analysis of how the Enterprise Ticketing Command Center segregates and governs operational data across three primary scopes: **Infrastructure (INFRA)**, **Enterprise Software (ERP)**, and **General Operations (OTHERS)**.

---

## 1. Scope Segregation Strategy

The current architecture utilizes a **Shared-Schema, Partitioned-UI** approach. While most master tables are structurally identical, the application logic enforces scope boundaries during the intake and inspection phases.

### A. Infrastructure (INFRA) Scope
*   **Primary Anchor**: `assets` table.
*   **Classification**: Locked to `CAT_HARDWARE` and its dependent `ticket_subcategories`.
*   **Data Governance**:
    *   Dropdowns are department-bound (showing only assets assigned to the user's division).
    *   Failure to resolve a department triggers a "Global Asset View" fallback for administrative flexibility.
*   **Metadata**: Capture focuses on physical health, downtime windows, and hardware diagnostics.

### B. Enterprise Software (ERP) Scope
*   **Primary Anchor**: `software_systems`, `software_modules`, and `software_submodules`.
*   **Classification**: Locked to `CAT_SOFTWARE` and its dependent subcategories.
*   **Data Governance**:
    *   Three-tier cascading resolution: System -> Module -> Submodule.
    *   Dynamic "Requirement Engineering" block triggers based on `issue_types` (e.g., if code contains `REQ`).
*   **Metadata**: Focuses on business justification, technical specifications, and software logic branches.

### C. General Operations (OTHERS)
*   **Primary Anchor**: Universal `issue_types`.
*   **Classification**: Open to all categories not explicitly reserved for INFRA/ERP.
*   **Metadata**: Minimalist intake for miscellaneous support tasks and inquiries.

---

## 2. Current Implementation Constraints

During the "Deep Analysis," the following architectural observations were made:

| Constraint | Impact | Current Solution |
| :--- | :--- | :--- |
| **Missing Scope Column** | Master records (Categories) don't natively know if they belong to INFRA or ERP. | **UI-Side Filtering**: Hardcoded logic filters categories by `code` prefix (e.g., `CAT_HW_`). |
| **Universal State** | All tickets share the same `workflow_states` (Open, In Progress, Resolved). | **Module Tagging**: The `workflow_states` table uses a `module` column to distinguish between `tickets` and other future modules. |
| **FK Consistency** | Seeding scripts often fail if hardcoded UUIDs collide with auto-generated ones. | **Dynamic sub-queries**: New migrations use `SELECT id FROM ...` to resolve parent dependencies. |

---

## 3. Recommended Architectural Evolution

To reach "ServiceNow" parity, the following schema enhancements are proposed:

### Phase 1: Native Scope Governance
Add a `scope` column to `ticket_categories` and `issue_types` to allow the database to tell the UI what to show.
```sql
ALTER TABLE ticket_categories ADD COLUMN scope TEXT DEFAULT 'GENERAL'; -- 'INFRA', 'ERP', 'GENERAL'
ALTER TABLE issue_types ADD COLUMN scope TEXT DEFAULT 'GENERAL';
```

### Phase 2: SLA-by-Scope Mapping
Currently, SLAs are tied to `priorities`. In a more advanced model, a "P1" in INFRA might have a 15m target, while a "P1" in ERP (e.g., a feature request) might have a 4h target.
*   **Proposed**: Link SLAs to a (Scope + Priority) matrix rather than just Priority.

### Phase 3: Dynamic Attachment Policies
*   **INFRA**: Enforce "Photo Upload" for damaged hardware.
*   **ERP**: Enforce "Log Snippet" for software defects.

---

## 4. Conclusion
The current "Glass Intelligence" design system effectively masks the shared-table complexity from the user, providing a clean, workflow-driven experience. However, migrating the "Scope Logic" from the React layer into the Database Schema (via a dedicated `scope` column) will significantly improve maintainability and allow for dynamic, cross-departmental scaling without modifying frontend code.

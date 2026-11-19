# Live Data Changes Log (DATA_CHANGES.md)

**Master Programme Governance:** Section 4 Live Data Changes Protocol  
**Safety Mandate:** Every update must create a timestamped backup table, maintain additive/reversible migrations with down-migrations, and record explicit undo procedures.

---

## 2026-11-19: Master Programme WP2 (Items 2.6, 2.7, 2.8 & Decisions D4, D5)

### 1. Status Master Alignment (TASK Scope)
- **What:**
  - Cleared `scope_id` from legacy non-existent workspace ID (`e3f8e8e8-e3e3-4e3e-a3e3-e3e3e3e3e3e3`) to make TASK statuses globally accessible (Decision D5).
  - Set canonical `status_order` (1–12): open-type (`NEW`, `TO DO`) → in-progress (`WORK INPROGRESS`, `REPLIED`, `FOLLOW UP`) → hold (`HOLD`) → review (`NEED TO CHECK`) → non-terminal (`ACTION CANNOT BE DONE`, `ACTION NOT REQUIRED`) → closed (`CLOSED`, `RESOLVED`, `TASK COMPLETED`) (Decision D4).
  - Enforced single default status: `NEW` is `is_default = true`, all others `false`.
  - Configured reopen pointer: `WORK INPROGRESS` has `is_reopen = true`.
- **Why:** Resolve scope detachment preventing global tasks from loading valid statuses; enforce standard ordering and unambiguous default/reopen transitions.
- **Affected Row Count:** 12 rows in `status_master`.
- **Backup Table:** `public.backup_status_master_20261119` (12 rows).
- **Migration Script:** `supabase/migrations/20261119100000_wp2_task_status_integrity.sql`
- **How to Undo:**
  Run `supabase/migrations/20261119100000_wp2_task_status_integrity_down.sql` section 2:
  ```sql
  UPDATE public.status_master s
  SET scope_id = b.scope_id,
      status_order = b.status_order,
      is_default = b.is_default,
      is_reopen = b.is_reopen,
      updated_at = NOW()
  FROM public.backup_status_master_20261119 b
  WHERE s.id = b.id;
  ```

---

### 2. Task Pointer Remediation
- **What:** Updated 3 tasks pointing to deleted status `b74ee75a-7f62-4123-a101-32b6313de2a0` ("Task Completed", deleted on 17 Nov) to point to active closed status `3392636b-59ff-4d04-b103-55d2cb9c6b27` ("Closed").
- **Why:** Eliminates broken foreign references to deleted statuses while preserving terminal closed state (Decision D1).
- **Affected Row Count:** 3 rows in `tasks`.
- **Backup Table:** `public.backup_tasks_20261119` (3 rows).
- **Migration Script:** `supabase/migrations/20261119100000_wp2_task_status_integrity.sql`
- **How to Undo:**
  Run `supabase/migrations/20261119100000_wp2_task_status_integrity_down.sql` section 1:
  ```sql
  UPDATE public.tasks t
  SET status_id = b.status_id, updated_at = NOW()
  FROM public.backup_tasks_20261119 b
  WHERE t.id = b.id;
  ```

---

### 3. Default Status Alignment Across Scopes (Decision D5)
- **What:** Configured exactly one active, non-closed default status per scope:
  - `ERP`: `OPEN` (`ac064265-0cd6-4067-8d0c-dcfda392c9ef`, `is_default = true`)
  - `INFRA`: `NEW` (`d08004b3-17f8-4868-93c9-36a46211e406`, `is_default = true`)
  - `REQUIREMENT`: `REQ_REGISTRATION` (`c04655b2-a4d9-40ae-88d8-22d570e7ecb8`, `is_default = true`)
  - `TASK`: `NEW` (`e6a4e794-b694-45a1-a55d-4baaed5062f9`, `is_default = true`)
- **Why:** Enforce canonical default status resolution for create operations across all scopes, preventing missing or ambiguous defaults.
- **Affected Row Count:** 3 rows in `status_master`.
- **Backup Table:** `public.backup_status_master_defaults_20261119` (3 rows).
- **How to Undo:**
  ```sql
  UPDATE public.status_master s
  SET is_default = b.is_default, updated_at = NOW()
  FROM public.backup_status_master_defaults_20261119 b
  WHERE s.id = b.id;
  ```

---

## 2026-11-19: Master Programme WP3 (Item 3.5 & Decision D3, D6)

### 4. Ticket Defunct Status Remediation
- **What:** Remediated 3 ERP tickets (`INC-712996387`, `INC-711001785`, `INC-940960149`) that referenced an unregistered status ID (`122114fb-f0eb-416f-9ae9-92a182913764`) to point to the canonical active ERP default status `ac064265-0cd6-4067-8d0c-dcfda392c9ef` (`OPEN`).
- **Why:** Restores referential integrity between `tickets` and `status_master`.
- **Affected Row Count:** 3 rows in `tickets`.
- **Backup Table:** `public.backup_tickets_wp3_20261119` (3 rows).
- **Migration Script:** `supabase/migrations/20261119110000_wp3_tickets_requirements_integrity.sql`
- **How to Undo:**
  Run `supabase/migrations/20261119110000_wp3_tickets_requirements_integrity_down.sql` section 2:
  ```sql
  UPDATE public.tickets t
  SET status_id = b.status_id, updated_at = NOW()
  FROM public.backup_tickets_wp3_20261119 b
  WHERE t.id = b.id;
  ```

---

### 5. Requirement Status & Approval Status Synchronization
- **What:** Reconciled 4 requirements whose `approval_status` contradicted their `status_id`:
  - `ERP-REQ-2026-000010` & `INF-REQ-2026-000001`: approval_status was `'Approved'` while status was `'Requirement Registration'`. Updated `status_id` to `fc9894ae-cf69-4ccf-89aa-f421ad327e10` (`REQ_APPROVED`).
  - `ERP-REQ-2026-000012` & `ERP-REQ-2026-000013`: approval_status was `'Closed'` while status was `'Requirement Registration'`. Updated `status_id` to `411ec061-72a9-41dc-923a-0002788f3229` (`REQ_CLOSED`).
- **Why:** Enforces invariant that requirement status and approval status do not contradict each other.
- **Affected Row Count:** 4 rows in `requirements`.
- **Backup Table:** `public.backup_requirements_wp3_20261119` (4 rows).
- **Migration Script:** `supabase/migrations/20261119110000_wp3_tickets_requirements_integrity.sql`
- **How to Undo:**
  Run `supabase/migrations/20261119110000_wp3_tickets_requirements_integrity_down.sql` section 1:
  ```sql
  UPDATE public.requirements r
  SET status_id = b.status_id, updated_at = NOW()
  FROM public.backup_requirements_wp3_20261119 b
  WHERE r.id = b.id;
  ```



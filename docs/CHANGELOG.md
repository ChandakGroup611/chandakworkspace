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

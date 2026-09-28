# Technical Findings

This document tracks discovered problems or improvements that were found but not automatically modified.

## Format

* Finding:
* Severity: (CRITICAL / HIGH / MEDIUM / LOW / INFORMATIONAL)
* Affected module:
* Potential impact:
* Security impact:
* Performance impact:
* Recommended solution:
* Approval required:

## Findings

### FINDING-001: Missing View & Download Cross-Check on Ticket Intake Forms
* **Severity:** MEDIUM
* **Affected module:** Ticket Management (`components/tickets/TicketFormERP.tsx`, `TicketFormInfra.tsx`, `TicketFormOthers.tsx`)
* **Potential impact:** When users attach technical evidence/logs/screenshots before ticket submission, they only see the filename and a delete (`X`) button. Users cannot preview/view or download the selected file to verify if the correct document was attached before submitting.
* **Security impact:** Low risk of attaching unintended files due to inability to cross-check.
* **Performance impact:** None.
* **Recommended solution:** Add in-memory preview/view (`URL.createObjectURL(file)`) and download triggers to the technical evidence file selector in all three ticket forms.
* **Approval required:** Standard feature polish / governance alignment.

### FINDING-002: Missing View & Download on Requirement Amendment Dialog
* **Severity:** MEDIUM
* **Affected module:** Requirement Management (`app/requirements/[id]/page.tsx`)
* **Potential impact:** In the "Amend Requirement" modal, when an optional attachment is chosen, only `Selected: {amendmentFile.name}` is rendered without preview or download capability.
* **Security impact:** Low.
* **Performance impact:** None.
* **Recommended solution:** Render an interactive file chip with Eye (View) and Download icons for the staged amendment file.
* **Approval required:** Standard feature polish / governance alignment.

### FINDING-003: Single Conflated "Download/View" Action in AMC Attachments Tab
* **Severity:** LOW
* **Affected module:** AMC Management (`components/amc/AMCAttachmentsTab.tsx`)
* **Potential impact:** The table action only provides a single download icon button that executes `window.open(file_url, '_blank')` instead of distinct View (open preview) and Download (direct download trigger) actions. Pre-upload file staging also lacks preview.
* **Security impact:** None.
* **Performance impact:** None.
* **Recommended solution:** Separate the table action into dedicated View and Download buttons, and add staged file preview before clicking "Upload Document".
* **Approval required:** Standard feature polish / governance alignment.

### FINDING-004: Missing Pre-Send File Preview in Ticket Realtime Chat
* **Severity:** LOW
* **Affected module:** Collaboration Chat (`components/tickets/TicketRealtimeChat.tsx`)
* **Potential impact:** When users pick files via the paperclip before sending a message, selected files are not rendered above the input bar (unlike `TaskRealtimeChat.tsx`), giving no visual indicator of what is about to be sent.
* **Security impact:** None.
* **Performance impact:** None.
* **Recommended solution:** Add pre-send file chips with filename, file size, View preview, and remove button above the chat input box.
* **Approval required:** Standard feature polish / governance alignment.

### FINDING-005: Selective View (Eye) Restriction on Non-Image Documents in Vehicle Desk
* **Severity:** MEDIUM
* **Affected module:** Vehicle & Fleet Desk (`components/vehicle/FleetDeskHost.tsx`)
* **Potential impact:** In Spare Parts & Mounted Assets attachment lists (line 15165) and Chauffeur / Driver documents view modals (line 19245), the `Eye` (View / Preview) button is conditionally restricted with `{att.file_type?.startsWith("image/") && (`, preventing users from opening the in-app document previewer for PDF invoices, warranty cards, driver licenses, and verification documents even though the preview modal supports PDF iframes and document viewers.
* **Security impact:** None.
* **Performance impact:** None.
* **Recommended solution:** Remove the image-only conditional restriction in lines 15165 and 19245 of `FleetDeskHost.tsx` so all document types (PDFs, docs, images) can trigger the in-app preview modal with full View and Download options.
* **Approval required:** Standard feature polish / governance alignment.


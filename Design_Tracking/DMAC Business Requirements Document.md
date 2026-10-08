# DMAC Business Requirements Document

Oct 7, 2026 · @it.suppot@chandakgroup.com

## 1. Document control

| Item | Detail |
| --- | --- |
| Document | Business Requirements Document (BRD), DMAC |
| Version | 0.1, draft for review |
| Organisation | Chandak Group, IT |
| Prepared by | IT Support with Claude |
| Reviewers | Design heads, Engineering head, IT head |
| References | [dMACQ DMS review](https://claude.ai/artifact/QHzG9fmYK4wpWQR6hxkC9v) · [Drawing Approval Tracker prototype](https://claude.ai/artifact/CjFWBevBCrSe4sMvu9mPyV) · dMACQ DMS 7.0 Admin Guide (uploaded) |

## 2. Executive summary

DMAC is Chandak Group's in-house document management system. It does everything the vendor product dMACQ DMS 7.0 does, and adds design drawing review and approval, live dashboards and advanced features such as versions, audit trail, markups and AI-assisted indexing.

Every drawing is filed by project, building, floor and department. Each pass between Design and Engineering is recorded as a numbered revision with its comments, so anyone can see who holds a drawing, what changed and how long each side took.

The document core matches the vendor product dMACQ DMS 7.0: folders, document types, custom fields, master data, layered permissions and search. DMAC adds what dMACQ lacks: multi-step approval, revision history, an audit trail, markups, revision compare and live dashboards.

The interface is enterprise-grade and visual first. It uses colour-coded status, icons and grids, with minimal text on screen.

## 3. Business problem and objectives

Today a drawing goes from Design to Engineering, comes back with changes, and repeats until it is approved. A G+10 building generates dozens of these loops at once, one per floor per department. Nobody can see at a glance which drawings are stuck, with whom, or for how long.

**Problems to solve**

- No single place shows the current status of every drawing
- Revisions and comments are scattered across email, paper and shared drives
- Delays are found late because nobody tracks how long each side holds a drawing
- Site teams risk building from a superseded revision
- No audit trail of who approved what and when

**Objectives** (targets proposed, to be confirmed by management)

| # | Objective | Measure | Target |
| --- | --- | --- | --- |
| O1 | One live status for every drawing | Drawings tracked in DMAC | 100% of new projects from go-live |
| O2 | Faster review cycles | Average days per review round | Down 30% within 6 months |
| O3 | Fewer rounds per drawing | Average rounds to approval | Below 2.0 |
| O4 | No superseded drawings on site | Site issues from old revisions | Zero |
| O5 | Full traceability | Actions with an audit record | 100% |

## 4. Scope

**In scope**

- Full document management: workspaces, folders, document types, custom fields, master tables, upload and indexing, viewer, document actions, bulk actions, search, approval, automation (sections 8.6 to 8.21)
- Drawing review and approval across projects, buildings, floors and departments (sections 8.1 to 8.5)
- Drawing register, revisions, comments, markups and transmittals
- Live dashboards and reports on documents, approvals, delays and turnaround
- Users, roles, six permission layers, Active Directory login, audit trail
- Notifications by email and in-app, with escalation
- Web application for desktop, responsive for tablet and phone

**Out of scope for this release**

- Authoring or editing CAD drawings (DMAC stores and reviews them; AutoCAD stays the authoring tool)
- Native mobile apps (the web app is responsive)
- Project scheduling, costing and procurement
- Migration of historical drawings (planned as a separate exercise)

## 5. Stakeholders and user roles

| Role | Who | Main actions in DMAC |
| --- | --- | --- |
| Management | Directors, project heads | View portfolio dashboards and delay reports |
| Super administrator | IT | Full access to every workspace; users, roles, permissions, settings, backups |
| Workspace manager | One or two per group company | Set up folders, document types, fields and master tables in their workspace |
| Project manager | One per project | Set up project, buildings, floors; plan the drawing register; chase delays |
| Design submitter | Architecture, Structural, Plumbing, Electrical, HVAC, Fire teams | Upload drawings, answer comments, resubmit revisions |
| Engineering reviewer | Internal Engineering team | Review, mark up, comment, return or approve |
| External consultant | Structural, MEP or fire consultants (invited) | Review assigned drawings only, through restricted accounts |
| Approver | Engineering head, department heads, records team | Final drawing approval and issue; approve or reject documents in approval-controlled folders |
| Document user | Staff in Accounts, HR, Purchase, Legal and other departments | Upload, index, search, view, download and email documents within their rights |
| Document controller | Records team | Manage register, transmittals, bulk uploads, Excel indexing, recycle bin |
| Site user | Site engineers, contractors | View and download latest approved drawings only |

## 6. Assumptions and defaults chosen

These defaults were chosen where answers are still pending. Each one is configurable, so a different answer changes settings, not the design.

| Topic | Default chosen | Configurable |
| --- | --- | --- |
| Workspaces | One per group company or division | Yes |
| Document approval | On by default for new folders, as in dMACQ; folders can be set to publish at once | Yes, per folder |
| Reviewers | Confirmed: internal Engineering and outside consultants. Consultants on a project get restricted accounts; one-off reviews use secure email-bound share links (8.23) | Yes, per project |
| Approval codes | A Approved · B Approved with comments · C Revise and resubmit · D Rejected | Yes, codes and labels |
| Drawings per floor | Many drawings per floor per department; the dashboard rolls them up per floor and department | n/a |
| Review target | 5 working days for Engineering | Yes, per project and department |
| Revision target | 7 working days for Design | Yes, per project and department |
| Parallel review | One lead reviewer, with optional parallel reviewers whose comments merge into one return | Yes |
| Hosting | On-premises Linux server in the Chandak Group data centre | Cloud possible |
| Login | Microsoft Active Directory / Entra ID single sign-on, plus local accounts for consultants | Yes |
| File types | All formats in FR-190; DWG, PDF, Office and images first | Yes |
| Language | English interface | Hindi or Marathi labels later |
| Existing dMACQ data | Not migrated in release 1 (Chandak Group's dMACQ usage still to be confirmed) | n/a |

## 7. To-be process: the drawing review cycle

&#91;embedded content: drawing review cycle · 5 steps, 1 decision, 1 loop\]

Each pass round the loop creates a new revision, so the history of every drawing stays complete.

| Code | Meaning | Next step | Holder |
| --- | --- | --- | --- |
| A | Approved | Goes to approver, then issue | Approver |
| B | Approved with comments | Goes to approver; comments carried into the next revision | Approver |
| C | Revise and resubmit | Back to Design for a new revision | Design |
| D | Rejected | Back to Design for redesign | Design |

## 8. Functional requirements

Priority: **Must** = release 1, **Should** = release 2, **Could** = release 3.

**Part A (8.1 to 8.5)** covers drawing review and approval, which dMACQ does not offer. **Part B (8.6 to 8.21)** covers the full document management core: everything dMACQ DMS 7.0 does, plus the improvements marked *Improved* or *New*. **8.22** covers security and administration, and **8.23** covers secure sharing with outside consultants.

### Part A: Drawing review and approval

### 8.1 Project structure and drawing register

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-01 | Create projects, buildings or towers, and floors (basement, ground, 1 to N, terrace) from a template | Must |
| FR-02 | Define departments per project, each with a design owner and an engineering reviewer | Must |
| FR-03 | Plan the drawing register: drawing number, title, floor, department, planned submission date | Must |
| FR-04 | Auto-generate drawing numbers from a pattern, e.g. TA-STR-F03-01 | Must |
| FR-05 | Import and export the register from Excel, with a row-level error report | Must |
| FR-06 | Clone the structure and register from an existing project | Should |

### 8.2 Submission and revisions

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-10 | Submit one or many drawings in a single transmittal, drag and drop | Must |
| FR-11 | Each submission creates a new revision (R0, R1, R2...); earlier revisions are kept read-only and stamped Superseded | Must |
| FR-12 | Design must answer every open comment before a resubmission is accepted | Must |
| FR-13 | Duplicate check by file checksum; any filename allowed, stored by internal ID | Must |
| FR-14 | Auto-fill drawing number, floor and department from the filename pattern | Should |
| FR-15 | Bulk submission from a watched network folder | Could |

### 8.3 Review, markup and comments

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-20 | View PDF, DWG, DXF, DWF, Office and image files in the browser, no plug-ins | Must |
| FR-21 | Mark up with clouds, arrows, text, highlights and measurements; each markup links to a numbered comment | Must |
| FR-22 | Comments carry a category (design, coordination, code compliance, drafting) and a severity | Must |
| FR-23 | Return with code A, B, C or D and a mandatory remark | Must |
| FR-24 | Overlay or side-by-side compare of any two revisions, with changes highlighted | Should |
| FR-25 | Parallel review by several reviewers, merged into one return | Should |
| FR-26 | Comment response sheet exported to Excel and PDF | Must |

### 8.4 Approval and issue

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-30 | Configurable approval chain per project: reviewer, then approver, with optional extra steps | Must |
| FR-31 | Issue for construction: only the latest approved revision, with an IFC stamp and QR code on every sheet | Must |
| FR-32 | QR scan on site shows whether the printed sheet is still the latest approved revision | Should |
| FR-33 | Delegate approvals during leave, with dates | Should |
| FR-34 | Digital signature on approval | Could |

### 8.5 Tracking, notifications and escalation

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-40 | Each drawing shows who holds it and for how many days | Must |
| FR-41 | In-app and email notifications on submit, return, approval and issue | Must |
| FR-42 | Reminder before the target date; escalation to the department head when overdue | Must |
| FR-43 | Daily digest per user of pending items | Should |
| FR-44 | WhatsApp notifications through the company's business account | Could |

### Part B: Document management core

Column *vs dMACQ*: **Same** = matches dMACQ DMS 7.0, **Improved** = does more than dMACQ, **New** = not in dMACQ.

### 8.6 Workspaces, users, groups and roles

| ID | Requirement | vs dMACQ | Priority |
| --- | --- | --- | --- |
| FR-100 | Workspaces (dMACQ "Deal Rooms") separate folders, document types, fields, masters and users, e.g. one per group company or division | Same | Must |
| FR-101 | Users who belong to several workspaces pick one after login and can switch from the top bar without logging out | Improved | Must |
| FR-102 | Create users one at a time, several in a grid, or in bulk from an Excel or CSV file with preview, validation and a row-level error report | Improved | Must |
| FR-103 | User attributes: name, unique username and email, login type (Active Directory or local), groups, workspaces, status, access start and end date-time | Same | Must |
| FR-104 | Inactive users and users outside their access window cannot log in | Same | Must |
| FR-105 | Copy folder access and master table rights from another user when creating or editing a user | Same | Should |
| FR-106 | Administrator can force a password change; users can reset a forgotten password by email | Same | Must |
| FR-107 | Password policy: 8 to 15 characters, upper case, lower case, digit and symbol, expiry days, live checker while typing | Same | Must |
| FR-108 | Several sessions per user allowed, with a list of active sessions and remote sign-out (dMACQ allowed one session per username) | Improved | Should |
| FR-109 | Profile: name, photo, email, page size for lists; view my own rights across all layers | Same | Must |
| FR-110 | Built-in groups: Super Administrators, Workspace Managers (dMACQ "Deal Managers"), Approvers (dMACQ "QC Approvers"), Users; custom groups unlimited | Same | Must |
| FR-111 | Group rights matrix: for every module, allow or deny View, Create, Modify, Delete, Purge and Export; new groups start with everything denied | Same | Must |
| FR-112 | Copy rights from another group when creating or editing a group; a group with members cannot be deleted | Same | Must |
| FR-113 | Built-in super administrator account is fixed: active, all workspaces, cannot be demoted | Same | Must |

### 8.7 Permission layers

An action is allowed only when every layer allows it. Checks run on the server for every request.

| ID | Requirement | vs dMACQ | Priority |
| --- | --- | --- | --- |
| FR-120 | **Layer 1, role:** module and button rights from the group rights matrix | Same | Must |
| FR-121 | **Layer 2, workspace:** users enter only workspaces assigned to them; assign in bulk by group with a two-list picker | Same | Must |
| FR-122 | **Layer 3, folder:** each folder visible or hidden per user and per group; a hidden folder hides its documents from upload, view, search, download and print | Same | Must |
| FR-123 | Folder access inherits from the parent folder by default, with override per folder (dMACQ set each folder separately) | Improved | Must |
| FR-124 | **Layer 4, document type:** per group, allow Add, View, Print, Edit fields, Delete, Download, Email, and Private View (only the uploader and administrators see the document) | Same | Must |
| FR-125 | **Layer 5, field:** each custom field and master field can be shown in lists and offered in search, per group | Same | Must |
| FR-126 | **Layer 6, master table:** per user or group, rights to create tables; view, modify, delete, export each table; add, edit, delete its rows; view its reports | Same | Must |
| FR-127 | Rights viewer: administrators see a user's effective access on a folder tree, per workspace, in one screen | Same | Must |
| FR-128 | "Why can't I see this?" checker: administrator picks a user and a document and sees which layer blocks it | New | Should |

### 8.8 Folders (dMACQ "Categories")

| ID | Requirement | vs dMACQ | Priority |
| --- | --- | --- | --- |
| FR-130 | Create, rename and nest folders to any depth inside a workspace | Same | Must |
| FR-131 | Browse by tiles of child folders and a breadcrumb path; open a full tree view showing only folders the user may see | Same | Must |
| FR-132 | Copy settings from another folder when creating one: linked document types, fields, master tables, approval setting (not access rights) | Same | Must |
| FR-133 | Mark folders as favourites; they appear on the home dashboard | Same | Should |
| FR-134 | A folder with documents or sub-folders cannot be deleted; empty folders can be deleted singly or in bulk | Same | Must |
| FR-135 | Move a folder with its contents to another parent, keeping access rules | New | Should |
| FR-136 | Folder templates: create a standard folder tree for a new project or company in one step | New | Should |

### 8.9 Document types (dMACQ "Doc Sets")

| ID | Requirement | vs dMACQ | Priority |
| --- | --- | --- | --- |
| FR-140 | A global library holds every document type (e.g. Invoice, Purchase Order, Resume, Drawing) with a description | Same | Must |
| FR-141 | Types are grouped into sets for display (e.g. HR Documents, Accounts Documents) | Same | Must |
| FR-142 | Every document carries exactly one type; choosing a type is mandatory on upload | Same | Must |
| FR-143 | A type in use cannot be removed from a folder; a type linked to a folder cannot be removed from its set; a type in a set cannot be deleted | Same | Must |
| FR-144 | A type may belong to more than one set (dMACQ allowed one set per workspace) | Improved | Could |

### 8.10 Custom fields (dMACQ "Index Groups")

| ID | Requirement | vs dMACQ | Priority |
| --- | --- | --- | --- |
| FR-150 | Field groups with a name and fields typed in by the uploader | Same | Must |
| FR-151 | Field types: text, number, date, dropdown (dMACQ), plus multi-select, yes/no, user, currency (INR) and long text | Improved | Must |
| FR-152 | Field settings: mandatory, default value, validation pattern, help tooltip | Improved | Must |
| FR-153 | Deleting a field or group archives it and keeps all stored values; values can be restored (dMACQ deleted values permanently) | Improved | Must |
| FR-154 | Due-date report for any date field: documents due today, overdue and upcoming, as a table and bar chart | Same | Should |

### 8.11 Master tables (dMACQ "Index Masters")

| ID | Requirement | vs dMACQ | Priority |
| --- | --- | --- | --- |
| FR-160 | Master tables (e.g. Employees, Vendors, Purchase Orders, Projects) whose rows are tagged to documents | Same | Must |
| FR-161 | Field types: text, number, alphanumeric, long text, date, email, dropdown | Same | Must |
| FR-162 | Field flags: required, unique (one key field per table), duplicates allowed, auto-number with a prefix | Same | Must |
| FR-163 | Create fields one at a time, several in a grid, or from an Excel file | Same | Should |
| FR-164 | Add, edit and delete rows; edit a value inline by clicking it; a row tagged to any document cannot be deleted | Same | Must |
| FR-165 | Import rows from Excel or CSV: new rows added, existing rows updated by the key field, with preview and a row-level error report | Improved | Must |
| FR-166 | Scheduled sync from ERP, HRMS or a watched folder, with a job history screen | Improved | Should |
| FR-167 | Search rows with conditions (AND / OR, ranges, multi-value); choose visible columns; star favourite fields | Same | Must |
| FR-168 | Each row shows how many documents are tagged to it and lists them; upload documents straight against a row | Same | Must |
| FR-169 | Mark master tables as favourites, with a quick "add row" button on the home dashboard | Same | Could |

### 8.12 Linking folders to types, fields and masters

| ID | Requirement | vs dMACQ | Priority |
| --- | --- | --- | --- |
| FR-170 | Each folder is linked to one or more document types (at least one), any number of field groups and any number of master tables | Same | Must |
| FR-171 | Upload screens, list columns and search filters in a folder show only what is linked to it | Same | Must |
| FR-172 | Sub-folders inherit the parent's links by default, with override | New | Should |

### 8.13 Upload and indexing

| ID | Requirement | vs dMACQ | Priority |
| --- | --- | --- | --- |
| FR-180 | Upload wizard: pick folder, pick document type per file, drag and drop many files | Same | Must |
| FR-181 | Three indexing modes: no indexing (fill later), one set of values for all files, different values per file in a split screen | Same | Must |
| FR-182 | Tag a master row by searching any of its fields, with an exact-match indicator; add a new master row inline if it does not exist | Same | Must |
| FR-183 | Upload from a master row: open the row, pick folder and type, attach files | Same | Should |
| FR-184 | Any filename and any characters allowed; files stored by internal ID; duplicates detected by checksum with a warning (dMACQ banned duplicate names and 26 characters) | Improved | Must |
| FR-185 | New documents flagged for 24 hours in lists | Same | Could |
| FR-186 | Uploading a file to an existing document creates a new version; earlier versions stay viewable and restorable | New | Must |
| FR-187 | Check out a document to edit offline and check it back in, with the lock shown to others | New | Should |
| FR-188 | Upload size up to 2 GB per file, resumable on a weak connection | New | Should |

### 8.14 Viewer and formats

| ID | Requirement | vs dMACQ | Priority |
| --- | --- | --- | --- |
| FR-190 | Browser viewer, no plug-ins, for: TXT, DOC, DOCX, RTF, XLS, XLSX, ODS, CSV, PPT, PPTX, PDF, BMP, GIF, JPG, PNG, TIF, RAW, CDR, DWG, DWF, DXF, MP3, OGG, WAV, 3GP, AVI, MOV, MP4, MPEG, WEBM, ZIP, RAR, MSG, EML, MPP, MHT | Same | Must for Office, PDF, images, DWG; Should for the rest |
| FR-191 | Office files are converted for viewing in the background; the original is always what downloads | Same | Must |
| FR-192 | Viewer tools: zoom, rotate, page thumbnails, search in text, full screen | Improved | Must |
| FR-193 | Dynamic watermark (user, date, time) on view, print and download, set per document type | New | Should |
| FR-194 | Annotations on any PDF or image, kept per version | New | Should |

### 8.15 Document actions

| ID | Requirement | vs dMACQ | Priority |
| --- | --- | --- | --- |
| FR-200 | Action menu per document: favourite, preview, properties, edit, re-index, delete, download, OCR text, approval comments, links | Same | Must |
| FR-201 | Properties: ID, name, type, size, document type, host folder, extra folders, uploader, approval status, upload date, versions | Improved | Must |
| FR-202 | Edit name, document type, extra folders, field values and master tags; re-index side by side with the viewer | Same | Must |
| FR-203 | Delete moves to the recycle bin; administrators restore or purge; purge requires a reason and is audited | Improved | Must |
| FR-204 | Download the file, or the file plus its metadata as a ZIP with an Excel sheet; optional rename by the folder's pattern | Same | Must |
| FR-205 | Link related documents ("virtual stapling"), one-way or two-way; open, preview and unlink from the main document | Improved | Should |
| FR-206 | Share with an outside person through a secure, email-bound, expiring, encrypted link (full rules in 8.23) | New | Should |
| FR-207 | Activity tab per document: every view, download, change and approval with person and time | New | Must |

### 8.16 Document lists, views and bulk actions

| ID | Requirement | vs dMACQ | Priority |
| --- | --- | --- | --- |
| FR-210 | Default list columns: ID, name, size, upload date; column picker for any property, custom field or master field | Same | Must |
| FR-211 | Save named views per folder; set one as the default; share a view with a group; rename a saved view | Improved | Should |
| FR-212 | Quick filters: all, approved, unapproved, rejected, indexed, unindexed, fields only, masters only | Same | Must |
| FR-213 | Bulk actions on selected documents: file in more folders, move folder, re-index, delete, bulk download (with or without metadata), export list (XLSX, PDF, CSV), print list, email links or files, auto-rename | Same | Must |
| FR-214 | Excel indexing: export selected documents' fields to Excel, fill in, import back matched by document ID, with history of each export and import | Same | Should |
| FR-215 | Moving to a folder without the same fields keeps the values and flags them, instead of dropping them (dMACQ lost them) | Improved | Must |
| FR-216 | Bulk edit one field across selected documents in a single step | New | Should |

### 8.17 Search

| ID | Requirement | vs dMACQ | Priority |
| --- | --- | --- | --- |
| FR-220 | Folder search: up to 10 conditions on properties, document types, custom fields and master fields, joined by AND / OR; type-ahead after 3 letters; ranges for numbers and dates | Same | Must |
| FR-221 | Folder search includes sub-folders by default, with a switch to limit it to the current folder (dMACQ searched only the current folder) | Improved | Must |
| FR-222 | Global search across folders with filters: folder, text inside documents, name, file type, upload date, uploader, document type, any field | Same | Must |
| FR-223 | Operators: contains, equals, less than, greater than, at most, at least, between; several values per field | Same | Must |
| FR-224 | One search bar in the top bar, with instant suggestions for documents, drawings, folders and master rows | New | Must |
| FR-225 | Text inside Word, Excel and PDF files is searchable; scanned files are read by OCR (English, Hindi, Marathi) included as standard (a paid add-on in dMACQ) | Improved | Should |
| FR-226 | Results show file details on demand, can be filtered further, and support bulk actions (export, bulk download, delete, print) | Same | Must |
| FR-227 | Saved searches, renamable and shareable with a group, with the conditions visible | Improved | Should |

### 8.18 Quality control approval

| ID | Requirement | vs dMACQ | Priority |
| --- | --- | --- | --- |
| FR-230 | Approval on or off per folder; new folders require approval by default; "pre-approved" folders publish at once | Same | Must |
| FR-231 | Until approved, a document is visible only to its uploader and approvers | Same | Must |
| FR-232 | Statuses: unapproved, approved, rejected; a comment is mandatory on every decision | Same | Must |
| FR-233 | Approve or reject one document, a selection, or every document in a folder | Same | Must |
| FR-234 | Approver queue across all folders, with counts on the home dashboard | New | Must |
| FR-235 | Multi-level approval chains per folder or document type (e.g. checker, then approver), using the same engine as drawing review | New | Should |
| FR-236 | Rejected documents can be corrected and resubmitted, keeping the comment history | Improved | Must |

### 8.19 Automation and intelligent features

| ID | Requirement | vs dMACQ | Priority |
| --- | --- | --- | --- |
| FR-240 | Index from filename: per folder, split the name by \_ - or . into up to 5 parts and map each to document type, a field, a master field, or ignore | Same | Should |
| FR-241 | Index from folder names: import a folder tree up to 5 levels deep, mapping each level to document type, a field or a master field | Same | Could |
| FR-242 | Watched folders on the server or network share, imported on a schedule, with a job screen showing queued, done and failed files | Improved | Could |
| FR-243 | Re-index against a master table, optionally limited by upload dates and master row dates, with progress and counts | Same | Could |
| FR-244 | Auto-rename by pattern (type and field values, up to 5 parts) on download or inside DMAC; blanks marked clearly | Same | Should |
| FR-245 | Background jobs (conversion, OCR, imports, re-indexing) run in a managed queue with retries and an admin status screen, not OS cron jobs | Improved | Must |
| FR-246 | AI suggests document type and field values from content (e.g. invoice number, date, amount, vendor) for the uploader to confirm | New | Could |
| FR-247 | Ask in plain English, e.g. "approved structural drawings for floor 3", and get results | New | Could |

### 8.20 Home dashboard and notifications

| ID | Requirement | vs dMACQ | Priority |
| --- | --- | --- | --- |
| FR-250 | Home per workspace: my tasks, recent updates, favourite documents, folders and master tables | Same | Must |
| FR-251 | Tiles for pending approvals, overdue drawings, documents due by date fields, uploads this week | Improved | Must |
| FR-252 | Email through the company mail server, with a configurable sender name and reply-to | Same | Must |
| FR-253 | In-app notification centre with read and unread, and user choice of email or in-app per event | New | Must |

### 8.21 dMACQ to DMAC comparison

Every feature in the dMACQ DMS 7.0 Admin Guide has a DMAC requirement. DMAC improves 18 of them and adds the drawing workflow on top.

| dMACQ feature (guide section) | DMAC requirement | Result |
| --- | --- | --- |
| Login, password reset, password policy (2) | FR-106, FR-107, FR-72 | Improved: SSO added |
| One session per username (2.1) | FR-108 | Improved |
| Deal Rooms (3) | FR-100, FR-101 | Improved: switch without logout |
| Groups and group rights matrix (4, 5) | FR-110 to FR-112 | Same |
| Users: single, grid, Excel import (6) | FR-102 to FR-105 | Improved: error report |
| Categories, tree view, favourites (7) | FR-130 to FR-136 | Improved: move, templates |
| Category rights (8) | FR-122, FR-123 | Improved: inheritance |
| Doc Sets and library (9) | FR-140 to FR-144 | Same |
| Doc Set rights and Private View (10) | FR-124 | Same |
| Index Groups and fields (12) | FR-150 to FR-154 | Improved: more types, no data loss |
| Index Group field rights (13) | FR-125 | Same |
| Index Masters, fields, values, import (14) | FR-160 to FR-169 | Improved: error report, ERP sync |
| Index Master rights (15) | FR-126 | Same |
| Linking structures (16) | FR-170 to FR-172 | Improved: inheritance |
| Upload: none, single, multiple, from master (17) | FR-180 to FR-185 | Improved: any filename |
| Supported formats and viewer (17.1, 18.2) | FR-190 to FR-192 | Same |
| Document actions (18) | FR-200 to FR-205 | Improved: two-way links, audited purge |
| Document OCR (18.8) | FR-225 | Improved: included as standard |
| List filters and views (20, 21) | FR-210 to FR-212 | Improved: shared views |
| List actions incl. Excel indexing, tagging, move (22) | FR-213 to FR-216 | Improved: values kept on move |
| Field search, global search, saved search (23) | FR-220 to FR-227 | Improved: sub-folders, one search bar |
| QC approval and bulk approval (24) | FR-230 to FR-236 | Improved: multi-level, queue |
| Auto-index from filename and folders (25, 27) | FR-240 to FR-242 | Same |
| Re-index with master (26) | FR-243 | Same |
| Auto-rename (28) | FR-244 | Same |
| Cron background jobs | FR-245 | Improved: managed queue |
| Analytics home, favourites (feature deck) | FR-250, FR-251 | Improved |
| SMTP gateway (feature deck) | FR-252 | Same |
| AD, SSO, two-factor (feature deck) | FR-72 | Same |
| Named and concurrent licences (feature deck) | Not needed in-house | Dropped |
| Not in dMACQ | Versions, check-out, audit trail, share links, watermark, annotations, AI suggestions | New |
| Not in dMACQ | Drawing review and approval, Part A (FR-01 to FR-44) | New |

### 8.22 Security and administration

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-70 | Roles with module rights (view, create, edit, delete, export) | Must |
| FR-71 | Permissions by workspace, project, folder, document type and field | Must |
| FR-72 | Single sign-on with Active Directory or Entra ID; two-factor for external users | Must |
| FR-73 | Watermark with user name and time on view, print and download | Should |
| FR-74 | Admin console for users, roles, masters, codes, targets and templates | Must |

### 8.23 Secure sharing with outside consultants

A consultant gets an emailed link that works only for their email address, only until it expires, and only with a password sent separately. If anyone else tries to open it, the link is revoked at once and the admin is alerted.

**How a share works**

1. The sender selects documents, enters the consultant's email, sets the expiry date and time, and ticks the permissions.
2. DMAC encrypts the shared copy with its own key and emails the link. The password is sent separately by SMS or WhatsApp, or given by phone.
3. The consultant opens the link and types their email. DMAC sends a one-time code to that inbox.
4. The consultant enters the code, then the document password. The document opens in the secure viewer, readable only after both checks.
5. Every open, view, comment, upload and download is logged against the share.
6. At expiry the link stops working. The sender can extend or revoke it at any time.

**How the link is tied to one email ID.** A link alone cannot tell who clicked it, because emails get forwarded. The one-time code fixes this: it only ever goes to the consultant's own inbox, so only that person can pass the check. A forwarded link fails, because the code still goes to the consultant, not to the person who received the forward.

**What happens on misuse**

| Event | DMAC response |
| --- | --- |
| Link opened and a different email is entered | Link revoked for everyone at once; escalation email and in-app alert to the sender and admin with the email tried, time, IP address and device |
| One-time code entered wrong 3 times | Link locked; alert to sender and admin |
| Document password entered wrong 5 times | Link locked; alert to sender and admin |
| Correct consultant on a new device or browser | New one-time code required; logged, not revoked |
| Link used after expiry or revoke | Access denied with a "request new link" button that notifies the sender |

A revoked or locked link can only be re-issued as a new share by the sender or admin.

**Permissions per share**

| Permission | What the consultant can do |
| --- | --- |
| View | Read in the secure viewer with their email and the time watermarked on every page; no copy or print |
| Comment and mark up | Add markups and comments that flow back into the drawing or document record |
| Edit | Upload a revised file; it arrives in DMAC as a new version for review, the original is never overwritten |
| Print | Print with watermark |
| Download | Download a watermarked copy, optionally as a password-protected PDF |

**Requirements**

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-260 | Share one or many documents or drawings with an outside email, with expiry date and time and the permissions above | Must |
| FR-261 | Shared copies encrypted with a unique key per share (AES-256); readable only after the email code and the document password | Must |
| FR-262 | Email one-time code at every first open on a device; link bound to the invited email ID | Must |
| FR-263 | Different email entered, or repeated wrong codes or passwords, revokes or locks the link and escalates to sender and admin by email and in-app | Must |
| FR-264 | Password delivered separately (SMS, WhatsApp or shown once to the sender to pass on by phone), never in the link email | Must |
| FR-265 | Share register: every active, expired and revoked share with recipient, documents, permissions, opens and downloads; revoke or extend in one click | Must |
| FR-266 | Revoke all shares for one consultant in one step, e.g. when a contract ends | Must |
| FR-267 | Policy settings: maximum expiry (default 30 days), allowed or blocked email domains, which document types may be shared outside, approval needed before sharing sensitive types | Should |
| FR-268 | "Share outside" is a separate permission per group and document type | Must |

**Limits to accept.** Once a consultant downloads or prints a file, DMAC can no longer control it. The watermark carrying the consultant's email is what discourages onward sharing. For the most sensitive documents, give view and comment only.

## 9. Enterprise UI and UX requirements

The interface must read at a glance: status is shown by colour, icon and position, and words are kept to labels.

### 9.1 Design principles

| ID | Principle |
| --- | --- |
| UI-01 | **Visual first.** Status is a colour chip plus an icon, never a sentence. Counts are badges. |
| UI-02 | **Two words maximum** on buttons and labels (Submit, Return, Approve, Issue). Help text lives in tooltips. |
| UI-03 | **One primary action per screen**, placed top right, in the brand colour. |
| UI-04 | **Consistent shell.** Left icon rail for modules, top bar for project switcher, global search, notifications and profile. |
| UI-05 | **Dense, scannable tables** with sticky headers, column picker, inline filters, row actions on hover and bulk actions on select. |
| UI-06 | **Drill down, not navigate away.** Clicking a tile or grid cell filters in place or opens a side drawer. |
| UI-07 | **Keyboard and accessibility.** Shortcuts for review actions; WCAG 2.1 AA contrast; colour is never the only signal. |
| UI-08 | **Light and dark themes**, Chandak Group branding, one icon set (outline style), one type family. |
| UI-09 | **Responsive.** Full features on desktop; dashboard, viewer and approve or return on tablet and phone. |
| UI-10 | **Empty, loading and error states** designed for every screen, with one clear next action. |

### 9.2 Status colour system

| Status | Colour | Icon | Holder |
| --- | --- | --- | --- |
| Not submitted | Grey | Dashed circle | Design |
| Under review | Blue | Eye | Engineering |
| Returned (code C) | Amber | Return arrow | Design |
| Rejected (code D) | Red | Cross | Design |
| Approved (A or B) | Green | Tick | None |
| Issued for construction | Dark green | Stamp | None |
| Overdue | Red dot on any status | Clock | Current holder |

### 9.3 Screen inventory

| # | Screen | Key elements |
| --- | --- | --- |
| S1 | Home | My tasks, pending approvals, overdue, recent updates, favourites |
| S2 | Portfolio dashboard | Project cards with progress ring, overdue badge, average turnaround |
| S3 | Project dashboard | KPI tiles, floor × department heat grid, ageing chart, waiting-longest list |
| S4 | Drawing register | Table with status chips, revision, holder, days held; bulk submit and export |
| S5 | Drawing detail | Viewer, revision timeline Design ↔ Engineering, comments panel, transmittals |
| S6 | Review workspace | Full-screen viewer, markup toolbar, comment list, decision bar (A/B/C/D) |
| S7 | Compare | Two revisions side by side or overlaid, changes highlighted |
| S8 | My tasks | Inbox of items I hold, sorted by days left, one-click open |
| S9 | Documents | Folder tree, file list with column picker and quick filters, preview pane, fields panel |
| S10 | Upload wizard | Folder, type per file, indexing mode, field form, master row search |
| S11 | Document detail | Viewer, properties, fields, versions, links, approval comments, activity |
| S12 | Search | Single search bar, facet filters, result list with preview, saved searches |
| S13 | Master tables | Table list, rows grid with search, inline edit, import, tagged documents |
| S14 | Approval queue | Pending documents across folders, approve or reject with comment, bulk |
| S15 | Reports | Turnaround, rounds, comment categories, uploads, due dates, audit, export |
| S16 | Admin | Workspaces, users, groups, rights matrix, folders, types, fields, links, codes, targets, templates |
| S17 | Recycle bin and jobs | Restore or purge; import, OCR and conversion job status |

The [Drawing Approval Tracker prototype](https://claude.ai/artifact/CjFWBevBCrSe4sMvu9mPyV) shows the intended look of S3 and S5.

## 10. Dashboards, reports and KPIs

Every dashboard tile and chart is clickable and opens the filtered list behind it.

| Dashboard or report | Shows | Audience |
| --- | --- | --- |
| Portfolio | All projects: % approved, overdue count, average turnaround, trend | Management |
| Project heat grid | Floors × departments, each cell coloured by status, revision and overdue dot | Project manager, heads |
| Ball-in-court | Drawings held by Design vs Engineering, by department and person | Heads |
| Ageing | Pending drawings in buckets: 0–5, 6–10, 11–20, over 20 days | Project manager |
| Turnaround | Average days per round for review and for revision, by department, monthly | Heads, management |
| Rounds to approval | Distribution of rounds per drawing; drawings with 3 or more rounds | Engineering head |
| Comment analysis | Comments by category and department; most repeated issues | Design heads |
| Planned vs actual | Planned submission and approval dates against actual | Project manager |
| Transmittal log | Every send and return with number, date, drawings and code | Document controller |
| Document activity | Uploads by workspace, folder, type and user; unindexed and unapproved counts | Workspace managers |
| Due dates | Documents due today, overdue and upcoming from any date field (e.g. contract expiry) | Department heads |
| Master table usage | Documents tagged per master row (e.g. per employee or vendor) | Department heads |
| Approval queue | Pending document approvals by folder and age | Approvers |
| Storage | Files and storage by workspace and type, growth by month | IT |
| Audit report | Who viewed, downloaded, changed or approved what, and when | IT, management |

**Core KPIs:** drawings approved %, drawings overdue, average review days, average revision days, average rounds to approval, first-time approval rate.

All reports export to Excel and PDF, and can be emailed on a schedule.

## 11. Non-functional requirements

| ID | Area | Requirement |
| --- | --- | --- |
| NFR-01 | Performance | Pages and dashboards load in under 2 seconds; a 20 MB drawing opens in the viewer in under 5 seconds on the office network |
| NFR-02 | Scale | 500 users, 200 concurrent; 1 million documents and 10 TB of files without redesign |
| NFR-03 | Availability | 99.5% during working hours (Mon–Sat, 08:00–21:00 IST); planned maintenance outside these hours |
| NFR-04 | Security | HTTPS only; files encrypted at rest; passwords never stored for SSO users; OWASP Top 10 tested before go-live |
| NFR-05 | Access control | Every request checked against all permission layers on the server, not only hidden in the UI |
| NFR-06 | Audit | Every view, download, upload, change, approval and permission change logged and kept for 7 years; log cannot be edited |
| NFR-07 | Backup | Nightly database and file backup, 30 days kept, one copy off-site; restore tested every quarter |
| NFR-08 | Recovery | Recovery point 24 hours, recovery time 8 hours |
| NFR-09 | Browsers | Latest Chrome, Edge, Firefox and Safari; no plug-ins |
| NFR-10 | Integrity | Files stored by checksum; a file's history is never overwritten |
| NFR-11 | Maintainability | Containerised deployment, automated tests, documented API (OpenAPI) |
| NFR-12 | Data residency | All data stored in India |

## 12. Data entities and integrations

**Key entities**

| Entity | Main attributes |
| --- | --- |
| Workspace | Company or division name, code |
| Project | Name, code, workspace, manager, target dates, approval chain, targets |
| Building, Floor | Name, order, type (basement, podium, typical, terrace) |
| Department | Name, code, design owner, engineering reviewer |
| Drawing | Number, title, project, building, floor, department, planned dates, status, holder |
| Revision | R-number, file, checksum, submitted by and on, decision code, reviewed by and on |
| Comment and markup | Number, text, category, severity, markup shape, response, open or closed |
| Transmittal | Number, direction, drawings and revisions, date, sender, recipient |
| Document, Version | Folder, type, fields, file versions, approval status |
| Folder, Document type, Field, Master table | As in the dMACQ model, with soft delete |
| User, Role, Permission | AD identity, roles, workspace and project access, field visibility |
| Audit event | Actor, action, object, before and after, IP address, time |

**Integrations**

| System | Purpose | Release |
| --- | --- | --- |
| Active Directory / Entra ID | Single sign-on, user and group sync | 1 |
| Company email (SMTP or Microsoft 365) | Notifications, digests, scheduled reports | 1 |
| ERP / HRMS | Sync of vendors, consultants and employees into master tables | 2 |
| WhatsApp Business | Reminders and escalations | 3 |
| REST API | Integration with other company systems | 2 |

## 13. Release plan

&#91;embedded content: release plan · 3 releases, 2 gates, not to scale\]

Release 1 covers every Must requirement and goes live on one pilot building first. Durations will be set once the delivery team and hosting are confirmed.

## 14. Risks, open items and sign-off

**Risks**

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Teams keep using email alongside DMAC | Status on the dashboard is wrong | Engineering accepts submissions only through DMAC from go-live |
| DWG viewing quality varies by drawing | Reviewers fall back to AutoCAD | Require a PDF with every DWG; test viewer on real drawings in the pilot |
| Large files on slow site connections | Slow viewing at site | Server-side previews and tiled loading; site users get PDFs |
| Approval chain differs by project | Rework of workflow | Chain configurable per project from release 1 |
| Scope grows into project management | Delays release 1 | Hold scope to section 4; log new asks for later releases |

**Open items**

- [ ] List the outside consultants per project (consultant access confirmed, see 8.23)
- [ ] Confirm approval codes and their wording
- [ ] Confirm review and revision target days
- [ ] Choose the pilot project and building
- [ ] Confirm hosting: on-premises server or cloud
- [ ] Name the systems that hold vendor, consultant and employee master data

**Sign-off**

| Role | Name | Decision | Date |
| --- | --- | --- | --- |
| Engineering head |  |  |  |
| Design heads |  |  |  |
| IT head |  |  |  |
| Management sponsor |  |  |  |

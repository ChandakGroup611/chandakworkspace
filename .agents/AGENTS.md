# Agent Rules

## Strict Logic and Schema Verification

You will ALWAYS double-check the logic of the fields, database columns, and code paths you are modifying. Before pushing code or making definitive statements, you must verify against the live schema or active codebase to ensure what you are doing is absolutely correct and not based on assumptions.


## Hosting Environment

The project is deployed on a custom domain portal/server (standard Node environment), NOT on Vercel. Do not rely on serverless-specific features (like  ercel.json crons) or assume Vercel deployment constraints. Assume a long-running Node.js process unless told otherwise.

## Mandatory Self-Verification

Whenever you are given a requirement, report an issue, or report an error, you MUST independently verify your fix from your end. After writing code or making modifications, do not just assume it works. You must run relevant checks (e.g., `npx tsc --noEmit`, linters, or test scripts), check logs, and definitively confirm that the changes actually resolve the stated issue before notifying the user that it is complete. You are responsible for the final quality assurance of your own changes.

## Global Dependency and Regression Validation

NEVER deploy a change without first checking its global impact. 
- If you modify a shared component, global CSS, or utility (e.g., removing a class like `backdrop-blur` or modifying `globals.css`), you MUST search the codebase to understand what other modules use it.
- If you modify a specific workflow (e.g., Requirement Creation), you MUST trace the entire lifecycle of the data (e.g., from Ticket -> Requirement) to ensure dependent entities like attachments, approval flows, or statuses aren't orphaned or broken.
- Assume every localized change has a global ripple effect. Systematically verify that "because of or in between these changes, something else didn't accidentally break."

## Strict Dependency & Package Governance (Zero Unauthorized Installs)

- **NEVER install, add, or upgrade any npm package or external dependency without explicit permission from the user.**
- If a security vulnerability arises or an upstream package launches an updated version, you MUST NOT install it silently. Instead, proactively inform the user with:
  1. The exact package name and its parent dependency tree.
  2. The current version vs. the newly released/patched version.
  3. The CVE / vulnerability details (if applicable) and risk impact.
  4. Explicitly ask the user for confirmation before executing `npm install` or changing dependencies in `package.json`.

## Strict UI-to-Backend RBAC & Ownership Symmetry

- **Zero Permissive Fallbacks**: Never use loose composite variables (e.g. `canEditCore`, `hasGenericPerm`) to control buttons that perform specific ownership-restricted mutations.
- **Strict Matrix Mirroring**: Every UI mutation trigger (Edit buttons, status dropdowns, date pickers, delete actions, modals) MUST strictly mirror the exact server-side authorization check (e.g. only Primary Assignee or Super Admin can edit Primary Assignee/Executors).
- **No Reliance on Backend-Only Rejection**: If a user does not have permission to execute an action on the backend, the corresponding UI trigger / button MUST be hidden or disabled. Spectators, reviewers, and standard users (`ROLE_AGENT`) must NEVER see edit triggers for entities they do not own.

## Automated Vulnerability & Security Verification

- As part of mandatory self-verification, always verify dependency security health by running `npm audit`.
- Keep automated security mechanisms active (Dependabot daily monitoring, daily scheduled CI security scans, and pre-deployment safety gates in `scripts/deploy.js`).
- Never allow high or critical vulnerabilities into production code.

## Mandatory Document View & Download Capability & Zero Upload Errors (Zero Blind Uploads)

Whenever any file/document upload capability is implemented or available in the application (forms, wizards, modal dialogues, collaboration chats, detail views, and listings):
- **Universal View & Download Requirement**: Every document/file uploaded or staged for upload MUST provide both a **View** (in-browser preview/modal/tab) and a **Download** (direct retrieval) option.
- **Verification Before & After Submission**: Users must be able to cross-check, review, and verify documents both before submitting (staged local files with `URL.createObjectURL`) and after submission (persisted records with secure signed proxy URLs `/api/proxy-attachment/[id]` or direct storage URLs). Never provide an upload mechanism where a user is left with only a filename or unable to cross-check/download the document.
- **Standardized Presentation**: Every attachment representation must display appropriate file type indicators (PDF, Image, Spreadsheet, Document, Archive), human-readable file size, and dedicated, unambiguous "View" and "Download" triggers.
- **Zero Upload Errors Guarantee**:
  1. Signed upload URL generation must dynamically resolve the appropriate bucket (`ticket-attachments`, `chat-attachments`, `resolution-files`, `requirement-files`, `vehicle-documents`).
  2. Fallback MIME detection must resolve extensions properly so valid documents (e.g. `.pdf`, `.docx`, `.xlsx`, `.png`, `.jpg`, `.csv`, `.zip`) are never blocked or corrupted.
  3. Upload errors must be caught with informative user feedback, and network timeouts or bucket permission errors must not crash form submissions.





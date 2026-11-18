# Agent Rules

## Permanent AI Development Governance, Functionality Preservation & Release Control

The 21-point Governance Protocol in [.agents/rules/release_governance.md](file:///d:/adios/.agents/rules/release_governance.md) is MANDATORY and BINDING on all actions.
Every task lifecycle strictly requires:
`INSPECT → BASELINE → ANALYZE IMPACT → PLAN → IMPLEMENT → SYNCHRONIZE DEPENDENCIES → TEST → REGRESSION TEST → REVIEW SOURCE → BUILD → VERIFY RELEASE → DEPLOY IF APPROVED → VERIFY DEPLOYMENT → REPORT EVIDENCE`.

## Change Tiers & Streamlined Fast-Path Governance

To maintain rigorous quality without slowing down delivery, development tasks follow tiered governance:

- **SMALL** (Copy, visual styling, CSS, single screen, zero logic changes):
  - **Verification**: `npx tsc --noEmit` + ESLint on changed files only (`npx eslint <changed files>`).
  - **Visual Check**: One responsive check of the modified screen at 375px (mobile) and 1440px (desktop).
  - **Exemptions**: No registry or documentation updates required (`ACCESS_RULES.md`, `ISSUES.md`, etc. stay untouched).
- **MEDIUM** (Logic in one module, query/filter updates, non-breaking workflows):
  - **Verification**: All **SMALL** gates + that specific module's test suite (e.g. `node scripts/access-audit/test-<module>.mjs` or targeted module E2E spec).
  - **Mandatory Approval Trigger**: Any permission, authentication, IAM, RBAC matrix, or data schema change is ALWAYS classified as **MEDIUM or higher** and MANDATORILY requires explicit user approval before implementation.
- **RELEASE** (Merge to `main` / Production Deployment):
  - **Full Protocol**: Full `npx tsc --noEmit`, full repository lint, production build (`npm run build`), full `test:e2e` suite, dependency security audit (`npm audit`).
  - **Documentation**: Registries, `ACCESS_RULES.md`, `ISSUES.md`, and changelog updated ONCE during the release window.
  - All 21 points in `release_governance.md` strictly apply at the RELEASE tier.

## Branching & Release Cadence
- **Branch**: All changes are committed to branch `develop`.
- **Pull Requests**: Open exactly ONE PR (`develop` → `main`) per release.
- **Merge Windows**: The project owner reviews and merges PRs at **13:00 IST** and **19:00 IST**.
- **No Direct Pushes to Main**: Direct pushes to `main` are strictly prohibited, except for an explicitly approved emergency hotfix.

## Strict Logic and Schema Verification

You will ALWAYS double-check the logic of the fields, database columns, and code paths you are modifying. Before pushing code or making definitive statements, you must verify against the live schema or active codebase to ensure what you are doing is absolutely correct and not based on assumptions.


## Hosting Environment

The project is deployed on a custom domain portal/server (standard Node environment), NOT on Vercel. Do not rely on serverless-specific features (like  ercel.json crons) or assume Vercel deployment constraints. Assume a long-running Node.js process unless told otherwise.

## Zero-Downtime Deployment, Anti-503 Warmup & Anti-403 Guarantee

Deployments to the production server must strictly prevent `503 Service Unavailable` and `403 Forbidden` errors:
- **Zero Destructive Pre-Wipes**: Never delete `.next/server` prior to extracting deployment packages. Extraction must overwrite in-place to avoid `ENOENT` runtime crashes on in-flight requests.
- **Standalone Runtime Manifests**: Always guarantee `preview-props.json` exists in standalone builds.
- **Multi-Docroot .htaccess Synchronization**: Never delete `.htaccess` from target app directories. Synchronize `.htaccess` with `PassengerAppRoot` to `public_html`, all versioned app roots, and `public/` directories to prevent LiteSpeed static fallback 403 Forbidden errors.
- **Automated Warmup Gate**: Every CI/CD deployment pipeline and deploy script MUST poll `/api/version` until `HTTP 200` (`status: "online"`) is received before notifying the user or declaring deployment done. Cold-boot latency must be absorbed by the deployment pipeline, never exposed to users.
- **Orphan Process Cleanup**: Ensure orphan `lsnode.js` workers are reaped to prevent hitting CloudLinux LVE NPROC thread limits.

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

## Enterprise UI/UX Cleanup & Standardization (Human-Designed, Minimal, Professional UI)

This rule is MANDATORY for all present and future developments across all modules (**Task Workflow**, **Vehicle Desk**, **Design Tracking**, **AMC**, **IAM**, etc.).

### 1. Non-Negotiable Core Rule: Zero Functional Regression
- **CHANGE THE UI — DO NOT CHANGE THE FUNCTIONALITY**.
- You MUST preserve 100% of existing business logic, CRUD operations, APIs, Server Actions, database queries, validations, auth, RBAC/IAM matrix, RLS, state management, filters, sorting, and pagination.
- If a UI change appears to require a logic change: **STOP → explain why → identify impact → wait for approval.**

### 2. Explicit Dashboard Exception
- **DO NOT APPLY UI SIMPLIFICATION RULES BLINDLY TO DASHBOARDS**.
- Dashboards may contain KPI cards, charts, trends, comparisons, status indicators, legends, and analytical context.
- Never remove analytical context or visualization features merely because it looks informational.
- Do NOT modify KPI calculations, metrics, or query logic.

### 3. Minimal Copy & Text Elimination
- Non-dashboard screens (forms, tables, lists, modals, drawers, settings, CRUD views) must NOT contain AI-style explanatory paragraphs, "Welcome" banners, "Manage your..." descriptions, decorative marketing copy, or obvious instructions.
- Prefer self-explanatory, concise field labels (e.g., `Registration Number`, `Category`, `Due Date`) over paragraphs.
- Keep helper text strictly contextual, short, and only when non-obvious business rules require it.
- Keep error and success notifications concise and direct (e.g. `Registration number already exists`, `Vehicle created successfully`).

### 4. Color Hierarchy & Anti-Rainbow Standardization
- **Never use random or competing accent colors** across screens or modules (avoid "Rainbow UI").
- **Primary**: Brand Primary token (`bg-theme-btn-primary`, `text-theme-btn-primary-text`) for primary actions, selected states, and active items.
- **Neutral**: Slate/Zinc surfaces (`bg-surface`, `bg-elevated`, `border-border`) for cards, tables, and borders.
- **Semantic Colors**: Emerald (Success), Amber (Warning), Rose (Danger), Sky (Info) used exclusively for functional status.
- Ensure cross-module color consistency (the same semantic status must have the identical visual treatment in Task, Vehicle, and Design).

### 5. Clear & Accessible Active States
- Always clearly highlight active contexts (active session, active module, active navigation route, active tab, active filter scope).
- Active states must NOT rely solely on color; combine background contrast, subtle border indicators, font weight, and icons.

### 6. Elimination of AI-Generated UI Clutter
- Avoid excessive nested cards, floating neon atmospheric blur blobs, excessive glowing drop-shadows, decorative badges everywhere, and oversized empty hero spaces.
- The interface must feel calm, dense where appropriate, readable, predictable, and designed by an experienced product team.

### 7. Form, Modal & Table Standards
- **Content Hierarchy**: `Page Header → Section Title → Field Label → Control`.
- **Long Pages**: Group logically by business domain (e.g., `Basic Information`, `Registration`, `Ownership`, `Compliance`, `Documents`) rather than generic numbered containers.
- **Tables**: Maximize information density, use compact row heights, clear column headers, and unobtrusive actions.
- **Buttons**: Exactly ONE primary action per contextual group; secondary actions use outline/ghost; destructive actions use distinct, safe styling.
- **Modals**: Focused solely on title, relevant fields, and explicit actions.

## Mobile-First, App-Like UI on Every Module (Phone · iPad · Laptop · Desktop)

MANDATORY for every present and future page, component and module (Task Workflow, Vehicle Desk, Design Tracking, Executive Dashboards, Chandak Meet, Organization Budget, AMC, IAM, Masters, and any module added later). A feature is not done until it works at phone, tablet and desktop sizes.

1. **Test at three sizes before reporting done**: 375×812 (phone), 820×1180 (iPad) and 1440×900 (desktop). The page must never scroll sideways (`document.documentElement.scrollWidth === innerWidth`). Wide tables, boards and matrices scroll sideways *inside their own card* (`overflow-x-auto` wrapper, e.g. `AppTableContainer`).
2. **Module navigation**: every module has its own tabs in `components/layout/MobileBottomNav.tsx` (max 4 tabs + Menu). A new module or module area MUST add its tab set and its path prefix there, and its module code in `ModuleSwitcher.tsx` (`ICONS`, `FALLBACK_NAMES`, `FALLBACK_ROUTES`, `moduleFromPath`). Tabs of one module must never send the user into another module.
3. **No popovers/dropdowns portalled out of a modal on phones**: anything opened from inside the mobile drawer or a `Dialog` must either render inline or use the same Radix version as the dialog. Two copies of `@radix-ui/react-dismissable-layer` make portalled menus visible but untappable. Check `npm ls @radix-ui/react-dismissable-layer` shows ONE version after any Radix change.
4. **Touch targets** are at least 44×44px on phones (`min-h-11`, `h-10 w-10` icon buttons); keep desktop density with `sm:`/`md:` overrides.
5. **Headers, toolbars and filter bars wrap**: action rows use `flex flex-wrap gap-2` (never `shrink-0` + `whitespace-nowrap` on a row of several buttons); titles wrap; long numbers use `break-words`/`tabular-nums` and fit their card.
6. **Dialogs** never exceed the screen (`max-h-[calc(100dvh-2rem)] overflow-y-auto`, built into `components/ui/dialog.tsx`); footers stack on phones. Never build a custom fixed overlay that ignores this.
7. **Layout**: use responsive grids (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`), never fixed pixel widths above 340px without a `max-w-full`. Content at the bottom must clear the bottom tab bar (the shell already pads `main`; fixed bottom bars must add `pb-[env(safe-area-inset-bottom)]`).
8. **Inputs** stay at 16px on phones (set globally in `app/globals.css`) so iOS does not zoom; use the correct `inputMode`/`type` (`tel`, `email`, `numeric`).
9. **Verify** with `node tools/ui-audit.mjs` (its mobile rules flag non-wrapping action rows, fixed wide widths and small tap targets) and a real look at 375px before deploying.

## Release Lock-in & Stability Governance Gate

No change may be merged unless tsc, lint, build and test:e2e pass on staging; approved logic in docs/ACCESS_RULES.md and docs/ISSUES.md decisions may not be changed without the owner's written approval.


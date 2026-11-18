# Codebase Audit & Cleanup Report (Part B)

**Generated:** 2026-11-18  
**Analysis Tools:** `npx depcheck`, `npx knip`, `git grep`, AST & static asset path tracer  
**Target Repository:** `d:\adios`  
**Application Type:** Next.js (App Router) + Supabase + Custom Hosting (Node Standalone)

> [!IMPORTANT]
> **GOVERNANCE NOTICE: REPORT ONLY**  
> In accordance with strict development rules, this report provides a comprehensive inventory of unused files, dependencies, assets, and duplicate libraries. **NO APPLICATION CODE, PACKAGES, OR REPOSITORY FILES HAVE BEEN DELETED.** All removals require explicit user sign-off.

---

## 1. Candidate Inventory & Triage Matrix

| Candidate Item | Type | Size | Status | Dynamic Usage & Technical Justification |
| :--- | :--- | :--- | :--- | :--- |
| `ffmpeg-static` | Dependency | **79.08 MB** | **SAFE** | Zero imports across entire repo. Only listed in `package.json`/`package-lock.json`. Safe to prune. |
| `chandak_design_system_bundle.zip` (root) | Archive | **388 KB** | **SAFE** | Duplicate static zip bundle in repository root. Not referenced by any code. |
| `public/chandak_design_system_bundle.zip` | Archive | **388 KB** | **SAFE** | Static archive in public. Not served or linked from any UI page or workflow. |
| `create-budget.zip` (root) | Archive | **85 KB** | **SAFE** | Scratch backup zip in repository root. |
| `Design changes/chandak-ui-kit-v3.zip` | Archive | **133 KB** | **SAFE** | Outdated UI kit archive in non-code directory. |
| `public/login-bg.png` | Image | **676 KB** | **SAFE** | Unreferenced image. Auth screen uses dynamic gradient & 3D backdrop (`LoginFormBackdrop.tsx`). |
| `public/slideshow*` | Demo | **588 KB** | **SAFE** | Legacy standalone demo files (`slideshow.html` and 4 images). Zero routing or Next.js imports. |
| `Design changes/` | Directory | **144 KB** | **SAFE** | Old design prototypes and notes. Non-executable. |
| `examples/` | Directory | **22 KB** | **SAFE** | Prototype reference files outside application source code. |
| `_ui-kit/` | Directory | **330 KB** | **SAFE** | 60 standalone prototype HTML/CSS files. Zero Next.js runtime references. |
| `.vercel/` & `vercel.json` | Config | **0.3 KB** | **SAFE** | Deployment targets Hostinger Node standalone via Passenger, not Vercel serverless. |
| `ui-audit-report.json` | Generated | **620 KB** | **SAFE** | Generated audit file. Should be git-ignored. |
| `ui-audit-report.md` | Generated | **235 KB** | **SAFE** | Generated audit report. Should be git-ignored. |
| `tsconfig.tsbuildinfo` | Cache | **423 KB** | **SAFE** | Local TypeScript build cache. Belongs in `.gitignore`. |
| `Design_Tracking/src/mock` | Mock Data | **0.4 KB** | **SAFE** | `designMockData.ts` is only referenced in a markdown doc; zero code imports. |
| `highcharts` & `highcharts-react-official` | Dependencies | **~12 MB** | **SAFE** | Zero imports in the application. All charts use `recharts`. |
| `html2canvas` | Dependency | **~3 MB** | **SAFE** | Zero imports anywhere in the codebase. |
| `html-to-image` | Dependency | **~1 MB** | **SAFE** | Zero imports anywhere in the codebase. |
| `cross-env` | Dependency | **~0.1 MB** | **SAFE** | Unused runtime dependency. Scripts already use standard cross-platform env syntax. |
| `onnxruntime-web` | Dependency | **~25 MB** | **SAFE** | Zero imports in application code. |
| `patch-package` | Dependency | **~2 MB** | **SAFE** | No patch files in `patches/`. |
| `swr` | Dependency | **~1 MB** | **VERIFY** | Used in only 1 file (`app/workspaces/WorkspacesClient.tsx`). Candidate for migration to `@tanstack/react-query`. |
| `xlsx` | Dependency | **~8 MB** | **KEEP** | Used in `app/budget/_components/import-panel.tsx` for parsing imported budget workbooks. |
| `exceljs` | Dependency | **~10 MB** | **KEEP** | Standard export library used in 9+ modules (Tasks, Requirements, Reports, Masters, Migration, Budget). |
| `chandak-40-icon.png` & `.svg` | Logo Asset | **258 KB** | **KEEP** | Core official logo referenced in `app/layout.tsx`, `Sidebar.tsx`, `ChandakLoader.tsx`, `public/sw.js`. |
| `public/logo.png` | Logo Asset | **75 KB** | **KEEP** | Official corporate logo used in PDF generators, email cards, and direct links. |
| `public/apple-touch-icon.png` | Icon Asset | **21 KB** | **KEEP** | Standard PWA mobile touch icon referenced in `app/layout.tsx`. |
| `public/favicon.*` | Favicons | **150 KB** | **KEEP** | Standard multi-resolution favicon bundle. |

---

## 2. Duplicate Libraries Analysis

### A. Charting: `highcharts` vs `recharts`
- **Findings**:
  - `recharts` is actively used across **10 key dashboard views**:
    `AMCExecutiveDashboard.tsx`, `AMCTCOSpendHistoryTab.tsx`, `ChartsRow.tsx`, `PortfolioCharts.tsx`, `UserComparisonMatrix.tsx`, `ChartWidget.tsx`, `ResolutionVelocityWidget.tsx`, `RiskIntelligenceWidget.tsx`, `StatusComparisonWidget.tsx`, `TicketsDashboard.tsx`.
  - `highcharts` and `highcharts-react-official` have **0 imports** anywhere in the code.
- **Recommendation**: Remove `highcharts` and `highcharts-react-official` from `package.json`.

### B. Spreadsheet Tools: `xlsx` vs `exceljs`
- **Findings**:
  - `exceljs` is the enterprise-standard export tool across the entire system:
    - Tasks export (`TaskListViewClient.tsx`)
    - Requirements export (`RequirementListViewClient.tsx`)
    - Reports generator (`ReportsClient.tsx`)
    - Master data bulk export (`SystemMasterBulkImportModal.tsx`, `masterImportExportService.ts`)
    - Data Migration utility (`app/migration/Client.tsx`, `app/api/migration/upload/route.ts`)
    - Design Tracking tracker export (`excelExportService.ts`)
    - Organization Budget export (`lib/budget/excel-export.ts`)
  - `xlsx` (SheetJS) is used exclusively in **one module**:
    - Organization Budget file parser (`app/budget/_components/import-panel.tsx`)
- **Recommendation**: **KEEP BOTH** for now. In a future task, migrate the budget import parser to `exceljs` so `xlsx` can be retired cleanly without risking budget parsing logic.

### C. DOM/Canvas Capture: `html2canvas` vs `html-to-image`
- **Findings**:
  - Neither `html2canvas` nor `html-to-image` is imported anywhere in the application.
- **Recommendation**: Remove both packages from `package.json`.

### D. Data Fetching / Cache: `swr` vs `@tanstack/react-query`
- **Findings**:
  - `@tanstack/react-query` is the application-wide standard:
    `QueryProvider.tsx`, `PermissionsProvider.tsx`, `LiveDashboardWrapper.tsx`, `MyPortfolioSection.tsx`, `RealtimeNotificationsDrawer.tsx`, `use-masters.ts`, `use-optimistic-update.ts`.
  - `swr` is imported in only 1 file (`app/workspaces/WorkspacesClient.tsx`).
- **Recommendation**: **VERIFY / MIGRATE**: In a follow-up logic PR, migrate `WorkspacesClient.tsx` to `useQuery` from `@tanstack/react-query`, then remove `swr`.

---

## 3. Estimated Space & Dependency Savings

| Category | Count / Items | Estimated Savings |
| :--- | :--- | :--- |
| **Unused Heavy NPM Packages** | `ffmpeg-static`, `onnxruntime-web`, `highcharts*`, `html2canvas`, `html-to-image`, `patch-package` | **~125 MB** in `node_modules` |
| **Orphan Zips in Repo** | 4 zip files (`create-budget.zip`, `chandak_design_system_bundle.zip`, etc.) | **~1.0 MB** in git tracking |
| **Unused Static Media** | `login-bg.png`, `public/slideshow/*` | **~1.3 MB** |
| **Dev Prototypes & Stale Folders** | `Design changes/`, `examples/`, `_ui-kit/`, `.vercel/` | **~500 KB** (66 files) |
| **Generated Files to Git-Ignore** | `ui-audit-report.*`, `tsconfig.tsbuildinfo` | **~1.3 MB** (tracked files) |
| **TOTAL ESTIMATED CODEBASE SAVINGS** | | **~129 MB** |

---

## 4. Proposed Execution Phases (Upon Approval)

1. **Phase 1: Zero-Logic File Cleanup (No Code Changes)**
   - Add patterns to `.gitignore` (`ui-audit-report.*`, `*.tsbuildinfo`, `run_logs/`, `scratch/`, `*.zip`, `.vercel/`, `.cache/`, `coverage/`).
   - Remove tracked generated files (`ui-audit-report.json`, `ui-audit-report.md`, `tsconfig.tsbuildinfo`, `.vercel/`, `vercel.json`).
   - Remove orphan archive zips and non-code directories (`Design changes/`, `examples/`, `_ui-kit/`, `public/slideshow*`, `public/login-bg.png`).
2. **Phase 2: Dependency Cleanup (Separate Approved PR)**
   - Run `npm uninstall ffmpeg-static onnxruntime-web highcharts highcharts-react-official html2canvas html-to-image patch-package cross-env`.
   - Run `npx tsc --noEmit` and build test to verify zero regressions.

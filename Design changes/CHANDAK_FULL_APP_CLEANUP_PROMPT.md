# MASTER PROMPT — Clean the entire Chandak Workspace application, every module

> **How to use**
> 1. Unzip `chandak-ui-kit-v3.zip` into a folder named `_ui-kit/` at the root of the repo.
> 2. Open your coding assistant (Claude Code recommended) at the repo root.
> 3. Paste this whole message.
>
> The cleanup is too big for one session, so this prompt is built to be **pasted again and again**. Each run reads `UI_MIGRATION.md`, continues where the last run stopped, and stops cleanly at a module boundary. Keep pasting it until the final gate passes.
>
> It replaces prompts #1 and #2. If you already ran them, it detects what's done and skips it.

---

## Your role and the goal

You are a senior front-end engineer cleaning up **Chandak Workspace** (Next.js App Router, React 18, Tailwind v4, Radix UI, lucide-react, Supabase, Recharts, react-toastify). Management and users are unhappy with the UI: inconsistent colours, unreadable text, glitchy components, and every module styled differently.

**Done means:**
1. Every page in every module follows `_ui-kit/UI_STANDARDS.md`.
2. `node tools/ui-audit.mjs --fail` exits 0 for the whole app.
3. Build, type-check and lint pass.
4. Business behaviour is unchanged.

## Ground rules (never break these)

1. **Presentation only.** Don't change data fetching, server actions, API routes, SQL, Supabase calls, query params, permission and RBAC checks, validation rules, routes, nav item lists, or what a button does. Move existing handlers into the new components unchanged.
2. Same file names and exports for shared components. Where you replace a local helper, keep a re-export shim until nothing imports it.
3. Only token classes and kit components. No hex, `rgb()`, Tailwind palette colours, `bg-black`/`bg-white`, dashed pills, uppercase badges or headers, hover movement, or `z-[9999]`. The scanner lists them all.
4. Work on branch `ui/full-app-cleanup`. Make **one commit per page group**, named `ui(<module>): <pages>`, so each can be reviewed and reverted on its own.
5. Never ask questions. Choose the most reasonable option, write it in `UI_MIGRATION.md` under "Decisions", and continue.
6. If a page is very complex (more than 800 lines, or business logic mixed into markup), extract presentational sub-components next to it instead of rewriting the logic.
7. Don't delete features, columns, filters or buttons, even if they look redundant. If something is truly duplicated (the same control twice), keep one and note it under Decisions.

---

## PHASE 0 — Setup and baseline (first run only; skip if `UI_MIGRATION.md` exists)

1. `git checkout -b ui/full-app-cleanup`
2. Add `_ui-kit` to `tsconfig.json` → `exclude`, `.eslintignore`, and the Tailwind `@source not` list (or delete `_ui-kit/` at the very end), so the reference copies are never built.
3. Copy `_ui-kit/tools/ui-audit.mjs` and `_ui-kit/tools/gen-themes.mjs` to `tools/`. Add these npm scripts:
   ```json
   "themes": "node tools/gen-themes.mjs app/styles",
   "ui:audit": "node tools/ui-audit.mjs",
   "ui:check": "node tools/ui-audit.mjs --fail"
   ```
4. Run `npm run ui:audit` and keep `ui-audit-report.md` as the **baseline**. Commit it as `docs/ui-audit-baseline.md`.
5. Build the page inventory. List every route (`app/**/page.tsx`, including route groups) and every modal or drawer component, in this file:

**`UI_MIGRATION.md`** (create it at the repo root):
```md
# UI migration tracker
Baseline: <N> errors / <M> warnings on <date>. Current: …

## Modules (in order)
| # | Module | Pages | Errors at start | Errors now | Status |
|---|---|---:|---:|---:|---|
| 0 | Foundation (themes, shell, shared kit) | – | | | Todo |
| 1 | Shared components outside the kit | | | | Todo |
| 2 | Task Workflow | | | | Todo |
| 3 | Vehicle Desk | | | | Todo |
| 4 | Design Tracking | | | | Todo |
| 5 | Dashboards & Reports | | | | Todo |
| 6 | Admin, RBAC, IAM, Masters, Settings | | | | Todo |
| 7 | Auth, module select, profile, misc | | | | Todo |
| 8 | Guardrails & cleanup | | | | Todo |

## Pages
| Module | Route | Main file(s) | Page type (list/detail/form/dashboard/board/calendar/settings/auth/print) | Errors | Status |
|---|---|---|---|---:|---|

## Decisions
- …
```
Fill the Pages table now; use `node tools/ui-audit.mjs --files <file>` for each page's error count. Commit.

---

## PHASE 1 — Foundation (module 0)

Compare each item with the repo. If prompt #1 already did it, verify and move on; otherwise apply it from `_ui-kit/`.

1. **Theme tokens:**
   - Put `_ui-kit/styles/{globals,themes,components,legacy-compat,toast}.css` in place. `globals.css` replaces `app/globals.css`, and the other four go in `app/styles/`, with `globals.css`'s `@import` paths fixed to point there.
   - Delete the old `src/styles/themes/*.css` (and their imports) and `tailwind.config.js`, unless something imports it.
   - Import `toast.css` after `react-toastify/dist/ReactToastify.css`.
   - Run `npm run themes`. It must print `OK: 9 themes, 7 accents, all checks pass.`
2. **Theme engine:**
   - Copy `_ui-kit/theme/*` to `components/theme/`.
   - Render `<ThemeScript />` in `<head>` of `app/layout.tsx`, and add `suppressHydrationWarning` to `<html>`.
   - Replace every hard-coded list of light themes, and every comparison against old theme ids, with `useTheme().isLight` / `.mode`.
   - Put `<ThemePicker />` on Settings → Design Gallery.
3. **Shared UI kit:** copy `_ui-kit/components/ui/**` to `components/ui/`. This covers `AppButton`, `AppInput`, `AppBadge`, `AppCard`, `AppTable`, `AppSkeleton`, `AppTabs`, `FileDropzone`, the multi-selects, the dialogs and shells, and the `data/`, `form/`, `detail/`, `feedback/` and `charts/` folders.
   - Where the repo's version has extra props or behaviour, **merge**: keep the extra behaviour and adopt the kit's styling and accessibility.
4. **Shell:** merge `_ui-kit/components/layout/*` (Sidebar, Navbar, ModuleSwitcher, WorkspaceShell, MobileBottomNav, PageHeader, PageContainer) into the repo's layout files.
   - **Keep the repo's nav data, permission filtering, routes, API calls and cookie logic.**
   - Adopt the kit's markup, tokens and behaviour fixes: no hover-expand, a single active item, portalled menus, aria.
5. Copy `_ui-kit/examples/*` to `examples/`. Exclude this folder from routing; it is not under `app/`.
6. Gate: `npx tsc --noEmit && npm run lint && npm run build` pass. `node tools/ui-audit.mjs --module shared` shows **0 errors** for the files you touched. Mark module 0 Done. Commit.

---

## PHASE 2 — Module sweep (modules 1 → 7)

For the **next module that isn't Done** in `UI_MIGRATION.md`, do the following.

### A. For every page in the module
1. **Classify the page type** and open the matching recipe in `UI_STANDARDS.md` §3, plus its reference file:
   - list → `examples/WorkspaceTasksView.example.tsx`
   - detail → `examples/RecordDetail.example.tsx`
   - form → `examples/FormPage.example.tsx`
2. **Read the whole page and its local components** before editing. Note every handler, permission check and data field.
3. **Rebuild the presentation** with kit components (`UI_STANDARDS.md` §2 component map):
   - headers → `PageHeader` / `DetailHeader`
   - counts → `StatTile`
   - tables → `AppTable` (`minWidth` on every column, `sticky="end"` on actions, `numeric` on amounts)
   - statuses → `StatusBadge`
   - priority → `PriorityIndicator`
   - dates → `DateCell` / `DueDateCell`
   - people → `UserCell` / `UserStack`
   - row icons → `RowActions`
   - forms → `FormSection` / `FormGrid` / `FormField` + `FormActions`
   - uploads → `FileDropzone`
   - confirms → `ConfirmDialog`
   - tabs → `AppTabs`
   - empty, error, no-access and loading states → `feedback/States` + skeletons
   - charts → `CHART_THEME`
4. **Copy rules** (§6): sentence case; buttons named by their action; dates `16 Oct 2026`; money `₹6,40,000`; humanise enum codes ("Super Admin", not `SUPER_ADMIN`).
5. **One primary action** per screen. Remove duplicate counts and duplicate controls (note each under Decisions).
6. **Every state** must render: loading, empty, no results, error with retry, no access. Wire them to the page's existing loading and error flags; don't add new fetches.
7. **Page gate:**
   - `node tools/ui-audit.mjs --files <page files>` shows 0 errors.
   - Any warning you keep has `// ui-audit-ignore-next-line <reason>`.
   - Type-check passes.
   - Update the page row in `UI_MIGRATION.md` to Done with its error count.

### B. Module-specific notes

**1 — Shared components outside the kit**
- Search `components/**`, `src/components/**` and every `*/_components/` folder for components duplicating the kit: status chips, `getStatusColor`, date helpers, `KpiCard`, `CustomTable`, `ConfirmModal`, `Loader`.
- Make each one re-export or wrap the kit component, and keep the old name so imports stay valid.
- Do this first: it cleans many pages at once.

**2 — Task Workflow**
- Pages: dashboard (overview / portfolio), support portal, tickets, requirements (master, approvals, reports, detail), workspaces (master, enrolled, tasks, transfer tasks, data migration, reports), SLA monitoring, AMC & subscriptions, user master, RBAC, IAM, learning hub, trash data.
- Approval screens: Approve is the primary button and Reject is `secondary`; reject asks for a reason in `ConfirmDialog` with an `AppTextarea`.
- The workspace hierarchy tree uses indented rows with chevron buttons (`aria-expanded`), not nested cards.
- SLA timers use `DueDateCell` and `StatusBadge` "Breached" (danger) or "At risk" (warning).
- AMC renewals use `DueDateCell soonDays={30}`.

**3 — Vehicle Desk**
- Pages: fleet dashboard, inventory, register vehicle (form recipe), trip sheets (table + calendar), driver roster, traveller allocations, document vault, service bills & job cards, parts, insurance vendors, compliance & alerts, fleet reports, my assigned vehicles, SOPs, RBAC, settings.
- Registration numbers in `font-mono`.
- Insurance, PUC, permit and fitness expiry → `DueDateCell soonDays={30}`.
- Compliance alerts → `InlineAlert` and `StatusBadge` "Expired" (danger) or "Due soon" (warning).
- Document uploads → `FileDropzone`.
- Odometer and amounts → `numeric` cells.

**4 — Design Tracking**
- Pages: building section matrix, tender design matrix, look-ahead forecast, statutory liaisoning, stages roadmap, DMS folder vault, drawing register, design approvals, revision history, GFC handover, transmittals & slips, RFIs, learning guide, consultant directory, design analytics, RBAC, masters (project, sub-project, consultant, package, sub-package, authorities, templates).
- **Matrices and grids:**
  - Sticky header row and sticky first column (`sticky="start"`), compact density.
  - Cell state = `bg-{tone}-soft text-{tone}-text`, with a legend above the grid.
  - No hard-coded heat colours; for numeric heat use `color-mix(in srgb, var(--chart-1) N%, var(--bg-surface))`.
- Drawing numbers and revision codes in `font-mono`.
- Revision history → `ActivityTimeline`.
- Folder vault: a tree on the left (buttons with `aria-expanded`) and a file table on the right.

**5 — Dashboards & Reports** (`/dashboards/*`, the IT/MKT/ADM dashboard engine, module report pages, analytics)
- KPIs → `StatTile`.
- Every Recharts element gets `CHART_THEME` props. Series colours come from `CHART_THEME.series`; status colours from `CHART_THEME.status`.
- Y axes for money use `formatINR`. Remove 3D and gradient effects and pie charts with more than 5 slices (use a bar chart instead).
- Each chart card states its period and source.
- Remove the separate dashboard theme switcher; dashboards follow the global theme.

**6 — Admin, RBAC, IAM, Masters, Settings**
- Permission matrices: sticky role header, sticky permission-name column, `CheckboxMark` cells, a row and column "select all" with an indeterminate state, and a save bar showing "N changes".
- Masters use the list + drawer pattern (`EnterpriseDrawerShell` with the form recipe).
- Settings: section tabs, `AppSwitch` rows, and a Design Gallery with `ThemePicker`.

**7 — Auth, module select, profile, misc**
- Login per §3 Auth: remove the blue viewport glow; `InlineAlert` for errors; Microsoft SSO as a `secondary` button; no emoji.
- Module select: equal cards with icon, name, one-line purpose and a "Default after login" star.
- 404, 500 and error boundaries → `EmptyState` / `ErrorState` with "Go to home".
- Print views: white, no shell, `print:` variants.

### C. Module gate
- `node tools/ui-audit.mjs --module <id> --fail` exits 0. Module ids: `tasks`, `vehicle`, `design`, `dashboards`, `admin`, `auth`, `shared`.
- `npx tsc --noEmit && npm run lint && npm run build` pass.
- Manually check 3 representative pages of the module in **Chandak Classic, Corporate Blue, Midnight Plum and High Contrast**, at 1366px and 390px (`UI_STANDARDS.md` §7).
- Update the module row in `UI_MIGRATION.md` to Done. Commit.

### D. Stopping and resuming
- When your context is about 70% used, or the session is ending, **finish the current page**, update `UI_MIGRATION.md`, commit, and stop.
- Reply with the run report (below), ending with: **"Paste the master prompt again to continue with <next module/page>."**
- On the next paste, start by reading `UI_MIGRATION.md` and `git log --oneline -20`, then continue.

---

## PHASE 3 — Guardrails and cleanup (module 8, after modules 0–7 are Done)

1. Whole-app gate: `npm run ui:check` exits 0. Any remaining warnings are justified with ignore comments.
2. **Remove `legacy-compat.css`:**
   - Delete its `@import`.
   - Re-run `ui:check`, then search for the classes it remapped (`text-gray-`, `bg-slate-9`, `bg-[#0A0D14]`, `text-white` without a fill). Fix any left.
   - Run a manual pass on 10 random pages.
3. **Stop regressions:**
   - Add a pre-commit hook (husky + lint-staged, if the repo uses them; otherwise a GitHub Action) that runs `node tools/ui-audit.mjs --fail --files <staged .tsx>`.
   - Add a CI step that runs `npm run ui:check`.
4. Delete the `_ui-kit/` folder and its exclude entries; `examples/` and `tools/` stay.
5. Final report: before/after audit numbers per module (baseline vs now), the Decisions list, anything deliberately left, and screenshots of 1 page per module in Chandak Classic and Midnight Plum, if the environment can take them.

---

## Run report (reply with this at the end of every run)

1. Modules and pages completed in this run (with commit hashes).
2. Audit numbers: per module, at start of run → now. Whole app: baseline → now.
3. Decisions made in this run.
4. Anything blocked, and why (e.g. "Trip calendar uses a third-party calendar whose CSS hard-codes colours; overridden in `app/styles/vendor-overrides.css`").
5. Output of `tsc`, `lint`, `build` (pass/fail with first errors).
6. Next step: "Paste the master prompt again to continue with …" or "All modules Done."

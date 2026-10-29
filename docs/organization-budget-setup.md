# Organization Budget module: finishing the setup

The module's code, migrations and menu entries are in the repository. These steps finish the setup on this machine and in Supabase.

## 1. Install the Excel reader

```bash
npm install
```

`package.json` now lists `xlsx` (SheetJS 0.20.3 from cdn.sheetjs.com). The budget import uses it to read workbooks in the browser.

## 2. Run the twelve database migrations, in order

```
supabase/migrations/20261028120000_budget_module.sql          tables, calculation views, roles and rights, RLS
supabase/migrations/20261028120100_budget_import.sql          Excel import
supabase/migrations/20261028120200_budget_app.sql             functions used by the screens
supabase/migrations/20261028120300_budget_custom_fields.sql   custom fields and forms
supabase/migrations/20261028120400_budget_workspace_integration.sql
supabase/migrations/20261028120500_budget_ai_notes.sql            budget summary notes
supabase/migrations/20261028120600_budget_signoff_drivers.sql      remarks, OC reasons, sign-off chain, line rules, memo items
supabase/migrations/20261028120700_budget_tower_workings.sql      tower workings: tower BUA per version, certified amounts, allocation check
supabase/migrations/20261028120800_budget_schedules.sql           supporting schedules behind Summary lines
supabase/migrations/20261028120900_budget_bills.sql               cost incurred built up from bills
supabase/migrations/20261028121000_budget_edit_delete.sql         edit bills, delete towers and cost heads
supabase/migrations/20261028121100_budget_cycle_fixes.sql         memo items out of GST bases; no remarks needed on a first version
```

You can run them with `supabase db push` or paste them into the Supabase SQL editor one by one. Every object they create is prefixed `budget_`, so nothing existing is changed. The only exception is the last file, which adds rows to existing tables:

- It points `budget_workspace_users` at `user_master`, so people come from Chandak Workspace.
- It registers the module in `modules_master` (code `ORG_BUDGET`, route `/budget`).
- It makes every SUPER_ADMIN / ROLE_ADMIN user a budget Administrator.
- It adds the module to `user_modules` for each budget member, so the module appears in their module chooser.

## 3. Check it

```bash
npx tsc --noEmit
npm run build
npm run dev
```

Then sign in as an administrator:

- **Choose a module** now shows Organization Budget.
- `/budget` lists projects. It is empty until you create one, or import a detail budget workbook on the home page.
- `/budget/admin/access` sets up roles, rights and members. Members are picked from the workspace users.
- `/budget/admin/fields` sets up custom fields, including calculated (formula) fields.

## Files

| Path | What |
| --- | --- |
| `app/budget/**` | Screens (styles scoped under `.budget-app` in `budget.css`) |
| `lib/budget/**` | Data reads, server actions, Excel reader, formula engine (`formula.ts`) |
| `lib/budget/supabase.ts` | Uses the workspace client from `utils/supabase/server.ts` |
| `public/budget-samples/` | Cost incurred sheet template |
| `lib/module-gate.ts`, `middleware.ts`, `lib/actions/module-switcher.ts`, `app/api/modules/route.ts`, `app/select-module/page.tsx`, `components/layout/{Sidebar,ModuleSwitcher,MobileBottomNav}.tsx` | `ORG_BUDGET` added beside the other modules |
| `docs/organization-budget.md` | Full description: rights, custom fields, formulas, accuracy rules |

## Reports in the company's formats, budget summary and alerts

- **Download Excel** on the Summary report and the Detail report gives the file in the two company formats (`Chandak Budget Summary Format.xlsx`, `Chandak Detail Budget Format.xlsx`): same rows, headings, fonts, colours, widths and print set-up. Typed figures are exact; totals, Balance, Variance, PSF, Utilised %, net carpet area and budget vs incurred are live Excel formulas. Needs the "Export reports" right. Code: `lib/budget/excel-export.ts`, route `app/budget/[projectId]/export/[kind]/route.ts`.
- **Budget summary** (Overview): writes a short management note for the version. The server works out every figure; the AI (the workspace's Gemini or OpenAI key, `GEMINI_API_KEY` or `OPENAI_API_KEY`, as for the Copilot) only words them, and its text is refused if it holds any number that is not in the figures. Without a key, the note is written by rule. The newest note goes into the Summary Excel under "Note:-". Needs "Export reports" and no department limit.
- **Alerts** (Overview): lines over CTC, at 90% or more of CTC, more than 10% (and ₹1 Cr) above the initial budget, or whose balance runs out before the last OC date at the last 3 months' spending rate. Thresholds are at the top of `lib/budget/insights.ts`.

## Remarks, OC dates, sign-off, rate and balancing lines, memo items

- **Department remark** (Budget entry, on each department row): kept per version and printed in the Remark column of the department row and the recap in the Detail Excel. Whoever may edit the department's lines changes it.
- **OC dates** (Budget entry, "OC dates" panel): the OC date of each tower in this version, against the previous version. A date that moved needs a reason before the version is approved or submitted; the reason goes beside the OC date in the Detail Excel. The date on Towers & set-up is the planned one.
- **Sign-off chain** (Towers & set-up, "Sign-off chain"): levels in order, each with one or more approvers (any one signs). A project's own levels replace the levels for every project. With a chain, the preparer submits the draft (it is locked), each level signs in order or sends it back with a reason, the preparer can take it back, and the last signature approves it. Without a chain, the preparer approves directly, as before. The Detail Excel ends with the sign-off block (who signed each level and when).
- **Line rules** (Budget entry, "Rule" in the Source column): CTC typed; rate (₹ per sq ft) × an area of the version (Engg or Design construction area, carpet area, net sale area, sold area, …); the balance of a total (the total less the other lines of the category or department); or a memo item, listed for reference and outside every total (shown under the total in the Detail Excel, as in the format).

## Tower workings

- **Tower workings** (Budget planning → Tower workings): one tower at a time, as the company's per-tower construction cost sheet. Every line split to the tower (Budget entry → "Split a cost head by tower") with its rate per sq ft (amount ÷ the tower's construction BUA for the version), the amount certified by billing (typed), the balance to certify and the cost incurred. The tower's construction BUA and design area can be revised per version; blank uses the areas on Towers & set-up.
- **Allocation to towers**: every cost head split by tower, with each tower's amount, the part not yet allocated to a tower, and the Detail total. Towers plus not allocated always equal the Detail report, so the workbook's "Diff" row is built in.
- **Download Excel** on Tower workings: one sheet per tower in the tower cost sheet layout, plus an Allocation sheet with a Diff column (live formulas). Needs "Export reports".

## Supporting schedules

- **Give a line a schedule** (Budget entry → "Rule" → "Worked out in a schedule", with a title): the line's Estimated CTC then comes from the schedule and can no longer be typed. GST lines and memo items cannot have one.
- **Schedules** (Budget planning → Schedules): each schedule has rows of item, quantity, rate (₹), %, periods and remark. A row's amount is quantity × rate × % ÷ 100 × periods, or the amount typed for it (for example rent: tenants × monthly rent × 100% × months; stamp duty: value × 1 × 6% × 1). The total is the line's CTC, kept in step on every change, so every screen, report and total reads it as before.
- Schedules belong to a version: they change only on a draft, by whoever may edit the line, and are carried into the next version with their line. Removing a schedule keeps the line's last CTC, which can then be typed again.
- **Summary**: each summary row with a schedule behind it shows a link to the working. The Summary Excel adds one sheet per schedule (live formulas), and the summary row links to it.

## Cost incurred from bills

- **Record a bill** (Reports & actuals → Cost incurred): vendor, bill number, bill date, work order / PO and GST, split over one or more cost heads and towers with the basic amount of each. Each split counts as cost incurred in the bill's month, exactly like a typed or imported entry, so every report, period view and version picks it up. GST on the bill is kept for reference; GST cost is still worked out by the GST heads.
- The same bill number of the same vendor cannot be recorded twice in a project. Whoever has "Record cost incurred" for a department records bills on its heads; a bill split over several departments can be deleted only by someone who records cost for all of them. To correct a bill, delete it and record it again.
- **Bills** list: date, vendor, bill number, work order, the heads it is split over, basic, GST and total. **Download Excel** gives the bills dated up to the version's as-on month: a Bills sheet (basic summed from the splits by formula, GST, total) and a Splits sheet.
- **View, Edit, Delete**: click a bill (or View) to see its splits; Edit changes its details and splits together. Typed and imported entries have Edit and Delete; a bill's splits are changed on the bill.
- **Drill-down**: in the Detail report, the Cost incurred figure of a line links to the entries and bills behind it, up to the version's as-on month.

## Viewing and changing records

- **Budget line view**: View on any Budget entry line, or the category name in the Detail report, opens the line: its figures, how its CTC is set, the line in every version, comments (anyone who can see the project can comment and delete their own), and the change history for users with the audit right.
- **Towers & set-up**: edit the project's name, code and location; delete a tower or cost head added by mistake (refused once it has cost incurred, figures in an approved version, amounts in the open version, or, for a head, a GST head worked out on it); rename a cost head.
- **Schedules**: Rename changes a schedule's title and note.

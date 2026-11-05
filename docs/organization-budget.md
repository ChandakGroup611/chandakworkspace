# Organization Budget module

Budget by **Project > Tower > Department cost head**, kept as numbered **versions** (R1, R2, ...) instead of copied Excel files. All Excel formulas (Balance CTC, Variance, PSF, Utilised %, GST lines, totals, net sale carpet area) are calculated in the database, so every screen and report shows the same numbers.

Built for **Supabase** (PostgreSQL 15+) and **Next.js**, to be added as a module to the existing application.

| Folder | What it is |
| --- | --- |
| `supabase/migrations/` | Tables, calculation views, access rules (Row Level Security) and the version workflow. Everything is prefixed `budget_` so it sits beside your existing tables. |
| `supabase/seed/greenairy_r9.sql` | The Greenairy R9 detail workbook, ready to load as sample data. |
| `budget_tools/` | Excel importers (detail budget workbook, cost incurred sheet), and the calculation rules in Python used to check the database. |
| `preview/` | The clickable browser prototype (`engine.js` = the same rules in JavaScript, `importer.js` = reads the Excel files in the browser, `app.html` = screens). |
| `nextjs/` | The module's screens for a Next.js (App Router) app on Supabase; see `nextjs/README.md` for adding it to your application. |
| `dist/organization-budget-preview.html` | The built prototype, one file. |
| `samples/` | The two original formats, plus a revised R10 workbook and a cost incurred sheet to try the import with. |
| `tests/` | 34 tests: Excel totals, database views vs the rules, workflow, roles and rights, custom fields, both imports, browser engine and importer parity. The formula engine has its own tests in `nextjs/tests/`. |

## Decisions taken with management

- Subproject = tower. Each tower has a building type (Sales, Society, Rehab, Common Infra, MHADA, Reservation, Open Space/MCGM, School/Other) that places its construction cost on the Summary.
- Financial year April to March (Q1 = Apr-Jun). Set per project in `budget_projects.fy_start_month`.
- Cost incurred is entered by the responsible person (bill, PO or voucher reference), not imported from an ERP.
- The person who prepares a version approves it. Approval locks it. A line whose Estimated CTC moved more than 10% from the previous version needs a remark first.
- One draft version per project at a time. A new version starts as a copy of the latest approved one.

## Install on Supabase

1. Open the Supabase SQL editor (or use `supabase db push` from this folder) and run every file in `supabase/migrations/` in name order.
2. Point the module at the Chandak Workspace users (see below), then make the first administrator:
   ```sql
   insert into budget_members (user_id, role_id)
   values ('<workspace user id>', (select id from budget_roles where name = 'Administrator'));
   ```
   Everyone else is added from **Settings → Access** in the module.
3. Optional sample data: run `supabase/seed/greenairy_r9.sql`.

## Users, roles and rights

People are **not** created in the budget module. They are the Chandak Workspace users, read through one view, `budget_workspace_users (user_id, email, full_name)`. As shipped it reads Supabase `auth.users` (name from `raw_user_meta_data.full_name`). If Chandak Workspace keeps its users in its own table, change only that view, for example:

```sql
create or replace view public.budget_workspace_users with (security_invoker = false) as
select id as user_id, email, display_name as full_name from public.workspace_users where is_active;
```

Everything else about access lives in the budget module, edited on **Settings → Access** by anyone with the right *Manage roles, rights and members*:

- **Rights** (`budget_permissions`, fixed list of 14): see projects, create projects, maintain set-up, open versions, approve own versions, override others' versions, type budget figures, import budget workbooks, record cost, import cost sheets, export reports, see change history, manage custom fields, manage access.
- **Roles** (`budget_roles` + `budget_role_permissions`): created, renamed and deleted on screen; tick the rights each role has. Shipped with Administrator, Budget preparer, Department user and Management. Administrator always keeps every right and at least one active, unlimited administrator must remain (the database refuses otherwise).
- **Members** (`budget_members`): a workspace user, one role, and optional limits to some projects and some departments (empty = all). A department user limited to Finance can only type Finance lines and record Finance cost.

The database enforces all of it (Row Level Security and the workflow functions call `budget_has(right, project, department)`); the screens only hide what you cannot do.

## Custom fields and forms

On **Settings → Custom fields and forms** (right *Add, change and remove custom fields*) you add fields to five forms without a code change:

| Form | Where the fields appear |
| --- | --- |
| Budget line | Extra columns on Budget entry and the Detail report, one value per cost head line |
| Budget version | Version fields on Budget entry, the Summary and Detail reports |
| Tower | Extra columns in the Towers table |
| Cost incurred entry | Extra boxes when recording cost, and columns in the entries list |
| Project | Project details on the Overview |

The field designer asks, in order: what the field is (name, key, type, one project or all), its rules (choices, decimals, minimum, maximum, unit, length), how it is filled (typing, Excel import or both, and the Excel column header to read), whether it is required before approval, and where it is shown (section, order, entry screens, reports, an extra right needed to change it). Fields can be changed, switched off (values kept) or deleted.

Types: text, paragraph, number, whole number, amount in crores, amount in rupees, percentage, date, month, yes/no, dropdown, multi-select, email, phone, web link, workspace user, department, tower, and **calculated (formula)**.

**Formulas**, e.g. `quantity_value = planned_quantity * rate_per_unit`, use the other fields of the same form and the built-in figures (`initial`, `ctc`, `incurred`, `balance`, `variance`, `util_pct`, `psf_ctc`, `eng_area` on a line; `total_ctc`, `net_sale_carpet`, `as_on` and others on a version). Operators `+ - * / ^ %`, comparisons, `&` for text, and 32 functions: SUM, MIN, MAX, AVERAGE, ABS, ROUND, ROUNDUP, ROUNDDOWN, DIVIDE (safe division), PERCENT, IF, AND, OR, NOT, ISBLANK, IFBLANK, DAYS, MONTHS, ADDDAYS, ADDMONTHS, YEAR, MONTH, DAY, FY (April–March financial year), TODAY, CONCAT, LEN, UPPER, LOWER, TEXT, and on a version SUMLINES / COUNTLINES to total a line field. The designer shows clickable field keys and functions, checks the formula as you type, and has a "Try it" box to test it with sample numbers.

Both ways in give the same stored value: a typed value and an imported cell go through the same database check (`budget_custom_normalize`). The imports read any column whose header matches a field's Excel header; a cell that breaks the field's rules is listed in the preview and not saved, while the rest of the file is. Values carry over to the next version with the lines they belong to.

## How the results stay accurate

- **One place for each calculation.** Budget figures are calculated by database views; formula fields by one engine (`nextjs/src/lib/budget/formula.ts`) on the server. Screens and reports only display them, so two screens cannot disagree.
- **Exact decimals.** Amounts are stored in paise (whole numbers); formula fields calculate with exact decimals (0.1 + 0.2 is exactly 0.3) and round once, to the result type, half away from zero.
- **Checked before saving, whatever the source.** Typed and imported values pass the same database rules: numbers, decimals, minimum and maximum, choices, dates, emails, users, departments, towers. A value with more decimals than allowed is refused, not silently rounded. Saving several values is all or nothing, and the error lists every problem.
- **Formulas checked before they are saved.** Unknown fields (with a "did you mean"), wrong argument counts, text used in arithmetic, a wrong result type, and formulas that depend on each other in a loop are all refused. A field used in a formula cannot be deleted or switched off, and changing a field's type or choices is refused if stored values no longer fit.
- **Errors stay in their cell.** Division by zero or a missing input shows "Error" (with the reason on hover) on that value only; DIVIDE(a, b, 0) shows 0 instead.
- **Approval gates.** A version cannot be approved while required fields are empty or a line that moved more than 10% has no remark.
- **Imports are previewed against the database** (nothing saved), including a check of the system totals against the sheet's Total row.

## Typing a budget by hand, step by step

No Excel file is needed for any part of the cycle. The screens for it:

- **New project** (Projects home): name, code, location, financial-year start and the towers (name, building type, carpet and construction area, planned OC date) in one form. Cost heads are either typed on the next screen or copied from another project. Creating the project opens Get started.
- **Get started** (first tab of every project, for the preparer): the cycle in order with what is done and what is next, and the form for each step: towers and areas, budget lines, GST lines, open R1, type the figures, record cost incurred, send for sign-off. A project with no version opens here.
- **Add several lines** (Get started and Budget entry): a grid of rows (department, category, sub-category, Summary row, optional tower, Initial, CTC, remark) saved together; *Fill suggestions* adds a department's usual lines from the Summary format. Rows are checked first and nothing is saved while any row has a problem. A blank CTC starts equal to Initial. Existing cost heads are reused, so the grid can also update figures.
- **Line by line** (Budget entry → Line by line, `?mode=form`): one line at a time with Initial, CTC and remark, the previous version's CTC and the cost incurred so far, Save & next (Enter), a department filter and "only lines without a CTC". It edits the same lines as the sheet.
- **Add tower**: a full form (type, areas, OC date) instead of a name only.
- **Create budget** (Prepare budget → Create budget, `/budget/<project>/create`): one guided form with every input of the detail budget workbook, in six steps: version (as-on date, reason), project areas (total carpet, sold, Engg and Design construction area, sale value, residential / commercial / retail / society sale area, commitments, with the net sale carpet worked out), towers (name, building type, carpet, construction BUA, planned OC date), budget lines by department (category, sub-category, tower, Initial, CTC as an amount or ₹ per sq ft × an area, cost incurred till the as-on date, remark, department remark), GST lines (rate, eligible share, the lines it is charged on, or a typed override) and a review with department totals, errors and warnings (lines at 0, CTC moved more than 10% without a remark, towers without a type). It is filled from the open draft, or from the latest approved version, in which case saving opens the next version (through `budget_create_version`, the same copy as Start R…). Cost incurred typed here is cumulative like the workbook: only the difference from what is recorded is booked, dated the as-on month. Unsaved typing is kept in the browser until saved. Server action: `lib/budget/wizard-actions.ts`.

The server actions behind these are in `lib/budget/manual-actions.ts`; they write the same tables as the sheet and the import, so the database checks and access rules are unchanged.

## Two ways in: Excel import and typed entry

Both write to the same draft version, and every line and cost entry records where it came from (`source` = `excel` or `manual`, plus `import_id`). A typed change after an import flips the line to `manual`. The Field Map document lists which fields are typed, imported or calculated.

**Detail budget workbook** (the current format, unchanged). Brings in towers and OC dates, cost heads, GST rules, Initial Budget, Estimated CTC, remarks, areas and cumulative cost incurred. Balance, Variance, PSF, Utilised % and totals in the file are ignored and recalculated. It goes into the project's open draft, or opens a new draft copied from the latest approved version. Cost incurred is cumulative in the file, so only the difference from what is recorded is booked, dated the as-on month. Importing the same file twice changes nothing.

**Cost incurred sheet**, one row per bill or month, columns: `Month | Department | Category | Sub-category | Tower | Amount (Rs) | Reference`. Tower is optional. All rows must match a cost head (and tower) or nothing is saved; department users may only import their own department's rows.

From the application (the browser reads the file with `preview/importer.js` and SheetJS, then sends the payload):

```js
const wb = XLSX.read(bytes, { type: 'array', cellFormula: true, cellNF: true })
if (BudgetImporter.detectKind(XLSX, wb) === 'detail') {
  const payload = BudgetImporter.toImportPayload(BudgetImporter.parseDetailWorkbook(XLSX, wb, file.name))
  await supabase.rpc('budget_import_version', { p_project: projectId /* or null for a new project */, p_payload: payload })
  // returns { version_id, new_heads, new_towers, lines_changed, incurred_adjustments, lines_not_in_file }
} else {
  const sheet = BudgetImporter.parseCostSheet(XLSX, wb, file.name)          // { rows, errors }
  await supabase.rpc('budget_import_incurred', { p_project: projectId, p_payload: { file: file.name, rows: sheet.rows } })
}
```

From the command line (Python gives the same result):

```bash
pip install -r requirements.txt
python -m budget_tools.excel_import "Greenairy_30062026.xlsx" --sql seed.sql --json parsed.json
```
The importer reports what it found hidden in formulas (typed deductions, typed GST amounts, inconsistent GST shares) so it can be reviewed. `budget_imports` keeps the history of every import.

## Using it from the application

Read from the views; write to the tables; call the two functions for the workflow. Row Level Security applies to every call made with the signed-in user's session.

```js
// Detail report rows (department > category > line) with every calculated column
const { data } = await supabase.from('budget_line_figures').select('*')
  .eq('version_id', versionId).order('department_sort').order('cost_head_sort')

// Summary report
await supabase.from('budget_summary_rows').select('*').eq('version_id', versionId).order('category_sort').order('subcategory_sort')
await supabase.from('budget_category_totals').select('*').eq('version_id', versionId)   // budget vs incurred vs balance
await supabase.from('budget_version_totals').select('*').eq('project_id', projectId)    // version history
await supabase.from('budget_version_areas').select('*').eq('version_id', versionId)     // net sale carpet area

// Entry: amounts are stored in paise (1 crore = 1,000,000,000 paise)
await supabase.from('budget_lines').update({ ctc_paise: 20_000_000_000, remark: 'Second experience centre' }).eq('id', lineId)
await supabase.from('budget_incurred_entries').insert({ project_id, cost_head_id, month: '2026-08-01', amount_paise: 125_000_000, reference: 'Bill 123' })

// Workflow
await supabase.rpc('budget_create_version', { p_project: projectId, p_as_on: '2026-09-30', p_reason: 'Q2 revision' })
await supabase.rpc('budget_approve_version', { p_version: versionId })
await supabase.rpc('budget_compare', { p_from: r9Id, p_to: r10Id })
await supabase.rpc('budget_incurred_by_period', { p_project: projectId, p_grain: 'quarter' })  // month | quarter | year
```

GST lines: a cost head with `is_tax = true` is calculated as `base x tax_rate_pct% x tax_share_pct%` from the heads in `tax_base`. Leave the line's amount empty to calculate it, or type an amount to override.

## Tests

```bash
pip install -r requirements.txt
pytest tests                                   # Excel and browser engine checks
TEST_DATABASE_URL=postgresql://postgres@localhost/budget_test pytest tests   # also the database (wipes that database)
XLSX_MODULE=$(npm root -g)/xlsx pytest tests/test_preview_importer.py       # browser importer vs Python (needs node and the xlsx package)
```

## Rebuild the prototype

```bash
python preview/build.py "samples/Chandak Detail Budget Format.xlsx" dist/organization-budget-preview.html
```

## Next step

Build the screens inside the existing application against these views. Its framework decides how (React, Angular, .NET and so on); the prototype's screens show the layout to follow.

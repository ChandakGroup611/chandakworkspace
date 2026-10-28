# Organization Budget module: finishing the setup

The module's code, migrations and menu entries are in the repository. These steps finish the setup on this machine and in Supabase.

## 1. Install the Excel reader

```bash
npm install
```

`package.json` now lists `xlsx` (SheetJS 0.20.3 from cdn.sheetjs.com). The budget import uses it to read workbooks in the browser.

## 2. Run the five database migrations, in order

```
supabase/migrations/20261028120000_budget_module.sql          tables, calculation views, roles and rights, RLS
supabase/migrations/20261028120100_budget_import.sql          Excel import
supabase/migrations/20261028120200_budget_app.sql             functions used by the screens
supabase/migrations/20261028120300_budget_custom_fields.sql   custom fields and forms
supabase/migrations/20261028120400_budget_workspace_integration.sql
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

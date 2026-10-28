-- Rollback for the Organization Budget module (migrations 20261028120000 .. 20261028120900).
-- Removes only what those migrations added. Run it in the Supabase SQL editor only if you need to undo the go-live.
-- WARNING: it also deletes any budget data entered after go-live.
begin;

-- 1. Module access rows and the module itself (the only rows added to existing tables).
delete from public.user_modules
 where module_id in (select id from public.modules_master where code = 'ORG_BUDGET');
delete from public.modules_master where code = 'ORG_BUDGET';

-- 2. Views, then tables (cascade removes their triggers, policies, indexes and sequences).
drop view if exists public.budget_workspace_users, public.budget_summary_rows, public.budget_category_totals,
  public.budget_department_totals, public.budget_version_totals, public.budget_line_figures, public.budget_version_areas cascade;
drop table if exists public.budget_bills, public.budget_schedule_rows, public.budget_schedules, public.budget_signoffs, public.budget_signoff_levels, public.budget_ai_notes, public.budget_audit_log, public.budget_comments, public.budget_custom_values, public.budget_custom_fields,
  public.budget_incurred_entries, public.budget_imports, public.budget_lines, public.budget_versions, public.budget_subprojects,
  public.budget_summary_template, public.budget_cost_heads, public.budget_departments, public.budget_role_permissions,
  public.budget_members, public.budget_permissions, public.budget_roles, public.budget_projects cascade;

-- 3. Every budget_ function.
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname like 'budget\_%' loop
    execute 'drop function if exists ' || f.sig || ' cascade';
  end loop;
end $$;

commit;

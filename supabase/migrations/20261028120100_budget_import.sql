-- Excel import alongside manual entry.
--
-- The application reads a workbook in the browser (preview/importer.js), shows a preview, and on Save
-- calls one of these functions with the parsed rows. Each import is saved in one transaction and logged.
-- Every budget figure and cost entry records whether it was last set from Excel or typed on screen.

create table public.budget_imports (
  id bigint generated always as identity primary key,
  project_id bigint not null references public.budget_projects on delete cascade,
  version_id bigint references public.budget_versions on delete set null,
  kind text not null check (kind in ('detail', 'cost')),
  file_name text,
  imported_by uuid default auth.uid() references auth.users,
  imported_at timestamptz not null default now(),
  summary jsonb not null default '{}'
);
alter table public.budget_imports enable row level security;
create policy read_project on public.budget_imports for select to authenticated using (public.budget_has('project.view', project_id));

alter table public.budget_lines
  add column source text not null default 'manual' check (source in ('manual', 'excel')),
  add column import_id bigint references public.budget_imports on delete set null;
alter table public.budget_incurred_entries
  add column source text not null default 'manual' check (source in ('manual', 'excel')),
  add column import_id bigint references public.budget_imports on delete set null;

-- Inside an import, budget.import_id holds the import's id for the transaction.
create function public.budget_current_import() returns bigint
language sql stable as $$
  select nullif(current_setting('budget.import_id', true), '')::bigint
$$;

-- Lines: as before (lock approved versions, stay inside the project), plus source tracking.
create or replace function public.budget_guard_line() returns trigger
language plpgsql as $$
declare
  v record;
  imp bigint := public.budget_current_import();
begin
  select status, project_id into v from public.budget_versions
  where id = case when tg_op = 'DELETE' then old.version_id else new.version_id end;
  if v.status <> 'draft' then
    raise exception 'Version is approved and locked; open a new version to make changes';
  end if;
  if tg_op <> 'DELETE' then
    if not exists (select 1 from public.budget_cost_heads h where h.id = new.cost_head_id and h.project_id = v.project_id) then
      raise exception 'Cost head % does not belong to this project', new.cost_head_id;
    end if;
    if new.subproject_id is not null and not exists (
      select 1 from public.budget_subprojects s where s.id = new.subproject_id and s.project_id = v.project_id) then
      raise exception 'Tower % does not belong to this project', new.subproject_id;
    end if;
    if imp is not null then
      new.source := 'excel';
      new.import_id := imp;
    elsif tg_op = 'UPDATE' and (new.initial_paise is distinct from old.initial_paise
                                or new.ctc_paise is distinct from old.ctc_paise
                                or new.incurred_override_paise is distinct from old.incurred_override_paise) then
      new.source := 'manual';
      new.import_id := null;
    end if;
    new.updated_at := now();
    new.updated_by := coalesce(auth.uid(), new.updated_by);
  end if;
  return coalesce(new, old);
end $$;

create or replace function public.budget_guard_entry() returns trigger
language plpgsql as $$
declare
  imp bigint := public.budget_current_import();
begin
  if not exists (select 1 from public.budget_cost_heads h where h.id = new.cost_head_id and h.project_id = new.project_id) then
    raise exception 'Cost head % does not belong to this project', new.cost_head_id;
  end if;
  if new.subproject_id is not null and not exists (
    select 1 from public.budget_subprojects s where s.id = new.subproject_id and s.project_id = new.project_id) then
    raise exception 'Tower % does not belong to this project', new.subproject_id;
  end if;
  if imp is not null then
    new.source := 'excel';
    new.import_id := imp;
  elsif tg_op = 'UPDATE' then
    new.source := 'manual';
    new.import_id := null;
  end if;
  return new;
end $$;

-- Import a detail-format workbook into the project's draft version (opened from the latest approved
-- version when there is none). p_project null creates the project. Payload: see preview/importer.js
-- toImportPayload(): {file, project {name, code}, as_on, areas, subprojects [{name, oc_date}],
-- cost_heads [{key, department, summary_category, category, sub_category, note, summary_subcategory,
-- sort, is_tax, tax_rate_pct, tax_share_pct, tax_base [keys]}], lines [{head, initial, ctc,
-- incurred_override, remark}], incurred [{head, amount, reference}] (cumulative to as_on), warnings,
-- sheet_totals_cr}. Amounts in paise.
create function public.budget_import_version(p_project bigint, p_payload jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_project bigint := p_project;
  v_version bigint;
  v_import bigint;
  v_as_on date := (p_payload ->> 'as_on')::date;
  v_month date := date_trunc('month', (p_payload ->> 'as_on')::date)::date;
  r jsonb;
  v_dept bigint;
  v_head bigint;
  v_line public.budget_lines;
  v_existing bigint;
  v_diff bigint;
  head_ids jsonb := '{}';
  n_heads int := 0;
  n_towers int := 0;
  n_lines int := 0;
  n_adjust int := 0;
  n_untouched int := 0;
  n_custom int := 0;
  custom_problems text[] := '{}';
  v_line_id bigint;
begin
  if (p_project is null and not public.budget_has('project.create')) or not public.budget_has('budget.import', p_project) then
    raise exception 'You do not have the right to import a budget workbook into this project';
  end if;
  if v_as_on is null then
    raise exception 'The workbook has no as-on date';
  end if;
  if v_project is null then
    insert into public.budget_projects (code, name)
    values (p_payload #>> '{project,code}', p_payload #>> '{project,name}')
    returning id into v_project;
  end if;
  if exists (select 1 from public.budget_versions where project_id = v_project and status = 'draft' and as_on <> v_as_on) then
    -- the open draft takes the workbook's date
    update public.budget_versions set as_on = v_as_on where project_id = v_project and status = 'draft';
  end if;

  insert into public.budget_imports (project_id, kind, file_name)
  values (v_project, 'detail', p_payload ->> 'file') returning id into v_import;

  -- Towers: add the ones not there yet.
  for r in select * from jsonb_array_elements(coalesce(p_payload -> 'subprojects', '[]')) loop
    if not exists (select 1 from public.budget_subprojects where project_id = v_project and lower(name) = lower(r ->> 'name')) then
      insert into public.budget_subprojects (project_id, name, oc_date, sort)
      values (v_project, r ->> 'name', (r ->> 'oc_date')::date,
              coalesce((select max(sort) from public.budget_subprojects where project_id = v_project), 0) + 1);
      n_towers := n_towers + 1;
    end if;
  end loop;

  -- Cost heads: match by department, category and sub-category; add the rest.
  for r in select * from jsonb_array_elements(p_payload -> 'cost_heads') loop
    insert into public.budget_departments (name, summary_category, sort)
    values (r ->> 'department', r ->> 'summary_category', coalesce((select max(sort) from public.budget_departments), 0) + 1)
    on conflict (name) do nothing;
    select id into v_dept from public.budget_departments where name = r ->> 'department';
    v_head := null;
    select id into v_head from public.budget_cost_heads
    where project_id = v_project and department_id = v_dept
      and lower(btrim(category)) = lower(btrim(r ->> 'category'))
      and lower(btrim(coalesce(sub_category, ''))) = lower(btrim(coalesce(r ->> 'sub_category', '')))
    limit 1;
    if v_head is null then
      insert into public.budget_cost_heads (project_id, department_id, category, sub_category, note, summary_subcategory, sort,
                                            is_tax, tax_rate_pct, tax_share_pct)
      values (v_project, v_dept, r ->> 'category', r ->> 'sub_category', r ->> 'note', r ->> 'summary_subcategory',
              coalesce((select max(sort) from public.budget_cost_heads where project_id = v_project), 0) + 1,
              coalesce((r ->> 'is_tax')::boolean, false), (r ->> 'tax_rate_pct')::numeric, (r ->> 'tax_share_pct')::numeric)
      returning id into v_head;
      n_heads := n_heads + 1;
    elsif coalesce((r ->> 'is_tax')::boolean, false) then
      update public.budget_cost_heads
      set is_tax = true, tax_rate_pct = (r ->> 'tax_rate_pct')::numeric, tax_share_pct = (r ->> 'tax_share_pct')::numeric
      where id = v_head;
    end if;
    head_ids := head_ids || jsonb_build_object(r ->> 'key', v_head);
  end loop;
  for r in select * from jsonb_array_elements(p_payload -> 'cost_heads') where (value ->> 'is_tax')::boolean loop
    update public.budget_cost_heads
    set tax_base = coalesce((select array_agg((head_ids ->> k)::bigint) from jsonb_array_elements_text(r -> 'tax_base') k), '{}')
    where id = (head_ids ->> (r ->> 'key'))::bigint;
  end loop;

  -- Target: the open draft, or a new draft copied from the latest approved version.
  select id into v_version from public.budget_versions where project_id = v_project and status = 'draft';
  if v_version is null then
    v_version := public.budget_create_version(v_project, v_as_on, 'Imported from ' || coalesce(p_payload ->> 'file', 'Excel'));
  end if;
  update public.budget_versions set areas = areas || coalesce(p_payload -> 'areas', '{}') where id = v_version;

  perform set_config('budget.import_id', v_import::text, true);

  -- Budget lines: Initial Budget, Estimated CTC, override, remark.
  for r in select * from jsonb_array_elements(p_payload -> 'lines') loop
    v_head := (head_ids ->> (r ->> 'head'))::bigint;
    select * into v_line from public.budget_lines where version_id = v_version and cost_head_id = v_head and subproject_id is null;
    if v_line.id is null then
      insert into public.budget_lines (version_id, cost_head_id, initial_paise, ctc_paise, incurred_override_paise, remark)
      values (v_version, v_head, (r ->> 'initial')::bigint, (r ->> 'ctc')::bigint, (r ->> 'incurred_override')::bigint, r ->> 'remark');
      n_lines := n_lines + 1;
    elsif v_line.initial_paise is distinct from (r ->> 'initial')::bigint
       or v_line.ctc_paise is distinct from (r ->> 'ctc')::bigint
       or v_line.incurred_override_paise is distinct from (r ->> 'incurred_override')::bigint
       or (r ->> 'remark' is not null and v_line.remark is distinct from r ->> 'remark') then
      update public.budget_lines
      set initial_paise = (r ->> 'initial')::bigint, ctc_paise = (r ->> 'ctc')::bigint,
          incurred_override_paise = (r ->> 'incurred_override')::bigint, remark = coalesce(r ->> 'remark', remark)
      where id = v_line.id;
      n_lines := n_lines + 1;
    end if;
    v_line := null;
    -- Custom field columns of this row (budget_custom_import_* are in the custom fields migration).
    if r ? 'extra' then
      select id into v_line_id from public.budget_lines where version_id = v_version and cost_head_id = v_head and subproject_id is null;
      custom_problems := custom_problems || (select coalesce(array_agg(coalesce(h.sub_category, h.category) || ' · ' || x), '{}')
                                             from unnest(public.budget_custom_import_check('line', v_project, r -> 'extra')) x,
                                                  public.budget_cost_heads h where h.id = v_head);
      n_custom := n_custom + public.budget_custom_import_apply('line', v_project, v_line_id, r -> 'extra', v_import);
    end if;
  end loop;
  select count(*) into n_untouched from public.budget_lines l
  where l.version_id = v_version and l.subproject_id is null
    and not exists (select 1 from jsonb_each_text(head_ids) k where k.value::bigint = l.cost_head_id);

  -- Cost incurred: the workbook is cumulative to the as-on date; book only the difference.
  for r in select * from jsonb_array_elements(coalesce(p_payload -> 'incurred', '[]')) loop
    v_head := (head_ids ->> (r ->> 'head'))::bigint;
    select coalesce(sum(amount_paise), 0) into v_existing from public.budget_incurred_entries
    where project_id = v_project and cost_head_id = v_head and month <= v_month;
    v_diff := (r ->> 'amount')::bigint - v_existing;
    if v_diff <> 0 then
      insert into public.budget_incurred_entries (project_id, cost_head_id, month, amount_paise, reference)
      values (v_project, v_head, v_month, v_diff,
              case when v_existing = 0 then 'Opening balance from ' else 'Adjustment to match ' end || coalesce(r ->> 'reference', 'Excel'));
      n_adjust := n_adjust + 1;
    end if;
  end loop;

  perform set_config('budget.import_id', '', true);
  update public.budget_imports
  set version_id = v_version,
      summary = jsonb_build_object('new_heads', n_heads, 'new_towers', n_towers, 'lines_changed', n_lines,
                                   'incurred_adjustments', n_adjust, 'lines_not_in_file', n_untouched,
                                   'custom_values', n_custom, 'custom_problems', to_jsonb(custom_problems),
                                   'warnings', coalesce(p_payload -> 'warnings', '[]'),
                                   'sheet_totals_cr', p_payload -> 'sheet_totals_cr')
  where id = v_import;
  return jsonb_build_object('project_id', v_project, 'version_id', v_version, 'import_id', v_import,
                            'new_heads', n_heads, 'new_towers', n_towers, 'lines_changed', n_lines,
                            'incurred_adjustments', n_adjust, 'lines_not_in_file', n_untouched,
                            'custom_values', n_custom, 'custom_problems', to_jsonb(custom_problems));
end $$;

revoke execute on function public.budget_import_version(bigint, jsonb) from public, anon;
grant execute on function public.budget_import_version(bigint, jsonb) to authenticated;

-- Same view as before with two columns added at the end: where each line's figures came from.
create or replace view public.budget_line_figures with (security_invoker = true) as
with inc as (
  select l.id as line_id, coalesce(sum(e.amount_paise), 0)::bigint as amount, count(e.id) as n
  from public.budget_lines l
  join public.budget_versions v on v.id = l.version_id
  left join public.budget_incurred_entries e
    on e.project_id = v.project_id
   and e.cost_head_id = l.cost_head_id
   and e.subproject_id is not distinct from l.subproject_id
   and e.month <= date_trunc('month', v.as_on)::date
  group by l.id
),
plain as (
  select l.id, l.version_id, l.cost_head_id,
         coalesce(l.initial_paise, 0) as initial,
         coalesce(l.ctc_paise, 0) as ctc,
         coalesce(l.incurred_override_paise, inc.amount) as incurred
  from public.budget_lines l
  join public.budget_cost_heads h on h.id = l.cost_head_id
  join inc on inc.line_id = l.id
  where not h.is_tax
),
base as (
  select t.id as line_id, sum(p.initial) as initial, sum(p.ctc) as ctc, sum(p.incurred) as incurred
  from public.budget_lines t
  join public.budget_cost_heads h on h.id = t.cost_head_id and h.is_tax
  join plain p on p.version_id = t.version_id and p.cost_head_id = any (h.tax_base)
  group by t.id
),
fig as (
  select l.id as line_id, l.version_id, l.cost_head_id, l.subproject_id, l.remark, h.is_tax, l.source, l.import_id,
    case when not h.is_tax then coalesce(l.initial_paise, 0)
         when l.initial_paise is not null then l.initial_paise
         when l.subproject_id is null then round(coalesce(b.initial, 0) * h.tax_rate_pct * coalesce(h.tax_share_pct, 100) / 10000)::bigint
         else 0 end as initial_paise,
    case when not h.is_tax then coalesce(l.ctc_paise, 0)
         when l.ctc_paise is not null then l.ctc_paise
         when l.subproject_id is null then round(coalesce(b.ctc, 0) * h.tax_rate_pct * coalesce(h.tax_share_pct, 100) / 10000)::bigint
         else 0 end as ctc_paise,
    case when l.incurred_override_paise is not null then l.incurred_override_paise
         when not h.is_tax or inc.n > 0 then inc.amount
         when l.subproject_id is null then round(coalesce(b.incurred, 0) * h.tax_rate_pct * coalesce(h.tax_share_pct, 100) / 10000)::bigint
         else 0 end as incurred_paise,
    (h.is_tax and l.initial_paise is null and l.subproject_id is null) as initial_calculated,
    (h.is_tax and l.ctc_paise is null and l.subproject_id is null) as ctc_calculated,
    case when l.incurred_override_paise is not null then 'override'
         when not h.is_tax or inc.n > 0 then 'entries'
         else 'tax rule' end as incurred_source
  from public.budget_lines l
  join public.budget_cost_heads h on h.id = l.cost_head_id
  join inc on inc.line_id = l.id
  left join base b on b.line_id = l.id
)
select
  f.line_id, f.version_id, v.project_id, v.number as version_number,
  f.cost_head_id, h.department_id, d.name as department, d.summary_category, d.sort as department_sort,
  h.category, h.sub_category, h.note, h.sort as cost_head_sort, f.is_tax,
  f.subproject_id, s.name as subproject, s.type as subproject_type,
  case when d.summary_category = 'Construction' and not f.is_tax
       then coalesce(s.type, h.summary_subcategory, 'Not allocated to a building')
       else coalesce(h.summary_subcategory, 'Other') end as summary_subcategory,
  f.initial_paise, f.ctc_paise, f.incurred_paise,
  f.ctc_paise - f.incurred_paise as balance_paise,
  f.initial_paise - f.ctc_paise as variance_paise,
  round(f.initial_paise / 1e9, 6) as initial_cr,
  round(f.ctc_paise / 1e9, 6) as ctc_cr,
  round(f.incurred_paise / 1e9, 6) as incurred_cr,
  round((f.ctc_paise - f.incurred_paise) / 1e9, 6) as balance_cr,      -- d = b - c
  round((f.initial_paise - f.ctc_paise) / 1e9, 6) as variance_cr,     -- a - b
  round(f.incurred_paise * 100.0 / nullif(f.ctc_paise, 0), 2) as util_pct,  -- c / b
  round(f.initial_paise / 100.0 / nullif((v.areas ->> 'eng_area')::numeric, 0), 2) as psf_initial,
  round(f.ctc_paise / 100.0 / nullif((v.areas ->> 'eng_area')::numeric, 0), 2) as psf_ctc,
  f.initial_calculated, f.ctc_calculated, f.incurred_source,
  (f.ctc_paise > 0 and f.incurred_paise > f.ctc_paise) as over_budget,
  f.remark,
  f.source,      -- 'excel' or 'manual': where Initial / CTC / override were last set
  f.import_id
from fig f
join public.budget_versions v on v.id = f.version_id
join public.budget_cost_heads h on h.id = f.cost_head_id
join public.budget_departments d on d.id = h.department_id
left join public.budget_subprojects s on s.id = f.subproject_id;

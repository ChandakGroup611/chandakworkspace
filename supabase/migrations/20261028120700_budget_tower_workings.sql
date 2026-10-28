-- Organization Budget: tower workings, as the company's per-tower construction cost sheets.
--   * Each budget line can carry the amount certified so far (from billing), kept per version.
--   * Each tower can carry its construction BUA and design area for the version (a revision of the
--     tower's own areas), so the rate per sq ft of every work package follows the version.
--   * budget_tower_workings: for each tower, every line split to it, with rate per sq ft, certified and
--     balance to certify.
--   * budget_allocation_check: for every cost head split by tower, how much of its total is allocated to
--     towers and how much is not, the check the workbook does with its "Diff" row.
-- Only adds a column, views and replaces budget_create_version (same signature). Runs after 20261028120600.

alter table public.budget_lines
  add column certified_paise bigint check (certified_paise >= 0);   -- certified by billing, up to the version's date

comment on column public.budget_versions.tower_notes is
  'Per tower id: {"oc_date": "yyyy-mm-dd", "reason": "...", "bua": construction BUA sft, "design_area": sft} for this version.';

-- Same as before, also copying the certified amount.
create or replace function public.budget_create_version(p_project bigint, p_as_on date, p_reason text default null, p_source bigint default null)
returns bigint
language plpgsql security definer set search_path = public as $$
declare
  src public.budget_versions;
  new_id bigint;
begin
  if not public.budget_has('version.open', p_project) then
    raise exception 'You do not have the right to open a new version of this project';
  end if;
  if exists (select 1 from public.budget_versions where project_id = p_project and status <> 'approved') then
    raise exception 'This project already has an open version; approve or delete it first';
  end if;
  if p_source is not null then
    select * into src from public.budget_versions where id = p_source and project_id = p_project;
  else
    select * into src from public.budget_versions where project_id = p_project and status = 'approved'
    order by number desc limit 1;
  end if;

  insert into public.budget_versions (project_id, number, as_on, reason, parent_id, areas, category_reasons, prepared_by)
  values (p_project,
          coalesce((select max(number) from public.budget_versions where project_id = p_project), 0) + 1,
          p_as_on, p_reason, src.id, coalesce(src.areas, '{}'), '{}', auth.uid())
  returning id into new_id;

  if src.id is not null then
    insert into public.budget_lines (version_id, cost_head_id, subproject_id, initial_paise, ctc_paise, incurred_override_paise, remark, source, import_id,
                                     ctc_rate, ctc_basis, balance_of_paise, balance_scope, is_memo, certified_paise)
    select new_id, cost_head_id, subproject_id, initial_paise, ctc_paise, incurred_override_paise, remark, source, import_id,
           ctc_rate, ctc_basis, balance_of_paise, balance_scope, is_memo, certified_paise
    from public.budget_lines where version_id = src.id;
  else
    insert into public.budget_lines (version_id, cost_head_id, initial_paise, ctc_paise)
    select new_id, h.id, case when h.is_tax then null else 0 end, case when h.is_tax then null else 0 end
    from public.budget_cost_heads h where h.project_id = p_project and h.active;
  end if;
  return new_id;
end $$;

-- Tower BUA and design area of a version: as revised in the version, otherwise the tower's own.
create view public.budget_tower_areas with (security_invoker = true) as
select v.id as version_id, s.id as tower_id, s.project_id, s.name, s.type, s.sort,
  coalesce((v.tower_notes -> s.id::text ->> 'bua')::numeric, s.eng_area) as bua,
  coalesce((v.tower_notes -> s.id::text ->> 'design_area')::numeric, s.design_area) as design_area,
  s.eng_area as planned_bua, s.design_area as planned_design_area
from public.budget_versions v
join public.budget_subprojects s on s.project_id = v.project_id;

-- Every line split to a tower, with the figures of the tower sheet.
create view public.budget_tower_workings with (security_invoker = true) as
select f.version_id, f.subproject_id as tower_id, f.line_id, f.cost_head_id, f.department, f.department_sort, f.category, f.sub_category,
  f.cost_head_sort, f.is_tax, f.is_memo, f.ctc_paise, f.incurred_paise, l.certified_paise,
  f.ctc_paise - coalesce(l.certified_paise, 0) as to_certify_paise,
  round(f.ctc_paise / 100.0 / nullif(ta.bua, 0), 2) as rate_psf,     -- ₹ per sq ft of construction BUA
  f.remark
from public.budget_line_figures f
join public.budget_lines l on l.id = f.line_id
join public.budget_tower_areas ta on ta.version_id = f.version_id and ta.tower_id = f.subproject_id
where f.subproject_id is not null;

-- Cost heads split by tower: total, allocated to towers, not allocated (the workbook's "Diff").
create view public.budget_allocation_check with (security_invoker = true) as
select f.version_id, f.cost_head_id, f.department, f.department_sort, f.category, f.sub_category, f.cost_head_sort,
  sum(f.ctc_paise) as total_paise,
  sum(f.ctc_paise) filter (where f.subproject_id is not null) as allocated_paise,
  coalesce(sum(f.ctc_paise) filter (where f.subproject_id is null), 0) as unallocated_paise,
  count(*) filter (where f.subproject_id is not null) as towers
from public.budget_line_figures f
where not f.is_memo
group by 1, 2, 3, 4, 5, 6, 7
having count(*) filter (where f.subproject_id is not null) > 0;

-- Tower BUA and design area for a draft: the preparer (or set-up right), as the OC dates.
create function public.budget_set_tower_areas(p_version bigint, p_tower bigint, p_bua numeric, p_design numeric)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v public.budget_versions;
  note jsonb;
begin
  select * into v from public.budget_versions where id = p_version for update;
  if v.id is null or v.status <> 'draft' then
    raise exception 'Tower areas are changed on a draft version';
  end if;
  if not exists (select 1 from public.budget_subprojects where id = p_tower and project_id = v.project_id) then
    raise exception 'Tower % does not belong to this project', p_tower;
  end if;
  if not ((v.prepared_by = auth.uid() and public.budget_has('version.open', v.project_id))
          or public.budget_has('version.override', v.project_id) or public.budget_has('project.setup', v.project_id)) then
    raise exception 'Only the preparer of this draft changes tower areas';
  end if;
  if p_bua < 0 or p_design < 0 then
    raise exception 'Areas cannot be negative';
  end if;
  note := coalesce(v.tower_notes -> p_tower::text, '{}') - 'bua' - 'design_area'
          || jsonb_strip_nulls(jsonb_build_object('bua', p_bua, 'design_area', p_design));
  update public.budget_versions
  set tower_notes = case when note = '{}' then tower_notes - p_tower::text else tower_notes || jsonb_build_object(p_tower::text, note) end
  where id = p_version;
end $$;

-- budget_set_tower_note keeps the areas it does not set.
create or replace function public.budget_set_tower_note(p_version bigint, p_tower bigint, p_oc_date date, p_reason text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v public.budget_versions;
  note jsonb;
begin
  select * into v from public.budget_versions where id = p_version for update;
  if v.id is null or v.status <> 'draft' then
    raise exception 'OC dates are changed on a draft version';
  end if;
  if not exists (select 1 from public.budget_subprojects where id = p_tower and project_id = v.project_id) then
    raise exception 'Tower % does not belong to this project', p_tower;
  end if;
  if not ((v.prepared_by = auth.uid() and public.budget_has('version.open', v.project_id))
          or public.budget_has('version.override', v.project_id) or public.budget_has('project.setup', v.project_id)) then
    raise exception 'Only the preparer of this draft changes OC dates';
  end if;
  note := coalesce(v.tower_notes -> p_tower::text, '{}') - 'oc_date' - 'reason'
          || jsonb_strip_nulls(jsonb_build_object('oc_date', p_oc_date, 'reason', nullif(btrim(p_reason), '')));
  update public.budget_versions
  set tower_notes = case when note = '{}' then tower_notes - p_tower::text else tower_notes || jsonb_build_object(p_tower::text, note) end
  where id = p_version;
end $$;

revoke execute on function public.budget_set_tower_areas(bigint, bigint, numeric, numeric) from public, anon;
grant execute on function public.budget_set_tower_areas(bigint, bigint, numeric, numeric) to authenticated;

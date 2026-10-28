-- What the Next.js screens need beyond the tables and views:
-- an import preview that saves nothing, a cost sheet check, project creation by hand,
-- and a first version with a zero line for every cost head.

-- A version opened with no approved version before it gets a zero line for every active cost head
-- (blank for GST heads, so their rule calculates them).
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
  if exists (select 1 from public.budget_versions where project_id = p_project and status = 'draft') then
    raise exception 'This project already has a draft version; approve or delete it first';
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
    insert into public.budget_lines (version_id, cost_head_id, subproject_id, initial_paise, ctc_paise, incurred_override_paise, remark, source, import_id)
    select new_id, cost_head_id, subproject_id, initial_paise, ctc_paise, incurred_override_paise, remark, source, import_id
    from public.budget_lines where version_id = src.id;
  else
    insert into public.budget_lines (version_id, cost_head_id, initial_paise, ctc_paise)
    select new_id, h.id, case when h.is_tax then null else 0 end, case when h.is_tax then null else 0 end
    from public.budget_cost_heads h where h.project_id = p_project and h.active;
  end if;
  return new_id;
end $$;

-- A project typed in by hand: towers named Tower 1..n, and optionally the cost heads of another project
-- (GST rules point at the copied heads).
create function public.budget_create_project(p_name text, p_code text, p_towers int default 0, p_copy_heads_from bigint default null)
returns bigint
language plpgsql security definer set search_path = public as $$
declare
  v_project bigint;
  map jsonb := '{}';
  h public.budget_cost_heads;
  v_new bigint;
begin
  if not public.budget_has('project.create') then
    raise exception 'You do not have the right to create projects';
  end if;
  if nullif(btrim(p_name), '') is null or nullif(btrim(p_code), '') is null then
    raise exception 'Give the project a name and a code';
  end if;
  if exists (select 1 from public.budget_projects where lower(name) = lower(btrim(p_name)) or lower(code) = lower(btrim(p_code))) then
    raise exception 'A project with that name or code already exists';
  end if;
  insert into public.budget_projects (name, code) values (btrim(p_name), upper(btrim(p_code))) returning id into v_project;
  insert into public.budget_subprojects (project_id, name, sort)
  select v_project, 'Tower ' || n, n from generate_series(1, least(greatest(coalesce(p_towers, 0), 0), 50)) n;
  if p_copy_heads_from is not null then
    for h in select * from public.budget_cost_heads where project_id = p_copy_heads_from and active order by sort loop
      insert into public.budget_cost_heads (project_id, department_id, category, sub_category, note, summary_subcategory, sort,
                                            is_tax, tax_rate_pct, tax_share_pct)
      values (v_project, h.department_id, h.category, h.sub_category, h.note, h.summary_subcategory, h.sort,
              h.is_tax, h.tax_rate_pct, h.tax_share_pct)
      returning id into v_new;
      map := map || jsonb_build_object(h.id::text, v_new);
    end loop;
    update public.budget_cost_heads n
    set tax_base = coalesce((select array_agg((map ->> b::text)::bigint) from unnest(o.tax_base) b where map ? b::text), '{}')
    from public.budget_cost_heads o
    where n.project_id = v_project and n.is_tax and o.project_id = p_copy_heads_from and (map ->> o.id::text)::bigint = n.id;
  end if;
  return v_project;
end $$;

-- What a detail workbook import would do, without saving anything: runs budget_import_version and
-- rolls it back. Returns its counts plus the lines that change, the cost entries it would book,
-- new heads and towers, and the version totals after the import (to check against the sheet).
create function public.budget_preview_import(p_project bigint, p_payload jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  res jsonb;
  result jsonb;
  v_before bigint;
  v_draft int;
  before jsonb := '{}';
  max_head bigint;
  max_tower bigint;
  v_month date := date_trunc('month', (p_payload ->> 'as_on')::date)::date;
begin
  if (p_project is null and not public.budget_has('project.create')) or not public.budget_has('budget.import', p_project) then
    raise exception 'You do not have the right to import a budget workbook into this project';
  end if;
  select coalesce(max(id), 0) into max_head from public.budget_cost_heads;
  select coalesce(max(id), 0) into max_tower from public.budget_subprojects;
  select id, number into v_before, v_draft from public.budget_versions where project_id = p_project and status = 'draft';
  if v_before is null then
    select id into v_before from public.budget_versions where project_id = p_project and status = 'approved' order by number desc limit 1;
  end if;
  select coalesce(jsonb_object_agg(cost_head_id::text, jsonb_build_array(initial_paise, ctc_paise, remark)), '{}') into before
  from public.budget_lines where version_id = v_before and subproject_id is null;

  begin
    res := public.budget_import_version(p_project, p_payload);
    result := res || jsonb_build_object(
      'into', case when p_project is null then 'new project' when v_draft is not null then 'open draft' else 'new draft' end,
      'version_number', (select number from public.budget_versions where id = (res ->> 'version_id')::bigint),
      'totals', (select jsonb_build_object('initial_cr', initial_cr, 'ctc_cr', ctc_cr, 'incurred_cr', incurred_cr)
                 from public.budget_version_totals where version_id = (res ->> 'version_id')::bigint),
      'changes', (select coalesce(jsonb_agg(jsonb_build_object(
                    'department', d.name, 'head', coalesce(h.sub_category, h.category),
                    'initial_before', before -> l.cost_head_id::text -> 0, 'initial_after', l.initial_paise,
                    'ctc_before', before -> l.cost_head_id::text -> 1, 'ctc_after', l.ctc_paise,
                    'remark', l.remark) order by d.sort, h.sort), '[]')
                  from public.budget_lines l
                  join public.budget_cost_heads h on h.id = l.cost_head_id
                  join public.budget_departments d on d.id = h.department_id
                  where l.version_id = (res ->> 'version_id')::bigint and l.import_id = (res ->> 'import_id')::bigint
                    and l.subproject_id is null
                    and (before -> l.cost_head_id::text is null
                         or (before -> l.cost_head_id::text ->> 0)::bigint is distinct from l.initial_paise
                         or (before -> l.cost_head_id::text ->> 1)::bigint is distinct from l.ctc_paise
                         or (before -> l.cost_head_id::text ->> 2) is distinct from l.remark)),
      'adjustments', (select coalesce(jsonb_agg(jsonb_build_object(
                        'department', d.name, 'head', coalesce(h.sub_category, h.category),
                        'recorded', (select coalesce(sum(o.amount_paise), 0) from public.budget_incurred_entries o
                                     where o.project_id = e.project_id and o.cost_head_id = e.cost_head_id and o.month <= v_month and o.id <> e.id),
                        'entry', e.amount_paise) order by d.sort, h.sort), '[]')
                      from public.budget_incurred_entries e
                      join public.budget_cost_heads h on h.id = e.cost_head_id
                      join public.budget_departments d on d.id = h.department_id
                      where e.import_id = (res ->> 'import_id')::bigint),
      'new_head_names', (select coalesce(jsonb_agg(d.name || ' · ' || coalesce(h.sub_category, h.category) order by h.id), '[]')
                         from public.budget_cost_heads h join public.budget_departments d on d.id = h.department_id
                         where h.id > max_head and h.project_id = (res ->> 'project_id')::bigint),
      'new_tower_names', (select coalesce(jsonb_agg(s.name order by s.id), '[]') from public.budget_subprojects s
                          where s.id > max_tower and s.project_id = (res ->> 'project_id')::bigint));
    result := result - 'project_id' - 'version_id' - 'import_id';
    raise exception using errcode = 'BUDPV', message = 'preview only';
  exception when sqlstate 'BUDPV' then
    return result;
  end;
end $$;

-- Matches one cost sheet row to a cost head and tower of the project, and says what is wrong with it.
create function public.budget_resolve_cost_row(p_project bigint, r jsonb, out head_id bigint, out tower_id bigint, out problem text)
language plpgsql stable security definer set search_path = public as $$
begin
  select h.id into head_id from public.budget_cost_heads h
  join public.budget_departments d on d.id = h.department_id
  where h.project_id = p_project and not h.is_tax
    and lower(btrim(d.name)) = lower(btrim(r ->> 'department'))
    and lower(btrim(h.category)) = lower(btrim(r ->> 'category'))
    and lower(btrim(coalesce(h.sub_category, ''))) = lower(btrim(coalesce(r ->> 'sub_category', '')))
  limit 1;
  if nullif(btrim(coalesce(r ->> 'tower', '')), '') is not null then
    select id into tower_id from public.budget_subprojects where project_id = p_project and lower(name) = lower(btrim(r ->> 'tower'));
  end if;
  if head_id is null then
    problem := format('No cost head %s / %s / %s', r ->> 'department', r ->> 'category', coalesce(r ->> 'sub_category', '-'));
  elsif nullif(btrim(coalesce(r ->> 'tower', '')), '') is not null and tower_id is null then
    problem := format('No tower named %s', r ->> 'tower');
  elsif not public.budget_can_enter_cost(head_id) then
    problem := format('You cannot enter cost for %s', r ->> 'department');
  elsif r ? 'extra' then
    -- Custom field columns (budget_custom_import_check is in the custom fields migration).
    problem := nullif(array_to_string(public.budget_custom_import_check('cost_entry', p_project, r -> 'extra'), '; '), '');
  end if;
end $$;

-- Cost sheet preview: each row with its problem (null when it can be imported).
create function public.budget_check_incurred(p_project bigint, p_payload jsonb)
returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(r.value || jsonb_build_object('problem', x.problem) order by (r.value ->> 'row')::int), '[]')
  from jsonb_array_elements(p_payload -> 'rows') r
  cross join lateral public.budget_resolve_cost_row(p_project, r.value) x
$$;

create function public.budget_import_incurred(p_project bigint, p_payload jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  r jsonb;
  x record;
  v_entry bigint;
  v_import bigint;
  problems text[] := '{}';
  n int := 0;
  total bigint := 0;
begin
  if not public.budget_has('cost.import', p_project) then
    raise exception 'You do not have the right to import cost incurred into this project';
  end if;
  insert into public.budget_imports (project_id, kind, file_name)
  values (p_project, 'cost', p_payload ->> 'file') returning id into v_import;
  perform set_config('budget.import_id', v_import::text, true);
  for r in select * from jsonb_array_elements(p_payload -> 'rows') loop
    select * into x from public.budget_resolve_cost_row(p_project, r);
    if x.problem is not null then
      problems := problems || format('row %s: %s', r ->> 'row', lower(left(x.problem, 1)) || substr(x.problem, 2));
    else
      insert into public.budget_incurred_entries (project_id, cost_head_id, subproject_id, month, amount_paise, reference)
      values (p_project, x.head_id, x.tower_id, (r ->> 'month')::date, (r ->> 'amount')::bigint, r ->> 'reference')
      returning id into v_entry;
      if r ? 'extra' then
        perform public.budget_custom_import_apply('cost_entry', p_project, v_entry, r -> 'extra', v_import);
      end if;
      n := n + 1;
      total := total + (r ->> 'amount')::bigint;
    end if;
  end loop;
  if array_length(problems, 1) > 0 then
    raise exception 'Nothing was imported. Fix these rows: %', array_to_string(problems, '; ');
  end if;
  perform set_config('budget.import_id', '', true);
  update public.budget_imports set summary = jsonb_build_object('entries', n, 'total_paise', total) where id = v_import;
  return jsonb_build_object('import_id', v_import, 'entries', n, 'total_paise', total);
end $$;

revoke execute on function public.budget_create_project(text, text, int, bigint) from public, anon;
revoke execute on function public.budget_preview_import(bigint, jsonb) from public, anon;
revoke execute on function public.budget_check_incurred(bigint, jsonb) from public, anon;
revoke execute on function public.budget_import_incurred(bigint, jsonb) from public, anon;
revoke execute on function public.budget_resolve_cost_row(bigint, jsonb) from public, anon;
grant execute on function public.budget_create_project(text, text, int, bigint) to authenticated;
grant execute on function public.budget_preview_import(bigint, jsonb) to authenticated;
grant execute on function public.budget_check_incurred(bigint, jsonb) to authenticated;
grant execute on function public.budget_import_incurred(bigint, jsonb) to authenticated;

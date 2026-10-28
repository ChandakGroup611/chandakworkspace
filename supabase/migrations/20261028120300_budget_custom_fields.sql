-- Custom fields and form settings.
--
-- An administrator (right fields.manage) adds fields to five forms without a code change:
--   line        a budget line (one cost head in a version), shown as extra columns on Budget entry
--   version     a budget version (header fields, reasons, sign-offs)
--   tower       a tower / building
--   cost_entry  a cost incurred entry
--   project     a project
-- Each field has a type, optional rules (choices, decimals, min, max, length), where its value comes
-- from (typed, Excel or both, with the Excel column header to read), a form section and order, and
-- optionally a right needed to edit it. A "formula" field is calculated from other fields of the same
-- form (and the built-in figures such as ctc or incurred); it holds no stored value and is calculated
-- whenever it is shown, so it is never out of date. The application's formula engine
-- (nextjs/src/lib/budget/formula.ts) validates formulas before they are saved.
--
-- Values are checked and normalised here, whichever way they arrive, so a typed value and an
-- imported one are stored identically: numbers and amounts as exact decimal strings, dates as
-- YYYY-MM-DD, months as YYYY-MM-01, yes/no as true/false, choices as the configured spelling,
-- users / departments / towers as their ids.

create table public.budget_custom_fields (
  id bigint generated always as identity primary key,
  entity text not null check (entity in ('line', 'version', 'tower', 'cost_entry', 'project')),
  project_id bigint references public.budget_projects on delete cascade,   -- null: every project
  key text not null check (key ~ '^[a-z][a-z0-9_]{0,39}$'),
  label text not null check (btrim(label) <> ''),
  help text,
  field_type text not null check (field_type in (
    'text', 'long_text', 'number', 'integer', 'amount_cr', 'amount_inr', 'percent', 'date', 'month',
    'yes_no', 'dropdown', 'multi_select', 'email', 'phone', 'url', 'user', 'department', 'tower', 'formula')),
  options jsonb not null default '{}',     -- choices [..], decimals, min, max, max_length, unit, default
  formula text,
  result_type text check (result_type in ('number', 'integer', 'amount_cr', 'amount_inr', 'percent', 'text', 'yes_no', 'date')),
  required boolean not null default false,
  input_source text not null default 'both' check (input_source in ('typed', 'excel', 'both')),
  excel_header text,                       -- column header read by the imports
  section text,                            -- form section the field is shown under
  sort int not null default 0,
  show_in_entry boolean not null default true,
  show_in_reports boolean not null default true,
  edit_permission text references public.budget_permissions,   -- extra right needed to change the value
  active boolean not null default true,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((field_type = 'formula') = (formula is not null)),
  check (field_type <> 'formula' or (result_type is not null and not required and excel_header is null)),
  check (field_type not in ('dropdown', 'multi_select') or jsonb_array_length(coalesce(options -> 'choices', '[]')) > 0)
);
create unique index budget_custom_fields_key on public.budget_custom_fields (entity, coalesce(project_id, 0), key);

create table public.budget_custom_values (
  field_id bigint not null references public.budget_custom_fields on delete cascade,
  entity_id bigint not null,
  value jsonb not null,
  source text not null default 'manual' check (source in ('manual', 'excel')),
  import_id bigint references public.budget_imports on delete set null,
  updated_by uuid default auth.uid(),
  updated_at timestamptz not null default now(),
  primary key (field_id, entity_id)
);
create index on public.budget_custom_values (entity_id);

-- Names a formula may use besides the custom fields of the same form.
create function public.budget_builtin_keys(p_entity text) returns text[]
language sql immutable as $$
  select case p_entity
    when 'line' then array['initial', 'ctc', 'incurred', 'balance', 'variance', 'util_pct', 'psf_initial', 'psf_ctc', 'eng_area']
    when 'version' then array['total_initial', 'total_ctc', 'total_incurred', 'total_balance', 'total_variance', 'total_carpet',
                              'net_sale_carpet', 'sold_area', 'eng_area', 'design_area', 'sale_value_cr', 'as_on']
    when 'tower' then array['carpet_area', 'eng_area', 'oc_date']
    when 'cost_entry' then array['amount', 'month']
    else array['towers']::text[] end
$$;

-- Field definitions stay consistent: no clash with built-in names, the key never changes, a field used
-- in another field's formula cannot be removed, and a type change must fit the values already stored.
create function public.budget_guard_custom_field() returns trigger
language plpgsql as $$
declare
  user_of text;
  v record;
begin
  if tg_op = 'DELETE' then
    select string_agg(f.label, ', ') into user_of from public.budget_custom_fields f
    where f.entity = old.entity and f.id <> old.id and f.field_type = 'formula' and f.formula ~* ('\m' || old.key || '\M');
    if user_of is not null then
      raise exception 'Field "%" is used in the formula of: %. Change those formulas first.', old.label, user_of;
    end if;
    return old;
  end if;
  if new.key = any (public.budget_builtin_keys(new.entity)) then
    raise exception 'The key "%" is a built-in figure of this form; choose another key', new.key;
  end if;
  if tg_op = 'UPDATE' then
    if new.key <> old.key or new.entity <> old.entity then
      raise exception 'A field''s key and form cannot change; add a new field instead';
    end if;
    if new.field_type = 'formula' and old.field_type <> 'formula'
       and exists (select 1 from public.budget_custom_values where field_id = new.id) then
      raise exception 'Field "%" already holds values; it cannot become a calculated field', new.label;
    end if;
    if not new.active and old.active then
      select string_agg(f.label, ', ') into user_of from public.budget_custom_fields f
      where f.entity = new.entity and f.id <> new.id and f.active and f.field_type = 'formula' and f.formula ~* ('\m' || new.key || '\M');
      if user_of is not null then
        raise exception 'Field "%" is used in the formula of: %. Change those formulas first.', new.label, user_of;
      end if;
    end if;
    if new.field_type <> 'formula' and (new.field_type <> old.field_type or new.options is distinct from old.options) then
      for v in select cv.entity_id, cv.value from public.budget_custom_values cv where cv.field_id = new.id loop
        begin
          perform public.budget_custom_normalize(new, v.value, public.budget_custom_entity_project(new.entity, v.entity_id));
        exception when others then
          raise exception 'Stored values of "%" do not fit the new settings (%). Change or clear them first.', new.label, sqlerrm;
        end;
      end loop;
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

-- Project an entity belongs to (for access checks and tower lookups).
create function public.budget_custom_entity_project(p_entity text, p_id bigint) returns bigint
language sql stable security definer set search_path = public as $$
  select case p_entity
    when 'line' then (select v.project_id from public.budget_lines l join public.budget_versions v on v.id = l.version_id where l.id = p_id)
    when 'version' then (select project_id from public.budget_versions where id = p_id)
    when 'tower' then (select project_id from public.budget_subprojects where id = p_id)
    when 'cost_entry' then (select project_id from public.budget_incurred_entries where id = p_id)
    when 'project' then p_id end
$$;

-- Checks one value against its field and returns it normalised (null when blank). Raises with a
-- message naming the problem.
create function public.budget_custom_normalize(f public.budget_custom_fields, p_raw jsonb, p_project bigint default null)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  t text;
  n numeric;
  d date;
  places int;
  choice text;
  out_arr jsonb := '[]';
  item text;
  uid uuid;
  id bigint;
  months text[] := array['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  m text[];
begin
  if f.field_type = 'formula' then
    raise exception 'is calculated and cannot be typed or imported';
  end if;
  if p_raw is null or p_raw = 'null'::jsonb then
    return null;
  end if;
  if jsonb_typeof(p_raw) = 'array' then
    t := null;
  elsif jsonb_typeof(p_raw) = 'string' then
    t := btrim(p_raw #>> '{}');
  else
    t := p_raw #>> '{}';
  end if;
  if t = '' then
    return null;
  end if;

  case f.field_type
  when 'text', 'long_text' then
    if t is null then raise exception 'must be text'; end if;
    if (f.options ->> 'max_length') is not null and length(t) > (f.options ->> 'max_length')::int then
      raise exception 'is longer than % characters', f.options ->> 'max_length';
    end if;
    return to_jsonb(t);

  when 'number', 'integer', 'amount_cr', 'amount_inr', 'percent' then
    begin
      n := replace(replace(replace(t, ',', ''), '₹', ''), '%', '')::numeric;
    exception when others then
      raise exception '"%" is not a number', t;
    end;
    places := case f.field_type when 'integer' then 0 when 'amount_cr' then 9 when 'amount_inr' then 2
                else coalesce((f.options ->> 'decimals')::int, 6) end;
    if f.field_type = 'integer' and n <> trunc(n) then
      raise exception '% is not a whole number', t;
    end if;
    if scale(n) > places and round(n, places) <> n then
      raise exception '% has more than % decimal places', t, places;
    end if;
    if (f.options ->> 'min') is not null and n < (f.options ->> 'min')::numeric then
      raise exception '% is below the minimum %', t, f.options ->> 'min';
    end if;
    if (f.options ->> 'max') is not null and n > (f.options ->> 'max')::numeric then
      raise exception '% is above the maximum %', t, f.options ->> 'max';
    end if;
    return to_jsonb(trim_scale(n)::text);

  when 'date' then
    begin
      if t ~ '^\d{4}-\d{2}-\d{2}' then d := left(t, 10)::date;
      elsif t ~ '^\d{1,2}[/.-]\d{1,2}[/.-]\d{4}$' then d := to_date(regexp_replace(t, '[.-]', '/', 'g'), 'DD/MM/YYYY');
      elsif t ~ '^\d+(\.\d+)?$' and t::numeric between 1 and 100000 then d := date '1899-12-30' + floor(t::numeric)::int;  -- Excel serial
      else raise exception 'x'; end if;
    exception when others then
      raise exception '"%" is not a date (use DD/MM/YYYY)', t;
    end;
    return to_jsonb(d::text);

  when 'month' then
    begin
      if t ~ '^\d{4}-\d{2}' then d := (left(t, 7) || '-01')::date;
      elsif t ~ '^\d{1,2}[/.-]\d{4}$' then d := to_date('01/' || regexp_replace(t, '[.-]', '/', 'g'), 'DD/MM/YYYY');
      elsif t ~* '^[a-z]{3}[a-z]*[ -/]+\d{2,4}$' then
        m := regexp_match(lower(t), '^([a-z]{3})[a-z]*[ -/]+(\d{2,4})$');
        d := make_date(case when length(m[2]) = 2 then 2000 + m[2]::int else m[2]::int end, array_position(months, m[1]), 1);
      elsif t ~ '^\d+(\.\d+)?$' then d := date_trunc('month', date '1899-12-30' + floor(t::numeric)::int)::date;
      else raise exception 'x'; end if;
      if d is null then raise exception 'x'; end if;
    exception when others then
      raise exception '"%" is not a month (use MM/YYYY or Oct 2026)', t;
    end;
    return to_jsonb(d::text);

  when 'yes_no' then
    if lower(t) in ('yes', 'y', 'true', '1') then return 'true'::jsonb; end if;
    if lower(t) in ('no', 'n', 'false', '0') then return 'false'::jsonb; end if;
    raise exception '"%" is not Yes or No', t;

  when 'dropdown' then
    select c into choice from jsonb_array_elements_text(f.options -> 'choices') c where lower(c) = lower(t) limit 1;
    if choice is null then raise exception '"%" is not one of the choices', t; end if;
    return to_jsonb(choice);

  when 'multi_select' then
    for item in select btrim(x) from (
      select jsonb_array_elements_text(p_raw) x where jsonb_typeof(p_raw) = 'array'
      union all select regexp_split_to_table(t, '\s*[,;]\s*') where t is not null) s where btrim(x) <> '' loop
      select c into choice from jsonb_array_elements_text(f.options -> 'choices') c where lower(c) = lower(item) limit 1;
      if choice is null then raise exception '"%" is not one of the choices', item; end if;
      if not out_arr ? choice then out_arr := out_arr || to_jsonb(choice); end if;
    end loop;
    return case when jsonb_array_length(out_arr) = 0 then null else out_arr end;

  when 'email' then
    if t !~* '^[^@\s]+@[^@\s]+\.[a-z]{2,}$' then raise exception '"%" is not an email address', t; end if;
    return to_jsonb(lower(t));

  when 'phone' then
    if t !~ '^\+?[0-9 ()-]{7,20}$' or length(regexp_replace(t, '\D', '', 'g')) not between 7 and 15 then
      raise exception '"%" is not a phone number', t;
    end if;
    return to_jsonb(t);

  when 'url' then
    if t !~* '^https?://[^\s]+\.[^\s]+$' then raise exception '"%" is not a web address starting with http:// or https://', t; end if;
    return to_jsonb(t);

  when 'user' then
    select w.user_id into uid from public.budget_workspace_users w where w.user_id::text = t or lower(w.email) = lower(t) or lower(w.full_name) = lower(t) limit 1;
    if uid is null then raise exception '"%" is not a Chandak Workspace user', t; end if;
    return to_jsonb(uid::text);

  when 'department' then
    select dp.id into id from public.budget_departments dp where dp.id::text = t or lower(dp.name) = lower(t) limit 1;
    if id is null then raise exception '"%" is not a department', t; end if;
    return to_jsonb(id);

  when 'tower' then
    select s.id into id from public.budget_subprojects s
    where (p_project is null or s.project_id = p_project) and (s.id::text = t or lower(s.name) = lower(t)) limit 1;
    if id is null then raise exception '"%" is not a tower of this project', t; end if;
    return to_jsonb(id);
  end case;
  raise exception 'unknown field type %', f.field_type;
end $$;

create trigger budget_guard_custom_field before insert or update or delete on public.budget_custom_fields
for each row execute function public.budget_guard_custom_field();
create trigger budget_audit after insert or update or delete on public.budget_custom_fields
for each row execute function public.budget_audit();

-- Who may change a value: the same person who may change the record it belongs to (and, when the
-- field asks for it, an extra right). Values of approved versions are locked with the version.
create function public.budget_custom_can_edit(f public.budget_custom_fields, p_entity_id bigint) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  p bigint := public.budget_custom_entity_project(f.entity, p_entity_id);
  ok boolean;
begin
  if p is null then return false; end if;
  if f.project_id is not null and f.project_id <> p then return false; end if;
  ok := case f.entity
    when 'line' then exists (select 1 from public.budget_lines l join public.budget_versions v on v.id = l.version_id
                             where l.id = p_entity_id and v.status = 'draft' and public.budget_can_edit(l.cost_head_id))
    when 'version' then exists (select 1 from public.budget_versions v where v.id = p_entity_id and v.status = 'draft'
                                and ((v.prepared_by = auth.uid() and public.budget_has('version.open', v.project_id)) or public.budget_has('version.override', v.project_id)))
    when 'tower' then public.budget_has('project.setup', p)
    when 'cost_entry' then exists (select 1 from public.budget_incurred_entries e where e.id = p_entity_id and public.budget_can_enter_cost(e.cost_head_id))
    when 'project' then public.budget_has('project.setup', p) end;
  return ok and (f.edit_permission is null or public.budget_has(f.edit_permission, p));
end $$;

-- Saves typed values for one record: p_values is {key: value}; blank clears. All or nothing; every
-- problem is listed in the error.
create function public.budget_set_custom_values(p_entity text, p_entity_id bigint, p_values jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  p bigint := public.budget_custom_entity_project(p_entity, p_entity_id);
  f public.budget_custom_fields;
  k text;
  raw jsonb;
  val jsonb;
  problems text[] := '{}';
  n int := 0;
begin
  if p is null then raise exception 'Record not found'; end if;
  for k, raw in select * from jsonb_each(p_values) loop
    select * into f from public.budget_custom_fields
    where entity = p_entity and key = k and active and (project_id is null or project_id = p)
    order by project_id nulls last limit 1;
    if f.id is null then problems := problems || format('%s: no such field', k); continue; end if;
    if f.input_source = 'excel' then problems := problems || format('%s: comes from Excel only', f.label); continue; end if;
    if not public.budget_custom_can_edit(f, p_entity_id) then problems := problems || format('%s: you cannot change it', f.label); continue; end if;
    begin
      val := public.budget_custom_normalize(f, raw, p);
    exception when others then
      problems := problems || format('%s: %s', f.label, sqlerrm);
      continue;
    end;
    if val is null then
      delete from public.budget_custom_values where field_id = f.id and entity_id = p_entity_id;
    else
      insert into public.budget_custom_values (field_id, entity_id, value, source, import_id)
      values (f.id, p_entity_id, val, 'manual', null)
      on conflict (field_id, entity_id) do update
        set value = excluded.value, source = 'manual', import_id = null, updated_by = auth.uid(), updated_at = now()
        where budget_custom_values.value is distinct from excluded.value;
    end if;
    n := n + 1;
  end loop;
  if array_length(problems, 1) > 0 then
    raise exception 'Not saved. %', array_to_string(problems, '; ');
  end if;
  return jsonb_build_object('saved', n);
end $$;

-- Imports: the columns of a workbook row that are not part of the standard format, {header: value},
-- matched to fields by their Excel column header. Returns the problems (the row's other values are kept).
create function public.budget_custom_import_check(p_entity text, p_project bigint, p_extra jsonb)
returns text[]
language plpgsql stable security definer set search_path = public as $$
declare
  f public.budget_custom_fields;
  h text;
  raw jsonb;
  problems text[] := '{}';
begin
  for h, raw in select * from jsonb_each(coalesce(p_extra, '{}')) loop
    select * into f from public.budget_custom_fields
    where entity = p_entity and active and input_source <> 'typed' and lower(btrim(excel_header)) = lower(btrim(h))
      and (project_id is null or project_id = p_project)
    order by project_id nulls last limit 1;
    continue when f.id is null;
    begin
      perform public.budget_custom_normalize(f, raw, p_project);
    exception when others then
      problems := problems || format('%s: %s', f.label, sqlerrm);
    end;
  end loop;
  return problems;
end $$;

create function public.budget_custom_import_apply(p_entity text, p_project bigint, p_entity_id bigint, p_extra jsonb, p_import bigint)
returns int
language plpgsql security definer set search_path = public as $$
declare
  f public.budget_custom_fields;
  h text;
  raw jsonb;
  val jsonb;
  n int := 0;
begin
  for h, raw in select * from jsonb_each(coalesce(p_extra, '{}')) loop
    select * into f from public.budget_custom_fields
    where entity = p_entity and active and input_source <> 'typed' and lower(btrim(excel_header)) = lower(btrim(h))
      and (project_id is null or project_id = p_project)
    order by project_id nulls last limit 1;
    continue when f.id is null;
    begin
      val := public.budget_custom_normalize(f, raw, p_project);
    exception when others then
      continue;   -- reported by budget_custom_import_check in the preview and the import summary
    end;
    if val is null then
      delete from public.budget_custom_values where field_id = f.id and entity_id = p_entity_id;
      n := n + (case when found then 1 else 0 end);
    else
      insert into public.budget_custom_values (field_id, entity_id, value, source, import_id)
      values (f.id, p_entity_id, val, 'excel', p_import)
      on conflict (field_id, entity_id) do update
        set value = excluded.value, source = 'excel', import_id = excluded.import_id, updated_by = auth.uid(), updated_at = now()
        where budget_custom_values.value is distinct from excluded.value;
      n := n + (case when found then 1 else 0 end);
    end if;
  end loop;
  return n;
end $$;

-- Values go with their record.
create function public.budget_drop_custom_values() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from public.budget_custom_values cv using public.budget_custom_fields f
  where f.id = cv.field_id and f.entity = tg_argv[0] and cv.entity_id = old.id;
  return old;
end $$;
create trigger budget_drop_custom_values after delete on public.budget_lines for each row execute function public.budget_drop_custom_values('line');
create trigger budget_drop_custom_values after delete on public.budget_versions for each row execute function public.budget_drop_custom_values('version');
create trigger budget_drop_custom_values after delete on public.budget_subprojects for each row execute function public.budget_drop_custom_values('tower');
create trigger budget_drop_custom_values after delete on public.budget_incurred_entries for each row execute function public.budget_drop_custom_values('cost_entry');
create trigger budget_drop_custom_values after delete on public.budget_projects for each row execute function public.budget_drop_custom_values('project');

-- Required fields must be filled before a version is approved (the version's own fields and those of
-- every line in it).
create function public.budget_missing_required(p_version bigint)
returns table (form text, record text, field text)
language sql stable security definer set search_path = public as $$
  with v as (select * from public.budget_versions where id = p_version)
  select 'version', 'R' || v.number, f.label
  from v join public.budget_custom_fields f on f.entity = 'version' and f.active and f.required and (f.project_id is null or f.project_id = v.project_id)
  where not exists (select 1 from public.budget_custom_values cv where cv.field_id = f.id and cv.entity_id = v.id)
  union all
  select 'line', d.name || ' · ' || coalesce(h.sub_category, h.category) || coalesce(' · ' || s.name, ''), f.label
  from v join public.budget_lines l on l.version_id = v.id
  join public.budget_cost_heads h on h.id = l.cost_head_id
  join public.budget_departments d on d.id = h.department_id
  left join public.budget_subprojects s on s.id = l.subproject_id
  join public.budget_custom_fields f on f.entity = 'line' and f.active and f.required and (f.project_id is null or f.project_id = v.project_id)
  where not exists (select 1 from public.budget_custom_values cv where cv.field_id = f.id and cv.entity_id = l.id)
$$;

create or replace function public.budget_approve_version(p_version bigint)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v public.budget_versions;
  missing text;
  n int;
begin
  select * into v from public.budget_versions where id = p_version for update;
  if v.id is null then
    raise exception 'Version % not found', p_version;
  end if;
  if v.status <> 'draft' then
    raise exception 'Version R% is already approved', v.number;
  end if;
  if not ((v.prepared_by = auth.uid() and public.budget_has('version.approve', v.project_id))
          or public.budget_has('version.override', v.project_id)) then
    raise exception 'Only the person who prepared R% can approve it', v.number;
  end if;
  select string_agg(coalesce(sub_category, category) || ' (' || coalesce(change_pct::text, 'new') || '%)', ', ')
    into missing from public.budget_changes_needing_remark(p_version);
  if missing is not null then
    raise exception 'Add a remark explaining these changes before approving: %', missing;
  end if;
  select count(*), string_agg(field || ' for ' || record, '; ') into n, missing
  from (select * from public.budget_missing_required(p_version) limit 10) x;
  if n > 0 then
    select count(*) into n from public.budget_missing_required(p_version);
    raise exception 'Fill in the required fields before approving (% missing): %', n, missing;
  end if;
  update public.budget_versions set status = 'approved', approved_at = now(), approved_by = auth.uid() where id = p_version;
end $$;

-- A new version carries over the custom values of the version and of each line it copies.
create function public.budget_copy_custom_values() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.parent_id is null then return new; end if;
  insert into public.budget_custom_values (field_id, entity_id, value, source, import_id)
  select cv.field_id, new.id, cv.value, cv.source, cv.import_id
  from public.budget_custom_values cv join public.budget_custom_fields f on f.id = cv.field_id and f.entity = 'version'
  where cv.entity_id = new.parent_id;
  return new;
end $$;
create trigger budget_copy_custom_values after insert on public.budget_versions
for each row execute function public.budget_copy_custom_values();

create function public.budget_copy_line_custom_values() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  parent bigint := (select parent_id from public.budget_versions where id = new.version_id);
begin
  if parent is null then return new; end if;
  insert into public.budget_custom_values (field_id, entity_id, value, source, import_id)
  select cv.field_id, new.id, cv.value, cv.source, cv.import_id
  from public.budget_lines old_line
  join public.budget_custom_values cv on cv.entity_id = old_line.id
  join public.budget_custom_fields f on f.id = cv.field_id and f.entity = 'line'
  where old_line.version_id = parent and old_line.cost_head_id = new.cost_head_id
    and old_line.subproject_id is not distinct from new.subproject_id
  on conflict do nothing;
  return new;
end $$;
create trigger budget_copy_line_custom_values after insert on public.budget_lines
for each row execute function public.budget_copy_line_custom_values();

alter table public.budget_custom_fields enable row level security;
alter table public.budget_custom_values enable row level security;
create policy read_members on public.budget_custom_fields for select to authenticated using (public.budget_is_member());
create policy manage_fields on public.budget_custom_fields for all to authenticated
  using (public.budget_has('fields.manage')) with check (public.budget_has('fields.manage'));
create policy read_project on public.budget_custom_values for select to authenticated
  using (public.budget_has('project.view', public.budget_custom_entity_project(
    (select entity from public.budget_custom_fields where id = field_id), entity_id)));

revoke execute on function public.budget_set_custom_values(text, bigint, jsonb) from public, anon;
revoke execute on function public.budget_custom_import_check(text, bigint, jsonb) from public, anon;
revoke execute on function public.budget_custom_import_apply(text, bigint, bigint, jsonb, bigint) from public, anon;
grant execute on function public.budget_set_custom_values(text, bigint, jsonb) to authenticated;
grant execute on function public.budget_missing_required(bigint) to authenticated;

-- Organization Budget: what the company's own budget workbooks do that the module did not yet.
--   1. Remarks per department and per tower (revised OC date and the reason it moved), kept per version.
--   2. Sign-off: a chain of approvers (levels) per project; a version is submitted, each level signs in
--      order, and the last signature approves and locks it. A level can send it back to the preparer.
--   3. Calculated lines: CTC = rate (₹ per sq ft) × an area of the version, or a balancing line that
--      takes "the rest" of a total (total − the other lines of its category or department).
--   4. Memo items: lines shown for reference, outside every total (kept per version, like the figures).
-- Only adds columns, tables and functions, and replaces views and functions with the same names and
-- columns (new columns at the end). Runs after 20261028120000 … 20261028120500.

-- ---------------------------------------------------------------------------
-- New columns
-- ---------------------------------------------------------------------------

alter table public.budget_versions
  add column department_remarks jsonb not null default '{}',   -- {"<department id>": "remark"}
  add column tower_notes jsonb not null default '{}';          -- {"<tower id>": {"oc_date": "yyyy-mm-dd", "reason": "..."}}

alter table public.budget_lines
  add column is_memo boolean not null default false,           -- memo item: shown for reference, outside every total
  add column ctc_rate numeric(14, 4) check (ctc_rate >= 0),    -- ₹ per sq ft; CTC = rate × area
  add column ctc_basis text check (ctc_basis ~ '^[a-z_]{1,40}$'),  -- which area of the version
  add column balance_of_paise bigint check (balance_of_paise >= 0),  -- CTC = this total − the other lines
  add column balance_scope text check (balance_scope in ('category', 'department')),
  add constraint budget_lines_one_rule check (
    (ctc_rate is null or balance_of_paise is null) and (not is_memo or (ctc_rate is null and balance_of_paise is null))
    and ((ctc_rate is null) = (ctc_basis is null))
    and ((balance_of_paise is null) = (balance_scope is null)));

comment on column public.budget_lines.ctc_basis is
  'Area the rate applies to: a key of budget_versions.areas (eng_area, design_area, total_carpet, sold_area, residential_area, …) or net_sale_carpet.';

-- A version under sign-off is locked like an approved one, but can go back to draft.
alter table public.budget_versions drop constraint budget_versions_status_check;
alter table public.budget_versions add constraint budget_versions_status_check check (status in ('draft', 'in_review', 'approved'));
drop index public.budget_one_draft_per_project;
create unique index budget_one_open_version_per_project on public.budget_versions (project_id) where status <> 'approved';

-- ---------------------------------------------------------------------------
-- Sign-off chain
-- ---------------------------------------------------------------------------

-- Levels in order. A project uses its own levels when it has any, otherwise the levels for every
-- project (project_id null). Any one of a level's approvers signs for that level.
create table public.budget_signoff_levels (
  id bigint generated always as identity primary key,
  project_id bigint references public.budget_projects on delete cascade,
  sort int not null default 0,
  title text not null check (length(btrim(title)) between 1 and 80),   -- e.g. "Checked by", "CFO", "Managing Director"
  approver_ids uuid[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index on public.budget_signoff_levels (project_id, sort);

-- What happened to each version: submitted, signed (one row per level), returned, recalled.
-- Title and order are copied from the level so the record does not change when the chain is edited.
create table public.budget_signoffs (
  id bigint generated always as identity primary key,
  version_id bigint not null references public.budget_versions on delete cascade,
  level_id bigint references public.budget_signoff_levels on delete set null,
  level_title text,
  level_sort int,
  action text not null check (action in ('submitted', 'signed', 'returned', 'recalled')),
  comment text,
  user_id uuid default auth.uid() references auth.users,
  at timestamptz not null default now()
);
create index on public.budget_signoffs (version_id, id);

create trigger budget_audit after insert or update or delete on public.budget_signoff_levels
for each row execute function public.budget_audit();

-- The levels a project uses, in order.
create function public.budget_signoff_chain(p_project bigint)
returns setof public.budget_signoff_levels
language sql stable security definer set search_path = public as $$
  select * from public.budget_signoff_levels l
  where l.active and (l.project_id = p_project
        or (l.project_id is null and not exists (
              select 1 from public.budget_signoff_levels x where x.project_id = p_project and x.active)))
  order by l.sort, l.id
$$;

-- Where a version stands: every level of the chain with who signed it in the current round (since the
-- last submission), and which level is next.
create function public.budget_signoff_status(p_version bigint)
returns table (level_id bigint, sort int, title text, approver_ids uuid[], signed_by uuid, signed_at timestamptz, is_next boolean)
language sql stable security definer set search_path = public as $$
  with v as (select * from public.budget_versions where id = p_version and public.budget_has('project.view', project_id)),
  round_start as (
    select coalesce(max(s.id), 0) as id from public.budget_signoffs s where s.version_id = p_version and s.action = 'submitted'
  ),
  chain as (select c.* from v, lateral public.budget_signoff_chain(v.project_id) c),
  signed as (
    select distinct on (s.level_id) s.level_id, s.user_id, s.at
    from public.budget_signoffs s, round_start r
    where s.version_id = p_version and s.action = 'signed' and s.id > r.id
    order by s.level_id, s.id
  ),
  lv as (
    select c.id, c.sort, c.title, c.approver_ids, sg.user_id, sg.at, row_number() over (order by c.sort, c.id) as n
    from chain c left join signed sg on sg.level_id = c.id
  )
  select r.id, r.sort, r.title, r.approver_ids, r.user_id, r.at,
         (select v.status from v) = 'in_review'
         and r.user_id is null and r.n = (select min(n) from lv where user_id is null)
  from lv r order by r.n
$$;

-- What has to be right before a version leaves draft: remarks on big changes, required custom fields,
-- and a reason for every tower whose OC date moved since the previous version.
create function public.budget_ready_check(p_version bigint)
returns void
language plpgsql stable security definer set search_path = public as $$
declare
  missing text;
  n int;
begin
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
  select string_agg(name, ', ') into missing from public.budget_oc_moves(p_version) where moved and coalesce(btrim(reason), '') = '';
  if missing is not null then
    raise exception 'Give the reason the OC date moved before approving: %', missing;
  end if;
end $$;

-- OC date of each tower in a version (revised in the version, or the tower's planned date) against the
-- previous version, with the reason given.
create function public.budget_oc_moves(p_version bigint)
returns table (tower_id bigint, name text, planned date, oc_date date, previous date, moved boolean, reason text)
language sql stable security definer set search_path = public as $$
  with v as (select * from public.budget_versions where id = p_version and public.budget_has('project.view', project_id)),
       p as (select pv.* from public.budget_versions pv, v where pv.id = v.parent_id)
  select s.id, s.name, s.oc_date,
         coalesce((v.tower_notes -> s.id::text ->> 'oc_date')::date, s.oc_date),
         coalesce((p.tower_notes -> s.id::text ->> 'oc_date')::date, s.oc_date),
         p.id is not null and coalesce((v.tower_notes -> s.id::text ->> 'oc_date')::date, s.oc_date)
                              is distinct from coalesce((p.tower_notes -> s.id::text ->> 'oc_date')::date, s.oc_date),
         nullif(btrim(v.tower_notes -> s.id::text ->> 'reason'), '')
  from v join public.budget_subprojects s on s.project_id = v.project_id
  left join p on true
  order by s.sort, s.id
$$;

-- Approve directly: only for projects without a sign-off chain (as before); otherwise submit it.
create or replace function public.budget_approve_version(p_version bigint)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v public.budget_versions;
begin
  select * into v from public.budget_versions where id = p_version for update;
  if v.id is null then
    raise exception 'Version % not found', p_version;
  end if;
  if v.status <> 'draft' then
    raise exception 'Version R% is not a draft', v.number;
  end if;
  if exists (select 1 from public.budget_signoff_chain(v.project_id)) then
    raise exception 'R% needs sign-off: submit it, and it is approved when the last level signs', v.number;
  end if;
  if not ((v.prepared_by = auth.uid() and public.budget_has('version.approve', v.project_id))
          or public.budget_has('version.override', v.project_id)) then
    raise exception 'Only the person who prepared R% can approve it', v.number;
  end if;
  perform public.budget_ready_check(p_version);
  update public.budget_versions set status = 'approved', approved_at = now(), approved_by = auth.uid() where id = p_version;
end $$;

-- The preparer sends the draft for sign-off; it is locked while it is signed.
create function public.budget_submit_version(p_version bigint, p_comment text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v public.budget_versions;
begin
  select * into v from public.budget_versions where id = p_version for update;
  if v.id is null then
    raise exception 'Version % not found', p_version;
  end if;
  if v.status <> 'draft' then
    raise exception 'Only a draft can be submitted; R% is %', v.number, replace(v.status, '_', ' ');
  end if;
  if not ((v.prepared_by = auth.uid() and public.budget_has('version.approve', v.project_id))
          or public.budget_has('version.override', v.project_id)) then
    raise exception 'Only the person who prepared R% can submit it', v.number;
  end if;
  if not exists (select 1 from public.budget_signoff_chain(v.project_id)) then
    raise exception 'This project has no sign-off levels; approve R% directly', v.number;
  end if;
  perform public.budget_ready_check(p_version);
  update public.budget_versions set status = 'in_review' where id = p_version;
  insert into public.budget_signoffs (version_id, action, comment) values (p_version, 'submitted', nullif(btrim(p_comment), ''));
end $$;

-- The next level signs (any one of its approvers), or sends the version back to draft with a reason.
-- The last signature approves and locks the version.
create function public.budget_sign_version(p_version bigint, p_action text, p_comment text default null)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v public.budget_versions;
  nxt record;
begin
  if p_action not in ('signed', 'returned') then
    raise exception 'Sign or send back';
  end if;
  select * into v from public.budget_versions where id = p_version for update;
  if v.id is null or v.status <> 'in_review' then
    raise exception 'R% is not waiting for sign-off', coalesce(v.number::text, '?');
  end if;
  select * into nxt from public.budget_signoff_status(p_version) where is_next;
  if nxt.level_id is null then
    raise exception 'Every level has signed R%', v.number;
  end if;
  if not (auth.uid() = any (nxt.approver_ids)) then
    raise exception 'R% is waiting for % to sign', v.number, nxt.title;
  end if;
  if p_action = 'returned' and coalesce(btrim(p_comment), '') = '' then
    raise exception 'Say why R% goes back to the preparer', v.number;
  end if;
  insert into public.budget_signoffs (version_id, level_id, level_title, level_sort, action, comment)
  values (p_version, nxt.level_id, nxt.title, nxt.sort, p_action, nullif(btrim(p_comment), ''));
  if p_action = 'returned' then
    update public.budget_versions set status = 'draft' where id = p_version;
    return 'returned';
  end if;
  if not exists (select 1 from public.budget_signoff_status(p_version) where signed_by is null) then
    update public.budget_versions set status = 'approved', approved_at = now(), approved_by = auth.uid() where id = p_version;
    return 'approved';
  end if;
  return 'signed';
end $$;

-- The preparer takes a submitted version back to draft (signatures so far no longer count).
create function public.budget_recall_version(p_version bigint)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v public.budget_versions;
begin
  select * into v from public.budget_versions where id = p_version for update;
  if v.id is null or v.status <> 'in_review' then
    raise exception 'Only a version under sign-off can be taken back';
  end if;
  if not ((v.prepared_by = auth.uid() and public.budget_has('version.open', v.project_id))
          or public.budget_has('version.override', v.project_id)) then
    raise exception 'Only the person who prepared R% can take it back', v.number;
  end if;
  update public.budget_versions set status = 'draft' where id = p_version;
  insert into public.budget_signoffs (version_id, action) values (p_version, 'recalled');
end $$;

-- Versions waiting for the signed-in user's signature.
create function public.budget_my_signoffs()
returns table (project_id bigint, project text, version_id bigint, number int, as_on date, level text)
language sql stable security definer set search_path = public as $$
  select v.project_id, p.name, v.id, v.number, v.as_on, s.title
  from public.budget_versions v
  join public.budget_projects p on p.id = v.project_id
  cross join lateral public.budget_signoff_status(v.id) s
  where v.status = 'in_review' and s.is_next and auth.uid() = any (s.approver_ids)
  order by v.as_on
$$;

-- ---------------------------------------------------------------------------
-- Remarks
-- ---------------------------------------------------------------------------

-- Department remark: whoever may edit the department's lines in this draft.
create function public.budget_set_department_remark(p_version bigint, p_department bigint, p_text text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v public.budget_versions;
begin
  select * into v from public.budget_versions where id = p_version for update;
  if v.id is null or v.status <> 'draft' then
    raise exception 'Remarks are changed on a draft version';
  end if;
  if not public.budget_has('budget.edit', v.project_id, p_department) then
    raise exception 'You cannot change this department''s remark';
  end if;
  update public.budget_versions
  set department_remarks = case when coalesce(btrim(p_text), '') = '' then department_remarks - p_department::text
                                else department_remarks || jsonb_build_object(p_department::text, btrim(p_text)) end
  where id = p_version;
end $$;

-- Tower: the OC date as revised in this version, and why it moved. The preparer (or set-up right).
create function public.budget_set_tower_note(p_version bigint, p_tower bigint, p_oc_date date, p_reason text)
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
  note := jsonb_strip_nulls(jsonb_build_object('oc_date', p_oc_date, 'reason', nullif(btrim(p_reason), '')));
  update public.budget_versions
  set tower_notes = case when note = '{}' then tower_notes - p_tower::text else tower_notes || jsonb_build_object(p_tower::text, note) end
  where id = p_version;
end $$;

-- A new version starts with the remarks and OC dates of the one it is copied from (like line remarks),
-- and none is opened while another is still under sign-off.
create function public.budget_new_version_defaults() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  p public.budget_versions;
  busy int;
begin
  select number into busy from public.budget_versions where project_id = new.project_id and status = 'in_review';
  if busy is not null then
    raise exception 'R% is under sign-off; it is approved or sent back before another version is opened', busy;
  end if;
  if new.parent_id is not null then
    select * into p from public.budget_versions where id = new.parent_id;
    if new.department_remarks = '{}' then new.department_remarks := p.department_remarks; end if;
    if new.tower_notes = '{}' then new.tower_notes := p.tower_notes; end if;
  end if;
  return new;
end $$;
create trigger budget_new_version_defaults before insert on public.budget_versions
for each row execute function public.budget_new_version_defaults();

-- ---------------------------------------------------------------------------
-- Lines: locked outside draft; rules only on ordinary heads; carried into the next version
-- ---------------------------------------------------------------------------

create or replace function public.budget_guard_line() returns trigger
language plpgsql as $$
declare
  v record;
  imp bigint := public.budget_current_import();
  h record;
begin
  select status, project_id into v from public.budget_versions
  where id = case when tg_op = 'DELETE' then old.version_id else new.version_id end;
  if v.status = 'in_review' then
    raise exception 'This version is under sign-off; the preparer takes it back to make changes';
  elsif v.status <> 'draft' then
    raise exception 'Version is approved and locked; open a new version to make changes';
  end if;
  if tg_op <> 'DELETE' then
    select * into h from public.budget_cost_heads where id = new.cost_head_id and project_id = v.project_id;
    if h.id is null then
      raise exception 'Cost head % does not belong to this project', new.cost_head_id;
    end if;
    if new.subproject_id is not null and not exists (
      select 1 from public.budget_subprojects s where s.id = new.subproject_id and s.project_id = v.project_id) then
      raise exception 'Tower % does not belong to this project', new.subproject_id;
    end if;
    if (new.ctc_rate is not null or new.balance_of_paise is not null) and h.is_tax then
      raise exception 'GST lines are calculated by their GST rule, not by rate or as a balance';
    end if;
    if new.balance_of_paise is not null and exists (
      select 1 from public.budget_lines o join public.budget_cost_heads oh on oh.id = o.cost_head_id
      where o.version_id = new.version_id and o.id is distinct from new.id and o.balance_of_paise is not null
        and oh.department_id = h.department_id and (new.balance_scope = 'department' or o.balance_scope = 'department' or oh.category = h.category)) then
      raise exception 'Only one balancing line per category (or department) in a version';
    end if;
    if imp is not null then
      new.source := 'excel';
      new.import_id := imp;
    elsif tg_op = 'UPDATE' and (new.initial_paise is distinct from old.initial_paise
                                or new.ctc_paise is distinct from old.ctc_paise
                                or new.incurred_override_paise is distinct from old.incurred_override_paise
                                or new.ctc_rate is distinct from old.ctc_rate or new.ctc_basis is distinct from old.ctc_basis
                                or new.balance_of_paise is distinct from old.balance_of_paise or new.is_memo is distinct from old.is_memo) then
      new.source := 'manual';
      new.import_id := null;
    end if;
    new.updated_at := now();
    new.updated_by := coalesce(auth.uid(), new.updated_by);
  end if;
  return coalesce(new, old);
end $$;

-- Same as before, also copying each line's rule.
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
                                     ctc_rate, ctc_basis, balance_of_paise, balance_scope, is_memo)
    select new_id, cost_head_id, subproject_id, initial_paise, ctc_paise, incurred_override_paise, remark, source, import_id,
           ctc_rate, ctc_basis, balance_of_paise, balance_scope, is_memo
    from public.budget_lines where version_id = src.id;
  else
    insert into public.budget_lines (version_id, cost_head_id, initial_paise, ctc_paise)
    select new_id, h.id, case when h.is_tax then null else 0 end, case when h.is_tax then null else 0 end
    from public.budget_cost_heads h where h.project_id = p_project and h.active;
  end if;
  return new_id;
end $$;

-- ---------------------------------------------------------------------------
-- Calculations: the line view with rules and memo items; totals without memo items
-- ---------------------------------------------------------------------------

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
-- CTC of rate lines: rate (₹/sft) × the version's area, in paise
rated as (
  select l.id, l.version_id, l.cost_head_id, h.department_id, h.category, h.is_tax, l.is_memo, l.balance_of_paise, l.balance_scope,
    case when l.ctc_rate is not null then round(l.ctc_rate * coalesce(
           case when l.ctc_basis = 'net_sale_carpet' then va.net_sale_carpet
                when jsonb_typeof(v.areas -> l.ctc_basis) = 'number' then (v.areas ->> l.ctc_basis)::numeric end, 0) * 100)::bigint
         else l.ctc_paise end as ctc
  from public.budget_lines l
  join public.budget_cost_heads h on h.id = l.cost_head_id
  join public.budget_versions v on v.id = l.version_id
  join public.budget_version_areas va on va.version_id = l.version_id
),
-- CTC of balancing lines: the total less the other ordinary lines of the category (or department)
ruled as (
  select r.id,
    case when r.balance_of_paise is not null then r.balance_of_paise - coalesce((
           select sum(o.ctc) from rated o
           where o.version_id = r.version_id and o.id <> r.id and o.department_id = r.department_id
             and (r.balance_scope = 'department' or o.category = r.category)
             and not o.is_tax and not o.is_memo and o.balance_of_paise is null), 0)::bigint
         else r.ctc end as ctc
  from rated r
),
plain as (
  select l.id, l.version_id, l.cost_head_id,
         coalesce(l.initial_paise, 0) as initial,
         coalesce(ru.ctc, 0) as ctc,
         coalesce(l.incurred_override_paise, inc.amount) as incurred
  from public.budget_lines l
  join public.budget_cost_heads h on h.id = l.cost_head_id
  join inc on inc.line_id = l.id
  join ruled ru on ru.id = l.id
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
    case when not h.is_tax then coalesce(ru.ctc, 0)
         when l.ctc_paise is not null then l.ctc_paise
         when l.subproject_id is null then round(coalesce(b.ctc, 0) * h.tax_rate_pct * coalesce(h.tax_share_pct, 100) / 10000)::bigint
         else 0 end as ctc_paise,
    case when l.incurred_override_paise is not null then l.incurred_override_paise
         when not h.is_tax or inc.n > 0 then inc.amount
         when l.subproject_id is null then round(coalesce(b.incurred, 0) * h.tax_rate_pct * coalesce(h.tax_share_pct, 100) / 10000)::bigint
         else 0 end as incurred_paise,
    (h.is_tax and l.initial_paise is null and l.subproject_id is null) as initial_calculated,
    (h.is_tax and l.ctc_paise is null and l.subproject_id is null) or l.ctc_rate is not null or l.balance_of_paise is not null as ctc_calculated,
    case when l.incurred_override_paise is not null then 'override'
         when not h.is_tax or inc.n > 0 then 'entries'
         else 'tax rule' end as incurred_source,
    l.is_memo,
    case when l.ctc_rate is not null then 'rate' when l.balance_of_paise is not null then 'balance'
         when h.is_tax and l.ctc_paise is null and l.subproject_id is null then 'tax' else 'typed' end as ctc_rule,
    l.ctc_rate, l.ctc_basis, l.balance_of_paise, l.balance_scope
  from public.budget_lines l
  join public.budget_cost_heads h on h.id = l.cost_head_id
  join inc on inc.line_id = l.id
  join ruled ru on ru.id = l.id
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
  f.import_id,
  f.is_memo,     -- memo item: shown for reference, outside every total
  f.ctc_rule,    -- typed / rate / balance / tax
  f.ctc_rate, f.ctc_basis, f.balance_of_paise, f.balance_scope
from fig f
join public.budget_versions v on v.id = f.version_id
join public.budget_cost_heads h on h.id = f.cost_head_id
join public.budget_departments d on d.id = h.department_id
left join public.budget_subprojects s on s.id = f.subproject_id;

create or replace view public.budget_department_totals with (security_invoker = true) as
select version_id, department_id, department, summary_category, department_sort,
  sum(initial_paise) as initial_paise, sum(ctc_paise) as ctc_paise, sum(incurred_paise) as incurred_paise,
  round(sum(initial_paise) / 1e9, 6) as initial_cr,
  round(sum(ctc_paise) / 1e9, 6) as ctc_cr,
  round(sum(incurred_paise) / 1e9, 6) as incurred_cr,
  round(sum(balance_paise) / 1e9, 6) as balance_cr,
  round(sum(variance_paise) / 1e9, 6) as variance_cr,
  round(sum(incurred_paise) * 100.0 / nullif(sum(ctc_paise), 0), 2) as util_pct
from public.budget_line_figures
where not is_memo
group by version_id, department_id, department, summary_category, department_sort;

create or replace view public.budget_version_totals with (security_invoker = true) as
select v.id as version_id, v.project_id, v.number, 'R' || v.number as label, v.as_on, v.status,
  (v.areas ->> 'total_carpet')::numeric as total_carpet,
  (v.areas ->> 'eng_area')::numeric as eng_area,
  coalesce(sum(f.initial_paise), 0) as initial_paise,
  coalesce(sum(f.ctc_paise), 0) as ctc_paise,
  coalesce(sum(f.incurred_paise), 0) as incurred_paise,
  round(coalesce(sum(f.initial_paise), 0) / 1e9, 6) as initial_cr,
  round(coalesce(sum(f.ctc_paise), 0) / 1e9, 6) as ctc_cr,
  round(coalesce(sum(f.incurred_paise), 0) / 1e9, 6) as incurred_cr,
  round(coalesce(sum(f.balance_paise), 0) / 1e9, 6) as balance_cr,
  round(coalesce(sum(f.variance_paise), 0) / 1e9, 6) as variance_cr,
  round(sum(f.incurred_paise) * 100.0 / nullif(sum(f.ctc_paise), 0), 2) as util_pct
from public.budget_versions v
left join public.budget_line_figures f on f.version_id = v.id and not f.is_memo
group by v.id;

create or replace view public.budget_summary_rows with (security_invoker = true) as
with used as (
  select version_id, summary_category as category, summary_subcategory as subcategory,
         sum(ctc_paise) as ctc_paise, sum(incurred_paise) as incurred_paise
  from public.budget_line_figures where not is_memo group by 1, 2, 3
),
cats as (
  select distinct category, category_sort from public.budget_summary_template
),
grid as (
  select v.id as version_id, t.category, t.subcategory, t.category_sort, t.subcategory_sort
  from public.budget_versions v cross join public.budget_summary_template t
  union all
  select u.version_id, u.category, u.subcategory, coalesce(c.category_sort, 99), 999
  from used u left join cats c on c.category = u.category
  where not exists (select 1 from public.budget_summary_template t where t.category = u.category and t.subcategory = u.subcategory)
)
select g.version_id, g.category, g.subcategory, g.category_sort, g.subcategory_sort,
  coalesce(u.ctc_paise, 0) as amount_paise, round(coalesce(u.ctc_paise, 0) / 1e9, 6) as amount_cr,
  coalesce(u.incurred_paise, 0) as incurred_paise
from grid g
left join used u on u.version_id = g.version_id and u.category = g.category and u.subcategory = g.subcategory;

-- ---------------------------------------------------------------------------
-- Access
-- ---------------------------------------------------------------------------

alter table public.budget_signoff_levels enable row level security;
alter table public.budget_signoffs enable row level security;

create policy read_members on public.budget_signoff_levels for select to authenticated
  using (public.budget_is_member() and (project_id is null or public.budget_has('project.view', project_id)));
-- A project's own chain: its set-up right. The chain for every project: the access right.
create policy manage_levels on public.budget_signoff_levels for all to authenticated
  using (case when project_id is null then public.budget_has('access.manage') else public.budget_has('project.setup', project_id) end)
  with check (case when project_id is null then public.budget_has('access.manage') else public.budget_has('project.setup', project_id) end);
create policy read_project on public.budget_signoffs for select to authenticated
  using (public.budget_has('project.view', public.budget_version_project(version_id)));
-- budget_signoffs is written only by the sign-off functions above.

grant select, insert, update, delete on public.budget_signoff_levels to authenticated;
grant select on public.budget_signoffs to authenticated;

revoke execute on function public.budget_submit_version(bigint, text) from public, anon;
revoke execute on function public.budget_sign_version(bigint, text, text) from public, anon;
revoke execute on function public.budget_recall_version(bigint) from public, anon;
revoke execute on function public.budget_set_department_remark(bigint, bigint, text) from public, anon;
revoke execute on function public.budget_set_tower_note(bigint, bigint, date, text) from public, anon;
revoke execute on function public.budget_ready_check(bigint) from public, anon;
grant execute on function public.budget_submit_version(bigint, text) to authenticated;
grant execute on function public.budget_sign_version(bigint, text, text) to authenticated;
grant execute on function public.budget_recall_version(bigint) to authenticated;
grant execute on function public.budget_set_department_remark(bigint, bigint, text) to authenticated;
grant execute on function public.budget_set_tower_note(bigint, bigint, date, text) to authenticated;

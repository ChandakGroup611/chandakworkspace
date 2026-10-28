-- Organization Budget: supporting schedules, as the backup working sheets behind the Summary
-- (GST workings, interest cost, rent, corpus, stamp duty, SRA / MCGM cost and the like).
-- A schedule belongs to one budget line and works out its Estimated CTC from rows:
--   amount (₹) = quantity × rate × percent ÷ 100 × periods, or an amount typed for the row.
-- For example rent: tenants × monthly rent × 100% × months; stamp duty: value × 1 × 6% × 1;
-- interest: loan × 1 × rate% × years. The line's CTC is the schedule's total, kept in step by a
-- trigger, so every view, report and total reads it as before. Schedules are kept per version and
-- carried into the next version with their line.
-- Only adds tables, functions and triggers. Runs after 20261028120700.

create table public.budget_schedules (
  id bigint generated always as identity primary key,
  version_id bigint not null references public.budget_versions on delete cascade,
  line_id bigint not null unique references public.budget_lines on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 120),
  note text,
  created_at timestamptz not null default now()
);
create index on public.budget_schedules (version_id);

create table public.budget_schedule_rows (
  id bigint generated always as identity primary key,
  schedule_id bigint not null references public.budget_schedules on delete cascade,
  sort int not null default 0,
  label text not null default '',
  qty numeric,                         -- count, area, value …
  rate numeric,                        -- ₹ per unit
  pct numeric not null default 100,    -- share, GST %, stamp duty % …
  periods numeric not null default 1,  -- months, years …
  amount_paise bigint,                 -- typed amount; replaces the calculation when set
  remark text
);
create index on public.budget_schedule_rows (schedule_id, sort);

-- Amount of each row in paise, and the schedule totals.
create view public.budget_schedule_figures with (security_invoker = true) as
select r.id as row_id, r.schedule_id, s.version_id, s.line_id, r.sort, r.label, r.qty, r.rate, r.pct, r.periods, r.amount_paise as typed_paise, r.remark,
  coalesce(r.amount_paise, round(coalesce(r.qty, 0) * coalesce(r.rate, 0) * r.pct / 100 * r.periods * 100)::bigint) as amount_paise
from public.budget_schedule_rows r join public.budget_schedules s on s.id = r.schedule_id;

-- Keeps the line's CTC equal to its schedule's total. Inside it, budget.schedule_sync lets the line
-- update through; typing CTC on a scheduled line is refused (by budget_guard_schedule_line below).
create function public.budget_sync_schedule(p_schedule bigint) returns void
language plpgsql security definer set search_path = public as $$
declare
  s public.budget_schedules;
  total bigint;
begin
  select * into s from public.budget_schedules where id = p_schedule;
  if s.id is null then return; end if;
  select coalesce(sum(amount_paise), 0) into total from public.budget_schedule_figures where schedule_id = p_schedule;
  perform set_config('budget.schedule_sync', 'on', true);
  update public.budget_lines set ctc_paise = greatest(total, 0), ctc_rate = null, ctc_basis = null, balance_of_paise = null, balance_scope = null
  where id = s.line_id and ctc_paise is distinct from greatest(total, 0);
  perform set_config('budget.schedule_sync', '', true);
end $$;

create function public.budget_schedule_rows_changed() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.budget_sync_schedule(coalesce(new.schedule_id, old.schedule_id));
  if tg_op = 'UPDATE' and new.schedule_id <> old.schedule_id then
    perform public.budget_sync_schedule(old.schedule_id);
  end if;
  return null;
end $$;
create trigger budget_schedule_rows_changed after insert or update or delete on public.budget_schedule_rows
for each row execute function public.budget_schedule_rows_changed();

-- Schedules and their rows change only on a draft version, by whoever may edit the line.
create function public.budget_guard_schedule() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  sid bigint;
  v record;
begin
  if tg_table_name = 'budget_schedules' then
    if tg_op <> 'DELETE' then
      if not exists (select 1 from public.budget_lines l where l.id = new.line_id and l.version_id = new.version_id) then
        raise exception 'The line is not in this version';
      end if;
      if exists (select 1 from public.budget_lines l join public.budget_cost_heads h on h.id = l.cost_head_id where l.id = new.line_id and (h.is_tax or l.is_memo)) then
        raise exception 'GST lines and memo items cannot have a schedule';
      end if;
    end if;
    select bv.status into v from public.budget_versions bv where bv.id = coalesce(new.version_id, old.version_id);
  else
    sid := coalesce(new.schedule_id, old.schedule_id);
    select bv.status into v from public.budget_schedules s join public.budget_versions bv on bv.id = s.version_id where s.id = sid;
  end if;
  -- a deleted version takes its schedules with it
  if tg_op = 'DELETE' and v.status is null then
    return old;
  end if;
  if v.status <> 'draft' then
    raise exception 'Schedules are changed on a draft version';
  end if;
  return coalesce(new, old);
end $$;
create trigger budget_guard_schedule before insert or update or delete on public.budget_schedules
for each row execute function public.budget_guard_schedule();
create trigger budget_guard_schedule before insert or update or delete on public.budget_schedule_rows
for each row execute function public.budget_guard_schedule();

-- A line with a schedule takes its CTC from it: typing CTC or giving it another rule is refused.
create function public.budget_guard_schedule_line() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('budget.schedule_sync', true), '') <> 'on'
     and public.budget_current_import() is null
     and exists (select 1 from public.budget_schedules where line_id = new.id)
     and (new.ctc_paise is distinct from old.ctc_paise or new.ctc_rate is not null or new.balance_of_paise is not null or new.is_memo) then
    raise exception 'This line''s CTC comes from its schedule; change the schedule, or remove it first';
  end if;
  return new;
end $$;
create trigger budget_guard_schedule_line before update on public.budget_lines
for each row execute function public.budget_guard_schedule_line();

-- A new version carries each line's schedule with it (the line itself is copied by budget_create_version).
create function public.budget_copy_line_schedule() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  parent bigint := (select parent_id from public.budget_versions where id = new.version_id);
  src public.budget_schedules;
  new_sid bigint;
begin
  if parent is null then return new; end if;
  select s.* into src from public.budget_lines old_line join public.budget_schedules s on s.line_id = old_line.id
  where old_line.version_id = parent and old_line.cost_head_id = new.cost_head_id
    and old_line.subproject_id is not distinct from new.subproject_id;
  if src.id is null then return new; end if;
  insert into public.budget_schedules (version_id, line_id, title, note) values (new.version_id, new.id, src.title, src.note)
  returning id into new_sid;
  insert into public.budget_schedule_rows (schedule_id, sort, label, qty, rate, pct, periods, amount_paise, remark)
  select new_sid, sort, label, qty, rate, pct, periods, amount_paise, remark from public.budget_schedule_rows where schedule_id = src.id;
  return new;
end $$;
create trigger budget_copy_line_schedule after insert on public.budget_lines
for each row execute function public.budget_copy_line_schedule();

create trigger budget_audit after insert or update or delete on public.budget_schedule_rows
for each row execute function public.budget_audit();

alter table public.budget_schedules enable row level security;
alter table public.budget_schedule_rows enable row level security;

create policy read_project on public.budget_schedules for select to authenticated
  using (public.budget_has('project.view', public.budget_version_project(version_id)));
create policy edit_line on public.budget_schedules for all to authenticated
  using (public.budget_can_edit((select cost_head_id from public.budget_lines where id = line_id)))
  with check (public.budget_can_edit((select cost_head_id from public.budget_lines where id = line_id)));
create policy read_project on public.budget_schedule_rows for select to authenticated
  using (exists (select 1 from public.budget_schedules s where s.id = schedule_id
                 and public.budget_has('project.view', public.budget_version_project(s.version_id))));
create policy edit_line on public.budget_schedule_rows for all to authenticated
  using (exists (select 1 from public.budget_schedules s join public.budget_lines l on l.id = s.line_id
                 where s.id = schedule_id and public.budget_can_edit(l.cost_head_id)))
  with check (exists (select 1 from public.budget_schedules s join public.budget_lines l on l.id = s.line_id
                      where s.id = schedule_id and public.budget_can_edit(l.cost_head_id)));

grant select, insert, update, delete on public.budget_schedules, public.budget_schedule_rows to authenticated;
grant select on public.budget_schedule_figures to authenticated;
revoke execute on function public.budget_sync_schedule(bigint) from public, anon, authenticated;

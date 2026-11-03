-- Organization Budget: masters that had no screen.
--   * Departments: add, rename, re-order, delete (refused while a cost head uses one).
--   * Summary rows (category / sub-category of the Project Budget Summary): add, rename, re-order, delete.
--     A rename carries over to the departments and cost heads that point at it; delete is refused while
--     a cost head uses the row. Construction rows follow the tower building types and stay fixed.
--   * GST rules: named rate x eligible share, picked when adding a GST cost head or applied to one.
--     Changing a rule does not change existing heads (that would move approved figures); apply it to a head on purpose.
-- Writes need the right "Maintain towers, areas, cost heads and GST rules" (project.setup) for all projects.
-- Runs after the other budget migrations. Adds one table; nothing existing is dropped.

-- ---------- GST rules ----------
create table if not exists public.budget_gst_rules (
  id bigint generated always as identity primary key,
  name text not null unique check (btrim(name) <> ''),
  rate_pct numeric(9, 4) not null check (rate_pct > 0 and rate_pct <= 100),
  share_pct numeric(9, 4) not null default 100 check (share_pct > 0 and share_pct <= 100),
  sort int not null default 0,
  active boolean not null default true
);
comment on table public.budget_gst_rules is 'GST types: rate % x eligible share %, offered when setting up GST cost heads.';

-- Start with the rules the cost heads already use, plus plain 18%.
insert into public.budget_gst_rules (name, rate_pct, share_pct, sort)
select format('GST %s%% x %s%%', trim_scale(rate), trim_scale(share)), rate, share, row_number() over (order by rate, share)::int
from (select distinct tax_rate_pct as rate, coalesce(tax_share_pct, 100) as share
      from public.budget_cost_heads where is_tax and tax_rate_pct > 0 and tax_rate_pct <= 100
        and coalesce(tax_share_pct, 100) > 0 and coalesce(tax_share_pct, 100) <= 100) s
on conflict (name) do nothing;
insert into public.budget_gst_rules (name, rate_pct, share_pct, sort)
values ('GST 18% x 100%', 18, 100, 0)
on conflict (name) do nothing;

alter table public.budget_gst_rules enable row level security;
drop policy if exists read_members on public.budget_gst_rules;
create policy read_members on public.budget_gst_rules for select to authenticated using (public.budget_is_member());
drop policy if exists setup_write on public.budget_gst_rules;
create policy setup_write on public.budget_gst_rules for all to authenticated
  using (public.budget_has('project.setup')) with check (public.budget_has('project.setup'));
grant select, insert, update, delete on public.budget_gst_rules to authenticated;

-- ---------- summary rows ----------
drop policy if exists setup_write on public.budget_summary_template;
create policy setup_write on public.budget_summary_template for all to authenticated
  using (public.budget_has('project.setup')) with check (public.budget_has('project.setup'));
grant select, insert, update, delete on public.budget_summary_template to authenticated;

create or replace function public.budget_summary_template_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op in ('UPDATE', 'DELETE') and old.category = 'Construction' then
    raise exception 'Construction rows follow the tower building types and cannot be changed here';
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    if new.category = 'Construction' then
      raise exception 'Construction rows follow the tower building types and cannot be added here';
    end if;
    new.category := btrim(new.category);
    new.subcategory := btrim(new.subcategory);
    if new.category = '' or new.subcategory = '' then
      raise exception 'Type both the category and the sub-category';
    end if;
  end if;
  if tg_op = 'DELETE' then
    if exists (select 1 from public.budget_cost_heads h join public.budget_departments d on d.id = h.department_id
               where d.summary_category = old.category and h.summary_subcategory = old.subcategory) then
      raise exception 'Summary row % / % is used by cost heads; move them to another row first', old.category, old.subcategory;
    end if;
    if not exists (select 1 from public.budget_summary_template where category = old.category and subcategory <> old.subcategory)
       and exists (select 1 from public.budget_departments where summary_category = old.category) then
      raise exception 'This is the last row of % and departments use that category; move them first', old.category;
    end if;
    return old;
  end if;
  if tg_op = 'UPDATE' then
    -- a rename carries over to the departments and cost heads pointing at the row
    if new.subcategory <> old.subcategory or new.category <> old.category then
      update public.budget_cost_heads h set summary_subcategory = new.subcategory
      from public.budget_departments d
      where d.id = h.department_id and d.summary_category = old.category and h.summary_subcategory = old.subcategory;
    end if;
    if new.category <> old.category then
      -- every row of the category is renamed together on the screen; departments follow once none is left
      if not exists (select 1 from public.budget_summary_template where category = old.category and subcategory <> old.subcategory) then
        update public.budget_departments set summary_category = new.category where summary_category = old.category;
      end if;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists budget_summary_template_guard on public.budget_summary_template;
create trigger budget_summary_template_guard before insert or update or delete on public.budget_summary_template
  for each row execute function public.budget_summary_template_guard();

-- Rename a whole summary category (all its rows and the departments under it) in one call.
create or replace function public.budget_rename_summary_category(p_old text, p_new text, p_sort int default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.budget_has('project.setup') then
    raise exception 'You do not have the right to change the summary rows';
  end if;
  if p_old = 'Construction' or btrim(p_new) = 'Construction' then
    raise exception 'The Construction category cannot be renamed';
  end if;
  if nullif(btrim(p_new), '') is null then
    raise exception 'Type the category name';
  end if;
  if btrim(p_new) <> p_old and exists (select 1 from public.budget_summary_template where category = btrim(p_new)) then
    raise exception 'A summary category named % already exists', btrim(p_new);
  end if;
  update public.budget_summary_template set category = btrim(p_new), category_sort = coalesce(p_sort, category_sort)
  where category = p_old;
  update public.budget_departments set summary_category = btrim(p_new) where summary_category = p_old;
end $$;
grant execute on function public.budget_rename_summary_category(text, text, int) to authenticated;

-- ---------- departments ----------
create or replace function public.budget_department_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    if exists (select 1 from public.budget_cost_heads where department_id = old.id) then
      raise exception 'Department % has cost heads in a project; delete or move them first', old.name;
    end if;
    return old;
  end if;
  new.name := btrim(new.name);
  if new.name = '' then
    raise exception 'Type the department name';
  end if;
  -- the summary category is checked by the screen; the workbook import may bring a new one
  return new;
end $$;
drop trigger if exists budget_department_guard on public.budget_departments;
create trigger budget_department_guard before insert or update or delete on public.budget_departments
  for each row execute function public.budget_department_guard();
grant select, insert, update, delete on public.budget_departments to authenticated;

-- Organization Budget: cost incurred built up from bills.
-- A bill (vendor, bill number, bill date, work order, GST) is split over one or more cost heads and towers.
-- Each split is an ordinary cost incurred entry tied to the bill, so every calculation, report and period
-- view counts bills exactly as typed or imported entries:
--   * the entry's month is the bill date's month, and its reference is "vendor · bill number";
--   * the bill's basic amount is the sum of its splits; GST on the bill is kept for reference (GST cost is
--     worked out by the GST heads, as before);
--   * the same bill number of the same vendor cannot be recorded twice in a project.
-- Only adds a table, a column, a view, functions and triggers. Runs after 20261028120800.

create table public.budget_bills (
  id bigint generated always as identity primary key,
  project_id bigint not null references public.budget_projects on delete cascade,
  vendor text not null check (length(btrim(vendor)) between 1 and 160),
  bill_no text not null check (length(btrim(bill_no)) between 1 and 80),
  bill_date date not null,
  work_order text,
  gst_paise bigint not null default 0 check (gst_paise >= 0),
  note text,
  entered_by uuid default auth.uid() references auth.users,
  created_at timestamptz not null default now()
);
create unique index budget_bills_one_per_vendor on public.budget_bills (project_id, lower(btrim(vendor)), lower(btrim(bill_no)));
create index on public.budget_bills (project_id, bill_date);

alter table public.budget_incurred_entries
  add column bill_id bigint references public.budget_bills on delete cascade;
create index on public.budget_incurred_entries (bill_id);

-- A bill's split takes its month and reference from the bill.
create function public.budget_bill_entry() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  b public.budget_bills;
begin
  if new.bill_id is null then return new; end if;
  select * into b from public.budget_bills where id = new.bill_id;
  if b.project_id is distinct from new.project_id then
    raise exception 'The bill belongs to another project';
  end if;
  new.month := date_trunc('month', b.bill_date)::date;
  new.reference := btrim(b.vendor) || ' · ' || btrim(b.bill_no);
  return new;
end $$;
create trigger budget_bill_entry before insert or update on public.budget_incurred_entries
for each row execute function public.budget_bill_entry();

-- A changed bill date, vendor or number moves its splits with it.
create function public.budget_bill_changed() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.project_id <> old.project_id then
    raise exception 'A bill cannot move to another project';
  end if;
  if (new.bill_date, new.vendor, new.bill_no) is distinct from (old.bill_date, old.vendor, old.bill_no) then
    update public.budget_incurred_entries set bill_id = bill_id where bill_id = new.id;   -- re-runs budget_bill_entry
  end if;
  return null;
end $$;
create trigger budget_bill_changed after update on public.budget_bills
for each row execute function public.budget_bill_changed();

create trigger budget_audit after insert or update or delete on public.budget_bills
for each row execute function public.budget_audit();

-- Bills with their basic amount (sum of the splits), GST and total.
create view public.budget_bill_figures with (security_invoker = true) as
select b.id as bill_id, b.project_id, b.vendor, b.bill_no, b.bill_date, b.work_order, b.gst_paise, b.note, b.entered_by, b.created_at,
  coalesce(sum(e.amount_paise), 0) as basic_paise,
  coalesce(sum(e.amount_paise), 0) + b.gst_paise as total_paise,
  count(e.id) as splits
from public.budget_bills b
left join public.budget_incurred_entries e on e.bill_id = b.id
group by b.id;

-- Records a bill and its splits in one go: p_bill {vendor, bill_no, bill_date, work_order, gst_paise, note},
-- p_splits [{head, tower, amount_paise}]. Runs as the caller, so the rights on each cost head apply.
create function public.budget_add_bill(p_project bigint, p_bill jsonb, p_splits jsonb)
returns bigint
language plpgsql set search_path = public as $$
declare
  new_id bigint;
  s jsonb;
  dup public.budget_bills;
begin
  if jsonb_array_length(coalesce(p_splits, '[]')) = 0 then
    raise exception 'Split the bill over at least one cost head';
  end if;
  select * into dup from public.budget_bills
  where project_id = p_project and lower(btrim(vendor)) = lower(btrim(p_bill ->> 'vendor')) and lower(btrim(bill_no)) = lower(btrim(p_bill ->> 'bill_no'));
  if dup.id is not null then
    raise exception 'Bill % of % is already recorded (dated %)', dup.bill_no, dup.vendor, to_char(dup.bill_date, 'DD-MM-YYYY');
  end if;
  insert into public.budget_bills (project_id, vendor, bill_no, bill_date, work_order, gst_paise, note)
  values (p_project, btrim(p_bill ->> 'vendor'), btrim(p_bill ->> 'bill_no'), (p_bill ->> 'bill_date')::date,
          nullif(btrim(p_bill ->> 'work_order'), ''), coalesce((p_bill ->> 'gst_paise')::bigint, 0), nullif(btrim(p_bill ->> 'note'), ''))
  returning id into new_id;
  for s in select * from jsonb_array_elements(p_splits) loop
    if coalesce((s ->> 'amount_paise')::bigint, 0) = 0 then
      raise exception 'Every split needs an amount';
    end if;
    insert into public.budget_incurred_entries (project_id, cost_head_id, subproject_id, month, amount_paise, bill_id)
    values (p_project, (s ->> 'head')::bigint, nullif(s ->> 'tower', '')::bigint, (p_bill ->> 'bill_date')::date, (s ->> 'amount_paise')::bigint, new_id);
  end loop;
  return new_id;
end $$;

alter table public.budget_bills enable row level security;
create policy read_project on public.budget_bills for select to authenticated
  using (public.budget_has('project.view', project_id));
create policy add_bill on public.budget_bills for insert to authenticated
  with check (public.budget_has('cost.enter', project_id));
-- A bill is changed or deleted by someone who may record cost on every head it is split over.
create policy edit_bill on public.budget_bills for update to authenticated
  using (public.budget_has('cost.enter', project_id)
         and not exists (select 1 from public.budget_incurred_entries e where e.bill_id = budget_bills.id and not public.budget_can_enter_cost(e.cost_head_id)))
  with check (public.budget_has('cost.enter', project_id));
create policy delete_bill on public.budget_bills for delete to authenticated
  using (public.budget_has('cost.enter', project_id)
         and not exists (select 1 from public.budget_incurred_entries e where e.bill_id = budget_bills.id and not public.budget_can_enter_cost(e.cost_head_id)));

grant select, insert, update, delete on public.budget_bills to authenticated;
grant select on public.budget_bill_figures to authenticated;
revoke execute on function public.budget_add_bill(bigint, jsonb, jsonb) from public, anon;
grant execute on function public.budget_add_bill(bigint, jsonb, jsonb) to authenticated;

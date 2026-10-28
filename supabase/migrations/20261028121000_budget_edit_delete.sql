-- Organization Budget: edit and delete where the screens could only add.
--   * budget_update_bill: change a bill's details and its splits in one go.
--   * budget_delete_tower / budget_delete_head: remove a tower or cost head that was added by mistake.
--     Refused once it carries any figure: cost incurred, a line of an approved version, an amount on the
--     open version, or (for a head) a place in a GST head's base. Its empty lines on the open version go with it.
-- Only adds functions. Runs after 20261028120900.

-- p_bill {vendor, bill_no, bill_date, work_order, gst_paise, note}; p_splits [{head, tower, amount_paise}] replace the old splits.
-- Runs as the caller, so the rights on the bill and on each cost head apply.
create function public.budget_update_bill(p_bill_id bigint, p_bill jsonb, p_splits jsonb)
returns void
language plpgsql set search_path = public as $$
declare
  b public.budget_bills;
  dup public.budget_bills;
  s jsonb;
  n int;
begin
  select * into b from public.budget_bills where id = p_bill_id;
  if b.id is null then
    raise exception 'Bill not found';
  end if;
  if jsonb_array_length(coalesce(p_splits, '[]')) = 0 then
    raise exception 'Split the bill over at least one cost head';
  end if;
  select * into dup from public.budget_bills
  where project_id = b.project_id and id <> b.id
    and lower(btrim(vendor)) = lower(btrim(p_bill ->> 'vendor')) and lower(btrim(bill_no)) = lower(btrim(p_bill ->> 'bill_no'));
  if dup.id is not null then
    raise exception 'Bill % of % is already recorded (dated %)', dup.bill_no, dup.vendor, to_char(dup.bill_date, 'DD-MM-YYYY');
  end if;
  update public.budget_bills
  set vendor = btrim(p_bill ->> 'vendor'), bill_no = btrim(p_bill ->> 'bill_no'), bill_date = (p_bill ->> 'bill_date')::date,
      work_order = nullif(btrim(p_bill ->> 'work_order'), ''), gst_paise = coalesce((p_bill ->> 'gst_paise')::bigint, 0),
      note = nullif(btrim(p_bill ->> 'note'), '')
  where id = b.id;
  get diagnostics n = row_count;
  if n = 0 then
    raise exception 'You cannot change this bill: it is split over a department you do not record cost for';
  end if;
  delete from public.budget_incurred_entries where bill_id = b.id;
  if exists (select 1 from public.budget_incurred_entries where bill_id = b.id) then
    raise exception 'You cannot change this bill: it is split over a department you do not record cost for';
  end if;
  for s in select * from jsonb_array_elements(p_splits) loop
    if coalesce((s ->> 'amount_paise')::bigint, 0) = 0 then
      raise exception 'Every split needs an amount';
    end if;
    insert into public.budget_incurred_entries (project_id, cost_head_id, subproject_id, month, amount_paise, bill_id)
    values (b.project_id, (s ->> 'head')::bigint, nullif(s ->> 'tower', '')::bigint, (p_bill ->> 'bill_date')::date, (s ->> 'amount_paise')::bigint, b.id);
  end loop;
end $$;

create function public.budget_delete_tower(p_tower bigint)
returns void
language plpgsql security definer set search_path = public as $$
declare
  t public.budget_subprojects;
begin
  select * into t from public.budget_subprojects where id = p_tower;
  if t.id is null then
    raise exception 'Tower not found';
  end if;
  if not public.budget_has('project.setup', t.project_id) then
    raise exception 'You do not have the set-up right for this project';
  end if;
  if exists (select 1 from public.budget_incurred_entries where subproject_id = p_tower) then
    raise exception '% has cost incurred recorded against it; it cannot be deleted', t.name;
  end if;
  if exists (select 1 from public.budget_lines l join public.budget_versions v on v.id = l.version_id
             where l.subproject_id = p_tower and (v.status = 'approved' or coalesce(l.initial_paise, 0) <> 0 or coalesce(l.ctc_paise, 0) <> 0)) then
    raise exception '% has budget amounts in an approved or open version; it cannot be deleted', t.name;
  end if;
  delete from public.budget_lines where subproject_id = p_tower;
  delete from public.budget_subprojects where id = p_tower;
end $$;

create function public.budget_delete_head(p_head bigint)
returns void
language plpgsql security definer set search_path = public as $$
declare
  h public.budget_cost_heads;
begin
  select * into h from public.budget_cost_heads where id = p_head;
  if h.id is null then
    raise exception 'Cost head not found';
  end if;
  if not public.budget_has('project.setup', h.project_id) then
    raise exception 'You do not have the set-up right for this project';
  end if;
  if exists (select 1 from public.budget_incurred_entries where cost_head_id = p_head) then
    raise exception 'This cost head has cost incurred recorded against it; it cannot be deleted';
  end if;
  if exists (select 1 from public.budget_lines l join public.budget_versions v on v.id = l.version_id
             where l.cost_head_id = p_head and (v.status = 'approved' or coalesce(l.initial_paise, 0) <> 0 or coalesce(l.ctc_paise, 0) <> 0)) then
    raise exception 'This cost head has budget amounts in an approved or open version; it cannot be deleted';
  end if;
  if exists (select 1 from public.budget_cost_heads where project_id = h.project_id and p_head = any(tax_base)) then
    raise exception 'A GST head is worked out on this cost head; change that GST head first';
  end if;
  delete from public.budget_lines where cost_head_id = p_head;
  delete from public.budget_cost_heads where id = p_head;
end $$;

revoke execute on function public.budget_update_bill(bigint, jsonb, jsonb), public.budget_delete_tower(bigint), public.budget_delete_head(bigint) from public, anon;
grant execute on function public.budget_update_bill(bigint, jsonb, jsonb), public.budget_delete_tower(bigint), public.budget_delete_head(bigint) to authenticated;

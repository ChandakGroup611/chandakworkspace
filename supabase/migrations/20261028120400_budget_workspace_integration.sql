-- ==============================================================================
-- Organization Budget: plug the module into Chandak Workspace.
--   1. People come from the workspace user master (user_master), signed in through Supabase Auth.
--   2. The module is registered in modules_master (ORG_BUDGET, /budget) for the module chooser.
--   3. Workspace super admins / admins become the first budget Administrators. Everyone else is
--      added on the module's Settings → Access screen; roles and rights live in the module.
--   4. Adding someone as a budget member gives them the module in the chooser (user_modules);
--      removing them takes it away.
-- Runs after the four budget migrations (20261028120000 … 20261028120300).
-- ==============================================================================

-- 1. Workspace users (active, not deleted, with a sign-in)
create or replace view public.budget_workspace_users as
select um.id as user_id,
       coalesce(nullif(btrim(um.email), ''), au.email)::text as email,
       coalesce(nullif(btrim(um.full_name), ''), au.email)::text as full_name
from public.user_master um
join auth.users au on au.id = um.id
where um.is_active and not um.is_deleted;
revoke all on public.budget_workspace_users from anon, authenticated;

-- 2. Module registration
insert into public.modules_master (code, name, description, icon, route_path, display_order, is_active)
values ('ORG_BUDGET', 'Organization Budget',
        'Project, tower and department budgets, versions, cost incurred, Summary and Detail reports',
        'Wallet', '/budget', 6, true)
on conflict (code) do update set
  name = excluded.name, description = excluded.description, icon = excluded.icon,
  route_path = excluded.route_path, display_order = excluded.display_order, is_active = excluded.is_active,
  updated_at = now();

-- 3. First administrators
insert into public.budget_members (user_id, role_id)
select um.id, (select id from public.budget_roles where name = 'Administrator')
from public.user_master um
join public.roles r on r.id = um.role_id
join auth.users au on au.id = um.id
where r.code in ('SUPER_ADMIN', 'ROLE_ADMIN') and um.is_active and not um.is_deleted
on conflict (user_id) do nothing;

-- 4. Budget membership opens the module in the chooser
create or replace function public.budget_sync_user_module() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_module uuid := (select id from public.modules_master where code = 'ORG_BUDGET');
begin
  if v_module is null then return null; end if;
  if tg_op = 'DELETE' or not new.active then
    delete from public.user_modules
    where user_id = coalesce(new.user_id, old.user_id) and module_id = v_module and not is_default;
  elsif exists (select 1 from public.user_master where id = new.user_id) then
    insert into public.user_modules (user_id, module_id, is_default)
    values (new.user_id, v_module, false)
    on conflict (user_id, module_id) do nothing;
  end if;
  return null;
end $$;

drop trigger if exists budget_sync_user_module on public.budget_members;
create trigger budget_sync_user_module after insert or update of active or delete on public.budget_members
for each row execute function public.budget_sync_user_module();

insert into public.user_modules (user_id, module_id, is_default)
select m.user_id, mm.id, false
from public.budget_members m
join public.user_master um on um.id = m.user_id
cross join public.modules_master mm
where mm.code = 'ORG_BUDGET' and m.active
on conflict (user_id, module_id) do nothing;

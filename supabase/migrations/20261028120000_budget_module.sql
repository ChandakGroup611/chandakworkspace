-- Organization Budget module for Supabase (PostgreSQL 15+).
--
-- Project > Tower (subproject), Department > Cost Head, Budget Version > Budget Line.
-- Every calculated figure of the Excel formats (Balance CTC, Variance, PSF,
-- Utilisation %, GST lines, totals, net sale carpet area) is worked out here in
-- views and functions, so every screen and report reads the same numbers.
--
-- Money is stored as whole paise (bigint); views also expose crores.
-- All objects are prefixed budget_ so they sit beside the existing application's tables.

-- ---------------------------------------------------------------------------
-- Masters
-- ---------------------------------------------------------------------------

create table public.budget_departments (
  id bigint generated always as identity primary key,
  name text not null unique,
  summary_category text not null,           -- category on the Project Budget Summary
  sort int not null default 0
);

create table public.budget_projects (
  id bigint generated always as identity primary key,
  code text not null unique,
  name text not null,
  location text,
  fy_start_month int not null default 4 check (fy_start_month between 1 and 12),
  created_at timestamptz not null default now()
);

create table public.budget_subprojects (
  id bigint generated always as identity primary key,
  project_id bigint not null references public.budget_projects on delete cascade,
  name text not null,
  type text check (type in ('Sales Building', 'Society Building', 'Rehab Building', 'Common Infra',
                            'MHADA Building', 'Reservation Building', 'Open Space Area / MCGM',
                            'School / Other Building')),
  carpet_area numeric,
  eng_area numeric,
  design_area numeric,
  floors text,
  oc_date date,
  remark text,
  sort int not null default 0,
  unique (project_id, name)
);
comment on table public.budget_subprojects is 'Towers / buildings of a project.';

create table public.budget_cost_heads (
  id bigint generated always as identity primary key,
  project_id bigint not null references public.budget_projects on delete cascade,
  department_id bigint not null references public.budget_departments,
  category text not null,
  sub_category text,
  note text,
  summary_subcategory text,                 -- row it rolls into on the summary format
  sort int not null default 0,
  is_tax boolean not null default false,    -- calculated as base x rate% x share%
  tax_rate_pct numeric(9, 4),
  tax_share_pct numeric(9, 4),
  tax_base bigint[] not null default '{}',  -- cost head ids the tax is charged on
  active boolean not null default true,
  check (not is_tax or tax_rate_pct is not null)
);
create index on public.budget_cost_heads (project_id);

-- Sub-categories of the summary format, in its order.
create table public.budget_summary_template (
  category text not null,
  subcategory text not null,
  category_sort int not null,
  subcategory_sort int not null,
  primary key (category, subcategory)
);

insert into public.budget_summary_template (category, subcategory, category_sort, subcategory_sort)
select c.category, s.subcategory, c.sort, s.ord
from (values
  (1, 'Construction', array['Sales Building', 'Society Building', 'Rehab Building', 'Common Infra', 'MHADA Building',
       'Reservation Building', 'Open Space Area / MCGM', 'School / Other Building',
       'GST on Construction Cost (Sale, Rehab & Other)']),
  (2, 'Sales & Marketing', array['Brokerage', 'Sales (Including Experience Center)', 'GST on Brokerage & Sales']),
  (3, 'Admin & IT', array['Admin', 'Admin Other', 'IT', 'GST on Admin & IT']),
  (4, 'Professional Fee', array['Professional Fee on Sales Construction Area', 'Professional Fee on Other Construction Area',
       'GST on Professional Fee']),
  (5, 'Land', array['Land Cost / Revenue', 'Stamp Duty & Registration', 'Rent Society', 'Rent Rehab',
       'Relocation / Brokerage Charges', 'Corpus Society', 'Corpus Rehab', 'Collector NOC', 'Coordinator Fee',
       'Other Commitment', 'PMC Fee', 'DM Consideration Cost', 'Encroachment', 'Infra Other than Site']),
  (6, 'Liaisoning', array['SRA & MCGM Cost', 'TDR / Fungible / Additional FSI', 'PAP Cost', 'PTC Cost', 'Title Fee',
       'Other Commitment', 'Infra / Service Cost', 'Infra (Contingency)']),
  (7, 'Finance', array['Interest Cost (Incl. Loan Process Fee)', 'GST on DR Transfer / Unsold Inventory',
       'GST on Existing Member / Society', 'Bank Guarantee Commission & Security', 'Refund to Customer',
       'Redemption Premium', 'GST Discount Given to Customer', 'GST on Coordinator Fee / Area',
       'GST on Redevelopment Slum', 'ITC Reversal on Account of Post OC Commercial Sale', 'GST on MCGM Commitment',
       'GST on TDR', 'GST on Other Commitment'])
) as c(sort, category, subs)
cross join lateral unnest(c.subs) with ordinality as s(subcategory, ord);

-- Users come from the Chandak Workspace user master (auth.users, see budget_workspace_users below).
-- Who can do what is set up here, in the budget module: rights (fixed list), roles (a set of rights,
-- created by the administrator), and members (a workspace user with one role, optionally limited to
-- some projects and some departments).
create table public.budget_permissions (
  code text primary key,
  area text not null,
  label text not null,
  sort int not null
);
insert into public.budget_permissions (code, area, label, sort) values
  ('project.view',     'Projects',  'See projects, budgets and reports', 1),
  ('project.create',   'Projects',  'Create projects', 2),
  ('project.setup',    'Projects',  'Maintain towers, areas, cost heads and GST rules', 3),
  ('version.open',     'Versions',  'Open a new budget version', 10),
  ('version.approve',  'Versions',  'Approve versions they prepared', 11),
  ('version.override', 'Versions',  'Edit, approve or delete versions prepared by others', 12),
  ('budget.edit',      'Budget',    'Type budget figures and remarks in a draft', 20),
  ('budget.import',    'Budget',    'Import a detail budget workbook', 21),
  ('cost.enter',       'Cost',      'Record and delete cost incurred', 30),
  ('cost.import',      'Cost',      'Import a cost incurred sheet', 31),
  ('report.export',    'Reports',   'Export reports to Excel', 40),
  ('audit.view',       'Reports',   'See the change history', 41),
  ('fields.manage',    'Settings',  'Add, change and remove custom fields and forms', 50),
  ('access.manage',    'Settings',  'Manage roles, rights and members', 51);

create table public.budget_roles (
  id bigint generated always as identity primary key,
  name text not null unique,
  description text,
  is_system boolean not null default false,   -- the Administrator role cannot be deleted or reduced
  created_at timestamptz not null default now()
);
create table public.budget_role_permissions (
  role_id bigint not null references public.budget_roles on delete cascade,
  permission text not null references public.budget_permissions on delete cascade,
  primary key (role_id, permission)
);
insert into public.budget_roles (name, description, is_system) values
  ('Administrator', 'Everything, including roles, members and custom fields', true),
  ('Budget preparer', 'Opens, imports, edits and approves budget versions', false),
  ('Department user', 'Types and imports their own department''s budget lines and cost', false),
  ('Management', 'Reads every budget and report', false);
insert into public.budget_role_permissions (role_id, permission)
select r.id, p.code from public.budget_roles r cross join public.budget_permissions p
where r.name = 'Administrator'
   or (r.name = 'Budget preparer' and p.code not in ('fields.manage', 'access.manage', 'version.override'))
   or (r.name = 'Department user' and p.code in ('project.view', 'budget.edit', 'cost.enter', 'cost.import', 'report.export'))
   or (r.name = 'Management' and p.code in ('project.view', 'report.export', 'audit.view'));

create table public.budget_members (
  user_id uuid primary key references auth.users on delete cascade,
  role_id bigint not null references public.budget_roles,
  project_ids bigint[],      -- null: all projects
  department_ids bigint[],   -- null: all departments
  active boolean not null default true,
  added_by uuid default auth.uid(),
  added_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Budget versions, lines, cost incurred
-- ---------------------------------------------------------------------------

create table public.budget_versions (
  id bigint generated always as identity primary key,
  project_id bigint not null references public.budget_projects on delete cascade,
  number int not null,                      -- R1, R2, ...
  as_on date not null,
  status text not null default 'draft' check (status in ('draft', 'approved')),
  reason text,
  parent_id bigint references public.budget_versions,
  -- eng_area, design_area, total_carpet, commitments [{name, area}], sold_area, sale_value_cr,
  -- residential_area, commercial_area, retail_area, society_sale_area
  areas jsonb not null default '{}',
  category_reasons jsonb not null default '{}',
  prepared_by uuid default auth.uid() references auth.users,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid references auth.users,
  unique (project_id, number)
);
create unique index budget_one_draft_per_project on public.budget_versions (project_id) where status = 'draft';

create table public.budget_lines (
  id bigint generated always as identity primary key,
  version_id bigint not null references public.budget_versions on delete cascade,
  cost_head_id bigint not null references public.budget_cost_heads,
  subproject_id bigint references public.budget_subprojects,
  initial_paise bigint check (initial_paise >= 0),   -- (a); null on a tax head = calculate
  ctc_paise bigint check (ctc_paise >= 0),           -- (b); null on a tax head = calculate
  incurred_override_paise bigint,                    -- replaces (c) when set
  remark text,
  updated_by uuid default auth.uid(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (version_id, cost_head_id, subproject_id)
);
create index on public.budget_lines (version_id);

create table public.budget_incurred_entries (
  id bigint generated always as identity primary key,
  project_id bigint not null references public.budget_projects on delete cascade,
  cost_head_id bigint not null references public.budget_cost_heads,
  subproject_id bigint references public.budget_subprojects,
  month date not null check (extract(day from month) = 1),
  amount_paise bigint not null,
  reference text,
  entered_by uuid default auth.uid() references auth.users,
  created_at timestamptz not null default now()
);
create index on public.budget_incurred_entries (project_id, cost_head_id, month);

create table public.budget_comments (
  id bigint generated always as identity primary key,
  version_id bigint not null references public.budget_versions on delete cascade,
  line_id bigint references public.budget_lines on delete cascade,
  user_id uuid default auth.uid() references auth.users,
  body text not null,
  created_at timestamptz not null default now()
);

create table public.budget_audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  user_id uuid,
  table_name text not null,
  row_id bigint,
  action text not null,
  old_row jsonb,
  new_row jsonb
);

-- ---------------------------------------------------------------------------
-- Integrity: approved versions are locked; lines and entries stay inside their project
-- ---------------------------------------------------------------------------

create function public.budget_guard_line() returns trigger
language plpgsql as $$
declare
  v record;
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
    new.updated_at := now();
    new.updated_by := coalesce(auth.uid(), new.updated_by);
  end if;
  return coalesce(new, old);
end $$;

create trigger budget_guard_line before insert or update or delete on public.budget_lines
for each row execute function public.budget_guard_line();

create function public.budget_guard_version() returns trigger
language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    if old.status = 'approved' then
      raise exception 'An approved version cannot be deleted';
    end if;
    return old;
  end if;
  if old.status = 'approved' then
    raise exception 'Version R% is approved and locked', old.number;
  end if;
  return new;
end $$;

create trigger budget_guard_version before update or delete on public.budget_versions
for each row execute function public.budget_guard_version();

create function public.budget_guard_entry() returns trigger
language plpgsql as $$
begin
  if not exists (select 1 from public.budget_cost_heads h where h.id = new.cost_head_id and h.project_id = new.project_id) then
    raise exception 'Cost head % does not belong to this project', new.cost_head_id;
  end if;
  if new.subproject_id is not null and not exists (
    select 1 from public.budget_subprojects s where s.id = new.subproject_id and s.project_id = new.project_id) then
    raise exception 'Tower % does not belong to this project', new.subproject_id;
  end if;
  return new;
end $$;

create trigger budget_guard_entry before insert or update on public.budget_incurred_entries
for each row execute function public.budget_guard_entry();

create function public.budget_audit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.budget_audit_log (user_id, table_name, row_id, action, old_row, new_row)
  values (auth.uid(), tg_table_name, coalesce(new.id, old.id), lower(tg_op),
          case when tg_op <> 'INSERT' then to_jsonb(old) end,
          case when tg_op <> 'DELETE' then to_jsonb(new) end);
  return coalesce(new, old);
end $$;

create trigger budget_audit after insert or update or delete on public.budget_lines
for each row execute function public.budget_audit();
create trigger budget_audit after insert or update or delete on public.budget_incurred_entries
for each row execute function public.budget_audit();
create trigger budget_audit after insert or update or delete on public.budget_versions
for each row execute function public.budget_audit();
create trigger budget_audit after insert or update or delete on public.budget_cost_heads
for each row execute function public.budget_audit();

-- ---------------------------------------------------------------------------
-- Calculations
-- ---------------------------------------------------------------------------

-- One row per budget line with Initial (a), Estimated CTC (b), Cost Incurred (c) and the
-- calculated columns of the detail format.
--   Cost incurred = sum of incurred entries up to the version's as-on month (or the override).
--   Tax head      = base x rate% x share%, the base being the same measure of its tax_base heads.
create view public.budget_line_figures with (security_invoker = true) as
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
  select l.id as line_id, l.version_id, l.cost_head_id, l.subproject_id, l.remark, h.is_tax,
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
  f.remark
from fig f
join public.budget_versions v on v.id = f.version_id
join public.budget_cost_heads h on h.id = f.cost_head_id
join public.budget_departments d on d.id = h.department_id
left join public.budget_subprojects s on s.id = f.subproject_id;

-- Totals helper: the same calculated columns for any group of lines.
create view public.budget_department_totals with (security_invoker = true) as
select version_id, department_id, department, summary_category, department_sort,
  sum(initial_paise) as initial_paise, sum(ctc_paise) as ctc_paise, sum(incurred_paise) as incurred_paise,
  round(sum(initial_paise) / 1e9, 6) as initial_cr,
  round(sum(ctc_paise) / 1e9, 6) as ctc_cr,
  round(sum(incurred_paise) / 1e9, 6) as incurred_cr,
  round(sum(balance_paise) / 1e9, 6) as balance_cr,
  round(sum(variance_paise) / 1e9, 6) as variance_cr,
  round(sum(incurred_paise) * 100.0 / nullif(sum(ctc_paise), 0), 2) as util_pct
from public.budget_line_figures
group by version_id, department_id, department, summary_category, department_sort;

create view public.budget_version_totals with (security_invoker = true) as
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
left join public.budget_line_figures f on f.version_id = v.id
group by v.id;

-- Summary format, sub-category rows: every template row (zero when empty) plus any extra row in use.
create view public.budget_summary_rows with (security_invoker = true) as
with used as (
  select version_id, summary_category as category, summary_subcategory as subcategory,
         sum(ctc_paise) as ctc_paise, sum(incurred_paise) as incurred_paise
  from public.budget_line_figures group by 1, 2, 3
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

-- Summary format, category rows: Budget (Estimated CTC), Incurred and Balance per category.
create view public.budget_category_totals with (security_invoker = true) as
select version_id, category, min(category_sort) as category_sort,
  sum(amount_paise) as budget_paise, sum(incurred_paise) as incurred_paise,
  round(sum(amount_paise) / 1e9, 6) as budget_cr,
  round(sum(incurred_paise) / 1e9, 6) as incurred_cr,
  round((sum(amount_paise) - sum(incurred_paise)) / 1e9, 6) as balance_cr
from public.budget_summary_rows
group by version_id, category;

-- Area particulars: E = A - commitments, sold and available area.
create view public.budget_version_areas with (security_invoker = true) as
select v.id as version_id,
  (v.areas ->> 'total_carpet')::numeric as total_carpet,
  coalesce((select sum((c ->> 'area')::numeric) from jsonb_array_elements(coalesce(v.areas -> 'commitments', '[]')) c), 0) as commitments,
  (v.areas ->> 'total_carpet')::numeric
    - coalesce((select sum((c ->> 'area')::numeric) from jsonb_array_elements(coalesce(v.areas -> 'commitments', '[]')) c), 0) as net_sale_carpet,
  (v.areas ->> 'sold_area')::numeric as sold_area,
  (v.areas ->> 'eng_area')::numeric as eng_area,
  (v.areas ->> 'design_area')::numeric as design_area,
  (v.areas ->> 'sale_value_cr')::numeric as sale_value_cr
from public.budget_versions v;

-- Line-by-line comparison of two versions of a project.
create function public.budget_compare(p_from bigint, p_to bigint)
returns table (
  department text, category text, sub_category text, subproject text,
  from_initial_cr numeric, to_initial_cr numeric, from_ctc_cr numeric, to_ctc_cr numeric,
  ctc_change_cr numeric, ctc_change_pct numeric, to_remark text, change text
)
language sql stable security invoker as $$
  with a as (select * from public.budget_line_figures where version_id = p_from),
       b as (select * from public.budget_line_figures where version_id = p_to)
  select coalesce(b.department, a.department), coalesce(b.category, a.category),
         coalesce(b.sub_category, a.sub_category), coalesce(b.subproject, a.subproject),
         a.initial_cr, b.initial_cr, a.ctc_cr, b.ctc_cr,
         round((coalesce(b.ctc_paise, 0) - coalesce(a.ctc_paise, 0)) / 1e9, 6),
         round((coalesce(b.ctc_paise, 0) - coalesce(a.ctc_paise, 0)) * 100.0 / nullif(a.ctc_paise, 0), 2),
         b.remark,
         case when a.line_id is null then 'added' when b.line_id is null then 'removed'
              when a.ctc_paise <> b.ctc_paise or a.initial_paise <> b.initial_paise then 'changed' else 'same' end
  from a full join b on a.cost_head_id = b.cost_head_id and a.subproject_id is not distinct from b.subproject_id
  order by coalesce(b.department_sort, a.department_sort), coalesce(b.cost_head_sort, a.cost_head_sort)
$$;

-- Cost incurred by summary category and month / quarter / financial year (FY from the project).
create function public.budget_incurred_by_period(p_project bigint, p_grain text default 'month')
returns table (category text, period text, period_start date, amount_cr numeric)
language sql stable security invoker as $$
  with e as (
    select d.summary_category as category, i.month, i.amount_paise, p.fy_start_month as fy
    from public.budget_incurred_entries i
    join public.budget_projects p on p.id = i.project_id
    join public.budget_cost_heads h on h.id = i.cost_head_id
    join public.budget_departments d on d.id = h.department_id
    where i.project_id = p_project
  ),
  k as (
    select category, amount_paise,
      (extract(year from month)::int - case when extract(month from month)::int < fy then 1 else 0 end) as fy_year,
      ((extract(month from month)::int - fy + 12) % 12) / 3 + 1 as quarter,
      month, fy
    from e
  )
  select category,
    case p_grain
      when 'year' then 'FY' || fy_year || '-' || right((fy_year + 1)::text, 2)
      when 'quarter' then 'FY' || fy_year || '-' || right((fy_year + 1)::text, 2) || ' Q' || quarter
      else to_char(month, 'YYYY-MM') end,
    min(case p_grain
      when 'year' then make_date(fy_year, fy, 1)
      when 'quarter' then (make_date(fy_year, fy, 1) + make_interval(months => (quarter - 1) * 3))::date
      else month end),
    round(sum(amount_paise) / 1e9, 6)
  from k
  group by 1, 2
  order by 3, 1
$$;

-- ---------------------------------------------------------------------------
-- Access (Row Level Security)
-- ---------------------------------------------------------------------------

-- The workspace user master. Point this view at the table where Chandak Workspace keeps its users
-- if names are not in auth.users metadata (for example public.profiles); keep the column names.
create view public.budget_workspace_users as
select u.id as user_id, u.email::text as email,
       coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', u.email)::text as full_name
from auth.users u;
revoke all on public.budget_workspace_users from anon, authenticated;

-- Does the signed-in member have this right? With a project, the member's project list must include it
-- (or be unlimited); without one, the right must not be limited to some projects. Same for departments.
create function public.budget_has(p_permission text, p_project bigint default null, p_department bigint default null)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.budget_members m
    join public.budget_role_permissions rp on rp.role_id = m.role_id and rp.permission = p_permission
    where m.user_id = auth.uid() and m.active
      and (m.project_ids is null or (p_project is not null and p_project = any (m.project_ids)))
      and (p_department is null or m.department_ids is null or p_department = any (m.department_ids)))
$$;

create function public.budget_is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.budget_members where user_id = auth.uid() and active)
$$;

-- Project of a version, for the policies on lines.
create function public.budget_version_project(p_version bigint) returns bigint
language sql stable security definer set search_path = public as $$
  select project_id from public.budget_versions where id = p_version
$$;

-- Budget lines: the right to edit budget figures, for that project and the cost head's department.
create function public.budget_can_edit(p_cost_head bigint) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select public.budget_has('budget.edit', h.project_id, h.department_id)
                   from public.budget_cost_heads h where h.id = p_cost_head), false)
$$;

-- Cost incurred: the right to record cost, for that project and the cost head's department.
create function public.budget_can_enter_cost(p_cost_head bigint) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select public.budget_has('cost.enter', h.project_id, h.department_id)
                   from public.budget_cost_heads h where h.id = p_cost_head), false)
$$;

-- The signed-in user's access, for the screens: role, rights, limits and name.
create function public.budget_my_access() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'user_id', m.user_id, 'role', r.name, 'role_id', r.id,
    'permissions', coalesce((select jsonb_agg(permission order by permission) from public.budget_role_permissions where role_id = r.id), '[]'),
    'project_ids', m.project_ids, 'department_ids', m.department_ids,
    'name', w.full_name, 'email', w.email)
  from public.budget_members m
  join public.budget_roles r on r.id = m.role_id
  left join public.budget_workspace_users w on w.user_id = m.user_id
  where m.user_id = auth.uid() and m.active
$$;

-- Names of members, for "prepared by" and "entered by".
create function public.budget_member_names() returns table (user_id uuid, name text)
language sql stable security definer set search_path = public as $$
  select m.user_id, coalesce(w.full_name, w.email, 'Member') from public.budget_members m
  left join public.budget_workspace_users w on w.user_id = m.user_id
  where public.budget_is_member()
$$;

-- Workspace users, for adding members (administrators of access only).
create function public.budget_workspace_directory(p_search text default null)
returns table (user_id uuid, email text, full_name text, member boolean, role text, active boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.budget_has('access.manage') then
    raise exception 'You do not have the right to manage members';
  end if;
  return query
  select w.user_id, w.email, w.full_name, m.user_id is not null, r.name, m.active
  from public.budget_workspace_users w
  left join public.budget_members m on m.user_id = w.user_id
  left join public.budget_roles r on r.id = m.role_id
  where p_search is null or w.email ilike '%' || p_search || '%' or w.full_name ilike '%' || p_search || '%'
  order by m.user_id is null, w.full_name
  limit 200;
end $$;

-- Roles keep at least one active administrator, and the Administrator role keeps every right.
create function public.budget_guard_access() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'budget_role_permissions' then
    if exists (select 1 from public.budget_roles where id = old.role_id and is_system) then
      raise exception 'The Administrator role keeps every right';
    end if;
    return old;
  end if;
  if tg_table_name = 'budget_roles' then
    if old.is_system then
      raise exception 'The Administrator role cannot be deleted';
    end if;
    return old;
  end if;
  if not exists (
    select 1 from public.budget_members m join public.budget_roles r on r.id = m.role_id
    where r.is_system and m.active and m.project_ids is null) and exists (select 1 from public.budget_members) then
    raise exception 'Keep at least one active Administrator with access to all projects';
  end if;
  return coalesce(new, old);
end $$;
create constraint trigger budget_guard_access after update or delete on public.budget_members
deferrable initially deferred for each row execute function public.budget_guard_access();
create trigger budget_guard_access before delete on public.budget_role_permissions
for each row execute function public.budget_guard_access();
create trigger budget_guard_access before delete on public.budget_roles
for each row execute function public.budget_guard_access();

alter table public.budget_departments enable row level security;
alter table public.budget_projects enable row level security;
alter table public.budget_subprojects enable row level security;
alter table public.budget_cost_heads enable row level security;
alter table public.budget_summary_template enable row level security;
alter table public.budget_permissions enable row level security;
alter table public.budget_roles enable row level security;
alter table public.budget_role_permissions enable row level security;
alter table public.budget_members enable row level security;
alter table public.budget_versions enable row level security;
alter table public.budget_lines enable row level security;
alter table public.budget_incurred_entries enable row level security;
alter table public.budget_comments enable row level security;
alter table public.budget_audit_log enable row level security;

-- Reading: masters for every member; project data for members who may see that project.
create policy read_members on public.budget_departments for select to authenticated using (public.budget_is_member());
create policy read_members on public.budget_summary_template for select to authenticated using (public.budget_is_member());
create policy read_members on public.budget_permissions for select to authenticated using (public.budget_is_member());
create policy read_members on public.budget_roles for select to authenticated using (public.budget_is_member());
create policy read_members on public.budget_role_permissions for select to authenticated using (public.budget_is_member());
create policy read_members on public.budget_members for select to authenticated using (public.budget_is_member());
create policy read_project on public.budget_projects for select to authenticated using (public.budget_has('project.view', id));
create policy read_project on public.budget_subprojects for select to authenticated using (public.budget_has('project.view', project_id));
create policy read_project on public.budget_cost_heads for select to authenticated using (public.budget_has('project.view', project_id));
create policy read_project on public.budget_versions for select to authenticated using (public.budget_has('project.view', project_id));
create policy read_project on public.budget_lines for select to authenticated using (public.budget_has('project.view', public.budget_version_project(version_id)));
create policy read_project on public.budget_incurred_entries for select to authenticated using (public.budget_has('project.view', project_id));
create policy read_project on public.budget_comments for select to authenticated using (public.budget_has('project.view', public.budget_version_project(version_id)));
create policy read_audit on public.budget_audit_log for select to authenticated using (public.budget_has('audit.view'));

-- Access settings.
create policy manage_access on public.budget_roles for all to authenticated
  using (public.budget_has('access.manage')) with check (public.budget_has('access.manage'));
create policy manage_access on public.budget_role_permissions for all to authenticated
  using (public.budget_has('access.manage')) with check (public.budget_has('access.manage'));
create policy manage_access on public.budget_members for all to authenticated
  using (public.budget_has('access.manage')) with check (public.budget_has('access.manage'));

-- Set-up: departments are shared by all projects; the rest belongs to one project.
create policy setup_write on public.budget_departments for all to authenticated
  using (public.budget_has('project.setup')) with check (public.budget_has('project.setup'));
create policy setup_write on public.budget_projects for update to authenticated
  using (public.budget_has('project.setup', id)) with check (public.budget_has('project.setup', id));
create policy setup_write on public.budget_subprojects for all to authenticated
  using (public.budget_has('project.setup', project_id)) with check (public.budget_has('project.setup', project_id));
create policy setup_write on public.budget_cost_heads for all to authenticated
  using (public.budget_has('project.setup', project_id)) with check (public.budget_has('project.setup', project_id));

-- Versions: opened and approved through the functions below; a draft is changed by its preparer
-- (or someone with the override right).
create policy edit_draft on public.budget_versions for update to authenticated
  using (status = 'draft' and ((prepared_by = auth.uid() and public.budget_has('version.open', project_id)) or public.budget_has('version.override', project_id)))
  with check (status = 'draft');
create policy delete_draft on public.budget_versions for delete to authenticated
  using (status = 'draft' and ((prepared_by = auth.uid() and public.budget_has('version.open', project_id)) or public.budget_has('version.override', project_id)));

create policy edit_lines on public.budget_lines for all to authenticated
  using (public.budget_can_edit(cost_head_id)) with check (public.budget_can_edit(cost_head_id));

create policy edit_entries on public.budget_incurred_entries for all to authenticated
  using (public.budget_can_enter_cost(cost_head_id)) with check (public.budget_can_enter_cost(cost_head_id));

create policy add_comment on public.budget_comments for insert to authenticated
  with check (public.budget_has('project.view', public.budget_version_project(version_id)) and user_id = auth.uid());
create policy delete_own_comment on public.budget_comments for delete to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Workflow
-- ---------------------------------------------------------------------------

-- Open the next version (for the next quarter or year) as a copy of the latest approved one.
create function public.budget_create_version(p_project bigint, p_as_on date, p_reason text default null, p_source bigint default null)
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
    insert into public.budget_lines (version_id, cost_head_id, subproject_id, initial_paise, ctc_paise, incurred_override_paise, remark)
    select new_id, cost_head_id, subproject_id, initial_paise, ctc_paise, incurred_override_paise, remark
    from public.budget_lines where version_id = src.id;
  end if;
  return new_id;
end $$;

-- Lines whose Estimated CTC moved more than p_threshold_pct from the previous version with no remark.
create function public.budget_changes_needing_remark(p_version bigint, p_threshold_pct numeric default 10)
returns table (line_id bigint, category text, sub_category text, change_pct numeric)
language sql stable security invoker as $$
  select b.line_id, b.category, b.sub_category,
         round(abs(b.ctc_paise - coalesce(a.ctc_paise, 0)) * 100.0 / nullif(coalesce(a.ctc_paise, 0), 0), 2)
  from public.budget_line_figures b
  join public.budget_versions v on v.id = b.version_id
  left join public.budget_line_figures a
    on a.version_id = v.parent_id and a.cost_head_id = b.cost_head_id and a.subproject_id is not distinct from b.subproject_id
  where b.version_id = p_version
    and not b.ctc_calculated
    and b.ctc_paise <> coalesce(a.ctc_paise, 0)
    and (a.ctc_paise is null or a.ctc_paise = 0 or abs(b.ctc_paise - a.ctc_paise) * 100.0 / a.ctc_paise > p_threshold_pct)
    and coalesce(trim(b.remark), '') = ''
$$;

-- The person who prepared the version approves it; it is then locked.
create function public.budget_approve_version(p_version bigint)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v public.budget_versions;
  missing text;
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
  update public.budget_versions set status = 'approved', approved_at = now(), approved_by = auth.uid() where id = p_version;
end $$;

revoke execute on function public.budget_create_version(bigint, date, text, bigint) from public, anon;
revoke execute on function public.budget_approve_version(bigint) from public, anon;
grant execute on function public.budget_create_version(bigint, date, text, bigint) to authenticated;
grant execute on function public.budget_approve_version(bigint) to authenticated;

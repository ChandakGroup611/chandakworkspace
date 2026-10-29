-- Organization Budget: fixes found by running one full budget cycle through the screens.
--   * A memo item no longer counts in the base of a GST head (it is outside every total, so its GST was wrong).
--   * The first version of a project needs no "reason for the change" remarks: there is nothing to compare it with.
-- Replaces one view and one function with the same columns and signature. Runs after 20261028121000.

-- Same as before, except the "plain" lines that feed GST bases leave out memo items.
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
  where not h.is_tax and not l.is_memo          -- a memo item is outside every total, so it is no GST base either
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

-- Same as before, except a version without a previous version (the first one) needs no remarks.
create or replace function public.budget_changes_needing_remark(p_version bigint, p_threshold_pct numeric default 10)
returns table (line_id bigint, category text, sub_category text, change_pct numeric)
language sql stable security invoker as $$
  select b.line_id, b.category, b.sub_category,
         round(abs(b.ctc_paise - coalesce(a.ctc_paise, 0)) * 100.0 / nullif(coalesce(a.ctc_paise, 0), 0), 2)
  from public.budget_line_figures b
  join public.budget_versions v on v.id = b.version_id
  left join public.budget_line_figures a
    on a.version_id = v.parent_id and a.cost_head_id = b.cost_head_id and a.subproject_id is not distinct from b.subproject_id
  where b.version_id = p_version
    and v.parent_id is not null
    and not b.ctc_calculated
    and b.ctc_paise <> coalesce(a.ctc_paise, 0)
    and (a.ctc_paise is null or a.ctc_paise = 0 or abs(b.ctc_paise - a.ctc_paise) * 100.0 / a.ctc_paise > p_threshold_pct)
    and coalesce(trim(b.remark), '') = ''
$$;

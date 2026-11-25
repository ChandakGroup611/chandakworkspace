import Link from "next/link";
import * as D from "@/lib/budget/data";
import { nextQuarterEnd } from "@/lib/budget/format";
import { BudgetWizard, type WizLine } from "./budget-wizard";
import { Notice } from "./shell";
import { type Ctx, getTemplate } from "./views";
import type { WizardGst } from "@/lib/budget/wizard-actions";

// Create budget: the guided form with every workbook input, filled from the open draft, or from the latest
// approved version when saving will open the next one (the same copy "Start R…" makes).

const cr = (paise: number | null | undefined) => (paise == null ? "" : String(+(Number(paise) / 1e9).toFixed(9)));
const s = (v: unknown) => (v == null ? "" : String(v));

export async function CreateBudget(c: Ctx, mode: "create" | "edit" = "create") {
  const { sb, me, project, versions } = c;
  const pid = project.id;
  const realOpen = versions.find((v) => v.status !== "approved") ?? null;
  const lastApp = versions.filter((v) => v.status === "approved").pop() ?? null;
  const nextNo = Math.max(0, ...versions.map((v) => v.number)) + 1;
  if (mode === "edit") {
    // Edit budget always changes the open draft; an approved or signed-off version is opened read-only on its page.
    if (!realOpen) return <Notice kind="locked">{lastApp ? <>R{lastApp.number} is approved and locked, so it cannot be edited. <Link href={`/budget/${pid}/view?v=${lastApp.number}`}>Open R{lastApp.number}</Link>{D.can(me, "version.open", pid) && <> or <Link href={`/budget/${pid}/create`}>start revision R{nextNo}</Link> from its figures</>}.</> : <>This project has no budget yet. <Link href={`/budget/${pid}/create`}>Create R1</Link>.</>}</Notice>;
    if (realOpen.status === "in_review") return <Notice kind="draft">R{realOpen.number} is under sign-off, so its figures are locked. <Link href={`/budget/${pid}/view?v=${realOpen.number}`}>Open R{realOpen.number}</Link> and use Take back to change it.</Notice>;
    if (!D.canChangeDraft(me, realOpen)) return <Notice>Only the person who prepared R{realOpen.number} (or an administrator) edits the whole budget. {D.can(me, "budget.edit", pid) ? <>You can change your department&apos;s lines on the <Link href={`/budget/${pid}/entry?v=${realOpen.number}&mode=form`}>budget sheet</Link>.</> : null}</Notice>;
  } else {
    if (realOpen?.status === "in_review") return <Notice kind="draft">R{realOpen.number} is under sign-off, so a new revision cannot be started yet. <Link href={`/budget/${pid}/view?v=${realOpen.number}`}>Open R{realOpen.number}</Link>.</Notice>;
    if (realOpen) return <Notice>Draft R{realOpen.number} is already open. <Link href={`/budget/${pid}/view?v=${realOpen.number}`}>Open it</Link>{D.can(me, "budget.edit", pid) ? <> or type your lines on the <Link href={`/budget/${pid}/entry?v=${realOpen.number}&mode=form`}>budget sheet</Link></> : null}.</Notice>;
    if (!D.can(me, "version.open", pid)) return <Notice>The budget preparer or an administrator creates the budget here.</Notice>;
  }
  const open = mode === "edit" ? realOpen : null;
  const base = versions.filter((v) => v.status === "approved").pop() ?? null;
  const source = open ?? base;
  const [depts, towers, heads, template] = await Promise.all([D.getDepartments(sb), D.getTowers(sb, pid), D.getHeads(sb, pid), getTemplate(sb)]);
  const [figs, rawLines, prevFigs] = await Promise.all([
    source ? D.getLineFigures(sb, source.id) : Promise.resolve([] as D.LineFigure[]),
    source ? D.getLines(sb, source.id) : Promise.resolve([] as D.Line[]),
    open?.parent_id ? D.getLineFigures(sb, open.parent_id) : !open && base ? D.getLineFigures(sb, base.id) : Promise.resolve([] as D.LineFigure[]),
  ]);
  const gstRules = ((await sb.from("budget_gst_rules").select("id, name, rate_pct, share_pct").eq("active", true).order("sort").order("name")).data ?? [])
    .map((r) => ({ id: Number(r.id), name: String(r.name), rate: Number(r.rate_pct), share: Number(r.share_pct) }));
  const raw = new Map(rawLines.map((l) => [l.id, l]));
  const headById = new Map(heads.map((h) => [h.id, h]));
  const towerName = new Map(towers.map((t) => [t.id, t.name]));
  const prevCtc = new Map(prevFigs.map((f) => [`${f.cost_head_id}|${f.subproject_id ?? ""}`, Number(f.ctc_cr)]));
  const sorted = figs.slice().sort((a, b) => a.department_sort - b.department_sort || a.cost_head_sort - b.cost_head_sort);

  const lines: WizLine[] = sorted.filter((f) => !f.is_tax).map((f) => {
    const r = raw.get(f.line_id);
    const rate = f.ctc_rule === "rate";
    return {
      key: `l${f.line_id}`, headId: f.cost_head_id, departmentId: f.department_id, category: f.category, subCategory: f.sub_category ?? "",
      summary: headById.get(f.cost_head_id)?.summary_subcategory ?? null, tower: f.subproject_id ? towerName.get(f.subproject_id) ?? "" : "",
      method: rate ? "rate" : "amount", initial: cr(r?.initial_paise ?? f.initial_paise), ctc: rate ? "" : cr(f.ctc_paise),
      rate: rate ? s(f.ctc_rate) : "", basis: f.ctc_basis ?? "eng_area", incurred: null, remark: f.remark ?? "",
      prevCtc: prevCtc.get(`${f.cost_head_id}|${f.subproject_id ?? ""}`) ?? null, incurredNow: Number(f.incurred_cr) || 0,
    };
  });
  // cost heads without a line yet (a new project, or heads copied from another project): start at zero
  const withLine = new Set(figs.map((f) => f.cost_head_id));
  for (const h of heads.filter((x) => !x.is_tax && x.active && !withLine.has(x.id))) lines.push({
    key: `h${h.id}`, headId: h.id, departmentId: h.department_id, category: h.category, subCategory: h.sub_category ?? "", summary: h.summary_subcategory,
    tower: "", method: "amount", initial: "", ctc: "", rate: "", basis: "eng_area", incurred: null, remark: "", prevCtc: null, incurredNow: 0,
  });
  const keysOfHead = (id: number) => lines.filter((l) => l.headId === id).map((l) => l.key);
  const gstHeads = heads.filter((h) => h.is_tax && h.active);
  const gst: WizardGst[] = gstHeads.map((h) => {
    const f = figs.find((x) => x.cost_head_id === h.id && x.subproject_id == null);
    const r = f ? raw.get(f.line_id) : undefined;
    return {
      key: `g${h.id}`, headId: h.id, departmentId: h.department_id, category: h.category, subCategory: h.sub_category ?? "", summary: h.summary_subcategory,
      rate: s(h.tax_rate_pct), share: s(h.tax_share_pct ?? 100), base: h.tax_base.flatMap(keysOfHead),
      initial: r?.initial_paise == null ? "" : cr(r.initial_paise), ctc: r?.ctc_paise == null ? "" : cr(r.ctc_paise), remark: f?.remark ?? "",
    };
  });

  const a = (source?.areas ?? {}) as Record<string, unknown>;
  const areas: Record<string, string> = {};
  for (const k of ["total_carpet", "sold_area", "eng_area", "design_area", "sale_value_cr", "residential_area", "commercial_area", "retail_area", "society_sale_area"]) areas[k] = s(a[k]);
  const commitments = ((a.commitments as { name: string; area: number }[] | undefined) ?? []).map((x) => ({ name: x.name, area: s(x.area) }));
  const summaryOptions: Record<string, string[]> = {};
  for (const t of template) (summaryOptions[t.category] ??= []).push(t.subcategory);
  const next = Math.max(0, ...versions.map((v) => v.number)) + 1;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <section className="panel guide-head">
        <div>
          <h2>
            {open
              ? `Edit ${open.number === 1 ? "Original Baseline Budget" : `Revision ${open.number - 1}`} · R${open.number} draft`
              : next === 1
              ? "Create Original Baseline Budget (R1)"
              : `Create Revision ${next - 1} (R${next})`}
          </h2>
          <p className="sub">
            {open
              ? "Every part of the budget on one page: change what you need and press Save changes. Totals update as you type."
              : next === 1
              ? "Establishes the initial baseline budget for this project against which all future revisions, actual costs, and variances will be tracked."
              : `Starts from the figures of approved R${base?.number}; change only what moved.`}
          </p>
        </div>
        <div className="actions-group">
          {open && <Link className="btn-action" href={`/budget/${pid}/view?v=${open.number}`}>← Back to budget</Link>}
          {open && <Link className="btn-action" href={`/budget/${pid}/entry?v=${open.number}`}>Budget sheet</Link>}
          <Link className="btn-action" href={`/budget/${pid}/import${open ? `?v=${open.number}` : ""}`}>Import Excel instead</Link>
        </div>
      </section>
      {lines.some((l) => l.headId && figs.find((f) => `l${f.line_id}` === l.key)?.ctc_rule === "balance") &&
        <Notice>Lines set as &quot;balance of a total&quot; are shown with their current CTC; saving here keeps that amount as a typed CTC.</Notice>}
      <BudgetWizard
        projectId={pid} projectName={project.name} draftNumber={open?.number ?? null} nextNumber={next} baseNumber={open ? versions.find((v) => v.id === open.parent_id)?.number ?? null : base?.number ?? null}
        asOn={open ? open.as_on : nextQuarterEnd(base?.as_on ?? today)} reason={open ? open.reason ?? "" : base ? "" : "First budget"}
        areas={areas} commitments={commitments}
        towers={towers.map((t) => ({ id: t.id, name: t.name, type: t.type ?? "", carpet_area: s(t.carpet_area), eng_area: s(t.eng_area), oc_date: t.oc_date ?? "" }))}
        departments={depts.map((d) => ({ id: d.id, name: d.name, summary_category: d.summary_category }))}
        lines={lines} gst={gst} deptRemarks={Object.fromEntries(Object.entries(source?.department_remarks ?? {}).map(([k, v]) => [k, String(v)]))}
        summaryOptions={summaryOptions} gstRules={gstRules}
        layout={open ? "sheet" : "steps"}
      />
    </>
  );
}

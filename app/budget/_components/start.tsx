import Link from "next/link";
import * as D from "@/lib/budget/data";
import type { Version } from "@/lib/budget/data";
import { BUILDING_TYPES, dmy, fmt, fmtArea, nextQuarterEnd } from "@/lib/budget/format";
import * as F from "./forms";
import { AddTowerForm, LinesGrid } from "./manual";
import { VersionBanner } from "./shell";
import { type Ctx, getTemplate, headFormData } from "./views";

// Get started: the whole manual budget cycle for one project on one page, in order, with what is done,
// what is next, and the form for each step. Nothing here needs an Excel file.

interface Step {
  key: string; title: string; done: boolean; optional?: boolean; summary: string;
  body: React.ReactNode; action?: { href: string; label: string };
}

export async function GetStarted(c: Ctx) {
  const { sb, me, project, versions } = c;
  const pid = project.id;
  const canSetup = D.can(me, "project.setup", pid);
  const canEdit = D.can(me, "budget.edit", pid);
  const canOpen = D.can(me, "version.open", pid);
  const canCost = D.can(me, "cost.enter", pid);
  const [towers, heads, entries, template, totals, levels] = await Promise.all([
    D.getTowers(sb, pid), D.getHeads(sb, pid), D.getEntries(sb, pid), getTemplate(sb), D.getTotals(sb, pid), D.getSignoffLevels(sb),
  ]);
  const draft = versions.find((v) => v.status === "draft") ?? null;
  const open = versions.find((v) => v.status !== "approved") ?? null;
  const work: Version | null = open ?? versions[versions.length - 1] ?? null;
  const workTotals = work ? totals.find((t) => t.version_id === work.id) : undefined;
  const approved = versions.some((v) => v.status === "approved");
  const plain = heads.filter((h) => !h.is_tax), tax = heads.filter((h) => h.is_tax);
  const form = canSetup ? await headFormData(sb, heads, template) : null;
  const zeroLines = work ? (await D.getLineFigures(sb, work.id)).filter((f) => !f.is_tax && !f.is_memo && Number(f.ctc_paise) === 0).length : 0;
  const chain = D.chainOf(levels, pid);
  const q = work ? `?v=${work.number}` : "";
  const href = (t: string, extra = "") => `/budget/${pid}/${t}${q}${extra ? (q ? "&" : "?") + extra : ""}`;
  const typesSet = towers.filter((t) => t.type).length;

  const steps: Step[] = [
    {
      key: "towers", title: "Towers and areas", optional: true, done: towers.length > 0,
      summary: towers.length ? `${towers.length} tower(s), ${typesSet} with a building type` : "No towers yet. Skip this if the project is not split by building.",
      action: { href: `/budget/${pid}/setup${q}${q ? "&" : "?"}section=towers`, label: "Edit towers" },
      body: <>
        {towers.length > 0 && <div className="scroll"><table><thead><tr><th>Tower</th><th>Building type</th><th className="n">Carpet (sft)</th><th className="n">Construction (sft)</th><th>OC date</th></tr></thead><tbody>
          {towers.map((t) => <tr key={t.id}><td>{t.name}</td><td>{t.type ?? <span className="chip warn">not set</span>}</td><td className="n">{fmtArea(t.carpet_area)}</td><td className="n">{fmtArea(t.eng_area)}</td><td>{dmy(t.oc_date)}</td></tr>)}
        </tbody></table></div>}
        {canSetup ? <AddTowerForm projectId={pid} count={towers.length} /> : <p className="note">The budget preparer adds towers.</p>}
        <p className="note">Building types: {BUILDING_TYPES.join(", ")}.</p>
      </>,
    },
    {
      key: "lines", title: "Budget lines (cost heads)", done: plain.length > 0,
      summary: plain.length ? `${plain.length} line(s) in ${new Set(plain.map((h) => h.department_id)).size} department(s)` : "No budget lines yet: add the cost heads this project will spend on.",
      action: { href: `/budget/${pid}/setup${q}${q ? "&" : "?"}section=heads`, label: "All cost heads" },
      body: canSetup && form ? <>
        <p className="sub">Type one row per line. Pick a department, then use <b>Fill suggestions</b> for its usual lines. {draft ? `Amounts you type go straight into draft R${draft.number}.` : "Amounts can be typed now or after R1 is opened."}</p>
        <LinesGrid projectId={pid} departments={form.depts} towers={towers.map((t) => ({ id: t.id, label: t.name }))} summaryOptions={form.options} draftNumber={draft?.number ?? null} startRows={plain.length ? 3 : 5} />
      </> : <p className="note">The budget preparer adds budget lines.</p>,
    },
    {
      key: "gst", title: "GST lines", optional: true, done: tax.length > 0,
      summary: tax.length ? `${tax.length} GST line(s), worked out from their base lines` : "Optional: a GST line is calculated as base × GST % × eligible share.",
      body: canSetup && form ? <>
        <p className="sub">Tick <b>This is a GST / Tax line</b>, choose the rate (or a preset from Administration → Common masters) and the lines it is charged on.</p>
        <F.AddHeadForm projectId={pid} departments={form.depts} baseOptions={form.baseOptions} summaryOptions={form.options} gstRules={form.gstRules} />
      </> : <p className="note">The budget preparer adds GST lines.</p>,
    },
    {
      key: "version", title: "Open version R1", done: versions.length > 0,
      summary: versions.length ? `R${work!.number} as on ${dmy(work!.as_on)} is ${work!.status.replace("_", " ")}` : "A version holds the figures as on a date; R1 is the first budget.",
      action: versions.length && draft ? { href: href("setup", "section=towers"), label: "Areas of this version" } : undefined,
      body: versions.length ? <p className="sub">{draft ? <>Set the project areas of R{draft.number} (carpet, sold, construction area) under <Link href={href("setup", "section=towers")}>Towers &amp; areas</Link>; PSF figures use them.</> : "Versions are listed on the Overview."}</p>
        : canOpen ? <F.OpenVersionForm projectId={pid} defaultDate={nextQuarterEnd(new Date().toISOString().slice(0, 10))} first />
        : <p className="note">The budget preparer opens the first version.</p>,
    },
    {
      key: "figures", title: "Type Initial budget and Estimated CTC", done: !!workTotals && workTotals.ctc_cr > 0 && zeroLines === 0,
      summary: !work ? "After R1 is opened." : workTotals && workTotals.ctc_cr > 0
        ? `CTC ${fmt(workTotals.ctc_cr)} Cr · Initial ${fmt(workTotals.initial_cr)} Cr${zeroLines ? ` · ${zeroLines} line(s) still at 0` : ""}`
        : "No figures yet.",
      action: work && draft ? { href: href("entry", "mode=form"), label: "Enter line by line" } : undefined,
      body: !work ? <p className="sub">Open R1 first.</p> : draft && canEdit ? <>
        <p className="sub">Two ways, same figures: <b>line by line</b> walks you through each line with Save &amp; next; the <b>budget sheet</b> shows every line in one table.</p>
        <div className="actions-group">
          <Link className="btn-action primary" href={href("entry", "mode=form")}>Enter line by line</Link>
          <Link className="btn-action" href={href("entry")}>Open budget sheet</Link>
          <Link className="btn-action" href={href("schedules")}>Schedules (workings)</Link>
        </div>
      </> : <p className="sub">R{work.number} is {work.status.replace("_", " ")}; figures are locked. {approved && canOpen && !open ? <Link href={href("entry") + "#manual-entry"}>Start the next version</Link> : null}</p>,
    },
    {
      key: "cost", title: "Record cost incurred", optional: true, done: entries.length > 0,
      summary: entries.length ? `${entries.length} cost entr${entries.length === 1 ? "y" : "ies"} recorded` : "Bills, POs or vouchers against each line, by month.",
      action: { href: href("incurred"), label: "Open Actuals" },
      body: canCost ? <>
        <p className="sub">Record a single amount against a line, or a vendor bill split over several lines and towers. The version counts every entry up to its as-on month.</p>
        <div className="actions-group">
          <Link className="btn-action primary" href={href("incurred") + "#record-cost"}>Record cost</Link>
          <Link className="btn-action" href={href("incurred") + "#record-bill"}>Record a bill</Link>
        </div>
      </> : <p className="note">Departments record their own cost.</p>,
    },
    {
      key: "signoff", title: "Send for sign-off and approve", done: approved,
      summary: approved ? "Approved: the figures are locked and the reports are final." : open?.status === "in_review" ? `R${open.number} is waiting for signatures` : chain.length ? `${chain.length} sign-off level(s): ${chain.map((l) => l.title).join(" → ")}` : "No sign-off chain: the preparer approves directly.",
      action: { href: `/budget/${pid}/setup${q}${q ? "&" : "?"}section=signoff`, label: "Sign-off chain" },
      body: open ? <>
        <p className="sub">When the figures are complete, send R{open.number} from the bar below. Lines whose CTC moved more than 10% need a remark first.</p>
        <VersionBanner sb={sb} me={me} project={project} version={open} names={c.names} />
      </> : <p className="sub">{approved ? <Link href={href("summary")}>Read the Summary report</Link> : "Open R1 first."}</p>,
    },
  ];

  const required = steps.filter((s) => !s.optional);
  const doneCount = steps.filter((s) => s.done).length;
  const next = steps.find((s) => !s.done && !s.optional) ?? steps.find((s) => !s.done) ?? null;
  return (
    <>
      <section className="panel guide-head">
        <div>
          <h2>Get started · {project.name}</h2>
          <p className="sub">Build the budget by typing it in, step by step. Every step is also on its own screen; this page shows what is done and what comes next.</p>
        </div>
        <div className="guide-progress" aria-label={`${doneCount} of ${steps.length} steps done`}>
          <span className="bar"><i style={{ width: `${(doneCount / steps.length) * 100}%` }} /></span>
          <b>{required.filter((s) => s.done).length} of {required.length}</b> required steps done
        </div>
      </section>
      <ol className="guide-steps">
        {steps.map((s, i) => (
          <li key={s.key} className={`guide-step ${s.done ? "done" : next?.key === s.key ? "current" : ""}`}>
            <details open={next?.key === s.key}>
              <summary>
                <span className="step-badge" aria-hidden>{s.done ? "✓" : i + 1}</span>
                <span className="step-text"><b>{s.title}</b>{s.optional && <span className="chip">optional</span>}<small>{s.summary}</small></span>
                {s.done ? <span className="chip ok">Done</span> : next?.key === s.key ? <span className="chip warn">Next</span> : null}
              </summary>
              <div className="step-body">
                {s.body}
                {s.action && <p><Link href={s.action.href}>{s.action.label} →</Link></p>}
              </div>
            </details>
          </li>
        ))}
      </ol>
      <p className="note">Have the figures in an Excel workbook already? <Link href={`/budget/${pid}/import${q}`}>Import it instead</Link>; imported and typed figures land in the same draft.</p>
    </>
  );
}

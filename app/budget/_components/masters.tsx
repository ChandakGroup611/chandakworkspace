"use client";

import { useState } from "react";
import * as M from "@/lib/budget/masters-actions";
import { useAction } from "./forms";

// Masters & setup → Masters: the lists shared by every project. Departments, the rows of the Project
// Budget Summary, and GST rules. The database refuses a delete that would orphan a cost head.

export interface SummaryRow { category: string; subcategory: string; category_sort: number; subcategory_sort: number }
export interface DepartmentRow { id: number; name: string; summary_category: string; sort: number; heads: number }
export interface GstRule { id: number; name: string; rate_pct: number; share_pct: number; sort: number; active: boolean }

const v = (id: string) => (document.getElementById(id) as HTMLInputElement | HTMLSelectElement).value;
const checked = (id: string) => (document.getElementById(id) as HTMLInputElement).checked;
const LOCKED = "Construction";

export function MastersSettings({ departments, summary, gst, editable }: {
  departments: DepartmentRow[]; summary: SummaryRow[]; gst: GstRule[]; editable: boolean;
}) {
  const categories = [...new Map(summary.map((r) => [r.category, r.category_sort])).entries()].sort((a, b) => a[1] - b[1]);
  return (
    <>
      {!editable && <div className="banner"><div>Read only. Changing masters needs the right to maintain towers, areas, cost heads and GST rules for all projects.</div></div>}
      <Departments rows={departments} categories={categories.map(([c]) => c)} editable={editable} />
      <SummaryRows rows={summary} categories={categories} editable={editable} />
      <GstRules rows={gst} editable={editable} />
    </>
  );
}

// ---------- departments ----------
function Departments({ rows, categories, editable }: { rows: DepartmentRow[]; categories: string[]; editable: boolean }) {
  const { pending, run, banner, setNotice } = useAction();
  const [confirm, setConfirm] = useState<number | null>(null);
  const next = (rows[rows.length - 1]?.sort ?? 0) + 1;
  const catSelect = (id: string, value?: string) => (
    <select id={id} defaultValue={value ?? categories[0]} disabled={!editable} aria-label="Summary category">
      {categories.map((c) => <option key={c}>{c}</option>)}
    </select>
  );
  return (
    <section className="panel">
      <div className="panel-head"><h2>Departments</h2><span className="sub">Shared by every project. Each department rolls into one category of the Project Budget Summary.</span></div>
      {banner}
      <div className="scroll"><table><thead><tr><th className="n">Order</th><th>Department</th><th>Summary category</th><th className="n">Cost heads</th>{editable && <th></th>}</tr></thead><tbody>
        {rows.map((d) => (
          <tr key={`${d.id}-${d.name}-${d.summary_category}-${d.sort}`}>
            <td className="n"><input type="number" className="amt" style={{ width: 60 }} id={`dp-sort-${d.id}`} defaultValue={d.sort} disabled={!editable} aria-label="Order" /></td>
            <td><input type="text" id={`dp-name-${d.id}`} defaultValue={d.name} disabled={!editable} aria-label="Department" /></td>
            <td>{catSelect(`dp-cat-${d.id}`, d.summary_category)}</td>
            <td className="n">{d.heads}</td>
            {editable && <td className="actions">
              <button disabled={pending} onClick={() => run(() => M.saveDepartment(d.id, { name: v(`dp-name-${d.id}`), summary_category: v(`dp-cat-${d.id}`), sort: v(`dp-sort-${d.id}`) }), () => setNotice(`${v(`dp-name-${d.id}`)} saved`))}>Save</button>{" "}
              <button className="link" disabled={pending || d.heads > 0} title={d.heads > 0 ? "Used by cost heads" : undefined}
                onClick={() => { if (confirm !== d.id) return setConfirm(d.id); run(() => M.deleteDepartment(d.id), () => setConfirm(null)); }}>{confirm === d.id ? "Click again to delete" : "Delete"}</button>
            </td>}
          </tr>
        ))}
        {editable && <tr key={`new-${rows.length}`}>
          <td className="n"><input type="number" className="amt" style={{ width: 60 }} id="dp-sort-new" defaultValue={next} aria-label="New department order" /></td>
          <td><input type="text" id="dp-name-new" placeholder="For example: Legal" aria-label="New department" /></td>
          <td>{catSelect("dp-cat-new")}</td>
          <td></td>
          <td><button className="primary" disabled={pending} onClick={() => run(() => M.saveDepartment(null, { name: v("dp-name-new"), summary_category: v("dp-cat-new"), sort: v("dp-sort-new") }),
            () => setNotice("Department added. Add its cost heads under Towers & set-up."))}>Add department</button></td>
        </tr>}
      </tbody></table></div>
    </section>
  );
}

// ---------- summary rows ----------
function SummaryRows({ rows, categories, editable }: { rows: SummaryRow[]; categories: [string, number][]; editable: boolean }) {
  const { pending, run, banner, setNotice } = useAction();
  const [confirm, setConfirm] = useState<string | null>(null);
  const key = (r: SummaryRow) => `${r.category}|${r.subcategory}`;
  const nextCat = (categories[categories.length - 1]?.[1] ?? 0) + 1;
  return (
    <section className="panel">
      <div className="panel-head"><h2>Summary rows</h2><span className="sub">Category and sub-category of the Project Budget Summary, in report order. Construction rows follow the tower building types and stay fixed.</span></div>
      {banner}
      {categories.map(([cat, cs]) => {
        const list = rows.filter((r) => r.category === cat).sort((a, b) => a.subcategory_sort - b.subcategory_sort);
        const locked = cat === LOCKED || !editable;
        const id = (s: string) => `sr-${cs}-${encodeURIComponent(cat)}-${s}`;
        const nextSub = (list[list.length - 1]?.subcategory_sort ?? 0) + 1;
        return (
          <details key={`${cat}-${cs}`} open={false}>
            <summary><b>{cs}. {cat}</b> <span className="sub">{list.length} rows</span></summary>
            {!locked && <div className="row" style={{ marginTop: 8 }}>
              <label>Category order<input type="number" id={id("cs")} defaultValue={cs} style={{ width: 70 }} /></label>
              <label style={{ minWidth: 220 }}>Category name<input type="text" id={id("cn")} defaultValue={cat} /></label>
              <button disabled={pending} onClick={() => run(() => M.renameSummaryCategory(cat, v(id("cn")), v(id("cs"))), () => setNotice("Category saved; its departments follow"))}>Save category</button>
            </div>}
            <div className="scroll"><table><thead><tr><th className="n">Order</th><th>Sub-category</th>{!locked && <th></th>}</tr></thead><tbody>
              {list.map((r, i) => {
                const k = key(r), rid = (s: string) => `${id("r")}-${i}-${s}`;
                return (
                  <tr key={`${k}-${r.subcategory_sort}`}>
                    <td className="n">{locked ? r.subcategory_sort : <input type="number" className="amt" style={{ width: 60 }} id={rid("o")} defaultValue={r.subcategory_sort} aria-label="Order" />}</td>
                    <td>{locked ? r.subcategory : <input type="text" id={rid("s")} defaultValue={r.subcategory} aria-label="Sub-category" style={{ minWidth: 280 }} />}</td>
                    {!locked && <td className="actions">
                      <button disabled={pending} onClick={() => run(() => M.saveSummaryRow(r, { category: cat, subcategory: v(rid("s")), category_sort: cs, subcategory_sort: v(rid("o")) }),
                        () => setNotice("Row saved; cost heads pointing at it follow the new name"))}>Save</button>{" "}
                      <button className="link" disabled={pending} onClick={() => { if (confirm !== k) return setConfirm(k); run(() => M.deleteSummaryRow(r.category, r.subcategory), () => setConfirm(null)); }}>
                        {confirm === k ? "Click again to delete" : "Delete"}</button>
                    </td>}
                  </tr>
                );
              })}
              {!locked && <tr key={`new-${list.length}`}>
                <td className="n"><input type="number" className="amt" style={{ width: 60 }} id={id("no")} defaultValue={nextSub} aria-label="New row order" /></td>
                <td><input type="text" id={id("ns")} placeholder="New sub-category" aria-label="New sub-category" style={{ minWidth: 280 }} /></td>
                <td><button disabled={pending} onClick={() => run(() => M.saveSummaryRow(null, { category: cat, subcategory: v(id("ns")), category_sort: cs, subcategory_sort: v(id("no")) }),
                  () => setNotice("Row added. Point cost heads at it under Towers & set-up → Cost heads → Summary row."))}>Add row</button></td>
              </tr>}
            </tbody></table></div>
          </details>
        );
      })}
      {editable && <>
        <h3>New summary category</h3>
        <div className="row">
          <label>Order<input type="number" id="sr-new-cs" defaultValue={nextCat} style={{ width: 70 }} /></label>
          <label style={{ minWidth: 200 }}>Category<input type="text" id="sr-new-c" placeholder="For example: Legal" /></label>
          <label style={{ minWidth: 240 }}>First sub-category<input type="text" id="sr-new-s" placeholder="For example: Court fees" /></label>
          <button className="primary" disabled={pending} onClick={() => run(() => M.saveSummaryRow(null, { category: v("sr-new-c"), subcategory: v("sr-new-s"), category_sort: v("sr-new-cs"), subcategory_sort: 1 }),
            () => setNotice("Category added. Departments can now roll into it."))}>Add category</button>
        </div>
      </>}
    </section>
  );
}

// ---------- GST rules ----------
function GstRules({ rows, editable }: { rows: GstRule[]; editable: boolean }) {
  const { pending, run, banner, setNotice } = useAction();
  const [confirm, setConfirm] = useState<number | null>(null);
  const next = (rows[rows.length - 1]?.sort ?? 0) + 1;
  const cells = (id: string, r?: GstRule) => <>
    <td className="n"><input type="number" className="amt" style={{ width: 60 }} id={`gr-sort-${id}`} defaultValue={r?.sort ?? next} disabled={!editable} aria-label="Order" /></td>
    <td><input type="text" id={`gr-name-${id}`} defaultValue={r?.name ?? ""} placeholder={r ? undefined : "For example: GST 12% x 100%"} disabled={!editable} aria-label="GST rule name" /></td>
    <td className="n"><input type="text" inputMode="decimal" className="amt" style={{ width: 70 }} id={`gr-rate-${id}`} defaultValue={r ? Number(r.rate_pct) : 18} disabled={!editable} aria-label="GST rate %" /></td>
    <td className="n"><input type="text" inputMode="decimal" className="amt" style={{ width: 70 }} id={`gr-share-${id}`} defaultValue={r ? Number(r.share_pct) : 100} disabled={!editable} aria-label="Eligible share %" /></td>
    <td><input type="checkbox" id={`gr-active-${id}`} defaultChecked={r?.active ?? true} disabled={!editable} aria-label="Active" /></td>
  </>;
  const read = (id: string) => ({ name: v(`gr-name-${id}`), rate: v(`gr-rate-${id}`), share: v(`gr-share-${id}`), sort: v(`gr-sort-${id}`), active: checked(`gr-active-${id}`) });
  return (
    <section className="panel">
      <div className="panel-head"><h2>GST rules</h2><span className="sub">GST type = rate % × eligible share %. Picked when adding a GST cost head; changing a rule here does not change heads already set up, so approved figures stay as they are.</span></div>
      {banner}
      <div className="scroll"><table><thead><tr><th className="n">Order</th><th>Name</th><th className="n">Rate %</th><th className="n">Eligible share %</th><th>Active</th>{editable && <th></th>}</tr></thead><tbody>
        {rows.map((r) => (
          <tr key={`${r.id}-${r.name}-${r.rate_pct}-${r.share_pct}-${r.sort}-${r.active}`}>
            {cells(String(r.id), r)}
            {editable && <td className="actions">
              <button disabled={pending} onClick={() => run(() => M.saveGstRule(r.id, read(String(r.id))), () => setNotice("GST rule saved"))}>Save</button>{" "}
              <button className="link" disabled={pending} onClick={() => { if (confirm !== r.id) return setConfirm(r.id); run(() => M.deleteGstRule(r.id), () => setConfirm(null)); }}>
                {confirm === r.id ? "Click again to delete" : "Delete"}</button>
            </td>}
          </tr>
        ))}
        {editable && <tr key={`new-${rows.length}`}>
          {cells("new")}
          <td><button className="primary" disabled={pending} onClick={() => run(() => M.saveGstRule(null, read("new")), () => setNotice("GST rule added"))}>Add GST rule</button></td>
        </tr>}
      </tbody></table></div>
    </section>
  );
}

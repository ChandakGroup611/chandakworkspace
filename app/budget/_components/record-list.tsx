"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import * as A from "@/lib/budget/actions";
import { useAction } from "./forms";

/**
 * One list-page standard for every budget record (budgets, bills, cost entries, masters):
 *   search box + filter dropdowns + count, a table, an Actions column, and a detail drawer
 *   that opens when a row is clicked. Rows are prepared on the server; cells, details and
 *   actions may be any React node (links, edit modals, delete buttons).
 */
export interface RecordColumn { label: string; className?: string }
export interface RecordFilter { key: string; label: string; options: [string, string][] }
export interface RecordRow {
  id: string;
  cells: React.ReactNode[];
  /** Lower-case text searched by the search box. */
  search: string;
  /** Value of each filter key for this row. */
  filters?: Record<string, string>;
  /** Drawer title and sub-title. */
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Label / value pairs shown in the drawer. */
  detail?: [string, React.ReactNode][];
  /** Extra block below the details (a small table, notes …). */
  extra?: React.ReactNode;
  /** Buttons shown in the row and in the drawer. */
  actions?: React.ReactNode;
  /** "Open" link: the full page of the record. */
  href?: string;
  hrefLabel?: string;
  tone?: "" | "warn" | "bad" | "good";
}

export function RecordList({
  columns, rows, filters = [], searchPlaceholder = "Search…", empty = "Nothing here yet.", toolbar, initialFilters, footer, highlight,
}: {
  columns: RecordColumn[]; rows: RecordRow[]; filters?: RecordFilter[]; searchPlaceholder?: string; empty?: React.ReactNode;
  toolbar?: React.ReactNode; initialFilters?: Record<string, string>; footer?: React.ReactNode; highlight?: string | null;
}) {
  const [q, setQ] = useState("");
  const [f, setF] = useState<Record<string, string>>(initialFilters ?? {});
  const [open, setOpen] = useState<string | null>(null);
  const shown = useMemo(() => rows.filter((r) => {
    if (q && !r.search.includes(q.trim().toLowerCase())) return false;
    for (const [k, v] of Object.entries(f)) if (v && (r.filters?.[k] ?? "") !== v) return false;
    return true;
  }), [rows, q, f]);
  const active = Object.values(f).filter(Boolean).length + (q ? 1 : 0);
  const current = rows.find((r) => r.id === open) ?? null;
  const hasActions = rows.some((r) => r.actions || r.href);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(null); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open]);

  return (
    <div className="rl">
      <div className="rl-toolbar">
        <div className="rl-search">
          <span aria-hidden>⌕</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={searchPlaceholder} aria-label="Search" />
        </div>
        {filters.map((fl) => (
          <label key={fl.key} className="rl-filter">
            <span>{fl.label}</span>
            <select value={f[fl.key] ?? ""} onChange={(e) => setF((x) => ({ ...x, [fl.key]: e.target.value }))}>
              <option value="">All</option>
              {fl.options.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
            </select>
          </label>
        ))}
        {active > 0 && <button type="button" className="btn-action" onClick={() => { setQ(""); setF({}); }}>Clear filters</button>}
        <span className="rl-count">Showing <b>{shown.length}</b> of {rows.length}</span>
        {toolbar && <div className="rl-tools">{toolbar}</div>}
      </div>

      <div className="scroll rl-table">
        <table>
          <thead><tr>
            {columns.map((c, i) => <th key={i} className={c.className}>{c.label}</th>)}
            {hasActions && <th className="actions-col">Actions</th>}
          </tr></thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id} className={`rl-row ${r.tone ? `tone-${r.tone}` : ""}`} data-highlight={highlight === r.id || undefined}
                tabIndex={0} onClick={(e) => { if (!e.currentTarget.contains(e.target as Node)) return; /* clicks inside a dialog portal opened from this row */ if ((e.target as HTMLElement).closest("a,button,input,select,textarea,label,[role=dialog]")) return; setOpen(r.id); }}
                onKeyDown={(e) => { if (e.key === "Enter" && e.target === e.currentTarget) setOpen(r.id); }}>
                {r.cells.map((c, i) => <td key={i} className={columns[i]?.className}>{c}</td>)}
                {hasActions && <td className="actions"><div className="actions-group">
                  <button type="button" className="btn-action" onClick={() => setOpen(r.id)}>View</button>
                  {r.actions}
                </div></td>}
              </tr>
            ))}
            {shown.length === 0 && <tr><td colSpan={columns.length + (hasActions ? 1 : 0)} className="rl-empty">{rows.length ? "No records match these filters." : empty}</td></tr>}
          </tbody>
          {footer && shown.length === rows.length && shown.length > 0 && <tfoot>{footer}</tfoot>}
        </table>
      </div>

      {current && (
        <div className="rl-overlay" onClick={() => setOpen(null)}>
          <aside className="rl-drawer" role="dialog" aria-modal="true" aria-label="Record details" onClick={(e) => e.stopPropagation()}>
            <header>
              <div>
                <h2>{current.title ?? current.cells[0]}</h2>
                {current.subtitle && <p className="sub">{current.subtitle}</p>}
              </div>
              <button type="button" className="rl-close" aria-label="Close" onClick={() => setOpen(null)}>×</button>
            </header>
            <dl className="rl-detail">
              {(current.detail ?? columns.map((c, i) => [c.label, current.cells[i]] as [string, React.ReactNode])).map(([k, v], i) => (
                <div key={i}><dt>{k}</dt><dd>{v === "" || v == null ? <span className="sub">—</span> : v}</dd></div>
              ))}
            </dl>
            {current.extra}
            <footer className="actions-group">
              {current.href && <Link href={current.href} className="btn-action primary">{current.hrefLabel ?? "Open"}</Link>}
              {current.actions}
            </footer>
          </aside>
        </div>
      )}
    </div>
  );
}

/** Delete a draft budget version (two clicks). Goes back to the list afterwards. */
export function DeleteDraftButton({ versionId, number, back }: { versionId: number; number: number; back: string }) {
  const { pending, run, banner } = useAction();
  const [confirm, setConfirm] = useState(false);
  const router = useRouter();
  return <>
    {confirm ? <span className="actions-group">
      <button type="button" className="btn-action danger" disabled={pending} onClick={() => run(() => A.deleteDraft(versionId), () => { router.push(back); router.refresh(); })}>{pending ? "Deleting…" : `Yes, delete R${number}`}</button>
      <button type="button" className="btn-action" onClick={() => setConfirm(false)}>Cancel</button>
    </span> : <button type="button" className="btn-action danger" onClick={() => setConfirm(true)}>Delete</button>}
    {banner}
  </>;
}

/** Delete an individual budget line from a draft version (two clicks). */
export function DeleteLineButton({ lineId, label, back }: { lineId: number; label?: string; back?: string }) {
  const { pending, run, banner } = useAction();
  const [confirm, setConfirm] = useState(false);
  const router = useRouter();
  return <>
    {confirm ? <span className="actions-group">
      <button
        type="button"
        className="btn-action danger"
        disabled={pending}
        onClick={() => run(() => A.removeLine(lineId), () => { if (back) router.push(back); router.refresh(); })}
      >
        {pending ? "Deleting…" : `Yes, delete${label ? ` ${label}` : ""}`}
      </button>
      <button type="button" className="btn-action" onClick={() => setConfirm(false)}>Cancel</button>
    </span> : <button type="button" className="btn-action danger" onClick={() => setConfirm(true)}>Delete</button>}
    {banner}
  </>;
}

/** Banner shown once after a save, with the next obvious step. Removes the ?saved flag from the URL. */
export function SavedBanner({ text, children }: { text: React.ReactNode; children?: React.ReactNode }) {
  const [shown, setShown] = useState(true);
  useEffect(() => {
    try {
      const u = new URL(window.location.href);
      if (u.searchParams.has("saved")) { u.searchParams.delete("saved"); window.history.replaceState(null, "", u.toString()); }
    } catch { }
  }, []);
  if (!shown) return null;
  return <div className="banner ok saved-banner" role="status"><div>{text}</div><div className="actions-group">{children}<button type="button" className="link" onClick={() => setShown(false)}>Dismiss</button></div></div>;
}

/**
 * Click-to-view for any existing table: wraps tables that already have their own Edit / Delete buttons
 * (the master lists) and shows the clicked row in the same detail drawer. Labels come from the table
 * header; the row's buttons are offered in the drawer and press the row's own button.
 */
export function TablePeek({ children }: { children: React.ReactNode }) {
  const [peek, setPeek] = useState<{ title: string; pairs: [string, string][]; buttons: { label: string; el: HTMLElement }[]; link: { label: string; href: string } | null } | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!peek) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setPeek(null); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [peek]);
  const onClick = (e: React.MouseEvent) => {
    const t = e.target as HTMLElement;
    if (!ref.current || !ref.current.contains(t)) return; // clicks inside dialogs (portals) are not ours
    if (t.closest("a,button,input,select,textarea,label,summary,[role=dialog]")) return;
    const tr = t.closest("tbody tr") as HTMLTableRowElement | null;
    if (!tr || tr.querySelector("td[colspan]") || tr.classList.contains("total")) return;
    const table = tr.closest("table");
    const heads = [...(table?.querySelectorAll("thead th") ?? [])].map((th) => (th as HTMLElement).innerText.trim());
    const cells = [...tr.children] as HTMLElement[];
    const pairs: [string, string][] = [];
    const found: { cell: HTMLElement | null } = { cell: null };
    cells.forEach((td, i) => {
      if (td.classList.contains("actions") || /^actions?$/i.test(heads[i] ?? "")) { found.cell = td; return; }
      const v = td.innerText.trim();
      pairs.push([heads[i] || `Field ${i + 1}`, v]);
    });
    const buttons = found.cell ? ([...found.cell.querySelectorAll("button")] as HTMLElement[]).map((el) => ({ label: el.innerText.trim(), el })).filter((b) => b.label) : [];
    const a = tr.querySelector("a[href]") as HTMLAnchorElement | null;
    setPeek({ title: pairs.find(([, v]) => v)?.[1] ?? "Details", pairs, buttons, link: a ? { label: `Open ${a.innerText.trim()}`, href: a.getAttribute("href")! } : null });
  };
  return (
    <div ref={ref} onClick={onClick} className="table-peek">
      {children}
      {peek && (
        <div className="rl-overlay" onClick={(e) => { e.stopPropagation(); setPeek(null); }}>
          <aside className="rl-drawer" role="dialog" aria-modal="true" aria-label="Record details" onClick={(e) => e.stopPropagation()}>
            <header><div><h2>{peek.title}</h2><p className="sub">Record details</p></div>
              <button type="button" className="rl-close" aria-label="Close" onClick={() => setPeek(null)}>×</button></header>
            <dl className="rl-detail">{peek.pairs.map(([k, v], i) => <div key={i}><dt>{k}</dt><dd>{v || <span className="sub">—</span>}</dd></div>)}</dl>
            <footer className="actions-group">
              {peek.link && <Link className="btn-action primary" href={peek.link.href}>{peek.link.label}</Link>}
              {peek.buttons.map((b, i) => <button key={i} type="button" className={`btn-action${/delete|remove/i.test(b.label) ? " danger" : ""}`} onClick={() => { const el = b.el; setPeek(null); setTimeout(() => el.click(), 0); }}>{b.label}</button>)}
            </footer>
          </aside>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import type { CustomField } from "@/lib/budget/data";
import { fmt, fmtPct, isNeg } from "@/lib/budget/format";
import { fieldTitle } from "@/lib/budget/fields";
import { type Cell, CustomInput, type Picks } from "./custom-fields";
import {
  type EntryRow,
  type RuleState,
  AmountInput,
  RemarkInput,
  DeptRemarkInput,
  LineRuleCell,
  Bar,
  Neg,
  useAction,
} from "./forms";
import { EditLineModal } from "./crud-modals";
import * as A from "@/lib/budget/actions";
import {
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  Layers,
  ChevronRight,
  Maximize2,
  Minimize2,
} from "lucide-react";

export interface DepartmentGroup {
  department_id: number;
  sr: number;
  department: string;
  totals: {
    initial_cr: number;
    ctc_cr: number;
    incurred_cr: number;
    balance_cr: number;
    variance_cr: number;
    util_pct: number | null;
    psf_ctc: number | null;
  };
  deptRemark?: {
    versionId: number;
    departmentId: number;
    text: string;
    editable: boolean;
  };
  rows: EntryRow[];
}

export function DepartmentAccordionEntry({
  departments,
  memoRows = [],
  total,
  customFields = [],
  picks,
  versionId,
}: {
  departments: DepartmentGroup[];
  memoRows?: EntryRow[];
  total: EntryRow;
  customFields?: CustomField[];
  picks?: Picks;
  versionId: number;
}) {
  const [search, setSearch] = useState("");
  // Start with all departments expanded by default, or user can collapse all
  const [openDepts, setOpenDepts] = useState<Set<number>>(
    () => new Set(departments.map((d) => d.department_id))
  );
  const [memoOpen, setMemoOpen] = useState(false);
  const { run } = useAction();

  const toggleDept = (deptId: number) => {
    setOpenDepts((prev) => {
      const next = new Set(prev);
      if (next.has(deptId)) next.delete(deptId);
      else next.add(deptId);
      return next;
    });
  };

  const expandAll = () => {
    setOpenDepts(new Set(departments.map((d) => d.department_id)));
    setMemoOpen(true);
  };

  const collapseAll = () => {
    setOpenDepts(new Set());
    setMemoOpen(false);
  };

  // Filter departments and rows by search query
  const filteredDepartments = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return departments;

    return departments
      .map((d) => {
        const matchingRows = d.rows.filter((r) => {
          const matchLabel = r.label.toLowerCase().includes(q);
          const matchTower = r.tower?.toLowerCase().includes(q);
          const matchNote = r.note?.toLowerCase().includes(q);
          const matchRemark = r.line?.remark?.toLowerCase().includes(q);
          return matchLabel || matchTower || matchNote || matchRemark;
        });

        if (d.department.toLowerCase().includes(q) || matchingRows.length > 0) {
          return {
            ...d,
            rows: matchingRows.length > 0 ? matchingRows : d.rows,
          };
        }
        return null;
      })
      .filter(Boolean) as DepartmentGroup[];
  }, [departments, search]);

  // When search query is active, auto-expand matching departments
  React.useEffect(() => {
    if (search.trim()) {
      setOpenDepts(new Set(filteredDepartments.map((d) => d.department_id)));
    }
  }, [search, filteredDepartments]);

  return (
    <div className="dept-accordion-list">
      {/* 1. Global Controls & Search Bar */}
      <div className="list-toolbar">
        <div className="list-search-box">
          <Search className="h-4 w-4 text-muted" />
          <input
            type="text"
            className="list-search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search cost heads, categories, towers, remarks..."
          />
          {search && (
            <button
              type="button"
              className="text-xs text-muted hover:text-ink px-1"
              onClick={() => setSearch("")}
            >
              Clear
            </button>
          )}
        </div>

        <div className="list-actions">
          <span className="text-xs text-muted">
            {filteredDepartments.length} of {departments.length} departments
          </span>
          <button
            type="button"
            className="btn-action"
            title="Expand all department sections"
            onClick={expandAll}
          >
            <Maximize2 className="h-3.5 w-3.5 inline mr-1" />
            Expand All
          </button>
          <button
            type="button"
            className="btn-action"
            title="Collapse all department sections"
            onClick={collapseAll}
          >
            <Minimize2 className="h-3.5 w-3.5 inline mr-1" />
            Collapse All
          </button>
        </div>
      </div>

      {/* 2. Executive Total Summary Strip */}
      <div className="master-kpi-strip">
        <div className="master-kpi-tile">
          <span className="kpi-label">Initial Budget</span>
          <span className="kpi-val">₹{fmt(total.initial_cr)} Cr</span>
          <span className="kpi-sub">Original base estimate</span>
        </div>
        <div className="master-kpi-tile">
          <span className="kpi-label">Estimated CTC</span>
          <span className="kpi-val">₹{fmt(total.ctc_cr)} Cr</span>
          <span className="kpi-sub">Approved / current ceiling</span>
        </div>
        <div className="master-kpi-tile">
          <span className="kpi-label">Incurred Actuals</span>
          <span className="kpi-val">₹{fmt(total.incurred_cr)} Cr</span>
          <span className="kpi-sub">Booked & approved bills</span>
        </div>
        <div className="master-kpi-tile">
          <span className="kpi-label">Balance Headroom</span>
          <span className="kpi-val">
            <Neg v={total.balance_cr} /> Cr
          </span>
          <span className="kpi-sub">Remaining spending power</span>
        </div>
        <div className="master-kpi-tile">
          <span className="kpi-label">Net Variance</span>
          <span className="kpi-val">
            <Neg v={total.variance_cr} /> Cr
          </span>
          <span className="kpi-sub">Initial vs. Estimated CTC</span>
        </div>
        <div className="master-kpi-tile">
          <span className="kpi-label">Budget Utilised</span>
          <span className="kpi-val">
            {total.util_pct != null ? `${fmtPct(total.util_pct)}%` : "0%"}
          </span>
          <div className="mt-1">
            <Bar v={total.util_pct} />
          </div>
        </div>
      </div>

      {/* 3. Department Accordion Cards */}
      {filteredDepartments.map((d) => {
        const isOpen = openDepts.has(d.department_id);
        const lineCount = d.rows.filter((r) => r.kind === "line").length;

        return (
          <div key={d.department_id} className="dept-accordion-card">
            {/* Accordion Header */}
            <div
              className="dept-accordion-header"
              onClick={() => toggleDept(d.department_id)}
            >
              <div className="dept-header-left">
                <span className="text-muted">
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </span>
                <span className="dept-header-title">
                  {d.sr}. {d.department}
                </span>
                <span className="chip text-xs">
                  {lineCount} {lineCount === 1 ? "line" : "lines"}
                </span>
              </div>

              <div className="dept-header-stats">
                <div className="dept-stat-pill">
                  <span>CTC:</span>
                  <b>₹{fmt(d.totals.ctc_cr)} Cr</b>
                </div>
                <div className="dept-stat-pill">
                  <span>Incurred:</span>
                  <b>₹{fmt(d.totals.incurred_cr)} Cr</b>
                </div>
                <div className="dept-stat-pill">
                  <span>Balance:</span>
                  <b>
                    <Neg v={d.totals.balance_cr} /> Cr
                  </b>
                </div>
                <div className="dept-stat-pill">
                  <span>Variance:</span>
                  <b>
                    <Neg v={d.totals.variance_cr} /> Cr
                  </b>
                </div>
                {d.totals.util_pct != null && (
                  <div className="dept-stat-pill" style={{ minWidth: 90 }}>
                    <Bar v={d.totals.util_pct} />
                  </div>
                )}
              </div>
            </div>

            {/* Accordion Body */}
            {isOpen && (
              <div className="dept-accordion-body">
                <div className="scroll">
                  <table>
                    <thead>
                      <tr>
                        <th className="label">Cost Head</th>
                        <th className="n">Initial (a)</th>
                        <th className="n">CTC (b)</th>
                        <th className="n">Incurred (c)</th>
                        <th className="n">Balance (b−c)</th>
                        <th className="n">Variance (a−b)</th>
                        <th className="n">Utilised</th>
                        <th className="n">PSF on CTC</th>
                        <th className="label-sm">Remark</th>
                        {customFields.map((f) => (
                          <th
                            key={f.id}
                            className={
                              f.field_type === "formula" ||
                              [
                                "number",
                                "integer",
                                "amount_cr",
                                "amount_inr",
                                "percent",
                              ].includes(f.field_type)
                                ? "n cf"
                                : "cf"
                            }
                            title={fieldTitle(f)}
                          >
                            {f.label}
                            {f.required && " *"}
                          </th>
                        ))}
                        <th>Source</th>
                        <th className="actions-col">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.rows.map((r) => {
                        const l = r.line;
                        if (r.kind === "cat") {
                          return (
                            <tr key={r.key} className="cat">
                              <td colSpan={11 + customFields.length}>
                                <strong>{r.label}</strong>
                              </td>
                            </tr>
                          );
                        }

                        const cls = l?.needsRemark ? "flag" : "";
                        return (
                          <tr
                            key={r.key}
                            className={cls}
                            data-head={r.kind === "line" ? r.label : undefined}
                          >
                            <td
                              className={
                                r.indent === 2
                                  ? "indent2"
                                  : r.indent === 1
                                  ? "indent"
                                  : ""
                              }
                            >
                              <span className="font-medium">{r.label}</span>
                              {r.tower && (
                                <span className="chip ml-1.5">{r.tower}</span>
                              )}
                              {l?.taxRule && (
                                <span className="chip ml-1.5">{l.taxRule}</span>
                              )}
                              {r.note && <div className="note">{r.note}</div>}
                            </td>

                            {/* Initial */}
                            <td className="n">
                              {l?.editable ? (
                                <AmountInput
                                  line={l}
                                  field="initial"
                                  shown={r.initial_cr}
                                />
                              ) : (
                                <>
                                  {fmt(r.initial_cr)}
                                  {l?.isTax && l.initialCalc && (
                                    <span className="chip">auto</span>
                                  )}
                                </>
                              )}
                            </td>

                            {/* CTC */}
                            <td className="n">
                              {l?.editable &&
                              (l.rule.kind === "typed" ||
                                l.rule.kind === "tax" ||
                                l.rule.kind === "memo") ? (
                                <AmountInput
                                  line={l}
                                  field="ctc"
                                  shown={r.ctc_cr}
                                />
                              ) : (
                                <>
                                  <span
                                    className={isNeg(r.ctc_cr) ? "neg" : ""}
                                  >
                                    {fmt(r.ctc_cr)}
                                  </span>
                                  {l?.isTax && l.ctcCalc && (
                                    <span className="chip">auto</span>
                                  )}
                                  {l &&
                                    (l.rule.kind === "rate" ||
                                      l.rule.kind === "balance" ||
                                      l.rule.kind === "schedule") && (
                                      <span
                                        className="chip ml-1"
                                        title={l.rule.label}
                                      >
                                        {l.rule.kind}
                                      </span>
                                    )}
                                </>
                              )}
                            </td>

                            {/* Incurred */}
                            <td className="n">
                              {fmt(r.incurred_cr)}
                              {l?.incurredAuto && (
                                <span className="chip">auto</span>
                              )}
                              {l?.overBudget && (
                                <span
                                  className="chip bad"
                                  title="Cost incurred is above Estimated CTC"
                                >
                                  over
                                </span>
                              )}
                            </td>

                            {/* Balance */}
                            <td className="n">
                              <Neg v={r.balance_cr} />
                            </td>

                            {/* Variance */}
                            <td className="n">
                              <Neg v={r.variance_cr} />
                            </td>

                            {/* Utilised */}
                            <td className="n">
                              <Bar v={r.util_pct} />
                            </td>

                            {/* PSF */}
                            <td className="n">{fmt(r.psf_ctc)}</td>

                            {/* Remark */}
                            <td>
                              {l?.editable ? (
                                <RemarkInput line={l} />
                              ) : (
                                l?.remark
                              )}
                              {l?.needsRemark && (
                                <span className="chip warn">
                                  remark needed
                                </span>
                              )}
                            </td>

                            {/* Custom Fields */}
                            {customFields.map((f) => (
                              <td
                                key={f.id}
                                className={
                                  f.field_type === "formula" ||
                                  [
                                    "number",
                                    "integer",
                                    "amount_cr",
                                    "amount_inr",
                                    "percent",
                                  ].includes(f.field_type)
                                    ? "n"
                                    : ""
                                }
                              >
                                {l && (
                                  <CustomInput
                                    field={f}
                                    entity="line"
                                    entityId={l.id}
                                    cell={l.custom?.[f.key]}
                                    editable={l.editable}
                                    picks={picks}
                                    compact
                                  />
                                )}
                              </td>
                            ))}

                            {/* Source / Rule */}
                            <td>
                              {l &&
                                (l.isTax && l.initialCalc && l.ctcCalc ? (
                                  <span
                                    className="chip"
                                    title="Calculated by GST rule"
                                  >
                                    Calc
                                  </span>
                                ) : l.source === "excel" ? (
                                  <span
                                    className="chip xl"
                                    title="Last set by Excel import"
                                  >
                                    Excel
                                  </span>
                                ) : (
                                  <span
                                    className="chip typed"
                                    title="Directly typed"
                                  >
                                    Typed
                                  </span>
                                ))}
                              {l && !l.isTax && (
                                <LineRuleCell
                                  lineId={l.id}
                                  rule={l.rule}
                                  editable={l.editable}
                                />
                              )}
                            </td>

                            {/* Actions */}
                            <td className="actions">
                              <div className="actions-group">
                                {l && (
                                  <EditLineModal
                                    line={{
                                      id: l.id,
                                      title: r.label,
                                      department: d.department,
                                      tower: r.tower,
                                      initial_cr: r.initial_cr,
                                      ctc_cr: r.ctc_cr,
                                      remark: l.remark,
                                      ruleKind:
                                        l.rule.kind === "tax"
                                          ? "typed"
                                          : l.rule.kind,
                                      rate: l.rule.rate,
                                      basis: l.rule.basis,
                                      totalCr: l.rule.totalCr,
                                      scope: l.rule.scope,
                                      isTax: l.isTax,
                                      editable: l.editable,
                                    }}
                                  />
                                )}
                                {l?.href && (
                                  <Link
                                    href={l.href}
                                    className="btn-action"
                                    title="View line history"
                                  >
                                    View
                                  </Link>
                                )}
                                {l?.removable && (
                                  <button
                                    type="button"
                                    className="btn-action danger"
                                    onClick={() => run(() => A.removeLine(l.id))}
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                      {/* Department Subtotal Row */}
                      <tr className="total bg-sunken/40">
                        <td>
                          <strong>{d.department} Subtotal</strong>
                        </td>
                        <td className="n">{fmt(d.totals.initial_cr)}</td>
                        <td className="n">{fmt(d.totals.ctc_cr)}</td>
                        <td className="n">{fmt(d.totals.incurred_cr)}</td>
                        <td className="n">
                          <Neg v={d.totals.balance_cr} />
                        </td>
                        <td className="n">
                          <Neg v={d.totals.variance_cr} />
                        </td>
                        <td className="n">
                          <Bar v={d.totals.util_pct} />
                        </td>
                        <td className="n">{fmt(d.totals.psf_ctc)}</td>
                        <td>
                          {d.deptRemark && <DeptRemarkInput d={d.deptRemark} />}
                        </td>
                        {customFields.map((f) => (
                          <td key={f.id}></td>
                        ))}
                        <td></td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* 4. Memo Items Accordion (if any) */}
      {memoRows.length > 0 && (
        <div className="dept-accordion-card">
          <div
            className="dept-accordion-header"
            onClick={() => setMemoOpen(!memoOpen)}
          >
            <div className="dept-header-left">
              <span className="text-muted">
                {memoOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </span>
              <span className="dept-header-title">
                Memo Items · Outside Every Total
              </span>
              <span className="chip text-xs">{memoRows.length} items</span>
            </div>
          </div>

          {memoOpen && (
            <div className="dept-accordion-body">
              <div className="scroll">
                <table>
                  <thead>
                    <tr>
                      <th className="label">Cost Head</th>
                      <th className="n">Initial (Cr)</th>
                      <th className="n">CTC (Cr)</th>
                      <th className="n">Incurred (Cr)</th>
                      <th className="label-sm">Remark</th>
                      <th className="actions-col">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {memoRows.map((r) => (
                      <tr key={r.key}>
                        <td>
                          {r.label}
                          {r.tower && (
                            <span className="chip ml-1.5">{r.tower}</span>
                          )}
                        </td>
                        <td className="n">{fmt(r.initial_cr)}</td>
                        <td className="n">{fmt(r.ctc_cr)}</td>
                        <td className="n">{fmt(r.incurred_cr)}</td>
                        <td>{r.line?.remark}</td>
                        <td className="actions">
                          {r.line?.href && (
                            <Link href={r.line.href} className="btn-action">
                              View
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import * as A from "@/lib/budget/actions";
import type { CustomField, Entity } from "@/lib/budget/data";
import { fieldTitle } from "@/lib/budget/fields";
import { useAction } from "./forms";

// Custom fields on the budget screens. Every value is checked and saved by the database
// (budget_set_custom_values), so a typed value is stored exactly like an imported one; a refusal is
// shown next to the box. Formula fields are read only: the server calculates them.

export interface Cell { text: string; raw: unknown; error: string | null }
export type Picks = Partial<Record<"user" | "department" | "tower", [string, string][]>>;

const inputValue = (f: CustomField, raw: unknown) => {
  if (raw == null) return "";
  if (f.field_type === "month") return String(raw).slice(0, 7);
  if (f.field_type === "yes_no") return raw ? "Yes" : "No";
  if (Array.isArray(raw)) return raw.join(", ");
  return String(raw);
};
const typeAttr = (t: string) => (t === "date" ? "date" : t === "month" ? "month" : t === "email" ? "email" : t === "url" ? "url" : t === "phone" ? "tel" : "text");
const numeric = (t: string) => ["number", "integer", "amount_cr", "amount_inr", "percent"].includes(t);


/** One custom value: a box for typing (saved when you leave it), or the value as text. */
export function CustomInput({ field: f, entity, entityId, cell, editable, picks, compact }: {
  field: CustomField; entity: Entity; entityId: number; cell?: Cell; editable: boolean; picks?: Picks; compact?: boolean;
}) {
  const { pending, run, banner } = useAction();
  const c = cell ?? { text: "", raw: null, error: null };
  if (f.field_type === "formula") {
    return c.error ? <span className="chip bad" title={c.error}>Error</span> : <span title={`= ${f.formula}`}>{c.text}</span>;
  }
  if (!editable || f.input_source === "excel") return <span title={f.input_source === "excel" && editable ? "Filled by the Excel import" : undefined}>{c.text}</span>;
  const now = inputValue(f, c.raw);
  const save = (v: unknown) => run(() => A.setCustomValues(entity, entityId, { [f.key]: v }));
  const label = f.label;
  const key = `${entityId}-${f.key}-${JSON.stringify(c.raw)}`;
  let box: React.ReactNode;
  if (f.field_type === "yes_no" || f.field_type === "dropdown" || f.field_type === "user" || f.field_type === "department" || f.field_type === "tower") {
    const opts: [string, string][] = f.field_type === "yes_no" ? [["Yes", "Yes"], ["No", "No"]]
      : f.field_type === "dropdown" ? (f.options.choices ?? []).map((x) => [x, x]) : picks?.[f.field_type] ?? [];
    box = (
      <select key={key} aria-label={label} defaultValue={now} disabled={pending} onChange={(e) => save(e.currentTarget.value)}>
        <option value="">{f.required ? "Choose…" : "—"}</option>
        {now && !opts.some(([v]) => v === now) && <option value={now}>{c.text || now}</option>}
        {opts.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
      </select>
    );
  } else if (f.field_type === "multi_select") {
    const chosen = new Set(Array.isArray(c.raw) ? (c.raw as string[]) : []);
    box = (
      <details className="multi" key={key}>
        <summary aria-label={label}>{c.text || "Choose…"}</summary>
        {(f.options.choices ?? []).map((x) => (
          <label key={x}><input type="checkbox" defaultChecked={chosen.has(x)} disabled={pending} onChange={(e) => {
            const next = new Set(chosen);
            if (e.currentTarget.checked) next.add(x); else next.delete(x);
            save((f.options.choices ?? []).filter((y) => next.has(y)));
          }} /> {x}</label>
        ))}
      </details>
    );
  } else if (f.field_type === "long_text" && !compact) {
    box = <textarea key={key} aria-label={label} rows={2} defaultValue={now} onBlur={(e) => e.currentTarget.value.trim() !== now && save(e.currentTarget.value)} />;
  } else {
    box = (
      <input key={key} aria-label={label} type={typeAttr(f.field_type)} className={numeric(f.field_type) ? "amt" : compact ? "rem" : undefined}
        inputMode={numeric(f.field_type) ? "decimal" : undefined} defaultValue={now} placeholder={f.options.unit ?? undefined}
        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
        onBlur={(e) => { if (e.currentTarget.value.trim() !== now) save(e.currentTarget.value); }} />
    );
  }
  return <>{box}{banner}</>;
}

/** All custom fields of one record (version, project), grouped by section. */
export function CustomFieldsForm({ fields, sections, entity, entityId, cells, editable, picks }: {
  fields: CustomField[]; sections: [string, number[]][]; entity: Entity; entityId: number; cells: Record<string, Cell>; editable: boolean; picks?: Picks;
}) {
  const byId = new Map(fields.map((f) => [f.id, f]));
  return (
    <>
      {sections.map(([name, ids]) => (
        <div key={name} className="cf-section">
          {sections.length > 1 && <h4>{name}</h4>}
          <div className="cf-grid">
            {ids.map((id) => byId.get(id)!).map((f) => (
              <div key={f.id} className="cf-item">
                <span className="cf-label" title={fieldTitle(f)}>{f.label}{f.required && <b className="req" title="Needed before approval"> *</b>}
                  {f.field_type === "formula" && <span className="chip">calc</span>}{f.input_source === "excel" && <span className="chip xl">Excel</span>}</span>
                <CustomInput field={f} entity={entity} entityId={entityId} cell={cells[f.key]} editable={editable} picks={picks} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

/** Boxes for the custom fields of a new record (a cost entry), read by the form that saves it. */
export function NewRecordFields({ fields, prefix, picks }: { fields: CustomField[]; prefix: string; picks?: Picks }) {
  return (
    <>
      {fields.filter((f) => f.field_type !== "formula" && f.input_source !== "excel").map((f) => {
        const id = `${prefix}${f.key}`;
        const opts: [string, string][] = f.field_type === "yes_no" ? [["Yes", "Yes"], ["No", "No"]]
          : f.field_type === "dropdown" || f.field_type === "multi_select" ? (f.options.choices ?? []).map((x) => [x, x])
          : f.field_type === "user" || f.field_type === "department" || f.field_type === "tower" ? picks?.[f.field_type] ?? [] : [];
        return (
          <label key={f.id} title={fieldTitle(f)}>{f.label}{f.required && " *"}
            {opts.length || f.field_type === "dropdown"
              ? <select id={id} data-key={f.key} multiple={f.field_type === "multi_select"}><option value="">—</option>{opts.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select>
              : <input id={id} data-key={f.key} type={typeAttr(f.field_type)} inputMode={numeric(f.field_type) ? "decimal" : undefined} placeholder={f.options.unit ?? undefined} />}
          </label>
        );
      })}
    </>
  );
}

export function readNewRecordFields(prefix: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  document.querySelectorAll<HTMLInputElement | HTMLSelectElement>(`[id^="${prefix}"][data-key]`).forEach((el) => {
    const k = el.dataset.key!;
    out[k] = el instanceof HTMLSelectElement && el.multiple ? [...el.selectedOptions].map((o) => o.value).filter(Boolean) : el.value;
  });
  return out;
}

export function clearNewRecordFields(prefix: string) {
  document.querySelectorAll<HTMLInputElement | HTMLSelectElement>(`[id^="${prefix}"][data-key]`).forEach((el) => { el.value = ""; });
}

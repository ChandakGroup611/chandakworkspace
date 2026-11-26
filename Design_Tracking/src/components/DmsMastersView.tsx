"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Plus, Search, Tag, Trash2, X } from "lucide-react";
import { toast } from "react-toastify";
import {
  addMasterFieldAction,
  createMasterTableAction,
  deleteMasterRecordAction,
  deleteMasterTableAction,
  fetchDocumentTagsAction,
  fetchMasterRecordsAction,
  fetchMasterTablesAction,
  saveMasterRecordAction,
  setDocumentTagAction,
  type DmsDocumentTag,
  type DmsMasterRecord,
  type DmsMasterTable,
} from "@/lib/actions/dms-masters";

const input = "rounded-lg bg-surface border border-border px-2.5 py-1.5 text-xs text-foreground";

/** Define master tables and keep their rows (vendors, units, contracts…). */
export function DmsMastersView({ workspaceId }: { workspaceId: string }) {
  const [tables, setTables] = useState<DmsMasterTable[] | null>(null);
  const [canCreate, setCanCreate] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ name: "", keyLabel: "", columns: "" });

  const loadTables = useCallback(async () => {
    const res = await fetchMasterTablesAction(workspaceId);
    if (!res.success) {
      toast.error(res.error);
      setTables([]);
      return;
    }
    setTables(res.tables);
    setCanCreate(res.canCreate);
    setActiveId((id) => id ?? res.tables[0]?.id ?? null);
  }, [workspaceId]);

  useEffect(() => {
    loadTables();
  }, [loadTables]);

  const active = tables?.find((t) => t.id === activeId) || null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 text-xs">
      <aside className="lg:col-span-4 space-y-2">
        {tables === null ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : tables.length === 0 ? (
          <p className="text-muted-foreground">No master tables yet.</p>
        ) : (
          tables.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveId(t.id)}
              className={`w-full text-left px-3 py-2 rounded-lg border ${t.id === activeId ? "border-border-active bg-accent-soft" : "border-border bg-surface"}`}
            >
              <div className="font-semibold text-foreground">{t.name}</div>
              <div className="text-[11px] text-muted-foreground">
                {t.recordCount} row{t.recordCount === 1 ? "" : "s"} · key: {t.keyLabel}
              </div>
            </button>
          ))
        )}

        {canCreate &&
          (creating ? (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const res = await createMasterTableAction({
                  name: draft.name,
                  keyLabel: draft.keyLabel,
                  fields: draft.columns
                    .split(",")
                    .map((c) => c.trim())
                    .filter(Boolean)
                    .map((label) => ({ label })),
                  workspaceId,
                });
                if (!res.success) return toast.error(res.error);
                toast.success("Master table created.");
                setCreating(false);
                setDraft({ name: "", keyLabel: "", columns: "" });
                setActiveId(res.id);
                loadTables();
              }}
              className="p-3 rounded-lg border border-border space-y-2"
            >
              <input aria-label="Table name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Table name, e.g. Vendors" className={`${input} w-full`} />
              <input
                aria-label="Identifying column"
                value={draft.keyLabel}
                onChange={(e) => setDraft({ ...draft, keyLabel: e.target.value })}
                placeholder="Identifying column, e.g. Vendor code"
                className={`${input} w-full`}
              />
              <input
                aria-label="Other columns"
                value={draft.columns}
                onChange={(e) => setDraft({ ...draft, columns: e.target.value })}
                placeholder="Other columns, comma separated (optional)"
                className={`${input} w-full`}
              />
              <div className="flex gap-2">
                <button type="submit" disabled={!draft.name.trim() || !draft.keyLabel.trim()} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold disabled:opacity-50">
                  Create
                </button>
                <button type="button" onClick={() => setCreating(false)} className="px-3 py-1.5 rounded-lg border border-border">
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button type="button" onClick={() => setCreating(true)} className="inline-flex items-center gap-1 text-primary font-semibold">
              <Plus className="h-3.5 w-3.5" /> New master table
            </button>
          ))}
      </aside>

      <section className="lg:col-span-8">
        {active ? (
          <MasterRecords
            key={active.id}
            table={active}
            onChanged={loadTables}
            onDeleted={() => {
              setActiveId(null);
              loadTables();
            }}
          />
        ) : (
          <p className="text-muted-foreground">Choose a master table.</p>
        )}
      </section>
    </div>
  );
}

function MasterRecords({ table, onChanged, onDeleted }: { table: DmsMasterTable; onChanged: () => void; onDeleted: () => void }) {
  const [records, setRecords] = useState<DmsMasterRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [row, setRow] = useState<{ id?: string; key: string; data: Record<string, string> } | null>(null);
  const [newColumn, setNewColumn] = useState("");

  const load = useCallback(async () => {
    const res = await fetchMasterRecordsAction({ tableId: table.id, search, limit: 100 });
    if (!res.success) return toast.error(res.error);
    setRecords(res.records);
    setTotal(res.total);
  }, [table.id, search]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">{table.name}</h3>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input aria-label="Search rows" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${table.keyLabel}`} className={`${input} pl-8`} />
          </div>
          {table.canEditRows && (
            <button type="button" onClick={() => setRow({ key: "", data: {} })} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold">
              <Plus className="h-3.5 w-3.5" /> Add row
            </button>
          )}
        </div>
      </div>

      {row && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const res = await saveMasterRecordAction({ tableId: table.id, recordId: row.id, recordKey: row.key, data: row.data });
            if (!res.success) return toast.error(res.error);
            setRow(null);
            load();
            onChanged();
          }}
          className="p-3 rounded-lg border border-border flex flex-wrap items-end gap-2"
        >
          <label className="flex flex-col gap-1">
            <span className="text-muted-foreground">{table.keyLabel} *</span>
            <input aria-label={table.keyLabel} value={row.key} onChange={(e) => setRow({ ...row, key: e.target.value })} className={input} />
          </label>
          {table.fields.map((f) => (
            <label key={f.id} className="flex flex-col gap-1">
              <span className="text-muted-foreground">
                {f.fieldLabel}
                {f.isRequired ? " *" : ""}
              </span>
              <input
                aria-label={f.fieldLabel}
                type={f.dataType === "DATE" ? "date" : f.dataType === "NUMBER" ? "number" : "text"}
                value={row.data[f.fieldKey] || ""}
                onChange={(e) => setRow({ ...row, data: { ...row.data, [f.fieldKey]: e.target.value } })}
                className={input}
              />
            </label>
          ))}
          <button type="submit" disabled={!row.key.trim()} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold disabled:opacity-50">
            Save
          </button>
          <button type="button" onClick={() => setRow(null)} className="px-3 py-1.5 rounded-lg border border-border">
            Cancel
          </button>
        </form>
      )}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left">
          <thead className="bg-surface/50 border-b border-border text-muted-foreground font-semibold text-[11px]">
            <tr>
              <th className="py-2 px-3">{table.keyLabel}</th>
              {table.fields.map((f) => (
                <th key={f.id} className="py-2 px-3">
                  {f.fieldLabel}
                </th>
              ))}
              <th className="py-2 px-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {records.length === 0 ? (
              <tr>
                <td colSpan={table.fields.length + 2} className="py-8 text-center text-muted-foreground">
                  No rows yet.
                </td>
              </tr>
            ) : (
              records.map((r) => (
                <tr key={r.id}>
                  <td className="py-2 px-3 font-semibold text-foreground">{r.recordKey}</td>
                  {table.fields.map((f) => (
                    <td key={f.id} className="py-2 px-3">
                      {r.data[f.fieldKey] || ""}
                    </td>
                  ))}
                  <td className="py-2 px-3 text-right whitespace-nowrap space-x-2">
                    {table.canEditRows && (
                      <button type="button" onClick={() => setRow({ id: r.id, key: r.recordKey, data: { ...r.data } })} className="text-primary font-semibold">
                        Edit
                      </button>
                    )}
                    {table.canEditRows && (
                      <button
                        type="button"
                        aria-label={`Delete ${r.recordKey}`}
                        onClick={async () => {
                          const res = await deleteMasterRecordAction(table.id, r.id);
                          if (!res.success) return toast.error(res.error);
                          load();
                          onChanged();
                        }}
                        className="text-danger-text"
                      >
                        <Trash2 className="inline h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {total > records.length && <p className="text-muted-foreground">Showing {records.length} of {total}. Search to narrow down.</p>}

      {table.canManage && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
          <input aria-label="New column name" value={newColumn} onChange={(e) => setNewColumn(e.target.value)} placeholder="New column name" className={input} />
          <button
            type="button"
            disabled={!newColumn.trim()}
            onClick={async () => {
              const res = await addMasterFieldAction({ tableId: table.id, label: newColumn });
              if (!res.success) return toast.error(res.error);
              setNewColumn("");
              onChanged();
            }}
            className="px-3 py-1.5 rounded-lg border border-border font-semibold disabled:opacity-50"
          >
            Add column
          </button>
          <button
            type="button"
            onClick={async () => {
              const res = await deleteMasterTableAction(table.id);
              if (!res.success) return toast.error(res.error);
              toast.success("Master table deleted.");
              onDeleted();
            }}
            className="ml-auto text-danger-text font-semibold"
          >
            Delete table
          </button>
        </div>
      )}
    </div>
  );
}

/** Tags on one document: the master rows it belongs to (shown in the document panel). */
export function DmsDocumentTags({ documentId }: { documentId: string }) {
  const [tags, setTags] = useState<DmsDocumentTag[]>([]);
  const [canEdit, setCanEdit] = useState(false);
  const [tables, setTables] = useState<DmsMasterTable[]>([]);
  const [adding, setAdding] = useState(false);
  const [tableId, setTableId] = useState("");
  const [q, setQ] = useState("");
  const [options, setOptions] = useState<DmsMasterRecord[]>([]);

  const load = useCallback(async () => {
    const res = await fetchDocumentTagsAction(documentId);
    if (res.success) {
      setTags(res.tags);
      setCanEdit(res.canEdit);
    }
  }, [documentId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!adding) return;
    fetchMasterTablesAction().then((r) => {
      if (r.success) {
        setTables(r.tables);
        setTableId((id) => id || r.tables[0]?.id || "");
      }
    });
  }, [adding]);

  useEffect(() => {
    if (!adding || !tableId) return;
    fetchMasterRecordsAction({ tableId, search: q, limit: 20 }).then((r) => r.success && setOptions(r.records));
  }, [adding, tableId, q]);

  const toggle = async (recordId: string, tagged: boolean) => {
    const res = await setDocumentTagAction({ documentId, recordId, tagged });
    if (!res.success) return toast.error(res.error);
    load();
  };

  if (!tags.length && !canEdit) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-foreground inline-flex items-center gap-1">
          <Tag className="h-3.5 w-3.5" /> Tags
        </span>
        {canEdit && !adding && (
          <button type="button" onClick={() => setAdding(true)} className="text-primary font-semibold">
            Add tag
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {tags.length === 0 && <span className="text-muted-foreground">No tags.</span>}
        {tags.map((t) => (
          <span key={t.recordId} className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full border border-border bg-surface">
            <span className="text-muted-foreground">{t.tableName}:</span> {t.recordKey}
            {canEdit && (
              <button type="button" aria-label={`Remove tag ${t.recordKey}`} onClick={() => toggle(t.recordId, false)} className="p-0.5 text-muted-foreground hover:text-danger-text">
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}
      </div>
      {adding && (
        <div className="p-2 rounded-lg border border-border space-y-1.5">
          {tables.length === 0 ? (
            <p className="text-muted-foreground">No master tables yet.</p>
          ) : (
            <>
              <div className="flex gap-1.5">
                <select aria-label="Master table" value={tableId} onChange={(e) => setTableId(e.target.value)} className={input}>
                  {tables.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <input aria-label="Find a row" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find…" className={`${input} flex-1 min-w-0`} />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {options
                  .filter((o) => !tags.some((t) => t.recordId === o.id))
                  .map((o) => (
                    <button key={o.id} type="button" onClick={() => toggle(o.id, true)} className="px-2 py-0.5 rounded-full border border-border hover:bg-accent-soft">
                      + {o.recordKey}
                    </button>
                  ))}
              </div>
            </>
          )}
          <button type="button" onClick={() => setAdding(false)} className="text-muted-foreground">
            Done
          </button>
        </div>
      )}
    </div>
  );
}

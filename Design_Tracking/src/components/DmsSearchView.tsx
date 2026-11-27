"use client";

import React, { useEffect, useState } from "react";
import { Bookmark, Lock, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "react-toastify";
import { fetchDocTypesAndFieldsAction, type DmsDocTypeItem, type DmsDocumentSummary, type DmsFolderNode } from "@/lib/actions/dms-core";
import {
  deleteSavedSearchAction,
  fetchSavedSearchesAction,
  saveSearchAction,
  searchDocumentsAction,
  type DmsFieldFilter,
  type DmsSavedSearch,
  type DmsSearchFilters,
  type DmsSearchHit,
} from "@/lib/actions/dms-search";
import { setDefaultSavedViewAction } from "@/lib/actions/dms-extras";
import { formatBytes } from "./DmsDocumentPanel";

const PAGE = 50;
const OPS: { value: DmsFieldFilter["op"]; label: string }[] = [
  { value: "eq", label: "is" },
  { value: "contains", label: "contains" },
  { value: "gte", label: "at least" },
  { value: "lte", label: "at most" },
  { value: "between", label: "between" },
];
const MATCH_LABEL: Record<string, string> = { title: "Title", content: "File text", field: "Field" };

const input = "rounded-lg bg-surface border border-border px-2.5 py-1.5 text-xs text-foreground";

/** Search across the DMS: words in titles, file text and fields, plus filters and saved searches. */
export function DmsSearchView({
  workspaceId,
  currentFolder,
  onOpen,
}: {
  workspaceId: string;
  currentFolder: DmsFolderNode | null;
  onOpen: (doc: DmsDocumentSummary) => void;
}) {
  const [filters, setFilters] = useState<DmsSearchFilters>({ includeSubfolders: true, fields: [] });
  const [hits, setHits] = useState<DmsSearchHit[] | null>(null);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [busy, setBusy] = useState(false);
  const [docTypes, setDocTypes] = useState<DmsDocTypeItem[]>([]);
  const [saved, setSaved] = useState<DmsSavedSearch[]>([]);
  const [saveName, setSaveName] = useState("");
  const [showSave, setShowSave] = useState(false);

  const fieldDefs = docTypes[0]?.fieldDefinitions || [];

  useEffect(() => {
    fetchDocTypesAndFieldsAction(workspaceId).then((r) => r.success && setDocTypes(r.docTypes || []));
    fetchSavedSearchesAction(workspaceId).then((r) => r.success && setSaved(r.searches));
  }, [workspaceId]);

  const set = (patch: Partial<DmsSearchFilters>) => setFilters((f) => ({ ...f, ...patch }));
  const setField = (i: number, patch: Partial<DmsFieldFilter>) =>
    set({ fields: (filters.fields || []).map((x, j) => (j === i ? { ...x, ...patch } : x)) });

  const run = async (f: DmsSearchFilters = filters, from = 0) => {
    setBusy(true);
    try {
      const res = await searchDocumentsAction(f, { limit: PAGE, offset: from }, workspaceId);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      setHits(from === 0 ? res.hits : [...(hits || []), ...res.hits]);
      setTotal(res.total);
      setOffset(from);
    } finally {
      setBusy(false);
    }
  };

  const loadSaved = (s: DmsSavedSearch) => {
    const f = { ...s.filters, fields: s.filters.fields || [] };
    setFilters(f);
    run(f, 0);
  };

  return (
    <div className="space-y-3 text-xs">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(filters, 0);
        }}
        className="space-y-2.5"
      >
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              autoFocus
              aria-label="Search words"
              value={filters.text || ""}
              onChange={(e) => set({ text: e.target.value })}
              placeholder='Words in the title, file text or fields. Use "quotes" for a phrase, -word to exclude.'
              className={`${input} w-full pl-8`}
            />
          </div>
          <button type="submit" disabled={busy} className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold disabled:opacity-50">
            {busy ? "Searching…" : "Search"}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Where to search"
            value={filters.folderId ? "folder" : "all"}
            onChange={(e) => set({ folderId: e.target.value === "folder" ? currentFolder?.id : undefined })}
            className={input}
          >
            <option value="all">All folders</option>
            {currentFolder && <option value="folder">In {currentFolder.name} and below</option>}
          </select>
          <select aria-label="Document type" value={filters.docTypeId || ""} onChange={(e) => set({ docTypeId: e.target.value || undefined })} className={input}>
            <option value="">Any type</option>
            {docTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <select
            aria-label="QC status"
            value={filters.status || ""}
            onChange={(e) => set({ status: (e.target.value || undefined) as DmsSearchFilters["status"] })}
            className={input}
          >
            <option value="">Any status</option>
            <option value="APPROVED">Approved</option>
            <option value="PENDING">Waiting for QC</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <label className="inline-flex items-center gap-1 text-muted-foreground">
            Changed from
            <input type="date" value={filters.from || ""} onChange={(e) => set({ from: e.target.value || undefined })} className={input} />
          </label>
          <label className="inline-flex items-center gap-1 text-muted-foreground">
            to
            <input type="date" value={filters.to || ""} onChange={(e) => set({ to: e.target.value || undefined })} className={input} />
          </label>
          <label className="inline-flex items-center gap-1.5 text-foreground">
            <input type="checkbox" checked={!!filters.checkedOut} onChange={(e) => set({ checkedOut: e.target.checked || undefined })} />
            Checked out only
          </label>
        </div>

        {(filters.fields || []).map((f, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <select aria-label="Field" value={f.fieldId} onChange={(e) => setField(i, { fieldId: e.target.value })} className={input}>
              {fieldDefs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.fieldLabel}
                </option>
              ))}
            </select>
            <select aria-label="Condition" value={f.op} onChange={(e) => setField(i, { op: e.target.value as DmsFieldFilter["op"] })} className={input}>
              {OPS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <input aria-label="Value" value={f.value} onChange={(e) => setField(i, { value: e.target.value })} className={input} />
            {f.op === "between" && (
              <>
                <span className="text-muted-foreground">and</span>
                <input aria-label="Second value" value={f.value2 || ""} onChange={(e) => setField(i, { value2: e.target.value })} className={input} />
              </>
            )}
            <button
              type="button"
              aria-label="Remove field filter"
              onClick={() => set({ fields: (filters.fields || []).filter((_, j) => j !== i) })}
              className="p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

        <div className="flex flex-wrap items-center gap-3">
          {fieldDefs.length > 0 && (filters.fields || []).length < 10 && (
            <button
              type="button"
              onClick={() => set({ fields: [...(filters.fields || []), { fieldId: fieldDefs[0].id, op: "eq", value: "" }] })}
              className="inline-flex items-center gap-1 text-primary font-semibold"
            >
              <Plus className="h-3.5 w-3.5" /> Add a field filter
            </button>
          )}
          <button type="button" onClick={() => setShowSave((v) => !v)} className="inline-flex items-center gap-1 text-primary font-semibold">
            <Bookmark className="h-3.5 w-3.5" /> Save this search
          </button>
          <button
            type="button"
            onClick={() => {
              setFilters({ includeSubfolders: true, fields: [] });
              setHits(null);
            }}
            className="text-muted-foreground"
          >
            Clear
          </button>
        </div>

        {showSave && (
          <div className="flex flex-wrap items-center gap-2">
            <input aria-label="Saved search name" value={saveName} onChange={(e) => setSaveName(e.target.value)} placeholder="Name" className={input} />
            <button
              type="button"
              disabled={!saveName.trim()}
              onClick={async () => {
                const res = await saveSearchAction({ name: saveName, filters, workspaceId });
                if (!res.success) return toast.error(res.error);
                toast.success("Search saved.");
                setSaveName("");
                setShowSave(false);
                const list = await fetchSavedSearchesAction(workspaceId);
                if (list.success) setSaved(list.searches);
              }}
              className="px-3 py-1.5 rounded-lg border border-border font-semibold disabled:opacity-50"
            >
              Save
            </button>
          </div>
        )}
      </form>

      {saved.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-muted-foreground">Saved:</span>
          {saved.map((s) => (
            <span key={s.id} className="inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-full border border-border bg-surface">
              <button type="button" onClick={() => loadSaved(s)} className="font-semibold text-foreground">
                {s.name}
              </button>
              {s.isMine && (
                <>
                  <button
                    type="button"
                    title="Set as default view"
                    onClick={async () => {
                      const res = await setDefaultSavedViewAction(s.id);
                      if (res.success) {
                        toast.success("Default view updated");
                        const list = await fetchSavedSearchesAction(workspaceId);
                        if (list.success) setSaved(list.searches);
                      } else toast.error(res.error);
                    }}
                    className={`px-1 text-[10px] font-semibold ${(s as any).isDefault ? "text-emerald-600" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {(s as any).isDefault ? "★ Default" : "☆"}
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete saved search ${s.name}`}
                    onClick={async () => {
                      const res = await deleteSavedSearchAction(s.id);
                      if (!res.success) return toast.error(res.error);
                      setSaved((list) => list.filter((x) => x.id !== s.id));
                    }}
                    className="p-0.5 text-muted-foreground hover:text-danger-text"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </>
              )}
            </span>
          ))}
        </div>
      )}

      {hits !== null && (
        <>
          <p className="text-muted-foreground">
            {total === 0 ? "No documents match." : `${total} document${total === 1 ? "" : "s"} found${total > hits.length ? `, showing ${hits.length}` : ""}.`}
          </p>
          {hits.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-left">
                <thead className="bg-surface/50 border-b border-border text-muted-foreground font-semibold text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Document</th>
                    <th className="py-2.5 px-3">Folder</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Size</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {hits.map((h) => (
                    <tr key={h.id} onClick={() => onOpen(h)} className="hover:bg-surface/50 cursor-pointer">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-foreground">{h.title}</span>
                          <span className="font-mono text-[11px] text-muted-foreground">v{h.currentVersionNo}</span>
                          {h.isLocked && <Lock className="h-3 w-3 text-warning-text" aria-label="Checked out" />}
                          {h.matchedIn && (
                            <span className="px-1.5 py-0.5 rounded-full text-[11px] bg-accent-soft text-primary">{MATCH_LABEL[h.matchedIn]}</span>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono truncate">{h.originalFileName}</div>
                      </td>
                      <td className="py-2.5 px-3">{h.folderName}</td>
                      <td className="py-2.5 px-3">{h.docTypeName}</td>
                      <td className="py-2.5 px-3">
                        {h.approvalStatus === "PENDING" ? "Waiting for QC" : h.approvalStatus === "APPROVED" ? "Approved" : "Rejected"}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-muted-foreground">{formatBytes(h.fileSizeBytes)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {total > hits.length && (
            <button type="button" disabled={busy} onClick={() => run(filters, offset + PAGE)} className="text-primary font-semibold disabled:opacity-50">
              Show more
            </button>
          )}
        </>
      )}
    </div>
  );
}

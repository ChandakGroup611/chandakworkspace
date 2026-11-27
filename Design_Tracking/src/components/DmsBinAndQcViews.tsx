"use client";

import React, { useCallback, useEffect, useState } from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import {
  fetchQcQueueAction,
  fetchRecycleBinAction,
  purgeDocumentAction,
  restoreDocumentAction,
  type DmsQcItem,
  type DmsRecycleItem,
} from "@/lib/actions/dms-core";
import { bulkApproveQcAction } from "@/lib/actions/dms-extras";

const when = (iso?: string) => (iso ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "");

/** Deleted documents the person can restore or purge. */
export function DmsRecycleBinView({ workspaceId, onRestored }: { workspaceId: string; onRestored?: () => void }) {
  const [items, setItems] = useState<DmsRecycleItem[] | null>(null);
  const [purging, setPurging] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetchRecycleBinAction(workspaceId);
    if (res.success) setItems(res.items);
    else {
      toast.error(res.error);
      setItems([]);
    }
  }, [workspaceId]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (fn: () => Promise<{ success: boolean; error?: string }>, ok: string) => {
    setBusy(true);
    try {
      const res = await fn();
      if (!res.success) return toast.error(res.error);
      toast.success(ok);
      setPurging(null);
      setReason("");
      await load();
      onRestored?.();
    } finally {
      setBusy(false);
    }
  };

  if (!items) return <p className="py-12 text-center text-xs text-muted-foreground">Loading the recycle bin…</p>;
  if (!items.length) return <p className="py-12 text-center text-xs text-muted-foreground">The recycle bin is empty.</p>;

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-left text-xs">
        <thead className="bg-surface/50 border-b border-border text-muted-foreground font-semibold text-[11px]">
          <tr>
            <th className="py-2.5 px-3">Document</th>
            <th className="py-2.5 px-3">Folder</th>
            <th className="py-2.5 px-3">Deleted</th>
            <th className="py-2.5 px-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((i) => (
            <React.Fragment key={i.documentId}>
              <tr>
                <td className="py-2.5 px-3">
                  <div className="font-semibold text-foreground">{i.title}</div>
                  <div className="text-[11px] text-muted-foreground font-mono">{i.fileName}</div>
                </td>
                <td className="py-2.5 px-3">{i.folderName}</td>
                <td className="py-2.5 px-3">
                  {when(i.deletedAt)}
                  <div className="text-[11px] text-muted-foreground">{i.deletedByName}</div>
                </td>
                <td className="py-2.5 px-3 text-right space-x-2 whitespace-nowrap">
                  {i.canRestore && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => act(() => restoreDocumentAction(i.documentId), "Restored to its folder.")}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border font-semibold disabled:opacity-50"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Restore
                    </button>
                  )}
                  {i.canPurge && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setPurging(purging === i.documentId ? null : i.documentId)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border text-danger-text font-semibold disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Purge
                    </button>
                  )}
                </td>
              </tr>
              {purging === i.documentId && (
                <tr>
                  <td colSpan={4} className="px-3 pb-3">
                    <div className="p-2.5 rounded-lg border border-border bg-danger-soft/40 space-y-2">
                      <p>Purging deletes every version of this file for good. It cannot be undone. The audit trail keeps a record.</p>
                      <input
                        type="text"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Reason for purging"
                        className="w-full rounded-lg bg-surface border border-border px-2.5 py-1.5"
                      />
                      <button
                        type="button"
                        disabled={busy || reason.trim().length < 5}
                        onClick={() => act(() => purgeDocumentAction(i.documentId, reason), "Purged.")}
                        className="px-3 py-1 rounded-lg bg-danger text-white font-semibold disabled:opacity-50"
                      >
                        Purge for good
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Documents waiting for this person's QC decision, oldest first. */
export function DmsQcQueueView({ workspaceId, onOpen }: { workspaceId: string; onOpen: (item: DmsQcItem) => void }) {
  const [items, setItems] = useState<DmsQcItem[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkComment, setBulkComment] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetchQcQueueAction(workspaceId).then((res) => {
      if (res.success) setItems(res.items);
      else {
        toast.error(res.error);
        setItems([]);
      }
    });
  }, [workspaceId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!items) return <p className="py-12 text-center text-xs text-muted-foreground">Loading the QC queue…</p>;
  if (!items.length) return <p className="py-12 text-center text-xs text-muted-foreground">Nothing is waiting for QC.</p>;

  return (
    <div className="space-y-2">
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-accent-soft/40 p-2.5 text-xs">
          <span className="font-semibold">{selected.size} selected</span>
          <input
            value={bulkComment}
            onChange={(e) => setBulkComment(e.target.value)}
            placeholder="Bulk approval comment (optional)"
            className="flex-1 min-w-[180px] rounded border border-border bg-surface px-2.5 py-1 text-xs"
          />
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const res = await bulkApproveQcAction(Array.from(selected), bulkComment);
              setBusy(false);
              if (res.success) {
                toast.success(`Approved ${res.approved} document(s)${res.skipped ? ` (${res.skipped} skipped)` : ""}`);
                setSelected(new Set());
                setBulkComment("");
                load();
              } else toast.error(res.error);
            }}
            className="px-3 py-1 rounded bg-primary text-primary-foreground font-semibold disabled:opacity-50"
          >
            Bulk Approve
          </button>
        </div>
      )}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface/50 border-b border-border text-muted-foreground font-semibold text-[11px]">
            <tr>
              <th className="py-2.5 px-3 w-8">
                <input
                  type="checkbox"
                  aria-label="Select all QC items"
                  checked={items.filter((x) => !x.ownUpload).length > 0 && selected.size === items.filter((x) => !x.ownUpload).length}
                  onChange={(e) => {
                    if (e.target.checked) setSelected(new Set(items.filter((x) => !x.ownUpload).map((x) => x.documentId)));
                    else setSelected(new Set());
                  }}
                />
              </th>
              <th className="py-2.5 px-3">Document</th>
              <th className="py-2.5 px-3">Folder</th>
              <th className="py-2.5 px-3">Uploaded</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((i) => (
              <tr key={i.documentId} onClick={() => onOpen(i)} className="hover:bg-surface/50 cursor-pointer">
                <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                  {!i.ownUpload && (
                    <input
                      type="checkbox"
                      aria-label={`Select ${i.title}`}
                      checked={selected.has(i.documentId)}
                      onChange={(e) =>
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(i.documentId);
                          else next.delete(i.documentId);
                          return next;
                        })
                      }
                    />
                  )}
                </td>
                <td className="py-2.5 px-3">
                  <span className="font-semibold text-foreground">{i.title}</span>
                  <span className="ml-1.5 font-mono text-[11px] text-muted-foreground">v{i.versionNo}</span>
                  {i.ownUpload && <span className="ml-1.5 text-[11px] text-muted-foreground">(your upload)</span>}
                </td>
                <td className="py-2.5 px-3">{i.folderName}</td>
                <td className="py-2.5 px-3">
                  {when(i.uploadedAt)}
                  <div className="text-[11px] text-muted-foreground">{i.uploadedByName}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

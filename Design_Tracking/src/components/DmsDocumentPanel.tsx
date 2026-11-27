"use client";

import React, { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Clock, Download, EyeOff, History, Link2, Lock, Pencil, Star, Trash2, Unlock, Upload, XCircle } from "lucide-react";
import { toast } from "react-toastify";
import {
  deleteDocumentAction,
  fetchDocumentDetailAction,
  fetchDocumentPermissionsAction,
  fetchFolderEligiblePrincipalsAction,
  lockUnlockDocumentAction,
  moveDocumentAction,
  saveDocumentPermissionsAction,
  submitQcDecisionAction,
  updateDocumentAction,
  uploadDocumentVersionAction,
  type DmsActivityItem,
  type DmsDocumentPermissionItem,
  type DmsDocumentSummary,
  type DmsEligiblePrincipal,
  type DmsVersionItem,
} from "@/lib/actions/dms-core";
import {
  fetchDocumentFolderTagsAction,
  fetchDocumentLinksAction,
  fetchFavouriteIdsAction,
  linkDocumentAction,
  setDocumentFolderTagAction,
  setDocumentPrivateAction,
  toggleFavouriteAction,
  unlinkDocumentAction,
  type DmsDocumentLinkItem,
} from "@/lib/actions/dms-extras";
import { DmsDocumentTags } from "./DmsMastersView";
import { DmsDocumentShares, DmsShareDialog } from "./DmsShares";

export function formatBytes(n: number) {
  if (!n) return "0 B";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

const when = (iso?: string) => (iso ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "");

const ACTION_LABEL: Record<string, string> = {
  DOCUMENT_ADDED: "Added",
  DOCUMENT_EDITED: "Details edited",
  DOCUMENT_VERSION_ADDED: "New version",
  DOCUMENT_CHECKED_OUT: "Checked out",
  DOCUMENT_LOCK_RELEASED: "Check-out released",
  DOCUMENT_QC_APPROVED: "QC approved",
  DOCUMENT_QC_REJECTED: "QC rejected",
  DOCUMENT_DELETED: "Moved to recycle bin",
  DOCUMENT_MOVED: "Moved to another folder",
  DOCUMENT_RESTORED: "Restored",
  DOCUMENT_VIEWED: "Opened",
  DOCUMENT_DOWNLOADED: "Downloaded",
};

interface Props {
  documentId: string;
  folders?: { id: string; name: string }[];
  folderDocs?: { id: string; title: string }[];
  /** called after any change, with the refreshed summary (or null when the document left the folder) */
  onChanged: (doc: DmsDocumentSummary | null) => void;
}

/** Side panel for one document: details, versions, check-out and check-in, QC and delete. */
export function DmsDocumentPanel({ documentId, folders = [], folderDocs = [], onChanged }: Props) {
  const [doc, setDoc] = useState<DmsDocumentSummary | null>(null);
  const [versions, setVersions] = useState<DmsVersionItem[]>([]);
  const [fields, setFields] = useState<{ id: string; label: string; value: string }[]>([]);
  const [activity, setActivity] = useState<DmsActivityItem[]>([]);
  const [tab, setTab] = useState<"details" | "versions" | "activity">("details");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newFile, setNewFile] = useState<File | null>(null);
  const [changeNote, setChangeNote] = useState("");
  const [qcComment, setQcComment] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [sharesKey, setSharesKey] = useState(0);
  const [moveTargetId, setMoveTargetId] = useState("");
  const [isFav, setIsFav] = useState(false);
  const [taggedFolders, setTaggedFolders] = useState<string[]>([]);
  const [docLinks, setDocLinks] = useState<DmsDocumentLinkItem[]>([]);
  const [linkTargetId, setLinkTargetId] = useState("");
  const [linkNote, setLinkNote] = useState("");
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editFields, setEditFields] = useState<Record<string, string>>({});
  const [eligiblePrincipals, setEligiblePrincipals] = useState<DmsEligiblePrincipal[]>([]);
  const [docGrants, setDocGrants] = useState<DmsDocumentPermissionItem[]>([]);
  const [pickPrincipalKey, setPickPrincipalKey] = useState("");

  const load = useCallback(async () => {
    const [res, favs, fTags, dLinks] = await Promise.all([
      fetchDocumentDetailAction(documentId),
      fetchFavouriteIdsAction(),
      fetchDocumentFolderTagsAction(documentId),
      fetchDocumentLinksAction(documentId),
    ]);
    if (!res.success) {
      setError(res.error);
      return null;
    }
    setError(null);
    setDoc(res.document);
    setVersions(res.versions);
    setFields(res.fields);
    setActivity(res.activity);
    if (favs.success) setIsFav(favs.ids.includes(documentId));
    if (fTags.success) setTaggedFolders(fTags.folderIds);
    if (dLinks.success) setDocLinks(dLinks.links);
    const [elig, perms] = await Promise.all([
      fetchFolderEligiblePrincipalsAction(res.document.folderId),
      fetchDocumentPermissionsAction(documentId),
    ]);
    if (elig.success) setEligiblePrincipals(elig.principals);
    if (perms.success) setDocGrants(perms.grants);
    return res.document;
  }, [documentId]);

  useEffect(() => {
    setNewFile(null);
    setChangeNote("");
    setQcComment("");
    setConfirmDelete(false);
    load();
  }, [load]);

  const run = async (fn: () => Promise<{ success: boolean; error?: string }>, ok: string, leaves = false) => {
    setBusy(true);
    try {
      const res = await fn();
      if (!res.success) {
        toast.error(res.error || "That didn't work.");
        return false;
      }
      toast.success(ok);
      if (leaves) onChanged(null);
      else onChanged(await load());
      return true;
    } finally {
      setBusy(false);
    }
  };

  if (error) return <div className="p-4 text-xs text-danger-text">{error}</div>;
  if (!doc) return <div className="p-4 text-xs text-muted-foreground">Loading…</div>;

  const r = doc.rights || ({} as NonNullable<DmsDocumentSummary["rights"]>);
  const canWrite = !!(r.edit || r.upload);
  const lockedByOther = doc.isLocked && !doc.lockedByMe;
  const current = versions.find((v) => v.versionNo === doc.currentVersionNo);
  const awaitingQc = doc.approvalStatus === "PENDING" && current?.qcStatus === "UNAPPROVED";
  const ownUpload = !!current?.uploadedByMe;

  return (
    <div className="flex flex-col h-full text-xs">
      {/* Status strip */}
      <div className="p-3 border-b border-border space-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
              doc.approvalStatus === "APPROVED"
                ? "bg-success-soft text-success-text"
                : doc.approvalStatus === "REJECTED"
                ? "bg-danger-soft text-danger-text"
                : "bg-info-soft text-info-text"
            }`}
          >
            {doc.approvalStatus === "PENDING" ? "Waiting for QC" : doc.approvalStatus === "APPROVED" ? "Approved" : "Rejected"}
          </span>
          <span className="px-1.5 py-0.5 rounded text-[11px] font-mono bg-surface border border-border text-muted-foreground">
            v{doc.currentVersionNo}
          </span>
          {doc.isLocked && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-warning-soft text-warning-text">
              <Lock className="h-3 w-3" />
              {doc.lockedByMe ? "Checked out by you" : `Checked out by ${doc.lockedByName}`}
            </span>
          )}
        </div>
        {current?.qcStatus === "REJECTED" && current.qcComment && (
          <p className="text-[11px] text-danger-text">
            Rejected by {current.qcByName}: {current.qcComment}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="p-3 border-b border-border space-y-3">
        <div className="flex flex-wrap gap-2">
          {r.download && (
            <a
              href={`/api/proxy-attachment/${doc.id}?download=1`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold"
            >
              <Download className="h-3.5 w-3.5" /> Download
            </a>
          )}
          {canWrite && !doc.isLocked && (
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => lockUnlockDocumentAction({ documentId: doc.id, action: "LOCK" }), "Checked out to you for 8 hours.")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border font-semibold disabled:opacity-50"
            >
              <Lock className="h-3.5 w-3.5" /> Check out
            </button>
          )}
          {r.edit && !lockedByOther && (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setEditTitle(doc.title);
                setEditFields(Object.fromEntries(fields.map((f) => [f.id, f.value || ""])));
                setEditing((v) => !v);
                setTab("details");
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border font-semibold disabled:opacity-50"
            >
              <Pencil className="h-3.5 w-3.5" /> {editing ? "Close edit" : "Edit details"}
            </button>
          )}
          {doc.isLocked && (doc.lockedByMe || r.admin) && (
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => lockUnlockDocumentAction({ documentId: doc.id, action: "UNLOCK" }), "Check-out released.")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border font-semibold disabled:opacity-50"
            >
              <Unlock className="h-3.5 w-3.5" /> {doc.lockedByMe ? "Release check-out" : "Force release"}
            </button>
          )}
          {r.email && doc.approvalStatus === "APPROVED" && (
            <button
              type="button"
              onClick={() => setSharing(true)}
              title="Send a secure link to someone outside the company"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border font-semibold"
            >
              <Link2 className="h-3.5 w-3.5" /> Share
            </button>
          )}
          {r.delete && !lockedByOther && (
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-danger-text font-semibold disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          )}
        </div>

        {confirmDelete && (
          <div className="p-2.5 rounded-lg border border-border bg-danger-soft/40 space-y-2">
            <p>Move this document to the recycle bin? It can be restored from there.</p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => run(() => deleteDocumentAction(doc.id), "Moved to the recycle bin.", true)}
                className="px-3 py-1 rounded-lg bg-danger text-white font-semibold disabled:opacity-50"
              >
                Move to bin
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} className="px-3 py-1 rounded-lg border border-border">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Check in a new version */}
        {canWrite && !lockedByOther && (
          <div className="space-y-1.5">
            <div className="font-semibold text-foreground">Upload a new version</div>
            <input
              type="file"
              aria-label="New version file"
              onChange={(e) => setNewFile(e.target.files?.[0] || null)}
              className="block w-full text-[11px]"
            />
            <input
              type="text"
              value={changeNote}
              onChange={(e) => setChangeNote(e.target.value)}
              placeholder="What changed in this version?"
              className="w-full rounded-lg bg-surface border border-border px-2.5 py-1.5"
            />
            <button
              type="button"
              disabled={busy || !newFile || !changeNote.trim()}
              onClick={async () => {
                const fd = new FormData();
                fd.append("documentId", doc.id);
                fd.append("file", newFile as File);
                fd.append("changeNote", changeNote.trim());
                const ok = await run(async () => {
                  const res = await uploadDocumentVersionAction(fd);
                  return res.success ? { success: true } : res;
                }, "New version checked in.");
                if (ok) {
                  setNewFile(null);
                  setChangeNote("");
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border font-semibold disabled:opacity-50"
            >
              <Upload className="h-3.5 w-3.5" /> Check in v{doc.currentVersionNo + 1}
            </button>
            {doc.lockedByMe && <p className="text-[11px] text-muted-foreground">Checking in releases your check-out.</p>}
          </div>
        )}

        {/* QC decision */}
        {r.qc && awaitingQc && (
          <div className="space-y-1.5 pt-2 border-t border-border">
            <div className="font-semibold text-foreground">QC decision on v{doc.currentVersionNo}</div>
            {ownUpload && !r.admin ? (
              <p className="text-[11px] text-muted-foreground">You uploaded this version, so another QC approver has to decide.</p>
            ) : (
              <>
                <textarea
                  value={qcComment}
                  onChange={(e) => setQcComment(e.target.value)}
                  rows={2}
                  placeholder="Comment (required to reject)"
                  className="w-full rounded-lg bg-surface border border-border px-2.5 py-1.5"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      run(
                        () => submitQcDecisionAction({ documentId: doc.id, versionNo: doc.currentVersionNo, status: "APPROVED", decisionComment: qcComment }),
                        "Approved."
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success text-white font-semibold disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                  </button>
                  <button
                    type="button"
                    disabled={busy || qcComment.trim().length < 5}
                    onClick={() =>
                      run(
                        () => submitQcDecisionAction({ documentId: doc.id, versionNo: doc.currentVersionNo, status: "REJECTED", decisionComment: qcComment }),
                        "Rejected. The uploader can check in a corrected version."
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-danger-text font-semibold disabled:opacity-50"
                  >
                    <XCircle className="h-3.5 w-3.5" /> Reject
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {sharing && (
        <DmsShareDialog
          documents={[{ id: doc.id, title: doc.title }]}
          onClose={() => setSharing(false)}
          onCreated={() => setSharesKey((k) => k + 1)}
        />
      )}

      {/* Tabs */}
      <div className="flex border-b border-border">
        {(["details", "versions", "activity"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 py-2 font-semibold capitalize ${tab === t ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}
          >
            {t === "versions" ? `Versions (${versions.length})` : t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {tab === "details" && editing && r.edit && !lockedByOther && (
          <div className="rounded-lg border border-primary/40 bg-accent-soft/30 p-2.5 space-y-2">
            <div className="text-[11px] font-semibold text-foreground">Edit document details</div>
            <label className="block space-y-1">
              <span className="text-[11px] text-muted-foreground">Title</span>
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full rounded border border-border bg-background px-2 py-1 text-xs"
              />
            </label>
            {fields.map((f) => (
              <label key={f.id} className="block space-y-1">
                <span className="text-[11px] text-muted-foreground">{f.label}</span>
                <input
                  value={editFields[f.id] ?? ""}
                  onChange={(e) => setEditFields((prev) => ({ ...prev, [f.id]: e.target.value }))}
                  className="w-full rounded border border-border bg-background px-2 py-1 text-xs"
                />
              </label>
            ))}
            <div className="flex justify-end gap-1.5">
              <button type="button" onClick={() => setEditing(false)} className="px-2.5 py-1 rounded border border-border text-[11px]">
                Cancel
              </button>
              <button
                type="button"
                disabled={busy || !editTitle.trim()}
                onClick={async () => {
                  const ok = await run(
                    () =>
                      updateDocumentAction({
                        documentId: doc.id,
                        title: editTitle.trim(),
                        fieldValues: fields.length ? editFields : undefined,
                      }),
                    "Document details updated."
                  );
                  if (ok) setEditing(false);
                }}
                className="px-2.5 py-1 rounded bg-primary text-primary-foreground text-[11px] font-semibold disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        )}
        {tab === "details" && (
          <div className="flex flex-wrap items-center gap-1.5 pb-1">
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                const res = await toggleFavouriteAction(doc.id);
                if (res.success) {
                  setIsFav(res.isFavourite);
                  toast.success(res.isFavourite ? "Added to Favourites" : "Removed from Favourites");
                } else toast.error(res.error);
              }}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-[11px] font-medium ${
                isFav ? "border-amber-500/50 bg-amber-500/10 text-amber-600" : "border-border bg-surface text-foreground"
              }`}
            >
              <Star className={`h-3 w-3 ${isFav ? "fill-amber-500 text-amber-500" : ""}`} />
              {isFav ? "Favourited" : "Mark Favourite"}
            </button>
            {(r.own || r.admin) && (
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  run(
                    () => setDocumentPrivateAction({ documentId: doc.id, isPrivate: !(doc as any).isPrivate }),
                    "Private View updated"
                  )
                }
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-border bg-surface text-[11px] font-medium text-foreground"
                title="Private View: visible only to the uploader and admins"
              >
                <EyeOff className="h-3 w-3" />
                {(doc as any).isPrivate ? "Private: On" : "Private View"}
              </button>
            )}
          </div>
        )}
        {tab === "details" && <DmsDocumentTags documentId={doc.id} />}
        {tab === "details" && r.edit && folders.length > 1 && (
          <div className="rounded-lg border border-border p-2.5 space-y-1.5 bg-surface/60">
            <div className="text-[11px] font-semibold text-muted-foreground">Also show in folders (Category Tagging)</div>
            <div className="flex flex-wrap gap-1">
              {folders
                .filter((f) => f.id !== doc.folderId)
                .slice(0, 12)
                .map((f) => {
                  const active = taggedFolders.includes(f.id);
                  return (
                    <button
                      key={f.id}
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        run(
                          () => setDocumentFolderTagAction({ documentId: doc.id, folderId: f.id, tagged: !active }),
                          active ? `Untagged from ${f.name}` : `Tagged in ${f.name}`
                        )
                      }
                      className={`px-2 py-0.5 rounded-full text-[11px] border ${
                        active ? "border-primary bg-primary/10 text-primary font-semibold" : "border-border text-muted-foreground"
                      }`}
                    >
                      {active ? "✓ " : "+ "}
                      {f.name}
                    </button>
                  );
                })}
            </div>
          </div>
        )}
        {tab === "details" && (
          <div className="rounded-lg border border-border p-2.5 space-y-1.5 bg-surface/60">
            <div className="text-[11px] font-semibold text-muted-foreground">Linked documents</div>
            {docLinks.length > 0 ? (
              <ul className="space-y-1 text-[11px]">
                {docLinks.map((lnk) => (
                  <li key={lnk.id} className="flex items-center justify-between gap-2">
                    <span className="truncate text-foreground">
                      <Link2 className="inline h-3 w-3 mr-1 text-primary" />
                      {lnk.targetTitle} {lnk.linkNote ? `(${lnk.linkNote})` : ""}
                    </span>
                    {r.edit && (
                      <button
                        type="button"
                        onClick={() => run(() => unlinkDocumentAction(lnk.id), "Link removed")}
                        className="text-muted-foreground hover:text-danger-text shrink-0"
                      >
                        Remove
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[11px] text-muted-foreground">No linked documents.</p>
            )}
            {r.edit && (
              <div className="flex items-center gap-1 pt-1">
                {folderDocs.length > 0 ? (
                  <select
                    value={linkTargetId}
                    onChange={(e) => setLinkTargetId(e.target.value)}
                    aria-label="Target document"
                    className="flex-1 min-w-0 rounded border border-border bg-background px-2 py-1 text-[11px]"
                  >
                    <option value="">Choose document to link…</option>
                    {folderDocs.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.title}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={linkTargetId}
                    onChange={(e) => setLinkTargetId(e.target.value)}
                    placeholder="Target Document UUID"
                    className="flex-1 min-w-0 rounded border border-border bg-background px-2 py-1 text-[11px]"
                  />
                )}
                <input
                  value={linkNote}
                  onChange={(e) => setLinkNote(e.target.value)}
                  placeholder="Type / Note"
                  className="w-24 rounded border border-border bg-background px-2 py-1 text-[11px]"
                />
                <button
                  type="button"
                  disabled={busy || !linkTargetId.trim()}
                  onClick={() =>
                    run(
                      () => linkDocumentAction({ sourceDocumentId: doc.id, targetDocumentId: linkTargetId.trim(), linkNote }),
                      "Document linked"
                    )
                  }
                  className="px-2 py-1 rounded bg-primary text-primary-foreground text-[11px] font-semibold disabled:opacity-50"
                >
                  Link
                </button>
              </div>
            )}
          </div>
        )}
        {tab === "details" && <DmsDocumentShares documentId={doc.id} refreshKey={sharesKey} />}
        {tab === "details" && (r.manage || r.admin || r.own) && (
          <div className="rounded-lg border border-border p-2.5 space-y-2 bg-surface/60">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[11px] font-semibold text-muted-foreground">Document access (RBAC)</div>
              <span className="text-[10px] text-muted-foreground">
                {docGrants.length === 0 ? "All folder users" : `${docGrants.length} custom`}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Only users &amp; roles with access to this folder are listed.
            </p>
            <div className="flex items-center gap-1">
              <select
                aria-label="Add folder user or role to document RBAC"
                value={pickPrincipalKey}
                onChange={(e) => setPickPrincipalKey(e.target.value)}
                className="flex-1 min-w-0 rounded border border-border bg-background px-2 py-1 text-[11px]"
              >
                <option value="">Choose folder user or role…</option>
                {eligiblePrincipals
                  .filter(
                    (p) =>
                      !docGrants.some((g) =>
                        p.kind === "USER" ? g.userId === p.userId : !g.userId && g.roleCode === p.roleCode
                      )
                  )
                  .map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.label}{p.email ? ` (${p.email})` : ""}
                    </option>
                  ))}
              </select>
              <button
                type="button"
                disabled={busy || !pickPrincipalKey}
                onClick={() => {
                  const p = eligiblePrincipals.find((x) => x.key === pickPrincipalKey);
                  if (!p) return;
                  setDocGrants((prev) => [
                    ...prev,
                    {
                      userId: p.userId,
                      roleCode: p.roleCode,
                      label: p.label,
                      email: p.email,
                      canView: true,
                      canEdit: false,
                      canDownload: true,
                      canManage: false,
                      canDelete: false,
                    },
                  ]);
                  setPickPrincipalKey("");
                }}
                className="px-2 py-1 rounded bg-primary text-primary-foreground text-[11px] font-semibold disabled:opacity-50"
              >
                Add
              </button>
            </div>
            {docGrants.length > 0 && (
              <div className="space-y-1.5">
                {docGrants.map((g, idx) => (
                  <div key={`${g.userId || g.roleCode}-${idx}`} className="p-1.5 rounded border border-border bg-background space-y-1 text-[10px]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold truncate">{g.label}</span>
                      <button
                        type="button"
                        onClick={() => setDocGrants((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-danger-text hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(
                        [
                          ["canView", "View"],
                          ["canEdit", "Edit"],
                          ["canDownload", "Download"],
                          ["canManage", "Manage"],
                          ["canDelete", "Delete"],
                        ] as const
                      ).map(([k, lbl]) => (
                        <label key={k} className="inline-flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={g[k]}
                            onChange={(e) =>
                              setDocGrants((prev) => prev.map((row, i) => (i === idx ? { ...row, [k]: e.target.checked } : row)))
                            }
                          />
                          <span>{lbl}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end">
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  run(
                    () => saveDocumentPermissionsAction({ documentId: doc.id, grants: docGrants }),
                    "Document RBAC saved."
                  )
                }
                className="px-2.5 py-1 rounded bg-primary text-primary-foreground text-[11px] font-semibold disabled:opacity-50"
              >
                Save Document RBAC
              </button>
            </div>
          </div>
        )}
        {tab === "details" && r.edit && folders.length > 1 && (
          <div className="rounded-lg border border-border p-2.5 space-y-1.5 bg-surface/60">
            <div className="text-[11px] font-semibold text-muted-foreground">Move to another folder</div>
            <div className="flex items-center gap-1.5">
              <select
                value={moveTargetId}
                onChange={(e) => setMoveTargetId(e.target.value)}
                aria-label="Destination folder"
                className="flex-1 min-w-0 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
              >
                <option value="">Choose destination folder…</option>
                {folders
                  .filter((f) => f.id !== doc.folderId)
                  .map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
              </select>
              <button
                type="button"
                disabled={busy || !moveTargetId}
                onClick={() =>
                  run(
                    () => moveDocumentAction({ documentId: doc.id, targetFolderId: moveTargetId }),
                    "Moved to destination folder",
                    true
                  )
                }
                className="px-2.5 py-1 rounded-md bg-primary text-primary-foreground text-[11px] font-semibold disabled:opacity-50"
              >
                Move
              </button>
            </div>
          </div>
        )}
        {tab === "details" && (
          <dl className="space-y-1.5">
            {[
              ["Type", doc.docTypeName],
              ["File", `${doc.originalFileName} · ${formatBytes(doc.fileSizeBytes)}`],
              ["Added by", doc.createdByName || ""],
              ["Added", when(doc.createdAt)],
              ["Last changed", when(doc.updatedAt)],
              ...fields.map((f) => [f.label, f.value] as [string, string]),
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3">
                <dt className="text-muted-foreground shrink-0">{k}</dt>
                <dd className="text-foreground text-right break-all">{v || "–"}</dd>
              </div>
            ))}
          </dl>
        )}

        {tab === "versions" &&
          versions.map((v) => (
            <div key={v.id} className="p-2.5 rounded-lg border border-border space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">
                  v{v.versionNo}
                  {v.versionNo === doc.currentVersionNo && <span className="ml-1.5 text-[11px] text-primary">current</span>}
                </span>
                {r.download && (
                  <a href={`/api/proxy-attachment/${v.id}?download=1`} className="inline-flex items-center gap-1 text-primary">
                    <Download className="h-3 w-3" /> {formatBytes(v.fileSizeBytes)}
                  </a>
                )}
              </div>
              <div className="text-muted-foreground truncate">{v.fileName}</div>
              {v.changeNote && <div className="text-foreground">{v.changeNote}</div>}
              <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                <History className="h-3 w-3" /> {v.uploadedByName} · {when(v.createdAt)}
                {v.qcStatus && (
                  <span className="ml-auto">
                    QC: {v.qcStatus === "UNAPPROVED" ? "waiting" : v.qcStatus.toLowerCase()}
                    {v.qcByName ? ` by ${v.qcByName}` : ""}
                  </span>
                )}
              </div>
            </div>
          ))}

        {tab === "activity" &&
          (activity.length === 0 ? (
            <p className="text-muted-foreground">No activity recorded yet.</p>
          ) : (
            activity.map((a, i) => (
              <div key={i} className="flex items-start gap-2">
                <Clock className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  <div className="text-foreground">
                    {ACTION_LABEL[a.action] || a.action.toLowerCase().replace(/_/g, " ")}
                    {a.details?.version_no ? ` v${a.details.version_no}` : ""}
                    {a.details?.comment ? `: ${a.details.comment}` : a.details?.note ? `: ${a.details.note}` : ""}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {a.actorEmail || "system"} · {when(a.createdAt)}
                  </div>
                </div>
              </div>
            ))
          ))}
      </div>
    </div>
  );
}

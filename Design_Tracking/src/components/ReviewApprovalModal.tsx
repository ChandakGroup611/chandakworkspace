"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { DrawingItem } from "../types";
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileText,
  Plus,
  Trash2,
  Upload,
  QrCode,
  History,
  Loader2,
} from "lucide-react";
import { toast } from "react-toastify";
import { TransactionFormLayout } from "./DesignTransactionLayout";
import { AppCard, AppCardContent, AppCardHeader, AppCardTitle } from "@/components/ui/AppCard";
import {
  fetchDrawingDetailAction,
  reviewDrawingRevisionAction,
  releaseDrawingGfcAction,
  submitDrawingRevisionAction,
  type ReviewCode,
} from "@/lib/actions/dmac-drawings";

interface ReviewApprovalModalProps {
  drawing: DrawingItem | null;
  isOpen: boolean;
  onClose: () => void;
  /** Called after a review, resubmission or GFC release was saved on the server. */
  onReviewRecorded: () => void;
}

type Severity = "LOW" | "MEDIUM" | "HIGH" | "BLOCKER";
type Category = "DESIGN" | "COORDINATION" | "COMPLIANCE" | "DRAFTING";

const CODES: { id: ReviewCode; label: string; desc: string; tone: string }[] = [
  { id: "A", label: "Code A · Approved", desc: "No comments. Can be released for construction.", tone: "border-success-border bg-success-soft text-success-text" },
  { id: "B", label: "Code B · Approved with comments", desc: "Proceed; comments are carried into the next issue.", tone: "border-success-border bg-success-soft text-success-text" },
  { id: "C", label: "Code C · Revise and resubmit", desc: "Returned to design with comments to answer.", tone: "border-warning-border bg-warning-soft text-warning-text" },
  { id: "D", label: "Code D · Rejected", desc: "Not acceptable; a new revision is required.", tone: "border-danger-border bg-danger-soft text-danger-text" },
];

const STATUS_LABEL: Record<string, string> = {
  NOT_SUBMITTED: "Not submitted",
  UNDER_REVIEW: "Under review",
  RETURNED: "Returned to design",
  APPROVED: "Approved, not yet released",
  GFC: "Released for construction (GFC)",
};

export const ReviewApprovalModal: React.FC<ReviewApprovalModalProps> = ({ drawing, isOpen, onClose, onReviewRecorded }) => {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // Review form
  const [code, setCode] = useState<ReviewCode | null>(null);
  const [remarks, setRemarks] = useState("");
  const [newComments, setNewComments] = useState<{ text: string; severity: Severity; category: Category }[]>([]);

  // Resubmission form
  const [file, setFile] = useState<File | null>(null);
  const [cadFile, setCadFile] = useState<File | null>(null);
  const [changeSummary, setChangeSummary] = useState("");
  const [responses, setResponses] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!drawing) return;
    setLoading(true);
    setLoadError(null);
    const res = await fetchDrawingDetailAction(drawing.id);
    if (res.success) setDetail(res.data);
    else setLoadError(res.error);
    setLoading(false);
  }, [drawing]);

  useEffect(() => {
    setCode(null);
    setRemarks("");
    setNewComments([]);
    setFile(null);
    setCadFile(null);
    setChangeSummary("");
    setResponses({});
    void load();
  }, [load]);

  const status: string = detail?.drawing?.current_status || "";
  const revisions: any[] = useMemo(() => detail?.revisions || [], [detail]);
  const current = revisions.find((r) => !r.is_superseded);
  const comments: any[] = detail?.comments || [];
  const openOnCurrent = comments.filter((c) => current && c.revision_id === current.id && c.status === "OPEN");

  if (!isOpen || !drawing) return null;

  const done = async (message: string) => {
    toast.success(message);
    onReviewRecorded();
    onClose();
  };

  const handleRecordDecision = async () => {
    if (!code) return toast.info("Pick a review code.");
    if (code !== "A" && !remarks.trim()) return toast.info(`Remarks are required for code ${code}.`);
    const filled = newComments.filter((c) => c.text.trim());
    if ((code === "C" || code === "D") && filled.length === 0 && openOnCurrent.length === 0) {
      return toast.info("Add at least one comment so the designer knows what to change.");
    }
    setSubmitting(true);
    const res = await reviewDrawingRevisionAction({
      drawingId: drawing.id,
      revisionId: current?.id,
      decisionCode: code,
      remarks,
      comments: filled.map((c) => ({ commentText: c.text, severity: c.severity, category: c.category })),
    });
    setSubmitting(false);
    if (!res.success) return toast.error(res.error);
    await done(`Code ${code} recorded on R${current?.rev_no ?? ""}.`);
  };

  const handleRelease = async () => {
    setSubmitting(true);
    const res = await releaseDrawingGfcAction(drawing.id);
    setSubmitting(false);
    if (!res.success) return toast.error(res.error);
    await done(`${res.data.revision} released for construction.`);
  };

  const handleResubmit = async () => {
    if (!file) return toast.info("Attach the revised sheet (PDF).");
    const missing = openOnCurrent.filter((c) => !String(responses[c.id] || "").trim());
    if (missing.length) return toast.info(`Answer comment #${missing.map((c) => c.comment_number).join(", #")} first.`);
    const fd = new FormData();
    fd.append("drawingId", drawing.id);
    fd.append("file", file);
    if (cadFile) fd.append("cadFile", cadFile);
    fd.append("changeSummary", changeSummary);
    fd.append("responses", JSON.stringify(openOnCurrent.map((c) => ({ commentId: c.id, message: responses[c.id] }))));
    setSubmitting(true);
    const res = await submitDrawingRevisionAction(fd);
    setSubmitting(false);
    if (!res.success) return toast.error(res.error);
    await done(`${res.data.revision} submitted for review.`);
  };

  const primaryAction =
    status === "UNDER_REVIEW"
      ? { label: "Record review decision", run: handleRecordDecision }
      : status === "APPROVED"
      ? { label: "Release for construction (GFC)", run: handleRelease }
      : status === "RETURNED" || status === "NOT_SUBMITTED"
      ? { label: status === "NOT_SUBMITTED" ? "Submit R0 for review" : "Submit next revision", run: handleResubmit }
      : null;

  return (
    <TransactionFormLayout
      title={`Drawing review: ${drawing.code}`}
      badge={drawing.discipline}
      category="Drawing Control"
      icon={ShieldCheck}
      iconBg="bg-primary/15 text-primary border-primary/25"
      description={`Review codes A–D, comment responses and release for construction for ${drawing.project}.`}
      breadcrumbs={[{ label: "Drawing Register", onClick: onClose }, { label: `Review: ${drawing.code}` }]}
      onBack={onClose}
      backLabel="Back to Drawing Register"
      onSave={primaryAction && !loading && !loadError ? (e?: React.FormEvent) => { e?.preventDefault(); void primaryAction.run(); } : undefined}
      saveLabel={primaryAction?.label}
      saveIcon={status === "RETURNED" || status === "NOT_SUBMITTED" ? Upload : status === "APPROVED" ? QrCode : ShieldCheck}
      isSubmitting={submitting}
    >
      <div className="space-y-6 max-w-4xl">
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground p-6">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading the review record…
          </div>
        ) : loadError ? (
          <div className="p-4 rounded-lg border border-danger-border bg-danger-soft text-danger-text text-xs flex gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" /> {loadError}
          </div>
        ) : (
          <>
            <AppCard className="border-border shadow-xs">
              <AppCardHeader className="bg-surface/50 border-b border-border pb-3">
                <AppCardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span>{detail.drawing.drawing_number} · {detail.drawing.title}</span>
                </AppCardTitle>
              </AppCardHeader>
              <AppCardContent className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <Fact label="Status" value={STATUS_LABEL[status] || status} />
                <Fact label="Current revision" value={detail.drawing.display_rev} />
                <Fact label="With" value={detail.drawing.current_holder === "ENGINEERING" ? "Engineering" : detail.drawing.current_holder === "DESIGN" ? "Design" : "Nobody"} />
                <Fact
                  label="Working days in this state"
                  value={`${detail.drawing.days_in_current_state ?? 0}${detail.drawing.is_overdue ? " (overdue)" : ""}`}
                />
                {current?.dmac_revision_files?.map((f: any) => (
                  <a
                    key={f.id}
                    href={`/api/proxy-attachment/${f.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="col-span-2 p-3 rounded-lg border border-border hover:bg-surface-hover text-primary font-semibold truncate"
                  >
                    {f.file_role === "CAD_DWG" ? "CAD: " : "Sheet: "}
                    {f.file_name}
                  </a>
                ))}
              </AppCardContent>
            </AppCard>

            {status === "UNDER_REVIEW" && (
              <AppCard className="border-border shadow-xs">
                <AppCardHeader className="bg-surface/50 border-b border-border pb-3">
                  <AppCardTitle className="text-sm font-semibold">Review decision on R{current?.rev_no}</AppCardTitle>
                </AppCardHeader>
                <AppCardContent className="p-5 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {CODES.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setCode(c.id)}
                        className={`p-4 rounded-lg border text-left transition-all cursor-pointer ${
                          code === c.id ? `${c.tone} ring-2 ring-primary font-semibold` : "border-border bg-background text-muted-foreground hover:bg-surface-hover hover:text-foreground"
                        }`}
                      >
                        <div className="text-sm font-semibold">{c.label}</div>
                        <div className="text-xs opacity-80 mt-1 font-normal">{c.desc}</div>
                      </button>
                    ))}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Remarks {code && code !== "A" ? <span className="text-danger-text">(required)</span> : null}
                    </label>
                    <textarea
                      rows={3}
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="Summary of the review for the record"
                      className="w-full rounded-lg border border-border bg-background p-3 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">
                        Comments {openOnCurrent.length ? `(${openOnCurrent.length} already marked up)` : ""}
                      </span>
                      <button
                        type="button"
                        onClick={() => setNewComments((l) => [...l, { text: "", severity: "MEDIUM", category: "DESIGN" }])}
                        className="text-xs font-semibold text-primary inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add comment
                      </button>
                    </div>
                    {openOnCurrent.map((c) => (
                      <div key={c.id} className="text-xs p-2.5 rounded-lg bg-sunken border border-border">
                        <span className="font-mono font-semibold">#{c.comment_number}</span> · {c.severity} · {c.comment_text}
                      </div>
                    ))}
                    {newComments.map((c, i) => (
                      <div key={i} className="flex flex-col sm:flex-row gap-2">
                        <input
                          value={c.text}
                          onChange={(e) => setNewComments((l) => l.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))}
                          placeholder="What needs to change"
                          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs"
                        />
                        <select
                          value={c.category}
                          onChange={(e) => setNewComments((l) => l.map((x, j) => (j === i ? { ...x, category: e.target.value as Category } : x)))}
                          className="rounded-lg border border-border bg-background px-2 py-2 text-xs"
                        >
                          <option value="DESIGN">Design</option>
                          <option value="COORDINATION">Coordination</option>
                          <option value="COMPLIANCE">Compliance</option>
                          <option value="DRAFTING">Drafting</option>
                        </select>
                        <select
                          value={c.severity}
                          onChange={(e) => setNewComments((l) => l.map((x, j) => (j === i ? { ...x, severity: e.target.value as Severity } : x)))}
                          className="rounded-lg border border-border bg-background px-2 py-2 text-xs"
                        >
                          <option value="LOW">Low</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="HIGH">High</option>
                          <option value="BLOCKER">Blocker</option>
                        </select>
                        <button
                          type="button"
                          aria-label="Remove comment"
                          onClick={() => setNewComments((l) => l.filter((_, j) => j !== i))}
                          className="px-2 text-muted-foreground hover:text-danger-text cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </AppCardContent>
              </AppCard>
            )}

            {status === "APPROVED" && (
              <div className="p-4 rounded-lg border border-success-border bg-success-soft flex items-start gap-3 text-xs text-success-text">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <div>
                  R{current?.rev_no} is approved. Releasing it for construction marks it GFC and gives it a QR code that site
                  staff can scan to confirm it is the current sheet. Earlier GFC sheets of this drawing will show as superseded.
                </div>
              </div>
            )}

            {status === "GFC" && current?.qr_code_token && (
              <a
                href={`/verify-drawing/${current.qr_code_token}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 rounded-lg border border-success-border bg-success-soft flex items-center gap-3 text-xs text-success-text font-semibold"
              >
                <QrCode className="h-5 w-5" /> R{current.rev_no} is the current GFC sheet. Open the site verification page.
              </a>
            )}

            {(status === "RETURNED" || status === "NOT_SUBMITTED") && (
              <AppCard className="border-border shadow-xs">
                <AppCardHeader className="bg-surface/50 border-b border-border pb-3">
                  <AppCardTitle className="text-sm font-semibold">
                    {status === "NOT_SUBMITTED" ? "Submit R0" : `Submit R${(current?.rev_no ?? -1) + 1}`}
                  </AppCardTitle>
                </AppCardHeader>
                <AppCardContent className="p-5 space-y-4 text-xs">
                  {openOnCurrent.length > 0 && (
                    <div className="space-y-2">
                      <span className="font-semibold text-foreground">Answer each open comment on R{current?.rev_no}</span>
                      {openOnCurrent.map((c) => (
                        <div key={c.id} className="space-y-1">
                          <div className="p-2.5 rounded-lg bg-sunken border border-border">
                            <span className="font-mono font-semibold">#{c.comment_number}</span> · {c.severity} · {c.comment_text}
                          </div>
                          <input
                            value={responses[c.id] || ""}
                            onChange={(e) => setResponses((r) => ({ ...r, [c.id]: e.target.value }))}
                            placeholder="How this comment was addressed"
                            className="w-full rounded-lg border border-border bg-background px-3 py-2"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  <label className="block space-y-1">
                    <span className="font-semibold text-foreground">Revised sheet (PDF) *</span>
                    <input type="file" accept=".pdf,.png,.jpg,.jpeg,.tif,.tiff" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                  </label>
                  <label className="block space-y-1">
                    <span className="font-semibold text-foreground">CAD file (optional)</span>
                    <input type="file" accept=".dwg,.dxf,.zip" onChange={(e) => setCadFile(e.target.files?.[0] || null)} />
                  </label>
                  <label className="block space-y-1">
                    <span className="font-semibold text-foreground">What changed</span>
                    <textarea
                      rows={2}
                      value={changeSummary}
                      onChange={(e) => setChangeSummary(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background p-3 resize-none"
                    />
                  </label>
                </AppCardContent>
              </AppCard>
            )}

            <AppCard className="border-border shadow-xs">
              <AppCardHeader className="bg-surface/50 border-b border-border pb-3">
                <AppCardTitle className="text-sm font-semibold flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" /> Revision history
                </AppCardTitle>
              </AppCardHeader>
              <AppCardContent className="p-5 space-y-2 text-xs">
                {revisions.length === 0 && <span className="text-muted-foreground">Nothing submitted yet.</span>}
                {[...revisions].reverse().map((r) => {
                  const step = (r.dmac_review_steps || []).find((s: any) => s.decided_at);
                  const revComments = comments.filter((c) => c.revision_id === r.id);
                  return (
                    <div key={r.id} className="p-3 rounded-lg border border-border space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-semibold">R{r.rev_no}</span>
                        {r.is_gfc && <span className="text-success-text font-semibold">GFC</span>}
                        {r.is_superseded && <span className="text-muted-foreground">superseded</span>}
                        <span className="text-muted-foreground">
                          {r.submitted_by_name ? `${r.submitted_by_name}, ` : ""}
                          {r.submitted_at ? new Date(r.submitted_at).toLocaleDateString("en-IN") : ""}
                        </span>
                        {step && (
                          <span className="font-semibold">
                            Code {step.decision_code}
                            {step.remarks ? `: ${step.remarks}` : ""}
                          </span>
                        )}
                      </div>
                      {r.change_summary && <div className="text-muted-foreground">{r.change_summary}</div>}
                      {revComments.length > 0 && (
                        <div className="text-muted-foreground">
                          {revComments.length} comment{revComments.length === 1 ? "" : "s"},{" "}
                          {revComments.filter((c) => c.status === "OPEN").length} open
                        </div>
                      )}
                    </div>
                  );
                })}
              </AppCardContent>
            </AppCard>
          </>
        )}
      </div>
    </TransactionFormLayout>
  );
};

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="p-3 rounded-lg bg-muted/20 border border-border space-y-1">
      <span className="text-muted-foreground text-[11px] block">{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}

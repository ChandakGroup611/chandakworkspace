import React from "react";
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  Building2,
  Calendar,
  Layers,
  Sparkles,
  ExternalLink,
  Lock
} from "lucide-react";
import { AppCard, AppCardContent, AppCardHeader, AppCardTitle } from "@/components/ui/AppCard";
import { supabaseAdmin } from "@/lib/supabase/service_role";

// Always look the token up at request time.
export const dynamic = "force-dynamic";

interface VerifyPageProps {
  params: Promise<{ token: string }>;
}

interface QrVerificationResult {
  isValid: boolean;
  drawingNumber: string;
  title: string;
  discipline: string;
  projectName: string;
  buildingName: string;
  revisionNumber: string;
  status: "ACTIVE_GFC" | "SUPERSEDED" | "UNDER_REVIEW" | "REJECTED";
  gfcReleasedAt?: string;
  certifiedBy?: string;
  latestApprovedRev?: string;
}

const INVALID_RESULT: QrVerificationResult = {
  isValid: false,
  drawingNumber: "",
  title: "",
  discipline: "",
  projectName: "",
  buildingName: "",
  revisionNumber: "",
  status: "REJECTED",
};

// Looks the QR token up in the drawing register. Anything we cannot match to an issued-for-construction
// revision is shown as "cannot verify", never as valid.
async function lookupQrToken(token: string): Promise<QrVerificationResult> {
  if (!token || !/^[A-Za-z0-9_-]{16,100}$/.test(token)) return INVALID_RESULT;

  const { data: rev, error } = await supabaseAdmin
    .from("dmac_drawing_revisions")
    .select(
      "drawing_id, rev_no, is_gfc, is_superseded, gfc_released_at, " +
        "drawing:dmac_drawings(drawing_number, title, deleted_at, project:dmac_projects(name), building:dmac_buildings(name), department:dmac_departments(name))"
    )
    .eq("qr_code_token", token)
    .maybeSingle();

  const r: any = rev;
  if (error || !r || !r.is_gfc || !r.drawing || r.drawing.deleted_at) return INVALID_RESULT;

  const base = {
    isValid: true,
    drawingNumber: r.drawing.drawing_number,
    title: r.drawing.title,
    discipline: r.drawing.department?.name || "",
    projectName: r.drawing.project?.name || "",
    buildingName: r.drawing.building?.name || "",
    revisionNumber: `R${r.rev_no}`,
    gfcReleasedAt: r.gfc_released_at
      ? new Date(r.gfc_released_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })
      : undefined,
  };

  if (!r.is_superseded) return { ...base, status: "ACTIVE_GFC" };

  const { data: latest } = await supabaseAdmin
    .from("dmac_drawing_revisions")
    .select("rev_no")
    .eq("drawing_id", r.drawing_id)
    .eq("is_gfc", true)
    .eq("is_superseded", false)
    .maybeSingle();

  return {
    ...base,
    status: "SUPERSEDED",
    latestApprovedRev: latest ? `R${latest.rev_no} (GFC)` : "a newer revision",
  };
}

export default async function VerifyDrawingQrPage({ params }: VerifyPageProps) {
  const { token } = await params;
  const data = await lookupQrToken(token);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 antialiased">
      {/* Top Branding */}
      <div className="w-full max-w-md text-center space-y-2 mb-6">
        <div className="h-12 w-12 rounded-lg bg-accent-soft border border-border-active flex items-center justify-center text-primary font-semibold mx-auto">
          C
        </div>
        <h1 className="text-sm font-semibold text-foreground">
          Chandak Group • site execution QR validation
        </h1>
        <p className="text-xs text-muted-foreground font-mono">
          ISO 9001:2015 drawing integrity verification portal
        </p>
      </div>

      {!data.isValid ? (
        <div className="w-full max-w-md bg-surface border border-danger-border rounded-lg p-6 text-center space-y-4 shadow-lg">
          <div className="h-12 w-12 rounded-full bg-danger-soft text-danger-text border border-danger-border flex items-center justify-center mx-auto">
            <XCircle className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Invalid QR code token</h2>
            <p className="text-xs text-muted-foreground mt-1">
              This drawing token is not recognized in the Chandak DMAC central registry. Do not use this drawing for site execution.
            </p>
          </div>
        </div>
      ) : data.status === "ACTIVE_GFC" ? (
        /* 1. ACTIVE GFC (GREEN PASS) */
        <div className="w-full max-w-md bg-surface border-2 border-success-border rounded-lg p-6 shadow-lg space-y-5 animate-in zoom-in-95">
          <div className="text-center space-y-2">
            <div className="h-14 w-14 rounded-full bg-success-soft text-success-text border border-success-border flex items-center justify-center mx-auto ring-4 ring-success-border">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-success text-white shadow-xs">
                ACTIVE GFC • APPROVED FOR SITE
              </span>
              <h2 className="text-lg font-semibold text-foreground mt-3">{data.drawingNumber}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{data.title}</p>
            </div>
          </div>

          <div className="p-4 bg-surface rounded-lg border border-border space-y-2.5 text-xs">
            <div className="flex justify-between pb-2 border-b border-border">
              <span className="text-muted-foreground">Revision Status:</span>
              <strong className="font-mono text-success-text">{data.revisionNumber} (Active GFC)</strong>
            </div>
            <div className="flex justify-between pb-2 border-b border-border">
              <span className="text-muted-foreground">Discipline:</span>
              <strong className="text-foreground">{data.discipline}</strong>
            </div>
            <div className="flex justify-between pb-2 border-b border-border">
              <span className="text-muted-foreground">Project / Building:</span>
              <strong className="text-foreground">{data.projectName} • {data.buildingName}</strong>
            </div>
            <div className="flex justify-between pb-2 border-b border-border">
              <span className="text-muted-foreground">GFC certified date:</span>
              <strong className="text-foreground">{data.gfcReleasedAt}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Certified By:</span>
              <strong className="text-foreground">{data.certifiedBy || "—"}</strong>
            </div>
          </div>

          <p className="text-[11px] text-center text-muted-foreground">
            Digital seal verified against database. This drawing sheet is valid for live construction.
          </p>
        </div>
      ) : (
        /* 2. SUPERSEDED REVISION (RED DANGER ALERT) */
        <div className="w-full max-w-md bg-surface border-2 border-danger-border rounded-lg p-6 shadow-lg space-y-5 animate-in zoom-in-95">
          <div className="text-center space-y-2">
            <div className="h-14 w-14 rounded-full bg-danger-soft text-danger-text border border-danger-border flex items-center justify-center mx-auto ring-4 ring-danger-border">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <div>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-danger-solid text-white shadow-xs">
                SUPERSEDED • DO NOT EXECUTE ON SITE
              </span>
              <h2 className="text-lg font-semibold text-foreground mt-3">{data.drawingNumber}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{data.title}</p>
            </div>
          </div>

          <div className="p-4 bg-danger-soft border border-danger-border rounded-lg text-xs space-y-2 text-danger-text">
            <p className="font-semibold flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 shrink-0 text-danger-text" />
              <span>WARNING: this revision ({data.revisionNumber}) has been superseded.</span>
            </p>
            <p className="text-[11px] leading-relaxed">
              Construction using this drawing is strictly prohibited. An updated revision{" "}
              <strong>{data.latestApprovedRev || "A newer revision"}</strong> has been released. Please obtain the latest stamp from the site office.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

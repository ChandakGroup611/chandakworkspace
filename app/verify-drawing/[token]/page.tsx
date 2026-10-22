"use client";

import React, { useState, useEffect, use } from "react";
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

export default function VerifyDrawingQrPage({ params }: VerifyPageProps) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;

  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<QrVerificationResult | null>(null);

  useEffect(() => {
    // Simulated / live verification endpoint
    const verifyToken = async () => {
      setLoading(true);
      try {
        // Mock verification response matching the token
        setTimeout(() => {
          const isSuperseded = token.includes("old") || token.includes("r0");
          setData({
            isValid: true,
            drawingNumber: "TA-STR-F08-01",
            title: "Tower a - 8th floor typical slab structural layout",
            discipline: "Structural Engineering",
            projectName: "Tower A (G+10)",
            buildingName: "Tower A",
            revisionNumber: isSuperseded ? "R0" : "R1",
            status: isSuperseded ? "SUPERSEDED" : "ACTIVE_GFC",
            gfcReleasedAt: "08 Oct 2026",
            certifiedBy: "Lead Structural Engineer",
            latestApprovedRev: isSuperseded ? "R1 (GFC)" : undefined,
          });
          setLoading(false);
        }, 300);
      } catch (err) {
        setLoading(false);
      }
    };
    verifyToken();
  }, [token]);

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

      {loading ? (
        <div className="w-full max-w-md bg-surface border border-border rounded-lg p-8 text-center space-y-3 shadow-lg animate-pulse">
          <ShieldCheck className="h-10 w-10 mx-auto text-primary stroke-1" />
          <p className="text-xs font-semibold text-muted-foreground">Verifying digital QR token with registry…</p>
        </div>
      ) : !data?.isValid ? (
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
              <strong className="text-foreground">{data.certifiedBy}</strong>
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
              <strong>{data.latestApprovedRev || "R1"}</strong> has been released. Please obtain the latest stamp from the site office.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

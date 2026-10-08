"use client";

import React, { useState, useEffect, use } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  Key,
  Mail,
  FileText,
  Download,
  Eye,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  Send,
  Layers,
  Sparkles,
  ArrowRight,
  Info,
  Building2,
  RotateCcw
} from "lucide-react";
import { AppCard, AppCardContent, AppCardHeader, AppCardTitle } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import {
  fetchSharePublicMetadataAction,
  requestShareOtpAction,
  verifyShareAccessAction,
  SharePublicMetadata,
  SharedItemDetail
} from "@/lib/actions/dms-share-portal";

interface SharePageProps {
  params: Promise<{ token: string }>;
}

export default function SecureSharePortalPage({ params }: SharePageProps) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;

  // Metadata State (Safe Links immune)
  const [meta, setMeta] = useState<SharePublicMetadata | null>(null);
  const [isLoadingMeta, setIsLoadingMeta] = useState<boolean>(true);

  // Challenge State
  const [step, setStep] = useState<"EMAIL" | "CHALLENGE" | "UNLOCKED">("EMAIL");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [otp, setOtp] = useState<string>("");
  const [isSendingOtp, setIsSendingOtp] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [challengeError, setChallengeError] = useState<string>("");

  // Unlocked State
  const [sessionToken, setSessionToken] = useState<string>("");
  const [sharedItems, setSharedItems] = useState<SharedItemDetail[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [watermarkText, setWatermarkText] = useState<string>("");
  const [permissions, setPermissions] = useState<{
    allowView: boolean;
    allowComment: boolean;
    allowUploadRevision: boolean;
    allowDownload: boolean;
  }>({
    allowView: true,
    allowComment: false,
    allowUploadRevision: false,
    allowDownload: false,
  });

  // Step 1: Fetch safe public metadata
  useEffect(() => {
    const loadMetadata = async () => {
      setIsLoadingMeta(true);
      try {
        const data = await fetchSharePublicMetadataAction(token);
        setMeta(data);
      } catch (err) {
        console.error("Failed to load share metadata:", err);
      } finally {
        setIsLoadingMeta(false);
      }
    };
    loadMetadata();
  }, [token]);

  // Request OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSendingOtp(true);
    setChallengeError("");
    try {
      const res = await requestShareOtpAction({
        rawToken: token,
        email: email.trim(),
      });
      if (res.success) {
        setStep("CHALLENGE");
      } else {
        setChallengeError(res.error || "Could not send verification code.");
      }
    } catch (err: any) {
      setChallengeError(err.message || "Failed to dispatch verification code.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Verify Credentials & Unlock
  const handleVerifyChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) return;

    setIsVerifying(true);
    setChallengeError("");
    try {
      const res = await verifyShareAccessAction({
        rawToken: token,
        email: email.trim(),
        password: password.trim(),
        otp: otp.trim(),
        deviceFingerprint: typeof navigator !== "undefined" ? navigator.userAgent : "browser",
      });

      if (res.success && res.sessionToken) {
        setSessionToken(res.sessionToken);
        setSharedItems(res.items || []);
        if (res.items && res.items.length > 0) {
          setSelectedItemId(res.items[0].id);
        }
        if (res.watermarkText) setWatermarkText(res.watermarkText);
        if (res.permissions) setPermissions(res.permissions);
        setStep("UNLOCKED");
      } else {
        setChallengeError(res.error || "Verification failed.");
      }
    } catch (err: any) {
      setChallengeError(err.message || "Authentication error.");
    } finally {
      setIsVerifying(false);
    }
  };

  const selectedItem = sharedItems.find((item) => item.id === selectedItemId) || sharedItems[0];
  const hasDwgFile = sharedItems.some((i) => i.fileName.toLowerCase().endsWith(".dwg"));

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col antialiased">
      {/* 1. TOP SECURE BANNER */}
      <header className="h-14 border-b border-border bg-surface px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-theme-btn-primary/10 border border-theme-btn-primary/25 flex items-center justify-center text-theme-btn-primary font-black">
            C
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-foreground block">
              CHANDAK GROUP • SECURE DOCUMENT PORTAL
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
              Protected by 6-Layer RBAC & End-to-End Watermarking
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {step === "UNLOCKED" ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Session Authenticated</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Identity Verification Required</span>
            </span>
          )}
        </div>
      </header>

      {/* 2. BODY VIEWPORT */}
      <main className="flex-1 flex items-center justify-center p-4">
        {isLoadingMeta ? (
          <div className="text-center py-12 text-muted-foreground space-y-3 animate-pulse">
            <ShieldCheck className="h-10 w-10 mx-auto text-theme-btn-primary stroke-1" />
            <p className="text-xs font-semibold">Establishing encrypted handshake...</p>
          </div>
        ) : !meta?.isValid ? (
          /* INVALID / EXPIRED / LOCKED CARD */
          <div className="max-w-md w-full bg-surface border border-border rounded-xl p-6 shadow-xl text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center mx-auto">
              {meta?.isLocked ? <ShieldAlert className="h-6 w-6" /> : <Clock className="h-6 w-6" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                {meta?.isLocked ? "Access Locked" : "Link Expired or Invalid"}
              </h3>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                {meta?.errorMessage || "This secure document link is no longer accessible."}
              </p>
            </div>
            <p className="text-[11px] text-muted-foreground pt-2 border-t border-border">
              Contact the issuing Chandak Group Engineering or Design Lead to request a revised access invitation.
            </p>
          </div>
        ) : step === "EMAIL" ? (
          /* STEP 1: EMAIL IDENTIFICATION CARD */
          <div className="max-w-md w-full bg-surface border border-border rounded-xl p-6 shadow-xl space-y-5">
            <div className="text-center space-y-1.5">
              <div className="h-11 w-11 rounded-full bg-theme-btn-primary/10 text-theme-btn-primary border border-theme-btn-primary/20 flex items-center justify-center mx-auto">
                <Lock className="h-5 w-5" />
              </div>
              <h2 className="text-base font-bold text-foreground">Authorized Consultant Access</h2>
              <p className="text-xs text-muted-foreground">
                Documents for <strong className="font-semibold text-foreground">{meta.workspaceName}</strong>
              </p>
            </div>

            {meta.recipientEmailMasked && (
              <div className="p-3 bg-surface border border-border rounded-lg text-xs text-muted-foreground text-center">
                This document dossier was shared with:{" "}
                <strong className="font-mono text-foreground">{meta.recipientEmailMasked}</strong>
              </div>
            )}

            {challengeError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/25 rounded-lg flex items-start gap-2 text-xs text-rose-600 dark:text-rose-400">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{challengeError}</span>
              </div>
            )}

            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                  Your Work Email Address *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@consultant.com"
                    required
                    className="w-full text-xs rounded-lg bg-surface border border-border pl-9 pr-3 py-2.5 text-foreground focus:ring-1 focus:ring-theme-btn-primary"
                    autoFocus
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSendingOtp || !email.trim()}
                className="w-full py-2.5 text-xs font-bold rounded-lg bg-theme-btn-primary text-theme-btn-primary-text hover:brightness-110 shadow-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <span>{isSendingOtp ? "Dispatching Code..." : "Send Verification Passcode"}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <div className="text-[11px] text-center text-muted-foreground">
              A 6-digit one-time code will be dispatched to verify your identity.
            </div>
          </div>
        ) : step === "CHALLENGE" ? (
          /* STEP 2: PASSWORD + OTP CHALLENGE CARD */
          <div className="max-w-md w-full bg-surface border border-border rounded-xl p-6 shadow-xl space-y-5">
            <div className="text-center space-y-1.5">
              <div className="h-11 w-11 rounded-full bg-theme-btn-primary/10 text-theme-btn-primary border border-theme-btn-primary/20 flex items-center justify-center mx-auto">
                <Key className="h-5 w-5" />
              </div>
              <h2 className="text-base font-bold text-foreground">Dual-Challenge Authentication</h2>
              <p className="text-xs text-muted-foreground">
                Code sent to <strong className="font-semibold text-foreground">{email}</strong>
              </p>
            </div>

            {challengeError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/25 rounded-lg flex items-start gap-2 text-xs text-rose-600 dark:text-rose-400">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{challengeError}</span>
              </div>
            )}

            <form onSubmit={handleVerifyChallenge} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                  Link Access Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter link password if provided..."
                  className="w-full text-xs rounded-lg bg-surface border border-border p-2.5 text-foreground focus:ring-1 focus:ring-theme-btn-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                  6-Digit One-Time Passcode *
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  required
                  className="w-full text-center text-lg font-mono font-bold tracking-widest rounded-lg bg-surface border border-border p-2.5 text-foreground focus:ring-1 focus:ring-theme-btn-primary"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={isVerifying || otp.length < 6}
                className="w-full py-2.5 text-xs font-bold rounded-lg bg-theme-btn-primary text-theme-btn-primary-text hover:brightness-110 shadow-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>{isVerifying ? "Verifying Credentials..." : "Unlock Shared Workspace"}</span>
              </button>
            </form>

            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setStep("EMAIL")}
                className="hover:underline"
              >
                &larr; Change Email
              </button>
              <button
                type="button"
                onClick={handleRequestOtp}
                disabled={isSendingOtp}
                className="hover:underline text-theme-btn-primary font-bold"
              >
                Resend Code
              </button>
            </div>
          </div>
        ) : (
          /* STEP 3: UNLOCKED CONSULTANT WORKSPACE */
          <div className="w-full max-w-7xl h-[calc(100vh-6rem)] flex flex-col md:flex-row gap-4">
            {/* LEFT PANEL: SHARED ITEMS LIST */}
            <aside className="w-full md:w-80 bg-surface border border-border rounded-xl p-4 flex flex-col shrink-0 shadow-xs">
              <div className="pb-3 border-b border-border">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                  Shared Dossier Items ({sharedItems.length})
                </span>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Click an item to render watermarked preview.
                </p>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 mt-3 pr-1">
                {sharedItems.map((item) => {
                  const isSelected = selectedItemId === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedItemId(item.id)}
                      className={`p-3 rounded-lg border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-theme-btn-primary/10 border-theme-btn-primary ring-1 ring-theme-btn-primary/20"
                          : "bg-surface hover:bg-surface border-border"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono text-xs font-bold text-foreground truncate">
                          {item.codeOrNumber}
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-theme-btn-primary/15 text-theme-btn-primary">
                          {item.versionOrRev}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-foreground mt-1 truncate">
                        {item.title}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-2">
                        <span>{item.disciplineOrType}</span>
                        <span>{(item.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </aside>

            {/* MAIN STAGE: WATERMARKED PREVIEW & ACTIONS */}
            <main className="flex-1 bg-surface border border-border rounded-xl flex flex-col overflow-hidden shadow-xs">
              {/* Top Viewport Header */}
              <div className="h-12 border-b border-border px-5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-4 w-4 text-theme-btn-primary shrink-0" />
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-foreground truncate block">
                      {selectedItem?.title || "Document Preview"}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {selectedItem?.fileName} • {selectedItem?.versionOrRev}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {permissions.allowDownload ? (
                    <a
                      href={`/api/proxy-attachment/${selectedItem?.id}`}
                      download
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-theme-btn-primary text-theme-btn-primary-text hover:brightness-110 shadow-xs"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download Raw File</span>
                    </a>
                  ) : (
                    <span className="text-[11px] font-medium text-muted-foreground px-2 py-1 bg-surface border border-border rounded-md">
                      View-Only Protected
                    </span>
                  )}
                </div>
              </div>

              {/* DWG WATERMARK TECHNICAL DISCLAIMER (FR-268) */}
              {hasDwgFile && (
                <div className="p-2.5 bg-amber-500/10 border-b border-amber-500/25 px-5 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300 shrink-0">
                  <Info className="h-4 w-4 shrink-0" />
                  <span>
                    <strong>Technical Notice:</strong> Raw DWG CAD files cannot carry dynamic visual watermarks. Dynamic vector watermarking applies to rendered PDF/raster sheets.
                  </span>
                </div>
              )}

              {/* WATERMARKED PREVIEW STAGE */}
              <div className="flex-1 overflow-auto p-6 flex items-center justify-center relative bg-surface/50">
                {/* Dynamic Visual Watermark Overlay */}
                {watermarkText && (
                  <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-around p-8 select-none overflow-hidden opacity-25">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className="text-xs sm:text-sm font-mono font-bold tracking-widest text-slate-900 dark:text-slate-100 -rotate-12 whitespace-nowrap"
                      >
                        {watermarkText}
                      </div>
                    ))}
                  </div>
                )}

                {/* Simulated / Real PDF Viewer Stage */}
                <div className="bg-white rounded-lg shadow-2xl border border-border w-[800px] h-[950px] p-8 flex flex-col justify-between text-slate-800 relative z-10">
                  <div className="flex justify-between items-start border-b border-slate-300 pb-3">
                    <div>
                      <h3 className="text-lg font-black tracking-tight text-slate-900">
                        CHANDAK GROUP • ENGINEERING
                      </h3>
                      <p className="text-xs font-semibold text-slate-600">
                        {selectedItem?.title} • {selectedItem?.versionOrRev}
                      </p>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-500">
                      {selectedItem?.codeOrNumber}
                    </span>
                  </div>

                  <div className="flex-1 my-6 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center bg-slate-50 text-center p-6 space-y-2">
                    <div>
                      <Layers className="h-12 w-12 text-slate-400 mx-auto stroke-1" />
                      <p className="text-xs font-bold text-slate-600 mt-2">
                        Watermarked Document Preview Stage
                      </p>
                      <p className="text-[11px] text-slate-400 max-w-sm">
                        Rendered with verified session binding for {email}. All access actions are logged in the immutable audit register.
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-slate-300 pt-3 flex justify-between text-[11px] font-mono text-slate-500">
                    <div>CONFIDENTIAL • RECIPIENT: {email}</div>
                    <div>DATE: {new Date().toLocaleDateString("en-IN")}</div>
                  </div>
                </div>
              </div>
            </main>
          </div>
        )}
      </main>
    </div>
  );
}

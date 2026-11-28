"use client";

import React, { use, useEffect, useState } from "react";
import { AlertCircle, ArrowRight, Clock, Download, FileText, Info, Key, Lock, LogOut, Mail, ShieldAlert, ShieldCheck } from "lucide-react";
import {
  endShareSessionAction,
  fetchShareContentAction,
  fetchSharePublicMetadataAction,
  requestShareOtpAction,
  verifyShareAccessAction,
  type ShareContent,
  type SharePublicMetadata,
} from "@/lib/actions/dms-share-portal";

/**
 * Public page for documents shared outside the company. Opening the link costs nothing (mail
 * scanners can fetch it safely); the recipient then enters their email, gets a one-time code
 * there, and enters it (plus the link password, when there is one). All checks run on the server.
 */

const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }) : "";
const fmtSize = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

export default function SharePortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);

  const [meta, setMeta] = useState<SharePublicMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<"EMAIL" | "CODE" | "OPEN">("EMAIL");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [content, setContent] = useState<ShareContent | null>(null);
  const [selectedId, setSelectedId] = useState("");

  const lock = (message: string) => setMeta((m) => ({ ...(m || { allowDownload: false }), isValid: false, isExpired: false, isLocked: true, errorMessage: message }));

  useEffect(() => {
    (async () => {
      setLoading(true);
      const m = await fetchSharePublicMetadataAction(token);
      setMeta(m);
      if (m.isValid && m.hasSession) {
        const r = await fetchShareContentAction(token);
        if (r.success && r.content) {
          setContent(r.content);
          setSelectedId(r.content.items[0]?.id || "");
          setStep("OPEN");
        }
      }
      setLoading(false);
    })();
  }, [token]);

  const requestCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setError("");
    const r = await requestShareOtpAction({ rawToken: token, email });
    setBusy(false);
    if (r.success) setStep("CODE");
    else if (r.locked) lock(r.error || "This link is locked.");
    else setError(r.error || "Could not send the code.");
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const r = await verifyShareAccessAction({ rawToken: token, email, password, otp });
    setBusy(false);
    if (r.success && r.content) {
      setContent(r.content);
      setSelectedId(r.content.items[0]?.id || "");
      setStep("OPEN");
    } else if (r.locked) lock(r.error || "This link is locked.");
    else setError(r.error || "Could not verify.");
  };

  const signOut = async () => {
    await endShareSessionAction(token);
    setContent(null);
    setOtp("");
    setPassword("");
    setStep("EMAIL");
  };

  const selected = content?.items.find((i) => i.id === selectedId) || content?.items[0];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col antialiased">
      <header className="h-14 border-b border-border bg-surface px-4 sm:px-6 flex items-center justify-between shrink-0 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-accent-soft border border-border-active flex items-center justify-center text-primary font-semibold shrink-0">C</div>
          <div className="min-w-0">
            <span className="text-xs font-semibold block truncate">Chandak Group · Shared documents</span>
            <span className="text-[11px] text-muted-foreground block truncate">
              {step === "OPEN" && content ? `Signed in as ${content.recipientEmail}` : "Verification required"}
            </span>
          </div>
        </div>
        {step === "OPEN" && (
          <button onClick={signOut} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md border border-border hover:bg-sunken">
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        )}
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        {loading ? (
          <div className="text-center text-muted-foreground space-y-2">
            <ShieldCheck className="h-9 w-9 mx-auto text-primary stroke-1 animate-pulse" />
            <p className="text-xs">Checking the link…</p>
          </div>
        ) : !meta?.isValid ? (
          <div className="max-w-md w-full bg-surface border border-border rounded-lg p-6 shadow-lg text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-danger-soft text-danger-text border border-danger-border flex items-center justify-center mx-auto">
              {meta?.isLocked ? <ShieldAlert className="h-6 w-6" /> : <Clock className="h-6 w-6" />}
            </div>
            <div>
              <h1 className="text-base font-semibold">{meta?.isLocked ? "This link is locked" : meta?.isExpired ? "This link has expired" : "This link does not work"}</h1>
              <p className="text-xs text-muted-foreground mt-1.5">{meta?.errorMessage}</p>
            </div>
            <p className="text-[11px] text-muted-foreground pt-2 border-t border-border">Ask the person at Chandak Group who sent it for a new link.</p>
          </div>
        ) : step !== "OPEN" ? (
          <div className="max-w-md w-full bg-surface border border-border rounded-lg p-6 shadow-lg space-y-5">
            <div className="text-center space-y-1.5">
              <div className="h-11 w-11 rounded-full bg-accent-soft text-primary border border-border-active flex items-center justify-center mx-auto">
                {step === "EMAIL" ? <Lock className="h-5 w-5" /> : <Key className="h-5 w-5" />}
              </div>
              <h1 className="text-base font-semibold">{meta.title || "Documents shared with you"}</h1>
              <p className="text-xs text-muted-foreground">
                From <strong className="text-foreground">{meta.sharedByName}</strong> · available until {fmtDate(meta.expiresAt)}
              </p>
            </div>

            {meta.message && step === "EMAIL" && (
              <p className="text-xs whitespace-pre-wrap border-l-2 border-border pl-3 text-muted-foreground">{meta.message}</p>
            )}

            {error && (
              <div className="p-3 bg-danger-soft border border-danger-border rounded-lg flex items-start gap-2 text-xs text-danger-text">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {step === "EMAIL" ? (
              <form onSubmit={requestCode} className="space-y-4">
                <div className="p-3 bg-sunken border border-border rounded-lg text-xs text-muted-foreground text-center">
                  Shared with <strong className="font-mono text-foreground">{meta.recipientEmailMasked}</strong>
                </div>
                <label className="block">
                  <span className="text-xs font-semibold text-muted-foreground block mb-1">Your email address</span>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      required
                      autoFocus
                      autoComplete="email"
                      className="w-full text-sm rounded-lg bg-surface border border-border pl-9 pr-3 py-2.5 focus:ring-1 focus:ring-ring"
                    />
                  </div>
                </label>
                <p className="text-[11px] text-muted-foreground">
                  Type the address this was sent to. For safety, a different address locks the link.
                </p>
                <button
                  type="submit"
                  disabled={busy || !email.trim()}
                  className="w-full py-2.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {busy ? "Sending…" : "Email me a code"} <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            ) : (
              <form onSubmit={verify} className="space-y-4">
                <p className="text-xs text-muted-foreground text-center">
                  We sent a 6-digit code to <strong className="text-foreground">{email}</strong>. It expires in 10 minutes.
                </p>
                {meta.requiresPassword && (
                  <label className="block">
                    <span className="text-xs font-semibold text-muted-foreground block mb-1">Password from the sender</span>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="off"
                      className="w-full text-sm rounded-lg bg-surface border border-border p-2.5 focus:ring-1 focus:ring-ring"
                    />
                  </label>
                )}
                <label className="block">
                  <span className="text-xs font-semibold text-muted-foreground block mb-1">Code</span>
                  <input
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    required
                    autoFocus
                    className="w-full text-center text-lg font-mono font-semibold tracking-widest rounded-lg bg-surface border border-border p-2.5 focus:ring-1 focus:ring-ring"
                  />
                </label>
                <button
                  type="submit"
                  disabled={busy || otp.length < 6 || (meta.requiresPassword && !password)}
                  className="w-full py-2.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="h-4 w-4" /> {busy ? "Checking…" : "Open documents"}
                </button>
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
                  <button type="button" onClick={() => { setStep("EMAIL"); setError(""); }} className="hover:underline">
                    Change email
                  </button>
                  <button type="button" onClick={() => requestCode()} disabled={busy} className="hover:underline text-primary font-semibold">
                    Send a new code
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : content ? (
          <div className="w-full max-w-7xl h-[calc(100vh-6rem)] flex flex-col md:flex-row gap-4">
            <aside className="w-full md:w-80 bg-surface border border-border rounded-lg p-3 flex flex-col shrink-0 max-h-60 md:max-h-none">
              <div className="pb-2 border-b border-border text-xs">
                <span className="font-semibold">{content.items.length} document{content.items.length === 1 ? "" : "s"}</span>
                <span className="text-muted-foreground"> · until {fmtDate(content.expiresAt)}</span>
                {content.downloadsLeft !== null && (
                  <span className="block text-[11px] text-muted-foreground mt-0.5">{content.downloadsLeft} download{content.downloadsLeft === 1 ? "" : "s"} left</span>
                )}
              </div>
              <div className="flex-1 overflow-y-auto space-y-1.5 mt-2">
                {content.items.length === 0 && <p className="text-xs text-muted-foreground p-2">The documents in this share have been withdrawn.</p>}
                {content.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    className={`w-full text-left p-2.5 rounded-lg border ${item.id === selected?.id ? "bg-accent-soft border-primary" : "border-border hover:bg-sunken"}`}
                  >
                    <span className="text-xs font-medium block truncate">{item.title}</span>
                    <span className="text-[11px] text-muted-foreground flex justify-between mt-0.5">
                      <span className="truncate">{item.disciplineOrType} · {item.versionOrRev}</span>
                      <span>{fmtSize(item.fileSizeBytes)}</span>
                    </span>
                  </button>
                ))}
              </div>
            </aside>

            <section className="flex-1 bg-surface border border-border rounded-lg flex flex-col overflow-hidden min-h-[60vh]">
              {selected ? (
                <>
                  <div className="h-12 border-b border-border px-4 flex items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-xs font-semibold truncate">{selected.fileName}</span>
                    </div>
                    {selected.downloadUrl && content.downloadsLeft !== 0 ? (
                      <a
                        href={selected.downloadUrl}
                        onClick={() => {
                          setContent((prev) =>
                            prev && prev.downloadsLeft !== null
                              ? { ...prev, downloadsLeft: Math.max(0, prev.downloadsLeft - 1) }
                              : prev
                          );
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:brightness-110 shrink-0"
                      >
                        <Download className="h-3.5 w-3.5" /> Download
                      </a>
                    ) : (
                      <span className="text-[11px] text-muted-foreground px-2 py-1 border border-border rounded-md shrink-0">View only</span>
                    )}
                  </div>
                  <div className="relative flex-1 overflow-auto bg-sunken" onContextMenu={(e) => e.preventDefault()}>
                    {selected.preview === "image" ? (
                      // Watermark is burned into the image on the server
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={selected.viewUrl} alt={selected.title} className="max-w-full mx-auto select-none" draggable={false} />
                    ) : selected.preview === "pdf" ? (
                      <>
                        <iframe key={selected.id} src={`${selected.viewUrl}#toolbar=0&navpanes=0`} title={selected.title} className="w-full h-full min-h-[60vh] border-0" />
                        <div className="absolute inset-0 pointer-events-none select-none overflow-hidden flex flex-col justify-around opacity-20">
                          {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="text-sm font-mono font-semibold whitespace-nowrap -rotate-12">
                              {content.watermarkText}
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="h-full flex items-center justify-center p-6 text-center">
                        <div className="space-y-2 max-w-sm">
                          <Info className="h-8 w-8 mx-auto text-muted-foreground stroke-1" />
                          <p className="text-xs text-muted-foreground">
                            This file type cannot be shown in the browser.{" "}
                            {selected.downloadUrl ? "Use Download to open it on your computer." : "Ask the sender for a PDF copy."}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="px-4 py-2 border-t border-border text-[11px] text-muted-foreground font-mono truncate">{content.watermarkText}</div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">Nothing to show.</div>
              )}
            </section>
          </div>
        ) : null}
      </main>
    </div>
  );
}

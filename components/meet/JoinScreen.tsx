"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mic, MicOff, Video, VideoOff, Loader2, CheckCircle2, ChevronLeft, ExternalLink } from "lucide-react";
import { requestToJoin, getMyJoinStatus, markJoined, type JoinContext } from "@/lib/actions/meet/join";

const IST = "Asia/Kolkata";
const btnPrimary =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 text-[15px] font-semibold text-primary-foreground transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60";
const btnSecondary =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface px-5 text-[15px] font-semibold text-foreground transition-colors hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60";

/**
 * Join screen (Zoho-style lobby): check camera and mic, then join. People who weren't invited
 * press "Ask to join" and wait here until the host admits them.
 */
export default function JoinScreen({ ctx, initials }: { ctx: JoinContext; initials: string }) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [camOn, setCamOn] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [previewStarted, setPreviewStarted] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [status, setStatus] = useState<JoinContext["request"] | "entered">(ctx.canEnter ? "admitted" : ctx.request);
  const [videoLink, setVideoLink] = useState<string | null>(ctx.videoLink);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Camera / mic preview stays on this device; nothing is sent anywhere.
  const startPreview = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("This browser can't use the camera.");
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCamError(null);
      setPreviewStarted(true);
      setCamOn(true);
    } catch (e: any) {
      setCamError(e?.name === "NotAllowedError" ? "Camera and microphone are blocked for this site. Allow them in the browser's address bar." : "No camera or microphone found.");
      setCamOn(false);
    }
  }, []);

  // The camera starts only when the person asks for it ("Check camera and mic").
  useEffect(() => {
    return () => streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  useEffect(() => {
    streamRef.current?.getVideoTracks().forEach((t) => (t.enabled = camOn));
  }, [camOn]);
  useEffect(() => {
    streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = micOn));
  }, [micOn]);

  // While waiting for the host, check every 4 seconds
  useEffect(() => {
    if (status !== "requested") return;
    const t = setInterval(async () => {
      try {
        const r = await getMyJoinStatus(ctx.sessionId);
        if (r.status !== "requested") {
          setStatus(r.status);
          setVideoLink(r.videoLink);
        }
      } catch {}
    }, 4000);
    return () => clearInterval(t);
  }, [status, ctx.sessionId]);

  const ask = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await requestToJoin(ctx.sessionId);
      if (!r.success) setError(r.error || "Couldn't send your request.");
      else setStatus(r.status || "requested");
    } finally {
      setBusy(false);
    }
  };

  const workspaceHref = ctx.isHost ? `/meet/live/${ctx.sessionId}` : `/meet/sessions/${ctx.sessionId}`;

  const join = async (viaTeams: boolean) => {
    setBusy(true);
    try {
      await markJoined(ctx.sessionId).catch(() => null);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (viaTeams && videoLink) window.open(videoLink, "_blank", "noopener,noreferrer");
      setStatus("entered");
      router.push(workspaceHref);
    } finally {
      setBusy(false);
    }
  };

  const start = new Date(ctx.scheduledStart);
  const timeLabel =
    start.toLocaleDateString("en-IN", { timeZone: IST, weekday: "short", day: "numeric", month: "short" }) +
    ", " +
    start.toLocaleTimeString("en-IN", { timeZone: IST, hour: "numeric", minute: "2-digit" }) +
    (ctx.scheduledEnd ? ` – ${new Date(ctx.scheduledEnd).toLocaleTimeString("en-IN", { timeZone: IST, hour: "numeric", minute: "2-digit" })}` : "");

  const ended = ["mom_published", "cancelled"].includes(ctx.status);

  return (
    <div className="space-y-5 pb-6">
      <Link href="/meet" className="inline-flex items-center gap-1 text-[13.5px] font-medium text-muted hover:text-foreground">
        <ChevronLeft className="h-4 w-4" aria-hidden /> Back
      </Link>

      <div className="flex flex-wrap items-center justify-center gap-10">
        {/* Preview */}
        <div className="w-full max-w-[680px] flex-[1_1_480px] space-y-4">
          <div className="relative aspect-video overflow-hidden rounded-2xl bg-[#1E2235]">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              aria-label="Your camera preview"
              className={`h-full w-full -scale-x-100 object-cover ${camOn && !camError ? "" : "hidden"}`}
            />
            {(!camOn || camError) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
                <span className="inline-flex h-24 w-24 items-center justify-center rounded-full bg-[#E0E7FF] text-[30px] font-bold text-[#3730A3]">{initials}</span>
                {!previewStarted && !camError ? (
                  <>
                    <button
                      type="button"
                      onClick={startPreview}
                      className="inline-flex h-10 items-center rounded-lg bg-white px-4 text-[14px] font-semibold text-[#0F172A] hover:bg-[#F1F3F8] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Check camera and mic
                    </button>
                    <span className="text-[12.5px] text-[#C9CEE0]">Optional. You can join without it.</span>
                  </>
                ) : (
                  <span className="text-[14px] text-[#C9CEE0]">{camError || "Camera is off"}</span>
                )}
              </div>
            )}
            <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 gap-3 ${previewStarted ? "flex" : "hidden"}`}>
              <button
                type="button"
                onClick={() => setMicOn((v) => !v)}
                aria-pressed={!micOn}
                aria-label={micOn ? "Turn microphone off" : "Turn microphone on"}
                className={`inline-flex h-12 w-12 items-center justify-center rounded-full text-white ${micOn ? "bg-[#2D3352] hover:bg-[#3B4266]" : "bg-danger"}`}
              >
                {micOn ? <Mic className="h-5 w-5" aria-hidden /> : <MicOff className="h-5 w-5" aria-hidden />}
              </button>
              <button
                type="button"
                onClick={() => (camError ? startPreview().then(() => setCamOn(true)) : setCamOn((v) => !v))}
                aria-pressed={!camOn}
                aria-label={camOn ? "Turn camera off" : "Turn camera on"}
                className={`inline-flex h-12 w-12 items-center justify-center rounded-full text-white ${camOn && !camError ? "bg-[#2D3352] hover:bg-[#3B4266]" : "bg-danger"}`}
              >
                {camOn && !camError ? <Video className="h-5 w-5" aria-hidden /> : <VideoOff className="h-5 w-5" aria-hidden />}
              </button>
            </div>
          </div>
          <p className="text-center text-[12.5px] text-muted">The preview only shows on your screen. Camera and mic settings carry into Teams.</p>
        </div>

        {/* Join panel */}
        <div className="w-full max-w-[420px] flex-[1_1_320px] space-y-5">
          <div>
            <p className="text-[13.5px] text-subtle">
              {ctx.meetingCode ? `${ctx.meetingCode} · ` : ""}
              {timeLabel}
            </p>
            <h1 className="mt-1 text-[26px] font-bold tracking-[-0.01em] text-heading">{ctx.meetingTitle}</h1>
          </div>

          {ctx.presentNames.length > 0 && (
            <p className="text-[14px] text-subtle">
              {ctx.presentNames.slice(0, 3).join(", ")}
              {ctx.presentNames.length > 3 ? ` and ${ctx.presentNames.length - 3} more` : ""} {ctx.presentNames.length === 1 ? "is" : "are"} already in
            </p>
          )}

          {error && <p role="alert" className="text-[13.5px] text-danger-text">{error}</p>}

          {ended ? (
            <div className="space-y-3">
              <p className="rounded-lg bg-sunken p-4 text-[14px] text-subtle">This meeting is over.</p>
              <Link href={`/meet/sessions/${ctx.sessionId}`} className={btnSecondary}>View minutes</Link>
            </div>
          ) : status === "admitted" || status === "entered" ? (
            <div className="space-y-2.5">
              {videoLink ? (
                <>
                  <button type="button" onClick={() => join(true)} disabled={busy} className={btnPrimary}>
                    {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <ExternalLink className="h-5 w-5" aria-hidden />} Join in Microsoft Teams
                  </button>
                  <button type="button" onClick={() => join(false)} disabled={busy} className={btnSecondary}>
                    Join here only (agenda and points)
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => join(false)} disabled={busy} className={btnPrimary}>
                  {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : null} Join now
                </button>
              )}
            </div>
          ) : status === "requested" ? (
            <div role="status" className="flex flex-col items-center gap-3 rounded-xl bg-sunken px-4 py-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
              <strong className="text-[16px] text-heading">Waiting for the host to let you in</strong>
              <span className="text-[13.5px] text-subtle">The host has been told you're here. Keep this page open.</span>
            </div>
          ) : status === "denied" ? (
            <div className="space-y-3">
              <p role="status" className="rounded-lg bg-danger-soft p-4 text-[14px] text-danger-text">The host didn't let you in this time.</p>
              <button type="button" onClick={ask} disabled={busy} className={btnSecondary}>Ask again</button>
            </div>
          ) : (
            <div className="space-y-2.5">
              <button type="button" onClick={ask} disabled={busy} className={btnPrimary}>
                {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : null} Ask to join
              </button>
              <p className="text-[13px] text-muted">You're not on the invite list, so the host needs to let you in.</p>
            </div>
          )}

          {(status === "admitted" || status === "entered") && (
            <div className="flex items-center gap-2 text-[13px] text-success-text">
              <CheckCircle2 className="h-4 w-4" aria-hidden /> You can join this meeting
            </div>
          )}

          <div className="space-y-1.5 border-t border-border pt-4 text-[13.5px] text-subtle">
            {ctx.meetingCode && (
              <div>
                Meeting ID <strong className="text-foreground">{ctx.meetingCode}</strong>
              </div>
            )}
            {ctx.roomName && <div>In the office: {ctx.roomName}</div>}
            {ctx.carriedPoints > 0 && <div>{ctx.carriedPoints} point{ctx.carriedPoints === 1 ? "" : "s"} carried from last time</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

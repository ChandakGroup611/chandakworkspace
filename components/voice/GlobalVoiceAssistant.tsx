"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Mic, MicOff, X, Check, Copy, Printer, Sparkles } from "lucide-react";
import { toast } from "react-toastify";
import { AppButton } from "@/components/ui/AppButton";
import { VoiceInputArea } from "@/components/voice/VoiceInputArea";
import {
  applyValuesToActiveForm,
  fillActiveFormFromVoice,
  inspectActiveFormFields,
  parseGenericFieldPairs,
} from "@/lib/voice/dom-form-filler";
import { parseVoiceFields } from "@/lib/voice/field-parser";

function resolveModuleName(pathname: string): string {
  if (pathname.startsWith("/vehicle")) return "Vehicle Desk";
  if (pathname.startsWith("/design")) return "Design Tracking";
  if (pathname.startsWith("/meet")) return "Chandak Meet";
  if (pathname.startsWith("/budget")) return "Organization Budget";
  if (pathname.startsWith("/amc") || pathname.startsWith("/subscription")) return "AMC & Subscriptions";
  if (pathname.startsWith("/tickets")) return "Tickets";
  if (pathname.startsWith("/requirements")) return "Requirements";
  if (pathname.startsWith("/masters")) return "Masters";
  if (pathname.startsWith("/settings")) return "Settings";
  if (pathname.startsWith("/users")) return "Users & IAM";
  if (pathname.startsWith("/workspaces")) return "Workspaces";
  return "Task Workflow";
}

export function GlobalVoiceAssistant() {
  const pathname = usePathname() || "";
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [lastFilled, setLastFilled] = useState<{ label: string; value: string }[]>([]);
  const [copied, setCopied] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      try { recognitionRef.current?.stop(); } catch {}
    };
  }, []);

  const applyTranscript = async (text: string) => {
    const clean = text.trim();
    if (!clean) return;

    const formFields = inspectActiveFormFields();
    let aiValues: Record<string, string> = {};
    try {
      const resp = await fetch("/api/voice/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: clean, fields: formFields }),
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data?.values && typeof data.values === "object") aiValues = data.values;
      }
    } catch {}

    if (formFields.length > 0) {
      const res = Object.keys(aiValues).length > 0 ? applyValuesToActiveForm(aiValues) : fillActiveFormFromVoice(clean);
      if (res.filled.length > 0) {
        setLastFilled(res.filled);
        toast.success(`Filled ${res.filled.length} field(s): ${res.filled.map((f) => f.label).join(", ")}`);
        return;
      }
    }

    // No open form matched on screen: stage AI-extracted or parsed fields and try opening the Create button
    const parsed = parseVoiceFields(clean);
    const pairs = parseGenericFieldPairs(clean);
    const aiItems = Object.entries(aiValues).filter(([, v]) => Boolean(v)).map(([k, v]) => ({ label: k, value: String(v) }));
    const previewItems = aiItems.length > 0
      ? aiItems
      : Object.entries(parsed).filter(([k, v]) => k !== "moduleHint" && Boolean(v)).map(([k, v]) => ({ label: k, value: String(v) }));
    const fallbackItems = previewItems.length > 0 ? previewItems : pairs.map((p) => ({ label: p.field, value: p.value }));

    if (fallbackItems.length > 0) {
      try {
        sessionStorage.setItem("chandak_voice_draft", clean);
        if (Object.keys(aiValues).length > 0) sessionStorage.setItem("chandak_voice_ai_values", JSON.stringify(aiValues));
      } catch {}
      setLastFilled(fallbackItems);

      const createBtn = Array.from(document.querySelectorAll<HTMLElement>("main button, main a")).find((el) =>
        el.offsetParent !== null &&
        /^\s*(?:\+?\s*)?(?:new\s+task|create\s+task|create\s+new\s+task|new\s+ticket|create\s+ticket|new\s+meeting|add\s+vehicle|create\s+budget)\b/i.test(
          el.textContent || ""
        )
      );
      if (createBtn) {
        setOpen(false);
        createBtn.click();
        toast.success(`Opening form & auto-filling ${fallbackItems.length} field(s)…`);
        return;
      }

      toast.info(`Understood ${fallbackItems.length} field(s). Open a Create form and it will auto-fill.`);
      return;
    }

    toast.info("Could not extract fields. Please try speaking again with clear details.");
  };

  const toggleListening = () => {
    if (listening) {
      try { recognitionRef.current?.stop(); } catch {}
      setListening(false);
      if (transcript.trim()) applyTranscript(transcript);
      return;
    }

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      toast.warning("Voice recognition is not supported in this browser. Type your field values below instead.");
      return;
    }

    const rec = new SpeechRec();
    rec.lang = "en-IN";
    rec.continuous = true;
    rec.interimResults = true;

    let finalText = "";
    rec.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const chunk = event.results[i][0]?.transcript || "";
        if (event.results[i].isFinal) finalText += chunk + " ";
        else interim += chunk;
      }
      setTranscript((finalText + interim).trim());
    };
    rec.onerror = (e: any) => {
      setListening(false);
      if (e?.error === "not-allowed") toast.error("Microphone permission denied.");
    };
    rec.onend = () => {
      setListening(false);
      if (finalText.trim()) applyTranscript(finalText.trim());
    };

    recognitionRef.current = rec;
    setTranscript("");
    setLastFilled([]);
    setListening(true);
    rec.start();
  };

  const moduleName = resolveModuleName(pathname);
  const receiptText = [
    "CHANDAK WORKSPACE — VOICE ACTION RECEIPT",
    `Module / Screen: ${moduleName} (${pathname})`,
    `Timestamp: ${new Date().toLocaleString("en-IN")}`,
    ...lastFilled.map((f) => `${f.label}: ${f.value}`),
  ].join("\n");

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Global Voice Fill"
        title="Voice Fill & Receipt (all modules, settings & masters)"
        className={`inline-flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center rounded-full border transition-all duration-150 ${
          listening
            ? "border-rose-500/60 bg-rose-500/15 text-rose-600 ring-2 ring-rose-500/30 animate-pulse"
            : open
            ? "border-theme-btn-primary/50 bg-accent-soft text-accent-soft-text shadow-xs"
            : "border-border/70 bg-surface text-foreground hover:border-theme-btn-primary/40 hover:bg-accent-soft/70 hover:text-accent-soft-text hover:scale-105"
        }`}
      >
        <Mic className="h-4 w-4" strokeWidth={2} aria-hidden />
      </button>

      {open && (
        <div className="fixed right-3 top-14 z-[var(--z-popover)] w-[340px] max-w-[calc(100vw-1.5rem)] rounded-xl border border-border bg-elevated p-3.5 shadow-xl space-y-3">
          <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-theme-icon" />
              <span className="text-xs font-semibold text-foreground">Voice Fill · {moduleName}</span>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="text-muted hover:text-foreground p-1" aria-label="Close">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <p className="text-[11px] text-muted">
            Works on any open form, modal, Settings, or Masters screen. Say field names and values (e.g. &quot;name is …, priority is High, due date is tomorrow&quot;).
          </p>

          <VoiceInputArea
            value={transcript}
            onChange={setTranscript}
            listening={listening}
            placeholder="Spoken or typed command appears here…"
          />

          <div className="flex flex-wrap items-center gap-2">
            <AppButton
              type="button"
              size="sm"
              variant={listening ? "destructive" : "primary"}
              onClick={toggleListening}
              leftIcon={listening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
            >
              {listening ? "Stop & Fill" : "Speak"}
            </AppButton>
            {transcript.trim() && !listening && (
              <AppButton type="button" size="sm" variant="outline" onClick={() => applyTranscript(transcript)}>
                Fill Active Form
              </AppButton>
            )}
          </div>

          {lastFilled.length > 0 && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2.5 space-y-2 text-[11px]">
              <div className="font-semibold text-emerald-700 dark:text-emerald-400">
                Action Receipt ({lastFilled.length} fields filled)
              </div>
              <ul className="space-y-0.5 text-foreground">
                {lastFilled.map((f, i) => (
                  <li key={i}>
                    <span className="text-muted">{f.label}:</span> <b>{f.value}</b>
                  </li>
                ))}
              </ul>
              <div className="flex items-center gap-2 pt-1">
                <AppButton
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(receiptText);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    } catch {}
                  }}
                  leftIcon={copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                >
                  {copied ? "Copied" : "Copy Receipt"}
                </AppButton>
                <AppButton type="button" size="sm" variant="outline" onClick={() => window.print()} leftIcon={<Printer className="h-3 w-3" />}>
                  Print
                </AppButton>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
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
import { parseVoiceFields, type ParsedVoiceFields } from "@/lib/voice/field-parser";

type VoiceModuleTarget = NonNullable<ParsedVoiceFields["moduleHint"]>;

const MODULE_ROUTES: Record<VoiceModuleTarget, string> = {
  TASK: "/tasks",
  SUBTASK: "/tasks",
  TICKET: "/tickets",
  REQUIREMENT: "/requirements",
  VEHICLE: "/vehicle",
  BUDGET: "/budget/create",
  MEETING: "/meet/meetings/new",
};

const MODULE_LABELS: Record<VoiceModuleTarget, string> = {
  TASK: "Task",
  SUBTASK: "Subtask",
  TICKET: "Ticket",
  REQUIREMENT: "Requirement",
  VEHICLE: "Vehicle",
  BUDGET: "Budget",
  MEETING: "Meeting",
};

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

function currentMatchesHint(pathname: string, hint: VoiceModuleTarget): boolean {
  if (hint === "TASK" || hint === "SUBTASK") return pathname === "/" || pathname.startsWith("/tasks") || pathname.startsWith("/workspaces");
  if (hint === "TICKET") return pathname.startsWith("/tickets");
  if (hint === "REQUIREMENT") return pathname.startsWith("/requirements");
  if (hint === "VEHICLE") return pathname.startsWith("/vehicle");
  if (hint === "BUDGET") return pathname.startsWith("/budget");
  if (hint === "MEETING") return pathname.startsWith("/meet");
  return false;
}

function findCreateButton(hint?: VoiceModuleTarget): HTMLElement | undefined {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>("main button, main a"));
  const patterns: Record<VoiceModuleTarget, RegExp> = {
    TASK: /^\s*(?:\+?\s*)?(?:new\s+task|create\s+task|create\s+new\s+task)\b/i,
    SUBTASK: /^\s*(?:\+?\s*)?(?:new\s+task|create\s+task|add\s+subtask)\b/i,
    TICKET: /^\s*(?:\+?\s*)?(?:new\s+ticket|create\s+ticket|raise\s+ticket)\b/i,
    REQUIREMENT: /^\s*(?:\+?\s*)?(?:new\s+requirement|create\s+requirement)\b/i,
    VEHICLE: /^\s*(?:\+?\s*)?(?:add\s+vehicle|new\s+vehicle)\b/i,
    BUDGET: /^\s*(?:\+?\s*)?(?:create\s+budget|new\s+budget)\b/i,
    MEETING: /^\s*(?:\+?\s*)?(?:new\s+meeting|schedule\s+meeting|create\s+meeting)\b/i,
  };
  if (hint) {
    return candidates.find((el) => el.offsetParent !== null && patterns[hint].test(el.textContent || ""));
  }
  return candidates.find(
    (el) =>
      el.offsetParent !== null &&
      /^\s*(?:\+?\s*)?(?:new\s+task|create\s+task|create\s+new\s+task|new\s+ticket|create\s+ticket|new\s+requirement|create\s+requirement|new\s+meeting|add\s+vehicle|create\s+budget)\b/i.test(
        el.textContent || ""
      )
  );
}

export function GlobalVoiceAssistant() {
  const pathname = usePathname() || "";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [lastFilled, setLastFilled] = useState<{ label: string; value: string }[]>([]);
  const [pendingTargetPick, setPendingTargetPick] = useState(false);
  const [copied, setCopied] = useState(false);
  const recognitionRef = useRef<any>(null);
  const appliedRef = useRef(false);

  useEffect(() => {
    return () => {
      try { recognitionRef.current?.stop(); } catch {}
    };
  }, []);

  // After cross-page navigation triggered by voice intent, auto-open the destination Create form or fill direct form
  useEffect(() => {
    let target: VoiceModuleTarget | null = null;
    try {
      target = sessionStorage.getItem("chandak_voice_auto_open") as VoiceModuleTarget | null;
    } catch {}
    if (!target) return;

    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      const btn = findCreateButton(target!);
      if (btn) {
        window.clearInterval(timer);
        try { sessionStorage.removeItem("chandak_voice_auto_open"); } catch {}
        btn.click();
        return;
      }
      const fields = inspectActiveFormFields();
      if (fields.length > 0 && currentMatchesHint(pathname, target!)) {
        window.clearInterval(timer);
        try {
          const draft = sessionStorage.getItem("chandak_voice_draft") || "";
          const aiRaw = sessionStorage.getItem("chandak_voice_ai_values");
          sessionStorage.removeItem("chandak_voice_auto_open");
          sessionStorage.removeItem("chandak_voice_draft");
          sessionStorage.removeItem("chandak_voice_ai_values");
          if (aiRaw) {
            const ai = JSON.parse(aiRaw);
            if (ai && Object.keys(ai).length > 0) {
              const res = applyValuesToActiveForm(ai);
              if (res.filled.length > 0) toast.success(`Auto-filled ${res.filled.length} field(s).`);
              return;
            }
          }
          if (draft) {
            const res = fillActiveFormFromVoice(draft);
            if (res.filled.length > 0) toast.success(`Auto-filled ${res.filled.length} field(s).`);
          }
        } catch {}
        return;
      }
      if (attempts >= 10) {
        window.clearInterval(timer);
        try { sessionStorage.removeItem("chandak_voice_auto_open"); } catch {}
      }
    }, 300);

    return () => window.clearInterval(timer);
  }, [pathname]);

  const launchModule = useCallback(
    (target: VoiceModuleTarget) => {
      setPendingTargetPick(false);
      setOpen(false);
      const alreadyHere = currentMatchesHint(pathname, target);
      const createBtn = findCreateButton(target);
      if (alreadyHere && createBtn) {
        createBtn.click();
        toast.success(`Opening ${MODULE_LABELS[target]} form & auto-filling…`);
        return;
      }
      try {
        sessionStorage.setItem("chandak_voice_auto_open", target);
      } catch {}
      const dest = MODULE_ROUTES[target];
      if (!alreadyHere || pathname !== dest) {
        router.push(dest);
      }
      toast.success(`Opening ${MODULE_LABELS[target]} creation…`);
    },
    [pathname, router]
  );

  // Understand the ENTIRE voice transcript first, then take ONE clear decision
  const applyTranscript = async (text: string) => {
    const clean = text.trim();
    if (!clean) return;
    setPendingTargetPick(false);

    const parsed = parseVoiceFields(clean);
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

    // 1. If a form is already open on screen and the user didn't ask for a different module, fill it directly
    const switchingModules = Boolean(parsed.moduleHint && !currentMatchesHint(pathname, parsed.moduleHint));
    if (formFields.length > 0 && !switchingModules) {
      const res = Object.keys(aiValues).length > 0 ? applyValuesToActiveForm(aiValues) : fillActiveFormFromVoice(clean);
      if (res.filled.length > 0) {
        setLastFilled(res.filled);
        toast.success(`Filled ${res.filled.length} field(s): ${res.filled.map((f) => f.label).join(", ")}`);
        return;
      }
    }

    // 2. Otherwise stage the entire understood draft and route/prompt once
    const pairs = parseGenericFieldPairs(clean);
    const aiItems = Object.entries(aiValues).filter(([, v]) => Boolean(v)).map(([k, v]) => ({ label: k, value: String(v) }));
    const previewItems = aiItems.length > 0
      ? aiItems
      : Object.entries(parsed).filter(([k, v]) => k !== "moduleHint" && Boolean(v)).map(([k, v]) => ({ label: k, value: String(v) }));
    const fallbackItems = previewItems.length > 0 ? previewItems : pairs.map((p) => ({ label: p.field, value: p.value }));

    if (fallbackItems.length > 0 || parsed.moduleHint) {
      try {
        sessionStorage.setItem("chandak_voice_draft", clean);
        if (Object.keys(aiValues).length > 0) sessionStorage.setItem("chandak_voice_ai_values", JSON.stringify(aiValues));
      } catch {}
      setLastFilled(fallbackItems);

      if (parsed.moduleHint) {
        launchModule(parsed.moduleHint);
        return;
      }

      // Ambiguous: no form open and user didn't name Task/Ticket/Requirement/Vehicle/Budget -> ask cleanly instead of guessing
      setPendingTargetPick(true);
      toast.info("Select which module form to open with your voice details.");
      return;
    }

    toast.info("Could not extract fields. Please try speaking again with clear details.");
  };

  const toggleListening = () => {
    if (listening) {
      try { recognitionRef.current?.stop(); } catch {}
      setListening(false);
      if (transcript.trim() && !appliedRef.current) {
        appliedRef.current = true;
        applyTranscript(transcript);
      }
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
    appliedRef.current = false;

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
      if (finalText.trim() && !appliedRef.current) {
        appliedRef.current = true;
        applyTranscript(finalText.trim());
      }
    };

    recognitionRef.current = rec;
    setTranscript("");
    setLastFilled([]);
    setPendingTargetPick(false);
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
        <div className="fixed right-3 top-14 z-[var(--z-popover)] w-[350px] max-w-[calc(100vw-1.5rem)] rounded-xl border border-border bg-elevated p-3.5 shadow-xl space-y-3">
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
            Speak your full request first (e.g. &quot;Create a ticket, subject is …, priority is High&quot;). When you stop, the system routes or fills the right form.
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
              {listening ? "Stop & Understand" : "Speak"}
            </AppButton>
            {transcript.trim() && !listening && (
              <AppButton type="button" size="sm" variant="outline" onClick={() => applyTranscript(transcript)}>
                Understand &amp; Fill
              </AppButton>
            )}
          </div>

          {pendingTargetPick && (
            <div className="rounded-lg border border-theme-btn-primary/30 bg-accent-soft/40 p-2.5 space-y-2">
              <div className="text-[11px] font-semibold text-foreground">
                Which transaction should open with these details?
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(["TASK", "TICKET", "REQUIREMENT", "BUDGET", "VEHICLE"] as VoiceModuleTarget[]).map((tgt) => (
                  <AppButton key={tgt} type="button" size="sm" variant="outline" onClick={() => launchModule(tgt)}>
                    {MODULE_LABELS[tgt]}
                  </AppButton>
                ))}
              </div>
            </div>
          )}

          {lastFilled.length > 0 && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2.5 space-y-2 text-[11px]">
              <div className="font-semibold text-emerald-700 dark:text-emerald-400">
                Action Receipt ({lastFilled.length} fields understood)
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

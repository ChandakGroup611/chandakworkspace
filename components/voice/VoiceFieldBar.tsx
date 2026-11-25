"use client";

import React, { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Sparkles, Check } from "lucide-react";
import { AppButton } from "@/components/ui/AppButton";
import { VoiceInputArea } from "@/components/voice/VoiceInputArea";
import { parseVoiceFields, type ParsedVoiceFields } from "@/lib/voice/field-parser";
import { inspectActiveFormFields } from "@/lib/voice/dom-form-filler";

interface VoiceFieldBarProps {
  entityLabel: string; // e.g. "Task", "Subtask", "Ticket", "Requirement"
  onApply: (fields: ParsedVoiceFields, rawTranscript: string) => string[];
}

export function VoiceFieldBar({ entityLabel, onApply }: VoiceFieldBarProps) {
  const [supported, setSupported] = useState(true);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [appliedLabels, setAppliedLabels] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) setSupported(false);
    return () => {
      try { recognitionRef.current?.stop(); } catch {}
    };
  }, []);

  const applyTranscript = async (text: string) => {
    const clean = text.trim();
    if (!clean) return;
    const parsed = parseVoiceFields(clean);

    // Enhance with AI extraction so natural/random phrasing maps accurately to form fields
    try {
      const formFields = inspectActiveFormFields();
      const resp = await fetch("/api/voice/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: clean, fields: formFields }),
      });
      if (resp.ok) {
        const data = await resp.json();
        const v = data?.values || {};
        if (v["Subject"] || v["Task title"] || v["Title"]) parsed.subject = v["Subject"] || v["Task title"] || v["Title"];
        if (v["Description"] || v["Remark"] || v["Details"]) parsed.description = v["Description"] || v["Remark"] || v["Details"];
        if (v["Duration (Days)"] || v["Duration"]) parsed.duration = String(v["Duration (Days)"] || v["Duration"]).replace(/\D/g, "") || parsed.duration;
        if (v["Status"]) parsed.status = v["Status"];
        if (v["Priority"]) parsed.priority = v["Priority"];
        if (v["Start Date"] || v["Start date"]) parsed.startDate = v["Start Date"] || v["Start date"];
        if (v["Due Date"] || v["End Date"] || v["Due date"]) parsed.dueDate = v["Due Date"] || v["End Date"] || v["Due date"];
        if (v["Department"]) parsed.department = v["Department"];
        if (v["Primary Assignee"] || v["Primary assignee"] || v["Assignee"]) parsed.assignee = v["Primary Assignee"] || v["Primary assignee"] || v["Assignee"];
        if (v["Executors"] || v["Executives"]) parsed.executors = v["Executors"] || v["Executives"];
        if (v["Watchers"]) parsed.watchers = v["Watchers"];
        if (v["Business Reason"]) parsed.businessReason = v["Business Reason"];
      }
    } catch {}

    const filled = onApply(parsed, clean);
    setAppliedLabels(filled);
  };

  const toggleListening = () => {
    setErrorMsg(null);
    if (listening) {
      try { recognitionRef.current?.stop(); } catch {}
      setListening(false);
      if (transcript.trim()) applyTranscript(transcript);
      return;
    }

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      setSupported(false);
      setErrorMsg("Voice recognition is not supported in this browser. You can type or paste below.");
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
      if (e?.error === "not-allowed") setErrorMsg("Microphone permission denied. Please allow mic access.");
      else if (e?.error !== "aborted") setErrorMsg(`Voice error: ${e?.error || "unknown"}`);
    };
    rec.onend = () => {
      setListening(false);
      if (finalText.trim()) applyTranscript(finalText.trim());
    };

    recognitionRef.current = rec;
    setTranscript("");
    setAppliedLabels([]);
    setListening(true);
    rec.start();
  };

  return (
    <div className="rounded-xl border border-theme-btn-primary/25 bg-accent-soft/40 p-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-theme-icon shrink-0" />
          <span className="text-xs font-semibold text-foreground">
            Voice Fill ({entityLabel})
          </span>
          <span className="text-[11px] text-muted hidden sm:inline">
            Say e.g. &quot;subject is …, description is …, status should be New, priority is High, due date is tomorrow&quot;
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AppButton
            type="button"
            size="sm"
            variant={listening ? "destructive" : "primary"}
            onClick={toggleListening}
            disabled={!supported && !transcript.trim()}
            leftIcon={listening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
          >
            {listening ? "Stop & Fill" : "Speak to Fill"}
          </AppButton>
          {transcript.trim() && !listening && (
            <AppButton
              type="button"
              size="sm"
              variant="outline"
              onClick={() => applyTranscript(transcript)}
            >
              Apply
            </AppButton>
          )}
        </div>
      </div>

      {(listening || transcript || errorMsg) && (
        <div className="space-y-1.5">
          <VoiceInputArea
            value={transcript}
            onChange={setTranscript}
            listening={listening}
            placeholder={
              listening
                ? "Listening… speak field names and values clearly"
                : "Spoken command appears here…"
            }
          />
          {errorMsg && <p className="text-[11px] text-danger-text">{errorMsg}</p>}
          {appliedLabels.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-400">
                <Check className="h-3 w-3" /> Filled:
              </span>
              {appliedLabels.map((lbl) => (
                <span key={lbl} className="rounded-md bg-surface px-2 py-0.5 border border-border text-foreground font-medium">
                  {lbl}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

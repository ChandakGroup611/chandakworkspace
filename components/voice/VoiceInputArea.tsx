"use client";

import React, { useEffect, useRef } from "react";

interface VoiceInputAreaProps {
  value: string;
  onChange: (value: string) => void;
  listening: boolean;
  placeholder?: string;
  minRows?: number;
}

const BAR_PATTERN = [35, 65, 95, 50, 85, 100, 60, 90, 45, 80, 95, 55, 75, 40];

/**
 * Shared auto-wrapping voice transcript input with a live speaking waveform graph.
 * Automatically expands vertically as text grows so lengthy speech/typing stays visible.
 */
export function VoiceInputArea({
  value,
  onChange,
  listening,
  placeholder = "Spoken or typed command appears here…",
  minRows = 2,
}: VoiceInputAreaProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 58), 160)}px`;
  }, [value]);

  return (
    <div
      className={`rounded-xl border bg-surface transition-colors ${
        listening
          ? "border-theme-btn-primary/60 ring-1 ring-theme-btn-primary/25"
          : "border-border focus-within:border-theme-btn-primary/60 focus-within:ring-1 focus-within:ring-theme-btn-primary/25"
      }`}
    >
      {/* Speaking Graph Header */}
      <div className="flex items-center justify-between gap-2 border-b border-border/70 px-3 py-1.5 bg-elevated/60 rounded-t-xl">
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full shrink-0 ${
              listening ? "bg-rose-500 animate-ping" : "bg-emerald-500/70"
            }`}
          />
          <span className="text-[11px] font-medium text-muted">
            {listening ? "Listening live…" : "Voice & Text Input"}
          </span>
        </div>

        {/* Equalizer / Speaking Graph */}
        <div
          className="flex items-end gap-[3px] h-4"
          aria-hidden="true"
          title={listening ? "Voice input active" : "Voice ready"}
        >
          {BAR_PATTERN.map((pct, idx) => (
            <span
              key={idx}
              style={{
                height: listening ? `${pct}%` : "22%",
                animationDelay: listening ? `${(idx % 5) * 110}ms` : undefined,
              }}
              className={`w-[3px] rounded-full transition-all duration-300 ${
                listening
                  ? "bg-theme-btn-primary animate-pulse"
                  : "bg-muted/35"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Auto-wrapping, auto-expanding textarea */}
      <textarea
        ref={textareaRef}
        rows={minRows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full resize-none whitespace-pre-wrap break-words bg-transparent px-3 py-2 text-base sm:text-xs leading-relaxed text-foreground placeholder:text-muted/70 focus:outline-none overflow-y-auto"
      />
    </div>
  );
}

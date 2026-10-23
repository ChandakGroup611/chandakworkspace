"use client";

import React, { useState, useRef, useEffect, useTransition } from "react";
import { usePathname } from "next/navigation";
import { 
  Sparkles, 
  Send, 
  X, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Loader2, 
  Bot, 
  User, 
  CornerDownLeft,
  ChevronRight
} from "lucide-react";
import { EnterpriseDrawerShell } from "@/components/ui/enterprise/EnterpriseDrawerShell";
import { AppButton } from "@/components/ui/AppButton";
import { cn } from "@/lib/utils";

export interface CopilotDrawerProps {
  open: boolean;
  onClose: () => void;
}

interface MessageItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  actionPreview?: ActionPreviewState | null;
  timestamp: string;
}

interface ActionPreviewState {
  proposalId: string;
  actionType: string;
  targetEntityId: string;
  targetEntityType: string;
  previewTitle: string;
  currentValue?: any;
  proposedValue?: any;
  expiresAt: string;
  status: "PENDING_CONFIRMATION" | "EXECUTING" | "EXECUTED" | "EXPIRED" | "CANCELLED" | "REJECTED_UNAUTHORIZED" | "REJECTED_CONFLICT" | "FAILED";
  requiresExplicitConfirmation: boolean;
  executionMessage?: string;
}

const STARTER_PROMPTS: Record<string, string[]> = {
  TASK_WORKFLOW: [
    "Explain Primary Assignee vs Executor",
    "Guide me to create a new Task",
    "Why is my task schedule edit blocked?",
    "Explain Task Watcher rules"
  ],
  VEHICLE_DESK: [
    "What is a Movement Pass?",
    "Guide me to dispatch a vehicle",
    "Why is trip dispatch disabled for Fleet Workshop?",
    "Explain HSRP and PUC compliance"
  ],
  DESIGN_TRACKING: [
    "Explain Good For Construction (GFC) rules",
    "Guide me to create a Transmittal",
    "Why is GFC approval permission denied?",
    "Explain Drawing Revision lifecycle"
  ]
};

export function CopilotDrawer({ open, onClose }: CopilotDrawerProps) {
  const pathname = usePathname() || "";
  
  // Resolve active module context from current route
  const activeModule = pathname.startsWith("/vehicle")
    ? "VEHICLE_DESK"
    : pathname.startsWith("/design")
    ? "DESIGN_TRACKING"
    : "TASK_WORKFLOW";

  const moduleDisplayName = activeModule === "VEHICLE_DESK"
    ? "Vehicle Desk"
    : activeModule === "DESIGN_TRACKING"
    ? "Design Tracking"
    : "Task Workflow";

  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new tokens
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streaming]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]);

  // Quick submit helper
  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || streaming) return;

    const userMessage: MessageItem = {
      id: "usr-" + Date.now(),
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    const assistantPlaceholderId = "ast-" + Date.now();
    const assistantMessage: MessageItem = {
      id: assistantPlaceholderId,
      role: "assistant",
      content: "",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setInputValue("");
    setStreaming(true);

    try {
      const response = await fetch("/api/copilot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          message: text,
          moduleCode: activeModule,
          contextPath: pathname
        })
      });

      if (!response.ok || !response.body) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.message || `HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const block of lines) {
          const trimmed = block.trim();
          if (!trimmed) continue;

          let eventType = "message";
          let dataStr = "";

          for (const line of trimmed.split("\n")) {
            if (line.startsWith("event: ")) {
              eventType = line.replace("event: ", "").trim();
            } else if (line.startsWith("data: ")) {
              dataStr = line.replace("data: ", "").trim();
            }
          }

          if (dataStr) {
            try {
              const parsed = JSON.parse(dataStr);

              if (eventType === "meta") {
                if (parsed.conversationId) setConversationId(parsed.conversationId);
              } else if (eventType === "token") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantPlaceholderId
                      ? { ...m, content: m.content + parsed.token }
                      : m
                  )
                );
              } else if (eventType === "action_preview") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantPlaceholderId
                      ? { ...m, actionPreview: parsed }
                      : m
                  )
                );
              } else if (eventType === "error") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantPlaceholderId
                      ? { ...m, content: m.content + `\n\n⚠️ *${parsed.message}*` }
                      : m
                  )
                );
              }
            } catch (err) {
              console.error("SSE parse error:", err);
            }
          }
        }
      }
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantPlaceholderId
            ? { ...m, content: `⚠️ Failed to receive response: ${err.message}` }
            : m
        )
      );
    } finally {
      setStreaming(false);
    }
  };

  // Confirm Action Proposal Handler
  const handleConfirmAction = async (proposalId: string) => {
    // Update local state to executing
    setMessages((prev) =>
      prev.map((m) =>
        m.actionPreview?.proposalId === proposalId
          ? {
              ...m,
              actionPreview: { ...m.actionPreview, status: "EXECUTING" }
            }
          : m
      )
    );

    try {
      const res = await fetch("/api/copilot/action/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setMessages((prev) =>
          prev.map((m) =>
            m.actionPreview?.proposalId === proposalId
              ? {
                  ...m,
                  actionPreview: {
                    ...m.actionPreview,
                    status: "EXECUTED",
                    executionMessage: "Operation executed and verified in system audit log."
                  }
                }
              : m
          )
        );
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.actionPreview?.proposalId === proposalId
              ? {
                  ...m,
                  actionPreview: {
                    ...m.actionPreview,
                    status: "FAILED",
                    executionMessage: data.message || "Failed to execute operation."
                  }
                }
              : m
          )
        );
      }
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.actionPreview?.proposalId === proposalId
            ? {
                ...m,
                actionPreview: {
                  ...m.actionPreview,
                  status: "FAILED",
                  executionMessage: err.message || "Network exception."
                }
              }
            : m
        )
      );
    }
  };

  // Cancel Action Proposal Handler
  const handleCancelAction = (proposalId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.actionPreview?.proposalId === proposalId
          ? {
              ...m,
              actionPreview: {
                ...m.actionPreview,
                status: "CANCELLED",
                executionMessage: "Action proposal declined by user."
              }
            }
          : m
      )
    );
  };

  return (
    <EnterpriseDrawerShell
      open={open}
      onClose={onClose}
      size="md"
      title={
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-theme-btn-primary" aria-hidden />
          <span className="font-semibold text-foreground text-[14.5px]">Chandak Copilot</span>
          <span className="rounded bg-accent-soft px-1.5 py-0.5 text-[11px] font-medium text-accent-soft-text border border-border">
            {moduleDisplayName}
          </span>
        </div>
      }
      subtitle="Application-aware AI assistant grounded in verified Chandak governance."
    >
      <div className="flex h-[calc(100vh-140px)] flex-col justify-between -mx-4 -my-3">
        {/* Messages Container */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="rounded-full bg-surface p-3 border border-border shadow-xs mb-3">
                <Bot className="h-6 w-6 text-muted" />
              </div>
              <h4 className="text-[14px] font-medium text-foreground">How can I assist you?</h4>
              <p className="mt-1 max-w-sm text-[12.5px] text-muted">
                Ask questions about Chandak workflows, explain terminology, diagnose permissions, or execute verified operations.
              </p>

              {/* Quick Prompt Pills */}
              <div className="mt-6 w-full max-w-md space-y-1.5 text-left">
                <div className="text-[11.5px] font-semibold text-muted uppercase tracking-wider px-1">
                  Suggested Context Actions
                </div>
                {(STARTER_PROMPTS[activeModule] || STARTER_PROMPTS.TASK_WORKFLOW).map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSend(prompt)}
                    className="flex w-full items-center justify-between rounded-md border border-border bg-surface px-3 py-2 text-[12.5px] text-foreground hover:bg-surface-hover hover:border-border transition-colors text-left"
                  >
                    <span>{prompt}</span>
                    <ChevronRight className="h-3.5 w-3.5 text-muted shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "flex gap-2.5 max-w-[90%]",
                  m.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                )}
              >
                <div
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px]",
                    m.role === "user"
                      ? "bg-theme-btn-primary text-theme-btn-primary-text"
                      : "bg-surface border border-border text-foreground"
                  )}
                >
                  {m.role === "user" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                </div>

                <div className="flex flex-col space-y-2">
                  <div
                    className={cn(
                      "rounded-lg px-3.5 py-2.5 text-[13px] leading-relaxed",
                      m.role === "user"
                        ? "bg-theme-btn-primary text-theme-btn-primary-text"
                        : "bg-surface border border-border text-foreground"
                    )}
                  >
                    <div className="whitespace-pre-wrap">{m.content}</div>
                  </div>

                  {/* Action Preview Card */}
                  {m.actionPreview && (
                    <ActionPreviewCard
                      preview={m.actionPreview}
                      onConfirm={handleConfirmAction}
                      onCancel={handleCancelAction}
                    />
                  )}
                </div>
              </div>
            ))
          )}

          {streaming && (
            <div className="flex items-center gap-2 text-muted text-[12px] pl-9">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Generating verified response…</span>
            </div>
          )}
        </div>

        {/* Input & Footer Controls */}
        <div className="border-t border-border bg-elevated p-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="relative flex flex-col gap-1.5 rounded-md border border-border bg-surface p-2 shadow-xs focus-within:ring-1 focus-within:ring-theme-btn-primary"
          >
            <textarea
              ref={inputRef}
              rows={2}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={`Ask about ${moduleDisplayName.toLowerCase()}, explain rules, or request actions…`}
              className="w-full resize-none bg-transparent text-[13px] text-foreground placeholder:text-muted outline-none"
            />
            <div className="flex items-center justify-between pt-1 border-t border-border/40">
              <span className="text-[11px] text-muted">
                <kbd className="font-mono text-[10px]">↵</kbd> Send &bull; <kbd className="font-mono text-[10px]">Shift+↵</kbd> Newline
              </span>
              <button
                type="submit"
                disabled={!inputValue.trim() || streaming}
                className="flex items-center gap-1.5 rounded bg-theme-btn-primary px-2.5 py-1 text-[12px] font-medium text-theme-btn-primary-text hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                <span>Send</span>
                <Send className="h-3 w-3" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </EnterpriseDrawerShell>
  );
}

// ============================================================================
// Action Preview Interactive Card
// ============================================================================
function ActionPreviewCard({
  preview,
  onConfirm,
  onCancel
}: {
  preview: ActionPreviewState;
  onConfirm: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (preview.status !== "PENDING_CONFIRMATION") return;

    const interval = setInterval(() => {
      const diffMs = new Date(preview.expiresAt).getTime() - Date.now();
      if (diffMs <= 0) {
        setTimeLeft("Expired");
        clearInterval(interval);
      } else {
        const mins = Math.floor(diffMs / 60000);
        const secs = Math.floor((diffMs % 60000) / 1000);
        setTimeLeft(`${mins}:${secs < 10 ? "0" : ""}${secs}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [preview.expiresAt, preview.status]);

  if (preview.status === "EXECUTED") {
    return (
      <div className="rounded-md border border-emerald-500/30 bg-emerald-50/10 p-3 text-[12.5px] text-foreground">
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium">
          <CheckCircle2 className="h-4 w-4" />
          <span>Action Executed Successfully</span>
        </div>
        <p className="mt-1 text-[12px] text-muted">
          {preview.executionMessage || "Operation confirmed and recorded in system audit trail."}
        </p>
      </div>
    );
  }

  if (preview.status === "FAILED" || preview.status === "CANCELLED") {
    return (
      <div className="rounded-md border border-rose-500/30 bg-rose-50/10 p-3 text-[12.5px] text-foreground">
        <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-medium">
          <AlertTriangle className="h-4 w-4" />
          <span>{preview.status === "CANCELLED" ? "Action Cancelled" : "Action Failed"}</span>
        </div>
        <p className="mt-1 text-[12px] text-muted">
          {preview.executionMessage || "Operation aborted."}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-elevated p-3 shadow-xs">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <div className="flex items-center gap-1.5 text-[12px] font-semibold text-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-accent-soft-text" />
          <span>Action Confirmation Required</span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-muted">
          <Clock className="h-3 w-3" />
          <span>Expires in {timeLeft || "5:00"}</span>
        </div>
      </div>

      <div className="mt-2 space-y-1 text-[12px]">
        <div className="font-medium text-foreground">{preview.previewTitle}</div>
        <div className="text-muted">
          Target: <code className="rounded bg-surface px-1 py-0.5 text-[11px] border border-border">{preview.targetEntityId}</code>
        </div>
        {preview.proposedValue && (
          <div className="text-[12px] text-foreground pt-1">
            Proposed Change: <span className="font-semibold text-accent-soft-text">{preview.proposedValue}</span>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-end gap-2 pt-2 border-t border-border">
        <button
          type="button"
          onClick={() => onCancel(preview.proposalId)}
          disabled={preview.status === "EXECUTING"}
          className="rounded border border-border px-2.5 py-1 text-[12px] font-medium text-muted hover:bg-surface-hover hover:text-foreground transition-colors"
        >
          Decline
        </button>
        <button
          type="button"
          onClick={() => onConfirm(preview.proposalId)}
          disabled={preview.status === "EXECUTING"}
          className="flex items-center gap-1.5 rounded bg-theme-btn-primary px-3 py-1 text-[12px] font-medium text-theme-btn-primary-text hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {preview.status === "EXECUTING" && <Loader2 className="h-3 w-3 animate-spin" />}
          <span>Confirm & Execute</span>
        </button>
      </div>
    </div>
  );
}

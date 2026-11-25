"use client";

import React, { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Copy, Check, Printer, ExternalLink } from "lucide-react";
import { AppButton } from "@/components/ui/AppButton";

export interface VoiceReceiptData {
  receiptNo: string;
  module: "Task" | "Subtask" | "Ticket" | "Requirement";
  recordCode?: string;
  subject: string;
  status?: string;
  priority?: string;
  assignee?: string;
  dueDate?: string;
  createdAt: string;
  href?: string;
}

export function VoiceReceiptCard({ receipt, onClose }: { receipt: VoiceReceiptData; onClose?: () => void }) {
  const [copied, setCopied] = useState(false);

  const summaryText = [
    `CHANDAK WORKSPACE — ACTION RECEIPT`,
    `Receipt No: ${receipt.receiptNo}`,
    `Module: ${receipt.module}`,
    receipt.recordCode ? `Record Code: ${receipt.recordCode}` : null,
    `Subject: ${receipt.subject}`,
    receipt.status ? `Status: ${receipt.status}` : null,
    receipt.priority ? `Priority: ${receipt.priority}` : null,
    receipt.assignee ? `Assigned To: ${receipt.assignee}` : null,
    receipt.dueDate ? `Due Date: ${receipt.dueDate}` : null,
    `Timestamp: ${receipt.createdAt}`,
  ].filter(Boolean).join("\n");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div>
            <div className="text-sm font-semibold text-foreground">
              {receipt.module} Created — Action Receipt
            </div>
            <div className="text-[11px] font-mono text-muted">
              {receipt.receiptNo}{receipt.recordCode ? ` · ${receipt.recordCode}` : ""}
            </div>
          </div>
        </div>
        <span className="text-[11px] text-muted">{receipt.createdAt}</span>
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs border-t border-border/50 pt-2.5">
        <div className="sm:col-span-2">
          <dt className="text-muted inline mr-1.5">Subject:</dt>
          <dd className="text-foreground font-medium inline">{receipt.subject}</dd>
        </div>
        {receipt.status && (
          <div><dt className="text-muted inline mr-1.5">Status:</dt><dd className="text-foreground inline">{receipt.status}</dd></div>
        )}
        {receipt.priority && (
          <div><dt className="text-muted inline mr-1.5">Priority:</dt><dd className="text-foreground inline">{receipt.priority}</dd></div>
        )}
        {receipt.assignee && (
          <div><dt className="text-muted inline mr-1.5">Assignee:</dt><dd className="text-foreground inline">{receipt.assignee}</dd></div>
        )}
        {receipt.dueDate && (
          <div><dt className="text-muted inline mr-1.5">Due Date:</dt><dd className="text-foreground inline">{receipt.dueDate}</dd></div>
        )}
      </dl>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <AppButton type="button" size="sm" variant="outline" onClick={handleCopy} leftIcon={copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}>
          {copied ? "Copied" : "Copy Receipt"}
        </AppButton>
        <AppButton type="button" size="sm" variant="outline" onClick={() => window.print()} leftIcon={<Printer className="h-3.5 w-3.5" />}>
          Print
        </AppButton>
        {receipt.href && (
          <Link href={receipt.href} className="inline-flex items-center gap-1 rounded-md bg-theme-btn-primary px-3 py-1.5 text-xs font-semibold text-theme-btn-primary-text">
            Open {receipt.module} <ExternalLink className="h-3 w-3" />
          </Link>
        )}
        {onClose && (
          <AppButton type="button" size="sm" variant="ghost" onClick={onClose}>
            Done
          </AppButton>
        )}
      </div>
    </div>
  );
}

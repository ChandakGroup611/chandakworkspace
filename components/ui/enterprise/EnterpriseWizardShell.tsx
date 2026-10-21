"use client";

import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { OverlayShell } from "./OverlayShell";

interface EnterpriseWizardShellProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  className?: string;
  open?: boolean;
  /** Optional step list rendered as a progress bar under the header. */
  steps?: string[];
  currentStep?: number;
  /** @deprecated v1 prop; the accent maps were never applied. Ignored. */
  headerAccent?: string;
}

const SIZE_MAP = { sm: "max-w-2xl", md: "max-w-4xl", lg: "max-w-5xl", xl: "max-w-6xl", full: "max-w-7xl" };

export function EnterpriseWizardShell({ size = "md", steps, currentStep = 0, children, headerAccent: _ignored, ...props }: EnterpriseWizardShellProps) {
  return (
    <OverlayShell
      variant="modal"
      widthClass={SIZE_MAP[size]}
      footerAlign="between"
      dismissOnOutsideClick={false}
      {...props}
    >
      {steps && steps.length > 0 && (
        <ol className="mb-5 flex flex-wrap items-center gap-x-2 gap-y-2" aria-label="Progress">
          {steps.map((s, i) => {
            const done = i < currentStep;
            const active = i === currentStep;
            return (
              <li key={s} className="flex items-center gap-2" aria-current={active ? "step" : undefined}>
                <span
                  className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded-full border text-[12px] font-semibold tabular",
                    done && "border-primary bg-primary text-primary-foreground",
                    active && "border-primary bg-accent-soft text-accent-soft-text",
                    !done && !active && "border-border-active text-muted"
                  )}
                >
                  {done ? <Check className="h-3.5 w-3.5" aria-hidden /> : i + 1}
                </span>
                <span className={cn("text-[13px]", active ? "font-semibold text-foreground" : "text-muted")}>{s}</span>
                {i < steps.length - 1 && <span className="mx-1 hidden h-px w-8 bg-border-active sm:block" aria-hidden />}
              </li>
            );
          })}
        </ol>
      )}
      {children}
    </OverlayShell>
  );
}

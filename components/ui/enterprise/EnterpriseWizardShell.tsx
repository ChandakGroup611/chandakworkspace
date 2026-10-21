"use client";

import React from "react";
import { OverlayShell } from "./OverlayShell";

export interface EnterpriseWizardShellProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  className?: string;
  headerAccent?: "purple" | "indigo" | "emerald" | "amber" | "rose";
  open?: boolean;
  headerExtra?: React.ReactNode;
  steps?: string[];
  currentStep?: number;
}

export function EnterpriseWizardShell({
  title,
  subtitle,
  onClose,
  children,
  footer,
  size = "md",
  className = "",
  headerAccent: _headerAccent, // Accepted for backward-compat, intentionally ignored
  open = true,
  headerExtra,
  steps,
  currentStep = 0,
}: EnterpriseWizardShellProps) {
  return (
    <OverlayShell
      open={open}
      variant="wizard"
      size={size}
      title={title}
      subtitle={subtitle}
      headerExtra={headerExtra}
      onClose={onClose}
      footer={footer}
      className={className}
      closeOnOutsideClick={false}
      steps={steps}
      currentStep={currentStep}
    >
      {children}
    </OverlayShell>
  );
}

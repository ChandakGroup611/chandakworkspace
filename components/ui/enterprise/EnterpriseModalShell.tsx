"use client";

import React from "react";
import { OverlayShell } from "./OverlayShell";

export interface EnterpriseModalShellProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  className?: string;
  open?: boolean;
  headerExtra?: React.ReactNode;
}

export function EnterpriseModalShell({
  title,
  subtitle,
  onClose,
  children,
  footer,
  size = "md",
  className = "",
  open = true,
  headerExtra,
}: EnterpriseModalShellProps) {
  return (
    <OverlayShell
      open={open}
      variant="modal"
      size={size}
      title={title}
      subtitle={subtitle}
      headerExtra={headerExtra}
      onClose={onClose}
      footer={footer}
      className={className}
    >
      {children}
    </OverlayShell>
  );
}

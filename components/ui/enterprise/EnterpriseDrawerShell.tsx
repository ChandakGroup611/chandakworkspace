"use client";

import React from "react";
import { OverlayShell } from "./OverlayShell";

export interface EnterpriseDrawerShellProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  open?: boolean;
  headerExtra?: React.ReactNode;
}

export function EnterpriseDrawerShell({
  title,
  subtitle,
  onClose,
  children,
  footer,
  size = "md",
  className = "",
  open = true,
  headerExtra,
}: EnterpriseDrawerShellProps) {
  return (
    <OverlayShell
      open={open}
      variant="drawer"
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

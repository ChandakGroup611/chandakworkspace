"use client";

import React from "react";
import { OverlayShell } from "./OverlayShell";

interface EnterpriseModalShellProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  className?: string;
  open?: boolean;
  headerExtra?: React.ReactNode;
  dismissOnOutsideClick?: boolean;
}

const SIZE_MAP = {
  sm: "max-w-xl",
  md: "max-w-3xl",
  lg: "max-w-5xl",
  xl: "max-w-6xl",
  full: "max-w-[1400px]",
};

/** Same props as v1 (plus optional `open`), so existing call sites keep working. */
export function EnterpriseModalShell({ size = "md", ...props }: EnterpriseModalShellProps) {
  return <OverlayShell variant="modal" widthClass={SIZE_MAP[size]} {...props} />;
}

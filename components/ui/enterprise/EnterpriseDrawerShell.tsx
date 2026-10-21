"use client";

import React from "react";
import { OverlayShell } from "./OverlayShell";

interface EnterpriseDrawerShellProps {
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

const SIZE_MAP = { sm: "sm:max-w-md", md: "sm:max-w-2xl", lg: "sm:max-w-4xl", xl: "sm:max-w-6xl" };

export function EnterpriseDrawerShell({ size = "md", ...props }: EnterpriseDrawerShellProps) {
  return <OverlayShell variant="drawer" widthClass={SIZE_MAP[size]} {...props} />;
}

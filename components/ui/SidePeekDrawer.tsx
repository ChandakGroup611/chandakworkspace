"use client";

import React from "react";
import { OverlayShell } from "./enterprise/OverlayShell";

export interface SidePeekDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  width?: "sm" | "md" | "lg" | "xl" | "full";
  className?: string;
  hideCloseButton?: boolean;
}

export function SidePeekDrawer({
  isOpen,
  onClose,
  title,
  children,
  width = "md",
  className,
  hideCloseButton = false,
}: SidePeekDrawerProps) {
  return (
    <OverlayShell
      open={isOpen}
      variant="side-peek"
      size={width}
      title={title}
      onClose={onClose}
      hideCloseButton={hideCloseButton}
      className={className}
    >
      {children}
    </OverlayShell>
  );
}

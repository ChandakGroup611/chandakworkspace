"use client";

import React from "react";
import { OverlayShell } from "./enterprise/OverlayShell";

export interface SidePeekDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: "sm" | "md" | "lg" | "xl" | "full";
  className?: string;
  hideCloseButton?: boolean;
}

const WIDTH = {
  sm: "sm:max-w-[400px]",
  md: "sm:max-w-[520px]",
  lg: "sm:max-w-[700px]",
  xl: "sm:max-w-[900px]",
  full: "",
};

/** Same props as v1. Now has focus trap, Esc, aria and the shared overlay styling. */
export function SidePeekDrawer({ isOpen, width = "md", ...props }: SidePeekDrawerProps) {
  return <OverlayShell open={isOpen} variant="drawer" widthClass={WIDTH[width]} bodyClassName="p-0 sm:p-0" {...props} />;
}

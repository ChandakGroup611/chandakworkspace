"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

interface TaskBackButtonProps {
  fallbackHref: string;
  label?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function TaskBackButton({ fallbackHref, label = "Back", icon, className }: TaskBackButtonProps) {
  const router = useRouter();

  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault();
    if (window.history.length > 2 && document.referrer.includes(window.location.host)) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  };

  return (
    <button
      onClick={handleBack}
      className={className || "inline-flex items-center gap-2 text-sm font-semibold text-theme-icon hover:opacity-80 transition-opacity"}
    >
      {icon || <ArrowLeft className="h-4 w-4" />}
      {label}
    </button>
  );
}

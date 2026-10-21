"use client";

/**
 * Replaces window.confirm() and the ad-hoc "Are you sure?" modals in each module.
 * Destructive actions name the record and the consequence; the confirm button repeats the verb.
 *
 *   <ConfirmDialog open={open} onClose={() => setOpen(false)} tone="danger"
 *     title="Delete vehicle MH-12-AB-1234?" description="Trips and documents stay; the vehicle moves to Trash Data."
 *     confirmLabel="Delete vehicle" onConfirm={deleteVehicle} />
 */
import React from "react";
import { OverlayShell } from "./OverlayShell";
import { AppButton } from "../AppButton";

export function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  onConfirm,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  onConfirm: () => void | Promise<void>;
  /** Optional extra content, e.g. a "Reason" textarea for rejections. */
  children?: React.ReactNode;
}) {
  const [busy, setBusy] = React.useState(false);
  const run = async () => {
    setBusy(true);
    try { await onConfirm(); onClose(); } finally { setBusy(false); }
  };
  return (
    <OverlayShell
      open={open}
      onClose={onClose}
      variant="modal"
      widthClass="max-w-md"
      title={title}
      subtitle={description}
      footer={
        <>
          <AppButton variant="ghost" onClick={onClose} disabled={busy}>{cancelLabel}</AppButton>
          <AppButton variant={tone === "danger" ? "destructive" : "primary"} onClick={run} isLoading={busy}>{confirmLabel}</AppButton>
        </>
      }
    >
      {children ?? null}
    </OverlayShell>
  );
}

"use client";

import React from "react";
import { X, Download, ExternalLink, FileText, FileSpreadsheet, Image as ImageIcon } from "lucide-react";
import { AppButton } from "@/components/ui/AppButton";
import { MessengerAttachment } from "@/lib/actions/messenger";

interface AttachmentPreviewModalProps {
  attachment: MessengerAttachment | null;
  onClose: () => void;
}

export function AttachmentPreviewModal({ attachment, onClose }: AttachmentPreviewModalProps) {
  if (!attachment) return null;

  const isImage = attachment.type.startsWith("image/") || /\.(png|jpe?g|webp|gif|svg)$/i.test(attachment.name);
  const isPdf = attachment.type === "application/pdf" || /\.pdf$/i.test(attachment.name);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const downloadUrl = `${attachment.url}${attachment.url.includes("?") ? "&" : "?"}download=1`;

  return (
    <div className="fixed inset-0 z-[var(--z-modal,9999)] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="relative flex flex-col w-full max-w-4xl max-h-[90vh] bg-elevated rounded-xl border border-border shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface">
          <div className="flex items-center gap-2.5 min-w-0 pr-4">
            {isImage ? (
              <ImageIcon className="h-5 w-5 text-accent shrink-0" />
            ) : isPdf ? (
              <FileText className="h-5 w-5 text-danger-text shrink-0" />
            ) : (
              <FileSpreadsheet className="h-5 w-5 text-success-text shrink-0" />
            )}
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground truncate" title={attachment.name}>
                {attachment.name}
              </h3>
              <p className="text-xs text-muted">{formatFileSize(attachment.size)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={downloadUrl}
              download={attachment.name}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-accent text-accent-contrast hover:opacity-90 transition-opacity"
              title="Download file directly"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download</span>
            </a>
            <a
              href={attachment.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-border bg-surface hover:bg-surface-hover text-foreground transition-colors"
              title="Open in new browser tab"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>New Tab</span>
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-muted hover:text-foreground hover:bg-surface-hover rounded-md transition-colors"
              aria-label="Close preview"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-surface/50 min-h-[300px]">
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={attachment.url}
              alt={attachment.name}
              className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-sm"
            />
          ) : isPdf ? (
            <iframe
              src={attachment.url}
              title={attachment.name}
              className="w-full h-[70vh] rounded-lg border border-border bg-white"
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <FileSpreadsheet className="h-16 w-16 text-muted" />
              <div className="max-w-md">
                <p className="text-sm font-medium text-foreground">{attachment.name}</p>
                <p className="text-xs text-muted mt-1">
                  In-browser preview is not available for this file type ({attachment.type || "Document"}). Use direct download to view locally.
                </p>
              </div>
              <a
                href={downloadUrl}
                download={attachment.name}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md bg-accent text-accent-contrast hover:opacity-90 transition-opacity"
              >
                <Download className="h-4 w-4" />
                <span>Download {attachment.name}</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


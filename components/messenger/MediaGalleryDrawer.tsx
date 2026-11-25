"use client";

import React, { useState, useMemo } from "react";
import {
  X,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  Download,
  Eye,
  FolderOpen,
  Volume2,
} from "lucide-react";
import { MessengerMessage, MessengerAttachment } from "@/lib/actions/messenger";

interface MediaGalleryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  messages: MessengerMessage[];
  onViewAttachment: (att: MessengerAttachment) => void;
}

export function MediaGalleryDrawer({
  isOpen,
  onClose,
  messages,
  onViewAttachment,
}: MediaGalleryDrawerProps) {
  const [activeTab, setActiveTab] = useState<"media" | "docs">("media");

  // Collect all unique attachments across messages
  const allAttachments = useMemo(() => {
    const list: { attachment: MessengerAttachment; date: string; senderName?: string }[] = [];
    for (const msg of messages) {
      if (Array.isArray(msg.attachments)) {
        for (const att of msg.attachments) {
          list.push({
            attachment: att,
            date: msg.created_at,
            senderName: msg.sender?.full_name,
          });
        }
      }
    }
    return list.reverse(); // newest first
  }, [messages]);

  const mediaItems = useMemo(() => {
    return allAttachments.filter((item) => {
      const type = item.attachment.type || "";
      const name = item.attachment.name || "";
      return (
        type.startsWith("image/") ||
        type.startsWith("audio/") ||
        /\.(png|jpe?g|webp|gif|svg|mp3|ogg|webm|wav)$/i.test(name)
      );
    });
  }, [allAttachments]);

  const docItems = useMemo(() => {
    return allAttachments.filter((item) => {
      const type = item.attachment.type || "";
      const name = item.attachment.name || "";
      return !(
        type.startsWith("image/") ||
        type.startsWith("audio/") ||
        /\.(png|jpe?g|webp|gif|svg|mp3|ogg|webm|wav)$/i.test(name)
      );
    });
  }, [allAttachments]);

  if (!isOpen) return null;

  return (
    <div className="absolute inset-y-0 right-0 z-40 w-full sm:w-80 bg-surface border-l border-border flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-3.5 border-b border-border flex items-center justify-between bg-elevated">
        <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
          <FolderOpen className="h-4 w-4 text-accent" />
          <span>Shared Files & Media</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-muted hover:text-foreground rounded-lg transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 p-1.5 border-b border-border bg-sunken/40 gap-1 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab("media")}
          className={`py-1.5 rounded-md font-medium transition-colors ${
            activeTab === "media"
              ? "bg-elevated text-foreground shadow-xs font-semibold"
              : "text-muted hover:text-foreground"
          }`}
        >
          Photos & Audio ({mediaItems.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("docs")}
          className={`py-1.5 rounded-md font-medium transition-colors ${
            activeTab === "docs"
              ? "bg-elevated text-foreground shadow-xs font-semibold"
              : "text-muted hover:text-foreground"
          }`}
        >
          Documents ({docItems.length})
        </button>
      </div>

      {/* Content Stream */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {activeTab === "media" && (
          <>
            {mediaItems.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted">
                No photos or audio files shared yet.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {mediaItems.map(({ attachment, date }, idx) => {
                  const isImg =
                    attachment.type.startsWith("image/") ||
                    /\.(png|jpe?g|webp|gif|svg)$/i.test(attachment.name);

                  return (
                    <div
                      key={idx}
                      className="group relative rounded-xl border border-border bg-elevated overflow-hidden text-xs flex flex-col"
                    >
                      {isImg ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={attachment.url}
                          alt={attachment.name}
                          className="h-24 w-full object-cover bg-black/5"
                        />
                      ) : (
                        <div className="h-24 w-full flex items-center justify-center bg-sunken/50 text-muted">
                          <Volume2 className="h-8 w-8 opacity-60" />
                        </div>
                      )}

                      <div className="p-2 flex-1 flex flex-col justify-between">
                        <p className="font-medium text-[11px] text-foreground truncate" title={attachment.name}>
                          {attachment.name}
                        </p>
                        <p className="text-[11px] text-muted">
                          {(attachment.size / 1024).toFixed(0)} KB
                        </p>
                      </div>

                      {/* Hover Actions */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                        <button
                          type="button"
                          onClick={() => onViewAttachment(attachment)}
                          className="p-1.5 rounded-full bg-white text-black transition-transform shadow-md"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <a
                          href={attachment.url}
                          download={attachment.name}
                          className="p-1.5 rounded-full bg-white text-black transition-transform shadow-md"
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {activeTab === "docs" && (
          <>
            {docItems.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted">
                No documents or spreadsheets shared yet.
              </div>
            ) : (
              <div className="space-y-1.5">
                {docItems.map(({ attachment, date }, idx) => {
                  const isSpreadsheet = /\.(xlsx?|csv)$/i.test(attachment.name);
                  const Icon = isSpreadsheet ? FileSpreadsheet : FileText;
                  const iconColor = isSpreadsheet ? "text-success-text" : "text-info-text";

                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-2.5 p-2 rounded-xl border border-border bg-elevated text-xs transition-colors hover:border-border-active"
                    >
                      <Icon className={`h-6 w-6 shrink-0 ${iconColor}`} />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-[11.5px] text-foreground truncate" title={attachment.name}>
                          {attachment.name}
                        </p>
                        <p className="text-[11px] text-muted">
                          {(attachment.size / 1024).toFixed(0)} KB · {new Date(date).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => onViewAttachment(attachment)}
                          className="p-1 text-muted hover:text-foreground rounded transition-colors"
                          title="View"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <a
                          href={attachment.url}
                          download={attachment.name}
                          className="p-1 text-muted hover:text-foreground rounded transition-colors"
                          title="Download"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}


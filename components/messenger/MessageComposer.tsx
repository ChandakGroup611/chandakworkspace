"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Paperclip,
  Send,
  Smile,
  Mic,
  Square,
  X,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  Eye,
  Download,
  Loader2,
  Trash2,
  AlertCircle,
  Pencil,
  Check,
} from "lucide-react";
import {
  WorkspaceUser,
  MessengerAttachment,
  SendMessagePayload,
} from "@/lib/actions/messenger";
import { createClient } from "@/utils/supabase/client";
import { initializeAttachmentUpload } from "@/lib/actions/attachments";

interface MessageComposerProps {
  conversationId: string;
  users: WorkspaceUser[];
  replyTo: { id: string; content: string; sender_name: string; message_type: string } | null;
  onCancelReply: () => void;
  editingMessage?: { id: string; content: string } | null;
  onCancelEdit?: () => void;
  onSaveEdit?: (messageId: string, newContent: string) => Promise<boolean>;
  onSendMessage: (payload: SendMessagePayload) => Promise<boolean>;
  onViewAttachment: (attachment: MessengerAttachment) => void;
  disabled?: boolean;
}

const COMMON_EMOJIS = [
  "👍", "❤️", "😊", "😂", "🎉", "🔥", "🙏", "👏",
  "🚀", "💡", "✅", "⚠️", "❌", "🤝", "👌", "💪",
  "🙌", "✨", "📌", "💼", "📊", "🎯", "💯", "👋"
];

export function MessageComposer({
  conversationId,
  users,
  replyTo,
  onCancelReply,
  editingMessage = null,
  onCancelEdit,
  onSaveEdit,
  onSendMessage,
  onViewAttachment,
  disabled = false,
}: MessageComposerProps) {
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mention State
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStartIndex, setMentionStartIndex] = useState<number>(-1);
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Voice Note State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [content, adjustTextareaHeight]);

  // Synchronize content when entering edit mode
  useEffect(() => {
    if (editingMessage) {
      setContent(editingMessage.content);
      if (textareaRef.current) {
        textareaRef.current.focus();
        const len = editingMessage.content.length;
        textareaRef.current.setSelectionRange(len, len);
      }
    }
  }, [editingMessage]);

  // Mention search matching
  const matchingMentionUsers = React.useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    const list = users.filter((u) => u.full_name.toLowerCase().includes(q));
    return list.slice(0, 6);
  }, [users, mentionQuery]);

  // Handle typing to detect '@'
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    setError(null);

    const cursor = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursor);
    const lastAt = textBeforeCursor.lastIndexOf("@");

    if (lastAt !== -1 && (lastAt === 0 || /\s/.test(textBeforeCursor[lastAt - 1]))) {
      const query = textBeforeCursor.slice(lastAt + 1);
      if (!/\s/.test(query)) {
        setMentionQuery(query);
        setMentionStartIndex(lastAt);
        return;
      }
    }
    setMentionQuery(null);
  };

  const handleSelectMention = (user: WorkspaceUser | "all") => {
    if (mentionStartIndex === -1) return;
    const isAll = user === "all";
    const nameToInsert = isAll ? "all " : `${user.full_name} `;
    const beforeAt = content.slice(0, mentionStartIndex);
    const afterCursor = content.slice(textareaRef.current?.selectionStart || content.length);

    const newContent = `${beforeAt}@${nameToInsert}${afterCursor}`;
    setContent(newContent);
    setMentionQuery(null);

    if (!isAll && !mentionedUserIds.includes(user.id)) {
      setMentionedUserIds((prev) => [...prev, user.id]);
    } else if (isAll && !mentionedUserIds.includes("all")) {
      setMentionedUserIds((prev) => [...prev, "all"]);
    }

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newCursorPos = beforeAt.length + nameToInsert.length + 1;
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 10);
  };

  const handleInsertEmoji = (emoji: string) => {
    setContent((prev) => prev + emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  // Attachments Handling
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      setStagedFiles((prev) => [...prev, ...filesArray]);
      e.target.value = "";
    }
  };

  const removeStagedFile = (index: number) => {
    setStagedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Voice Note Recording
  const startVoiceRecording = async () => {
    setError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Microphone access is not supported in this browser.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          audioChunksRef.current.push(ev.data);
        }
      };

      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error("Microphone error:", err);
      setError(err.message || "Failed to access microphone.");
    }
  };

  const cancelVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
    }
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    setRecordingSeconds(0);
    audioChunksRef.current = [];
  };

  const stopAndSendVoiceRecording = async () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") return;

    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);

    mediaRecorderRef.current.onstop = async () => {
      try {
        setSending(true);
        const mimeType = mediaRecorderRef.current?.mimeType || "audio/webm";
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const ext = mimeType.includes("ogg") ? "ogg" : "webm";
        const fileName = `voice_${Date.now()}.${ext}`;
        const audioFile = new File([audioBlob], fileName, { type: mimeType });

        // Upload voice note to chat-attachments
        const uploadRes = await initializeAttachmentUpload({
          module_type: "chat",
          record_id: conversationId,
          file_name: audioFile.name,
          mime_type: audioFile.type,
          file_size: audioFile.size,
        });

        const { error: uploadError } = await supabase.storage
          .from("chat-attachments")
          .uploadToSignedUrl(uploadRes.path, uploadRes.token, audioFile);

        if (uploadError) throw uploadError;

        const attachment: MessengerAttachment = {
          id: uploadRes.attachment_id,
          name: fileName,
          size: audioFile.size,
          type: mimeType,
          url: `/api/proxy-attachment/${uploadRes.attachment_id}`,
        };

        await onSendMessage({
          conversationId,
          content: "Voice Note",
          messageType: "voice",
          attachments: [attachment],
        });
      } catch (err: any) {
        console.error("Voice note upload error:", err);
        setError("Failed to upload voice note.");
      } finally {
        setSending(false);
        setIsRecording(false);
        setRecordingSeconds(0);
        audioChunksRef.current = [];
      }
    };

    mediaRecorderRef.current.stop();
    mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
  };

  // Submit Message or Save Edit
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (sending || uploading || disabled) return;

    const trimmed = content.trim();

    // If in message editing mode, execute save edit
    if (editingMessage && onSaveEdit) {
      if (!trimmed) {
        setError("Message content cannot be empty.");
        return;
      }
      setSending(true);
      setError(null);
      try {
        const ok = await onSaveEdit(editingMessage.id, trimmed);
        if (ok) {
          setContent("");
          onCancelEdit?.();
          if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
          }
        }
      } catch (err: any) {
        console.error("handleSaveEdit error:", err);
        setError(err.message || "Failed to edit message.");
      } finally {
        setSending(false);
      }
      return;
    }

    if (!trimmed && stagedFiles.length === 0) return;

    setSending(true);
    setError(null);

    try {
      let uploadedAttachments: MessengerAttachment[] = [];

      // Upload staged attachments if any
      if (stagedFiles.length > 0) {
        setUploading(true);
        for (const file of stagedFiles) {
          const uploadRes = await initializeAttachmentUpload({
            module_type: "chat",
            record_id: conversationId,
            file_name: file.name,
            mime_type: file.type || "application/octet-stream",
            file_size: file.size,
          });

          const { error: uploadError } = await supabase.storage
            .from("chat-attachments")
            .uploadToSignedUrl(uploadRes.path, uploadRes.token, file);

          if (uploadError) {
            throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
          }

          uploadedAttachments.push({
            id: uploadRes.attachment_id,
            name: file.name,
            size: file.size,
            type: file.type || "application/octet-stream",
            url: `/api/proxy-attachment/${uploadRes.attachment_id}`,
          });
        }
        setUploading(false);
      }

      // Determine message type
      let msgType: "text" | "image" | "file" = "text";
      if (uploadedAttachments.length > 0) {
        const allImages = uploadedAttachments.every(
          (a) => a.type.startsWith("image/") || /\.(png|jpe?g|webp|gif|svg)$/i.test(a.name)
        );
        msgType = allImages ? "image" : "file";
      }

      const success = await onSendMessage({
        conversationId,
        content: trimmed,
        messageType: msgType,
        replyToId: replyTo?.id || null,
        attachments: uploadedAttachments,
        mentions: mentionedUserIds,
      });

      if (success) {
        setContent("");
        setStagedFiles([]);
        setMentionedUserIds([]);
        if (replyTo) onCancelReply();
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
        }
      }
    } catch (err: any) {
      console.error("handleSend error:", err);
      setError(err.message || "Failed to send message.");
    } finally {
      setSending(false);
      setUploading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape" && editingMessage) {
      e.preventDefault();
      setContent("");
      onCancelEdit?.();
      return;
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="relative border-t border-border bg-surface flex flex-col shrink-0">
      {/* Editing Message Banner (WhatsApp Style) */}
      {editingMessage && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-blue-500/10 border-b border-border text-xs animate-in slide-in-from-bottom-1">
          <div className="flex items-center gap-2 min-w-0 pr-2 border-l-2 border-primary pl-2">
            <Pencil className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="font-semibold text-primary truncate">
              Editing message:
            </span>
            <span className="text-muted truncate max-w-xs md:max-w-md">
              {editingMessage.content}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setContent("");
              onCancelEdit?.();
            }}
            className="p-1 text-muted hover:text-foreground rounded transition-colors shrink-0 cursor-pointer"
            title="Cancel editing (Esc)"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Reply Quote Banner */}
      {replyTo && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-accent-soft/40 border-b border-border text-xs">
          <div className="flex items-center gap-2 min-w-0 pr-2 border-l-2 border-accent pl-2">
            <span className="font-semibold text-accent-soft-text truncate">
              Replying to {replyTo.sender_name}:
            </span>
            <span className="text-muted truncate">
              {replyTo.content || (replyTo.message_type === "image" ? "📷 Photo" : "📎 Attachment")}
            </span>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className="p-1 text-muted hover:text-foreground rounded transition-colors shrink-0"
            title="Cancel reply"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Staged Attachments Pre-upload Verification Bar (Zero Blind Uploads Compliance) */}
      {stagedFiles.length > 0 && (
        <div className="px-3 py-2 border-b border-border bg-surface/80 flex items-center gap-2 overflow-x-auto">
          {stagedFiles.map((file, idx) => {
            const isImg = file.type.startsWith("image/");
            const fileBlobUrl = URL.createObjectURL(file);
            const mockAtt: MessengerAttachment = {
              id: `local-${idx}`,
              name: file.name,
              size: file.size,
              type: file.type,
              url: fileBlobUrl,
            };

            return (
              <div
                key={idx}
                className="relative group flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border bg-elevated text-xs shadow-sm shrink-0 max-w-[220px]"
              >
                {isImg ? (
                  <ImageIcon className="h-4 w-4 text-accent shrink-0" />
                ) : (
                  <FileText className="h-4 w-4 text-emerald-500 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground text-[11px]" title={file.name}>
                    {file.name}
                  </p>
                  <p className="text-[10px] text-muted">{(file.size / 1024).toFixed(0)} KB</p>
                </div>

                {/* Verification View & Download Triggers */}
                <div className="flex items-center gap-1 shrink-0 ml-1">
                  <button
                    type="button"
                    onClick={() => onViewAttachment(mockAtt)}
                    className="p-1 text-muted hover:text-accent rounded transition-colors"
                    title="View file preview"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                  <a
                    href={fileBlobUrl}
                    download={file.name}
                    className="p-1 text-muted hover:text-accent rounded transition-colors"
                    title="Download local copy"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => removeStagedFile(idx)}
                    className="p-1 text-muted hover:text-danger rounded transition-colors"
                    title="Remove attachment"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Mention Auto-Complete Popover */}
      {mentionQuery !== null && matchingMentionUsers.length > 0 && (
        <div className="absolute bottom-full left-3 mb-1 w-64 bg-elevated border border-border rounded-lg shadow-xl overflow-hidden z-20 animate-in fade-in slide-in-from-bottom-2 duration-100">
          <div className="px-2.5 py-1.5 border-b border-border bg-surface text-[10px] font-semibold text-muted uppercase tracking-wider">
            Mention Colleague
          </div>
          <div className="divide-y divide-border/40 max-h-48 overflow-y-auto">
            <button
              type="button"
              onClick={() => handleSelectMention("all")}
              className="w-full px-3 py-1.5 text-left text-xs hover:bg-surface-hover flex items-center justify-between"
            >
              <span className="font-semibold text-accent">@all</span>
              <span className="text-[10px] text-muted">Notify everyone</span>
            </button>
            {matchingMentionUsers.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => handleSelectMention(u)}
                className="w-full px-3 py-1.5 text-left text-xs hover:bg-surface-hover flex items-center gap-2"
              >
                <span className="h-5 w-5 rounded-full bg-accent-soft text-accent-soft-text text-[10px] font-bold flex items-center justify-center shrink-0">
                  {u.full_name[0]?.toUpperCase()}
                </span>
                <span className="truncate text-foreground font-medium">{u.full_name}</span>
                {u.department_name && (
                  <span className="text-[10px] text-muted truncate ml-auto">({u.department_name})</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Emoji Picker Popover */}
      {showEmojiPicker && (
        <div className="absolute bottom-full right-4 mb-2 p-2 bg-elevated border border-border rounded-xl shadow-xl z-20 grid grid-cols-8 gap-1 w-64">
          {COMMON_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleInsertEmoji(emoji)}
              className="h-7 w-7 text-base rounded hover:bg-surface-hover flex items-center justify-center transition-transform hover:scale-125"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Recording State Overlay */}
      {isRecording ? (
        <div className="flex items-center justify-between px-4 py-2.5 bg-rose-500/10 border-t border-rose-500/30">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-rose-500 animate-ping shrink-0" />
            <span className="text-xs font-semibold text-rose-500">Recording voice note...</span>
            <span className="text-xs font-mono font-bold text-foreground ml-2">
              {formatTimer(recordingSeconds)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={cancelVoiceRecording}
              className="px-2.5 py-1 text-xs font-medium rounded text-muted hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={stopAndSendVoiceRecording}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-sm"
            >
              <Send className="h-3 w-3" />
              <span>Send Audio</span>
            </button>
          </div>
        </div>
      ) : (
        /* Standard Composer Input Row */
        <div className="flex items-end gap-1.5 p-2.5">
          {/* File Picker */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            multiple
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || sending || uploading}
            className="p-2 text-muted hover:text-foreground hover:bg-surface-hover rounded-lg transition-colors shrink-0"
            title="Attach file or photo"
            aria-label="Attach file"
          >
            <Paperclip className="h-4 w-4" />
          </button>

          {/* Emoji Button */}
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            disabled={disabled || sending}
            className="p-2 text-muted hover:text-foreground hover:bg-surface-hover rounded-lg transition-colors shrink-0"
            title="Add emoji"
            aria-label="Add emoji"
          >
            <Smile className="h-4 w-4" />
          </button>

          {/* Text Area */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              disabled={disabled || sending}
              placeholder="Type a message or @mention a colleague (Enter to send)..."
              rows={1}
              className="w-full resize-none py-2 px-3 text-sm rounded-lg border border-border bg-elevated text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent leading-normal min-h-[38px] max-h-[120px]"
            />
          </div>

          {/* Voice Note or Send/Save Button */}
          {content.trim() === "" && stagedFiles.length === 0 && !editingMessage ? (
            <button
              type="button"
              onClick={startVoiceRecording}
              disabled={disabled || sending}
              className="p-2 text-muted hover:text-foreground hover:bg-surface-hover rounded-lg transition-colors shrink-0"
              title="Record voice note"
              aria-label="Record voice note"
            >
              <Mic className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={disabled || sending || uploading || (editingMessage ? !content.trim() : false)}
              className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-accent text-accent-contrast hover:opacity-90 transition-opacity shrink-0 disabled:opacity-50 cursor-pointer"
              title={editingMessage ? "Save edit (Enter)" : "Send message (Enter)"}
              aria-label={editingMessage ? "Save edit" : "Send message"}
            >
              {sending || uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editingMessage ? (
                <Check className="h-4 w-4" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="px-3 pb-2 text-[11px] text-danger flex items-center gap-1">
          <AlertCircle className="h-3 w-3 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}


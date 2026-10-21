"use client";

/**
 * File picker for Import Excel, document vault uploads, drawing uploads.
 * Drag & drop + click + keyboard, shows accepted types and size limit up front,
 * rejects wrong files with a readable message instead of failing after upload.
 */
import React from "react";
import { UploadCloud, FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function FileDropzone({
  accept,
  maxSizeMB = 10,
  multiple = false,
  files,
  onFilesChange,
  hint,
  disabled,
}: {
  /** e.g. ".xlsx,.xls,.csv" */
  accept?: string;
  maxSizeMB?: number;
  multiple?: boolean;
  files: File[];
  onFilesChange: (files: File[]) => void;
  hint?: string;
  disabled?: boolean;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [drag, setDrag] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const exts = accept?.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean) ?? [];

  const take = (list: FileList | null) => {
    if (!list) return;
    const incoming = Array.from(list);
    const bad = incoming.find((f) => exts.length && !exts.some((e) => f.name.toLowerCase().endsWith(e)));
    if (bad) return setError(`${bad.name} isn't a supported file. Use ${exts.join(", ")}.`);
    const big = incoming.find((f) => f.size > maxSizeMB * 1024 * 1024);
    if (big) return setError(`${big.name} is larger than ${maxSizeMB} MB.`);
    setError(null);
    onFilesChange(multiple ? [...files, ...incoming] : incoming.slice(0, 1));
  };

  const size = (b: number) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); take(e.dataTransfer.files); }}
        className={cn(
          // ui-audit-ignore-next-line drop zones are the one dashed element
          "flex w-full flex-col items-center justify-center gap-2 rounded-[10px] border border-dashed px-4 py-8 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-60",
          drag ? "border-primary bg-accent-soft" : "border-border-active bg-sunken hover:bg-surface-hover",
          error && "border-danger"
        )}
      >
        <UploadCloud className="h-6 w-6 text-muted" aria-hidden />
        <span className="text-[13.5px] font-medium text-foreground">Drop {multiple ? "files" : "a file"} here or <span className="text-accent-soft-text underline">browse</span></span>
        <span className="text-[12px] text-muted">{hint ?? `${exts.length ? exts.join(", ") + " · " : ""}up to ${maxSizeMB} MB`}</span>
      </button>
      <input ref={inputRef} type="file" accept={accept} multiple={multiple} hidden onChange={(e) => { take(e.target.files); e.target.value = ""; }} />
      {error && <p role="alert" className="text-xs font-medium text-danger-text">{error}</p>}
      {files.length > 0 && (
        <ul className="space-y-1.5">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center gap-2.5 rounded-md border border-border bg-surface px-3 py-2 text-[13px]">
              <FileText className="h-4 w-4 shrink-0 text-muted" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{f.name}</span>
              <span className="text-[12px] text-muted tabular">{size(f.size)}</span>
              <button type="button" aria-label={`Remove ${f.name}`} onClick={() => onFilesChange(files.filter((_, j) => j !== i))} className="inline-flex h-6 w-6 items-center justify-center rounded text-muted hover:bg-surface-hover hover:text-foreground">
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

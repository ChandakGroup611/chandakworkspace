"use client";

import React, { useId } from "react";

interface Dms3dFolderIconProps {
  open?: boolean;
  selected?: boolean;
  className?: string;
}

/**
 * 3D-styled layered folder SVG icon with specular highlight, inner sheet peek, and bevelled front flap.
 */
export function Dms3dFolderIcon({ open = false, selected = false, className = "h-4 w-4 shrink-0" }: Dms3dFolderIconProps) {
  const uid = useId().replace(/:/g, "");
  const backId = `fld-back-${uid}`;
  const frontId = `fld-front-${uid}`;
  const rimId = `fld-rim-${uid}`;

  // Selected uses a refined royal-blue 3D folder; default uses warm golden-amber 3D folder
  const backStart = selected ? "#2563EB" : "#D97706";
  const backEnd = selected ? "#1D4ED8" : "#B45309";
  const frontStart = selected ? "#60A5FA" : "#FCD34D";
  const frontMid = selected ? "#3B82F6" : "#F59E0B";
  const frontEnd = selected ? "#2563EB" : "#D97706";
  const strokeCol = selected ? "#1E40AF" : "#92400E";

  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={backId} x1="2" y1="3" x2="20" y2="14" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={backStart} />
          <stop offset="100%" stopColor={backEnd} />
        </linearGradient>
        <linearGradient id={frontId} x1="3" y1="8" x2="20" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={frontStart} />
          <stop offset="45%" stopColor={frontMid} />
          <stop offset="100%" stopColor={frontEnd} />
        </linearGradient>
        <linearGradient id={rimId} x1="12" y1="8" x2="12" y2="12" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Soft ground shadow */}
      <ellipse cx="12" cy="20.6" rx="8.5" ry="1.3" fill="#0F172A" fillOpacity="0.16" />

      {/* Back folder tab & body */}
      <path
        d="M2.5 6.2C2.5 4.98 3.48 4 4.7 4H9.1C9.72 4 10.3 4.28 10.7 4.76L11.8 6.1C12.05 6.4 12.42 6.58 12.82 6.58H19.3C20.52 6.58 21.5 7.56 21.5 8.78V17.6C21.5 18.82 20.52 19.8 19.3 19.8H4.7C3.48 19.8 2.5 18.82 2.5 17.6V6.2Z"
        fill={`url(#${backId})`}
      />

      {/* Crisp inner document peek */}
      <rect
        x="4.5"
        y={open ? "6.2" : "7.0"}
        width="15"
        height="4.5"
        rx="1.1"
        fill="#F8FAFC"
        stroke="#E2E8F0"
        strokeWidth="0.6"
      />

      {/* Front 3D bevelled flap */}
      {open ? (
        <path
          d="M2.2 10.4C2.08 9.48 2.8 8.66 3.72 8.66H20.28C21.2 8.66 21.92 9.48 21.8 10.4L20.85 18.1C20.72 19.12 19.86 19.88 18.83 19.88H5.17C4.14 19.88 3.28 19.12 3.15 18.1L2.2 10.4Z"
          fill={`url(#${frontId})`}
          stroke={strokeCol}
          strokeOpacity="0.28"
          strokeWidth="0.6"
        />
      ) : (
        <path
          d="M2.5 9.6C2.5 8.66 3.26 7.9 4.2 7.9H19.8C20.74 7.9 21.5 8.66 21.5 9.6V17.9C21.5 18.95 20.65 19.8 19.6 19.8H4.4C3.35 19.8 2.5 18.95 2.5 17.9V9.6Z"
          fill={`url(#${frontId})`}
          stroke={strokeCol}
          strokeOpacity="0.28"
          strokeWidth="0.6"
        />
      )}

      {/* Top specular highlight */}
      <path
        d={open ? "M3.7 9.1H20.3" : "M4.1 8.4H19.9"}
        stroke={`url(#${rimId})`}
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </svg>
  );
}

interface Dms3dFileIconProps {
  fileName?: string | null;
  className?: string;
}

interface FileVisualStyle {
  label: string;
  badgeStart: string;
  badgeEnd: string;
  foldColor: string;
  accentTint: string;
}

function getFileStyle(fileName?: string | null): FileVisualStyle {
  const ext = String(fileName || "")
    .trim()
    .split(".")
    .pop()
    ?.toLowerCase();

  switch (ext) {
    case "pdf":
      return { label: "PDF", badgeStart: "#F43F5E", badgeEnd: "#BE123C", foldColor: "#FFE4E6", accentTint: "#FDA4AF" };
    case "xls":
    case "xlsx":
    case "csv":
      return {
        label: ext === "csv" ? "CSV" : "XLS",
        badgeStart: "#10B981",
        badgeEnd: "#047857",
        foldColor: "#D1FAE5",
        accentTint: "#6EE7B7",
      };
    case "doc":
    case "docx":
    case "txt":
    case "rtf":
      return { label: "DOC", badgeStart: "#3B82F6", badgeEnd: "#1D4ED8", foldColor: "#DBEAFE", accentTint: "#93C5FD" };
    case "dwg":
    case "dxf":
    case "rvt":
    case "ifc":
      return { label: "CAD", badgeStart: "#6366F1", badgeEnd: "#4338CA", foldColor: "#E0E7FF", accentTint: "#A5B4FC" };
    case "png":
    case "jpg":
    case "jpeg":
    case "webp":
    case "gif":
    case "svg":
      return { label: "IMG", badgeStart: "#F59E0B", badgeEnd: "#B45309", foldColor: "#FEF3C7", accentTint: "#FCD34D" };
    case "zip":
    case "rar":
    case "7z":
      return { label: "ZIP", badgeStart: "#64748B", badgeEnd: "#334155", foldColor: "#E2E8F0", accentTint: "#CBD5E1" };
    default:
      return { label: "FILE", badgeStart: "#0EA5E9", badgeEnd: "#0369A1", foldColor: "#E0F2FE", accentTint: "#7DD3FC" };
  }
}

/**
 * 3D-styled folded-corner file SVG icon with extension-based semantic color badge.
 */
export function Dms3dFileIcon({ fileName, className = "h-5 w-5 shrink-0" }: Dms3dFileIconProps) {
  const uid = useId().replace(/:/g, "");
  const sheetId = `file-sheet-${uid}`;
  const badgeId = `file-badge-${uid}`;
  const style = getFileStyle(fileName);

  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={sheetId} x1="4" y1="2" x2="19" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#E2E8F0" />
        </linearGradient>
        <linearGradient id={badgeId} x1="3" y1="12" x2="18" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={style.badgeStart} />
          <stop offset="100%" stopColor={style.badgeEnd} />
        </linearGradient>
      </defs>

      {/* Soft ground shadow */}
      <ellipse cx="12.5" cy="21.4" rx="7" ry="1.1" fill="#0F172A" fillOpacity="0.14" />

      {/* 3D document body */}
      <path
        d="M5.2 2.4C4.54 2.4 4 2.94 4 3.6V19.6C4 20.26 4.54 20.8 5.2 20.8H18.8C19.46 20.8 20 20.26 20 19.6V7.5L14.9 2.4H5.2Z"
        fill={`url(#${sheetId})`}
        stroke="#94A3B8"
        strokeOpacity="0.45"
        strokeWidth="0.7"
      />

      {/* Folded top-right corner */}
      <path d="M14.9 2.4V6.3C14.9 6.96 15.44 7.5 16.1 7.5H20L14.9 2.4Z" fill={style.foldColor} />
      <path
        d="M14.9 2.4V6.3C14.9 6.96 15.44 7.5 16.1 7.5H20"
        stroke="#94A3B8"
        strokeOpacity="0.4"
        strokeWidth="0.6"
      />

      {/* Subtle document lines */}
      <rect x="6.5" y="7.2" width="6.2" height="1.2" rx="0.6" fill={style.accentTint} fillOpacity="0.75" />
      <rect x="6.5" y="9.6" width="10.2" height="1.1" rx="0.55" fill="#CBD5E1" />

      {/* 3D semantic extension pill */}
      <rect x="2.6" y="12.4" width="14.2" height="6.2" rx="1.6" fill={`url(#${badgeId})`} />
      <rect x="2.8" y="12.6" width="13.8" height="0.7" rx="0.35" fill="#FFFFFF" fillOpacity="0.35" />
      <text
        x="9.7"
        y="16.85"
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="4.7"
        fontWeight="800"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        letterSpacing="0.25"
      >
        {style.label}
      </text>
    </svg>
  );
}

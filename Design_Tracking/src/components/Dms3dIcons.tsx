"use client";

import React, { useId } from "react";

interface FolderPalette {
  backStart: string;
  backEnd: string;
  frontStart: string;
  frontMid: string;
  frontEnd: string;
  stroke: string;
  peekAccent: string;
}

const FOLDER_PALETTES: FolderPalette[] = [
  // Royal Blue
  {
    backStart: "#2563EB",
    backEnd: "#1E40AF",
    frontStart: "#93C5FD",
    frontMid: "#3B82F6",
    frontEnd: "#1D4ED8",
    stroke: "#1E3A8A",
    peekAccent: "#DBEAFE",
  },
  // Golden Amber
  {
    backStart: "#D97706",
    backEnd: "#92400E",
    frontStart: "#FDE68A",
    frontMid: "#F59E0B",
    frontEnd: "#D97706",
    stroke: "#78350F",
    peekAccent: "#FEF3C7",
  },
  // Emerald Green
  {
    backStart: "#059669",
    backEnd: "#065F46",
    frontStart: "#6EE7B7",
    frontMid: "#10B981",
    frontEnd: "#047857",
    stroke: "#064E3B",
    peekAccent: "#D1FAE5",
  },
  // Violet Purple
  {
    backStart: "#7C3AED",
    backEnd: "#5B21B6",
    frontStart: "#C4B5FD",
    frontMid: "#8B5CF6",
    frontEnd: "#6D28D9",
    stroke: "#4C1D95",
    peekAccent: "#EDE9FE",
  },
  // Coral Rose
  {
    backStart: "#E11D48",
    backEnd: "#9F1239",
    frontStart: "#FDA4AF",
    frontMid: "#F43F5E",
    frontEnd: "#BE123C",
    stroke: "#881337",
    peekAccent: "#FFE4E6",
  },
  // Cyan Teal
  {
    backStart: "#0891B2",
    backEnd: "#155E75",
    frontStart: "#67E8F9",
    frontMid: "#06B6D4",
    frontEnd: "#0E7490",
    stroke: "#164E63",
    peekAccent: "#CFFAFE",
  },
  // Tangerine Orange
  {
    backStart: "#EA580C",
    backEnd: "#9A3412",
    frontStart: "#FDBA74",
    frontMid: "#F97316",
    frontEnd: "#C2410C",
    stroke: "#7C2D12",
    peekAccent: "#FFEDD5",
  },
];

function pickFolderPalette(folderName?: string | null, colorIndex?: number): FolderPalette {
  if (typeof colorIndex === "number" && Number.isFinite(colorIndex)) {
    return FOLDER_PALETTES[Math.abs(Math.floor(colorIndex)) % FOLDER_PALETTES.length];
  }
  const name = String(folderName || "").trim().toLowerCase();
  if (!name) return FOLDER_PALETTES[1]; // Default Golden Amber
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return FOLDER_PALETTES[hash % FOLDER_PALETTES.length];
}

interface Dms3dFolderIconProps {
  open?: boolean;
  selected?: boolean;
  folderName?: string | null;
  colorIndex?: number;
  className?: string;
}

/**
 * Colorful 3D-styled layered folder SVG icon with deterministic palette per folder,
 * specular rim highlight, inner document peek, and bevelled front flap.
 */
export function Dms3dFolderIcon({
  open = false,
  selected = false,
  folderName,
  colorIndex,
  className = "h-4 w-4 shrink-0",
}: Dms3dFolderIconProps) {
  const uid = useId().replace(/:/g, "");
  const backId = `fld-back-${uid}`;
  const frontId = `fld-front-${uid}`;
  const rimId = `fld-rim-${uid}`;
  const palette = pickFolderPalette(folderName, colorIndex);

  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={backId} x1="2" y1="3" x2="20" y2="14" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={palette.backStart} />
          <stop offset="100%" stopColor={palette.backEnd} />
        </linearGradient>
        <linearGradient id={frontId} x1="3" y1="7" x2="20" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={palette.frontStart} />
          <stop offset="45%" stopColor={palette.frontMid} />
          <stop offset="100%" stopColor={palette.frontEnd} />
        </linearGradient>
        <linearGradient id={rimId} x1="12" y1="8" x2="12" y2="12" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Soft ground shadow */}
      <ellipse cx="12" cy="20.7" rx="8.6" ry="1.35" fill="#0F172A" fillOpacity={selected ? "0.24" : "0.16"} />

      {/* Back folder tab & body */}
      <path
        d="M2.5 6.2C2.5 4.98 3.48 4 4.7 4H9.1C9.72 4 10.3 4.28 10.7 4.76L11.8 6.1C12.05 6.4 12.42 6.58 12.82 6.58H19.3C20.52 6.58 21.5 7.56 21.5 8.78V17.6C21.5 18.82 20.52 19.8 19.3 19.8H4.7C3.48 19.8 2.5 18.82 2.5 17.6V6.2Z"
        fill={`url(#${backId})`}
      />

      {/* Crisp inner document peek */}
      <rect
        x="4.5"
        y={open ? "6.0" : "6.9"}
        width="15"
        height="4.6"
        rx="1.1"
        fill="#FFFFFF"
        stroke={palette.peekAccent}
        strokeWidth="0.7"
      />
      <rect x="6.2" y={open ? "7.2" : "8.0"} width="7" height="0.9" rx="0.45" fill={palette.frontStart} fillOpacity="0.8" />

      {/* Front 3D bevelled flap */}
      {open ? (
        <path
          d="M2.1 10.4C1.98 9.48 2.7 8.66 3.62 8.66H20.38C21.3 8.66 22.02 9.48 21.9 10.4L20.9 18.1C20.76 19.12 19.9 19.88 18.87 19.88H5.13C4.1 19.88 3.24 19.12 3.1 18.1L2.1 10.4Z"
          fill={`url(#${frontId})`}
          stroke={palette.stroke}
          strokeOpacity="0.3"
          strokeWidth="0.6"
        />
      ) : (
        <path
          d="M2.5 9.6C2.5 8.66 3.26 7.9 4.2 7.9H19.8C20.74 7.9 21.5 8.66 21.5 9.6V17.9C21.5 18.95 20.65 19.8 19.6 19.8H4.4C3.35 19.8 2.5 18.95 2.5 17.9V9.6Z"
          fill={`url(#${frontId})`}
          stroke={palette.stroke}
          strokeOpacity="0.3"
          strokeWidth="0.6"
        />
      )}

      {/* Top specular highlight */}
      <path
        d={open ? "M3.7 9.1H20.3" : "M4.1 8.4H19.9"}
        stroke={`url(#${rimId})`}
        strokeWidth="1.2"
        strokeLinecap="round"
      />

      {/* Active selection dot */}
      {selected && <circle cx="18.6" cy="16.8" r="1.3" fill="#FFFFFF" fillOpacity="0.9" />}
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

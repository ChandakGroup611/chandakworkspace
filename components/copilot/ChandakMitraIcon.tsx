import React from "react";

interface ChandakMitraIconProps {
  className?: string;
  size?: number | string;
  animated?: boolean;
}

/**
 * Chandak Mitra Icon — The friendly, funny & helpful avatar
 * Features:
 * - Winking eye & cheerful smile (funny & friendly)
 * - Real estate safety hardhat (Chandak DNA)
 * - Helper sparkle beacon (always ready to assist)
 */
export function ChandakMitraIcon({ className = "h-5 w-5", size, animated = false }: ChandakMitraIconProps) {
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={size ? { width: size, height: size } : undefined}
      aria-hidden="true"
    >
      {/* Outer subtle glow ring */}
      <circle cx="18" cy="18" r="17" className="fill-theme-btn-primary/10 stroke-theme-btn-primary/30" strokeWidth="1.2" />

      {/* Real Estate Amber Hard Hat */}
      <path
        d="M9.5 15C9.5 10 13.2 6.5 18 6.5C22.8 6.5 26.5 10 26.5 15C26.5 15.5 26.2 16 25 16H11C9.8 16 9.5 15.5 9.5 15Z"
        fill="#F59E0B"
      />
      {/* Hard Hat Lower Brim */}
      <rect x="7" y="14.5" width="22" height="2.5" rx="1.25" fill="#D97706" />
      {/* Hard Hat Top Ridge */}
      <rect x="16.5" y="6.5" width="3" height="6.5" rx="1" fill="#FBBF24" />

      {/* Face Base */}
      <circle cx="18" cy="22.5" r="9.5" className="fill-surface stroke-border" strokeWidth="1.4" />

      {/* Left Eye: Playful Winking Arc ;) */}
      <path
        d="M13 21C13.6 20 15.4 20 16 21"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      {/* Right Eye: Curious wide eye with white twinkle */}
      <circle cx="21" cy="21" r="1.8" fill="currentColor" />
      <circle cx="21.5" cy="20.4" r="0.6" fill="#FFFFFF" />

      {/* Cute Rosy Blush Cheeks */}
      <circle cx="11.8" cy="23.8" r="1.3" fill="#F43F5E" fillOpacity="0.35" />
      <circle cx="24.2" cy="23.8" r="1.3" fill="#F43F5E" fillOpacity="0.35" />

      {/* Warm Helpful Grin */}
      <path
        d="M14.5 24.5C15.5 26.8 20.5 26.8 21.5 24.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      {/* Helper Sparkle */}
      <path
        d="M28.5 5.5L29.2 7.2L31 7.8L29.2 8.5L28.5 10.2L27.8 8.5L26 7.8L27.8 7.2L28.5 5.5Z"
        fill="#38BDF8"
        className={animated ? "animate-pulse" : ""}
      />
    </svg>
  );
}

import React from "react";

interface ChandakMitraIconProps {
  className?: string;
  size?: number | string;
  animated?: boolean;
}

/**
 * Chandak Mitra Mascot Icon — High-Visibility, Ultra-Crisp & Friendly
 * 
 * Engineered for maximum visibility across dark and light themes:
 * - Bright ivory face base with 100% contrast against any background
 * - Bold #0F172A expressive facial features (wink + shine eye + joyful open smile)
 * - Cheerful golden-amber real estate hardhat with 3D brim & Chandak apex mark
 * - Vibrant electric-cyan helper beacon sparkle
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
      <defs>
        <linearGradient id="cm-helmet-grad" x1="18" y1="4" x2="18" y2="16" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FCD34D" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
        <linearGradient id="cm-face-grad" x1="18" y1="16" x2="18" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#FFFBEB" />
        </linearGradient>
      </defs>

      {/* Outer soft ambient glow ring for instant recognition */}
      <circle cx="18" cy="18" r="17.2" className="fill-amber-500/10 stroke-amber-500/25" strokeWidth="0.8" />

      {/* Head / Face Base: Bright warm ivory — High contrast on dark & light surfaces */}
      <circle cx="18" cy="21.5" r="11" fill="url(#cm-face-grad)" stroke="#FDE68A" strokeWidth="1.2" />

      {/* Cute Rosy Pink Blush Cheeks */}
      <ellipse cx="11" cy="24.5" rx="2" ry="1.2" fill="#FB7185" fillOpacity="0.75" />
      <ellipse cx="25" cy="24.5" rx="2" ry="1.2" fill="#FB7185" fillOpacity="0.75" />

      {/* Left Eye: Playful, Cheerful Wink 😉 (Bold & unmistakable) */}
      <path
        d="M 12 21 C 13 19 15.5 19 16.5 21"
        stroke="#0F172A"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M 11.8 21.2 L 10.5 20"
        stroke="#0F172A"
        strokeWidth="1.6"
        strokeLinecap="round"
      />

      {/* Right Eye: Big, Curious Cartoon Eye with Double Twinkle */}
      <circle cx="22.5" cy="20.5" r="2.8" fill="#0F172A" />
      <circle cx="23.6" cy="19.4" r="1" fill="#FFFFFF" />
      <circle cx="21.7" cy="21.6" r="0.45" fill="#FFFFFF" />

      {/* Warm, Joyful Open Smile with White Teeth & Cute Tongue */}
      <path
        d="M 14.2 24.5 C 14.2 29.2 21.8 29.2 21.8 24.5 Z"
        fill="#BE123C"
        stroke="#0F172A"
        strokeWidth="1.2"
      />
      {/* Top Teeth */}
      <path
        d="M 14.8 24.5 Q 18 25.8 21.2 24.5"
        fill="#FFFFFF"
        stroke="#FFFFFF"
        strokeWidth="1"
      />
      {/* Friendly Tongue */}
      <path
        d="M 16 27.2 Q 18 26 20 27.2 C 20 28.5 16 28.5 16 27.2 Z"
        fill="#FB7185"
      />

      {/* Real Estate Amber Safety Hardhat Dome */}
      <path
        d="M 7.5 15.5 C 7.5 7.8 12 4 18 4 C 24 4 28.5 7.8 28.5 15.5 Z"
        fill="url(#cm-helmet-grad)"
        stroke="#D97706"
        strokeWidth="0.8"
      />

      {/* Hardhat Center Spine / Ridge Highlight */}
      <path
        d="M 16.8 4.2 C 16.8 4.2 18 3.8 19.2 4.2 V 13 H 16.8 V 4.2 Z"
        fill="#FEF08A"
      />

      {/* Hardhat Lower Brim: Crisp extruded visor */}
      <rect x="5.5" y="14.2" width="25" height="3.2" rx="1.6" fill="#D97706" />
      <line x1="7.5" y1="15.2" x2="28.5" y2="15.2" stroke="#FEF08A" strokeWidth="0.9" strokeLinecap="round" />

      {/* Chandak Apex Triangle Mark on Helmet */}
      <polygon points="18,7.5 15.5,11.5 20.5,11.5" fill="#92400E" />
      <polygon points="18,8.5 16.3,10.8 19.7,10.8" fill="#FEF08A" />

      {/* Helper Sparkle Beacon (Electric Cyan 4-Point Star) */}
      <path
        d="M 30 1.5 L 31 4.5 L 34 5.5 L 31 6.5 L 30 9.5 L 29 6.5 L 26 5.5 L 29 4.5 Z"
        fill="#38BDF8"
        className={animated ? "animate-pulse origin-center" : ""}
      />
      <circle cx="30" cy="5.5" r="0.75" fill="#FFFFFF" />
    </svg>
  );
}

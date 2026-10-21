"use client";

import React from 'react';

export interface ChandakLoaderProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  title?: string;
  subtitle?: string;
  fullscreen?: boolean;
  className?: string;
}

const sizeConfig = {
  xs: { box: 'h-8 w-8', img: 'h-6 w-6', ring: 'h-8 w-8' },
  sm: { box: 'h-12 w-12', img: 'h-8 w-8', ring: 'h-12 w-12' },
  md: { box: 'h-16 w-16', img: 'h-11 w-11', ring: 'h-16 w-16' },
  lg: { box: 'h-24 w-24', img: 'h-16 w-16', ring: 'h-24 w-24' },
  xl: { box: 'h-32 w-32', img: 'h-24 w-24', ring: 'h-32 w-32' },
};

export default function ChandakLoader({
  size = 'md',
  title,
  subtitle,
  fullscreen = false,
  className = '',
}: ChandakLoaderProps) {
  const currentSize = sizeConfig[size] || sizeConfig.md;

  const content = (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
      {/* 40-Years Logo Animated Badge */}
      <div className={`relative flex items-center justify-center ${currentSize.box}`}>
        {/* Ambient background ring using tokens */}
        <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse duration-1000" />
        
        {/* Smooth spinning accent ring using design tokens */}
        <div className={`absolute inset-0 rounded-full border-2 border-transparent border-t-primary border-r-primary/40 animate-spin ${currentSize.ring}`} />
        
        {/* 40-Years Logo Icon */}
        <div className="relative z-10 flex items-center justify-center rounded-full bg-surface border border-border p-1.5 shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/chandak-40-icon.png"
            alt="Chandak"
            className={`${currentSize.img} object-contain`}
            style={{ imageRendering: '-webkit-optimize-contrast' }}
            onError={(e) => {
              const target = e.currentTarget;
              if (target.src.endsWith(".png")) {
                target.src = "/chandak-40-icon.svg";
              }
            }}
          />
        </div>
      </div>

      {/* Optional Title & Subtitle */}
      {(title || subtitle) && (
        <div className="flex flex-col items-center text-center space-y-1">
          {title && (
            <h3 className="text-base md:text-lg font-semibold text-foreground tracking-tight">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-xs md:text-sm text-muted font-normal font-sans">
              {subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-[var(--overlay)]">
        <div className="p-6 rounded-xl bg-surface border border-border shadow-xl">
          {content}
        </div>
      </div>
    );
  }

  return content;
}
export { ChandakLoader };

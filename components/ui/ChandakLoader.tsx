import React from 'react';

interface ChandakLoaderProps {
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
        {/* Glowing ambient background ring */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#7B1D56]/20 via-[#D4AF37]/20 to-[#1E3A8A]/20 blur-md animate-pulse duration-1000" />
        
        {/* Smooth spinning accent ring */}
        <div className={`absolute inset-0 rounded-full border-2 border-transparent border-t-[#7B1D56] border-r-[#D4AF37] animate-spin ${currentSize.ring}`} />
        
        {/* 40-Years Logo Icon */}
        <div className="relative z-10 flex items-center justify-center rounded-full bg-surface/80 dark:bg-background/80 p-1.5 shadow-sm backdrop-blur-sm">
          <img
            src="/chandak-40-icon.png"
            alt="Chandak 40 Years"
            className={`${currentSize.img} object-contain transition-transform duration-300`}
            style={{ imageRendering: '-webkit-optimize-contrast' }}
          />
        </div>
      </div>

      {/* Optional Title & Subtitle */}
      {(title || subtitle) && (
        <div className="flex flex-col items-center text-center space-y-1">
          {title && (
            <h3 className="text-base md:text-lg font-bold text-foreground tracking-tight">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-xs md:text-sm text-muted font-medium font-sans">
              {subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md">
        {content}
      </div>
    );
  }

  return content;
}

'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, Sparkles, X } from 'lucide-react';

export default function DeploymentVersionBanner() {
  const [initialBootTime, setInitialBootTime] = useState<string | null>(null);
  const [hasNewDeployment, setHasNewDeployment] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkVersion = async () => {
      try {
        const res = await fetch('/api/version', {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!data?.serverBootTime) return;

        if (!initialBootTime) {
          setInitialBootTime(data.serverBootTime);
        } else if (data.serverBootTime !== initialBootTime && isMounted) {
          setHasNewDeployment(true);
        }
      } catch {}
    };

    checkVersion();
    const interval = setInterval(checkVersion, 60000);

    const handleFocus = () => checkVersion();
    window.addEventListener('focus', handleFocus);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [initialBootTime]);

  if (!hasNewDeployment || isDismissed) return null;

  return (
    <div className="bg-theme-btn-primary text-theme-btn-primary-text px-4 py-2 flex items-center justify-between shadow-md text-xs font-medium animate-in slide-in-from-top duration-300 z-50">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 animate-pulse shrink-0" />
        <span>
          A new system update has been deployed to production! Reload to get the latest features and fixes.
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-white/20 hover:bg-white/30 text-white font-bold transition-all cursor-pointer"
        >
          <RefreshCw className="h-3 w-3" />
          <span>Reload Page</span>
        </button>
        <button
          onClick={() => setIsDismissed(true)}
          className="p-1 hover:bg-white/20 rounded text-white/80 hover:text-white transition-colors cursor-pointer"
          title="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

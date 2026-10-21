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
    <div className="bg-primary text-primary-foreground px-4 py-2 flex items-center justify-between shadow-xs text-xs font-medium animate-in slide-in-from-top duration-200 relative z-20">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 shrink-0" />
        <span>
          A new system update has been deployed. Reload to load the latest version.
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary-foreground/15 hover:bg-primary-foreground/25 text-primary-foreground font-semibold transition-colors cursor-pointer text-xs"
        >
          <RefreshCw className="h-3 w-3" />
          <span>Reload</span>
        </button>
        <button
          type="button"
          aria-label="Dismiss banner"
          onClick={() => setIsDismissed(true)}
          className="p-1 hover:bg-primary-foreground/15 rounded-md text-primary-foreground/80 hover:text-primary-foreground transition-colors cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, Sparkles, X } from 'lucide-react';

export default function DeploymentVersionBanner() {
  const [initialBootTime, setInitialBootTime] = useState<string | null>(null);
  const [hasNewDeployment, setHasNewDeployment] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let lastCheckedAt = Date.now();

    const checkVersion = async () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      lastCheckedAt = Date.now();
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
      } catch { }
    };

    checkVersion();
    // R1: Check every 10 min, paused when hidden
    const interval = setInterval(checkVersion, 600000);

    const handleFocus = () => {
      if (Date.now() - lastCheckedAt >= 600000) {
        checkVersion();
      }
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [initialBootTime]);

  if (!hasNewDeployment || isDismissed) return null;

  return (
    <div role="status" className="relative z-[var(--z-header)] flex items-center justify-between gap-3 border-b border-info-border bg-info-soft px-4 py-1.5 text-[13px] text-info-text">
      <div className="flex min-w-0 items-center gap-2">
        <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
        <span className="truncate">A new version of Chandak Workspace is available. Reload to get the latest changes.</span>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => {
            try {
              localStorage.removeItem("demo_users_cache");
              localStorage.removeItem("mock_users");
              localStorage.removeItem("local_deleted_users");
              localStorage.removeItem("local_created_users");
              localStorage.removeItem("local_users_updates");
              if ("caches" in window) {
                caches.keys().then((names) => names.forEach((name) => caches.delete(name))).catch(() => { });
              }
            } catch (e) { }
            window.location.href = window.location.pathname + (window.location.search ? window.location.search + '&_t=' : '?_t=') + Date.now();
          }}
          className="inline-flex h-7 items-center gap-1.5 rounded-md border border-info-border bg-surface px-2.5 text-[12.5px] font-medium text-foreground hover:bg-surface-hover"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          Reload
        </button>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => setIsDismissed(true)}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-surface/60"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}

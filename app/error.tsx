'use client';

import { useEffect } from 'react';
import { AppButton } from '@/components/ui/AppButton';

export default function GlobalError({ error, reset }: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[GlobalError caught in app/error.tsx]:', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center bg-surface/50 rounded-2xl border border-border m-4 shadow-sm">
      <div className="w-12 h-12 rounded-2xl bg-danger/10 text-danger flex items-center justify-center mb-4">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h1 className="mb-2 text-xl font-bold text-foreground">
        Something went wrong
      </h1>
      <p className="mb-4 text-xs text-muted-foreground max-w-md break-words">
        {error?.message || "An unexpected error occurred while rendering this module."}
      </p>
      {error?.digest && (
        <p className="mb-6 text-xs text-subtle font-mono">
          Digest: <code className="rounded bg-surface px-1.5 py-0.5 text-danger">{error.digest}</code>
        </p>
      )}
      <div className="flex items-center gap-3">
        <AppButton
          onClick={() => reset()}
          className="rounded bg-theme-btn-primary theme-tab-standard text-white hover:bg-theme-btn-primary-secondary px-4 py-2 font-semibold text-xs"
        >
          Try again
        </AppButton>
        <AppButton
          variant="outline"
          onClick={() => {
            if (typeof window !== "undefined") {
              window.location.reload();
            }
          }}
          className="rounded text-xs px-4 py-2"
        >
          Reload Page
        </AppButton>
      </div>
    </div>
  );
}

/* eslint-disable no-restricted-syntax */
'use client';


import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Root GlobalError caught in app/global-error.tsx]:', error);

    // Auto-recover if a new production deployment superseded the cached client chunks
    if (typeof window !== 'undefined' && error?.message) {
      const isChunkError = /loading chunk|chunkloaderror|missing:.*\.js/i.test(error.message);
      if (isChunkError) {
        const lastChunkReload = sessionStorage.getItem('last_chunk_reload');
        const now = Date.now();
        if (!lastChunkReload || now - Number(lastChunkReload) > 15000) {
          sessionStorage.setItem('last_chunk_reload', String(now));
          window.location.reload();
        }
      }
    }
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-surface border border-border rounded-xl p-6 text-center shadow-lg">
          <div className="w-12 h-12 rounded-xl bg-danger-soft text-danger-text border border-danger-border flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-heading mb-2">Application Error</h2>
          <p className="text-xs text-muted mb-4 break-words">
            {error?.message || "A critical error occurred while loading the application."}
          </p>
          {error?.digest && (
            <p className="text-[11px] text-muted font-mono mb-6 bg-sunken p-2 rounded-lg border border-border break-all">
              Error Digest: {error.digest}
            </p>
          )}
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => reset()}
              className="px-4 py-2 text-xs font-semibold rounded-md bg-primary hover:bg-primary-hover text-primary-foreground transition-colors"
            >
              Try Again
            </button>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.location.href = "/";
                }
              }}
              className="px-4 py-2 text-xs font-semibold rounded-md bg-surface hover:bg-surface-hover text-foreground border border-border transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}

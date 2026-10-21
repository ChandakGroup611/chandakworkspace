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
          <h2 className="mb-1.5 text-[17px] font-semibold text-heading">Chandak Workspace didn&apos;t load</h2>
          <p className="mb-4 text-[13.5px] text-muted">
            Try again. If it keeps happening, send the reference below to IT support.
          </p>
          {error?.digest && (
            <p className="text-[11px] text-muted font-mono mb-6 bg-sunken p-2 rounded-lg border border-border break-all">
              Reference: {error.digest}
            </p>
          )}
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => reset()}
              className="h-9 rounded-md bg-primary px-4 text-[13.5px] font-medium text-primary-foreground hover:bg-primary-hover"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.location.href = "/";
                }
              }}
              className="h-9 rounded-md px-4 text-[13.5px] font-medium text-foreground hover:bg-surface-hover"
            >
              Go to home
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}

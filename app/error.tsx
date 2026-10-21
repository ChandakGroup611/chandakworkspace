'use client';

import { useEffect } from 'react';
import { AppButton } from '@/components/ui/AppButton';

export default function GlobalError({ error, reset }: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[GlobalError caught in app/error.tsx]:', error);

    // Auto-recover if a new production deployment superseded the cached client chunks
    if (typeof window !== 'undefined' && error?.message) {
      const isChunkError = /loading chunk|chunkloaderror|missing:.*\.js/i.test(error.message);
      if (isChunkError) {
        const lastChunkReload = sessionStorage.getItem('last_chunk_reload');
        const now = Date.now();
        // Prevent infinite reload loop: allow 1 auto-reload every 15 seconds
        if (!lastChunkReload || now - Number(lastChunkReload) > 15000) {
          sessionStorage.setItem('last_chunk_reload', String(now));
          window.location.reload();
        }
      }
    }
  }, [error]);

  return (
    <div className="m-4 flex min-h-[60vh] flex-col items-center justify-center rounded-[10px] border border-border bg-surface p-8 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger-soft text-danger-text">
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h1 className="mb-1.5 text-[17px] font-semibold text-heading">
        This page didn&apos;t load
      </h1>
      <p className="mb-4 max-w-md text-[13.5px] text-muted">
        Try again. If it keeps happening, send the reference below to IT support so they can trace it.
      </p>
      {error?.digest && (
        <p className="mb-6 text-[12.5px] text-muted">
          Reference <code className="rounded bg-sunken px-1.5 py-0.5 font-mono text-foreground">{error.digest}</code>
        </p>
      )}
      <div className="flex items-center gap-2">
        <AppButton onClick={() => reset()}>Try again</AppButton>
        <AppButton
          variant="ghost"
          onClick={() => {
            if (typeof window !== "undefined") {
              window.location.reload();
            }
          }}
        >
          Reload page
        </AppButton>
      </div>
    </div>
  );
}

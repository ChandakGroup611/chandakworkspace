'use client';

import { useEffect } from 'react';
import { AppButton } from '@/components/ui/AppButton';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function WorkspacesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[WorkspacesError caught in app/workspaces/error.tsx]:', error);
  }, [error]);

  return (
    <div className="m-4 flex min-h-[60vh] flex-col items-center justify-center rounded-[10px] border border-border bg-surface p-8 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-warning-soft text-warning-text">
        <AlertTriangle className="h-6 w-6" aria-hidden />
      </div>
      <h1 className="mb-1.5 text-[17px] font-semibold text-heading">
        Workspaces didn't load
      </h1>
      <p className="mb-4 max-w-md text-[13.5px] text-muted">
        Something interrupted loading this view. Try again; if it keeps happening, send the reference below to IT support.
      </p>
      {error?.digest && (
        <p className="mb-6 text-[12.5px] text-muted">
          Reference <code className="rounded bg-sunken px-1.5 py-0.5 font-mono text-foreground">{error.digest}</code>
        </p>
      )}
      <div className="flex items-center gap-2">
        <AppButton
          onClick={() => reset()}
          variant="primary"
          leftIcon={<RefreshCw className="h-4 w-4" />}
        >
          Try again
        </AppButton>
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

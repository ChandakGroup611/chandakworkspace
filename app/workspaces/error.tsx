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
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center bg-surface/50 rounded-2xl border border-border m-4 shadow-sm">
      <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h1 className="mb-2 text-xl font-bold text-foreground">
        Workspace Module Notice
      </h1>
      <p className="mb-4 text-xs text-muted-foreground max-w-md break-words">
        {error?.message || "An issue occurred while loading this workspace view. Please retry or reload."}
      </p>
      {error?.digest && (
        <p className="mb-6 text-xs text-muted font-mono">
          Code: <code className="rounded bg-surface px-1.5 py-0.5 text-foreground">{error.digest}</code>
        </p>
      )}
      <div className="flex items-center gap-3">
        <AppButton
          onClick={() => reset()}
          className="rounded bg-theme-btn-primary text-theme-btn-primary-text hover:bg-theme-btn-primary-secondary px-4 py-2 font-semibold text-xs flex items-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry View
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

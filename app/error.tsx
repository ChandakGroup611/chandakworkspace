'use client';

import { useEffect } from 'react';
import { AppButton } from '@/components/ui/AppButton';

export default function GlobalError({ error, reset }: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface p-8">
      <h1 className="mb-4 text-2xl font-bold text-foreground">
        Something went wrong
      </h1>
      {error?.digest && (
        <p className="mb-4 text-sm text-subtle">
          Error ID: <code className="rounded bg-surface/75 px-1 py-0.5 font-mono text-xs text-danger">
            {error.digest}
          </code>
        </p>
      )}
      <AppButton
        onClick={() => reset()}
        className="rounded bg-theme-btn-primary px-4 py-2 text-sm font-medium text-white hover:bg-theme-btn-primary-secondary"
      >
        Try again
      </AppButton>
    </div>
  );
}

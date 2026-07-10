'use client';

export default function GlobalError({ error, reset }: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-8">
      <h1 className="mb-4 text-2xl font-bold text-gray-800">
        Something went wrong
      </h1>
      {error?.digest && (
        <p className="mb-4 text-sm text-gray-600">
          Error ID: <code className="rounded bg-white/75 px-1 py-0.5 font-mono text-xs text-red-600">
            {error.digest}
          </code>
        </p>
      )}
      <button
        onClick={() => reset()}
        className="rounded bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-secondary"
      >
        Try again
      </button>
    </div>
  );
}

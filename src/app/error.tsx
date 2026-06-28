'use client';

import React from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Log the error so it surfaces in the browser console and any attached
    // monitoring. Avoid posting message/stack to an endpoint (may contain
    // sensitive data); the digest is a safe, server-correlatable identifier.
    console.error('[error-boundary]', {
      route: typeof window !== 'undefined' ? window.location.pathname : undefined,
      digest: error.digest,
      message: error.message,
    });
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center max-w-xl mx-auto px-4">
        <h1 className="text-4xl font-bold mb-6 text-[rgba(var(--mg-primary),1)]">
          Something Went Wrong
        </h1>
        <p className="text-lg mb-8">
          We&apos;re experiencing technical difficulties. If the problem persists, please report the
          error ID below.
        </p>
        <div className="mb-8 p-6 border border-[rgba(var(--mg-primary),0.3)] rounded-lg bg-black/30">
          <p className="text-sm opacity-80 mb-4">
            SYSTEM LOG: Unexpected error encountered. System stability compromised.
          </p>
          <p className="text-sm opacity-80">
            Recommended action: Attempt system reset or navigate to stable coordinates.
          </p>
          {error.digest && <p className="text-xs opacity-60 mt-4">Error ID: {error.digest}</p>}
        </div>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button
            onClick={reset}
            className="px-6 py-3 bg-[rgba(var(--mg-primary),0.2)] hover:bg-[rgba(var(--mg-primary),0.3)] border border-[rgba(var(--mg-primary),0.5)] rounded-md transition-all duration-300"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="px-6 py-3 bg-[rgba(var(--mg-primary),0.2)] hover:bg-[rgba(var(--mg-primary),0.3)] border border-[rgba(var(--mg-primary),0.5)] rounded-md transition-all duration-300"
          >
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

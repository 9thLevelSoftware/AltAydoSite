'use client';

import React from 'react';

export default function GlobalError({
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
    console.error('[global-error-boundary]', {
      route: typeof window !== 'undefined' ? window.location.pathname : undefined,
      digest: error.digest,
      message: error.message,
    });
  }, [error]);

  return (
    <html lang="en">
      <body className="font-quantify bg-black text-white min-h-screen antialiased overflow-x-hidden text-sm">
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center max-w-xl mx-auto px-4">
            <h1 className="text-4xl font-bold mb-6 text-red-500">Critical System Error</h1>
            <p className="text-lg mb-8">
              A critical error has occurred. The system is unable to recover automatically.
            </p>
            <div className="mb-8 p-6 border border-red-500/30 rounded-lg bg-black/30">
              <p className="text-sm opacity-80 mb-4">
                SYSTEM LOG: Critical failure detected. Core systems compromised.
              </p>
              <p className="text-sm opacity-80">
                Recommended action: Perform complete system restart.
              </p>
              {error.digest && <p className="text-xs opacity-60 mt-4">Error ID: {error.digest}</p>}
            </div>
            <button
              onClick={reset}
              className="px-6 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-md transition-all duration-300"
            >
              Restart System
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}

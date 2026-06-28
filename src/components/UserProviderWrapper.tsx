'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import ErrorBoundary from './ErrorBoundary';

// Create a context for storing random IDs consistently
export const RandomIdContext = createContext<{ randomId: string }>({
  randomId: 'XXXX',
});

export const useRandomId = () => useContext(RandomIdContext);

export default function UserProviderWrapper({ children }: { children: React.ReactNode }) {
  const [randomId, setRandomId] = useState('XXXX');

  // Only generate random ID on the client side after initial render
  useEffect(() => {
    try {
      setRandomId(Math.random().toString(36).substring(2, 6).toUpperCase());
    } catch (e) {
      console.error('Error generating random ID:', e);
    }
  }, []);

  // Auth/render errors are surfaced by the ErrorBoundary below and handled by
  // NextAuth directly. We intentionally avoid a global `window` error listener
  // that substring-scans arbitrary error messages, since common substrings like
  // "auth"/"session"/"secret" produce false positives and mask unrelated bugs.

  return (
    <ErrorBoundary>
      <RandomIdContext.Provider value={{ randomId }}>{children}</RandomIdContext.Provider>
    </ErrorBoundary>
  );
}

'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logError } from '@/lib/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to monitoring service
    logError('React ErrorBoundary caught an error', error, {
      component: 'ErrorBoundary',
      errorInfo,
    });
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        this.props.fallback || (
          <div className="min-h-screen flex items-center justify-center bg-black text-white">
            <div className="text-center max-w-md mx-auto p-6 border border-[rgba(var(--mg-primary),0.3)] rounded-lg bg-gray-900">
              <h2 className="text-xl font-bold mb-4">Something went wrong</h2>
              <p className="mb-4 text-gray-400 text-sm">
                We encountered an error while rendering this page. Please try again later.
              </p>
              {process.env.NODE_ENV !== 'production' && this.state.error && (
                <div className="mb-4 p-3 bg-gray-800 rounded text-left overflow-auto text-xs">
                  <pre>{this.state.error.toString()}</pre>
                </div>
              )}
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-[rgba(var(--mg-primary),0.2)] border border-[rgba(var(--mg-primary),0.5)] text-white rounded hover:bg-[rgba(var(--mg-primary),0.3)]"
              >
                Reload Page
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

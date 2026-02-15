'use client';

import { useContext, useMemo } from 'react';
import { ToastContext } from '@/components/ui/mobiglas/MobiGlasToastProvider';

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error(
      'useToast must be used within a MobiGlasToastProvider. ' +
      'Ensure your component is wrapped in the Providers component from src/components/providers/index.tsx.'
    );
  }

  const toast = useMemo(() => ({
    success: (message: string, duration?: number) => context.addToast('success', message, duration),
    error: (message: string, duration?: number) => context.addToast('error', message, duration),
    info: (message: string, duration?: number) => context.addToast('info', message, duration),
    warning: (message: string, duration?: number) => context.addToast('warning', message, duration),
  }), [context]);

  return { toast };
}

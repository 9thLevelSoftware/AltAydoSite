'use client';

import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import MobiGlasConfirmDialog from '@/components/ui/mobiglas/MobiGlasConfirmDialog';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
}

interface ConfirmDialogContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmDialogContext = createContext<ConfirmDialogContextValue | null>(null);

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [dialogState, setDialogState] = useState<(ConfirmOptions & { open: boolean }) | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setDialogState({ ...options, open: true });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    resolveRef.current?.(true);
    resolveRef.current = null;
    setDialogState(null);
  }, []);

  const handleCancel = useCallback(() => {
    resolveRef.current?.(false);
    resolveRef.current = null;
    setDialogState(null);
  }, []);

  return React.createElement(
    ConfirmDialogContext.Provider,
    { value: { confirm } },
    children,
    React.createElement(MobiGlasConfirmDialog, {
      open: dialogState?.open ?? false,
      title: dialogState?.title ?? '',
      message: dialogState?.message ?? '',
      confirmLabel: dialogState?.confirmLabel,
      cancelLabel: dialogState?.cancelLabel,
      variant: dialogState?.variant ?? 'default',
      onConfirm: handleConfirm,
      onCancel: handleCancel,
    })
  );
}

export function useConfirmDialog() {
  const context = useContext(ConfirmDialogContext);

  if (!context) {
    throw new Error(
      'useConfirmDialog must be used within a ConfirmDialogProvider. ' +
      'Ensure your component is wrapped in the Providers component from src/components/providers/index.tsx.'
    );
  }

  return context;
}

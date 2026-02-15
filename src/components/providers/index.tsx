// This file contains all the providers for the application
'use client';

import { ReactNode } from 'react';
import { SessionProvider } from 'next-auth/react';
import { MobiGlasToastProvider } from '@/components/ui/mobiglas/MobiGlasToastProvider';
import { ConfirmDialogProvider } from '@/hooks/useConfirmDialog';

interface ProvidersProps {
  children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <MobiGlasToastProvider>
        <ConfirmDialogProvider>
          {children}
        </ConfirmDialogProvider>
      </MobiGlasToastProvider>
    </SessionProvider>
  );
} 
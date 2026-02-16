'use client';

import { ReactNode } from 'react';
import { SessionProvider } from 'next-auth/react';
import { LazyMotion, domMax } from 'motion/react';
import { MobiGlasToastProvider } from '@/components/ui/mobiglas/MobiGlasToastProvider';
import { ConfirmDialogProvider } from '@/hooks/useConfirmDialog';

interface ProvidersProps {
  children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <LazyMotion features={domMax}>
        <MobiGlasToastProvider>
          <ConfirmDialogProvider>
            {children}
          </ConfirmDialogProvider>
        </MobiGlasToastProvider>
      </LazyMotion>
    </SessionProvider>
  );
}

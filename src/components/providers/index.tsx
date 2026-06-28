'use client';

import { ReactNode } from 'react';
import { SessionProvider } from 'next-auth/react';
import { LazyMotion, domMax } from 'motion/react';
import { MobiGlasToastProvider } from '@/components/ui/mobiglas/MobiGlasToastProvider';
import { ConfirmDialogProvider } from '@/hooks/useConfirmDialog';
import ChunkReloadGuard from '@/components/ChunkReloadGuard';

interface ProvidersProps {
  children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <ChunkReloadGuard />
      <LazyMotion features={domMax}>
        <MobiGlasToastProvider>
          <ConfirmDialogProvider>{children}</ConfirmDialogProvider>
        </MobiGlasToastProvider>
      </LazyMotion>
    </SessionProvider>
  );
}

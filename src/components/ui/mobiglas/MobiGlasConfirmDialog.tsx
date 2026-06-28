'use client';

import React, { useId, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import MobiGlasPanel from './MobiGlasPanel';
import MobiGlasButton from './MobiGlasButton';

export interface MobiGlasConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

const variantBorderColors: Record<string, string> = {
  danger: 'rgba(var(--mg-danger), 0.5)',
  warning: 'rgba(var(--mg-warning), 0.5)',
  default: 'rgba(var(--mg-primary), 0.4)',
};

const variantConfirmClasses: Record<string, string> = {
  danger:
    '!bg-[rgba(var(--mg-danger),0.8)] !border-[rgba(var(--mg-danger),0.6)] !text-white hover:!bg-[rgba(var(--mg-danger),0.9)]',
  warning:
    '!bg-[rgba(var(--mg-warning),0.8)] !border-[rgba(var(--mg-warning),0.6)] !text-black hover:!bg-[rgba(var(--mg-warning),0.9)]',
  default: '',
};

export default function MobiGlasConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
}: MobiGlasConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  useFocusTrap(dialogRef, open, onCancel);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descId}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] outline-none"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          >
            <MobiGlasPanel
              variant="darker"
              cornerAccents={true}
              padding="lg"
              className="max-w-md w-full mx-4"
              style={{ borderColor: variantBorderColors[variant] }}
            >
              {/* Title */}
              <h3
                id={titleId}
                className="text-lg font-quantify tracking-wider mb-3"
                style={{ color: 'rgba(var(--mg-text), 1)' }}
              >
                {title}
              </h3>

              {/* Message */}
              <p
                id={descId}
                className="text-sm leading-relaxed mb-6"
                style={{ color: 'rgba(var(--mg-text), 0.7)' }}
              >
                {message}
              </p>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <MobiGlasButton variant="outline" size="sm" onClick={onCancel}>
                  {cancelLabel}
                </MobiGlasButton>
                <MobiGlasButton
                  variant="primary"
                  size="sm"
                  onClick={onConfirm}
                  className={variantConfirmClasses[variant]}
                >
                  {confirmLabel}
                </MobiGlasButton>
              </div>
            </MobiGlasPanel>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

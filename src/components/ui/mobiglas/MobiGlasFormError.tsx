'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

export interface MobiGlasFormErrorProps {
  message: string;
  details?: string;
  onDismiss?: () => void;
  className?: string;
}

export function MobiGlasFormError({
  message,
  details,
  onDismiss,
  className = '',
}: MobiGlasFormErrorProps) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          role="alert"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className={`relative flex items-start gap-3 p-3 border border-[rgba(var(--mg-danger),0.5)] bg-[rgba(var(--mg-danger),0.1)] text-[rgba(var(--mg-danger),0.9)] rounded-sm ${className}`}
        >
          {/* Error icon - exclamation triangle */}
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="currentColor"
            className="flex-shrink-0 mt-0.5"
            aria-hidden="true"
          >
            <path d="M8 1L1 14h14L8 1zm0 3.5a.75.75 0 01.75.75v4a.75.75 0 01-1.5 0v-4A.75.75 0 018 4.5zm0 7.5a.75.75 0 100-1.5.75.75 0 000 1.5z" />
          </svg>

          {/* Message and details */}
          <div className="flex-1 min-w-0">
            <p className="text-sm tracking-wider">{message}</p>
            {details && (
              <p className="text-xs opacity-70 mt-1">{details}</p>
            )}
          </div>

          {/* Dismiss button */}
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="flex-shrink-0 p-0.5 text-[rgba(var(--mg-danger),0.6)] hover:text-[rgba(var(--mg-danger),1)] transition-colors duration-200"
              aria-label="Dismiss error"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

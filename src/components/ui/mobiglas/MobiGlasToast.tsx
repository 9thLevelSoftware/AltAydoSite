'use client';

import React from 'react';
import { motion } from 'framer-motion';

export interface MobiGlasToastProps {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  onDismiss: (id: string) => void;
}

const typeConfig = {
  success: {
    color: 'var(--mg-success)',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" />
        <path d="M6 10l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  error: {
    color: 'var(--mg-danger)',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" />
        <path d="M7 7l6 6M13 7l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  info: {
    color: 'var(--mg-primary)',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 9v5M10 6.5v.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  warning: {
    color: 'var(--mg-warning)',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 2L1 18h18L10 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M10 8v4M10 14.5v.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
};

export default function MobiGlasToast({ id, type, message, onDismiss }: MobiGlasToastProps) {
  const config = typeConfig[type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 100, scale: 0.8 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.8 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className="pointer-events-auto flex items-start gap-3 min-w-[320px] max-w-[420px] px-4 py-3 rounded-lg backdrop-blur-md shadow-lg"
      style={{
        backgroundColor: 'rgba(var(--mg-panel-dark), 0.9)',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: `rgba(${config.color}, 0.3)`,
        boxShadow: `0 4px 20px rgba(0, 0, 0, 0.4), 0 0 15px rgba(${config.color}, 0.1)`,
      }}
    >
      {/* Icon */}
      <span
        className="flex-shrink-0 mt-0.5"
        style={{ color: `rgba(${config.color}, 0.9)` }}
      >
        {config.icon}
      </span>

      {/* Message */}
      <p
        className="flex-1 text-sm leading-relaxed"
        style={{ color: 'rgba(var(--mg-text), 0.9)' }}
      >
        {message}
      </p>

      {/* Dismiss button */}
      <button
        onClick={() => onDismiss(id)}
        className="flex-shrink-0 p-1 rounded transition-colors duration-200 hover:bg-[rgba(var(--mg-primary),0.15)]"
        style={{ color: 'rgba(var(--mg-text), 0.5)' }}
        aria-label="Dismiss notification"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </motion.div>
  );
}

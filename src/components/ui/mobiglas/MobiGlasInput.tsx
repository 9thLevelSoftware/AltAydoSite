'use client';

import React from 'react';
import { motion } from 'motion/react';

export interface MobiGlasInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  cornerAccents?: boolean;
  groupClassName?: string;
}

export function MobiGlasInput({
  label,
  error,
  cornerAccents = true,
  className = '',
  groupClassName = '',
  required,
  id,
  ...props
}: MobiGlasInputProps) {
  // Generate a random ID if none provided, for a11y
  const inputId = id || `mg-input-${Math.random().toString(36).substr(2, 9)}`;
  const errorId = `${inputId}-error`;

  return (
    <div className={`mg-input-group mb-4 ${groupClassName}`}>
      <label 
        htmlFor={inputId} 
        className="block text-sm font-medium text-[rgba(var(--mg-text),0.8)] mb-2 font-quantify tracking-wider"
      >
        {label} {required && <span className="text-[rgba(var(--mg-error),0.9)] text-xs">*</span>}
      </label>
      <div className="relative">
        <input
          id={inputId}
          className={`
            w-full px-4 py-3 bg-[rgba(var(--mg-background),0.6)] 
            border rounded-sm text-white 
            focus:outline-none focus:ring-2 focus:ring-[rgba(var(--mg-primary),0.5)] 
            transition-all mg-input text-base md:text-sm
            ${error 
              ? 'border-[rgba(var(--mg-error),0.6)] focus:border-[rgba(var(--mg-error),0.8)]' 
              : 'border-[rgba(var(--mg-primary),0.3)] focus:border-[rgba(var(--mg-primary),0.5)]'
            }
            ${className}
          `}
          required={required}
          aria-required={required}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          {...props}
        />
        
        {cornerAccents && (
          <>
            <div className="absolute top-0 left-0 w-[6px] h-[6px] border-l border-t border-[rgba(var(--mg-primary),0.4)] pointer-events-none"></div>
            <div className="absolute top-0 right-0 w-[6px] h-[6px] border-r border-t border-[rgba(var(--mg-primary),0.4)] pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-[6px] h-[6px] border-l border-b border-[rgba(var(--mg-primary),0.4)] pointer-events-none"></div>
            <div className="absolute bottom-0 right-0 w-[6px] h-[6px] border-r border-b border-[rgba(var(--mg-primary),0.4)] pointer-events-none"></div>
          </>
        )}
      </div>
      
      {error && (
        <motion.p 
          id={errorId} 
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[rgba(var(--mg-error),0.9)] text-xs mt-1 font-mono"
          role="alert"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
}

export interface MobiGlasTextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  cornerAccents?: boolean;
  groupClassName?: string;
}

export function MobiGlasTextArea({
  label,
  error,
  cornerAccents = true,
  className = '',
  groupClassName = '',
  required,
  id,
  ...props
}: MobiGlasTextAreaProps) {
  const inputId = id || `mg-textarea-${Math.random().toString(36).substr(2, 9)}`;
  const errorId = `${inputId}-error`;

  return (
    <div className={`mg-input-group mb-4 ${groupClassName}`}>
      <label 
        htmlFor={inputId} 
        className="block text-sm font-medium text-[rgba(var(--mg-text),0.8)] mb-2 font-quantify tracking-wider"
      >
        {label} {required && <span className="text-[rgba(var(--mg-error),0.9)] text-xs">*</span>}
      </label>
      <div className="relative">
        <textarea
          id={inputId}
          className={`
            w-full px-4 py-3 bg-[rgba(var(--mg-background),0.6)] 
            border rounded-sm text-white 
            focus:outline-none focus:ring-2 focus:ring-[rgba(var(--mg-primary),0.5)] 
            transition-all mg-input text-base md:text-sm
            ${error 
              ? 'border-[rgba(var(--mg-error),0.6)] focus:border-[rgba(var(--mg-error),0.8)]' 
              : 'border-[rgba(var(--mg-primary),0.3)] focus:border-[rgba(var(--mg-primary),0.5)]'
            }
            ${className}
          `}
          required={required}
          aria-required={required}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          {...props}
        />
        
        {cornerAccents && (
          <>
            <div className="absolute top-0 left-0 w-[6px] h-[6px] border-l border-t border-[rgba(var(--mg-primary),0.4)] pointer-events-none"></div>
            <div className="absolute top-0 right-0 w-[6px] h-[6px] border-r border-t border-[rgba(var(--mg-primary),0.4)] pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-[6px] h-[6px] border-l border-b border-[rgba(var(--mg-primary),0.4)] pointer-events-none"></div>
            <div className="absolute bottom-0 right-0 w-[6px] h-[6px] border-r border-b border-[rgba(var(--mg-primary),0.4)] pointer-events-none"></div>
          </>
        )}
      </div>
      
      {error && (
        <motion.p 
          id={errorId} 
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[rgba(var(--mg-error),0.9)] text-xs mt-1 font-mono"
          role="alert"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
}
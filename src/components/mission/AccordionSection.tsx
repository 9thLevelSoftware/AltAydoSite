'use client';

import React from 'react';

interface AccordionSectionProps {
  id: string;
  step: number;
  title: string;
  subtitle?: string;
  isOpen: boolean;
  onToggle: () => void;
  errorCount?: number;
  className?: string;
  children?: React.ReactNode;
}

const AccordionSection: React.FC<AccordionSectionProps> = ({
  id,
  step,
  title,
  subtitle,
  isOpen,
  onToggle,
  errorCount = 0,
  className,
  children,
}) => {
  return (
    <div className={className}>
      <button
        id={`${id}-header`}
        type="button"
        className={`w-full flex items-center justify-between py-3 px-4 text-left bg-[rgba(var(--mg-panel-dark),0.6)] border border-[rgba(var(--mg-primary),0.25)] hover:border-[rgba(var(--mg-primary),0.4)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(var(--mg-primary),0.7)]`}
        aria-expanded={isOpen}
        aria-controls={`${id}-panel`}
        onClick={onToggle}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-[rgba(var(--mg-primary),0.5)] text-[rgba(var(--mg-primary),0.85)] text-sm font-semibold">
            {step}
          </span>
          <div className="min-w-0">
            <div className="text-base md:text-lg font-semibold tracking-wide">{title}</div>
            {subtitle && <div className="text-xs md:text-sm opacity-75">{subtitle}</div>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {errorCount > 0 && (
            <span className="text-[10px] md:text-xs px-2 py-1 rounded border border-[rgba(var(--mg-danger),0.5)] text-[rgba(var(--mg-danger),0.9)]">
              {errorCount}
            </span>
          )}
          <svg
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.25 8.29a.75.75 0 01-.02-1.08z" />
          </svg>
        </div>
      </button>
      <div id={`${id}-panel`} role="region" aria-labelledby={`${id}-header`} hidden={!isOpen}>
        {isOpen && children}
      </div>
    </div>
  );
};

export default AccordionSection;

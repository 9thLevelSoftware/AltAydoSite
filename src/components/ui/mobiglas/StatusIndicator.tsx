'use client';

import React from 'react';
import { motion } from 'motion/react';

export interface StatusIndicatorProps {
  status: 'online' | 'offline' | 'warning' | 'error' | 'loading' | 'active' | 'inactive';
  label?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'dot' | 'pill' | 'badge' | 'bar';
  animated?: boolean;
  withPulse?: boolean;
  withGlow?: boolean;
  position?: 'left' | 'right' | 'top' | 'bottom';
  className?: string;
}

export default function StatusIndicator({
  status,
  label,
  size = 'md',
  variant = 'dot',
  animated = true,
  withPulse = true,
  withGlow = false,
  position = 'left',
  className = ''
}: StatusIndicatorProps) {
  const statusConfig = {
    online: {
      color: 'bg-[rgba(var(--mg-success),1)]',
      textColor: 'text-[rgba(var(--mg-success),1)]',
      borderColor: 'border-[rgba(var(--mg-success),0.5)]',
      shadowColor: 'rgba(var(--mg-success),0.5)',
      label: label || 'ONLINE'
    },
    offline: {
      color: 'bg-[rgba(var(--mg-text),0.5)]',
      textColor: 'text-[rgba(var(--mg-text),0.5)]',
      borderColor: 'border-[rgba(var(--mg-text),0.3)]',
      shadowColor: 'rgba(var(--mg-text),0.3)',
      label: label || 'OFFLINE'
    },
    warning: {
      color: 'bg-[rgba(var(--mg-warning),1)]',
      textColor: 'text-[rgba(var(--mg-warning),1)]',
      borderColor: 'border-[rgba(var(--mg-warning),0.5)]',
      shadowColor: 'rgba(var(--mg-warning),0.5)',
      label: label || 'WARNING'
    },
    error: {
      color: 'bg-[rgba(var(--mg-error),1)]',
      textColor: 'text-[rgba(var(--mg-error),1)]',
      borderColor: 'border-[rgba(var(--mg-error),0.5)]',
      shadowColor: 'rgba(var(--mg-error),0.5)',
      label: label || 'ERROR'
    },
    loading: {
      color: 'bg-[rgba(var(--mg-primary),1)]',
      textColor: 'text-[rgba(var(--mg-primary),1)]',
      borderColor: 'border-[rgba(var(--mg-primary),0.5)]',
      shadowColor: 'rgba(var(--mg-primary),0.5)',
      label: label || 'LOADING'
    },
    active: {
      color: 'bg-[rgba(var(--mg-primary),1)]',
      textColor: 'text-[rgba(var(--mg-primary),1)]',
      borderColor: 'border-[rgba(var(--mg-primary),0.5)]',
      shadowColor: 'rgba(var(--mg-primary),0.5)',
      label: label || 'ACTIVE'
    },
    inactive: {
      color: 'bg-[rgba(var(--mg-text),0.3)]',
      textColor: 'text-[rgba(var(--mg-text),0.5)]',
      borderColor: 'border-[rgba(var(--mg-text),0.2)]',
      shadowColor: 'rgba(var(--mg-text),0.2)',
      label: label || 'INACTIVE'
    }
  };

  const sizeMap = {
    xs: {
      dot: 'h-1.5 w-1.5',
      pill: 'px-2 py-0.5 text-xs',
      badge: 'px-1.5 py-0.5 text-xs',
      bar: 'h-1 w-8'
    },
    sm: {
      dot: 'h-2 w-2',
      pill: 'px-2 py-1 text-xs',
      badge: 'px-2 py-1 text-xs',
      bar: 'h-1.5 w-12'
    },
    md: {
      dot: 'h-2.5 w-2.5',
      pill: 'px-3 py-1 text-sm',
      badge: 'px-2 py-1 text-sm',
      bar: 'h-2 w-16'
    },
    lg: {
      dot: 'h-3 w-3',
      pill: 'px-4 py-1.5 text-base',
      badge: 'px-3 py-1.5 text-base',
      bar: 'h-3 w-20'
    }
  };

  const config = statusConfig[status];
  const sizeClasses = sizeMap[size];

  const getPositionClasses = () => {
    if (!label) return '';

    switch (position) {
      case 'left':
        return 'flex-row';
      case 'right':
        return 'flex-row-reverse';
      case 'top':
        return 'flex-col';
      case 'bottom':
        return 'flex-col-reverse';
      default:
        return 'flex-row';
    }
  };

  const getAnimationProps = () => {
    if (!animated) return {};

    if (status === 'loading') {
      return {
        animate: { rotate: 360 },
        transition: { duration: 2, repeat: Infinity, ease: "linear" as const }
      };
    }

    if (withPulse) {
      return {
        animate: {
          opacity: [0.5, 1, 0.5],
          scale: [1, 1.1, 1]
        },
        transition: {
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut" as const
        }
      };
    }

    return {};
  };

  const renderIndicator = () => {
    const baseClasses = `
      ${config.color}
      ${withGlow ? `shadow-lg` : ''}
      ${className}
    `.trim();

    const glowStyle = withGlow ? {
      boxShadow: `0 0 10px ${config.shadowColor}, 0 0 20px ${config.shadowColor}`
    } : {};

    switch (variant) {
      case 'dot':
        return (
          <motion.div
            className={`rounded-full ${baseClasses} ${sizeClasses[variant]}`}
            style={glowStyle}
            {...getAnimationProps()}
          />
        );

      case 'pill':
        return (
          <motion.div
            className={`rounded-full ${baseClasses} ${sizeClasses[variant]} font-quantify tracking-wider ${config.textColor} bg-[rgba(var(--mg-background),0.8)] border ${config.borderColor}`}
            style={glowStyle}
            {...getAnimationProps()}
          >
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${config.color}`} />
              {config.label}
            </div>
          </motion.div>
        );

      case 'badge':
        return (
          <motion.div
            className={`rounded ${baseClasses} ${sizeClasses[variant]} font-quantify tracking-wider ${config.textColor} bg-[rgba(var(--mg-background),0.8)] border ${config.borderColor}`}
            style={glowStyle}
            {...getAnimationProps()}
          >
            {config.label}
          </motion.div>
        );

      case 'bar':
        return (
          <motion.div
            className={`${baseClasses} ${sizeClasses[variant]} rounded-sm`}
            style={glowStyle}
            {...getAnimationProps()}
          />
        );

      default:
        return null;
    }
  };

  if (!label || variant !== 'dot') {
    return renderIndicator();
  }

  return (
    <div className={`flex items-center gap-2 ${getPositionClasses()}`}>
      {renderIndicator()}
      <span className={`text-xs font-quantify tracking-wider ${config.textColor}`}>
        {config.label}
      </span>
    </div>
  );
}
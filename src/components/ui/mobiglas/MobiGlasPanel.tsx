'use client';

import React from 'react';
import { motion, MotionProps } from 'motion/react';

type CornerAccentPosition = 'tl' | 'tr' | 'bl' | 'br';

export interface MobiGlasPanelProps extends Omit<MotionProps, 'children'> {
  children: React.ReactNode;
  className?: string;
  title?: string;
  titleClassName?: string;
  icon?: React.ReactNode;
  rightContent?: React.ReactNode;
  variant?: 'default' | 'dark' | 'darker' | 'transparent';
  withScanline?: boolean;
  withHologram?: boolean;
  withCircuitBg?: boolean;
  withGridBg?: boolean;
  cornerAccents?: boolean;
  corners?: CornerAccentPosition[]; // Selective corner rendering (overrides cornerAccents)
  cornerSize?: 'sm' | 'md' | 'lg';
  padding?: 'sm' | 'md' | 'lg' | 'xl';
  accentColor?: string;
  animationDelay?: number; // For staggered animations
}

export default function MobiGlasPanel({
  children,
  className = '',
  title,
  titleClassName = '',
  icon,
  rightContent,
  variant = 'default',
  withScanline = false,
  withHologram = false,
  withCircuitBg = false,
  withGridBg = false,
  cornerAccents = true,
  corners,
  cornerSize = 'md',
  padding = 'md',
  accentColor = 'primary',
  animationDelay,
  ...motionProps
}: MobiGlasPanelProps) {
  const variantStyles = {
    default: 'bg-[rgba(var(--mg-background),0.6)] border border-[rgba(var(--mg-primary),0.3)]',
    dark: 'bg-[rgba(var(--mg-dark),0.4)] border border-[rgba(var(--mg-primary),0.3)]',
    darker: 'bg-[rgba(var(--mg-panel-dark),0.8)] border border-[rgba(var(--mg-primary),0.4)]',
    transparent: 'bg-transparent border border-[rgba(var(--mg-primary),0.2)]',
  };

  const paddingMap = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-10',
  };

  const cornerSizeMap = {
    sm: 'w-3 h-3',
    md: 'w-5 h-5',
    lg: 'w-8 h-8',
  };

  // Merge animationDelay into transition only when explicitly provided,
  // otherwise preserve the caller's existing transition (including its delay).
  const callerTransition = typeof motionProps.transition === 'object' ? motionProps.transition : {};
  const mergedMotionProps = {
    ...motionProps,
    transition: {
      ...callerTransition,
      ...(animationDelay !== undefined ? { delay: animationDelay } : {}),
    },
  };

  return (
    <motion.div
      className={`
        relative overflow-hidden backdrop-blur-sm
        ${variantStyles[variant]}
        ${paddingMap[padding]}
        ${className}
      `.trim()}
      {...mergedMotionProps}
    >
      {/* Background effects */}
      {withHologram && (
        <div className="absolute inset-0 holo-noise opacity-20 pointer-events-none"></div>
      )}

      {withCircuitBg && (
        <div className="absolute inset-0 circuit-bg opacity-5 pointer-events-none"></div>
      )}

      {withGridBg && (
        <div className="absolute inset-0 mg-grid-bg opacity-10 pointer-events-none"></div>
      )}

      {/* Scanline effect */}
      {withScanline && (
        <motion.div
          className="absolute top-0 w-full h-1 opacity-20 pointer-events-none"
          style={{
            background:
              'linear-gradient(to right, transparent, rgba(var(--mg-primary), 1), transparent)',
            willChange: 'top',
            contain: 'layout style paint',
          }}
          animate={{
            top: ['0%', '100%', '0%'],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      )}

      {/* Corner accents */}
      {(corners || cornerAccents) && (
        <>
          {(!corners || corners.includes('tl')) && (
            <div
              className={`absolute top-0 left-0 ${cornerSizeMap[cornerSize]} border-t border-l`}
              style={{ borderColor: `rgba(var(--mg-${accentColor}), 0.6)` }}
            ></div>
          )}
          {(!corners || corners.includes('tr')) && (
            <div
              className={`absolute top-0 right-0 ${cornerSizeMap[cornerSize]} border-t border-r`}
              style={{ borderColor: `rgba(var(--mg-${accentColor}), 0.6)` }}
            ></div>
          )}
          {(!corners || corners.includes('bl')) && (
            <div
              className={`absolute bottom-0 left-0 ${cornerSizeMap[cornerSize]} border-b border-l`}
              style={{ borderColor: `rgba(var(--mg-${accentColor}), 0.6)` }}
            ></div>
          )}
          {(!corners || corners.includes('br')) && (
            <div
              className={`absolute bottom-0 right-0 ${cornerSizeMap[cornerSize]} border-b border-r`}
              style={{ borderColor: `rgba(var(--mg-${accentColor}), 0.6)` }}
            ></div>
          )}
        </>
      )}

      {/* Title Header */}
      {title && (
        <div
          className={`relative z-10 flex items-center justify-between ${icon || rightContent ? 'px-4 py-3 mb-0 border-b border-[rgba(var(--mg-primary),0.15)]' : 'mb-6'}`}
        >
          <div className="flex items-center">
            {icon && <div className="mr-2">{icon}</div>}
            <h2
              className={`mg-title ${icon || rightContent ? 'text-sm sm:text-base font-quantify tracking-wider' : 'text-2xl font-bold'} ${titleClassName}`.trim()}
              style={titleClassName ? undefined : { color: `rgba(var(--mg-${accentColor}), 0.9)` }}
            >
              {title}
            </h2>
          </div>
          {rightContent && <div className="flex items-center">{rightContent}</div>}
        </div>
      )}

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}

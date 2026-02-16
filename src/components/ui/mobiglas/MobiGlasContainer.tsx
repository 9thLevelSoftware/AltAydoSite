'use client';

import React from 'react';
import { motion, MotionProps } from 'motion/react';

export interface MobiGlasContainerProps extends Omit<MotionProps, 'children'> {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  variant?: 'default' | 'bordered' | 'elevated';
  withCorners?: boolean;
  cornerSize?: 'sm' | 'md' | 'lg';
  glowEffect?: boolean;
  animatedBorder?: boolean;
}

export default function MobiGlasContainer({
  children,
  className = '',
  padding = 'md',
  variant = 'default',
  withCorners = false,
  cornerSize = 'md',
  glowEffect = false,
  animatedBorder = false,
  ...motionProps
}: MobiGlasContainerProps) {
  const paddingMap = {
    none: 'p-0',
    sm: 'p-0.5',
    md: 'p-0.5',
    lg: 'p-1'
  };

  const cornerSizeMap = {
    sm: 'w-3 h-3',
    md: 'w-5 h-5',
    lg: 'w-8 h-8'
  };

  const variantStyles = {
    default: 'mg-container',
    bordered: 'border border-[rgba(var(--mg-primary),0.3)]',
    elevated: 'mg-container shadow-lg shadow-[rgba(var(--mg-primary),0.1)]'
  };

  return (
    <motion.div
      className={`
        ${variantStyles[variant]}
        ${paddingMap[padding]}
        relative overflow-hidden
        ${glowEffect ? 'mg-glow' : ''}
        ${className}
      `.trim()}
      {...motionProps}
    >
      {/* Animated border effect */}
      {animatedBorder && (
        <motion.div
          className="absolute inset-px bg-transparent border border-[rgba(var(--mg-primary),0.3)] pointer-events-none"
          animate={{
            borderColor: [
              'rgba(var(--mg-primary),0.3)',
              'rgba(var(--mg-primary),0.6)',
              'rgba(var(--mg-primary),0.3)'
            ]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      )}

      {/* Corner accents */}
      {withCorners && (
        <>
          <div className={`absolute top-0 left-0 ${cornerSizeMap[cornerSize]} border-t border-l border-[rgba(var(--mg-primary),0.6)]`}></div>
          <div className={`absolute top-0 right-0 ${cornerSizeMap[cornerSize]} border-t border-r border-[rgba(var(--mg-primary),0.6)]`}></div>
          <div className={`absolute bottom-0 left-0 ${cornerSizeMap[cornerSize]} border-b border-l border-[rgba(var(--mg-primary),0.6)]`}></div>
          <div className={`absolute bottom-0 right-0 ${cornerSizeMap[cornerSize]} border-b border-r border-[rgba(var(--mg-primary),0.6)]`}></div>
        </>
      )}

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
}
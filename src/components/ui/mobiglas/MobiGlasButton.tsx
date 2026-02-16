'use client';

import React from 'react';
import { motion, MotionProps } from 'motion/react';

export interface MobiGlasButtonProps extends Omit<MotionProps, 'children'> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'accent' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  disabled?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  withScanline?: boolean;
  withGlow?: boolean;
  withCorners?: boolean;
  className?: string;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

export default function MobiGlasButton({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  withScanline = false,
  withGlow = false,
  withCorners = false,
  className = '',
  onClick,
  type = 'button',
  ...motionProps
}: MobiGlasButtonProps) {
  const variantStyles = {
    primary: 'mg-button border border-[rgba(var(--mg-primary),0.5)] text-[rgba(var(--mg-primary),1)] hover:bg-[rgba(var(--mg-primary),0.2)] hover:border-[rgba(var(--mg-primary),0.8)]',
    secondary: 'mg-button border border-[rgba(var(--mg-secondary),0.5)] text-[rgba(var(--mg-secondary),1)] hover:bg-[rgba(var(--mg-secondary),0.2)] hover:border-[rgba(var(--mg-secondary),0.8)]',
    accent: 'mg-button border border-[rgba(var(--mg-accent),0.5)] text-[rgba(var(--mg-accent),1)] hover:bg-[rgba(var(--mg-accent),0.2)] hover:border-[rgba(var(--mg-accent),0.8)]',
    danger: 'mg-button border border-[rgba(var(--mg-danger),0.5)] text-[rgba(var(--mg-danger),1)] hover:bg-[rgba(var(--mg-danger),0.2)] hover:border-[rgba(var(--mg-danger),0.8)]',
    ghost: 'bg-transparent border-none text-[rgba(var(--mg-text),0.8)] hover:text-[rgba(var(--mg-primary),1)] hover:bg-[rgba(var(--mg-primary),0.1)]',
    outline: 'bg-transparent border border-[rgba(var(--mg-primary),0.3)] text-[rgba(var(--mg-primary),0.9)] hover:bg-[rgba(var(--mg-primary),0.1)] hover:border-[rgba(var(--mg-primary),0.6)]'
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
    xl: 'px-8 py-4 text-xl'
  };

  const baseClasses = `
    relative inline-flex items-center justify-center
    tracking-wider transition-all duration-300
    disabled:opacity-50 disabled:cursor-not-allowed
    ${withCorners ? 'group' : ''}
    ${fullWidth ? 'w-full' : ''}
    ${withGlow ? 'mg-glow' : ''}
    ${variantStyles[variant]}
    ${sizeStyles[size]}
    ${className}
  `.trim();

  const buttonStyle = {
    fontFamily: "'Quantify', sans-serif"
  };

  return (
    <motion.button
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={baseClasses}
      style={buttonStyle}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      {...motionProps}
    >
      {/* Background effects */}
      {withScanline && !disabled && (
        <motion.div
          className="absolute inset-0 overflow-hidden pointer-events-none"
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="absolute top-0 w-full h-0.5 opacity-60"
            style={{
              background: 'linear-gradient(to right, transparent, rgba(var(--mg-primary), 0.8), transparent)'
            }}
            animate={{
              top: ['0%', '100%', '0%']
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        </motion.div>
      )}

      {/* Corner accents */}
      {withCorners && (
        <>
          <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[rgba(var(--mg-primary),0.8)] opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-[rgba(var(--mg-primary),0.8)] opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-[rgba(var(--mg-primary),0.8)] opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[rgba(var(--mg-primary),0.8)] opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </>
      )}

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center gap-2">
        {isLoading ? (
          <motion.div
            className="w-4 h-4 border-2 border-[rgba(var(--mg-primary),0.3)] border-t-[rgba(var(--mg-primary),1)] rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        ) : (
          <>
            {leftIcon && (
              <span className="flex-shrink-0">
                {leftIcon}
              </span>
            )}
            <span>{children}</span>
            {rightIcon && (
              <motion.span
                className="flex-shrink-0"
                animate={{ x: [0, 3, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse' }}
              >
                {rightIcon}
              </motion.span>
            )}
          </>
        )}
      </div>
    </motion.button>
  );
}
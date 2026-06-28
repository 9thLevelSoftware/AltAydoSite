'use client';

import React from 'react';
import { motion } from 'motion/react';

export interface CornerAccentsProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'simple' | 'detailed' | 'animated';
  color?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'danger';
  opacity?: 'low' | 'medium' | 'high';
  withDots?: boolean;
  className?: string;
}

export default function CornerAccents({
  size = 'md',
  variant = 'simple',
  color = 'primary',
  opacity = 'medium',
  withDots = false,
  className = '',
}: CornerAccentsProps) {
  const sizeMap = {
    xs: 'w-2 h-2',
    sm: 'w-3 h-3',
    md: 'w-5 h-5',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  const opacityMap = {
    low: '0.4',
    medium: '0.6',
    high: '0.8',
  };

  const rgb = `var(--mg-${color})`;
  const alpha = opacityMap[opacity];
  const borderColor = `rgba(${rgb}, ${alpha})`;
  const dotColor = `rgba(${rgb}, ${alpha})`;

  const corners = [
    { position: 'top-0 left-0', borders: 'border-t border-l' },
    { position: 'top-0 right-0', borders: 'border-t border-r' },
    { position: 'bottom-0 left-0', borders: 'border-b border-l' },
    { position: 'bottom-0 right-0', borders: 'border-b border-r' },
  ];

  if (variant === 'simple') {
    return (
      <>
        {corners.map((corner, index) => (
          <div
            key={index}
            className={`absolute ${corner.position} ${sizeMap[size]} ${corner.borders} ${className}`}
            style={{ borderColor }}
          />
        ))}
      </>
    );
  }

  if (variant === 'detailed') {
    return (
      <>
        {corners.map((corner, index) => (
          <div key={index} className={`absolute ${corner.position} ${sizeMap[size]}`}>
            <div className={`absolute inset-0 ${corner.borders}`} style={{ borderColor }} />
            {withDots && (
              <div
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1 h-1 rounded-full"
                style={{ backgroundColor: dotColor }}
              />
            )}
          </div>
        ))}
      </>
    );
  }

  if (variant === 'animated') {
    return (
      <>
        {corners.map((corner, index) => (
          <motion.div
            key={index}
            className={`absolute ${corner.position} ${sizeMap[size]} ${corner.borders}`}
            style={{ borderColor }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: [0.4, parseFloat(opacityMap[opacity]), 0.4],
              scale: [0.8, 1, 0.8],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: index * 0.2,
              ease: 'easeInOut',
            }}
          >
            {withDots && (
              <motion.div
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1 h-1 rounded-full"
                style={{ backgroundColor: dotColor }}
                animate={{
                  opacity: [0.5, 1, 0.5],
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: index * 0.3,
                }}
              />
            )}
          </motion.div>
        ))}
      </>
    );
  }

  return null;
}

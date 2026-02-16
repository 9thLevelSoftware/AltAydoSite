'use client';

import React from 'react';
import { motion } from 'motion/react';

export interface ScanlineEffectProps {
  variant?: 'horizontal' | 'vertical' | 'diagonal' | 'cross';
  speed?: 'slow' | 'medium' | 'fast';
  color?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning';
  opacity?: 'low' | 'medium' | 'high';
  thickness?: 'thin' | 'medium' | 'thick';
  blur?: boolean;
  glow?: boolean;
  infinite?: boolean;
  direction?: 'normal' | 'reverse' | 'alternate';
  className?: string;
}

export default function ScanlineEffect({
  variant = 'horizontal',
  speed = 'medium',
  color = 'primary',
  opacity = 'medium',
  thickness = 'thin',
  blur = false,
  glow = false,
  infinite = true,
  direction = 'normal',
  className = ''
}: ScanlineEffectProps) {
  const speedMap = {
    slow: 8,
    medium: 5,
    fast: 2
  };

  const colorMap = {
    primary: 'rgba(var(--mg-primary), var(--opacity))',
    secondary: 'rgba(var(--mg-secondary), var(--opacity))',
    accent: 'rgba(var(--mg-accent), var(--opacity))',
    success: 'rgba(var(--mg-success), var(--opacity))',
    warning: 'rgba(var(--mg-warning), var(--opacity))'
  };

  const opacityMap = {
    low: '0.3',
    medium: '0.5',
    high: '0.8'
  };

  const thicknessMap = {
    thin: '1px',
    medium: '2px',
    thick: '4px'
  };

  const baseColor = colorMap[color].replace('var(--opacity)', opacityMap[opacity]);

  const getAnimationProps = () => {
    const duration = speedMap[speed];
    const repeat = infinite ? Infinity : 1;
    const repeatType = direction === 'alternate' ? 'reverse' as const : 'loop' as const;

    switch (variant) {
      case 'horizontal':
        return {
          animate: {
            top: direction === 'reverse' ? ['100%', '0%', '100%'] : ['0%', '100%', '0%']
          },
          transition: { duration, repeat, repeatType, ease: 'linear' as const }
        };
      case 'vertical':
        return {
          animate: {
            left: direction === 'reverse' ? ['100%', '0%', '100%'] : ['0%', '100%', '0%']
          },
          transition: { duration, repeat, repeatType, ease: 'linear' as const }
        };
      case 'diagonal':
        return {
          animate: {
            top: direction === 'reverse' ? ['100%', '0%'] : ['0%', '100%'],
            left: direction === 'reverse' ? ['100%', '0%'] : ['0%', '100%']
          },
          transition: { duration, repeat, repeatType, ease: 'linear' as const }
        };
      case 'cross':
        return {
          animate: {
            opacity: [0, 1, 0]
          },
          transition: { duration, repeat, repeatType, ease: 'easeInOut' as const }
        };
      default:
        return {};
    }
  };

  const getScanlineStyle = () => {
    const baseStyle = {
      background: `linear-gradient(to right, transparent, ${baseColor}, transparent)`,
      filter: blur ? 'blur(1px)' : 'none',
      boxShadow: glow ? `0 0 10px ${baseColor}, 0 0 20px ${baseColor}` : 'none',
      willChange: 'transform, opacity' // Hint browser to optimize animations
    };

    switch (variant) {
      case 'horizontal':
        return {
          ...baseStyle,
          height: thicknessMap[thickness],
          width: '100%',
          left: 0
        };
      case 'vertical':
        return {
          ...baseStyle,
          width: thicknessMap[thickness],
          height: '100%',
          top: 0,
          background: `linear-gradient(to bottom, transparent, ${baseColor}, transparent)`
        };
      case 'diagonal':
        return {
          ...baseStyle,
          width: '2px',
          height: '100%',
          background: `linear-gradient(45deg, transparent, ${baseColor}, transparent)`,
          transform: 'rotate(45deg)'
        };
      case 'cross':
        return {
          ...baseStyle,
          width: '100%',
          height: '100%',
          background: `
            linear-gradient(to right, transparent 49%, ${baseColor} 50%, transparent 51%),
            linear-gradient(to bottom, transparent 49%, ${baseColor} 50%, transparent 51%)
          `
        };
      default:
        return baseStyle;
    }
  };

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      <motion.div
        className="absolute"
        style={getScanlineStyle()}
        {...getAnimationProps()}
      />
    </div>
  );
}
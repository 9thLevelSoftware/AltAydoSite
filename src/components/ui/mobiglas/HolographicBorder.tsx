'use client';

import React from 'react';
import { motion } from 'motion/react';

interface HolographicBorderProps {
  children: React.ReactNode;
  isActive?: boolean;
  intensity?: 'low' | 'medium' | 'high';
  className?: string;
}

/**
 * Wrapper component that adds animated holographic border effect
 * Border glows and pulses, especially on hover/active states
 */
const HolographicBorder: React.FC<HolographicBorderProps> = ({
  children,
  isActive = false,
  intensity = 'medium',
  className = ''
}) => {
  const intensityMap = {
    low: { opacity: 0.3, glow: 0.2 },
    medium: { opacity: 0.5, glow: 0.3 },
    high: { opacity: 0.8, glow: 0.5 }
  };

  const { opacity, glow } = intensityMap[intensity];

  return (
    <div className={`relative ${className}`}>
      {/* Animated border */}
      <motion.div
        className="absolute inset-0 rounded-lg pointer-events-none"
        style={{
          border: `1px solid rgba(var(--mg-primary), ${opacity})`,
          boxShadow: isActive
            ? `0 0 20px rgba(var(--mg-primary), ${glow}), inset 0 0 20px rgba(var(--mg-primary), ${glow * 0.5})`
            : `0 0 10px rgba(var(--mg-primary), ${glow * 0.5})`
        }}
        animate={{
          opacity: isActive ? [opacity, opacity * 1.3, opacity] : opacity
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default HolographicBorder;

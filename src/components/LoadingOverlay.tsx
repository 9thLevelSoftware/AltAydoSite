'use client';

import React from 'react';
import { motion } from 'motion/react';

interface LoadingOverlayProps {
  text?: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ text = 'Loading...' }) => {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center"
    >
      <div className="relative flex flex-col items-center">
        {/* Animated circular elements */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.2, 1] }}
          transition={{ duration: 0.8 }}
          className="relative"
        >
          {/* Outer pulsing ring */}
          <div className="absolute inset-0 animate-ping">
            <div className="w-32 h-32 rounded-full border-4 border-[rgba(var(--mg-primary),0.3)]" />
          </div>

          {/* Middle rotating ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: 'linear',
            }}
            className="w-32 h-32 rounded-full border-4 border-[rgba(var(--mg-primary),0.8)]"
          />

          {/* Inner rotating ring */}
          <motion.div
            animate={{ rotate: -360 }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'linear',
            }}
            className="absolute inset-8 rounded-full border-2 border-[rgba(var(--mg-primary),0.6)]"
          />

          {/* Center dot */}
          <div className="absolute inset-[35%] bg-[rgba(var(--mg-primary),0.8)] rounded-full glow" />
        </motion.div>

        {/* Loading text */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center"
        >
          <p className="font-quantify tracking-widest text-lg text-[rgba(var(--mg-primary),0.9)]">
            {text}
          </p>

          {/* Animated loading dots */}
          <motion.div
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="flex justify-center mt-2 space-x-2"
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ y: [0, -5, 0] }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
                className="w-2 h-2 rounded-full bg-[rgba(var(--mg-primary),0.8)]"
              />
            ))}
          </motion.div>
        </motion.div>

        {/* Grid pattern background */}
        <div
          className="absolute inset-0 -z-10 opacity-30"
          style={{
            backgroundImage: `
              linear-gradient(rgba(var(--mg-primary), 0.2) 1px, transparent 1px),
              linear-gradient(90deg, rgba(var(--mg-primary), 0.2) 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px',
            transform: 'translate(-50%, -50%)',
            width: '200%',
            height: '200%',
          }}
        />

        {/* Scanning line */}
        <motion.div
          initial={{ y: '-100%' }}
          animate={{ y: '100%' }}
          transition={{
            repeat: Infinity,
            duration: 2,
            ease: 'linear',
          }}
          className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[rgba(var(--mg-primary),0.8)] to-transparent"
        />
      </div>
    </motion.div>
  );
};

export default LoadingOverlay;

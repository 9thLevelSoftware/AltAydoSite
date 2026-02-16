'use client';

import React from 'react';
import { motion } from 'motion/react';
import { StatusIndicator } from '@/components/ui/mobiglas';

interface JoinStatusBarProps {
  time: Date;
}

export default function JoinStatusBar({ time }: JoinStatusBarProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="sticky top-0 z-40 bg-black/90 border-b border-[rgba(var(--mg-primary),0.2)] py-1.5 px-4 text-xs text-[rgba(var(--mg-primary),0.8)] flex justify-between backdrop-blur-sm"
    >
      <div className="flex items-center gap-2">
        <StatusIndicator
          status="online"
          label="SYSTEM ONLINE"
          size="sm"
          withPulse
        />
        <span className="text-[rgba(var(--mg-text),0.5)] mx-4">|</span>
        <span className="text-[rgba(var(--mg-text),0.7)]">USER ACCESS:</span> <span className="text-[rgba(var(--mg-primary),0.9)] ml-1 mg-subtitle">CIVILIAN</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[rgba(var(--mg-text),0.7)]">QUANTUM LINK:</span>
        <span className="text-[rgba(var(--mg-success),1)] ml-1">ACTIVE</span>
        <span className="ml-4 font-mono text-[rgba(var(--mg-text),0.8)]">{time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false})}</span>
      </div>
    </motion.div>
  );
}
'use client';

import React from 'react';
import { motion } from 'motion/react';

export default function ContactFooter() {
  return (
    <footer className="py-8 bg-[rgba(var(--mg-background),0.7)] relative border-t border-[rgba(var(--mg-primary),0.3)]">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 circuit-bg opacity-20"></div>
        <motion.div
          className="absolute top-0 w-full h-0.5"
          style={{
            background: 'linear-gradient(to right, transparent, rgba(var(--mg-primary), 0.7), transparent)'
          }}
          animate={{
            opacity: [0.2, 0.6, 0.2]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-6 md:mb-0">
            <div className="text-lg font-bold mg-title mb-2">AYDOCORP LOGISTICS</div>
            <p className="text-[rgba(var(--mg-text),0.6)] text-sm">Moving the &apos;verse forward, one shipment at a time</p>
          </div>

          <div className="flex flex-col items-center md:items-end">
            <div className="text-[rgba(var(--mg-text),0.7)] text-sm mb-1 font-quantify">SYSTEM STATUS</div>
            <div className="flex items-center">
              <span className="inline-block h-2 w-2 rounded-full bg-[rgba(var(--mg-success),1)] mr-2"></span>
              <span className="text-[rgba(var(--mg-text),0.9)] text-sm">All systems operational</span>
            </div>
            <div className="text-[rgba(var(--mg-text),0.5)] text-xs mt-4">
              © 2954 AydoCorp. All rights reserved.
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
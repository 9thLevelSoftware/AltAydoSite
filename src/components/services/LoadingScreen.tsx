'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface LoadingScreenProps {
  loadingComplete: boolean;
}

export default function LoadingScreen({ loadingComplete }: LoadingScreenProps) {
  return (
    <AnimatePresence>
      {!loadingComplete && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-50 bg-black flex items-center justify-center"
        >
          <div className="text-center">
            <div className="mb-4 relative w-20 h-20 mx-auto">
              <div className="absolute inset-0 border-2 border-[rgba(var(--mg-primary),0.5)] rounded-full"></div>
              <motion.div
                className="absolute inset-0 border-t-2 border-[rgba(var(--mg-primary),1)] rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              ></motion.div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[rgba(var(--mg-primary),1)] text-xs">LOADING</span>
              </div>
            </div>
            <p className="text-[rgba(var(--mg-text),0.7)] text-sm mg-flicker">Initializing Services Module</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
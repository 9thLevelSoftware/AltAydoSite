 'use client';

import React from 'react';
import { motion } from 'motion/react';

export default function FleetDatabasePage() {
  return (
    <div className="min-h-screen bg-black bg-opacity-95 p-4 md:p-6 relative">
      <div className="absolute inset-0 bg-holo-grid bg-[length:50px_50px] opacity-5 pointer-events-none"></div>
      <div className="hexagon-bg absolute inset-0 opacity-5 pointer-events-none"></div>

      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <h1 className="mg-title text-2xl sm:text-3xl lg:text-4xl mb-4">Fleet Database</h1>
          <div className="h-1 w-20 mx-auto bg-gradient-to-r from-transparent via-[rgba(var(--mg-primary),0.7)] to-transparent"></div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="mg-panel bg-[rgba(var(--mg-panel-dark),0.5)] border border-[rgba(var(--mg-primary),0.3)] rounded-sm overflow-hidden mt-8"
        >
          <div className="relative p-8 sm:p-12 text-center">
            <div className="absolute inset-0 pointer-events-none opacity-10">
              <div className="hexagon-bg w-full h-full"></div>
            </div>
            <div className="mg-title text-3xl sm:text-4xl font-quantify tracking-widest text-[rgba(var(--mg-primary),0.9)] mb-4">
              COMING SOON
            </div>
            <p className="text-sm text-[rgba(var(--mg-text),0.7)] max-w-2xl mx-auto">
              The fleet database is under construction. Check back later for a fully interactive
              fleet overview with ship stats, readiness and assignments.
            </p>
            <div className="mt-8 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-[rgba(var(--mg-primary),0.5)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
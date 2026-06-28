'use client';

import React from 'react';
import Image from 'next/image';
import { cdn } from '@/lib/cdn';
import { motion, AnimatePresence } from 'motion/react';
import { MobiGlasPanel, MobiGlasButton } from '@/components/ui/mobiglas';

interface ContactHeroProps {
  isScanning: boolean;
  setIsScanning: (value: boolean) => void;
}

export default function ContactHero({ isScanning, setIsScanning }: ContactHeroProps) {
  return (
    <>
      {/* Hero Section */}
      <section className="relative pt-28 pb-16">
        <div className="absolute inset-0 z-0">
          <Image
            src={cdn('/AydoOffice1.png')}
            alt="Contact AydoCorp"
            fill
            className="object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black via-black/90 to-black" />
          <div className="absolute inset-0 circuit-bg"></div>

          {/* Holographic grid overlay */}
          <div className="absolute inset-0 mg-grid-bg"></div>

          {/* Scan lines effect */}
          <div className="absolute inset-0 animate-scanline opacity-10"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <div className="mb-6 relative inline-block">
              <motion.div
                className="absolute -inset-1 rounded-full"
                style={{ background: 'rgba(var(--mg-primary), 0.1)' }}
                animate={{
                  boxShadow: [
                    '0 0 0px rgba(var(--mg-primary), 0.3)',
                    '0 0 20px rgba(var(--mg-primary), 0.5)',
                    '0 0 0px rgba(var(--mg-primary), 0.3)',
                  ],
                }}
                transition={{ duration: 3, repeat: Infinity }}
              />
              <div className="relative z-10">
                <MobiGlasButton
                  onClick={() => setIsScanning(!isScanning)}
                  variant="primary"
                  size="md"
                  leftIcon={
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  }
                  withScanline
                >
                  INITIATE CONTACT PROTOCOL
                </MobiGlasButton>
              </div>
            </div>

            <h1 className="text-4xl sm:text-5xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 font-quantify">
              <span className="mg-title">CONTACT AYDOCORP</span>
            </h1>

            <div className="relative mb-8 mx-auto max-w-3xl">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded blur-sm"></div>
              <p className="text-xl text-gray-300 relative bg-black/50 p-3 rounded">
                <span className="mg-text">
                  Establish direct communication with our operations team for inquiries about
                  services, partnerships, or joining AydoCorp
                </span>
              </p>
            </div>

            {/* Connection status indicators */}
            <div className="flex justify-center gap-4 text-xs mt-4">
              <div className="flex items-center gap-2">
                <motion.div
                  className="h-1.5 w-1.5 rounded-full bg-[rgba(var(--mg-primary),0.8)]"
                  animate={{
                    opacity: [0.5, 1, 0.5],
                    scale: [1, 1.2, 1],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <span className="text-[rgba(var(--mg-text),0.8)]">OUTGOING TRANSMISSION</span>
              </div>
              <div className="flex items-center gap-2">
                <motion.div
                  className="h-1.5 w-1.5 rounded-full bg-[rgba(var(--mg-success),0.8)]"
                  animate={{
                    opacity: [0.5, 1, 0.5],
                    scale: [1, 1.2, 1],
                  }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                />
                <span className="text-[rgba(var(--mg-text),0.8)]">RECEIVING SIGNAL</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Scanning Animation Section */}
      <section className="py-16 bg-gradient-to-b from-black to-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Scanning animation */}
          <AnimatePresence>
            {isScanning && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-12 overflow-hidden"
              >
                <MobiGlasPanel
                  title="COMM-LINK DIAGNOSTIC"
                  variant="dark"
                  withScanline
                  withHologram
                  padding="md"
                  className="mb-12"
                >
                  <div className="flex justify-end mb-4">
                    <MobiGlasButton
                      onClick={() => setIsScanning(false)}
                      variant="ghost"
                      size="sm"
                      rightIcon={
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      }
                    >
                      CLOSE
                    </MobiGlasButton>
                  </div>

                  <div className="flex flex-col md:flex-row md:space-x-4 space-y-4 md:space-y-0">
                    <div className="w-full md:w-1/3">
                      <div className="mb-4">
                        <div className="text-xs text-[rgba(var(--mg-text),0.6)] mb-1">
                          SIGNAL STRENGTH
                        </div>
                        <div className="h-2 bg-[rgba(var(--mg-dark),0.5)] rounded-sm overflow-hidden">
                          <motion.div
                            initial={{ width: '0%' }}
                            animate={{ width: '94%' }}
                            transition={{ duration: 3, ease: 'easeOut' }}
                            className="h-full bg-gradient-to-r from-[rgba(var(--mg-primary),0.7)] to-[rgba(var(--mg-accent),0.9)]"
                          />
                        </div>
                        <div className="flex justify-between text-xs mt-1">
                          <span className="text-[rgba(var(--mg-text),0.7)]">0%</span>
                          <span className="text-[rgba(var(--mg-primary),0.9)]">94%</span>
                          <span className="text-[rgba(var(--mg-text),0.7)]">100%</span>
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="text-xs text-[rgba(var(--mg-text),0.6)] mb-1">
                          ENCRYPTION
                        </div>
                        <div className="h-2 bg-[rgba(var(--mg-dark),0.5)] rounded-sm overflow-hidden">
                          <motion.div
                            initial={{ width: '0%' }}
                            animate={{ width: '100%' }}
                            transition={{ duration: 2, ease: 'easeOut' }}
                            className="h-full bg-gradient-to-r from-[rgba(var(--mg-success),0.7)] to-[rgba(var(--mg-success),0.9)]"
                          />
                        </div>
                        <div className="flex justify-between text-xs mt-1">
                          <span className="text-[rgba(var(--mg-text),0.7)]">DISABLED</span>
                          <span className="text-[rgba(var(--mg-success),0.9)]">ACTIVE</span>
                        </div>
                      </div>
                    </div>

                    <div className="w-full md:w-2/3 relative border border-[rgba(var(--mg-primary),0.2)] bg-[rgba(var(--mg-dark),0.2)] rounded-sm p-3">
                      <div className="text-xs text-[rgba(var(--mg-text),0.6)] mb-2">SYSTEM LOG</div>
                      <div className="font-mono text-xs text-[rgba(var(--mg-text),0.8)] space-y-1 h-32 overflow-y-auto">
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.2 }}
                        >
                          &gt; Initializing communication protocol v3.82
                        </motion.div>
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.6 }}
                        >
                          &gt; Establishing connection to nearest comm relay...
                        </motion.div>
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 1.0 }}
                        >
                          &gt; Connection established
                        </motion.div>
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 1.4 }}
                        >
                          &gt; Encrypting data channels...
                        </motion.div>
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 1.8 }}
                        >
                          &gt; Performing security handshake with AydoCorp servers...
                        </motion.div>
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 2.2 }}
                        >
                          &gt; Verifying authentication credentials...
                        </motion.div>
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 2.6 }}
                          className="text-[rgba(var(--mg-success),0.9)]"
                        >
                          &gt; SUCCESS: Secure connection to AydoCorp headquarters established
                        </motion.div>
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 3.0 }}
                        >
                          &gt; Ready to transmit message...
                        </motion.div>
                      </div>
                    </div>
                  </div>
                </MobiGlasPanel>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </>
  );
}

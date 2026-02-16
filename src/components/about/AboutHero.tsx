'use client';

import React from 'react';
import Image from 'next/image';
import { cdn } from '@/lib/cdn';
import { motion } from 'motion/react';
import { MobiGlasPanel, MobiGlasButton, StatusIndicator } from '@/components/ui/mobiglas';

interface AboutHeroProps {
  time: Date;
  scrollPosition: number;
  onInitializeDataFeed: () => void;
}

export default function AboutHero({ time, scrollPosition, onInitializeDataFeed }: AboutHeroProps) {
  // Parallax effect based on scroll position
  const parallaxOffset = (depth: number) => {
    return scrollPosition * depth;
  };

  return (
    <>
      {/* Status Bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
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

      {/* Hero Section */}
      <section className="relative pt-24 pb-16">
        <div className="absolute inset-0 z-0">
          <Image
            src={cdn('/images/logisticsoffice.jpg')}
            alt="AydoCorp Office"
            fill
            className="object-cover opacity-20"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black via-black/90 to-black"></div>

          {/* Enhanced grid backgrounds and effects */}
          <div className="absolute inset-0 circuit-bg opacity-10"></div>
          <div className="absolute inset-0 mg-grid-bg opacity-10"></div>

          {/* Holographic particle effects */}
          <div className="absolute inset-0 overflow-hidden">
            {Array.from({ length: 20 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-[rgba(var(--mg-primary),0.6)] rounded-full"
                initial={{
                  x: Math.random() * 100 + "%",
                  y: Math.random() * 100 + "%",
                  opacity: 0
                }}
                animate={{
                  opacity: [0, 0.8, 0],
                  scale: [0, 1, 0]
                }}
                transition={{
                  duration: 2 + Math.random() * 3,
                  repeat: Infinity,
                  delay: Math.random() * 5
                }}
              />
            ))}
          </div>

          {/* Animated scan lines */}
          <div className="absolute inset-0 overflow-hidden">
            <motion.div
              className="absolute w-full h-[1px]"
              style={{
                top: 0,
                backgroundColor: "rgba(0, 215, 255, 0.4)"
              }}
              animate={{
                top: ['0%', '100%']
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "linear"
              }}
            />
            <motion.div
              className="absolute h-full w-[1px]"
              style={{
                left: 0,
                backgroundColor: "rgba(0, 215, 255, 0.4)"
              }}
              animate={{
                left: ['0%', '100%']
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "linear"
              }}
            />
            <motion.div
              className="absolute w-full h-[1px]"
              style={{
                bottom: 0,
                backgroundColor: "rgba(0, 215, 255, 0.2)"
              }}
              animate={{
                bottom: ['0%', '100%']
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "linear" as const,
                repeatType: "reverse" as const
              }}
            />
            <motion.div
              className="absolute h-full w-[1px]"
              style={{
                right: 0,
                backgroundColor: "rgba(0, 215, 255, 0.2)"
              }}
              animate={{
                right: ['0%', '100%']
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "linear" as const,
                repeatType: "reverse" as const
              }}
            />
          </div>
          <motion.div
            className="fixed inset-0 z-1 opacity-80 pointer-events-none"
            style={{
              y: parallaxOffset(-0.2),
              position: 'absolute'
            }}
          >
            {/* Removed the random dots that were appearing on plain black background */}
          </motion.div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <MobiGlasPanel
            variant="dark"
            withHologram
            withScanline
            cornerAccents
            padding="lg"
            className="max-w-6xl mx-auto"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
          >
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="mb-2 flex flex-wrap justify-center"
              >
                <motion.span
                  className="mg-title text-2xl md:text-4xl tracking-wider text-[rgba(var(--mg-primary),1)]"
                  animate={{ opacity: [0.8, 1, 0.8] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  CORPORATE
                </motion.span>
                <span className="mg-title text-2xl md:text-4xl tracking-wider text-[rgba(var(--mg-text),0.9)] mx-2">
                  BACKGROUND
                </span>
                <motion.span
                  className="mg-title text-2xl md:text-4xl tracking-wider text-[rgba(var(--mg-accent),0.9)]"
                  animate={{ opacity: [0.8, 1, 0.8] }}
                  transition={{ duration: 3, repeat: Infinity, delay: 1.5 }}
                >
                  DATABASE
                </motion.span>
              </motion.div>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="mg-subtitle text-base md:text-lg opacity-90 tracking-widest mb-6 text-center"
              >
                <span className="mg-flicker inline-block bg-gradient-to-r from-[rgba(var(--mg-primary),0.9)] via-[rgba(var(--mg-accent),0.8)] to-[rgba(var(--mg-primary),0.9)] bg-clip-text text-transparent">
                  FROM PLANETARY COURIER TO INTERSTELLAR POWERHOUSE
                </span>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.7 }}
                className="text-center max-w-3xl mx-auto"
              >
                <p className="text-[rgba(var(--mg-text),0.8)] mb-6">
                  Discover the journey of Aydo Intergalactic Corporation, from its humble beginnings to becoming a leader in interstellar logistics and transportation services.
                </p>

                <div className="mg-signal-indicator mt-4 flex justify-center">
                  <motion.div
                    className="inline-flex items-center px-3 py-1 border border-[rgba(var(--mg-primary),0.3)] bg-[rgba(var(--mg-primary),0.05)]"
                    whileHover={{
                      boxShadow: "0 0 15px rgba(0, 215, 255, 0.3)",
                      borderColor: "rgba(0, 215, 255, 0.6)"
                    }}
                  >
                    <span className="mr-2 h-2 w-2 bg-[rgba(var(--mg-primary),0.8)] animate-ping"></span>
                    <motion.span
                      className="text-xs text-[rgba(var(--mg-primary),0.9)]"
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      transition={{ duration: 0.5, delay: 1.2 }}
                    >
                      DATA INTEGRITY: 100%
                    </motion.span>
                  </motion.div>
                </div>

                {/* Interactive scan button */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.5 }}
                  className="mt-8 flex justify-center"
                >
                  <MobiGlasButton
                    onClick={onInitializeDataFeed}
                    variant="primary"
                    size="lg"
                    withScanline
                    leftIcon={
                      <motion.div
                        className="w-4 h-4 rounded-full border border-[rgba(var(--mg-primary),0.8)] bg-[rgba(var(--mg-primary),0.2)] flex items-center justify-center"
                        animate={{
                          boxShadow: [
                            "0 0 0px rgba(var(--mg-primary), 0)",
                            "0 0 10px rgba(var(--mg-primary), 0.8)",
                            "0 0 0px rgba(var(--mg-primary), 0)"
                          ]
                        }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <div className="w-1.5 h-1.5 bg-[rgba(var(--mg-primary),1)] rounded-full"></div>
                      </motion.div>
                    }
                  >
                    INITIALIZE DATA FEED
                  </MobiGlasButton>
                </motion.div>
              </motion.div>
          </MobiGlasPanel>
        </div>
      </section>
    </>
  );
}
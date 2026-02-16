'use client';

import React from 'react';
import Image from 'next/image';
import { cdn } from '@/lib/cdn';
import { motion } from 'motion/react';
import { MobiGlasPanel, ScanlineEffect } from '@/components/ui/mobiglas';

export default function JoinHero() {
  return (
    <section className="relative pt-20 pb-16">
      <div className="absolute inset-0 z-0">
        <Image
          src={cdn('/spacebg.png')}
          alt="AydoCorp Operations"
          fill
          className="object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/90 to-black" />
        <div className="absolute inset-0 circuit-bg"></div>

        {/* MobiGlas Grid */}
        <div className="absolute inset-0 mg-grid-bg"></div>

        {/* Animated scan line */}
        <ScanlineEffect variant="horizontal" speed="slow" opacity="medium" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <motion.div
            className="mb-4 inline-block"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <MobiGlasPanel
              variant="dark"
              padding="md"
              className="inline-block"
            >
              <h1 className="mg-title text-4xl sm:text-5xl font-bold mb-2">JOIN OUR TEAM</h1>

              {/* Animated underline */}
              <motion.div
                className="h-[1px] bg-gradient-to-r from-transparent via-[rgba(var(--mg-primary),0.8)] to-transparent mx-auto"
                initial={{ width: "0%" }}
                animate={{ width: "80%" }}
                transition={{ duration: 1.2, delay: 1 }}
              />
            </MobiGlasPanel>
          </motion.div>

          <motion.p
            className="text-xl text-[rgba(var(--mg-text),0.9)] max-w-3xl mx-auto mt-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
          >
            Build your career with a leader in interstellar logistics and transportation
          </motion.p>

          {/* Scanning effect text */}
          <motion.div
            className="mt-6 text-[rgba(var(--mg-primary),0.8)] text-sm font-mono"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
          >
            <span className="mg-flicker inline-block">ACCESSING RECRUITMENT DATABASE...</span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
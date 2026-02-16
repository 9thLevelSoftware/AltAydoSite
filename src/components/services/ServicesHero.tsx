'use client';

import React from 'react';
import Image from 'next/image';
import { cdn } from '@/lib/cdn';
import { motion } from 'motion/react';
import { MobiGlasButton, ScanlineEffect, CornerAccents } from '@/components/ui/mobiglas';

interface ServicesHeroProps {
  isScanning: boolean;
  scanComplete: boolean;
  mousePosition: { x: number; y: 0 };
  containerRef: React.RefObject<HTMLDivElement>;
  onStartScan: () => void;
}

export default function ServicesHero({
  isScanning,
  scanComplete,
  mousePosition,
  containerRef,
  onStartScan
}: ServicesHeroProps) {
  // Calculate parallax movement based on mouse position
  const calculateParallax = (depth: number = 1) => {
    if (!containerRef.current) return { x: 0, y: 0 };

    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const moveX = (mousePosition.x - centerX) / centerX * 6 * depth;
    const moveY = (mousePosition.y - centerY) / centerY * 4 * depth;

    return { x: moveX, y: moveY };
  };

  return (
    <section className="relative pt-24 pb-16">
      <div className="absolute inset-0 z-0">
        <Image
          src={cdn('/Star_Citizen_Ships_510048_2560x1440.jpg')}
          alt="AydoCorp Logistics Operations"
          fill
          className="object-cover opacity-20"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/90 to-black"></div>
        <div className="absolute inset-0 circuit-bg opacity-10"></div>

        {/* Enhanced grid background */}
        <div className="absolute inset-0 mg-grid-bg opacity-10"></div>

        {/* Animated scan lines */}
        <ScanlineEffect variant="cross" speed="slow" opacity="low" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1 }}
          style={{
            x: calculateParallax(0.3).x,
            y: calculateParallax(0.3).y
          }}
          className="text-center mb-10"
        >
          <div className="inline-block relative">
            <h1 className="mg-title text-5xl sm:text-6xl mb-2 tracking-wider text-[rgba(var(--mg-primary),1)]">SERVICE MANIFEST</h1>

            {/* Corner elements for the title */}
            <CornerAccents size="lg" />
          </div>

          <p className="mg-subtitle text-xl uppercase tracking-widest mb-4 text-[rgba(var(--mg-text),0.9)]">
            OPERATIONAL CAPABILITIES
            <span className="ml-2 opacity-60 text-xs">[v2.4.7]</span>
          </p>
          <p className="text-lg text-[rgba(var(--mg-text),0.7)] max-w-3xl mx-auto mb-12">
            Advanced logistics solutions for the modern interstellar enterprise
          </p>

          {!isScanning && !scanComplete ? (
            <MobiGlasButton
              onClick={onStartScan}
              variant="primary"
              size="lg"
              withScanline
              leftIcon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                </svg>
              }
            >
              INITIALIZE SERVICE SCAN
            </MobiGlasButton>
          ) : null}
        </motion.div>
      </div>
    </section>
  );
}
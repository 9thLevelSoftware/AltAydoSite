'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { MobiGlasButton } from '@/components/ui/mobiglas';

interface JoinCTASectionProps {
  connectionComplete: boolean;
}

export default function JoinCTASection({ connectionComplete }: JoinCTASectionProps) {
  if (!connectionComplete) return null;

  return (
    <section className="py-16 bg-black relative overflow-hidden">
      <div className="absolute inset-0 mg-grid-bg opacity-5"></div>
      <div className="absolute inset-0 holo-noise opacity-10"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mg-container p-8 border border-[rgba(var(--mg-primary),0.3)] relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-16 h-16 border-l-2 border-t-2 border-[rgba(var(--mg-primary),0.6)]"></div>
          <div className="absolute top-0 right-0 w-16 h-16 border-r-2 border-t-2 border-[rgba(var(--mg-primary),0.6)]"></div>
          <div className="absolute bottom-0 left-0 w-16 h-16 border-l-2 border-b-2 border-[rgba(var(--mg-primary),0.6)]"></div>
          <div className="absolute bottom-0 right-0 w-16 h-16 border-r-2 border-b-2 border-[rgba(var(--mg-primary),0.6)]"></div>

          <div className="text-center relative z-10">
            <h2 className="text-2xl md:text-3xl font-quantify tracking-wider text-[rgba(var(--mg-primary),1)] mb-4">JOIN THE AYDOCORP TEAM</h2>
            <p className="text-[rgba(var(--mg-text),0.8)] mb-8 max-w-3xl mx-auto">
              Explore career opportunities with AydoCorp and become part of our interstellar logistics family. We&apos;re always looking for talented individuals who share our passion for excellence.
            </p>
            <Link href="/join">
              <MobiGlasButton
                variant="primary"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
              >
                VIEW AVAILABLE POSITIONS
              </MobiGlasButton>
            </Link>
          </div>

          {/* Animated scan line */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-[rgba(var(--mg-primary),0.4)] to-transparent animate-scan-horizontal"></div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
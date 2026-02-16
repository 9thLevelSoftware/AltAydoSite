'use client';

import React from 'react';
import { motion } from 'motion/react';
import { MobiGlasPanel, MobiGlasButton, ScanlineEffect, StatusIndicator } from '@/components/ui/mobiglas';

export default function JoinCTA() {
  return (
    <section className="py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <MobiGlasPanel
            variant="dark"
            withHologram
            withScanline
            cornerAccents
            padding="xl"
            className="relative overflow-hidden"
          >
            {/* Background elements */}
            <div className="absolute inset-0">
              <div className="absolute inset-0 mg-grid-bg opacity-30"></div>
              <div className="absolute inset-0 bg-gradient-to-br from-transparent via-[rgba(var(--mg-primary),0.03)] to-transparent"></div>
            </div>

            {/* Animated scan lines */}
            <ScanlineEffect variant="cross" speed="medium" opacity="low" />

            {/* Content */}
            <div className="relative z-10">
              <motion.div
                initial={{ scale: 0.95 }}
                whileInView={{ scale: 1 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
              >
                <h2 className="mg-title text-3xl font-bold mb-2">READY TO BEGIN YOUR JOURNEY?</h2>
                <motion.div
                  className="h-[1px] bg-gradient-to-r from-transparent via-[rgba(var(--mg-primary),0.8)] to-transparent mx-auto"
                  initial={{ width: "0%" }}
                  whileInView={{ width: "40%" }}
                  transition={{ duration: 1, delay: 0.3 }}
                  viewport={{ once: true }}
                />
              </motion.div>

              <motion.p
                className="text-lg text-[rgba(var(--mg-text),0.9)] mb-8 max-w-3xl mx-auto mt-6"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                viewport={{ once: true }}
              >
                Take the first step towards a rewarding career in interstellar logistics. Connect with our recruitment team today.
              </motion.p>

              <div className="flex flex-col sm:flex-row gap-6 justify-center mt-10">
                {/* Contact Recruitment Button */}
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  className="relative group"
                >
                  <MobiGlasButton
                    variant="primary"
                    size="lg"
                    withScanline
                    rightIcon={
                      <motion.svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        animate={{ x: [0, 3, 0] }}
                        transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse' }}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </motion.svg>
                    }
                  >
                    <a href="/join/recruitment-info" className="block w-full h-full">
                      CONTACT RECRUITMENT
                    </a>
                  </MobiGlasButton>
                </motion.div>

                {/* View Corporate Profile Button */}
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  className="relative group"
                >
                  <MobiGlasButton
                    variant="secondary"
                    size="lg"
                    withScanline
                    rightIcon={
                      <motion.svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        animate={{
                          rotate: [0, 10, 0, -10, 0]
                        }}
                        transition={{
                          duration: 5,
                          repeat: Infinity,
                          repeatType: 'loop'
                        }}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </motion.svg>
                    }
                  >
                    <a href="#" target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                      VIEW CORPORATE PROFILE
                    </a>
                  </MobiGlasButton>
                </motion.div>
              </div>

              {/* System Status */}
              <motion.div
                className="mt-12 flex justify-center"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.8 }}
                viewport={{ once: true }}
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 border border-[rgba(var(--mg-primary),0.3)]">
                  <span className="text-xs text-[rgba(var(--mg-text),0.6)] font-mono mg-flicker">
                    RECRUITMENT SYSTEM STATUS:
                  </span>
                  <StatusIndicator status="online" label="ONLINE" size="sm" variant="badge" />
                </div>
              </motion.div>
            </div>
          </MobiGlasPanel>
        </motion.div>
      </div>
    </section>
  );
}
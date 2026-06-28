'use client';

import React from 'react';
import { motion } from 'motion/react';
import { MobiGlasPanel } from '@/components/ui/mobiglas';

export default function ServicesCTA() {
  return (
    <section className="py-16 bg-gradient-to-b from-black to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <MobiGlasPanel
            variant="dark"
            cornerAccents
            padding="xl"
            className="relative overflow-hidden"
          >
            {/* Content with futuristic design */}
            <div className="relative z-10">
              <h2 className="text-3xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                Ready to Get Started?
              </h2>
              <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
                Submit your service request and let our team handle your logistics requirements with
                unmatched efficiency and reliability.
              </p>

              <motion.a
                href="https://docs.google.com/forms/d/e/1FAIpQLSekyn2ZhdU9czvQrcLSpo1b0wIzRX__DxLFk89L4Y0NZ8FiwQ/viewform"
                target="_blank"
                rel="noopener noreferrer"
                className="relative inline-flex items-center justify-center tracking-wider transition-all duration-300 px-6 py-3 text-lg mg-button border border-[rgba(var(--mg-primary),0.5)] text-[rgba(var(--mg-primary),1)] hover:bg-[rgba(var(--mg-primary),0.2)] hover:border-[rgba(var(--mg-primary),0.8)]"
                style={{ fontFamily: "'Quantify', sans-serif" }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {/* Scanline effect */}
                <motion.div
                  className="absolute inset-0 overflow-hidden pointer-events-none"
                  initial={{ opacity: 0 }}
                  whileHover={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <motion.div
                    className="absolute top-0 w-full h-0.5 opacity-60"
                    style={{
                      background:
                        'linear-gradient(to right, transparent, rgba(var(--mg-primary), 0.8), transparent)',
                    }}
                    animate={{ top: ['0%', '100%', '0%'] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                  />
                </motion.div>

                {/* Content */}
                <div className="relative z-10 flex items-center justify-center gap-2">
                  <span>Submit Service Request</span>
                  <motion.span
                    className="flex-shrink-0"
                    animate={{ x: [0, 3, 0] }}
                    transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse' }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                  </motion.span>
                </div>
              </motion.a>
            </div>
          </MobiGlasPanel>
        </motion.div>
      </div>
    </section>
  );
}

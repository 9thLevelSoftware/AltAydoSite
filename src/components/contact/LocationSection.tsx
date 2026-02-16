'use client';

import React from 'react';
import { motion } from 'motion/react';

export default function LocationSection() {
  return (
    <section className="py-16 bg-black relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 mg-grid-bg"></div>
        <div className="absolute inset-0 hex-grid opacity-10"></div>
        <div className="absolute inset-0 animate-scanline-vertical opacity-5"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="mg-container p-0.5 mt-8"
        >
          <div className="relative bg-[rgba(var(--mg-dark),0.4)] p-8">
            {/* Corner decorations */}
            <div className="absolute top-0 left-0 w-5 h-5 border-t border-l border-[rgba(var(--mg-primary),0.6)]"></div>
            <div className="absolute top-0 right-0 w-5 h-5 border-t border-r border-[rgba(var(--mg-primary),0.6)]"></div>
            <div className="absolute bottom-0 left-0 w-5 h-5 border-b border-l border-[rgba(var(--mg-primary),0.6)]"></div>
            <div className="absolute bottom-0 right-0 w-5 h-5 border-b border-r border-[rgba(var(--mg-primary),0.6)]"></div>

            {/* Scanning effect */}
            <motion.div
              className="absolute inset-0 overflow-hidden"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              <motion.div
                className="absolute -inset-1 rounded-full w-6 h-6"
                style={{
                  background: 'radial-gradient(circle, rgba(var(--mg-primary), 0.4) 0%, transparent 70%)'
                }}
                animate={{
                  top: ['0%', '100%', '0%'],
                  left: ['0%', '100%', '0%'],
                }}
                transition={{
                  duration: 10,
                  repeat: Infinity,
                  ease: "linear"
                }}
              />
            </motion.div>

            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 font-quantify">HEADQUARTERS LOCATION</h2>
              <p className="text-xl text-[rgba(var(--mg-text),0.8)] mb-6">Our operations are based in the Stanton system</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="relative">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-[rgba(var(--mg-primary),0.2)] to-[rgba(var(--mg-accent),0.2)] rounded blur-sm"></div>
                <div className="relative bg-[rgba(var(--mg-background),0.8)] p-4 rounded">
                  <h3 className="text-lg font-bold mb-3 mg-subtitle">PRIMARY HUB</h3>
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[rgba(var(--mg-primary),0.9)] mt-0.5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <div>
                        <p className="text-[rgba(var(--mg-text),0.9)]">ArcCorp (Area18)</p>
                        <p className="text-[rgba(var(--mg-text),0.6)] text-sm">Central Business District</p>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[rgba(var(--mg-primary),0.9)] mt-0.5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <div>
                        <p className="text-[rgba(var(--mg-text),0.9)]">Logistics Tower</p>
                        <p className="text-[rgba(var(--mg-text),0.6)] text-sm">Floors 42-47</p>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[rgba(var(--mg-primary),0.9)] mt-0.5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <div>
                        <p className="text-[rgba(var(--mg-text),0.9)]">Hours of Operation</p>
                        <p className="text-[rgba(var(--mg-text),0.6)] text-sm">24/7 Remote Support</p>
                        <p className="text-[rgba(var(--mg-text),0.6)] text-sm">09:00-18:00 (ArcCorp Standard Time)</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-[rgba(var(--mg-primary),0.2)] to-[rgba(var(--mg-accent),0.2)] rounded blur-sm"></div>
                <div className="relative bg-[rgba(var(--mg-background),0.8)] p-4 rounded h-full">
                  <h3 className="text-lg font-bold mb-3 mg-subtitle">REGIONAL OFFICES</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center mb-1">
                        <motion.span
                          className="inline-block w-2 h-2 rounded-full bg-[rgba(var(--mg-primary),0.8)] mr-2"
                          animate={{
                            opacity: [0.5, 1, 0.5],
                            scale: [1, 1.2, 1]
                          }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                        <p className="text-[rgba(var(--mg-text),0.9)] font-semibold">Crusader (Orison)</p>
                      </div>
                      <p className="text-[rgba(var(--mg-text),0.6)] text-sm pl-4">Shipping & Fleet Operations</p>
                    </div>

                    <div>
                      <div className="flex items-center mb-1">
                        <motion.span
                          className="inline-block w-2 h-2 rounded-full bg-[rgba(var(--mg-primary),0.8)] mr-2"
                          animate={{
                            opacity: [0.5, 1, 0.5],
                            scale: [1, 1.2, 1]
                          }}
                          transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                        />
                        <p className="text-[rgba(var(--mg-text),0.9)] font-semibold">Hurston (Lorville)</p>
                      </div>
                      <p className="text-[rgba(var(--mg-text),0.6)] text-sm pl-4">Resource Acquisition Division</p>
                    </div>

                    <div>
                      <div className="flex items-center mb-1">
                        <motion.span
                          className="inline-block w-2 h-2 rounded-full bg-[rgba(var(--mg-primary),0.8)] mr-2"
                          animate={{
                            opacity: [0.5, 1, 0.5],
                            scale: [1, 1.2, 1]
                          }}
                          transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                        />
                        <p className="text-[rgba(var(--mg-text),0.9)] font-semibold">microTech (New Babbage)</p>
                      </div>
                      <p className="text-[rgba(var(--mg-text),0.6)] text-sm pl-4">Technology & R&D Center</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
'use client';

import React from 'react';
import { motion } from 'motion/react';
import { MobiGlasPanel } from '@/components/ui/mobiglas';

export default function ContactChannels() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      whileInView={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8 }}
      viewport={{ once: true }}
      className="flex flex-col gap-6"
    >
      <MobiGlasPanel
        title="COMM CHANNELS"
        variant="dark"
        withHologram
        cornerAccents
        padding="md"
      >
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative group"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-[rgba(var(--mg-primary),0.05)] to-[rgba(var(--mg-accent),0.05)] opacity-0 group-hover:opacity-100 rounded-sm blur-sm transition-opacity"></div>
            <div className="relative overflow-hidden border border-[rgba(var(--mg-primary),0.3)] rounded-sm p-4 bg-[rgba(var(--mg-background),0.4)] group-hover:border-[rgba(var(--mg-primary),0.6)] transition-all">
              {/* Connection lines animation for discord */}
              <div className="absolute inset-0 flex flex-col justify-between opacity-10 group-hover:opacity-20 transition-opacity">
                {[0, 1, 2, 3, 4].map((index) => (
                  <motion.div
                    key={index}
                    className="h-px w-full bg-[rgba(var(--mg-primary),1)]"
                    initial={{ width: "0%" }}
                    animate={{ width: ["0%", "100%", "0%"] }}
                    transition={{
                      duration: 3,
                      delay: index * 0.5,
                      repeat: Infinity,
                      repeatType: "loop"
                    }}
                  />
                ))}
              </div>

              <div className="flex items-center mb-3">
                <motion.div
                  className="h-8 w-8 rounded-full flex items-center justify-center bg-[rgba(var(--mg-primary),0.1)] border border-[rgba(var(--mg-primary),0.3)] mr-3"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[rgba(var(--mg-primary),1)]" viewBox="0 0 127.14 96.36">
                    <path fill="currentColor" d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z" />
                  </svg>
                </motion.div>
                <h3 className="text-lg font-semibold mg-subtitle">DISCORD RELAY</h3>
              </div>
              <a
                href="https://discord.gg/aydocorp"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[rgba(var(--mg-primary),0.9)] hover:text-[rgba(var(--mg-accent),1)] transition-colors flex items-center group-hover:translate-x-1 transition-transform"
              >
                <span>Join our Discord Server</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative group"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-[rgba(var(--mg-primary),0.05)] to-[rgba(var(--mg-accent),0.05)] opacity-0 group-hover:opacity-100 rounded-sm blur-sm transition-opacity"></div>
            <div className="relative overflow-hidden border border-[rgba(var(--mg-primary),0.3)] rounded-sm p-4 bg-[rgba(var(--mg-background),0.4)] group-hover:border-[rgba(var(--mg-primary),0.6)] transition-all">
              {/* Scanning effect */}
              <motion.div
                className="absolute top-0 left-0 w-full h-2 opacity-10 group-hover:opacity-20"
                style={{
                  background: 'linear-gradient(to right, transparent, rgba(var(--mg-primary), 1), transparent)'
                }}
                animate={{
                  top: ['0%', '100%', '0%']
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "linear"
                }}
              />

              <div className="flex items-center mb-3">
                <motion.div
                  className="h-8 w-8 rounded-full flex items-center justify-center bg-[rgba(var(--mg-primary),0.1)] border border-[rgba(var(--mg-primary),0.3)] mr-3"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[rgba(var(--mg-primary),1)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </motion.div>
                <h3 className="text-lg font-semibold mg-subtitle">QUANTUM MAIL</h3>
              </div>
              <a
                href="mailto:aydocorp@gmail.com"
                className="text-[rgba(var(--mg-primary),0.9)] hover:text-[rgba(var(--mg-accent),1)] transition-colors flex items-center group-hover:translate-x-1 transition-transform"
              >
                <span>aydocorp@gmail.com</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </div>
          </motion.div>
        </div>
      </MobiGlasPanel>

      <MobiGlasPanel
        title="QUICK ACCESS"
        variant="dark"
        cornerAccents
        padding="md"
      >
        {/* Data stream effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="data-stream opacity-10"></div>
        </div>

        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="relative group"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-[rgba(var(--mg-primary),0.05)] to-[rgba(var(--mg-accent),0.05)] opacity-0 group-hover:opacity-100 rounded-sm blur-sm transition-opacity"></div>
            <div className="relative overflow-hidden border border-[rgba(var(--mg-primary),0.3)] rounded-sm p-4 bg-[rgba(var(--mg-background),0.4)] group-hover:border-[rgba(var(--mg-primary),0.6)] transition-all">
              {/* Pulse effect */}
              <motion.div
                className="absolute inset-0 bg-[rgba(var(--mg-primary),0.05)]"
                animate={{
                  opacity: [0, 0.05, 0]
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity
                }}
              />

              <div className="flex items-center mb-3">
                <motion.div
                  className="h-8 w-8 rounded-full flex items-center justify-center bg-[rgba(var(--mg-primary),0.1)] border border-[rgba(var(--mg-primary),0.3)] mr-3"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[rgba(var(--mg-primary),1)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </motion.div>
                <h3 className="text-lg font-semibold mg-subtitle">SERVICE REQUEST</h3>
              </div>
              <a
                href="https://docs.google.com/forms/d/e/1FAIpQLSekyn2ZhdU9czvQrcLSpo1b0wIzRX__DxLFk89L4Y0NZ8FiwQ/viewform"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[rgba(var(--mg-primary),0.9)] hover:text-[rgba(var(--mg-accent),1)] transition-colors flex items-center group-hover:translate-x-1 transition-transform"
              >
                <span>Submit a Service Request</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="relative group"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-[rgba(var(--mg-primary),0.05)] to-[rgba(var(--mg-accent),0.05)] opacity-0 group-hover:opacity-100 rounded-sm blur-sm transition-opacity"></div>
            <div className="relative overflow-hidden border border-[rgba(var(--mg-primary),0.3)] rounded-sm p-4 bg-[rgba(var(--mg-background),0.4)] group-hover:border-[rgba(var(--mg-primary),0.6)] transition-all">
              {/* Grid background */}
              <div className="absolute inset-0 mg-grid-bg opacity-20"></div>

              <div className="flex items-center mb-3">
                <motion.div
                  className="h-8 w-8 rounded-full flex items-center justify-center bg-[rgba(var(--mg-primary),0.1)] border border-[rgba(var(--mg-primary),0.3)] mr-3"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[rgba(var(--mg-primary),1)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                </motion.div>
                <h3 className="text-lg font-semibold mg-subtitle">RSI ORGANIZATION</h3>
              </div>
              <a
                href="https://robertsspaceindustries.com/orgs/AYDOCORP"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[rgba(var(--mg-primary),0.9)] hover:text-[rgba(var(--mg-accent),1)] transition-colors flex items-center group-hover:translate-x-1 transition-transform"
              >
                <span>View our RSI Page</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </motion.div>
        </div>
      </MobiGlasPanel>
    </motion.div>
  );
}
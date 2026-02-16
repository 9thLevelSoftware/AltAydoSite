'use client';

import React from 'react';
import { motion } from 'motion/react';
import { MobiGlasPanel, MobiGlasButton } from '@/components/ui/mobiglas';

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
                Submit your service request and let our team handle your logistics requirements with unmatched efficiency and reliability.
              </p>

              <MobiGlasButton
                variant="primary"
                size="lg"
                withScanline
                rightIcon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                }
              >
                <a
                  href="https://docs.google.com/forms/d/e/1FAIpQLSekyn2ZhdU9czvQrcLSpo1b0wIzRX__DxLFk89L4Y0NZ8FiwQ/viewform"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full h-full"
                >
                  Submit Service Request
                </a>
              </MobiGlasButton>
            </div>
          </MobiGlasPanel>
        </motion.div>
      </div>
    </section>
  );
}
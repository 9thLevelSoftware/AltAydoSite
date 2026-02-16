'use client';

import React from 'react';
import Image from 'next/image';
import { cdn } from '@/lib/cdn';
import { motion } from 'motion/react';
import { MobiGlasPanel, StatusIndicator } from '@/components/ui/mobiglas';

export default function VisionSection() {
  return (
    <section className="py-16 bg-gradient-to-b from-[rgba(var(--mg-background),0.7)] to-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <MobiGlasPanel
              variant="dark"
              withScanline
              padding="lg"
              className="relative overflow-hidden"
            >
              {/* Header with decorative elements */}
              <div className="mb-6 flex items-center">
                <div className="w-2 h-2 bg-[rgba(var(--mg-primary),0.8)] mr-3"></div>
                <h2 className="mg-title text-2xl font-bold">OUR VISION</h2>
                <div className="flex-grow ml-3 h-[1px] bg-gradient-to-r from-[rgba(var(--mg-primary),0.8)] to-transparent"></div>
              </div>

              <div className="space-y-4">
                <p className="text-[rgba(var(--mg-text),0.8)] mb-4 relative">
                  <span className="text-[rgba(var(--mg-primary),1)] mr-2 font-mono">{'>'}</span>
                  At AydoCorp, we&apos;re committed to pushing the boundaries of what&apos;s possible in interstellar logistics. Our vision extends beyond traditional transportation to creating comprehensive logistics networks that connect the furthest reaches of known space.
                </p>

                <motion.div
                  className="h-[1px] w-3/4 bg-[rgba(var(--mg-primary),0.3)]"
                  initial={{ width: 0 }}
                  whileInView={{ width: "75%" }}
                  transition={{ duration: 0.8 }}
                  viewport={{ once: true }}
                />

                <p className="text-[rgba(var(--mg-text),0.8)] relative">
                  <span className="text-[rgba(var(--mg-primary),1)] mr-2 font-mono">{'>'}</span>
                  Whether you&apos;re an experienced logistics professional or new to the field, we provide the training, resources, and support needed to help you succeed in your career with us.
                </p>

                {/* Interactive elements */}
                <div className="mt-8 space-y-2">
                  <div className="flex items-center space-x-2 text-xs text-[rgba(var(--mg-text),0.7)]">
                    <StatusIndicator status="active" size="xs" />
                    <span>EXPERIENCED LEADERSHIP</span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-[rgba(var(--mg-text),0.7)]">
                    <StatusIndicator status="active" size="xs" />
                    <span>CUTTING-EDGE TECHNOLOGY</span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-[rgba(var(--mg-text),0.7)]">
                    <StatusIndicator status="active" size="xs" />
                    <span>COMPREHENSIVE TRAINING</span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-[rgba(var(--mg-text),0.7)]">
                    <StatusIndicator status="active" size="xs" />
                    <span>INTERSTELLAR OPPORTUNITIES</span>
                  </div>
                </div>
              </div>
            </MobiGlasPanel>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="relative h-64 md:h-96"
          >
            <motion.div
              className="absolute inset-0"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              <MobiGlasPanel
                variant="dark"
                cornerAccents
                className="h-full relative overflow-hidden"
              >
                <div className="absolute inset-0 overflow-hidden">
                  <Image
                    src={cdn('/sc_banner_crusader.png')}
                    alt="AydoCorp Operations"
                    fill
                    className="object-cover scale-[1.02] hologram-projection"
                  />

                  {/* Overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[rgba(var(--mg-primary),0.2)] to-transparent opacity-70"></div>
                </div>

                {/* Status indicator */}
                <div className="absolute bottom-3 left-3 z-20 flex items-center space-x-2">
                  <StatusIndicator status="online" size="sm" withPulse />
                  <span className="text-xs text-[rgba(var(--mg-text),0.9)] mg-subtitle">IMAGE ARCHIVE | CORPORATE HQ</span>
                </div>
              </MobiGlasPanel>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
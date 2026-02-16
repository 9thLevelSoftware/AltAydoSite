'use client';

import React from 'react';
import Image from 'next/image';
import { cdn } from '@/lib/cdn';
import { motion } from 'motion/react';
import { MobiGlasPanel, MobiGlasButton, ScanlineEffect, StatusIndicator } from '@/components/ui/mobiglas';

const services = [
  {
    id: 'cargo-transport',
    title: 'Cargo Transport & Management',
    description: 'End-to-end cargo transportation services across all major systems, featuring real-time tracking and advanced security protocols.',
    image: cdn('/bigcattt1024x576.jpg'),
  },
  {
    id: 'executive-transit',
    title: 'Executive & Personnel Transit',
    description: 'Premium transportation services with the highest standards of comfort and security for corporate personnel.',
    image: cdn('/starfarer_gemini.png'),
  },
  {
    id: 'supply-chain',
    title: 'Supply Chain Solutions',
    description: 'Comprehensive resource acquisition and logistics management tailored to your operational requirements.',
    image: cdn('/Asteroids_122018-Min.png'),
  },
  {
    id: 'recovery',
    title: 'Recovery & Assistance',
    description: 'Professional vessel recovery and assistance services, available continuously across all operational sectors.',
    image: cdn('/AdbDOm.jpg'),
  },
  {
    id: 'strategic-ops',
    title: 'Strategic Operations',
    description: 'Collaborative ventures and partnerships for complex logistics operations requiring multi-party coordination.',
    image: cdn('/carrack_expedition.png'),
  }
];

interface ScanningInterfaceProps {
  isScanning: boolean;
  scanComplete: boolean;
  scanProgress: number;
  highlightedService: number | null;
  scanMessages: string[];
  onResetScan: () => void;
}

export default function ScanningInterface({
  isScanning,
  scanComplete,
  scanProgress,
  highlightedService,
  scanMessages,
  onResetScan
}: ScanningInterfaceProps) {
  if (!isScanning && !scanComplete) return null;

  return (
    <section className="py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Advanced Scan Control Interface */}
        <MobiGlasPanel
          variant="dark"
          withHologram
          withScanline={isScanning}
          cornerAccents
          padding="lg"
          className="mb-12 relative overflow-hidden"
        >
          {/* Decorative grid lines */}
          <div className="absolute inset-0 grid grid-cols-12 gap-4 opacity-20 pointer-events-none">
            {Array(12).fill(0).map((_, i) => (
              <div key={`grid-col-${i}`} className="h-full w-px bg-cyan-500/30"></div>
            ))}
            {Array(6).fill(0).map((_, i) => (
              <div key={`grid-row-${i}`} className="w-full h-px bg-cyan-500/30 absolute" style={{ top: `${i * 20}%` }}></div>
            ))}
          </div>

          {/* Scanning animation overlay */}
          {isScanning && !scanComplete && (
            <ScanlineEffect variant="vertical" speed="medium" opacity="medium" />
          )}

          <div className="text-center relative z-10">
            <h3 className="text-2xl font-bold mb-4 text-cyan-400 flex items-center justify-center gap-2">
              <StatusIndicator
                status={isScanning ? 'loading' : scanComplete ? 'online' : 'inactive'}
                size="sm"
                withPulse={isScanning}
              />
              Service Availability Scanner
            </h3>

            {scanComplete ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center space-x-2 text-green-400 font-bold text-xl">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>SCAN COMPLETE - ALL SERVICES AVAILABLE</span>
                </div>
                <MobiGlasButton
                  onClick={onResetScan}
                  variant="secondary"
                  size="md"
                  leftIcon={
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                    </svg>
                  }
                >
                  RESET SCANNER
                </MobiGlasButton>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Advanced progress bar */}
                <div className="w-full h-6 bg-gray-800 rounded-full overflow-hidden p-1 border border-cyan-900/50">
                  <div className="relative h-full">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-100"
                      style={{ width: `${scanProgress}%` }}
                    ></div>
                    {/* Progress markers */}
                    {[25, 50, 75].map((mark) => (
                      <div
                        key={mark}
                        className="absolute top-0 bottom-0 w-px bg-gray-100/30"
                        style={{ left: `${mark}%` }}
                      ></div>
                    ))}
                    {/* Percentage indicator */}
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                      {scanProgress.toFixed(0)}%
                    </div>
                  </div>
                </div>

                <div className="text-cyan-400 font-mono flex items-center justify-center gap-2">
                  <StatusIndicator status="loading" size="xs" withPulse />
                  SCANNING: {scanProgress.toFixed(0)}% COMPLETE
                </div>

                {/* Terminal-like message display */}
                <div className="mt-4 p-3 bg-black/50 border border-cyan-900/50 rounded text-left h-32 overflow-y-auto font-mono text-sm">
                  <div className="flex items-center text-gray-400 mb-2">
                    <span className="text-green-400 mr-2">&gt;&gt;&gt;</span> Scan initialized at {new Date().toLocaleTimeString()}
                  </div>
                  {scanMessages.map((message, idx) => (
                    <div key={idx} className="text-gray-400 ml-4 mb-1">
                      <span className="text-cyan-400 mr-2">&gt;</span> {message}
                    </div>
                  ))}
                  {isScanning && !scanComplete && (
                    <div className="text-gray-400 inline-flex">
                      <span className="text-cyan-400 mr-2">&gt;</span>
                      <span className="animate-pulse">_</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </MobiGlasPanel>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {services.map((service, index) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: index * 0.1 }}
              viewport={{ once: true }}
              className={`relative group ${highlightedService === index ? 'ring-2 ring-cyan-500 scale-105 z-10' : ''} transition-all duration-300`}
            >
              <div className="relative h-64 overflow-hidden rounded-lg">
                <Image
                  src={service.image}
                  alt={service.title}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent ${highlightedService === index ? 'bg-blue-900/30' : ''}`} />

                {/* Service card scan effect */}
                {highlightedService === index && (
                  <div className="absolute inset-0 overflow-hidden">
                    {/* Horizontal scan line */}
                    <div className="absolute left-0 right-0 h-1 bg-cyan-400/50 blur-sm animate-pulse"
                      style={{
                        top: '50%',
                        boxShadow: '0 0 10px rgba(34, 211, 238, 0.5), 0 0 20px rgba(34, 211, 238, 0.3)'
                      }}>
                    </div>
                    {/* Corner marker dots */}
                    <div className="absolute top-2 left-2 h-2 w-2 rounded-full bg-cyan-400 animate-ping"></div>
                    <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-cyan-400 animate-ping" style={{ animationDelay: '0.5s' }}></div>
                    <div className="absolute bottom-2 left-2 h-2 w-2 rounded-full bg-cyan-400 animate-ping" style={{ animationDelay: '0.3s' }}></div>
                    <div className="absolute bottom-2 right-2 h-2 w-2 rounded-full bg-cyan-400 animate-ping" style={{ animationDelay: '0.8s' }}></div>
                  </div>
                )}

                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h3 className={`text-2xl font-bold mb-2 ${highlightedService === index ? 'text-cyan-400' : ''}`}>{service.title}</h3>
                  <p className="text-gray-300">{service.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
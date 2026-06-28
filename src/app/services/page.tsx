'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import { cdn } from '@/lib/cdn';
import MobiGlasButton from '@/components/ui/mobiglas/MobiGlasButton';

export default function Services() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanComplete, setScanComplete] = useState(false);
  const [highlightedService, setHighlightedService] = useState<number | null>(null);
  const [scanMessages, setScanMessages] = useState<string[]>([]);
  const [activeService, setActiveService] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [loadingComplete, setLoadingComplete] = useState(false);
  // Held in state and populated after mount to avoid SSR/client hydration mismatch
  const [currentTime, setCurrentTime] = useState('');

  // Services data
  const services = [
    {
      id: 'cargo',
      title: 'Cargo Transport & Management',
      description: 'Secure cargo transport across the verse',
      detailedDescription:
        'Professional cargo transport with secure handling and delivery guarantee',
      image: 'https://images.aydocorp.space/bigcattt1024x576.jpg',
      icon: '🚛',
      stats: [
        { label: 'Capacity', value: '1000+ SCU' },
        { label: 'Routes', value: '50+ Systems' },
      ],
    },
    {
      id: 'transit',
      title: 'Executive & Personnel Transit',
      description: 'Premium passenger transport and VIP services',
      detailedDescription: 'Luxury passenger transport for executives and VIP clientele',
      image: 'https://images.aydocorp.space/400i.png',
      icon: '✈️',
      stats: [
        { label: 'Comfort Rating', value: '5-Star' },
        { label: 'Safety Record', value: '100%' },
      ],
    },
    {
      id: 'supply',
      title: 'Supply Chain Solutions',
      description: 'End-to-end logistics and supply management',
      detailedDescription: 'Complete supply chain optimization and resource management solutions',
      image: 'https://images.aydocorp.space/Asteroids_122018-Min.png',
      icon: '📦',
      stats: [
        { label: 'Efficiency', value: '98%+' },
        { label: 'Networks', value: '200+ Stations' },
      ],
    },
    {
      id: 'recovery',
      title: 'Recovery and Assistance',
      description: 'Emergency response and asset recovery services',
      detailedDescription: 'Professional emergency response, rescue operations, and asset recovery',
      image: 'https://images.aydocorp.space/starfarer_gemini.png',
      icon: '🛟',
      stats: [
        { label: 'Response Time', value: '< 15 min' },
        { label: 'Success Rate', value: '94.5%' },
      ],
    },
  ];

  useEffect(() => {
    // Simulate initial loading process
    const timer = setTimeout(() => {
      setLoadingComplete(true);
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  // Live clock for the status bar — initialized after mount so server and
  // client render the same (empty) placeholder, then ticks every second.
  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let rafId: number | null = null;
    let latest = { x: 0, y: 0 };

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      latest = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };

      // Coalesce rapid mousemove events into a single state update per frame
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          rafId = null;
          setMousePosition(latest);
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  // Calculate parallax movement based on mouse position
  const calculateParallax = (depth: number = 1) => {
    if (!containerRef.current) return { x: 0, y: 0 };

    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const moveX = ((mousePosition.x - centerX) / centerX) * 6 * depth;
    const moveY = ((mousePosition.y - centerY) / centerY) * 4 * depth;

    return { x: moveX, y: moveY };
  };

  useEffect(() => {
    if (!isScanning) return;

    // Random technical-sounding messages to display during scanning
    const techMessages = [
      'Initializing quantum connection vectors...',
      'Parsing regional server nodes...',
      'Verifying service protocol integrity...',
      'Analyzing sector stability metrics...',
      'Syncing distributed cache partitions...',
      'Monitoring hyperspace bandwidth allocations...',
      'Establishing secure communication channels...',
      'Validating crypto-authentication protocols...',
      'Processing logistical capacity assessment...',
      'Calculating optimal service distribution...',
    ];

    // Add initial message
    setScanMessages([techMessages[0]]);

    // Single interval; both progress and the highlighted service are derived
    // from the functional updater's `prev` so we never read stale state.
    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setScanComplete(true);
          setScanMessages((current) => [...current, 'Scan procedure completed successfully']);
          setHighlightedService(null);
          return 100;
        }

        // Add a new message at certain progress points
        if (prev % 20 === 0) {
          const messageIndex = Math.floor(prev / 10) + 1;
          if (messageIndex < techMessages.length) {
            setScanMessages((current) => [...current, techMessages[messageIndex]]);
          }
        }

        // Highlight the service that corresponds to the current progress
        const serviceIndex = Math.floor((prev / 100) * services.length);
        setHighlightedService(serviceIndex < services.length ? serviceIndex : null);

        return prev + 1;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isScanning, services.length]);

  const startScan = () => {
    setIsScanning(true);
    setScanProgress(0);
    setScanComplete(false);
    setHighlightedService(null);
    setScanMessages([]);
  };

  const resetScan = () => {
    setIsScanning(false);
    setScanProgress(0);
    setScanComplete(false);
    setHighlightedService(null);
    setScanMessages([]);
  };

  return (
    <div ref={containerRef} className="relative min-h-screen flex flex-col">
      {/* Initial loading animation */}
      <AnimatePresence>
        {!loadingComplete && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-50 bg-black flex items-center justify-center"
          >
            <div className="text-center">
              <div className="mb-4 relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 border-2 border-[rgba(var(--mg-primary),0.5)] rounded-full"></div>
                <motion.div
                  className="absolute inset-0 border-t-2 border-[rgba(var(--mg-primary),1)] rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                ></motion.div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[rgba(var(--mg-primary),1)] text-xs">LOADING</span>
                </div>
              </div>
              <p className="text-[rgba(var(--mg-text),0.7)] text-sm mg-flicker">
                Initializing Services Module
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status Bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.8 }}
        className="sticky top-0 z-40 bg-black/90 border-b border-[rgba(var(--mg-primary),0.2)] py-1.5 px-4 text-xs text-[rgba(var(--mg-primary),0.8)] flex justify-between backdrop-blur-sm"
      >
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-[rgba(var(--mg-success),1)] animate-pulse"></span>
          <span className="mg-text text-xs tracking-wider">SYSTEM ONLINE</span>
          <span className="text-[rgba(var(--mg-text),0.5)] mx-4">|</span>
          <span className="text-[rgba(var(--mg-text),0.7)]">USER ACCESS:</span>{' '}
          <span className="text-[rgba(var(--mg-primary),0.9)] ml-1 mg-subtitle">CIVILIAN</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[rgba(var(--mg-text),0.7)]">QUANTUM LINK:</span>{' '}
          <span className="text-[rgba(var(--mg-success),1)] ml-1">ACTIVE</span>
          <span className="ml-4 font-mono text-[rgba(var(--mg-text),0.8)]" suppressHydrationWarning>
            {currentTime}
          </span>
        </div>
      </motion.div>

      {/* Hero Section */}
      <section className="relative pt-24 pb-16">
        <div className="absolute inset-0 z-0">
          <Image
            src={cdn('/Star_Citizen_Ships_510048_2560x1440.jpg')}
            alt="AydoCorp Logistics Operations"
            fill
            className="object-cover opacity-20"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black via-black/90 to-black"></div>
          <div className="absolute inset-0 circuit-bg opacity-10"></div>

          {/* Enhanced grid background */}
          <div className="absolute inset-0 mg-grid-bg opacity-10"></div>

          {/* Animated scan lines */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-0 w-full h-[1px] bg-[rgba(var(--mg-primary),0.4)] animate-scanline"></div>
            <div className="absolute left-0 h-full w-[1px] bg-[rgba(var(--mg-primary),0.4)] animate-scanline-vertical"></div>
          </div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1 }}
            style={{
              x: calculateParallax(0.3).x,
              y: calculateParallax(0.3).y,
            }}
            className="text-center mb-10"
          >
            <div className="inline-block relative">
              <h1 className="mg-title text-5xl sm:text-6xl mb-2 tracking-wider text-[rgba(var(--mg-primary),1)]">
                SERVICE MANIFEST
              </h1>

              {/* Corner elements for the title */}
              <div className="absolute -top-2 -left-4 w-8 h-8">
                <div className="absolute top-0 left-0 w-full h-0.5 bg-[rgba(var(--mg-primary),0.8)]"></div>
                <div className="absolute top-0 left-0 h-full w-0.5 bg-[rgba(var(--mg-primary),0.8)]"></div>
              </div>
              <div className="absolute -top-2 -right-4 w-8 h-8">
                <div className="absolute top-0 right-0 w-full h-0.5 bg-[rgba(var(--mg-primary),0.8)]"></div>
                <div className="absolute top-0 right-0 h-full w-0.5 bg-[rgba(var(--mg-primary),0.8)]"></div>
              </div>
              <div className="absolute -bottom-2 -left-4 w-8 h-8">
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[rgba(var(--mg-primary),0.8)]"></div>
                <div className="absolute bottom-0 left-0 h-full w-0.5 bg-[rgba(var(--mg-primary),0.8)]"></div>
              </div>
              <div className="absolute -bottom-2 -right-4 w-8 h-8">
                <div className="absolute bottom-0 right-0 w-full h-0.5 bg-[rgba(var(--mg-primary),0.8)]"></div>
                <div className="absolute bottom-0 right-0 h-full w-0.5 bg-[rgba(var(--mg-primary),0.8)]"></div>
              </div>
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
                onClick={startScan}
                variant="primary"
                size="lg"
                withScanline
                leftIcon={
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"
                      clipRule="evenodd"
                    />
                  </svg>
                }
              >
                INITIALIZE SERVICE SCAN
              </MobiGlasButton>
            ) : null}
          </motion.div>
        </div>
      </section>

      {/* Pre-scan service overview */}
      {!isScanning && !scanComplete && (
        <section className="relative py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 1.5 }}
              className="mg-container p-6 relative overflow-hidden mb-10"
            >
              <div className="absolute inset-0 circuit-bg opacity-5"></div>
              <div className="absolute inset-0 mg-grid-bg opacity-10"></div>

              {/* Corner brackets */}
              <div className="absolute top-0 left-0 w-10 h-10">
                <div className="absolute top-0 left-0 w-full h-0.5 bg-[rgba(var(--mg-primary),0.8)]"></div>
                <div className="absolute top-0 left-0 h-full w-0.5 bg-[rgba(var(--mg-primary),0.8)]"></div>
                <div className="absolute top-2 left-2 w-2 h-2 rounded-full border border-[rgba(var(--mg-primary),0.8)] animate-pulse"></div>
              </div>
              <div className="absolute top-0 right-0 w-10 h-10">
                <div className="absolute top-0 right-0 w-full h-0.5 bg-[rgba(var(--mg-primary),0.8)]"></div>
                <div className="absolute top-0 right-0 h-full w-0.5 bg-[rgba(var(--mg-primary),0.8)]"></div>
                <div
                  className="absolute top-2 right-2 w-2 h-2 rounded-full border border-[rgba(var(--mg-primary),0.8)] animate-pulse"
                  style={{ animationDelay: '0.5s' }}
                ></div>
              </div>
              <div className="absolute bottom-0 left-0 w-10 h-10">
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[rgba(var(--mg-primary),0.8)]"></div>
                <div className="absolute bottom-0 left-0 h-full w-0.5 bg-[rgba(var(--mg-primary),0.8)]"></div>
                <div
                  className="absolute bottom-2 left-2 w-2 h-2 rounded-full border border-[rgba(var(--mg-primary),0.8)] animate-pulse"
                  style={{ animationDelay: '1s' }}
                ></div>
              </div>
              <div className="absolute bottom-0 right-0 w-10 h-10">
                <div className="absolute bottom-0 right-0 w-full h-0.5 bg-[rgba(var(--mg-primary),0.8)]"></div>
                <div className="absolute bottom-0 right-0 h-full w-0.5 bg-[rgba(var(--mg-primary),0.8)]"></div>
                <div
                  className="absolute bottom-2 right-2 w-2 h-2 rounded-full border border-[rgba(var(--mg-primary),0.8)] animate-pulse"
                  style={{ animationDelay: '1.5s' }}
                ></div>
              </div>

              <div className="relative z-10">
                <div className="mg-header text-center mb-6">
                  <h3 className="mg-subtitle text-xl">SERVICE CAPABILITIES OVERVIEW</h3>
                </div>

                <div className="text-[rgba(var(--mg-text),0.8)] text-sm mb-6">
                  <p className="max-w-4xl mx-auto text-center">
                    AydoCorp offers a comprehensive suite of logistics and transport services
                    designed for both corporate and individual clients. Our cutting-edge fleet and
                    experienced personnel ensure the highest standards of efficiency, security, and
                    reliability across all operational sectors.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                  {services.map((service, index) => (
                    <motion.div
                      key={service.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 1.8 + index * 0.1 }}
                      whileHover={{ scale: 1.02 }}
                      className="mg-container p-0.5 group cursor-pointer overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(var(--mg-primary),0.8)]"
                      role="button"
                      tabIndex={0}
                      aria-expanded={activeService === service.id}
                      aria-label={`${service.title} — toggle details`}
                      onClick={() =>
                        setActiveService(activeService === service.id ? null : service.id)
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setActiveService(activeService === service.id ? null : service.id);
                        }
                      }}
                    >
                      <div className="relative h-full w-full overflow-hidden">
                        {/* Animated border */}
                        <div className="absolute inset-px z-10 bg-transparent border border-[rgba(var(--mg-primary),0.3)] group-hover:border-[rgba(var(--mg-primary),0.6)] transition-colors duration-300"></div>

                        {/* Corner markers */}
                        <div className="absolute top-0 left-0 w-5 h-5 z-10">
                          <div className="absolute top-0 left-0 w-full h-[1px] bg-[rgba(var(--mg-primary),0.8)]"></div>
                          <div className="absolute top-0 left-0 h-full w-[1px] bg-[rgba(var(--mg-primary),0.8)]"></div>
                        </div>
                        <div className="absolute top-0 right-0 w-5 h-5 z-10">
                          <div className="absolute top-0 right-0 w-full h-[1px] bg-[rgba(var(--mg-primary),0.8)]"></div>
                          <div className="absolute top-0 right-0 h-full w-[1px] bg-[rgba(var(--mg-primary),0.8)]"></div>
                        </div>
                        <div className="absolute bottom-0 left-0 w-5 h-5 z-10">
                          <div className="absolute bottom-0 left-0 w-full h-[1px] bg-[rgba(var(--mg-primary),0.8)]"></div>
                          <div className="absolute bottom-0 left-0 h-full w-[1px] bg-[rgba(var(--mg-primary),0.8)]"></div>
                        </div>
                        <div className="absolute bottom-0 right-0 w-5 h-5 z-10">
                          <div className="absolute bottom-0 right-0 w-full h-[1px] bg-[rgba(var(--mg-primary),0.8)]"></div>
                          <div className="absolute bottom-0 right-0 h-full w-[1px] bg-[rgba(var(--mg-primary),0.8)]"></div>
                        </div>

                        {/* Inner content */}
                        <div className="relative z-0 h-full p-6 bg-[rgba(var(--mg-background),0.5)]">
                          <div className="flex items-start mb-4">
                            <div className="mr-3 mt-1">
                              <div className="w-10 h-10 rounded-full bg-[rgba(var(--mg-primary),0.1)] border border-[rgba(var(--mg-primary),0.3)] flex items-center justify-center">
                                <span className="text-lg text-[rgba(var(--mg-primary),1)]">
                                  {service.icon}
                                </span>
                              </div>
                            </div>
                            <div>
                              <h3 className="mg-text text-lg font-bold mb-2">{service.title}</h3>
                              <p className="text-xs text-[rgba(var(--mg-text),0.7)]">
                                {service.description}
                              </p>
                            </div>
                          </div>

                          {/* Active state with details */}
                          <AnimatePresence>
                            {activeService === service.id && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.3 }}
                                className="overflow-hidden"
                              >
                                <div className="pt-3 border-t border-[rgba(var(--mg-primary),0.2)]">
                                  <p className="text-xs text-[rgba(var(--mg-text),0.6)] mb-4">
                                    {service.detailedDescription}
                                  </p>

                                  <div className="grid grid-cols-3 gap-2 text-center">
                                    {service.stats.map((stat, idx) => (
                                      <div key={idx} className="text-xs">
                                        <div className="text-[rgba(var(--mg-primary),1)] font-bold">
                                          {stat.value}
                                        </div>
                                        <div className="text-[rgba(var(--mg-text),0.5)] text-[10px]">
                                          {stat.label}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* View details prompt */}
                          <div
                            className={`mt-2 text-xs text-center text-[rgba(var(--mg-primary),0.7)] ${activeService === service.id ? 'hidden' : 'block'}`}
                          >
                            <span className="flex items-center justify-center">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-3 w-3 mr-1"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 9l-7 7-7-7"
                                />
                              </svg>
                              EXPAND DETAILS
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* Services Grid with Scan Feature */}
      {(isScanning || scanComplete) && (
        <section className="py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Advanced Scan Control Interface */}
            <div className="mb-12 p-6 border border-[rgba(var(--mg-primary),0.3)] bg-black/70 relative rounded-lg overflow-hidden">
              <div className="absolute inset-0 opacity-20 bg-gradient-to-r from-blue-500/20 to-cyan-500/20"></div>

              {/* Decorative grid lines */}
              <div className="absolute inset-0 grid grid-cols-12 gap-4 opacity-20 pointer-events-none">
                {Array(12)
                  .fill(0)
                  .map((_, i) => (
                    <div key={`grid-col-${i}`} className="h-full w-px bg-cyan-500/30"></div>
                  ))}
                {Array(6)
                  .fill(0)
                  .map((_, i) => (
                    <div
                      key={`grid-row-${i}`}
                      className="w-full h-px bg-cyan-500/30 absolute"
                      style={{ top: `${i * 20}%` }}
                    ></div>
                  ))}
              </div>

              {/* Scanning animation overlay */}
              {isScanning && !scanComplete && (
                <div className="absolute inset-0 overflow-hidden">
                  <div
                    className="absolute top-0 h-full w-2 bg-cyan-400/30 blur-sm animate-scanline-vertical"
                    style={{
                      boxShadow:
                        '0 0 20px rgba(34, 211, 238, 0.5), 0 0 40px rgba(34, 211, 238, 0.3), 0 0 60px rgba(34, 211, 238, 0.2)',
                    }}
                  ></div>
                </div>
              )}

              <div className="text-center relative z-10">
                <h3 className="text-2xl font-bold mb-4 text-cyan-400 flex items-center justify-center gap-2">
                  <span
                    className={`inline-block h-3 w-3 rounded-full ${isScanning ? 'bg-cyan-400 animate-pulse' : scanComplete ? 'bg-green-400' : 'bg-gray-600'}`}
                  ></span>
                  Service Availability Scanner
                </h3>

                {scanComplete ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center space-x-2 text-green-400 font-bold text-xl">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span>SCAN COMPLETE - ALL SERVICES AVAILABLE</span>
                    </div>
                    <MobiGlasButton
                      onClick={resetScan}
                      variant="success"
                      size="lg"
                      leftIcon={
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                            clipRule="evenodd"
                          />
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
                      <span className="inline-block h-2 w-2 bg-cyan-400 rounded-full animate-pulse"></span>
                      SCANNING: {scanProgress.toFixed(0)}% COMPLETE
                    </div>

                    {/* Terminal-like message display */}
                    <div className="mt-4 p-3 bg-black/50 border border-cyan-900/50 rounded text-left h-32 overflow-y-auto font-mono text-sm">
                      <div className="flex items-center text-gray-400 mb-2">
                        <span className="text-green-400 mr-2">&gt;&gt;&gt;</span> Scan initialized
                        at {new Date().toLocaleTimeString()}
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
            </div>

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
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                    <div
                      className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent ${highlightedService === index ? 'bg-blue-900/30' : ''}`}
                    />

                    {/* Service card scan effect */}
                    {highlightedService === index && (
                      <div className="absolute inset-0 overflow-hidden">
                        {/* Horizontal scan line */}
                        <div
                          className="absolute left-0 right-0 h-1 bg-cyan-400/50 blur-sm animate-pulse"
                          style={{
                            top: '50%',
                            boxShadow:
                              '0 0 10px rgba(34, 211, 238, 0.5), 0 0 20px rgba(34, 211, 238, 0.3)',
                          }}
                        ></div>
                        {/* Corner marker dots */}
                        <div className="absolute top-2 left-2 h-2 w-2 rounded-full bg-cyan-400 animate-ping"></div>
                        <div
                          className="absolute top-2 right-2 h-2 w-2 rounded-full bg-cyan-400 animate-ping"
                          style={{ animationDelay: '0.5s' }}
                        ></div>
                        <div
                          className="absolute bottom-2 left-2 h-2 w-2 rounded-full bg-cyan-400 animate-ping"
                          style={{ animationDelay: '0.3s' }}
                        ></div>
                        <div
                          className="absolute bottom-2 right-2 h-2 w-2 rounded-full bg-cyan-400 animate-ping"
                          style={{ animationDelay: '0.8s' }}
                        ></div>
                      </div>
                    )}

                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <h3
                        className={`text-2xl font-bold mb-2 ${highlightedService === index ? 'text-cyan-400' : ''}`}
                      >
                        {service.title}
                      </h3>
                      <p className="text-gray-300">{service.description}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Call to Action */}
      <section className="py-16 bg-gradient-to-b from-black to-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="mg-container p-8 border border-[rgba(var(--mg-primary),0.3)] relative overflow-hidden"
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
              <a
                href="https://docs.google.com/forms/d/e/1FAIpQLSekyn2ZhdU9czvQrcLSpo1b0wIzRX__DxLFk89L4Y0NZ8FiwQ/viewform"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block"
              >
                <MobiGlasButton variant="accent" size="lg" withScanline>
                  Submit Service Request
                </MobiGlasButton>
              </a>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import Image from 'next/image';
import { cdn } from '@/lib/cdn';
import Link from 'next/link';

export default function HeroSection() {
  const [time, setTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mg-container relative overflow-hidden border-[rgba(var(--mg-primary),0.2)] max-w-6xl mx-auto">
          {/* Decorative elements */}
          <div className="absolute top-0 left-0 w-full h-full">
            <div className="mg-grid-bg"></div>
            <div className="holo-noise"></div>
            <div className="holo-scan"></div>
            <div className="line-noise opacity-5"></div>
          </div>
          
          {/* Minimal corner brackets */}
          <div className="absolute top-0 left-0 w-16 h-16 border-l-2 border-t-2 border-[rgba(var(--mg-primary),0.6)]"></div>
          <div className="absolute top-0 right-0 w-16 h-16 border-r-2 border-t-2 border-[rgba(var(--mg-primary),0.6)]"></div>
          <div className="absolute bottom-0 left-0 w-16 h-16 border-l-2 border-b-2 border-[rgba(var(--mg-primary),0.6)]"></div>
          <div className="absolute bottom-0 right-0 w-16 h-16 border-r-2 border-b-2 border-[rgba(var(--mg-primary),0.6)]"></div>
          
          {/* Content */}
          <div className="relative z-10 p-8 md:p-16 flex flex-col md:flex-row items-center">
            {/* Left Column - Logo & Status */}
            <div className="md:w-1/2 mb-12 md:mb-0">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="text-center md:text-center w-full flex flex-col items-center"
              >
                {/* Logo - Detached from parent alignment */}
                <div className="w-full flex justify-center md:justify-center mb-6">
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="relative inline-block"
                  >
                    <div className="relative w-48 h-48 md:w-56 md:h-56">
                      <Image 
                        src={cdn('/Aydo_Corp_logo_employees.png')} 
                        alt="Aydo Intergalactic Corporation Logo" 
                        fill
                        className="object-contain"
                      />
                      <div className="absolute inset-0 hologram-flicker"></div>
                    </div>
                  </motion.div>
                </div>
                
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="mb-2 flex flex-wrap justify-center"
                >
                  <span className="mg-title text-2xl md:text-4xl tracking-wider text-[rgba(var(--mg-primary),1)]">
                    AYDO
                  </span>
                  <span className="mg-title text-2xl md:text-4xl tracking-wider text-[rgba(var(--mg-text),0.9)] mx-2">
                    INTERGALACTIC
                  </span>
                  <span className="mg-title text-2xl md:text-4xl tracking-wider text-[rgba(var(--mg-accent),0.9)]">
                    CORPORATION
                  </span>
                </motion.div>
                
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                  className="mg-subtitle text-base md:text-lg opacity-90 tracking-widest mb-6 text-center"
                >
                  <span className="mg-flicker inline-block bg-gradient-to-r from-[rgba(var(--mg-primary),0.9)] via-[rgba(var(--mg-accent),0.8)] to-[rgba(var(--mg-primary),0.9)] bg-clip-text text-transparent">
                    AydoCorp: The New Horizon of Commercial Logistics
                  </span>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1, delay: 0.8 }}
                  className="flex flex-wrap justify-center gap-2 mt-6"
                >
                  <div className="mg-container p-2 text-xs">
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-[rgba(var(--mg-success),0.8)] mr-2"></div>
                      <span className="text-[rgba(var(--mg-text),0.9)]">QTL NETWORK: ONLINE</span>
                    </div>
                  </div>
                  
                  <div className="mg-container p-2 text-xs">
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-[rgba(var(--mg-primary),0.8)] animate-pulse mr-2"></div>
                      <span className="text-[rgba(var(--mg-text),0.9)]">
                        {time.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </div>
            
            {/* Right Column - Headline & CTA */}
            <div className="md:w-1/2 md:pl-12">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="text-center md:text-left"
              >
                <h2 className="text-xl md:text-2xl text-[rgba(var(--mg-text),0.9)] mb-6 leading-relaxed">
                  Shipping and resource consolidation across human and alien space
                </h2>
                
                <motion.div 
                  className="mb-8 text-sm md:text-base text-[rgba(var(--mg-text),0.7)]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                >
                  <p className="mb-4">
                    Based in the Ellis system on planet Green, our corporation offers premium logistics and transport services throughout known space. Our specialized fleet and experienced crew ensure your cargo reaches its destination safely and on time.
                  </p>
                </motion.div>
                
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                  className="flex flex-wrap gap-4 justify-center md:justify-start"
                >
                  <Link href="#services">
                    <motion.button 
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                      className="mg-button py-2.5 px-6 text-sm flex items-center"
                    >
                      <span>EXPLORE SERVICES</span>
                      <div className="ml-2 w-4 h-4 relative">
                        <span className="absolute inset-0 flex items-center justify-center">
                          <span className="block w-3 h-0.5 bg-[rgba(var(--mg-primary),0.8)]"></span>
                          <span className="block w-0.5 h-3 bg-[rgba(var(--mg-primary),0.8)] absolute right-0"></span>
                        </span>
                      </div>
                    </motion.button>
                  </Link>
                  
                  <Link href="#join">
                    <motion.button 
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                      className="mg-button py-2.5 px-6 text-sm border-[rgba(var(--mg-success),0.4)] hover:border-[rgba(var(--mg-success),0.7)]"
                    >
                      JOIN OUR TEAM
                    </motion.button>
                  </Link>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
} 
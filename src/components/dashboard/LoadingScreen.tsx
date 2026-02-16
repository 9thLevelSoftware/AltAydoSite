'use client';

import { motion } from 'motion/react';
import Image from 'next/image';
import { bgUrl, cdn } from '@/lib/cdn';

const LoadingScreen = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black bg-opacity-90 bg-cover bg-center bg-blend-overlay" style={{ backgroundImage: bgUrl('/spacebg.jpg') }}>
      <div className="relative z-10">
        {/* Holographic loading animation */}
        <motion.div 
          className="relative flex flex-col items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Outer hexagon */}
          <div className="absolute w-32 h-32 border-2 border-[rgba(var(--mg-accent),0.3)] rotate-45 animate-pulse" />
          
          {/* Inner circle with scanner line */}
          <div className="relative w-24 h-24 rounded-full overflow-hidden flex items-center justify-center border border-[rgba(var(--mg-primary),0.4)]">
            <div className="absolute inset-0 bg-[rgba(var(--mg-panel-dark),0.5)]" />
            
            {/* Horizontal scan line */}
            <div className="absolute w-full h-0.5 bg-[rgba(var(--mg-primary),0.8)] animate-scan" />
            
            {/* Aydo logo */}
            <div className="relative w-12 h-12 z-10">
              <Image 
                src={cdn('/Aydo_Corp_logo_employees.png')} 
                alt="AydoCorp Logo" 
                width={48}
                height={48}
                className="object-contain opacity-80"
              />
            </div>
          </div>
          
          {/* Animated dots */}
          <div className="mt-4 flex space-x-1.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.div 
                key={i}
                className="w-1.5 h-1.5 bg-[rgba(var(--mg-primary),0.8)] rounded-full"
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{ 
                  duration: 1.5, 
                  repeat: Infinity, 
                  delay: i * 0.15 
                }}
              />
            ))}
          </div>
          
          <motion.div 
            className="mt-4 font-quantify tracking-widest text-sm text-[rgba(var(--mg-primary),0.9)]"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            INITIALIZING
          </motion.div>
          
          {/* Loading percentage */}
          <motion.div 
            className="mt-1 font-quantify text-xs text-[rgba(var(--mg-text),0.7)]"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 2.5 }}
          >
            <span className="mg-flicker">ACCESSING SECURE DATABASE</span>
          </motion.div>
        </motion.div>
        
        {/* Holographic rings */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-[rgba(var(--mg-primary),0.1)] rounded-full animate-spin-slow opacity-30" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 border border-[rgba(var(--mg-primary),0.05)] rounded-full animate-spin-slow opacity-20" style={{ animationDirection: 'reverse' }} />
      </div>
      
      {/* Holographic grid background */}
      <div className="hex-grid absolute inset-0 opacity-10" />
    </div>
  );
};

export default LoadingScreen; 
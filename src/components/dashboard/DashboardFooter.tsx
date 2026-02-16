'use client';

import { motion } from 'motion/react';

const DashboardFooter = () => {
  return (
    <motion.footer
      className="relative px-6 pb-4 mt-auto"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <div className="flex items-center justify-between relative py-3">
        {/* Left section - Company name */}
        <div className="flex items-center space-x-2">
          <div className="w-6 h-px bg-[rgba(var(--mg-primary),0.3)]"></div>
          <span className="text-xs tracking-widest text-[rgba(var(--mg-text),0.5)]">
            AYDO CORP
          </span>
        </div>
        
        {/* Center decorative element */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-0 flex flex-col items-center">
          <div className="w-24 h-px bg-gradient-to-r from-transparent via-[rgba(var(--mg-primary),0.4)] to-transparent"></div>
          <div className="w-1 h-1 -mt-0.5 rounded-full bg-[rgba(var(--mg-primary),0.4)]"></div>
        </div>
        
        {/* Right section - Confidential note */}
        <div className="flex items-center space-x-2">
          <span className="text-xs font-quantify text-[rgba(var(--mg-primary),0.6)] mg-flicker tracking-wider">
            CONFIDENTIAL
          </span>
          <div className="w-6 h-px bg-[rgba(var(--mg-primary),0.3)]"></div>
        </div>
        
        {/* Background scanline effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10">
          <div className="absolute w-full h-0.5 bg-[rgba(var(--mg-primary),0.5)] animate-scan"></div>
        </div>
      </div>
    </motion.footer>
  );
};

export default DashboardFooter; 
'use client';

import React, { useState, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface HoloModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: string;
  height?: string;
  showCloseButton?: boolean;
}

const HoloModal: React.FC<HoloModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children,
  width = 'md:w-3/4 lg:w-2/3',
  height = 'h-auto',
  showCloseButton = true
}) => {
  const [showBinaryData, setShowBinaryData] = useState(false);
  const [scanPosition, setScanPosition] = useState(0);
  const [bootSequence, setBootSequence] = useState(false);
  const [hologramActive, setHologramActive] = useState(false);
  
  // Generate binary data stream on mount
  useEffect(() => {
    if (isOpen) {
      setBootSequence(true);
      
      // Start showing binary data after boot sequence
      const binaryTimer = setTimeout(() => {
        setShowBinaryData(true);
      }, 1200);
      
      // Activate hologram effect
      const hologramTimer = setTimeout(() => {
        setHologramActive(true);
      }, 800);
      
      // Scan effect
      const scanInterval = setInterval(() => {
        setScanPosition(prev => (prev + 1) % 100);
      }, 30);
      
      return () => {
        clearTimeout(binaryTimer);
        clearTimeout(hologramTimer);
        clearInterval(scanInterval);
      };
    } else {
      setBootSequence(false);
      setShowBinaryData(false);
      setHologramActive(false);
    }
  }, [isOpen]);
  
  // Generate binary data strings
  const generateBinary = () => {
    return Array.from({ length: 20 }, () => 
      Array.from({ length: 20 }, () => Math.round(Math.random())).join('')
    );
  };
  
  // Animation variants
  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { duration: 0.4 }
    },
    exit: { 
      opacity: 0,
      transition: { duration: 0.4, delay: 0.2 }
    }
  };
  
  const containerVariants = {
    hidden: { 
      opacity: 0,
      scale: 0.8,
      y: 20
    },
    visible: { 
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { 
        duration: 0.5,
        type: "spring",
        stiffness: 100,
        damping: 15
      }
    },
    exit: { 
      opacity: 0,
      scale: 0.8,
      y: 20,
      transition: { duration: 0.3 }
    }
  };
  
  const bootSequenceVariants = {
    hidden: { opacity: 0, scaleY: 0 },
    visible: { 
      opacity: 1, 
      scaleY: 1,
      transition: { duration: 0.5 }
    },
    exit: { 
      opacity: 0,
      scaleY: 0,
      transition: { duration: 0.3 }
    }
  };
  
  const glitchEffect = {
    x: [0, -5, 5, -2, 2, 0],
    opacity: [1, 0.8, 0.9, 0.7, 1],
    skewX: [0, -2, 2, -1, 1, 0]
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="modal-backdrop"
          className="fixed inset-0 z-50 overflow-auto flex items-center justify-center p-4"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {/* Dark backdrop with hexagon pattern */}
          <div className="absolute inset-0 bg-black bg-opacity-70">
            {/* Hexagon background pattern */}
            <div className="hexagon-bg absolute inset-0 opacity-20 pointer-events-none"></div>
            
            {/* Grid background */}
            <div className="absolute inset-0 mg-grid-bg opacity-10"></div>
            
            {/* Cinematic light rays */}
            <motion.div 
              className="absolute inset-0 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: hologramActive ? 0.4 : 0 }}
              transition={{ duration: 1 }}
            >
              <div className="absolute top-0 left-1/2 w-1/3 h-[40vh] bg-gradient-to-b from-[rgba(var(--mg-primary),0.4)] to-transparent transform -translate-x-1/2 opacity-30"></div>
              <div className="absolute top-0 left-1/3 w-1/4 h-[30vh] bg-gradient-to-b from-[rgba(var(--mg-primary),0.3)] to-transparent transform -translate-x-1/2 opacity-20"></div>
              <div className="absolute top-0 left-2/3 w-1/4 h-[35vh] bg-gradient-to-b from-[rgba(var(--mg-primary),0.3)] to-transparent transform -translate-x-1/2 opacity-25"></div>
            </motion.div>
            
            {/* Random data points */}
            {showBinaryData && (
              <div className="absolute inset-0 overflow-hidden">
                {/* Binary data visualization */}
                <div className="absolute inset-0 flex flex-wrap justify-between content-start opacity-20 overflow-hidden px-4 py-6">
                  {generateBinary().map((line, i) => (
                    <motion.div
                      key={i}
                      className="text-xs font-mono text-[rgba(var(--mg-primary),0.7)] opacity-30 mr-4 mb-1 overflow-hidden whitespace-nowrap"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0.3, 0.6, 0.3] }}
                      transition={{ 
                        duration: Math.random() * 3 + 2,
                        repeat: Infinity,
                        delay: i * 0.1
                      }}
                    >
                      {line}
                    </motion.div>
                  ))}
                </div>
                
                {/* Floating data particles */}
                {Array.from({ length: 30 }).map((_, i) => (
                  <motion.div
                    key={`particle-${i}`}
                    className="absolute w-1 h-1 rounded-full bg-[rgba(var(--mg-primary),0.5)]"
                    style={{ 
                      top: `${Math.random() * 100}%`,
                      left: `${Math.random() * 100}%`
                    }}
                    animate={{
                      y: [0, Math.random() > 0.5 ? 100 : -100],
                      opacity: [0, 0.7, 0]
                    }}
                    transition={{
                      duration: Math.random() * 5 + 5,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                  />
                ))}
                
                {/* Horizontal data streams */}
                {Array.from({ length: 10 }).map((_, i) => (
                  <motion.div
                    key={`h-stream-${i}`}
                    className="absolute h-px bg-gradient-to-r from-transparent via-[rgba(var(--mg-primary),0.6)] to-transparent"
                    style={{ 
                      top: `${Math.random() * 100}%`,
                      width: `${Math.random() * 30 + 20}%`,
                      left: `${Math.random() * 50}%`,
                      opacity: Math.random() * 0.5 + 0.1
                    }}
                    animate={{
                      x: ['-100%', '200%']
                    }}
                    transition={{
                      duration: Math.random() * 4 + 3,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                  />
                ))}
              </div>
            )}
          </div>
          
          {/* Modal container */}
          <motion.div
            key="modal-container"
            className={`relative ${width} max-w-5xl ${height} max-h-[90vh] overflow-hidden z-10`}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* Cinematic hologram projection lines */}
            <AnimatePresence>
              {hologramActive && (
                <>
                  <motion.div
                    className="absolute top-0 inset-x-0 h-[30vh] pointer-events-none"
                    initial={{ opacity: 0, scaleY: 0 }}
                    animate={{ opacity: 0.2, scaleY: 1 }}
                    exit={{ opacity: 0, scaleY: 0 }}
                    transition={{ duration: 0.5 }}
                    style={{ transformOrigin: 'top' }}
                  >
                    {/* Projection beam */}
                    <div className="absolute inset-x-0 top-0 h-full bg-gradient-to-b from-[rgba(var(--mg-primary),0.3)] to-transparent"></div>
                    
                    {/* Projection lines */}
                    {Array.from({ length: 10 }).map((_, i) => (
                      <motion.div
                        key={`line-top-${i}`}
                        className="absolute w-[1px] h-full bg-[rgba(var(--mg-primary),0.6)]"
                        style={{ left: `${10 + (i * 8)}%` }}
                        animate={{ opacity: [0.2, 0.6, 0.2] }}
                        transition={{ 
                          duration: 2, 
                          repeat: Infinity,
                          delay: i * 0.2
                        }}
                      />
                    ))}
                  </motion.div>
                  
                  <motion.div
                    className="absolute bottom-0 inset-x-0 h-[30vh] pointer-events-none"
                    initial={{ opacity: 0, scaleY: 0 }}
                    animate={{ opacity: 0.2, scaleY: 1 }}
                    exit={{ opacity: 0, scaleY: 0 }}
                    transition={{ duration: 0.5 }}
                    style={{ transformOrigin: 'bottom' }}
                  >
                    {/* Projection beam */}
                    <div className="absolute inset-x-0 bottom-0 h-full bg-gradient-to-t from-[rgba(var(--mg-primary),0.3)] to-transparent"></div>
                    
                    {/* Projection lines */}
                    {Array.from({ length: 10 }).map((_, i) => (
                      <motion.div
                        key={`line-bottom-${i}`}
                        className="absolute w-[1px] h-full bg-[rgba(var(--mg-primary),0.6)]"
                        style={{ left: `${10 + (i * 8)}%` }}
                        animate={{ opacity: [0.2, 0.6, 0.2] }}
                        transition={{ 
                          duration: 2, 
                          repeat: Infinity,
                          delay: i * 0.2
                        }}
                      />
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
            
            {/* Boot sequence - appears on initial open */}
            <AnimatePresence>
              {bootSequence && (
                <motion.div
                  className="absolute inset-0 bg-black bg-opacity-90 z-50 flex flex-col items-center justify-center overflow-hidden"
                  variants={bootSequenceVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  onAnimationComplete={() => {
                    setTimeout(() => setBootSequence(false), 1000);
                  }}
                >
                  {/* Glitch effect on text */}
                  <motion.div
                    className="font-mono text-[rgba(var(--mg-primary),0.9)] text-sm"
                    animate={glitchEffect}
                    transition={{ 
                      duration: 0.5,
                      repeat: 3,
                      repeatType: "reverse",
                      ease: "easeOut"
                    }}
                  >
                    INITIALIZING HOLOGRAPHIC INTERFACE
                  </motion.div>
                  
                  {/* Loading bar */}
                  <div className="w-64 h-1 bg-[rgba(var(--mg-panel-dark),0.5)] mt-4 overflow-hidden rounded-sm">
                    <motion.div
                      className="h-full bg-[rgba(var(--mg-primary),0.8)]"
                      initial={{ width: 0 }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 0.8, ease: "easeInOut" }}
                    />
                  </div>
                  
                  {/* System messages */}
                  <motion.div
                    className="mt-6 font-mono text-[rgba(var(--mg-primary),0.7)] text-xs flex flex-col items-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                  >
                    <p>» ESTABLISHING QUANTUM LINK</p>
                    <p>» CALIBRATING HOLOGRAPHIC PROJECTORS</p>
                    <p>» RENDERING INTERFACE</p>
                  </motion.div>
                  
                  {/* Circular loader */}
                  <motion.div
                    className="absolute"
                    initial={{ rotate: 0 }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <svg width="200" height="200" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="rgba(var(--mg-primary),0.2)"
                        strokeWidth="1"
                      />
                      <motion.circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="rgba(var(--mg-primary),0.8)"
                        strokeWidth="1"
                        strokeDasharray="251.2"
                        strokeDashoffset="180"
                        initial={{ strokeDashoffset: 251.2 }}
                        animate={{ strokeDashoffset: 0 }}
                        transition={{ duration: 1.5, ease: "easeInOut" }}
                      />
                      
                      {/* Markers around circle */}
                      {Array.from({ length: 12 }).map((_, i) => (
                        <rect
                          key={i}
                          x="49"
                          y="10"
                          width="2"
                          height="5"
                          fill="rgba(var(--mg-primary),0.5)"
                          transform={`rotate(${i * 30} 50 50)`}
                        />
                      ))}
                    </svg>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Modal content */}
            <div className="mg-panel bg-[rgba(var(--mg-panel-dark),0.8)] border border-[rgba(var(--mg-primary),0.3)] relative h-full flex flex-col overflow-hidden">
              {/* Corner decorations */}
              <div className="absolute top-0 right-0 w-[30px] h-[30px] pointer-events-none">
                <div className="absolute top-0 right-0 w-[3px] h-[15px] bg-[rgba(var(--mg-primary),0.6)]"></div>
                <div className="absolute top-0 right-0 w-[15px] h-[3px] bg-[rgba(var(--mg-primary),0.6)]"></div>
              </div>
              <div className="absolute bottom-0 left-0 w-[30px] h-[30px] pointer-events-none">
                <div className="absolute bottom-0 left-0 w-[3px] h-[15px] bg-[rgba(var(--mg-primary),0.6)]"></div>
                <div className="absolute bottom-0 left-0 w-[15px] h-[3px] bg-[rgba(var(--mg-primary),0.6)]"></div>
              </div>
              
              {/* Advanced corner decorations */}
              <motion.div 
                className="absolute top-0 left-0 w-[30px] h-[30px] pointer-events-none overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                <motion.div 
                  className="absolute top-0 left-0 w-[3px] h-0 bg-[rgba(var(--mg-primary),0.6)]"
                  animate={{ height: 15 }}
                  transition={{ duration: 0.3, delay: 0.8 }}
                />
                <motion.div 
                  className="absolute top-0 left-0 h-[3px] w-0 bg-[rgba(var(--mg-primary),0.6)]"
                  animate={{ width: 15 }}
                  transition={{ duration: 0.3, delay: 0.8 }}
                />
              </motion.div>
              
              <motion.div 
                className="absolute bottom-0 right-0 w-[30px] h-[30px] pointer-events-none overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                <motion.div 
                  className="absolute bottom-0 right-0 w-[3px] h-0 bg-[rgba(var(--mg-primary),0.6)]"
                  animate={{ height: 15 }}
                  transition={{ duration: 0.3, delay: 0.8 }}
                />
                <motion.div 
                  className="absolute bottom-0 right-0 h-[3px] w-0 bg-[rgba(var(--mg-primary),0.6)]"
                  animate={{ width: 15 }}
                  transition={{ duration: 0.3, delay: 0.8 }}
                />
              </motion.div>
              
              {/* Modal header with enhanced title animation */}
              <div className="flex items-center justify-between border-b border-[rgba(var(--mg-primary),0.3)] p-4 relative">
                {/* Title with animated text glow */}
                <motion.h2 
                  className="mg-title text-xl font-quantify tracking-wider flex-1 text-center relative"
                  animate={{ 
                    textShadow: [
                      '0 0 5px #3f7eaa4d', 
                      '0 0 10px #3f7eaa80', 
                      '0 0 5px #3f7eaa4d'
                    ] 
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                >
                  {/* Glitch effect on title opening */}
                  <motion.span
                    animate={glitchEffect}
                    transition={{ 
                      duration: 0.2, 
                      delay: 0.5,
                      times: [0, 0.2, 0.4, 0.6, 0.8, 1],
                      repeat: 2,
                      repeatDelay: 4
                    }}
                  >
                    {title}
                  </motion.span>
                  
                  {/* Underline effect */}
                  <motion.div
                    className="absolute bottom-0 left-1/2 h-[1px] bg-[rgba(var(--mg-primary),0.6)]"
                    initial={{ width: 0, x: '-50%' }}
                    animate={{ width: '60%' }}
                    transition={{ duration: 0.6, delay: 0.8 }}
                  />
                </motion.h2>
                
                {/* Close button */}
                {showCloseButton && (
                  <motion.button
                    className="w-8 h-8 rounded-sm flex items-center justify-center border border-[rgba(var(--mg-primary),0.3)] bg-[rgba(var(--mg-panel-dark),0.7)] text-[rgba(var(--mg-primary),0.7)] relative overflow-hidden group"
                    onClick={onClose}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.7, type: "spring" }}
                    whileHover={{ scale: 1.1, borderColor: 'rgba(var(--mg-primary),0.6)' }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {/* Button background effects */}
                    <motion.div 
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-[rgba(var(--mg-primary),0.1)] to-transparent opacity-0 group-hover:opacity-100"
                      transition={{ duration: 0.3 }}
                    />
                    
                    {/* Button hover scan effect */}
                    <motion.div 
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 overflow-hidden"
                    >
                      <motion.div 
                        className="absolute h-[1px] w-full bg-gradient-to-r from-transparent via-[rgba(var(--mg-primary),0.8)] to-transparent"
                        initial={{ top: '-100%' }}
                        animate={{ top: '200%' }}
                        transition={{ duration: 1, repeat: Infinity }}
                      />
                    </motion.div>
                    
                    <svg className="w-5 h-5 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </motion.button>
                )}
              </div>
              
              {/* Scanning line effect */}
              <motion.div
                className="absolute left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[rgba(var(--mg-primary),0.8)] to-transparent pointer-events-none"
                style={{ top: `${scanPosition}%` }}
              />
              
              {/* Vertical scan lines */}
              <motion.div
                className="absolute top-0 h-full w-[1px] bg-gradient-to-b from-transparent via-[rgba(var(--mg-primary),0.4)] to-transparent left-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.7, 0] }}
                transition={{ duration: 3, repeat: Infinity, repeatType: "reverse" }}
              />
              <motion.div
                className="absolute top-0 h-full w-[1px] bg-gradient-to-b from-transparent via-[rgba(var(--mg-primary),0.4)] to-transparent right-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.7, 0] }}
                transition={{ duration: 3, repeat: Infinity, repeatType: "reverse", delay: 1.5 }}
              />
              
              {/* Edge highlights */}
              <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[rgba(var(--mg-primary),0.8)] to-transparent"></div>
              <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-[rgba(var(--mg-primary),0.8)] to-transparent"></div>
              
              {/* Modal content */}
              <div className="flex-1 overflow-auto p-6 relative max-h-[calc(85vh-120px)]">
                {/* Background patterns */}
                <div className="absolute inset-0 hexagon-bg opacity-5 pointer-events-none"></div>
                <div className="absolute inset-0 mg-grid-bg opacity-10 pointer-events-none"></div>
                
                {/* Content reveal animation */}
                <motion.div
                  className="relative z-10"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8, duration: 0.4 }}
                >
                  {children}
                </motion.div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default HoloModal; 
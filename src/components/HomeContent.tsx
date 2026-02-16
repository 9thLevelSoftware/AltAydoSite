"use client";

import { motion, AnimatePresence } from 'motion/react';
import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { cdn } from '@/lib/cdn';
import MobiGlasButton from '@/components/ui/mobiglas/MobiGlasButton';

interface HomeContentProps {
  isLoggedIn: boolean;
  userName?: string;
}

// Set a global function to control footer visibility that can be accessed by other components
function setFooterVisibility(visible: boolean) {
  if (typeof window !== 'undefined') {
    if (visible) {
      localStorage.removeItem('hideFooter');
    } else {
      localStorage.setItem('hideFooter', 'true');
    }
    // Dispatch a custom event that the footer component can listen for
    window.dispatchEvent(new Event('footerVisibilityChange'));
  }
}

// Function to check if login animation has been shown this session
function hasShownLoginAnimation(): boolean {
  if (typeof window !== 'undefined') {
    // Clear this flag when a user logs in from the login page
    // It will be reset to true after showing the animation
    return localStorage.getItem('loginAnimationShown') === 'true';
  }
  return false;
}

// Function to mark login animation as shown
function markLoginAnimationAsShown(): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('loginAnimationShown', 'true');
  }
}

function MobiGlasTerminal({ userName, onAnimationComplete }: { userName?: string, onAnimationComplete: () => void }) {
  const [step, setStep] = useState(0); // 0: scanning, 1: success, 2: welcome, 3: fade
  const [visible, setVisible] = useState(true);
  const [messageIdx, setMessageIdx] = useState(0);
  const [typed, setTyped] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const [animationCompleted, setAnimationCompleted] = useState(false);

  // Shorter, in-universe scan messages
  const scanMessages = useMemo(() => [
    'Quantum handshake established...',
    'Decrypting biometric hash...',
    'Secure commlink active.'
  ], []);

  // On component mount, ensure we're not marked as already shown
  useEffect(() => {
    console.log('MobiGlasTerminal mounted - animation starting');
  }, []);

  // Typewriter effect for messages
  useEffect(() => {
    if (step !== 0) return;
    if (messageIdx >= scanMessages.length) return;
    setTyped('');
    let i = 0;
    const msg = scanMessages[messageIdx];
    const typewriterInterval = setInterval(() => {
      setTyped(msg.slice(0, i + 1));
      i++;
      if (i >= msg.length) {
        clearInterval(typewriterInterval);
        setTimeout(() => setMessageIdx((idx) => idx + 1), 350);
      }
    }, 10 + Math.random() * 15);
    return () => clearInterval(typewriterInterval);
  }, [messageIdx, step, scanMessages]);

  // Animation sequence with safeguards
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (step === 0 && messageIdx >= scanMessages.length) {
      timeoutId = setTimeout(() => setStep(1), 350);
    }
    else if (step === 1) {
      timeoutId = setTimeout(() => setStep(2), 600);
    }
    else if (step === 2) {
      // Extended welcome message display by 2 seconds (was 700ms)
      timeoutId = setTimeout(() => setStep(3), 2700);
    }
    else if (step === 3 && !animationCompleted) {
      timeoutId = setTimeout(() => {
        setVisible(false);
        setAnimationCompleted(true);
        console.log('Animation complete - notifying parent');
        // Notify parent that animation is complete
        onAnimationComplete();
      }, 400);
    }

    // Cleanup function to clear any pending timeouts
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [messageIdx, step, onAnimationComplete, scanMessages.length, animationCompleted]);

  // Blinking cursor
  useEffect(() => {
    const cursorInterval = setInterval(() => setShowCursor((c) => !c), 400);
    return () => clearInterval(cursorInterval);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -30 }}
          transition={{ duration: 0.7 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
        >
          <div className="relative w-full max-w-xl mx-auto p-0 md:p-2">
            {/* Terminal shell */}
            <div className="relative bg-black/90 border-2 border-cyan-400/40 rounded-xl shadow-2xl overflow-hidden mobiglas-terminal-glow">
              {/* Grid and scanline overlays for extra polish */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 mg-grid-bg opacity-10"></div>
                <div className="absolute inset-0 circuit-bg opacity-10"></div>
                <div className="absolute top-0 w-full h-[2px] bg-cyan-400/30 animate-scanline"></div>
                <div className="absolute left-0 h-full w-[2px] bg-cyan-400/30 animate-scanline-vertical"></div>
                <div className="absolute inset-0 holo-noise opacity-10"></div>
                <div className="absolute inset-0 holo-scan opacity-10"></div>
              </div>
              {/* Glowing border corners */}
              <div className="absolute top-0 left-0 w-8 h-8">
                <div className="absolute top-0 left-0 w-full h-0.5 bg-cyan-400/80 shadow-[0_0_8px_cyan]" />
                <div className="absolute top-0 left-0 h-full w-0.5 bg-cyan-400/80 shadow-[0_0_8px_cyan]" />
              </div>
              <div className="absolute top-0 right-0 w-8 h-8">
                <div className="absolute top-0 right-0 w-full h-0.5 bg-cyan-400/80 shadow-[0_0_8px_cyan]" />
                <div className="absolute top-0 right-0 h-full w-0.5 bg-cyan-400/80 shadow-[0_0_8px_cyan]" />
              </div>
              <div className="absolute bottom-0 left-0 w-8 h-8">
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-cyan-400/80 shadow-[0_0_8px_cyan]" />
                <div className="absolute bottom-0 left-0 h-full w-0.5 bg-cyan-400/80 shadow-[0_0_8px_cyan]" />
              </div>
              <div className="absolute bottom-0 right-0 w-8 h-8">
                <div className="absolute bottom-0 right-0 w-full h-0.5 bg-cyan-400/80 shadow-[0_0_8px_cyan]" />
                <div className="absolute bottom-0 right-0 h-full w-0.5 bg-cyan-400/80 shadow-[0_0_8px_cyan]" />
              </div>
              {/* Terminal content */}
              <div className="relative z-10 p-8 md:p-12 flex flex-col items-center">
                {/* Animated spinner for scan phase */}
                {step === 0 && (
                  <motion.div
                    className="mb-6 flex items-center justify-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <motion.div
                      className="relative w-16 h-16"
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                    >
                      <div className="absolute inset-0 rounded-full border-4 border-cyan-400/40 border-t-cyan-300 border-b-cyan-500 shadow-[0_0_24px_4px_rgba(34,211,238,0.3)]" />
                      <div className="absolute inset-2 rounded-full border-2 border-cyan-300/30 border-t-cyan-400/60 border-b-cyan-200/40 blur-sm" />
                      <div className="absolute inset-4 rounded-full bg-cyan-400/30 blur-xl animate-pulse" />
                      <div className="absolute inset-5 rounded-full bg-cyan-300/40 blur-md" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-3 w-3 rounded-full bg-cyan-300 shadow-[0_0_8px_2px_cyan] animate-pulse" />
                      </div>
                    </motion.div>
                  </motion.div>
                )}
                {/* Terminal message area */}
                <div className="w-full max-w-md min-h-[48px] font-mono text-cyan-200 text-base md:text-lg bg-black/40 rounded p-4 border border-cyan-400/10 shadow-inner mb-4 flex flex-col justify-center">
                  {step === 0 && (
                    <span>
                      {typed}
                      {showCursor && <span className="text-cyan-400 animate-pulse">_</span>}
                    </span>
                  )}
                  {step === 1 && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5 }}
                      className="text-green-400 font-bold tracking-widest mobiglas-terminal-flicker"
                    >
                      BIOMETRIC VERIFICATION SUCCESSFUL
                    </motion.span>
                  )}
                  {step === 2 && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5 }}
                      className="text-cyan-300 font-bold text-xl mobiglas-terminal-flicker"
                    >
                      Welcome back, {userName || 'User'}!
                    </motion.span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function HomeContent({ isLoggedIn, userName }: HomeContentProps) {
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [systemStatus, setSystemStatus] = useState({
    integrity: 98.7,
    quantumLink: 100,
    security: isLoggedIn ? 100 : 50,
  });
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Animation for system scan effect
  const [scanning, setScanning] = useState(false);

  // Track if we should show the login animation
  const [showLoginAnimation, setShowLoginAnimation] = useState(false);
  // Track if UI should be hidden (during animation)
  const [hideUI, setHideUI] = useState(false);

  // Featured ship images
  // Images in the public directory that are confirmed to exist
// Some JPGs might be causing issues, so we'll include alternative formats or confirmed working images
const shipImages = [
    cdn('/sc.jpg'), // Working
    cdn('/hull_e.png'), // Alternative for sc_banner_crusader.jpg
    cdn('/791602-Ships-Fantastic-world-Star-Citizen.jpg'), // Alternative for Star-Citizen-4K-Wallpaper-3.jpg
    cdn('/AydoCorp_Fleet_poster.jpg'), // Alternative nice fleet image
    cdn('/sc_cargo.jpeg'), // Working
    cdn('/CargoCapacity_ProposedFinal-Min.jpg'),
    cdn('/Hovering_mining_on_cliffside_1.jpg'), // replacement for RSI_AYDO_Corp_image.png
    cdn('/Star_Citizen_Ships_510048_2560x1440.jpg') // replacement for spacebg.jpg
  ];
  
  // Fallback image in case one of the images fails to load
  const fallbackImage = cdn('/spacebg.png');

  // Simulate system scan
  const initiateSystemScan = useCallback(() => {
    if (scanning) return;

    setScanning(true);

    // Simulate scan progress
    const origIntegrity = systemStatus.integrity;
    const origQuant = systemStatus.quantumLink;
    const origSec = systemStatus.security;

    // Reset values temporarily
    setSystemStatus({
      integrity: 0,
      quantumLink: 0,
      security: 0
    });

    // Animate them back up with delays - extended for longer animation
    setTimeout(() => {
      // Start integrity rise
      setSystemStatus(prev => ({ ...prev, integrity: origIntegrity/3 }));

      setTimeout(() => {
        // Continue integrity rise
        setSystemStatus(prev => ({ ...prev, integrity: origIntegrity/2 }));

        setTimeout(() => {
          // Complete integrity rise and start quantum
          setSystemStatus(prev => ({ ...prev, integrity: origIntegrity, quantumLink: origQuant/3 }));

          setTimeout(() => {
            // Continue quantum rise
            setSystemStatus(prev => ({ ...prev, quantumLink: origQuant/2 }));

            setTimeout(() => {
              // Complete quantum rise and start security
              setSystemStatus(prev => ({ ...prev, quantumLink: origQuant, security: origSec/3 }));

              setTimeout(() => {
                // Continue security rise
                setSystemStatus(prev => ({ ...prev, security: origSec/2 }));

                setTimeout(() => {
                  // Complete security rise and finish animation
                  setSystemStatus({ integrity: origIntegrity, quantumLink: origQuant, security: origSec });
                  setScanning(false);
                }, 800);
              }, 800);
            }, 800);
          }, 800);
        }, 800);
      }, 800);
    }, 800);
  }, [scanning, systemStatus.integrity, systemStatus.quantumLink, systemStatus.security]);

  useEffect(() => {
    setMounted(true);

    // Check if we should show login animation - only if user is logged in
    // and has navigated from the login page (hasn't seen animation)
    const checkAndShowAnimation = () => {
      // Logic for determining if user is logged in and hasn't seen animation
      if (isLoggedIn && !hasShownLoginAnimation()) {
        console.log('Showing login animation');
        setShowLoginAnimation(true);
        setHideUI(true);
        // Don't mark as shown yet - will be marked after animation completes

        // Hide the footer during animation
        setFooterVisibility(false);
      } else {
        // If we're not showing the animation, make sure footer is visible
        setFooterVisibility(true);
      }
    };

    checkAndShowAnimation();

    // Auto-advance carousel
    const carouselTimer = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % shipImages.length);
    }, 5000);

    // Automatic system scan timer (every 20 seconds)
    const scanTimer = setInterval(() => {
      initiateSystemScan();
    }, 20000);

    return () => {
      clearInterval(carouselTimer);
      clearInterval(scanTimer);
    };
  }, [isLoggedIn, shipImages.length, initiateSystemScan]);

  // Function to handle animation complete
  const handleAnimationComplete = () => {
    setShowLoginAnimation(false);
    setHideUI(false);

    // Mark animation as shown only after it completes
    markLoginAnimationAsShown();

    // Show the footer after animation completes
    setFooterVisibility(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setMousePosition({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // Calculate parallax movement based on mouse position
  const calculateParallax = (depth: number = 1) => {
    if (!containerRef.current) return { x: 0, y: 0 };

    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const moveX = (mousePosition.x - centerX) / centerX * 10 * depth;
    const moveY = (mousePosition.y - centerY) / centerY * 6 * depth;

    return { x: moveX, y: moveY };
  };

  if (!mounted) return null;

  return (
    <>
      {/* Login animation that shows only on first successful login */}
      {showLoginAnimation && (
        <MobiGlasTerminal 
          userName={userName} 
          onAnimationComplete={handleAnimationComplete} 
        />
      )}

      {/* Main UI - hidden during login animation */}
      {!hideUI && (
        <div 
          ref={containerRef}
          className="relative min-h-[90vh] flex flex-col items-center justify-center py-8 overflow-hidden"
        >
          {/* Main holographic display */}
          <div className="relative z-20 container mx-auto px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1 }}
              className="max-w-6xl mx-auto"
            >
              <div className="mg-container relative overflow-hidden border-[rgba(var(--mg-primary),0.2)]">
                {/* Decorative elements */}
                <div className="absolute top-0 left-0 w-full h-full">
                  <div className="mg-grid-bg"></div>
                  <div className="holo-noise"></div>
                  <div className="holo-scan"></div>
                  <div className="line-noise"></div>
                  <div className="absolute inset-0 shadow-[inset_0_0_10px_rgba(var(--mg-primary),0.3)]"></div>
                  {/* Circuit pattern overlay */}
                  <div className="absolute inset-0 opacity-10 circuit-bg"></div>
                </div>

                {/* Enhanced corner brackets with glowing effect */}
                <div className="absolute top-0 left-0 w-12 h-12">
                  <div className="absolute top-0 left-0 w-full h-0.5 bg-[rgba(var(--mg-primary),0.8)] shadow-[0_0_8px_rgba(var(--mg-primary),0.7)]"></div>
                  <div className="absolute top-0 left-0 h-full w-0.5 bg-[rgba(var(--mg-primary),0.8)] shadow-[0_0_8px_rgba(var(--mg-primary),0.7)]"></div>
                  <div className="absolute top-2 left-2 w-3 h-3 border-l border-t border-[rgba(var(--mg-primary),0.8)]"></div>
                  <div className="absolute top-2 left-2 h-1.5 w-1.5 rounded-full border border-[rgba(var(--mg-primary),0.8)] animate-pulse"></div>
                  <div className="absolute top-6 left-0 w-6 h-0.5 bg-[rgba(var(--mg-primary),0.4)]"></div>
                  <div className="absolute top-0 left-6 w-0.5 h-6 bg-[rgba(var(--mg-primary),0.4)]"></div>
                </div>

                <div className="absolute top-0 right-0 w-12 h-12">
                  <div className="absolute top-0 right-0 w-full h-0.5 bg-[rgba(var(--mg-primary),0.8)] shadow-[0_0_8px_rgba(var(--mg-primary),0.7)]"></div>
                  <div className="absolute top-0 right-0 h-full w-0.5 bg-[rgba(var(--mg-primary),0.8)] shadow-[0_0_8px_rgba(var(--mg-primary),0.7)]"></div>
                  <div className="absolute top-2 right-2 w-3 h-3 border-r border-t border-[rgba(var(--mg-primary),0.8)]"></div>
                  <div className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full border border-[rgba(var(--mg-primary),0.8)] animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                  <div className="absolute top-6 right-0 w-6 h-0.5 bg-[rgba(var(--mg-primary),0.4)]"></div>
                  <div className="absolute top-0 right-6 w-0.5 h-6 bg-[rgba(var(--mg-primary),0.4)]"></div>
                </div>

                <div className="absolute bottom-0 left-0 w-12 h-12">
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[rgba(var(--mg-primary),0.8)] shadow-[0_0_8px_rgba(var(--mg-primary),0.7)]"></div>
                  <div className="absolute bottom-0 left-0 h-full w-0.5 bg-[rgba(var(--mg-primary),0.8)] shadow-[0_0_8px_rgba(var(--mg-primary),0.7)]"></div>
                  <div className="absolute bottom-2 left-2 w-3 h-3 border-l border-b border-[rgba(var(--mg-primary),0.8)]"></div>
                  <div className="absolute bottom-2 left-2 h-1.5 w-1.5 rounded-full border border-[rgba(var(--mg-primary),0.8)] animate-pulse" style={{ animationDelay: '1s' }}></div>
                  <div className="absolute bottom-6 left-0 w-6 h-0.5 bg-[rgba(var(--mg-primary),0.4)]"></div>
                  <div className="absolute bottom-0 left-6 w-0.5 h-6 bg-[rgba(var(--mg-primary),0.4)]"></div>
                </div>

                <div className="absolute bottom-0 right-0 w-12 h-12">
                  <div className="absolute bottom-0 right-0 w-full h-0.5 bg-[rgba(var(--mg-primary),0.8)] shadow-[0_0_8px_rgba(var(--mg-primary),0.7)]"></div>
                  <div className="absolute bottom-0 right-0 h-full w-0.5 bg-[rgba(var(--mg-primary),0.8)] shadow-[0_0_8px_rgba(var(--mg-primary),0.7)]"></div>
                  <div className="absolute bottom-2 right-2 w-3 h-3 border-r border-b border-[rgba(var(--mg-primary),0.8)]"></div>
                  <div className="absolute bottom-2 right-2 h-1.5 w-1.5 rounded-full border border-[rgba(var(--mg-primary),0.8)] animate-pulse" style={{ animationDelay: '1.5s' }}></div>
                  <div className="absolute bottom-6 right-0 w-6 h-0.5 bg-[rgba(var(--mg-primary),0.4)]"></div>
                  <div className="absolute bottom-0 right-6 w-0.5 h-6 bg-[rgba(var(--mg-primary),0.4)]"></div>
                </div>

                {/* Diagonal accent elements */}
                <div className="absolute top-0 left-[25%] w-[2px] h-6 bg-[rgba(var(--mg-primary),0.4)] skew-x-[45deg]"></div>
                <div className="absolute top-0 right-[25%] w-[2px] h-6 bg-[rgba(var(--mg-primary),0.4)] skew-x-[-45deg]"></div>
                <div className="absolute bottom-0 left-[25%] w-[2px] h-6 bg-[rgba(var(--mg-primary),0.4)] skew-x-[-45deg]"></div>
                <div className="absolute bottom-0 right-[25%] w-[2px] h-6 bg-[rgba(var(--mg-primary),0.4)] skew-x-[45deg]"></div>

                {/* Left and right edge accents */}
                <div className="absolute left-0 top-1/3 w-3 h-[2px] bg-[rgba(var(--mg-primary),0.6)]"></div>
                <div className="absolute left-0 top-2/3 w-3 h-[2px] bg-[rgba(var(--mg-primary),0.6)]"></div>
                <div className="absolute right-0 top-1/3 w-3 h-[2px] bg-[rgba(var(--mg-primary),0.6)]"></div>
                <div className="absolute right-0 top-2/3 w-3 h-[2px] bg-[rgba(var(--mg-primary),0.6)]"></div>

                {/* Animated scanning lines */}
                <div className="absolute left-0 top-0 w-full h-[1px] bg-[rgba(var(--mg-primary),0.4)] animate-scanline"></div>
                <div className="absolute left-0 top-0 h-full w-[1px] bg-[rgba(var(--mg-primary),0.4)] animate-scanline-vertical"></div>

                {/* Random tech elements */}
                <div className="absolute top-1/4 left-0 w-1 h-1 rounded-full bg-[rgba(var(--mg-primary),0.8)] animate-pulse"></div>
                <div className="absolute top-3/4 left-0 w-1 h-1 rounded-full bg-[rgba(var(--mg-primary),0.8)] animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                <div className="absolute top-1/4 right-0 w-1 h-1 rounded-full bg-[rgba(var(--mg-primary),0.8)] animate-pulse" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-3/4 right-0 w-1 h-1 rounded-full bg-[rgba(var(--mg-primary),0.8)] animate-pulse" style={{ animationDelay: '1.5s' }}></div>

                {/* Content */}
                <div className="relative z-10 p-4">
                  {/* Always render the main landing page content below */}
                  <div className="py-8">
                    {/* Top header section */}
                    <motion.div
                      initial={{ y: -20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.8 }}
                      style={{ 
                        x: calculateParallax(0.3).x,
                        y: calculateParallax(0.3).y 
                      }}
                      className="text-center mb-8"
                    >
                      <div className="inline-block">
                        <h1 className="mg-title text-4xl md:text-5xl mb-2 tracking-wider">
                          <span className="text-[rgba(var(--mg-primary),1)]">AYDO</span><span className="text-[rgba(var(--mg-text),0.9)]">CORP</span>
                        </h1>
                        <div className="mg-subtitle text-base md:text-lg opacity-90 tracking-widest">
                          <span className="mg-flicker">MOBIGLAS INTERFACE</span>
                          <span className="ml-2 opacity-60 text-xs">[v3.9.4]</span>
                        </div>
                      </div>
                    </motion.div>

                    {/* Main interface */}
                    <div className="grid grid-cols-12 gap-4">
                      {/* Left system panel */}
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="col-span-12 md:col-span-3"
                      >
                        <div className="mg-container p-2 h-full relative">
                          <div className="absolute inset-0 overflow-hidden pointer-events-none">
                            <div className="radar-sweep opacity-5"></div>
                            {/* Circuit pattern background */}
                            <div className="absolute inset-0 opacity-5 circuit-bg bg-[length:50px_50px]"></div>
                          </div>

                          {/* Symmetrical Corner Elements for Left Panel */}
                          {/* Top Left */}
                          <div className="absolute top-0 left-0 w-5 h-5">
                            <div className="absolute top-0 left-0 w-full h-[1.5px] bg-[rgba(var(--mg-primary),0.8)]"></div>
                            <div className="absolute top-0 left-0 h-full w-[1.5px] bg-[rgba(var(--mg-primary),0.8)]"></div>
                            <div className="absolute top-2 left-2 w-1.5 h-1.5 rounded-full border border-[rgba(var(--mg-primary),0.8)] animate-pulse"></div>
                          </div>

                          {/* Top Right */}
                          <div className="absolute top-0 right-0 w-5 h-5">
                            <div className="absolute top-0 right-0 w-full h-[1.5px] bg-[rgba(var(--mg-primary),0.8)]"></div>
                            <div className="absolute top-0 right-0 h-full w-[1.5px] bg-[rgba(var(--mg-primary),0.8)]"></div>
                            <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full border border-[rgba(var(--mg-primary),0.8)] animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                          </div>

                          {/* Bottom Left */}
                          <div className="absolute bottom-0 left-0 w-5 h-5">
                            <div className="absolute bottom-0 left-0 w-full h-[1.5px] bg-[rgba(var(--mg-primary),0.8)]"></div>
                            <div className="absolute bottom-0 left-0 h-full w-[1.5px] bg-[rgba(var(--mg-primary),0.8)]"></div>
                            <div className="absolute bottom-2 left-2 w-1.5 h-1.5 rounded-full border border-[rgba(var(--mg-primary),0.8)] animate-pulse" style={{ animationDelay: '1s' }}></div>
                          </div>

                          {/* Bottom Right */}
                          <div className="absolute bottom-0 right-0 w-5 h-5">
                            <div className="absolute bottom-0 right-0 w-full h-[1.5px] bg-[rgba(var(--mg-primary),0.8)]"></div>
                            <div className="absolute bottom-0 right-0 h-full w-[1.5px] bg-[rgba(var(--mg-primary),0.8)]"></div>
                            <div className="absolute bottom-2 right-2 w-1.5 h-1.5 rounded-full border border-[rgba(var(--mg-primary),0.8)] animate-pulse" style={{ animationDelay: '1.5s' }}></div>
                          </div>

                          <div className="mg-header text-xs text-center">
                            <div className="mg-subtitle">SYSTEM STATUS</div>
                          </div>

                          <div className="p-3 space-y-4">
                            <MobiGlasButton
                              variant={scanning ? 'accent' : 'primary'}
                              size="sm"
                              fullWidth
                              className="text-xs cursor-default"
                              disabled={scanning}
                              leftIcon={
                                <div className={`w-2 h-2 ${scanning ? 'bg-[rgba(var(--mg-warning),1)] animate-pulse' : 'bg-[rgba(var(--mg-primary),0.8)]'} rounded-full`}></div>
                              }
                            >
                              {scanning ? 'RECALIBRATING...' : 'SIGNAL SECURE'}
                            </MobiGlasButton>

                            <div className="space-y-2">
                              <div className="flex justify-between text-xs">
                                <span className="text-[rgba(var(--mg-text),0.7)]">INTEGRITY</span>
                                <span className="text-[rgba(var(--mg-primary),1)]">{systemStatus.integrity.toFixed(1)}%</span>
                              </div>
                              <motion.div 
                                className="w-full bg-[rgba(var(--mg-primary),0.1)] h-1"
                                initial={{ width: 0 }}
                                animate={{ width: '100%' }}
                                transition={{ duration: 0.3 }}
                              >
                                <motion.div 
                                  className="bg-[rgba(var(--mg-primary),0.8)] h-1" 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${systemStatus.integrity}%` }}
                                  transition={{ duration: 0.5 }}
                                ></motion.div>
                              </motion.div>

                              <div className="flex justify-between text-xs mt-3">
                                <span className="text-[rgba(var(--mg-text),0.7)]">QUANTUM LINK</span>
                                <span className="text-[rgba(var(--mg-success),1)]">{systemStatus.quantumLink}%</span>
                              </div>
                              <motion.div 
                                className="w-full bg-[rgba(var(--mg-primary),0.1)] h-1"
                                initial={{ width: 0 }}
                                animate={{ width: '100%' }}
                                transition={{ duration: 0.3, delay: 0.1 }}
                              >
                                <motion.div 
                                  className="bg-[rgba(var(--mg-success),0.8)] h-1" 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${systemStatus.quantumLink}%` }}
                                  transition={{ duration: 0.5, delay: 0.1 }}
                                ></motion.div>
                              </motion.div>

                              <div className="flex justify-between text-xs mt-3">
                                <span className="text-[rgba(var(--mg-text),0.7)]">SECURITY</span>
                                <span className="text-[rgba(var(--mg-warning),1)]">
                                  {systemStatus.security < 100 ? 'AUTH REQ' : 'SECURE'}
                                </span>
                              </div>
                              <motion.div 
                                className="w-full bg-[rgba(var(--mg-primary),0.1)] h-1"
                                initial={{ width: 0 }}
                                animate={{ width: '100%' }}
                                transition={{ duration: 0.3, delay: 0.2 }}
                              >
                                <motion.div 
                                  className="bg-[rgba(var(--mg-warning),0.8)] h-1" 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${systemStatus.security}%` }}
                                  transition={{ duration: 0.5, delay: 0.2 }}
                                ></motion.div>
                              </motion.div>

                              <div className="text-[rgba(var(--mg-text),0.4)] text-[10px] mt-4 mg-flicker">
                                SYS ID: {Math.random().toString(36).substring(2, 10).toUpperCase()}
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>

                      {/* Central terminal */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.5 }}
                        style={{ 
                          x: calculateParallax(0.2).x,
                          y: calculateParallax(0.2).y 
                        }}
                        className="col-span-12 md:col-span-6 relative"
                      >
                        <div className="mg-container h-full">
                          <div className="absolute inset-0 pointer-events-none overflow-hidden">
                            <div className="hexagon-bg opacity-5"></div>
                            {/* Digital circuit pattern */}
                            <div className="absolute inset-0 opacity-10 circuit-bg"></div>
                          </div>

                          {/* Symmetrical Corner Elements */}
                          {/* Top Left */}
                          <div className="absolute top-0 left-0 w-8 h-8">
                            <div className="absolute top-0 left-0 w-5 h-[2px] bg-[rgba(var(--mg-primary),0.8)] shadow-[0_0_8px_rgba(var(--mg-primary),0.7)]"></div>
                            <div className="absolute top-0 left-0 h-5 w-[2px] bg-[rgba(var(--mg-primary),0.8)] shadow-[0_0_8px_rgba(var(--mg-primary),0.7)]"></div>
                            <div className="absolute top-2 left-2 w-2 h-2 rounded-full border border-[rgba(var(--mg-primary),0.8)] animate-pulse"></div>
                          </div>

                          {/* Top Right */}
                          <div className="absolute top-0 right-0 w-8 h-8">
                            <div className="absolute top-0 right-0 w-5 h-[2px] bg-[rgba(var(--mg-primary),0.8)] shadow-[0_0_8px_rgba(var(--mg-primary),0.7)]"></div>
                            <div className="absolute top-0 right-0 h-5 w-[2px] bg-[rgba(var(--mg-primary),0.8)] shadow-[0_0_8px_rgba(var(--mg-primary),0.7)]"></div>
                            <div className="absolute top-2 right-2 w-2 h-2 rounded-full border border-[rgba(var(--mg-primary),0.8)] animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                          </div>

                          {/* Bottom Left */}
                          <div className="absolute bottom-0 left-0 w-8 h-8">
                            <div className="absolute bottom-0 left-0 w-5 h-[2px] bg-[rgba(var(--mg-primary),0.8)] shadow-[0_0_8px_rgba(var(--mg-primary),0.7)]"></div>
                            <div className="absolute bottom-0 left-0 h-5 w-[2px] bg-[rgba(var(--mg-primary),0.8)] shadow-[0_0_8px_rgba(var(--mg-primary),0.7)]"></div>
                            <div className="absolute bottom-2 left-2 w-2 h-2 rounded-full border border-[rgba(var(--mg-primary),0.8)] animate-pulse" style={{ animationDelay: '1s' }}></div>
                          </div>

                          {/* Bottom Right */}
                          <div className="absolute bottom-0 right-0 w-8 h-8">
                            <div className="absolute bottom-0 right-0 w-5 h-[2px] bg-[rgba(var(--mg-primary),0.8)] shadow-[0_0_8px_rgba(var(--mg-primary),0.7)]"></div>
                            <div className="absolute bottom-0 right-0 h-5 w-[2px] bg-[rgba(var(--mg-primary),0.8)] shadow-[0_0_8px_rgba(var(--mg-primary),0.7)]"></div>
                            <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full border border-[rgba(var(--mg-primary),0.8)] animate-pulse" style={{ animationDelay: '1.5s' }}></div>
                          </div>

                          {/* Diagonal accent lines */}
                          <div className="absolute top-0 left-[30%] w-[20%] h-[2px] bg-[rgba(var(--mg-primary),0.4)] origin-left rotate-[20deg]"></div>
                          <div className="absolute top-0 right-[30%] w-[20%] h-[2px] bg-[rgba(var(--mg-primary),0.4)] origin-right rotate-[-20deg]"></div>
                          <div className="absolute bottom-0 left-[30%] w-[20%] h-[2px] bg-[rgba(var(--mg-primary),0.4)] origin-left rotate-[-20deg]"></div>
                          <div className="absolute bottom-0 right-[30%] w-[20%] h-[2px] bg-[rgba(var(--mg-primary),0.4)] origin-right rotate-[20deg]"></div>

                          {/* Animated scanning line */}
                          <div className="absolute left-0 top-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[rgba(var(--mg-primary),0.8)] to-transparent animate-scan"></div>

                          <div className="p-6 flex flex-col items-center justify-center">
                            <motion.div 
                              className="w-24 h-24 md:w-32 md:h-32 relative mb-6"
                              animate={{ 
                                boxShadow: ['0 0 10px rgba(var(--mg-primary), 0.3)', '0 0 20px rgba(var(--mg-primary), 0.5)', '0 0 10px rgba(var(--mg-primary), 0.3)']
                              }}
                              transition={{ 
                                duration: 3, 
                                repeat: Infinity,
                                ease: "easeInOut" 
                              }}
                            >
                              <div className="absolute inset-0 border-2 border-[rgba(var(--mg-primary),0.3)] flex items-center justify-center overflow-hidden rounded-full">
                                <div className="radar-sweep"></div>
                                <div className="absolute inset-0 flex items-center justify-center flex-col">
                                  <div className="h-38 w-38 md:h-46 md:w-46 relative">
                                    <Image 
                                      src={cdn('/Aydo_Corp_3x3k_RSI.png')} 
                                      alt="AydoCorp Logo" 
                                      width={184}
                                      height={184}
                                      className="object-contain w-full h-full"
                                    />
                                  </div>
                                </div>
                              </div>
                            </motion.div>

                            <motion.div 
                              className="w-full relative mb-6 overflow-hidden rounded-lg"
                              style={{ height: '220px' }}
                            >
                              {/* Ship image carousel */}
                              <AnimatePresence mode="wait">
                                <motion.div
                                  key={currentImageIndex}
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  transition={{ duration: 1 }}
                                  className="absolute inset-0 flex items-center justify-center"
                                >
                                  <div className="relative w-full h-full">
                                    <Image 
                                      src={shipImages[currentImageIndex]} 
                                      alt="AydoCorp Fleet" 
                                      width={800}
                                      height={220}
                                      className="object-cover w-full h-full"
                                      unoptimized={true}
                                      priority={true}
                                      loading="eager" 
                                      onError={(e) => {
                                        // If image fails to load, fall back to a default image
                                        console.error(`Failed to load image: ${shipImages[currentImageIndex]}`);
                                        const target = e.target as HTMLImageElement;
                                        target.src = fallbackImage; // Use defined fallback image
                                      }}
                                    />
                                    <div className="absolute inset-0 border border-[rgba(var(--mg-primary),0.4)]"></div>
                                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-black bg-opacity-50">
                                      <p className="text-[rgba(var(--mg-primary),1)] text-xs text-center">
                                        AydoCorp: The New Horizon of Commercial Logistics
                                      </p>
                                    </div>
                                  </div>
                                </motion.div>
                              </AnimatePresence>

                              {/* Carousel controls */}
                              <div className="absolute bottom-8 left-0 right-0 flex justify-center space-x-2">
                                {shipImages.map((_, index) => (
                                  <button
                                    key={index}
                                    onClick={() => setCurrentImageIndex(index)}
                                    className={`w-2 h-2 rounded-full ${
                                      currentImageIndex === index
                                        ? 'bg-[rgba(var(--mg-primary),1)]'
                                        : 'bg-[rgba(var(--mg-primary),0.4)]'
                                    }`}
                                  />
                                ))}
                              </div>

                              {/* Holographic overlay effect */}
                              <div className="absolute inset-0 pointer-events-none">
                                <div className="absolute inset-0 holo-noise opacity-30"></div>
                                <div className="absolute inset-0 holo-scan opacity-20"></div>
                              </div>
                            </motion.div>

                            {isLoggedIn ? (
                              <></>
                            ) : (
                              <>
                                <div className="mg-text text-sm mb-6 text-center max-w-md">
                                  <div className="mg-subtitle mb-2">BIOMETRIC VERIFICATION REQUIRED</div>
                                  <p className="text-xs leading-relaxed text-[rgba(var(--mg-text),0.7)]">
                                    MobiGlas interface requires secure authentication. All activities are logged and monitored.
                                  </p>
                                </div>
                                <div className="w-full max-w-xs space-y-3">
                                  <Link href="/login" className="block w-full">
                                    <MobiGlasButton
                                      variant="primary"
                                      size="md"
                                      fullWidth
                                    >
                                      ACCESS TERMINAL
                                    </MobiGlasButton>
                                  </Link>
                                  <Link href="/signup" className="block w-full">
                                    <MobiGlasButton
                                      variant="accent"
                                      size="md"
                                      fullWidth
                                    >
                                      REGISTER NEW DEVICE
                                    </MobiGlasButton>
                                  </Link>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </motion.div>

                      {/* Right system menu */}
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                        className="col-span-12 md:col-span-3"
                      >
                        <div className="mg-container h-full">
                          {/* Symmetrical Corner Elements for Right Panel */}
                          {/* Top Left */}
                          <div className="absolute top-0 left-0 w-5 h-5">
                            <div className="absolute top-0 left-0 w-full h-[1.5px] bg-[rgba(var(--mg-primary),0.8)]"></div>
                            <div className="absolute top-0 left-0 h-full w-[1.5px] bg-[rgba(var(--mg-primary),0.8)]"></div>
                            <div className="absolute top-2 left-2 w-1.5 h-1.5 rounded-full border border-[rgba(var(--mg-primary),0.8)] animate-pulse"></div>
                          </div>

                          {/* Top Right */}
                          <div className="absolute top-0 right-0 w-5 h-5">
                            <div className="absolute top-0 right-0 w-full h-[1.5px] bg-[rgba(var(--mg-primary),0.8)]"></div>
                            <div className="absolute top-0 right-0 h-full w-[1.5px] bg-[rgba(var(--mg-primary),0.8)]"></div>
                            <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full border border-[rgba(var(--mg-primary),0.8)] animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                          </div>

                          {/* Bottom Left */}
                          <div className="absolute bottom-0 left-0 w-5 h-5">
                            <div className="absolute bottom-0 left-0 w-full h-[1.5px] bg-[rgba(var(--mg-primary),0.8)]"></div>
                            <div className="absolute bottom-0 left-0 h-full w-[1.5px] bg-[rgba(var(--mg-primary),0.8)]"></div>
                            <div className="absolute bottom-2 left-2 w-1.5 h-1.5 rounded-full border border-[rgba(var(--mg-primary),0.8)] animate-pulse" style={{ animationDelay: '1s' }}></div>
                          </div>

                          {/* Bottom Right */}
                          <div className="absolute bottom-0 right-0 w-5 h-5">
                            <div className="absolute bottom-0 right-0 w-full h-[1.5px] bg-[rgba(var(--mg-primary),0.8)]"></div>
                            <div className="absolute bottom-0 right-0 h-full w-[1.5px] bg-[rgba(var(--mg-primary),0.8)]"></div>
                            <div className="absolute bottom-2 right-2 w-1.5 h-1.5 rounded-full border border-[rgba(var(--mg-primary),0.8)] animate-pulse" style={{ animationDelay: '1.5s' }}></div>
                          </div>

                          {/* Additional edge markers */}
                          <div className="absolute top-1/3 right-0 w-2 h-2 border-r border-t border-[rgba(var(--mg-primary),0.6)]"></div>
                          <div className="absolute top-2/3 right-0 w-2 h-2 border-r border-b border-[rgba(var(--mg-primary),0.6)]"></div>
                          <div className="absolute top-1/3 left-0 w-2 h-2 border-l border-t border-[rgba(var(--mg-primary),0.6)]"></div>
                          <div className="absolute top-2/3 left-0 w-2 h-2 border-l border-b border-[rgba(var(--mg-primary),0.6)]"></div>

                          <div className="mg-header text-xs text-center">
                            <div className="mg-subtitle">NAVIGATION</div>
                          </div>

                          <div className="p-3">
                            <ul className="space-y-2">
                              {[
                                { title: 'SERVICES', path: '/services', icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z' },
                                { title: 'ABOUT US', path: '/about', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
                                { title: 'JOIN US', path: '/join', icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z' },
                                { title: 'CONTACT', path: '/contact', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' }
                              ].map((item, idx) => (
                                <li key={idx}>
                                  <Link
                                    href={item.path}
                                    className="block w-full"
                                    onMouseEnter={() => setActivePanel(item.title)}
                                    onMouseLeave={() => setActivePanel(null)}
                                  >
                                    <MobiGlasButton
                                      variant="ghost"
                                      size="sm"
                                      fullWidth
                                      className="text-xs justify-start"
                                      leftIcon={
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-[rgba(var(--mg-primary),0.8)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d={item.icon} />
                                        </svg>
                                      }
                                    >
                                      <span className="relative">
                                        {item.title}
                                        <AnimatePresence>
                                          {activePanel === item.title && (
                                            <motion.span
                                              className="absolute -bottom-1 left-0 h-px bg-[rgba(var(--mg-primary),0.8)]"
                                              initial={{ width: '0%' }}
                                              animate={{ width: '100%' }}
                                              exit={{ width: '0%' }}
                                              transition={{ duration: 0.2 }}
                                            ></motion.span>
                                          )}
                                        </AnimatePresence>
                                      </span>
                                    </MobiGlasButton>
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </>
  );
} 

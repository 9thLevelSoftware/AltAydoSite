'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { cdn } from '@/lib/cdn';
import { motion, AnimatePresence, useAnimation } from 'motion/react';

const images = [
  {
    src: cdn('/RSI_AYDO_Corp_image.png'),
    alt: 'AydoCorp Official Fleet',
    caption: 'AydoCorp Fleet Formation - Annual Corporate Showcase'
  },
  {
    src: cdn('/hull_e.png'),
    alt: 'AydoExpress Logistics',
    caption: 'Hull-E Cargo Transport - Backbone of AydoExpress Operations'
  },
  {
    src: cdn('/Hovering_mining_on_cliffside_1.jpg'),
    alt: 'Empyrion Industries Mining',
    caption: 'Empyrion Industries Prospector Mining Operations on Microtech'
  },
  {
    src: cdn('/salvage_Near_world_lookings_at_wreckage.jpg'),
    alt: 'Salvage Operations',
    caption: 'Reclaimer Salvage Operation - Resource Recovery Division'
  },
  {
    src: cdn('/logisticsoffice.jpg'),
    alt: 'AydoCorp Logistics Office',
    caption: 'Corporate Headquarters - Logistics Command Center'
  },
  {
    src: cdn('/Star_Citizen_Ships_510048_2560x1440.jpg'),
    alt: 'Corporate Fleet Display',
    caption: 'AydoCorp Fleet Showcase - Annual Corporate Event'
  },
  {
    src: cdn('/Asteroids_122018-Min.png'),
    alt: 'Freelancer Operations',
    caption: 'MISC Freelancer on Assignment - Asteroid Field Navigation'
  },
  {
    src: cdn('/CargoCapacity_ProposedFinal-Min.jpg'),
    alt: 'Constellation Taurus',
    caption: 'Constellation Taurus - Medium Cargo Transport Operations'
  }
];

// Corner accent to create angular corners
const CornerAccent = ({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) => {
  const classes = {
    'tl': 'top-0 left-0 border-t border-l',
    'tr': 'top-0 right-0 border-t border-r',
    'bl': 'bottom-0 left-0 border-b border-l',
    'br': 'bottom-0 right-0 border-b border-r',
  };
  return <div className={`absolute w-5 h-5 ${classes[position]} border-[rgba(var(--mg-primary),0.6)]`}></div>;
};

// Holographic grid overlay effect
const HolographicOverlay = () => {
  return (
    <div className="absolute inset-0 pointer-events-none z-20 opacity-10">
      <div className="absolute inset-0 bg-holo-grid bg-[length:20px_20px]"></div>
      <div className="absolute inset-0 hex-grid opacity-20"></div>
      
      {/* Scan line animation */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-full h-1 bg-[rgba(var(--mg-primary),0.7)] animate-scanline"></div>
      </div>
    </div>
  );
};

const EventCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1); // 1 for right, -1 for left
  const [isTransitioning, setIsTransitioning] = useState(false);
  const autoplayRef = useRef<NodeJS.Timeout | null>(null);
  const containerControls = useAnimation();
  
  // Effect for automatic slideshow
  useEffect(() => {
    const startAutoplay = () => {
      autoplayRef.current = setInterval(() => {
        setDirection(1);
        setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
      }, 6000);
    };
    
    startAutoplay();
    
    // Clean up interval on unmount
    return () => {
      if (autoplayRef.current) {
        clearInterval(autoplayRef.current);
      }
    };
  }, []);
  
  // Reset autoplay timer when manually changing slides - memoized
  const resetAutoplay = useCallback(() => {
    if (autoplayRef.current) {
      clearInterval(autoplayRef.current);
      autoplayRef.current = setInterval(() => {
        setDirection(1);
        setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
      }, 6000);
    }
  }, []);

  // Flash effect helper - memoized
  const triggerFlashEffect = useCallback(() => {
    containerControls.start({
      boxShadow: ['0 0 0px rgba(var(--mg-primary), 0)', '0 0 15px rgba(var(--mg-primary), 0.3)', '0 0 0px rgba(var(--mg-primary), 0)'],
      transition: { duration: 0.5 }
    });
  }, [containerControls]);

  const nextSlide = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setDirection(1);
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    resetAutoplay();
    triggerFlashEffect();

    // Reset transitioning state after animation completes
    setTimeout(() => setIsTransitioning(false), 500);
  }, [isTransitioning, resetAutoplay, triggerFlashEffect]);

  const prevSlide = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setDirection(-1);
    setCurrentIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length);
    resetAutoplay();
    triggerFlashEffect();

    // Reset transitioning state after animation completes
    setTimeout(() => setIsTransitioning(false), 500);
  }, [isTransitioning, resetAutoplay, triggerFlashEffect]);

  const goToSlide = useCallback((index: number) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
    resetAutoplay();

    // Reset transitioning state after animation completes
    setTimeout(() => setIsTransitioning(false), 500);
  }, [isTransitioning, currentIndex, resetAutoplay]);

  // Variants for the slide animations - memoized
  const slideVariants = useMemo(() => ({
    enter: (direction: number) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0,
      scale: 0.95
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: {
        x: { type: 'spring', stiffness: 300, damping: 30 },
        opacity: { duration: 0.3 },
        scale: { duration: 0.4 }
      }
    },
    exit: (direction: number) => ({
      x: direction > 0 ? '-100%' : '100%',
      opacity: 0,
      scale: 0.95,
      transition: {
        x: { type: 'spring', stiffness: 300, damping: 30 },
        opacity: { duration: 0.3 },
        scale: { duration: 0.4 }
      }
    })
  }), []);

  return (
    <motion.div 
      className="relative rounded-sm overflow-hidden bg-[rgba(var(--mg-panel-dark),0.7)] backdrop-blur-md"
      animate={containerControls}
    >
      {/* Angular corners and borders */}
      <div className="absolute inset-0 border border-[rgba(var(--mg-primary),0.4)] rounded-sm pointer-events-none z-30">
        <CornerAccent position="tl" />
        <CornerAccent position="tr" />
        <CornerAccent position="bl" />
        <CornerAccent position="br" />
      </div>
      
      {/* Top border glow */}
      <div className="absolute top-0 left-10 right-10 h-px bg-gradient-to-r from-transparent via-[rgba(var(--mg-primary),0.8)] to-transparent z-30"></div>
      
      {/* Bottom border glow */}
      <div className="absolute bottom-0 left-20 right-20 h-px bg-gradient-to-r from-transparent via-[rgba(var(--mg-primary),0.4)] to-transparent z-30"></div>
      
      {/* Header with title and controls */}
      <div className="relative p-4 flex items-center justify-between z-20 border-b border-[rgba(var(--mg-primary),0.2)]">
        <div className="flex items-center">
          <div className="h-6 w-6 relative mr-2">
            <div className="absolute inset-0 rounded-full border border-[rgba(var(--mg-primary),0.4)]"></div>
            <Image 
              src={cdn('/Aydo_Corp_logo_Silver.png')} 
              alt="AydoCorp Logo" 
              fill 
              className="object-contain p-0.5"
            />
          </div>
          <h2 className="mg-title text-sm font-quantify tracking-wider text-[rgba(var(--mg-primary),0.9)]">CORPORATE OPERATIONS</h2>
        </div>
        
        {/* Preview dots on header */}
        <div className="hidden md:flex items-center gap-1">
          {images.map((_, index) => (
            <button
              key={index}
              className={`h-1.5 w-1.5 rounded-full transition-all ${
                index === currentIndex 
                  ? 'bg-[rgba(var(--mg-primary),0.9)]' 
                  : 'bg-[rgba(var(--mg-primary),0.3)]'
              }`}
              onClick={() => goToSlide(index)}
            />
          ))}
        </div>
        
        {/* Data readout */}
        <div className="hidden lg:block text-xs text-[rgba(var(--mg-text),0.6)]">
          <span className="font-mono">FEED {String(currentIndex + 1).padStart(2, '0')}/{String(images.length).padStart(2, '0')}</span>
        </div>
      </div>
      
      {/* Main carousel container */}
      <div className="relative h-[350px] w-full overflow-hidden">
        <AnimatePresence initial={false} custom={direction} mode="sync">
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="absolute inset-0"
          >
            <div className="relative h-full w-full">
              {/* Image */}
              <Image
                src={images[currentIndex].src}
                alt={images[currentIndex].alt}
                fill
                className="object-cover"
                priority={currentIndex === 0}
                unoptimized={true}
                onError={(e) => {
                  // If image fails to load, fall back to a default image
                  const target = e.target as HTMLImageElement;
                  target.src = cdn('/spacebg.jpg');
                }}
              />
              
              {/* Information overlay at bottom */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[rgba(var(--mg-panel-dark),0.9)] to-transparent p-4">
                <div className="relative">
                  {/* Small decorative element */}
                  <div className="absolute -left-2 top-0 bottom-0 w-1 bg-[rgba(var(--mg-primary),0.4)]"></div>
                  
                  <h3 className="font-quantify text-lg tracking-wide text-[rgba(var(--mg-primary),0.9)] mb-1">{images[currentIndex].alt}</h3>
                  <p className="text-sm text-[rgba(var(--mg-text),0.8)]">{images[currentIndex].caption}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
        
        {/* Holographic overlay effects */}
        <HolographicOverlay />
      </div>
      
      {/* Navigation Controls */}
      <div className="absolute top-1/2 left-0 right-0 transform -translate-y-1/2 flex justify-between px-4 z-40">
        {/* Previous button */}
        <motion.button 
          className="h-12 w-12 flex items-center justify-center relative"
          onClick={prevSlide}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <div className="absolute inset-0 bg-[rgba(var(--mg-panel-dark),0.6)] backdrop-blur-sm border border-[rgba(var(--mg-primary),0.3)] rounded-sm"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-5 h-5 relative">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-5 w-5 text-[rgba(var(--mg-primary),0.9)]" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
              </svg>
            </div>
          </div>
          <CornerAccent position="tl" />
          <CornerAccent position="br" />
        </motion.button>
        
        {/* Next button */}
        <motion.button 
          className="h-12 w-12 flex items-center justify-center relative"
          onClick={nextSlide}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <div className="absolute inset-0 bg-[rgba(var(--mg-panel-dark),0.6)] backdrop-blur-sm border border-[rgba(var(--mg-primary),0.3)] rounded-sm"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-5 h-5 relative">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-5 w-5 text-[rgba(var(--mg-primary),0.9)]" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
          <CornerAccent position="tl" />
          <CornerAccent position="br" />
        </motion.button>
      </div>
      
      {/* Bottom Indicators */}
      <div className="absolute bottom-[72px] left-0 right-0 flex justify-center gap-2 z-40">
        <div className="bg-[rgba(var(--mg-panel-dark),0.6)] backdrop-blur-sm border border-[rgba(var(--mg-primary),0.3)] rounded-sm px-3 py-1 flex gap-2">
          {images.map((_, index) => (
            <motion.button
              key={index}
              className={`relative h-1.5 rounded-full transition-all ${
                index === currentIndex ? 'w-8 bg-[rgba(var(--mg-primary),0.9)]' : 'w-3 bg-[rgba(var(--mg-text),0.3)]'
              }`}
              onClick={() => goToSlide(index)}
              whileHover={index !== currentIndex ? { 
                width: 6, 
                backgroundColor: 'rgba(var(--mg-primary), 0.5)' 
              } : {}}
            >
              {index === currentIndex && (
                <motion.div 
                  className="absolute inset-0 rounded-full bg-[rgba(var(--mg-primary),0.3)]"
                  animate={{ scale: [1, 1.5, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default EventCarousel; 
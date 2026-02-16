'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, Variants } from 'motion/react';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';
import MobileSidebar from '@/components/dashboard/MobileSidebar';
import EventCarousel from '@/components/dashboard/EventCarousel';
import UpcomingEventsPanel from '@/components/dashboard/panels/UpcomingEventsPanel';
import DashboardFooter from '@/components/dashboard/DashboardFooter';
import LoadingScreen from '@/components/dashboard/LoadingScreen';
import AuthError from '@/components/dashboard/AuthError';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import SystemStatusBar from '@/components/dashboard/SystemStatusBar';
import DashboardBreadcrumbs from '@/components/dashboard/DashboardBreadcrumbs';
import { UserSession } from '@/lib/auth';
import { bgUrl } from '@/lib/cdn';
 
export default function DashboardPage() {
  const { data: session, status } = useSession() as { data: UserSession | null, status: string };
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Check authentication status
  useEffect(() => {
    // Wait for the session check to complete
    if (status === 'loading') {
      return;
    }

    // Add a small delay to ensure session is fully established
    const timer = setTimeout(() => {
      // Session check completed
      setIsLoading(false);

      if (status === 'unauthenticated' || !session || !session.user) {
        // Clear any stale session data
        window.location.href = '/login?reset=true';
      } else if (status === 'authenticated' && session && session.user) {
        setIsAuthenticated(true);
      }
    }, 800); 

    // Clean up timer on unmount
    return () => clearTimeout(timer);
  }, [status, router, session]);

  // Show loading state while checking authentication
  if (isLoading) {
    return <LoadingScreen />;
  }

  // If not authenticated after checks, show auth required message
  if (!isAuthenticated) {
    return <AuthError />;
  }

  // MobiGlas angles and shapes for UI elements
  const cornerAccent = (position: string) => {
    const classes = {
      'tl': 'top-0 left-0 border-t border-l',
      'tr': 'top-0 right-0 border-t border-r',
      'bl': 'bottom-0 left-0 border-b border-l',
      'br': 'bottom-0 right-0 border-b border-r',
    };
    return `absolute w-5 h-5 ${classes[position as keyof typeof classes]} border-[rgba(var(--mg-primary),0.6)]`;
  };

  // Animation variants for consistent animations
  const fadeInUpVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: (custom: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        delay: custom * 0.1,
        ease: "easeOut"
      }
    })
  };

  const fadeInLeftVariants: Variants = {
    hidden: { opacity: 0, x: -30 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.6,
        delay: 0.1,
        ease: "easeOut"
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-black bg-opacity-95 bg-cover bg-center bg-blend-overlay relative overflow-hidden" style={{ backgroundImage: bgUrl('/spacebg.jpg') }}>
      {/* Holographic grid background */}
      <div className="hex-grid absolute inset-0 opacity-5" />
      
      {/* Scan line effect */}
      <div className="animate-scanline absolute inset-0 h-full w-full opacity-5" />

      {/* MobiGlas outer frame - hide on small screens */}
      <div className="absolute inset-6 border border-[rgba(var(--mg-primary),0.3)] pointer-events-none z-10 hidden sm:block">
        <div className={cornerAccent('tl')}></div>
        <div className={cornerAccent('tr')}></div>
        <div className={cornerAccent('bl')}></div>
        <div className={cornerAccent('br')}></div>
      </div>
      
      {/* Header Bar */}
      <DashboardHeader 
        session={session} 
        onMenuToggle={() => setIsMobileMenuOpen(true)}
      />
      
      {/* Mobile Sidebar Drawer */}
      <MobileSidebar 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)} 
      />

      {/* Main Dashboard Container */}
      <div className="flex-grow relative z-10 px-4 sm:px-6 pb-4 sm:pb-6 overflow-hidden">
        {/* System status bar */}
        <SystemStatusBar />
        
        <DashboardBreadcrumbs />

        <div className="flex flex-col h-full space-y-4 sm:space-y-6">
          {/* Main Dashboard Layout - with angled borders and glowing edges */}
          <div className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
            
            {/* Navigation Panel - Sidebar (Hidden on mobile, shown on large screens) */}
            <motion.div
              className="hidden lg:block lg:col-span-3 xl:col-span-2 relative"
              variants={fadeInLeftVariants}
              initial="hidden"
              animate="visible"
            >
              {/* Panel container with angled corners */}
              <div className="relative bg-[rgba(var(--mg-panel-dark),0.7)] backdrop-blur-md border border-[rgba(var(--mg-primary),0.3)] h-full rounded-sm overflow-hidden">
                {/* Corner accents */}
                <div className={cornerAccent('tl')}></div>
                <div className={cornerAccent('br')}></div>
                
                {/* Top border glow */}
                <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-[rgba(var(--mg-primary),0.6)] to-transparent"></div>
                
                {/* Vertical highlight */}
                <div className="absolute top-0 bottom-0 left-0 w-1 bg-[rgba(var(--mg-primary),0.2)]"></div>
                
                {/* Dashboard sidebar component */}
                <div className="h-full">
                  <DashboardSidebar />
                </div>
              </div>
            </motion.div>
            
            {/* Main Content Area */}
            <div className="lg:col-span-9 xl:col-span-10 flex flex-col space-y-4 sm:space-y-6">
              {/* Image Carousel - with angled design */}
              <motion.div
                className="relative"
                variants={fadeInUpVariants}
                initial="hidden"
                animate="visible"
                custom={0}
              >
                <div className="relative bg-[rgba(var(--mg-panel-dark),0.7)] backdrop-blur-md border border-[rgba(var(--mg-primary),0.3)] rounded-sm overflow-hidden">
                  {/* Corner accents */}
                  <div className={cornerAccent('tl')}></div>
                  <div className={cornerAccent('tr')}></div>
                  <div className={cornerAccent('bl')}></div>
                  <div className={cornerAccent('br')}></div>
                  
                  {/* Top edge glow */}
                  <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-[rgba(var(--mg-primary),0.5)] to-transparent"></div>
                  
                  <EventCarousel />
                </div>
              </motion.div>
              
              {/* Main Dashboard Content Area */}
              <div className="flex-grow grid grid-cols-1 gap-4 sm:gap-6">
                
                {/* MobiGlas Panels Grid - only Upcoming Events retained */}
                <motion.div
                  variants={fadeInUpVariants}
                  initial="hidden"
                  animate="visible"
                  custom={2}
                >
                  <div className="grid grid-cols-1">
                    <div className="w-full">
                      <UpcomingEventsPanel />
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* New Minimalist Footer */}
      <DashboardFooter />
      
      {/* Floating holographic elements - purely decorative */}
      <div className="absolute bottom-20 right-20 w-32 h-32 pointer-events-none opacity-20 animate-spin-slow hidden md:block">
        <div className="absolute inset-0 border border-[rgba(var(--mg-primary),0.3)] rounded-full"></div>
        <div className="absolute inset-4 border border-[rgba(var(--mg-primary),0.2)] rounded-full"></div>
        <div className="absolute inset-8 border border-[rgba(var(--mg-primary),0.1)] rounded-full"></div>
      </div>
      
      <div className="absolute top-40 left-20 w-24 h-24 pointer-events-none opacity-10 animate-float-slow hidden md:block">
        <div className="absolute inset-0 border border-[rgba(var(--mg-accent),0.3)] rotate-45"></div>
        <div className="absolute inset-0 border border-[rgba(var(--mg-accent),0.1)] rotate-[30deg]"></div>
      </div>
    </div>
  );
}
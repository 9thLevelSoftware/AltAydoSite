'use client';

import React from 'react';
import { motion } from 'motion/react';
import Image from 'next/image';
import { cdn } from '@/lib/cdn';
import { UserSession } from '@/lib/auth';
import { MobiGlasPanel, MobiGlasButton } from '@/components/ui/mobiglas';

interface DashboardHeaderProps {
  session: UserSession | null;
  onMenuToggle?: () => void;
}

export default function DashboardHeader({ session, onMenuToggle }: DashboardHeaderProps) {
  const getUserDisplayName = () => {
    if (!session?.user?.name && !session?.user?.email) return 'Employee';
    return session.user.name || session.user.email?.split('@')[0] || 'Employee';
  };

  return (
    <motion.header
      className="relative z-20 px-4 sm:px-6 pt-4 sm:pt-6"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7 }}
    >
      {/* Main Header with Logo and User Info */}
      <MobiGlasPanel
        variant="darker"
        withCircuitBg
        cornerAccents
        className="mb-4 sm:mb-6 rounded-sm"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        {/* Top edge glow */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[rgba(var(--mg-primary),0.8)] to-transparent"></div>

        <div className="p-3 sm:p-5 grid grid-cols-12 gap-4 items-center">
          {/* Logo Section & Menu Toggle */}
          <div className="col-span-2 md:col-span-1 flex items-center justify-start">
            {/* Mobile Menu Button */}
            {onMenuToggle && (
              <div className="lg:hidden mr-3">
                <MobiGlasButton
                  variant="ghost"
                  size="sm"
                  onClick={onMenuToggle}
                  className="p-2 h-11 w-11 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  withCorners={false}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                </MobiGlasButton>
              </div>
            )}

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <div className="relative h-12 w-12 sm:h-16 sm:w-16">
                <div className="absolute inset-0 rounded-full border border-[rgba(var(--mg-primary),0.5)] animate-pulse"></div>
                <div className="absolute inset-2 rounded-full border border-[rgba(var(--mg-primary),0.3)]"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Image
                    src={cdn('/Aydo_Corp_logo_employees.png')}
                    alt="AydoCorp Logo"
                    width={56}
                    height={56}
                    className="object-contain hologram-flicker"
                  />
                </div>
                {/* Orbiting dot */}
                <motion.div
                  className="absolute h-1.5 w-1.5 rounded-full bg-[rgba(var(--mg-primary),0.9)]"
                  animate={{
                    rotate: 360,
                  }}
                  transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                  style={{
                    top: '50%',
                    left: '50%',
                    marginLeft: '32px',
                    marginTop: '-2px',
                    transformOrigin: '-32px 2px',
                  }}
                />
              </div>
            </motion.div>
          </div>

          {/* Title and Welcome */}
          <motion.div
            className="col-span-8 md:col-span-7 text-center md:text-left flex flex-col justify-center"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="relative inline-block">
              <h1 className="mg-title text-xl sm:text-3xl md:text-4xl mb-1 text-[rgba(var(--mg-primary),0.9)] font-quantify tracking-widest mg-glow">
                EMPLOYEE PORTAL
              </h1>
              <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-1.5 h-10 bg-[rgba(var(--mg-primary),0.2)] hidden md:block">
                <div
                  className="absolute top-0 left-0 w-full h-full bg-[rgba(var(--mg-primary),0.8)] animate-pulse"
                  style={{ height: '30%' }}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center sm:space-x-2 justify-center md:justify-start">
              <div className="text-xs sm:text-sm tracking-wider text-[rgba(var(--mg-text),0.8)]">
                WELCOME,{' '}
                <span className="text-[rgba(var(--mg-accent),0.9)] font-quantify">
                  {getUserDisplayName().toUpperCase()}
                </span>
              </div>
              <div className="w-1.5 h-1.5 rounded-full bg-[rgba(var(--mg-primary),0.8)] animate-pulse hidden sm:block"></div>
              <div className="text-[10px] sm:text-xs text-[rgba(var(--mg-text),0.6)] hidden sm:block">
                LOCAL TIME:{' '}
                {new Date().toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          </motion.div>

          {/* Clearance Level Badge - Hidden on small mobile */}
          <motion.div
            className="col-span-2 md:col-span-4 flex justify-end"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {/* Mobile: Simple Badge */}
            <div className="md:hidden flex flex-col items-end">
              <div className="px-2 py-1 border border-[rgba(var(--mg-primary),0.4)] rounded-sm bg-[rgba(var(--mg-primary),0.1)]">
                <div className="text-[10px] text-[rgba(var(--mg-text),0.7)]">LVL</div>
                <div className="text-lg font-quantify text-[rgba(var(--mg-primary),1)] leading-none">
                  {session?.user?.clearanceLevel || 1}
                </div>
              </div>
            </div>

            <MobiGlasPanel
              variant="darker"
              cornerAccents
              cornerSize="sm"
              className="py-2 sm:py-3 px-4 sm:px-6 rounded-sm hidden md:block"
              padding="sm"
            >
              <div className="flex items-center space-x-4">
                {/* Clearance meter */}
                <div className="hidden md:block">
                  <div className="relative h-16 w-3">
                    <div className="absolute inset-x-0 bottom-0 h-full bg-[rgba(var(--mg-primary),0.1)] rounded-sm"></div>
                    <motion.div
                      className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[rgba(var(--mg-primary),0.8)] to-[rgba(var(--mg-primary),0.3)] rounded-sm"
                      initial={{ height: '0%' }}
                      animate={{
                        height: `${(session?.user?.clearanceLevel || 1) * 20}%`,
                        maxHeight: '100%',
                      }}
                      transition={{ duration: 1, delay: 0.5 }}
                    ></motion.div>
                    {/* Level markers */}
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="absolute w-full h-px bg-[rgba(var(--mg-text),0.3)]"
                        style={{ bottom: `${i * 20}%` }}
                      ></div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-center md:text-left text-[rgba(var(--mg-text),0.6)]">
                    CLEARANCE LEVEL
                  </div>
                  <div className="flex items-center justify-center md:justify-start">
                    <div className="text-2xl sm:text-3xl font-quantify tracking-wider text-[rgba(var(--mg-primary),0.9)] mg-flicker mr-1">
                      {session?.user?.clearanceLevel || 1}
                    </div>
                    <div className="text-xs text-[rgba(var(--mg-warning),0.8)]">/ 5</div>
                  </div>
                  <div className="text-[9px] text-center md:text-left text-[rgba(var(--mg-text),0.5)]">
                    AUTHORIZED PERSONNEL
                  </div>
                </div>
              </div>
            </MobiGlasPanel>
          </motion.div>
        </div>
      </MobiGlasPanel>
    </motion.header>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, MotionProps } from 'motion/react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import MobiGlasButton from '@/components/ui/mobiglas/MobiGlasButton';

const navItems = [
  { name: 'SERVICES', href: '/services' },
  { name: 'ABOUT', href: '/about' },
  { name: 'JOIN', href: '/join' },
  { name: 'CONTACT', href: '/contact' },
];

// Link-styled button: renders a single <a> (via next/link) with MobiGlas button
// styling. Avoids the invalid <a><button> nesting that wrapping MobiGlasButton in
// a Link produced, while preserving the visual treatment and motion props.
const navButtonVariants = {
  primary:
    'mg-button border border-[rgba(var(--mg-primary),0.5)] text-[rgba(var(--mg-primary),1)] hover:bg-[rgba(var(--mg-primary),0.2)] hover:border-[rgba(var(--mg-primary),0.8)]',
  ghost:
    'bg-transparent border-none text-[rgba(var(--mg-text),0.8)] hover:text-[rgba(var(--mg-primary),1)] hover:bg-[rgba(var(--mg-primary),0.1)]',
} as const;

const navButtonSizes = {
  sm: 'px-3 py-1.5 text-sm',
  lg: 'px-6 py-3 text-lg',
} as const;

const MotionLink = motion.create(Link);

interface NavButtonLinkProps extends Omit<MotionProps, 'children'> {
  href: string;
  children: React.ReactNode;
  variant?: keyof typeof navButtonVariants;
  size?: keyof typeof navButtonSizes;
  fullWidth?: boolean;
  withScanline?: boolean;
  withCorners?: boolean;
  className?: string;
  onClick?: () => void;
}

function NavButtonLink({
  href,
  children,
  variant = 'primary',
  size = 'sm',
  fullWidth = false,
  withScanline = false,
  withCorners = false,
  className = '',
  onClick,
  ...motionProps
}: NavButtonLinkProps) {
  const classes = [
    'relative inline-flex items-center justify-center tracking-wider transition-all duration-300',
    withCorners ? 'group' : '',
    fullWidth ? 'w-full' : '',
    navButtonVariants[variant],
    navButtonSizes[size],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <MotionLink
      href={href}
      onClick={onClick}
      className={classes}
      style={{ fontFamily: "'Quantify', sans-serif" }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      {...motionProps}
    >
      {/* Scanline effect */}
      {withScanline && (
        <motion.div
          className="absolute inset-0 overflow-hidden pointer-events-none"
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="absolute top-0 w-full h-0.5 opacity-60"
            style={{
              background:
                'linear-gradient(to right, transparent, rgba(var(--mg-primary), 0.8), transparent)',
            }}
            animate={{ top: ['0%', '100%', '0%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          />
        </motion.div>
      )}

      {/* Corner accents */}
      {withCorners && (
        <>
          <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[rgba(var(--mg-primary),0.8)] opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-[rgba(var(--mg-primary),0.8)] opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-[rgba(var(--mg-primary),0.8)] opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[rgba(var(--mg-primary),0.8)] opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </>
      )}

      <span className="relative z-10 flex items-center justify-center gap-2">{children}</span>
    </MotionLink>
  );
}

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const { data: session, status } = useSession();
  const pathname = usePathname();

  // Auto-close mobile menu on route change (handles programmatic navigation)
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <nav className="sticky top-0 w-full z-40 border-b border-[rgba(var(--mg-primary),0.15)] bg-[rgba(0,10,20,0.85)] backdrop-blur-sm mt-0 pt-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14">
          <div className="flex items-center">
            <Link href="/" className="flex items-center justify-center group">
              <motion.div
                className="relative flex items-center justify-center"
                whileHover={{ scale: 1.03 }}
              >
                <Image
                  src="https://images.aydocorp.space/1758036690228.png"
                  alt="AydoCorp"
                  width={144}
                  height={144}
                  quality={90}
                  className="h-12 w-auto"
                  priority
                />
              </motion.div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <NavButtonLink
                key={item.name}
                href={item.href}
                variant="ghost"
                size="sm"
                className="text-xs tracking-wider font-quantify"
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                whileHover={{ x: 2 }}
              >
                {item.name}
              </NavButtonLink>
            ))}

            <div className="w-px h-5 bg-[rgba(var(--mg-primary),0.2)] mx-1"></div>

            {status === 'loading' ? (
              // Neutral placeholder while the session resolves to avoid a login/portal flash
              <div
                className="h-8 w-36 rounded-sm bg-[rgba(var(--mg-primary),0.08)] animate-pulse"
                aria-hidden="true"
              />
            ) : session ? (
              <div className="flex space-x-1 items-center">
                <NavButtonLink
                  href="/dashboard"
                  variant="primary"
                  size="sm"
                  className="text-xs tracking-wider font-quantify"
                  withScanline
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                >
                  EMPLOYEE PORTAL
                </NavButtonLink>
              </div>
            ) : (
              <NavButtonLink
                href="/login"
                variant="primary"
                size="sm"
                className="text-xs tracking-wider font-quantify"
                withScanline
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
              >
                LOGIN
              </NavButtonLink>
            )}
          </div>

          {/* Mobile menu button - Increased to 48x48px for better touch targets */}
          <div className="md:hidden flex items-center">
            <MobiGlasButton
              variant="ghost"
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 w-12 h-12 flex items-center justify-center"
              aria-label="Toggle menu"
              withCorners={false} // Simple button for toggle
            >
              <span className="sr-only">Open main menu</span>
              <motion.div animate={{ rotate: isOpen ? 90 : 0 }} transition={{ duration: 0.2 }}>
                <svg
                  className="h-6 w-6 text-[rgba(var(--mg-text),1)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={isOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'}
                  />
                </svg>
              </motion.div>
            </MobiGlasButton>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden overflow-hidden"
          >
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 mg-container backdrop-blur-md border-none mg-glow">
              {navItems.map((item, idx) => (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: idx * 0.05 }}
                >
                  {/* Full width link-button for easier tapping */}
                  <NavButtonLink
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    variant="ghost"
                    size="lg"
                    fullWidth
                    className="text-base font-quantify tracking-wider justify-start pl-4"
                    withCorners
                  >
                    {item.name}
                  </NavButtonLink>
                </motion.div>
              ))}

              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: navItems.length * 0.05 }}
                className="pt-4 pb-2"
              >
                {status === 'loading' ? (
                  // Neutral placeholder while the session resolves to avoid a login/portal flash
                  <div
                    className="h-12 w-full rounded-sm bg-[rgba(var(--mg-primary),0.08)] animate-pulse"
                    aria-hidden="true"
                  />
                ) : session ? (
                  <div className="space-y-2">
                    <NavButtonLink
                      href="/dashboard"
                      onClick={() => setIsOpen(false)}
                      variant="primary"
                      size="lg"
                      fullWidth
                      className="text-sm font-quantify tracking-wider"
                      withScanline
                    >
                      EMPLOYEE PORTAL
                    </NavButtonLink>
                  </div>
                ) : (
                  <NavButtonLink
                    href="/login"
                    onClick={() => setIsOpen(false)}
                    variant="primary"
                    size="lg"
                    fullWidth
                    className="text-sm font-quantify tracking-wider"
                    withScanline
                  >
                    LOGIN
                  </NavButtonLink>
                )}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

'use client';

import { useSession, signOut } from 'next-auth/react';
import { motion } from 'motion/react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

export default function Profile() {
  const { data: session, status } = useSession();
  const user = session?.user;
  const pathname = usePathname();

  // Hide on protected pages which have their own headers (except dashboard and userprofile)
  const isProtectedPage = pathname?.startsWith('/admin');

  // Only render when authenticated and not on protected pages
  if (status !== 'authenticated' || isProtectedPage) {
    return null;
  }

  // Handle the sign out action
  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' });
  };

  // Truncate long names gracefully for the chip
  const displayName = (user?.name || 'Operator').trim();

  return (
    <div
      className="w-full bg-[rgba(0,10,20,0.6)] z-50 border-b border-[rgba(var(--mg-primary),0.1)]"
      data-profile-header="true"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-end items-center py-1.5 gap-3 sm:gap-4">
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <Link
            href="/userprofile"
            className="group relative flex items-stretch overflow-hidden border border-[rgba(var(--mg-primary),0.4)] bg-[rgba(var(--mg-panel-dark),0.55)] hover:bg-[rgba(var(--mg-primary),0.08)] hover:border-[rgba(var(--mg-primary),0.75)] transition-all duration-300"
            style={{ fontFamily: "'Quantify', sans-serif" }}
            aria-label="Access your personnel file"
            title="Access your personnel file"
          >
            {/* Hover glow layer */}
            <span
              className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{
                boxShadow:
                  '0 0 14px rgba(var(--mg-primary), 0.35), inset 0 0 10px rgba(var(--mg-primary), 0.08)',
              }}
              aria-hidden="true"
            />

            {/* Scanline sweep */}
            <span
              className="pointer-events-none absolute inset-0 overflow-hidden"
              aria-hidden="true"
            >
              <motion.span
                className="absolute left-0 w-full h-px"
                style={{
                  background:
                    'linear-gradient(to right, transparent, rgba(var(--mg-primary), 0.7), transparent)',
                }}
                initial={{ y: '-10%' }}
                animate={{ y: ['-10%', '110%', '-10%'] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
              />
            </span>

            {/* Corner brackets */}
            <span
              className="pointer-events-none absolute top-0 left-0 w-2 h-2 border-t border-l border-[rgba(var(--mg-primary),0.9)]"
              aria-hidden="true"
            />
            <span
              className="pointer-events-none absolute top-0 right-0 w-2 h-2 border-t border-r border-[rgba(var(--mg-primary),0.9)]"
              aria-hidden="true"
            />
            <span
              className="pointer-events-none absolute bottom-0 left-0 w-2 h-2 border-b border-l border-[rgba(var(--mg-primary),0.9)]"
              aria-hidden="true"
            />
            <span
              className="pointer-events-none absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[rgba(var(--mg-primary),0.9)]"
              aria-hidden="true"
            />

            {/* Icon well — vertical separator after it */}
            <span className="relative flex items-center justify-center w-9 bg-[rgba(var(--mg-primary),0.06)] border-r border-[rgba(var(--mg-primary),0.25)]">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                className="w-4 h-4 text-[rgba(var(--mg-primary),0.9)] group-hover:text-[rgba(var(--mg-primary),1)] transition-colors"
                aria-hidden="true"
              >
                <rect x="3" y="5" width="18" height="14" rx="1" />
                <circle cx="9" cy="11" r="2" />
                <path
                  d="M14 9.5h4M14 13h4M6 16.2c.4-1.4 1.6-2.4 3-2.4s2.6 1 3 2.4"
                  strokeLinecap="round"
                />
              </svg>
              {/* live status pip */}
              <motion.span
                className="absolute top-1.5 right-1.5 block w-1.5 h-1.5 rounded-full bg-[rgba(var(--mg-success),1)]"
                style={{ boxShadow: '0 0 4px rgba(var(--mg-success), 0.9)' }}
                animate={{ opacity: [0.45, 1, 0.45], scale: [1, 1.15, 1] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                aria-hidden="true"
              />
            </span>

            {/* Two-line label: function + name */}
            <span className="relative flex flex-col justify-center leading-none px-2.5 py-1.5 gap-1 min-w-0">
              <span className="flex items-center gap-1.5 text-[8.5px] tracking-[0.22em] uppercase text-[rgba(var(--mg-text),0.55)] group-hover:text-[rgba(var(--mg-text),0.8)] transition-colors whitespace-nowrap">
                <span
                  className="inline-block w-1 h-1 bg-[rgba(var(--mg-primary),0.7)]"
                  aria-hidden="true"
                />
                Personnel File
              </span>
              <span className="flex items-center gap-1.5 text-[11px] tracking-[0.12em] text-[rgba(var(--mg-primary),1)] truncate max-w-[160px]">
                <span className="truncate">{displayName}</span>
              </span>
            </span>

            {/* Arrow affordance */}
            <span className="relative flex items-center justify-center w-7 border-l border-[rgba(var(--mg-primary),0.25)] bg-[rgba(var(--mg-primary),0.04)] group-hover:bg-[rgba(var(--mg-primary),0.12)] transition-colors">
              <motion.svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="w-3 h-3 text-[rgba(var(--mg-primary),0.85)] group-hover:text-[rgba(var(--mg-primary),1)]"
                aria-hidden="true"
                animate={{ x: [0, 2, 0] }}
                transition={{
                  duration: 1.6,
                  repeat: Infinity,
                  repeatType: 'reverse',
                  ease: 'easeInOut',
                }}
              >
                <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </motion.svg>
            </span>
          </Link>
        </motion.div>

        {/* Sign Out — de-emphasized, far less weight than the chip */}
        <button
          onClick={handleSignOut}
          className="text-[10px] tracking-[0.18em] uppercase text-[rgba(var(--mg-text),0.4)] hover:text-[rgba(var(--mg-danger),0.9)] transition-colors duration-200 hidden sm:inline-flex items-center gap-1.5"
          title="Sign out of your account"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            className="w-3 h-3"
            aria-hidden="true"
          >
            <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" strokeLinecap="round" />
            <path d="M10 17l-5-5 5-5M5 12h11" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Sign Out
        </button>
      </div>
    </div>
  );
}

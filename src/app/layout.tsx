import localFont from 'next/font/local';
import './globals.css';
import Profile from '../components/Profile';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import { metadata } from './metadata';
import UserProviderWrapper from '../components/UserProviderWrapper';
import StarfieldWrapper from '../components/StarfieldWrapper';
import SecureConnectionIndicator from '../components/SecureConnectionIndicator';
import { Suspense } from 'react';
import ErrorBoundary from '../components/ErrorBoundary';
import Providers from '../components/providers';

const quantify = localFont({
  src: [
    {
      path: '../../public/fonts/Quantify.woff',
      weight: 'normal',
      style: 'normal',
    },
    {
      path: '../../public/fonts/Quantify Bold.woff',
      weight: 'bold',
      style: 'normal',
    },
  ],
  variable: '--font-quantify',
});

export { metadata };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${quantify.variable} font-quantify bg-black text-white min-h-screen antialiased overflow-x-hidden text-sm`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-[rgba(var(--mg-panel-dark),0.95)] focus:text-[rgba(var(--mg-accent),1)] focus:border focus:border-[rgba(var(--mg-accent),0.6)] focus:rounded-sm focus:text-sm focus:font-quantify"
        >
          Skip to main content
        </a>
        <ErrorBoundary>
          <Providers>
            <UserProviderWrapper>
              <div className="relative min-h-screen flex flex-col">
                <div className="hidden md:block">
                  <StarfieldWrapper />
                </div>

                {/* Minimal MobiGlass UI decorations */}
                <div className="fixed inset-0 pointer-events-none">
                  {/* Subtle corner brackets */}
                  <div className="fixed top-0 left-0 w-12 h-12 md:w-24 md:h-24 border-l border-t border-[rgba(var(--mg-primary),0.15)] z-10"></div>
                  <div className="fixed top-0 right-0 w-12 h-12 md:w-24 md:h-24 border-r border-t border-[rgba(var(--mg-primary),0.15)] z-10"></div>
                  <div className="fixed bottom-0 left-0 w-12 h-12 md:w-24 md:h-24 border-l border-b border-[rgba(var(--mg-primary),0.15)] z-10"></div>
                  <div className="fixed bottom-0 right-0 w-12 h-12 md:w-24 md:h-24 border-r border-b border-[rgba(var(--mg-primary),0.15)] z-10"></div>

                  {/* Very subtle noise texture (moved to file URL to avoid data URI issues) */}
                  <div className="fixed inset-0 bg-[url('/assets/noise.svg')] opacity-[0.02] mix-blend-overlay z-10"></div>

                  {/* Subtle scan line - Hidden on mobile/reduced motion via CSS media queries would be ideal, but here we use Tailwind's motion-reduce and hide on small screens */}
                  <div className="fixed top-0 left-0 w-full h-[1px] bg-[rgba(var(--mg-primary),0.4)] shadow-[0_0_8px_rgba(var(--mg-primary),0.3)] animate-scan-line z-20 hidden md:block motion-reduce:hidden"></div>

                  {/* Very subtle line noise */}
                  <div className="fixed inset-0 overflow-hidden opacity-[0.01] z-10 pointer-events-none">
                    <div className="absolute inset-0 line-noise hidden md:block"></div>
                  </div>
                </div>

                <div className="relative z-20 flex flex-col flex-1">
                  <header className="flex flex-col">
                    <Suspense fallback={<div>Loading profile...</div>}>
                      <Profile />
                    </Suspense>
                    <Suspense fallback={<div>Loading navigation...</div>}>
                      <Navigation />
                    </Suspense>
                  </header>
                  <main id="main-content" className="flex-1">
                    <Suspense
                      fallback={
                        <div className="min-h-screen flex items-center justify-center">
                          Loading content...
                        </div>
                      }
                    >
                      {children}
                    </Suspense>
                  </main>
                  <Footer />
                </div>

                {/* Secure Connection Indicator - only shows when user is logged in */}
                <SecureConnectionIndicator />
              </div>
            </UserProviderWrapper>
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}

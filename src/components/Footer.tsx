'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { useRandomId } from './UserProviderWrapper';
import Image from 'next/image';
import { cdn } from '@/lib/cdn';
import MobiGlasButton from '@/components/ui/mobiglas/MobiGlasButton';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const { randomId } = useRandomId();
  const [isVisible, setIsVisible] = useState(true);
  
  // Listen for footer visibility changes
  useEffect(() => {
    // Check initial state
    const checkFooterVisibility = () => {
      if (typeof window !== 'undefined') {
        const shouldHide = localStorage.getItem('hideFooter') === 'true';
        setIsVisible(!shouldHide);
      }
    };
    
    // Check on mount
    checkFooterVisibility();
    
    // Listen for changes
    const handleVisibilityChange = () => {
      checkFooterVisibility();
    };
    
    window.addEventListener('footerVisibilityChange', handleVisibilityChange);
    
    // Clean up
    return () => {
      window.removeEventListener('footerVisibilityChange', handleVisibilityChange);
    };
  }, []);
  
  // Don't render anything if the footer should be hidden
  if (!isVisible) return null;
  
  return (
    <footer className="relative z-10 mt-12">
      <div className="absolute inset-0 mg-grid-bg opacity-5 pointer-events-none"></div>
      
      {/* Minimal Mobiglass Footer */}
      <div className="mg-container border-t border-[rgba(var(--mg-primary),0.15)] relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="holo-scan opacity-10"></div>
          <div className="line-noise opacity-10"></div>
        </div>
        
        {/* Minimal corner brackets */}
        <div className="absolute top-0 left-0 w-5 h-5 border-l border-t border-[rgba(var(--mg-primary),0.3)]"></div>
        <div className="absolute top-0 right-0 w-5 h-5 border-r border-t border-[rgba(var(--mg-primary),0.3)]"></div>
        
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            {/* Company Info */}
            <div>
              <motion.h3 
                className="mb-3 flex items-center text-base"
                initial={{ opacity: 0, y: 5 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <span className="mg-title text-lg">AYDO</span>
                <span className="mg-subtitle font-light">CORP</span>
              </motion.h3>
              <motion.div 
                className="mg-text text-xs leading-relaxed border-l border-[rgba(var(--mg-primary),0.2)] pl-2 bg-[rgba(var(--mg-primary),0.02)]"
                initial={{ opacity: 0, x: -5 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <p className="text-[rgba(var(--mg-text),0.7)]">Connecting humanity across the cosmos with innovative transportation solutions.</p>
              </motion.div>
            </div>

            {/* Quick Links */}
            <div>
              <motion.h3 
                className="mg-subtitle text-xs mb-3 tracking-wider"
                initial={{ opacity: 0, y: 5 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                NAVIGATION
              </motion.h3>
              <ul className="space-y-1 text-xs">
                {[
                  { name: 'SERVICES', path: '/services' },
                  { name: 'ABOUT', path: '/about' },
                  { name: 'JOIN US', path: '/join' },
                  { name: 'CONTACT', path: '/contact' }
                ].map((item, idx) => (
                  <motion.li 
                    key={idx}
                    initial={{ opacity: 0, x: -5 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: 0.1 + idx * 0.05 }}
                  >
                    <Link 
                      href={item.path} 
                      className="mg-nav-item inline-flex items-center text-[rgba(var(--mg-text),0.6)] hover:text-[rgba(var(--mg-primary),0.9)] transition-colors duration-200"
                    >
                      <span className="text-[rgba(var(--mg-primary),0.5)] mr-1 text-xs">›</span>
                      <span className="font-quantify tracking-wide">{item.name}</span>
                    </Link>
                  </motion.li>
                ))}
              </ul>
            </div>

            {/* Connect */}
            <div>
              <motion.h3 
                className="mg-subtitle text-xs mb-3 tracking-wider"
                initial={{ opacity: 0, y: 5 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                COMM CHANNELS
              </motion.h3>
              <div className="space-y-2">
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                >
                  <a
                    href="https://discord.gg/aydocorp"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full"
                  >
                    <MobiGlasButton
                      variant="primary"
                      size="sm"
                      fullWidth
                      className="text-xs"
                      leftIcon={
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512" className="h-3 w-3 fill-current">
                          <path d="M524.531,69.836a1.5,1.5,0,0,0-.764-.7A485.065,485.065,0,0,0,404.081,32.03a1.816,1.816,0,0,0-1.923.91,337.461,337.461,0,0,0-14.9,30.6,447.848,447.848,0,0,0-134.426,0,309.541,309.541,0,0,0-15.135-30.6,1.89,1.89,0,0,0-1.924-.91A483.689,483.689,0,0,0,116.085,69.137a1.712,1.712,0,0,0-.788.676C39.068,183.651,18.186,294.69,28.43,404.354a2.016,2.016,0,0,0,.765,1.375A487.666,487.666,0,0,0,176.02,479.918a1.9,1.9,0,0,0,2.063-.676A348.2,348.2,0,0,0,208.12,430.4a1.86,1.86,0,0,0-1.019-2.588,321.173,321.173,0,0,1-45.868-21.853,1.885,1.885,0,0,1-.185-3.126c3.082-2.309,6.166-4.711,9.109-7.137a1.819,1.819,0,0,1,1.9-.256c96.229,43.917,200.41,43.917,295.5,0a1.812,1.812,0,0,1,1.924.233c2.944,2.426,6.027,4.851,9.132,7.16a1.884,1.884,0,0,1-.162,3.126,301.407,301.407,0,0,1-45.89,21.83,1.875,1.875,0,0,0-1,2.611,391.055,391.055,0,0,0,30.014,48.815,1.864,1.864,0,0,0,2.063.7A486.048,486.048,0,0,0,610.7,405.729a1.882,1.882,0,0,0,.765-1.352C623.729,277.594,590.933,167.465,524.531,69.836ZM222.491,337.58c-28.972,0-52.844-26.587-52.844-59.239s23.409-59.241,52.844-59.241c29.665,0,53.306,26.82,52.843,59.241C275.334,310.993,251.924,337.58,222.491,337.58Zm195.38,0c-28.971,0-52.843-26.587-52.843-59.239s23.409-59.241,52.843-59.241c29.667,0,53.307,26.82,52.844,59.241C470.918,310.993,447.538,337.58,417.871,337.58Z"/>
                        </svg>
                      }
                    >
                      <span className="font-quantify tracking-wide">DISCORD</span>
                    </MobiGlasButton>
                  </a>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: 0.3 }}
                >
                  <a
                    href="mailto:contact@aydocorp.com"
                    className="block w-full"
                  >
                    <MobiGlasButton
                      variant="primary"
                      size="sm"
                      fullWidth
                      className="text-xs"
                      leftIcon={
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      }
                    >
                      <span className="font-quantify tracking-wide">CONTACT</span>
                    </MobiGlasButton>
                  </a>
                </motion.div>
              </div>
            </div>
          </div>

          {/* Minimal legal section */}
          <div className="mt-8 pt-4 border-t border-[rgba(var(--mg-primary),0.1)]">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <motion.div 
                className="mb-3 md:mb-0 text-[rgba(var(--mg-text),0.4)] text-xs"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <div className="flex items-center">
                  <div className="w-1 h-1 bg-[rgba(var(--mg-primary),0.4)] mr-1 rounded-full"></div>
                  <div className="font-quantify tracking-wider mg-flicker">
                    SYS_{randomId}
                  </div>
                </div>
              </motion.div>
              
              <motion.div 
                className="text-center text-[rgba(var(--mg-text),0.5)] text-xs"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <span className="font-quantify tracking-wider">© {currentYear} AYDOCORP</span>
                <span className="mx-2 text-[rgba(var(--mg-primary),0.4)]">|</span>
                <span className="text-[rgba(var(--mg-text),0.4)]">DEMO PURPOSES ONLY</span>
              </motion.div>

              <motion.div
                className="mt-3 md:mt-0 md:ml-4 flex items-center justify-center"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.6 }}
              >
                <div className="relative w-24 h-auto overflow-hidden mg-container bg-transparent p-1 border-[rgba(var(--mg-primary),0.15)]">
                  <Image 
                    src={cdn('/MadeByTheCommunity_Black.png')} 
                    alt="Made By The Community" 
                    width={96}
                    height={48}
                    className="w-full h-auto object-contain opacity-70 hover:opacity-100 transition-opacity duration-300"
                  />
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 left-0 w-2 h-2 border-l border-t border-[rgba(var(--mg-primary),0.4)]"></div>
                    <div className="absolute top-0 right-0 w-2 h-2 border-r border-t border-[rgba(var(--mg-primary),0.4)]"></div>
                    <div className="absolute bottom-0 left-0 w-2 h-2 border-l border-b border-[rgba(var(--mg-primary),0.4)]"></div>
                    <div className="absolute bottom-0 right-0 w-2 h-2 border-r border-b border-[rgba(var(--mg-primary),0.4)]"></div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
} 
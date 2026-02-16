'use client';

import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { bgUrl } from '@/lib/cdn';
import MobiGlasButton from '@/components/ui/mobiglas/MobiGlasButton';

const AuthError = () => {
  const router = useRouter();
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-black bg-opacity-90 bg-cover bg-center bg-blend-overlay" style={{ backgroundImage: bgUrl('/spacebg.jpg') }}>
      <div className="holographic-projection relative z-10 max-w-md">
        <motion.div 
          className="mg-panel bg-[rgba(var(--mg-panel-dark),0.6)] p-8 backdrop-blur-md rounded-sm overflow-hidden border border-[rgba(var(--mg-danger),0.3)]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Top border glow */}
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-[rgba(var(--mg-danger),0.8)] to-transparent" />
          
          {/* Corner accents */}
          <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-[rgba(var(--mg-danger),0.8)]" />
          <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-[rgba(var(--mg-danger),0.8)]" />
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-[rgba(var(--mg-danger),0.8)]" />
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-[rgba(var(--mg-danger),0.8)]" />
          
          {/* Warning icon */}
          <div className="relative mb-6 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[rgba(var(--mg-danger),0.1)] border border-[rgba(var(--mg-danger),0.3)]">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-[rgba(var(--mg-danger),0.8)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            
            {/* Pulsing circles */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border border-[rgba(var(--mg-danger),0.2)] animate-pulse" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full border border-[rgba(var(--mg-danger),0.1)] animate-pulse-delay" />
          </div>
          
          <h3 className="mg-title text-xl mb-3 text-center font-quantify tracking-widest text-[rgba(var(--mg-danger),0.9)]">AUTHENTICATION REQUIRED</h3>
          
          <div className="relative">
            <div className="animate-scanline absolute inset-0 h-full w-full opacity-20" />
            <p className="mg-subtitle text-[rgba(var(--mg-text),0.8)] mb-6 text-center text-sm">
              SECURE ACCESS VIOLATION DETECTED.<br />VALID CREDENTIALS REQUIRED TO PROCEED.
            </p>
          </div>
          
          <div className="text-center">
            <MobiGlasButton
              onClick={() => router.replace('/login')}
              variant="danger"
              size="md"
            >
              SECURITY LOGIN
            </MobiGlasButton>
          </div>
        </motion.div>
      </div>
      
      {/* Holographic grid background */}
      <div className="hex-grid absolute inset-0 opacity-10" />
      
      {/* Scan line effect */}
      <div className="animate-scanline-vertical absolute inset-0 h-full w-full opacity-5" />
    </div>
  );
};

export default AuthError; 
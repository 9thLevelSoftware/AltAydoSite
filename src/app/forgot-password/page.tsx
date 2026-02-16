'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { bgUrl } from '@/lib/cdn';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CornerAccents } from '@/components/ui/mobiglas';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    if (!email) {
      setError('Please enter your email address.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to process your request. Please try again.');
        setIsLoading(false);
        return;
      }

      setSuccess('If your email is registered, you will receive password reset instructions shortly.');
      setEmail('');
      setIsLoading(false);
    } catch (error) {
      console.error('Error sending forgot password request:', error);
      setError('An unexpected error occurred. Please try again later.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-black bg-opacity-80 bg-cover bg-center bg-blend-overlay" style={{ backgroundImage: bgUrl('/spacebg.jpg') }}>
      <motion.div 
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mg-panel bg-[rgba(var(--mg-panel-dark),0.8)] backdrop-blur-md p-6 rounded-sm relative">
          {/* Corner brackets */}
          <CornerAccents size="md" color="primary" opacity="medium" />

          <div className="text-center mb-6">
            <h2 className="mg-title text-xl mb-1">AYDO<span className="mg-subtitle font-light">CORP</span></h2>
            <div className="mg-subtitle text-xs tracking-wider">PASSWORD RECOVERY</div>
          </div>

          {error && (
            <motion.div 
              className="mb-4 p-2 bg-[rgba(var(--mg-error),0.1)] border border-[rgba(var(--mg-error),0.3)] text-[rgba(var(--mg-error),0.8)] text-xs rounded-sm"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            </motion.div>
          )}

          {success && (
            <motion.div 
              className="mb-4 p-2 bg-[rgba(var(--mg-success),0.1)] border border-[rgba(var(--mg-success),0.3)] text-[rgba(var(--mg-success),0.8)] text-xs rounded-sm"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 13l4 4L19 7" />
                </svg>
                {success}
              </div>
            </motion.div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mg-input-group mb-6">
              <label htmlFor="forgot-email" className="mg-subtitle text-xs mb-1 block tracking-wider">EMAIL ADDRESS</label>
              <div className="relative">
                <input
                  type="email"
                  id="forgot-email"
                  value={email}
                  aria-required={true}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mg-input w-full bg-[rgba(var(--mg-panel-dark),0.5)] border border-[rgba(var(--mg-primary),0.2)] rounded-sm px-4 py-3 text-base md:px-3 md:py-2 md:text-sm focus:border-[rgba(var(--mg-primary),0.5)] focus:outline-none transition-colors font-quantify tracking-wide"
                  placeholder="ENTER EMAIL"
                  disabled={isLoading || !!success}
                />
                <CornerAccents size="xs" color="primary" opacity="low" />
              </div>
              <p className="text-xs text-[rgba(var(--mg-text),0.6)] mt-2">
                Enter the email address associated with your account, and we&apos;ll send you instructions to reset your password.
              </p>
            </div>

            <motion.button
              type="submit"
              className={`mg-button w-full py-2 px-4 relative overflow-hidden ${isLoading || success ? 'opacity-80' : 'hover:bg-[rgba(var(--mg-primary),0.1)]'}`}
              disabled={isLoading || !!success}
              whileTap={{ scale: 0.98 }}
            >
              <div className="relative z-10 font-quantify tracking-wider text-sm">
                {isLoading ? 'PROCESSING...' : 'SEND RESET INSTRUCTIONS'}
              </div>

              {/* Loading indicator */}
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="scanner-line"></div>
                </div>
              )}
            </motion.button>
          </form>

          {/* Back to login link */}
          <div className="mt-6 text-center text-xs text-[rgba(var(--mg-text),0.6)]">
            <span>Remember your password? </span>
            <Link href="/login" className="text-[rgba(var(--mg-primary),0.8)] hover:text-[rgba(var(--mg-primary),1)] hover:underline">
              Back to login
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
} 
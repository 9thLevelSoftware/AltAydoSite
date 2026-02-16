'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';
import { MobiGlasInput, MobiGlasButton, MobiGlasFormError } from '@/components/ui/mobiglas';
import CornerAccents from '@/components/ui/mobiglas/CornerAccents';

interface FormData {
  aydoHandle: string;
  email: string;
  discordName: string;
  rsiAccountName: string;
  password: string;
  confirmPassword: string;
}

export default function SignupForm() {
  const [formData, setFormData] = useState<FormData>({
    aydoHandle: '',
    email: '',
    discordName: '',
    rsiAccountName: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [passwordMatch, setPasswordMatch] = useState<'matching' | 'not-matching' | 'incomplete' | null>(null);
  const router = useRouter();

  // Check password match whenever password or confirmPassword changes
  useEffect(() => {
    if (formData.confirmPassword === '') {
      setPasswordMatch(null);
    } else if (formData.password === '') {
      setPasswordMatch('incomplete');
    } else if (formData.password === formData.confirmPassword) {
      setPasswordMatch('matching');
    } else {
      setPasswordMatch('not-matching');
    }
  }, [formData.password, formData.confirmPassword]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form fields
    if (!formData.aydoHandle || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        // Log the full response for debugging
        console.error('Signup error response:', data);
        setError(data.error || 'Failed to create account');
      } else {
        // Redirect to login page on success
        router.push('/login?signup=success');
      }
    } catch (error) {
      console.error('Signup error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred during signup');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mg-panel bg-[rgba(var(--mg-panel),0.8)] backdrop-blur-md p-6 rounded-sm relative">
          {/* Corner brackets */}
          <CornerAccents size="md" color="primary" opacity="medium" />

          <div className="text-center mb-6">
            <h2 className="mg-title text-xl mb-1">AYDO<span className="mg-subtitle font-light">CORP</span></h2>
            <div className="mg-subtitle text-xs tracking-wider">CREATE NEW ACCOUNT</div>
          </div>

          <form onSubmit={handleSubmit}>
            <MobiGlasFormError
              message={error}
              details={error.includes('Failed to create user') ? 'Database connection issue. Please try again later or contact support.' : undefined}
              className="mb-4"
            />

            <MobiGlasInput
              label="AYDOCORP HANDLE"
              id="signup-handle"
              name="aydoHandle"
              type="text"
              placeholder="ENTER HANDLE"
              required
              value={formData.aydoHandle}
              onChange={handleChange}
            />

            <MobiGlasInput
              label="EMAIL ADDRESS"
              id="signup-email"
              name="email"
              type="email"
              placeholder="ENTER EMAIL"
              required
              value={formData.email}
              onChange={handleChange}
            />

            <MobiGlasInput
              label="DISCORD NAME"
              id="signup-discord"
              name="discordName"
              type="text"
              placeholder="ENTER DISCORD NAME"
              value={formData.discordName}
              onChange={handleChange}
            />

            <MobiGlasInput
              label="RSI ACCOUNT NAME"
              id="signup-rsi"
              name="rsiAccountName"
              type="text"
              placeholder="ENTER RSI ACCOUNT"
              value={formData.rsiAccountName}
              onChange={handleChange}
            />

            <MobiGlasInput
              label="PASSWORD"
              id="signup-password"
              name="password"
              type="password"
              placeholder="ENTER PASSWORD"
              required
              autoComplete="new-password"
              value={formData.password}
              onChange={handleChange}
            />

            {/* Confirm Password - custom wrapper to preserve password match indicator */}
            <div className="mg-input-group mb-4">
              <label
                htmlFor="signup-confirm-password"
                className="block text-sm font-medium text-[rgba(var(--mg-text),0.8)] mb-2 font-quantify tracking-wider"
              >
                CONFIRM PASSWORD <span className="text-[rgba(var(--mg-error),0.9)] text-xs">*</span>
              </label>
              <div className="relative">
                <input
                  type="password"
                  id="signup-confirm-password"
                  name="confirmPassword"
                  required
                  aria-required={true}
                  aria-invalid={passwordMatch === 'not-matching'}
                  aria-describedby={passwordMatch === 'not-matching' ? 'signup-confirm-password-match' : undefined}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`
                    w-full px-4 py-3 bg-[rgba(var(--mg-background),0.6)]
                    rounded-sm text-white
                    focus:outline-none focus:ring-2 focus:ring-[rgba(var(--mg-primary),0.5)]
                    transition-all mg-input text-base md:text-sm
                    ${passwordMatch === 'matching'
                      ? 'border border-[rgba(var(--mg-success),0.4)] focus:border-[rgba(var(--mg-success),0.7)]'
                      : passwordMatch === 'not-matching'
                        ? 'border border-[rgba(var(--mg-danger),0.4)] focus:border-[rgba(var(--mg-danger),0.7)]'
                        : 'border border-[rgba(var(--mg-primary),0.3)] focus:border-[rgba(var(--mg-primary),0.5)]'
                    }
                  `}
                  placeholder="ENTER PASSWORD AGAIN"
                  autoComplete="new-password"
                />
                {/* Corner accents matching MobiGlasInput */}
                <CornerAccents size="xs" color="primary" opacity="low" className="pointer-events-none" />

                {/* Status indicator for password matching */}
                <AnimatePresence>
                  {passwordMatch && (
                    <motion.div
                      className="absolute right-3 w-5 h-5"
                      style={{ top: '8px' }}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.2 }}
                    >
                      {passwordMatch === 'matching' && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          viewBox="0 0 20 20"
                          fill="none"
                          stroke="rgba(20, 255, 170, 0.8)"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M4 10l4 4 8-8" />
                        </svg>
                      )}
                      {passwordMatch === 'not-matching' && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          viewBox="0 0 20 20"
                          fill="none"
                          stroke="rgba(255, 70, 70, 0.8)"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M15 5L5 15" />
                          <path d="M5 5L15 15" />
                        </svg>
                      )}
                      {passwordMatch === 'incomplete' && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          viewBox="0 0 20 20"
                          fill="none"
                          stroke="rgba(255, 190, 30, 0.8)"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M10 6v4" />
                          <path d="M10 14h.01" />
                          <circle cx="10" cy="10" r="7" />
                        </svg>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Password match message with sci-fi theme */}
              <AnimatePresence>
                {passwordMatch && (
                  <motion.div
                    id="signup-confirm-password-match"
                    className={`text-xs mt-1 font-quantify tracking-wider ${
                      passwordMatch === 'matching' ? 'text-[rgba(var(--mg-success),0.8)]' :
                      passwordMatch === 'not-matching' ? 'text-[rgba(var(--mg-danger),0.8)]' :
                      'text-[rgba(var(--mg-warning),0.8)]'
                    }`}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {passwordMatch === 'matching' && (
                      <div className="flex items-center">
                        <div className="mr-1 w-1 h-1 bg-[rgba(var(--mg-success),0.8)] rounded-full"></div>
                        <span>AUTHENTICATION PROTOCOL VERIFIED</span>
                      </div>
                    )}
                    {passwordMatch === 'not-matching' && (
                      <div className="flex items-center">
                        <div className="mr-1 w-1 h-1 bg-[rgba(var(--mg-danger),0.8)] rounded-full"></div>
                        <span>SECURITY AUTHENTICATION FAILURE: CODE MISMATCH</span>
                      </div>
                    )}
                    {passwordMatch === 'incomplete' && (
                      <div className="flex items-center">
                        <div className="mr-1 w-1 h-1 bg-[rgba(var(--mg-warning),0.8)] rounded-full"></div>
                        <span>INPUT PRIMARY SECURITY CODE FIRST</span>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <MobiGlasButton
              type="submit"
              variant="primary"
              fullWidth
              isLoading={isLoading}
              disabled={isLoading}
              className="mt-6"
            >
              CREATE ACCOUNT
            </MobiGlasButton>
          </form>

          <div className="mt-4 text-center text-[rgba(var(--mg-text),0.5)] text-xs">
            <span>Already have an account? <Link href="/login" className="text-[rgba(var(--mg-primary),0.8)] hover:text-[rgba(var(--mg-primary),1)]">Login instead</Link></span>
          </div>
        </div>

        <div className="mg-text text-xs text-center mt-4 text-[rgba(var(--mg-text),0.6)]">
          <div className="inline-flex items-center">
            <div className="w-1 h-1 bg-[rgba(var(--mg-primary),0.4)] mr-1 rounded-full"></div>
            <span className="font-quantify tracking-wide">AYDO CORP SECURITY SYSTEM</span>
            <div className="w-1 h-1 bg-[rgba(var(--mg-primary),0.4)] ml-1 rounded-full"></div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

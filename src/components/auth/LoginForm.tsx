'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'motion/react';
import { bgUrl } from '@/lib/cdn';
import Link from 'next/link';
import { useSession, signIn } from 'next-auth/react';
import LoginLoading from './LoginLoading';

// SEC-06: Validate callback URLs to prevent open redirect attacks
function isValidCallbackUrl(url: string | null | undefined): string {
  if (!url) return '/';
  // Must be relative path, no protocol-relative URLs
  if (!url.startsWith('/') || url.startsWith('//')) return '/';
  // Reject URLs with encoded characters that could bypass checks
  try {
    const decoded = decodeURIComponent(url);
    if (decoded.startsWith('//') || decoded.includes('://')) return '/';
  } catch {
    return '/';
  }
  return url;
}

export default function LoginForm() {
  const [aydoHandle, setAydoHandle] = useState('');
  const [password, setPassword] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authError, setAuthError] = useState<string | null>(null);
  const { data: session, status, update } = useSession();

  // Redirect to dashboard only if explicitly authenticated
  useEffect(() => {
    // Only redirect if we have a confirmed authenticated session
    // and we're not in the middle of a login attempt
    if (status === 'authenticated' && session && session.user && !isLoading) {
      console.log("Login page - User is authenticated, preparing to redirect to landing page",
        "user:", session.user.name, "clearance:", session.user.clearanceLevel);

      // Check if we have a reset parameter - if so, don't auto-redirect
      if (searchParams?.get('reset') === 'true') {
        console.log("Reset parameter detected, not auto-redirecting to landing page");
        return;
      }

      // Get the callback URL if it exists, validate to prevent open redirect
      const callbackUrl = isValidCallbackUrl(searchParams?.get('callbackUrl'));
      router.replace(callbackUrl);
    }
  }, [status, router, session, isLoading, searchParams]);

  useEffect(() => {
    // Check if redirected from successful signup
    if (searchParams?.get('signup') === 'success') {
      setSuccessMessage('Account created successfully. Please log in.');
    }

    // Check if redirected from successful password reset
    if (searchParams?.get('reset') === 'success') {
      setSuccessMessage('Password reset successfully. Please log in with your new password.');
    }

    // Check if there was an error parameter
    if (searchParams?.get('error')) {
      if (searchParams.get('error') === 'token_expired') {
        setAuthError('Your session has expired. Please log in again.');
      } else if (searchParams.get('error') === 'session_error') {
        setAuthError('There was a problem with your session. Please log in again.');
      } else {
        setAuthError('Authentication failed. Please check your credentials and try again.');
      }
    }
  }, [searchParams]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setAuthError(null);

    if (!aydoHandle || !password) {
      setAuthError("Please enter both your AydoCorp Handle and password.");
      setIsLoading(false);
      return;
    }

    console.log("Login attempt starting for:", aydoHandle);

    try {
      console.log("Calling signIn with credentials provider");
      const result = await signIn('credentials', {
        aydoHandle,
        password,
        redirect: false,
        callbackUrl: isValidCallbackUrl(searchParams?.get('callbackUrl'))
      });

      console.log("SignIn result:", result);

      if (result?.error) {
        console.error("Authentication error:", result.error);
        // Improved error handling for specific connection issues
        if (result.error.includes("Database connection error")) {
          setAuthError("Database connection failed. The system is currently unavailable. Please try again later or contact support.");
        } else {
          setAuthError("Invalid credentials. Please check your AydoCorp Handle and password.");
        }
        setIsLoading(false);
      } else if (result?.ok === true) {
        // Wait for the session to be updated before redirecting
        console.log("Authentication successful, updating session");

        try {
          // Force a session update and wait for it to complete
          await update();

          // Clear the login animation shown flag so it will display after redirect
          if (typeof window !== 'undefined') {
            console.log("Clearing login animation flag to show animation on landing page");
            localStorage.removeItem('loginAnimationShown');
          }

          // Use router.push instead of replace to ensure proper navigation
          setIsLoading(false);
          console.log("Redirecting to landing page...");
          // Make sure we're using the correct URL path
          router.push(result.url || '/');
        } catch (updateError) {
          console.error("Error updating session:", updateError);
          setAuthError("Failed to establish session. Please try again.");
          setIsLoading(false);
        }
      } else {
        // Unexpected result
        console.error("Unexpected authentication result:", result);
        setAuthError("An unexpected error occurred during authentication. Please try again.");
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Authentication error:', error);
      setAuthError('An unexpected error occurred during authentication. Please try again later.');
      setIsLoading(false);
    }
  };

  // If still loading the session, show loading state
  if (status === 'loading') {
    return <LoginLoading />;
  }

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
          <div className="absolute top-0 left-0 w-5 h-5 border-l border-t border-[rgba(var(--mg-primary),0.5)]"></div>
          <div className="absolute top-0 right-0 w-5 h-5 border-r border-t border-[rgba(var(--mg-primary),0.5)]"></div>
          <div className="absolute bottom-0 left-0 w-5 h-5 border-l border-b border-[rgba(var(--mg-primary),0.5)]"></div>
          <div className="absolute bottom-0 right-0 w-5 h-5 border-r border-b border-[rgba(var(--mg-primary),0.5)]"></div>

          <div className="text-center mb-6">
            <h2 className="mg-title text-xl mb-1">AYDO<span className="mg-subtitle font-light">CORP</span></h2>
            <div className="mg-subtitle text-xs tracking-wider">EMPLOYEE AUTHENTICATION</div>
          </div>

          {/* Success message for signup */}
          {successMessage && (
            <motion.div
              className="mb-4 p-2 bg-[rgba(var(--mg-success),0.1)] border border-[rgba(var(--mg-success),0.3)] text-[rgba(var(--mg-success),0.8)] text-xs rounded-sm"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 13l4 4L19 7" />
                </svg>
                {successMessage}
              </div>
            </motion.div>
          )}

          {authError && (
            <motion.div
              className="mb-4 p-2 bg-[rgba(var(--mg-error),0.1)] border border-[rgba(var(--mg-error),0.3)] text-[rgba(var(--mg-error),0.8)] text-xs rounded-sm"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {authError}
              </div>
            </motion.div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mg-input-group mb-4">
              <label htmlFor="login-handle" className="mg-subtitle text-xs mb-1 block tracking-wider">AYDOCORP HANDLE</label>
              <div className="relative">
                <input
                  type="text"
                  id="login-handle"
                  value={aydoHandle}
                  onChange={(e) => setAydoHandle(e.target.value)}
                  className="mg-input w-full bg-[rgba(var(--mg-panel-dark),0.5)] border border-[rgba(var(--mg-primary),0.2)] rounded-sm px-4 py-3 text-base md:px-3 md:py-2 md:text-sm focus:border-[rgba(var(--mg-primary),0.5)] focus:outline-none transition-colors font-quantify tracking-wide"
                  placeholder="ENTER HANDLE"
                  autoComplete="username"
                  aria-required={true}
                />
                <div className="absolute top-0 left-0 w-[6px] h-[6px] border-l border-t border-[rgba(var(--mg-primary),0.4)]"></div>
              </div>
            </div>

            <div className="mg-input-group mb-6">
              <label htmlFor="login-password" className="mg-subtitle text-xs mb-1 block tracking-wider">PASSWORD</label>
              <div className="relative">
                <input
                  type="password"
                  id="login-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mg-input w-full bg-[rgba(var(--mg-panel-dark),0.5)] border border-[rgba(var(--mg-primary),0.2)] rounded-sm px-4 py-3 text-base md:px-3 md:py-2 md:text-sm focus:border-[rgba(var(--mg-primary),0.5)] focus:outline-none transition-colors font-quantify tracking-wide"
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  aria-required={true}
                />
                <div className="absolute top-0 left-0 w-[6px] h-[6px] border-l border-t border-[rgba(var(--mg-primary),0.4)]"></div>
              </div>
              <div className="flex justify-end mt-1">
                <Link
                  href="/forgot-password"
                  className="text-xs text-[rgba(var(--mg-primary),0.8)] hover:text-[rgba(var(--mg-primary),1)] hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>
            </div>

            <motion.button
              type="submit"
              className={`mg-button w-full py-2 px-4 relative overflow-hidden ${isLoading ? 'opacity-80' : 'hover:bg-[rgba(var(--mg-primary),0.1)]'}`}
              disabled={isLoading}
              whileTap={{ scale: 0.98 }}
            >
              <div className="relative z-10 font-quantify tracking-wider text-sm">
                {isLoading ? 'AUTHENTICATING...' : 'ACCESS SYSTEM'}
              </div>

              {/* Loading indicator */}
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="scanner-line"></div>
                </div>
              )}
            </motion.button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center">
            <div className="flex-1 h-px bg-[rgba(var(--mg-primary),0.2)]"></div>
            <span className="px-3 text-xs text-[rgba(var(--mg-text),0.6)] font-quantify tracking-wider">OR</span>
            <div className="flex-1 h-px bg-[rgba(var(--mg-primary),0.2)]"></div>
          </div>

          {/* Discord OAuth Button */}
          <motion.button
            type="button"
            onClick={() => signIn('discord', { callbackUrl: isValidCallbackUrl(searchParams?.get('callbackUrl')) })}
            className="mg-button w-full py-2 px-4 mb-4 relative overflow-hidden bg-[rgba(88,101,242,0.1)] border border-[rgba(88,101,242,0.3)] hover:bg-[rgba(88,101,242,0.2)] transition-colors"
            whileTap={{ scale: 0.98 }}
            disabled={isLoading}
          >
            <div className="relative z-10 flex items-center justify-center font-quantify tracking-wider text-sm">
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0002 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9554 2.4189-2.1568 2.4189Z"/>
              </svg>
              SIGN IN WITH DISCORD
            </div>
          </motion.button>

          {/* Sign up link */}
          <div className="mt-6 text-center text-xs text-[rgba(var(--mg-text),0.6)]">
            <span>Don&apos;t have an account? </span>
            <Link href="/signup" className="text-[rgba(var(--mg-primary),0.8)] hover:text-[rgba(var(--mg-primary),1)] hover:underline">
              Register here
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
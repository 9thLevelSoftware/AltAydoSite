/**
 * @deprecated Use useToast() for system-level notifications or MobiGlasFormError for form-level errors.
 * This component is kept for backward compatibility but should not be used in new code.
 * Planned for removal in Phase 15.
 */

import React from 'react';
import { motion } from 'motion/react';

interface ErrorNotificationProps {
  message: string;
  onClose: () => void;
  resetTime?: number | null;
  remainingRequests?: number | null;
}

const ErrorNotification: React.FC<ErrorNotificationProps> = ({ 
  message, 
  onClose, 
  resetTime = null, 
  remainingRequests = null 
}) => {
  // Format the reset time as a countdown
  const formatResetTime = (resetTime: number) => {
    const now = Date.now();
    const diff = Math.max(0, resetTime - now);
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed top-4 right-4 z-50 mg-panel-error max-w-md overflow-hidden"
    >
      {/* Main notification content */}
      <div className="relative p-4 border border-[rgba(var(--mg-error),0.4)] bg-[rgba(var(--mg-panel-dark),0.9)] backdrop-blur-sm">
        {/* Corner decorations */}
        <div className="absolute top-0 right-0 w-[15px] h-[15px]">
          <div className="absolute top-0 right-0 w-[2px] h-[8px] bg-[rgba(var(--mg-error),0.8)]"></div>
          <div className="absolute top-0 right-0 w-[8px] h-[2px] bg-[rgba(var(--mg-error),0.8)]"></div>
        </div>
        <div className="absolute bottom-0 left-0 w-[15px] h-[15px]">
          <div className="absolute bottom-0 left-0 w-[2px] h-[8px] bg-[rgba(var(--mg-error),0.8)]"></div>
          <div className="absolute bottom-0 left-0 w-[8px] h-[2px] bg-[rgba(var(--mg-error),0.8)]"></div>
        </div>

        {/* Scanning line effect */}
        <motion.div
          initial={{ y: '-100%' }}
          animate={{ y: '100%' }}
          transition={{ 
            repeat: Infinity, 
            duration: 2,
            ease: "linear"
          }}
          className="absolute inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-[rgba(var(--mg-error),0.8)] to-transparent pointer-events-none"
        />
        
        {/* Alert icon and content */}
        <div className="flex items-start">
          {/* Alert icon */}
          <div className="flex-shrink-0 mr-3">
            <div className="relative w-8 h-8">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full border-2 border-[rgba(var(--mg-error),0.3)]"
              />
              <div className="absolute inset-2 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[rgba(var(--mg-error),0.9)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
          </div>
          
          {/* Error content */}
          <div className="flex-grow">
            <h3 className="text-lg font-quantify tracking-wider text-[rgba(var(--mg-error),0.9)] mb-1">SYSTEM ALERT</h3>
            <p className="text-[rgba(var(--mg-error),0.8)]">{message}</p>
            
            {resetTime && (
              <p className="text-sm mt-1 text-[rgba(var(--mg-error),0.7)]">
                Reset in: {formatResetTime(resetTime)}
              </p>
            )}
            
            {remainingRequests !== null && (
              <p className="text-sm mt-1 text-[rgba(var(--mg-error),0.7)]">
                Remaining requests: {remainingRequests}
              </p>
            )}
          </div>
          
          {/* Close button */}
          <button
            onClick={onClose}
            className="ml-4 text-[rgba(var(--mg-error),0.7)] hover:text-[rgba(var(--mg-error),1)] transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Bottom border with gradient */}
      <div className="h-[2px] bg-gradient-to-r from-transparent via-[rgba(var(--mg-error),0.8)] to-transparent"></div>
    </motion.div>
  );
};

export default ErrorNotification; 
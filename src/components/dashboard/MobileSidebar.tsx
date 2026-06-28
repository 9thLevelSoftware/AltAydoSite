'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import DashboardSidebar from './DashboardSidebar';

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed left-0 top-0 bottom-0 w-[280px] z-50 lg:hidden bg-[rgba(var(--mg-panel-dark),1)] border-r border-[rgba(var(--mg-primary),0.3)]"
          >
            <div className="flex flex-col h-full">
              <div className="p-4 flex justify-end">
                <button
                  onClick={onClose}
                  className="p-3 min-h-[44px] min-w-[44px] flex items-center justify-center text-[rgba(var(--mg-text),0.7)] hover:text-[rgba(var(--mg-primary),1)] transition-colors"
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <div className="flex-grow overflow-hidden pb-6 px-2">
                {/* Reuse the existing sidebar content */}
                <DashboardSidebar onNavigate={onClose} />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

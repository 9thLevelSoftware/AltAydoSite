'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';

interface DataFeedSectionProps {
  isDataFeedActive: boolean;
  connectionProgress: number;
  connectionComplete: boolean;
  connectionMessages: string[];
  onProgressUpdate: (progress: number) => void;
  onConnectionComplete: () => void;
  onAddMessage: (message: string) => void;
}

export default function DataFeedSection({
  isDataFeedActive,
  connectionProgress,
  connectionComplete,
  connectionMessages,
  onProgressUpdate,
  onConnectionComplete,
  onAddMessage
}: DataFeedSectionProps) {
  // Initialize data feed connection
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isDataFeedActive && !connectionComplete) {
      // Connection messages
      const techMessages = [
        "Establishing quantum relay link...",
        "Accessing corporate historical archives...",
        "Decrypting temporal data matrices...",
        "Synthesizing corporate evolution patterns...",
        "Mapping historical significance nodes...",
        "Reconstructing timeline interface...",
        "Validating data chronology...",
        "Rendering historical visualization..."
      ];

      // Add initial message
      if (connectionMessages.length === 0) {
        onAddMessage(techMessages[0]);
      }

      interval = setInterval(() => {
        onProgressUpdate(connectionProgress + 1);

        // Add a new message at certain progress points
        if ((connectionProgress + 1) % 14 === 0 && connectionProgress < 100) {
          const messageIndex = Math.floor((connectionProgress + 1) / 14);
          if (messageIndex < techMessages.length) {
            onAddMessage(techMessages[messageIndex]);
          }
        }

        if (connectionProgress >= 100) {
          clearInterval(interval);
          onConnectionComplete();
          onAddMessage("Connection established successfully");
        }
      }, 40);
    }

    return () => clearInterval(interval);
  }, [isDataFeedActive, connectionProgress, connectionComplete, connectionMessages.length, onProgressUpdate, onConnectionComplete, onAddMessage]);

  if (!isDataFeedActive || connectionComplete) return null;

  return (
    <>
      {/* Data Connection Interface - Shows when button is clicked */}
      <section className="py-8 bg-black relative">
        <div className="max-w-4xl mx-auto px-4">
          <div className="p-6 border border-[rgba(var(--mg-primary),0.3)] bg-black/70 relative rounded-lg overflow-hidden">
            <div className="absolute inset-0 opacity-20 bg-gradient-to-r from-[rgba(var(--mg-primary),0.2)] to-[rgba(var(--mg-accent),0.2)]"></div>

            {/* Decorative grid lines */}
            <div className="absolute inset-0 grid grid-cols-12 gap-4 opacity-20 pointer-events-none">
              {Array(12).fill(0).map((_, i) => (
                <div key={`grid-col-${i}`} className="h-full w-px bg-[rgba(var(--mg-primary),0.3)]"></div>
              ))}
              {Array(6).fill(0).map((_, i) => (
                <div key={`grid-row-${i}`} className="w-full h-px bg-[rgba(var(--mg-primary),0.3)] absolute" style={{ top: `${i * 20}%` }}></div>
              ))}
            </div>

            {/* Scanning animation overlay */}
            <div className="absolute inset-0 overflow-hidden">
              <div
                className="absolute top-0 h-full w-2 bg-[rgba(var(--mg-primary),0.3)] blur-sm"
                style={{
                  boxShadow: '0 0 20px rgba(0, 215, 255, 0.5), 0 0 40px rgba(0, 215, 255, 0.3), 0 0 60px rgba(0, 215, 255, 0.2)',
                  animation: 'scanline-vertical 2s linear infinite'
                }}
              ></div>
            </div>

            <div className="text-center relative z-10">
              <h3 className="text-xl font-bold mb-4 text-[rgba(var(--mg-primary),1)] flex items-center justify-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full bg-[rgba(var(--mg-primary),1)] animate-pulse"></span>
                Historical Data Connection
              </h3>

              <div className="space-y-4">
                {/* Progress bar */}
                <div className="w-full h-5 bg-black/50 rounded-full overflow-hidden p-0.5 border border-[rgba(var(--mg-primary),0.3)]">
                  <div className="relative h-full">
                    <div
                      className="h-full rounded-full transition-all duration-100"
                      style={{
                        width: `${connectionProgress}%`,
                        background: 'linear-gradient(to right, rgba(0, 215, 255, 0.6), rgba(0, 255, 200, 0.6))'
                      }}
                    ></div>
                    {/* Progress markers */}
                    {[25, 50, 75].map((mark) => (
                      <div
                        key={mark}
                        className="absolute top-0 bottom-0 w-px bg-[rgba(var(--mg-text),0.3)]"
                        style={{ left: `${mark}%` }}
                      ></div>
                    ))}
                    {/* Percentage indicator */}
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-[rgba(var(--mg-text),1)]">
                      {connectionProgress.toFixed(0)}%
                    </div>
                  </div>
                </div>

                <div className="text-[rgba(var(--mg-primary),0.9)] font-mono flex items-center justify-center gap-2 text-sm">
                  <span className="inline-block h-2 w-2 bg-[rgba(var(--mg-primary),0.9)] rounded-full animate-pulse"></span>
                  ESTABLISHING CONNECTION: {connectionProgress.toFixed(0)}% COMPLETE
                </div>

                {/* Terminal-like message display */}
                <div className="mt-4 p-3 bg-black/70 border border-[rgba(var(--mg-primary),0.3)] rounded text-left h-32 overflow-y-auto font-mono text-xs">
                  <div className="flex items-center text-[rgba(var(--mg-text),0.7)] mb-2">
                    <span className="text-[rgba(var(--mg-primary),0.9)] mr-2">&gt;&gt;&gt;</span> Feed initialization at {new Date().toLocaleTimeString()}
                  </div>
                  {connectionMessages.map((message, idx) => (
                    <div key={idx} className="text-[rgba(var(--mg-text),0.7)] ml-4 mb-1">
                      <span className="text-[rgba(var(--mg-primary),0.9)] mr-2">&gt;</span> {message}
                    </div>
                  ))}
                  <div className="text-[rgba(var(--mg-text),0.7)] inline-flex ml-4">
                    <span className="text-[rgba(var(--mg-primary),0.9)] mr-2">&gt;</span>
                    <span className="animate-pulse">_</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Connection complete animation - shows briefly when connection finishes */}
      {connectionComplete && (
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 1, delay: 1 }}
          className="fixed inset-0 z-50 bg-black flex items-center justify-center pointer-events-none"
        >
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ duration: 0.8 }}
            >
              <svg
                className="w-16 h-16 mx-auto text-[rgba(var(--mg-primary),1)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <motion.path
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.5 }}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </motion.div>
            <motion.p
              className="text-[rgba(var(--mg-primary),1)] mt-4 font-quantify tracking-wider"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              CONNECTION ESTABLISHED
            </motion.p>
          </div>
        </motion.div>
      )}
    </>
  );
}
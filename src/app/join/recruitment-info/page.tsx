'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import Link from 'next/link';

export default function RecruitmentInfo() {
  const [time, setTime] = useState(new Date());
  const [showJoinButton, setShowJoinButton] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    
    // Show join button after a delay for effect
    const buttonTimer = setTimeout(() => {
      setShowJoinButton(true);
    }, 2000);
    
    return () => {
      clearInterval(timer);
      clearTimeout(buttonTimer);
    };
  }, []);

  return (
    <>
      {/* Status Bar */}
      <div className="sticky top-0 z-40 bg-black/90 border-b border-[rgba(var(--mg-primary),0.2)] py-1.5 px-4 text-xs text-[rgba(var(--mg-primary),0.8)] flex justify-between backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-[rgba(var(--mg-success),1)] animate-pulse"></span>
          <span className="mg-text text-xs tracking-wider">RECRUITMENT PROTOCOL</span>
          <span className="text-[rgba(var(--mg-text),0.5)] mx-4">|</span>
          <span className="text-[rgba(var(--mg-text),0.7)]">STATUS:</span> <span className="text-[rgba(var(--mg-primary),0.9)] ml-1 mg-subtitle">ACTIVE</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[rgba(var(--mg-text),0.7)]">QUANTUM LINK:</span> <span className="text-[rgba(var(--mg-success),1)] ml-1">ACTIVE</span>
          <span className="ml-4 font-mono text-[rgba(var(--mg-text),0.8)]">{time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
        </div>
      </div>

      <section className="relative pt-24 pb-16 min-h-screen">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-black via-black/90 to-black"></div>
          <div className="absolute inset-0 circuit-bg opacity-10"></div>
          <div className="absolute inset-0 mg-grid-bg opacity-10"></div>
          
          {/* Animated scan lines */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-0 w-full h-[1px] bg-[rgba(var(--mg-primary),0.4)] animate-scanline"></div>
            <div className="absolute left-0 h-full w-[1px] bg-[rgba(var(--mg-primary),0.4)] animate-scanline-vertical"></div>
          </div>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="mg-container p-8 relative overflow-hidden"
          >
            {/* Corner brackets */}
            <div className="absolute top-0 left-0 w-12 h-12 border-l-2 border-t-2 border-[rgba(var(--mg-primary),0.6)]"></div>
            <div className="absolute top-0 right-0 w-12 h-12 border-r-2 border-t-2 border-[rgba(var(--mg-primary),0.6)]"></div>
            <div className="absolute bottom-0 left-0 w-12 h-12 border-l-2 border-b-2 border-[rgba(var(--mg-primary),0.6)]"></div>
            <div className="absolute bottom-0 right-0 w-12 h-12 border-r-2 border-b-2 border-[rgba(var(--mg-primary),0.6)]"></div>
            
            {/* Holographic effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute inset-0 holo-noise opacity-10"></div>
              <div className="absolute inset-0 holo-scan opacity-5"></div>
              <motion.div 
                className="absolute w-full h-1"
                style={{ 
                  top: '50%',
                  background: 'linear-gradient(to right, transparent, rgba(0, 215, 255, 0.3), transparent)'
                }}
                animate={{
                  top: ['0%', '100%', '0%']
                }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: "linear"
                }}
              />
            </div>
            
            <div className="relative z-10 text-center">
              <motion.h1 
                className="mg-title text-3xl font-bold mb-4"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                RECRUITMENT PROTOCOL
              </motion.h1>
              
              <motion.div 
                className="h-0.5 w-1/2 mx-auto mb-8 bg-gradient-to-r from-transparent via-[rgba(var(--mg-primary),0.8)] to-transparent"
                initial={{ width: 0 }}
                animate={{ width: '50%' }}
                transition={{ duration: 0.8, delay: 0.3 }}
              ></motion.div>
              
              <motion.div 
                className="text-left max-w-2xl mx-auto space-y-6 text-[rgba(var(--mg-text),0.9)]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <p>
                  Thank you for your interest in joining AydoCorp. Our recruitment process is designed to ensure that we bring in dedicated individuals who align with our values and can contribute to our mission.
                </p>
                
                <div className="mg-container p-4 bg-[rgba(var(--mg-background),0.4)]">
                  <h2 className="mg-subtitle text-lg mb-4">JOIN PROCESS:</h2>
                  
                  <ol className="space-y-4 ml-6 list-decimal">
                    <li className="text-sm">
                      <span className="text-[rgba(var(--mg-primary),0.9)] font-bold">Join our Discord server</span> - Our Discord server is the central hub for all AydoCorp communications and activities.
                    </li>
                    <li className="text-sm">
                      <span className="text-[rgba(var(--mg-primary),0.9)] font-bold">Assign yourself the Prospective Member role</span> - This will give you access to public channels.
                    </li>
                    <li className="text-sm">
                      <span className="text-[rgba(var(--mg-primary),0.9)] font-bold">Familiarize yourself with our rules and structure</span> - Take some time to understand how AydoCorp operates.
                    </li>
                    <li className="text-sm">
                      <span className="text-[rgba(var(--mg-primary),0.9)] font-bold">After two weeks, request an interview</span> - This allows you to get to know us and for us to learn more about you.
                    </li>
                    <li className="text-sm">
                      <span className="text-[rgba(var(--mg-primary),0.9)] font-bold">Complete the interview process</span> - If successful, you&apos;ll be welcomed as a full member of AydoCorp.
                    </li>
                  </ol>
                </div>
                
                <div className="mt-4">
                  <h2 className="mg-subtitle text-lg mb-2">IMPORTANT INFORMATION:</h2>
                  <ul className="space-y-2 ml-6 list-disc text-sm">
                    <li>AydoCorp is not an exclusive organization - you may maintain membership in other organizations.</li>
                    <li>We have a zero-tolerance policy for criminal activity within official operations.</li>
                    <li>You will need to use the same username in Discord as your in-game Star Citizen handle.</li>
                    <li>We focus on logistics, transportation, and related activities within Star Citizen.</li>
                  </ul>
                </div>
                
                <div className="pt-6 text-center">
                  {showJoinButton ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5 }}
                    >
                      <a
                        href="https://discord.gg/aydocorp"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mg-button inline-block px-8 py-3 text-base relative overflow-hidden group"
                      >
                        <div className="absolute inset-0 overflow-hidden radar-sweep opacity-0 group-hover:opacity-20"></div>
                        <span className="relative z-10 flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 640 512" fill="currentColor">
                            <path d="M524.531,69.836a1.5,1.5,0,0,0-.764-.7A485.065,485.065,0,0,0,404.081,32.03a1.816,1.816,0,0,0-1.923.91,337.461,337.461,0,0,0-14.9,30.6,447.848,447.848,0,0,0-134.426,0,309.541,309.541,0,0,0-15.135-30.6,1.89,1.89,0,0,0-1.924-.91A483.689,483.689,0,0,0,116.085,69.137a1.712,1.712,0,0,0-.788.676C39.068,183.651,18.186,294.69,28.43,404.354a2.016,2.016,0,0,0,.765,1.375A487.666,487.666,0,0,0,176.02,479.918a1.9,1.9,0,0,0,2.063-.676A348.2,348.2,0,0,0,208.12,430.4a1.86,1.86,0,0,0-1.019-2.588,321.173,321.173,0,0,1-45.868-21.853,1.885,1.885,0,0,1-.185-3.126c3.082-2.309,6.166-4.711,9.109-7.137a1.819,1.819,0,0,1,1.9-.256c96.229,43.917,200.41,43.917,295.5,0a1.812,1.812,0,0,1,1.924.233c2.944,2.426,6.027,4.851,9.132,7.16a1.884,1.884,0,0,1-.162,3.126,301.407,301.407,0,0,1-45.89,21.83,1.875,1.875,0,0,0-1,2.611,391.055,391.055,0,0,0,30.014,48.815,1.864,1.864,0,0,0,2.063.7A486.048,486.048,0,0,0,610.7,405.729a1.882,1.882,0,0,0,.765-1.352C623.729,277.594,590.933,167.465,524.531,69.836ZM222.491,337.58c-28.972,0-52.844-26.587-52.844-59.239S193.056,219.1,222.491,219.1c29.665,0,53.306,26.82,52.843,59.239C275.334,310.993,251.924,337.58,222.491,337.58Zm195.38,0c-28.971,0-52.843-26.587-52.843-59.239S388.437,219.1,417.871,219.1c29.667,0,53.307,26.82,52.844,59.239C470.715,310.993,447.538,337.58,417.871,337.58Z" />
                          </svg>
                          JOIN OUR DISCORD SERVER
                        </span>
                      </a>
                    </motion.div>
                  ) : (
                    <div className="h-12 flex items-center justify-center">
                      <div className="text-[rgba(var(--mg-primary),0.8)] font-mono text-sm mg-flicker">
                        CONNECTING TO RECRUITMENT SERVER...
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="pt-6 text-center text-xs text-[rgba(var(--mg-text),0.6)]">
                  <Link href="/join" className="hover:text-[rgba(var(--mg-primary),0.9)] transition-colors">
                    ← Return to Careers Page
                  </Link>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
} 
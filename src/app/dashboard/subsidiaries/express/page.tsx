'use client';

import React from 'react';
import { motion } from 'motion/react';
import Image from 'next/image';
import { cdn } from '@/lib/cdn';
import Link from 'next/link';

export default function AydoExpressPage() {
  return (
    <div className="min-h-screen bg-black bg-opacity-95 p-6 relative">
      {/* Holographic background effects */}
      <div className="absolute inset-0 bg-holo-grid bg-[length:50px_50px] opacity-5 pointer-events-none"></div>
      <div className="hexagon-bg absolute inset-0 opacity-5 pointer-events-none"></div>

      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/dashboard/subsidiaries" className="inline-flex items-center text-sm text-[rgba(var(--mg-text),0.7)] hover:text-[rgba(var(--mg-primary),0.9)]">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Subsidiaries
          </Link>
        </div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8 flex items-center"
        >
          <div className="h-16 w-16 relative mr-4">
            <Image 
              src={cdn('/images/Aydo_Express.png')} 
              alt="AydoExpress Logo" 
              fill 
              className="object-contain"
            />
          </div>
          <div>
            <h1 className="mg-title text-2xl sm:text-3xl lg:text-4xl mb-2">AydoExpress - Logistics</h1>
            <div className="text-[rgba(var(--mg-primary),0.8)] font-quantify">&quot;We Move the Future.&quot;</div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mg-panel bg-[rgba(var(--mg-panel-dark),0.4)] p-6 rounded-sm relative mb-8"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[rgba(0,210,255,0.6)] to-transparent"></div>
          
          <h2 className="mg-subtitle text-xl mb-6">Overview</h2>
          
          <div className="mg-text space-y-6">
            <p>
              AydoExpress is the flagship subsidiary of AydoCorp — the only division that directly interfaces with clients, contracts, and the greater Star Citizen community. Originally founded in 2946 as Aydo City Delivery, this small startup gained notoriety after flying high-end goods into remote and underserved frontier locations. After a string of successful contracts, it rebranded in 2950 as AydoExpress following a merger with Seahorse Fisheries.
            </p>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mg-panel bg-[rgba(var(--mg-panel-dark),0.4)] p-6 rounded-sm relative mb-8"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[rgba(0,210,255,0.6)] to-transparent"></div>
          
          <h2 className="mg-subtitle text-xl mb-6">Lore Summary</h2>
          
          <div className="mg-text space-y-6">
            <p>
              AydoExpress rose to prominence when its founder, Christoff Revan, personally delivered critical supplies and comforts to miners at Pinecone — an underserved and isolated outpost in the Ellis system. This bold move not only established AydoExpress&apos;s reputation for reliability and reach but also revealed a gap in the market that few others dared to serve: high-risk, low-access zones where traditional logistics struggled.
            </p>
            
            <p>
              Since then, AydoExpress has become synonymous with precision delivery under pressure, specializing in mid- to large-scale cargo hauling, personnel transport, and custom logistics solutions. Whether working for independent clients, allied organizations, or participating in corporate convoys, AydoExpress is the operational face of AydoCorp.
            </p>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mg-panel bg-[rgba(var(--mg-panel-dark),0.4)] p-6 rounded-sm relative"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[rgba(0,210,255,0.6)] to-transparent"></div>
          
          <h2 className="mg-subtitle text-xl mb-6">Operations Profile</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <ul className="space-y-3">
                {[
                  "Cargo hauling (legal goods only)",
                  "Personnel shuttle & escort",
                  "Convoy logistics",
                  "Infrastructure supply runs",
                  "Special event contracts & in-org missions"
                ].map((item, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * i, duration: 0.5 }}
                    className="flex items-start"
                  >
                    <div className="h-5 w-5 flex-shrink-0 flex items-center justify-center bg-[rgba(0,210,255,0.2)] rounded-full mr-3 mt-0.5">
                      <div className="h-2 w-2 rounded-full bg-[rgba(0,210,255,0.8)]"></div>
                    </div>
                    <span className="mg-text">{item}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
            
            <div>
              <h3 className="mg-subtitle text-lg mb-4">Fleet Includes</h3>
              <p className="mg-text">
                Hercules series, Hull series, Caterpillar, Freelancer MAX, Pisces for personnel shuttle, and other support vehicles.
              </p>
            </div>
          </div>
          
          {/* Animated data stream */}
          <div className="absolute inset-x-0 bottom-0 h-px">
            <motion.div 
              className="h-full bg-gradient-to-r from-transparent via-[rgba(0,210,255,0.8)] to-transparent"
              animate={{ 
                x: ['-100%', '100%'] 
              }}
              transition={{ 
                duration: 3, 
                repeat: Infinity,
                ease: "linear"
              }}
            />
          </div>
        </motion.div>
        
        <div className="mt-6 text-center text-xs text-[rgba(var(--mg-text),0.6)]">
          AYDO INTERGALACTIC CORPORATION - SUBSIDIARIES
        </div>
      </div>
    </div>
  );
} 
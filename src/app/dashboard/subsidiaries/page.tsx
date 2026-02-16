'use client';

import React from 'react';
import { motion } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';
import { cdn } from '@/lib/cdn';

export default function SubsidiariesIndexPage() {
  const subsidiaries = [
    {
      id: 'aydoexpress',
      name: 'AydoExpress',
      subtitle: 'Logistics & Transport Division',
      description: 'Specializing in logistics and personnel transport',
      icon: cdn('/images/New_Aydo_Express.png'),
      color: 'rgba(0, 210, 255, 0.8)',
      link: '/dashboard/subsidiaries/express'
    },
    {
      id: 'empyrion',
      name: 'Empyrion Industries',
      subtitle: 'Industrial Operations Division',
      description: 'Focused on industrial production and resource operations',
      icon: cdn('/images/New_Empyrion_Industries.PNG'),
      color: 'rgba(200, 220, 255, 0.8)',
      link: '/dashboard/subsidiaries/empyrion'
    },
    {
      id: 'midnight',
      name: 'Midnight Security',
      subtitle: 'Internal Security & Risk Management Division',
      description: 'Responsible for internal security and asset protection',
      icon: cdn('/images/New_Midnight_Security.png'),
      color: 'rgba(120, 140, 180, 0.8)',
      link: '/dashboard/subsidiaries/security'
    }
  ];

  return (
    <div className="min-h-screen bg-black bg-opacity-95 p-6 relative">
      {/* Holographic background effects */}
      <div className="absolute inset-0 bg-holo-grid bg-[length:50px_50px] opacity-5 pointer-events-none"></div>
      <div className="hexagon-bg absolute inset-0 opacity-5 pointer-events-none"></div>

      <div className="max-w-6xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <h1 className="mg-title text-2xl sm:text-3xl lg:text-4xl mb-4">AydoCorp Subsidiaries</h1>
          <div className="h-1 w-20 bg-gradient-to-r from-transparent via-[rgba(var(--mg-primary),0.7)] to-transparent"></div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {subsidiaries.map((subsidiary, index) => (
            <motion.div
              key={subsidiary.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
            >
              <Link href={subsidiary.link}>
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  className="h-full mg-panel bg-[rgba(var(--mg-panel-dark),0.4)] rounded-sm overflow-hidden relative border border-[rgba(var(--mg-primary),0.3)] hover:border-[rgba(var(--mg-primary),0.6)] transition-colors"
                >
                  {/* Top border glow */}
                  <div className="absolute top-0 left-0 right-0 h-1" style={{ background: `linear-gradient(to right, transparent, ${subsidiary.color}, transparent)` }}></div>
                  
                  <div className="p-6">
                    <div className="flex items-center mb-4">
                      <div className="h-16 w-16 relative mr-4 rounded-sm overflow-hidden">
                        <Image 
                          src={subsidiary.icon} 
                          alt={`${subsidiary.name} Logo`} 
                          width={64}
                          height={64}
                          className="object-contain"
                        />
                      </div>
                      <div>
                        <h2 className="mg-title text-xl">{subsidiary.name}</h2>
                        <p className="text-sm text-[rgba(var(--mg-text),0.7)]">{subsidiary.subtitle}</p>
                      </div>
                    </div>
                    
                    <p className="mg-text mb-6">{subsidiary.description}</p>
                    
                    <div className="flex justify-center">
                      <div className="inline-flex items-center px-4 py-2 rounded-sm bg-[rgba(var(--mg-panel-dark),0.7)] border border-[rgba(var(--mg-primary),0.4)] text-sm text-[rgba(var(--mg-primary),0.9)]">
                        View Details
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  {/* Animated data stream */}
                  <div className="absolute inset-x-0 bottom-0 h-px overflow-hidden">
                    <motion.div 
                      className="h-full"
                      style={{ background: `linear-gradient(to right, transparent, ${subsidiary.color}, transparent)` }}
                      animate={{ 
                        x: ['-100%', '100%'] 
                      }}
                      transition={{ 
                        duration: 3, 
                        repeat: Infinity,
                        ease: "linear",
                        delay: index * 0.5
                      }}
                    />
                  </div>
                </motion.div>
              </Link>
            </motion.div>
          ))}
        </div>
        
        <div className="mt-12 text-center text-xs text-[rgba(var(--mg-text),0.6)]">
          AYDO INTERGALACTIC CORPORATION - CORPORATE STRUCTURE
        </div>
      </div>
    </div>
  );
} 
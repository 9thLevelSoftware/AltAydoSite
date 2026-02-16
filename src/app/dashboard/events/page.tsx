'use client';

import React from 'react';
import { motion } from 'motion/react';
import EventsCalendar from '@/components/dashboard/EventsCalendar';

export default function EventsCalendarPage() {
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
          className="mb-8"
        >
          <h1 className="mg-title text-2xl sm:text-3xl lg:text-4xl mb-4">Events Calendar</h1>
          <div className="h-1 w-20 bg-gradient-to-r from-transparent via-[rgba(var(--mg-primary),0.7)] to-transparent"></div>
        </motion.div>

        {/* Events Calendar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8"
        >
          <EventsCalendar />
        </motion.div>
        
        <div className="mt-6 text-center text-xs text-[rgba(var(--mg-text),0.6)]">
          AYDO INTERGALACTIC CORPORATION - EVENTS MANAGEMENT SYSTEM
        </div>
      </div>
    </div>
  );
} 
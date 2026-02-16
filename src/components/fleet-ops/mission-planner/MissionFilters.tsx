'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence, stagger } from 'motion/react';
import { MissionStatus, MissionType } from '@/types/Mission';
import { CornerAccents } from '@/components/ui/mobiglas';

interface MissionFiltersProps {
  statusFilter: MissionStatus | 'all';
  setStatusFilter: (status: MissionStatus | 'all') => void;
  typeFilter: MissionType | 'all';
  setTypeFilter: (type: MissionType | 'all') => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (order: 'asc' | 'desc') => void;
}

const MissionFilters: React.FC<MissionFiltersProps> = ({
  statusFilter,
  setStatusFilter,
  typeFilter,
  setTypeFilter,
  sortOrder,
  setSortOrder
}) => {
  const [isStatusFocused, setIsStatusFocused] = useState(false);
  const [isTypeFocused, setIsTypeFocused] = useState(false);
  const [activeButton, setActiveButton] = useState<string | null>(null);
  
  // Animation for container
  const containerVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.4,
        delayChildren: stagger(0.1)
      }
    }
  };
  
  // Animation for filter items
  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { duration: 0.4 }
    }
  };
  
  // Generate data visualization dots
  const generateDots = (count: number, delay: number = 0) => {
    return Array.from({ length: count }).map((_, i) => (
      <motion.div
        key={i}
        className="absolute w-1 h-1 rounded-full bg-[rgba(var(--mg-primary),0.7)]"
        style={{ 
          top: `${Math.random() * 100}%`,
          left: `${Math.random() * 100}%`
        }}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ 
          opacity: [0, 0.7, 0],
          scale: [0, 1, 0]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          delay: delay + (i * 0.2),
          repeatDelay: Math.random() * 2
        }}
      />
    ));
  };

  return (
    <motion.div 
      className="mb-6 relative z-10"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="mg-panel bg-[rgba(var(--mg-panel-dark),0.5)] border border-[rgba(var(--mg-primary),0.15)] p-5 relative overflow-hidden">
        {/* Corner decorations */}
        <CornerAccents size="lg" color="primary" opacity="low" variant="animated" />

        {/* Multiple scanning line effects */}
        <motion.div
          initial={{ y: '-100%' }}
          animate={{ y: '200%' }}
          transition={{ 
            repeat: Infinity, 
            duration: 2,
            ease: "linear",
            repeatDelay: 2
          }}
          className="absolute inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-[rgba(var(--mg-primary),0.8)] to-transparent pointer-events-none"
        />
        <motion.div
          initial={{ y: '200%' }}
          animate={{ y: '-100%' }}
          transition={{ 
            repeat: Infinity, 
            duration: 2.5,
            ease: "linear",
            repeatDelay: 3,
            delay: 1.5
          }}
          className="absolute inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-[rgba(var(--mg-primary),0.5)] to-transparent pointer-events-none opacity-70"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Status filter */}
          <motion.div variants={itemVariants} className="relative">
            <label htmlFor="filter-status" className="block text-xs text-[rgba(var(--mg-primary),0.7)] mb-1">
              <div className="flex items-center">
                <motion.svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3 w-3 mr-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  animate={{ rotate: isStatusFocused ? [0, 360] : 0 }}
                  transition={{ duration: 0.8, ease: "easeInOut" }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </motion.svg>
                <motion.span
                  animate={{
                    color: isStatusFocused
                      ? ['#7aabd4', '#a1cdf7', '#7aabd4']
                      : '#7aabd4'
                  }}
                  transition={{ duration: 1.5, repeat: isStatusFocused ? Infinity : 0 }}
                >
                  Mission Status
                </motion.span>
              </div>
            </label>
            <div 
              className="relative group"
              onFocus={() => setIsStatusFocused(true)}
              onBlur={() => setIsStatusFocused(false)}
            >
              <select
                id="filter-status"
                className="mg-input w-full py-2 px-3 bg-[rgba(var(--mg-panel-dark),0.7)] border border-[rgba(var(--mg-primary),0.25)] rounded-sm focus:border-[rgba(var(--mg-primary),0.5)] focus:outline-none appearance-none pr-8"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as MissionStatus | 'all')}
              >
                <option value="all">All Statuses</option>
                <option value="Planning">Planning</option>
                <option value="Briefing">Briefing</option>
                <option value="In Progress">In Progress</option>
                <option value="Debriefing">Debriefing</option>
                <option value="Completed">Completed</option>
                <option value="Archived">Archived</option>
                <option value="Cancelled">Cancelled</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <motion.svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-4 w-4 text-[rgba(var(--mg-primary),0.5)]" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                  animate={{ 
                    y: isStatusFocused ? [0, 3, 0] : [0, 2, 0],
                    opacity: isStatusFocused ? [0.5, 1, 0.5] : 0.5
                  }}
                  transition={{ 
                    duration: isStatusFocused ? 1 : 2, 
                    repeat: Infinity, 
                    ease: "easeInOut" 
                  }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                </motion.svg>
              </div>
              
              {/* Enhanced hover/focus effects */}
              <motion.div 
                className="absolute inset-0 pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ 
                  opacity: isStatusFocused ? 1 : 0,
                  boxShadow: isStatusFocused 
                    ? ['0 0 0 0 rgba(var(--mg-primary), 0)', '0 0 10px 1px rgba(var(--mg-primary), 0.2)', '0 0 0 0 rgba(var(--mg-primary), 0)'] 
                    : 'none'
                }}
                transition={{ 
                  opacity: { duration: 0.3 },
                  boxShadow: { duration: 2, repeat: Infinity }
                }}
              >
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[rgba(var(--mg-primary),0.6)] to-transparent"></div>
                <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[rgba(var(--mg-primary),0.6)] to-transparent"></div>
                <div className="absolute left-0 top-0 h-full w-[1px] bg-gradient-to-b from-transparent via-[rgba(var(--mg-primary),0.6)] to-transparent"></div>
                <div className="absolute right-0 top-0 h-full w-[1px] bg-gradient-to-b from-transparent via-[rgba(var(--mg-primary),0.6)] to-transparent"></div>
              </motion.div>
              
              {/* Floating data dots for focus state */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <AnimatePresence>
                  {isStatusFocused && generateDots(5)}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
          
          {/* Type filter */}
          <motion.div variants={itemVariants} className="relative">
            <label htmlFor="filter-type" className="block text-xs text-[rgba(var(--mg-primary),0.7)] mb-1">
              <div className="flex items-center">
                <motion.svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3 w-3 mr-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  animate={{ rotate: isTypeFocused ? [0, 360] : 0 }}
                  transition={{ duration: 0.8, ease: "easeInOut" }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </motion.svg>
                <motion.span
                  animate={{
                    color: isTypeFocused
                      ? ['#7aabd4', '#a1cdf7', '#7aabd4']
                      : '#7aabd4'
                  }}
                  transition={{ duration: 1.5, repeat: isTypeFocused ? Infinity : 0 }}
                >
                  Mission Type
                </motion.span>
              </div>
            </label>
            <div 
              className="relative group"
              onFocus={() => setIsTypeFocused(true)}
              onBlur={() => setIsTypeFocused(false)}
            >
              <select
                id="filter-type"
                className="mg-input w-full py-2 px-3 bg-[rgba(var(--mg-panel-dark),0.7)] border border-[rgba(var(--mg-primary),0.25)] rounded-sm focus:border-[rgba(var(--mg-primary),0.5)] focus:outline-none appearance-none pr-8"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as MissionType | 'all')}
              >
                <option value="all">All Types</option>
                <option value="Cargo Haul">Cargo Haul</option>
                <option value="Salvage Operation">Salvage Operation</option>
                <option value="Bounty Hunting">Bounty Hunting</option>
                <option value="Exploration">Exploration</option>
                <option value="Reconnaissance">Reconnaissance</option>
                <option value="Medical Support">Medical Support</option>
                <option value="Combat Patrol">Combat Patrol</option>
                <option value="Escort Duty">Escort Duty</option>
                <option value="Mining Expedition">Mining Expedition</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <motion.svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-4 w-4 text-[rgba(var(--mg-primary),0.5)]" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                  animate={{ 
                    y: isTypeFocused ? [0, 3, 0] : [0, 2, 0],
                    opacity: isTypeFocused ? [0.5, 1, 0.5] : 0.5
                  }}
                  transition={{ 
                    duration: isTypeFocused ? 1 : 2, 
                    repeat: Infinity, 
                    ease: "easeInOut",
                    delay: 0.3 
                  }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                </motion.svg>
              </div>
              
              {/* Enhanced hover/focus effects */}
              <motion.div 
                className="absolute inset-0 pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ 
                  opacity: isTypeFocused ? 1 : 0,
                  boxShadow: isTypeFocused 
                    ? ['0 0 0 0 rgba(var(--mg-primary), 0)', '0 0 10px 1px rgba(var(--mg-primary), 0.2)', '0 0 0 0 rgba(var(--mg-primary), 0)'] 
                    : 'none'
                }}
                transition={{ 
                  opacity: { duration: 0.3 },
                  boxShadow: { duration: 2, repeat: Infinity }
                }}
              >
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[rgba(var(--mg-primary),0.6)] to-transparent"></div>
                <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[rgba(var(--mg-primary),0.6)] to-transparent"></div>
                <div className="absolute left-0 top-0 h-full w-[1px] bg-gradient-to-b from-transparent via-[rgba(var(--mg-primary),0.6)] to-transparent"></div>
                <div className="absolute right-0 top-0 h-full w-[1px] bg-gradient-to-b from-transparent via-[rgba(var(--mg-primary),0.6)] to-transparent"></div>
              </motion.div>
              
              {/* Floating data dots for focus state */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <AnimatePresence>
                  {isTypeFocused && generateDots(5, 0.2)}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
          
          {/* Sort order filter */}
          <motion.div variants={itemVariants} className="relative">
            <label className="block text-xs text-[rgba(var(--mg-primary),0.7)] mb-1">
              <div className="flex items-center">
                <motion.svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-3 w-3 mr-1" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                  animate={{ rotateX: [0, 360] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 5 }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                </motion.svg>
                Sort Order
              </div>
            </label>
            <div className="flex">
              <motion.button
                className={`holo-element py-1.5 px-3 text-xs font-quantify border border-r-0 rounded-l-sm rounded-r-none relative overflow-hidden ${
                  sortOrder === 'desc' 
                    ? 'bg-[rgba(var(--mg-primary),0.1)] border-[rgba(var(--mg-primary),0.4)]' 
                    : 'bg-[rgba(var(--mg-panel-dark),0.7)] border-[rgba(var(--mg-primary),0.25)]'
                }`}
                onClick={() => setSortOrder('desc')}
                onMouseEnter={() => setActiveButton('desc')}
                onMouseLeave={() => setActiveButton(null)}
                whileHover={{ y: -2 }}
                whileTap={{ y: 1 }}
              >
                {/* Button shine effect */}
                {sortOrder === 'desc' && (
                  <motion.div 
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-[rgba(var(--mg-primary),0.2)] to-transparent"
                    initial={{ x: '-100%' }}
                    animate={{ x: '100%' }}
                    transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
                  />
                )}
                
                <div className="flex items-center relative z-10">
                  <motion.svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-3 w-3 mr-1" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                    animate={{ y: activeButton === 'desc' ? [0, -2, 0] : 0 }}
                    transition={{ duration: 0.5, repeat: activeButton === 'desc' ? Infinity : 0 }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                  </motion.svg>
                  NEWEST
                </div>
                
                {/* Active indicator */}
                {sortOrder === 'desc' && (
                  <motion.div 
                    className="absolute bottom-0 left-0 right-0 h-[2px] bg-[rgba(var(--mg-primary),0.8)]"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                )}
              </motion.button>
              <motion.button
                className={`holo-element py-1.5 px-3 text-xs font-quantify border border-l-0 rounded-r-sm rounded-l-none relative overflow-hidden ${
                  sortOrder === 'asc' 
                    ? 'bg-[rgba(var(--mg-primary),0.1)] border-[rgba(var(--mg-primary),0.4)]' 
                    : 'bg-[rgba(var(--mg-panel-dark),0.7)] border-[rgba(var(--mg-primary),0.25)]'
                }`}
                onClick={() => setSortOrder('asc')}
                onMouseEnter={() => setActiveButton('asc')}
                onMouseLeave={() => setActiveButton(null)}
                whileHover={{ y: -2 }}
                whileTap={{ y: 1 }}
              >
                {/* Button shine effect */}
                {sortOrder === 'asc' && (
                  <motion.div 
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-[rgba(var(--mg-primary),0.2)] to-transparent"
                    initial={{ x: '-100%' }}
                    animate={{ x: '100%' }}
                    transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
                  />
                )}
                
                <div className="flex items-center relative z-10">
                  <motion.svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-3 w-3 mr-1" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                    animate={{ y: activeButton === 'asc' ? [0, -2, 0] : 0 }}
                    transition={{ duration: 0.5, repeat: activeButton === 'asc' ? Infinity : 0 }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                  </motion.svg>
                  OLDEST
                </div>
                
                {/* Active indicator */}
                {sortOrder === 'asc' && (
                  <motion.div 
                    className="absolute bottom-0 left-0 right-0 h-[2px] bg-[rgba(var(--mg-primary),0.8)]"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                )}
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default MissionFilters; 
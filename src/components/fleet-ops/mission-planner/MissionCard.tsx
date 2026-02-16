'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { MissionResponse } from '@/types/Mission';

interface MissionCardProps {
  mission: MissionResponse;
  onClick: () => void;
}

const MissionCard: React.FC<MissionCardProps> = ({ mission, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  // Mission status styling
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Planning':
        return 'border-blue-400 text-blue-400 bg-[rgba(59,130,246,0.1)]';
      case 'Briefing':
        return 'border-purple-400 text-purple-400 bg-[rgba(167,139,250,0.1)]';
      case 'In Progress':
        return 'border-green-400 text-green-400 bg-[rgba(74,222,128,0.1)]';
      case 'Completed':
        return 'border-gray-400 text-gray-400 bg-[rgba(156,163,175,0.1)]';
      case 'Archived':
        return 'border-gray-500 text-gray-500 bg-[rgba(107,114,128,0.1)]';
      case 'Cancelled':
        return 'border-red-400 text-red-400 bg-[rgba(248,113,113,0.1)]';
      default:
        return 'border-[rgba(var(--mg-primary),0.5)] text-[rgba(var(--mg-primary),0.8)] bg-[rgba(var(--mg-primary),0.1)]';
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ 
        scale: 1.02, 
        boxShadow: '0 0 20px rgba(var(--mg-primary), 0.2)',
        y: -3
      }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="holo-element bg-[rgba(var(--mg-panel-dark),0.6)] border border-[rgba(var(--mg-primary),0.15)] p-4 cursor-pointer hover:border-[rgba(var(--mg-primary),0.4)] transition-all relative group overflow-hidden"
    >
      {/* Holographic overlay effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[rgba(var(--mg-primary),0.03)] to-transparent pointer-events-none"></div>
      
      {/* Scanning line effect - Hidden on mobile and with reduced motion for performance */}
      {!shouldReduceMotion && (
        <motion.div
          className="hidden md:block absolute inset-0 overflow-hidden pointer-events-none opacity-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 0.7 : 0.2 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="absolute h-[1px] w-full bg-gradient-to-r from-transparent via-[rgba(var(--mg-primary),0.8)] to-transparent"
            initial={{ top: '-100%' }}
            animate={{ top: '200%' }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "linear"
            }}
          />

          <motion.div
            className="absolute w-[1px] h-full bg-gradient-to-b from-transparent via-[rgba(var(--mg-primary),0.8)] to-transparent left-0"
            initial={{ top: '200%' }}
            animate={{ top: '-100%' }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "linear",
              delay: 0.3
            }}
          />

          <motion.div
            className="absolute w-[1px] h-full bg-gradient-to-b from-transparent via-[rgba(var(--mg-primary),0.8)] to-transparent right-0"
            initial={{ top: '-100%' }}
            animate={{ top: '200%' }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "linear",
              delay: 0.6
            }}
          />
        </motion.div>
      )}
      
      {/* Grid background */}
      <div className="absolute inset-0 mg-grid-bg opacity-10 pointer-events-none"></div>
      
      {/* Hexagon background pattern */}
      <div className="hexagon-bg absolute inset-0 opacity-5 pointer-events-none"></div>
      
      {/* Corner decorations */}
      <div className="absolute top-0 right-0 w-[20px] h-[20px]">
        <div className="absolute top-0 right-0 w-[2px] h-[10px] bg-[rgba(var(--mg-primary),0.4)]"></div>
        <div className="absolute top-0 right-0 w-[10px] h-[2px] bg-[rgba(var(--mg-primary),0.4)]"></div>
      </div>
      <div className="absolute bottom-0 left-0 w-[20px] h-[20px]">
        <div className="absolute bottom-0 left-0 w-[2px] h-[10px] bg-[rgba(var(--mg-primary),0.4)]"></div>
        <div className="absolute bottom-0 left-0 w-[10px] h-[2px] bg-[rgba(var(--mg-primary),0.4)]"></div>
      </div>
      
      {/* Enhanced corner decorations that appear on hover */}
      <AnimatePresence>
        {isHovered && (
          <>
            <motion.div 
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 20, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute top-0 left-0 h-[2px] bg-[rgba(var(--mg-primary),0.6)]"
            />
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 20, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute top-0 left-0 w-[2px] bg-[rgba(var(--mg-primary),0.6)]"
            />
            <motion.div 
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 20, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-0 right-0 h-[2px] bg-[rgba(var(--mg-primary),0.6)]"
            />
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 20, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-0 right-0 w-[2px] bg-[rgba(var(--mg-primary),0.6)]"
            />
          </>
        )}
      </AnimatePresence>
      
      {/* Animated edge glow on hover */}
      <AnimatePresence>
        {isHovered && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[rgba(var(--mg-primary),0.8)] to-transparent"
            />
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-[rgba(var(--mg-primary),0.8)] to-transparent"
            />
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-y-0 left-0 w-[1px] bg-gradient-to-b from-transparent via-[rgba(var(--mg-primary),0.8)] to-transparent"
            />
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-[rgba(var(--mg-primary),0.8)] to-transparent"
            />
          </>
        )}
      </AnimatePresence>
      
      {/* Data points - appears on hover */}
      <AnimatePresence>
        {isHovered && (
          <>
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 0.6, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{ delay: i * 0.05 }}
                className="absolute w-1 h-1 rounded-full bg-[rgba(var(--mg-primary),0.8)]"
                style={{ 
                  top: `${10 + (i * 15)}%`, 
                  right: '5px',
                }}
              >
                <motion.div
                  className="absolute inset-0 rounded-full"
                  animate={{
                    boxShadow: [
                      '0 0 0 0 rgba(var(--mg-primary), 0)',
                      '0 0 3px 1px rgba(var(--mg-primary), 0.6)',
                      '0 0 0 0 rgba(var(--mg-primary), 0)'
                    ]
                  }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              </motion.div>
            ))}
          </>
        )}
      </AnimatePresence>
      
      {/* Header with mission name and status */}
      <div className="flex justify-between items-start mb-3 relative z-10">
        <motion.h3 
          className="mg-title text-lg truncate flex-1"
          animate={{ 
            textShadow: isHovered 
              ? ['0 0 5px rgba(var(--mg-primary), 0.3)', '0 0 10px rgba(var(--mg-primary), 0.6)', '0 0 5px rgba(var(--mg-primary), 0.3)'] 
              : ['0 0 0px rgba(var(--mg-primary), 0)', '0 0 5px rgba(var(--mg-primary), 0.3)', '0 0 0px rgba(var(--mg-primary), 0)']
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          {mission.name}
        </motion.h3>
        
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`text-xs px-2 py-1 rounded-sm border ${getStatusColor(mission.status)} ml-2 whitespace-nowrap relative overflow-hidden`}
        >
          {/* Status indicator pulse */}
          <motion.div 
            className="absolute top-0 left-0 w-full h-full opacity-0"
            animate={{ 
              backgroundColor: ['rgba(var(--mg-primary), 0)', 'rgba(var(--mg-primary), 0.2)', 'rgba(var(--mg-primary), 0)'],
              opacity: [0, 0.5, 0]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span className="relative z-10">{mission.status}</span>
        </motion.div>
      </div>
      
      {/* Mission date */}
      <div className="text-sm mb-2 flex items-center text-[rgba(var(--mg-primary),0.7)] relative z-10">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span>{formatDate(mission.scheduledDateTime)}</span>
        
        {/* Date highlight effect */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: '100%', opacity: 0.1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute bottom-0 left-0 h-[1px] bg-[rgba(var(--mg-primary),0.8)]"
            />
          )}
        </AnimatePresence>
      </div>
      
      {/* Mission location if available */}
      {mission.location && (
        <div className="text-sm mb-3 flex items-center text-[rgba(var(--mg-primary),0.7)] relative z-10">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="truncate">{mission.location}</span>
          
          {/* Location highlight effect */}
          <AnimatePresence>
            {isHovered && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: '100%', opacity: 0.1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="absolute bottom-0 left-0 h-[1px] bg-[rgba(var(--mg-primary),0.8)]"
              />
            )}
          </AnimatePresence>
        </div>
      )}
      
      {/* Bottom section with mission type and participants */}
      <div className="mt-4 flex items-center justify-between relative z-10">
        <motion.div 
          className="flex items-center"
          whileHover={{ scale: 1.05 }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-[rgba(var(--mg-primary),0.6)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
          <motion.span 
            className="text-xs text-[rgba(var(--mg-primary),0.8)] px-2 py-0.5 bg-[rgba(var(--mg-primary),0.1)] border border-[rgba(var(--mg-primary),0.2)] rounded-sm relative overflow-hidden"
            whileHover={{ 
              backgroundColor: 'rgba(var(--mg-primary),0.2)', 
              borderColor: 'rgba(var(--mg-primary),0.4)' 
            }}
          >
            {/* Scanning effect */}
            <motion.div 
              className="absolute top-0 left-0 h-full w-6 bg-gradient-to-r from-transparent via-[rgba(var(--mg-primary),0.3)] to-transparent"
              animate={{ x: ['-100%', '200%'] }}
              transition={{ 
                duration: 1.5, 
                repeat: Infinity, 
                ease: "linear",
                repeatDelay: 0.5
              }}
            />
            <span className="relative z-10">{mission.type}</span>
          </motion.span>
        </motion.div>
        
        <div className="flex -space-x-2">
          {mission.participants.slice(0, 3).map((participant, index) => (
            <motion.div 
              key={participant.userId + index}
              className="w-6 h-6 rounded-full bg-[rgba(var(--mg-primary),0.15)] border border-[rgba(var(--mg-primary),0.4)] flex items-center justify-center text-xs overflow-hidden relative"
              title={participant.userName}
              whileHover={{ 
                scale: 1.2, 
                zIndex: 10,
                boxShadow: '0 0 10px rgba(var(--mg-primary), 0.5)'
              }}
              transition={{ duration: 0.2 }}
            >
              {/* Scanning effect on hover */}
              <motion.div 
                className="absolute inset-0 bg-gradient-to-b from-transparent via-[rgba(var(--mg-primary),0.2)] to-transparent opacity-0 group-hover:opacity-100"
                animate={{ y: ['-100%', '100%'] }}
                transition={{ 
                  duration: 1.5, 
                  ease: "linear",
                  repeat: Infinity
                }}
              />
              
              {/* Pulsing glow effect */}
              <motion.div
                className="absolute inset-0 rounded-full"
                animate={{
                  boxShadow: [
                    '0 0 0 0 rgba(var(--mg-primary), 0)',
                    '0 0 3px 1px rgba(var(--mg-primary), 0.4)',
                    '0 0 0 0 rgba(var(--mg-primary), 0)'
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity, delay: index * 0.5 }}
              />
              
              <span className="relative z-10">{participant.userName.charAt(0).toUpperCase()}</span>
            </motion.div>
          ))}
          
          {mission.participants.length > 3 && (
            <motion.div 
              className="w-6 h-6 rounded-full bg-[rgba(var(--mg-primary),0.15)] border border-[rgba(var(--mg-primary),0.4)] flex items-center justify-center text-xs relative"
              whileHover={{ 
                scale: 1.2, 
                zIndex: 10,
                boxShadow: '0 0 10px rgba(var(--mg-primary), 0.5)'
              }}
            >
              <motion.div 
                className="absolute inset-0 rounded-full"
                animate={{ 
                  boxShadow: [
                    "0 0 0 0 rgba(var(--mg-primary), 0)",
                    "0 0 4px rgba(var(--mg-primary), 0.3)",
                    "0 0 0 0 rgba(var(--mg-primary), 0)"
                  ]
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity,
                  ease: "easeOut"
                }}
              />
              <span className="relative z-10">+{mission.participants.length - 3}</span>
            </motion.div>
          )}
        </div>
      </div>
      
      {/* Enhanced view details indicator */}
      <AnimatePresence>
        {isHovered && (
          <motion.div 
            className="absolute right-4 bottom-4 flex items-center space-x-1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
          >
            <span className="text-xs text-[rgba(var(--mg-primary),0.7)]">VIEW DETAILS</span>
            <motion.svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-3 w-3 text-[rgba(var(--mg-primary),0.7)]" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
              animate={{ x: [0, 3, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </motion.svg>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Data visualization on hover */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-3 left-3 w-20 h-12 pointer-events-none"
          >
            {/* Mini holographic chart */}
            <svg width="100%" height="100%" viewBox="0 0 100 60" className="opacity-40">
              {/* Background grid */}
              {[...Array(6)].map((_, i) => (
                <line 
                  key={`h-${i}`} 
                  x1="0" 
                  y1={i * 10} 
                  x2="100" 
                  y2={i * 10} 
                  stroke="rgba(var(--mg-primary),0.3)" 
                  strokeWidth="0.5" 
                />
              ))}
              {[...Array(11)].map((_, i) => (
                <line 
                  key={`v-${i}`} 
                  x1={i * 10} 
                  y1="0" 
                  x2={i * 10} 
                  y2="60" 
                  stroke="rgba(var(--mg-primary),0.3)" 
                  strokeWidth="0.5" 
                />
              ))}
              
              {/* Chart line */}
              <motion.path
                d="M0,50 C20,45 40,25 60,20 S80,30 100,15"
                fill="none"
                stroke="rgba(var(--mg-primary),1)"
                strokeWidth="1.5"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
              />
              
              {/* Data points */}
              {[
                { x: 0, y: 50 },
                { x: 20, y: 45 },
                { x: 40, y: 25 },
                { x: 60, y: 20 },
                { x: 80, y: 30 },
                { x: 100, y: 15 }
              ].map((point, i) => (
                <motion.circle
                  key={i}
                  cx={point.x}
                  cy={point.y}
                  r="2"
                  fill="rgba(var(--mg-primary),0.8)"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <animate 
                    attributeName="opacity" 
                    values="1;0.5;1" 
                    dur="2s" 
                    repeatCount="indefinite" 
                  />
                </motion.circle>
              ))}
            </svg>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default MissionCard; 
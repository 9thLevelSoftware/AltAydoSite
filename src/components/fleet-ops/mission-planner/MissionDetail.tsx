'use client';

import React, { useMemo } from 'react';
import { motion, stagger } from 'motion/react';
import { MissionResponse } from '@/types/Mission';
import Image from 'next/image';
import { useShipBatch } from '@/hooks/useShipBatch';
import MissionParticipantShip from '@/components/ships/MissionParticipantShip';

interface MissionDetailProps {
  mission: MissionResponse;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const MissionDetail: React.FC<MissionDetailProps> = ({
  mission,
  onBack,
  onEdit,
  onDelete
}) => {
  // Batch-resolve participant ships from FleetYards API
  const participantShipIds = useMemo(
    () => mission.participants
      .map((p) => p.fleetyardsId)
      .filter((id): id is string => !!id && id.length > 0),
    [mission.participants]
  );
  const { ships: resolvedShips } = useShipBatch(participantShipIds);

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short'
    }).format(date);
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: stagger(0.1)
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4 }
    }
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
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col space-y-6"
    >
      {/* Header with back button */}
      <motion.div variants={itemVariants} className="flex items-center gap-4">
        <motion.button
          whileHover={{ scale: 1.05, boxShadow: "0 0 10px rgba(var(--mg-primary), 0.5)" }}
          whileTap={{ scale: 0.95 }}
          onClick={onBack}
          className="holo-element bg-[rgba(var(--mg-panel-dark),0.7)] border border-[rgba(var(--mg-primary),0.3)] p-2 rounded-sm relative overflow-hidden group"
        >
          {/* Holographic scan effect */}
          <div className="holo-scan absolute inset-0 opacity-50 pointer-events-none" />
          
          {/* Corner decorations */}
          <div className="absolute top-0 right-0 w-[10px] h-[10px]">
            <div className="absolute top-0 right-0 w-[1px] h-[5px] bg-[rgba(var(--mg-primary),0.6)]"></div>
            <div className="absolute top-0 right-0 w-[5px] h-[1px] bg-[rgba(var(--mg-primary),0.6)]"></div>
          </div>
          <div className="absolute bottom-0 left-0 w-[10px] h-[10px]">
            <div className="absolute bottom-0 left-0 w-[1px] h-[5px] bg-[rgba(var(--mg-primary),0.6)]"></div>
            <div className="absolute bottom-0 left-0 w-[5px] h-[1px] bg-[rgba(var(--mg-primary),0.6)]"></div>
          </div>
          
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          
          {/* Hover effects */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[rgba(var(--mg-primary),0.1)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </motion.button>
        
        <motion.h1 
          className="mg-title text-3xl font-quantify tracking-wider flex-grow"
          animate={{ textShadow: ['0 0 5px rgba(var(--mg-primary), 0.2)', '0 0 10px rgba(var(--mg-primary), 0.4)', '0 0 5px rgba(var(--mg-primary), 0.2)'] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          MISSION DETAILS
        </motion.h1>
        
        <div className="flex space-x-3">
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: "0 0 15px rgba(var(--mg-primary), 0.5)" }}
            whileTap={{ scale: 0.95 }}
            onClick={onEdit}
            className="holo-element bg-[rgba(var(--mg-panel-dark),0.7)] border border-[rgba(var(--mg-primary),0.3)] py-2 px-4 text-sm font-quantify tracking-wider relative overflow-hidden group"
          >
            {/* Background effects */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[rgba(var(--mg-primary),0.1)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="holo-scan absolute inset-0 opacity-30 pointer-events-none" />
            
            {/* Corner decorations */}
            <div className="absolute top-0 right-0 w-[15px] h-[15px]">
              <div className="absolute top-0 right-0 w-[2px] h-[8px] bg-[rgba(var(--mg-primary),0.6)]"></div>
              <div className="absolute top-0 right-0 w-[8px] h-[2px] bg-[rgba(var(--mg-primary),0.6)]"></div>
            </div>
            <div className="absolute bottom-0 left-0 w-[15px] h-[15px]">
              <div className="absolute bottom-0 left-0 w-[2px] h-[8px] bg-[rgba(var(--mg-primary),0.6)]"></div>
              <div className="absolute bottom-0 left-0 w-[8px] h-[2px] bg-[rgba(var(--mg-primary),0.6)]"></div>
            </div>
            
            <span className="relative z-10 inline-flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              EDIT
            </span>
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: "0 0 15px rgba(var(--mg-danger), 0.5)" }}
            whileTap={{ scale: 0.95 }}
            onClick={onDelete}
            className="holo-element bg-[rgba(var(--mg-panel-dark),0.7)] border border-[rgba(var(--mg-danger),0.3)] py-2 px-4 text-sm font-quantify tracking-wider text-[rgba(var(--mg-danger),0.9)] relative overflow-hidden group"
          >
            {/* Background effects */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[rgba(var(--mg-danger),0.1)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            {/* Corner decorations */}
            <div className="absolute top-0 right-0 w-[15px] h-[15px]">
              <div className="absolute top-0 right-0 w-[2px] h-[8px] bg-[rgba(var(--mg-danger),0.6)]"></div>
              <div className="absolute top-0 right-0 w-[8px] h-[2px] bg-[rgba(var(--mg-danger),0.6)]"></div>
            </div>
            <div className="absolute bottom-0 left-0 w-[15px] h-[15px]">
              <div className="absolute bottom-0 left-0 w-[2px] h-[8px] bg-[rgba(var(--mg-danger),0.6)]"></div>
              <div className="absolute bottom-0 left-0 w-[8px] h-[2px] bg-[rgba(var(--mg-danger),0.6)]"></div>
            </div>
            
            <span className="relative z-10 inline-flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              DELETE
            </span>
          </motion.button>
        </div>
      </motion.div>

      {/* Mission Overview Panel */}
      <motion.div 
        variants={itemVariants}
        className="mg-panel bg-[rgba(var(--mg-panel-dark),0.4)] border border-[rgba(var(--mg-primary),0.15)] rounded-sm p-6 relative overflow-hidden"
      >
        {/* Corner decorations */}
        <div className="absolute top-0 right-0 w-[20px] h-[20px]">
          <div className="absolute top-0 right-0 w-[2px] h-[10px] bg-[rgba(var(--mg-primary),0.4)]"></div>
          <div className="absolute top-0 right-0 w-[10px] h-[2px] bg-[rgba(var(--mg-primary),0.4)]"></div>
        </div>
        <div className="absolute bottom-0 left-0 w-[20px] h-[20px]">
          <div className="absolute bottom-0 left-0 w-[2px] h-[10px] bg-[rgba(var(--mg-primary),0.4)]"></div>
          <div className="absolute bottom-0 left-0 w-[10px] h-[2px] bg-[rgba(var(--mg-primary),0.4)]"></div>
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
          className="absolute inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-[rgba(var(--mg-primary),0.8)] to-transparent pointer-events-none"
        />
        
        {/* Hexagon background pattern */}
        <div className="hexagon-bg absolute inset-0 opacity-10 pointer-events-none"></div>

        {/* Grid background */}
        <div className="mg-grid-bg"></div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Left column - Mission info */}
          <div className="flex-1">
            <div className="flex justify-between items-start mb-4">
              <motion.h2 
                className="mg-title text-2xl"
                animate={{ textShadow: ['0 0 5px rgba(var(--mg-primary), 0.2)', '0 0 10px rgba(var(--mg-primary), 0.4)', '0 0 5px rgba(var(--mg-primary), 0.2)'] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                {mission.name}
              </motion.h2>
              <span className={`text-sm px-3 py-1.5 rounded-sm border ${getStatusColor(mission.status)}`}>
                {mission.status}
              </span>
            </div>
            
            <div className="space-y-4">
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h3 className="text-sm text-[rgba(var(--mg-primary),0.7)] mb-1">Mission Type</h3>
                <p className="mg-text">{mission.type}</p>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h3 className="text-sm text-[rgba(var(--mg-primary),0.7)] mb-1">Scheduled Date & Time</h3>
                <p className="mg-text">{formatDate(mission.scheduledDateTime)}</p>
              </motion.div>
              
              {mission.location && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <h3 className="text-sm text-[rgba(var(--mg-primary),0.7)] mb-1">Location</h3>
                  <p className="mg-text">{mission.location}</p>
                </motion.div>
              )}
              
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <h3 className="text-sm text-[rgba(var(--mg-primary),0.7)] mb-1">Mission Details</h3>
                <div className="holo-element bg-[rgba(var(--mg-panel-dark),0.3)] p-3 border border-[rgba(var(--mg-primary),0.1)] rounded-sm relative overflow-hidden">
                  <p className="mg-text whitespace-pre-wrap relative z-10">{mission.details || 'No details provided.'}</p>
                  <div className="holo-scan absolute inset-0 opacity-30 pointer-events-none" />
                </div>
              </motion.div>
              
              {mission.images && mission.images.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <h3 className="text-sm text-[rgba(var(--mg-primary),0.7)] mb-2">Mission Images</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {mission.images.map((imageUrl, index) => (
                      <motion.div 
                        key={index} 
                        className="aspect-video relative group overflow-hidden border border-[rgba(var(--mg-primary),0.2)] rounded-sm"
                        whileHover={{ 
                          scale: 1.05, 
                          boxShadow: "0 0 15px rgba(var(--mg-primary), 0.3)", 
                          borderColor: "rgba(var(--mg-primary), 0.5)" 
                        }}
                      >
                        <Image
                          src={imageUrl}
                          alt={`Mission image ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(0,0,0,0.7)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end">
                          <span className="p-2 text-xs text-white">Image {index + 1}</span>
                        </div>
                        
                        {/* Scanning line effect on hover */}
                        <motion.div
                          className="absolute inset-0 opacity-0 group-hover:opacity-1 pointer-events-none"
                          initial={{ opacity: 0 }}
                          whileHover={{ opacity: 1 }}
                        >
                          <motion.div
                            className="absolute h-[1px] w-full bg-gradient-to-r from-transparent via-[rgba(var(--mg-primary),0.8)] to-transparent"
                            initial={{ top: '-100%' }}
                            animate={{ top: '100%' }}
                            transition={{
                              duration: 1.2,
                              ease: "linear",
                              repeat: Infinity
                            }}
                          />
                        </motion.div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          </div>
          
          {/* Right column - Participants */}
          <motion.div 
            className="w-full md:w-96"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }}
          >
            <h3 className="text-sm text-[rgba(var(--mg-primary),0.7)] mb-3">Mission Roster</h3>
            
            {mission.participants.length === 0 ? (
              <div className="holo-element bg-[rgba(var(--mg-panel-dark),0.3)] p-3 border border-[rgba(var(--mg-primary),0.1)] rounded-sm text-center py-6 relative overflow-hidden">
                <p className="mg-text-secondary text-sm relative z-10">No personnel assigned to this mission</p>
                <div className="holo-scan absolute inset-0 opacity-30 pointer-events-none" />
              </div>
            ) : (
              <div className="space-y-2">
                {mission.participants.map((participant, index) => (
                  <motion.div
                    key={participant.userId}
                    className="holo-element bg-[rgba(var(--mg-panel-dark),0.3)] p-3 border border-[rgba(var(--mg-primary),0.1)] rounded-sm relative group overflow-hidden"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 + (index * 0.1) }}
                    whileHover={{
                      y: -2,
                      boxShadow: "0 0 10px rgba(var(--mg-primary), 0.2)",
                      borderColor: "rgba(var(--mg-primary), 0.3)"
                    }}
                  >
                    {/* Hover effect */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[rgba(var(--mg-primary),0.4)] to-transparent"></div>
                      <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[rgba(var(--mg-primary),0.4)] to-transparent"></div>
                    </div>

                    {/* Scanning line effect */}
                    <div className="holo-scan absolute inset-0 opacity-30 pointer-events-none" />

                    <MissionParticipantShip
                      participant={participant}
                      resolved={participant.fleetyardsId ? resolvedShips.get(participant.fleetyardsId) : undefined}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default MissionDetail; 
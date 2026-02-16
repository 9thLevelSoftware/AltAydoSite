'use client';

import React from 'react';
import { motion, stagger } from 'motion/react';
import { MissionResponse } from '@/types/Mission';
import MissionCard from './MissionCard';

interface MissionListProps {
  missions: MissionResponse[];
  onMissionClick: (mission: MissionResponse) => void;
  loading?: boolean;
  error?: string | null;
}

const MissionList: React.FC<MissionListProps> = ({
  missions,
  onMissionClick,
  loading = false,
  error = null
}) => {
  // Animation variants for container
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: stagger(0.1)
      }
    }
  };

  // Empty state - handled by parent component
  if (missions.length === 0 && !loading && !error) {
    return null;
  }

  // Loading state - simplified and performant
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 relative">
        <div className="relative z-10">
          {/* Simple loading spinner */}
          <div className="relative w-16 h-16 mb-6">
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-[rgba(var(--mg-primary),0.3)] border-t-[rgba(var(--mg-primary),0.8)]"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          </div>

          <p className="mg-text-secondary text-lg mb-2 font-quantify tracking-widest text-[rgba(var(--mg-primary),0.8)]">
            LOADING MISSIONS
          </p>

          <p className="mg-text-secondary text-sm opacity-70">
            Retrieving mission database...
          </p>
        </div>
      </div>
    );
  }

  // Error state - simplified and informative
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center relative">
        <div className="relative z-10">
          {/* Error icon */}
          <div className="w-16 h-16 mb-4 flex items-center justify-center">
            <svg
              className="w-full h-full text-[rgba(var(--mg-danger),0.7)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <p className="mg-text text-xl mb-2 font-quantify tracking-wider text-[rgba(var(--mg-danger),0.9)]">
            Unable to Load Missions
          </p>

          <p className="mg-text-secondary text-sm opacity-70 max-w-md mb-4">
            {error}
          </p>

          <p className="text-xs text-[rgba(var(--mg-text),0.5)]">
            Please try refreshing the page or contact support if the issue persists.
          </p>
        </div>
      </div>
    );
  }

  // Normal mission list view
  return (
    <div className="relative">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10"
      >
        {missions.map(mission => (
          <MissionCard
            key={mission.id}
            mission={mission}
            onClick={() => onMissionClick(mission)}
          />
        ))}
      </motion.div>
    </div>
  );
};

export default MissionList;

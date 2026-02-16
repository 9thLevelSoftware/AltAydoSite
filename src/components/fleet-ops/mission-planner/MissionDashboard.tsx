'use client';

import React, { useState } from 'react';
import { motion, stagger } from 'motion/react';
import { MissionResponse, MissionStatus, MissionType } from '@/types/Mission';
import MissionList from './MissionList';
import MissionFilters from './MissionFilters';
import { MobiGlasButton, CornerAccents } from '@/components/ui/mobiglas';

interface MissionDashboardProps {
  missions: MissionResponse[];
  loading: boolean;
  onMissionClick: (mission: MissionResponse) => void;
  onCreateMission: () => void;
}

const MissionDashboard: React.FC<MissionDashboardProps> = ({
  missions,
  loading,
  onMissionClick,
  onCreateMission
}) => {
  const [statusFilter, setStatusFilter] = useState<MissionStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<MissionType | 'all'>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Ensure missions is always an array before filtering
  const missionArray = Array.isArray(missions) ? missions : [];

  // Filter and sort missions
  const filteredMissions = missionArray
    .filter(mission =>
      (statusFilter === 'all' || mission.status === statusFilter) &&
      (typeFilter === 'all' || mission.type === typeFilter)
    )
    .sort((a, b) => {
      const dateA = new Date(a.scheduledDateTime).getTime();
      const dateB = new Date(b.scheduledDateTime).getTime();

      if (sortOrder === 'asc') {
        return dateA - dateB;
      } else {
        return dateB - dateA;
      }
    });

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
      transition: { duration: 0.5 }
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col"
    >
      {/* Header with title and create button */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4"
      >
        <div>
          <h1 className="mg-title text-lg md:text-xl font-quantify tracking-wider text-[rgba(var(--mg-primary),0.9)]">
            MISSION DATABASE
          </h1>
          <p className="mg-text-secondary text-sm mt-1 opacity-70 ml-1">
            Manage operations and assign personnel
          </p>
        </div>

        <MobiGlasButton
          onClick={onCreateMission}
          variant="primary"
          withCorners
          withScanline
          withGlow
          leftIcon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          }
        >
          CREATE MISSION
        </MobiGlasButton>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants}>
        <MissionFilters
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
        />
      </motion.div>

      {/* Mission List */}
      <motion.div
        variants={itemVariants}
        className="relative"
      >
        <div className="mg-panel bg-[rgba(var(--mg-panel-dark),0.5)] border border-[rgba(var(--mg-primary),0.15)] p-6 relative overflow-hidden">
          {/* Corner decorations */}
          <CornerAccents size="lg" color="primary" opacity="low" />

          {/* Grid background */}
          <div className="mg-grid-bg"></div>

          <MissionList
            missions={filteredMissions}
            onMissionClick={onMissionClick}
            loading={loading}
          />

          {/* Empty state */}
          {!loading && filteredMissions.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <div className="w-16 h-16 mb-4 flex items-center justify-center">
                <svg
                  className="w-full h-full text-[rgba(var(--mg-primary),0.6)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>

              <p className="mg-text text-lg mb-2 font-quantify tracking-wider">
                No Missions Found
              </p>

              <p className="mg-text-secondary text-sm opacity-70 max-w-md mb-6">
                {statusFilter !== 'all' || typeFilter !== 'all'
                  ? 'Try adjusting your filters to see more results'
                  : 'Create your first mission to get started with operations planning'}
              </p>

              <MobiGlasButton
                onClick={onCreateMission}
                variant="primary"
                withCorners
                withScanline
                withGlow
                leftIcon={
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                }
              >
                CREATE NEW MISSION
              </MobiGlasButton>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default MissionDashboard;

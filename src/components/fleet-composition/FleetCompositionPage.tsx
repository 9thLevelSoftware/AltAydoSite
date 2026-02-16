'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useOrgFleet } from '@/hooks/useOrgFleet';
import { FleetCompositionTabs, type FleetTab } from './FleetCompositionTabs';
import { FleetBreakdownChart } from './FleetBreakdownChart';
import { FleetBreakdownTable } from './FleetBreakdownTable';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FleetCompositionPage() {
  const { data, isLoading, error } = useOrgFleet();
  const [activeTab, setActiveTab] = useState<FleetTab>('role');

  // -------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------
  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <div className="mg-loader mb-4" />
        <p className="mg-text text-sm opacity-60">
          Aggregating fleet data across all members...
        </p>
      </div>
    );
  }

  // -------------------------------------------------------------------
  // Error state
  // -------------------------------------------------------------------
  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="bg-[rgba(var(--mg-panel-dark),0.6)] border border-red-500/30 p-6 max-w-md text-center rounded-sm">
          <p className="mg-text text-red-400 mb-2">Failed to load fleet data</p>
          <p className="mg-text text-sm opacity-60 mb-4">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 text-sm border border-[rgba(var(--mg-primary),0.4)] mg-text hover:bg-[rgba(var(--mg-primary),0.1)] transition-colors rounded-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------
  // No data
  // -------------------------------------------------------------------
  if (!data) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="mg-text opacity-50">No fleet data available.</p>
      </div>
    );
  }

  // -------------------------------------------------------------------
  // Select data based on active tab
  // -------------------------------------------------------------------
  const tabDataMap = {
    role: { data: data.byClassification, title: 'Fleet by Role / Classification' },
    manufacturer: { data: data.byManufacturer, title: 'Fleet by Manufacturer' },
    size: { data: data.bySize, title: 'Fleet by Size Class' },
  };

  const activeData = tabDataMap[activeTab];
  const uniqueModels = data.shipDetails.size;

  // -------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {/* Page header */}
      <div className="mb-6">
        <h1 className="mg-title text-2xl sm:text-3xl font-bold font-quantify tracking-wider text-[rgba(var(--mg-primary),0.9)]">
          FLEET COMPOSITION
        </h1>
        <p className="mg-text text-sm opacity-50 mt-1">
          Org-wide fleet analysis across all members
        </p>
      </div>

      {/* Summary stats bar */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[rgba(var(--mg-panel-dark),0.4)] border border-[rgba(var(--mg-primary),0.15)] p-4 rounded-sm text-center">
          <p className="mg-text text-xs uppercase tracking-wider opacity-50 mb-1">Total Ships</p>
          <p className="mg-text text-2xl font-bold tabular-nums text-[rgba(var(--mg-primary),1)]">
            {data.totalShips}
          </p>
        </div>
        <div className="bg-[rgba(var(--mg-panel-dark),0.4)] border border-[rgba(var(--mg-primary),0.15)] p-4 rounded-sm text-center">
          <p className="mg-text text-xs uppercase tracking-wider opacity-50 mb-1">Total Members</p>
          <p className="mg-text text-2xl font-bold tabular-nums text-[rgba(var(--mg-primary),1)]">
            {data.totalMembers}
          </p>
        </div>
        <div className="bg-[rgba(var(--mg-panel-dark),0.4)] border border-[rgba(var(--mg-primary),0.15)] p-4 rounded-sm text-center">
          <p className="mg-text text-xs uppercase tracking-wider opacity-50 mb-1">Unique Models</p>
          <p className="mg-text text-2xl font-bold tabular-nums text-[rgba(var(--mg-primary),1)]">
            {uniqueModels}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <FleetCompositionTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Charts */}
      <FleetBreakdownChart data={activeData.data} title={activeData.title} />

      {/* Drill-down table */}
      <FleetBreakdownTable data={activeData.data} totalShips={data.totalShips} />
    </motion.div>
  );
}

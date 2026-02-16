'use client';

import React from 'react';
import { motion } from 'motion/react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FleetTab = 'role' | 'manufacturer' | 'size';

export interface FleetCompositionTabsProps {
  activeTab: FleetTab;
  onTabChange: (tab: FleetTab) => void;
}

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

const TABS: { key: FleetTab; label: string }[] = [
  { key: 'role', label: 'By Role' },
  { key: 'manufacturer', label: 'By Manufacturer' },
  { key: 'size', label: 'By Size' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FleetCompositionTabs({ activeTab, onTabChange }: FleetCompositionTabsProps) {
  return (
    <div className="flex gap-1 border-b border-[rgba(var(--mg-primary),0.2)] mb-6">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.key;

        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTabChange(tab.key)}
            className={`relative px-4 py-2.5 text-sm font-quantify tracking-wider transition-colors ${
              isActive
                ? 'mg-text'
                : 'mg-text opacity-50 hover:opacity-75'
            }`}
          >
            {tab.label}

            {/* Animated underline indicator */}
            {isActive && (
              <motion.div
                layoutId="fleet-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[rgba(var(--mg-primary),0.8)]"
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

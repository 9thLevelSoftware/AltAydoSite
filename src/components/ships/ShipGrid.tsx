'use client';

import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Squares2X2Icon, ListBulletIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import MobiGlasButton from '@/components/ui/mobiglas/MobiGlasButton';
import MobiGlasPanel from '@/components/ui/mobiglas/MobiGlasPanel';
import ShipCard from '@/components/ships/ShipCard';
import ShipCardList from '@/components/ships/ShipCardList';
import type { ShipDocument } from '@/types/ship';

interface ShipGridProps {
  ships: ShipDocument[];
  isLoading: boolean;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  onShipClick: (ship: ShipDocument) => void;
}

// ---------------------------------------------------------------------------
// Skeleton Placeholders
// ---------------------------------------------------------------------------

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: 24 }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="bg-[rgba(var(--mg-primary),0.08)] rounded-sm">
            <div className="aspect-[16/9] bg-[rgba(var(--mg-primary),0.08)] rounded-sm" />
            <div className="p-4 space-y-2">
              <div className="h-4 bg-[rgba(var(--mg-primary),0.08)] rounded-sm w-3/4" />
              <div className="h-3 bg-[rgba(var(--mg-primary),0.06)] rounded-sm w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="flex flex-col">
      {Array.from({ length: 24 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse h-12 bg-[rgba(var(--mg-primary),0.05)] border-b border-[rgba(var(--mg-primary),0.05)] rounded-sm mb-0.5"
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <MagnifyingGlassIcon className="w-12 h-12 text-[rgba(var(--mg-primary),0.4)] mb-4" />
      <p className="text-[rgba(var(--mg-text),0.6)] text-base mb-1">No ships found</p>
      <p className="text-[rgba(var(--mg-text),0.4)] text-sm">
        Try adjusting your filters or search terms
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ShipGrid
// ---------------------------------------------------------------------------

export default function ShipGrid({
  ships,
  isLoading,
  viewMode,
  onViewModeChange,
  onShipClick,
}: ShipGridProps) {
  return (
    <div>
      {/* View Toggle Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-[rgba(var(--mg-text),0.6)] text-sm">
          {isLoading ? (
            <span className="animate-pulse">Loading ships...</span>
          ) : (
            <span>{ships.length} ship{ships.length !== 1 ? 's' : ''}</span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <MobiGlasButton
            variant={viewMode === 'grid' ? 'outline' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('grid')}
            aria-label="Grid view"
          >
            <Squares2X2Icon className="w-4 h-4" />
          </MobiGlasButton>
          <MobiGlasButton
            variant={viewMode === 'list' ? 'outline' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('list')}
            aria-label="List view"
          >
            <ListBulletIcon className="w-4 h-4" />
          </MobiGlasButton>
        </div>
      </div>

      {/* Content Area */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {viewMode === 'grid' ? <GridSkeleton /> : <ListSkeleton />}
          </motion.div>
        ) : ships.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <EmptyState />
          </motion.div>
        ) : viewMode === 'grid' ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            {ships.map((ship) => (
              <ShipCard
                key={ship.fleetyardsId}
                ship={ship}
                onClick={onShipClick}
              />
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <MobiGlasPanel variant="dark" cornerAccents={true} cornerSize="sm" padding="sm">
              {ships.map((ship) => (
                <ShipCardList
                  key={ship.fleetyardsId}
                  ship={ship}
                  onClick={onShipClick}
                />
              ))}
            </MobiGlasPanel>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
